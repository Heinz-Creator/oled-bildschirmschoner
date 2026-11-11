import {AMBIENT_OCCASIONS,ambientCalendar} from './ambient-calendar.js';
export {AMBIENT_OCCASIONS} from './ambient-calendar.js';
export const AMBIENT_GALLERY_KEY='oled_bildschirmschoner_gallery_v1';
export const AMBIENT_DEVICE_KEY='oled_bildschirmschoner_device_v1';
export const AMBIENT_WORLD_IDS=['tree','minecraft','coast'];
export const AMBIENT_MOTIFS=[{id:'tree',name:'Baum & Jahreszeiten'},{id:'minecraft',name:'Minecraft-Welt'},{id:'coast',name:'Lichtküste'},{id:'mixed',name:'Alle Motivwelten im Wechsel'}];
export const DEFAULT_AMBIENT={motif:'tree',disabledOccasions:[],enabled:false,idleMinutes:2,slideSeconds:60,mode:'auto',animated:true,holidays:true};
export const artworkUrl = name => new URL('./' + name, import.meta.url).href;
const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
export function ambientPreferences(raw={}){return {...DEFAULT_AMBIENT,motif:AMBIENT_MOTIFS.some(m=>m.id===raw.motif)?raw.motif:'tree',disabledOccasions:[...new Set((Array.isArray(raw.disabledOccasions)?raw.disabledOccasions:[]).filter(id=>AMBIENT_OCCASIONS.some(o=>o.id===id)))],enabled:raw.enabled===true,idleMinutes:clamp(raw.idleMinutes,1,30,2),slideSeconds:clamp(raw.slideSeconds,15,600,60),mode:['auto','photos','mix'].includes(raw.mode)?raw.mode:'auto',animated:raw.animated!==false,holidays:raw.holidays!==false};}
export function readAmbientDevice(storage){try{return ambientPreferences(JSON.parse(storage.getItem(AMBIENT_DEVICE_KEY)||'{}'));}catch{return ambientPreferences();}}
export function ambientGallery(raw){return (Array.isArray(raw)?raw:[]).filter(p=>p&&typeof p.id==='string'&&/^[a-f0-9]{32}$/.test(p.id)).slice(0,60).map(p=>({id:p.id,name:String(p.name||'Eigenes Foto').slice(0,160)})).filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i);}
export const ambientPhotoUrl=id=>/^[a-f0-9]{32}$/.test(id)?'/api/image/serve/'+id+'/original':'';
export function ambientSunNight(states){const sun=Object.values(states||{}).find(e=>e?.entity_id?.startsWith('sun.')&&['above_horizon','below_horizon'].includes(e.state));return sun?sun.state==='below_horizon':null;}
export function ambientScene(now,weather='',holidays=true,zone='Europe/Berlin',motif='tree',slideSeconds=60,disabledOccasions=[],sunNight=null,photoMode='auto'){
 const calendar=ambientCalendar(now,zone),{hour,season}=calendar;
 const phase=hour<6||hour>=22?'night':hour<11?'morning':hour<18?'day':'evening',holiday=holidays?calendar.occasions.find(id=>!disabledOccasions.includes(id))||null:null;
 const snow=['snowy','snowy-rainy'].includes(weather),rain=['rainy','pouring','lightning-rainy','hail','snowy-rainy'].includes(weather),wind=['windy','windy-variant'].includes(weather);
 const requested=AMBIENT_MOTIFS.some(m=>m.id===motif)?motif:'tree',theme=requested==='mixed'?AMBIENT_WORLD_IDS[Math.floor(now/(Math.max(15,Math.min(600,Number(slideSeconds)||60))*1000*(photoMode==='mix'?2:1)))%AMBIENT_WORLD_IDS.length]:requested;
 const assetNight=typeof sunNight==='boolean'?sunNight:['night','evening'].includes(phase);
 const baseKey=`${holiday||(snow?'winter':season)}-${assetNight?'evening':'morning'}`,key=theme==='tree'?baseKey:theme+'-'+baseKey;
 return {key,theme,season,phase,assetNight,morning:hour>=6&&hour<9,night:phase==='night',holiday,effect:snow?'snow':rain?'rain':wind?(season==='autumn'?'leaves':'wind'):'none',url:artworkUrl(key+'.webp')};
}
export function ambientSlide(scene,gallery,prefs,tick){const photos=ambientGallery(gallery),n=Math.max(0,Math.floor(tick/prefs.slideSeconds));if(!photos.length||prefs.mode==='auto'||prefs.mode==='mix'&&n%2===0)return {url:scene.url,name:'Automatische Kunstszene'};const i=prefs.mode==='mix'?Math.floor(n/2):n,p=photos[i%photos.length];return {url:ambientPhotoUrl(p.id),name:p.name};}
export function canStartAmbient({enabled,idleMs,idleMinutes,blocked,hidden,pointerDown}){return !!enabled&&!blocked&&!hidden&&!pointerDown&&idleMs>=idleMinutes*60000;}
export function ambientHouseRows(activities){return (Array.isArray(activities)?activities:[]).filter(r=>r&&r.title&&!/offline|ps5-network/.test(r.key||'')).slice(0,5).map(r=>({key:r.key||r.entity||r.title,title:String(r.title).slice(0,150),detail:String(r.detail||'').slice(0,180)}));}
export async function uploadAmbientPhoto(hass,file){if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Bitte JPEG, PNG oder WebP auswählen.');if(file.size>15000000)throw Error('Dieses Foto ist größer als 15 MB.');if(!hass?.fetchWithAuth)throw Error('Der Foto-Upload ist in dieser Verbindung nicht verfügbar.');const body=new FormData();body.append('file',file);const response=await hass.fetchWithAuth('/api/image/upload',{method:'POST',body});if(response.status!==200)throw Error(response.status===413?'Das Foto ist für Home Assistant zu groß.':'Home Assistant konnte das Foto nicht speichern.');const row=await response.json(),valid=ambientGallery([row]);if(!valid.length)throw Error('Home Assistant hat keine gültige Foto-ID geliefert.');return valid[0];}
