/* Modular architecture and natural scenery based on 011eh/minidayz's native
   pixel assets. Full location screenshots are never used as map backdrops.
   Source textures retain their own pixels; building dimensions, facades,
   floorplans, rooflines and authored site details are composed for this game. */
window.ClassicWorldArt=(()=>{
 'use strict';
 const textures=[],buildings=new Map(),treeFrames=[];
 const asset=p=>{const im=window.ClassicAssets?.get(p);if(!im)throw Error('Missing classic world asset: '+p);return im;};
 const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c;};
 const rect=(g,x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const line=(g,x0,y0,x1,y1,col,w=1)=>{x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;for(;;){rect(g,x0,y0,w,w,col);if(x0===x1&&y0===y1)break;const e=err*2;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}};
 function polygon(g,points,col){g.fillStyle=col;const min=Math.floor(Math.min(...points.map(p=>p[1]))),max=Math.ceil(Math.max(...points.map(p=>p[1])));for(let y=min;y<=max;y++){const cuts=[];for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))cuts.push(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]));}cuts.sort((a,b)=>a-b);for(let i=0;i+1<cuts.length;i+=2)g.fillRect(Math.ceil(cuts[i]),y,Math.floor(cuts[i+1])-Math.ceil(cuts[i])+1,1);}}
 function tile(g,path,sx,sy,sw,sh,x,y,w,h){const im=asset(path);for(let yy=0;yy<h;yy+=sh)for(let xx=0;xx<w;xx+=sw){const cw=Math.min(sw,w-xx),ch=Math.min(sh,h-yy);g.drawImage(im,sx,sy,cw,ch,Math.round(x+xx),Math.round(y+yy),cw,ch);}}
 function maskedTexture(target,path,source,points,w,h){const layer=canvas(w,h),g=layer.getContext('2d');tile(g,path,...source,0,0,w,h);const mask=canvas(w,h),m=mask.getContext('2d');polygon(m,points,'#fff');g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0);target.drawImage(layer,0,0);}
 const env='environment/',bld='building/';
 const mats={
  cottage:{roof:'b_village_brown-sheet0.png',rs:[9,44,28,31],wall:'b_village_brown-sheet0.png',ws:[43,119,28,25],floor:'b_village_brown_int-sheet0.png',fs:[86,76,30,25],window:'b_village_brown-sheet0.png',win:[25,116,14,25]},
  green:{roof:'b_village_brown-sheet0.png',rs:[8,44,29,31],wall:'b_village_green-sheet0.png',ws:[29,116,24,7],floor:'b_village_brown_int-sheet0.png',fs:[86,76,30,25],window:'b_village_green-sheet0.png',win:[22,91,18,23]},
  military:{roof:'b_military_barrack-sheet0.png',rs:[19,36,38,44],wall:'b_military_barrack-sheet0.png',ws:[58,97,27,31],floor:'b_military_barrack_int-sheet0.png',fs:[77,110,22,22],window:'b_military_barrack-sheet0.png',win:[29,95,23,20]},
  industrial:{roof:'b_garage_blue-sheet0.png',rs:[5,5,32,32],wall:'b_garage_blue-sheet0.png',ws:[49,68,28,29],floor:'b_garage_blue_int-sheet0.png',fs:[4,73,24,25],window:'b_military_barrack-sheet0.png',win:[29,95,23,20]},
  clinic:{roof:'b_hospital-sheet0.png',rs:[48,111,36,38],wall:'b_hospital-sheet0.png',ws:[176,226,29,25],floor:'b_hospital_int-sheet0.png',fs:[310,116,24,24],window:'b_hospital-sheet0.png',win:[19,265,19,20]},
 };
 function material(o){if(o.special==='triage'||o.kind==='clinic')return mats.clinic;if(o.special==='relay'||['workshop','warehouse','fuel'].includes(o.kind))return mats.industrial;if(o.kind==='military')return mats.military;return (o.style||o.variant||0)%3===1?mats.green:mats.cottage;}
 const round=o=>({w:Math.round(o.w||88),h:Math.round(o.h||64),style:o.style??o.variant??0,door:Math.round((o.doorX??o.x)-o.x)});
 function roofBounds(o){const extra=o.special==='relay'?89:o.kind==='church'?69:32;return{x:Math.round(o.x-o.w/2)-6,y:Math.round(o.y-o.h/2)-extra,w:Math.round(o.w)+12,h:Math.round(o.h)+extra-28};}
 function build(o){const{w,h,style,door}=round(o),key=[o.kind,o.special||'',w,h,style%7,door].join(':');if(buildings.has(key))return buildings.get(key);const cw=w+24,ch=h+112,left=12,back=96,right=left+w,front=back+h,m=material(o),floor=canvas(cw,ch),base=canvas(cw,ch),roof=canvas(cw,ch),trim=canvas(cw,ch),fg=floor.getContext('2d'),bg=base.getContext('2d'),rg=roof.getContext('2d'),tg=trim.getContext('2d'),dx=left+w/2+door;
  // Floor and walls use separate native asset regions. Neither has roof pixels.
  rect(fg,left-1,back-1,w+2,h+2,'#302f29');tile(fg,bld+m.floor,...m.fs,left+3,back+3,w-6,h-6);rect(fg,left,back,w,4,'#8b8976');rect(fg,left,back,4,h,'#777a65');rect(fg,right-4,back,4,h,'#575e50');rect(fg,left,front-4,w,4,'#83846d');rect(fg,dx-11,front-5,22,6,'#958b70');
  // Exterior ground wall footprint is identical to the physics rectangle.
  rect(bg,left+3,front+1,w+3,3,'#25302955');rect(bg,right,back+3,4,h,'#25302944');rect(bg,left-1,back-1,w+2,h+2,'#2b3029');tile(bg,bld+m.wall,...m.ws,left,back,w,h);rect(bg,right-3,back,3,h,'#404b3b');rect(bg,left,front-3,w,4,'#414839');
  const flat=['warehouse','workshop','clinic','fuel'].includes(o.kind)||o.special==='relay'||o.special==='triage';
  if(o.kind==='camp'){
   const tentPal=style%2?['#3c4a35','#65794d','#819265']:['#3c4232','#7b7854','#96916a'];polygon(rg,[[left-4,front],[left+8,back-20],[right-8,back-20],[right+4,front]],tentPal[0]);maskedTexture(rg,bld+'b_military_barrack-sheet0.png',[17,95,24,30],[[left-2,front-2],[left+10,back-18],[right-10,back-18],[right+2,front-2]],cw,ch);rg.save();rg.globalCompositeOperation='source-atop';rect(rg,left-4,back-20,w+8,h+20,tentPal[1]+'80');rg.restore();line(rg,left+10,back-18,right-10,back-18,tentPal[2]);line(rg,dx,back-17,dx,front-2,'#c0b990');polygon(tg,[[dx,front-30],[dx-11,front-2],[dx+11,front-2]],'#22372a');
  }else{
   const points=flat?[[left-5,back-24],[right+5,back-24],[right+5,front-30],[left-5,front-30]]:[[left-5,back-20],[left+5,back-32],[right-5,back-32],[right+5,back-20],[right+5,front-30],[left-5,front-30]];
   polygon(rg,points,'#292f28');const inner=points.map(([x,y])=>[x+(x<(left+right)/2?2:-2),y+(y<back?2:-2)]);maskedTexture(rg,bld+m.roof,m.rs,inner,cw,ch);line(rg,left-4,front-31,right+4,front-31,'#a7a38d');line(rg,left-5,front-29,right+5,front-29,'#292f28',2);if(!flat)line(rg,left+5,back-30,right-5,back-30,'#aca892');
   // Alter the architecture with a dormer, raised rooftop or clerestory, not a resized source building.
   if(style%3===2&&w>82&&!flat){rg.drawImage(asset(bld+'b_village_brown-sheet0.png'),64,70,41,30,Math.round((left+right)/2-20),back-4,41,30);}
   if(flat){rect(rg,left-5,back-24,w+10,3,'#b0ad99');rect(rg,left-4,back-21,w+8,2,'#494f42');for(let x=left+20;x<right-12;x+=38){rect(rg,x,back-17,18,6,'#353f36');rect(rg,x+1,back-18,16,3,'#9ba38e');}}
   for(let x=left+13;x<right-15;x+=o.kind==='warehouse'?42:34){if(Math.abs(x+8-dx)<19)continue;const[wx,wy,ww,wh]=m.win;rect(tg,x,front-wh-4,ww,wh,'#293d34');tg.drawImage(asset(bld+m.window),wx,wy,ww,wh,Math.round(x),front-wh-4,ww,wh);}
   rect(tg,dx-12,front-31,24,31,'#3e4035');rect(tg,dx-10,front-29,20,28,'#1e2c24');rect(tg,dx-13,front-31,2,31,'#a39e89');rect(tg,dx+11,front-31,2,31,'#5c6652');rect(tg,dx-13,front-1,26,3,'#a49b7c');
   // Open door leaf uses original door pixels, leaving the real 24px opening clear.
   tg.drawImage(asset(bld+'door.png'),63,131,19,29,Math.round(dx+6),front-29,5,29);
  }
  if(o.kind==='store'){rect(tg,left+7,front-45,w-14,9,'#3a493b');rect(tg,left+8,front-44,w-16,1,'#b6b798');for(let x=left+12;x<right-10;x+=7)rect(tg,x,front-42,3,3,'#b8baa0');}
  if(o.kind==='military'){rect(tg,left+6,front-30,6,10,'#455e3d');rect(tg,left+8,front-17,2,6,'#bbbc84');}
  if(o.kind==='warehouse'||o.kind==='workshop'){const sx=dx<(left+right)/2?right-38:left+8;tile(tg,bld+'b_military_barrack-sheet0.png',18,36,22,30,sx,front-29,29,26);for(let y=front-27;y<front-3;y+=5)rect(tg,sx,y,29,1,'#474e40');}
  if(o.kind==='church'){const cx=Math.round((left+right)/2);rect(rg,cx-10,back-47,21,29,'#8e8c78');rect(rg,cx-8,back-44,17,23,'#b6b2a0');rect(rg,cx-4,back-40,9,15,'#31433b');rg.drawImage(asset(bld+'b_church-sheet0.png'),61,354,9,20,cx-4,back-42,9,20);polygon(rg,[[cx-14,back-47],[cx,back-59],[cx+14,back-47]],'#555f50');line(rg,cx,back-69,cx,back-58,'#c7b16e',2);line(rg,cx-4,back-65,cx+5,back-65,'#c7b16e',2);for(let x=left+14;x<right-14;x+=29)rect(fg,x,back+16,20,5,'#63533d');}
  if(o.special==='relay'){
   const ax=right-18;line(rg,ax,back-88,ax,back-12,'#263b32',2);line(rg,ax+1,back-85,ax+1,back-13,'#96947b');for(let y=back-74;y<back-20;y+=14)line(rg,ax-10,y,ax+11,y-6,'#b2b096');line(rg,ax,back-57,right+3,front-32,'#626d55');line(rg,ax,back-57,left+10,front-32,'#626d55');rect(tg,left+7,front-34,27,6,'#b8b39b');rect(tg,left+10,front-32,21,2,'#576b5a');rect(fg,left+7,back+8,29,10,'#444a3b');rect(fg,left+9,back+7,9,6,'#627567');rect(fg,left+21,back+8,10,4,'#aaa58c');
  }
  if(o.special==='triage'||o.kind==='clinic'){
   const cx=left+Math.max(15,Math.min(w-16,Math.round(w*.24)));rect(tg,cx-2,front-45,5,16,'#a2564a');rect(tg,cx-7,front-40,15,5,'#a2564a');rect(rg,left+10,back-18,23,13,'#b2b29b');rect(rg,left+20,back-17,4,11,'#9f5b50');rect(rg,left+16,back-13,12,3,'#9f5b50');rect(fg,right-27,back+8,17,27,'#535f54');rect(fg,right-26,back+9,15,8,'#b5b6a0');rect(fg,right-26,back+18,15,14,'#849181');
  }
  const built={base,roof,trim,floor,w,h,pad:96};buildings.set(key,built);return built;
 }
 function exterior(g,o,fade=false){const b=build(o),x=Math.round(o.x-b.w/2)-12,y=Math.round(o.y-b.h/2)-b.pad;g.save();g.imageSmoothingEnabled=false;g.drawImage(b.base,x,y);g.globalAlpha=fade?.30:1;g.drawImage(b.roof,x,y);g.globalAlpha=1;g.drawImage(b.trim,x,y);g.restore();}
 function interior(g,o){const b=build(o);g.save();g.imageSmoothingEnabled=false;g.drawImage(b.floor,Math.round(o.x-b.w/2)-12,Math.round(o.y-b.h/2)-b.pad);g.restore();}
 function tree(g,x,y,n=0){const id=((n%treeFrames.length)+treeFrames.length)%treeFrames.length,t=treeFrames[id];g.save();g.imageSmoothingEnabled=false;g.drawImage(t.image,0,0,t.w,t.h,Math.round(x+t.dx),Math.round(y+t.dy),t.w,t.h);g.restore();}
 async function init(){if(textures.length)return;const ground=asset(env+'ground_tilemap.png');const positions=[[[60,60],[60,60],[60,60],[60,60]],[[60,60],[60,60],[60,60],[60,60]],[[660,60],[660,60],[660,60],[660,60]],[[0,180],[60,180],[0,180],[0,240]],[[360,360],[360,360],[360,360],[360,360]]];const shifts=[[2,2],[18,2],[2,18],[18,18]];for(let type=0;type<5;type++){textures[type]=[];for(let variant=0;variant<4;variant++){const c=canvas(32,32),g=c.getContext('2d'),[x,y]=positions[type][variant],[dx,dy]=shifts[variant];g.imageSmoothingEnabled=false;g.drawImage(ground,x+dx,y+dy,32,32,0,0,32,32);if(type===1){g.fillStyle='#243b2b22';g.fillRect(0,0,32,32);}textures[type].push(c);}}
  const trees=[['tree_leaves_1.png',-4,-41],['tree_leaves_2.png',0,-46],['tree_leaves_3.png',0,-58],['tree_leaves_4.png',0,-58],['tree_pine_1.png',0,-47],['tree_pine_2.png',0,-60]];for(const[path,x,y]of trees){const image=asset(env+path),w=image.width/2,h=image.height;treeFrames.push({image,w,h,dx:Math.round(x-w/2),dy:Math.round(y-h/2)});}
 }
 const paths=Object.freeze(['environment/ground_tilemap.png',...['tree_leaves_1.png','tree_leaves_2.png','tree_leaves_3.png','tree_leaves_4.png','tree_pine_1.png','tree_pine_2.png'].map(p=>'environment/'+p),...['b_village_brown-sheet0.png','b_village_green-sheet0.png','b_village_brown_int-sheet0.png','b_military_barrack-sheet0.png','b_military_barrack_int-sheet0.png','b_hospital-sheet0.png','b_hospital_int-sheet0.png','b_garage_blue-sheet0.png','b_garage_blue_int-sheet0.png','b_church-sheet0.png','door.png'].map(p=>'building/'+p)]);
 return{paths,load:init,init,textures,tree,exterior,interior,roofBounds,diagnostics:{sourceAssets:18,treeVariants:6,terrainNativePixels:true,treeScale:1,treeLivingFramesOnly:true,modularArchitecture:true,newThemes:['relay','triage','repair']}};
})();
