const express = require('express');
const apiFunctions = require('./mess'); // Import your API logic
const app = express();
const userAgent = 'chromax-api/1.0 (rilwag2612@gmail.com)';
const port = process.env.PORT || 8390;
const Genius = require("genius-lyrics");
const Client = new Genius.Client("top-secret-optional-key"); // Scrapes if no key is provided


// MARK: CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });


// MARK: Lyrics API
app.get('/lyrics/ovh/:param1/:param2', async (req, res) => {
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

app.get('/lyrics/genius/:param1', async (req, res) => {
    const song = req.params.param1;

    try {
        const songInfo = await Client.songs.search(song);
        if (songInfo.length > 0) {
            const lyrics = await songInfo[0].lyrics();
            res.json({ lyrics });
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
    res.send(`<style>
    * {
        background-color: gray;
    }
    .icon {
        width: 300;
        display: block;
        margin: auto;
        margin-top: 50px;
        margin-bottom: 10px;
        background-color: black;
        border-radius: 30%;
        padding: 12px;
    }
    .contentContainer {
        color: white;
        padding: 12px;
        text-align: center;
    }
    .learn_btn {
        border-radius: 20%;
        padding: 20px;
        background: lightblue;
    }
</style>

<img src="https://render.com/icon.svg" class="icon">
<div class="contentContainer">
    <h1>Chromax</h1>
    <p>Unlock a world of new wonders by using the Chromax Music API. Learn more using the devleoper documentation.</p>
    <button class="learn_btn" onclick='window.location.href="https://chromax-api.onrender.com"'>Learn Chromax</button>
</div>`);
});

// Catch-all middleware for 404 errors
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(port, () => {
    console.log(`Chromax API is running on port ${port}`);
});
