const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const URL = process.env.GAME_URL || 'http://127.0.0.1:8080';
const SAVE = 'ultimul-rasarit-v4';
const UPSTREAM_COMMIT = 'fa2e73a3f899bd59ded1a9e920eda92f822c32ba';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true, args: ['--no-sandbox'],
  });
  const errors = [], imageRequests = [];
  let checks = 0;
  const check = (condition, label) => {
    assert.ok(condition, label);
    console.log('PASS', label);
    checks++;
  };
  const copy = value => JSON.parse(JSON.stringify(value));
  const state = page => page.evaluate(() => survival.getState());
  const nearby = page => page.evaluate(() => survival.getNearby());
  async function open(fixture, options = {}) {
    const context = await browser.newContext(options);
    await context.addInitScript(() => {
      let seed = 437;
      Math.random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
    });
    if (fixture) await context.addInitScript(({key, data}) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
    }, {key:SAVE, data:fixture});
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.stack));
    page.on('request', request => {
      if (/\/assets\/.*\.(png|jpe?g)(?:\?|$)/i.test(request.url())) imageRequests.push(request.url());
    });
    await page.goto(URL);
    await page.waitForFunction(() => document.getElementById('startBtn') && !document.getElementById('startBtn').disabled, null, {timeout:60000});
    await page.click(fixture ? '#continueBtn' : '#startBtn');
    return page;
  }
  async function save(page) {
    const current = (await state(page)).state;
    if (current === 'loot') await page.click('#closeLoot');
    else if (current === 'inventory') await page.click('#closeBag');
    else if (current === 'objective') await page.click('#closeRelay');
    else if (current === 'won') await page.click('#continueExplore');
    if ((await state(page)).state === 'playing') await page.keyboard.press('Escape');
    await page.click('#saveBtn');
    return page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE);
  }
  function placed(fixture, x, y) {
    const next = copy(fixture);
    Object.assign(next.player, {x, y});
    return next;
  }
  function change(fixture, object, fields) {
    const next = copy(fixture);
    next.changes = (next.changes || []).filter(entry => entry.id !== object.id);
    next.changes.push({id:object.id, ...fields});
    return next;
  }
  function beside(container, house) {
    return {
      x:Math.max(house.x-house.w/2+12, Math.min(house.x+house.w/2-12,container.x)),
      y:Math.max(house.y-house.h/2+12, Math.min(house.y+house.h/2-12,container.y+12)),
    };
  }
  async function pressMove(page, key, milliseconds) {
    await page.keyboard.down(key);
    await page.waitForTimeout(milliseconds);
    await page.keyboard.up(key);
    await page.waitForTimeout(60);
  }
  try {
    const page = await open(null, {viewport:{width:1440,height:1000}});
    let snapshot = await state(page);
    const world = await nearby(page);
    const questMarkers = await page.evaluate(() => { const game=survival.getState(); return SurvivalWorld.generate(game.seed,game.mapSize).objects.filter(object=>['relay','extract'].includes(object.type)); });
    check(snapshot.mapSize >= 384 && snapshot.siteCount >= 30, 'Large region contains many settlements');
    check(snapshot.weapon === 'fists' && snapshot.player.ammo === 0 &&
      Object.values(snapshot.bag).every(amount => amount === 0), 'New survivor starts completely empty handed');
    check(Object.keys(snapshot.bag).length >= 26, 'Inventory supports a wider range of useful loot');
    await page.keyboard.press('1'); await page.keyboard.press('r'); await page.keyboard.press(' ');
    check((await state(page)).weapon === 'fists' && (await state(page)).player.ammo === 0,
      'Unfound weapons cannot be equipped or fired');

    const artwork = await page.evaluate(() => {
      function sample(angle, phase) {
        const canvas = document.createElement('canvas'); canvas.width=64; canvas.height=64;
        const context = canvas.getContext('2d', {willReadFrequently:true});
        GameArt.person(context,32,48,angle,phase,'fists',null);
        const pixels = context.getImageData(0,0,64,64).data;
        let hash=2166136261; const colors=new Set();
        for (let i=0;i<pixels.length;i++) hash=Math.imul(hash^pixels[i],16777619)>>>0;
        for(let i=0;i<pixels.length;i+=4) if(pixels[i+3]) colors.add(Array.from(pixels.slice(i,i+4)).join(','));
        return {hash,colors:colors.size};
      }
      return {
        frames:Array.from({length:4},(_,i)=>sample(Math.PI/2,i+1).hash),
        directions:[0,Math.PI/2,Math.PI,-Math.PI/2].map(angle=>sample(angle,0).hash),
        idle:[sample(0,0).hash,sample(0,0).hash],
        colors:sample(Math.PI/2,0).colors,
        sourceCommit:GameArt.diagnostics.sourceCommit,
      };
    });
    check(new Set(artwork.frames).size === 4, 'Walking visibly changes actual sprite pixels across animation frames');
    check(new Set(artwork.directions).size === 4, 'Survivor has four distinct facing directions');
    check(artwork.idle[0] === artwork.idle[1] && artwork.colors > 4 && artwork.colors <= 80,
      'Idle sprite is stable and uses a deliberately limited pixel-art palette');
    check(artwork.sourceCommit === UPSTREAM_COMMIT && imageRequests.length > 0 && imageRequests.every(url => !['/assets/locations.png','/assets/survivor.png','/assets/zombies.png'].includes(new globalThis.URL(url).pathname)), 'Source startup uses pinned upstream sprites rather than pasted reference photographs');

    const house = world.objects.find(object => object.type === 'house');
    const container = world.objects.find(object => object.type === 'container' && object.house !== undefined);
    check(!!house && !!container, 'Nearby settlement contains actual buildings and searchable storage');
    const startX = snapshot.player.x;
    await page.keyboard.down('d'); await page.waitForTimeout(190);
    const moving1=await state(page); await page.waitForTimeout(190); const moving2=await state(page);
    await page.keyboard.up('d'); await page.waitForTimeout(100);
    check(moving2.player.x>startX && moving2.movement.moving && moving2.movement.phase>moving1.movement.phase,
      'Actual movement drives walking animation');
    check(!(await state(page)).movement.moving && (await state(page)).movement.frame===0,
      'Standing still returns to an idle pose');
    const base = await save(page);
    await page.context().close();

    const roof = await open(placed(base,house.x,house.y-house.h/2-14));
    const roofX=(await state(roof)).player.x;
    await pressMove(roof,'d',400);
    check((await state(roof)).player.x>roofX+12 && (await state(roof)).insideHouse===null,
      'Projected roof is passable scenery, separate from solid ground walls');
    await roof.context().close();
    const wallX=house.x-house.w/2;
    const wall=await open(placed(base,wallX-5,house.y));
    await pressMove(wall,'d',450);
    check((await state(wall)).player.x<=wallX && (await state(wall)).insideHouse===null,
      'Solid side wall blocks entry despite the roof being non-solid');
    await wall.context().close();
    const doorway=await open(placed(base,house.doorX,house.doorY+15));
    await pressMove(doorway,'w',640);
    check((await state(doorway)).insideHouse===house.id, 'Walking through the doorway enters the furnished building');
    await pressMove(doorway,'s',720);
    check((await state(doorway)).insideHouse===null, 'Walking back through the doorway exits the building');
    await doorway.context().close();

    const storageHouse=world.objects.find(object=>object.id===container.house);
    const point=beside(container,storageHouse);
    let lootFixture=change(placed(base,point.x,point.y),container,{searched:true,contents:[{item:'knife',amount:1},{item:'water',amount:1}]});
    const looting=await open(lootFixture);
    const untouched=copy((await state(looting)).bag);
    await looting.keyboard.press('e');
    await looting.waitForFunction(()=>survival.getState().state==='loot');
    check(JSON.stringify((await state(looting)).bag)===JSON.stringify(untouched),
      'Opening searched storage does not automatically grant items');
    await looting.click('[data-take-index="0"]');
    check((await state(looting)).bag.knife===1 && (await state(looting)).bag.water===0,
      'An item enters the backpack only after selecting it manually');
    await looting.click('#takeAllBtn');
    check((await state(looting)).bag.water===1, 'Take remaining items is an explicit player action');
    await looting.click('#closeLoot'); await looting.click('#item-knife');
    check((await state(looting)).weapon==='knife', 'Manually looted knife can be equipped');
    const savedLoot=await save(looting);
    await looting.reload(); await looting.reload(); await looting.click('#continueBtn');
    snapshot=await state(looting);
    const afterLoad=(await nearby(looting)).objects.find(object=>object.id===container.id);
    check(snapshot.seed===savedLoot.seed && snapshot.bag.knife===1 && snapshot.weapon==='knife' &&
      afterLoad.searched && afterLoad.contents.length===0, 'Taken items and searched storage persist without regenerating loot');
    await looting.context().close();

    const emptyFixture=change(placed(base,point.x,point.y),container,{searched:false,contents:[]});
    const empty=await open(emptyFixture);
    await empty.keyboard.press('e');
    check(Object.values((await state(empty)).bag).every(n=>n===0), 'Starting a search grants no automatic supplies');
    await empty.waitForFunction(()=>survival.getState().state==='loot',{}, {timeout:6000});
    check(Object.values((await state(empty)).bag).every(n=>n===0) &&
      (await nearby(empty)).objects.find(object=>object.id===container.id).searched,
      'A real timed search can reveal completely empty storage');
    await empty.context().close();

    const suppliesFixture=copy(base);
    Object.assign(suppliesFixture.bag,{food:3,water:3,med:2,cloth:4,scrap:10,wood:10,stone:5,matches:2,ammo:24,gun:1});
    Object.assign(suppliesFixture.player,{hp:35,hunger:20,thirst:20,ammo:1});
    suppliesFixture.weapon='gun';
    const supplies=await open(suppliesFixture);
    await supplies.click('#item-food');await supplies.click('#item-water');await supplies.click('#item-med');
    snapshot=await state(supplies);
    check(snapshot.player.hunger>50 && snapshot.player.thirst>50 && snapshot.player.hp>65,
      'Manually collected food, water and bandages remain functional');
    await supplies.click('#craft-0');
    check((await state(supplies)).bag.cloth===2 && (await state(supplies)).bag.med===2,
      'Bandage crafting consumes cloth');
    await supplies.keyboard.press('r');
    await supplies.waitForFunction(()=>survival.getState().player.ammo===12,{}, {timeout:6000});
    check((await state(supplies)).bag.ammo===13, 'Reload transfers the correct ammunition from backpack to pistol');
    const tree=(await nearby(supplies)).objects.find(object=>object.type==='tree');
    check(!!tree,'Generated forest contains independent harvestable trees');
    await supplies.context().close();
    const harvestFixture=placed(base,tree.x,tree.y+12);
    const bare=await open(harvestFixture);await bare.keyboard.press('e');
    check((await state(bare)).harvested===0,'A tree cannot be chopped with bare hands');await bare.context().close();
    harvestFixture.bag.axe=1;harvestFixture.weapon='axe';
    const harvesting=await open(harvestFixture);
    for(let i=0;i<4;i++){await harvesting.keyboard.press('e');await harvesting.waitForTimeout(580);}
    check((await state(harvesting)).harvested===4 && (await state(harvesting)).bag.wood===4,
      'A found axe harvests a tree through actual interactions');
    await harvesting.context().close();

    const combatFixture=copy(base);
    Object.assign(combatFixture.bag,{gun:1,ammo:36});
    Object.assign(combatFixture.player,{ammo:12,hp:100});combatFixture.weapon='gun';
    const combat=await open(combatFixture);
    const beforeKill=copy((await state(combat)).bag);
    let killed=false;
    for(let i=0;i<95;i++){
      await combat.keyboard.press(' ');await combat.waitForTimeout(310);
      if((await state(combat)).kills>0){killed=true;break;}
    }
    check(killed,'Projectile combat eliminates a pursuing zombie');
    const afterKill=(await state(combat)).bag;
    check(Object.keys(beforeKill).filter(key=>!['ammo','rifleAmmo','shotgunAmmo'].includes(key)).every(key=>beforeKill[key]===afterKill[key]),
      'Killing a zombie automatically awards absolutely no inventory items');
    const body=(await nearby(combat)).objects.find(object=>object.type==='corpse');
    check(!!body && Array.isArray(body.contents),'Killed enemy remains as a manually searchable corpse');
    const corpseSave=await save(combat);
    check((corpseSave.extras||[]).some(object=>object.id===body.id && object.type==='corpse'),
      'Save data preserves the corpse instead of regenerating a kill reward');
    await combat.context().close();
    const corpseFixture=placed(corpseSave,body.x,body.y+4);
    const savedBody=corpseFixture.extras.find(object=>object.id===body.id);
    Object.assign(savedBody,{searched:true,contents:[{item:'cloth',amount:1}]});
    const corpseSearch=await open(corpseFixture);
    const cloth=(await state(corpseSearch)).bag.cloth;
    await corpseSearch.keyboard.press('e');await corpseSearch.waitForFunction(()=>survival.getState().state==='loot');
    check((await state(corpseSearch)).bag.cloth===cloth,'Opening a corpse does not transfer its contents');
    await corpseSearch.click('[data-take-index="0"]');
    check((await state(corpseSearch)).bag.cloth===cloth+1,'Corpse contents must be manually taken');
    await corpseSearch.context().close();

    const relay=questMarkers.find(object=>object.type==='relay');
    const extraction=questMarkers.find(object=>object.type==='extract');
    check(!!relay && !!extraction,'Radio relay and evacuation point are actual world objects');
    const noParts=await open(placed(base,relay.x,relay.y+4));
    await noParts.keyboard.press('e');await noParts.waitForFunction(()=>survival.getState().state==='objective');
    check(await noParts.locator('#activateRelay').isDisabled() && !(await state(noParts)).expedition.relayOnline,
      'Radio repair UI refuses activation when required materials have not been collected');
    await noParts.context().close();
    const repairFixture=placed(base,relay.x,relay.y+4);
    Object.assign(repairFixture.bag,{battery:2,scrap:4,rope:1,food:1});
    const repairing=await open(repairFixture);
    await repairing.keyboard.press('e');await repairing.waitForFunction(()=>survival.getState().state==='objective');
    const beforeActivation=copy((await state(repairing)).bag);
    await repairing.waitForTimeout(150);
    check(!(await state(repairing)).expedition.relayOnline && (await state(repairing)).expedition.signalTime===0 &&
      JSON.stringify((await state(repairing)).bag)===JSON.stringify(beforeActivation),
      'Inspecting the station neither consumes materials nor starts transmission automatically');
    await repairing.click('#activateRelay');
    snapshot=await state(repairing);
    check(snapshot.state==='playing' && snapshot.expedition.relayOnline && snapshot.bag.battery===0 &&
      snapshot.bag.scrap===0 && snapshot.bag.rope===0 && snapshot.bag.food===1,
      'Explicit radio repair consumes the exact collected materials without awarding supplies');
    await repairing.waitForFunction(()=>survival.getState().expedition.signalTime>0.25,{}, {timeout:5000});
    check(!(await state(repairing)).expedition.rescueReady,'Starting a radio does not skip the ninety-second defence');
    const transmission=await save(repairing);
    const pausedSignal=(await state(repairing)).expedition.signalTime;
    await repairing.waitForTimeout(200);
    check((await state(repairing)).expedition.signalTime===pausedSignal,'Paused gameplay cannot advance radio transmission');
    await repairing.context().close();
    const awayFixture=placed(transmission,base.player.x,base.player.y);
    const away=await open(awayFixture);
    const restoredSignal=(await state(away)).expedition.signalTime;
    await away.waitForTimeout(300);
    check((await state(away)).expedition.relayOnline && (await state(away)).expedition.signalTime===restoredSignal &&
      restoredSignal===transmission.expedition.signalTime,
      'Saved radio progress restores exactly and stays frozen away from the station');
    await away.context().close();
    const tooEarly=placed(transmission,extraction.x,extraction.y+4);
    const notReady=await open(tooEarly);await notReady.keyboard.press('e');
    check((await state(notReady)).state==='playing' && !(await state(notReady)).expedition.completed,
      'Evacuation interaction cannot complete an unfinished transmission');
    await notReady.context().close();
    const readyFixture=placed(base,extraction.x,extraction.y+4);
    readyFixture.expedition={discovered:true,relayOnline:true,signalTime:90,rescueReady:true,completed:false,waveTime:0};
    const evacuation=await open(readyFixture);
    await evacuation.waitForTimeout(150);
    check((await state(evacuation)).state==='playing' && !(await state(evacuation)).expedition.completed,
      'A confirmed rescue signal still requires manually using the evacuation point');
    await evacuation.keyboard.press('e');await evacuation.waitForFunction(()=>survival.getState().state==='won');
    check((await state(evacuation)).expedition.completed && await evacuation.locator('#victoryOverlay').isVisible() &&
      Object.values((await state(evacuation)).bag).every(amount=>amount===0),
      'Manual evacuation concludes the expedition without inventing inventory rewards');
    await evacuation.click('#continueExplore');
    const completedSave=await save(evacuation);
    await evacuation.reload();await evacuation.waitForFunction(()=>!document.getElementById('startBtn').disabled,null,{timeout:60000});await evacuation.click('#continueBtn');
    check(completedSave.expedition.completed && (await state(evacuation)).expedition.completed && (await state(evacuation)).state==='playing',
      'Completed expedition persists and exploration can continue afterwards');
    await evacuation.context().close();

    const mobile=await open(null,{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    await mobile.click('#bagBtn');const frozen=(await state(mobile)).time;await mobile.waitForTimeout(150);
    check((await state(mobile)).state==='inventory' && (await state(mobile)).time===frozen &&
      await mobile.locator('.sidebar').isVisible(),'Mobile backpack pauses danger while inventory is open');
    await mobile.click('#closeBag');
    const mobileX=(await state(mobile)).player.x,joy=await mobile.locator('#joystick').boundingBox();
    const cdp=await mobile.context().newCDPSession(mobile);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joy.x+joy.width-4,y:joy.y+joy.height/2}]});
    await mobile.waitForTimeout(500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    check((await state(mobile)).player.x>mobileX+10,'Mobile joystick moves the survivor');
    check(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile game fits the screen width');
    await mobile.screenshot({path:'/workspace/game-artifacts/mobile-v4.png',fullPage:true});
    await mobile.setViewportSize({width:844,height:390});await mobile.waitForTimeout(150);
    check((await mobile.locator('#gameFrame').boundingBox()).height>=380,'Landscape phone screen remains dedicated to gameplay');
    await mobile.context().close();
    check(errors.length===0,'No browser runtime errors: '+errors.join('\n'));
    console.log(`${checks} checks passed.`);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
