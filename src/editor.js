import { LitElement, css, html } from 'lit';
import { appliancePresets, isPowerSensor, setupAppliance } from './appliance-setup.js';

const pickers = [
  ['weather','Wetter','weather'],
  ['feels_like','Gefühlte Temperatur','sensor'],
  ['house_power','Hausverbrauch','sensor'],
  ['solar_power','PV-Leistung','sensor'],
  ['calendar','Kalender','calendar'],
  ['news','Nachrichtenquelle mit Titel','sensor'],
];

class OledBildschirmschonerEditor extends LitElement {
  static properties = {hass:{attribute:false},config:{state:true},settingsOpen:{state:true},
    appliance:{state:true},applianceBusy:{state:true},applianceError:{state:true},applianceResult:{state:true}};
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
    .appliance-setup {margin:10px 0}
    .thresholds {display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0 12px}
    .thresholds input {width:100%}
    .error {color:var(--error-color)}
  `;

  constructor() {
    super();
    this.appliance = {...appliancePresets.washer,sensor:''};
  }

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

  #updateAppliance(values) {
    this.appliance = {...this.appliance,...values};
    this.applianceError = '';
    this.applianceResult = undefined;
  }

  async #addApplianceAutomation() {
    if (this.applianceBusy) return;
    this.applianceBusy = true;
    this.applianceError = '';
    this.applianceResult = undefined;
    const appliance = {...this.appliance,title:this.appliance.title.trim()};
    try {
      const result = await setupAppliance(this.hass,appliance);
      const rules = Array.isArray(this.config.appliances) ? this.config.appliances : [];
      if (!rules.some(rule => rule?.entity === result.entity && rule.state === 'Fertig')) {
        this.#change('appliances',[...rules,{entity:result.entity,state:'Fertig',title:appliance.title + ' fertig'}]);
      }
      this.applianceResult = result;
    } catch (error) {
      this.applianceError = error?.message || 'Home Assistant konnte die Automation nicht anlegen.';
    } finally {
      this.applianceBusy = false;
    }
  }

  #applianceNumber(title,key,min,max,step) {
    return html`<label>${title}<input type="number" min=${min} max=${max} step=${step} .value=${String(this.appliance[key])}
      @change=${event => this.#updateAppliance({[key]:event.target.valueAsNumber})}></label>`;
  }

  #applianceSetup() {
    const sensors = this.#entities('sensor').filter(isPowerSensor);
    return html`<details class="appliance-setup"><summary>Waschmaschine oder Geschirrspüler über Steckdose einrichten</summary>
      <p>Wähle den Leistungssensor der Messsteckdose in Watt. Die Steckdose bleibt eingeschaltet.</p>
      <fieldset ?disabled=${this.applianceBusy || !this.hass.user?.is_admin}>
        <label>Gerät
          <select @change=${event => this.#updateAppliance(appliancePresets[event.target.value])}>
            <option value="washer">Waschmaschine</option>
            <option value="dishwasher">Geschirrspüler</option>
          </select>
        </label>
        <label>Gerätename<input maxlength="60" .value=${this.appliance.title}
          @change=${event => this.#updateAppliance({title:event.target.value})}></label>
        <label>Leistungssensor (W)
          <select @change=${event => this.#updateAppliance({sensor:event.target.value})}>
            <option value="" ?selected=${!this.appliance.sensor}>Bitte wählen</option>
            ${sensors.map(sensor => html`<option value=${sensor.entity_id} ?selected=${this.appliance.sensor === sensor.entity_id}>
              ${this.#label(sensor)} · ${sensor.entity_id}
            </option>`)}
          </select>
        </label>
        ${sensors.length ? '' : html`<p>Home Assistant meldet aktuell keinen Leistungssensor in Watt.</p>`}
        <details><summary>Schwellen und Wartezeiten</summary>
          <p>Das Ende zählt erst nach erkanntem Start und durchgehendem Leerlauf. Wähle eine längere Wartezeit als die üblichen Programmpausen.</p>
          <div class="thresholds">
            ${this.#applianceNumber('Start über (W)','runningWatts',0.1,5000,0.1)}
            ${this.#applianceNumber('Start nach (Minuten)','runningMinutes',1,120,1)}
            ${this.#applianceNumber('Ende unter (W)','idleWatts',0.1,5000,0.1)}
            ${this.#applianceNumber('Ende nach (Minuten)','idleMinutes',1,120,1)}
          </div>
        </details>
        <button type="button" ?disabled=${!this.appliance.sensor}
          @click=${() => void this.#addApplianceAutomation()}>${this.applianceBusy ? 'Wird angelegt …' : 'Automation hinzufügen'}</button>
      </fieldset>
      ${this.hass.user?.is_admin ? '' : html`<p>Zum Anlegen brauchst du ein Home-Assistant-Administratorkonto.</p>`}
      ${this.applianceError ? html`<p class="error" role="alert">${this.applianceError}</p>` : ''}
      ${this.applianceResult ? html`<p role="status">
        ${this.applianceResult.existing ? 'Automation bereits vorhanden.' : 'Automation und Status-Helfer sind angelegt.'}
        Speichere die Karte, um die Fertigmeldung anzuzeigen.
        Für eigene Automationen wie Durchsagen nutze den Zustand <strong>Fertig</strong> von <code>${this.applianceResult.entity}</code>.
        <a href=${'/config/automation/edit/' + this.applianceResult.id} target="_blank" rel="noopener">Automation öffnen</a>
      </p>` : ''}
    </details>`;
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
        <p>Liefert die Geräteintegration einen Fertigstatus, wähle ihn unter „Meldung hinzufügen“. Für Geräte ohne Programmstatus kannst du eine Messsteckdose einrichten.</p>
        ${this.#applianceSetup()}
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
