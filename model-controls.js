export function enhanceModelControls(container){
 const cleanups=[];
 container.querySelectorAll('select').forEach(select=>{
  select.classList.add('model-native-control');
  const wrapper=document.createElement('div');wrapper.className='model-control';
  select.after(wrapper);
  const isStyle=select.id==='model-style';
  let trigger,list,open=false;
  function close(){open=false;wrapper.classList.remove('is-open');trigger?.setAttribute('aria-expanded','false');if(list&&!isStyle)list.inert=true;}
  function set(value){select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));sync();}
  function sync(){
   if(trigger){trigger.querySelector('.control-value').textContent=select.selectedOptions[0]?.textContent||'Modello completo';trigger.disabled=select.disabled;}
   wrapper.querySelectorAll('[data-value]').forEach(button=>{button.disabled=select.disabled;button.setAttribute(isStyle?'aria-pressed':'aria-selected',String(button.dataset.value===select.value));});
  }
  if(select.id==='model-selection'){
   wrapper.classList.add('model-view-badge');wrapper.textContent='Modello completo';
  }else if(isStyle){
   wrapper.classList.add('model-style-tabs');wrapper.setAttribute('role','group');wrapper.setAttribute('aria-label','Stile artistico');list=wrapper;
  }else{
   wrapper.classList.add('model-picker');
   trigger=document.createElement('button');trigger.type='button';trigger.className='model-picker-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
   trigger.innerHTML='<span class="control-value"></span><span class="control-chevron" aria-hidden="true">⌄</span>';
   list=document.createElement('div');list.className='model-picker-menu';list.id=select.id+'-menu';list.setAttribute('role','listbox');list.setAttribute('aria-label','Modello');list.inert=true;
   trigger.setAttribute('aria-controls',list.id);wrapper.append(trigger,list);
   function reveal(){open=true;wrapper.classList.add('is-open');trigger.setAttribute('aria-expanded','true');list.inert=false;}
   trigger.addEventListener('click',event=>{event.preventDefault();open?close():reveal();});
   trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();reveal();const buttons=[...list.children];(event.key==='ArrowUp'?buttons.at(-1):buttons.find(b=>b.dataset.value===select.value)||buttons[0])?.focus();}});
   const outside=event=>{if(!wrapper.contains(event.target))close();};document.addEventListener('pointerdown',outside);cleanups.push(()=>document.removeEventListener('pointerdown',outside));
   wrapper.addEventListener('keydown',event=>{if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close();trigger.focus();}if(list.contains(event.target)&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const buttons=[...list.children],i=buttons.indexOf(event.target);buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}});
   wrapper.addEventListener('focusout',event=>{if(!wrapper.contains(event.relatedTarget))close();});
  }
  if(list)for(const [index,option] of [...select.options].entries()){
   const button=document.createElement('button');button.type='button';button.dataset.value=option.value;button.className=isStyle?'model-style-tab':'model-picker-option';
   if(isStyle){button.textContent=option.textContent;button.dataset.style=option.value;}else{button.setAttribute('role','option');const number=document.createElement('span');number.className='option-number';number.textContent=String(index+1).padStart(2,'0');const name=document.createElement('span');name.textContent=option.textContent;const mark=document.createElement('span');mark.className='option-mark';mark.textContent='↗';mark.setAttribute('aria-hidden','true');button.append(number,name,mark);}
   button.addEventListener('click',event=>{event.preventDefault();close();trigger?.focus();if(select.value!==option.value)set(option.value);});list.append(button);
  }
  const observer=new MutationObserver(sync);observer.observe(select,{attributes:true,childList:true,subtree:true});select.addEventListener('change',sync);sync();
  cleanups.push(()=>{observer.disconnect();select.removeEventListener('change',sync);wrapper.remove();select.classList.remove('model-native-control');});
 });
 return()=>cleanups.forEach(cleanup=>cleanup());
}
