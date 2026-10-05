// Preserve the interactive canvas on browsers without element fullscreen.
export function initializePanoramaFullscreen(panel) {
 const button=panel.querySelector('.panorama-fullscreen');
 const dialog=panel.closest('dialog');
 const doc=panel.ownerDocument;
 let expanded=false,disposed=false,pending=false,nativeEntered=false;
 const fullscreenElement=()=>doc.fullscreenElement||doc.webkitFullscreenElement;
 function display(value) {
  expanded=value;
  panel.classList.toggle('panorama-expanded',value);
  dialog?.classList.toggle('panorama-dialog-expanded',value);
  button.textContent=value?'Esci dallo schermo intero':'Schermo intero';
  button.setAttribute('aria-pressed',String(value));
 }
 async function exitNative() {
  if(fullscreenElement()!==panel)return;
  const exit=doc.exitFullscreen||doc.webkitExitFullscreen;
  if(exit)try{await exit.call(doc);}catch{/* The browser may already have exited. */}
 }
 function leave() {
  display(false);
  nativeEntered=false;
  void exitNative();
  if(!disposed)button.focus({preventScroll:true});
 }
 async function toggle() {
  if(expanded){leave();return;}
  if(pending||disposed)return;
  // The CSS mode works immediately, including on iPhone and embedded browsers.
  display(true);
  const request=panel.requestFullscreen||panel.webkitRequestFullscreen;
  if(!request)return;
  pending=true;
  try {
   await request.call(panel);
   if(disposed||!expanded)await exitNative();
   else nativeEntered=fullscreenElement()===panel;
  } catch {
   // Keep the viewport-filling canvas when native fullscreen is denied.
  } finally {pending=false;}
 }
 function onChange() {
  if(fullscreenElement()===panel){
   if(disposed||!expanded)void exitNative();
   else nativeEntered=true;
  } else if(nativeEntered){nativeEntered=false;display(false);}
 }
 function onCancel(event) {
  if(!expanded)return;
  event.preventDefault();event.stopImmediatePropagation();leave();
 }
 button.setAttribute('aria-pressed','false');
 button.addEventListener('click',toggle);
 dialog?.addEventListener('cancel',onCancel,true);
 doc.addEventListener('fullscreenchange',onChange);
 doc.addEventListener('webkitfullscreenchange',onChange);
 return()=>{
  disposed=true;display(false);void exitNative();
  button.removeEventListener('click',toggle);
  dialog?.removeEventListener('cancel',onCancel,true);
  doc.removeEventListener('fullscreenchange',onChange);
  doc.removeEventListener('webkitfullscreenchange',onChange);
 };
}
