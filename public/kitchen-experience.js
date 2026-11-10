/* Alimente Fácil — experiência de cozinha interativa.
   A cena é geometria 3D procedural (protótipo); não é fotogrametria nem modelo arquitetônico final. */
(()=>{
 const root=document.getElementById('landing-video-container');
 const video=document.getElementById('afLandingVideo');
 const lightBtn=document.getElementById('afSceneLight');
 const exploreBtn=document.getElementById('afExploreKitchen');
 if(!root||!video||!lightBtn)return;
 video.style.display='block';video.play().catch(()=>{});
 root.classList.add('af-scene-lit');
 // O controle de iluminação fica no topo, junto da navegação, sem cobrir preço ou rodapé.
 const topControls=document.querySelector('.af-top-controls');
 if(topControls&&!lightBtn.dataset.afMovedToHeader){topControls.appendChild(lightBtn);lightBtn.dataset.afMovedToHeader='true';lightBtn.classList.add('af-light-in-header')}
 lightBtn.addEventListener('click',()=>{
  const off=root.classList.toggle('af-scene-dimmed');
  root.classList.toggle('af-scene-lit',!off);
  lightBtn.setAttribute('aria-pressed',String(off));
  lightBtn.setAttribute('aria-label',off?'Acender a iluminação da cozinha':'Apagar a iluminação da cozinha');
  lightBtn.querySelector('small').textContent=off?'Luz apagada':'Luz acesa';
  lightBtn.querySelector('span').textContent=off?'☾':'☼';
  lightBtn.title=off?'Acender iluminação':'Apagar iluminação';
 });
 let parallaxFrame=0;
 root.addEventListener('pointermove',event=>{
  if(event.pointerType==='touch'||event.target.closest('button,a,input'))return;
  const rect=root.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;
  cancelAnimationFrame(parallaxFrame);
  parallaxFrame=requestAnimationFrame(()=>{
   video.style.setProperty('--af-scene-x',(-x*10).toFixed(1)+'px');
   video.style.setProperty('--af-scene-y',(-y*7).toFixed(1)+'px');
  });
 });
 root.addEventListener('pointerleave',()=>{video.style.setProperty('--af-scene-x','0px');video.style.setProperty('--af-scene-y','0px')});
 const clock=document.getElementById('afMomentClock');
 if(clock){const update=()=>clock.textContent=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});update();setInterval(update,30000)}
 if(!exploreBtn)return;
 let activeCleanup=null;
 exploreBtn.addEventListener('click',async()=>{
  if(activeCleanup){activeCleanup();activeCleanup=null}
  const overlay=document.createElement('section');
  overlay.className='af3d-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Cozinha interativa em 3D');
  overlay.innerHTML=`
   <header class="af3d-top"><div><span class="af3d-kicker">ALIMENTE FÁCIL · EXPERIÊNCIA IMERSIVA</span><h2>Cozinha viva</h2><p>Toque nos objetos para explorar · arraste para olhar ao redor</p></div><button class="af3d-close" type="button" aria-label="Fechar experiência">×</button></header>
   <div class="af3d-stage"><div class="af3d-loading">Preparando sua cozinha 3D…</div><canvas aria-label="Ambiente de cozinha tridimensional interativo"></canvas></div>
   <aside class="af3d-object-info" aria-live="polite"><b>Explore o ambiente</b><span>Geladeira, armários, despensa, mesa, cadeiras e iluminação.</span></aside>
   <nav class="af3d-controls" aria-label="Controles da cozinha"><button type="button" data-action="light">☼ Luzes</button><button type="button" data-focus="fridge">Geladeira</button><button type="button" data-focus="pantry">Despensa</button><button type="button" data-focus="dining">Mesa</button><button type="button" data-focus="cabinets">Armários</button><button type="button" data-walk="forward" aria-label="Avançar pela cozinha">↑</button><button type="button" data-walk="left" aria-label="Mover para a esquerda">←</button><button type="button" data-walk="back" aria-label="Recuar pela cozinha">↓</button><button type="button" data-walk="right" aria-label="Mover para a direita">→</button><button type="button" data-action="zoom-out" aria-label="Afastar câmera">−</button><button type="button" data-action="zoom-in" aria-label="Aproximar câmera">+</button><button type="button" data-action="reset">Visão inicial</button></nav>`;
  document.body.appendChild(overlay);document.body.classList.add('af3d-open');
  const close=()=>{activeCleanup?.();activeCleanup=null;overlay.remove();document.body.classList.remove('af3d-open')};
  overlay.querySelector('.af3d-close').addEventListener('click',close);
  const esc=e=>{if(e.key==='Escape')close()};document.addEventListener('keydown',esc);
  activeCleanup=()=>{document.removeEventListener('keydown',esc);document.removeEventListener('keydown',onKey);overlay.remove();document.body.classList.remove('af3d-open')};
  try{
   const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
   if(!overlay.isConnected)return;
   const canvas=overlay.querySelector('canvas'),stage=overlay.querySelector('.af3d-stage'),loading=overlay.querySelector('.af3d-loading');
   const scene=new THREE.Scene();scene.background=new THREE.Color(0x17211c);scene.fog=new THREE.Fog(0x17211c,11,24);
   const camera=new THREE.PerspectiveCamera(43,1,.1,80);camera.position.set(5.8,4.4,7.8);
   const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
   renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
   scene.add(new THREE.HemisphereLight(0xffe9c8,0x34483b,2.0));
   const key=new THREE.DirectionalLight(0xffe1b5,3.1);key.position.set(-4,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
   const fill=new THREE.PointLight(0xffbd78,28,12);fill.position.set(0,3.3,-2);scene.add(fill);
   const mat=(color,rough=.78,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
   const floorMat=mat(0x887b67),wallMat=mat(0xe0d6c3),cabinetMat=mat(0x34473b),wood=mat(0x9b7650),stone=mat(0xc8c2b5,.38),dark=mat(0x202a27,.25,.55),steel=mat(0xb8c0bd,.28,.7),glass= new THREE.MeshStandardMaterial({color:0x8ab7b0,roughness:.12,metalness:.15,transparent:true,opacity:.36});
   const floor=new THREE.Mesh(new THREE.BoxGeometry(10,.16,9),floorMat);floor.position.y=-.08;floor.receiveShadow=true;scene.add(floor);
   const back=new THREE.Mesh(new THREE.BoxGeometry(10,4.5,.16),wallMat);back.position.set(0,2.17,-4.4);back.receiveShadow=true;scene.add(back);
   const left=new THREE.Mesh(new THREE.BoxGeometry(.16,4.5,9),wallMat);left.position.set(-4.92,2.17,0);left.receiveShadow=true;scene.add(left);
   const addBox=(name,size,pos,material,parent=scene)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...size),material);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;o.userData.label=name;parent.add(o);return o};
   // Armários inferiores com portas articuladas e puxadores independentes.
   for(let i=0;i<4;i++){
    const x=-2.7+i*1.45;
    addBox('Armário inferior',[1.38,.92,.72],[x,.52,-3.55],cabinetMat);
    const door=addBox('Porta do armário inferior',[.62,.82,.055],[x-.32,.52,-3.17],wood);
    door.userData.kind='cabinetDoor';door.userData.open=false;
    door.userData.pivot=new THREE.Group();door.userData.pivot.position.set(x-.63,.52,-3.17);scene.add(door.userData.pivot);
    door.userData.pivot.add(door);door.position.set(.31,0,0);
    addBox('Puxador do armário',[.045,.24,.045],[x+.13,.52,-3.105],steel);
   }
   addBox('Bancada de pedra',[6.1,.13,.94],[0,1.05,-3.38],stone);
   // Armários aéreos.
   for(let i=0;i<3;i++){const x=-2.05+i*1.8;const cab=addBox('Armário aéreo',[1.65,1.05,.58],[x,2.75,-4.0],cabinetMat);const door=addBox('Porta do armário',[.78,.94,.055],[x-.4,2.75,-3.68],wood);door.userData.kind='cabinetDoor';door.userData.open=false;door.userData.pivot=new THREE.Group();door.userData.pivot.position.set(x-.79,2.75,-3.68);scene.add(door.userData.pivot);door.userData.pivot.add(door);door.position.set(.39,0,0)}
   // Geladeira com porta articulada.
   const fridge=new THREE.Group();fridge.position.set(3.7,0,-2.8);scene.add(fridge);
   addBox('Geladeira',[1.12,2.55,.92],[0,1.28,0],steel,fridge);
   const fridgeDoorPivot=new THREE.Group();fridgeDoorPivot.position.set(-.53,1.28,.49);fridge.add(fridgeDoorPivot);
   const fridgeDoor=new THREE.Mesh(new THREE.BoxGeometry(1.04,2.48,.09),mat(0xcbd2ce,.22,.62));fridgeDoor.position.set(.52,0,.035);fridgeDoor.castShadow=true;fridgeDoor.userData.kind='fridgeDoor';fridgeDoor.userData.label='Geladeira';fridgeDoor.userData.pivot=fridgeDoorPivot;fridgeDoor.userData.open=false;fridgeDoorPivot.add(fridgeDoor);
   addBox('Puxador da geladeira',[.045,.75,.07],[.93,0,.12],dark,fridgeDoorPivot);
   for(let shelf=0;shelf<3;shelf++){
    addBox('Prateleira interna',[.88,.045,.66],[0,.55+shelf*.62,-.05],stone,fridge);
    for(let item=0;item<3;item++){
     const colors=[0x8ba85e,0xd2a45d,0xb65d49,0x8eb8a3,0xe0d7bd];
     const food=addBox('Alimento na geladeira',[.16,.2,.16],[-.29+item*.28,.68+shelf*.62,.08],mat(colors[(item+shelf)%colors.length]),fridge);
     food.rotation.y=(item-shelf)*.12;
    }
   }
   // O puxador acompanha a porta articulada ao abrir e fechar.
   // Despensa lateral com prateleiras e mantimentos.
   addBox('Despensa',[1.25,2.1,.7],[-3.55,1.08,-2.7],wood);
   for(let i=0;i<3;i++){addBox('Prateleira da despensa',[1.1,.07,.62],[-3.55,.48+i*.58,-2.31],stone);for(let j=0;j<3;j++)addBox('Mantimento na despensa',[.18,.35,.2],[-3.9+j*.34,.7+i*.58,-2.28],mat([0xc9a86e,0x9caa76,0xb78c65][j]))}
   // Ilha, mesa e cadeiras.
   addBox('Mesa de jantar',[2.6,.16,1.45],[0,.94,.55],wood);
   for(const x of [-1.05,1.05])for(const z of [-.35,1.45]){addBox('Cadeira',[.62,.12,.62],[x,.52,z],cabinetMat);addBox('Encosto da cadeira',[.62,.85,.12],[x,.94,z-.25],cabinetMat)}
   // Pia, torneira e cooktop.
   addBox('Pia',[1.0,.12,.65],[-1.65,1.14,-3.32],dark);
   const tap=addBox('Torneira',[.08,.42,.08],[-1.65,1.4,-3.65],steel);
   addBox('Cooktop',[1.1,.045,.68],[1.0,1.15,-3.35],dark);
   for(let i=0;i<4;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.17,.025,8,24),dark);ring.rotation.x=Math.PI/2;ring.position.set(.72+(i%2)*.55,1.19,-3.53+Math.floor(i/2)*.36);scene.add(ring)}
   // Pendentes e interruptor.
   const bulbs=[];for(const x of [-1.3,1.3]){const cord=addBox('Pendente',[.025,.8,.025],[x,3.65,.4],dark);const bulb=new THREE.PointLight(0xffd49a,18,7);bulb.position.set(x,3.2,.4);scene.add(bulb);bulbs.push(bulb);const shade=new THREE.Mesh(new THREE.SphereGeometry(.24,20,12),mat(0xd8bd8d,.3,.2));shade.position.set(x,3.05,.4);scene.add(shade)}
   const interactables=[];scene.traverse(o=>{if(o.isMesh&&o.userData.label)interactables.push(o)});
   const info=overlay.querySelector('.af3d-object-info');let selected=null,lightsOn=true;
   const say=(title,desc)=>{info.querySelector('b').textContent=title;info.querySelector('span').textContent=desc};
   const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
   let down=null,dragging=false,yaw=.62,pitch=.28,radius=10.2;
   const target=new THREE.Vector3(0,1.3,-.3);
   const updateCamera=()=>{camera.position.set(target.x+Math.sin(yaw)*radius*Math.cos(pitch),target.y+Math.sin(pitch)*radius,target.z+Math.cos(yaw)*radius*Math.cos(pitch));camera.lookAt(target)};
   updateCamera();
   const onDown=e=>{down={x:e.clientX,y:e.clientY};dragging=false;canvas.setPointerCapture?.(e.pointerId)};
   const onMove=e=>{if(!down||pinchStart)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>5)dragging=true;if(dragging){yaw-=dx*.006;pitch=Math.max(-.05,Math.min(.8,pitch+dy*.004));down={x:e.clientX,y:e.clientY};updateCamera()}};
   const onWheel=e=>{e.preventDefault();radius=Math.max(6.4,Math.min(15,radius+e.deltaY*.009));updateCamera()};
   let pinchStart=null;
   const onTouchStart=e=>{if(e.touches.length===2)pinchStart={distance:Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY),radius}};
   const onTouchMove=e=>{if(e.touches.length===2&&pinchStart){const distance=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);radius=Math.max(6.4,Math.min(15,pinchStart.radius*pinchStart.distance/distance));updateCamera();e.preventDefault()}};
   const onTouchEnd=()=>{pinchStart=null};
   const onUp=e=>{if(!down)return;const moved=dragging;down=null;if(moved)return;const rect=canvas.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(interactables,false)[0];if(!hit){say('Cozinha viva','Arraste para girar a câmera, use +/− para aproximar ou toque em um objeto.');return}const obj=hit.object,kind=obj.userData.kind,label=obj.userData.label||'Objeto da cozinha';selected=obj;
    if(kind==='fridgeDoor'){const p=obj.userData.pivot;obj.userData.open=!obj.userData.open;p.userData.targetY=obj.userData.open?-1.45:0;say('Geladeira',obj.userData.open?'Porta aberta. Explore os alimentos e as três prateleiras internas.':'Porta fechada. Toque novamente para abrir.')}
    else if(kind==='cabinetDoor'){const p=obj.userData.pivot;obj.userData.open=!obj.userData.open;p.userData.targetY=obj.userData.open?-1.1:0;say('Armário',obj.userData.open?'Porta do armário aberta.':'Porta do armário fechada.')}
    else if(label==='Mesa de jantar')say('Mesa de jantar','Superfície central para refeições e organização.');
    else if(label==='Cadeira')say('Cadeira','Assento da área de refeições.');
    else if(label.includes('Despensa')||label.includes('Mantimento'))say('Despensa','Prateleiras e mantimentos organizados por categoria.');
    else if(label==='Pendente')say('Iluminação','Use o controle abaixo para acender ou apagar as luzes.');
    else say(label,'Objeto interativo do ambiente.');};
   canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',()=>down=null);canvas.addEventListener('wheel',onWheel,{passive:false});canvas.addEventListener('touchstart',onTouchStart,{passive:true});canvas.addEventListener('touchmove',onTouchMove,{passive:false});canvas.addEventListener('touchend',onTouchEnd,{passive:true});
   overlay.querySelector('[data-action="light"]').addEventListener('click',()=>{lightsOn=!lightsOn;key.intensity=lightsOn?3.1:.18;fill.intensity=lightsOn?28:1;bulbs.forEach(b=>b.intensity=lightsOn?18:0);scene.background.set(lightsOn?0x17211c:0x070a08);say('Iluminação',lightsOn?'Luzes acesas.':'Luzes apagadas.')});
   overlay.querySelector('[data-action="zoom-in"]').addEventListener('click',()=>{radius=Math.max(6.4,radius-1);updateCamera()});
   overlay.querySelector('[data-action="zoom-out"]').addEventListener('click',()=>{radius=Math.min(15,radius+1);updateCamera()});
   overlay.querySelector('[data-action="reset"]').addEventListener('click',()=>{yaw=.62;pitch=.28;radius=10.2;updateCamera();say('Visão inicial','Você voltou ao enquadramento principal da cozinha.')});
   const focusTargets={fridge:new THREE.Vector3(3.7,1.2,-2.8),pantry:new THREE.Vector3(-3.55,1.1,-2.5),dining:new THREE.Vector3(0,1,.55),cabinets:new THREE.Vector3(0,2.4,-3.8)};
   overlay.querySelectorAll('[data-focus]').forEach(button=>button.addEventListener('click',()=>{target.copy(focusTargets[button.dataset.focus]);radius=7.2;yaw=.62;pitch=.18;updateCamera();say(button.textContent,'Câmera direcionada para esta área. Toque nos objetos para interagir.')})); 
   const walk=(direction)=>{const step=.48;if(direction==='forward')target.z=Math.max(-2.1,target.z-step);if(direction==='back')target.z=Math.min(2.4,target.z+step);if(direction==='left')target.x=Math.max(-3.7,target.x-step);if(direction==='right')target.x=Math.min(3.7,target.x+step);updateCamera();say('Explorando a cozinha','Você pode avançar pelo ambiente e tocar nos móveis e objetos para interagir.')};
   overlay.querySelectorAll('[data-walk]').forEach(button=>button.addEventListener('click',()=>walk(button.dataset.walk)));
   const onKey=e=>{if(['ArrowUp','w','W'].includes(e.key)){e.preventDefault();walk('forward')}if(['ArrowDown','s','S'].includes(e.key)){e.preventDefault();walk('back')}if(['ArrowLeft','a','A'].includes(e.key)){e.preventDefault();walk('left')}if(['ArrowRight','d','D'].includes(e.key)){e.preventDefault();walk('right')}};
   document.addEventListener('keydown',onKey);
   const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)};
   const ro=new ResizeObserver(resize);ro.observe(stage);resize();loading.remove();
   let raf=0;const render=()=>{if(!overlay.isConnected){cancelAnimationFrame(raf);ro.disconnect();renderer.dispose();return}
    scene.traverse(object=>{if(object.userData?.targetY!==undefined)object.rotation.y+=(object.userData.targetY-object.rotation.y)*.16});
    renderer.render(scene,camera);raf=requestAnimationFrame(render)};render();
   activeCleanup=()=>{cancelAnimationFrame(raf);ro.disconnect();renderer.dispose();canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('wheel',onWheel);canvas.removeEventListener('touchstart',onTouchStart);canvas.removeEventListener('touchmove',onTouchMove);canvas.removeEventListener('touchend',onTouchEnd);document.removeEventListener('keydown',esc);overlay.remove();document.body.classList.remove('af3d-open')};
  }catch(error){
   overlay.querySelector('.af3d-loading').textContent='Não foi possível carregar a cena 3D. Verifique a conexão e tente novamente.';
   console.error('[Alimente Fácil 3D]',error);
  }
 });
})();