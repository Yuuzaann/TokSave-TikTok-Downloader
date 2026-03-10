const urlInput = document.getElementById("url");
const fetchBtn = document.getElementById("fetchBtn");
const clearBtn = document.getElementById("clearBtn");

const loading = document.getElementById("loading");
const result = document.getElementById("result");

const video = document.getElementById("video");
const title = document.getElementById("title");

const btnVideo = document.getElementById("downloadVideo");
const btnMP3 = document.getElementById("downloadMP3");

const gallery = document.getElementById("photoGallery");
const hashtags = document.getElementById("hashtags");

let videoUrl = "";
let mp3Url = "";
let photoUrls = [];

fetchBtn.onclick = getData;

urlInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") getData();
});

clearBtn.onclick = clearData;

async function getData() {
  let url = urlInput.value.trim();

  if (!url) {
    alert("Masukkan link TikTok");
    return;
  }

  loading.classList.remove("hidden");
  result.classList.add("hidden");

  try {
    let data = await fetchTikTok(url);

    videoUrl = data.play;
    mp3Url = data.music;
    photoUrls = data.images || [];

    setTitle(data.title);

    gallery.innerHTML = "";

    btnVideo.style.display = "none";
    btnMP3.style.display = "none";

    if (photoUrls.length > 0) {
      video.style.display = "none";

      photoUrls.forEach((img, i) => {
        let card = document.createElement("div");
        card.className = "photo-card";

        card.innerHTML = `
<img src="${img}">
<button class="photo-download">
<i class="bi bi-download"></i>
</button>
`;

        card.querySelector("button").onclick = () => {
          autoDownload(img, `tiktok-photo-${i + 1}.jpg`);
        };

        gallery.appendChild(card);
      });
    } else {
      video.style.display = "block";
      video.src = videoUrl;

      btnVideo.style.display = "block";
      btnMP3.style.display = "block";
    }

    result.classList.remove("hidden");
  } catch {
    alert("Semua API gagal");
  }

  loading.classList.add("hidden");
}

async function fetchTikTok(url) {
  const apis = [
    `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,
    `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`,
  ];

  for (let api of apis) {
    try {
      let res = await fetch(api);

      if (!res.ok) continue;

      let json = await res.json();

      if (json.data) {
        return {
          title: json.data.title,
          play: json.data.play,
          music: json.data.music,
          images: json.data.images,
        };
      }

      if (json.video) {
        return {
          title: json.title || "",
          play: json.video.noWatermark,
          music: json.music,
          images: json.images,
        };
      }
    } catch {}
  }

  throw new Error();
}

function setTitle(text) {
  title.innerText = text;

  hashtags.innerHTML = "";

  let tags = text.match(/#\w+/g);

  if (tags) {
    tags.forEach((tag) => {
      let span = document.createElement("span");
      span.className = "hashtag";
      span.innerText = tag;

      hashtags.appendChild(span);
    });
  }
}

btnVideo.onclick = () => autoDownload(videoUrl, "tiktok-video.mp4");
btnMP3.onclick = () => autoDownload(mp3Url, "tiktok-audio.mp3");

async function autoDownload(url, name) {
  const res = await fetch(url);
  const blob = await res.blob();

  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = name;

  document.body.appendChild(a);
  a.click();
  a.remove();
}

function clearData() {
  urlInput.value = "";
  title.innerText = "";
  hashtags.innerHTML = "";
  gallery.innerHTML = "";
  video.src = "";

  result.classList.add("hidden");
}
