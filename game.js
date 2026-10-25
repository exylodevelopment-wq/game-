'use strict';
(() => {
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const TILE = 32, SIZE = 384, WORLD = TILE * SIZE, SAVE_KEY = 'ultimul-rasarit-v4';
const colors = { grass:'#727259', forest:'#545a44', water:'#304d55', road:'#62625a', sand:'#808068' };
let seed = 69421, terrain, objects = [], zombies = [], bullets = [], particles = [], floaters = [], camps = [], tiles = [],
 state = 'title', hasRun = false, time = 480, day = 1, elapsed = 0, kills = 0, looted = 0, harvested = 0, weapon = 'fists',
 player, bag, cam = { x:0, y:0 }, keys = {}, pointer = {x:0,y:0,active:false}, stick = {x:0,y:0},
 shooting = false, shootTimer = 0, useTimer = 0, reloadTimer = 0, spawnTimer = 0, saveTimer = 0, uiTimer = 0,
 last = 0, frame = 0, sound = false, audio, walkPhase = 0, shake = 0, goalDone = new Set(), mapReturnState = 'playing', helpReturnState = 'title';
let touchFire=false,actionHeld=false,sites=[],insideHouse=null,lastRefusal=0,search=null,lootTarget=null,spawnPoint=null,expedition=Expedition.create();
const itemDefs=SurvivalLoot.items;
const names=Object.fromEntries(Object.entries(itemDefs).map(([k,v])=>[k,v.name]));
const weapons=['fists',...Object.keys(itemDefs).filter(k=>itemDefs[k].type==='weapon')];
const weaponNames={fists:'Mâini goale',...names};
const magazine=Object.fromEntries(Object.entries(itemDefs).filter(([,v])=>v.mag).map(([k,v])=>[k,v.mag]));
function ammoKey(){return itemDefs[weapon]?.ammo||'ammo';}
const recipes=[{id:'med',name:'Bandaj',cost:{cloth:2}},{id:'camp',name:'Foc de tabără',cost:{wood:5,stone:3,matches:1}},{id:'knife',name:'Cuțit improvizat',cost:{scrap:3,wood:1}},{id:'axe',name:'Topor improvizat',cost:{scrap:5,wood:3,rope:1}},{id:'pickaxe',name:'Târnăcop',cost:{scrap:5,wood:3}},{id:'ammo',name:'12 cartușe 9 mm',cost:{scrap:3,stone:1}}];
function canAct(){return state==='playing'||state==='inventory';}
function hash(x,y,n=0) { let a = Math.imul(x + seed + n*377,374761393) ^ Math.imul(y+seed,668265263); a = Math.imul(a ^ a>>>13,1274126177); return ((a ^ a>>>16)>>>0)/4294967296; }
function rand(a,b) {return a+Math.random()*(b-a);}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.floor(x),Math.floor(y),w,h);}
function noise(x,y) { const a=Math.floor(x/12), b=Math.floor(y/12), fx=x/12-a,fy=y/12-b; const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy); return (hash(a,b)*(1-sx)+hash(a+1,b)*sx)*(1-sy)+(hash(a,b+1)*(1-sx)+hash(a+1,b+1)*sx)*sy; }
function tileAt(x,y){if(x<0||y<0||x>=SIZE||y>=SIZE)return 2;return terrain[Math.floor(y)*SIZE+Math.floor(x)];}
function generate(){zombies=[];const world=SurvivalWorld.generate(seed,SIZE);terrain=world.terrain;objects=world.objects;sites=world.sites;spawnPoint=world.spawn;insideHouse=null;rebuildBuckets();makeTiles();}
let buckets=new Map();
function bucketKey(x,y){return Math.floor(x/192)+','+Math.floor(y/192);}
function rebuildBuckets(){buckets=new Map();for(const o of objects){let k=bucketKey(o.x,o.y);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(o);}}
function nearObjects(x,y,r=100){const out=[];for(let yy=Math.floor((y-r)/192);yy<=Math.floor((y+r)/192);yy++)for(let xx=Math.floor((x-r)/192);xx<=Math.floor((x+r)/192);xx++){const list=buckets.get(xx+','+yy);if(list)out.push(...list);}return out;}
function makeTiles(){tiles=GameArt.textures;}
function reset(newSeed=true){
 if(newSeed)seed=Math.floor(Math.random()*1000000);bag=Object.fromEntries(Object.keys(names).map(k=>[k,0]));
 player={x:0,y:0,hp:100,hunger:100,thirst:100,stamina:100,ammo:0,rifleAmmo:0,shotgunAmmo:0,angle:Math.PI/2,invuln:0,moving:false,lightOn:false,lightTime:0};
 expedition=Expedition.create();time=465;day=1;elapsed=kills=looted=harvested=0;weapon='fists';walkPhase=0;search=lootTarget=null;reloadTimer=shootTimer=spawnTimer=saveTimer=0;goalDone=new Set();bullets=[];particles=[];floaters=[];
 generate();player.x=spawnPoint.x;player.y=spawnPoint.y;for(let i=0;i<13;i++)spawnZombie(330+i*6);updateUI();
}
function startGame(load=false){if(load){if(!loadGame())return;}else reset();hasRun=true;state='playing';saveGame();document.querySelectorAll('.overlay').forEach(e=>e.hidden=true);document.body.classList.remove('bag-open');canvas.focus({preventScroll:true});toast('Nu ai echipament. Cercetează așezarea. Unele încăperi sunt goale.');updateUI();}
function spawnZombie(min=260){for(let tries=0;tries<40;tries++){const a=rand(0,Math.PI*2),r=rand(min,min+300),x=player.x+Math.cos(a)*r,y=player.y+Math.sin(a)*r;if(x<30||y<30||x>WORLD-30||y>WORLD-30||blocked(x,y)||objects.some(o=>o.type==='house'&&inHouse(x,y,o)))continue;const variant=(zombies.length+Math.floor(rand(0,9)))%9,role=window.ClassicActors?.variantKinds[variant]||'normal',hp=role==='army'?6:3;zombies.push({x,y,variant,role,hp,maxHp:hp,angle:0,phase:0,moving:false,attack:0,speed:role==='fast'?rand(25,30):rand(14,21),aware:false});break;}}
function inHouse(x,y,o,margin=0){return SurvivalWorld.contains(o,x,y,margin);}
function currentHouse(x=player.x,y=player.y){return nearObjects(x,y,220).find(o=>o.type==='house'&&inHouse(x,y,o))||null;}
function blocked(x,y,radius=3){
 if(x<12||y<12||x>WORLD-12||y>WORLD-12||tileAt(x/TILE,y/TILE)===2)return true;
 for(const o of nearObjects(x,y,220)){
  if(o.removed)continue;
  if(o.type==='tree'&&Math.abs(x-o.x)<5+radius&&Math.abs(y-o.y)<3+radius)return true;
  if(o.type==='rock'&&Math.abs(x-o.x)<8+radius&&Math.abs(y-o.y)<4+radius)return true;
  if(o.type==='prop'&&o.solid&&Math.abs(x-o.x)<o.w/2+radius&&Math.abs(y-o.y)<o.h/2+radius)return true;
  if(o.type==='house'&&SurvivalWorld.blocksBuilding(o,x,y,radius))return true;
 }return false;
}
function moveEntity(e,dx,dy){if(!blocked(e.x+dx,e.y))e.x+=dx;if(!blocked(e.x,e.y+dy))e.y+=dy;}
function toast(message,bad=false){const el=document.createElement('div');el.className='toast'+(bad?' bad':'');el.textContent=message;$('toasts').append(el);setTimeout(()=>el.remove(),3500);while($('toasts').children.length>4)$('toasts').firstChild.remove();}
function tone(freq=200,duration=.08,type='square',volume=.025){if(!sound)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();const a=audio.createOscillator(),g=audio.createGain();a.type=type;a.frequency.setValueAtTime(freq,audio.currentTime);a.frequency.exponentialRampToValueAtTime(Math.max(20,freq/2),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);a.connect(g);g.connect(audio.destination);a.start();a.stop(audio.currentTime+duration);}catch{}}
function addParticle(x,y,color,n=6){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-24,24),vy:rand(-24,24),life:rand(.2,.6),color});}
function floater(x,y,text,color='#d4dfa7'){floaters.push({x,y,text,color,life:1.3});}
function closestInteraction(){
 let best=null,bd=30;const house=currentHouse();
 for(const o of nearObjects(player.x,player.y,220)){
  if(o.removed||o.open||['stump','campfire','prop','house'].includes(o.type))continue;
  if(o.house!==undefined&&o.house!==house?.id)continue;
  if(house&&o.house!==house.id)continue;
  const d=distance(player,o);if(d<bd){best=o;bd=d;}
 }
 if(!best)for(const o of nearObjects(player.x,player.y,220))if(o.type==='house'&&Math.hypot(player.x-o.doorX,player.y-o.doorY)<26)return{type:'door',x:o.doorX,y:o.doorY,house:o};
 if(!best&&!house)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if(tileAt(player.x/TILE+x,player.y/TILE+y)===2)return{type:'water',x:player.x,y:player.y};
 return best;
}
function interact(){
 if(state!=='playing'||useTimer>0||search)return;const o=closestInteraction();
 if(!o){toast('Apropie-te de un dulap, corp sau resursă.');return;}
 if(o.type==='relay'){expedition.discovered=true;clearInput();player.moving=false;walkPhase=0;state='objective';$('relayOverlay').hidden=false;renderRelay();saveGame();return;}
 if(o.type==='extract'){if(!Expedition.extract(expedition)){toast(expedition.completed?'Evacuarea a fost deja confirmată.':'Ai nevoie de un semnal radio confirmat.',true);return;}clearInput();state='won';$('victoryOverlay').hidden=false;$('victoryStats').textContent='Ziua '+day+' · '+kills+' zombi eliminați · '+looted+' obiecte recuperate';saveGame();return;}
 if(o.type==='door'){const h=o.house,exiting=currentHouse()?.id===h.id;player.x=h.doorX;player.y=h.doorY+(exiting?12:-14);insideHouse=currentHouse()?.id??null;walkPhase=0;player.moving=false;useTimer=.4;updateUI();return;}
 if(o.type==='container'||o.type==='corpse'){
  if(o.searched){openLoot(o);return;}
  search={id:o.id,progress:0,duration:o.type==='corpse'?1.3:1.1,x:player.x,y:player.y};tone(240,.08,'triangle');updateUI();return;
 }
 useTimer=.5;
 if(o.type==='tree'||o.type==='rock'){
  const tool=o.type==='tree'?'axe':'pickaxe';
  if(!bag[tool]){if(elapsed-lastRefusal>1||!lastRefusal){toast('Ai nevoie de '+names[tool].toLowerCase()+'.',true);lastRefusal=elapsed;}return;}
  o.hp--;harvested++;const k=o.type==='tree'?'wood':'stone';bag[k]++;floater(o.x,o.y-20,'+1 '+names[k]);addParticle(o.x,o.y,o.type==='tree'?'#8b7859':'#9f9f89');if(o.hp<=0)o.removed=true;tone(150,.06);
 }else if(o.type==='branch'||o.type==='looseStone'){const k=o.type==='branch'?'wood':'stone';o.removed=true;bag[k]++;harvested++;toast('+1 '+names[k]);}
 else if(o.type==='berry'){bag.apple++;o.removed=true;toast('+1 Măr sălbatic');}
 else if(o.type==='water'){if(bag.water>=5){toast('Ai suficientă apă.');return;}bag.water++;toast('+1 Apă umplută');tone(600,.1,'sine');}
 updateUI();
}
function openLoot(o){search=null;player.moving=false;walkPhase=0;lootTarget=o;clearInput();state='loot';$('lootOverlay').hidden=false;renderLoot();}
function renderLoot(){
 if(!lootTarget)return;
 $('lootTitle').textContent=lootTarget.type==='corpse'?'Corp cercetat':'Obiecte găsite';
 $('lootSubtitle').textContent=lootTarget.contents.length?'Alege ce iei cu tine.':'Nu ai găsit nimic aici.';
 $('lootItems').innerHTML=lootTarget.contents.map((entry,i)=>`<button class="loot-entry" data-take-index="${i}"><canvas width="32" height="32"></canvas><span>${names[entry.item]}<small>${itemDefs[entry.item].description}</small></span><b>×${entry.amount}</b><em>RIDICĂ</em></button>`).join('');
 $('lootItems').querySelectorAll('button').forEach((button,i)=>{drawItem(button.querySelector('canvas'),lootTarget.contents[i].item);button.onclick=()=>takeLoot(i);});
 $('takeAllBtn').disabled=!lootTarget.contents.length;
}
function takeLoot(index){if(state!=='loot'||!lootTarget)return;const entry=lootTarget.contents[index];if(!entry)return;bag[entry.item]+=entry.amount;looted++;lootTarget.contents.splice(index,1);toast('+'+entry.amount+' '+names[entry.item]);tone(520,.08,'sine');renderLoot();updateUI();saveGame();}
function closeLoot(){if(state!=='loot')return;state='playing';lootTarget=null;$('lootOverlay').hidden=true;updateUI();}
function renderRelay(){
 const req=Expedition.requirements;
 $('relayResources').innerHTML=Object.entries(req).map(([key,n])=>`<div class="relay-resource ${bag[key]>=n?'enough':''}"><span>${names[key]}</span><b>${Math.min(bag[key],n)} / ${n}</b></div>`).join('');
 $('activateRelay').disabled=!Expedition.canRepair(expedition,bag);
 $('activateRelay').textContent=expedition.relayOnline?'STAȚIA ESTE ACTIVĂ':'REPARĂ ȘI PORNEȘTE';
 $('relayDescription').textContent=expedition.rescueReady?'Semnalul a fost recepționat. Mergi la debarcaderul marcat E pe hartă.':expedition.relayOnline?'Transmisie: '+Math.floor(expedition.signalTime)+' / '+Expedition.duration+' secunde. Rămâi lângă stație. Semnalul atrage infectații.':'Recuperează piese din așezări și repară stația. Vei avea nevoie de provizii și o cale de retragere.';
}
function closeRelay(){if(state!=='objective')return;state='playing';$('relayOverlay').hidden=true;updateUI();}
function activateRelay(){if(!Expedition.repair(expedition,bag))return;toast('Stația a pornit. Protejează transmisia timp de 90 de secunde.');closeRelay();saveGame();}
function updateExpedition(dt){
 const relay=objects.find(o=>o.type==='relay');if(!relay)return;
 if(distance(player,relay)<200)expedition.discovered=true;
 const event=Expedition.tick(expedition,dt,distance(player,relay)<180);
 if(event.wave){toast('Zgomotul radioului atrage infectații.',true);for(let i=0;i<3;i++){if(zombies.length>=26)break;spawnZombie(220);if(zombies.length)zombies[zombies.length-1].aware=true;}}
 if(event.ready){toast('Semnal confirmat! Ajungi la debarcaderul E de pe hartă.');saveGame();}
}
function consume(k){
 if(!canAct())return;
 if(!bag[k]){toast('Nu ai '+names[k].toLowerCase()+'.',true);return;}
 if(weapons.includes(k)){weapon=k;reloadTimer=0;toast('Echipat: '+names[k]);updateUI();return;}
 if(k==='camp'){placeCamp();return;}
 if(k==='flashlight'){
  if(player.lightOn){player.lightOn=false;toast('Lanternă oprită.');return;}
  if(!player.lightTime){if(!bag.battery){toast('Ai nevoie de o baterie.',true);return;}bag.battery--;player.lightTime=240;}
  player.lightOn=true;toast('Lanternă aprinsă.');updateUI();return;
 }
 const effects=itemDefs[k].effects;
 if(!effects){toast(itemDefs[k].description);return;}
 if(!Object.entries(effects).some(([stat,n])=>n>0&&player[stat]<100)){toast('Nu ai nevoie acum.');return;}
 bag[k]--;for(const[stat,n]of Object.entries(effects))player[stat]=Math.max(0,Math.min(100,player[stat]+n));toast('Folosit: '+names[k]);tone(680,.1,'sine');updateUI();
}
function craft(i){if(!canAct())return;const r=recipes[i];if(!Object.entries(r.cost).every(([k,n])=>bag[k]>=n))return;for(const[k,n]of Object.entries(r.cost))bag[k]-=n;bag[r.id]+=r.id==='ammo'?12:1;toast('Creat: '+r.name);if(r.id==='camp')toast('Atinge focul din rucsac pentru a-l amplasa.');tone(750,.15,'sine');updateUI();}
function placeCamp(){if(!bag.camp||!canAct())return;if(currentHouse()){toast('Aprinde focul afară.',true);return;}if(zombies.some(z=>distance(z,player)<65)){toast('Prea periculos. Îndepărtează zombii.',true);return;}bag.camp--;const c={id:objects.length,dynamic:true,type:'campfire',x:player.x+18,y:player.y+12};objects.push(c);rebuildBuckets();toast('Foc aprins. Stai aproape pentru vindecare.');updateUI();}
function reload(){if(state!=='playing'||!magazine[weapon]||reloadTimer>0||player[ammoKey()]>=magazine[weapon])return;const key=ammoKey();if(!bag[key]){toast('Nu ai cartușe potrivite.',true);shootTimer=.6;return;}reloadTimer=weapon==='gun'?1.3:1.7;toast('Se reîncarcă…');tone(350,.08);}
function attack(auto=false){
 if(state!=='playing'||shootTimer>0||reloadTimer>0)return;
 let angle=player.angle;const house=currentHouse();const target=zombies.filter(z=>distance(z,player)<(weapon==='rifle'?400:280)&&currentHouse(z.x,z.y)?.id===house?.id).sort((a,b)=>distance(a,player)-distance(b,player))[0];
 if(auto){if(target)angle=Math.atan2(target.y-player.y,target.x-player.x);player.angle=angle;}
 if(magazine[weapon]){
  const key=ammoKey();if(!player[key]){reload();return;}player[key]--;shootTimer=weapon==='gun'?.3:.75;const vx=Math.cos(angle),vy=Math.sin(angle);bullets.push({x:player.x+vx*13,y:player.y-5+vy*13,vx:vx*470,vy:vy*470,life:weapon==='rifle'?1:.75,damage:itemDefs[weapon].damage});shake=1.8;addParticle(player.x+vx*14,player.y-5+vy*14,'#e3cea2',4);tone(110,.08,'sawtooth',.05);for(const z of zombies)if(distance(z,player)<400)z.aware=true;
 }else{
  shootTimer=weapon==='fists'?.55:weapon==='knife'?.32:.55;
  if(target&&distance(target,player)<(weapon==='fists'?27:39)){hurtZombie(target,weapon==='fists'?.5:itemDefs[weapon].damage);addParticle(target.x,target.y,'#945c46');}
  const o=closestInteraction();if((!target||distance(target,player)>40)&&o&&(o.type==='tree'&&weapon==='axe'||o.type==='rock'&&weapon==='pickaxe'))interact();tone(180,.1,'triangle');
 }
 updateUI();
}
function hurtZombie(z,n){
 z.hp-=n;z.aware=true;addParticle(z.x,z.y-6,'#733d34',5);
 if(z.hp<=0){
  kills++;const site=sites.find(a=>z.x>a.x&&z.x<a.x+a.w&&z.y>a.y&&z.y<a.y+a.h),house=currentHouse(z.x,z.y),kind=site?.kind||'road';
  const body={id:objects.length,type:'corpse',dynamic:true,x:z.x,y:z.y,variant:z.variant,kind,searched:false,contents:SurvivalLoot.roll(kind,SurvivalWorld.rng(seed+kills*7919+z.variant),{corpse:true})};
  if(house)body.house=house.id;objects.push(body);rebuildBuckets();zombies.splice(zombies.indexOf(z),1);addParticle(z.x,z.y,'#5e6244',5);
 }
}
function switchWeapon(){if(!canAct())return;const available=weapons.filter(k=>k==='fists'||bag[k]>0);weapon=available[(available.indexOf(weapon)+1)%available.length];reloadTimer=0;toast('Echipat: '+weaponNames[weapon]);updateUI();}
function saveGame(){
 if(!hasRun||!player||player.hp<=0)return;
 try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:4,seed,player,bag,expedition,time,day,elapsed,kills,looted,harvested,weapon,goalDone:[...goalDone],changes:objects.filter(o=>!o.dynamic&&(o.searched||o.open||o.removed||o.hp&&o.hp<4)).map(o=>({id:o.id,searched:o.searched,contents:o.contents,open:o.open,removed:o.removed,hp:o.hp})),extras:objects.filter(o=>o.dynamic)}));$('saveStatus').textContent='Salvare automată activă';}catch{$('saveStatus').textContent='Salvare indisponibilă';}
}
function loadGame(){
 try{
  const data=JSON.parse(localStorage.getItem(SAVE_KEY));if(!data||data.version!==4||!Number.isFinite(data.seed)||!data.player||!data.bag||!Number.isFinite(data.player.x)||data.player.hp<=0)throw Error('Invalid save');
  seed=data.seed;generate();expedition=Expedition.create(data.expedition);player={shotgunAmmo:0,moving:false,lightOn:false,lightTime:0,...data.player};player.moving=false;bag={...Object.fromEntries(Object.keys(names).map(k=>[k,0])),...data.bag};time=data.time;day=data.day;elapsed=data.elapsed;kills=data.kills;looted=data.looted;harvested=data.harvested;weapon=data.weapon;goalDone=new Set(data.goalDone);
  for(const change of data.changes||[])if(objects[change.id])Object.assign(objects[change.id],change);
  for(const extra of data.extras||[])objects.push({...extra,id:objects.length});
  rebuildBuckets();insideHouse=currentHouse()?.id??null;zombies=[];bullets=[];particles=[];floaters=[];search=lootTarget=null;walkPhase=0;reloadTimer=shootTimer=spawnTimer=0;for(let i=0;i<13;i++)spawnZombie(320);updateUI();return true;
 }catch(error){toast('Salvarea nu poate fi încărcată. Începe o lume nouă.',true);return false;}
}
function pause(){if(state==='playing'){clearInput();state='paused';saveGame();$('pauseOverlay').hidden=false;}else if(state==='paused'){state='playing';$('pauseOverlay').hidden=true;updateUI();}}
function showMap(){if(state==='dead'||state==='title'||state==='help'||state==='loot'||state==='objective'||state==='won')return;if(state==='map'){state=mapReturnState;$('mapOverlay').hidden=true;return;}clearInput();mapReturnState=state;state='map';$('mapOverlay').hidden=false;drawMap();}
function help(){if(state==='help'){state=helpReturnState;$('helpOverlay').hidden=true;return;}clearInput();helpReturnState=state;state='help';$('helpOverlay').hidden=false;}
function die(){state='dead';$('deathOverlay').hidden=false;$('deathStats').textContent=`Ai rezistat ${Math.floor(elapsed/60)} min ${Math.floor(elapsed%60)} sec · Ziua ${day}. Zombi eliminați: ${kills}. Lăzi găsite: ${looted}.`;try{localStorage.removeItem(SAVE_KEY);}catch{}tone(80,.8,'sawtooth');updateUI();}
function update(dt){
 if(state!=='playing')return;updateExpedition(dt);elapsed+=dt;time+=dt*2.4;if(time>=1440){time-=1440;day++;toast('Ziua '+day);saveGame();}
 const night=time<360||time>1140;
 let dx=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0)+stick.x,dy=(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0)+stick.y;
 const length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}
 const running=(keys.Shift||Math.hypot(stick.x,stick.y)>.88)&&player.stamina>1&&length>.1,speed=running?98:65,ox=player.x,oy=player.y;
 if(length>.08)moveEntity(player,dx*speed*dt,dy*speed*dt);
 player.moving=Math.hypot(player.x-ox,player.y-oy)>.01;
 if(player.moving){walkPhase+=dt*(running?14:9);if(!pointer.active)player.angle=Math.atan2(dy,dx);}else walkPhase=0;
 insideHouse=currentHouse()?.id??null;
 if(pointer.active)player.angle=Math.atan2(pointer.y-(player.y-cam.y),pointer.x-(player.x-cam.x));
 player.stamina=Math.max(0,Math.min(100,player.stamina+(running&&player.moving?-14:9)*dt));player.hunger=Math.max(0,player.hunger-dt*.12);player.thirst=Math.max(0,player.thirst-dt*.18);
 if(!player.hunger||!player.thirst)player.hp-=dt*1.5;player.invuln=Math.max(0,player.invuln-dt);
 if(player.lightOn){player.lightTime=Math.max(0,player.lightTime-dt);if(!player.lightTime){player.lightOn=false;toast('Bateria s-a descărcat.');}}
 for(const o of nearObjects(player.x,player.y,48))if(o.type==='campfire'&&distance(o,player)<45)player.hp=Math.min(100,player.hp+dt*1.2);
 shootTimer=Math.max(0,shootTimer-dt);useTimer=Math.max(0,useTimer-dt);
 if(reloadTimer>0){reloadTimer-=dt;if(reloadTimer<=0){const key=ammoKey(),n=Math.min(magazine[weapon]-player[key],bag[key]);player[key]+=n;bag[key]-=n;toast('Armă reîncărcată');updateUI();}}
 if(shooting||touchFire)attack(touchFire);if(actionHeld&&!search)interact();
 if(search){
  const target=objects[search.id];
  if(!target||distance(player,target)>34||Math.hypot(player.x-search.x,player.y-search.y)>6){search=null;toast('Cercetare întreruptă.');}
  else{search.progress+=dt;$('searchProgress').style.width=Math.min(100,search.progress/search.duration*100)+'%';if(search.progress>=search.duration){target.searched=true;openLoot(target);saveGame();}}
 }
 $('searchBar').hidden=!search;
 if(state!=='playing')return;
 for(const z of zombies){
  const d=distance(z,player);z.attack=Math.max(0,z.attack-dt);if(d<145)z.aware=true;const zx=z.x,zy=z.y;
  if(z.aware&&d>14&&d<650){
   const ph=currentHouse(),zh=currentHouse(z.x,z.y);let tx=player.x,ty=player.y;
   if(ph&&ph.id!==zh?.id){tx=ph.doorX;ty=ph.doorY-10;}else if(zh&&!ph){tx=zh.doorX;ty=zh.doorY+12;}
   z.angle=Math.atan2(ty-z.y,tx-z.x);const speed=z.speed*(night?1.5:1);moveEntity(z,Math.cos(z.angle)*speed*dt,Math.sin(z.angle)*speed*dt);
   if(Math.hypot(z.x-zx,z.y-zy)<.01)moveEntity(z,Math.cos(z.angle+1.1)*speed*dt,Math.sin(z.angle+1.1)*speed*dt);
  }
  z.moving=Math.hypot(z.x-zx,z.y-zy)>.01;z.phase=z.moving?(z.phase||0)+dt*(z.variant===1?12:7):0;
  if(d<17&&z.attack<=0&&player.invuln<=0&&currentHouse(z.x,z.y)?.id===currentHouse()?.id){player.hp-=night?15:10;player.invuln=.65;z.attack=1;shake=4;addParticle(player.x,player.y,'#a3493b');tone(70,.15,'sawtooth');}
 }
 for(let i=bullets.length-1;i>=0;i--){
  const b=bullets[i],steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/4));let hit=false;b.life-=dt;
  for(let step=0;step<steps&&!hit;step++){
   b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps;if(blocked(b.x,b.y+5,0)){hit=true;break;}
   for(const z of [...zombies])if(distance(b,{x:z.x,y:z.y-6})<10){hurtZombie(z,b.damage);hit=true;break;}
  }
  if(b.life<=0||hit)bullets.splice(i,1);
 }
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1);}
 for(let i=floaters.length-1;i>=0;i--){floaters[i].y-=dt*12;floaters[i].life-=dt;if(floaters[i].life<=0)floaters.splice(i,1);}
 zombies=zombies.filter(z=>distance(z,player)<850);spawnTimer+=dt;if(spawnTimer>4){spawnTimer=0;if(zombies.length<(night?28:19))spawnZombie(260);}
 saveTimer+=dt;if(saveTimer>15){saveTimer=0;saveGame();}uiTimer+=dt;if(uiTimer>.15){uiTimer=0;updateUI();}if(player.hp<=0){player.hp=0;die();}
}
function drawTree(c,x,y,n){GameArt.tree(c,x,y,n);}
function drawInterior(c,o){GameArt.interior(c,o);}
function drawHouse(c,o){
 if(insideHouse===o.id){drawInterior(c,o);return;}
 const roof=GameArt.roofBounds?.(o)||{x:o.x-o.w/2-4,y:o.y-o.h/2-32,w:o.w+8,h:o.h+20};
 const fade=insideHouse===null&&player.x>roof.x-8&&player.x<roof.x+roof.w+8&&player.y>roof.y-4&&player.y<o.y-o.h/2;
 GameArt.exterior(c,o,fade);
}
function drawObject(c,o){
 const x=Math.floor(o.x),y=Math.floor(o.y);
 if(o.type==='house'){drawHouse(c,o);return;}
 if(o.house!==undefined&&o.house!==insideHouse)return;
 if(o.removed||o.type==='stump'){if(o.type==='tree'||o.type==='stump'){rect(c,x-4,y-3,8,6,'#403c2f');rect(c,x-3,y-4,6,3,'#958361');rect(c,x-1,y-4,1,3,'#66583e');}return;}
 if(o.type==='prop'){GameArt.prop(c,o);return;}
 if(o.type==='container'){
  rect(c,x-9,y-6,18,12,'#293127');rect(c,x-8,y-9,16,12,o.searched?'#59533e':'#807052');rect(c,x-7,y-8,14,2,'#a08c65');rect(c,x-7,y-3,14,1,'#494b38');rect(c,x-1,y-4,2,2,'#c0ae7b');if(o.searched)rect(c,x-8,y-10,16,2,'#3c4333');return;
 }
 if(o.type==='corpse'){
  if(window.ClassicActors){ClassicActors.corpse(c,x,y,o.variant);}return;
 }
 if(o.type==='relay'){
  rect(c,x-10,y-7,20,12,'#3d4c3c');rect(c,x-8,y-11,16,11,'#7a8264');rect(c,x-6,y-9,11,5,'#273f38');rect(c,x-4,y-8,7,2,expedition.relayOnline?'#b4c286':'#677a67');rect(c,x+6,y-27,1,19,'#b2b193');rect(c,x+2,y-23,9,1,'#6f8069');rect(c,x+4,y-26,5,1,'#6f8069');return;
 }
 if(o.type==='extract'){
  rect(c,x-10,y-4,20,5,'#475b44');rect(c,x-8,y-12,16,9,'#92916d');rect(c,x-5,y-10,9,1,'#d1cba3');rect(c,x-5,y-7,6,1,'#ced0b0');rect(c,x+9,y-24,1,25,'#797f61');rect(c,x+10,y-24,14,8,expedition.rescueReady?'#a9be80':'#778665');return;
 }
 if(o.type==='tree')drawTree(c,x,y,o.variant??o.id);
 else if(o.type==='rock'){rect(c,x-10,y-3,21,7,'#485645');rect(c,x-8,y-8,16,10,'#7b866c');rect(c,x-5,y-11,10,4,'#9a9f80');rect(c,x+5,y-5,5,7,'#626f5a');rect(c,x-6,y-7,8,2,'#a6aa8c');rect(c,x-9,y+2,9,2,'#5c6e51');}
 else if(o.type==='loot'){
  if(o.open){rect(c,x-3,y-1,5,1,'#494c3c');return;}
  if(!itemIcons[o.item]){const c2=document.createElement('canvas');c2.width=c2.height=32;drawItem(c2,o.item);itemIcons[o.item]=c2;}
  c.drawImage(itemIcons[o.item],x-9,y-11,18,18);
  if(Math.sin(frame*.045+o.id)>.8){rect(c,x+6,y-11,1,4,'#d8c99d');rect(c,x+5,y-10,3,1,'#d8c99d');}
 }
 else if(o.type==='branch'){rect(c,x-8,y,16,2,'#393c2c');rect(c,x-7,y-1,14,1,'#96815a');rect(c,x-1,y-4,2,4,'#756344');rect(c,x+3,y+1,2,3,'#756344');}
 else if(o.type==='looseStone'){rect(c,x-4,y-2,8,4,'#575f4c');rect(c,x-3,y-3,5,3,'#9a9a7e');}
 else if(o.type==='berry'){rect(c,x-8,y-6,17,8,'#424b30');rect(c,x-5,y-10,11,9,'#6b704a');for(let i=0;i<5;i++)rect(c,x-6+(i*7)%13,y-7+(i*3)%6,2,2,'#9d7050');}
 else if(o.type==='campfire'){rect(c,x-10,y-3,20,9,'#4b4f40');rect(c,x-8,y,16,3,'#79684b');rect(c,x-5,y-4,10,12,'#534737');rect(c,x-7,y+1,14,3,'#9b815a');rect(c,x-4,y-5,9,7,'#cf8c43');rect(c,x-2,y-10+(frame%20>10?2:0),5,12,'#e8b66a');rect(c,x,y-6,2,6,'#f2d8a1');}
}
const itemIcons={};
function drawPerson(c,x,y,z=false,angle=0,phase=0,entity=null){GameArt.person(c,x,y,angle,phase,weapon,z?(entity||{variant:0}):null);}
function draw(){
 if(!player||!tiles.length)return;const w=canvas.width,h=canvas.height;
 cam.x=Math.max(0,Math.min(WORLD-w,player.x-w/2));cam.y=Math.max(0,Math.min(WORLD-h,player.y-h/2));
 ctx.save();ctx.clearRect(0,0,w,h);if(shake>.1){ctx.translate(rand(-shake,shake),rand(-shake,shake));shake*=.85;}ctx.translate(-Math.floor(cam.x),-Math.floor(cam.y));
 const x0=Math.floor(cam.x/TILE),y0=Math.floor(cam.y/TILE);
 for(let y=y0;y<=Math.ceil((cam.y+h)/TILE);y++)for(let x=x0;x<=Math.ceil((cam.x+w)/TILE);x++){const t=tileAt(x,y);ctx.drawImage(tiles[t][Math.floor(hash(x,y)*4)],x*TILE,y*TILE);if(t===2&&Math.sin(frame*.015+x+y)>.96)rect(ctx,x*TILE+5,y*TILE+8,9,1,'#81958c');}

 const visible=nearObjects(cam.x+w/2,cam.y+h/2,Math.max(w,h)/2+220).filter(o=>o.x>cam.x-180&&o.x<cam.x+w+180&&o.y>cam.y-170&&o.y<cam.y+h+120);
 // Redraw roofs above actors behind buildings; interior replaces the entire roof footprint.
 const entities=visible.map(o=>({y:o.type==='house'?o.y+o.h/2:o.y,kind:'object',o}));
 for(const z of zombies)if(z.x>cam.x-20&&z.x<cam.x+w+20&&z.y>cam.y-20&&z.y<cam.y+h+30)entities.push({y:z.y,kind:'zombie',o:z});
 entities.push({y:player.y,kind:'player',o:player});entities.sort((a,b)=>a.y-b.y);
 // Interiors must be below the player and their loot, even when the roof is hidden.
 for(const o of visible)if(o.type==='house'&&insideHouse===o.id)drawInterior(ctx,o);
 for(const e of entities){
  if(e.kind==='object'){if(e.o.type==='house'&&insideHouse===e.o.id)continue;drawObject(ctx,e.o);}
  else if(e.kind==='zombie'){drawPerson(ctx,e.o.x,e.o.y,true,e.o.angle,e.o.phase,e.o);if(e.o.aware&&e.o.hp<e.o.maxHp){rect(ctx,e.o.x-7,e.o.y-34,14,2,'#343c2f');rect(ctx,e.o.x-7,e.o.y-34,Math.ceil(e.o.hp/e.o.maxHp*14),2,'#ac725e');}}
  else if(player.invuln<=0||Math.floor(frame/4)%2===0)drawPerson(ctx,player.x,player.y,false,player.angle,walkPhase);
 }
 for(const b of bullets)rect(ctx,b.x-1,b.y-1,3,2,'#e8dcb0');for(const p of particles)rect(ctx,p.x,p.y,2,2,p.color);
 for(const f of floaters){ctx.globalAlpha=Math.min(1,f.life);ctx.fillStyle=f.color;ctx.font='7px monospace';ctx.textAlign='center';ctx.fillText(f.text,Math.floor(f.x),Math.floor(f.y));}ctx.globalAlpha=1;ctx.restore();
 const darkness=time<300||time>1200?.62:time<420?.62*(420-time)/120:time>1080?.62*(time-1080)/120:0;
 if(darkness>0){ctx.fillStyle=`rgba(12,19,24,${Math.min(.62,darkness)})`;ctx.fillRect(0,0,w,h);ctx.save();ctx.globalCompositeOperation='screen';if(player.lightOn){const glow=ctx.createRadialGradient(w/2,h/2,10,w/2,h/2,100);glow.addColorStop(0,'#dfd9a348');glow.addColorStop(1,'#dfd9a300');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);}for(const o of visible)if(o.type==='campfire'){const g=ctx.createRadialGradient(o.x-cam.x,o.y-cam.y,1,o.x-cam.x,o.y-cam.y,70);g.addColorStop(0,'#ad762960');g.addColorStop(1,'#ad762900');ctx.fillStyle=g;ctx.fillRect(o.x-cam.x-70,o.y-cam.y-70,140,140);}ctx.restore();}
 if(player.hp<30){const g=ctx.createRadialGradient(w/2,h/2,h/4,w/2,h/2,w*.65);g.addColorStop(0,'#9f302000');g.addColorStop(1,'#9f302075');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}drawMinimap();
}
function drawMinimap(){if(canvas.width<340||matchMedia('(pointer:coarse)').matches)return;const s=51,x=canvas.width-s-10,y=canvas.height-67;ctx.fillStyle='#252a22e0';ctx.fillRect(x-3,y-3,s+6,s+6);for(let yy=0;yy<s;yy++)for(let xx=0;xx<s;xx++){const tx=Math.floor(player.x/TILE)+xx-25,ty=Math.floor(player.y/TILE)+yy-25;ctx.fillStyle=Object.values(colors)[tileAt(tx,ty)];ctx.fillRect(x+xx,y+yy,1,1);}rect(ctx,x+24,y+24,3,3,'#e0d8ae');ctx.strokeStyle='#b4ac8a70';ctx.strokeRect(x-3,y-3,s+6,s+6);}
function drawMap(){const c=$('bigMap'),g=c.getContext('2d');for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)rect(g,x,y,1,1,Object.values(colors)[tileAt(x,y)]);for(const site of sites){rect(g,site.x/TILE,site.y/TILE,site.w/TILE,site.h/TILE,'#9c8c68');g.font='7px monospace';g.fillStyle='#ded2ab';g.fillText(({store:'M',house:'S',farm:'F',church:'†',military:'A',warehouse:'D',clinic:'+',fuel:'B',camp:'T',workshop:'U',lake:'L',road:'C'})[site.kind],site.x/TILE+3,site.y/TILE+5);}for(const o of objects)if(o.type==='relay'||o.type==='extract'){g.fillStyle=o.type==='relay'?'#f0d28e':'#d3e1b1';g.fillRect(o.x/TILE-3,o.y/TILE-3,7,7);g.fillStyle='#233224';g.font='6px monospace';g.fillText(o.type==='relay'?'R':'E',o.x/TILE-2,o.y/TILE+2);}g.strokeStyle='#ece5b1';g.lineWidth=1;g.beginPath();g.arc(player.x/TILE,player.y/TILE,5,0,Math.PI*2);g.stroke();rect(g,player.x/TILE-1,player.y/TILE-1,3,3,'#fff4c6');}
function drawItem(canvas,type){
 const g=canvas.getContext('2d');g.clearRect(0,0,canvas.width,canvas.height);g.save();g.translate(Math.floor((canvas.width-24)/2),Math.floor((canvas.height-24)/2));
 const p=(x,y,w,h,c)=>rect(g,x*2,y*2,w*2,h*2,c),ivory='#c6bea1',dark='#354034',metal='#8a9987',rust='#a5784e',olive='#737c50',red='#a3664e';
 if(type==='fists'){p(3,4,7,7,'#b48e65');p(3,3,1,4,'#d3ac7b');p(5,2,1,5,'#d3ac7b');p(7,2,1,5,'#d3ac7b');p(9,3,1,4,'#d3ac7b');}
 else if(['food','beans'].includes(type)){p(3,2,7,9,metal);p(3,3,7,6,type==='beans'?olive:red);p(4,5,5,3,ivory);p(5,6,3,1,olive);p(3,2,7,1,ivory);}
 else if(['water','canteen','antiseptic'].includes(type)){p(5,0,3,2,metal);p(4,2,5,1,ivory);p(3,3,7,8,type==='antiseptic'?rust:type==='canteen'?olive:'#70918c');p(4,6,5,3,ivory);p(4,4,1,2,'#b7c5ab');}
 else if(['med','painkillers'].includes(type)){p(2,4,9,7,ivory);p(3,3,7,1,metal);p(6,5,2,5,red);p(4,7,6,1,red);}
 else if(type==='cloth'){p(2,4,9,7,'#9a9d85');p(3,2,7,8,ivory);p(5,4,1,5,'#96977c');p(4,6,6,1,'#a9a48c');}
 else if(type==='wood'){p(1,4,9,2,rust);p(3,7,9,2,'#896841');p(1,4,1,2,ivory);p(11,7,1,2,ivory);}
 else if(type==='stone'){p(1,7,10,3,'#687863');p(3,4,6,4,metal);p(4,3,4,2,ivory);}
 else if(type==='scrap'){p(2,2,3,9,metal);p(3,2,1,8,ivory);p(6,6,5,4,'#657b6a');p(6,6,5,1,ivory);}
 else if(['ammo','rifleAmmo','shotgunAmmo'].includes(type)){for(let i=0;i<3;i++){p(2+i*3,3,2,8,type==='shotgunAmmo'?red:rust);p(2+i*3,2,2,2,ivory);p(2+i*3,10,2,1,olive);}}
 else if(['gun','rifle','shotgun'].includes(type)){p(1,4,type==='gun'?9:11,2,metal);p(2,4,7,1,ivory);p(3,6,3,5,type==='gun'?dark:rust);if(type!=='gun')p(1,5,3,3,rust);}
 else if(['axe','pickaxe','knife'].includes(type)){p(5,4,2,8,rust);if(type==='knife'){p(5,0,2,5,ivory);p(4,5,4,1,metal);}else if(type==='axe'){p(3,1,7,4,metal);p(3,1,2,4,ivory);}else{p(2,1,9,2,metal);p(1,2,2,3,ivory);p(10,2,2,3,ivory);}}
 else if(type==='matches'){p(2,3,9,8,rust);p(3,3,7,6,ivory);p(5,5,3,3,red);p(2,10,9,1,dark);}
 else if(type==='camp'){p(1,10,11,2,rust);p(3,7,7,3,red);p(5,2,3,8,'#d2a755');p(6,5,1,5,'#e0c17b');}
 else if(type==='crackers'){p(2,3,9,8,rust);p(3,4,7,6,ivory);for(let y=5;y<9;y+=2)for(let x=4;x<9;x+=2)p(x,y,1,1,rust);}
 else if(type==='apple'){p(3,4,7,6,red);p(2,5,1,3,red);p(10,5,1,3,red);p(4,3,2,1,red);p(6,1,1,3,rust);p(7,1,3,1,olive);p(4,5,1,2,ivory);}
 else if(type==='herbs'){p(6,3,1,9,rust);p(3,2,3,2,olive);p(7,4,4,2,olive);p(2,7,4,2,olive);p(7,8,3,2,'#969a60');}
 else if(type==='rope'){p(3,3,7,1,rust);p(2,4,1,6,rust);p(3,10,7,1,rust);p(10,4,1,6,rust);p(4,5,4,1,ivory);p(4,6,1,3,ivory);p(5,8,4,1,ivory);}
 else if(type==='battery'){p(4,1,4,1,ivory);p(3,2,6,9,dark);p(3,2,6,2,rust);p(5,5,2,4,ivory);p(4,6,4,1,ivory);}
 else if(type==='flashlight'){p(4,4,4,8,olive);p(3,2,6,3,metal);p(2,0,8,2,ivory);p(5,6,2,2,rust);}
 else{p(3,4,7,7,rust);p(2,3,9,3,ivory);p(3,7,7,1,metal);}
 g.restore();
}
function initUI(){
 const defs=[['hp','Sănătate','♥','#b17465'],['hunger','Sațietate','◒','#c4b07b'],['thirst','Hidratare','◈','#8ca6a1'],['stamina','Energie','ϟ','#a7ad80']];
 $('compactVitals').innerHTML=defs.map(([id,name,icon,color])=>`<div title="${name}" aria-label="${name}"><span style="color:${color}">${icon}</span><div><i id="compact-${id}" style="background:${color}"></i></div></div>`).join('');
 $('vitals').innerHTML=defs.map(([id,name,icon,color])=>`<div class="vital"><span class="vital-icon" style="color:${color}">${icon}</span><div><span class="vital-label">${name}</span><div class="meter"><i id="bar-${id}" style="background:${color}"></i></div></div><span class="vital-value" id="val-${id}"></span></div>`).join('');
 $('inventory').innerHTML=Object.keys(names).map((k,i)=>`<button class="item" id="item-${k}" title="${names[k]}" aria-label="${names[k]}"><span class="item-key">${{food:2,water:3,med:4}[k]||''}</span><canvas width="32" height="32"></canvas><span class="count" id="count-${k}"></span></button>`).join('');
 for(const k of Object.keys(names)){drawItem($('item-'+k).querySelector('canvas'),k);$('item-'+k).onclick=()=>consume(k);}
 $('recipes').innerHTML=recipes.map((r,i)=>`<div class="recipe"><canvas width="30" height="30" id="recipe-icon-${i}"></canvas><div><div class="recipe-name">${r.name}</div><div class="recipe-cost">${Object.entries(r.cost).map(([k,n])=>n+' '+names[k].toLowerCase()).join(' · ')}</div></div><button id="craft-${i}">CREEAZĂ +</button></div>`).join('');
 recipes.forEach((r,i)=>{drawItem($('recipe-icon-'+i),r.id);$('craft-'+i).onclick=()=>craft(i);});GameArt.portrait($('portrait').getContext('2d'));drawItem($('weaponIcon'),'fists');
}
function updateUI(){if(!player)return;for(const k of ['hp','hunger','thirst','stamina']){$('bar-'+k).style.width=Math.max(0,player[k])+'%';$('compact-'+k).style.width=Math.max(0,player[k])+'%';$('val-'+k).textContent=Math.ceil(Math.max(0,player[k]))+' / 100';}let occupied=0;for(const[k,n]of Object.entries(bag)){$('count-'+k).textContent=n||'—';$('item-'+k).style.opacity=n?1:.4;if(n)occupied++;}$('bagCount').textContent=occupied+' / '+Object.keys(names).length+' TIPURI';recipes.forEach((r,i)=>$('craft-'+i).disabled=!Object.entries(r.cost).every(([k,n])=>bag[k]>=n)||!canAct());$('clock').textContent=String(Math.floor(time/60)).padStart(2,'0')+':'+String(Math.floor(time%60)).padStart(2,'0');$('dayText').textContent='ZIUA '+String(day).padStart(2,'0');$('weatherIcon').textContent=time<360||time>1140?'☾':'☀';$('coords').textContent='X '+String(Math.floor(player.x/TILE)).padStart(3,'0')+' · Y '+String(Math.floor(player.y/TILE)).padStart(3,'0');$('survived').textContent='Ziua '+day+' · '+kills+' zombi eliminați';const currentAmmo=ammoKey();$('weaponName').innerHTML=magazine[weapon]?`▰ ${weaponNames[weapon].toUpperCase()} <b>${reloadTimer>0?'↻':player[currentAmmo]+' / '+bag[currentAmmo]}</b>`:`⌁ ${weaponNames[weapon].toUpperCase()} <b>—</b>`;$('equippedName').textContent=weaponNames[weapon];drawItem($('weaponIcon'),weapon);const near=zombies.filter(z=>distance(z,player)<130).length;$('dangerText').textContent=near?'● '+near+' ZOMBI ÎN APROPIERE':'● ZONĂ LINIȘTITĂ';$('dangerText').style.color=near?'#e6a17d':'#bacd9e';const t=tileAt(player.x/TILE,player.y/TILE);const site=sites.find(a=>player.x>a.x&&player.x<a.x+a.w&&player.y>a.y&&player.y<a.y+a.h);$('location').textContent=currentHouse()?'ÎN INTERIOR · '+(site?.name||'ADĂPOST'):site?site.name:t===3?'DRUMUL VECHI':t===4?'AȘEZARE ABANDONATĂ':t===2?'RÂUL RECE':'PĂDUREA DE NORD';const target=closestInteraction();const hints={relay:'Stația radio',extract:expedition.rescueReady?'Evacuează-te':'Punct de evacuare',container:target?.searched?'Cercetează din nou':'Cercetează recipientul',corpse:'Cercetează corpul',door:currentHouse()?'Ieși din clădire':'Intră în clădire',loot:target?'Ia '+(names[target.item]||'obiectul'):'Caută',tree:'Taie copacul · topor',rock:'Extrage piatră · târnăcop',branch:'Adună creanga',looseStone:'Ridică piatra',berry:'Culege hrană',water:'Umple apa'};$('interactHint').textContent=target?'[ E ] '+hints[target.type]:'';$('touchUse').querySelector('span').textContent=target?.type==='door'?(currentHouse()?'IEȘI':'INTRĂ'):['container','corpse'].includes(target?.type)?'CAUTĂ':target?.type==='loot'?'RIDICĂ':'ADUNĂ';const goals=[looted>=1,harvested>=5,kills>=3,day>=3];const titles=['Cercetează așezarea și găsește provizii','Adună 5 resurse din natură','Elimină 3 zombi','Supraviețuiește până în ziua 3'];goals.forEach((yes,i)=>{if(yes&&!goalDone.has(i)){goalDone.add(i);if(state==='playing')toast('✓ Provocare încheiată: '+titles[i]);}});const current=goals.findIndex(x=>!x);$('objectiveLabel').textContent=current<0?'SUPRAVIEȚUITOR ADEVĂRAT':'PROVOCAREA '+(current+1)+' / 4';$('objectiveText').textContent=current<0?'Continuă să explorezi regiunea':titles[current];$('questCount').textContent=goals.filter(Boolean).length+' / 4';if(expedition.completed){$('objectiveLabel').textContent='EXPEDIȚIE ÎNCHEIATĂ';$('objectiveText').textContent='Continuă să explorezi regiunea';}else if(expedition.rescueReady){$('objectiveLabel').textContent='ULTIMA CURSĂ';$('objectiveText').textContent='Ajungi la debarcaderul E și evacuează-te';}else if(expedition.relayOnline){$('objectiveLabel').textContent='SEMNAL PIERDUT';$('objectiveText').textContent='Transmisie '+Math.floor(expedition.signalTime)+' / 90 s · rămâi lângă radio';}else if(expedition.discovered){$('objectiveLabel').textContent='REPARĂ STAȚIA RADIO';$('objectiveText').textContent='2 baterii · 4 metal · 1 sfoară';}else if(looted>0){$('objectiveLabel').textContent='SEMNAL PIERDUT';$('objectiveText').textContent='Caută atelierul radio R pe hartă';}$('questProgress').style.width=goals.filter(Boolean).length*25+'%';if(player.thirst<25)$('fieldNote').textContent='„Apa se termină. Râul este în est; umple recipientele de pe mal.”';else if(time>1080||time<360)$('fieldNote').textContent='„Noaptea îi face mai rapizi. Ține arma încărcată și un foc aproape.”';else $('fieldNote').textContent='„Ușile încă se deschid. Caută în case, în depozite și la postul militar. Nimic nu vine de-a gata.”';}
const sidebarHome=document.querySelector('.sidebar').parentElement;
function toggleBag(){if(state==='inventory'){if(document.querySelector('.sidebar').parentElement===$('gameFrame'))sidebarHome.append(document.querySelector('.sidebar'));state='playing';document.body.classList.remove('bag-open');$('bagBtn').textContent='▦';}else if(state==='playing'){if(document.fullscreenElement)$('gameFrame').append(document.querySelector('.sidebar'));clearInput();state='inventory';document.body.classList.add('bag-open');$('bagBtn').textContent='×';}updateUI();}
function resize(){const r=canvas.getBoundingClientRect();canvas.width=Math.max(160,Math.floor(r.width/2));canvas.height=Math.max(160,Math.floor(r.height/2));ctx.imageSmoothingEnabled=false;}
function loop(now){const dt=Math.min((now-last)/1000||0,.05);last=now;frame++;update(dt);draw();requestAnimationFrame(loop);}
function clearInput(){keys={};shooting=touchFire=actionHeld=false;stick.x=stick.y=0;$('stick').style.transform='';}
window.addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Tab'].includes(k)&&state==='playing')e.preventDefault();if(e.repeat)return;keys[k]=true;if(k==='b')toggleBag();if(k==='Escape'){if(state==='objective')closeRelay();else if(state==='loot')closeLoot();else if(state==='inventory')toggleBag();else if(state==='map')showMap();else if(state==='help')help();else pause();}if(k==='m')showMap();if(k==='e')interact();if(k==='r')reload();if(k==='1')switchWeapon();if(k==='2')consume('food');if(k==='3')consume('water');if(k==='4')consume('med');if(k===' '){e.preventDefault();attack(true);}});
window.addEventListener('keyup',e=>{keys[e.key.length===1?e.key.toLowerCase():e.key]=false;});
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=canvas.getBoundingClientRect();pointer={x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height,active:true};});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;if(e.button===0){shooting=true;canvas.focus({preventScroll:true});}});window.addEventListener('pointerup',()=>{shooting=false;});canvas.addEventListener('pointerleave',()=>pointer.active=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
const joy=$('joystick');let joyPointer=null;function joyMove(e){const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),m=Math.min(d,33);stick.x=d>2?dx/d*m/33:0;stick.y=d>2?dy/d*m/33:0;$('stick').style.transform=`translate(${stick.x*27}px,${stick.y*27}px)`;pointer.active=false;}
joy.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);joyMove(e);e.preventDefault();});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)joyMove(e);});for(const event of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(event,()=>{joyPointer=null;stick.x=stick.y=0;$('stick').style.transform='';});
for(const[id,kind]of [['touchFire','fire'],['touchUse','use']]){const el=$(id);el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);if(kind==='fire'){touchFire=true;attack(true);}else{actionHeld=true;interact();}e.preventDefault();});for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>{if(kind==='fire')touchFire=false;else actionHeld=false;});}
$('expandBtn').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else $('gameFrame').requestFullscreen?.().catch(()=>toast('Ecranul complet nu este disponibil.'));};
$('closeRelay').onclick=closeRelay;$('activateRelay').onclick=activateRelay;$('continueExplore').onclick=()=>{state='playing';$('victoryOverlay').hidden=true;};$('newExpedition').onclick=()=>startGame();
$('closeLoot').onclick=closeLoot;$('takeAllBtn').onclick=()=>{while(lootTarget?.contents.length)takeLoot(0);};
$('worldMapBtn').onclick=showMap;$('bagBtn').onclick=toggleBag;$('closeBag').onclick=toggleBag;
$('startBtn').onclick=()=>startGame();$('continueBtn').onclick=()=>startGame(true);$('restartBtn').onclick=()=>startGame();$('pauseBtn').onclick=pause;$('resumeBtn').onclick=pause;$('saveBtn').onclick=()=>{saveGame();toast('Progres salvat pe acest dispozitiv.');};$('newBtn').onclick=()=>{if(confirm('Începi o lume nouă? Progresul salvat va fi înlocuit.'))startGame();};$('weaponBtn').onclick=switchWeapon;$('mapBtn').onclick=showMap;$('closeMap').onclick=showMap;$('helpBtn').onclick=help;$('closeHelp').onclick=help;$('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').style.color=sound?'#c0d394':'';$('soundBtn').setAttribute('aria-label',sound?'Dezactivează sunetul':'Activează sunetul');if(sound)tone(650,.15,'sine');toast(sound?'Sunet activat':'Sunet dezactivat');};
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.querySelector('.sidebar').parentElement===$('gameFrame'))sidebarHome.append(document.querySelector('.sidebar'));resize();});
window.addEventListener('resize',resize);window.addEventListener('blur',()=>{clearInput();if(state==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(state==='playing')pause();}});window.addEventListener('pagehide',saveGame);
$('startBtn').disabled=true;$('startBtn').textContent='SE ÎNCARCĂ LUMEA…';
GameArt.load().then(()=>{initUI();reset(false);resize();$('startBtn').disabled=false;$('startBtn').innerHTML='ÎNCEPE SUPRAVIEȚUIREA <span>↗</span>';try{$('continueBtn').hidden=!localStorage.getItem(SAVE_KEY);}catch{}requestAnimationFrame(loop);}).catch(error=>{$('startBtn').textContent='EROARE LA ÎNCĂRCARE';console.error(error);toast('Imaginile nu s-au încărcat. Reîncarcă pagina.',true);});
// Read-only diagnostics support repeatable smoke checks without changing gameplay.
window.survival = { getState:()=>({state,seed,day,time,player:{...player},bag:{...bag},weapon,kills,looted,harvested,zombies:zombies.length,objects:objects.length,mapSize:SIZE,insideHouse:currentHouse()?.id??null,siteCount:sites.length,expedition:{...expedition},movement:{moving:player.moving,phase:walkPhase,frame:player.moving?1+Math.floor(walkPhase)%4:0},interaction:(()=>{const o=closestInteraction();return o?{id:o.id,type:o.type,searched:o.searched}:null;})(),goals:[...goalDone]}), getNearby:()=>({sites:sites.map(a=>({...a})),objects:nearObjects(player.x,player.y,400).filter(o=>!o.removed).map(o=>({...o})),zombies:zombies.map(z=>({...z}))}) };
})();
