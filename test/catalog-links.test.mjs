import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { parseCSV, deduplicateReleases, applySpotifyLinks, isDirectSpotifyURL } from "../catalog-links.mjs";

const hateURL = "https://open.spotify.com/album/4gqsjaSgBnYFaYi4HrYj1n";
const hate = { artist: "Sirensence", title: "I Hate The Way We Love", apple_collection_id: "6817973984", spotify_search_url: "https://open.spotify.com/search/Sirensence%20I%20Hate%20The%20Way%20We%20Love" };

test("the reported single resolves to its album and keeps the override on the next sync", async () => {
  const overrides = JSON.parse(await fs.readFile(new URL("../data/release-link-overrides.json", import.meta.url), "utf8"));
  const first = applySpotifyLinks([hate], overrides)[0];
  assert.equal(first.spotify_url, hateURL);
  assert.equal(applySpotifyLinks([hate], {}, [], [first])[0].spotify_url, hateURL);
});

test("automatic metadata reuses a curated direct release link", () => {
  const automatic = { artist: "Neon Paint", title: "Mirame", apple_collection_id: "6816604046" };
  const curated = { artist: "Neon Paint", title: "Mírame - Single", spotify_url: "https://open.spotify.com/intl-es/album/4c6XGb98aomzAQbth8xb17" };
  assert.equal(applySpotifyLinks([automatic], {}, [curated])[0].spotify_url, curated.spotify_url);
});

test("the same title from another artist never borrows the wrong link", () => {
  const other = { ...hate, artist: "Another artist", spotify_url: hateURL };
  assert.equal(applySpotifyLinks([hate], {}, [other])[0].spotify_url, "");
});

test("a direct Spotify link wins over a search regardless of source order", () => {
  const direct = { artist: hate.artist, title: hate.title, platform: "Spotify", url: hateURL };
  const fallback = { ...direct, url: hate.spotify_search_url };
  for (const rows of [[fallback, direct], [direct, fallback]]) {
    assert.deepEqual(deduplicateReleases(rows), [direct]);
  }
});

test("a Bandcamp-only demo stays on Bandcamp instead of being replaced by a Spotify search", () => {
  const demo = { artist: "Silence Awaits", title: "The Sighting (Demo)", platform: "Bandcamp", url: "https://crystalsoul.bandcamp.com/album/the-sighting-demo" };
  const fallback = { ...demo, platform: "Spotify", url: "https://open.spotify.com/search/Silence%20Awaits%20The%20Sighting%20Demo" };
  assert.deepEqual(deduplicateReleases([fallback, demo]), [demo]);
});

test("direct-link validation excludes searches, artist pages, and lookalike hosts", () => {
  assert.equal(isDirectSpotifyURL(hateURL), true);
  for (const url of [hate.spotify_search_url, "https://open.spotify.com/artist/4KYUjMtt4WTOqNm32dv2CO", "https://open.spotify.com.evil.test/album/4gqsjaSgBnYFaYi4HrYj1n"]) {
    assert.equal(isDirectSpotifyURL(url), false);
  }
});

test("both October singles have official artwork, release dates, and direct Spotify album URLs", async () => {
  const rows = parseCSV(await fs.readFile(new URL("../data/neon-paint-catalog.csv", import.meta.url), "utf8"));
  for (const [title, id] of [["DESTELLO", "1DAi0ErDPkUFjIK8AEujAZ"], ["Ya No Hay Noches Para Mí", "2NXclbI22fbtprqhZRlGad"]]) {
    const row = rows.find(item => item.title === title && item.artist === "Neon Paint");
    assert.ok(row);
    assert.equal(row.release_date, "2026-10-01");
    assert.equal(row.spotify_release_url, "https://open.spotify.com/intl-es/album/" + id);
    assert.match(row.cover_url, /^https:\/\/i\.scdn\.co\/image\//);
    assert.equal(row.track_count, "1");
  }
});

test("CSV parsing preserves quoted release names when the optional artwork column is absent", () => {
  const [row] = parseCSV('artist,title,spotify_url,cover_url\nNeon Paint,"Oh, My Love",https://open.spotify.com/intl-es/album/0o5F5G5g9u1h6WRQmSWp3M\n');
  assert.equal(row.title, "Oh, My Love");
  assert.equal(row.cover_url, "");
});
