const express = require('express');
const apiFunctions = require('./mess'); // Import your API logic
const app = express();
const userAgent = 'chromax-api/1.0 (rilwag2612@gmail.com)';
const port = process.env.PORT || 8390;

// MARK: CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
// MARK: Lyrics API
app.get('/lyrics/:param1/:param2', async (req, res) => {
    const artist = req.params.param1;
    const song = req.params.param2;

    try {
        const response = await fetch(`https://api.lyrics.ovh/v1/${artist}/${song}`);
        const data = await response.json();
        if (data.lyrics) {
            res.json({ lyrics: data.lyrics });
        } else {
            res.status(404).json({ error: 'Lyrics not found' });
        }
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        res.status(500).json({ error: 'Failed to fetch lyrics' });
    }
});

// MARK: Cover Art API
app.get('/cover/:artist/:album', (req, res) => {
    const artist = req.params.artist;
    const album = req.params.album;

    if (!artist || !album) {
        res.status(400).json({ error: 'Artist and album are required' });
        return;
    }

    apiFunctions.fetchAlbumCover(artist, album, 'chromax-api/1.0', res);
});

// MARK: Artist Image API
app.get('/image/:artist', (req, res) => {
    const artist = req.params.artist;

    if (!artist) {
        res.status(400).json({ error: 'Artist is required' });
        return;
    }

    apiFunctions.fetchArtistImage(artist, res);
});

// MARK: Search API
app.get('/search', (req, res) => {
    const query = req.query.q;
    const type = req.query.type || 'artist';

    if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
    }

    apiFunctions.search(query, type, res);
});

// MARK: Top Tracks API
app.get('/artist/:id/top-tracks', (req, res) => {
    const artistId = req.params.id;

    if (!artistId) {
        res.status(400).json({ error: 'Artist ID is required' });
        return;
    }

    apiFunctions.fetchTopTracks(artistId, res);
});

// MARK: Home
app.get('/', (req, res) => {
    res.send('Welcome to the Chromax API. Visit the developer docs to get started.');
});

// Catch-all middleware for 404 errors
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(port, () => {
    console.log(`Chromax API is running on port ${port}`);
});
