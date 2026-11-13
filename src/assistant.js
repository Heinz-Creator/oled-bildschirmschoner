import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import styles from './assistant.css';
import edgarImage from '../dist/assist-edgar.jpg';
import bertaImage from '../dist/assist-berta.jpg';
import hectorImage from '../dist/assist-hector.jpg';
import edgarAudio from '../dist/assist-edgar.mp3';
import bertaAudio from '../dist/assist-berta.mp3';
import hectorAudio from '../dist/assist-hector.mp3';
import { Portrait, drawDial, reducedMotion } from './assistant-portrait.js';
import { beginAssistRun } from './assist-pipeline.js';
import { renderAssistantAnswer } from './assistant-chat.js';
import { loadRecipePhoto, recipePhotoSubject } from './assistant-images.js';

const figures = {
  edgar: { image:edgarImage, sample:edgarAudio, name:'Edgar', eyes:[
    {x:.355,y:.393,rx:.066,ry:.0185,iris:.020}, {x:.653,y:.393,rx:.066,ry:.0185,iris:.020},
  ], mouth:{x:.514,y:.663,rx:.110} },
  berta: { image:bertaImage, sample:bertaAudio, name:'Berta Berlin', eyes:[
    {x:.392,y:.404,rx:.055,ry:.017,iris:.020}, {x:.638,y:.403,rx:.055,ry:.017,iris:.020},
  ], mouth:{x:.521,y:.621,rx:.091} },
  hector: { image:hectorImage, sample:hectorAudio, name:'Haunting-Hector', mechanical:true, eyes:[], mouth:{x:.50,y:.591,rx:.10} },
};
const defaultSettings = { enabled:false, figure:'edgar', pipelines:{}, recipePhotos:false };
const storageKey = 'oled_bildschirmschoner_assist_v1';
const storage = () => globalThis.localStorage;

function readSettings() {
  try {
    const saved = JSON.parse(storage().getItem(storageKey));
    return {
      enabled: saved?.enabled === true,
      figure: Object.hasOwn(figures,saved?.figure) ? saved.figure : 'edgar',
      pipelines: saved?.pipelines ?? {},
      recipePhotos: saved?.recipePhotos === true,
    };
  } catch { return defaultSettings; }
}

export class OledPublicAssistant extends LitElement {
  static properties = {
    hass:{attribute:false}, mode:{type:String}, settings:{state:true},
    list:{state:true}, status:{state:true}, messages:{state:true}, opened:{state:true},
    busy:{state:true},
  };
  static styles = [unsafeCSS(styles), css`
    :host([mode=settings]){position:static;display:block;pointer-events:auto;color:inherit;font:inherit}
    fieldset{margin:16px 0;padding:12px;border:1px solid #487184;border-radius:12px}
    label{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin:8px 0}
    select{max-width:100%;font:inherit} button:disabled{opacity:.55}
    .controls{display:flex;flex-wrap:wrap;gap:8px}
    .dialogue{max-height:min(54vh,430px);overflow:auto;touch-action:pan-y;overscroll-behavior:contain}
    .dialogue p{white-space:pre-wrap;overflow-wrap:anywhere;margin:5px 0}
    .dialogue .chat-formatted{padding:12px 16px;margin:8px 0 14px;background:#102330;border-radius:12px;overflow-wrap:anywhere}
    .chat-formatted h3,.chat-formatted h4{margin:0 0 8px}
    .chat-formatted h4,.chat-formatted a{color:var(--ice)}
    .chat-formatted ul,.chat-formatted ol{padding-inline-start:22px}
    .chat-formatted li+li{margin-top:5px}
    .chat-formatted pre{white-space:pre-wrap}
    .commons-photo{margin:0 0 12px;background:#07131e;border-radius:10px;overflow:hidden}
    .commons-photo img{display:block;width:100%;max-height:200px;object-fit:cover}
    .commons-photo figcaption{padding:6px 10px;font-size:.8rem;color:#c4d9e3}
    form{display:flex;gap:8px;margin:8px 0}
    input[type=text]{width:100%;min-width:0;background:#07131e;color:inherit;font:inherit;border:1px solid #487184;border-radius:10px;padding:8px}
  `];

