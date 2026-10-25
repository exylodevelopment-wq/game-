/* Native Mini DAYZ sprite layers from 011eh/minidayz, commit
   fa2e73a3f899bd59ded1a9e920eda92f822c32ba. Frame indices match
   character/character.tscn. No stretched limbs or reconstructed frame crops. */
window.ClassicActors = (() => {
  'use strict';
  const sourceCommit = 'fa2e73a3f899bd59ded1a9e920eda92f822c32ba';
  const skin = 'character/player_skin/player_skin_def_1.png';
  const shirt = 'equipment/clothes/tshirt.png';
  const pants = 'equipment/pants/jeans.png';
  const zombies = [
    'zed/zed_normal_skin1.png',
    'zed/zed_fast_skin1.png',
    'zed/zed_army_skin1.png',
    'zed/zed_normal_skin2.png',
    'zed/zed_army_skin2.png',
    'zed/zed_normal_skin3.png',
    'zed/zed_normal_skin4.png',
    'zed/zed_normal_skin7.png',
    'zed/zed_normal_skin8.png',
  ];
  const equipment = {
    gun: 'equipment/weapon/pistol/glock.png',
    rifle: 'equipment/weapon/main/mosin.png',
    shotgun: 'equipment/weapon/main/izh-43.png',
    axe: 'equipment/weapon/melee/hatchet.png',
    pickaxe: 'equipment/weapon/melee/pickaxe.png',
    knife: 'equipment/weapon/melee/hunter_knife.png',
  };
  const variantKinds = Object.freeze(['normal', 'fast', 'army', 'normal', 'army', 'normal', 'normal', 'normal', 'normal']);
  const variants = Object.freeze(zombies.map((path, i) => Object.freeze({path, kind: variantKinds[i]})));
  const deadFrames = [48, 43, 44, 47, 48, 44, 49, 47, 47];
  const paths = Object.freeze([skin, shirt, pants, ...zombies, ...Object.values(equipment)]);
  const idle = [0, 2, 1, 3];                 // down, right, up, left
  const walk = [4, 12, 8, 16];
  const firearmIdle = [33, 35, 32, 34];
  const pistolIdle = [21, 23, 20, 22];
  const pistolWalk = [0, 8, 4, 12];
  const rifleIdle = [61, 63, 60, 62];
  const rifleWalk = [40, 48, 44, 52];
  const meleeIdle = [40, 42, 41, 43];
  const meleeWalk = [44, 52, 48, 56];
  const frames = new Map();

  function image(path) {
    const asset = window.ClassicAssets?.get(path);
    if (!asset || !asset.width || !asset.height) throw new Error('Actor asset unavailable: ' + path);
    return asset;
  }
  function frame(path, index) {
    const key = path + ':' + index;
    if (!frames.has(key)) {
      const atlas = image(path), canvas = document.createElement('canvas');
      canvas.width = canvas.height = 32;
      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = false;
      context.drawImage(atlas, (index % 4) * 32, Math.floor(index / 4) * 32,
        32, 32, 0, 0, 32, 32);
      frames.set(key, canvas);
    }
    return frames.get(key);
  }
  function dressedPlayer(index) {
    const key = 'dressed:' + index;
    if (!frames.has(key)) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
      const context = canvas.getContext('2d'); context.imageSmoothingEnabled = false;
      context.drawImage(frame(skin, index), 0, 0);
      context.drawImage(frame(shirt, index), 0, 0);
      context.drawImage(frame(pants, index), 0, 0);
      frames.set(key, canvas);
    }
    return frames.get(key);
  }
  function normalDirection(direction) { return ((direction % 4) + 4) % 4; }
  function directionFor(angle) {
    return Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))
      ? (Math.cos(angle) > 0 ? 1 : 3) : (Math.sin(angle) > 0 ? 0 : 2);
  }
  function actorFrame(direction, pose, variant = -1) {
    direction = normalDirection(direction);
    pose = Math.max(0, Math.floor(pose));
    const path = variant < 0 ? skin : zombies[((variant % zombies.length) + zombies.length) % zombies.length];
    const index = pose === 0 ? idle[direction] : walk[direction] + ((pose - 1) % 4);
    return variant < 0 ? dressedPlayer(index) : frame(path, index);
  }
  function person(context, x, y, angle, phase, weapon, zombie = null) {
    const direction = directionFor(angle), step = Math.floor(Math.max(0, phase)) % 4;
    const moving = phase !== 0, firearm = ['gun', 'rifle', 'shotgun'].includes(weapon);
    let base;
    if (zombie) base = actorFrame(direction, moving ? step + 1 : 0, zombie.variant || 0);
    else base = dressedPlayer(moving ? walk[direction] + step : firearm ? firearmIdle[direction] : idle[direction]);
    const left = Math.round(x) - 16, top = Math.round(y) - 30;
    context.save();
    context.imageSmoothingEnabled = false;
    context.drawImage(base, left, top);
    if (!zombie && equipment[weapon]) {
      const standby = weapon === 'gun' ? pistolIdle : firearm ? rifleIdle : meleeIdle;
      const walking = weapon === 'gun' ? pistolWalk : firearm ? rifleWalk : meleeWalk;
      context.drawImage(frame(equipment[weapon], moving ? walking[direction] + step : standby[direction]), left, top);
    }
    context.restore();
  }
  function corpse(context, x, y, variant = 0) {
    const model = ((variant % zombies.length) + zombies.length) % zombies.length;
    context.save(); context.imageSmoothingEnabled = false;
    context.drawImage(frame(zombies[model], deadFrames[model]), Math.round(x) - 16, Math.round(y) - 30);
    context.restore();
  }
  function portrait(context) {
    const width = context.canvas.width, height = context.canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#76775d';
    context.fillRect(0, 0, width, height);
    context.save();
    context.imageSmoothingEnabled = false;
    context.drawImage(dressedPlayer(0), 8, 0, 16, 16, 0, 0, width, height);
    context.restore();
  }
  function init() {
    for (const path of paths) image(path);
    for (let variant = -1; variant < zombies.length; variant++) {
      for (let direction = 0; direction < 4; direction++) {
        for (let pose = 0; pose < 5; pose++) actorFrame(direction, pose, variant);
      }
    }
  }
  return {
    init, person, actorFrame, portrait, corpse, paths, variants, variantKinds,
    diagnostics: Object.freeze({sourceCommit, actorWidth: 32, actorHeight: 32,
      directions: 4, walkFrames: 4, zombieVariants: zombies.length, nativePixels: true}),
  };
})();
