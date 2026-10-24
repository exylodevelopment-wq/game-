/* Location-specific, seedable search loot. These are chances per manual search,
   not guaranteed objects per house. Empty rooms and empty bodies are normal.
   No function here changes inventory or rewards a kill. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SurvivalLoot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const items = {
    food: { name: 'Conservă de carne', type: 'consumable', effects: { hunger: 36 }, description: 'O masă rece, dar sățioasă.', maxFind: 3 },
    water: { name: 'Apă îmbuteliată', type: 'consumable', effects: { thirst: 42 }, description: 'Apă potabilă într-o sticlă sigilată.', maxFind: 3 },
    med: { name: 'Bandaj steril', type: 'consumable', effects: { hp: 38 }, description: 'Pansament pentru răni serioase.', maxFind: 3 },
    cloth: { name: 'Material textil', type: 'resource', description: 'Țesătură curată pentru bandaje.', maxFind: 6 },
    knife: { name: 'Cuțit de vânătoare', type: 'weapon', damage: 1.5, reach: 31, description: 'Armă scurtă, rapidă și silențioasă.', maxFind: 1 },
    axe: { name: 'Topor', type: 'weapon', damage: 2, reach: 37, tool: 'wood', description: 'Taie copaci și ține un zombi la distanță.', maxFind: 1 },
    gun: { name: 'Pistol M9', type: 'weapon', damage: 1.4, mag: 12, ammo: 'ammo', description: 'Se găsește descărcat. Folosește cartușe 9 mm.', maxFind: 1 },
    rifle: { name: 'Carabină', type: 'weapon', damage: 3, mag: 8, ammo: 'rifleAmmo', description: 'Armă rară, precisă, găsită descărcată.', maxFind: 1 },
    ammo: { name: 'Cartușe 9 mm', type: 'ammo', description: 'Muniție pentru pistolul M9.', maxFind: 12 },
    rifleAmmo: { name: 'Cartușe 7.62', type: 'ammo', description: 'Muniție pentru carabină.', maxFind: 8 },
    wood: { name: 'Lemn', type: 'resource', description: 'Crengi și bucăți de lemn pentru foc sau unelte.', maxFind: 6 },
    stone: { name: 'Piatră', type: 'resource', description: 'Material pentru crafting și focul de tabără.', maxFind: 6 },
    scrap: { name: 'Metal recuperat', type: 'resource', description: 'Piese găsite prin ateliere și depozite.', maxFind: 6 },
    matches: { name: 'Chibrituri', type: 'resource', description: 'Necesare pentru a aprinde un foc.', maxFind: 3 },
    camp: { name: 'Foc de tabără', type: 'placeable', description: 'Un foc pregătit pentru amplasare afară.', maxFind: 1 },
    pickaxe: { name: 'Târnăcop', type: 'weapon', damage: 1.8, reach: 35, tool: 'stone', description: 'Extrage piatră din depozite de rocă.', maxFind: 1 },
    crackers: { name: 'Biscuiți sărați', type: 'consumable', effects: { hunger: 22, thirst: -4 }, description: 'Potolesc foamea, dar îți fac puțin sete.', maxFind: 3 },
    canteen: { name: 'Bidon cu apă', type: 'consumable', effects: { thirst: 65 }, description: 'O rezervă de apă pentru drumuri lungi.', maxFind: 1 },
    antiseptic: { name: 'Antiseptic', type: 'consumable', effects: { hp: 15 }, description: 'Curăță rănile și reface puțină sănătate.', maxFind: 2 },
    herbs: { name: 'Ierburi medicinale', type: 'consumable', effects: { hp: 8 }, description: 'Un ajutor modest atunci când nu ai bandaje.', maxFind: 3 },
    rope: { name: 'Sfoară', type: 'resource', description: 'Leagă și întărește uneltele improvizate.', maxFind: 3 },
    battery: { name: 'Baterie', type: 'resource', description: 'Alimentează lanterna în timpul nopții.', maxFind: 2 },
    flashlight: { name: 'Lanternă', type: 'equipment', description: 'Lumină portabilă. Necesită o baterie.', maxFind: 1 },
    shotgun: { name: 'Pușcă de vânătoare', type: 'weapon', damage: 4, mag: 2, ammo: 'shotgunAmmo', description: 'Puternică de aproape. Se găsește descărcată.', maxFind: 1 },
    shotgunAmmo: { name: 'Cartușe de vânătoare', type: 'ammo', description: 'Muniție pentru pușca de vânătoare.', maxFind: 6 },
    beans: { name: 'Conservă de fasole', type: 'consumable', effects: { hunger: 45 }, description: 'O rezervă consistentă de hrană.', maxFind: 2 },
    apple: { name: 'Măr', type: 'consumable', effects: { hunger: 14, thirst: 8 }, description: 'Hrană ușoară, cu puțină apă.', maxFind: 3 },
    painkillers: { name: 'Calmante', type: 'consumable', effects: { hp: 22 }, description: 'Îți permit să mergi mai departe după o rană.', maxFind: 2 }
  };

  // Each tuple is [item, relative weight, minimum amount, maximum amount].
  // A weight is conditional on a successful search; it is not a percent.
  const entry = (item, weight, min = 1, max = min) => ({ item, weight, min, max });
  const table = entries => entries.map(args => entry(...args));
  const profiles = {
    church: { emptyChance: .72, table: table([
      ['cloth', 22, 1, 2], ['med', 6], ['antiseptic', 3], ['herbs', 7], ['painkillers', 2],
      ['water', 9], ['food', 4], ['crackers', 7], ['beans', 3], ['matches', 3], ['rope', 2]
    ]) },
    military: { emptyChance: .57, table: table([
      ['cloth', 8, 1, 2], ['med', 7], ['water', 7], ['food', 5], ['canteen', 5],
      ['ammo', 13, 2, 5], ['rifleAmmo', 11, 1, 4], ['gun', 9], ['rifle', 7], ['knife', 5],
      ['shotgun', 1], ['shotgunAmmo', 2, 1, 3], ['flashlight', 3], ['battery', 5], ['painkillers', 3], ['rope', 2]
    ]) },
    store: { emptyChance: .66, table: table([
      ['food', 13], ['water', 14], ['beans', 13], ['crackers', 15], ['apple', 9], ['cloth', 4],
      ['matches', 4], ['battery', 4], ['painkillers', 2], ['antiseptic', 2], ['rope', 2], ['knife', 1.2], ['flashlight', 1]
    ]) },
    farm: { emptyChance: .69, table: table([
      ['apple', 18, 1, 2], ['beans', 10], ['food', 5], ['water', 7], ['rope', 12], ['wood', 8, 1, 2],
      ['cloth', 7], ['matches', 4], ['axe', 4], ['pickaxe', 2], ['knife', 2], ['shotgun', 1.2], ['shotgunAmmo', 2.5, 1, 2], ['herbs', 5]
    ]) },
    warehouse: { emptyChance: .73, table: table([
      ['scrap', 20, 1, 3], ['rope', 12], ['cloth', 11, 1, 2], ['wood', 8, 1, 2], ['matches', 4],
      ['battery', 9], ['flashlight', 3], ['pickaxe', 4], ['axe', 3], ['knife', 1.2], ['water', 4], ['crackers', 3]
    ]) },
    camp: { emptyChance: .71, table: table([
      ['cloth', 12, 1, 2], ['rope', 12], ['water', 11], ['canteen', 4], ['crackers', 10], ['food', 6],
      ['matches', 8], ['herbs', 7], ['med', 3], ['knife', 3], ['axe', 1.5], ['flashlight', 2], ['battery', 3], ['shotgunAmmo', .8, 1, 2]
    ]) },
    fuel: { emptyChance: .76, table: table([
      ['scrap', 14, 1, 2], ['water', 10], ['crackers', 12], ['food', 7], ['cloth', 9], ['matches', 10],
      ['battery', 9], ['rope', 7], ['flashlight', 3], ['knife', 1.5], ['axe', 1], ['painkillers', 2]
    ]) },
    house: { emptyChance: .76, table: table([
      ['cloth', 16, 1, 2], ['water', 9], ['food', 6], ['beans', 9], ['crackers', 10], ['apple', 7],
      ['matches', 7], ['rope', 4], ['med', 3], ['painkillers', 3], ['antiseptic', 2], ['battery', 4],
      ['flashlight', 1.5], ['knife', 1.2], ['axe', .5], ['gun', .25], ['ammo', .6, 1, 3], ['shotgun', .2], ['shotgunAmmo', .4, 1, 2]
    ]) },
    clinic: { emptyChance: .63, table: table([
      ['med', 22], ['cloth', 15, 1, 2], ['antiseptic', 17], ['painkillers', 13], ['herbs', 4],
      ['water', 10], ['crackers', 3], ['battery', 2], ['flashlight', 1]
    ]) },
    workshop: { emptyChance: .68, table: table([
      ['scrap', 22, 1, 3], ['wood', 8, 1, 2], ['rope', 13], ['cloth', 7], ['battery', 9], ['matches', 3],
      ['axe', 5], ['pickaxe', 5], ['knife', 3], ['flashlight', 2], ['water', 3], ['ammo', .6, 1, 3]
    ]) },
    road: { emptyChance: .84, table: table([
      ['cloth', 15], ['scrap', 6], ['water', 6], ['crackers', 9], ['rope', 4], ['matches', 4], ['battery', 3],
      ['med', 1.2], ['knife', .5], ['gun', .1], ['ammo', .4, 1, 2]
    ]) },
    lake: { emptyChance: .79, table: table([
      ['rope', 15], ['water', 10], ['canteen', 3], ['cloth', 10], ['wood', 8, 1, 2],
      ['matches', 6], ['crackers', 4], ['herbs', 5], ['knife', 1]
    ]) }
  };

  const corpse = { emptyChance: .84, table: table([
    ['cloth', 25], ['rope', 5], ['crackers', 4], ['water', 2], ['matches', 3], ['med', 1],
    ['painkillers', 1], ['battery', 1], ['knife', .3], ['ammo', .4, 1, 2], ['scrap', .2]
  ]) };
  const firearm = item => items[item].type === 'weapon' && !!items[item].ammo;
  const unsafeForChurch = item => items[item].type === 'weapon' || items[item].type === 'ammo';
  const distribution = Object.freeze({ one: .95, two: .045, three: .005 });

  function next(rng) {
    const value = Number(rng());
    if (!Number.isFinite(value)) throw new TypeError('Loot RNG must return a finite number.');
    return Math.max(0, Math.min(1 - Number.EPSILON, value));
  }

  function config(kind, options = {}) {
    const base = options.corpse ? corpse : (profiles[kind] || profiles.house);
    let emptyChance = base.emptyChance;
    let result = base.table.map(e => ({ ...e }));
    if (options.corpse && kind === 'military') {
      emptyChance = .81;
      result.push(entry('rifleAmmo', 1.4, 1, 2), entry('canteen', 1));
    }
    if (kind === 'church') result = result.filter(e => !unsafeForChurch(e.item));
    if (!options.corpse && options.container === 'fridge') {
      result = result.filter(e => items[e.item].effects?.hunger || items[e.item].effects?.thirst);
      emptyChance = Math.min(.9, emptyChance + .04);
    } else if (!options.corpse && options.container === 'toolbox') {
      result = result.filter(e => items[e.item].type === 'resource' || ['knife', 'axe', 'pickaxe', 'flashlight'].includes(e.item));
    } else if (!options.corpse && options.container === 'locker' && kind === 'military') {
      emptyChance -= .04;
      result = result.map(e => ({ ...e, weight: e.weight * (firearm(e.item) ? 1.25 : 1) }));
    } else if (!options.corpse && options.container === 'ground') {
      emptyChance = Math.min(.94, emptyChance + .1);
    }
    return { emptyChance, table: result };
  }

  function roll(kind, rng = Math.random, options = {}) {
    const cfg = config(kind, options);
    if (!cfg.table.length || next(rng) < cfg.emptyChance) return [];
    const countRoll = next(rng);
    const count = countRoll < distribution.one ? 1 : countRoll < distribution.one + distribution.two ? 2 : 3;
    const total = cfg.table.reduce((sum, e) => sum + e.weight, 0);
    const found = [];
    for (let i = 0; i < count; i++) {
      let remaining = next(rng) * total;
      let pick = cfg.table[cfg.table.length - 1];
      for (const e of cfg.table) {
        remaining -= e.weight;
        if (remaining < 0) { pick = e; break; }
      }
      const amount = pick.min + Math.floor(next(rng) * (pick.max - pick.min + 1));
      const existing = found.find(e => e.item === pick.item);
      if (existing) {
        if (!['weapon', 'equipment', 'placeable'].includes(items[pick.item].type)) {
          existing.amount = Math.min(items[pick.item].maxFind, existing.amount + amount);
        }
      } else found.push({ item: pick.item, amount });
    }
    return found;
  }

  // Exact chance that an item appears at least once in a manual search, 0..1.
  // Exposes zeros as well as rare chances for balancing/debug inspection.
  function chances(kind, options = {}) {
    const cfg = config(kind, options);
    const total = cfg.table.reduce((sum, e) => sum + e.weight, 0);
    return Object.fromEntries(Object.keys(items).map(item => {
      const weight = cfg.table.filter(e => e.item === item).reduce((sum, e) => sum + e.weight, 0);
      if (!weight || !total) return [item, 0];
      const q = 1 - weight / total;
      return [item, (1 - cfg.emptyChance) * (1 - distribution.one * q - distribution.two * q * q - distribution.three * q * q * q)];
    }));
  }

  for (const [kind, profile] of Object.entries({ ...profiles, corpse })) {
    if (!(profile.emptyChance >= 0 && profile.emptyChance <= 1)) throw new Error('Invalid loot emptiness: ' + kind);
    for (const e of profile.table) {
      if (!items[e.item] || !(e.weight > 0) || e.min < 1 || e.max < e.min || e.max > items[e.item].maxFind) {
        throw new Error('Invalid loot entry: ' + kind + '/' + e.item);
      }
      Object.freeze(e);
    }
    Object.freeze(profile.table);
    Object.freeze(profile);
  }
  for (const item of Object.values(items)) {
    if (item.effects) Object.freeze(item.effects);
    Object.freeze(item);
  }
  return Object.freeze({ items: Object.freeze(items), profiles: Object.freeze(profiles), corpse, distribution, roll, chances, config });
});