  constructor() {
    super();
    this.settings = readSettings();
    this.messages = [];
    this.audio = new Audio();
    this.audio.preload = 'none';
    this.status = '';
    this.addEventListener('click', event => event.stopPropagation());
    for (const type of ['pointerdown','pointerup','pointercancel','keydown']) {
      this.addEventListener(type, event => event.stopPropagation());
    }
  }

  firstUpdated() {
    if (this.mode === 'settings') void this.loadPipelines();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stop();
    void this.context?.close().catch(() => {});
    this.context = null;
  }

  async loadPipelines() {
    try {
      const result = await this.hass.callWS({type:'assist_pipeline/pipeline/list'});
      this.list = result;
      return result;
    } catch {
      this.status = 'Assist-Sprachassistenten konnten nicht geladen werden.';
      return null;
    }
  }

  saveSettings(changes) {
    this.audio.pause();
    this.settings = {...this.settings,...changes};
    try { storage().setItem(storageKey,JSON.stringify(this.settings)); }
    catch { this.status = 'Die Auswahl konnte nicht gespeichert werden.'; }
  }

  async preview() {
    this.audio.src = figures[this.settings.figure].sample;
    try {
      await this.audio.play();
      this.status = '';
    } catch { this.status = 'Die Hörprobe konnte nicht abgespielt werden.'; }
  }

  renderSettings() {
    const {enabled, figure, pipelines} = this.settings;
    const saved = pipelines[figure] ?? '';
    const options = this.list?.pipelines ?? [];
    return html`<fieldset>
      <legend>Assistent</legend>
      <label>Assistent aktiv <input type="checkbox" .checked=${enabled}
        @change=${event => this.saveSettings({enabled:event.target.checked})}></label>
      <label>Figur <select .value=${figure} @change=${event => this.saveSettings({figure:event.target.value})}>
        ${Object.entries(figures).map(([id,item])=>html`<option value=${id} ?selected=${id===figure}>${item.name}</option>`)}
      </select></label>
      <label>Sprachassistent für ${figures[figure].name}
        <select ?disabled=${!this.list} @change=${event => this.saveSettings({pipelines:{...pipelines,[figure]:event.target.value}})}>
          <option value="" ?selected=${!options.some(item=>item.id===saved)}>Home-Assistant-Standard</option>
          ${options.map(item=>html`<option value=${item.id} ?selected=${item.id===saved}>${item.name}</option>`)}
        </select>
      </label>
      <button type="button" @click=${this.preview}>MP3-Hörprobe abspielen</button>
      <label>Rezeptfotos von Wikimedia Commons <input type="checkbox" .checked=${this.settings.recipePhotos}
        @change=${event => this.saveSettings({recipePhotos:event.target.checked})}></label>
      <p>Die Hörprobe enthält eine feste Begrüßung. Die Stimme für Antworten kommt vom gewählten Sprachassistenten.</p>
      <p role="status">${this.status}</p>
    </fieldset>`;
  }

  async open() {
    this.photoSession?.abort();
    this.photoSession = new AbortController();
    this.getRootNode().querySelector('.ambient-hit')?.setAttribute('inert','');
    this.opened = true;
    this.status = 'Bereit';
    this.messages = [];
    this.conversationId = undefined;
    await this.updateComplete;
    if (!this.isConnected || !this.opened) return;
    const figure = this.settings.figure;
    const canvas = this.renderRoot.querySelector('.face');
    this.portrait = new Portrait(canvas,figures[figure]);
    this.renderRoot.querySelector('.close-assistant').focus();
    this.draw(performance.now());
  }

