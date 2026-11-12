import { LitElement, css, html } from 'lit';
import './oled-ambient.js';
import './editor.js';
import { projectHouse } from './house-status.js';
import { readAmbientDevice } from './ambient-data.js';

class OledBildschirmschoner extends LitElement {
  static properties = {
    hass:{attribute:false},
    config:{state:true},
    events:{state:true},
    preview:{type:Boolean},
    editMode:{type:Boolean},
  };

  static styles = css`
    :host([hidden]) {display:none}
    ha-card {padding:20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
    .copy {flex:1;min-width:180px}
    h2 {font-size:1.12rem;margin:0 0 4px;color:var(--primary-text-color)}
    p {margin:0;color:var(--secondary-text-color);font-size:.9rem}
    button {font:inherit;min-height:44px;border-radius:12px;padding:8px 13px;cursor:pointer;
      border:1px solid var(--divider-color,#777);background:var(--card-background-color);color:var(--primary-text-color)}
    button:first-of-type {background:var(--primary-color,#186a70);color:var(--text-primary-color,#fff);border-color:transparent}
    button:focus-visible {outline:2px solid var(--primary-color,#186a70);outline-offset:3px}
  `;

  static getConfigElement() { return document.createElement('oled-bildschirmschoner-editor'); }
  static getStubConfig() { return {type:'custom:oled-bildschirmschoner'}; }

  #calendarId;
  #calendarVersion = 0;
  #refreshAfter = 0;
  #timer;
  #ambient;

  constructor() { super(); this.events = []; }
  setConfig(config) { this.config = {...config}; }
  get connectedWhileHidden() { return true; }
  getCardSize() { return this.hidden ? 0 : 2; }

  connectedCallback() {
    super.connectedCallback();
    this.#timer = setInterval(() => void this.#refreshCalendar(),60_000);
    this.requestUpdate();
  }

  disconnectedCallback() {
    clearInterval(this.#timer);
    this.#calendarVersion++;
    this.#refreshAfter = 0;
    this.#ambient?.remove();
    this.#ambient = undefined;
    super.disconnectedCallback();
  }

  updated(changed) {
    if (changed.has('hass') || changed.has('config')) void this.#refreshCalendar();
    const editing = this.preview || this.editMode;
    const hidden = !editing && this.config?.show_controls !== true;
    if (this.hidden !== hidden) {
      this.hidden = hidden;
      this.dispatchEvent(new CustomEvent('card-visibility-changed', {detail:{value:!hidden}}));
    }
    if (!this.isConnected || !this.hass?.states || !this.config) return;

    const ambient = this.#ambient ??= document.createElement('oled-public-ambient');
    const data = projectHouse(this.hass,this.config);
    Object.assign(ambient, {
      hass:this.hass,
      blocked:Boolean(editing),
      activities:data.rows,
      weather:data.weather,
      temperature:data.temperature,
      temperatureLabel:data.temperatureLabel,
      power:data.power,
      events:this.events,
      news:data.news,
    });
    if (!ambient.isConnected) {
      // Keep modal dialogs outside the hidden Lovelace card and its grid wrapper.
      document.body.append(ambient);
    } else if (!editing && (changed.has('preview') || changed.has('editMode'))) {
      let storage;
      try { storage = window.localStorage; } catch {}
      ambient.prefs = readAmbientDevice(storage);
    }
  }

  async #refreshCalendar() {
    const id = this.config?.calendar;
    if (id !== this.#calendarId) {
      this.#calendarId = id;
      this.#calendarVersion++;
      this.#refreshAfter = 0;
      this.events = [];
    }
    const now = Date.now();
    if (!this.isConnected || typeof id !== 'string' || !id.startsWith('calendar.') || !this.hass?.callApi || now < this.#refreshAfter) return;
    const version = ++this.#calendarVersion;
    this.#refreshAfter = now + 5 * 60_000;
    const query = new URLSearchParams({
      start:new Date(now).toISOString(),
      end:new Date(now + 7 * 86_400_000).toISOString(),
    });
    try {
      const events = await this.hass.callApi('GET','calendars/' + encodeURIComponent(id) + '?' + query);
      if (version === this.#calendarVersion) this.events = Array.isArray(events) ? events : [];
    } catch {
      if (version === this.#calendarVersion) this.events = [];
    }
  }

  render() {
    if (!this.hass?.states || !this.config || (!this.preview && !this.editMode && this.config.show_controls !== true)) return html``;
    return html`
      <ha-card>
        <div class="copy"><h2>OLED Bildschirmschoner</h2><p>Motivwelten, Uhrzeit und aktueller Hausstatus</p></div>
        <button type="button" @click=${() => this.#ambient?.start()}>Jetzt ansehen</button>
        <button type="button" @click=${() => { if (this.#ambient) this.#ambient.settingsOpen = true; }}>Bildschirmschoner einstellen</button>
      </ha-card>
    `;
  }
}

if (!customElements.get('oled-bildschirmschoner')) {
  customElements.define('oled-bildschirmschoner',OledBildschirmschoner);
  window.customCards ||= [];
  window.customCards.push({
    type:'oled-bildschirmschoner',
    name:'OLED Bildschirmschoner',
    description:'Motivwelten und Hausstatus fürs Wandtablet.',
  });
}
