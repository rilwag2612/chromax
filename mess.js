// utils.js (CommonJS)

const { pipeline } = require('stream'); // Correct way to destructure from require
const { promisify } = require('util');

const streamPipeline = promisify(pipeline);

// Your external API functions
// ---

async function fetchAlbumCover(artist, album, userAgent, res) { // Keep res for now, but we'll discuss
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
                    // Ensure the 'res' object is properly a Writable stream for streamPipeline
                    // This is usually true for Express response objects
                    await streamPipeline(coverResponse.body, res);
                    // Crucial: Do NOT send anything else after streaming!
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
                res.redirect(artistImageUrl); // Redirecting is fine here
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


async function getMbid(artist, album, userAgent) {
  const musicbrainzUrl = `https://musicbrainz.org/ws/2/release/?query=album:"${album}" AND artist:"${artist}"&fmt=json`;
  const headers = { 'User-Agent': userAgent };

  try {
    const mbResponse = await fetch(musicbrainzUrl, { headers });
    if (!mbResponse.ok) return null;

    const mbData = await mbResponse.json();
    if (mbData.releases && mbData.releases.length > 0) {
      return mbData.releases[0].id;
    }
    return null;
  } catch (err) {
    console.error('Error fetching MBID:', err);
    return null;
  }
}

/**
 * Fetches the track name given artist, album, and optional track number
 * @param {string} artist
 * @param {string} album
 * @param {string|number} trackNumber - optional, 1-based
 * @param {string} userAgent
 * @returns {Promise<string|null>}
 */
async function getTrackName(artist, album, trackNumber = 1, userAgent) {
  const releaseMbid = await getMbid(artist, album, userAgent);
  if (!releaseMbid) return null;

  const releaseUrl = `https://musicbrainz.org/ws/2/release/${releaseMbid}?inc=recordings&fmt=json`;
  const headers = { 'User-Agent': userAgent };

  try {
    const releaseResp = await fetch(releaseUrl, { headers });
    if (!releaseResp.ok) return null;

    const releaseData = await releaseResp.json();

    // MusicBrainz can have multiple mediums (CDs/Discs), we just take the first one
    const medium = releaseData.media?.[0];
    if (!medium || !medium.tracks || medium.tracks.length === 0) return null;

    // Track number is 1-based, arrays are 0-based
    const trackIndex = Math.min(trackNumber - 1, medium.tracks.length - 1);
    const track = medium.tracks[trackIndex];
    return track ? track.title : null;
  } catch (err) {
    console.error('Error fetching track name:', err);
    return null;
  }
}

    module.exports = {
    fetchAlbumCover,
    fetchArtistImage,
    getTrackName
    };