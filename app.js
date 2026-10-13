// Theme toggle (runs even if Firebase fails to load)
(function () {
  var root = document.documentElement;
  var btn = document.getElementById("theme");
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    btn.textContent = t === "dark" ? "\uD83C\uDF19" : "\u2600\uFE0F";
    try { localStorage.setItem("theme", t); } catch (e) {}
  }
  var saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  var prefersLight = window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches;
  setTheme(saved || (prefersLight ? "light" : "dark"));
  btn.addEventListener("click", function () {
    setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });
})();

// ===== Firebase + Cloudinary app =====
(async function () {
  var fb;
  try {
    var A = await import("https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js");
    var F = await import("https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js");
    fb = Object.assign({}, A, F);
  } catch (e) {
    var s = document.getElementById("setup");
    s.style.display = "block";
    s.innerHTML = "\u26A0\uFE0F Firebase could not load. Open this page using a local server (such as Live Server) or a hosted site.";
    document.getElementById("items").innerHTML = '<div class="empty">Shared items will appear here once the app connects to Firebase.</div>';
    // Bind the file picker and drop handlers below even if Firebase is unavailable.
    fb = {};
  }
  var initializeApp = fb.initializeApp, getFirestore = fb.getFirestore, collection = fb.collection,
      addDoc = fb.addDoc, deleteDoc = fb.deleteDoc, doc = fb.doc, onSnapshot = fb.onSnapshot,
      query = fb.query, orderBy = fb.orderBy, serverTimestamp = fb.serverTimestamp;

/* ====== APNI VALUES YAHAN DAALEIN ====== */
 const firebaseConfig = {
    apiKey: "AIzaSyBusGpiP_B6TFtPaNZdNgeudhs4pzbdnb8",
    authDomain: "auth-app-1885d.firebaseapp.com",
    databaseURL: "https://auth-app-1885d-default-rtdb.firebaseio.com",
    projectId: "auth-app-1885d",
    storageBucket: "auth-app-1885d.firebasestorage.app",
    messagingSenderId: "1079572086382",
    appId: "1:1079572086382:web:449cf8d9bbef6780af307f",
    measurementId: "G-EC6YVH5SCM"
  };
const CLOUDINARY = { cloudName: "zuhpi13g", uploadPreset: "dragdrop" };
/* ======================================= */

const $ = id => document.getElementById(id);
const configured = firebaseConfig.apiKey !== "YOUR_API_KEY" && CLOUDINARY.cloudName !== "YOUR_CLOUD_NAME" && CLOUDINARY.uploadPreset !== "YOUR_UPLOAD_PRESET";
if (!configured || location.protocol === "file:") $("setup").style.display = "block";

const toast = m => { const t=$("toast"); t.textContent=m; t.classList.add("show"); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove("show"),2200); };
const esc = s => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const size = b => b > 1048576 ? (b/1048576).toFixed(1)+" MB" : Math.max(1,Math.round(b/1024))+" KB";
const icon = n => { const e=(n.split(".").pop()||"").toLowerCase(); return ["png","jpg","jpeg","gif","webp","svg"].includes(e)?"🖼️":["mp4","mov","webm","mkv"].includes(e)?"🎬":["mp3","wav","ogg"].includes(e)?"🎵":e==="pdf"?"📕":["zip","rar","7z"].includes(e)?"🗜️":"📄"; };

let col = null, items = [];
if (configured && fb.initializeApp) {
  const db = getFirestore(initializeApp(firebaseConfig));
  col = collection(db, "shares");
  onSnapshot(query(col, orderBy("createdAt","desc")), snap => {
    items = snap.docs.map(d => ({id:d.id, ...d.data()}));
    render();
  }, e => { $("items").innerHTML = `<div class="empty">Firestore error: ${esc(e.message)}</div>`; });
} else if (!configured) { $("items").innerHTML = '<div class="empty">Shared items will appear here after you add the configuration.</div>'; }

function render() {
  $("count").textContent = items.length ? `(${items.length})` : "";
  if (!items.length) { $("items").innerHTML = '<div class="empty">Nothing has been shared yet. Upload a file or share some text to get started. 🚀</div>'; return; }
  $("items").innerHTML = items.map((it,i) => {
    const t = it.createdAt?.toDate ? it.createdAt.toDate().toLocaleString() : "just now";
    const isText = it.type === "text";
    return `<div class="item" style="animation-delay:${Math.min(i,8)*40}ms">
      <div class="ico">${isText?"💬":icon(it.name)}</div>
      <div class="info"><b>${esc(isText?it.text:it.name)}</b><span>${isText?"Text":size(it.size)} • ${t}</span></div>
      <div class="act">
        ${isText?`<button data-copy="${it.id}" title="Copy">📋</button>`:`<a href="${it.url}" target="_blank" rel="noopener" title="Open">↗</a><a href="${it.url.replace('/upload/','/upload/fl_attachment/')}" title="Download">⬇</a>`}
        <button data-del="${it.id}" title="Delete">🗑</button>
      </div></div>`;
  }).join("");
}

$("items").onclick = async e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.copy) { await navigator.clipboard.writeText(items.find(x=>x.id===b.dataset.copy).text); toast("Copied ✓"); }
  if (b.dataset.del && confirm("Delete this item?")) { await deleteDoc(doc(col, b.dataset.del)); toast("Deleted"); }
};

// Text share
$("send").onclick = async () => {
  if (!configured) return toast("Add the configuration first.");
  if (!col) return toast("Firebase is not connected. Check Live Server and your internet connection.");
  const text = $("txt").value.trim(); if (!text) return toast("Enter some text first.");
  await addDoc(col, {type:"text", text, createdAt:serverTimestamp()});
  $("txt").value = ""; toast("Text shared ✓");
};

// Upload to Cloudinary (with progress)
const uploadOne = (file, i, n) => new Promise((res, rej) => {
  const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", CLOUDINARY.uploadPreset);
  const x = new XMLHttpRequest();
  x.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`);
  x.upload.onprogress = e => { if (e.lengthComputable) $("barin").style.width = ((i + e.loaded/e.total)/n*100) + "%"; };
  x.onload = () => x.status < 300 ? res(JSON.parse(x.responseText)) : rej(new Error(JSON.parse(x.responseText).error?.message || "Upload failed"));
  x.onerror = () => rej(new Error("Network error"));
  x.send(fd);
});
async function handleFiles(files) {
  if (!configured) return toast("Add the configuration first.");
  if (!col) return toast("Firebase is not connected. Check Live Server and your internet connection.");
  files = [...files]; if (!files.length) return;
  $("bar").style.display = "block"; $("barin").style.width = "0";
  try {
    for (let i = 0; i < files.length; i++) {
      const r = await uploadOne(files[i], i, files.length);
      await addDoc(col, {type:"file", name:files[i].name, url:r.secure_url, size:files[i].size, createdAt:serverTimestamp()});
    }
    $("barin").style.width = "100%"; toast(`${files.length} file(s) uploaded ✓`);
  } catch (e) { toast(e.message); }
  setTimeout(() => $("bar").style.display = "none", 800);
}
const drop = $("drop");
drop.onclick = () => $("file").click();
drop.onkeydown = e => (e.key==="Enter"||e.key===" ") && $("file").click();
$("file").onchange = e => { handleFiles(e.target.files); e.target.value = ""; };
["dragenter","dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave","drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => handleFiles(e.dataTransfer.files));
window.addEventListener("dragover", e => e.preventDefault());
window.addEventListener("drop", e => e.preventDefault());

})();
