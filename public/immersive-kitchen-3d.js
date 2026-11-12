import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js';

(()=>{
 const canvas=document.getElementById('afKitchen3DCanvas');
 const root=document.getElementById('landing-video-container');
 if(!canvas||!root)return;
 const fallback=document.getElementById('afKitchen3DFallback');
 let renderer;
 try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 }catch(error){if(fallback)fallback.hidden=false;console.error('[AF Kitchen 3D] WebGL indisponível',error);return;}
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

 const mat=(color,rough=.7,metal=0,extra={})=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});
 const floorMat=mat(0x8a7760,.48),wallMat=mat(0xd7d0c2,.9),oak=mat(0x654833,.45),oakLight=mat(0x9b7653,.42),stone=mat(0xaaa69b,.24),darkStone=mat(0x262b29,.24,.22),steel=mat(0x9da5a4,.25,.78),black=mat(0x171b1b,.28,.5),glass=mat(0x8fa9a4,.12,.15,{transparent:true,opacity:.22});
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
 // Fridge housing with hinged doors, internal shelves and independent LEDs.
 const fridge=new THREE.Group();fridge.position.set(3.75,0,-3.62);scene.add(fridge);
 box('Nicho da geladeira',[2.05,2.72,1.2],[0,1.38,-.12],oak,fridge);
 box('Fundo interno',[1.68,2.35,.12],[0,1.35,-.73],black,fridge);
 box('Interior refrigerado',[1.62,2.25,.62],[0,1.35,-.48],mat(0x27302d,.35),fridge);
 const fridgeLight=new THREE.PointLight(0xffedce,0,4);fridgeLight.position.set(0,2.15,.2);fridge.add(fridgeLight);
 const fridgeFill=new THREE.PointLight(0xc7e4ff,0,2.5);fridgeFill.position.set(0,1.25,.3);fridge.add(fridgeFill);
 for(let i=0;i<4;i++){
  box('Prateleira de vidro',[1.52,.035,.54],[0,.52+i*.48,-.1],glass,fridge,false);
  box('Perfil da prateleira',[1.52,.025,.04],[0,.5+i*.48,.16],steel,fridge,false);
 }
 for(let i=0;i<3;i++){
  const colors=[0x9e4d36,0x7b9a58,0xd4a64b];
  const jar=mat(colors[i],.32);
  box('Alimento fresco',[.28,.27,.24],[-.48+i*.46,.72,.04],jar,fridge);
  box('Pote de alimento',[.22,.19,.22],[-.46+i*.44,1.23,-.02],mat([0xd8d1bd,0x8ca5a0,0xb3a07d][i],.3),fridge);
 }
 const leftDoor=new THREE.Group();leftDoor.position.set(-.86,1.38,.55);fridge.add(leftDoor);
 const leftPanel=box('Porta esquerda',[.84,2.56,.12],[.42,0,0],steel,leftDoor);
 box('Puxador esquerdo',[.045,.76,.075],[.78,0,.08],black,leftDoor);
 const rightDoor=new THREE.Group();rightDoor.position.set(.86,1.38,.55);fridge.add(rightDoor);
 box('Porta direita',[.84,2.56,.12],[-.42,0,0],steel,rightDoor);
 box('Puxador direito',[.045,.76,.075],[-.78,0,.08],black,rightDoor);
 // Door bins on inner face.
 for(const pivot of [leftDoor,rightDoor])for(let i=0;i<3;i++){
  box('Prateleira da porta',[.62,.08,.16],[0,-.83+i*.58,-.13],glass,pivot,false);
 }
 const doors=[{node:leftDoor,closed:0,open:-1.75},{node:rightDoor,closed:0,open:1.75}];
 let fridgeOpen=false,doorT=0,lightsOn=true;
 const targetDoor=()=>fridgeOpen?1:0;
 const fridgeMeshes=[leftPanel,...fridge.children.filter(o=>o.name==='Porta direita')];
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 let down=null,moved=false;
 const onDown=e=>{down={x:e.clientX,y:e.clientY};moved=false;};
 const onUp=e=>{
  if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;down=null;
  if(Math.hypot(dx,dy)>7)return;
  const rect=canvas.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
  ray.setFromCamera(pointer,camera);
  const hit=ray.intersectObjects([leftPanel,...rightDoor.children.filter(o=>o.isMesh)],false)[0];
  if(hit){fridgeOpen=!fridgeOpen;document.body.classList.toggle('af-fridge-open',fridgeOpen);}
 };
 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointerup',onUp);
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
  const dt=Math.min(clock.getDelta(),.04);doorT+=(targetDoor()-doorT)*Math.min(1,dt*5);
  doors[0].node.rotation.y=doors[0].closed+(doors[0].open-doors[0].closed)*doorT;
  doors[1].node.rotation.y=doors[1].closed+(doors[1].open-doors[1].closed)*doorT;
  fridgeLight.intensity=THREE.MathUtils.damp(fridgeLight.intensity,fridgeOpen?34:0,8,dt);
  fridgeFill.intensity=THREE.MathUtils.damp(fridgeFill.intensity,fridgeOpen?13:0,8,dt);
  controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(render);
 };render();
 window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);ro.disconnect();controls.dispose();renderer.dispose();},{once:true});
})();
