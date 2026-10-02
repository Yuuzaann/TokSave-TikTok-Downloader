const $ = id => document.getElementById(id);
const urlInput = $("url"), fetchBtn = $("fetchBtn"), clearBtn = $("clearBtn"), pasteBtn = $("pasteBtn");
const loading = $("loading"), result = $("result"), errorBox = $("error");
const video = $("video"), gallery = $("photoGallery");
const B = { hd: $("dlHD"), sd: $("dlSD"), mp3: $("dlMP3"), zip: $("dlZip"), cover: $("dlCover"), copy: $("copyBtn") };
const TT = /^https?:\/\/([\w-]+\.)?tiktok(v)?\.com\//i;

let media = {}, busy = false;

/* ---------- storage aman ---------- */
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

/* ---------- tema ---------- */
$("themeBtn").onclick = () => {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  store.set("ts-theme", t);
};

/* ---------- input ---------- */
fetchBtn.onclick = () => getData();
clearBtn.onclick = clearData;
urlInput.addEventListener("keydown", e => { if (e.key === "Enter") getData(); });
urlInput.addEventListener("input", () => clearBtn.classList.toggle("hidden", !urlInput.value));
urlInput.addEventListener("paste", () => setTimeout(() => { if (TT.test(urlInput.value.trim())) getData(); }, 0));
document.addEventListener("keydown", e => {
  if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); urlInput.focus(); }
});
pasteBtn.onclick = async () => {
  try {
    urlInput.value = (await navigator.clipboard.readText()).trim();
    urlInput.dispatchEvent(new Event("input"));
    getData();
  } catch { urlInput.focus(); showError("Browser tidak mengizinkan akses clipboard. Tempel manual dengan Ctrl+V."); }
};
const qp = new URLSearchParams(location.search).get("url");
if (qp) { urlInput.value = qp; urlInput.dispatchEvent(new Event("input")); getData(); }

const showError = m => { errorBox.textContent = m; errorBox.classList.toggle("hidden", !m); };
const fmt = n => n == null ? "" : Intl.NumberFormat("id", { notation: "compact" }).format(n);
const slug = s => (s || "").normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_").slice(0, 40);
const fileBase = d => slug(d.author) && slug(d.title) ? `${slug(d.author)}_${slug(d.title)}` : (slug(d.title) || slug(d.author) || "toksave_" + Date.now());

/* ---------- ambil data ---------- */
async function getData(url = urlInput.value.trim()) {
  if (busy) return;
  showError("");
  if (!TT.test(url)) return showError("Link tidak valid. Contoh: https://www.tiktok.com/@user/video/123 atau https://vt.tiktok.com/xxxx");
  busy = true; fetchBtn.disabled = true;
  loading.classList.remove("hidden"); result.classList.add("hidden");
  try {
    const d = await fetchTikTok(url);
    render(d);
    addHistory({ url, title: d.title, author: d.author, cover: d.cover });
  } catch (e) {
    console.error(e);
    showError(e.userMsg || "Gagal mengambil data. Pastikan video publik, tunggu beberapa detik, lalu coba lagi.");
  } finally { busy = false; fetchBtn.disabled = false; loading.classList.add("hidden"); }
}

async function fetchTikTok(url) {
  const q = encodeURIComponent(url);
  let lastMsg = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
      const res = await fetch(`https://www.tikwm.com/api/?url=${q}&hd=1`, { signal: ctl.signal });
      clearTimeout(t);
      const j = await res.json();
      if (j.data && (j.data.play || (j.data.images || []).length)) {
        const x = j.data;
        return { title: x.title, author: x.author?.unique_id, cover: x.cover, play: x.play, hd: x.hdplay, music: x.music,
          images: x.images || [], duration: x.duration, plays: x.play_count, likes: x.digg_count };
      }
      lastMsg = j.msg || "";
      if (/limit/i.test(lastMsg)) { await new Promise(r => setTimeout(r, 1500)); continue; } // rate limit: coba lagi
      break;
    } catch { await new Promise(r => setTimeout(r, 800)); }
  }
  const err = new Error(lastMsg || "API gagal");
  if (/private|not exist|removed|parsing/i.test(lastMsg)) err.userMsg = "Video tidak ditemukan. Mungkin privat atau sudah dihapus.";
  throw err;
}

