import {nativeRequest} from './native-bridge.js';
import {BELL_SOUNDS} from '../doorbell-setup.js';
export function setupPublicDoorbell(){
 if(window.NACHTBAHN_BOOT?.mode!=='settings')return;
 const group=document.createElement('fieldset');group.id='publicDoorbellSettings';
 const legend=document.createElement('legend');legend.textContent='Eigene Haustürklingel einrichten';group.append(legend);
 const fields={},status=document.createElement('p');status.setAttribute('role','status');
 for(const [key,title,select]of [['sensor','Klingelsensor',true],['state','Auslösender Zustand (bei event.* jeder Empfang)',false],['target','Lautsprecher / Assist-Satellit',true],['mode','Ausgabe',true],['tts','TTS-Stimme für Mediaplayer',true],['message','Ansagetext',false],['sound','Klingelmusik',true],['baseUrl','Für den Lautsprecher erreichbare Home-Assistant-URL',false]]){
  const label=document.createElement('label'),field=document.createElement(select?'select':'input');fields[key]=field;field.setAttribute('aria-label',title);label.textContent=title;label.append(field);group.append(label);
 }
 const options=(key,items,value)=>{fields[key].replaceChildren(...items.map(i=>new Option(i.name,i.id)));fields[key].value=value||'';};
 const button=document.createElement('button');button.type='button';button.textContent='Klingelautomation speichern';button.disabled=true;
 const note=document.createElement('p');note.className='settings-help';note.textContent='Speichert eine zentrale Home-Assistant-Automation, die auch ohne geöffnetes Dashboard läuft. Es wird beim Speichern nichts abgespielt. Nur eine Klingelautomation verwenden, sonst entstehen doppelte Ansagen. Bei Assist-Satelliten gilt deren konfigurierte Stimme; Mediaplayer benötigen TTS. Lautstärke ist die aktuelle Lautsprecherlautstärke. Musik unterbricht je nach Gerät laufende Wiedergabe. Bei manueller Installation den Audioordner unter /local/community/oled-bildschirmschoner/ ablegen.';
 group.append(note,button,status);document.getElementById('panel-ereignisse').append(group);
 let admin=false;
 function apply(data){
  admin=data.admin;const c=data.config||{},entities=data.entities||[];
  for(const [key,re]of [['sensor',/^(binary_sensor|sensor|event|input_boolean)\./],['target',/^(assist_satellite|media_player)\./],['tts',/^tts\./]])options(key,[{id:'',name:'Bitte wählen'},...entities.filter(e=>re.test(e.id))],c[key]);
  options('mode',[{id:'silent',name:'Stumm'},{id:'speech',name:'Ansage'},{id:'sound',name:'Klingelmusik'}],c.mode||'silent');options('sound',BELL_SOUNDS,c.sound||'fanfare');
  for(const [key,fallback]of [['state','on'],['message','Es hat an der Haustür geklingelt.'],['baseUrl',window.NACHTBAHN_BOOT.parentOrigin]])fields[key].value=c[key]||fallback;
  button.disabled=!admin;status.textContent=c.sensor?'Gespeicherte zentrale Klingelautomation geladen.':admin?'Noch keine öffentliche Klingelautomation eingerichtet.':'Administratorrechte sind zum Einrichten erforderlich.';
 }
 button.onclick=async()=>{button.disabled=true;status.textContent='Konfiguration wird gespeichert …';try{const config=Object.fromEntries(Object.entries(fields).map(([k,f])=>[k,f.value]));apply(await nativeRequest('doorbell-save',config));status.textContent='Klingelautomation gespeichert und zurückgelesen. Kein Ton abgespielt.';}catch(e){status.textContent=e.message;}finally{button.disabled=!admin;}};
 void nativeRequest('doorbell-load').then(apply).catch(e=>{status.textContent='Klingeleinstellungen konnten nicht gelesen werden: '+e.message;});
}
