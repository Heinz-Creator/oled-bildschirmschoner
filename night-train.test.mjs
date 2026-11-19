import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ambientVisibleRows} from './src/ambient-rows.js';
import {EventSchedule,EVENT_DEFAULTS} from './src/night-train/events.js';
test('two house messages never repeat the second message',()=>{
 const rows=[{key:'counts',title:'Lichter an'},{key:'dishwasher',title:'Geschirrspüler fertig'}];
 for(const clock of [0,20000,40000])assert.deepEqual(ambientVisibleRows(rows,clock),rows);
});
test('every rotation has unique sources and distinct devices remain distinct',()=>{
 const rows=Array.from({length:5},(_,index)=>({key:'device-'+index,title:'Fertig'}));
 for(let i=0;i<8;i++){const shown=ambientVisibleRows([...rows,rows[1]],i*20000);assert.equal(shown.length,3);assert.equal(new Set(shown.map(row=>row.key)).size,3);assert.equal(shown[0],rows[0]);}
});
test('a visitor preempts a message and resumes its remaining time',()=>{
 const schedule=new EventSchedule(structuredClone(EVENT_DEFAULTS));schedule.set('laundry',true,0);schedule.set('dishes',true,0);assert.equal(schedule.active(0),'laundry');schedule.set('visitor',true,4000);assert.equal(schedule.active(4000),'visitor');assert.equal(schedule.active(19000),'laundry');assert.equal(schedule.active(25000),'dishes');
});

test('embedded document keeps JavaScript replacement tokens and remains valid',async()=>{
 const {nightTrainDocument}=await import('./build-night-train.mjs');
 const {Script}=await import('node:vm');
 const document=await nightTrainDocument({publicOnly:true});
 const start=document.lastIndexOf('<script>')+'<script>'.length;
 const end=document.lastIndexOf('</script>');
 assert.ok(start>0&&end>start);
 const source=document.slice(start,end).replace('__NIGHTTRAIN_BOOT__','{"userId":"test","parentOrigin":"http://localhost"}');
 assert.doesNotThrow(()=>new Script(source));
});

test('the train crosses the viewport in the direction of travel and wraps offscreen',async()=>{
 const {trainPosition}=await import('./src/night-train/world-visuals.js');
 assert.ok(trainPosition(3)>trainPosition(0));
 assert.ok(trainPosition(29)>1500);
 assert.ok(trainPosition(31)<-1100);
});
test('each available world owns its event style and only playing audio gets a speaker',async()=>{
 const {SKIN_ROWS,EVENT_COLUMNS,musicIsPlaying}=await import('./src/night-train/world-visuals.js');
 assert.equal(new Set(['teddy','minecraft','tree','coast','home'].map(key=>SKIN_ROWS[key])).size,5);
 assert.equal(Object.keys(EVENT_COLUMNS).length,5);
 for(const state of ['idle','paused','unavailable','unknown','buffering'])assert.equal(musicIsPlaying({state}),false);
 assert.equal(musicIsPlaying({state:'playing'}),true);
});

test('walking scenes arrive, wait in the world, then leave offscreen',async()=>{
 const {walkPosition}=await import('./src/night-train/world-visuals.js');
 assert.ok(walkPosition(0)<0);assert.ok(walkPosition(1)>0);
 assert.equal(walkPosition(3),walkPosition(7));assert.ok(walkPosition(10)>1600);
});

test('preview handoff keeps all five checked events and prioritizes the visitor',async()=>{
 const {previewEvents,applyPreviewEvents}=await import('./src/night-train/preview-state.js');
 const selected=previewEvents(['laundry','dishes','waste','charging','visitor','dishes','invalid']);
 assert.equal(selected.length,5);
 const schedule=new EventSchedule(structuredClone(EVENT_DEFAULTS));applyPreviewEvents(schedule,selected,0);
 assert.equal(schedule.active(0),'visitor');
 const seen=new Set();for(let now=15000;now<=65000;now+=1000)seen.add(schedule.active(now));
 for(const key of ['laundry','dishes','waste','charging'])assert.ok(seen.has(key));
 assert.deepEqual(previewEvents(undefined),[]);
});
