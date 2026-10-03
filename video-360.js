import * as THREE from 'three';
import Hls from './vendor/hls.mjs';

export function initializeExperience(container){
 let disposed=false,cleanup=()=>{},version=0;
 const choices=container.querySelectorAll('[data-experience]'),panel=container.querySelector('#experience-panel');
 const dispose=()=>{disposed=true;version++;cleanup();};
 choices.forEach(button=>button.addEventListener('click',()=>{
  cleanup();cleanup=()=>{};const ticket=++version;
  choices.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  if(button.dataset.experience==='exhibition'){
   panel.innerHTML='<div class="exhibition-design"><span class="section-kicker">02 / ALLESTIMENTO</span><h3>Lo spazio espositivo</h3><p>Un ambiente essenziale accoglie lo spettatore prima dell’ingresso nel mondo virtuale. Lo schermo e le immagini del paesaggio introducono l’opera; le postazioni sedute invitano a esplorarla attraverso il visore.</p><figure><img src="./exhibition/worldmaking-gallery.webp" alt="Proposta di allestimento di Worldmaking: galleria bianca, schermo con l’opera, paesaggio cinese e visitatori illustrati nelle postazioni VR."><figcaption>Proposta di allestimento · Visualizzazione concettuale</figcaption></figure><div class="exhibition-layout"><h3>Pianta e disposizione</h3><p>La proposta considera uno spazio di circa 6 × 5 metri. Le dimensioni sono indicative e da adattare alla sede espositiva.</p><figure><img src="./exhibition/floor-plan.webp" alt="Pianta indicativa del locale, con schermo, paesaggio, preparazione e due postazioni VR."><figcaption>01 / Pianta · Posizioni degli elementi e percorso del visitatore</figcaption></figure><h3>Vista dall’ingresso</h3><figure><img src="./exhibition/entrance-view.webp" alt="Vista realistica dalla porta: banco di preparazione a sinistra, due sedute con tavolini, schermo in fondo e paesaggio sulla parete destra."><figcaption>02 / Vista dall’ingresso · Visualizzazione concettuale</figcaption></figure><h3>La postazione VR</h3><figure><img src="./exhibition/vr-station.webp" alt="Dettaglio della postazione con visitatore illustrato e legenda: visore per smartphone, smartphone, auricolari, seduta e tavolino."><figcaption>03 / Dettaglio · Visore, smartphone, auricolari, seduta e tavolino</figcaption></figure></div><div class="exhibition-notes"><p><b>Accoglienza</b><br>Introduzione all’opera e preparazione del visore.</p><p><b>Immersione</b><br>Due postazioni sedute per esplorare il panorama a 360°.</p><p><b>Paesaggio</b><br>Immagini e luce collegano lo spazio reale all’ambiente poetico.</p></div></div>';
   return;
  }
  if(button.dataset.experience==='headset'){
   panel.innerHTML='<div class="headset-guide"><span class="section-kicker">ESPERIENZA IMMERSIVA</span><h3>Indossa il visore VR</h3><p>Durante la presentazione, indossa il visore per entrare nel mondo di Worldmaking. Guarda intorno a te: il paesaggio si estende in tutte le direzioni.</p><ol><li>Indossa il visore e regola la messa a fuoco.</li><li>Indossa le cuffie per ascoltare il paesaggio sonoro.</li><li>Rimani seduto e muovi lo sguardo liberamente a 360°.</li></ol><p>L’esperienza nel visore viene avviata durante la presentazione.</p><img class="vr-wearing-guide" src="./exhibition/vr-wearing-guide.png" alt="Tre passaggi illustrati: inserire lo smartphone, indossare e regolare il visore, guardare intorno a sé a 360 gradi."><div class="experience-start-wrap"><button class="experience-start" type="button"><span>Inizia l’esperienza</span><span aria-hidden="true">↗</span></button></div></div>';
   cleanup=initializePressFeedback(panel.querySelector('.experience-start'));
   return;
  }
  panel.innerHTML='<h3>Guarda il video a 360°</h3><div class="panorama-stage" tabindex="0" aria-label="Video panoramico. Trascina per guardarti intorno. Usa i tasti freccia per cambiare direzione."><p class="panorama-status" role="status">Caricamento del video… Il tempo di caricamento dipende dalla velocità della connessione.</p></div><div class="panorama-controls"><button class="panorama-play">Riproduci</button><button class="panorama-mute" aria-pressed="false">Audio attivo</button><span class="panorama-time">0:00 / 3:04</span><input class="panorama-seek" type="range" min="0" max="184" value="0" step="0.1" aria-label="Posizione del video"><button class="panorama-reset">Centra vista</button><button class="panorama-fullscreen">Schermo intero</button></div><p class="panorama-help">Trascina per guardarti intorno · Rotellina per lo zoom · Premi Riproduci per iniziare</p>';
  cleanup=mountPanorama(panel,()=>!disposed&&ticket===version);
 }));
 return dispose;
}

