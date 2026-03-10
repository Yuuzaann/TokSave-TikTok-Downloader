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

let videoUrl = "";
let mp3Url = "";
let photoUrls = [];

fetchBtn.addEventListener("click", getData);

urlInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") getData();
});

clearBtn.addEventListener("click", clearData);

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

    title.innerText = data.title;

    btnVideo.style.display = "none";
    btnMP3.style.display = "none";

    gallery.innerHTML = "";

    if (photoUrls.length > 0) {
      video.style.display = "none";

      photoUrls.forEach((url, index) => {
        let card = document.createElement("div");

        card.className = "photo-card";

        card.innerHTML = `
<img src="${url}">
<button class="photo-download">
<i class="bi bi-download"></i>
</button>
`;

        card.querySelector("button").onclick = () => {
          autoDownload(url, `tiktok-photo-${index + 1}.jpg`);
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
  } catch (err) {
    alert("Semua API gagal mengambil data");
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
          title: json.title || "TikTok Video",
          play: json.video.noWatermark,
          music: json.music,
          images: json.images,
        };
      }
    } catch (e) {
      continue;
    }
  }

  throw new Error("All API failed");
}

btnVideo.onclick = function () {
  if (videoUrl) autoDownload(videoUrl, "tiktok-video.mp4");
};

btnMP3.onclick = function () {
  if (mp3Url) autoDownload(mp3Url, "tiktok-audio.mp3");
};

async function autoDownload(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = blobUrl;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(blobUrl);
  } catch {
    alert("Download gagal");
  }
}

function clearData() {
  urlInput.value = "";
  video.src = "";
  gallery.innerHTML = "";
  title.innerText = "";

  result.classList.add("hidden");
}
