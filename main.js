import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';

const $ = (id) => document.getElementById(id);
const loading = $('loading');
const startScreen = $('start-screen');
const hud = $('hud');
const loadStatus = $('load-status');
const errorScreen = $('error');
const errorText = $('error-text');

let scene, camera, renderer, clock;
let player, sarah, car, carWheels = [];
let inCar = false, started = false, paused = false, alternateCamera = false;
let speed = 0, heading = 0;
const keys = {forward:false,back:false,left:false,right:false};
const world = new THREE.Group();
const colliders = [];
const cityBlocks = [];
const raycaster = new THREE.Raycaster();
const touchStart = new Map();
const saved = JSON.parse(localStorage.getItem('streetEchoSave') || '{}');

function showError(message) {
  errorText.textContent = message;
  errorScreen.classList.remove('hidden');
  loading.classList.add('hidden');
}

function mat(color, roughness=0.86, metalness=0.02) {
  return new THREE.MeshStandardMaterial({color, roughness, metalness});
}
function box(parent, name, x,y,z, sx,sy,sz, material, cast=true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), material);
  mesh.name=name; mesh.position.set(x,y,z); mesh.castShadow=cast; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function cylinder(parent,x,y,z,r1,r2,h,material,segments=12) {
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material);
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function makeCar(color=0x1c2632, scale=1) {
  const group=new THREE.Group();
  const bodyMat=mat(color,.28,.5), glass= new THREE.MeshStandardMaterial({color:0x182d3a,metalness:.55,roughness:.18}), tire=mat(0x101318,.98), rim=mat(0xa6b4bc,.3,.8), light=mat(0xe7f8ff,.25,.25);
  box(group,'car-body',0,.65,0,2.05,.62,4.1,bodyMat);
  box(group,'car-roof',0,1.15,-.15,1.62,.62,1.9,bodyMat);
  box(group,'front-windshield',0,1.28,.86,1.48,.42,.06,glass);
  box(group,'rear-windshield',0,1.28,-1.12,1.45,.42,.06,glass);
  box(group,'hood',0,.9,1.36,1.75,.15,1.05,bodyMat);
  box(group,'front-light-l',-.72,.76,2.07,.42,.12,.05,light);
  box(group,'front-light-r',.72,.76,2.07,.42,.12,.05,light);
  const wheelPositions=[[-1,.4,1.3],[1,.4,1.3],[-1,.4,-1.3],[1,.4,-1.3]];
  for(const [x,y,z] of wheelPositions){
    const w=new THREE.Mesh(new THREE.CylinderGeometry(.39,.39,.22,16),tire);
    w.rotation.z=Math.PI/2;w.position.set(x,y,z);w.castShadow=true;group.add(w);carWheels.push(w);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.23,12),rim);hub.rotation.z=Math.PI/2;hub.position.copy(w.position);group.add(hub);
  }
  group.scale.setScalar(scale);
  return group;
}
function makePerson(shirtColor, pantsColor=0x182333) {
  const g=new THREE.Group();
  const skin=mat(0x8e5c3d), shirt=mat(shirtColor), pants=mat(pantsColor), shoes=mat(0x151719);
  const torso=box(g,'torso',0,1.2,0,.58,.75,.3,shirt);
  cylinder(g,0,1.78,0,.18,.18,.23,skin,12);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.22,14,12),skin);head.position.y=1.98;head.castShadow=true;g.add(head);
  const hair=mat(0x171411);const hairMesh=new THREE.Mesh(new THREE.SphereGeometry(.225,12,8,0,Math.PI*2,0,Math.PI*.55),hair);hairMesh.position.y=2.05;g.add(hairMesh);
  const legs=[];
  for(const x of [-.17,.17]){const leg=box(g,'leg',x,.62,0,.21,.62,.23,pants);legs.push(leg);box(g,'shoe',x,.24,.07,.23,.14,.37,shoes);}
  for(const x of [-.39,.39])box(g,'arm',x,1.2,0,.18,.62,.19,shirt);
  g.userData.legs=legs;g.userData.torso=torso;
  return g;
}
function addBuilding(x,z,w,d,h,seed=0) {
  const colors=[0xb9aa91,0xd0c4ad,0x9ba6a8,0xd8d0c0,0xa4b4b7,0xe2d6c1,0xb1a18c];
  const base=colors[Math.abs(seed)%colors.length];
  const building=new THREE.Group();building.position.set(x,0,z);
  box(building,'building',0,h/2,0,w,h,d,mat(base),true);
  const floors=Math.max(2,Math.floor(h/1.5)), cols=Math.max(2,Math.floor(w/1.25));
  const winMat=new THREE.MeshStandardMaterial({color:0x3e7182,roughness:.28,metalness:.16,emissive:0x101c22});
  const balconyMat=mat(0x756e63,.8,.12);
  for(let floor=1;floor<floors;floor++){
    const yy=floor*(h/floors);
    for(let side of [-1,1]){
      for(let c=0;c<cols;c++){
        const xx=-w/2+(c+.5)*w/cols;
        box(building,'window',xx,yy,side*(d/2+.012),Math.min(.43,w/cols*.48),.48,.025,winMat,false);
      }
    }
    for(let side of [-1,1]){
      for(let c=0;c<Math.max(1,Math.floor(d/1.2));c++){
        const zz=-d/2+(c+.5)*d/Math.max(1,Math.floor(d/1.2));
        box(building,'side-window',side*(w/2+.012),yy,zz,.025,.44,.35,winMat,false);
      }
    }
    if(seed%3===0 && floor<h/1.5-1){
      box(building,'balcony',0,yy-.24,d/2+.18,w*.78,.07,.35,balconyMat,false);
    }
  }
  box(building,'roof-edge',0,h+.06,0,w+.08,.12,d+.08,mat(0x877e70),false);
  world.add(building);
  colliders.push({x,z,w:w+.35,d:d+.35});
  cityBlocks.push(building);
}
function addTree(x,z) {
  const trunk=cylinder(world,x,.75,z,.12,.18,1.5,mat(0x6b4a31),8);
  const crown=new THREE.Mesh(new THREE.SphereGeometry(.8,10,8),mat(0x2b7651));
  crown.position.set(x,1.85,z);crown.castShadow=true;world.add(crown);
}
function createCity() {
  scene.background=new THREE.Color(0x8bc4e4);
  scene.fog=new THREE.Fog(0x9bc8de,85,240);
  const hemi=new THREE.HemisphereLight(0xe0f4ff,0x8e8878,2.0);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff0d7,3.1);sun.position.set(-45,80,35);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-90;sun.shadow.camera.right=90;sun.shadow.camera.top=90;sun.shadow.camera.bottom=-90;scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(400,400),mat(0xb7b4a3));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;world.add(ground);
  // A grid of streets and Mediterranean blocks.
  const roadMat=mat(0x333a40,.95), sidewalkMat=mat(0xc7c2b5), lineMat=mat(0xe8e0c5);
  const roadWidth=10, block=28, step=block+roadWidth;
  for(let k=-5;k<=5;k++){
    const p=k*step;
    const road1=new THREE.Mesh(new THREE.PlaneGeometry(roadWidth,360),roadMat);road1.rotation.x=-Math.PI/2;road1.position.set(p,.012,0);world.add(road1);
    const road2=new THREE.Mesh(new THREE.PlaneGeometry(360,roadWidth),roadMat);road2.rotation.x=-Math.PI/2;road2.position.set(0,.014,p);world.add(road2);
    const dashMat=mat(0xe5d9a4);
    for(let q=-17;q<=17;q+=2){
      box(world,'road-dash',p,.03,q*5,.13,.015,2.3,dashMat,false);
      box(world,'road-dash',q*5,.03,p,2.3,.015,.13,dashMat,false);
    }
  }
  let seed=1;
  for(let gx=-4;gx<=4;gx++){
    for(let gz=-4;gz<=4;gz++){
      if(Math.abs(gx)<=1&&Math.abs(gz)<=1)continue;
      const cx=gx*step, cz=gz*step;
      const w=19+(seed%7),d=18+((seed*3)%7),h=9+((seed*7)%25);
      addBuilding(cx,cz,w,d,h,seed++);
      if(seed%4===0){addTree(cx-w/2-2,cz+d/2+2);addTree(cx+w/2+2,cz-d/2-2);}
    }
  }
  // Central plaza and a recognizable stadium landmark in the distance.
  const plaza=new THREE.Mesh(new THREE.PlaneGeometry(34,34),mat(0xd5c9ae));plaza.rotation.x=-Math.PI/2;plaza.position.set(0,.025,0);world.add(plaza);
  for(let i=0;i<8;i++)addTree(Math.cos(i*Math.PI/4)*13,Math.sin(i*Math.PI/4)*13);
  const stadium=new THREE.Group();stadium.position.set(72,0,-78);
  const outer=new THREE.Mesh(new THREE.CylinderGeometry(18,20,9,32,1,true),mat(0x8a989e,.7,.2));outer.position.y=4.5;stadium.add(outer);
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(14,17,3,32,1,true),mat(0x465c75));bowl.position.y=5.7;stadium.add(bowl);
  const field=new THREE.Mesh(new THREE.PlaneGeometry(24,13),mat(0x2c8a4d));field.rotation.x=-Math.PI/2;field.position.y=7.25;stadium.add(field);
  for(let i=0;i<32;i++){const beam=box(stadium,'stadium-rib',Math.cos(i*Math.PI/16)*19,8.5,Math.sin(i*Math.PI/16)*19,.3,8,.3,mat(0xc5d1d5));beam.rotation.y=-i*Math.PI/16;}
  world.add(stadium);
  const sign=box(stadium,'stadium-sign',0,10,20,15,1,.3,mat(0x173c68));sign.rotation.y=0;
  const water=new THREE.Mesh(new THREE.PlaneGeometry(100,65),mat(0x277d9b,.25,.35));water.rotation.x=-Math.PI/2;water.position.set(-115,.02,45);world.add(water);
  scene.add(world);
}
function buildScene() {
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,500);
  renderer=new THREE.WebGLRenderer({antialias:innerWidth>700,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  document.body.appendChild(renderer.domElement);
  clock=new THREE.Clock();
  createCity();
  player=makePerson(0x192d4b);player.position.set(1,0,1);scene.add(player);
  sarah=makePerson(0x9b244a,0x171820);sarah.position.set(5,0,2);scene.add(sarah);
  const carGroup=makeCar(0xc4d0d5);car=carGroup;car.position.set(-5,0,2);car.rotation.y=Math.PI/2;scene.add(car);
  camera.position.set(0,5,-8);
  window.addEventListener('resize',onResize);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame();});
  setupControls();
  loadStatus.textContent='Ville prête.';
  setTimeout(()=>{loading.classList.add('hidden');startScreen.classList.remove('hidden');},250);
}
function onResize(){if(!camera||!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));}
function setupControls(){
  document.querySelectorAll('[data-key]').forEach(btn=>{
    const key=btn.dataset.key;
    const on=e=>{e.preventDefault();keys[key]=true;btn.setPointerCapture?.(e.pointerId);};
    const off=e=>{e.preventDefault();keys[key]=false;};
    btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('lostpointercapture',off);
  });
  window.addEventListener('keydown',e=>{if(e.code==='KeyW'||e.code==='ArrowUp')keys.forward=true;if(e.code==='KeyS'||e.code==='ArrowDown')keys.back=true;if(e.code==='KeyA'||e.code==='ArrowLeft')keys.left=true;if(e.code==='KeyD'||e.code==='ArrowRight')keys.right=true;});
  window.addEventListener('keyup',e=>{if(e.code==='KeyW'||e.code==='ArrowUp')keys.forward=false;if(e.code==='KeyS'||e.code==='ArrowDown')keys.back=false;if(e.code==='KeyA'||e.code==='ArrowLeft')keys.left=false;if(e.code==='KeyD'||e.code==='ArrowRight')keys.right=false;});
  $('play-btn').addEventListener('click',()=>{started=true;paused=false;startScreen.classList.add('hidden');hud.classList.remove('hidden');if(saved.x!==undefined){player.position.set(saved.x,0,saved.z);heading=saved.heading||0;player.rotation.y=heading;}toast('Bienvenue à Barcelone. Explore la ville !');});
  $('resume-btn').addEventListener('click',()=>{$('play-btn').click();});
  $('pause-btn').addEventListener('click',()=>{paused=true;startScreen.classList.remove('hidden');hud.classList.add('hidden');saveGame();});
  $('interact-btn').addEventListener('click',toggleVehicle);
  $('change-view-btn').addEventListener('click',()=>{alternateCamera=!alternateCamera;toast(alternateCamera?'Caméra éloignée':'Caméra rapprochée');});
  // Desktop keyboard interaction
  window.addEventListener('keydown',e=>{if(e.code==='KeyE')toggleVehicle();if(e.code==='KeyC')alternateCamera=!alternateCamera;if(e.code==='Escape'&&started){paused=!paused;startScreen.classList.toggle('hidden',!paused);hud.classList.toggle('hidden',paused);}});
}
function toast(message){const el=$('toast');el.textContent=message;el.style.opacity='1';clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.style.opacity='0',2200);}
function toggleVehicle(){
  if(!started)return;
  if(!inCar&&player.position.distanceTo(car.position)<4.2){inCar=true;player.visible=false;$('interact-btn').innerHTML='SORTIR<br>VOITURE';$('vehicle-label').textContent='TESLA · MODE CONDUITE';toast('S.A.R.A.H. : Bonjour. Prête à rouler.');}
  else if(inCar){inCar=false;player.visible=true;player.position.copy(car.position).add(new THREE.Vector3(2,0,0));$('interact-btn').innerHTML='ENTRER<br>VOITURE';$('vehicle-label').textContent='À PIED';toast('Tu es sorti du véhicule.');}
  else toast('Approche-toi de la Tesla pour entrer.');
}
function collides(x,z,r=1){return colliders.some(c=>Math.abs(x-c.x)<c.w/2+r&&Math.abs(z-c.z)<c.d/2+r);}
function moveActor(actor,dx,dz,r=0.45){
  const nx=actor.position.x+dx,nz=actor.position.z+dz;
  if(!collides(nx,actor.position.z,r))actor.position.x=nx;
  if(!collides(actor.position.x,nz,r))actor.position.z=nz;
}
function update(dt){
  if(!started||paused)return;
  const f=(keys.forward?1:0)-(keys.back?1:0);
  const t=(keys.right?1:0)-(keys.left?1:0);
  if(inCar){
    speed+=(f*17-speed*2.1)*dt;speed=THREE.MathUtils.clamp(speed,-8,25);
    car.rotation.y-=t*dt*(0.8+Math.abs(speed)*.035);
    const dir=new THREE.Vector3(Math.sin(car.rotation.y),0,Math.cos(car.rotation.y));
    const old=car.position.clone();moveActor(car,dir.x*speed*dt,dir.z*speed*dt,.9);
    if(old.distanceTo(car.position)<Math.abs(speed*dt)*.3)speed=0;
    carWheels.forEach(w=>w.rotation.x+=speed*dt*1.5);
    player.position.copy(car.position);
  }else{
    const moveSpeed=7;
    if(f||t){heading=Math.atan2(t,f);const angle=heading+camera.rotation.y;const dx=(Math.sin(angle)*f+Math.cos(angle)*t)*moveSpeed*dt;const dz=(Math.cos(angle)*f-Math.sin(angle)*t)*moveSpeed*dt;moveActor(player,dx,dz,.42);player.rotation.y=Math.atan2(dx,dz);player.userData.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(performance.now()*.012+i*Math.PI)*.45);}
  }
  // Sarah gently follows the player when nearby.
  if(!inCar){
    const dist=sarah.position.distanceTo(player.position);
    if(dist>3.1){const v=player.position.clone().sub(sarah.position).normalize();sarah.position.addScaledVector(v,Math.min(dt*2.2,dist-2.2));sarah.rotation.y=Math.atan2(v.x,v.z);}
  }
  const target=inCar?car:player;
  const back=alternateCamera?(inCar?13:11):(inCar?8:6);
  const up=alternateCamera?6:3.4;
  const forward=new THREE.Vector3(Math.sin(target.rotation.y),0,Math.cos(target.rotation.y));
  const desired=target.position.clone().add(new THREE.Vector3(0,up,0)).addScaledVector(forward,-back);
  camera.position.lerp(desired,1-Math.exp(-4*dt));
  camera.lookAt(target.position.clone().add(new THREE.Vector3(0,inCar?1.1:1.4,0)));
  if(target.position.distanceTo(new THREE.Vector3(72,0,-78))<24){$('mission-text').textContent='Tu as rejoint le stade de Barcelone. Explore les alentours.';}else{$('mission-text').textContent='Explore la ville. Approche-toi de la Tesla pour la conduire.';}
  if(Math.random()<.006)saveGame();
}
function saveGame(){
  if(!player)return;
  const p=inCar?car.position:player.position;
  localStorage.setItem('streetEchoSave',JSON.stringify({x:p.x,z:p.z,heading:inCar?car.rotation.y:player.rotation.y}));
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);update(dt);renderer.render(scene,camera);}
async function init(){
  try{buildScene();animate();if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});}
  catch(err){console.error(err);showError('Erreur : '+(err?.message||'initialisation 3D'));}
}
init();