function mountPanorama(panel,isActive){
 const host=panel.querySelector('.panorama-stage'),status=host.querySelector('.panorama-status'),play=panel.querySelector('.panorama-play'),mute=panel.querySelector('.panorama-mute'),seek=panel.querySelector('.panorama-seek'),time=panel.querySelector('.panorama-time');
 const video=document.createElement('video');video.preload='metadata';video.playsInline=true;const streamUrl='./video/stream/index.m3u8';let stream=null;
 const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance',depth:false,stencil:false});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x101010);host.appendChild(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(75,1,.1,1000),texture=new THREE.VideoTexture(video);texture.colorSpace=THREE.SRGBColorSpace;
 const geometry=new THREE.SphereGeometry(500,64,40);geometry.scale(-1,1,1);const material=new THREE.MeshBasicMaterial({map:texture});scene.add(new THREE.Mesh(geometry,material));
 const frontLongitude=180;
 let longitude=frontLongitude,latitude=0,drag=null,disposed=false,dirty=true,frameCallback=null,lastVideoTime=-1;
 const format=s=>`${Math.floor((s||0)/60)}:${String(Math.floor((s||0)%60)).padStart(2,'0')}`;
 function resize(){if(!host.clientWidth||!host.clientHeight)return;renderer.setPixelRatio(Math.min(devicePixelRatio,1.25,Math.sqrt(1800000/(host.clientWidth*host.clientHeight))));renderer.setSize(host.clientWidth,host.clientHeight);dirty=true;camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 host.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY};host.setPointerCapture(e.pointerId);});
 host.addEventListener('pointermove',e=>{if(!drag)return;dirty=true;longitude-=(e.clientX-drag.x)*.16;latitude+=(e.clientY-drag.y)*.16;latitude=Math.max(-85,Math.min(85,latitude));drag={x:e.clientX,y:e.clientY};});
 host.addEventListener('pointerup',()=>drag=null);host.addEventListener('pointercancel',()=>drag=null);
 host.addEventListener('wheel',e=>{e.preventDefault();dirty=true;camera.fov=THREE.MathUtils.clamp(camera.fov+e.deltaY*.04,40,100);camera.updateProjectionMatrix();},{passive:false});
 host.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();dirty=true;longitude+=e.key==='ArrowLeft'?-5:e.key==='ArrowRight'?5:0;latitude=THREE.MathUtils.clamp(latitude+(e.key==='ArrowUp'?5:e.key==='ArrowDown'?-5:0),-85,85);});
 play.addEventListener('click',async()=>{if(!video.paused){video.pause();return;}try{await video.play();}catch{if(isActive()){status.hidden=false;status.textContent='Premi Riproduci per avviare il video.';}}});
 mute.addEventListener('click',()=>{video.muted=!video.muted;mute.textContent=video.muted?'Audio disattivato':'Audio attivo';mute.setAttribute('aria-pressed',String(video.muted));});
 seek.addEventListener('input',()=>{if(Number.isFinite(video.duration))video.currentTime=Number(seek.value);});
 panel.querySelector('.panorama-reset').addEventListener('click',()=>{dirty=true;longitude=frontLongitude;latitude=0;camera.fov=75;camera.updateProjectionMatrix();});
 panel.querySelector('.panorama-fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await panel.requestFullscreen();}catch{}});
 video.addEventListener('loadedmetadata',()=>{if(!isActive())return;seek.max=video.duration;time.textContent=`0:00 / ${format(video.duration)}`;});
 video.addEventListener('loadeddata',()=>{if(isActive()){status.hidden=true;dirty=true;}});
 video.addEventListener('waiting',()=>{if(isActive()){status.hidden=false;status.textContent='Caricamento del video… Il tempo di caricamento dipende dalla velocità della connessione.';}});
 video.addEventListener('playing',()=>{if(isActive()){status.hidden=true;play.textContent='Pausa';}});
 video.addEventListener('pause',()=>{if(isActive())play.textContent='Riproduci';});
 video.addEventListener('timeupdate',()=>{if(isActive()){seek.value=video.currentTime;time.textContent=`${format(video.currentTime)} / ${format(video.duration)}`;}});
 video.addEventListener('ended',()=>{if(isActive())play.textContent='Riproduci';});
 video.addEventListener('error',()=>{if(isActive()){status.hidden=false;status.textContent='Il video non è disponibile. Riapri Esperienza VR per riprovare.';}});
 function nextVideoFrame(){if(disposed)return;dirty=true;frameCallback=video.requestVideoFrameCallback(nextVideoFrame);}if(video.requestVideoFrameCallback)frameCallback=video.requestVideoFrameCallback(nextVideoFrame);
 renderer.setAnimationLoop(()=>{if(disposed||!isActive()||document.hidden)return;if(!video.requestVideoFrameCallback&&video.currentTime!==lastVideoTime){dirty=true;lastVideoTime=video.currentTime;}if(!dirty)return;dirty=false;const phi=THREE.MathUtils.degToRad(90-latitude),theta=THREE.MathUtils.degToRad(longitude);camera.lookAt(Math.sin(phi)*Math.cos(theta),Math.cos(phi),Math.sin(phi)*Math.sin(theta));renderer.render(scene,camera);});
 if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=streamUrl;video.load();}else if(Hls.isSupported()){stream=new Hls({maxBufferLength:30,maxMaxBufferLength:60});stream.attachMedia(video);stream.loadSource(streamUrl);}else{status.textContent='Questo browser non supporta il video. Prova con Chrome, Edge o Safari.';}
 return()=>{disposed=true;stream?.destroy();if(frameCallback!==null)video.cancelVideoFrameCallback(frameCallback);video.pause();video.removeAttribute('src');video.load();video.remove();observer.disconnect();renderer.setAnimationLoop(null);texture.dispose();material.dispose();geometry.dispose();renderer.dispose();renderer.forceContextLoss();};
}

