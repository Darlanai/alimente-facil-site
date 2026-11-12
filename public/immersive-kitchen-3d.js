import * as THREE from 'https://esm.sh/three@0.170.0';
import { OrbitControls } from 'https://esm.sh/three@0.170.0/examples/jsm/controls/OrbitControls.js?external=three';
import { GLTFLoader } from 'https://esm.sh/three@0.170.0/examples/jsm/loaders/GLTFLoader.js?external=three';

(()=>{
 const canvas=document.getElementById('afKitchen3DCanvas');
 const root=document.getElementById('landing-video-container');
 if(!canvas||!root)return;
 const fallback=document.getElementById('afKitchen3DFallback');
 let renderer;
 try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 }catch(error){if(fallback)fallback.hidden=false;canvas.style.display='none';console.warn('[AF Kitchen 3D] WebGL indisponível; exibindo imagem de apoio sem exigir instalação.',error);return;}
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();if(fallback)fallback.hidden=false;canvas.style.display='none';},{once:true});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;

 const scene=new THREE.Scene();scene.background=new THREE.Color(0x77776c);scene.fog=new THREE.Fog(0x77776c,16,34);
 const camera=new THREE.PerspectiveCamera(42,1,.1,70);
 camera.position.set(7.4,4.4,9.6);
 const controls=new OrbitControls(camera,renderer.domElement);
 controls.target.set(0,1.35,-.3);controls.enableDamping=true;controls.dampingFactor=.055;
 controls.enablePan=false;controls.minDistance=6.4;controls.maxDistance=13;
 controls.minPolarAngle=.68;controls.maxPolarAngle=1.48;controls.maxAzimuthAngle=1.12;controls.minAzimuthAngle=-1.12;
 controls.autoRotate=true;controls.autoRotateSpeed=.22;

 const makeWoodTexture=()=>{
  const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,512,0);g.addColorStop(0,'#4a3325');g.addColorStop(.48,'#8c6444');g.addColorStop(1,'#503728');x.fillStyle=g;x.fillRect(0,0,512,512);
  for(let i=0;i<190;i++){const px=(i*73)%512,alpha=.035+((i*17)%10)/180;x.strokeStyle='rgba(24,13,8,'+alpha+')';x.lineWidth=1+(i%3);x.beginPath();x.moveTo(px,0);x.bezierCurveTo(px+((i%7)-3)*3,150,px+((i%9)-4)*2,340,px+((i%5)-2)*4,512);x.stroke();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,1);t.colorSpace=THREE.SRGBColorSpace;return t;
 };
 const makeMarbleTexture=()=>{
  const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,512,512);g.addColorStop(0,'#d8d5cd');g.addColorStop(.5,'#a8a79f');g.addColorStop(1,'#e7e2d7');x.fillStyle=g;x.fillRect(0,0,512,512);
  for(let i=0;i<28;i++){x.strokeStyle='rgba(70,76,76,'+(.06+(i%5)*.018)+')';x.lineWidth=1+(i%3);x.beginPath();let y=(i*83)%512;x.moveTo(0,y);x.bezierCurveTo(130,y-35+(i%9)*8,310,y+30-(i%7)*9,512,y-24+(i%11)*5);x.stroke();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);t.colorSpace=THREE.SRGBColorSpace;return t;
 };
 const woodTexture=makeWoodTexture(),marbleTexture=makeMarbleTexture();
 const mat=(color,rough=.7,metal=0,extra={})=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});
 const woodMaterial=mat(0xffffff,.46,0,{map:woodTexture});
 const stoneMaterial=mat(0xffffff,.24,.04,{map:marbleTexture});
 const floorMat=mat(0xffffff,.48,0,{map:woodTexture}),wallMat=mat(0xd7d0c2,.9),oak=woodMaterial,oakLight=mat(0xffffff,.5,0,{map:woodTexture}),stone=stoneMaterial,darkStone=mat(0x262b29,.24,.22),steel=mat(0x9da5a4,.25,.78),black=mat(0x171b1b,.28,.5),glass=mat(0x8fa9a4,.12,.15,{transparent:true,opacity:.22});
 const box=(name,size,pos,material,parent=scene,cast=true)=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.name=name;m.position.set(...pos);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;
 };
 // Architectural shell, warm stone and oak.
 box('Piso em pedra',[12,.18,11],[0,-.1,0],floorMat);
 box('Parede de fundo',[12,5,.18],[0,2.4,-5.35],wallMat);
 box('Parede lateral esquerda',[.18,5,11],[-5.9,2.4,0],wallMat);
 box('Teto',[12,.12,11],[0,4.95,0],mat(0xd2cabb,.92),scene,false);
 // Tall panoramic window and slim frames.
 box('Janela',[3.2,2.5,.08],[-3.65,2.75,-5.22],mat(0x34464b,.2,.15,{transparent:true,opacity:.22}),scene,false);
 for(const x of [-5.18,-2.12])box('Esquadria',[.055,2.65,.11],[x,2.75,-5.12],black,scene,false);
 box('Peitoril',[3.2,.08,.2],[-3.65,1.48,-5.12],oakLight);
 // Main lower and upper cabinetry with fine reveals.
 for(let i=0;i<5;i++){
  const x=-2.65+i*1.18;
  box('Gaveteiro',[1.1,.88,.72],[x,.49,-4.48],oak);
  box('Frente da gaveta',[1.04,.24,.045],[x,.68,-4.095],oakLight);
  box('Frente inferior',[1.04,.43,.045],[x,.32,-4.095],oak);
  box('Puxador escovado',[.34,.025,.035],[x,.67,-4.055],steel);
 }
 box('Bancada em quartzo',[6.1,.13,.95],[.05,.98,-4.15],stone);
 box('Rodabanca em pedra',[6.1,.72,.09],[.05,1.38,-5.02],stone);
 for(let i=0;i<4;i++){
  const x=-2.25+i*1.5;
  box('Armário aéreo',[1.35,1.05,.58],[x,3.12,-4.95],oak);
  box('Porta de armário',[1.29,.99,.045],[x,3.12,-4.63],oakLight);
  box('Puxador aéreo',[.28,.025,.035],[x+.43,3.08,-4.59],steel);
 }
 // Island, stone waterfall and stools.
 box('Ilha de cozinha',[3.25,.92,1.35],[.15,.58,-.25],oak);
 box('Tampo da ilha',[3.48,.13,1.52],[.15,1.1,-.25],stone);
 box('Lateral em cascata',[.09,1.02,1.4],[1.86,.56,-.25],stone);
 for(const x of [-.85,.95]){
  const leg=box('Banqueta',[.48,.1,.48],[x,.53,1.15],black);
  box('Assento em couro',[.52,.12,.52],[x,.91,1.15],oakLight);
  box('Encosto da banqueta',[.5,.55,.09],[x,1.2,1.37],black);
 }
 // Sink, faucet and hob.
 box('Cuba',[.9,.06,.62],[-1.75,1.07,-4.2],black);
 box('Torneira',[.07,.44,.07],[-1.75,1.32,-4.52],steel);
 box('Cooktop',[1.1,.045,.7],[.65,1.07,-4.18],black);
 // Photoreal appliance asset (CC0) with native open/close animation clips.
 const fridgeAnchor=new THREE.Group();fridgeAnchor.position.set(3.72,0,-3.58);scene.add(fridgeAnchor);
 const fridgeHit=new THREE.Mesh(new THREE.BoxGeometry(1.25,2.05,1.35),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
 fridgeHit.position.set(0,1.0,0);fridgeHit.userData.fridgeHit=true;fridgeAnchor.add(fridgeHit);
 let fridgeMixer=null,fridgeActions={},fridgeModelReady=false,fridgeOpen=false;
 const fridgeLight=new THREE.PointLight(0xffedce,0,4);fridgeLight.position.set(0,1.55,.62);fridgeAnchor.add(fridgeLight);
 const fridgeFill=new THREE.PointLight(0xc7e4ff,0,2.5);fridgeFill.position.set(0,.82,.55);fridgeAnchor.add(fridgeFill);
 const fridgeLoader=new GLTFLoader();
 fridgeLoader.load('https://cdn.3dassets.dev/assets/14039/v1/model.glb',(gltf)=>{
   const model=gltf.scene;model.scale.setScalar(1.12);model.position.set(-.48,0,-.62);
   model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.envMapIntensity=1.15;}}});
   fridgeAnchor.add(model);fridgeModelReady=true;
   if(gltf.animations?.length){
     fridgeMixer=new THREE.AnimationMixer(model);
     for(const clip of gltf.animations){
       const name=clip.name.toLowerCase();
       fridgeActions[name]=fridgeMixer.clipAction(clip);
     }
     const closeClip=Object.keys(fridgeActions).find(n=>n.includes('close'));
     if(closeClip){const a=fridgeActions[closeClip];a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();a.timeScale=1;}
   }
 },undefined,(error)=>console.warn('[AF Kitchen 3D] Fridge model unavailable; interactive door hit area remains available.',error));
 // Direct tap/click interaction on the refrigerator. Camera drag remains camera-only.
 const fridgeRaycaster=new THREE.Raycaster(),fridgePointer=new THREE.Vector2();
 let fridgePointerDown=null;
 canvas.addEventListener('pointerdown',event=>{fridgePointerDown={x:event.clientX,y:event.clientY};});
 canvas.addEventListener('pointerup',event=>{
  if(!fridgePointerDown)return;
  const dx=event.clientX-fridgePointerDown.x,dy=event.clientY-fridgePointerDown.y;fridgePointerDown=null;
  if(Math.hypot(dx,dy)>8)return;
  const rect=canvas.getBoundingClientRect();
  fridgePointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
  fridgeRaycaster.setFromCamera(fridgePointer,camera);
  if(!fridgeRaycaster.intersectObject(fridgeHit,false).length)return;
  fridgeOpen=!fridgeOpen;
  document.body.classList.toggle('af-fridge-open',fridgeOpen);
  const wanted=fridgeOpen?'open':'close';
  const clipName=Object.keys(fridgeActions).find(name=>name.includes(wanted));
  if(clipName&&fridgeMixer){
   Object.values(fridgeActions).forEach(action=>action.stop());
   const action=fridgeActions[clipName];action.reset();action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
  }
 });
 // Lighting: architectural daylight + warm pendants + cabinet strips.
 const ambient=new THREE.HemisphereLight(0xffead0,0x414b48,1.45);scene.add(ambient);
 const sun=new THREE.DirectionalLight(0xffe4c2,3.2);sun.position.set(-4,8,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
 const windowLight=new THREE.PointLight(0xe0edff,18,12);windowLight.position.set(-3.7,3.4,-4.3);scene.add(windowLight);
 const pendants=[];
 for(const x of [-1.25,1.35]){
  box('Pendente cabo',[.018,.72,.018],[x,3.9,.1],black,scene,false);
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(.16,.34,.22,32,1,true),mat(0x2b2d29,.3,.6));shade.position.set(x,3.48,.1);scene.add(shade);
  const bulb=new THREE.PointLight(0xffd19a,18,7);bulb.position.set(x,3.35,.1);scene.add(bulb);pendants.push(bulb);
 }
 const underCabinet=new THREE.PointLight(0xffdcae,10,8);underCabinet.position.set(0,2.35,-3.9);scene.add(underCabinet);
 function applyLights(on){lightsOn=on;sun.intensity=on?3.2:.18;ambient.intensity=on?1.45:.25;windowLight.intensity=on?18:1;pendants.forEach(l=>l.intensity=on?18:0);underCabinet.intensity=on?10:0;}
 window.addEventListener('af:kitchen-light',e=>applyLights(Boolean(e.detail?.on)));
 window.dispatchEvent(new CustomEvent('af:kitchen-ready'));
 // Subtle ambient materials and real-time door animation.
 const clock=new THREE.Clock();let raf=0;
 const resize=()=>{const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
 const ro=new ResizeObserver(resize);ro.observe(root);resize();
 const render=()=>{
  if(!root.isConnected){cancelAnimationFrame(raf);ro.disconnect();controls.dispose();renderer.dispose();return;}
  const dt=Math.min(clock.getDelta(),.04);fridgeMixer?.update(dt);
  fridgeLight.intensity=THREE.MathUtils.damp(fridgeLight.intensity,fridgeOpen?34:0,8,dt);
  fridgeFill.intensity=THREE.MathUtils.damp(fridgeFill.intensity,fridgeOpen?13:0,8,dt);
  controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(render);
 };render();
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);ro.disconnect();controls.dispose();renderer.dispose();},{once:true});
})();
