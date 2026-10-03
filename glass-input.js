const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function orientationOffset(beta,gamma,origin,angle=0){
 const wrap=value=>((value+180)%360+360)%360-180;
 const vertical=wrap(beta-origin.beta),horizontal=wrap(gamma-origin.gamma),radians=angle*Math.PI/180;
 return {x:clamp((vertical*Math.cos(radians)-horizontal*Math.sin(radians))*.018,-.65,.65),y:clamp((horizontal*Math.cos(radians)+vertical*Math.sin(radians))*.025,-.9,.9)};
}
export function initializeGlassInput(stage,onChange){
 const button=document.querySelector('#glass-gyro'),hint=document.querySelector('#glass-touch-hint');
 let drag=null,offset={x:0,y:0},tilt={x:0,y:0},origin=null,lastOrientation=null,enabled=false,pending=false,timeout=0;
 const screenAngle=()=>window.screen.orientation?.angle??window.orientation??0;
 function update(){onChange(clamp(offset.x+tilt.x,-1.2,1.2),clamp(offset.y+tilt.y,-2,2));}
 function stop(){enabled=false;clearTimeout(timeout);window.removeEventListener('deviceorientation',orientation);offset={x:clamp(offset.x+tilt.x,-1.2,1.2),y:clamp(offset.y+tilt.y,-2,2)};tilt={x:0,y:0};origin=null;button.setAttribute('aria-pressed','false');button.textContent='Attiva giroscopio';}
 function orientation(event){
  if(!enabled||!Number.isFinite(event.beta)||!Number.isFinite(event.gamma)||document.hidden)return;
  lastOrientation={beta:event.beta,gamma:event.gamma};
  clearTimeout(timeout);hint.textContent='Inclina il telefono oppure trascina il cubo';
  if(drag)return;
  if(!origin)origin=lastOrientation;
  tilt=orientationOffset(event.beta,event.gamma,origin,screenAngle());update();
 }
 stage.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'||drag)return;
  event.preventDefault();stage.setPointerCapture(event.pointerId);stage.classList.add('glass-dragging');
  const box=stage.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:offset.x+tilt.x,startY:offset.y+tilt.y,width:box.width,height:box.height};tilt={x:0,y:0};
 },{passive:false});
 stage.addEventListener('pointermove',event=>{
  if(!drag||drag.id!==event.pointerId)return;event.preventDefault();
  offset={x:clamp(drag.startX+(event.clientY-drag.y)/drag.height*2.4,-1.2,1.2),y:clamp(drag.startY+(event.clientX-drag.x)/drag.width*4,-2,2)};update();
 },{passive:false});
 function end(event){if(!drag||drag.id!==event.pointerId)return;drag=null;origin=lastOrientation;tilt={x:0,y:0};stage.classList.remove('glass-dragging');if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);}
 stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);stage.addEventListener('lostpointercapture',end);
 // Older iOS browsers also need a non-passive listener to suppress page scrolling.
 stage.addEventListener('touchmove',event=>{if(event.cancelable)event.preventDefault();},{passive:false});
 window.addEventListener('orientationchange',()=>{origin=null;tilt={x:0,y:0};});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){drag=null;stage.classList.remove('glass-dragging');origin=null;}});
 button.addEventListener('click',async()=>{
  if(pending)return;if(enabled){stop();hint.textContent='Trascina il cubo per ruotarlo';return;}
  const Sensor=window.DeviceOrientationEvent;
  if(!window.isSecureContext||!Sensor){hint.textContent='Giroscopio non disponibile. Puoi trascinare il cubo.';return;}
  pending=true;button.disabled=true;
  try{
   if(typeof Sensor.requestPermission==='function'&&await Sensor.requestPermission()!=='granted'){hint.textContent='Accesso non consentito. Puoi trascinare il cubo.';return;}
   enabled=true;origin=null;lastOrientation=null;button.setAttribute('aria-pressed','true');button.textContent='Disattiva giroscopio';hint.textContent='Inclina il telefono oppure trascina il cubo';
   window.addEventListener('deviceorientation',orientation,{passive:true});
   timeout=setTimeout(()=>{if(!lastOrientation){stop();hint.textContent='Sensore non disponibile. Puoi trascinare il cubo.';}},4000);
  }catch{stop();hint.textContent='Giroscopio non disponibile. Puoi trascinare il cubo.';}
  finally{pending=false;button.disabled=false;}
 });
}