function initializePressFeedback(button){
 let press=null;
 const ripples=new Set(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function activate(event){
  if(reduced.matches)return;
  press?.cancel();
  press=button.animate([{transform:'translateY(0) scale(1)'},{transform:'translateY(4px) scale(.97)',offset:.28},{transform:'translateY(-2px) scale(1.015)',offset:.7},{transform:'translateY(0) scale(1)'}],{duration:320,easing:'ease-out'});
  if(ripples.size>=6){const oldest=ripples.values().next().value;oldest.animation.cancel();oldest.element.remove();ripples.delete(oldest);}
  const rect=button.getBoundingClientRect(),element=document.createElement('i'),size=Math.max(rect.width,rect.height)*2;
  element.className='experience-start-ripple';element.setAttribute('aria-hidden','true');
  element.style.width=element.style.height=`${size}px`;
  element.style.left=`${(event.detail?event.clientX-rect.left:rect.width/2)-size/2}px`;
  element.style.top=`${(event.detail?event.clientY-rect.top:rect.height/2)-size/2}px`;
  button.appendChild(element);
  const animation=element.animate([{transform:'scale(0)',opacity:.55},{transform:'scale(1)',opacity:0}],{duration:650,easing:'ease-out'}),item={element,animation};ripples.add(item);
  animation.finished.then(()=>{element.remove();ripples.delete(item);}).catch(()=>{});
 }
 button.addEventListener('click',activate);
 return()=>{button.removeEventListener('click',activate);press?.cancel();for(const item of ripples){item.animation.cancel();item.element.remove();}ripples.clear();};
}
