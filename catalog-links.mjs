function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...records] = rows;
  return records.map((values) => Object.fromEntries(headers.map((header, index) => [header.trim(), values[index]?.trim() ?? ""])));
}

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function normalizeReleaseTitle(value) {
  return normalize(value)
    .replace(/\s+-\s+(single|ep)\s*$/i, "")
    .replace(/\s*\((single|ep)\)\s*$/i, "")
    .replace(/\s+ep\s*$/i, "")
    .replace(/\s*\(feat\.?[^)]*\)\s*$/i, "")
    .replace(/\s*\((demos?)\)\s*$/i, " demo")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function releaseMetadataKey(release) {
  return `${normalize(release.artist).trim()}::${normalizeReleaseTitle(release.title)}`;
}

function deduplicateReleases(releases) {
  const unique = new Map();

  releases.forEach((release) => {
    const key = releaseMetadataKey(release);
    const current = unique.get(key);

    if (!current || releaseLinkPriority(release) > releaseLinkPriority(current)) {
      unique.set(key, release);
    }
  });

  return [...unique.values()];
}

function isDirectSpotifyURL(value) {
  return /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:album|track)\/[a-zA-Z0-9]{22}(?:[?#].*)?$/.test(value || "");
}

function releaseLinkPriority(release) {
  if (isDirectSpotifyURL(release.url)) return 3;
  if (release.platform === "Bandcamp") return 2;
  return 1;
}

function applySpotifyLinks(releases, overrides = {}, curated = [], previous = []) {
  const verifiedLinks = new Map();
  for (const release of [...previous, ...curated]) {
    if (release.artist && release.title && isDirectSpotifyURL(release.spotify_url)) {
      verifiedLinks.set(releaseMetadataKey(release), release.spotify_url);
    }
  }

  return releases.map((release) => ({
    ...release,
    spotify_url: isDirectSpotifyURL(overrides[release.apple_collection_id])
      ? overrides[release.apple_collection_id]
      : verifiedLinks.get(releaseMetadataKey(release))
        || (isDirectSpotifyURL(release.spotify_url) ? release.spotify_url : "")
  }));
}

export { parseCSV, normalize, normalizeReleaseTitle, releaseMetadataKey, isDirectSpotifyURL, deduplicateReleases, applySpotifyLinks };
