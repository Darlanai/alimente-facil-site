/* Alimente Fácil — interactive 3D kitchen experience.
   The scene is real-time 3D, not a prerecorded background video. */
(async()=>{
 const root=document.getElementById('landing-video-container');
 const video=document.getElementById('afLandingVideo');
 if(!root||!video||!window.WebGLRenderingContext)return;
 try{
  const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js');
  video.pause();video.style.display='none';
  const shade=root.querySelector('.af-video-shade');if(shade)shade.style.display='none';
  const canvas=document.createElement('canvas');canvas.id='afKitchenCanvas';canvas.setAttribute('aria-label','Cozinha 3D interativa. Arraste para explorar e use os controles de iluminação.');
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'0',display:'block'});
  root.insertBefore(canvas,root.firstChild);
  root.style.background='#d9d6c9';
  const scene=new THREE.Scene();scene.background=new THREE.Color('#c8c9bd');scene.fog=new THREE.Fog('#c8c9bd',13,27);
  const camera=new THREE.PerspectiveCamera(42,1,.1,80);camera.position.set(5.8,3.0,7.8);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  const mat=(color,rough=.65,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
  const cream=mat('#e9e4d7'),wood=mat('#806047'),woodLight=mat('#b18b65'),dark=mat('#26332c'),stone=mat('#b9b8ad',.28),black=mat('#202925',.24,.5),glass=new THREE.MeshPhysicalMaterial({color:'#b5d0ca',roughness:.08,metalness:.05,transmission:.25,transparent:true,opacity:.4});
  const room=new THREE.Group();scene.add(room);
  function cube(parent,x,y,z,w,h,d,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
  // Architecture: open-plan kitchen, oak cabinetry, stone island and warm details.
  cube(room,0,-.12,0,12,.24,11,mat('#a69f8f'));
  cube(room,0,2.65,-4.7,12,5.3,.2,cream);cube(room,-5.9,2.65,0,.2,5.3,9.6,cream);
  cube(room,0,5.28,0,12,.16,11,mat('#d6d2c7'));
  // Large window and outdoor daylight.
  cube(room,-2.4,3.15,-4.56,3.3,2.5,.08,glass);
  for(let x=-4.05;x<=-.75;x+=1.65)cube(room,x,3.15,-4.48,.045,2.55,.08,mat('#f6f1e5'));
  cube(room,-2.4,3.15,-4.4,3.4,.05,.12,mat('#f6f1e5'));
  // Cabinet run.
  for(let x=-4.4;x<=4.4;x+=1.1){
   cube(room,x,1.02,-4.22,1.02,1.42,.52,wood);
   cube(room,x,2.58,-4.22,1.02,1.15,.52,cream);
   cube(room,x,1.02,-3.94,.025,1.22,.025,woodLight);
   cube(room,x,2.58,-3.94,.025,.96,.025,woodLight);
  }
  cube(room,0,1.82,-4.15,9.4,.12,.78,stone);
  cube(room,0,2.02,-4.18,9.4,.08,.035,black);
  // Tall refrigerator, recognizable double-door with interior light.
  const fridge=new THREE.Group();fridge.position.set(4.7,0,-3.8);room.add(fridge);
  cube(fridge,0,1.45,0,1.5,2.9,1.05,mat('#aeb9b6',.22,.45));
  const fridgeBody=new THREE.Mesh(new THREE.BoxGeometry(1.36,2.72,.94),mat('#d5ddda',.2,.35));fridgeBody.position.set(0,1.46,.06);fridge.add(fridgeBody);
  const doorPivot=new THREE.Group();doorPivot.position.set(-.66,1.46,.55);fridge.add(doorPivot);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.28,2.68,.1),mat('#c4ceca',.18,.42));door.position.set(.64,0,0);door.castShadow=true;doorPivot.add(door);
  const handle=cube(doorPivot,1.12,.05,.08,.045,.85,.07,black);
  const inner=new THREE.PointLight('#dfffe8',0,4,2);inner.position.set(0,1.45,.15);fridge.add(inner);
  const shelfMat=mat('#d9e6df',.25,.12);
  for(let y=.48;y<2.5;y+=.48)cube(fridge,-.02,y,.28,1.08,.035,.48,shelfMat);
  const produceColors=['#e8b54c','#d95d45','#79a66b','#e8e1c9','#c66c52'];
  for(let i=0;i<9;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.11,14,12),mat(produceColors[i%produceColors.length],.42));p.position.set(-.42+(i%3)*.4,.65+Math.floor(i/3)*.55,.18);fridge.add(p)}
  // Island with waterfall stone, hob and stools.
  cube(room,0,.58,-.2,3.6,1.15,1.65,wood);
  cube(room,0,1.2,-.2,3.9,.16,1.9,stone);
  cube(room,-.65,1.3,-.2,.65,.025,.55,black);
  for(let x=-1.5;x<=1.5;x+=3)for(let z=-.7;z<=.3;z+=1)cube(room,x,.02,z,.09,.04,.09,black);
  // Pendant lamps, under-cabinet strip, ceiling spots, floor lamp.
  const ceilingLights=[];
  for(const x of [-1.2,1.2]){
   const lamp=new THREE.PointLight('#fff0d5',85,9,1.8);lamp.position.set(x,4.65,-.2);lamp.castShadow=true;room.add(lamp);ceilingLights.push(lamp);
   const stem=cube(room,x,4.95,-.2,.025,.5,.025,black);
   const shade=new THREE.Mesh(new THREE.CylinderGeometry(.34,.52,.3,32,1,true),mat('#d5c5a6',.35,.2));shade.position.set(x,4.62,-.2);room.add(shade);
  }
  const under=new THREE.PointLight('#ffe8c5',22,7,2);under.position.set(0,2.15,-3.5);room.add(under);
  const lampLight=new THREE.PointLight('#ffcf8c',35,5,2);lampLight.position.set(-4,2.1,1.7);room.add(lampLight);
  const floorLamp=new THREE.Group();floorLamp.position.set(-4,0,1.7);room.add(floorLamp);
  cube(floorLamp,0,1.05,0,.06,2.1,.06,black);
  const shadeLamp=new THREE.Mesh(new THREE.ConeGeometry(.4,.55,24,1,true),mat('#ead9b8',.55));shadeLamp.position.set(0,2.05,0);floorLamp.add(shadeLamp);
  // Ambient and daylight.
  const ambient=new THREE.AmbientLight('#fff8eb',1.45);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff0d7',3.1);sun.position.set(-4,8,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
  const target=new THREE.Vector3(0,1.65,-1.1);camera.lookAt(target);
  // Minimal cinematic interaction: one light switch only.
  let ceilingOn=true,fridgeOpen=false,drag=false,lastX=0,lastY=0,theta=.64,phi=1.18,radius=9.5,tour=true,tourStart=performance.now(),lampOn=true;
  const controls=document.createElement('div');controls.className='af-kitchen-controls';
  controls.innerHTML='<button type="button" class="af-light-switch" data-light aria-label="Apagar as luzes"><span class="af-switch-icon">☼</span><span class="af-switch-copy"><b>LUZES</b><small>ACESAS</small></span><span class="af-switch-track"><i></i></span></button>';
  root.appendChild(controls);
  const lightBtn=controls.querySelector('[data-light]');
  function updateSwitch(){
   lightBtn.classList.toggle('is-off',!ceilingOn);
   lightBtn.setAttribute('aria-label',ceilingOn?'Apagar as luzes':'Acender as luzes');
   lightBtn.querySelector('small').textContent=ceilingOn?'ACESAS':'APAGADAS';
   lightBtn.querySelector('.af-switch-icon').textContent=ceilingOn?'☼':'☾';
  }
  lightBtn.addEventListener('click',()=>{
   ceilingOn=!ceilingOn;
   ceilingLights.forEach(l=>l.intensity=ceilingOn?85:0);
   under.intensity=ceilingOn?22:0;
   ambient.intensity=ceilingOn?1.45:.30;
   sun.intensity=ceilingOn?3.1:.18;
   updateSwitch();
  });
  // The fridge becomes a quiet story beat during the automatic camera tour.
  let fridgeBeat=0;
  canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);tour=false;tourBtn.classList.remove('is-on')});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;theta-=(e.clientX-lastX)*.006;phi=Math.max(.48,Math.min(1.48,phi+(e.clientY-lastY)*.004));lastX=e.clientX;lastY=e.clientY});
  canvas.addEventListener('pointerup',()=>drag=false);canvas.addEventListener('pointercancel',()=>drag=false);
  canvas.addEventListener('wheel',e=>{radius=Math.max(6.6,Math.min(12.5,radius+e.deltaY*.008));},{passive:true});
  function resize(){const w=root.clientWidth,h=root.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
  const ro=new ResizeObserver(resize);ro.observe(root);resize();
  let raf=0;function frame(now){
   raf=requestAnimationFrame(frame);
   if(tour&&!drag){
    const t=(now-tourStart)/1000;
    theta=.28+Math.sin(t*.105)*.88;
    phi=1.12+Math.sin(t*.075)*.10;
    radius=9.4+Math.sin(t*.13)*.55;
    const beat=t%34;
    const open=beat>15&&beat<25;
    if(open!==fridgeOpen){fridgeOpen=open;doorPivot.rotation.y=open?-1.72:0;inner.intensity=open?32:0}
   }
   camera.position.set(target.x+Math.sin(theta)*Math.sin(phi)*radius,target.y+Math.cos(phi)*radius,target.z+Math.cos(theta)*Math.sin(phi)*radius);camera.lookAt(target);
   renderer.render(scene,camera);
  }frame(0);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAnimationFrame(raf);else frame(0)});
  window.addEventListener('pagehide',()=>{ro.disconnect();renderer.dispose()},{once:true});
 }catch(err){console.warn('Kitchen 3D unavailable; restoring cinematic fallback.',err);video.style.display='block';}
})();