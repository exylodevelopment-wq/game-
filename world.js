/* Seeded world layouts and ground geometry. Roofs never participate in physics. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./loot.js'):root.SurvivalLoot);if(typeof module==='object'&&module.exports)module.exports=api;else root.SurvivalWorld=api;})(globalThis,(Loot)=>{
 const TILE=32;
 const kinds=['store','house','farm','church','military','warehouse','clinic','fuel','camp','workshop','lake','road'];
 const labels={store:'Magazin',house:'Sat',farm:'Fermă',church:'Biserică',military:'Bază militară',warehouse:'Depozite',clinic:'Dispensar',fuel:'Benzinărie',camp:'Tabără',workshop:'Ateliere',lake:'Lac',road:'Baraj rutier'};
 const places=['Brumă','Pietrar','Valea Seacă','Mesteacăn','Stejar','Răscruce','Codru','Rugină','Corb','Salcie','Vultur','Izvor'];
 function rng(seed){let n=seed>>>0;return()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
 function hash(seed,x,y,n=0){let a=Math.imul(x+seed+n*377,374761393)^Math.imul(y+seed,668265263);a=Math.imul(a^a>>>13,1274126177);return((a^a>>>16)>>>0)/4294967296;}
 function generate(seed,size=384){
  const random=rng(seed),terrain=new Uint8Array(size*size),objects=[],sites=[];
  const add=o=>{o.id=objects.length;objects.push(o);return o;};
  const insideSite=(x,y,pad=12)=>sites.some(s=>x>s.x-pad&&x<s.x+s.w+pad&&y>s.y-pad&&y<s.y+s.h+pad);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const river=size*.79+Math.sin(y/19)*8+Math.sin(y/49)*13;
   const forest=Math.sin(x/17+seed)*Math.cos(y/23)+hash(seed,Math.floor(x/9),Math.floor(y/9));
   terrain[y*size+x]=Math.abs(x-river)<3.5?2:Math.abs(x-river)<4.5?4:forest>.25?1:0;
  }
  const centers=[{x:192,y:192,kind:'house'},{x:212,y:192,kind:'workshop',special:'relay'},{x:190,y:214,kind:'clinic',special:'triage'},{x:173,y:181,kind:'lake',special:'evac'}];
  for(let gy=0;gy<6;gy++)for(let gx=0;gx<6;gx++)centers.push({x:34+gx*60+Math.floor(random()*15),y:34+gy*60+Math.floor(random()*15),kind:kinds[(gx+gy*5+Math.floor(random()*4))%kinds.length]});
  // Additional isolated sites break up the roads between settlements.
  for(let i=0;i<8;i++)centers.push({x:75+Math.floor(random()*230),y:65+Math.floor(random()*250),kind:['camp','road','farm','house'][i%4]});
  for(let n=0;n<centers.length;n++){
   const c=centers[n],w=(c.kind==='military'?640:400)+Math.floor(random()*5)*32,h=320+Math.floor(random()*5)*32;
   const site={id:n,kind:c.kind,special:c.special||null,scene:kinds.indexOf(c.kind),name:(labels[c.kind]+' · '+places[n%places.length]+(n>=12?' '+(1+Math.floor(n/12)):'' )).toUpperCase(),variant:Math.floor(random()*99999),x:c.x*TILE-w/2,y:c.y*TILE-h/2,w,h};
   if(c.special)site.name={relay:'ATELIERUL RADIO · SEMNAL PIERDUT',triage:'PUNCTUL MEDICAL · IZVOR',evac:'DEBARCADERUL · ULTIMA CURSĂ'}[c.special];
   if(sites.some(s=>Math.abs(s.x+s.w/2-c.x*TILE)<(s.w+w)/2+32&&Math.abs(s.y+s.h/2-c.y*TILE)<(s.h+h)/2+32))continue;
   sites.push(site);
   for(let y=Math.floor(site.y/TILE);y<=Math.floor((site.y+h)/TILE);y++)for(let x=Math.floor(site.x/TILE);x<=Math.floor((site.x+w)/TILE);x++)if(x>=0&&y>=0&&x<size&&y<size)terrain[y*size+x]=['house','farm','camp','church','lake'].includes(c.kind)?0:4;
   const count=c.kind==='house'?3+Math.floor(random()*3):c.kind==='military'?3:c.kind==='camp'?3:c.kind==='road'||c.kind==='lake'?0:c.kind==='church'?1:2;
   for(let i=0;i<count;i++){
    let kind=c.kind;if(kind==='store'&&i>0||kind==='farm'&&i>0||kind==='fuel'&&i>0)kind='house';
    const dims={house:[76,56],store:[106,70],farm:[110,78],church:[86,104],military:[126,62],warehouse:[140,88],clinic:[110,72],fuel:[90,64],camp:[52,44],workshop:[112,76]}[kind]||[80,58];
    const bw=dims[0]+Math.floor(random()*3)*8,bh=dims[1]+Math.floor(random()*3)*6;
    const cols=Math.min(count,3),col=i%cols,row=Math.floor(i/cols);const bx=site.x+96+col*(site.w-192)/Math.max(1,cols-1),by=site.y+84+row*152+(i%2)*10;
    const house=add({type:'house',special:site.special,kind:kind==='house'&&c.kind==='church'?'church':kind,site:site.id,x:bx,y:by,w:bw,h:bh,style:Math.floor(random()*6),variant:Math.floor(random()*99999),doorX:bx+(random()<.5?-1:1)*Math.floor(bw*.18),doorY:by+bh/2});
    if(n===0&&i===0)house.start=true;
    const spots=[[-.32,-.2,'cabinet'],[.32,-.27,'shelf'],[-.32,.24,'drawer'],[.32,.24,'chest'],[0,-.3,'locker']];
    const containerCount=random()<.12?0:1+Math.floor(random()*3);
    const shuffled=[...spots];for(let k=shuffled.length-1;k>0;k--){const j=Math.floor(random()*(k+1));[shuffled[k],shuffled[j]]=[shuffled[j],shuffled[k]];}const picked=shuffled.slice(0,containerCount);
    picked.forEach(([dx,dy,container])=>{
     const id=objects.length,local=rng((seed^Math.imul(id+1,2891336453))>>>0);
     add({type:'container',house:house.id,site:site.id,kind:c.kind,container,x:house.x+dx*house.w,y:house.y+dy*house.h,searched:false,contents:Loot.roll(c.kind,local,{container})});
    });
   }
   const addProp=(kind,x,y,w=20,h=12,solid=false)=>{
    const px=site.x+x,py=site.y+y;
    if(solid&&objects.some(o=>o.type==='house'&&o.site===site.id&&(
      Math.abs(px-o.x)<(w+o.w)/2+6&&Math.abs(py-o.y)<(h+o.h)/2+6||
      px+w/2>o.doorX-16&&px-w/2<o.doorX+16&&py+h/2>o.doorY-4&&py-h/2<o.doorY+40
    )))return null;
    return add({type:'prop',kind,x:px,y:py,w,h,solid,variant:Math.floor(random()*16),site:site.id});
   };
   const mid=site.w/2;
   if(c.kind==='church'){for(let i=0;i<10;i++)addProp('gravestone',mid+65+i%3*32,75+Math.floor(i/3)*40,12,8,true);addProp('bench',mid-20,site.h-65,30,10,true);}
   else if(c.kind==='military'){for(let i=0;i<5;i++)addProp('fence',36+i*75,site.h-50,58,5,true);addProp('truck',mid,site.h-100,30,48,true);addProp('tower',site.w-45,50,22,18,true);}
   else if(c.kind==='farm'){for(let row=0;row<6;row++)addProp('crops',mid-75,site.h-160+row*15,150,9);addProp('tractor',site.w-65,site.h-80,30,22,true);addProp('well',mid+105,site.h-160,18,14,true);}
   else if(c.kind==='fuel'){for(let i=0;i<3;i++)addProp('pump',70+i*42,site.h-100,14,10,true);addProp('car',site.w-70,site.h-90,24,38,true);}
   else if(c.kind==='warehouse'||c.kind==='workshop'){for(let i=0;i<5;i++)addProp('crates',65+i*50,site.h-80+(i%2)*18,22,18,true);addProp('truck',site.w-65,site.h-95,30,48,true);}
   else if(c.kind==='road'){addProp('bus',mid,site.h/2,78,30,true);for(let i=0;i<3;i++)addProp('barricade',80+i*100,site.h-70,60,8,true);}
   else if(c.kind==='lake'){for(let y=0;y<Math.floor(site.h/TILE);y++)for(let x=0;x<5;x++)terrain[(Math.floor(site.y/TILE)+y)*size+Math.floor((site.x+site.w*.65)/TILE)+x]=2;addProp('pier',site.w*.64,site.h*.6,70,30);for(let i=0;i<8;i++)addProp('reeds',site.w*.62,40+i*32,12,6);}
   else {addProp(c.kind==='clinic'?'ambulance':'car',mid+30,site.h-70,24,38,true);addProp('well',site.w-55,site.h-60,18,14,true);}
   if(c.special){
    const x=site.x+site.w*.5,y=site.y+site.h*.68;
    if(c.special==='relay')add({type:'relay',x,y,site:site.id});
    if(c.special==='evac')add({type:'extract',x,y,site:site.id});
    // Keep the objective approach on land and clear of props.
    for(let yy=Math.floor((y-32)/TILE);yy<=Math.floor((y+32)/TILE);yy++)for(let xx=Math.floor((x-32)/TILE);xx<=Math.floor((x+32)/TILE);xx++)terrain[yy*size+xx]=4;
    for(const o of objects)if(o.type==='prop'&&o.solid&&Math.abs(o.x-x)<o.w/2+30&&Math.abs(o.y-y)<o.h/2+30)o.solid=false;
   }
   // A roadside wreck or supply box may itself be empty.
   if(random()<.65){const id=objects.length;add({type:'container',kind:c.kind,site:site.id,container:'wreck',x:site.x+site.w*.6,y:site.y+site.h-45,searched:false,contents:Loot.roll(c.kind,rng(seed+id*71),{container:'wreck'})});}
  }
  // Narrow footpaths connect rural front doors to the settlement street.
  for(const house of objects.filter(o=>o.type==='house')){
   const site=sites.find(s=>s.id===house.site),tx=Math.floor(house.doorX/TILE);
   for(let y=Math.ceil(house.doorY/TILE);y<=Math.floor((site.y+site.h*.8)/TILE);y++)if(y>=0&&y<size)terrain[y*size+tx]=4;
  }
  // Connect each location to its closest earlier neighbour, including bridges.
  function road(ax,ay,bx,by,width){let x=ax,y=ay;const paint=()=>{for(let dy=-width;dy<=width;dy++)for(let dx=-width;dx<=width;dx++)if(x+dx>=0&&y+dy>=0&&x+dx<size&&y+dy<size)terrain[(y+dy)*size+x+dx]=3;};while(x!==bx){paint();x+=Math.sign(bx-x);}while(y!==by){paint();y+=Math.sign(by-y);}paint();}
  sites.forEach((s,i)=>{if(!i)return;const cx=(s.x+s.w/2)/TILE,cy=(s.y+s.h*.8)/TILE;const near=sites.slice(0,i).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0];road(Math.floor(cx),Math.floor(cy),Math.floor((near.x+near.w/2)/TILE),Math.floor((near.y+near.h*.8)/TILE),i%4===0?1:0);});
  for(let y=3;y<size-3;y++)for(let x=3;x<size-3;x++){
   const t=terrain[y*size+x],v=hash(seed,x,y,8),wx=x*TILE+16+Math.floor(hash(seed,x,y,2)*12)-6,wy=y*TILE+16+Math.floor(hash(seed,x,y,3)*12)-6;
   if(t===2||t===3||insideSite(wx,wy))continue;
   if(v<(t===1?.30:.045))add({type:'tree',x:wx,y:wy,hp:4,variant:Math.floor(hash(seed,x,y,5)*12)});
   else if(v>.986)add({type:'rock',x:wx,y:wy,hp:4});
   else if(v>.979)add({type:'branch',x:wx,y:wy});
   else if(v>.974)add({type:'looseStone',x:wx,y:wy});
   else if(v>.971)add({type:'berry',x:wx,y:wy});
   else if(v>.967)add({type:'stump',x:wx,y:wy});
  }
  // Avoid unwinnable expeditions: missing repair components remain physical loot
  // in suitable remote storage. This never guarantees a particular house's loot
  // or gives the player a starter kit; ordinary weapon rolls are unchanged.
  const repairNeeds={battery:2,scrap:4,rope:1};
  for(const[item,minimum]of Object.entries(repairNeeds)){
   let existing=0;for(const o of objects)for(const e of o.contents||[])if(e.item===item)existing+=e.amount;
   let missing=minimum-existing;if(missing<=0)continue;
   const eligible=objects.filter(o=>o.type==='container'&&['warehouse','workshop','military','fuel'].includes(o.kind)&&o.contents.length<3&&Loot.config(o.kind,{container:o.container}).table.some(e=>e.item===item));
   eligible.sort((a,b)=>a.contents.length-b.contents.length||Math.hypot(b.x-192*TILE,b.y-192*TILE)-Math.hypot(a.x-192*TILE,a.y-192*TILE)||a.id-b.id);
   for(const o of eligible){if(missing<=0)break;const amount=Math.min(missing,item==='scrap'?2:1),entry=o.contents.find(e=>e.item===item);if(entry)entry.amount+=amount;else o.contents.push({item,amount});missing-=amount;}
  }
  const first=objects.find(o=>o.start);return{terrain,objects,sites,spawn:{x:first.doorX,y:first.doorY+42},seed,size};
 }
 function contains(o,x,y,margin=0){return x>o.x-o.w/2+margin&&x<o.x+o.w/2-margin&&y>o.y-o.h/2+margin&&y<o.y+o.h/2-margin;}
 function blocksBuilding(o,x,y,radius=3){const l=o.x-o.w/2,r=o.x+o.w/2,t=o.y-o.h/2,b=o.y+o.h/2,wall=4;if(x<l-radius||x>r+radius||y<t-radius||y>b+radius)return false;const door=Math.abs(x-o.doorX)<12-radius;return x<l+wall+radius||x>r-wall-radius||y<t+wall+radius||y>b-wall-radius&&!door;}
 return{generate,rng,hash,contains,blocksBuilding,TILE,kinds};
});
