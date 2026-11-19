import {loadDoorbell,saveDoorbell} from './doorbell-setup.js';
import {LitElement,html,css} from 'lit';
import {bellConfiguration,saveBellSetting,BELL_THEMES} from './night-train/doorbell-config.js';
import {PLAYLISTS} from './night-train/music-data.js';
import {previewEvents} from './night-train/preview-state.js';
let documentPromise;

export function musicSpeakers(hass, registry) {
  return registry.flatMap(entry=>{
    const state=hass.states?.[entry.entity_id];
    if(!entry.entity_id.startsWith('media_player.') || entry.disabled_by || entry.hidden_by || !['music_assistant','alexa_devices','alexa_media'].includes(entry.platform))return [];
    return [{id:entry.entity_id,name:state?.attributes.friendly_name||entry.name||entry.original_name||entry.entity_id,platform:entry.platform,deviceId:entry.device_id,configEntryId:entry.config_entry_id,state:state?.state||'unavailable',available:!!state&&!['unknown','unavailable'].includes(state.state)}];
  });
}

export class OledNightTrain extends LitElement {
  static properties={hass:{attribute:false},scene:{attribute:false},activities:{attribute:false},display:{attribute:false},previewEvents:{attribute:false},backgroundUrl:{type:String},teddyUrl:{type:String},weather:{type:String},temperature:{type:Number},photoUrl:{type:String},mode:{type:String,reflect:true},_document:{state:true},_loadError:{state:true}};
  static styles=css`
    :host{display:block;position:absolute;inset:0;z-index:3}
    :host([mode=settings]){position:relative;inset:auto;height:70vh;min-height:450px;margin:16px 0;border:1px solid #53606a;border-radius:14px;overflow:hidden}
    iframe{display:block;width:100%;height:100%;border:0;background:transparent;color-scheme:normal}
    .loading{padding:24px;color:#ead8ba;background:#0b1722;font:16px system-ui}button{padding:12px;color:inherit;background:#203143;border:1px solid #607382;border-radius:8px}
  `;
  constructor(){super();this.mode='scene';this.activities=[];this.subscriptions=[];this._receive=event=>void this.receive(event);}
  connectedCallback(){super.connectedCallback();window.addEventListener('message',this._receive);}
  disconnectedCallback(){window.removeEventListener('message',this._receive);this._previewResolve?.([]);super.disconnectedCallback();}
  willUpdate(){
    const userId=this.hass?.user?.id||'local';
    if((!this._document||this._userId!==userId)&&this._loadingUser!==userId){
      this._userId=userId;
      this._loadingUser=userId;
      this._document='';
      const boot={...this.context(),userId,parentOrigin:location.origin,mode:this.mode};
      documentPromise ||= import('oled-night-train-document').then(module=>module.default);
      void documentPromise.then(documentHtml=>{
        if(this.isConnected&&this._userId===userId)this._document=documentHtml.replace('__NIGHTTRAIN_BOOT__',()=>JSON.stringify(boot).replace(/</g,'\\u003c'));
      }).catch(()=>{documentPromise=null;this._loadingUser=null;this._loadError=true;});
    }
  }
  updated(){this.sendContext();const config=bellConfiguration(this.hass),theme=BELL_THEMES[this.scene?.theme];
    const sceneKey=this.mode+'|'+this.scene?.theme+'|'+this.display?.preferences?.motif+'|'+config?.mode.value,changedScene=this._bellSceneKey!==sceneKey;this._bellSceneKey=sceneKey;
    if(changedScene&&config?.mode.value==='Theme-Klingelton'&&theme&&this.mode==='scene'&&config.theme.value!==theme&&this._bellThemePending!==theme){this._bellThemePending=theme;void saveBellSetting(this.hass,'theme',theme).catch(()=>{}).finally(()=>{if(this._bellThemePending===theme)this._bellThemePending=null;});}
  }
  context(){
    const hass=this.hass;
    const states={};for(const id of this.subscriptions){const entity=hass?.states?.[id];if(entity)states[id]={state:entity.state,attributes:entity.attributes,last_changed:entity.last_changed};}
    const player=hass?.states?.[this.musicEntity];
    const attr=player?.attributes||{};
    const cover=attr.entity_picture_local||attr.entity_picture||'';
    return {doorbell:bellConfiguration(hass),backgroundUrl:this.backgroundUrl||(!['railway','teddy'].includes(this.scene?.theme)?this.scene?.url:''),teddyUrl:this.teddyUrl||(this.scene?.theme==='teddy'?this.scene.url:''),display:this.display,previewEvents:previewEvents(this.previewEvents),photoUrl:this.photoUrl||'',scene:this.scene,weather:this.weather||'',temperature:this.temperature,timeZone:hass?.config?.time_zone||'Europe/Berlin',activities:this.activities||[],states,music:{entityId:this.musicEntity||'',state:player?.state||'idle',title:attr.media_title||'',artist:attr.media_artist||'',cover:/^(https?:\/\/|\/)/.test(cover)?cover:'',speaker:attr.friendly_name||''}};
  }
  preparePreview(){
    const frame=this.renderRoot.querySelector('iframe');
    if(!frame)throw Error('Die Einstellungen werden noch geladen. Bitte kurz warten.');
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this._previewResolve=null;reject(Error('Die Vorschau ist noch nicht bereit. Bitte erneut versuchen.'));},5000);
      this._previewResolve=events=>{clearTimeout(timer);this._previewResolve=null;resolve(previewEvents(events));};
      frame.contentWindow.postMessage({type:'oled-night-train-prepare-preview'},location.origin);
    });
  }
  sendContext(){this.renderRoot.querySelector('iframe')?.contentWindow?.postMessage({type:'oled-night-train-context',context:this.context()},location.origin);}
  async registry(){return this.hass.callWS({type:'config/entity_registry/list'});}
  async play(data){
    const playlist=PLAYLISTS[data.key];if(!playlist)throw Error('Musikthema fehlt.');
    const target=musicSpeakers(this.hass,await this.registry()).find(item=>item.id===data.entityId&&item.available);
    if(!target)throw Error('Der ausgewählte Lautsprecher ist gerade nicht erreichbar.');
    const hass=this.hass;
    if(target.platform==='alexa_devices'){
      await hass.callService('alexa_devices','send_text_command',{device_id:target.deviceId,text_command:playlist.command});
    }else if(target.platform==='alexa_media'){
      await hass.callService('media_player','play_media',{media:{media_content_id:playlist.command,media_content_type:'custom'}},{entity_id:target.id});
    }else{
      await hass.callService('music_assistant','play_media',{media_id:playlist.query,media_type:'playlist',enqueue:'replace'},{entity_id:target.id});
    }
    return {message:`Musikwunsch an ${target.name} gesendet.`,command:playlist.command};
  }
  async selectPlayer(data){
    if(!data.entityId){this.musicEntity='';this.sendContext();return this.context();}
    const target=musicSpeakers(this.hass,await this.registry()).find(item=>item.id===data.entityId);
    if(!target)throw Error('Bitte einen verfügbaren Musiklautsprecher auswählen.');
    this.musicEntity=target.id;this.sendContext();return this.context();
  }
  async stop(data){
    const target=musicSpeakers(this.hass,await this.registry()).find(item=>item.id===data.entityId&&item.available);
    if(!target)throw Error('Der ausgewählte Lautsprecher ist gerade nicht erreichbar.');
    const features=this.hass.states[target.id].attributes.supported_features||0;
    if(features&4096)await this.hass.callService('media_player','media_stop',{}, {entity_id:target.id});
    else if(features&1)await this.hass.callService('media_player','media_pause',{}, {entity_id:target.id});
    else throw Error('Dieser Lautsprecher unterstützt weder Stop noch Pause über Home Assistant.');
    return {message:features&4096?'Musik gestoppt.':'Wiedergabe angehalten.'};
  }
  async receive(event){
    const frame=this.renderRoot.querySelector('iframe');
    if(event.source!==frame?.contentWindow||event.origin!==location.origin)return;
    const message=event.data;
    if(message?.type==='oled-night-train-preview-ready'){this._previewResolve?.(message.events);return;}
    if(message?.type==='oled-night-train-command'){
      if(message.action==='preferences'&&message.data&&typeof message.data==='object')this.dispatchEvent(new CustomEvent('night-train-preferences',{detail:message.data,bubbles:true,composed:true}));
      if(message.action==='gallery-edit')this.dispatchEvent(new CustomEvent('night-train-gallery-edit',{detail:message.data,bubbles:true,composed:true}));
      if(message.action==='lighting'&&['auto','day','night'].includes(message.data?.value))this.dispatchEvent(new CustomEvent('night-train-lighting',{detail:message.data.value,bubbles:true,composed:true}));
      if(message.action==='visual'){
        const data=message.data||{};
        this.getRootNode().querySelector('.teddy-frame')?.contentWindow?.postMessage({type:'oled-world-visual',...data},'*');
      }
      if(['dismiss','settings'].includes(message.action))this.dispatchEvent(new CustomEvent('night-train-'+message.action,{bubbles:true,composed:true}));
      return;
    }
    if(message?.type!=='oled-night-train-request'||!Number.isSafeInteger(message.id))return;
    let result,error;
    try{
      if(message.action==='speakers')result={speakers:musicSpeakers(this.hass,await this.registry())};
      else if(message.action==='doorbell-load')result=await loadDoorbell(this.hass);
      else if(message.action==='doorbell-save')result=await saveDoorbell(this.hass,message.data||{});
      else if(message.action==='doorbell-setting'){await saveBellSetting(this.hass,message.data?.key,message.data?.value);result=this.context();this.sendContext();}
      else if(message.action==='play')result=await this.play(message.data||{});
      else if(message.action==='stop')result=await this.stop(message.data||{});
      else if(message.action==='select-player')result=await this.selectPlayer(message.data||{});
      else if(message.action==='entities')result=Object.values(this.hass.states).filter(entity=>/^(binary_sensor|sensor|input_boolean|input_select|calendar|event)\./.test(entity.entity_id)).map(entity=>({id:entity.entity_id,name:entity.attributes.friendly_name||entity.entity_id,state:entity.state}));
      else if(message.action==='subscribe'){
        this.subscriptions=[...new Set(Array.isArray(message.data?.entities)?message.data.entities:[])].filter(id=>typeof id==='string'&&this.hass.states[id]);
        result=this.context();
      }else if(message.action==='context')result=this.context();
      else throw Error('Diese Aktion ist nicht verfügbar.');
    }catch(cause){error=cause.message||'Home Assistant konnte die Aktion nicht ausführen.';}
    if(this.isConnected&&frame===this.renderRoot.querySelector('iframe'))frame.contentWindow.postMessage({type:'oled-night-train-response',id:message.id,result,error},location.origin);
  }
  render(){return this._document?html`<iframe title=${this.mode==='settings'?'Bildschirmschoner einstellen':'OLED Motivwelt'} .srcdoc=${this._document} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" @load=${()=>this.sendContext()}></iframe>`:html`<div class="loading" @pointerdown=${e=>e.stopPropagation()} @pointerup=${e=>e.stopPropagation()} @click=${e=>e.stopPropagation()}>${this._loadError?html`Motiv konnte nicht geladen werden. <button @click=${()=>{this._loadError=false;this.requestUpdate();}}>Erneut versuchen</button>`:'Motiv wird geladen …'}</div>`;}
}
if(!customElements.get('oled-night-train'))customElements.define('oled-night-train',OledNightTrain);
