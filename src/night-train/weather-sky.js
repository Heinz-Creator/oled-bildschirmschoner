/** Translucent atmospheric layers preserve each world's own scenery. */
export function drawWeatherSky(ctx,weather,time=0,night=false){
 const overcast=['rain','snow','cloudy','partlycloudy','lightning','windy','windy-variant'].includes(weather);
 if(overcast){
  ctx.save();const strength=weather==='partlycloudy'?.33:.78;
  const sky=ctx.createLinearGradient(0,0,0,510);
  sky.addColorStop(0,night?`rgba(20,32,47,${strength})`:`rgba(125,143,155,${strength})`);
  sky.addColorStop(.62,night?'#23374b55':'#a2adb766');sky.addColorStop(1,'transparent');ctx.fillStyle=sky;ctx.fillRect(0,0,1600,510);
  for(let i=0;i<5;i++){
   const x=((i*490+time*5)%2350)-380,y=55+(i%3)*47;
   const cloud=ctx.createRadialGradient(x,y,25,x,y,360);cloud.addColorStop(0,night?'#a2b0bc14':'#d6dde25c');cloud.addColorStop(1,'transparent');ctx.save();ctx.translate(0,y);ctx.scale(1,.32);ctx.fillStyle=cloud;ctx.fillRect(x-370,-420,740,850);ctx.restore();
  }ctx.restore();
 }
 if(weather==='fog'){
  const mist=ctx.createLinearGradient(0,200,0,760);mist.addColorStop(0,'transparent');mist.addColorStop(.45,night?'#6d7d8d66':'#cbd4dcb3');mist.addColorStop(1,'transparent');ctx.fillStyle=mist;ctx.fillRect(0,200,1600,560);
 }
}
