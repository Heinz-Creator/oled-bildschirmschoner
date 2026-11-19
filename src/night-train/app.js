import {setupDisplaySettings} from './display-settings.js';
import {houseCopyGroups} from './house-copy.js';
import {ambientVisibleRows} from '../ambient-rows.js';
import {setupNativeWorld} from "./native-ui.js";
import {nativeRequest,nativeCommand} from "./native-bridge.js";
import { createArtworkRenderer } from "./artwork.js";
import { EventSchedule, EVENT_DEFAULTS, EVENT_NAMES } from "./events.js";
import { createPhotoAlbums } from "./photos.js";
import { setupMusic } from "./music.js";
import { occasionForDate } from "./calendar.js";
import {drawWeatherSky} from './weather-sky.js';
import {setupSettingsPanels} from './settings-ui.js';
import {setupDoorbellSettings} from './doorbell-settings.js';
import {wasteNotices,wasteCopy} from './waste-notice.js';
import {createStoryVisuals,storyCamera} from './story-visuals.js';
const $ = (id) => document.getElementById(id);
const canvas = $("world"),
  ctx = canvas.getContext("2d"),
  screen = $("screen");
const controls = Object.fromEntries(
  ["season", "occasion", "light", "weatherSelect"].map((id) => [id, $(id)]),
);
const labels = {
  spring: "Frühling",
  summer: "Sommer",
  autumn: "Herbst",
  winter: "Winter",
  none: "Unterwegs durch die Nacht",
  easter: "Osterfahrt",
  may: "Fahrt in den Mai",
  mothers: "Blumenfahrt zum Muttertag",
  fathers: "Ausflug zum Vatertag",
  halloween: "Der Geisterexpress",
  nicholas: "Der Nikolauszug",
  christmas: "Die Weihnachtsnacht",
  christmas_eve: "Heiligabend · 24. Dezember",
  newyear: "Fahrt ins neue Jahr",
  birthday: "Der Geburtstagszug",
  valentine:"Valentinstag",pentecost:"Pfingsten",unityday:"Tag der Deutschen Einheit",
};
const eventCopy = {
  laundry: ["Waschmaschine fertig", "Die frische Wäsche wartet auf dich."],
  dishes: [
    "Geschirrspüler fertig",
    "Alles sauber. Das Geschirr kann ausgeräumt werden.",
  ],
  waste: [
    "Morgen wird die Tonne geleert",
    "Bitte die passende Tonne bereitstellen.",
  ],
  charging: [
    "Auto lädt mit Sonnenstrom",
    "Ein guter Moment für saubere Energie.",
  ],
  visitor: ["Besuch an der Tür", "Jemand wartet auf dich."],
};
const settings = structuredClone(EVENT_DEFAULTS);
let paused = matchMedia("(prefers-reduced-motion: reduce)").matches,
  time = 0,
  last = performance.now(),
  active = null,
  photos,
  music;
