export const validNumber = v => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v));
export function celsius(value, unit) { if (!validNumber(value)) return null; return unit === '°F' ? (Number(value)-32)*5/9 : unit === '°C' ? Number(value) : null; }
export function outfit(t, condition='') {
  if (!validNumber(t)) return {index:1,title:'Temperatur fehlt',text:'Keine Kleidungsempfehlung verfügbar.'};
  const n=Number(t), index=n<5?0:n<15?1:n<25?2:3;
  const titles=['Warm einpacken','Eine Schicht mehr','Leicht unterwegs','Sommermodus'];
  let text=['Pullover, Winterjacke, Schal, Handschuhe und lange Hose.','Pullover, Jacke und lange Hose.','T-Shirt, leichte Jacke und lange Hose.','T-Shirt, Shorts und Sonnenbrille.'][index];
  if (['rainy','pouring','lightning-rainy','snowy-rainy'].includes(condition)) text+=' Regenjacke und wasserfeste Schuhe mitnehmen.';
  if (['snowy','snowy-rainy','hail'].includes(condition)) text+=' Auf Glätte achten; feste Schuhe tragen.';
  if (['lightning','lightning-rainy','exceptional'].includes(condition)) text+=' Unwetterlage beachten.';
  if (['windy','windy-variant'].includes(condition)) text+=' Winddichte Schicht ergänzen.';
  return {index,title:titles[index],text};
}

export function greeting(now, zone) {
  const hour = Number(new Intl.DateTimeFormat('de-DE', {timeZone:zone,hour:'numeric',hourCycle:'h23'}).format(now));
  return hour < 5 || hour >= 22 ? 'Gute Nacht' : hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
}
