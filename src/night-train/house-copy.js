/** Group real house activity without adding a second card surface. */
export function houseCopyGroups(rows) {
  const groups=new Map();
  for(const row of rows.flatMap(row=>['ambient-lights','house-counts'].includes(row.key)&&/licht/i.test(row.title)&&/roll/i.test(row.detail)?[{...row,detail:''},{key:'ambient-covers',title:row.detail,section:'covers'}]:[row])){
    const source=[row.section,row.image,row.key,row.title].filter(Boolean).join(' ').toLowerCase();
    const category=/light|licht|lampe/.test(source)?'Licht':/cover|shutter|roll|jalous/.test(source)?'Rollos':/energy|solar|strom|verbrauch/.test(source)?'Energie':/media|musik|radio|fernseh|fortnite|playstation/.test(source)?'Medien':/window|contact|fenster|tür|sicherheit/.test(source)?'Fenster & Türen':/waste|müll|tonne|calendar/.test(source)?'Termine & Müll':'Weitere Meldungen';
    if(!groups.has(category))groups.set(category,[]);
    const title=String(row.title||'').trim(),detail=String(row.detail||'').trim();
    const redundant=category==='Rollos'&&/^roll(läden|os|läden)$/i.test(title);
    groups.get(category).push([redundant?'':title,detail].filter(Boolean).join(' · '));
  }
  return [...groups].map(([title,lines])=>({title,lines:[...new Set(lines)].filter(Boolean)}));
}
