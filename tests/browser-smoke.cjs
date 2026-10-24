const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL=process.env.GAME_URL||'http://127.0.0.1:8080',SAVE='ultimul-rasarit-v2';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[];let count=0;
 const check=(v,label)=>{assert.ok(v,label);console.log('PASS',label);count++;};
 const snapshot=p=>p.evaluate(()=>survival.getState());
 async function open(fixture,options={}){
  const c=await browser.newContext(options);await c.addInitScript(()=>{let n=437;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};});
  if(fixture)await c.addInitScript(({key,data})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(data));},{key:SAVE,data:fixture});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.stack));await p.goto(URL);await p.click(fixture?'#continueBtn':'#startBtn');return p;
 }
 async function persisted(p){await p.keyboard.press('Escape');await p.click('#saveBtn');return p.evaluate(k=>JSON.parse(localStorage.getItem(k)),SAVE);}
 const copy=o=>JSON.parse(JSON.stringify(o));
 try{
  const p=await open(null,{viewport:{width:1440,height:1000}});let s=await snapshot(p);
  check(s.mapSize===384&&s.siteCount===27&&s.objects>20000,'Larger world: 384 × 384, 27 locations and forests');
  check(s.weapon==='fists'&&s.player.ammo===0&&Object.values(s.bag).every(n=>n===0),'New survivor starts with absolutely no equipment');
  await p.keyboard.press('1');await p.keyboard.press('r');await p.keyboard.press(' ');
  check((await snapshot(p)).weapon==='fists'&&(await snapshot(p)).player.ammo===0,'Unfound weapons cannot be selected, fired or reloaded');
  await p.keyboard.press('e');
  check((await snapshot(p)).looted===0,'Interior loot cannot be taken from outside the building');
  const near=await p.evaluate(()=>survival.getNearby());const home=near.objects.find(o=>o.type==='house');
  const startY=s.player.y;await p.keyboard.down('w');await p.waitForTimeout(260);await p.keyboard.up('w');await p.keyboard.press('e');s=await snapshot(p);
  check(s.player.y<startY&&s.insideHouse===home.id,'Approach front door and enter a real explorable interior');
  await p.screenshot({path:'/workspace/game-artifacts/interior-v2.png'});
  await p.keyboard.press('e');await p.waitForTimeout(550);await p.keyboard.press('e');
  // The interaction cooldown prevents the immediate second keypress; allow it to clear.
  s=await snapshot(p);
  if(s.insideHouse!==null){await p.waitForTimeout(550);await p.keyboard.press('e');}
  check((await snapshot(p)).insideHouse===null,'Exit returns to the outdoor world');
  await p.keyboard.press('m');const time=(await snapshot(p)).time;await p.waitForTimeout(150);
  check((await snapshot(p)).state==='map'&&(await snapshot(p)).time===time,'Full region map pauses the world');await p.click('#closeMap');
  const saved=await persisted(p);
  // Save fixtures place the player beside real generated objects without debug mutations.
  const knife=near.objects.find(o=>o.type==='loot'&&o.item==='knife');const f=copy(saved);f.player.x=knife.x+9;f.player.y=knife.y+9;
  const searching=await open(f);await searching.keyboard.press('e');s=await snapshot(searching);
  check(s.bag.knife===1&&s.weapon==='knife'&&s.looted===1,'Knife must be physically found inside a house before equipping');
  await searching.keyboard.press('1');check((await snapshot(searching)).weapon==='fists','Weapon cycling offers only equipment actually found');
  await searching.keyboard.press('1');const knifeSave=await persisted(searching);await searching.reload();await searching.reload();await searching.click('#continueBtn');s=await snapshot(searching);
  check(s.seed===knifeSave.seed&&s.bag.knife===1&&s.weapon==='knife'&&s.insideHouse===knife.house,'Inventory, equipped weapon and interior position survive reloads');
  const lootedObject=await searching.evaluate(id=>survival.getNearby().objects.find(o=>o.id===id),knife.id);
  check(lootedObject.open,'Collected item remains removed after loading');
  const inventory=copy(saved);Object.assign(inventory.bag,{food:3,water:3,med:2,cloth:4,scrap:10,wood:10,stone:5,matches:2,ammo:24,gun:1});
  Object.assign(inventory.player,{hp:35,hunger:20,thirst:20,ammo:1});inventory.weapon='gun';
  const supplies=await open(inventory);await supplies.click('#item-food');await supplies.click('#item-water');await supplies.click('#item-med');s=await snapshot(supplies);
  check(s.player.hunger>60&&s.player.thirst>60&&s.player.hp===75,'Found food, water and bandages restore correct vitals');
  await supplies.click('#craft-0');s=await snapshot(supplies);check(s.bag.cloth===2&&s.bag.med===2,'Bandages are made from cloth rather than food');
  await supplies.click('#craft-1');await supplies.click('#item-camp');s=await snapshot(supplies);
  check(s.bag.wood===5&&s.bag.stone===2&&s.bag.matches===1&&s.bag.camp===0,'Campfire consumes wood, stone and a match and can be placed');
  await supplies.keyboard.press('r');await supplies.waitForFunction(()=>survival.getState().player.ammo===12,{},{timeout:5000});s=await snapshot(supplies);check(s.player.ammo===12&&s.bag.ammo===13,'Found pistol reloads from matching ammunition');
  const forest=await supplies.evaluate(()=>survival.getNearby().objects.find(o=>o.type==='tree'));const harvest=copy(saved);harvest.player.x=forest.x;harvest.player.y=forest.y+12;
  const gathering=await open(harvest);await gathering.keyboard.press('e');check((await snapshot(gathering)).harvested===0,'Trees cannot be chopped without finding or crafting an axe');
  await gathering.context().close();harvest.bag.axe=1;harvest.weapon='axe';const axe=await open(harvest);
  for(let i=0;i<4;i++){await axe.keyboard.press('e');await axe.waitForTimeout(540);}s=await snapshot(axe);
  check(s.harvested===4&&s.bag.wood===4,'A found axe harvests and exhausts a real tree');
  const variants=await axe.evaluate(()=>new Set(survival.getNearby().zombies.map(z=>z.variant)).size);check(variants>=4,'Enemies spawn with several different reference zombie models');
  const combatFixture=copy(inventory);combatFixture.player.ammo=12;combatFixture.player.hp=100;const combat=await open(combatFixture);let killed=false;
  for(let i=0;i<70;i++){await combat.keyboard.press(' ');await combat.waitForTimeout(310);if((await snapshot(combat)).kills>0){killed=true;break;}}
  check(killed,'Real projectile combat still eliminates pursuing zombies');
  const mobile=await open(null,{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await mobile.click('#bagBtn');s=await snapshot(mobile);const frozen=s.time;await mobile.waitForTimeout(150);
  check(s.state==='inventory'&&(await snapshot(mobile)).time===frozen&&await mobile.locator('.sidebar').isVisible(),'Mobile backpack opens without leaving the game and pauses danger');
  await mobile.click('#closeBag');const x=(await snapshot(mobile)).player.x;const joy=await mobile.locator('#joystick').boundingBox();const cdp=await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joy.x+joy.width-4,y:joy.y+joy.height/2}]});await mobile.waitForTimeout(500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  check((await snapshot(mobile)).player.x>x+10,'Mobile joystick moves the survivor');
  await mobile.locator('#touchFire').tap();check((await snapshot(mobile)).player.ammo===0&&(await snapshot(mobile)).weapon==='fists','Mobile survivor also starts and attacks unarmed');
  check(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile layout fits the phone width');await mobile.screenshot({path:'/workspace/game-artifacts/mobile-v2.png',fullPage:true});
  await mobile.setViewportSize({width:844,height:390});await mobile.waitForTimeout(150);check((await mobile.locator('#gameFrame').boundingBox()).height>=380,'Landscape phone devotes the screen to gameplay');await mobile.screenshot({path:'/workspace/game-artifacts/landscape-v2.png'});
  check(errors.length===0,'No JavaScript errors: '+errors.join('\n'));
  console.log(count+' checks passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
