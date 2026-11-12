import { LitElement, css, html } from 'lit';

const pickers = [
  ['weather','Wetter','weather'],
  ['feels_like','Gefühlte Temperatur','sensor'],
  ['house_power','Hausverbrauch','sensor'],
  ['solar_power','PV-Leistung','sensor'],
  ['calendar','Kalender','calendar'],
  ['news','Nachrichtenquelle mit Titel','sensor'],
];

class OledBildschirmschonerEditor extends LitElement {
  static properties = {hass:{attribute:false},config:{state:true},settingsOpen:{state:true}};
  static styles = css`
    :host {display:grid;gap:12px;color:var(--primary-text-color)}
    fieldset {border:1px solid var(--divider-color);border-radius:10px;padding:12px;min-width:0}
    label {display:grid;gap:4px;margin-block:6px}
    .check {display:flex;align-items:center;gap:7px}
    details {border:1px solid var(--divider-color);border-radius:10px;padding:9px 12px}
    summary {cursor:pointer}
    .choices {max-height:14rem;overflow:auto}
    .choices label {display:flex;align-items:center;gap:8px}
    select,input,button {font:inherit;color:inherit}
    select,input:not([type=checkbox]),button {box-sizing:border-box;min-height:38px;max-width:100%;border-radius:6px;
      border:1px solid var(--divider-color,#888);padding:5px 8px;background:var(--card-background-color,#171b21)}
    button {cursor:pointer}
    p {margin:3px 0 6px;color:var(--secondary-text-color)}
  `;

  setConfig(config) { this.config = {...config}; }

  #emit(next) {
    this.config = next;
    this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:next},bubbles:true,composed:true}));
  }

  #change(key,value) {
    const next = {...this.config};
    if (value === undefined) delete next[key];
    else next[key] = value;
    this.#emit(next);
  }

  #entities(domain) {
    return Object.values(this.hass?.states ?? {}).filter(e => !domain || e.entity_id.startsWith(domain + '.'))
      .sort((a,b) => this.#label(a).localeCompare(this.#label(b),'de'));
  }

  #label(entity) { return entity.attributes?.friendly_name || entity.entity_id; }

  #picker(title,domain,value,onChange,weather = false) {
    const current = value === false ? 'disabled' : value || '';
    const entities = this.#entities(domain);
    return html`<label>${title}
      <select .value=${current} @change=${event => onChange(event.target.value)}>
        <option value="" ?selected=${current === ''}>${weather ? 'Automatisch' : 'Ausgeblendet'}</option>
        ${weather ? html`<option value="disabled" ?selected=${current === 'disabled'}>Ausgeblendet</option>` : ''}
        ${current && current !== 'disabled' && !entities.some(e => e.entity_id === current)
          ? html`<option value=${current} selected>${current}</option>` : ''}
        ${entities.map(e => html`<option value=${e.entity_id} ?selected=${current === e.entity_id}>${this.#label(e)} · ${e.entity_id}</option>`)}
      </select>
    </label>`;
  }

  #list(key,title,domain) {
    const value = this.config[key];
    const auto = !Array.isArray(value);
    const entities = this.#entities(domain);
    return html`<details><summary>${title} · ${auto ? 'automatisch' : value.length + ' ausgewählt'}</summary>
      <label class="check"><input type="checkbox" .checked=${auto} @change=${e => this.#change(key,e.target.checked ? undefined : [])}> Automatisch erkennen</label>
      ${auto ? '' : html`<div class="choices">${entities.map(entity => {
        const id = entity.entity_id;
        return html`<label><input type="checkbox" .checked=${value.includes(id)} @change=${e => {
          const current = this.config[key];
          this.#change(key,e.target.checked ? [...new Set([...current,id])] : current.filter(item => item !== id));
        }}>${this.#label(entity)} <small>${id}</small></label>`;
      })}</div>`}
    </details>`;
  }

  #updateRule(index,key,value) {
    const next = [...this.config.appliances];
    next[index] = {...next[index],[key]:value};
    this.#change('appliances',next);
  }

  render() {
    if (!this.hass || !this.config) return html``;
    const rules = Array.isArray(this.config.appliances) ? this.config.appliances : [];
    return html`
      <fieldset><legend>Anzeige</legend>
        <button type="button" @click=${() => { this.settingsOpen = true; }}>Bildschirmschoner einstellen</button>
        <label class="check"><input type="checkbox" .checked=${this.config.show_controls === true}
          @change=${event => this.#change('show_controls',event.target.checked || undefined)}> Karte im Dashboard anzeigen</label>
        ${this.settingsOpen ? html`<oled-public-ambient .hass=${this.hass} .blocked=${true} .settingsOpen=${true}
          @ambient-settings-close=${() => { this.settingsOpen = false; }}></oled-public-ambient>` : ''}
      </fieldset>
      ${this.#list('lights','Lichter','light')}
      ${this.#list('covers','Rollos','cover')}
      ${this.#list('players','Mediaplayer','media_player')}
      <fieldset><legend>Weitere Daten</legend>
        ${pickers.map(([key,title,domain]) => this.#picker(title,domain,this.config[key],
          value => this.#change(key,value === 'disabled' ? false : value || undefined),key === 'weather'))}
      </fieldset>
      <fieldset><legend>Gerätemeldungen</legend>
        <p>Eine Meldung erscheint, solange die gewählte Entität den eingetragenen Zustand hat.</p>
        <p><a href="https://github.com/Heinz-Creator/oled-bildschirmschoner#waschmaschine-oder-geschirrsp%C3%BCler-fertig"
          target="_blank" rel="noopener">Anleitung für Waschmaschine und Geschirrspüler</a></p>
        ${rules.map((rule,index) => html`<fieldset>
          ${this.#picker('Entität',null,rule.entity,value => this.#updateRule(index,'entity',value))}
          <label>Zustand, z. B. on oder finished<input .value=${rule.state || ''} @change=${e => this.#updateRule(index,'state',e.target.value)}></label>
          <label>Anzeigetext<input .value=${rule.title || ''} @change=${e => this.#updateRule(index,'title',e.target.value)}></label>
          <label>Zusatzzeile (optional)<input .value=${rule.detail || ''} @change=${e => this.#updateRule(index,'detail',e.target.value)}></label>
          <button type="button" @click=${() => this.#change('appliances',rules.filter((_,i) => i !== index))}>Meldung entfernen</button>
        </fieldset>`)}
        <button type="button" @click=${() => this.#change('appliances',[...rules,{entity:'',state:'on',title:''}])}>Meldung hinzufügen</button>
      </fieldset>`;
  }
}

if (!customElements.get('oled-bildschirmschoner-editor')) {
  customElements.define('oled-bildschirmschoner-editor',OledBildschirmschonerEditor);
}
