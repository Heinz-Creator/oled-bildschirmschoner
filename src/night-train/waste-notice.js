const clean=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export function wasteNotices(rows,now=Date.now(),zone='Europe/Berlin',confirmed={}){
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now),seen=new Set();
 return (Array.isArray(rows)?rows:[]).flatMap(row=>{
  const text=clean(row.title+' '+(row.detail||''));
  if(!/mull|abfall|tonne|papier|gelbe|bioabfall/.test(text)||!/morgen|rausstellen|heute.*abhol|heute.*geleer|abholung.*heute/.test(text))return [];
  const tomorrow=/morgen|rausstellen/.test(text),name=String(row.title||'Mülltonne'),key=day+'|'+(row.key||name);
  if(seen.has(key))return [];seen.add(key);
  return [{key,name,phase:tomorrow?'tomorrow':confirmed[key]?'collected':'today'}];
 });
}
export function wasteCopy(items){
 if(!items.length)return null;
 const today=items.filter(i=>i.phase!=='tomorrow'),focus=today.length?today:items;
 return {title:focus.every(i=>i.phase==='collected')?'Abgeholt · Tonnen wieder reinholen':today.length?'Heute ist Müllabholung':'Morgen ist Müllabholung',detail:focus.map(i=>i.name+(i.phase==='collected'?' · von dir bestätigt':i.phase==='tomorrow'?' · heute rausstellen':' · zur Abholung bereitstellen')).join(' · ')};
}
