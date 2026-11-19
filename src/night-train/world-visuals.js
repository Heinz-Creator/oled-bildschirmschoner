export const SKIN_ROWS={railway:0,tree:1,minecraft:2,coast:3,home:4,teddy:5};
export const EVENT_COLUMNS={laundry:0,dishes:1,waste:2,charging:3,visitor:4};
export function trainPosition(time){return -1200+(((time+7)%38)/38)*2900;}
export function musicIsPlaying(music){return music?.state==='playing';}
export function walkPosition(age,duration=10){
 const hold=duration-2;
 if(age<2)return -360+1350*(1-Math.pow(1-Math.max(0,age)/2,3));
 if(age<hold)return 990;
 return 990+800*Math.min(1,(age-hold)/2);
}
export function createWorldVisuals(ctx,onReady){
 const image=new Image();image.onload=onReady;image.src=window.NACHTBAHN_ASSETS?.['world-scenes']||'./assets/world-scenes.webp';
 let currentEvent=null,eventSince=0,musicSince=null;
 function sprite(theme,column,x,bottom,width,time,walking=false,night=false){
  if(!image.complete||!image.naturalWidth)return 0;
  const row=SKIN_ROWS[theme]??1,cw=image.width/6,ch=image.height/6,h=width*ch/cw;
  ctx.save();ctx.fillStyle=night?'#0006':'#1d251a33';ctx.shadowBlur=10;ctx.shadowColor=night?'#0007':'#34412b22';ctx.beginPath();ctx.ellipse(x+width*.52,bottom-10,width*.38,9,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.imageSmoothingEnabled=theme!=='minecraft';ctx.filter=night?'brightness(.86)':'none';
  const stride=walking?Math.sin(time*9)*1.5:Math.sin(time*1.4)*.4;
  ctx.translate(x+width*.5,bottom);ctx.rotate(walking?Math.sin(time*4.5)*.004:0);
  ctx.drawImage(image,column*cw,row*ch,cw,ch,-width*.5,-h+stride,width,h);ctx.restore();return h;
 }
 function speaker(theme,playback,x,bottom,width,time,walking,night){
  const h=sprite(theme,5,x,bottom,width,time,walking,night);if(!h)return;
  const left=x+width*(theme==='teddy'?.26:.57),top=bottom-h*(theme==='teddy'?.80:.63),w=width*(theme==='teddy'?.41:.33);
  ctx.save();ctx.beginPath();ctx.rect(left,top,w,h*.10);ctx.clip();ctx.fillStyle='#c9eacc';ctx.font='500 11px "DM Sans",sans-serif';ctx.textBaseline='middle';
  const title=playback.title||'Musik läuft',textWidth=ctx.measureText(title).width,offset=textWidth>w?Math.max(0,((time*18)%(textWidth+w))-w):0;
  ctx.fillText(title,left+3-offset,top+h*.05);ctx.restore();
 }
 function draw({theme='railway',activeEvent,music:playback,time=0,duration=10,night=false,photoMode=false}){
  if(theme==='teddy'&&!photoMode)return;
  if(activeEvent!==currentEvent){currentEvent=activeEvent;eventSince=time;}
  if(!musicIsPlaying(playback))musicSince=null;else if(musicSince===null)musicSince=time;
  const age=(time-eventSince)%Math.max(5,duration);
  const visibleWidth=Math.min(1600,900*innerWidth/innerHeight),narrow=visibleWidth<1200,eventSize=narrow?260:330,target=narrow?800+visibleWidth/2-eventSize-25:990,musicTarget=narrow?800-visibleWidth/2+15:740;
  if(activeEvent){
   const x=activeEvent==='visitor'?target+Math.min(age,5)*12:walkPosition(age,duration)-990+target;
   sprite(theme,EVENT_COLUMNS[activeEvent],x,835,eventSize,time,age<2||age>duration-2,night);
  }
  if(musicSince!==null){
   const age=time-musicSince,x=age<3?-360+(musicTarget+360)*(1-Math.pow(1-age/3,3)):musicTarget;
   speaker(theme,playback,x,858,narrow?240:310,time,age<3,night);
  }
 }
 return {draw};
}
