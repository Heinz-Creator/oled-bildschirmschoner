/** Server-side doorbell provisioning. Saving never executes an action. */
export const DOORBELL_ID='oled_bildschirmschoner_doorbell';
export const DOORBELL_PATH='config/automation/config/'+DOORBELL_ID;
export const BELL_SOUNDS=[
 {id:'tree',name:'Baum · heller Klang',file:'bell-tree.wav'},
 {id:'minecraft',name:'Blockwelt · Spielklang',file:'bell-minecraft.wav'},
 {id:'coast',name:'Küste · heller Klang',file:'bell-coast.wav'},
 {id:'railway',name:'Nachtbahn · kurzer Klang',file:'bell-railway.wav'},
 {id:'fanfare',name:'Lustige Musik-Fanfare',file:'bell-fanfare.wav'},
 {id:'comic',name:'Comic-Musik',file:'bell-comic.wav'},
];
const marker='OLED Bildschirmschoner · Haustürklingel';
export function bellEntities(hass){return Object.values(hass?.states||{}).filter(e=>/^(binary_sensor|sensor|event|input_boolean|assist_satellite|media_player|tts)\./.test(e.entity_id)).map(e=>({id:e.entity_id,name:e.attributes.friendly_name||e.entity_id,state:e.state}));}
export function validateDoorbell(hass,raw){
 if(!hass.user?.is_admin)throw Error('Zum Speichern der Klingelautomation sind Administratorrechte erforderlich.');
 const config={sensor:String(raw.sensor||''),state:String(raw.state||'on'),target:String(raw.target||''),mode:raw.mode||'silent',tts:String(raw.tts||''),message:String(raw.message||'Es hat an der Haustür geklingelt.'),sound:raw.sound||'fanfare',baseUrl:String(raw.baseUrl||'')};
 if(!/^(binary_sensor|sensor|event|input_boolean)\.[a-z0-9_]+$/.test(config.sensor)||!hass.states[config.sensor])throw Error('Bitte einen vorhandenen Klingelsensor auswählen.');
 if(!['silent','speech','sound'].includes(config.mode))throw Error('Ungültige Ausgabeart.');
 if(!config.state||config.state.length>120||['unknown','unavailable'].includes(config.state))throw Error('Bitte den tatsächlich gemeldeten Klingelzustand eintragen.');
 if(config.mode!=='silent'&&(!/^(assist_satellite|media_player)\.[a-z0-9_]+$/.test(config.target)||!hass.states[config.target]))throw Error('Bitte einen vorhandenen Assistenten-Lautsprecher oder Mediaplayer auswählen.');
 if(config.mode==='speech'&&config.target.startsWith('media_player.')&&(!/^tts\.[a-z0-9_]+$/.test(config.tts)||!hass.states[config.tts]))throw Error('Für eine Ansage am Mediaplayer bitte eine TTS-Entität auswählen.');
 if(!BELL_SOUNDS.some(s=>s.id===config.sound))throw Error('Bitte einen mitgelieferten Klingelton auswählen.');
 if(!config.message.trim()||config.message.length>500)throw Error('Die Ansage braucht zwischen 1 und 500 Zeichen.');
 if(config.mode==='sound'){
  let url;try{url=new URL(config.baseUrl);}catch{throw Error('Bitte die für den Lautsprecher erreichbare Home-Assistant-URL angeben.');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw Error('Die Home-Assistant-URL darf keine Zugangsdaten, Parameter oder Pfade enthalten.');
  config.baseUrl=url.origin;
 }
 return config;
}
export function doorbellAutomation(config){
 const event=config.sensor.startsWith('event.');
 const triggers=event?[{trigger:'event.received',target:{entity_id:config.sensor}}]:[{trigger:'state',entity_id:config.sensor,to:config.state}];
 const guards=event?[]:[{condition:'template',value_template:"{{ trigger.from_state is not none and trigger.from_state.state not in ['unknown', 'unavailable'] }}"}];
 let output=[];
 const satellite=config.target.startsWith('assist_satellite.');
 if(config.mode==='speech')output=satellite?[{action:'assist_satellite.announce',target:{entity_id:config.target},data:{message:config.message,preannounce:false}}]:[{action:'tts.speak',target:{entity_id:config.tts},data:{media_player_entity_id:config.target,message:config.message,cache:true}}];
 if(config.mode==='sound'){
  const file=BELL_SOUNDS.find(s=>s.id===config.sound).file,url=config.baseUrl+'/local/community/oled-bildschirmschoner/'+file;
  output=satellite?[{action:'assist_satellite.announce',target:{entity_id:config.target},data:{media_id:url,preannounce:false}}]:[{action:'media_player.play_media',target:{entity_id:config.target},data:{media_content_id:url,media_content_type:'music'}}];
 }
 return {alias:marker,description:marker+' · erstellt über die Karteneinstellungen. Keine Wiedergabe beim Speichern.',mode:'single',max_exceeded:'silent',variables:{oled_doorbell:config},triggers,conditions:guards,actions:[...output,{delay:{seconds:5}}]};
}
export async function loadDoorbell(hass){
 let config=null;try{const saved=await hass.callApi('GET',DOORBELL_PATH);if(saved?.description?.startsWith(marker))config=saved.variables?.oled_doorbell||null;}catch(e){if(e.status_code!==404)throw e;}
 return {config,entities:bellEntities(hass),admin:hass.user?.is_admin===true};
}
export async function saveDoorbell(hass,raw){
 const config=validateDoorbell(hass,raw);
 let previous;try{previous=await hass.callApi('GET',DOORBELL_PATH);}catch(e){if(e.status_code!==404)throw e;}
 if(previous&&!previous.description?.startsWith(marker))throw Error('Unter der Kennung existiert bereits eine fremde Automation. Sie wird nicht überschrieben.');
 await hass.callApi('POST',DOORBELL_PATH,doorbellAutomation(config));
 const saved=await loadDoorbell(hass);
 if(JSON.stringify(saved.config)!==JSON.stringify(config))throw Error('Die gespeicherte Klingelkonfiguration konnte nicht bestätigt werden.');
 return saved;
}
