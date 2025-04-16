import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

// Fetch album cover
async function fetchAlbumCover(artist, album, userAgent, res) {
    const musicbrainzUrl = `https://musicbrainz.org/ws/2/release/?query=album:"${album}" AND artist:"${artist}"&fmt=json`;
    const headers = { 'User-Agent': userAgent };

    console.log("Fetching Album from MusicBrainz:", musicbrainzUrl);

    try {
        const mbResponse = await fetch(musicbrainzUrl, { headers });

        if (!mbResponse.ok) {
            console.error(`Error fetching album from MusicBrainz: ${mbResponse.status} ${mbResponse.statusText}`);
            res.status(500).send("Error fetching album data");
            return;
        }

        const mbData = await mbResponse.json();

        if (mbData.releases && mbData.releases.length > 0) {
            const firstRelease = mbData.releases[0];
            const releaseMbid = firstRelease.id;
            const coverArtUrl = `https://coverartarchive.org/release/${releaseMbid}/front`;

            try {
                const coverResponse = await fetch(coverArtUrl);

                if (coverResponse.ok) {
                    res.setHeader('Content-Type', 'image/jpeg');
                    await streamPipeline(coverResponse.body, res);
                } else {
                    console.error("Error fetching cover art:", coverResponse.status, coverResponse.statusText);
                    res.status(404).send("Cover art not found");
                }
            } catch (e) {
                console.error("Error fetching cover art:", e);
                res.status(500).send("Error fetching cover art");
            }
        } else {
            res.status(404).send("No releases found for the album");
        }
    } catch (error) {
        console.error("Error fetching album from MusicBrainz:", error);
        res.status(500).send("Error fetching album data");
    }
}

// Fetch artist image
async function fetchArtistImage(artist, res) {
    const deezerUrl = `https://api.deezer.com/search/artist?q=${encodeURIComponent(artist)}`;

    console.log("Fetching Artist from Deezer:", deezerUrl);

    try {
        const deezerResponse = await fetch(deezerUrl);

        if (!deezerResponse.ok) {
            console.error(`Error fetching artist from Deezer: ${deezerResponse.status} ${deezerResponse.statusText}`);
            res.status(500).send("Error fetching artist data");
            return;
        }

        const deezerData = await deezerResponse.json();

        if (deezerData.data && deezerData.data.length > 0) {
            const artistData = deezerData.data[0];
            const artistImageUrl = artistData.picture_xl;

            if (artistImageUrl) {
                res.redirect(artistImageUrl);
            } else {
                console.error("No artist image found on Deezer");
                res.status(404).send("Artist image not found");
            }
        } else {
            console.error("No artist found on Deezer");
            res.status(404).send("No artist found");
        }
    } catch (error) {
        console.error("Error fetching artist from Deezer:", error);
        res.status(500).send("Error fetching artist data");
    }
}

// Search for artists, albums, or tracks
async function search(query, type, res) {
    const deezerUrl = `https://api.deezer.com/search/${type}?q=${encodeURIComponent(query)}`;

    console.log("Searching on Deezer:", deezerUrl);

    try {
        const deezerResponse = await fetch(deezerUrl);

        if (!deezerResponse.ok) {
            console.error(`Error searching on Deezer: ${deezerResponse.status} ${deezerResponse.statusText}`);
            res.status(500).send("Error searching data");
            return;
        }

        const deezerData = await deezerResponse.json();
        res.json(deezerData.data);
    } catch (error) {
        console.error("Error searching on Deezer:", error);
        res.status(500).send("Error searching data");
    }
}

// Fetch top tracks for an artist
async function fetchTopTracks(artistId, res) {
    const deezerUrl = `https://api.deezer.com/artist/${artistId}/top?limit=10`;

    console.log("Fetching Top Tracks from Deezer:", deezerUrl);

    try {
        const deezerResponse = await fetch(deezerUrl);

        if (!deezerResponse.ok) {
            console.error(`Error fetching top tracks from Deezer: ${deezerResponse.status} ${deezerResponse.statusText}`);
            res.status(500).send("Error fetching top tracks");
            return;
        }

        const deezerData = await deezerResponse.json();
        res.json(deezerData.data);
    } catch (error) {
        console.error("Error fetching top tracks from Deezer:", error);
        res.status(500).send("Error fetching top tracks");
    }
}

export { fetchAlbumCover, fetchArtistImage, search, fetchTopTracks };