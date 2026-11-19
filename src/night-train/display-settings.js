import {nativeCommand} from './native-bridge.js';
const $=id=>document.getElementById(id);
const modeToControl={auto:'train',photos:'photos',mix:'mixed'},controlToMode={train:'auto',photos:'photos',mixed:'mix'};
export function setupDisplaySettings(){
 let current;
 function send(patch){if(window.NACHTBAHN_NATIVE)nativeCommand('preferences',patch);}
 for(const [id,key,number] of [['displayEnabled','enabled'],['idleMinutes','idleMinutes',true],['motif','motif'],['displayAnimated','animated'],['displayHolidays','holidays']]){
  $(id).onchange=()=>send({[key]:number?Number($(id).value):$(id).type==='checkbox'?$(id).checked:$(id).value});
 }
 $('backgroundMode').addEventListener('change',()=>send({mode:controlToMode[$('backgroundMode').value]}));
 $('photoInterval').addEventListener('change',()=>send({slideSeconds:Number($('photoInterval').value)}));
 function options(select,items,value){
  const signature=JSON.stringify(items);
  if(select.dataset.options!==signature){select.replaceChildren();const groups=new Map();for(const item of items){const name=item.group||'Bisherige Motive';let group=groups.get(name);if(!group){group=document.createElement('optgroup');group.label=name;groups.set(name,group);select.append(group);}const option=document.createElement('option');option.value=item.id;option.textContent=item.name;group.append(option);}select.dataset.options=signature;}
  if(select.value!==value)select.value=value;
 }
 function apply(display){
  if(!display?.preferences)return;
  current=display.preferences;
  options($('motif'),display.motifs||[],current.motif);
  for(const [id,value]of Object.entries({displayEnabled:current.enabled,idleMinutes:current.idleMinutes,displayAnimated:current.animated,displayHolidays:current.holidays})){const element=$(id);if(element.type==='checkbox')element.checked=!!value;else element.value=String(value);}
  const mode=modeToControl[current.mode]||'train';
  if($('backgroundMode').value!==mode){$('backgroundMode').value=mode;$('backgroundMode').dispatchEvent(new Event('display-sync'));}
  const interval=String(current.slideSeconds||60);
  if(![...$('photoInterval').options].some(option=>option.value===interval)){const option=document.createElement('option');option.value=interval;option.textContent=interval+' Sekunden';$('photoInterval').append(option);}
  if($('photoInterval').value!==interval){$('photoInterval').value=interval;$('photoInterval').dispatchEvent(new Event('display-sync'));}
  $('motif').disabled=mode==='photos';
  const container=$('occasionChoices');
  const signature=JSON.stringify([display.occasions,current.disabledOccasions,current.holidays]);
  if(container.dataset.current!==signature){
   container.replaceChildren();
   for(const occasion of display.occasions||[]){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=!(current.disabledOccasions||[]).includes(occasion.id);input.disabled=!current.holidays;input.onchange=()=>{const selected=[...(current.disabledOccasions||[])].filter(id=>id!==occasion.id);if(!input.checked)selected.push(occasion.id);send({disabledOccasions:selected});};label.append(input,document.createTextNode(occasion.name));container.append(label);}
   container.dataset.current=signature;
  }
 }
 return {apply};
}
