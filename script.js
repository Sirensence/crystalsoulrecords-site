const catalogSources = [
  {
    path: "data/bandcamp-catalog.csv",
    platform: "Bandcamp",
    map: (row) => ({
      title: row.release,
      artist: row.artist,
      url: row.spotify_url || row.bandcamp_url,
      image: `assets/bandcamp/covers/${row.filename}`,
      format: row.format || (row.bandcamp_url?.includes("/track/") ? "Single" : "Álbum / EP"),
      date: row.release_date || "",
      platform: row.spotify_url ? "Spotify" : "Bandcamp"
    })
  },
  {
    path: "data/sirensence-catalog.csv",
    platform: "Spotify",
    map: (row) => ({
      title: row.title,
      artist: row.artist,
      url: row.spotify_release_url,
      image: `assets/sirensence/${row.cover_file}`,
      format: row.format,
      date: row.release_date
    })
  },
  {
    path: "data/neon-paint-catalog.csv",
    platform: "Spotify",
    map: (row) => ({
      title: row.title,
      artist: row.artist,
      url: row.spotify_release_url,
      image: `assets/neon-paint/${row.cover_file}`,
      format: row.format,
      date: row.release_date
    })
  },
  {
    path: "data/neon-angel-catalog.csv",
    platform: "Spotify",
    map: (row) => ({
      title: row.title,
      artist: row.artist,
      url: row.spotify_release_url,
      image: `assets/neon-angel/${row.cover_file}`,
      format: row.format,
      date: row.release_date
    })
  },
  {
    path: "data/auto-catalog.json",
    type: "json",
    platform: "Spotify",
    map: (row) => ({
      title: row.title,
      artist: row.artist,
      url: row.spotify_url || row.spotify_search_url || row.spotify_artist_url,
      image: row.cover_url,
      format: row.format,
      date: row.release_date,
      platform: "Spotify",
      sourceId: row.source_id
    })
  }
];

const state = {
  releases: [],
  visible: 12,
  filter: "all",
  search: ""
};

const grid = document.querySelector("[data-release-grid]");
const template = document.querySelector("#release-template");
const filter = document.querySelector("[data-filter]");
const search = document.querySelector("[data-search]");
const count = document.querySelector("[data-count]");
const loadMore = document.querySelector("[data-load-more]");

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
  const platformPriority = { Bandcamp: 1, Spotify: 2 };

  releases.forEach((release) => {
    const key = releaseMetadataKey(release);
    const current = unique.get(key);

    if (!current || (platformPriority[release.platform] || 0) > (platformPriority[current.platform] || 0)) {
      unique.set(key, release);
    }
  });

  return [...unique.values()];
}

function displayDate(date) {
  if (!date) return "Catálogo oficial";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.valueOf())) return date;
  return new Intl.DateTimeFormat("es-MX", { year: "numeric", month: "short", day: "numeric" }).format(parsed);
}

function filteredReleases() {
  const query = normalize(state.search.trim());
  return state.releases.filter((release) => {
    const matchesArtist = state.filter === "all" || release.artist === state.filter;
    const matchesSearch = !query || normalize(`${release.title} ${release.artist}`).includes(query);
    return matchesArtist && matchesSearch;
  });
}

function renderCatalog() {
  const filtered = filteredReleases();
  const visible = filtered.slice(0, state.visible);
  grid.replaceChildren();

  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "catalog-empty";
    empty.textContent = "No encontramos lanzamientos con esa búsqueda.";
    grid.append(empty);
  } else {
    visible.forEach((release, index) => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector(".release-card");
      const link = fragment.querySelector(".release-cover");
      const image = fragment.querySelector("img");
      const platform = fragment.querySelector(".release-platform");
      const artist = fragment.querySelector(".release-meta p");
      const title = fragment.querySelector(".release-meta h3");
      const details = fragment.querySelector(".release-meta > span");

      card.style.animationDelay = `${Math.min(index, 11) * 35}ms`;
      link.href = release.url;
      link.setAttribute("aria-label", `${release.title} de ${release.artist} en ${release.platform}`);
      image.src = release.image;
      image.alt = `Portada de ${release.title} — ${release.artist}`;
      platform.textContent = release.platform;
      artist.textContent = release.artist;
      title.textContent = release.title;
      details.textContent = `${release.format || "Lanzamiento"} · ${displayDate(release.date)}`;
      grid.append(fragment);
    });
  }

  count.textContent = filtered.length === 1 ? "1 lanzamiento" : `${filtered.length} lanzamientos`;
  loadMore.hidden = state.visible >= filtered.length;
}

async function loadCatalog() {
  try {
    const sourceResults = await Promise.all(catalogSources.map(async (source) => {
      const response = await fetch(source.path);
      if (!response.ok) throw new Error(`No se pudo cargar ${source.path}`);
      const rows = source.type === "json"
        ? (await response.json()).releases ?? []
        : parseCSV(await response.text());

      return rows.map((row) => {
        const release = source.map(row);
        return { ...release, platform: release.platform || source.platform };
      });
    }));

    state.releases = deduplicateReleases(sourceResults
      .flat()
      .filter((release) => release.title && release.artist && release.url && release.image))
      .sort((a, b) => {
        if (a.date && b.date) return b.date.localeCompare(a.date);
        if (a.date) return -1;
        if (b.date) return 1;
        return a.artist.localeCompare(b.artist, "es");
      });

    const totalReleases = state.releases.length;
    document.querySelectorAll("[data-total-releases]").forEach((element) => {
      element.textContent = totalReleases.toLocaleString("es-MX");
    });

    const catalogCta = document.querySelector("[data-total-releases-cta]");
    if (catalogCta) {
      const releaseLabel = totalReleases === 1 ? "lanzamiento" : "lanzamientos";
      catalogCta.textContent = `Explorar ${totalReleases.toLocaleString("es-MX")} ${releaseLabel}`;
    }

    const artists = [...new Set(state.releases.map((release) => release.artist))].sort((a, b) => a.localeCompare(b, "es"));
    artists.forEach((artist) => {
      const option = document.createElement("option");
      option.value = artist;
      option.textContent = artist;
      filter.append(option);
    });

    renderCatalog();
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="catalog-empty">No fue posible cargar el catálogo. Visita Bandcamp para escuchar los lanzamientos.</p>';
    count.textContent = "Catálogo no disponible";
  }
}

filter?.addEventListener("change", (event) => {
  state.filter = event.target.value;
  state.visible = 12;
  renderCatalog();
});

search?.addEventListener("input", (event) => {
  state.search = event.target.value;
  state.visible = 12;
  renderCatalog();
});

loadMore?.addEventListener("click", () => {
  state.visible += 12;
  renderCatalog();
});

document.querySelectorAll("[data-artist-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.artistFilter;
    state.search = "";
    state.visible = 12;
    filter.value = state.filter;
    search.value = "";
    renderCatalog();
    document.querySelector("#lanzamientos").scrollIntoView({ behavior: "smooth" });
  });
});

const menuToggle = document.querySelector("[data-menu-toggle]");
const navigation = document.querySelector("[data-nav]");
menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  navigation.classList.toggle("is-open", !open);
});

navigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle?.setAttribute("aria-expanded", "false");
    navigation.classList.remove("is-open");
  });
});

const header = document.querySelector("[data-header]");
const setHeaderState = () => header?.classList.toggle("is-scrolled", window.scrollY > 20);
window.addEventListener("scroll", setHeaderState, { passive: true });
setHeaderState();

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

document.querySelector("[data-year]").textContent = new Date().getFullYear();
loadCatalog();
