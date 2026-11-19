import test from 'node:test';import assert from 'node:assert/strict';
import {ambientScene,ambientPreferences} from './src/ambient-data.js';
import {storyCamera,storyPlacement,STORY_EVENTS,STORY_PLACES} from './src/night-train/story-visuals.js';
import {STORY_FRAMES} from './src/night-train/story-frames.js';
test('new worlds reuse classic weather and seasonal assets without changing old preferences',()=>{
 for(const theme of ['tree','minecraft','coast','railway']){
  const old=ambientScene(new Date('2026-11-18T12:00Z').getTime(),'rainy',true,'Europe/Berlin',theme),scene=ambientScene(new Date('2026-11-18T12:00Z').getTime(),'rainy',true,'Europe/Berlin','stories-'+theme);
  assert.equal(old.animatedWorld,false);assert.equal(scene.animatedWorld,true);assert.equal(scene.theme,old.theme);assert.equal(scene.key,old.key);assert.equal(scene.effect,'rain');if(theme!=='teddy')assert.equal(scene.url,old.url);
  assert.equal(ambientPreferences({motif:'stories-'+theme}).motif,'stories-'+theme);
 }
});
test('every new world includes all five events and music, with whole scene inside landscape and viewport',()=>{
 for(const theme of Object.keys(STORY_PLACES))for(const [i,event]of STORY_EVENTS.entries()){
  const f=STORY_FRAMES[theme][i],p=storyPlacement(theme,event),h=p.width*f.h/f.w;
  assert.ok(f.w>0&&f.h>0);assert.ok(p.x-p.width/2>=0&&p.x+p.width/2<=1600);assert.ok(p.y-h>=0&&p.y<=900);
  for(const [vw,vh]of [[1280,720],[1920,1080],[768,1024],[390,844]]){
   const p=storyPlacement(theme,event,vw,vh),h=p.width*f.h/f.w,c=storyCamera(theme,event,vw,vh),fit=Math.max(vw/1600,vh/900),ox=(vw-1600*fit)/2,oy=(vh-900*fit)/2;
   const left=(ox+(p.x-p.width/2)*fit)*c.zoom+c.tx,right=left+p.width*fit*c.zoom;
   const top=(oy+(p.y-h)*fit)*c.zoom+c.ty,bottom=top+h*fit*c.zoom;
   assert.ok(left>=-1&&right<=vw+1,`${theme}/${event} horizontal ${vw}: ${left}/${right}`);assert.ok(top>=-1&&bottom<=vh+1,`${theme}/${event} vertical ${vw}: ${top}/${bottom}`);
  }
 }
});
