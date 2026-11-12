import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectHouse } from './src/house-status.js';
import { ambientScene, ambientPreferences, canStartAmbient } from './src/ambient-data.js';
import { appliancePresets, setupAppliance } from './src/appliance-setup.js';
const entity = (entity_id,state,attributes={}) => ({entity_id,state,attributes});
const hass = (...entities) => ({states:Object.fromEntries(entities.map(e => [e.entity_id,e])),config:{unit_system:{temperature:'°C'}}});

test('appliance setup reuses a helper after a failed save and avoids duplicate automations', async () => {
  const sensor = 'sensor.washer_watts';
  const helper = {id:'washer_status',entity_id:'input_select.washer_status_2'};
  const helpers = [];
  let saved;
  let posts = 0;
  const home = {
    ...hass(entity(sensor,'0',{unit_of_measurement:'W'})),
    user:{is_admin:true},
    async callWS(message) {
      if (message.type === 'input_select/list') return helpers;
      if (message.type === 'input_select/create') {
        helpers.push({id:helper.id,name:message.name,options:message.options});
        return helpers[0];
      }
      if (message.type === 'config/entity_registry/list') {
        return [{platform:'input_select',unique_id:helper.id,entity_id:helper.entity_id}];
      }
      assert.fail('Unexpected WebSocket call');
    },
    async callApi(method,path,value) {
      assert.equal(path,'config/automation/config/oled_bildschirmschoner_sensor_washer_watts');
      if (method === 'GET') {
        if (!saved) throw {status_code:404};
        return saved;
      }
      assert.equal(method,'POST');
      if (++posts === 1) throw {body:{message:'Test error'}};
      saved = value;
    },
  };
  const request = {...appliancePresets.washer,sensor};
  await assert.rejects(setupAppliance(home,request),/Test error/);
  const [result,concurrent] = await Promise.all([setupAppliance(home,request),setupAppliance(home,request)]);
  assert.deepEqual(result,concurrent);
  assert.equal(result.entity,helper.entity_id);
  assert.equal(helpers.length,1);
  assert.equal((await setupAppliance(home,request)).existing,true);
  assert.equal(posts,2);
  assert.deepEqual(saved.triggers.map(t=>[t.entity_id,t.above??t.below,t.for.minutes]),[[sensor,25,2],[sensor,15,15]]);
  const [start,finish] = saved.actions[0].choose;
  assert.equal(start.sequence[0].data.option,'Läuft');
  assert.deepEqual(finish.conditions[1],{condition:'state',entity_id:helper.entity_id,state:'Läuft'});
  assert.deepEqual(finish.sequence[0],{action:'input_select.select_option',target:{entity_id:helper.entity_id},data:{option:'Fertig'}});
  await assert.rejects(setupAppliance({...home,user:{is_admin:false}},request),/Administratorkonto/);
});

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
