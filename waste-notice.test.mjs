import test from 'node:test';import assert from 'node:assert/strict';import {wasteNotices,wasteCopy} from './src/night-train/waste-notice.js';
const now=Date.parse('2026-11-18T12:00:00Z');
test('waste calendar notices distinguish put-out day, pickup day and explicit collection',()=>{
 const rows=[{key:'waste-Restmüll',title:'Restmüll',detail:'Heute rausstellen'},{key:'waste-Bioabfall',title:'Bioabfall',detail:'Heute Abholung'}],items=wasteNotices(rows,now,'Europe/Berlin');assert.equal(items[0].phase,'tomorrow');assert.equal(items[1].phase,'today');assert.equal(wasteCopy(items).title,'Heute ist Müllabholung');
 const confirmed={[items[1].key]:true};assert.equal(wasteNotices(rows,now,'Europe/Berlin',confirmed)[1].phase,'collected');assert.match(wasteCopy(wasteNotices(rows,now,'Europe/Berlin',confirmed)).title,/Abgeholt/);assert.equal(wasteNotices(rows,now+86400000,'Europe/Berlin',confirmed)[1].phase,'today');
});
test('unrelated notices and later pickups do not invent collection; duplicate rows collapse',()=>{const row={title:'Papier',detail:'Abholung in 5 Tagen'};assert.deepEqual(wasteNotices([row,{title:'Geschirrspüler fertig'}],now),[]);const tomorrow={title:'Gelbe Tonne',detail:'Morgen Abholung'};assert.equal(wasteNotices([tomorrow,tomorrow],now).length,1);assert.match(wasteCopy(wasteNotices([tomorrow],now)).detail,/rausstellen/);});
