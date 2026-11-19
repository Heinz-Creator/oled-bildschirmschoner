import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from './node_modules/esbuild/lib/main.js';

const source = new URL('./src/night-train/', import.meta.url);
export async function nightTrainDocument({publicOnly=false}={}) {
  const artwork = {};
  for (const name of ['seasons','train','events','holidays','world-scenes','seasons-day','stories-tree','stories-railway','stories-minecraft','stories-coast','stories-home','stories-teddy']) {
    if(publicOnly&&['stories-home','stories-teddy','world-scenes'].includes(name))continue;
    artwork[name] = 'data:image/webp;base64,' + (await readFile(new URL('assets/'+name+'.webp',source))).toString('base64');
  }
  const bundle = await build({entryPoints:[fileURLToPath(new URL('app.js',source))],bundle:true,write:false,format:'iife',minify:true,target:['safari15','chrome100'],legalComments:'inline'});
  let css = await readFile(new URL('style.css',source),'utf8');
  for(const name of ['barlow','dmsans']){const font=(await readFile(new URL('assets/fonts/'+name+'.ttf',source))).toString('base64');css=css.replace('url("./assets/fonts/'+name+'.ttf")',()=> 'url("data:font/ttf;base64,'+font+'")');}
  let html = await readFile(new URL('index.html',source),'utf8');
  html = html.replace('<link rel="stylesheet" href="style.css" />',()=>'<style>'+css+'</style>');
  const boot = `window.NACHTBAHN_NATIVE=true;window.NACHTBAHN_BOOT=__NIGHTTRAIN_BOOT__;window.NACHTBAHN_ASSETS=${JSON.stringify(artwork)};`;
  return html.replace('<script type="module" src="app.js"></script>',()=>'<script>'+boot+bundle.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
}
export function nightTrainPlugin({externalDocument,publicOnly=false} = {}) {
  return {name:'oled-night-train',setup(plugin){
    plugin.onResolve({filter:/^oled-night-train-document$/},()=>externalDocument?{path:externalDocument,external:true}:{path:'document',namespace:'oled-night-train'});
    plugin.onLoad({filter:/.*/,namespace:'oled-night-train'},async()=>({contents:'export default '+JSON.stringify(await nightTrainDocument({publicOnly}))+';',loader:'js'}));
  }};
}
