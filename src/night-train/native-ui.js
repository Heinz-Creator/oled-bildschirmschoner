import {nativeRequest,nativeCommand} from './native-bridge.js';
import {sourceToken,parseAcknowledgements} from './event-ack.js';
import {EVENT_NAMES} from './events.js';
import {previewEvents,applyPreviewEvents} from './preview-state.js';

export function setupNativeWorld({schedule,refresh,render,applyContext}) {
  if(!window.NACHTBAHN_NATIVE)return;
  const $=id=>document.getElementById(id);
  const boot=window.NACHTBAHN_BOOT;
  document.querySelector('#weatherSelect option[value=auto]').textContent='Echtes Wetter aus Home Assistant';
  document.querySelector('#photoInterval option[value="5"]')?.remove();
  document.body.classList.add('native-'+boot.mode);
  const key='oled-night-train-bindings-v1:'+boot.userId;
  let rules={};try{rules=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
  const seen=new Map(),tokens=new Map(),ackKey='oled-event-ack-v1:'+boot.userId;let acknowledged={};try{acknowledged=parseAcknowledgements(localStorage.getItem(ackKey));}catch{}
  let lastContext=boot,previewActive=boot.mode==='scene'&&previewEvents(boot.previewEvents).length>0;
  const normalLifetime=schedule.settings.finishedLifetime;
  if(previewActive){schedule.settings.finishedLifetime=0;applyPreviewEvents(schedule,boot.previewEvents,performance.now());$('previewBanner').hidden=false;$('previewBanner').querySelector('span').textContent=previewEvents(boot.previewEvents).length+' Testmeldungen · Besuch hat Vorrang · keine Geräteaktionen';}
  function endPreview(){if(!previewActive)return;previewActive=false;schedule.settings.finishedLifetime=normalLifetime;$('previewBanner').hidden=true;schedule.events.clear();schedule.current=null;schedule.visitorStartedAt=null;seen.clear();apply(lastContext);}
  $('endPreview').onclick=endPreview;
  if(previewActive)setTimeout(endPreview,Math.max(180000,(previewEvents(boot.previewEvents).reduce((sum,event)=>sum+schedule.settings.durations[event],0)+30)*1000));
  const section=$('nativeBindings');section.hidden=false;
  const rows=$('bindingRows');
  for(const [event,name]of Object.entries(EVENT_NAMES)){
    const row=document.createElement('div');row.className='binding-row';
    const label=document.createElement('label');label.textContent=name;
    const input=document.createElement('input');input.type='text';input.setAttribute('list','nativeEntities');input.placeholder='Automatisch aus Hausmeldungen';input.value=rules[event]?.entity||'';label.append(input);
    const stateLabel=document.createElement('label');stateLabel.textContent='Auslösen bei Zustand';
    const state=document.createElement('input');state.value=rules[event]?.state||'on';stateLabel.append(state);row.append(label,stateLabel);rows.append(row);
    const change=()=>{
      rules[event]={entity:input.value.trim(),state:state.value.trim()};
      try{localStorage.setItem(key,JSON.stringify(rules));}catch{}
      seen.delete(event);void subscribe();
    };
    input.onchange=change;state.onchange=change;
  }
  function apply(context){
    lastContext=context;
    if(boot.mode==='settings'||previewActive){applyContext(context);refresh();render();return;}
    const hidden=[];let changedAck=false;
    for(const event of Object.keys(EVENT_NAMES)){
      const token=sourceToken(event,context,rules[event]);tokens.set(event,token);
      if(!token&&acknowledged[event]){delete acknowledged[event];changedAck=true;}
      const suppressed=!!token&&acknowledged[event]===token;
      if(suppressed)hidden.push(event);
      const current=token&&!suppressed?token:null;
      if(seen.get(event)!==current){schedule.set(event,!!current,performance.now());seen.set(event,current);}
    }
    if(changedAck)try{localStorage.setItem(ackKey,JSON.stringify(acknowledged));}catch{}
    applyContext({...context,acknowledgedEvents:hidden});
    refresh();render();
  }
  document.addEventListener('oled-event-ack',event=>{
    const key=event.detail.event;if(!Object.hasOwn(EVENT_NAMES,key)||Number($('finishedLifetime').value)!==0)return;
    if(previewActive){schedule.set(key,false,performance.now());refresh();render();return;}
    const token=tokens.get(key);if(!token)return;
    const next={...acknowledged,[key]:token};
    try{localStorage.setItem(ackKey,JSON.stringify(next));acknowledged=next;apply(lastContext);}catch{event.detail.error='Quittierung konnte nicht gespeichert werden';}
  });
  async function subscribe(){
    try{apply(await nativeRequest('subscribe',{entities:Object.values(rules).map(rule=>rule.entity).filter(Boolean)}));}
    catch(error){$('bindingStatus').textContent=error.message;}
  }
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==boot.parentOrigin)return;
    if(event.data?.type==='oled-night-train-context')apply(event.data.context);
    if(event.data?.type==='oled-night-train-prepare-preview')parent.postMessage({type:'oled-night-train-preview-ready',events:previewEvents([...document.querySelectorAll('input[data-event]:checked')].map(input=>input.dataset.event))},boot.parentOrigin);
  });
  $('nativeSettings').onclick=()=>nativeCommand('settings');
  if(boot.mode==='scene'){
    document.addEventListener('pointerup',event=>{
      if(event.target.closest('button,input,select,a,iframe,#youtubePlayer'))return;
      if(event.target.closest('#screen'))nativeCommand('dismiss');
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('youtubePlayer').hidden)nativeCommand('dismiss');});
  }
  void nativeRequest('entities').then(entities=>{
    for(const entity of entities){const option=document.createElement('option');option.value=entity.id;option.label=entity.name+' · '+entity.state;$('nativeEntities').append(option);}
  }).catch(error=>$('bindingStatus').textContent=error.message);
  void subscribe();
}
