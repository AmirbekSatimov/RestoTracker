import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

dotenv.config();

const app = express();
const port = Number.parseInt(process.env.PORT ?? '5050', 10);
const apiKey = process.env.GOOGLE_PLACES_API_KEY;
const jwtSecret = process.env.JWT_SECRET;
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
const dbFile = path.join(dataDir, 'app.db');
const execFileAsync = promisify(execFile);

const EMOJI = {
  pin: '\u{1F4CD}',
  pizza: '\u{1F355}',
  burger: '\u{1F354}',
  sushi: '\u{1F363}',
  ramen: '\u{1F35C}',
  taco: '\u{1F32E}',
  steak: '\u{1F969}',
  coffee: '\u{2615}',
  bakery: '\u{1F950}',
  iceCream: '\u{1F366}',
  boba: '\u{1F9CB}',
  beer: '\u{1F37A}',
  salad: '\u{1F957}',
};

app.use(cors());
app.use(express.json());

async function initDb() {
  await fs.mkdir(dataDir, { recursive: true });
  const db = await open({ filename: dbFile, driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS markers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      name TEXT,
      address TEXT,
      emoji TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  return db;
}

const dbPromise = initDb();

function normalizeEmoji(value) {
  if (typeof value !== 'string') {
    return EMOJI.pin;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : EMOJI.pin;
}

function chooseEmojiFromCuisine(cuisine, fallbackText) {
  const normalized = `${cuisine || ''} ${fallbackText || ''}`.toLowerCase();
  if (/(pizza|pizzeria|slice)/.test(normalized)) return EMOJI.pizza;
  if (/(burger|hamburger|cheeseburger)/.test(normalized)) return EMOJI.burger;
  if (/(sushi|japanese|omakase|nigiri|roll)/.test(normalized)) return EMOJI.sushi;
  if (/(ramen|noodle)/.test(normalized)) return EMOJI.ramen;
  if (/(taco|burrito|mexican|taqueria)/.test(normalized)) return EMOJI.taco;
  if (/(bbq|barbecue|steak|grill|steakhouse)/.test(normalized)) return EMOJI.steak;
  if (/(coffee|cafe|espresso|latte)/.test(normalized)) return EMOJI.coffee;
  if (/(bakery|pastry|croissant|bread)/.test(normalized)) return EMOJI.bakery;
  if (/(ice cream|gelato|dessert|sweet|cake)/.test(normalized)) return EMOJI.iceCream;
  if (/(tea|boba|bubble tea)/.test(normalized)) return EMOJI.boba;
  if (/(bar|cocktail|wine|brewery|beer)/.test(normalized)) return EMOJI.beer;
  if (/(salad|vegan|vegetarian|plant-based)/.test(normalized)) return EMOJI.salad;
  return EMOJI.pin;
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
- pizza -> ${EMOJI.pizza}
- burgers -> ${EMOJI.burger}
- sushi/japanese -> ${EMOJI.sushi}
- ramen/noodles -> ${EMOJI.ramen}
- tacos/mexican -> ${EMOJI.taco}
- bbq/steak -> ${EMOJI.steak}
- coffee/cafe -> ${EMOJI.coffee}
- bakery/dessert -> ${EMOJI.bakery}
- ice cream/dessert -> ${EMOJI.iceCream}
- tea/boba -> ${EMOJI.boba}
- bar/drinks -> ${EMOJI.beer}
- salad/vegan/vegetarian -> ${EMOJI.salad}
If unknown, use empty strings and low confidence, and emoji ${EMOJI.pin}.

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
    normalizedEmoji !== EMOJI.pin
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

async function insertMarker(db, userId, marker) {
  const createdAt = new Date().toISOString();
  const result = await db.run(
    `INSERT INTO markers (user_id, latitude, longitude, name, address, emoji, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    userId,
    marker.latitude,
    marker.longitude,
    marker.name ?? '',
    marker.address ?? '',
    normalizeEmoji(marker.emoji),
    createdAt
  );
  return {
    id: result.lastID,
    latitude: marker.latitude,
    longitude: marker.longitude,
    name: marker.name ?? '',
    address: marker.address ?? '',
    emoji: normalizeEmoji(marker.emoji),
    createdAt,
  };
}

function requireAuth(req, res, next) {
  if (!jwtSecret) {
    res.status(500).json({ error: 'JWT secret not configured.' });
    return;
  }
  const header = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Missing auth token.' });
    return;
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = { id: payload.userId, username: payload.username };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid auth token.' });
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }
  const trimmedUsername = username.trim();
  const trimmedPassword = password.trim();
  if (trimmedUsername.length < 3 || trimmedPassword.length < 6) {
    res.status(400).json({ error: 'Username or password too short.' });
    return;
  }
  try {
    const db = await dbPromise;
    const hash = await bcrypt.hash(trimmedPassword, 10);
    const createdAt = new Date().toISOString();
    const result = await db.run(
      'INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
      trimmedUsername,
      hash,
      createdAt
    );
    const token = jwt.sign(
      { userId: result.lastID, username: trimmedUsername },
      jwtSecret,
      { expiresIn: '7d' }
    );
    res.status(201).json({ token, user: { id: result.lastID, username: trimmedUsername } });
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({ error: 'Username already exists.' });
      return;
    }
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }
  try {
    const db = await dbPromise;
    const user = await db.get(
      'SELECT id, username, password_hash FROM users WHERE username = ?',
      username.trim()
    );
    if (!user) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }
    const token = jwt.sign({ userId: user.id, username: user.username }, jwtSecret, {
      expiresIn: '7d',
    });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log in.' });
  }
});

app.get('/api/markers', requireAuth, async (req, res) => {
  try {
    const db = await dbPromise;
    const markers = await db.all(
      `SELECT id, latitude, longitude, name, address, emoji, created_at as createdAt
       FROM markers
       WHERE user_id = ?
       ORDER BY id ASC`,
      req.user.id
    );
    res.json({ markers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load markers.' });
  }
});

app.post('/api/markers', requireAuth, async (req, res) => {
  const { latitude, longitude, name, address, emoji } = req.body ?? {};
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    res.status(400).json({ error: 'Latitude and longitude must be numbers.' });
    return;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    res.status(400).json({ error: 'Latitude or longitude out of range.' });
    return;
  }

  try {
    const db = await dbPromise;
    const marker = await insertMarker(db, req.user.id, {
      latitude,
      longitude,
      name: typeof name === 'string' ? name : '',
      address: typeof address === 'string' ? address : '',
      emoji: normalizeEmoji(emoji),
    });
    res.status(201).json({ marker });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save marker.' });
  }
});

app.post('/api/ingest', requireAuth, async (req, res) => {
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
          const db = await dbPromise;
          marker = await insertMarker(db, req.user.id, geocoded);
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
