import {GOOGLE_SCOPE,googleOriginAllowed,googlePhotoUrl,pickerUrl,abortableDelay} from './google-picker.js';
import {nativeCommand} from './native-bridge.js';
const IMAGE_FILE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;
const $ = (id) => document.getElementById(id);
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("oled-night-train-albums-"+(window.NACHTBAHN_BOOT?.userId || "preview"), 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("albums", { keyPath: "id" });
      request.result.createObjectStore("photos", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function readAll(db, store) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function writeAlbum(db, album, photos) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["albums", "photos"], "readwrite");
    transaction.objectStore("albums").put(album);
    for (const photo of photos) transaction.objectStore("photos").put(photo);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
export function createPhotoAlbums(onChange) {
  let remotePhotos=[],remoteSignature='';
  let db,
    albums = [],
    photos = [],
    deck = [],
    position = -1,
    lastSlide = 0,
    photoActive = false,
    currentUrl = "",
    googleController,googleAuthCancel;
  const urls = new Map();
  const layer = $("photoLayer");
  layer.innerHTML = '<img alt=""><img alt="">';
  const frames = [...layer.querySelectorAll("img")];
  let front = 0;
  function status(message) {
    $("albumStatus").textContent = message;
  }
  function reshuffle() {
    const selected = new Set(albums.filter((a) => a.enabled).map((a) => a.id));
    deck = photos
      .filter((p) => selected.has(p.albumId))
      .sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
    deck.push(...remotePhotos);
    if ($("photoOrder").value === "shuffle") {
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    }
    position = -1;
    lastSlide = 0;
    currentUrl = "";
    onChange();
  }
  function listAlbums() {
    const container = $("albums");
    container.replaceChildren();
    for (const album of albums) {
      const row = document.createElement("div");
      row.className = "album-row";
      const label = document.createElement("label"),
        check = document.createElement("input");
      check.type = "checkbox";
      check.checked = album.enabled;
      const text = document.createElement("span");
      text.textContent =
        album.name +
        " · " +
        photos.filter((p) => p.albumId === album.id).length +
        " Fotos";
      check.onchange = async () => {
        try {
          album.enabled = check.checked;
          await writeAlbum(db, album, []);
          reshuffle();
        } catch (error) {
          status("Auswahl konnte nicht gespeichert werden: " + error.message);
        }
      };
      label.append(check, text);
      row.append(label);
      container.append(row);
    }
  }
  async function importFiles(files, name) {
    if (!db) throw new Error("Der lokale Albumspeicher ist noch nicht bereit.");
    const supported = Array.from(files).filter((f) => IMAGE_FILE.test(f.name));
    if (!supported.length)
      throw new Error(
        "Keine unterstützten Bilder gefunden. Bitte JPEG, PNG, WebP, GIF, AVIF oder BMP auswählen.",
      );
    if(supported.length>1000||supported.reduce((n,f)=>n+f.size,0)>250*1024*1024)throw Error('Bitte höchstens 1000 Fotos und 250 MB pro Album importieren.');
    const id = crypto.randomUUID(),
      album = { id, name, enabled: true };
    const imported = supported.map((file, index) => ({
      id: id + ":" + index,
      albumId: id,
      name: file.name,
      blob: file,
    }));
    await writeAlbum(db, album, imported);
    albums.push(album);
    photos.push(...imported);
    listAlbums();
    reshuffle();
    $("backgroundMode").value = "photos";
    $("backgroundMode").dispatchEvent(new Event("change"));
    status(`${supported.length} Fotos in „${name}“ gespeichert.`);
  }
  function safeImport(files, name) {
    status("Fotos werden lokal gespeichert …");
    void importFiles(files, name).catch((error) =>
      status("Import nicht möglich: " + error.message),
    );
  }
  $("chooseFolder").onclick = () => $("albumFolder").click();
  $("choosePhotos").onclick = () => $("albumFiles").click();
  $("chooseZip").onclick = () => $("albumZip").click();
  $("albumFolder").onchange = (event) => {
    const files = event.target.files,
      name = files[0]?.webkitRelativePath.split("/")[0] || "Mein Album";
    safeImport(files, name);
    event.target.value = "";
  };
  $("albumFiles").onchange = (event) => {
    safeImport(
      event.target.files,
      "Fotoauswahl " + new Date().toLocaleDateString("de-DE"),
    );
    event.target.value = "";
  };
  $("albumZip").onchange = async (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      status("Album-ZIP wird geöffnet …");
      const { default: JSZip } = await import("./zip-vendor.js");
      const archive = await JSZip.loadAsync(file);
      const groups = new Map();let extractedBytes=0,extractedCount=0;
      for (const entry of Object.values(archive.files)) {
        if (
          entry.dir ||
          !IMAGE_FILE.test(entry.name) ||
          entry.name.startsWith("__MACOSX/")
        )
          continue;
        const segments = entry.name.split("/"),
          name = segments.pop(),
          album = segments.pop() || file.name.replace(/\.zip$/i, "");
        const advertised=entry._data?.uncompressedSize||0;if(advertised>25*1024*1024||extractedBytes+advertised>250*1024*1024||extractedCount>=1000)throw Error('ZIP zu groß: maximal 1000 Bilder, 25 MB pro Bild und 250 MB insgesamt.');
        const blob = await entry.async("blob");extractedBytes+=blob.size;extractedCount++;if(extractedBytes>250*1024*1024)throw Error('ZIP überschreitet 250 MB Bilddaten.');
        const photo = new File([blob], name, {
          type:
            "image/" +
            (/\.png$/i.test(name)
              ? "png"
              : /\.webp$/i.test(name)
                ? "webp"
                : "jpeg"),
        });
        if (!groups.has(album)) groups.set(album, []);
        groups.get(album).push(photo);
      }
      if (!groups.size)
        throw new Error("Im ZIP wurden keine unterstützten Fotos gefunden.");
      let total = 0;
      for (const [name, files] of groups) {
        await importFiles(files, name);
        total += files.length;
      }
      status(`${groups.size} Alben mit ${total} Fotos lokal importiert.`);
    } catch (error) {
      status("ZIP-Import nicht möglich: " + error.message);
    }
  };
  for (const id of ["backgroundMode", "photoOrder", "photoInterval"])
    $(id).addEventListener("change", reshuffle);
  for (const id of ['backgroundMode','photoInterval'])$(id).addEventListener('display-sync',reshuffle);
  function tick(now) {
    const mode = $("backgroundMode").value;
    if (mode === "train" || !deck.length) {
      photoActive = false;
      layer.classList.remove("visible");
      return;
    }
    const interval = Number($("photoInterval").value) * 1000;
    if (lastSlide && now - lastSlide < interval) return;
    if (mode === "mixed" && photoActive) {
      photoActive = false;
      layer.classList.remove("visible");
      lastSlide = now;
      return;
    }
    if (mode === "mixed" && !lastSlide) {
      lastSlide = now;
      return;
    }
    position = (position + 1) % deck.length;
    if (
      position === 0 &&
      $("photoOrder").value === "shuffle" &&
      deck.length > 1 &&
      lastSlide
    ) {
      const previous = deck[deck.length - 1]?.id;
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      if (deck[0].id === previous) [deck[0], deck[1]] = [deck[1], deck[0]];
    }
    const photo = deck[position];
    if (!photo.remoteUrl && !urls.has(photo.id))
      urls.set(photo.id, URL.createObjectURL(photo.blob));
    const url = photo.remoteUrl||urls.get(photo.id);
    front = 1 - front;
    const image = frames[front];
    image.onload = () => {
      image.classList.add("front");
      frames[1 - front].classList.remove("front");
      photoActive = true;
      layer.classList.add("visible");
      onChange();
    };
    image.onerror = () => {
      status("Foto „" + photo.name + "“ konnte nicht angezeigt werden.");
      lastSlide = now - interval + 1000;
    };
    if (url !== currentUrl) {
      image.src = url;
      currentUrl = url;
    } else {
      photoActive = true;
      layer.classList.add("visible");
    }
    lastSlide = now;
  }
  async function googleRequest(path, token, options = {}) {
    const requestController=new AbortController(),abort=()=>requestController.abort();
    const sessionSignal=googleController.signal;sessionSignal.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,30000);
    try{
      const response=await fetch('https://photospicker.googleapis.com/v1/'+path,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},signal:requestController.signal});
      const data=await response.json();
      if(!response.ok)throw Error(data.error?.message||'Google Fotos hat die Anfrage abgelehnt.');
      return data;
    }catch(error){if(error.name==='AbortError'&&!sessionSignal.aborted)throw Error('Google antwortet nicht rechtzeitig. Bitte erneut versuchen.');throw error;}
    finally{clearTimeout(timer);sessionSignal.removeEventListener('abort',abort);}
  }
  function googleStatus(message) {
    $("googleStatus").textContent = message;
  }
  const googleClientKey='oled-google-client-id:'+(window.NACHTBAHN_BOOT?.userId||'preview');
  try{$('googleClientId').value=localStorage.getItem(googleClientKey)||'';}catch{}
  $('googleClientId').addEventListener('change',()=>{try{localStorage.setItem(googleClientKey,$('googleClientId').value.trim());}catch{}});
  $("googleOrigin").textContent = window.NACHTBAHN_BOOT?.parentOrigin || location.origin;
  $("googleCancel").onclick = () => {
    googleAuthCancel?.();googleAuthCancel=null;googleController?.abort();
    $("googleCancel").hidden=true;$("googleConnect").disabled=false;googleStatus("Auswahl abgebrochen.");
  };
  $("googleConnect").onclick = async () => {
    googleAuthCancel?.();googleAuthCancel=null;googleController?.abort();
    if(!googleOriginAllowed(window.NACHTBAHN_BOOT?.parentOrigin||location.origin)){googleStatus('Google benötigt hier eine akzeptierte HTTPS-Adresse für Home Assistant. Die lokale HTTP-Adresse funktioniert für OAuth nicht. Alternativ Google Takeout importieren.');return;}
    const clientId = $("googleClientId").value.trim();
    if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
      googleStatus(
        "Bitte zuerst die OAuth-Client-ID deiner Google-Photos-Picker-App eintragen.",
      );
      return;
    }
    try {
      const receiveToken = async (response) => {
          if (response.error) {
            googleStatus("Google-Anmeldung wurde abgebrochen oder abgelehnt.");
            return;
          }
          googleController = new AbortController();
          $("googleCancel").hidden = false;
          $("googleConnect").disabled = true;
          let session;
          try {
            const token = response.access_token;
            if(!token)throw Error('Google hat kein Zugriffstoken geliefert.');
            session = await googleRequest("sessions", token, {
              method: "POST",
              body: "{}",
            });
            const link = document.createElement("a");
            link.href = pickerUrl(session.pickerUri);
            link.target = "_blank";
            link.rel = "noopener";
            link.textContent = "Fotoauswahl bei Google öffnen ↗";
            $("googleStatus").replaceChildren(
              "Bitte die Fotos bei Google auswählen. ",
              link,
            );
            link.click();
            const started = Date.now();
            let ready = false;
            while (!ready) {
              const wait = Math.max(
                1000,
                parseFloat(session.pollingConfig?.pollInterval || "5s") * 1000,
              );
              const timeout =
                parseFloat(session.pollingConfig?.timeoutIn || "600s") * 1000;
              if (Date.now() - started > timeout)
                throw new Error(
                  "Die Google-Auswahl ist abgelaufen. Bitte erneut starten.",
                );
              await abortableDelay(wait,googleController.signal);
              session = await googleRequest(
                "sessions/" + encodeURIComponent(session.id),
                token,
              );
              ready = session.mediaItemsSet === true;
            }
            const files = [];
            let pageToken = "";
            do {
              const params = new URLSearchParams({
                sessionId: session.id,
                pageSize: "100",
              });
              if (pageToken) params.set("pageToken", pageToken);
              const page = await googleRequest("mediaItems?" + params, token);
              for (const item of page.mediaItems || []) {
                if (item.type !== "PHOTO") continue;
                googleStatus(`${files.length} Fotos übernommen …`);
                const download=await fetch(googlePhotoUrl(item.mediaFile.baseUrl),{headers:{Authorization:'Bearer '+token},signal:googleController.signal});
                if (!download.ok)
                  throw new Error(
                    "Ein ausgewähltes Google-Foto konnte nicht geladen werden.",
                  );
                files.push(
                  new File(
                    [await download.blob()],
                    item.mediaFile.filename ||
                      "google-" + files.length + ".jpg",
                    { type: item.mediaFile.mimeType||"image/jpeg" },
                  ),
                );
              }
              pageToken = page.nextPageToken || "";
            } while (pageToken);
            await importFiles(
              files,
              "Google Fotos " + new Date().toLocaleDateString("de-DE"),
            );
            googleStatus(
              files.length + " ausgewählte Fotos lokal gespeichert.",
            );
            await googleRequest(
              "sessions/" + encodeURIComponent(session.id),
              token,
              { method: "DELETE" },
            ).catch(() => {});
          } catch (error) {
            googleStatus(
              error.name === "AbortError"
                ? "Auswahl abgebrochen."
                : error.message,
            );
          } finally {
            $("googleCancel").hidden = true;
            $("googleConnect").disabled = false;
          }
      };
      const nonce=crypto.randomUUID(),origin=window.NACHTBAHN_BOOT?.parentOrigin||location.origin;
      const helper=new URL('/local/community/oled-bildschirmschoner/google-picker.html',origin);helper.searchParams.set('client_id',clientId);helper.searchParams.set('nonce',nonce);
      const popup=window.open(helper.href,'oled-google-auth','width=620,height=760');
      if(!popup)throw Error('Bitte Pop-ups für die Fotoauswahl erlauben und erneut versuchen.');
      googleStatus('Bitte im geöffneten Fenster bei Google anmelden.');
      const timeout=setTimeout(()=>{googleAuthCancel?.();googleAuthCancel=null;googleStatus('Google-Anmeldung abgelaufen. Bitte erneut starten.');},300000);
      const listener=event=>{if(event.source!==popup||event.origin!==origin||event.data?.type!=='oled-google-token'||event.data?.nonce!==nonce)return;clearTimeout(timeout);window.removeEventListener('message',listener);googleAuthCancel=null;void receiveToken({access_token:event.data.token});};
      window.addEventListener('message',listener);googleAuthCancel=()=>{clearTimeout(timeout);window.removeEventListener('message',listener);};

    } catch (error) {
      googleStatus(error.message);
    }
  };
  void openDatabase()
    .then(async (database) => {
      db = database;
      [albums, photos] = await Promise.all([
        readAll(db, "albums"),
        readAll(db, "photos"),
      ]);
      listAlbums();
      reshuffle();
      status(
        albums.length
          ? `${albums.length} gespeicherte Alben verfügbar.`
          : "Noch kein eigenes Album ausgewählt.",
      );
    })
    .catch((error) =>
      status("Lokaler Albumspeicher ist nicht verfügbar: " + error.message),
    );
  window.addEventListener("beforeunload", () => {
    for (const url of urls.values()) URL.revokeObjectURL(url);
    googleAuthCancel?.();googleController?.abort();
  });
  return {
    tick,
    setRemotePhotos(value){
      const clean=(Array.isArray(value)?value:[]).filter(photo=>/^[a-f0-9]{32}$/.test(photo.id)).map(photo=>({id:'ha:'+photo.id,originalId:photo.id,name:String(photo.name||'Eigenes Foto'),remoteUrl:'/api/image/serve/'+photo.id+'/original'}));
      const signature=JSON.stringify(clean);if(signature===remoteSignature)return;remoteSignature=signature;remotePhotos=clean;
      $('haPhotos').hidden=!clean.length;$('haPhotoList').replaceChildren(...clean.map((photo,index)=>{
        const item=document.createElement('div'),image=document.createElement('img'),name=document.createElement('small');image.src=photo.remoteUrl;image.alt=photo.name;image.loading='lazy';name.textContent=photo.name;item.append(image,name);
        for(const [label,remove]of [['Nach vorne',false],['Aus Diashow nehmen',true]]){const button=document.createElement('button');button.textContent=label;button.disabled=!remove&&index===0;button.onclick=()=>nativeCommand('gallery-edit',{id:photo.originalId,remove});item.append(button);}return item;
      }));reshuffle();
    },
    get active() {
      return photoActive;
    },
  };
}
