import { celsius, validNumber } from './display-text.js';

const coverClasses = new Set(['blind','curtain','shade','shutter']);
const unavailable = new Set(['unknown','unavailable','']);
const valid = entity => entity && !unavailable.has(entity.state);
const asText = value => typeof value === 'string' ? value.trim() : '';
const nameOf = entity => asText(entity.attributes?.friendly_name) || entity.entity_id;
const readable = (hass, id) => valid(hass.states[id]) && !hass.entities?.[id]?.hidden_by;
const format = new Intl.NumberFormat('de-DE',{maximumFractionDigits:1});

function domainIds(hass, domain, configured, filter = () => true) {
  if (Array.isArray(configured)) {
    return [...new Set(configured)].filter(id => typeof id === 'string' && id.startsWith(domain + '.') && valid(hass.states[id]));
  }
  return Object.keys(hass.states).filter(id => id.startsWith(domain + '.') && readable(hass,id) && filter(hass.states[id]));
}

function lightLeaves(hass, ids) {
  const leaves = new Set();
  function visit(id, visited) {
    if (visited.has(id)) return;
    const entity = hass.states[id];
    if (!valid(entity)) return;
    const members = Array.isArray(entity.attributes?.entity_id)
      ? entity.attributes.entity_id.filter(child => typeof child === 'string' && child.startsWith('light.') && hass.states[child])
      : [];
    if (members.length) for (const member of members) visit(member, new Set(visited).add(id));
    else leaves.add(id);
  }
  for (const id of ids) visit(id,new Set());
  return [...leaves];
}

function power(entity) {
  if (!valid(entity) || !validNumber(entity.state)) return '';
  const unit = entity.attributes?.unit_of_measurement;
  return ['W','kW','MW'].includes(unit) ? format.format(Number(entity.state)) + ' ' + unit : '';
}

export function projectHouse(hass, config) {
  const states = hass.states;
  const lights = lightLeaves(hass,domainIds(hass,'light',config.lights));
  const covers = domainIds(hass,'cover',config.covers,entity => coverClasses.has(entity.attributes?.device_class));
  const lightCount = lights.filter(id => states[id].state === 'on').length;
  const coverCount = covers.filter(id => states[id].state === 'closed' ||
    (states[id].state === 'open' && validNumber(states[id].attributes?.current_position) && Number(states[id].attributes.current_position) === 0)).length;
  const lightText = lightCount === 1 ? '1 Licht an' : lightCount + ' Lichter an';
  const coverText = coverCount === 1 ? '1 Rollo geschlossen' : coverCount + ' Rollos geschlossen';
  const rows = [];
  if (lights.length || covers.length) rows.push({
    key:'house-counts', title:lights.length ? lightText : coverText, detail:lights.length && covers.length ? coverText : '',
  });

  for (const rule of Array.isArray(config.appliances) ? config.appliances : []) {
    const entity = states[rule?.entity];
    const expected = asText(rule?.state);
    const title = asText(rule?.title);
    if (valid(entity) && expected && title && entity.state === expected) {
      rows.push({key:'appliance-'+rule.entity+'-'+title,title,detail:asText(rule.detail)});
    }
  }

  const playingDevices = new Set();
  for (const id of domainIds(hass,'media_player',config.players)) {
    const entity = states[id];
    if (entity.state !== 'playing') continue;
    const device = hass.entities?.[id]?.device_id;
    if (device && playingDevices.has(device)) continue;
    if (device) playingDevices.add(device);
    const title = asText(entity.attributes?.media_title) || asText(entity.attributes?.media_channel);
    const app = asText(entity.attributes?.app_name);
    const detail = [...new Set([nameOf(entity),app,asText(entity.attributes?.media_artist)].filter(Boolean))].join(' · ');
    rows.push({key:'media-'+id,title:title || app || nameOf(entity) + ' spielt',detail});
  }

  const weatherId = config.weather === false ? null : config.weather || domainIds(hass,'weather')[0];
  const weather = states[weatherId];
  const feels = states[config.feels_like];
  const unit = hass.config?.unit_system?.temperature;
  const felt = valid(feels) ? celsius(feels.state,feels.attributes?.unit_of_measurement || unit) : null;
  const temperature = felt ?? (valid(weather) ? celsius(weather.attributes?.temperature,weather.attributes?.temperature_unit || unit) : null);
  const house = power(states[config.house_power]), solar = power(states[config.solar_power]);
  const headline = states[config.news];
  const title = valid(headline) ? asText(headline.attributes?.title) || asText(headline.state) : '';
  return {
    rows, weather:valid(weather) ? weather.state : '',
    temperature, temperatureLabel:felt === null ? 'Draußen' : 'Gefühlt draußen',
    power:[house && 'Haus ' + house, solar && 'PV ' + solar].filter(Boolean).join(' · '),
    news:title ? [{title,source:asText(headline.attributes?.source) || nameOf(headline)}] : [],
  };
}
