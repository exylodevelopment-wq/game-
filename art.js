/* Original integer-grid pixel artwork. Reference images guide the mood only:
   no photographs, collages, cropped source sprites, gradients or external assets. */
window.GameArt = (() => {
 'use strict';
 const textures = [], treeSprites = [], actorSprites = new Map(), propSprites = new Map();
 const scenes = [
  {name:'BENZINĂRIA PĂRĂSITĂ',kind:'fuel',w:480,h:320},
  {name:'MAGAZINUL DIN VALE',kind:'store',w:480,h:320},
  {name:'DEPOZITUL INDUSTRIAL',kind:'warehouse',w:520,h:350},
  {name:'TABĂRA DIN PĂDURE',kind:'camp',w:400,h:300},
  {name:'DRUMUL BLOCAT',kind:'road',w:500,h:300},
  {name:'LACUL RECE',kind:'lake',w:480,h:340},
  {name:'POSTUL MILITAR',kind:'military',w:560,h:380},
  {name:'BISERICA VECHE',kind:'church',w:460,h:340},
  {name:'FERMA ABANDONATĂ',kind:'farm',w:540,h:360}
 ];
 const C = {ink:'#272d28',grass:'#68704e',grassLight:'#80835a',grassDark:'#586343',dirt:'#82775a',wood:'#746044',woodLight:'#99815a',woodDark:'#4d4435',stone:'#747b6b',stoneLight:'#9b9c83',stoneDark:'#4c564c',glass:'#344c4d',glassLight:'#637a70',paper:'#c3bea2',rust:'#8b5b42'};
 function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
 function r(g,x,y,w,h,color){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
 function line(g,x0,y0,x1,y1,color,width=1){x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;for(;;){r(g,x0,y0,width,width,color);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}}}
 function polygon(g,points,color){const ymin=Math.floor(Math.min(...points.map(p=>p[1]))),ymax=Math.ceil(Math.max(...points.map(p=>p[1])));g.fillStyle=color;for(let y=ymin;y<=ymax;y++){const cuts=[];for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))cuts.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]));}cuts.sort((a,b)=>a-b);for(let i=0;i+1<cuts.length;i+=2)g.fillRect(Math.ceil(cuts[i]),y,Math.floor(cuts[i+1])-Math.ceil(cuts[i])+1,1);}}
 function rng(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
 function blob(g,cx,cy,rx,ry,color){for(let y=-ry;y<=ry;y++){const k=Math.floor(rx*Math.sqrt(Math.max(0,1-y*y/(ry*ry))));r(g,cx-k,cy+y,k*2+1,1,color);}}
 function texture(t,n){const c=canvas(32,32),g=c.getContext('2d'),q=rng(t*7123+n*191+39);const base=['#69704f','#566143','#3d5960','#74746a','#847b5c'][t];r(g,0,0,32,32,base);
  if(t===2){for(let i=0;i<10;i++){const x=(q()*29)|0,y=(q()*31)|0,w=2+(q()*6|0);r(g,x,y,w,1,i%3?'#4b6970':'#657e7c');if(i%3===0)r(g,x+2,y+1,w-2,1,'#455f65');}return c;}
  if(t===3){for(let i=0;i<24;i++){const x=q()*31|0,y=q()*31|0;r(g,x,y,2+(q()*3|0),1,q()>.5?'#818174':'#65695e');}const cracks=[[[0,6],[7,9],[8,15],[17,20],[19,31]],[[0,25],[8,22],[12,13],[21,11],[31,13]],[[0,11],[8,13],[16,8],[20,0]],[[13,0],[16,8],[12,17],[20,23],[31,21]]][n%4];for(let i=1;i<cracks.length;i++)line(g,...cracks[i-1],...cracks[i],'#51594e');if(n%2===0)r(g,23,5,4,2,'#94917c');return c;}
  const pal=t===1?['#5e6847','#69714e','#4d5a3f']:t===4?['#8c8262','#756e52','#94896a']:['#717751','#7e8159','#5f6848'];
  for(let i=0;i<14;i++){const x=q()*30|0,y=q()*30|0,col=pal[i%3];r(g,x,y,2+(q()*4|0),1,col);if(i%3===0)r(g,x+1,y-1,2,1,col);}
  for(let i=0;i<6;i++){const x=1+(q()*28|0),y=2+(q()*27|0);r(g,x,y,1,3,pal[2]);r(g,x-1,y-1,1,2,pal[1]);r(g,x+1,y-2,1,3,pal[0]);}
  if(n===3){r(g,20,24,3,2,'#858467');r(g,20,24,2,1,'#a09a77');}return c;
 }
 function leafyTree(n){const c=canvas(52,76),g=c.getContext('2d'),q=rng(721+n*931),autumn=n%4===2,pine=n%4===0,bare=n%4===3;
  r(g,14,69,29,3,'#26352b55');r(g,19,72,20,2,'#26352b40');
  r(g,24,47,7,25,'#333a2a');r(g,25,45,3,25,'#796444');r(g,28,52,2,19,'#534b34');r(g,21,69,5,3,'#514c34');r(g,30,69,5,3,'#514c34');
  if(bare){line(g,27,65,24,21,'#3a3b2c',3);line(g,25,44,12,32,'#3a3b2c',2);line(g,14,34,9,22,'#3a3b2c',2);line(g,25,34,38,19,'#3a3b2c',2);line(g,36,22,42,12,'#3a3b2c');line(g,24,23,20,9,'#3a3b2c',2);line(g,20,16,12,10,'#3a3b2c');line(g,29,52,42,39,'#3a3b2c',2);line(g,40,42,47,40,'#3a3b2c');line(g,24,58,12,48,'#3a3b2c',2);line(g,12,48,7,48,'#3a3b2c');line(g,27,65,24,25,'#7a6b49');line(g,24,43,14,34,'#746245');r(g,25,12,2,6,'#776344');return c;}
  const pal=pine?['#283d31','#354b37','#435b3c','#58704a','#6b8052']:autumn?['#3e382b','#5b4c32','#795f3b','#947447','#a68a55']:['#35452f','#4b5a37','#657143','#7e8450','#939761'];
  if(pine){for(let tier=0;tier<6;tier++){const y=9+tier*9,w=7+tier*6,x=27;polygon(g,[[x,y-8],[x-w/2-2,y+11],[x-7,y+10],[x-10,y+14],[x+w/2+3,y+12]],pal[0]);polygon(g,[[x,y-5],[x-w/2,y+9],[x+1,y+6],[x+w/2,y+10]],pal[2]);polygon(g,[[x-1,y-4],[x-w/2+2,y+7],[x-1,y+4]],pal[3]);for(let j=0;j<7+tier;j++){const xx=x-w/2+q()*w,yy=y+q()*8;if(Math.abs(xx-x)<(yy-y+6)*w/22)r(g,xx,yy,2,1,pal[j%3+1]);}r(g,x-3,y+9,3,1,pal[1]);}return c;}
  const groups=[[24,13,11,8],[14,23,11,9],[34,23,12,9],[8,35,7,8],[24,32,14,11],[41,35,9,10],[15,46,11,9],[32,46,13,10],[25,56,9,6]];
  for(const[cx,cy,rx,ry]of groups){blob(g,cx,cy,rx+1,ry+1,pal[0]);blob(g,cx,cy-1,rx,ry-1,pal[2]);blob(g,cx-2,cy-3,rx-2,Math.max(2,ry-3),pal[3]);r(g,cx-rx+2,cy+ry-4,rx,2,pal[1]);for(let j=0;j<13;j++){const xx=cx-rx+2+q()*(rx*2-4),yy=cy-ry+2+q()*(ry*2-4);if(((xx-cx)**2/(rx*rx)+(yy-cy)**2/(ry*ry))<.7){r(g,xx,yy,2,1,pal[j%5]);if(j%4===0)r(g,xx+1,yy-1,1,1,pal[4]);}}}return c;
 }
 const outfits=[
  {shirt:'#69705b',light:'#85866a',dark:'#4d5948',pants:'#35464a',skin:'#a0a17c',hair:'#4c4031',type:'civil'},
  {shirt:'#a6a18a',light:'#c2bba4',dark:'#7b7f6d',pants:'#37494a',skin:'#a9ab89',hair:'#3c3730',type:'runner'},
  {shirt:'#a49d4d',light:'#bfb263',dark:'#777b3f',pants:'#46504a',skin:'#a2a280',hair:'#393d32',type:'worker'},
  {shirt:'#425c64',light:'#5a7275',dark:'#30494f',pants:'#34484c',skin:'#a8a286',hair:'#303b39',type:'police'},
  {shirt:'#59684a',light:'#79815b',dark:'#3d503c',pants:'#505d40',skin:'#999d7b',hair:'#4e5b3e',type:'soldier'},
  {shirt:'#454a43',light:'#63695e',dark:'#303c35',pants:'#3a4741',skin:'#aaa78a',hair:'#4c3c2b',type:'suit'},
  {shirt:'#a69d85',light:'#c3b69b',dark:'#7e826c',pants:'#4b5b58',skin:'#adab8a',hair:'#69513a',type:'woman'},
  {shirt:'#73634d',light:'#918169',dark:'#514f3d',pants:'#424e46',skin:'#b0ad8f',hair:'#999b85',type:'elder'},
  {shirt:'#5e6257',light:'#7d7c68',dark:'#414e41',pants:'#3c4d4a',skin:'#a3a383',hair:'#494537',type:'hood'}
 ];
 const survivor={shirt:'#7c8069',light:'#9a9b7f',dark:'#596554',pants:'#3c5359',skin:'#c39b70',hair:'#73543a',type:'survivor'};
 function bodySprite(direction,frame,variant){const c=canvas(18,28),g=c.getContext('2d');const p=variant<0?survivor:outfits[variant%9],z=variant>=0;const f=frame%7;
  const legs=[0,1,2,1,-1,-2,-1][f],bob=f===2||f===5?-1:0,arms=[0,-1,-2,1,1,2,-1][f];
  const down=direction===0,up=direction===2,side=direction===1||direction===3;
  if(direction===3){g.translate(18,0);g.scale(-1,1);} // Exact pixel mirror, never rotated resampling.
  const face=p.skin,lightSkin=z?'#c0b997':'#dfb686',shadeSkin=z?'#7e866b':'#a77e58';
  // Feet are independently posed on six authored walk frames, not stretched body crops.
  if(side){const stride=[0,-2,-1,1,2,1,-1][f];r(g,7-stride,17,3,8,C.ink);r(g,7-stride,18,2,6,p.dark);r(g,7-stride,24,4,2,'#303a34');r(g,8+stride,17,4,8,C.ink);r(g,9+stride,17,2,7,p.pants);r(g,9+stride,24,4,2,'#3b3d31');r(g,9+stride,24,3,1,'#6d6550');
  }else{r(g,5,17+Math.min(0,legs),4,8-Math.min(0,legs),C.ink);r(g,10,17-Math.max(0,legs),4,8+Math.max(0,legs),C.ink);r(g,6,18+Math.min(0,legs),2,6,p.pants);r(g,11,18-Math.max(0,legs),2,6,p.pants);r(g,5,24+Math.max(-1,Math.min(1,legs)),4,2,'#343b31');r(g,10,24-Math.max(-1,Math.min(1,legs)),4,2,'#343b31');r(g,5,24+Math.max(-1,Math.min(1,legs)),3,1,'#76684c');r(g,10,24-Math.max(-1,Math.min(1,legs)),3,1,'#76684c');if(f===3)r(g,6,23,1,1,p.light);if(f===6)r(g,11,23,1,1,p.light);}
  if(side){r(g,6,10+bob,7,10,C.ink);r(g,7,10+bob,5,9,p.shirt);r(g,7,11+bob,2,6,p.light);r(g,11,12+bob,2,6,p.dark);r(g,5,12+bob+arms,3,7,C.ink);r(g,6,12+bob+arms,2,4,p.shirt);r(g,6,16+bob+arms,2,3,face);r(g,6,16+bob+arms,1,2,lightSkin);}
  else{r(g,4,10+bob,11,10,C.ink);r(g,5,10+bob,9,9,p.shirt);r(g,5,11+bob,3,7,p.light);r(g,12,12+bob,2,6,p.dark);r(g,3,11+bob+arms,3,7,C.ink);r(g,14,11+bob-arms,3,7,C.ink);r(g,4,11+bob+arms,2,4,p.shirt);r(g,14,11+bob-arms,2,4,p.dark);r(g,4,15+bob+arms,2,3,face);r(g,14,15+bob-arms,2,3,shadeSkin);}
  r(g,8,8+bob,3,3,shadeSkin);r(g,6,1+bob,7,8,C.ink);r(g,5,3+bob,1,4,C.ink);r(g,13,3+bob,1,4,C.ink);
  r(g,6,3+bob,7,5,face);r(g,7,3+bob,4,4,lightSkin);r(g,12,4+bob,1,3,shadeSkin);r(g,5,5+bob,1,2,face);r(g,13,5+bob,1,2,shadeSkin);
  r(g,6,1+bob,7,3,p.hair);r(g,5,3+bob,3,2,p.hair);r(g,7,bob,4,1,p.hair);r(g,8,1+bob,3,1,z?'#665a44':'#9b774c');r(g,6,2+bob,2,1,z?'#5d513e':'#8c6944');
  if(up){r(g,6,2+bob,7,6,p.hair);r(g,7,3+bob,4,3,z?'#5c5543':'#84623f');r(g,7,8+bob,5,1,p.dark);r(g,7,12+bob,5,1,p.dark);r(g,9,13+bob,1,5,p.dark);}
  else if(side){r(g,6,2+bob,5,5,p.hair);r(g,10,3+bob,3,4,face);r(g,11,4+bob,1,1,'#272f29');r(g,13,5+bob,1,1,face);r(g,10,7+bob,3,1,shadeSkin);}
  else{r(g,8,5+bob,1,1,'#30362b');r(g,11,5+bob,1,1,'#30362b');r(g,9,7+bob,2,1,z?'#60483a':'#9c7452');}
  if(p.type==='worker'){r(g,6,11+bob,2,7,'#bdb45f');r(g,12,11+bob,1,7,'#d0c473');r(g,5,15+bob,9,1,'#b8bf9a');r(g,7,10+bob,4,3,p.dark);}
  if(p.type==='police'){r(g,5,1+bob,9,3,'#304851');r(g,7,bob,5,1,'#4a6266');r(g,5,4+bob,9,1,'#273a3d');r(g,10,2+bob,1,1,'#c3b273');r(g,6,12+bob,2,2,'#b6aa68');r(g,5,18+bob,9,1,'#2c3935');}
  if(p.type==='soldier'){r(g,5,1+bob,9,4,'#354b37');r(g,6,bob,7,1,'#536744');r(g,6,1+bob,5,2,'#6d7951');r(g,5,4+bob,9,1,'#263c30');r(g,6,12+bob,3,5,'#3d4f37');r(g,10,13+bob,3,3,'#89906a');r(g,5,17+bob,8,1,'#414c34');}
  if(p.type==='suit'){r(g,8,10+bob,3,7,'#b4b09a');r(g,9,11+bob,1,6,'#6f493c');r(g,7,11+bob,1,3,p.dark);r(g,11,11+bob,1,3,p.dark);}
  if(p.type==='woman'){r(g,5,2+bob,2,9,p.hair);r(g,12,2+bob,2,9,p.hair);if(up)r(g,6,3+bob,7,8,p.hair);r(g,7,12+bob,1,4,face);r(g,12,12+bob,1,4,face);}
  if(p.type==='elder'){r(g,7,1+bob,5,1,face);r(g,7,2+bob,5,1,lightSkin);r(g,5,4+bob,2,3,p.hair);r(g,12,4+bob,2,3,p.hair);if(up){r(g,7,2+bob,5,4,face);r(g,6,6+bob,7,2,p.hair);}}
  if(p.type==='hood'){r(g,4,2+bob,2,6,p.dark);r(g,13,2+bob,2,6,p.dark);r(g,5,bob,9,2,p.dark);r(g,7,10+bob,5,1,p.light);if(up)r(g,6,2+bob,7,7,p.dark);}
  if(z){if(!up){r(g,11,7+bob,2,1,'#794c3c');r(g,12,8+bob,1,2,'#704938');}r(g,7,15+bob,2,2,'#765443');r(g,11,20,2,1,'#5e5743');if(p.type==='runner')r(g,12,12+bob,2,4,'#875b47');}
  else{r(g,6,18+bob,7,1,'#4c5145');r(g,11,22,2,1,'#9b8057');}
  return c;
 }
 function dirFor(angle){return Math.abs(Math.cos(angle))>Math.abs(Math.sin(angle))?(Math.cos(angle)>0?1:3):(Math.sin(angle)>0?0:2);}
 function actorFrame(direction,frame,variant=-1){direction=((direction%4)+4)%4;frame=Math.max(0,Math.floor(frame))%7;const key=`${variant},${direction},${frame}`;if(!actorSprites.has(key))actorSprites.set(key,bodySprite(direction,frame,variant));return actorSprites.get(key);}
 function drawWeapon(g,x,y,direction,weapon){const d=[[0,1],[1,0],[0,-1],[-1,0]][direction],dx=d[0],dy=d[1],px=Math.round(x+(direction===3?-6:direction===1?6:4)),py=Math.round(y-12+(direction===0?3:direction===2?-2:0));
  if(weapon==='gun'||weapon==='rifle'||weapon==='shotgun'){const len=weapon==='rifle'?12:weapon==='shotgun'?10:7;line(g,px,py,px+dx*len,py+dy*len,'#2e3b37',2);line(g,px,py,px+dx*(len-1),py+dy*(len-1),'#a1a493');r(g,px-dx*2,py-dy*2,3,3,'#746044');}
  else if(weapon==='knife'){line(g,px,py,px+dx*3,py+dy*3,'#896b47',2);line(g,px+dx*4,py+dy*4,px+dx*8,py+dy*8,'#c5c5a7');}
  else if(weapon==='axe'||weapon==='pickaxe'){line(g,px,py,px+dx*11,py+dy*11,'#987c51',2);const tx=px+dx*10,ty=py+dy*10;if(weapon==='axe')r(g,tx-3,ty-2,6,4,'#a6ab94');else line(g,tx-dy*4,ty+dx*4,tx+dy*4,ty-dx*4,'#b5b69a',2);}
 }
 function person(g,x,y,angle,phase,weapon,zombie=null){x=Math.round(x);y=Math.round(y);const direction=dirFor(angle),f=phase===0?0:1+((Math.max(1,Math.floor(phase))-1)%6),variant=zombie?zombie.variant%9:-1;g.save();g.imageSmoothingEnabled=false;r(g,x-6,y,13,2,'#18291e55');r(g,x-4,y+2,9,1,'#18291e33');if(!zombie&&weapon!=='fists'&&direction===2)drawWeapon(g,x,y,direction,weapon);g.drawImage(actorFrame(direction,f,variant),x-9,y-26);if(!zombie&&weapon!=='fists'&&direction!==2)drawWeapon(g,x,y,direction,weapon);g.restore();}
 function tree(g,x,y,n=0){const id=((n%12)+12)%12;g.drawImage(treeSprites[id],Math.round(x)-27,Math.round(y)-71);}
 function roofBounds(o){const h=o.h||64,w=o.w||88,kind=(o.kind==='house'?'cottage':o.kind)||'cottage';return{x:Math.round(o.x-w/2)-5,y:Math.round(o.y-h/2)-(kind==='church'?64:32),w:Math.round(w)+10,h:Math.round(h)+(kind==='church'?48:16)};}
 function roof(g,left,back,right,front,pal,style=0){const width=right-left;polygon(g,[[left-5,back-22],[left+4,back-32],[right-4,back-32],[right+5,back-22],[right+5,front-19],[left-5,front-19]],C.ink);polygon(g,[[left-3,back-22],[left+5,back-30],[right-5,back-30],[right+3,back-22],[right+3,front-21],[left-3,front-21]],pal[0]);
  r(g,left+4,back-30,width-8,2,pal[2]);r(g,left-3,back-22,width+7,2,pal[1]);for(let y=back-18;y<front-21;y+=5){r(g,left-2,y,width+5,1,pal[1]);for(let x=left+1+((y-back)%10?4:0);x<right;x+=10){r(g,x,y+1,1,4,pal[1]);r(g,x+1,y+1,6,1,pal[2]);}}
  r(g,left-5,front-20,width+11,3,C.ink);r(g,left-3,front-20,width+7,1,pal[2]);if(style%3===1){r(g,left+11,back-18,7,4,pal[1]);r(g,right-21,front-27,8,2,pal[1]);}}
 function windowFront(g,x,y,w=12,h=12,shutter=false){r(g,x-1,y-1,w+2,h+2,'#3b4034');r(g,x,y,w,h,'#ada789');r(g,x+2,y+2,w-4,h-4,C.glass);r(g,x+3,y+3,2,h-6,C.glassLight);r(g,x+Math.floor(w/2),y+1,1,h-2,'#8c8f76');r(g,x+1,y+Math.floor(h/2),w-2,1,'#8c8f76');r(g,x-1,y+h,w+2,2,'#514e3c');if(shutter){r(g,x-4,y,2,h,'#6c7551');r(g,x+w+2,y,2,h,'#6c7551');}}
 function exterior(g,o,fade=false){const w=Math.round(o.w||88),h=Math.round(o.h||64),left=Math.round(o.x-w/2),right=left+w,back=Math.round(o.y-h/2),front=back+h,kind=(o.kind==='house'?'cottage':o.kind)||'cottage',style=Math.abs(Number(o.style??o.variant??0)||0),door=Math.round(o.doorX??o.x);g.save();
  r(g,left+4,front, w+4,4,'#26352a55');r(g,right,back+4,4,h,'#26352a55');
  if(kind==='camp'||kind==='tent'){g.globalAlpha=fade?.42:1;polygon(g,[[left-4,front],[left+10,back-18],[right-8,back-18],[right+5,front]],'#303c2c');polygon(g,[[left-2,front-2],[left+12,back-16],[right-10,back-16],[right+3,front-2]],'#64704a');polygon(g,[[left+12,back-16],[door,front-3],[left,front-3]],'#819063');line(g,left+12,back-16,right-10,back-16,'#a1a37d');line(g,door,back-14,door,front-3,'#495d3e');polygon(g,[[door,front-29],[door-11,front-2],[door+11,front-2]],'#25392a');line(g,left,front,left-8,front+5,'#807358');line(g,right,front,right+8,front+5,'#807358');r(g,left-10,front+3,2,5,'#4b4d37');r(g,right+8,front+3,2,5,'#4b4d37');g.restore();return;}
  const wooden=['cottage','farm','barn','military','barracks','workshop'].includes(kind),wall=kind==='church'?'#aaa58c':kind==='clinic'?'#aaa994':kind==='farm'||kind==='barn'?'#805b44':kind==='military'||kind==='barracks'?'#687353':kind==='cottage'?['#857153','#838575','#8f7c5c'][style%3]:wooden?'#857153':'#97866b';
  r(g,left-1,back-1,w+2,h+2,C.ink);r(g,left,back,w,h,wall);r(g,left,front-4,w,5,'#4e4e3c');r(g,right-4,back,4,h-4,wooden?'#5b5c43':'#6d6b56');
  if(wooden)for(let y=front-19;y<front-4;y+=4){r(g,left+1,y,w-5,1,kind==='farm'?'#5f4938':'#5d5b43');r(g,left+2,y+1,w-7,1,kind==='farm'?'#94705a':'#9a8765');}
  else for(let y=front-19;y<front-4;y+=5){r(g,left+1,y,w-5,1,'#81765e');for(let x=left+4+(y%10?8:0);x<right-6;x+=17)r(g,x,y,1,5,'#81765e');}
  if(kind==='warehouse'||kind==='workshop'){r(g,door-20,front-29,40,29,'#333f37');r(g,door-17,front-27,34,25,'#6b7667');for(let yy=front-26;yy<front-3;yy+=4)r(g,door-17,yy,34,1,'#46564a');r(g,door-16,front-25,1,21,'#9a9f87');r(g,door-13,front-3,26,2,'#9a9470');if(w>100)windowFront(g,left+10,front-21,14,12);}
  else{r(g,door-8,front-22,17,23,'#383d32');r(g,door-6,front-20,13,19,kind==='church'?'#6a503b':'#5e5b43');r(g,door-5,front-19,2,17,'#938162');r(g,door+3,front-11,2,1,'#c5b78e');if(kind==='store'){windowFront(g,left+8,front-22,Math.max(15,Math.min(30,door-left-22)),18);if(right-door>30)windowFront(g,door+15,front-22,Math.min(27,right-door-23),18);}
   else{if(door-left>24)windowFront(g,left+10,front-20,12,12,wooden);if(right-door>28)windowFront(g,right-26,front-20,12,12,wooden);}}
  // The facade and ground footprint stay opaque; only the elevated roof fades.
  g.save();if(fade)g.globalAlpha=.42;
  let pal=kind==='farm'||kind==='barn'?['#695a4b','#4d4c40','#96826a']:kind==='military'||kind==='barracks'?['#4d6251','#354b40','#738270']:kind==='church'?['#4b5b5a','#354544','#6f7b71']:kind==='store'||kind==='fuel'?['#696f65','#4b554d','#8d9280']:kind==='clinic'?['#7a8070','#555f52','#a0a48c']:['#64594b','#49473b','#8c7b60'];
  if(kind==='cottage'){pal=[['#64594b','#49473b','#8c7b60'],['#596762','#3d4f47','#7f8a77'],['#7b5d4a','#544838','#a08360']][style%3];}
  roof(g,left,back,right,front,pal,style);
  if(kind==='warehouse'||kind==='workshop'||kind==='military'||kind==='barracks'){for(let x=left+2;x<right;x+=5)r(g,x,back-26,1,h+4,'#283c3440');for(let y=back-21;y<front-22;y+=14)r(g,left-2,y,w+4,1,pal[2]);}
  if(kind==='store'){r(g,left+4,front-22,w-8,2,'#393f34');for(let x=left+4;x<right-4;x+=8){r(g,x,front-21,8,6,(Math.floor((x-left)/8)%2)?'#b1aa86':'#8d5f48');r(g,x,front-15,7,2,'#5d4d3c');}r(g,left+10,front-32,w-20,8,'#4e5948');r(g,left+13,front-30,w-26,1,'#c6bb8d');for(let x=left+14;x<right-15;x+=6)r(g,x,front-28,3,2,'#a8ad8a');}
  if(kind==='fuel'){r(g,left-8,front-21,w+16,5,'#8d6046');r(g,left-8,front-22,w+16,2,'#c0ad82');r(g,left-8,front-17,w+16,2,'#453f30');r(g,left-6,front-15,2,15,'#a49e80');r(g,right+4,front-15,2,15,'#a49e80');}
  if(kind==='clinic'){r(g,o.x-3,back-15,7,3,'#b5816a');r(g,o.x-1,back-17,3,7,'#b5816a');}
  if(kind==='church'){const tx=left+11,tw=22,top=back-51;r(g,tx-2,top+16,tw+4,34,'#4b5148');r(g,tx,top+17,tw,31,'#a4a48d');r(g,tx+2,top+19,3,27,'#c3bca0');polygon(g,[[tx-4,top+17],[tx+tw/2,top-5],[tx+tw+4,top+17]],'#2f413e');polygon(g,[[tx-1,top+15],[tx+tw/2,top-1],[tx+tw+1,top+15]],'#61726a');r(g,tx+8,top+24,7,13,'#38433b');r(g,tx+11,top+24,1,13,'#a7a38b');r(g,tx+8,top+31,7,1,'#a7a38b');r(g,tx+10,top-13,2,10,'#c0b58b');r(g,tx+7,top-10,8,2,'#c0b58b');}
  if(style%3!==2&&kind!=='church'){r(g,right-20,back-29,8,18,'#3b443a');r(g,right-19,back-29,6,14,'#7b7760');r(g,right-20,back-31,8,3,'#a0997a');r(g,right-18,back-30,4,1,'#384239');}
  if(kind==='warehouse'||kind==='workshop'){r(g,left+15,back-23,16,7,'#35463d');r(g,left+16,back-24,14,2,'#9b9e85');for(let x=left+18;x<left+29;x+=3)r(g,x,back-22,1,5,'#708171');}
  g.restore();g.restore();
 }
 function interior(g,o){const left=Math.round(o.x-o.w/2),top=Math.round(o.y-o.h/2),w=Math.round(o.w),h=Math.round(o.h),kind=(o.kind==='house'?'cottage':o.kind)||'cottage',front=top+h;const clinical=kind==='clinic',industrial=['warehouse','workshop','military','barracks'].includes(kind);r(g,left-1,top-1,w+2,h+2,C.ink);r(g,left,top,w,h,industrial?'#626b5c':clinical?'#939784':'#777054');
  if(industrial||clinical){for(let yy=top+4;yy<front-3;yy+=10){r(g,left+3,yy,w-6,1,clinical?'#757e6b':'#535f51');for(let xx=left+4+((yy-top)%20?10:0);xx<left+w-4;xx+=20)r(g,xx,yy,1,10,clinical?'#7d8370':'#566152');}}
  else{for(let yy=top+4;yy<front-3;yy+=6){r(g,left+3,yy,w-6,1,'#575b43');for(let xx=left+7+((yy-top)%12?13:0);xx<left+w-4;xx+=29)r(g,xx,yy+1,1,5,'#5f6047');for(let xx=left+9;xx<left+w-8;xx+=23)r(g,xx,yy+3,7,1,'#8b8060');}}
  r(g,left,top,w,4,'#bbb397');r(g,left,top,4,h,'#a39d82');r(g,left+w-4,top,4,h,'#656e59');r(g,left,front-4,w,4,'#929277');const door=Math.round(o.doorX??o.x);r(g,door-11,front-5,22,6,'#8c805d');r(g,door-9,front-4,18,3,'#ac9b71');r(g,left+5,top+5,w-10,1,'#434e3c');
  // Windows cast hard-edged pixel light; the center and doorway stay clear.
  if(w>60){r(g,left,top+Math.min(22,h-18),4,13,'#c8c39c');r(g,left+4,top+Math.min(24,h-18),9,9,'#d0c39720');r(g,left+w-4,top+Math.min(22,h-18),4,13,'#aec0a0');}
  if(kind==='church'){r(g,o.x-9,top+9,18,5,'#433f31');r(g,o.x-8,top+8,16,4,'#a09671');r(g,o.x-1,top+9,2,2,'#d4c596');r(g,o.x-5,top+10,10,1,'#d4c596');}
  if(kind==='clinic'){r(g,left+w-20,top+7,8,1,'#a86f5c');r(g,left+w-17,top+4,2,7,'#a86f5c');}
 }
 function makeProp(kind,w,h,variant=0){const c=canvas(Math.max(w+12,24),Math.max(h+(kind==='tower'?64:24),28)),g=c.getContext('2d');const x=Math.floor(c.width/2),y=c.height-5,seed=rng(kind.length*734+variant*119);r(g,x-w/2+2,y+1,w,2,'#24372b55');
  if(['car','truck','bus','tractor','ambulance'].includes(kind)){g.save();let vx=x,vy=y,vw=w,vh=h;if(h>w){g.translate(x,y-h/2);g.rotate(Math.PI/2);vx=0;vy=w/2;vw=h;vh=w;}const body=kind==='ambulance'?'#b3b39b':kind==='bus'?'#8c8e77':kind==='truck'?'#687b5b':kind==='tractor'?'#8d6544':['#7d7b5d','#566f70','#7b6552'][variant%3];r(g,vx-vw/2,vy-vh,vw,vh,'#283b34');r(g,vx-vw/2+2,vy-vh+1,vw-4,vh-2,body);r(g,vx-vw/2+3,vy-vh+2,vw-6,1,'#a8a88a');
   if(kind==='bus'){for(let xx=vx-vw/2+5;xx<vx+vw/2-6;xx+=8){r(g,xx,vy-vh+3,6,vh-8,'#354d4d');r(g,xx+1,vy-vh+3,4,2,'#718b7d');r(g,xx+3,vy-vh+5,1,vh-11,'#566c61');}r(g,vx-vw/2+3,vy-6,vw-6,1,'#aba68a');}
   else{const cab=kind==='truck'?vw*.25:vw*.38;r(g,vx-vw/2+Math.floor(vw*.35),vy-vh+1,cab,vh-2,'#46594e');r(g,vx-vw/2+Math.floor(vw*.35)+1,vy-vh+2,cab-2,Math.max(3,vh/2-3),'#2c4546');r(g,vx-vw/2+Math.floor(vw*.35)+2,vy-vh+3,cab-4,2,'#748d7b');r(g,vx-vw/2+Math.floor(vw*.35)+1,vy-6,cab-2,3,'#526e66');if(kind==='truck'){r(g,vx-vw/2+2,vy-vh+2,Math.floor(vw*.3),vh-4,'#425541');for(let i=0;i<3;i++)r(g,vx-vw/2+3,vy-vh+3+i*5,Math.floor(vw*.3)-2,1,'#73805a');}}
   for(const xx of[vx-vw/2+5,vx+vw/2-10]){r(g,xx,vy-vh-2,6,3,'#273730');r(g,xx,vy-1,6,3,'#273730');r(g,xx+1,vy,4,1,'#52614e');}r(g,vx+vw/2-3,vy-vh+2,2,3,'#c8bb83');r(g,vx+vw/2-3,vy-5,2,3,'#baaa70');for(let i=0;i<5;i++)r(g,vx-vw/2+seed()*(vw-5),vy-vh+2+seed()*(vh-4),2,1,'#937247');
   if(kind==='tractor'){r(g,vx-5,vy-vh-6,9,vh+1,'#3f4b38');r(g,vx-3,vy-vh-7,5,2,'#9a8862');r(g,vx-7,vy-vh+3,4,vh-4,'#24382e');r(g,vx+5,vy-vh+3,4,vh-4,'#24382e');r(g,vx+6,vy-vh+5,1,vh-8,'#5e6650');}if(kind==='ambulance'){r(g,vx-5,vy-vh+2,2,7,'#a16a5b');r(g,vx-7,vy-vh+4,6,2,'#a16a5b');r(g,vx+4,vy-vh+2,5,2,'#879d98');}g.restore();}
  else if(kind==='fence'){const top=y-12;for(let xx=x-w/2;xx<=x+w/2;xx+=12){r(g,xx,top,3,14,'#484b36');r(g,xx+1,top,1,13,'#9b906a');}r(g,x-w/2,top+3,w,2,'#7c7654');r(g,x-w/2,top+9,w,2,'#656849');}
  else if(kind==='well'){r(g,x-12,y-7,25,8,'#3f4e40');r(g,x-10,y-12,21,10,'#96957a');r(g,x-7,y-11,15,6,'#334b44');r(g,x-4,y-9,9,3,'#4c6a61');r(g,x-12,y-9,3,7,'#6c7c62');r(g,x+10,y-9,3,7,'#53634f');r(g,x-11,y-22,2,19,'#564d37');r(g,x+10,y-22,2,19,'#564d37');r(g,x-12,y-24,25,3,'#a58b5f');r(g,x,y-21,1,15,'#a89a74');r(g,x-2,y-7,5,5,'#6f7e6d');}
  else if(kind==='pump'){r(g,x-5,y-20,11,21,'#343e33');r(g,x-4,y-19,9,19,variant%2?'#8d6550':'#96947a');r(g,x-3,y-16,7,7,'#364b43');r(g,x-2,y-15,5,3,'#a6b29a');r(g,x-6,y-2,13,3,'#7b7e65');line(g,x+5,y-13,x+9,y-10,'#303b31');line(g,x+9,y-10,x+9,y-3,'#303b31');r(g,x+7,y-4,3,2,'#3e4a3a');}
  else if(kind==='bench'){r(g,x-w/2,y-9,w,3,'#3d4a35');r(g,x-w/2+1,y-10,w-2,2,'#a68f62');r(g,x-w/2,y-16,w,3,'#5e6546');r(g,x-w/2+1,y-16,w-2,1,'#b2a172');r(g,x-w/2+3,y-13,2,13,'#515a3b');r(g,x+w/2-5,y-13,2,13,'#515a3b');}
  else if(kind==='gravestone'){r(g,x-6,y-1,13,3,'#4d594b');r(g,x-5,y-14,11,14,'#757f6d');r(g,x-3,y-17,7,3,'#949b82');r(g,x-4,y-14,2,13,'#a7aa8d');r(g,x-1,y-13,2,8,'#4f6150');r(g,x-3,y-11,6,2,'#4f6150');}
  else if(kind==='reeds'){for(let i=0;i<7;i++){const xx=x-8+i*3;line(g,xx,y,xx+(i%3-1)*2,y-12-i%3*4,'#869061');r(g,xx+(i%3-1)*2,y-15-i%3*4,2,5,'#696448');}}
  else if(kind==='crops'){r(g,x-w/2,y-h,w,h,'#5c5840');r(g,x-w/2,y-1,w,1,'#93805a');for(let xx=x-w/2+4;xx<x+w/2-2;xx+=9){r(g,xx,y-h+3,2,4,'#3f5c35');r(g,xx-2,y-h+3,2,2,'#6e8050');r(g,xx+2,y-h+1,2,3,'#8a935c');}}
  else if(kind==='pier'){r(g,x-w/2,y-h,w,h,'#484b36');for(let xx=x-w/2+1;xx<x+w/2-1;xx+=6){r(g,xx,y-h+1,5,h-2,'#8f7951');r(g,xx,y-h+1,1,h-2,'#b49a68');}r(g,x-w/2,y-h,2,h+3,'#4c4c35');r(g,x+w/2-2,y-h,2,h+3,'#4c4c35');}
  else if(kind==='barricade'){r(g,x-w/2,y-h-4,w,h+3,'#414d3a');r(g,x-w/2+2,y-h-3,w-4,h,'#9a9577');r(g,x-w/2+2,y-h-3,w-4,2,'#b6ae88');for(let xx=x-w/2+5;xx<x+w/2-3;xx+=12){line(g,xx,y-h+3,xx+5,y-h-1,'#716547',2);}r(g,x-w/2+5,y,5,2,'#4d5540');r(g,x+w/2-10,y,5,2,'#4d5540');}
  else if(kind==='tower'){line(g,x-8,y,x-10,y-41,'#3b4b36',3);line(g,x+8,y,x+10,y-41,'#3b4b36',3);line(g,x-8,y-2,x+9,y-39,'#707555');line(g,x+8,y-2,x-9,y-39,'#5c6548');r(g,x-13,y-44,27,6,'#464e38');r(g,x-12,y-55,25,12,'#788360');r(g,x-8,y-52,17,6,'#2c4335');r(g,x-7,y-51,4,4,'#6b8270');r(g,x-14,y-57,29,3,'#a1a17b');r(g,x-14,y-58,29,1,'#4f6044');for(let yy=y-31;yy<y;yy+=6)r(g,x-2,yy,5,1,'#a39670');line(g,x-4,y,x-4,y-36,'#736c4b');line(g,x+4,y,x+4,y-36,'#736c4b');}
  else{const ww=Math.min(w,26),hh=Math.min(h+3,18);r(g,x-ww/2,y-hh,ww,hh,'#414732');r(g,x-ww/2+1,y-hh+1,ww-2,hh-2,'#8b7853');r(g,x-ww/2+1,y-hh+1,ww-2,2,'#b39c6b');r(g,x-ww/2+4,y-hh,2,hh,'#5c6041');r(g,x+ww/2-6,y-hh,2,hh,'#5c6041');r(g,x-2,y-hh+Math.floor(hh/2),4,2,'#c0af7a');}
  return c;
 }
 function prop(g,o){const kind=o.kind||o.prop||'crates',w=Math.round(o.w||(kind==='bus'?60:kind==='truck'?44:kind==='fence'?60:kind==='car'?32:20)),h=Math.round(o.h||(kind==='car'?16:kind==='bus'?22:kind==='fence'?4:16)),variant=o.variant||0,key=`${kind}:${w}:${h}:${variant%3}`;if(!propSprites.has(key))propSprites.set(key,makeProp(kind,w,h,variant));const c=propSprites.get(key);g.drawImage(c,Math.round(o.x)-Math.floor(c.width/2),Math.round(o.y+h/2)-c.height+5);}
 function portrait(g){g.clearRect(0,0,48,48);r(g,0,0,48,48,'#6c7353');r(g,3,3,42,42,'#8e9371');r(g,5,35,38,13,'#505d49');r(g,9,31,31,17,'#7d8567');r(g,13,31,12,17,'#a3a487');r(g,21,25,9,12,'#a9825a');r(g,16,9,20,22,'#342f27');r(g,17,11,18,19,'#d2a373');r(g,17,12,13,15,'#dfb484');r(g,29,15,6,12,'#b78d60');r(g,14,8,22,7,'#65482e');r(g,16,5,17,5,'#795737');r(g,17,7,8,3,'#9a7547');r(g,14,13,5,9,'#795737');r(g,32,11,4,6,'#65482e');r(g,23,18,2,2,'#3c3c2e');r(g,31,18,2,2,'#3c3c2e');r(g,27,25,6,1,'#946e4b');r(g,27,21,2,3,'#b38b5e');r(g,9,34,5,14,'#687759');r(g,35,35,5,13,'#596b51');}
 async function load(){if(textures.length)return;for(let t=0;t<5;t++){textures[t]=[];for(let i=0;i<4;i++)textures[t].push(texture(t,i));}for(let i=0;i<12;i++)treeSprites.push(leafyTree(i));for(let v=-1;v<9;v++)for(let d=0;d<4;d++)for(let f=0;f<7;f++)actorFrame(d,f,v);}
 function scene(){/* Locations are assembled from individual world objects. */}
 return{load,scenes,textures,scene,exterior,interior,roofBounds,tree,person,portrait,prop,actorFrame,diagnostics:Object.freeze({actorWidth:18,actorHeight:28,directions:4,walkFrames:6,treeVariants:12,externalAssets:0})};
})();
