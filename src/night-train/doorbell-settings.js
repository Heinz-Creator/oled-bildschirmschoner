import {setupPublicDoorbell} from './doorbell-public.js';
import {nativeRequest} from './native-bridge.js';
export function setupDoorbellSettings(){
 setupPublicDoorbell();
 const group=document.createElement('fieldset');group.id='doorbellSettings';group.hidden=true;
 const legend=document.createElement('legend');legend.textContent='Haustürklingel';group.append(legend);
 const selects={},labels={mode:'Bei Klingeln',theme:'Theme-Klingelton',voice:'Ansagestimme',target:'Assistenten-Lautsprecher'};
 const feedback=document.createElement('p');feedback.setAttribute('role','status');
 for(const [key,labelText]of Object.entries(labels)){
  const label=document.createElement('label'),select=document.createElement('select');label.textContent=labelText;select.setAttribute('aria-label',labelText);selects[key]=select;label.append(select);group.append(label);
  select.onchange=async()=>{select.disabled=true;feedback.textContent='Speichern …';try{await nativeRequest('doorbell-setting',{key,value:select.value});feedback.textContent='Gespeichert. Es wird kein Ton abgespielt.';}catch(error){feedback.textContent=error.message;}finally{select.disabled=false;}};
 }
 const help=document.createElement('p');help.className='settings-help';help.textContent='Gilt zentral für die Haustürklingel, auch bei geschlossenem Dashboard. Ansage, eigener kurzer Theme-Klang oder stumm; das Kamerabild bleibt aktiv. Theme-Wechsel aktualisieren den Klingelklang. Die Assistentenfigur kann die Ansagestimme übernehmen. Änderungen spielen nichts ab.';
 const phone=document.createElement('p');phone.className='settings-help';phone.textContent='FRITZ!Fon: Der Haustürton wird separat in der FRITZ!Box eingestellt. Ein stummer Haustürton ändert keine normalen Telefonanrufe.';
 group.append(help,phone,feedback);document.getElementById('panel-ereignisse').append(group);
 return {apply(config){group.hidden=!config;if(!config)return;for(const[key,select]of Object.entries(selects)){const data=config[key];if(!data)continue;const sig=JSON.stringify(data.options);if(select.dataset.options!==sig){select.replaceChildren(...data.options.map(item=>new Option(item.name,item.id)));select.dataset.options=sig;}select.value=data.value;}selects.theme.disabled=config.mode.value!=='Theme-Klingelton';selects.voice.disabled=config.mode.value!=='Ansage';}};
}
