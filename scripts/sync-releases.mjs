import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcesPath = path.join(root, "data", "release-sources.json");
const overridesPath = path.join(root, "data", "release-link-overrides.json");
const outputPath = path.join(root, "data", "auto-catalog.json");
const market = "MX";

async function fetchJson(url, attempt = 1) {
  const response = await fetch(url, {
    headers: { "User-Agent": "CrystalSoulRecordsCatalog/1.0" }
  });

  if ((response.status === 429 || response.status >= 500) && attempt <= 4) {
    const retryAfter = Math.min(Number(response.headers.get("retry-after")) || attempt * 3, 60);
    await delay(retryAfter * 1000);
    return fetchJson(url, attempt + 1);
  }

  if (!response.ok) {
    throw new Error(`La fuente de lanzamientos respondió ${response.status}: ${url}`);
  }

  return response.json();
}

function cleanTitle(value) {
  return value
    .replace(/\s+-\s+(single|ep)$/i, "")
    .replace(/\s+ep$/i, "")
    .trim();
}

function releaseFormat(collection) {
  if (collection.trackCount === 1) return "Single";
  return collection.trackCount <= 6 ? "EP" : "Álbum";
}

function highResolutionArtwork(url) {
  return url?.replace(/\/100x100bb(?:\.[a-z]+)?$/i, "/600x600bb.jpg") || "";
}

async function getArtistReleases(source) {
  const url = new URL("https://itunes.apple.com/lookup");
  url.search = new URLSearchParams({
    id: String(source.apple_artist_id),
    entity: "album",
    limit: "200",
    country: market.toLowerCase()
  });

  const data = await fetchJson(url);
  return (data.results || [])
    .filter((item) => (
      item.wrapperType === "collection"
      && item.collectionId
      && item.collectionName
      && Number(item.artistId) === Number(source.apple_artist_id)
    ))
    .map((collection) => {
      const title = cleanTitle(collection.collectionName);
      const collectionId = String(collection.collectionId);
      const spotifySearch = `https://open.spotify.com/search/${encodeURIComponent(`${source.artist} ${title}`)}`;

      return {
        source_id: `apple:${collectionId}`,
        apple_collection_id: collectionId,
        title,
        artist: source.artist,
        spotify_search_url: spotifySearch,
        spotify_artist_url: source.spotify_artist_url,
        apple_music_url: collection.collectionViewUrl || "",
        cover_url: highResolutionArtwork(collection.artworkUrl100),
        format: releaseFormat(collection),
        release_date: collection.releaseDate?.slice(0, 10) || "",
        total_tracks: collection.trackCount || 0
      };
    });
}

const sources = JSON.parse(await fs.readFile(sourcesPath, "utf8"));
const linkOverrides = JSON.parse(await fs.readFile(overridesPath, "utf8").catch(() => "{}"));
const releases = [];

for (const source of sources) {
  releases.push(...await getArtistReleases(source));
}

for (const release of releases) {
  release.spotify_url = linkOverrides[release.apple_collection_id] || "";
}

releases.sort((a, b) => {
  const dateOrder = (b.release_date || "").localeCompare(a.release_date || "");
  if (dateOrder) return dateOrder;
  const artistOrder = a.artist.localeCompare(b.artist, "es");
  return artistOrder || a.title.localeCompare(b.title, "es");
});

const output = `${JSON.stringify({ schema_version: 1, market, releases }, null, 2)}\n`;
const previous = await fs.readFile(outputPath, "utf8").catch(() => "");

if (previous === output) {
  console.log(`Catálogo sin cambios: ${releases.length} lanzamientos revisados.`);
} else {
  await fs.writeFile(outputPath, output, "utf8");
  console.log(`Catálogo actualizado: ${releases.length} lanzamientos encontrados.`);
}
