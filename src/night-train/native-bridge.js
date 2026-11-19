const pending = new Map();
let requestId = 0;
export function nativeRequest(action, data = {}) {
  return new Promise((resolve,reject)=>{
    const id=++requestId;
    const timeout=setTimeout(()=>{pending.delete(id);reject(new Error('Home Assistant antwortet gerade nicht.'));},30000);
    pending.set(id,{resolve,reject,timeout});
    parent.postMessage({type:'oled-night-train-request',id,action,data},window.NACHTBAHN_BOOT.parentOrigin);
  });
}
window.addEventListener('message',event=>{
  if(event.source!==parent||event.origin!==window.NACHTBAHN_BOOT.parentOrigin||event.data?.type!=='oled-night-train-response')return;
  const entry=pending.get(event.data.id);if(!entry)return;
  clearTimeout(entry.timeout);pending.delete(event.data.id);
  if(event.data.error)entry.reject(new Error(event.data.error));else entry.resolve(event.data.result);
});
export function nativeCommand(action, data) {
  parent.postMessage({type:'oled-night-train-command',action,data},window.NACHTBAHN_BOOT.parentOrigin);
}
