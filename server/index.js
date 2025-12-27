import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

dotenv.config();

const app = express();
const port = Number.parseInt(process.env.PORT ?? '5050', 10);
const apiKey = process.env.GOOGLE_PLACES_API_KEY;
const ytDlpPath = process.env.YTDLP_PATH || 'yt-dlp';
const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
const pythonPath = process.env.PYTHON_PATH || 'python3';
const whisperModel = process.env.WHISPER_MODEL || 'base';
const whisperDevice = process.env.WHISPER_DEVICE || 'cpu';
const whisperComputeType = process.env.WHISPER_COMPUTE_TYPE || 'int8';
const ytDlpCookies = process.env.YTDLP_COOKIES || '';
const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5';
const dataDir = path.join(process.cwd(), 'data');
const markersFile = path.join(dataDir, 'markers.json');
const execFileAsync = promisify(execFile);

app.use(cors());
app.use(express.json());

async function loadMarkers() {
  try {
    const raw = await fs.readFile(markersFile, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function saveMarkers(markers) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(markersFile, `${JSON.stringify(markers, null, 2)}\n`);
}

function normalizeEmoji(value) {
  if (typeof value !== 'string') {
    return '📍';
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : '📍';
}

function chooseEmojiFromCuisine(cuisine, fallbackText) {
  const normalized = `${cuisine || ''} ${fallbackText || ''}`.toLowerCase();
  if (/(pizza|pizzeria|slice)/.test(normalized)) return '🍕';
  if (/(burger|hamburger|cheeseburger)/.test(normalized)) return '🍔';
  if (/(sushi|japanese|omakase|nigiri|roll)/.test(normalized)) return '🍣';
  if (/(ramen|noodle)/.test(normalized)) return '🍜';
  if (/(taco|burrito|mexican|taqueria)/.test(normalized)) return '🌮';
  if (/(bbq|barbecue|steak|grill|steakhouse)/.test(normalized)) return '🥩';
  if (/(coffee|cafe|espresso|latte)/.test(normalized)) return '☕';
  if (/(bakery|pastry|croissant|bread)/.test(normalized)) return '🥐';
  if (/(ice cream|gelato|dessert|sweet|cake)/.test(normalized)) return '🍦';
  if (/(tea|boba|bubble tea)/.test(normalized)) return '🧋';
  if (/(bar|cocktail|wine|brewery|beer)/.test(normalized)) return '🍺';
  if (/(salad|vegan|vegetarian|plant-based)/.test(normalized)) return '🥗';
  return '📍';
}

function createMarker(latitude, longitude, name = '', address = '', emoji = '📍') {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    latitude,
    longitude,
    name,
    address,
    emoji: normalizeEmoji(emoji),
    createdAt: new Date().toISOString(),
  };
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    return null;
  }
}

async function extractPlaceInfo(transcript) {
  const prompt = `You extract restaurant location info from transcripts.
Return ONLY valid JSON with keys:
placeName (string), address (string), city (string), cuisine (string), clues (string), confidence (number 0-1), emoji (string, single emoji).
Choose the emoji based on cuisine:
- pizza -> 🍕
- burgers -> 🍔
- sushi/japanese -> 🍣
- ramen/noodles -> 🍜
- tacos/mexican -> 🌮
- bbq/steak -> 🥩
- coffee/cafe -> ☕
- bakery/dessert -> 🥐
- ice cream/dessert -> 🍦
- tea/boba -> 🧋
- bar/drinks -> 🍺
- salad/vegan/vegetarian -> 🥗
If unknown, use empty strings and low confidence, and emoji 📍.

Transcript:
${transcript}`;

  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error('Ollama request failed.');
  }

  const data = await response.json();
  const parsed = extractJson(data?.response ?? '');
  if (!parsed) {
    throw new Error('Failed to parse Ollama response.');
  }
  return parsed;
}

