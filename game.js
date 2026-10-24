'use strict';
(() => {
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const TILE = 32, SIZE = 384, WORLD = TILE * SIZE, SAVE_KEY = 'ultimul-rasarit-v2';
const colors = { grass:'#727259', forest:'#545a44', water:'#304d55', road:'#62625a', sand:'#808068' };
let seed = 69421, terrain, objects = [], zombies = [], bullets = [], particles = [], floaters = [], camps = [], tiles = [],
 state = 'title', hasRun = false, time = 480, day = 1, elapsed = 0, kills = 0, looted = 0, harvested = 0, weapon = 'fists',
 player, bag, cam = { x:0, y:0 }, keys = {}, pointer = {x:0,y:0,active:false}, stick = {x:0,y:0},
 shooting = false, shootTimer = 0, useTimer = 0, reloadTimer = 0, spawnTimer = 0, saveTimer = 0, uiTimer = 0,
 last = 0, frame = 0, sound = false, audio, walkPhase = 0, shake = 0, goalDone = new Set(), mapReturnState = 'playing', helpReturnState = 'title';
let touchFire = false, actionHeld = false, sites = [], insideHouse = null, lastRefusal = 0;
const names = {food:'Conserve',water:'Apă',med:'Bandaje',cloth:'Material textil',knife:'Cuțit',axe:'Topor',gun:'Pistol M9',rifle:'Carabină',ammo:'Cartușe 9 mm',rifleAmmo:'Cartușe 7.62',wood:'Lemn',stone:'Piatră',scrap:'Metal',matches:'Chibrituri',camp:'Foc de tabără',pickaxe:'Târnăcop'};
const weapons=['fists','knife','axe','pickaxe','gun','rifle'];
const weaponNames={fists:'Mâini goale',knife:'Cuțit',axe:'Topor',pickaxe:'Târnăcop',gun:'Pistol M9',rifle:'Carabină'};
const magazine={gun:12,rifle:8};
const recipes=[{id:'med',name:'Bandaj',cost:{cloth:2}},{id:'camp',name:'Foc de tabără',cost:{wood:5,stone:3,matches:1}},{id:'knife',name:'Cuțit improvizat',cost:{scrap:3,wood:1}},{id:'axe',name:'Topor improvizat',cost:{scrap:5,wood:3}},{id:'pickaxe',name:'Târnăcop',cost:{scrap:5,wood:3}},{id:'ammo',name:'12 cartușe 9 mm',cost:{scrap:3,stone:1}}];
function canAct(){return state==='playing'||state==='inventory';}
function hash(x,y,n=0) { let a = Math.imul(x + seed + n*377,374761393) ^ Math.imul(y+seed,668265263); a = Math.imul(a ^ a>>>13,1274126177); return ((a ^ a>>>16)>>>0)/4294967296; }
function rand(a,b) {return a+Math.random()*(b-a);}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.floor(x),Math.floor(y),w,h);}
function noise(x,y) { const a=Math.floor(x/12), b=Math.floor(y/12), fx=x/12-a,fy=y/12-b; const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy); return (hash(a,b)*(1-sx)+hash(a+1,b)*sx)*(1-sy)+(hash(a,b+1)*(1-sx)+hash(a+1,b+1)*sx)*sy; }
function tileAt(x,y){if(x<0||y<0||x>=SIZE||y>=SIZE)return 2;return terrain[Math.floor(y)*SIZE+Math.floor(x)];}
function generate(){
 terrain=new Uint8Array(SIZE*SIZE);objects=[];sites=[];camps=[];zombies=[];insideHouse=null;
 const center=SIZE/2;
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  const river=SIZE*.78+Math.sin(y/21)*10+Math.sin(y/47)*16;
  let t=noise(x,y)<.53?1:0;
  if(Math.abs(x-river)<3||Math.hypot((x-63)*.8,y-73)<17)t=2;
  else if(Math.abs(x-river)<4.3)t=4;
  if((Math.abs(x-center)<2||Math.abs(y-center)<2||Math.abs(y-80)<1.7||Math.abs(y-304)<1.7)&&t!==2)t=3;
  terrain[y*SIZE+x]=t;
 }
 const positions=[[192,192,1],[192,155,0],[192,230,2],[153,192,3],[230,192,4],[277,192,5],[192,80,6],[151,80,7],[235,80,8],[192,304,1],[140,304,8],[245,304,2],[80,80,0],[80,192,7],[80,304,3],[310,80,5],[310,304,6],[192,37,7],[192,350,8],[36,192,1],[350,192,2],[110,145,3],[258,130,6],[128,245,8],[260,255,7],[60,245,2],[330,245,0]];
 for(const[vx,vy,index]of positions){
  const art=GameArt.scenes[index],scale=.8;
  const site={scene:index,x:vx*TILE-art.w*scale/2,y:vy*TILE-art.h*scale/2,w:art.w*scale,h:art.h*scale,scale,name:art.name,kind:art.kind};sites.push(site);
  for(let y=Math.floor(site.y/TILE)-1;y<Math.ceil((site.y+site.h)/TILE)+1;y++)for(let x=Math.floor(site.x/TILE)-1;x<Math.ceil((site.x+site.w)/TILE)+1;x++)if(x>=0&&y>=0&&x<SIZE&&y<SIZE&&terrain[y*SIZE+x]!==3)terrain[y*SIZE+x]=4;
  if(art.house){const[hx,hy,hw,hh,door]=art.house;
   const house={id:objects.length,type:'house',scene:index,site:sites.length-1,kind:art.kind,src:art.house.slice(0,4),x:site.x+(hx+hw/2)*scale,y:site.y+(hy+hh/2)*scale,w:hw*scale,h:hh*scale,doorX:site.x+door*scale,doorY:site.y+(hy+hh)*scale};objects.push(house);
   const pools={store:['knife','food','water','cloth'],fuel:['matches','water','scrap','axe'],warehouse:['pickaxe','scrap','axe','cloth'],camp:['knife','food','med','matches'],military:['gun','ammo','rifle','rifleAmmo'],church:['med','cloth','food','water'],farm:['axe','food','water','matches']};
   const loot=pools[art.kind]||pools.store;
   loot.forEach((item,i)=>objects.push({id:objects.length,type:'loot',house:house.id,item,amount:item==='ammo'?12:item==='rifleAmmo'?8:item==='cloth'?2:1,x:house.x-house.w*.3+(i%2)*house.w*.6,y:house.y-house.h*.2+Math.floor(i/2)*house.h*.4,open:false}));
  }
  const blockers=[[[49,142,82,37]],[[408,219,48,63]],[[470,159,75,55]],[],[[23,95,175,78]],[[296,0,264,311]],[[361,208,64,70]],[],[[275,214,75,52]]][index];
  for(const[bx,by,bw,bh]of blockers)objects.push({id:objects.length,type:'prop',x:site.x+(bx+bw/2)*scale,y:site.y+(by+bh/2)*scale,w:bw*scale,h:bh*scale});
  // Supplies on the ground are scattered individually, rather than a starter kit.
  if(index===4||index===5)for(let i=0;i<3;i++)objects.push({id:objects.length,type:'loot',item:['water','scrap','cloth'][i],amount:1,x:site.x+70+i*40,y:site.y+site.h*.75,open:false});
 }
 for(let y=3;y<SIZE-3;y++)for(let x=3;x<SIZE-3;x++){
  const t=tileAt(x,y),r=hash(x,y,8),wx=x*TILE+16,wy=y*TILE+16;
  if(t===2||t===3||sites.some(a=>wx>a.x-25&&wx<a.x+a.w+25&&wy>a.y-25&&wy<a.y+a.h+25))continue;
  if(r<(t===1?.39:.065))objects.push({id:objects.length,type:'tree',x:wx,y:wy,hp:4});
  else if(r>.980)objects.push({id:objects.length,type:'rock',x:wx,y:wy,hp:4});
  else if(r>.971)objects.push({id:objects.length,type:'branch',x:wx,y:wy});
  else if(r>.966)objects.push({id:objects.length,type:'looseStone',x:wx,y:wy});
  else if(r>.961)objects.push({id:objects.length,type:'berry',x:wx,y:wy});
  else if(r>.957)objects.push({id:objects.length,type:'stump',x:wx,y:wy});
 }
 rebuildBuckets();makeTiles();
}
let buckets=new Map();
function bucketKey(x,y){return Math.floor(x/192)+','+Math.floor(y/192);}
function rebuildBuckets(){buckets=new Map();for(const o of objects){let k=bucketKey(o.x,o.y);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(o);}}
function nearObjects(x,y,r=100){const out=[];for(let yy=Math.floor((y-r)/192);yy<=Math.floor((y+r)/192);yy++)for(let xx=Math.floor((x-r)/192);xx<=Math.floor((x+r)/192);xx++){const list=buckets.get(xx+','+yy);if(list)out.push(...list);}return out;}
function makeTiles(){tiles=GameArt.textures;}
function reset(newSeed=true){
 if(newSeed)seed=Math.floor(Math.random()*1000000);
 bag=Object.fromEntries(Object.keys(names).map(k=>[k,0]));
 player={x:0,y:0,hp:100,hunger:100,thirst:100,stamina:100,ammo:0,rifleAmmo:0,angle:Math.PI/2,invuln:0};
 time=465;day=1;elapsed=kills=looted=harvested=0;weapon='fists';reloadTimer=shootTimer=spawnTimer=saveTimer=0;goalDone=new Set();bullets=[];particles=[];floaters=[];
 generate();const first=objects.find(o=>o.type==='house');player.x=first.doorX;player.y=first.doorY+38;
 for(let i=0;i<13;i++)spawnZombie(330+i*6);updateUI();
}
function startGame(load=false){if(load){if(!loadGame())return;}else reset();hasRun=true;state='playing';saveGame();document.querySelectorAll('.overlay').forEach(e=>e.hidden=true);document.body.classList.remove('bag-open');canvas.focus({preventScroll:true});toast('Nu ai echipament. Intră în magazin și caută provizii.');updateUI();}
function spawnZombie(min=260){for(let tries=0;tries<40;tries++){const a=rand(0,Math.PI*2),r=rand(min,min+300),x=player.x+Math.cos(a)*r,y=player.y+Math.sin(a)*r;if(x<30||y<30||x>WORLD-30||y>WORLD-30||blocked(x,y)||objects.some(o=>o.type==='house'&&inHouse(x,y,o)))continue;const variant=(zombies.length+Math.floor(rand(0,9)))%9;zombies.push({x,y,variant,hp:variant===4?6:variant===2?4:3,maxHp:variant===4?6:variant===2?4:3,angle:0,phase:rand(0,6),attack:0,speed:variant===1?rand(25,30):variant===7?rand(10,14):rand(14,21),aware:false});break;}}
function inHouse(x,y,o,margin=0){return x>o.x-o.w/2+margin&&x<o.x+o.w/2-margin&&y>o.y-o.h/2+margin&&y<o.y+o.h/2-margin;}
function currentHouse(x=player.x,y=player.y){return nearObjects(x,y,220).find(o=>o.type==='house'&&inHouse(x,y,o))||null;}
function blocked(x,y){
 if(x<12||y<12||x>WORLD-12||y>WORLD-12||tileAt(x/TILE,y/TILE)===2)return true;
 for(const o of nearObjects(x,y,220)){
  if(o.removed)continue;
  if(o.type==='tree'&&Math.abs(x-o.x)<8&&Math.abs(y-o.y)<5)return true;
  if(o.type==='rock'&&Math.abs(x-o.x)<10&&Math.abs(y-o.y)<6)return true;
  if(o.type==='prop'&&Math.abs(x-o.x)<o.w/2&&Math.abs(y-o.y)<o.h/2)return true;
  if(o.type==='house'&&inHouse(x,y,o)){
   const wall=6,door=Math.abs(x-o.doorX)<12;
   if(x<o.x-o.w/2+wall||x>o.x+o.w/2-wall||y<o.y-o.h/2+wall||y>o.doorY-wall&&!door)return true;
   // Solid furniture along the interior edges; the doorway and central aisle remain clear.
   if(Math.abs(x-(o.x-o.w*.34))<8&&Math.abs(y-(o.y-o.h*.25))<10)return true;
  }
 }
 return false;
}
function moveEntity(e,dx,dy){if(!blocked(e.x+dx,e.y))e.x+=dx;if(!blocked(e.x,e.y+dy))e.y+=dy;}
function toast(message,bad=false){const el=document.createElement('div');el.className='toast'+(bad?' bad':'');el.textContent=message;$('toasts').append(el);setTimeout(()=>el.remove(),3500);while($('toasts').children.length>4)$('toasts').firstChild.remove();}
function tone(freq=200,duration=.08,type='square',volume=.025){if(!sound)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();const a=audio.createOscillator(),g=audio.createGain();a.type=type;a.frequency.setValueAtTime(freq,audio.currentTime);a.frequency.exponentialRampToValueAtTime(Math.max(20,freq/2),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);a.connect(g);g.connect(audio.destination);a.start();a.stop(audio.currentTime+duration);}catch{}}
function addParticle(x,y,color,n=6){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-24,24),vy:rand(-24,24),life:rand(.2,.6),color});}
function floater(x,y,text,color='#d4dfa7'){floaters.push({x,y,text,color,life:1.3});}
function closestInteraction(){
 let best=null,bd=32;const house=currentHouse();
 for(const o of nearObjects(player.x,player.y,220)){
  if(o.removed||o.open||o.type==='stump'||o.type==='campfire'||o.type==='prop')continue;
  if(o.type==='house')continue;
  if(o.type==='loot'&&o.house!==undefined&&o.house!==house?.id)continue;
  if(house&&o.house!==house.id)continue;
  const d=distance(player,o);if(d<bd){best=o;bd=d;}
 }
 if(!best){for(const o of nearObjects(player.x,player.y,220))if(o.type==='house'&&Math.hypot(player.x-o.doorX,player.y-o.doorY)<31)return{type:'door',x:o.doorX,y:o.doorY,house:o};}
 if(!best&&!house)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if(tileAt(player.x/TILE+x,player.y/TILE+y)===2)return{type:'water',x:player.x,y:player.y};
 return best;
}
function interact(){
 if(!canAct()||useTimer>0)return;const o=closestInteraction();
 if(!o){toast('Caută în case sau apropie-te de o resursă.');return;}
 if(o.type==='door'){const h=o.house;const exiting=currentHouse()?.id===h.id;player.x=h.doorX;player.y=h.doorY+(exiting?14:-17);insideHouse=currentHouse()?.id??null;useTimer=.4;toast(exiting?'Ai ieșit afară.':'Ai intrat. Caută obiecte în încăpere.');updateUI();return;}
 useTimer=.5;
 if(o.type==='loot'){o.open=true;looted++;bag[o.item]+=o.amount;if(weapons.includes(o.item)&&weapon==='fists'){weapon=o.item;toast('Echipat: '+names[o.item]);}toast('+'+o.amount+' '+names[o.item]);tone(520,.12,'sine');}
 else if(o.type==='tree'||o.type==='rock'){
  const tool=o.type==='tree'?'axe':'pickaxe';
  if(!bag[tool]){if(elapsed-lastRefusal>1||lastRefusal===0){toast('Ai nevoie de '+names[tool].toLowerCase()+'.',true);lastRefusal=elapsed;}return;}
  o.hp--;harvested++;const k=o.type==='tree'?'wood':'stone';bag[k]++;floater(o.x,o.y-20,'+1 '+names[k]);addParticle(o.x,o.y,o.type==='tree'?'#8b7859':'#9f9f89');if(o.hp<=0)o.removed=true;tone(150,.06);
 }else if(o.type==='branch'||o.type==='looseStone'){const k=o.type==='branch'?'wood':'stone';o.removed=true;bag[k]++;harvested++;toast('+1 '+names[k]);}
 else if(o.type==='berry'){bag.food++;o.removed=true;toast('+1 Hrană adunată');}
 else if(o.type==='water'){if(bag.water>=10){toast('Ai suficientă apă.');return;}bag.water++;toast('+1 Apă umplută');tone(600,.1,'sine');}
 updateUI();
}
function consume(k){if(!canAct())return;if(weapons.includes(k)){if(!bag[k]){toast('Trebuie să găsești '+names[k].toLowerCase()+'.',true);return;}weapon=k;reloadTimer=0;toast('Echipat: '+names[k]);updateUI();return;}if(k==='camp'){placeCamp();return;}const stat={food:'hunger',water:'thirst',med:'hp'}[k];if(!stat){toast((names[k]||'Obiect')+': resursă pentru crafting.');return;}if(!bag[k]){toast('Nu mai ai '+names[k].toLowerCase()+'.',true);return;}if(player[stat]>=100){toast('Nu ai nevoie acum.');return;}bag[k]--;player[stat]=Math.min(100,player[stat]+(k==='med'?40:45));toast(k==='med'?'Rănile au fost bandajate.':k==='food'?'Ai mâncat o conservă.':'Te-ai hidratat.');tone(680,.1,'sine');updateUI();}
function craft(i){if(!canAct())return;const r=recipes[i];if(!Object.entries(r.cost).every(([k,n])=>bag[k]>=n))return;for(const[k,n]of Object.entries(r.cost))bag[k]-=n;bag[r.id]+=r.id==='ammo'?12:1;toast('Creat: '+r.name);if(r.id==='camp')toast('Atinge focul din rucsac pentru a-l amplasa.');tone(750,.15,'sine');updateUI();}
function placeCamp(){if(!bag.camp||!canAct())return;if(currentHouse()){toast('Aprinde focul afară.',true);return;}if(zombies.some(z=>distance(z,player)<65)){toast('Prea periculos. Îndepărtează zombii.',true);return;}bag.camp--;const c={id:objects.length,type:'campfire',x:player.x+18,y:player.y+12};objects.push(c);rebuildBuckets();toast('Foc aprins. Stai aproape pentru vindecare.');updateUI();}
function reload(){
 if(state!=='playing'||!magazine[weapon]||reloadTimer>0||player[weapon==='rifle'?'rifleAmmo':'ammo']>=magazine[weapon])return;
 const key=weapon==='rifle'?'rifleAmmo':'ammo';if(!bag[key]){toast('Nu ai cartușe potrivite. Caută muniție.',true);shootTimer=.6;return;}reloadTimer=weapon==='rifle'?1.7:1.3;toast('Se reîncarcă…');tone(350,.08);
}
function attack(auto=false){
 if(state!=='playing'||shootTimer>0||reloadTimer>0)return;
 let angle=player.angle;const house=currentHouse();const target=zombies.filter(z=>distance(z,player)<(weapon==='rifle'?400:280)&&currentHouse(z.x,z.y)?.id===house?.id).sort((a,b)=>distance(a,player)-distance(b,player))[0];
 if(auto){if(target)angle=Math.atan2(target.y-player.y,target.x-player.x);player.angle=angle;}
 if(magazine[weapon]){
  const key=weapon==='rifle'?'rifleAmmo':'ammo';if(!player[key]){reload();return;}player[key]--;shootTimer=weapon==='rifle'?.65:.3;const vx=Math.cos(angle),vy=Math.sin(angle);bullets.push({x:player.x+vx*13,y:player.y-5+vy*13,vx:vx*470,vy:vy*470,life:weapon==='rifle'?1:.75,damage:weapon==='rifle'?3:1});shake=1.8;addParticle(player.x+vx*14,player.y-5+vy*14,'#e3cea2',4);tone(110,.08,'sawtooth',.05);for(const z of zombies)if(distance(z,player)<400)z.aware=true;
 }else{
  shootTimer=weapon==='fists'?.55:weapon==='knife'?.32:.55;
  if(target&&distance(target,player)<(weapon==='fists'?27:39)){hurtZombie(target,weapon==='fists'?.5:weapon==='knife'?1.5:2);addParticle(target.x,target.y,'#945c46');}
  const o=closestInteraction();if((!target||distance(target,player)>40)&&o&&(o.type==='tree'&&weapon==='axe'||o.type==='rock'&&weapon==='pickaxe'))interact();tone(180,.1,'triangle');
 }
 updateUI();
}
function hurtZombie(z,n){z.hp-=n;z.aware=true;z.x+=Math.cos(player.angle)*3;z.y+=Math.sin(player.angle)*3;addParticle(z.x,z.y-6,'#733d34',5);if(z.hp<=0){kills++;if(Math.random()>.5){bag.scrap++;floater(z.x,z.y-13,'+1 Metal');}addParticle(z.x,z.y,'#455e36',10);zombies.splice(zombies.indexOf(z),1);}}
function switchWeapon(){if(!canAct())return;const available=weapons.filter(k=>k==='fists'||bag[k]>0);weapon=available[(available.indexOf(weapon)+1)%available.length];reloadTimer=0;toast('Echipat: '+weaponNames[weapon]);updateUI();}
function saveGame(){if(!hasRun||!player||player.hp<=0)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:2,seed,player,bag,time,day,elapsed,kills,looted,harvested,weapon,goalDone:[...goalDone],changes:objects.filter(o=>o.open||o.removed||o.hp&&o.hp<4).map(o=>({id:o.id,open:o.open,removed:o.removed,hp:o.hp})),camps:objects.filter(o=>o.type==='campfire').map(o=>({x:o.x,y:o.y}))}));$('saveStatus').textContent='Salvare automată activă';}catch{$('saveStatus').textContent='Salvare indisponibilă · memoria este plină';}}
function loadGame(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(!s||s.version!==2||!Number.isFinite(s.seed)||!s.player||!s.bag||!Number.isFinite(s.player.x)||s.player.hp<=0)throw Error();seed=s.seed;generate();player=s.player;bag=s.bag;time=s.time;day=s.day;elapsed=s.elapsed;kills=s.kills;looted=s.looted;harvested=s.harvested;weapon=s.weapon;insideHouse=currentHouse()?.id??null;goalDone=new Set(s.goalDone);for(const c of s.changes){if(objects[c.id])Object.assign(objects[c.id],c);}for(const c of s.camps)objects.push({id:objects.length,type:'campfire',...c});rebuildBuckets();zombies=[];bullets=[];particles=[];floaters=[];reloadTimer=shootTimer=spawnTimer=0;for(let i=0;i<13;i++)spawnZombie(320);updateUI();return true;}catch{toast('Salvarea nu poate fi încărcată. Începe o lume nouă.',true);return false;}}
function pause(){if(state==='playing'){clearInput();state='paused';saveGame();$('pauseOverlay').hidden=false;}else if(state==='paused'){state='playing';$('pauseOverlay').hidden=true;updateUI();}}
function showMap(){if(state==='dead'||state==='title'||state==='help')return;if(state==='map'){state=mapReturnState;$('mapOverlay').hidden=true;return;}clearInput();mapReturnState=state;state='map';$('mapOverlay').hidden=false;drawMap();}
function help(){if(state==='help'){state=helpReturnState;$('helpOverlay').hidden=true;return;}clearInput();helpReturnState=state;state='help';$('helpOverlay').hidden=false;}
function die(){state='dead';$('deathOverlay').hidden=false;$('deathStats').textContent=`Ai rezistat ${Math.floor(elapsed/60)} min ${Math.floor(elapsed%60)} sec · Ziua ${day}. Zombi eliminați: ${kills}. Lăzi găsite: ${looted}.`;try{localStorage.removeItem(SAVE_KEY);}catch{}tone(80,.8,'sawtooth');updateUI();}
function update(dt){if(state!=='playing')return;elapsed+=dt;time+=dt*2.4;if(time>=1440){time-=1440;day++;toast('Un nou răsărit. Ziua '+day);saveGame();}const night=time<360||time>1140;let dx=(keys.d||keys.ArrowRight?1:0)-(keys.a||keys.ArrowLeft?1:0)+stick.x,dy=(keys.s||keys.ArrowDown?1:0)-(keys.w||keys.ArrowUp?1:0)+stick.y;let length=Math.hypot(dx,dy);if(length>1){dx/=length;dy/=length;}const running=(keys.Shift||Math.hypot(stick.x,stick.y)>.88)&&player.stamina>1&&length>.1;const speed=running?98:65;if(length>.08){moveEntity(player,dx*speed*dt,dy*speed*dt);walkPhase+=dt*(running?16:10);if(!pointer.active)player.angle=Math.atan2(dy,dx);}insideHouse=currentHouse()?.id??null;if(pointer.active)player.angle=Math.atan2(pointer.y-(player.y-cam.y),pointer.x-(player.x-cam.x));player.stamina=Math.max(0,Math.min(100,player.stamina+(running?-14:9)*dt));player.hunger=Math.max(0,player.hunger-dt*.12);player.thirst=Math.max(0,player.thirst-dt*.18);if(player.hunger===0||player.thirst===0)player.hp-=dt*1.5;player.invuln=Math.max(0,player.invuln-dt);for(const o of nearObjects(player.x,player.y,48))if(o.type==='campfire'&&distance(o,player)<45)player.hp=Math.min(100,player.hp+dt*1.2);shootTimer=Math.max(0,shootTimer-dt);useTimer=Math.max(0,useTimer-dt);if(reloadTimer>0){reloadTimer-=dt;if(reloadTimer<=0){const key=weapon==='rifle'?'rifleAmmo':'ammo';let n=Math.min(magazine[weapon]-player[key],bag[key]);player[key]+=n;bag[key]-=n;toast('Armă reîncărcată');updateUI();}}if(shooting||touchFire)attack(touchFire);if(actionHeld)interact();
 for(const z of zombies){const d=distance(z,player);z.phase+=dt*7;z.attack=Math.max(0,z.attack-dt);if(d<145)z.aware=true;if(z.aware&&d>14&&d<650){const ph=currentHouse(),zh=currentHouse(z.x,z.y);let tx=player.x,ty=player.y;if(ph&&ph.id!==zh?.id){tx=ph.doorX;ty=ph.doorY-10;}else if(zh&&!ph){tx=zh.doorX;ty=zh.doorY+12;}z.angle=Math.atan2(ty-z.y,tx-z.x);const speed=z.speed*(night?1.5:1);const ox=z.x,oy=z.y;moveEntity(z,Math.cos(z.angle)*speed*dt,Math.sin(z.angle)*speed*dt);if(Math.abs(ox-z.x)+Math.abs(oy-z.y)<.01)moveEntity(z,Math.cos(z.angle+1.1)*speed*dt,Math.sin(z.angle+1.1)*speed*dt);}if(d<17&&z.attack<=0&&player.invuln<=0&&currentHouse(z.x,z.y)?.id===currentHouse()?.id){player.hp-=night?15:10;player.invuln=.65;z.attack=1;shake=4;addParticle(player.x,player.y,'#a3493b');tone(70,.15,'sawtooth');}}
 for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let hit=false;for(const z of [...zombies])if(distance(b,{x:z.x,y:z.y-4})<11){hurtZombie(z,b.damage);hit=true;break;}if(b.life<=0||hit||blocked(b.x,b.y+5))bullets.splice(i,1);}
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1);}
 for(let i=floaters.length-1;i>=0;i--){floaters[i].y-=dt*12;floaters[i].life-=dt;if(floaters[i].life<=0)floaters.splice(i,1);}
 zombies=zombies.filter(z=>distance(z,player)<850);spawnTimer+=dt;if(spawnTimer>4){spawnTimer=0;if(zombies.length<(night?28:19))spawnZombie(240);}saveTimer+=dt;if(saveTimer>15){saveTimer=0;saveGame();}uiTimer+=dt;if(uiTimer>.15){uiTimer=0;updateUI();}if(player.hp<=0){player.hp=0;die();}}
