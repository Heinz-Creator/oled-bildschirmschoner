export const BELL_HELPERS={mode:'input_select.oled_turklingel_modus',theme:'input_select.oled_turklingel_thema',voice:'input_select.oled_turklingel_stimme',target:'input_select.oled_turklingel_ziel'};
export const BELL_THEMES={tree:'Baum & Jahreszeiten',minecraft:'Minecraft-Welt',coast:'Lichtküste',home:'Unser Zuhause',teddy:'Teddy auf Tour',railway:'Die kleine Nachtbahn'};
export function bellConfiguration(hass){
 const states=hass?.states||{};
 if(!Object.values(BELL_HELPERS).every(id=>states[id]&&Array.isArray(states[id].attributes?.options)))return null;
 return Object.fromEntries(Object.entries(BELL_HELPERS).map(([key,id])=>[key,{value:states[id].state,options:states[id].attributes.options.map(value=>({id:value,name:key==='target'?states[value]?.attributes?.friendly_name||value:value}))}]));
}
export async function saveBellSetting(hass,key,value){
 const config=bellConfiguration(hass),id=BELL_HELPERS[key];
 if(!config||!id||typeof value!=='string'||!config[key]?.options.some(item=>item.id===value))throw Error('Diese Klingeleinstellung ist nicht verfügbar.');
 if(hass.states[id].state!==value)await hass.callService('input_select','select_option',{option:value},{entity_id:id});
 return bellConfiguration(hass);
}