const settingsKey = "oled-night-train-settings-v1:"+(window.NACHTBAHN_BOOT?.userId || "preview");
const settingIds = [
  "season",
  "occasion",
  "light",
  "weatherSelect",
  "eventDisplay",
  "finishedLifetime",
  "wasteRepeat",
  "musicSource",
  "backgroundMode",
  "photoOrder",
  "photoInterval",
  "googleClientId",
];
let stored = {};
try {
  stored = JSON.parse(localStorage.getItem(settingsKey) || "{}");
} catch {}
for (const id of settingIds) {
  const element = $(id);
  if (stored[id] !== undefined) {
    if (element.tagName === "SELECT") {
      if ([...element.options].some((option) => option.value === stored[id]))
        element.value = stored[id];
    } else element.value = stored[id];
  }
}
for (const [key, name] of Object.entries(EVENT_NAMES)) {
  const label = document.createElement("label");
  label.textContent = name;
  const select = document.createElement("select");
  select.id = "duration-" + key;
  for (const value of [5, 10, 15, 20, 30, 45, 60]) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = value + " Sekunden";
    select.append(option);
  }
  const configured = Number(stored.durations?.[key]);
  settings.durations[key] = [5, 10, 15, 20, 30, 45, 60].includes(configured)
    ? configured
    : key === "waste"
      ? 15
      : EVENT_DEFAULTS.durations[key];
  select.value = String(settings.durations[key]);
  label.append(select);
  $("eventDurations").append(label);
  select.onchange = () => {
    settings.durations[key] = Number(select.value);
    schedule.switchAt = performance.now() + settings.durations[key] * 1000;
    saveSettings();
    refresh();
  };
}
settings.finishedLifetime = Number($("finishedLifetime").value);
settings.wasteRepeat = Number($("wasteRepeat").value);
const schedule = new EventSchedule(settings);
function saveSettings() {
  const data = Object.fromEntries(settingIds.map((id) => [id, $(id).value]));
  data.durations = settings.durations;data.lightingVersion=2;
  try {
    localStorage.setItem(settingsKey, JSON.stringify(data));
  } catch {
    $("eventState").textContent =
      "Einstellungen können in diesem Browser nicht dauerhaft gespeichert werden.";
  }
}
function refresh() {
  active = schedule.active(performance.now());
  if(window.NACHTBAHN_BOOT?.mode!=='settings')for (const input of document.querySelectorAll("input[data-event]")) {
    const enabled = schedule.events.has(input.dataset.event);
    if (input.dataset.liveState !== String(enabled)) {
      input.checked = enabled;
      input.dataset.liveState = String(enabled);
    }
  }
  const notice = $("notice");
  screen.classList.toggle("has-event-card",!!active&&$("eventDisplay").value!=="graphics");
  notice.classList.toggle("visible", !!active);
  screen.classList.toggle(
    "graphics-only",
    $("eventDisplay").value === "graphics",
  );
  let wasteConfirmed={};const wasteKey='oled-waste-confirmed:'+window.NACHTBAHN_BOOT?.userId;
  try{const value=JSON.parse(localStorage.getItem(wasteKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))wasteConfirmed=value;}catch{}
  const wasteItems=active==='waste'?wasteNotices(nativeContext?.activities,Date.now(),nativeContext?.timeZone,wasteConfirmed):[];
  const copy=active==='waste'?wasteCopy(wasteItems):null,noticeKey=(active==='waste'?active+JSON.stringify(wasteItems):active)+'|'+$('finishedLifetime').value;
  if (active && notice.dataset.event !== noticeKey) {
    const title = document.createElement("strong"),
      detail = document.createElement("small");
    title.textContent = copy?.title||eventCopy[active][0];
    detail.textContent = copy?.detail||eventCopy[active][1];
    notice.replaceChildren(title, detail);
    notice.dataset.event = noticeKey;
    if(Number($('finishedLifetime').value)===0){
     const key=active,button=document.createElement('button');button.className='acknowledge-event';button.textContent='Quittieren';button.setAttribute('aria-label',EVENT_NAMES[key]+' quittieren');button.onclick=event=>{event.stopPropagation();if(window.NACHTBAHN_NATIVE){const detail={event:key};document.dispatchEvent(new CustomEvent('oled-event-ack',{detail}));if(detail.error)button.textContent=detail.error;}else{schedule.set(key,false,performance.now());refresh();}};notice.append(button);
    }
    if(active==='waste'&&$('previewBanner').hidden)for(const item of wasteItems.filter(i=>i.phase==='today'||i.phase==='collected')){
     const button=document.createElement('button');button.textContent=item.phase==='collected'?item.name+': Bestätigung zurücknehmen':item.name+': Abgeholt bestätigen';button.onclick=event=>{event.stopPropagation();const next={...wasteConfirmed};if(item.phase==='collected')delete next[item.key];else next[item.key]=true;for(const key of Object.keys(next))if(!key.startsWith(item.key.slice(0,10)))delete next[key];try{localStorage.setItem(wasteKey,JSON.stringify(next));delete notice.dataset.event;refresh();}catch{button.textContent='Bestätigung konnte nicht gespeichert werden';}};notice.append(button);
    }
  } else if (!active) {
    notice.replaceChildren();
    delete notice.dataset.event;
  }
  const text =
    active === "visitor"
      ? "Besuch wird sofort angezeigt."
      : schedule.events.size
        ? `${schedule.events.size} Ereignisse aktiv. ${active ? "Gerade angezeigt: " + EVENT_NAMES[active] : "Die Müll-Erinnerung erscheint im gewählten Abstand."}`
        : "Hausereignisse oben zum Testen einschalten.";
  if ($("eventState").textContent !== text) $("eventState").textContent = text;
}
let nativeContext = window.NACHTBAHN_BOOT;let doorbellSettings;
if(!stored.lightingVersion)controls.light.value='auto';
if(window.NACHTBAHN_NATIVE)controls.light.value=nativeContext?.scene?.lightingMode||'auto';
if(window.NACHTBAHN_NATIVE && !stored.season)controls.season.value='auto';
if(window.NACHTBAHN_NATIVE && !stored.occasion)controls.occasion.value='auto';

