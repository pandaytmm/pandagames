const GAMES = {
  komsu: { repo: "pandaytmm/komsu", asset: /\.exe$/i },
  cot: { repo: "pandaytmm/CALL-OF-TANKS-BETA-MAC", asset: /\.zip$/i },
};

const numberFmt = new Intl.NumberFormat("tr-TR");
const monthFmt = new Intl.DateTimeFormat("tr-TR", { month: "short", year: "numeric" });

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const mb = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024));
  return `${mb} MB`;
}

function prettyTag(tag) {
  const match = /^CALL\.OF\.TANKS\.(.+)$/i.exec(tag);
  return match ? `v${match[1]}` : tag;
}

async function fetchLatest(repo) {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

function updateGame(id, cfg, release) {
  const card = document.querySelector(`[data-game="${id}"]`);
  if (!card) return null;

  const asset = release.assets.find((a) => cfg.asset.test(a.name)) ?? release.assets[0];

  const version = card.querySelector("[data-version]");
  if (version && release.tag_name) version.textContent = prettyTag(release.tag_name);

  if (asset) {
    const link = card.querySelector('[data-role="download"]');
    if (link) link.href = asset.browser_download_url;

    const size = card.querySelector("[data-size]");
    const sizeText = formatSize(asset.size);
    if (size && sizeText) size.textContent = sizeText;

    const downloads = card.querySelector("[data-downloads]");
    if (downloads) downloads.textContent = numberFmt.format(asset.download_count);
  }

  return asset;
}

async function refreshFromGitHub() {
  const results = await Promise.allSettled(
    Object.entries(GAMES).map(async ([id, cfg]) => {
      const release = await fetchLatest(cfg.repo);
      return { release, asset: updateGame(id, cfg, release) };
    })
  );

  let totalDownloads = 0;
  let latestDate = null;

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    totalDownloads += result.value.asset?.download_count ?? 0;
    const published = new Date(result.value.release.published_at);
    if (!latestDate || published > latestDate) latestDate = published;
  }

  if (totalDownloads > 0) {
    const el = document.querySelector("[data-total-downloads]");
    if (el) el.textContent = numberFmt.format(totalDownloads);
  }

  if (latestDate) {
    const el = document.querySelector("[data-latest-date]");
    if (el) el.textContent = monthFmt.format(latestDate).replace(/^\w/, (c) => c.toUpperCase());
  }
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  items.forEach((el) => observer.observe(el));
}

initReveal();
refreshFromGitHub().catch(() => {
  /* Statik değerler yedek olarak kalır (çevrimdışı / API limiti). */
});
