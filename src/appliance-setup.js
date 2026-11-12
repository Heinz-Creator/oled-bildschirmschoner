export const appliancePresets = {
  washer:{title:'Waschmaschine',runningWatts:25,runningMinutes:2,idleWatts:15,idleMinutes:15},
  dishwasher:{title:'Geschirrspüler',runningWatts:10,runningMinutes:1,idleWatts:5,idleMinutes:10},
};

const options = ['Bereit','Läuft','Fertig'];
const inProgress = new Map();

export function isPowerSensor(entity) {
  return /^sensor\.[a-z0-9_]+$/.test(entity?.entity_id ?? '') && entity.attributes?.unit_of_measurement === 'W';
}

function validate(hass, setup) {
  if (!hass.user?.is_admin) throw new Error('Zum Anlegen brauchst du ein Home-Assistant-Administratorkonto.');
  if (!isPowerSensor(hass.states?.[setup.sensor])) throw new Error('Wähle den Leistungssensor der Steckdose in Watt (W).');
  if (!setup.title.trim()) throw new Error('Gib dem Gerät einen Namen.');
  const {runningWatts,runningMinutes,idleWatts,idleMinutes} = setup;
  if (!Number.isFinite(runningWatts) || !Number.isFinite(idleWatts) || idleWatts <= 0 || runningWatts <= idleWatts || runningWatts > 5000) {
    throw new Error('Die Startschwelle muss über der positiven Ende-Schwelle liegen.');
  }
  if (![runningMinutes,idleMinutes].every(value => Number.isInteger(value) && value > 0 && value <= 120)) {
    throw new Error('Gib für beide Wartezeiten zwischen 1 und 120 ganze Minuten ein.');
  }
}

function setStatus(entity, option) {
  return {action:'input_select.select_option',target:{entity_id:entity},data:{option}};
}

function automationConfig(setup, entity) {
  return {
    alias:'OLED · ' + setup.title + ' erkennen',
    description:'OLED Bildschirmschoner. Liest die Leistungsaufnahme und schreibt den Programmstatus in ' + entity + '.',
    mode:'queued',
    triggers:[
      {trigger:'numeric_state',id:'started',entity_id:setup.sensor,above:setup.runningWatts,for:{minutes:setup.runningMinutes}},
      {trigger:'numeric_state',id:'finished',entity_id:setup.sensor,below:setup.idleWatts,for:{minutes:setup.idleMinutes}},
    ],
    actions:[{choose:[
      {conditions:[{condition:'trigger',id:'started'}],sequence:[setStatus(entity,'Läuft')]},
      {conditions:[{condition:'trigger',id:'finished'},{condition:'state',entity_id:entity,state:'Läuft'}],
        sequence:[setStatus(entity,'Fertig')]},
    ]}],
  };
}

async function readAutomation(hass, path) {
  try {
    return await hass.callApi('GET',path);
  } catch (error) {
    if (error?.status_code !== 404) throw error;
    return null;
  }
}

async function provision(hass, setup, id) {
  const path = 'config/automation/config/' + id;
  const existing = await readAutomation(hass,path);
  if (existing) {
    const entity = existing.actions?.[0]?.choose?.[1]?.sequence?.[0]?.target?.entity_id;
    if (existing.description?.startsWith('OLED Bildschirmschoner.') && /^input_select\.[a-z0-9_]+$/.test(entity ?? '')) {
      return {id,entity,existing:true};
    }
    throw new Error('Für diesen Sensor existiert bereits eine Automation mit derselben Kennung. Prüfe sie in Home Assistant.');
  }

  const helperName = 'OLED Gerätestatus · ' + setup.sensor.slice('sensor.'.length);
  const helpers = await hass.callWS({type:'input_select/list'});
  let helper = helpers.find(entry => entry.name === helperName);
  if (helper && options.some(option => !helper.options?.includes(option))) {
    throw new Error('Der vorhandene Helfer „' + helperName + '“ braucht die Optionen Bereit, Läuft und Fertig.');
  }
  if (!helper) helper = await hass.callWS({type:'input_select/create',name:helperName,options});
  const registry = await hass.callWS({type:'config/entity_registry/list'});
  const entity = registry.find(entry => entry.platform === 'input_select' && entry.unique_id === helper.id)?.entity_id;
  if (!entity) throw new Error('Der Status-Helfer ist angelegt. Home Assistant hat seine Entität noch nicht gemeldet. Versuch es erneut.');
  try {
    await hass.callApi('POST',path,automationConfig(setup,entity));
  } catch (error) {
    const detail = error?.body?.message || error?.message || error?.error || 'Home Assistant hat das Speichern abgelehnt.';
    throw new Error('Der Helfer ' + entity + ' ist vorhanden. Die Automation konnte nicht gespeichert werden. ' + detail);
  }
  return {id,entity,existing:false};
}

export async function setupAppliance(hass, setup) {
  validate(hass,setup);
  const id = 'oled_bildschirmschoner_' + setup.sensor.replace('.','_');
  if (inProgress.has(id)) return inProgress.get(id);
  const pending = provision(hass,setup,id);
  inProgress.set(id,pending);
  try {
    return await pending;
  } finally {
    inProgress.delete(id);
  }
}
