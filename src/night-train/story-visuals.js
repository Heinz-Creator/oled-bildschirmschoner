import {STORY_FRAMES} from './story-frames.js';
export const STORY_EVENTS=['laundry','dishes','waste','charging','visitor','music'];
// The baseline is part of the existing scenery, never a screen-wide walking lane.
export const STORY_PLACES={
 railway:{x:1150,y:698,width:235},tree:{x:565,y:615,width:270},
 minecraft:{x:490,y:535,width:145},coast:{x:450,y:700,width:165},
 home:{x:765,y:660,width:145},teddy:{x:800,y:877,width:1100}
};
export function storyPlacement(theme,event,viewportWidth=1600,viewportHeight=900){
 const base=STORY_PLACES[theme]||STORY_PLACES.tree;
 if(theme==='teddy')return {...base,width:Math.min(base.width,900*viewportWidth/viewportHeight*.78)};
 if(theme==='minecraft'&&event==='visitor')return {...base,x:700,y:552,width:115};
 if(theme==='home'&&event==='visitor')return {...base,x:735,y:660,width:135};
 return {...base};
}
export function storyCamera(theme,event,viewportWidth,viewportHeight){
 const p=storyPlacement(theme,event,viewportWidth,viewportHeight),frame=STORY_FRAMES[theme]?.[STORY_EVENTS.indexOf(event)];
 if(!frame)return {zoom:1,tx:0,ty:0};
 const fit=Math.max(viewportWidth/1600,viewportHeight/900),h=p.width*frame.h/frame.w;
 const zoom=Math.min(theme==='teddy'?1.05:theme==='railway'?2.15:theme==='tree'?2.3:4.3,viewportWidth*.78/(p.width*fit),viewportHeight*.48/(h*fit));
 const z=Math.max(1,zoom),ox=(viewportWidth-1600*fit)/2,oy=(viewportHeight-900*fit)/2;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const cx=ox+p.x*fit,cy=oy+(p.y-h*.50)*fit;
 // Keep the entire physical canvas covering the viewport at either edge.
 return {zoom:z,tx:clamp(viewportWidth*.5-z*cx,viewportWidth-(ox+1600*fit)*z,-ox*z),ty:clamp(viewportHeight*(viewportWidth<viewportHeight?.64:.57)-z*cy,viewportHeight-(oy+900*fit)*z,-oy*z)};
}
export function createStoryVisuals(ctx,onReady){
 const images={};for(const theme of Object.keys(STORY_PLACES)){const img=new Image();img.onload=onReady;img.src=window.NACHTBAHN_ASSETS?.['stories-'+theme]||'./assets/stories-'+theme+'.webp';images[theme]=img;}
 function draw({theme,activeEvent,music,time=0,night=false,reduced=false}){
  const event=activeEvent||(music?.state==='playing'?'music':null),index=STORY_EVENTS.indexOf(event),img=images[theme],frame=STORY_FRAMES[theme]?.[index];
  if(!frame||!img?.naturalWidth)return;
  const p=storyPlacement(theme,event,innerWidth,innerHeight),w=p.width,h=w*frame.h/frame.w,left=p.x-w/2,top=p.y-h;
  ctx.save();ctx.imageSmoothingEnabled=theme!=='minecraft';ctx.filter=night?'brightness(.76) saturate(.85)':'none';
  if(!reduced&&['laundry','music'].includes(event)){
   const strips=32,sw=frame.w/strips;
   for(let i=0;i<strips;i++){const u=(i+.5)/strips,cloth=event==='laundry'&&u>.3&&u<.72;const offset=(cloth?Math.sin(time*2.1+u*8)*1.4:event==='music'?Math.sin(time*2.6+Math.floor(u*3)*1.6)*.75:0);
    ctx.drawImage(img,frame.x+i*sw,frame.y,sw,frame.h,left+i*w/strips,top+offset,w/strips+.1,h-offset);
   }
  }else ctx.drawImage(img,frame.x,frame.y,frame.w,frame.h,left,top,w,h);ctx.filter='none';
  // Local movements stay at the story location; the scenery never acquires a floating parade.
  if(!reduced){
   if(event==='laundry'){ctx.strokeStyle=night?'#b3d6d380':'#f4e5bd99';ctx.lineWidth=1;for(let j=0;j<3;j++){const x=left+w*(.35+j*.11),y=top+h*.24;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+Math.sin(time*2+j)*5,y-4,x+10,y);ctx.stroke();}}
   if(event==='dishes'||event==='charging'){for(let j=0;j<3;j++){const pulse=(Math.sin(time*2.5+j*2)+1)/2;ctx.globalAlpha=pulse*.8;const x=left+w*(.38+j*.12),y=top+h*(.38-j*.045);ctx.strokeStyle=event==='charging'?'#b1f2a3':'#fff4cf';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.moveTo(x,y-3);ctx.lineTo(x,y+3);ctx.stroke();}ctx.globalAlpha=1;}
   if(event==='waste'||event==='visitor'){const x=p.x+Math.sin(time*.8)*w*.2,y=top-8+Math.sin(time*1.6)*4;ctx.strokeStyle=night?'#cac5b9':'#453e32';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-6,y);ctx.quadraticCurveTo(x-3,y-4,x,y);ctx.quadraticCurveTo(x+3,y-4,x+6,y);ctx.stroke();}
   if(music?.state==='playing'){ctx.fillStyle=night?'#f4ce8c':'#805e2b';ctx.font=`${Math.max(10,w*.055)}px serif`;for(let j=0;j<3;j++){const a=(time*.35+j/3)%1;ctx.globalAlpha=Math.sin(a*Math.PI);ctx.fillText(j%2?'♫':'♪',p.x+w*(.1+j*.12)+Math.sin(a*4)*7,top+h*.25-a*h*.4);}ctx.globalAlpha=1;}
  }
  ctx.restore();
 }
 return {draw};
}