// Tiny, hand-drawn pixel sprites. All artwork is original and generated locally.
function drawTree(c,x,y,n){GameArt.tree(c,x,y,n);}
function drawInterior(c,o){
 const x=Math.floor(o.x-o.w/2),y=Math.floor(o.y-o.h/2),w=Math.ceil(o.w),h=Math.ceil(o.h);
 rect(c,x-2,y-2,w+4,h+4,'#262923');rect(c,x+5,y+5,w-10,h-10,'#655f4d');
 for(let yy=y+5;yy<y+h-5;yy+=8){rect(c,x+5,yy,w-10,1,'#4e4b3e');for(let xx=x+10;xx<x+w-5;xx+=31)rect(c,xx+(Math.floor((yy-y)/8)%2)*12,yy,1,8,'#514d40');}
 rect(c,x,y,w,5,'#aaa58a');rect(c,x,y,5,h,'#777764');rect(c,x+w-5,y,5,h,'#575b4d');
 rect(c,x,y+h-5,w,5,'#7c7a63');rect(c,o.doorX-12,y+h-6,24,7,'#7b7259');
 for(let yy=y+6;yy<y+h-7;yy+=2)for(let xx=x+6;xx<x+w-7;xx+=3){const v=hash(xx,yy,o.id);if(v>.7)rect(c,xx,yy,2,1,v>.9?'#7b735b':'#5a5748');}
 // Bed, storage shelves, table, scattered debris and muted window light.
 rect(c,x+13,y+12,20,30,'#333b33');rect(c,x+14,y+13,18,7,'#b3b09a');rect(c,x+14,y+21,18,18,'#686e5e');rect(c,x+16,y+21,3,18,'#838675');
 rect(c,x+w-29,y+10,18,25,'#3b352b');for(let i=0;i<3;i++)rect(c,x+w-28,y+12+i*7,16,2,'#8c7b59');
 rect(c,o.x-13,o.y-8,26,17,'#3e382c');rect(c,o.x-12,o.y-9,24,14,'#8a7858');rect(c,o.x-10,o.y-8,19,1,'#a79872');
 rect(c,x+12,y+h-28,12,13,'#494438');rect(c,x+13,y+h-29,10,3,'#a59a7a');
 rect(c,x+w-28,y+h-27,16,2,'#6c614a');rect(c,x+w-19,y+h-22,6,2,'#88836b');
 c.fillStyle='#c5c1a310';c.beginPath();c.moveTo(x+4,y+20);c.lineTo(x+w*.6,y+44);c.lineTo(x+w*.6,y+65);c.lineTo(x+4,y+40);c.fill();
}
function drawHouse(c,o){if(insideHouse===o.id)drawInterior(c,o);else GameArt.exterior(c,o);}
function drawObject(c,o){
 const x=Math.floor(o.x),y=Math.floor(o.y);
 if(o.type==='house'){drawHouse(c,o);return;}
 if(o.house!==undefined&&o.house!==insideHouse)return;
 if(o.removed||o.type==='stump'){if(o.type==='tree'||o.type==='stump'){rect(c,x-4,y-3,8,6,'#403c2f');rect(c,x-3,y-4,6,3,'#958361');rect(c,x-1,y-4,1,3,'#66583e');}return;}
 if(o.type==='tree')drawTree(c,x,y,o.id);
 else if(o.type==='rock'){c.fillStyle='#33392d';c.beginPath();c.moveTo(x-12,y+4);c.lineTo(x-10,y-4);c.lineTo(x-5,y-12);c.lineTo(x+4,y-13);c.lineTo(x+11,y-5);c.lineTo(x+13,y+4);c.fill();rect(c,x-7,y-8,11,8,'#878976');rect(c,x-4,y-11,7,3,'#a2a18b');rect(c,x+4,y-6,5,7,'#666f5e');rect(c,x-10,y,8,4,'#727b61');rect(c,x-4,y-4,3,2,'#a5a68e');}
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
 for(const site of sites)if(site.x<cam.x+w&&site.x+site.w>cam.x&&site.y<cam.y+h&&site.y+site.h>cam.y)GameArt.scene(ctx,site);
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
 if(darkness>0){ctx.fillStyle=`rgba(12,19,24,${Math.min(.62,darkness)})`;ctx.fillRect(0,0,w,h);ctx.save();ctx.globalCompositeOperation='screen';for(const o of visible)if(o.type==='campfire'){const g=ctx.createRadialGradient(o.x-cam.x,o.y-cam.y,1,o.x-cam.x,o.y-cam.y,70);g.addColorStop(0,'#ad762960');g.addColorStop(1,'#ad762900');ctx.fillStyle=g;ctx.fillRect(o.x-cam.x-70,o.y-cam.y-70,140,140);}ctx.restore();}
 if(player.hp<30){const g=ctx.createRadialGradient(w/2,h/2,h/4,w/2,h/2,w*.65);g.addColorStop(0,'#9f302000');g.addColorStop(1,'#9f302075');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}drawMinimap();
}
function drawMinimap(){if(canvas.width<340||matchMedia('(pointer:coarse)').matches)return;const s=51,x=canvas.width-s-10,y=canvas.height-67;ctx.fillStyle='#252a22e0';ctx.fillRect(x-3,y-3,s+6,s+6);for(let yy=0;yy<s;yy++)for(let xx=0;xx<s;xx++){const tx=Math.floor(player.x/TILE)+xx-25,ty=Math.floor(player.y/TILE)+yy-25;ctx.fillStyle=Object.values(colors)[tileAt(tx,ty)];ctx.fillRect(x+xx,y+yy,1,1);}rect(ctx,x+24,y+24,3,3,'#e0d8ae');ctx.strokeStyle='#b4ac8a70';ctx.strokeRect(x-3,y-3,s+6,s+6);}
function drawMap(){const c=$('bigMap'),g=c.getContext('2d');for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)rect(g,x,y,1,1,Object.values(colors)[tileAt(x,y)]);for(const site of sites){rect(g,site.x/TILE,site.y/TILE,site.w/TILE,site.h/TILE,'#9c8c68');g.font='7px monospace';g.fillStyle='#ded2ab';g.fillText(['B','M','D','T','R','L','A','†','F'][site.scene],site.x/TILE+3,site.y/TILE+5);}g.strokeStyle='#ece5b1';g.lineWidth=1;g.beginPath();g.arc(player.x/TILE,player.y/TILE,5,0,Math.PI*2);g.stroke();rect(g,player.x/TILE-1,player.y/TILE-1,3,3,'#fff4c6');}
function drawItem(c,type){const g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.save();g.translate(c.width/2-12,c.height/2-12);if(type==='food'){rect(g,6,4,13,18,'#a4a68a');rect(g,7,6,11,14,'#aa6244');rect(g,7,10,11,6,'#c9b07e');rect(g,9,11,6,4,'#667b40');rect(g,6,4,13,2,'#d2c9a8');rect(g,6,21,13,2,'#6e7968');}else if(type==='water'){rect(g,9,2,7,4,'#b5c7ac');rect(g,7,7,11,15,'#679c9e');rect(g,9,5,7,4,'#a0c3b7');rect(g,8,12,9,7,'#acd0bd');rect(g,9,14,6,2,'#5d8e8c');rect(g,8,8,2,4,'#b9d8c6');}else if(type==='med'){rect(g,4,8,17,12,'#b8b5a0');rect(g,6,6,13,16,'#d5d0b8');rect(g,9,9,7,10,'#9c6551');rect(g,7,12,11,4,'#9c6551');rect(g,5,8,2,12,'#f0e3c5');}else if(type==='wood'){for(let i=0;i<3;i++){g.save();g.translate(4+i*4,7+i*3);g.rotate(-.35);rect(g,0,0,16,5,'#936c42');rect(g,1,1,14,1,'#b9945d');rect(g,14,0,3,5,'#c2a66d');rect(g,15,1,1,3,'#6c5537');g.restore();}}else if(type==='stone'){rect(g,3,13,18,7,'#768071');rect(g,6,7,13,11,'#99a38b');rect(g,7,6,8,4,'#bdc3a7');rect(g,17,11,4,7,'#656f61');rect(g,4,14,8,2,'#a3ac96');}else if(type==='scrap'){rect(g,4,5,7,16,'#7b8c86');rect(g,5,5,3,14,'#bec2aa');rect(g,10,11,10,7,'#8c9a8b');rect(g,10,11,10,2,'#bfc7ac');rect(g,16,5,4,6,'#ad835b');rect(g,13,18,6,3,'#596f62');}else if(type==='ammo'){for(let i=0;i<3;i++){rect(g,4+i*6,8-i*2,4,13,'#bca060');rect(g,4+i*6,6-i*2,4,4,'#d2c28c');rect(g,5+i*6,4-i*2,2,4,'#b5894e');rect(g,4+i*6,19,4,2,'#755a38');}}else if(type==='camp'){rect(g,3,19,20,4,'#806445');rect(g,9,12,9,10,'#dc8f45');rect(g,11,5,5,14,'#e8b853');rect(g,9,10,3,9,'#e8b853');rect(g,13,12,2,8,'#f6dfa1');}else if(type==='gun'){rect(g,3,8,22,5,'#9aa794');rect(g,5,8,18,2,'#ccd0b7');rect(g,8,12,6,10,'#6c7967');rect(g,15,13,6,4,'#59674f');rect(g,23,9,3,3,'#424e40');}else if(type==='axe'){g.rotate(-.4);rect(g,3,11,22,3,'#aa8a51');rect(g,18,4,8,9,'#b5c0aa');rect(g,24,5,2,7,'#e2ddbe');}else if(type==='knife'){g.translate(12,12);g.rotate(-.7);rect(g,-2,0,4,10,'#856643');rect(g,-3,-2,6,2,'#b2ab89');rect(g,-1,-12,3,10,'#d0d0b3');rect(g,2,-10,1,8,'#838c7a');}else if(type==='rifle'){g.translate(12,12);g.rotate(-.4);rect(g,-12,-2,27,3,'#9eaa92');rect(g,-13,-1,10,5,'#916a42');rect(g,1,1,5,5,'#4e5548');}else if(type==='rifleAmmo'){for(let i=0;i<3;i++){rect(g,4+i*6,6,3,16,'#ad945f');rect(g,4+i*6,2,3,5,'#c8b382');}}else if(type==='cloth'){rect(g,4,6,17,15,'#9d9c89');rect(g,6,4,14,16,'#c5c1a6');rect(g,9,7,1,12,'#8b8c76');rect(g,7,13,12,1,'#aaa58b');}else if(type==='matches'){rect(g,4,6,17,15,'#866947');rect(g,5,6,15,11,'#bbab7e');rect(g,9,9,7,5,'#94634b');rect(g,4,19,17,3,'#484635');}else if(type==='pickaxe'){g.rotate(-.4);rect(g,6,11,20,3,'#9c7e51');rect(g,18,4,3,16,'#a9b19a');rect(g,15,3,7,2,'#d1cfad');}else if(type==='fists'){rect(g,7,7,13,13,'#b28c65');rect(g,6,8,3,7,'#cfaa7a');rect(g,9,4,3,9,'#d4b083');rect(g,13,4,3,9,'#d4b083');rect(g,17,6,3,8,'#c09b70');}g.restore();}
function initUI(){
 const defs=[['hp','Sănătate','♥','#b17465'],['hunger','Sațietate','◒','#c4b07b'],['thirst','Hidratare','◈','#8ca6a1'],['stamina','Energie','ϟ','#a7ad80']];
 $('compactVitals').innerHTML=defs.map(([id,name,icon,color])=>`<div title="${name}" aria-label="${name}"><span style="color:${color}">${icon}</span><div><i id="compact-${id}" style="background:${color}"></i></div></div>`).join('');
 $('vitals').innerHTML=defs.map(([id,name,icon,color])=>`<div class="vital"><span class="vital-icon" style="color:${color}">${icon}</span><div><span class="vital-label">${name}</span><div class="meter"><i id="bar-${id}" style="background:${color}"></i></div></div><span class="vital-value" id="val-${id}"></span></div>`).join('');
 $('inventory').innerHTML=Object.keys(names).map((k,i)=>`<button class="item" id="item-${k}" title="${names[k]}" aria-label="${names[k]}"><span class="item-key">${{food:2,water:3,med:4}[k]||''}</span><canvas width="32" height="32"></canvas><span class="count" id="count-${k}"></span></button>`).join('');
 for(const k of Object.keys(names)){drawItem($('item-'+k).querySelector('canvas'),k);$('item-'+k).onclick=()=>consume(k);}
 $('recipes').innerHTML=recipes.map((r,i)=>`<div class="recipe"><canvas width="30" height="30" id="recipe-icon-${i}"></canvas><div><div class="recipe-name">${r.name}</div><div class="recipe-cost">${Object.entries(r.cost).map(([k,n])=>n+' '+names[k].toLowerCase()).join(' · ')}</div></div><button id="craft-${i}">CREEAZĂ +</button></div>`).join('');
 recipes.forEach((r,i)=>{drawItem($('recipe-icon-'+i),r.id);$('craft-'+i).onclick=()=>craft(i);});GameArt.portrait($('portrait').getContext('2d'));drawItem($('weaponIcon'),'fists');
}
function updateUI(){if(!player)return;for(const k of ['hp','hunger','thirst','stamina']){$('bar-'+k).style.width=Math.max(0,player[k])+'%';$('compact-'+k).style.width=Math.max(0,player[k])+'%';$('val-'+k).textContent=Math.ceil(Math.max(0,player[k]))+' / 100';}let occupied=0;for(const[k,n]of Object.entries(bag)){$('count-'+k).textContent=n||'—';$('item-'+k).style.opacity=n?1:.4;if(n)occupied++;}$('bagCount').textContent=occupied+' / 16 TIPURI';recipes.forEach((r,i)=>$('craft-'+i).disabled=!Object.entries(r.cost).every(([k,n])=>bag[k]>=n)||!canAct());$('clock').textContent=String(Math.floor(time/60)).padStart(2,'0')+':'+String(Math.floor(time%60)).padStart(2,'0');$('dayText').textContent='ZIUA '+String(day).padStart(2,'0');$('weatherIcon').textContent=time<360||time>1140?'☾':'☀';$('coords').textContent='X '+String(Math.floor(player.x/TILE)).padStart(3,'0')+' · Y '+String(Math.floor(player.y/TILE)).padStart(3,'0');$('survived').textContent='Ziua '+day+' · '+kills+' zombi eliminați';const ammoKey=weapon==='rifle'?'rifleAmmo':'ammo';$('weaponName').innerHTML=magazine[weapon]?`▰ ${weaponNames[weapon].toUpperCase()} <b>${reloadTimer>0?'↻':player[ammoKey]+' / '+bag[ammoKey]}</b>`:`⌁ ${weaponNames[weapon].toUpperCase()} <b>—</b>`;$('equippedName').textContent=weaponNames[weapon];drawItem($('weaponIcon'),weapon);const near=zombies.filter(z=>distance(z,player)<130).length;$('dangerText').textContent=near?'● '+near+' ZOMBI ÎN APROPIERE':'● ZONĂ LINIȘTITĂ';$('dangerText').style.color=near?'#e6a17d':'#bacd9e';const t=tileAt(player.x/TILE,player.y/TILE);const site=sites.find(a=>player.x>a.x&&player.x<a.x+a.w&&player.y>a.y&&player.y<a.y+a.h);$('location').textContent=currentHouse()?'ÎN INTERIOR · '+(site?.name||'ADĂPOST'):site?site.name:t===3?'DRUMUL VECHI':t===4?'AȘEZARE ABANDONATĂ':t===2?'RÂUL RECE':'PĂDUREA DE NORD';const target=closestInteraction();const hints={door:currentHouse()?'Ieși din clădire':'Intră în clădire',loot:target?'Ia '+(names[target.item]||'obiectul'):'Caută',tree:'Taie copacul · topor',rock:'Extrage piatră · târnăcop',branch:'Adună creanga',looseStone:'Ridică piatra',berry:'Culege hrană',water:'Umple apa'};$('interactHint').textContent=target?'[ E ] '+hints[target.type]:'';$('touchUse').querySelector('span').textContent=target?.type==='door'?(currentHouse()?'IEȘI':'INTRĂ'):target?.type==='loot'?'RIDICĂ':'ADUNĂ';const goals=[looted>=1,harvested>=5,kills>=3,day>=3];const titles=['Intră în magazin și găsește provizii','Adună 5 resurse din natură','Elimină 3 zombi','Supraviețuiește până în ziua 3'];goals.forEach((yes,i)=>{if(yes&&!goalDone.has(i)){goalDone.add(i);if(state==='playing')toast('✓ Provocare încheiată: '+titles[i]);}});const current=goals.findIndex(x=>!x);$('objectiveLabel').textContent=current<0?'SUPRAVIEȚUITOR ADEVĂRAT':'PROVOCAREA '+(current+1)+' / 4';$('objectiveText').textContent=current<0?'Continuă să explorezi regiunea':titles[current];$('questCount').textContent=goals.filter(Boolean).length+' / 4';$('questProgress').style.width=goals.filter(Boolean).length*25+'%';if(player.thirst<25)$('fieldNote').textContent='„Apa se termină. Râul este în est; umple recipientele de pe mal.”';else if(time>1080||time<360)$('fieldNote').textContent='„Noaptea îi face mai rapizi. Ține arma încărcată și un foc aproape.”';else $('fieldNote').textContent='„Ușile încă se deschid. Caută în case, în depozite și la postul militar. Nimic nu vine de-a gata.”';}
const sidebarHome=document.querySelector('.sidebar').parentElement;
function toggleBag(){if(state==='inventory'){if(document.querySelector('.sidebar').parentElement===$('gameFrame'))sidebarHome.append(document.querySelector('.sidebar'));state='playing';document.body.classList.remove('bag-open');$('bagBtn').textContent='▦';}else if(state==='playing'){if(document.fullscreenElement)$('gameFrame').append(document.querySelector('.sidebar'));clearInput();state='inventory';document.body.classList.add('bag-open');$('bagBtn').textContent='×';}updateUI();}
function resize(){const r=canvas.getBoundingClientRect();canvas.width=Math.max(160,Math.floor(r.width/2));canvas.height=Math.max(160,Math.floor(r.height/2));ctx.imageSmoothingEnabled=false;}
function loop(now){const dt=Math.min((now-last)/1000||0,.05);last=now;frame++;update(dt);draw();requestAnimationFrame(loop);}
function clearInput(){keys={};shooting=touchFire=actionHeld=false;stick.x=stick.y=0;$('stick').style.transform='';}
window.addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Tab'].includes(k)&&state==='playing')e.preventDefault();if(e.repeat)return;keys[k]=true;if(k==='b')toggleBag();if(k==='Escape'){if(state==='inventory')toggleBag();else if(state==='map')showMap();else if(state==='help')help();else pause();}if(k==='m')showMap();if(k==='e')interact();if(k==='r')reload();if(k==='1')switchWeapon();if(k==='2')consume('food');if(k==='3')consume('water');if(k==='4')consume('med');if(k===' '){e.preventDefault();attack(true);}});
window.addEventListener('keyup',e=>{keys[e.key.length===1?e.key.toLowerCase():e.key]=false;});
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=canvas.getBoundingClientRect();pointer={x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height,active:true};});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;if(e.button===0){shooting=true;canvas.focus({preventScroll:true});}});window.addEventListener('pointerup',()=>{shooting=false;});canvas.addEventListener('pointerleave',()=>pointer.active=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
const joy=$('joystick');let joyPointer=null;function joyMove(e){const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),m=Math.min(d,33);stick.x=d>2?dx/d*m/33:0;stick.y=d>2?dy/d*m/33:0;$('stick').style.transform=`translate(${stick.x*27}px,${stick.y*27}px)`;pointer.active=false;}
joy.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);joyMove(e);e.preventDefault();});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)joyMove(e);});for(const event of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(event,()=>{joyPointer=null;stick.x=stick.y=0;$('stick').style.transform='';});
for(const[id,kind]of [['touchFire','fire'],['touchUse','use']]){const el=$(id);el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);if(kind==='fire'){touchFire=true;attack(true);}else{actionHeld=true;interact();}e.preventDefault();});for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>{if(kind==='fire')touchFire=false;else actionHeld=false;});}
$('expandBtn').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else $('gameFrame').requestFullscreen?.().catch(()=>toast('Ecranul complet nu este disponibil.'));};
$('worldMapBtn').onclick=showMap;$('bagBtn').onclick=toggleBag;$('closeBag').onclick=toggleBag;
$('startBtn').onclick=()=>startGame();$('continueBtn').onclick=()=>startGame(true);$('restartBtn').onclick=()=>startGame();$('pauseBtn').onclick=pause;$('resumeBtn').onclick=pause;$('saveBtn').onclick=()=>{saveGame();toast('Progres salvat pe acest dispozitiv.');};$('newBtn').onclick=()=>{if(confirm('Începi o lume nouă? Progresul salvat va fi înlocuit.'))startGame();};$('weaponBtn').onclick=switchWeapon;$('mapBtn').onclick=showMap;$('closeMap').onclick=showMap;$('helpBtn').onclick=help;$('closeHelp').onclick=help;$('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').style.color=sound?'#c0d394':'';$('soundBtn').setAttribute('aria-label',sound?'Dezactivează sunetul':'Activează sunetul');if(sound)tone(650,.15,'sine');toast(sound?'Sunet activat':'Sunet dezactivat');};
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.querySelector('.sidebar').parentElement===$('gameFrame'))sidebarHome.append(document.querySelector('.sidebar'));resize();});
window.addEventListener('resize',resize);window.addEventListener('blur',()=>{clearInput();if(state==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(state==='playing')pause();}});window.addEventListener('pagehide',saveGame);
$('startBtn').disabled=true;$('startBtn').textContent='SE ÎNCARCĂ LUMEA…';
GameArt.load().then(()=>{initUI();reset(false);resize();$('startBtn').disabled=false;$('startBtn').innerHTML='ÎNCEPE SUPRAVIEȚUIREA <span>↗</span>';try{$('continueBtn').hidden=!localStorage.getItem(SAVE_KEY);}catch{}requestAnimationFrame(loop);}).catch(error=>{$('startBtn').textContent='EROARE LA ÎNCĂRCARE';console.error(error);toast('Imaginile nu s-au încărcat. Reîncarcă pagina.',true);});
// Read-only diagnostics support repeatable smoke checks without changing gameplay.
window.survival = { getState:()=>({state,seed,day,time,player:{...player},bag:{...bag},weapon,kills,looted,harvested,zombies:zombies.length,objects:objects.length,mapSize:SIZE,insideHouse:currentHouse()?.id??null,siteCount:sites.length,goals:[...goalDone]}), getNearby:()=>({sites:sites.map(a=>({...a})),objects:nearObjects(player.x,player.y,250).filter(o=>!o.removed).map(o=>({...o})),zombies:zombies.map(z=>({...z}))}) };
})();
