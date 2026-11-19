import {nativeRequest} from "./native-bridge.js";
import { PLAYLISTS, playlistKey, youtubePlaylist } from "./music-data.js";
const $ = (id) => document.getElementById(id);
export function setupMusic(getTheme, saveSettings) {
  const userSuffix=window.NACHTBAHN_BOOT?.userId || "preview";
  const linksKey="oled-night-train-youtube-"+userSuffix;
  const speakerKey="oled-night-train-speaker-"+userSuffix;
  let connected = false,
    pending = false,
    currentKey = "winter";
  let playback={state:'idle'},youtubeOpen=false;
  function apply(context){
    if(context?.music)playback=context.music;
    const playing=youtubeOpen||playback.state==='playing';
    $('stopMusic').disabled=pending||!(youtubeOpen||['playing','paused','buffering'].includes(playback.state));
    $('musicButton').setAttribute('aria-pressed',String(playing));
    $('nowPlaying').hidden=!playing;
    $('trackTitle').textContent=youtubeOpen?'YouTube-Playlist':playback.title||'Musik läuft';
    $('trackArtist').textContent=youtubeOpen?'Auf diesem Display':playback.artist||playback.speaker||'';
    $('trackCover').hidden=youtubeOpen||!playback.cover;
    if(playback.cover&&$('trackCover').getAttribute('src')!==playback.cover)$('trackCover').src=playback.cover;
  }
  async function selectPlayer(){if(window.NACHTBAHN_NATIVE)try{apply(await nativeRequest('select-player',{entityId:$('speaker').value}));}catch(error){feedback(error.message);}}
  window.addEventListener('message',event=>{if(event.source===parent&&event.origin===window.NACHTBAHN_BOOT?.parentOrigin&&event.data?.type==='oled-night-train-context')apply(event.data.context);});
  function feedback(message) {
    $("musicFeedback").textContent = message;
    clearTimeout(feedback.timer);
    feedback.timer = setTimeout(
      () => ($("musicFeedback").textContent = ""),
      7000,
    );
  }
  function links() {
    try {
      return JSON.parse(
        localStorage.getItem(linksKey) || "{}",
      );
    } catch {
      return {};
    }
  }
  function update() {
    const { season, occasion } = getTheme();
    currentKey = playlistKey(season, occasion);
    $("musicCommand").value = PLAYLISTS[currentKey].command;
    $("youtubeLink").value = links()[currentKey] || "";
    $("musicButton").title = PLAYLISTS[currentKey].command;
    $("speaker").disabled = $("musicSource").value === "youtube";
    $("playlistStatus").textContent =
      $("musicSource").value === "youtube"
        ? "YouTube startet im eingeblendeten Player auf diesem Display."
        : "Musik startet erst beim Antippen des Lautsprechersymbols.";
  }
  async function request(path, options) {
    if(window.NACHTBAHN_NATIVE){
      if(path==='/api/ha/status')return {connected:true};
      if(path==='/api/ha/speakers')return nativeRequest('speakers');
      if(path==='/api/ha/play')return nativeRequest('play',JSON.parse(options.body));
      if(path==='/api/ha/stop')return nativeRequest('stop',JSON.parse(options.body));
      throw new Error('Diese Aktion ist nicht verfügbar.');
    }

    const response = await fetch(path, options),
      data = await response.json();
    if (!response.ok)
      throw new Error(
        data.error || "Verbindung konnte nicht hergestellt werden.",
      );
    return data;
  }
  async function refresh() {
    try {
      const state = await request("/api/ha/status");
      connected = state.connected;
      if (!connected) {
        $("haStatus").textContent =
          "Für echte Musikwiedergabe Home Assistant verbinden.";
        return;
      }
      const { speakers } = await request("/api/ha/speakers");
      const select = $("speaker"),
        previous = select.value || localStorage.getItem(speakerKey);
      select.replaceChildren();
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Lautsprecher auswählen";
      select.append(empty);
      for (const target of speakers) {
        const option = document.createElement("option");
        option.value = target.id;
        option.textContent =
          target.name + (target.available ? "" : " · nicht erreichbar");
        option.disabled = !target.available;
        select.append(option);
      }
      if (speakers.some((s) => s.id === previous))
        select.value = previous;
      await selectPlayer();

      $("haStatus").textContent =
        "Home Assistant verbunden · " +
        speakers.filter((s) => s.available).length +
        " erreichbare Lautsprecher.";
      $("connectHa").textContent = "Verbindung aktualisieren";
    } catch (error) {
      $("haStatus").textContent = error.message;
    }
  }
  $("connectHa").onclick = () => {
    if (connected) {
      void refresh();
      return;
    }
    const popup = window.open(
      "/api/ha/login",
      "nachtbahn-ha-login",
      "width=550,height=740",
    );
    if (!popup)
      $("haStatus").textContent =
        "Bitte das Anmeldefenster im Browser zulassen.";
  };
  window.addEventListener("message", (event) => {
    if (
      event.origin === location.origin &&
      event.data?.type === "nachtbahn-ha-connected"
    )
      void refresh();
  });
  $("speaker").onchange = () => {
    localStorage.setItem(speakerKey, $("speaker").value);
    void selectPlayer();
    saveSettings();
  };
  $("musicSource").addEventListener("change", update);
  $("youtubeLink").onchange = () => {
    try {
      const stored = links(),
        value = $("youtubeLink").value.trim();
      if (value) stored[currentKey] = youtubePlaylist(value).url;
      else delete stored[currentKey];
      localStorage.setItem(linksKey, JSON.stringify(stored));
      $("playlistStatus").textContent = value
        ? "Playlist für diesen Anlass gespeichert."
        : "Playlist-Link entfernt.";
    } catch (error) {
      $("playlistStatus").textContent = error.message;
    }
  };
  $("closeYoutube").onclick = () => {
    $("youtubeFrame").replaceChildren();
    $("youtubePlayer").hidden = true;
    youtubeOpen=false;apply();
  };
  $('stopMusic').onclick=async()=>{
    if(pending)return;
    if(youtubeOpen){$('closeYoutube').click();feedback('YouTube gestoppt.');return;}
    pending=true;apply();
    try{const result=await request('/api/ha/stop',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entityId:$('speaker').value})});feedback(result.message);}
    catch(error){feedback(error.message);}finally{pending=false;apply();}
  };
  $("musicButton").onclick = async () => {
    if (pending) return;
    if ($("musicSource").value === "youtube") {
      try {
        const playlist = youtubePlaylist(links()[currentKey] || "");
        const iframe = document.createElement("iframe");
        iframe.title = "YouTube-Playlist";
        iframe.src =
          "https://www.youtube-nocookie.com/embed/videoseries?list=" +
          playlist.id +
          "&autoplay=1";
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        if(window.NACHTBAHN_NATIVE && window.NACHTBAHN_BOOT.mode==='scene')document.body.append($("youtubePlayer"));
        $("youtubeFrame").replaceChildren(iframe);
        $("youtubePlayer").hidden = false;
        youtubeOpen=true;apply();
        $("youtubeExternal").href = playlist.url;
        if (document.fullscreenElement) await document.exitFullscreen();
        $("screen").classList.remove("expanded");
        document.body.style.overflow = "";
        const section=$("youtubePlayer").closest("details");if(section)section.open=true;
        $("youtubePlayer").scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        feedback("YouTube-Playlist geöffnet.");
      } catch {
        feedback(
          "Bitte in den Musikeinstellungen einen YouTube-Playlist-Link für diesen Anlass eintragen.",
        );
      }
      return;
    }
    if (!connected) {
      feedback(
        "Bitte zuerst Home Assistant in den Musikeinstellungen verbinden.",
      );
      return;
    }
    const entityId = $("speaker").value;
    if (!entityId) {
      feedback("Bitte in den Einstellungen einen Lautsprecher auswählen.");
      return;
    }
    pending = true;
    $("musicButton").disabled = true;
    try {
      feedback("Musikwunsch wird gesendet …");
      const result = await request("/api/ha/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: currentKey, entityId }),
      });
      feedback(result.message);
    } catch (error) {
      feedback(error.message);
    } finally {
      pending = false;
      $("musicButton").disabled = false;
      apply();
    }
  };
  void refresh();
  update();
  apply();
  return { update, apply, get playback(){return youtubeOpen?{state:'playing',title:'YouTube-Playlist',artist:'Auf diesem Display'}:playback;} };
}
