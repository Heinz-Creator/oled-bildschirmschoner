import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectHouse } from './src/house-status.js';
import { ambientScene, ambientPreferences, canStartAmbient } from './src/ambient-data.js';
const entity = (entity_id,state,attributes={}) => ({entity_id,state,attributes});
const hass = (...entities) => ({states:Object.fromEntries(entities.map(e => [e.entity_id,e])),config:{unit_system:{temperature:'°C'}}});

test('automatic counts ignore garage doors and do not count group members twice', () => {
  const home = hass(entity('light.group','on',{entity_id:['light.one','light.two']}),
    entity('light.one','on'),entity('light.two','off'),
    entity('cover.garage','closed',{device_class:'garage'}),
    entity('cover.kitchen','closed',{device_class:'shutter'}));
  assert.deepEqual(projectHouse(home,{}).rows,[{key:'house-counts',title:'1 Licht an',detail:'1 Rollo geschlossen'}]);
  assert.equal(projectHouse(home,{lights:[],covers:[]}).rows.length,0);
});

test('appliance messages require a confirmed matching state and media requires playback', () => {
  const home = hass(entity('binary_sensor.washer','on'),entity('media_player.tv','playing',{media_title:'Testfilm'}),
    entity('media_player.radio','paused',{media_title:'Alte Wiedergabe'}));
  const appliances = [{entity:'binary_sensor.washer',state:'on',title:'Waschmaschine fertig'}];
  assert.deepEqual(projectHouse(home,{appliances}).rows.map(r=>r.title),['Waschmaschine fertig','Testfilm']);
  home.states['binary_sensor.washer'].state='unavailable';
  assert.deepEqual(projectHouse(home,{appliances}).rows.map(r=>r.title),['Testfilm']);
});

test('missing sources are omitted and valid Fahrenheit weather converts to Celsius', () => {
  const home=hass(entity('weather.home','rainy',{temperature:50,temperature_unit:'°F'}));
  assert.equal(projectHouse(home,{}).temperature,10);
  assert.equal(projectHouse(home,{weather:false}).temperature,null);
  assert.equal(projectHouse(home,{house_power:'sensor.missing'}).power,'');
});

test('the published artwork worlds never reference the private motif', () => {
  const date=Date.parse('2026-12-21T14:00:00+01:00');
  assert.match(ambientScene(date,'snowy',true,'Europe/Berlin','minecraft').url,/minecraft-christmas-morning\.webp$/);
  assert.equal(ambientPreferences({motif:'home'}).motif,'tree');
  assert.equal(canStartAmbient({enabled:true,idleMs:120_000,idleMinutes:2,blocked:false,hidden:false,pointerDown:false}),true);
  assert.equal(canStartAmbient({enabled:true,idleMs:120_000,idleMinutes:2,blocked:false,hidden:true,pointerDown:false}),false);
});
