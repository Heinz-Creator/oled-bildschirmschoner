export function setupSettingsPanels(){
 const root=document.querySelector('.controls');
 const tabs=document.createElement('div');tabs.className='settings-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Einstellungsbereiche');
 const intro=document.createElement('p');intro.className='shared-settings-note';intro.textContent='Diese Einstellungen gelten für alle Motivwelten auf diesem Display.';
 const appearance=root.querySelector(':scope > .settings'),events=root.querySelector('.events'),bindings=document.getElementById('nativeBindings');
 const sections=[...root.querySelectorAll(':scope > details.settings-section')];
 const basics=document.getElementById('displayBasics');
 const sourceLabel=document.getElementById('backgroundMode').closest('label');document.getElementById('displaySourcePlaceholder').closest('label').replaceWith(sourceLabel);
 const intervalLabel=document.getElementById('photoInterval').closest('label');document.getElementById('slidePlaceholder').replaceWith(intervalLabel);
 basics.querySelector('.settings').append(document.getElementById('light').closest('label'));
 const advancedAppearance=document.createElement('details');advancedAppearance.className='preview-events';const advancedTitle=document.createElement('summary');advancedTitle.textContent='Jahreszeit, Anlass oder Wetter manuell vorgeben';advancedAppearance.append(advancedTitle,appearance);
 const panels=[['darstellung','Anzeige',[basics,advancedAppearance]],['ereignisse','Meldungen',[sections[0],bindings,events]],['musik','Musik',[sections[1]]],['fotos','Fotoalben',[sections[2]]]];
 function activate(index,focus=false){panels.forEach((item,i)=>{item.button.setAttribute('aria-selected',String(i===index));item.button.tabIndex=i===index?0:-1;item.panel.hidden=i!==index;});if(focus)panels[index].button.focus();}
 for(const [index,item] of panels.entries()){
  const [id,title,nodes]=item,button=document.createElement('button'),panel=document.createElement('section');
  button.id='tab-'+id;button.textContent=title;button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-controls','panel-'+id);
  panel.id='panel-'+id;panel.className='settings-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);
  for(const node of nodes){if(!node)continue;if(sections.includes(node)){node.open=true;node.classList.add('panel-section');}panel.append(node);}
  if(id==='ereignisse'){const demo=document.createElement('details');demo.className='preview-events';const summary=document.createElement('summary');summary.textContent='Grafiken ausprobieren · ohne Geräteaktion';demo.append(summary,events);panel.append(demo);}
  item.button=button;item.panel=panel;button.onclick=()=>activate(index);button.onkeydown=event=>{let next;if(event.key==='ArrowRight')next=(index+1)%4;if(event.key==='ArrowLeft')next=(index+3)%4;if(event.key==='Home')next=0;if(event.key==='End')next=3;if(next!==undefined){event.preventDefault();activate(next,true);}};
  tabs.append(button);root.append(panel);
 }
 for(const item of panels){if(item[0]==='darstellung')continue;const h=document.createElement('h2');h.textContent={ereignisse:'Meldungen & Zeiten',musik:'Musik & Lautsprecher',fotos:'Eigene Fotoalben'}[item[0]];item.panel.prepend(h);}
 const advanced=document.createElement('details');advanced.className='preview-events';const summary=document.createElement('summary');summary.textContent='Eigene Entitäten zuordnen · optional';advanced.append(summary);bindings.before(advanced);advanced.append(bindings);
 root.prepend(tabs,intro);activate(0);
}
