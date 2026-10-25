/* Local sprite bank. The downloadable build embeds the exact same PNG bytes. */
window.ClassicAssets=(()=>{
 const images={};let pending;
 function load(){
  if(pending)return pending;
  const files=window.CLASSIC_ASSET_DATA||window.CLASSIC_ASSET_FILES;
  if(!files)throw Error('Classic asset manifest missing.');
  pending=Promise.all(Object.entries(files).map(async([key,src])=>{const image=new Image();image.src=src;await image.decode();images[key]=image;}));
  return pending;
 }
 function get(key){if(!images[key])throw Error('Missing classic sprite: '+key);return images[key];}
 return{load,get,keys:()=>Object.keys(images),sourceCommit:'fa2e73a3f899bd59ded1a9e920eda92f822c32ba'};
})();
