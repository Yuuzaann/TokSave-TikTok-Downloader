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

/* RANDOM FILENAME */
function randomName(ext) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let result = "";

  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result + "." + ext;
}

async function getData() {
  const url = urlInput.value.trim();

  if (!url) {
    alert("Masukkan link TikTok");
    return;
  }

  loading.classList.remove("hidden");
  result.classList.add("hidden");

  try {
    const data = await fetchTikTok(url);

    title.innerText = data.title || "TikTok Video";

    videoUrl = data.play;
    mp3Url = data.music;
    photoUrls = data.images || [];

    gallery.innerHTML = "";

    btnVideo.style.display = "none";
    btnMP3.style.display = "none";

    // slideshow
    if (photoUrls.length > 0) {
      video.style.display = "none";

      photoUrls.forEach((img, index) => {
        const card = document.createElement("div");

        card.className = "photo-card";

        card.innerHTML = `
        <img src="${img}">
        <button class="photo-download">
          Download
        </button>
        `;

        card.querySelector("button").onclick = () => {
          directDownload(img, randomName("jpg"));
        };

        gallery.appendChild(card);
      });
    }

    // video
    else if (videoUrl) {
      video.style.display = "block";
      video.src = videoUrl;

      btnVideo.style.display = "block";

      if (mp3Url) btnMP3.style.display = "block";
    }

    result.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert("Semua API gagal mengambil data");
  }

  loading.classList.add("hidden");
}

async function fetchTikTok(url) {
  const apis = [
    `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`,

    `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`,

    `https://tikwm.com/api/?url=${encodeURIComponent(url)}`,
  ];

  for (let api of apis) {
    try {
      const res = await fetch(api);

      if (!res.ok) continue;

      const json = await res.json();

      // API 1
      if (json.data) {
        return {
          title: json.data.title,
          play: json.data.play,
          music: json.data.music,
          images: json.data.images,
        };
      }

      // API 2
      if (json.video) {
        return {
          title: json.title || "TikTok Video",
          play: json.video.noWatermark || json.video,
          music: json.music,
          images: json.images,
        };
      }
    } catch (err) {
      console.warn("API gagal:", api);

      continue;
    }
  }

  throw new Error("All API Failed");
}

btnVideo.onclick = () => {
  if (videoUrl) {
    directDownload(videoUrl, randomName("mp4"));
  }
};

btnMP3.onclick = () => {
  if (mp3Url) {
    directDownload(mp3Url, randomName("mp3"));
  }
};

// Mobile detection
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

async function directDownload(url, filename) {
  // For mobile, use fetch + blob approach for auto-download
  if (isMobile) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      // Clean up after delay
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback to standard method
      fallbackDownload(url, filename);
    }
  } else {
    // Desktop - use standard method
    fallbackDownload(url, filename);
  }
}

function fallbackDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function clearData() {
  urlInput.value = "";

  video.src = "";

  gallery.innerHTML = "";

  title.innerText = "";

  result.classList.add("hidden");
}