const artwork = createArtworkRenderer(ctx, () => render());
new ResizeObserver(entries=>screen.style.setProperty('--event-card-height',entries[0].target.getBoundingClientRect().height+'px')).observe($('notice'));
const storyVisuals=createStoryVisuals(ctx,()=>render());
let camera={zoom:1,tx:0,ty:0};
const displaySettings=setupDisplaySettings();
let previousVisual='';
$('themeTeddy').onload=()=>{previousVisual='';syncVisual();};
function applyBackdrop(context){
 const theme=context.scene?.theme||'railway',image=$('themeImage'),teddy=$('themeTeddy');
 image.hidden=theme==='railway'||theme==='teddy'||!context.backgroundUrl;
 if(!image.hidden&&image.getAttribute('src')!==context.backgroundUrl)image.src=context.backgroundUrl;
 teddy.hidden=theme!=='teddy'||!context.teddyUrl;
 if(!teddy.hidden&&teddy.getAttribute('src')!==context.teddyUrl)teddy.src=context.teddyUrl;
 if(teddy.hidden&&teddy.hasAttribute('src'))teddy.removeAttribute('src');
 $('powerHint').textContent=context.display?.power||'';
 $('worldName').textContent=context.display?.motifs?.find(motif=>motif.id===theme)?.name||({railway:'Die kleine Nachtbahn',teddy:'Teddy auf Tour',minecraft:'Minecraft-Welt',tree:'Baum & Jahreszeiten',coast:'Lichtküste',home:'Unser Zuhause'})[theme]||'OLED Zuhause';
}
function syncVisual(){
  if(!window.NACHTBAHN_NATIVE)return;
  const data={storyMode:nativeContext?.scene?.animatedWorld===true,event:active,music:music?.playback||{state:'idle'}};
  const key=JSON.stringify(data);
  if(key!==previousVisual){previousVisual=key;nativeCommand('visual',data);$('themeTeddy').contentWindow?.postMessage({type:'oled-world-visual',...data},'*');}
}
function occasion() {
  if (controls.occasion.value==='auto' && nativeContext?.scene) {
    if (!nativeContext.scene.holiday) return 'none';
    const today = new Intl.DateTimeFormat('en-GB',{timeZone:nativeContext.timeZone,month:'2-digit',day:'2-digit'}).format(new Date());
    return nativeContext.scene.holiday==='christmas'&&today==='24/12'?'christmas_eve':({mothersday:'mothers',fathersday:'fathers'})[nativeContext.scene.holiday]||nativeContext.scene.holiday;
  }

  return controls.occasion.value === "auto"
    ? occasionForDate()
    : controls.occasion.value;
}
function actualSeason(){return controls.season.value==="auto"?nativeContext?.scene?.season || ["winter","winter","spring","spring","spring","summer","summer","summer","autumn","autumn","autumn","winter"][new Date().getMonth()]:controls.season.value;}
function render() {
  if(window.NACHTBAHN_NATIVE && window.NACHTBAHN_BOOT.mode==='settings')return;
  const theme=nativeContext?.scene?.theme||'railway';
  const overlay=window.NACHTBAHN_NATIVE&&theme!=='railway';
  document.body.classList.toggle('photo-background',photos?.active===true);
  document.body.classList.toggle('native-overlay',overlay);document.documentElement.classList.toggle('native-overlay',overlay);
  let weather = controls.weatherSelect.value;
  if (weather === "auto")
    weather = nativeContext?.weather || (actualSeason() === "winter" ? "snow" : "clear");
  weather=({snowy:"snow","snowy-rainy":"snow",rainy:"rain",pouring:"rain","lightning-rainy":"rain"})[weather]||weather;
  const drawing={
    season: actualSeason(),
    occasion: occasion(),
    light: controls.light.value==='auto'?(nativeContext?.scene?.assetNight??(new Date().getHours()<7||new Date().getHours()>=19)?'night':'day'):controls.light.value,
    weather,
    time,
    activeEvent: null,
    photoMode: !!nativeContext?.photoUrl || photos?.active === true,
  };
  const platformScene=nativeContext?.scene?.animatedWorld===true&&theme==='railway'&&!photos?.active&&(active||music?.playback?.state==='playing')?()=>storyVisuals.draw({theme,activeEvent:active,music:music?.playback,time,night:nativeContext?.scene?.assetNight,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches||nativeContext?.display?.preferences?.animated===false}):null;
  drawing.platformScene=platformScene;
  if(overlay){ctx.clearRect(0,0,1600,900);if(theme!=="teddy")drawWeatherSky(ctx,weather,time,nativeContext?.scene?.assetNight);}else artwork.draw(drawing);
  const stories=nativeContext?.scene?.animatedWorld===true&&!photos?.active;
  document.body.classList.toggle('story-world',stories);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||nativeContext?.display?.preferences?.animated===false;
  const visualArgs={theme,activeEvent:active,music:music?.playback,time,duration:settings.durations[active]||10,night:nativeContext?.scene?.assetNight,photoMode:photos?.active===true,reduced};
  // Illustrated classic motifs keep their original scene; event characters belong to animated worlds.
  if(stories&&!platformScene)storyVisuals.draw(visualArgs);
  const storyEvent=stories?(active||(music?.playback?.state==='playing'?'music':null)):null;
  const target=storyEvent?storyCamera(theme,storyEvent,innerWidth,innerHeight):{zoom:1,tx:0,ty:0};
  const speed=reduced?1:.035;for(const key of ['zoom','tx','ty'])camera[key]+=(target[key]-camera[key])*speed;
  const fit=Math.max(innerWidth/1600,innerHeight/900),ox=(innerWidth-1600*fit)/2,oy=(innerHeight-900*fit)/2;
  for(const element of [canvas,$('themeImage'),$('themeTeddy')]){
   element.style.transformOrigin='0 0';
   if(stories){element.style.width=1600*fit+'px';element.style.height=900*fit+'px';element.style.left=ox+'px';element.style.top=oy+'px';element.style.transform=`translate(${camera.tx+ox*(camera.zoom-1)}px,${camera.ty+oy*(camera.zoom-1)}px) scale(${camera.zoom})`;}
   else{for(const key of ['width','height','left','top','transform'])element.style[key]='';camera={zoom:1,tx:0,ty:0};}
  }

  syncVisual();
  renderHouseStatus();
}
function renderHouseStatus(){
  const identify=text=>{const value=String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');if(/waschmaschine|washer/.test(value))return 'laundry';if(/geschirr|spulmaschine|dishwasher/.test(value))return 'dishes';if(/besuch|klingel|doorbell/.test(value))return 'visitor';if(wasteNotices([{title:text}],Date.now(),nativeContext?.timeZone).length)return 'waste';if(/lad|charg/.test(value)&&/solar|sonnenstrom|pv/.test(value))return 'charging';return null;};
  const graphicsOnly=$('eventDisplay').value==='graphics';
  const rows=(nativeContext?.activities||[]).filter(row=>!(nativeContext?.acknowledgedEvents||[]).includes(identify((row?.title||'')+' '+(row?.detail||'')))).filter(row=>row?.title&&!/offline|ps5-network/.test(row.key||'')).filter(row=>{const type=identify((row?.title||'')+' '+(row?.detail||''));return !type||(!graphicsOnly&&type!==active);});
  const shown=ambientVisibleRows(rows,Date.now(),3);if(nativeContext?.scene?.morning)shown.push(...(nativeContext.display?.brief||[]));const key=JSON.stringify(shown);
  $('houseStatus').hidden=!shown.length||(nativeContext?.scene?.animatedWorld===true&&!!active);
  if($('houseRows').dataset.content===key)return;
  $('houseRows').replaceChildren(...houseCopyGroups(shown).map(group=>{const section=document.createElement('section'),heading=document.createElement('h3');heading.textContent=group.title;section.append(heading);for(const line of group.lines){const p=document.createElement('p');p.textContent=line;section.append(p);}return section;}));$('houseRows').dataset.content=key;
}
function updateCopy() {
  $("sceneLabel").textContent =
    labels[actualSeason()] + " · " + labels[occasion()];
  $("greeting").textContent =
    controls.light.value === "night"
      ? "Ein ruhiger Abend."
      : controls.light.value === "morning"
        ? "Ein neuer Tag beginnt."
        : "Zeit zum Ankommen.";
  if(window.NACHTBAHN_NATIVE){const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:nativeContext?.timeZone||'Europe/Berlin',hour:'2-digit',hourCycle:'h23'}).format(new Date()));$('greeting').textContent=hour<6?'Eine ruhige Nacht.':hour<11?'Guten Morgen.':hour<18?'Einen schönen Tag.':'Ein ruhiger Abend.';}
  $("temperature").textContent = {
    spring: "12°",
    summer: "22°",
    autumn: "8°",
    winter: "−2°",
  }[actualSeason()];
  $("weather").textContent = {
    spring: "Frühlingsluft",
    summer: "Ein milder Sommerabend",
    autumn: "Herbst in Mondtal",
    winter: "Winter in Mondtal",
  }[actualSeason()];
  music?.update();
  render();
}
for (const id of settingIds)
  $(id).addEventListener("change", () => {
    settings.finishedLifetime = Number($("finishedLifetime").value);
    settings.wasteRepeat = Number($("wasteRepeat").value);
    saveSettings();
    if(id==='light'&&window.NACHTBAHN_NATIVE)nativeCommand('lighting',{value:controls.light.value});
    refresh();
    updateCopy();
  });
