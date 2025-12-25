import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';

dotenv.config();

const app = express();
const port = Number.parseInt(process.env.PORT ?? '5050', 10);
const apiKey = process.env.GOOGLE_PLACES_API_KEY;
const dataDir = path.join(process.cwd(), 'data');
const markersFile = path.join(dataDir, 'markers.json');

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

app.listen(port, () => {
  console.log(`Places proxy listening on http://localhost:${port}`);
});