  draw(time) {
    if (!this.opened) return;
    const playing = !this.audio.paused && !this.audio.ended;
    let level = 0;
    if (playing && this.analyser) {
      this.analyser.getFloatTimeDomainData(this.wave);
      level = Math.min(1,Math.sqrt(this.wave.reduce((sum,v)=>sum+v*v,0)/this.wave.length)*6);
    }
    this.portrait.draw(time,[1,level*10,.5],playing);
    const hud = this.renderRoot.querySelector('.hud');
    const width = hud.clientWidth;
    const height = hud.clientHeight;
    if (hud.width !== width) hud.width = width;
    if (hud.height !== height) hud.height = height;
    const ctx = hud.getContext('2d');
    ctx.clearRect(0,0,width,height);
    const turn = reducedMotion.matches ? 0 : time/1300;
    drawDial(ctx,width*.125,height*.51,Math.min(width,height)*.17,'#ff7551',-turn,level);
    drawDial(ctx,width*.88,height*.38,Math.min(width,height)*.19,'#67eaff',turn,level);
    this.frame = requestAnimationFrame(next=>this.draw(next));
  }

  stop() {
    this.photoSession?.abort();
    this.run?.abort();
    this.run = null;
    this.busy = false;
    this.audio.pause();
    cancelAnimationFrame(this.frame);
  }

  async close() {
    this.stop();
    this.getRootNode().querySelector('.ambient-hit')?.removeAttribute('inert');
    this.opened = false;
    await this.updateComplete;
    this.renderRoot.querySelector('.voice-orb')?.focus();
  }

  addMessage(text, author, question) {
    const formatted = question === undefined ? null : renderAssistantAnswer(text, question);
    this.messages = [...this.messages,{text,author,article:formatted?.article}];
    if (formatted && this.settings.recipePhotos && this.photoSession) {
      loadRecipePhoto(formatted.article, recipePhotoSubject(question, formatted.blocks), this.photoSession.signal);
    }
    void this.updateComplete.then(()=>{
      const log = this.renderRoot.querySelector('.dialogue');
      if (log) {
        const article = formatted?.article;
        log.scrollTop = article ? log.scrollTop + article.getBoundingClientRect().top - log.getBoundingClientRect().top : log.scrollHeight;
      }
    });
  }

  unlockAudio() {
    const Context = window.AudioContext ?? window.webkitAudioContext;
    if (!Context) return;
    if (!this.context) {
      this.context = new Context();
      this.analyser = this.context.createAnalyser();
      this.wave = new Float32Array(this.analyser.fftSize);
      this.context.createMediaElementSource(this.audio).connect(this.analyser).connect(this.context.destination);
    }
    void this.context.resume().catch(() => {});
  }

