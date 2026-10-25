/* Keep game systems independent of the chosen art bank. */
(()=>{
 const fallback=window.GameArt;
 window.GameArt={...fallback,textures:ClassicWorldArt.textures,
  async load(){await ClassicAssets.load();await fallback.load();await ClassicWorldArt.init();ClassicActors.init();},
  person:ClassicActors.person,portrait:ClassicActors.portrait,actorFrame:ClassicActors.actorFrame,
  tree:ClassicWorldArt.tree,exterior:ClassicWorldArt.exterior,interior:ClassicWorldArt.interior,roofBounds:ClassicWorldArt.roofBounds,
  diagnostics:Object.freeze({...fallback.diagnostics,...ClassicActors.diagnostics,externalAssets:Object.keys(window.CLASSIC_ASSET_FILES||{}).length,modularArchitecture:true}),
 };
})();
