export function initializeLightbox(){
 const dialog=document.querySelector('#image-dialog'),image=document.querySelector('#expanded-image'),title=document.querySelector('#image-title'),meta=document.querySelector('#image-meta'),prev=document.querySelector('#image-prev'),next=document.querySelector('#image-next'),view=dialog.querySelector('.image-dialog-view');
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 let items=[],index=0,trigger=null,version=0,motion=null,closing=null,drag=null;
 function controls(){prev.hidden=next.hidden=items.length<2;}
 function content(item){const img=item.querySelector('img');image.src=img.currentSrc||img.src;image.alt=img.alt;title.textContent=item.dataset.caption||img.alt;meta.textContent=`${String(index+1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}${item.dataset.slide?' · PPT / '+item.dataset.slide.padStart(2,'0'):''}`;}
 async function change(value){
  if(!items.length||closing)return;
  const direction=value>index?1:-1;index=(value+items.length)%items.length;const ticket=++version,item=items[index];motion?.cancel();controls();
  const source=item.querySelector('img'),preload=new Image();preload.src=source.currentSrc||source.src;
  try{await preload.decode();}catch{/* The image element still supplies its accessible alternative text. */}
  if(ticket!==version||!dialog.open)return;
  if(!reduced()){
   motion=image.animate([{opacity:1,transform:'translateX(0) scale(1)'},{opacity:0,transform:`translateX(${-direction*18}px) scale(.985)`}],{duration:140,easing:'ease-in',fill:'both'});
   try{await motion.finished;}catch{return;}
   if(ticket!==version||!dialog.open)return;
  }
  motion?.cancel();content(item);
  if(!reduced())motion=image.animate([{opacity:0,transform:`translateX(${direction*22}px) scale(.985)`},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:260,easing:'cubic-bezier(.2,.75,.25,1)'});
 }
 function close(){
  if(!dialog.open||closing)return;++version;motion?.cancel();
  if(reduced()){dialog.close();return;}
  dialog.classList.add('is-closing');closing=dialog.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(12px) scale(.98)'}],{duration:190,easing:'ease-in',fill:'both'});
  const current=closing;current.finished.then(()=>{if(closing===current)dialog.close();}).catch(()=>{});
 }
 function open(buttons,at){
  ++version;motion?.cancel();closing?.cancel();closing=null;dialog.classList.remove('is-closing');items=[...buttons];index=at;trigger=items[index];content(trigger);controls();if(!dialog.open)dialog.showModal();
 }
 document.querySelector('#image-close').addEventListener('click',close);
 prev.addEventListener('click',()=>change(index-1));next.addEventListener('click',()=>change(index+1));
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();change(index+(event.key==='ArrowLeft'?-1:1));}});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 let backdrop=false;dialog.addEventListener('pointerdown',event=>{const r=dialog.getBoundingClientRect();backdrop=event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom);});
 dialog.addEventListener('click',event=>{if(event.target===dialog&&backdrop)close();backdrop=false;});
 dialog.addEventListener('close',()=>{++version;motion?.cancel();closing?.cancel();closing=null;dialog.classList.remove('is-closing');drag=null;trigger?.focus({preventScroll:true});items=[];});
 view.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'&&event.target===image)drag={id:event.pointerId,x:event.clientX,y:event.clientY};});
 view.addEventListener('pointerup',event=>{if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4&&items.length>1)change(index+(dx<0?1:-1));});
 view.addEventListener('pointercancel',()=>drag=null);
 document.querySelector('#dialog-content').addEventListener('click',event=>{const button=event.target.closest('.experience-image-open');if(!button)return;const buttons=[...button.closest('#experience-panel').querySelectorAll('.experience-image-open')];open(buttons,buttons.indexOf(button));});
 return open;
}

export function makeExperienceImagesOpen(panel){
 panel.querySelectorAll('img').forEach(image=>{
  if(image.closest('button'))return;
  const button=document.createElement('button');button.type='button';button.className='experience-image-open';button.dataset.caption=image.closest('figure')?.querySelector('figcaption')?.textContent||'Indossa il visore VR';button.setAttribute('aria-label','Ingrandisci: '+button.dataset.caption);
  image.before(button);button.append(image);
  const hint=document.createElement('span');hint.className='image-zoom-hint';hint.setAttribute('aria-hidden','true');hint.textContent='↗';button.append(hint);
 });
}