  async ask(text) {
    if (this.run) return;
    const run = new AbortController();
    this.run = run;
    this.busy = true;
    this.audio.pause();
    let stream;
    try {
      this.unlockAudio();
      const list = await this.loadPipelines();
      if (run.signal.aborted) return;
      const chosen = this.settings.pipelines[this.settings.figure];
      const pipeline = list?.pipelines.find(item=>item.id===chosen)
        ?? list?.pipelines.find(item=>item.id===list.preferred_pipeline)
        ?? list?.pipelines[0];
      if (!pipeline) {
        this.status = 'Richte unter Einstellungen → Sprachassistenten einen Assist-Assistenten ein.';
        return;
      }
      if (!text) {
        if (!pipeline.stt_engine || !navigator.mediaDevices?.getUserMedia || !this.context) {
          this.status = 'Für das Mikrofon sind Spracherkennung und HTTPS nötig. Du kannst deine Frage tippen.';
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
        if (run.signal.aborted) return;
        this.status = 'Ich höre zu';
      } else {
        this.addMessage(text,'Du');
        this.status = 'Assist denkt nach';
      }
      let answer = false;
      let question = text ?? '';
      let playback;
      await beginAssistRun(this.hass,{
        text, pipeline:pipeline.id, conversationId:this.conversationId, signal:run.signal,
        endStage:pipeline.tts_engine ? 'tts' : 'intent',
        microphone: stream ? {stream,context:this.context} : undefined,
        onEvent:({type,data})=>{
          if (run.signal.aborted) return;
          if (type==='stt-end') {
            const heard = data?.stt_output?.text;
            if (heard) {
              question = heard;
              this.addMessage(heard,'Du');
            }
            this.status = 'Assist denkt nach';
          }
          if (type==='intent-end') {
            const output = data?.intent_output;
            this.conversationId = output?.conversation_id;
            const response = output?.response?.speech?.plain?.speech;
            if (response) {
              answer = true;
              this.addMessage(response,figures[this.settings.figure].name,question);
            }
          }
          if (type==='tts-end') playback = this.speak(data?.tts_output?.url,run.signal);
        },
      });
      const played = await playback;
      if (!run.signal.aborted) this.status = played ? 'Bereit' : answer ? 'Antwort im Chat' : 'Keine Antwort erhalten';
    } catch {
      if (!run.signal.aborted) this.status = 'Assist konnte die Anfrage nicht abschließen.';
    } finally {
      stream?.getTracks().forEach(track=>track.stop());
      if (this.run===run) {
        this.run = null;
        this.busy = false;
      }
    }
  }

  async speak(value, signal) {
    if (!value) return false;
    try {
      const url = new URL(value,location.origin);
      if (url.origin!==location.origin || !url.pathname.startsWith('/api/tts_proxy/')) return false;
      this.audio.src = url.href;
      await this.audio.play();
      this.status = 'Spricht';
      return await new Promise(resolve => {
        const audio = this.audio;
        const finish = event => {
          for (const type of ['ended','error','pause']) audio.removeEventListener(type,finish);
          signal.removeEventListener('abort',finish);
          resolve(event.type === 'ended');
        };
        if (signal.aborted || audio.paused) {
          resolve(audio.ended);
          return;
        }
        for (const type of ['ended','error','pause']) audio.addEventListener(type,finish,{once:true});
        signal.addEventListener('abort',finish,{once:true});
      });
    } catch { return false; }
  }

  submit(event) {
    event.preventDefault();
    const input = event.currentTarget.elements.question;
    const text = input.value.trim();
    if (!text || this.busy) return;
    input.value = '';
    void this.ask(text);
  }

  render() {
    if (this.mode === 'settings') return this.renderSettings();
    if (!this.settings.enabled) return nothing;
    return html`<div @keydown=${event=>{if(event.key==='Escape'&&this.opened){event.preventDefault();void this.close();}}}>
      <div class="voice-dock" ?hidden=${this.opened}><button class="voice-orb" aria-label="Assistent öffnen" @click=${this.open}>✦</button></div>
      ${this.opened ? html`<section class="assistant" aria-label="Sprachassistent">
        <div class="portrait"><canvas class="face" width="400" height="500" aria-hidden="true"></canvas><canvas class="hud" aria-hidden="true"></canvas></div>
        <button class="close-assistant" aria-label="Assistent schließen" @click=${this.close}></button>
        <div class="copy">
          <span class="state" role="status">${this.status}</span>
          <div class="dialogue" role="log">${this.messages.map(({author,text,article})=>article
            ? html`<div aria-label=${author}>${article}</div>`
            : html`<p><strong>${author}</strong> · ${text}</p>`)}</div>
          <form @submit=${this.submit}>
            <input type="text" name="question" aria-label="Frage" placeholder="Frage schreiben" maxlength="1200">
            <button ?disabled=${this.busy}>Senden</button>
          </form>
          <button type="button" ?disabled=${this.busy} @click=${()=>void this.ask()}>Zuhören</button>
        </div>
      </section>` : nothing}
    </div>`;
  }
}

if (!customElements.get('oled-public-assistant')) customElements.define('oled-public-assistant',OledPublicAssistant);