for (const input of document.querySelectorAll("input[data-event]"))
  input.addEventListener("change", () => {
    schedule.set(input.dataset.event, input.checked, performance.now());
    refresh();
    render();
  });
const pauseButton = $("pause");
function syncPause() {
  pauseButton.textContent = paused
    ? "Animation fortsetzen"
    : "Animation pausieren";
  pauseButton.setAttribute("aria-pressed", String(paused));
}
pauseButton.onclick = () => {
  paused = !paused;
  syncPause();
};
syncPause();
$("hideUi").onchange = (event) =>
  screen.classList.toggle("hidden", event.target.checked);
$("fullscreen").onclick = async () => {
  try {
    await screen.requestFullscreen();
  } catch {
    screen.classList.add("expanded");
    document.body.style.overflow = "hidden";
  }
};
$("exitFull").onclick = async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  screen.classList.remove("expanded");
  document.body.style.overflow = "";
};
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    screen.classList.remove("expanded");
    document.body.style.overflow = "";
  }
});
function resize() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = 1600 * ratio;
  canvas.height = 900 * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  render();
}
window.addEventListener("resize", resize);
function updateClock() {
  const date = new Date();
  $("clock").textContent = date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: nativeContext?.timeZone || "Europe/Berlin",
  });
  $("date").textContent = date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: nativeContext?.timeZone || "Europe/Berlin",
  });
}
photos = createPhotoAlbums(() => render());
music = setupMusic(
  () => ({ season: actualSeason(), occasion: occasion() }),
  saveSettings,
);
setupNativeWorld({schedule,refresh,render,applyContext:context=>{
  nativeContext={...nativeContext,...context};applyBackdrop(nativeContext);displaySettings.apply(context.display);doorbellSettings?.apply(context.doorbell);photos?.setRemotePhotos(context.display?.gallery||[]);if(context.scene?.lightingMode)controls.light.value=context.scene.lightingMode;const photo=$('legacyPhoto');photo.hidden=!context.photoUrl;if(context.photoUrl&&photo.getAttribute('src')!==context.photoUrl)photo.src=context.photoUrl;updateCopy();
  music?.apply(context);previousVisual='';syncVisual();
  if(Number.isFinite(context.temperature))$('temperature').textContent=context.temperature.toLocaleString('de-DE',{maximumFractionDigits:1})+'°';
  if(context.weather)$('weather').textContent=({rainy:'Regen',pouring:'Starker Regen',snowy:'Schnee',clear:'Klar','clear-night':'Klare Nacht',sunny:'Sonnig',cloudy:'Bewölkt',partlycloudy:'Wolkig'})[context.weather]||'Draußen';
}});
setupSettingsPanels();
doorbellSettings=setupDoorbellSettings();doorbellSettings.apply(nativeContext?.doorbell);
resize();
refresh();
updateCopy();
updateClock();
setInterval(updateClock, 1000);
document.addEventListener("visibilitychange", () => {
  last = performance.now();
});
let lastRendered=0;
function frame(now) {
  const delta = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!document.hidden) {
    const previous = active;
    refresh();
    photos.tick(now);
    if (!paused) time += delta;
    if ((!paused || previous !== active) && now-lastRendered >= 1000/30) {render();lastRendered=now;}
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
