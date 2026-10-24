/* Artwork supplied by the user. Source images remain unchanged; sprites and
   textures are cut out at runtime for the game's Canvas renderer. */
window.GameArt = (() => {
 const images={}, textures=[], trees=[], sprites=[], sceneImages=[];
 const sources={locations:'assets/locations.png',survivor:'assets/survivor.png',zombies:'assets/zombies.png'};
 const scenes=[
  {name:'BENZINĂRIA PĂRĂSITĂ',sx:0,sy:0,w:560,h:307,house:[220,22,220,137,260],kind:'fuel'},
  {name:'MAGAZINUL DIN VALE',sx:564,sy:0,w:550,h:307,house:[182,12,203,208,313],kind:'store'},
  {name:'DEPOZITUL INDUSTRIAL',sx:1118,sy:0,w:560,h:307,house:[186,2,259,208,304],kind:'warehouse'},
  {name:'TABĂRA DIN PĂDURE',sx:0,sy:311,w:560,h:311,house:[96,97,82,77,137],kind:'camp'},
  {name:'DRUMUL BLOСAT',sx:564,sy:311,w:550,h:311,kind:'road'},
  {name:'LACUL RECE',sx:1118,sy:311,w:560,h:311,kind:'lake'},
  {name:'POSTUL MILITAR',sx:0,sy:627,w:560,h:310,house:[111,20,100,105,161],kind:'military'},
  {name:'BISERICA VECHE',sx:564,sy:627,w:550,h:310,house:[181,23,184,183,231],kind:'church'},
  {name:'FERMA ABANDONATĂ',sx:1118,sy:627,w:560,h:310,house:[44,154,140,120,116],kind:'farm'}
 ];
 const c2=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 const r=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x|0,y|0,w,h);};
 function cut(image,x,y,w,h,transparent=false){const c=c2(w,h),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,x,y,w,h,0,0,w,h);if(transparent){const d=g.getImageData(0,0,w,h),p=d.data,seen=new Uint8Array(w*h),q=[];const valid=i=>{const j=i*4;return Math.min(p[j],p[j+1],p[j+2])>180&&Math.max(p[j],p[j+1],p[j+2])-Math.min(p[j],p[j+1],p[j+2])<30;};function visit(i){if(i<0||i>=w*h||seen[i]||!valid(i))return;seen[i]=1;q.push(i);}for(let xx=0;xx<w;xx++){visit(xx);visit((h-1)*w+xx);}for(let yy=0;yy<h;yy++){visit(yy*w);visit(yy*w+w-1);}for(let n=0;n<q.length;n++){const i=q[n];p[i*4+3]=0;if(i%w)visit(i-1);if(i%w<w-1)visit(i+1);visit(i-w);visit(i+w);}for(let i=0;i<w*h;i++){const j=i*4;if(Math.min(p[j],p[j+1],p[j+2])>235&&Math.max(p[j],p[j+1],p[j+2])-Math.min(p[j],p[j+1],p[j+2])<22)p[j+3]=0;}g.putImageData(d,0,0);}return c;}
 let survivor;
 async function load(){for(const [k,path]of Object.entries(sources)){const im=new Image();im.src=window.EMBEDDED_ART?.[k]||path;await im.decode();images[k]=im;}survivor=cut(images.survivor,474,278,295,694,true);
  for(let t=0;t<9;t++){sprites[t]=[];const ox=(t%3)*512,oy=Math.floor(t/3)*340;for(const [x,y]of [[170,15],[250,106],[331,106],[410,15],[250,200],[331,200]])sprites[t].push(cut(images.zombies,ox+x,oy+y,74,88,true));}
  const samples=[[1504,632,24,24],[720,16,24,24],[1470,360,44,44],[750,234,50,50],[1504,632,24,24]];
  for(let t=0;t<5;t++){textures[t]=[];for(let n=0;n<4;n++){const [x,y,w,h]=samples[t],c=c2(32,32),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.translate(n%2?32:0,n>1?32:0);g.scale(n%2?-1:1,n>1?-1:1);g.drawImage(images.locations,x,y,w,h,0,0,32,32);textures[t].push(c);}}
  for(let n=0;n<12;n++)trees.push(makeTree(n));
  for(const s of scenes){const c=c2(s.w,s.h),g=c.getContext('2d',{willReadFrequently:true});g.drawImage(images.locations,s.sx+3,s.sy+3,s.w-6,s.h-6,3,3,s.w-6,s.h-6);const d=g.getImageData(0,0,s.w,s.h);for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){const edge=Math.min(x,y,s.w-1-x,s.h-1-y);d.data[(y*s.w+x)*4+3]*=Math.min(1,Math.max(0,(edge-3)/17));}g.putImageData(d,0,0);sceneImages.push(c);}
  // A traced cutout from the user's forest supplies the spruce silhouette and detail.
  const pine=c2(80,114),pg=pine.getContext('2d');pg.beginPath();const outline=[[35,2],[42,21],[39,27],[49,42],[44,44],[60,62],[51,63],[68,82],[48,85],[43,82],[42,101],[30,103],[28,86],[9,87],[18,77],[4,78],[20,60],[14,61],[27,43],[22,43],[31,25],[27,26]];outline.forEach(([x,y],i)=>i?pg.lineTo(x,y):pg.moveTo(x,y));pg.closePath();pg.clip();pg.drawImage(images.locations,48,326,80,114,0,0,80,114);for(let n=0;n<12;n+=3)trees[n]=pine;

 }
 function makeTree(n){const c=c2(68,96),g=c.getContext('2d'),pine=n%3===0;let rng=n+91;const rnd=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};g.fillStyle='#151c1788';g.beginPath();g.ellipse(35,88,24,6,0,0,7);g.fill();r(g,31,48,8,44,'#302d23');r(g,33,53,3,36,'#6d6147');r(g,36,70,2,19,'#494532');r(g,27,87,18,3,'#403b2b');const pal=pine?['#292f28','#363e30','#4a5140','#5e624a','#77775b']:n%3===1?['#35342b','#514d36','#6d6749','#858059','#96916a']:['#302c26','#4b3c2f','#63503c','#7b6046','#927658'];
  if(pine){for(let row=0;row<7;row++){const y=8+row*10,w=8+row*7;g.fillStyle=pal[0];g.beginPath();g.moveTo(34,y-10);g.lineTo(34-w/2,y+16);g.lineTo(34+w/2,y+16);g.closePath();g.fill();g.fillStyle=pal[2];g.beginPath();g.moveTo(33,y-7);g.lineTo(35-w/2,y+12);g.lineTo(33,y+9);g.closePath();g.fill();for(let i=0;i<45;i++){const px=34+(rnd()-.5)*w,py=y+rnd()*14;if(Math.abs(px-34)<(py-y+6)*w/36)r(g,px,py,2,1,pal[1+Math.floor(rnd()*4)]);}}}
  else{const blobs=[[33,19,15],[19,30,14],[46,31,16],[11,46,10],[32,42,21],[52,47,12],[22,59,17],[43,62,16],[33,73,13]];for(const[x,y,s]of blobs){g.fillStyle=pal[0];g.beginPath();g.ellipse(x,y,s,s*.74,0,0,7);g.fill();g.fillStyle=pal[2];g.beginPath();g.ellipse(x-1,y-3,s-3,s*.63,0,0,7);g.fill();for(let i=0;i<100;i++){const a=rnd()*7,rr=Math.sqrt(rnd())*(s-2),px=x+Math.cos(a)*rr,py=y-3+Math.sin(a)*rr*.63;r(g,px|0,py|0,2,1,pal[Math.floor(rnd()*5)]);}}}if(!pine){g.save();g.globalCompositeOperation='source-atop';g.globalAlpha=.7;g.drawImage(images.locations,n%3===1?1504:1040,n%3===1?632:200,n%3===1?24:72,n%3===1?24:70,0,0,68,80);g.restore();}return c;
 }
 function scene(g,o){const s=scenes[o.scene];g.drawImage(sceneImages[o.scene],Math.round(o.x),Math.round(o.y),Math.round(s.w*o.scale),Math.round(s.h*o.scale));}
 function exterior(g,o){const s=scenes[o.scene];g.drawImage(images.locations,s.sx+o.src[0],s.sy+o.src[1],o.src[2],o.src[3],o.x-o.w/2,o.y-o.h/2,o.w,o.h);}
 function tree(g,x,y,n){const c=trees[n%trees.length];g.drawImage(c,Math.floor(x-25),Math.floor(y-66),50,71);}
 function person(g,x,y,angle,phase,weapon,zombie=null){g.save();const walking=Math.sin(phase),side=Math.cos(angle)<0;g.translate(Math.floor(x),Math.floor(y));g.fillStyle='#10161165';g.beginPath();g.ellipse(0,1,7,2,0,0,7);g.fill();if(zombie){const dir=Math.sin(angle)<-.55?3:Math.abs(Math.cos(angle))>.5?(side?2:1):0;const f=zombie.aware&&Math.abs(Math.cos(angle))>.5?(side?5:4):dir;const im=sprites[zombie.variant%9][f];if(side&&f===1)g.scale(-1,1);g.translate(0,Math.abs(walking)*.6);g.drawImage(im,-12,-29,24,29);}
  else{if(side)g.scale(-1,1);const bob=Math.abs(walking)*.6; // Preserve the reference's head, hair, clothing and proportions.
   g.drawImage(survivor,0,0,295,405,-7,-29-bob,14,18); // head and torso
   g.drawImage(survivor,0,405,147,289,-7,-11,7,12+(walking>.3?1:0));
   g.drawImage(survivor,147,405,148,289,0,-11,7,12+(walking<-.3?1:0));
   if(Math.sin(angle)<-.65){r(g,-4,-28,7,6,'#5c452d');r(g,-3,-26,5,4,'#745639');}
  }
  g.restore();if(!zombie&&weapon!=='fists'){g.save();g.translate(x+Math.cos(angle)*5,y-12+Math.sin(angle)*3);g.rotate(angle);if(weapon==='gun'||weapon==='rifle'){r(g,0,-1,weapon==='rifle'?17:9,2,'#a2a394');r(g,0,1,4,2,'#5d513d');}else if(weapon==='knife'){r(g,0,-1,5,2,'#9a7e51');r(g,5,-1,6,1,'#d2d3b6');}else{r(g,0,0,14,2,'#927a50');r(g,10,-4,6,5,'#a0a493');}g.restore();}
 }
 function portrait(g){g.clearRect(0,0,48,48);g.fillStyle='#8a8970';g.fillRect(0,0,48,48);g.imageSmoothingEnabled=false;g.drawImage(survivor,35,0,224,280,1,0,46,54);}
 return{load,scenes,textures,scene,exterior,tree,person,portrait};
})();
