import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {DRACOLoader} from './vendor/DRACOLoader.js';

export async function mountModel(host,options={}){
 let disposed=false,renderer,controls,root,observer,draco,environment;
 const artMaterials=new Set(),originalMaterials=new Set(),holograms=[];
 const status=host.querySelector('.model-status');
 const select=document.querySelector('#model-selection'),reset=document.querySelector('#model-reset'),wire=document.querySelector('#model-wire'),rotate=document.querySelector('#model-rotate'),style=document.querySelector('#model-style');
 const dispose=()=>{disposed=true;observer?.disconnect();controls?.dispose();draco?.dispose();environment?.dispose();artMaterials.forEach(m=>m.dispose());originalMaterials.forEach(m=>{for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();});if(renderer){renderer.setAnimationLoop(null);renderer.dispose();renderer.forceContextLoss();}root?.traverse(o=>o.geometry?.dispose());};
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(options.background??0xddd9d2);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,10000);
  const ambient=new THREE.HemisphereLight(0xffffff,0x777b83,2.8);scene.add(ambient);const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.set(5,8,7);scene.add(key);const fill=new THREE.DirectionalLight(0xe0e7ff,.8);fill.position.set(-6,3,-4);scene.add(fill);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;controls.autoRotateSpeed=.7;controls.zoomToCursor=false;
  const loader=new GLTFLoader();if(options.scene||options.compressed){draco=new DRACOLoader();draco.setDecoderPath('./vendor/draco/');draco.setWorkerLimit(2);loader.setDRACOLoader(draco);}const gltf=await loader.loadAsync(options.src||'./models/person.glb');root=gltf.scene;
  if(disposed||(options.isActive&&!options.isActive())){dispose();return dispose;}
  const meshes=[];root.traverse(o=>{if(o.isMesh){meshes.push(o);for(const m of(Array.isArray(o.material)?o.material:[o.material]))m.side=THREE.DoubleSide;}});
  if(!meshes.length)throw new Error('No model geometry');
  meshes.forEach(o=>{o.userData.originalMaterial=o.material;for(const m of(Array.isArray(o.material)?o.material:[o.material]))originalMaterials.add(m);});
  if(options.inkLift){
   // Lift the baked ink's shadows while leaving its alpha fade untouched.
   for(const material of originalMaterials){
    material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
     float inkValue=pow(clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)),0.,1.),.42);
     vec3 inkColor=mix(vec3(.10,.17,.21),vec3(.62,.74,.76),inkValue);
     diffuseColor.rgb=mix(inkColor,diffuseColor.rgb,.12);`);};
    material.customProgramCacheKey=()=> 'ink-shadow-lift-v1';material.needsUpdate=true;
   }
  }
  // A local studio environment gives metal broad reflections without external assets.
  const ew=512,eh=256,data=new Float32Array(ew*eh*4);
  for(let y=0;y<eh;y++)for(let x=0;x<ew;x++){
   const u=x/ew,v=y/eh,soft=Math.exp(-Math.pow((v-.38)/.2,2));
   const strip=Math.exp(-Math.pow((u-.2)/.045,2))+Math.exp(-Math.pow((u-.7)/.065,2));
   const i=(y*ew+x)*4;data[i]=.12+soft*.55+strip*3;data[i+1]=.14+soft*.5+strip*2.1;data[i+2]=.22+soft*.65+strip*3.5;data[i+3]=1;
  }
  const studio=new THREE.DataTexture(data,ew,eh,THREE.RGBAFormat,THREE.FloatType);studio.mapping=THREE.EquirectangularReflectionMapping;studio.needsUpdate=true;
  const pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromEquirectangular(studio);pmrem.dispose();studio.dispose();
  function artMaterial(original,mode){
   let material;
   if(mode==='hologram'){
    material=new THREE.MeshPhysicalMaterial({map:original.map,color:0x8e74ff,emissive:0x497aff,emissiveIntensity:.8,roughness:.4,transparent:true,depthWrite:false,side:THREE.DoubleSide});
    const clock={value:0};material.userData.clock=clock;
    material.onBeforeCompile=shader=>{shader.uniforms.artTime=clock;shader.fragmentShader='uniform float artTime;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#ifdef USE_MAP\n diffuseColor.a *= texture2D(map, vMapUv).a;\n#endif');shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
     float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vViewPosition))),1.6);
     float scan=.9+.1*sin(gl_FragCoord.y*.7-artTime*1.2);
     gl_FragColor.rgb=mix(vec3(.48,.32,1.),vec3(.25,.92,1.),rim)*(.85+rim*.8)*scan;
     gl_FragColor.a*=.5+rim*.45;`);};holograms.push(material);
   }else{
    material=new THREE.MeshPhysicalMaterial({color:mode==='chrome'?0xe1dcf2:0xeee5d5,metalness:mode==='chrome'?1:0,roughness:mode==='chrome'?.13:.72,envMap:mode==='chrome'?environment.texture:null,envMapIntensity:1.3,side:THREE.DoubleSide,map:original.map,transparent:original.transparent,opacity:original.opacity,depthWrite:original.depthWrite,alphaTest:original.alphaTest});
    // Keep the source silhouette while replacing only its color and surface finish.
    material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#ifdef USE_MAP\n diffuseColor.a *= texture2D(map, vMapUv).a;\n#endif');};
   }
   artMaterials.add(material);return material;
  }
  const variants=new Map();
  function applyStyle(){const mode=style.value;const on=wire.getAttribute('aria-pressed')==='true';for(const mesh of meshes){let material=mesh.userData.originalMaterial;if(mode!=='original'){let bundle=variants.get(mesh);if(!bundle){bundle={};variants.set(mesh,bundle);}if(!bundle[mode])bundle[mode]=Array.isArray(material)?material.map(m=>artMaterial(m,mode)):artMaterial(material,mode);material=bundle[mode];}mesh.material=material;for(const m of(Array.isArray(material)?material:[material])){m.wireframe=on;m.needsUpdate=true;}}renderer.setClearColor(mode==='hologram'?0x101526:mode==='sculpture'?0x20232b:mode==='chrome'?0xccc7d2:(options.background??0xddd9d2));choose();}
  style.addEventListener('change',applyStyle);
  scene.add(root);host.appendChild(renderer.domElement);status.remove();
  const groups=root.children.length===1&&root.children[0].children.length?root.children[0].children.filter(o=>new THREE.Box3().setFromObject(o).isEmpty()===false):root.children.filter(o=>new THREE.Box3().setFromObject(o).isEmpty()===false);
  const figures=[root];
  select.replaceChildren();select.add(new Option('Modello completo','0'));
  // Procedural transparency leaves invisible geometry. Frame only the visible surface.
  const imagePixels=new Map();
  for(const mesh of meshes){
   const geometry=mesh.geometry,mat=Array.isArray(mesh.material)?mesh.material[0]:mesh.material,map=mat.map;
   if(!map?.image)continue;
   const uv=geometry.getAttribute(map.channel?'uv'+map.channel:'uv'),positions=geometry.getAttribute('position');if(!uv)continue;
   let cached=imagePixels.get(map.image);if(!cached){const canvas=document.createElement('canvas');canvas.width=map.image.width;canvas.height=map.image.height;const ctx=canvas.getContext('2d');ctx.drawImage(map.image,0,0);cached={width:canvas.width,height:canvas.height,pixels:ctx.getImageData(0,0,canvas.width,canvas.height).data};imagePixels.set(map.image,cached);}const canvas=cached,pixels=cached.pixels;
   const box=new THREE.Box3(),point=new THREE.Vector3();
   for(let i=0;i<positions.count;i++){const x=Math.max(0,Math.min(canvas.width-1,Math.floor(uv.getX(i)*canvas.width)));const v=map.flipY?1-uv.getY(i):uv.getY(i);const y=Math.max(0,Math.min(canvas.height-1,Math.floor(v*canvas.height)));if(pixels[(y*canvas.width+x)*4+3]>30){point.fromBufferAttribute(positions,i);box.expandByPoint(point);}}
   if(!box.isEmpty())mesh.userData.visibleBounds=box;
  }
  function visibleBox(object){const box=new THREE.Box3();object.traverse(o=>{if(!o.isMesh)return;let parent=o;while(parent&&parent!==object.parent){if(!parent.visible)return;parent=parent.parent;}o.geometry.computeBoundingBox();box.union((o.userData.visibleBounds||o.geometry.boundingBox).clone().applyMatrix4(o.matrixWorld));});return box;}
  function centerVisibleModel(){
   // Measure the rendered silhouette: transparent geometry must not shift the framing.
   const height=192,width=Math.max(96,Math.round(height*camera.aspect));
   const target=new THREE.WebGLRenderTarget(width,height),pixels=new Uint8Array(width*height*4);
   const oldColor=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha();
   renderer.setClearColor(0x000000,0);
   for(let pass=0;pass<2;pass++){
    renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);
    let left=width,right=-1,bottom=height,top=-1;
    for(let y=0;y<height;y++){
     // Thin hanging ropes should not pull the flying ship's pivot away from its body.
     if(options.focusBody){let rowPixels=0;for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>24)rowPixels++;if(rowPixels<Math.max(3,width*.012))continue;}
     for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>24){left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);}
    }
    if(right<left)break;
    const distance=camera.position.distanceTo(controls.target),worldHeight=2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*distance;
    const rightVector=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),upVector=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
    const shift=rightVector.multiplyScalar(((left+right+1)/(2*width)-.5)*worldHeight*camera.aspect).add(upVector.multiplyScalar(((bottom+top+1)/(2*height)-.5)*worldHeight));
    camera.position.add(shift);controls.target.add(shift);
    const fit=Math.max((right-left+1)/(width*.78),(top-bottom+1)/(height*.78));
    camera.position.sub(controls.target).multiplyScalar(fit).add(controls.target);controls.update();
   }
   renderer.setRenderTarget(null);renderer.setClearColor(oldColor,oldAlpha);target.dispose();
  }
  function choose(){figures.forEach((o,i)=>{o.visible=select.value==='all'||String(i)===select.value;});scene.updateMatrixWorld(true);
   const selected=select.value==='all'?root:figures[Number(select.value)];const box=visibleBox(selected),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const radius=Math.max(size.x,size.y,size.z,.01);const distance=(radius/2)/Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*1.5;camera.aspect=Math.max(host.clientWidth,1)/Math.max(host.clientHeight,1);camera.position.set(center.x+distance*(options.viewAzimuth!==undefined?Math.sin(options.viewAzimuth):(options.viewAngle??(options.scene?.35:.12))),center.y+radius*(options.viewElevation??(options.scene?.38:.04)),center.z+distance*(options.viewAzimuth!==undefined?Math.cos(options.viewAzimuth):1));controls.target.copy(center);controls.minDistance=radius*.04;controls.maxDistance=radius*8;camera.near=radius/3000;camera.far=radius*100;camera.updateProjectionMatrix();const damping=controls.enableDamping,auto=controls.autoRotate;controls.enableDamping=false;controls.autoRotate=false;controls.update();centerVisibleModel();controls.enableDamping=damping;controls.autoRotate=auto;}
  select.value=figures.length>1?'all':'0';choose();select.addEventListener('change',choose);reset.addEventListener('click',choose);
  wire.addEventListener('click',()=>{const on=wire.getAttribute('aria-pressed')!=='true';wire.setAttribute('aria-pressed',String(on));meshes.forEach(o=>{for(const m of(Array.isArray(o.material)?o.material:[o.material])){m.wireframe=on;m.needsUpdate=true;}});});
  rotate.addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;rotate.setAttribute('aria-pressed',String(controls.autoRotate));});
  [select,reset,wire,rotate,style].forEach(b=>b.disabled=false);select.parentElement.hidden=Boolean(options.scene);controls.enablePan=Boolean(options.scene);
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);}observer=new ResizeObserver(resize);observer.observe(host);resize();
  host.addEventListener('keydown',e=>{if(e.key==='Home'){e.preventDefault();choose();}});
  renderer.setAnimationLoop(time=>{if(disposed||document.hidden)return;for(const m of holograms)m.userData.clock.value=time*.001;controls.update();renderer.render(scene,camera);});
  renderer.domElement.addEventListener('webglcontextlost',()=>{if(!disposed){status.textContent='La visualizzazione 3D è stata interrotta. Chiudi e riapri Modelli.';host.appendChild(status);}});
 }catch(e){console.error(e);status.textContent='Il modello non è disponibile. Chiudi e riapri Modelli per riprovare.';renderer?.dispose();}
 return dispose;
}