async function geocodePlace(extracted) {
  if (!apiKey) {
    return null;
  }
  const placeName = typeof extracted?.placeName === 'string' ? extracted.placeName.trim() : '';
  const address = typeof extracted?.address === 'string' ? extracted.address.trim() : '';
  const city = typeof extracted?.city === 'string' ? extracted.city.trim() : '';
  if (!placeName && !address) {
    return null;
  }

  const query = address || [placeName, city].filter(Boolean).join(', ');
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', query);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  const data = await response.json();
  if (data.status !== 'OK' || !data.results?.length) {
    return null;
  }

  const top = data.results[0];
  const location = top.geometry?.location;
  if (!location) {
    return null;
  }

  const normalizedEmoji = normalizeEmoji(extracted?.emoji);
  const fallbackEmoji =
    normalizedEmoji !== '📍'
      ? normalizedEmoji
      : chooseEmojiFromCuisine(extracted?.cuisine, `${placeName} ${address} ${city}`);

  return {
    latitude: location.lat,
    longitude: location.lng,
    name: top.name || placeName,
    address: top.formatted_address || address,
    emoji: fallbackEmoji,
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/markers', async (req, res) => {
  try {
    const markers = await loadMarkers();
    res.json({ markers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load markers.' });
  }
});

app.post('/api/markers', async (req, res) => {
  const { latitude, longitude, name } = req.body ?? {};
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    res.status(400).json({ error: 'Latitude and longitude must be numbers.' });
    return;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    res.status(400).json({ error: 'Latitude or longitude out of range.' });
    return;
  }

  try {
    const markers = await loadMarkers();
    const marker = createMarker(
      latitude,
      longitude,
      typeof name === 'string' ? name : '',
      '',
      normalizeEmoji(req.body?.emoji)
    );
    markers.push(marker);
    await saveMarkers(markers);
    res.status(201).json({ marker });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save marker.' });
  }
});

app.post('/api/ingest', async (req, res) => {
  const { url } = req.body ?? {};
  if (typeof url !== 'string' || url.trim().length === 0) {
    res.status(400).json({ error: 'Missing url.' });
    return;
  }
  const trimmedUrl = url.trim();
  try {
    const parsed = new URL(trimmedUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      res.status(400).json({ error: 'Invalid url protocol.' });
      return;
    }
  } catch (error) {
    res.status(400).json({ error: 'Invalid url.' });
    return;
  }

  try {
    const outputTemplate = path.join(os.tmpdir(), 'resto-%(id)s.%(ext)s');
    const args = [
      '--no-playlist',
      '--no-simulate',
      ...(ytDlpCookies ? ['--cookies', ytDlpCookies] : []),
      '--print',
      'after_move:filepath',
      '-o',
      outputTemplate,
      trimmedUrl,
    ];
    const { stdout } = await execFileAsync(ytDlpPath, args);
    const filename = stdout.split('\n').map((line) => line.trim()).find(Boolean);
    if (!filename) {
      res.status(500).json({ error: 'Download failed.' });
      return;
    }
    const wavFile = filename.replace(path.extname(filename), '.wav');
    await execFileAsync(ffmpegPath, [
      '-y',
      '-i',
      filename,
      '-ar',
      '16000',
      '-ac',
      '1',
      wavFile,
    ]);

    const scriptPath = path.join(process.cwd(), 'scripts', 'transcribe.py');
    const { stdout: transcriptStdout } = await execFileAsync(pythonPath, [
      scriptPath,
      wavFile,
      '--model',
      whisperModel,
      '--device',
      whisperDevice,
      '--compute-type',
      whisperComputeType,
    ]);
    const transcript = transcriptStdout.trim();
    let extracted = null;
    let marker = null;
    if (transcript) {
      try {
        extracted = await extractPlaceInfo(transcript);
      } catch (error) {
        extracted = null;
      }
    }

    if (extracted) {
      try {
        const geocoded = await geocodePlace(extracted);
        if (geocoded) {
          const markers = await loadMarkers();
          marker = createMarker(
            geocoded.latitude,
            geocoded.longitude,
            geocoded.name,
            geocoded.address
          );
          markers.push(marker);
          await saveMarkers(markers);
        }
      } catch (error) {
        marker = null;
      }
    }

    console.log(
      'Ingest emoji debug:',
      'extracted=',
      extracted?.emoji,
      'cuisine=',
      extracted?.cuisine,
      'marker=',
      marker?.emoji
    );

    res.status(202).json({
      ok: true,
      file: filename,
      audio: wavFile,
      transcript,
      extracted,
      marker,
    });
  } catch (error) {
    const details =
      typeof error?.stderr === 'string'
        ? error.stderr
        : typeof error?.stdout === 'string'
          ? error.stdout
          : typeof error?.message === 'string'
            ? error.message
            : '';
    console.error('yt-dlp/ffmpeg/whisper failed:', details || error);
    res.status(500).json({
      error: 'yt-dlp failed to download the video.',
      details: details || null,
    });
  }
});

app.get('/api/places', async (req, res) => {
  const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
  const sessionToken =
    typeof req.query.sessionToken === 'string' ? req.query.sessionToken.trim() : '';
  if (!query) {
    res.status(400).json({ status: 'INVALID_REQUEST', error_message: 'Missing query parameter.' });
    return;
  }
  if (!apiKey) {
    res.status(500).json({ status: 'SERVER_ERROR', error_message: 'Missing GOOGLE_PLACES_API_KEY.' });
    return;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', query);
    if (sessionToken) {
      url.searchParams.set('sessiontoken', sessionToken);
    }
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();
    res.status(response.ok ? 200 : response.status).json(data);
  } catch (error) {
    res.status(500).json({ status: 'SERVER_ERROR', error_message: 'Failed to reach Google Places.' });
  }
});

app.get('/api/place-details', async (req, res) => {
  const placeId = typeof req.query.placeId === 'string' ? req.query.placeId.trim() : '';
  const sessionToken =
    typeof req.query.sessionToken === 'string' ? req.query.sessionToken.trim() : '';
  if (!placeId) {
    res.status(400).json({ status: 'INVALID_REQUEST', error_message: 'Missing placeId parameter.' });
    return;
  }
  if (!apiKey) {
    res.status(500).json({ status: 'SERVER_ERROR', error_message: 'Missing GOOGLE_PLACES_API_KEY.' });
    return;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'geometry/location,name,formatted_address');
    if (sessionToken) {
      url.searchParams.set('sessiontoken', sessionToken);
    }
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();
    res.status(response.ok ? 200 : response.status).json(data);
  } catch (error) {
    res.status(500).json({ status: 'SERVER_ERROR', error_message: 'Failed to reach Google Places.' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Places proxy listening on http://0.0.0.0:${port}`);
});
