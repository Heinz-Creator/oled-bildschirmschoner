import {wasteNotices} from './waste-notice.js';
const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export function matchesEvent(event,row,context){
 const text=normalize(row.title+' '+(row.detail||''));
 if(event==='laundry')return /waschmaschine|washer/.test(text)&&/fertig|finished|beendet/.test(text);
 if(event==='dishes')return /geschirr|spulmaschine|dishwasher/.test(text)&&/fertig|finished|beendet/.test(text);
 if(event==='waste')return wasteNotices([row],Date.now(),context.timeZone).length>0;
 if(event==='charging')return /lad|charg/.test(text)&&/solar|sonnenstrom|pv/.test(text);
 return /besuch|klingel|doorbell/.test(text)&&!/aus|inaktiv|offline|unbekannt/.test(text);
}
export function sourceToken(event,context,rule){
 if(rule?.entity){const state=context.states?.[rule.entity];if(rule.entity.startsWith('event.')){const timestamp=Date.parse(state?.state);return Number.isFinite(timestamp)&&Date.now()-timestamp>=0&&Date.now()-timestamp<45000?JSON.stringify([rule.entity,state.state]):null;}return state?.state===rule.state?JSON.stringify([rule.entity,state.state,state.last_changed||'active']):null;}
 const rows=(Array.isArray(context.activities)?context.activities:[]).filter(row=>matchesEvent(event,row,context));
 if(!rows.length)return null;
 const day=event==='waste'?new Intl.DateTimeFormat('sv-SE',{timeZone:context.timeZone||'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(Date.now()):'';
 return JSON.stringify([day,rows.map(row=>[row.key||row.entity||row.title,row.finished?.token||row.reportedAt||row.last_changed||row.timestamp||'active']).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))]);
}
export function parseAcknowledgements(value){try{const data=JSON.parse(value||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?Object.fromEntries(Object.entries(data).filter(([,v])=>typeof v==='string')):{};}catch{return {};}}
