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
    const marker = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      latitude,
      longitude,
      name: typeof name === 'string' ? name : '',
      createdAt: new Date().toISOString(),
    };
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
    const { stdout } = await execFileAsync(ytDlpPath, [
      '--no-playlist',
      '--print',
      'filename',
      '-o',
      outputTemplate,
      trimmedUrl,
    ]);
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

    res.status(202).json({ ok: true, file: filename, audio: wavFile, transcript });
  } catch (error) {
    res.status(500).json({ error: 'yt-dlp failed to download the video.' });
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
