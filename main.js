import {enhanceModelControls} from './model-controls.js?v=1';
const dialog=document.querySelector('#content-dialog');
const labels={tesi:'01 / TESI',progetto:'02 / PROGETTO',modelli:'03 / MODELLI',vr:'04 / ESPERIENZA VR'};
let lastTrigger,closingAnimation=null;
function closeSection(){
 if(!dialog.open||closingAnimation)return;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){dialog.close();return;}
 const current=getComputedStyle(dialog);
 dialog.classList.add('is-closing');
 const animation=dialog.animate([{opacity:current.opacity,transform:current.transform},{opacity:0,transform:'translateY(18px) scale(.985)'}],{duration:220,easing:'cubic-bezier(.4,0,.8,1)',fill:'forwards'});
 closingAnimation=animation;
 animation.finished.then(()=>{if(closingAnimation!==animation)return;dialog.close();}).catch(()=>{});
}
dialog.addEventListener('cancel',event=>{event.preventDefault();closeSection();});
let galleryCleanup=()=>{};
let chapterCleanup=()=>{};
let modelCleanup=()=>{},modelTicket=0;
let modelControlsCleanup=()=>{};
let experienceCleanup=()=>{};
document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>{
  closingAnimation?.cancel();closingAnimation=null;dialog.classList.remove('is-closing');
  chapterCleanup();chapterCleanup=()=>{};modelControlsCleanup();modelControlsCleanup=()=>{};
  lastTrigger=button;
  experienceCleanup();experienceCleanup=()=>{};modelCleanup();modelCleanup=()=>{};const ticket=++modelTicket;
  document.querySelector('#dialog-content').replaceChildren(document.querySelector('#'+button.dataset.open).content.cloneNode(true));
  galleryCleanup();galleryCleanup=initializeGalleries();
  if(button.dataset.open==='tesi')chapterCleanup=initializeThesisChapters();
  document.querySelector('#dialog-label').textContent=labels[button.dataset.open];
  dialog.showModal();dialog.scrollTop=0;document.body.classList.add('modal-open');
  if(button.dataset.open==='vr')import('./video-360.js?v=loading-1').then(({initializeExperience})=>{if(ticket===modelTicket&&dialog.open)experienceCleanup=initializeExperience(document.querySelector('#dialog-content'));}).catch(console.error);
  if(button.dataset.open==='modelli')import('./model-viewer.js').then(async({mountModel})=>{
   if(ticket!==modelTicket)return;const source=document.querySelector('#model-source');let loadVersion=0;
   const sourceControlsCleanup=enhanceModelControls(document.querySelector('.model-source-row'));let toolbarControlsCleanup=()=>{};
   modelControlsCleanup=()=>{sourceControlsCleanup();toolbarControlsCleanup();};
   async function load(){const version=++loadVersion;toolbarControlsCleanup();toolbarControlsCleanup=()=>{};modelCleanup();modelCleanup=()=>{};
    const model={person:{title:'Figura umana',src:'./models/person.glb'},pavilion:{title:'Padiglione cinese',src:'./models/pavilion.glb'},spaceship:{title:'Nave volante',src:'./models/spaceship.glb',compressed:true,viewAzimuth:-1.8,viewElevation:.85,focusBody:true},pegasus:{title:'Fame Riding Pegasus',src:'./models/pegasus.glb',compressed:true,background:0x292b30,viewAngle:.85},scroll:{title:'Rotolo dipinto',src:'./models/scroll.glb',compressed:true,background:0x292b30}}[source.value];document.querySelector('#model-heading').textContent=model.title;
    const container=document.querySelector('#model-viewer'),host=document.createElement('div');host.className='model-render-host';host.innerHTML='<p class="model-status" role="status">Caricamento del modello…</p>';container.replaceChildren(host);
    document.querySelectorAll('.model-toolbar button,.model-toolbar select').forEach(control=>{const fresh=control.cloneNode(true);fresh.disabled=true;if(fresh.hasAttribute('aria-pressed'))fresh.setAttribute('aria-pressed','false');control.replaceWith(fresh);});
    document.querySelector('#model-style').value='original';document.querySelector('.model-help').textContent='Trascina per ruotare · Rotellina o due dita per lo zoom';
    toolbarControlsCleanup=enhanceModelControls(document.querySelector('.model-toolbar'));
    const cleanup=await mountModel(host,{src:model.src,compressed:model.compressed,background:model.background,inkLift:model.inkLift,viewAngle:model.viewAngle,viewAzimuth:model.viewAzimuth,viewElevation:model.viewElevation,focusBody:model.focusBody,isActive:()=>ticket===modelTicket&&version===loadVersion});
    if(ticket!==modelTicket||version!==loadVersion)cleanup();else modelCleanup=cleanup;
   }
   source.addEventListener('change',load);await load();
  }).catch(error=>{console.error(error);if(ticket===modelTicket){const status=document.querySelector('.model-status');if(status)status.textContent='Il modello non è disponibile. Chiudi e riapri Modelli per riprovare.';}});
}));
document.querySelector('#close-dialog').addEventListener('click',closeSection);
let backdropPressed=false;
dialog.addEventListener('pointerdown',event=>{const r=dialog.getBoundingClientRect();backdropPressed=event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom);});
dialog.addEventListener('click',event=>{if(event.target===dialog&&backdropPressed)closeSection();backdropPressed=false;});
dialog.addEventListener('close',()=>{modelControlsCleanup();modelControlsCleanup=()=>{};chapterCleanup();chapterCleanup=()=>{};closingAnimation?.cancel();closingAnimation=null;dialog.classList.remove('is-closing');experienceCleanup();experienceCleanup=()=>{};modelTicket++;modelCleanup();modelCleanup=()=>{};document.body.classList.remove('modal-open');lastTrigger?.focus();});
const imageDialog=document.querySelector('#image-dialog');
let activeGallery=null,activeImage=0,imageTrigger=null;
function showExpanded(index){
  if(!activeGallery)return;
  const figures=[...activeGallery.querySelectorAll('.gallery-slide')];activeImage=(index+figures.length)%figures.length;
  const button=figures[activeImage].querySelector('.image-open'),image=button.querySelector('img');
  document.querySelector('#expanded-image').src=image.src;document.querySelector('#expanded-image').alt=image.alt;
  document.querySelector('#image-title').textContent=button.dataset.caption;
  document.querySelector('#image-meta').textContent=`${String(activeImage+1).padStart(2,'0')} / ${String(figures.length).padStart(2,'0')} · PPT / ${button.dataset.slide.padStart(2,'0')}`;
  document.querySelector('#image-prev').hidden=figures.length<2;document.querySelector('#image-next').hidden=figures.length<2;
}
document.querySelector('#image-close').addEventListener('click',()=>imageDialog.close());
document.querySelector('#image-prev').addEventListener('click',()=>showExpanded(activeImage-1));
document.querySelector('#image-next').addEventListener('click',()=>showExpanded(activeImage+1));
imageDialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();showExpanded(activeImage-1);}if(event.key==='ArrowRight'){event.preventDefault();showExpanded(activeImage+1);}});
imageDialog.addEventListener('click',event=>{if(event.target===imageDialog)imageDialog.close();});
imageDialog.addEventListener('close',()=>imageTrigger?.focus({preventScroll:true}));
function initializeGalleries(){
  const observers=[];
  document.querySelectorAll('#dialog-content .gallery').forEach(gallery=>{
    const track=gallery.querySelector('.gallery-track'),slides=[...gallery.querySelectorAll('.gallery-slide')],thumbs=[...gallery.querySelectorAll('.gallery-thumb')];
    const prev=gallery.querySelector('.gallery-prev'),next=gallery.querySelector('.gallery-next'),counter=gallery.querySelector('.gallery-count');
    let current=0,frame=0,drag=null,suppressClick=false;
    function update(){current=Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/Math.max(track.clientWidth,1))));counter.textContent=`${String(current+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;prev.disabled=current===0;next.disabled=current===slides.length-1;thumbs.forEach((thumb,index)=>thumb.setAttribute('aria-pressed',String(index===current)));}
    function go(index){index=Math.max(0,Math.min(slides.length-1,index));track.scrollTo({left:track.clientWidth*index,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
    track.addEventListener('scroll',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);},{passive:true});
    prev.addEventListener('click',()=>go(current-1));next.addEventListener('click',()=>go(current+1));thumbs.forEach((thumb,index)=>thumb.addEventListener('click',()=>go(index)));
    track.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();go(event.key==='Home'?0:event.key==='End'?slides.length-1:current+(event.key==='ArrowLeft'?-1:1));}});
    track.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'||event.button!==0)return;drag={x:event.clientX,scroll:track.scrollLeft,moved:false,id:event.pointerId};});
    track.addEventListener('pointermove',event=>{if(!drag)return;const delta=event.clientX-drag.x;if(Math.abs(delta)>6&&!drag.moved){drag.moved=true;track.setPointerCapture(drag.id);track.classList.add('dragging');}if(drag.moved){event.preventDefault();track.scrollLeft=drag.scroll-delta;}});
    function endDrag(){if(!drag)return;const moved=drag.moved;drag=null;track.classList.remove('dragging');if(moved){suppressClick=true;go(Math.round(track.scrollLeft/Math.max(track.clientWidth,1)));setTimeout(()=>{suppressClick=false;},150);}}
    track.addEventListener('pointerup',endDrag);track.addEventListener('pointercancel',endDrag);track.addEventListener('pointerleave',()=>{if(drag&&!drag.moved)drag=null;});
    slides.forEach((figure,index)=>figure.querySelector('.image-open').addEventListener('click',event=>{if(suppressClick){event.preventDefault();return;}activeGallery=gallery;imageTrigger=event.currentTarget;showExpanded(index);imageDialog.showModal();}));
    const observer=new ResizeObserver(()=>{track.scrollTo({left:track.clientWidth*current,behavior:'instant'});update();});observer.observe(track);observers.push(observer);update();
  });
  return()=>observers.forEach(observer=>observer.disconnect());
}
const motionButton=document.querySelector('#motion');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches;
function updateMotion(){motionButton.setAttribute('aria-pressed',String(paused));motionButton.setAttribute('aria-label',paused?'Riprendi l’animazione':'Metti in pausa l’animazione');motionButton.innerHTML=paused?'Riprendi movimento <span aria-hidden="true">▷</span>':'Pausa movimento <span aria-hidden="true">Ⅱ</span>';}
updateMotion();motionButton.addEventListener('click',()=>{paused=!paused;updateMotion();});
reduced.addEventListener('change',()=>{paused=reduced.matches;updateMotion();});

async function initializeGlass(){
 const THREE=await import('three');
 const {RoundedBoxGeometry}=await import('./vendor/RoundedBoxGeometry.js');
 const host=document.querySelector('#glass'),stage=document.querySelector('#stage');
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.transmissionResolutionScale=.65;renderer.setClearColor(0x090909);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.z=8.5;
 // Softboxes form a studio reflection environment for the glass material.
 const studio=new THREE.Scene();studio.background=new THREE.Color(0x141414);
 function softbox(w,h,x,y,z,color,intensity){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity),side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.lookAt(0,0,0);studio.add(mesh);}
 softbox(3,7,-4,2,2,0xffffff,3);softbox(1.3,7,4,1,1,0xb4cfff,4);softbox(6,1,0,4,-2,0xffffff,4);softbox(3,2,-2,-3,1,0xf1b3a0,2);softbox(1,4,3,0,-4,0xceafff,2);
 const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(studio,.04);scene.environment=environment.texture;pmrem.dispose();
 scene.add(new THREE.AmbientLight(0xffffff,1.2));const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,4,5);scene.add(key);const fill=new THREE.DirectionalLight(0xc3d5ff,3);fill.position.set(4,-1,3);scene.add(fill);
 const titleCanvas=document.createElement('canvas');titleCanvas.width=2048;titleCanvas.height=1100;const ctx=titleCanvas.getContext('2d');
 const titleTexture=new THREE.CanvasTexture(titleCanvas);titleTexture.colorSpace=THREE.SRGBColorSpace;
 const titlePlane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:titleTexture,toneMapped:false}));titlePlane.position.z=-2.5;scene.add(titlePlane);
 const glassMaterial=new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.055,transmission:1,thickness:1.4,ior:1.46,dispersion:.75,clearcoat:1,clearcoatRoughness:.04,envMapIntensity:1.3,iridescence:.2,iridescenceIOR:1.35,iridescenceThicknessRange:[100,350]});
 const cube=new THREE.Mesh(new RoundedBoxGeometry(2.65,2.65,2.65,8,.16),glassMaterial);cube.rotation.set(.26,-.36,-.2);scene.add(cube);
 let targetX=0,targetY=0,visible=true,pointerPosition=null,qualityScale=1,frameSamples=0,frameTotal=0;
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setPixelRatio(Math.min(devicePixelRatio,1.25,Math.sqrt(1300000/(w*h)))*qualityScale);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const fov=THREE.MathUtils.degToRad(camera.fov);const planeHeight=2*Math.tan(fov/2)*(camera.position.z-titlePlane.position.z);titlePlane.scale.set(planeHeight*camera.aspect,planeHeight,1);ctx.fillStyle='#090909';ctx.fillRect(0,0,2048,1100);ctx.fillStyle='#f5f1e9';ctx.textAlign='center';ctx.textBaseline='middle';const font=Math.min(510,720/camera.aspect);ctx.font=`900 ${font}px Arial, Helvetica, sans-serif`;const widest=Math.max(ctx.measureText('WORLD').width,ctx.measureText('MAKING').width);const scale=Math.min(1,1830/widest);ctx.save();ctx.translate(1024,550);ctx.scale(scale,1);ctx.fillText('WORLD',0,-font*.42);ctx.fillText('MAKING',0,font*.42);ctx.restore();titleTexture.needsUpdate=true;cube.scale.setScalar(camera.aspect<1?.83:1);renderer.render(scene,camera);}
 new ResizeObserver(resize).observe(host);resize();stage.classList.add('has-webgl');
 const area=document.querySelector('.opening');area.addEventListener('pointermove',e=>{pointerPosition={x:e.clientX,y:e.clientY};},{passive:true});area.addEventListener('pointerleave',()=>{pointerPosition=null;targetX=0;targetY=0;});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{threshold:0}).observe(stage);
 let previous=0;
 renderer.setAnimationLoop(time=>{const frameTime=time-previous,dt=Math.min(frameTime/1000,.05);previous=time;if(!visible||document.hidden||dialog.open||paused){frameSamples=0;frameTotal=0;return;}if(pointerPosition){const r=stage.getBoundingClientRect();targetY=THREE.MathUtils.clamp((pointerPosition.x-r.left)/r.width-.5,-.5,.5)*1.8;targetX=THREE.MathUtils.clamp((pointerPosition.y-r.top)/r.height-.5,-.5,.5)*1.35;pointerPosition=null;}if(time>1500&&frameTime<80){frameTotal+=frameTime;frameSamples++;if(frameSamples>=90){if(frameTotal/frameSamples>23&&qualityScale>.7){qualityScale=Math.max(.7,qualityScale*.85);resize();}frameSamples=0;frameTotal=0;}}if(!paused){const ease=1-Math.exp(-dt*9);cube.rotation.x+=(.26+targetX-cube.rotation.x)*ease;cube.rotation.y+=(-.36+targetY-cube.rotation.y)*ease;cube.rotation.z+=(-.2+Math.sin(time*.00025)*.035-cube.rotation.z)*ease;cube.position.y=Math.sin(time*.00065)*.075;}renderer.render(scene,camera);});
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();stage.classList.remove('has-webgl');document.querySelector('#fallback').hidden=false;motionButton.hidden=true;});
}
initializeGlass().catch(error=>{console.error('Glass renderer unavailable:',error);document.querySelector('#fallback').hidden=false;motionButton.hidden=true;});

function initializeThesisChapters(){
 const cleanups=[];
 document.querySelectorAll('#dialog-content details').forEach(detail=>{
  const summary=detail.querySelector('summary'),content=detail.querySelector('p');
  if(!summary||!content)return;
  let expanded=detail.open,heightAnimation=null,textAnimation=null;
  summary.setAttribute('aria-expanded',String(expanded));
  function toggle(event){
   event.preventDefault();
   const startHeight=detail.getBoundingClientRect().height;
   expanded=!expanded;summary.setAttribute('aria-expanded',String(expanded));
   heightAnimation?.cancel();textAnimation?.cancel();
   if(matchMedia('(prefers-reduced-motion: reduce)').matches){detail.open=expanded;return;}
   detail.open=true;
   const style=getComputedStyle(detail),border=parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);
   const endHeight=expanded?detail.getBoundingClientRect().height:summary.getBoundingClientRect().height+border;
   const animation=detail.animate([{height:`${startHeight}px`},{height:`${endHeight}px`}],{duration:expanded?320:240,easing:'cubic-bezier(.2,.75,.25,1)',fill:'both'});
   heightAnimation=animation;
   textAnimation=content.animate(expanded?[{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'translateY(0)'}]:[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-5px)'}],{duration:expanded?280:180,easing:'ease-out',fill:'both'});
   animation.finished.then(()=>{if(heightAnimation!==animation)return;detail.open=expanded;animation.cancel();heightAnimation=null;textAnimation?.cancel();textAnimation=null;}).catch(()=>{});
  }
  detail.classList.add('chapter-motion');summary.addEventListener('click',toggle);
  cleanups.push(()=>{summary.removeEventListener('click',toggle);heightAnimation?.cancel();textAnimation?.cancel();});
 });
 return()=>cleanups.forEach(cleanup=>cleanup());
}