function render(d) {
  media = { hd: d.hd || d.play, sd: d.play, mp3: d.music, cover: d.cover, images: d.images, base: fileBase(d) };
  const photos = d.images.length > 0;
  $("title").textContent = d.title || "Video TikTok";
  $("author").textContent = d.author ? "@" + d.author : "";
  $("stats").innerHTML = [d.duration ? `<span>${Math.floor(d.duration / 60)}:${String(d.duration % 60).padStart(2, "0")}</span>` : "",
    d.plays != null ? `<span>${fmt(d.plays)} tayangan</span>` : "", d.likes != null ? `<span>${fmt(d.likes)} suka</span>` : "",
    photos ? `<span>${d.images.length} foto</span>` : ""].join("");

  video.classList.toggle("hidden", photos); gallery.classList.toggle("hidden", !photos);
  gallery.replaceChildren();
  video.removeAttribute("src"); video.load();
  B.hd.classList.toggle("hidden", photos || !media.hd);
  B.sd.classList.toggle("hidden", photos || !media.sd || media.sd === media.hd);
  B.zip.classList.toggle("hidden", !photos);
  B.mp3.classList.toggle("hidden", !media.mp3);
  B.cover.classList.toggle("hidden", !media.cover);
  B.copy.classList.toggle("hidden", photos);

  if (photos) d.images.forEach((src, i) => {
    const card = document.createElement("div"); card.className = "photo-card";
    const im = new Image(); im.src = src; im.alt = `Foto ${i + 1}`; im.loading = "lazy";
    const b = document.createElement("button"); b.className = "photo-download"; b.textContent = "Unduh";
    b.onclick = () => download(src, `${media.base}_${i + 1}.jpg`, b);
    card.append(im, b); gallery.append(card);
  });
  else {
    video.poster = media.cover || "";
    video.src = media.sd || media.hd;
    video.onerror = () => showError("Pratinjau gagal dimuat, tapi tombol unduh mungkin masih berfungsi.");
  }
  result.classList.remove("hidden");
  result.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------- unduh ---------- */
B.hd.onclick = () => download(media.hd, media.base + "_HD.mp4", B.hd);
B.sd.onclick = () => download(media.sd, media.base + "_SD.mp4", B.sd);
B.mp3.onclick = () => download(media.mp3, media.base + ".mp3", B.mp3);
B.cover.onclick = () => download(media.cover, media.base + "_cover.jpg", B.cover);
B.copy.onclick = async () => {
  try { await navigator.clipboard.writeText(media.hd || media.sd); flash(B.copy, "Tersalin"); }
  catch { prompt("Salin link file:", media.hd || media.sd); }
};
B.zip.onclick = async () => {
  const label = B.zip.innerHTML; B.zip.disabled = true;
  try {
    if (!window.JSZip) throw new Error("no jszip");
    const zip = new JSZip();
    for (let i = 0; i < media.images.length; i++) {
      B.zip.textContent = `${i + 1}/${media.images.length}`;
      zip.file(`${media.base}_${i + 1}.jpg`, await (await fetch(media.images[i])).blob());
    }
    save(await zip.generateAsync({ type: "blob" }), media.base + ".zip");
  } catch { showError("ZIP gagal dibuat (kemungkinan diblokir CORS). Unduh foto satu per satu lewat tombol di tiap gambar."); }
  B.zip.innerHTML = label; B.zip.disabled = false;
};

function flash(btn, text) { const h = btn.innerHTML; btn.textContent = text; setTimeout(() => btn.innerHTML = h, 1500); }
function save(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 8000);
}
async function download(url, name, btn) {
  if (!url) return;
  const label = btn.innerHTML; btn.disabled = true;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const total = +res.headers.get("content-length") || 0, reader = res.body.getReader(), chunks = []; let got = 0;
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      chunks.push(value); got += value.length;
      if (total) btn.textContent = Math.round(got / total * 100) + "%";
    }
    save(new Blob(chunks), name);
  } catch { window.open(url, "_blank", "noopener"); }  // fallback jika CORS memblokir
  btn.innerHTML = label; btn.disabled = false;
}

/* ---------- riwayat ---------- */
function addHistory(item) {
  const list = [item, ...store.get("ts-history", []).filter(h => h.url !== item.url)].slice(0, 10);
  store.set("ts-history", list); renderHistory();
}
function renderHistory() {
  const list = store.get("ts-history", []);
  $("historyWrap").classList.toggle("hidden", !list.length);
  const box = $("historyList"); box.replaceChildren();
  list.forEach(h => {
    const b = document.createElement("button"); b.className = "h-item";
    const im = new Image(); im.alt = ""; im.loading = "lazy"; if (h.cover) im.src = h.cover;
    const s = document.createElement("span"); s.textContent = h.title || "@" + (h.author || "video");
    b.append(im, s);
    b.onclick = () => { urlInput.value = h.url; urlInput.dispatchEvent(new Event("input")); getData(h.url); scrollTo({ top: 0, behavior: "smooth" }); };
    box.append(b);
  });
}
$("clearHistory").onclick = () => { store.set("ts-history", []); renderHistory(); };
renderHistory();

function clearData() {
  urlInput.value = ""; video.removeAttribute("src"); video.load(); gallery.replaceChildren();
  result.classList.add("hidden"); clearBtn.classList.add("hidden"); showError(""); urlInput.focus();
}
