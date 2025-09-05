const express = require('express');
const apiFunctions = require('./mess');

const app = express();
const port = process.env.PORT || 8390;
const userAgent = 'chromax-api/1.0 (rilwag2612@gmail.com)';

// --- CORS ---
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// --- Lyrics Providers ---
async function fetchOVH(artist, song) {
  const resp = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`);
  const data = await resp.json();
  return data.lyrics ? { lyrics: data.lyrics, "lyrics-provider": "ovh" } : null;
}

async function fetchDR(artist, song) {
  const resp = await fetch(`https://lyrics-api-psi.vercel.app/api/${encodeURIComponent(song)}/${encodeURIComponent(artist)}`);
  const data = await resp.json();
  return data.lyrics ? { lyrics: data.lyrics, "lyrics-provider": "dr" } : null;
}

async function fetchLRCLIB(artist, song) {
  const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(song)}&artist_name=${encodeURIComponent(artist)}`;
  const resp = await fetch(url);
  const data = await resp.json();
  return Array.isArray(data) && data.length > 0 ? { results: data, "lyrics-provider": "lrclib" } : null;
}

// --- Fallback runner ---
async function tryProviders(order, artist, song) {
  for (const fn of order) {
    try {
      const result = await fn(artist, song);
      if (result) return result;
    } catch (err) {
      console.warn(`Provider failed: ${fn.name}`, err.message);
    }
  }
  return null;
}

// --- Lyrics routes ---
app.get('/release/:artist/:song/lyrics-ovh', async (req, res) => {
  const { artist, song } = req.params;
  const result = await tryProviders([fetchOVH, fetchDR, fetchLRCLIB], artist, song);
  if (result) return res.json(result);
  res.status(404).json({ error: 'No lyrics found (ovh + fallbacks)' });
});

app.get('/release/:artist/:song/lyrics-dr', async (req, res) => {
  const { artist, song } = req.params;
  const result = await tryProviders([fetchDR, fetchOVH, fetchLRCLIB], artist, song);
  if (result) return res.json(result);
  res.status(404).json({ error: 'No lyrics found (dr + fallbacks)' });
});

app.get('/release/:artist/:song/lyrics-lrclib', async (req, res) => {
  const { artist, song } = req.params;
  const result = await tryProviders([fetchLRCLIB, fetchOVH, fetchDR], artist, song);
  if (result) return res.json(result);
  res.status(404).json({ error: 'No lyrics found (lrclib + fallbacks)' });
});

// --- MP3 route (Internet Archive) ---
app.get('/release/:artist/:album/mp3', async (req, res) => {
  const { artist, album } = req.params;
  const trackQuery = req.query.track;
  const returnJson = req.query.type === 'json';

  try {
    // Looser search to catch items with inconsistent metadata
    const searchUrl = `https://archive.org/advancedsearch.php?q=mediatype:audio+AND+(${encodeURIComponent(artist)}+OR+${encodeURIComponent(album)})&fl[]=identifier&rows=5&page=1&output=json`;
    const searchResp = await fetch(searchUrl);
    const searchData = await searchResp.json();

    const identifier = searchData.response.docs[0]?.identifier;
    if (!identifier) return res.status(404).json({ error: 'Album not found on Internet Archive' });

    const metadataUrl = `https://archive.org/metadata/${identifier}`;
    const metadataResp = await fetch(metadataUrl);
    const metadata = await metadataResp.json();

    const mp3Files = metadata.files.filter(f => f.name.endsWith('.mp3') && f.size && parseInt(f.size) > 0);
    if (mp3Files.length === 0) return res.status(404).json({ error: 'No available MP3 files found' });

    let trackIndex = 0;
    if (trackQuery) {
      const t = parseInt(trackQuery, 10);
      if (!isNaN(t) && t > 0 && t <= mp3Files.length) trackIndex = t - 1;
    }

    const file = mp3Files[trackIndex];
    const mp3Url = `https://archive.org/download/${identifier}/${file.name}`;

    if(file.name.includes(apiFunctions.getTrackName(artist, album, userAgent))){
        if (returnJson) {
            res.json({
                artist,
                album,
                track: trackIndex + 1,
                filename: file.name,
                mp3_url: mp3Url
            });
        } else {
            // Only redirect if file has size (exists)
            res.redirect(mp3Url);
        }
    }

  } catch (err) {
    console.error('Error fetching MP3 from Internet Archive:', err);
    res.status(500).json({ error: 'Failed to fetch MP3', details: err.message });
  }
});

// --- Cover ---
app.get('/release/:artist/:album/cover', (req, res) => {
  const { artist, album } = req.params;
  if (!artist || !album) return res.status(400).json({ error: 'Artist and album are required' });
  apiFunctions.fetchAlbumCover(artist, album, userAgent, res);
});

// --- Artist Image ---
app.get('/release/:artist/image', (req, res) => {
  const { artist } = req.params;
  if (!artist) return res.status(400).json({ error: 'Artist is required' });
  apiFunctions.fetchArtistImage(artist, res);
});

// --- Home ---
app.get('/', (req, res) => {
  res.send(`<style>
    * { background-color: gray; }
    .icon { width: 300; display: block; margin: auto; margin-top: 50px; margin-bottom: 10px; background-color: black; border-radius: 30%; padding: 12px; }
    .contentContainer { color: white; padding: 12px; text-align: center; }
    .learn_btn { border-radius: 20%; padding: 20px; background: lightblue; }
  </style>
  <img src="https://render.com/icon.svg" class="icon">
  <div class="contentContainer">
    <h1>Chromax</h1>
    <p>Unlock a world of new wonders by using the Chromax Music API. Learn more using the developer documentation.</p>
    <button class="learn_btn" onclick='window.location.href="https://chromax-api.onrender.com"'>Learn Chromax</button>
  </div>`);
});

// --- 404 catch-all ---
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));

app.listen(port, () => console.log(`Chromax API is running on port ${port}`));
