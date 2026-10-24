'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const Loot = require('../loot.js');
function seeded(seed) { let n = seed >>> 0; return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; }; }
const isWeapon = item => Loot.items[item].type === 'weapon';
const isFirearm = item => isWeapon(item) && !!Loot.items[item].ammo;

function sample(kind, iterations, options = {}) {
  const rng = seeded(1729);
  const stats = { empty: 0, occupied: 0, firearms: 0, weapons: 0, items: {}, counts: {} };
  for (let i = 0; i < iterations; i++) {
    const result = Loot.roll(kind, rng, options);
    stats.counts[result.length] = (stats.counts[result.length] || 0) + 1;
    if (result.length) stats.occupied++; else stats.empty++;
    if (result.some(e => isFirearm(e.item))) stats.firearms++;
    if (result.some(e => isWeapon(e.item))) stats.weapons++;
    for (const e of result) stats.items[e.item] = (stats.items[e.item] || 0) + 1;
  }
  return stats;
}

test('church searches never produce weapons or ammunition, including bodies and specialized containers', () => {
  for (const options of [{}, { corpse: true }, { container: 'locker' }, { container: 'toolbox' }, { container: 'fridge' }, { container: 'ground' }]) {
    const rng = seeded(437);
    for (let i = 0; i < 30000; i++) {
      for (const found of Loot.roll('church', rng, options)) {
        assert.notEqual(Loot.items[found.item].type, 'weapon');
        assert.notEqual(Loot.items[found.item].type, 'ammo');
      }
    }
    const exact = Loot.chances('church', options);
    for (const [id, item] of Object.entries(Loot.items)) {
      if (item.type === 'weapon' || item.type === 'ammo') assert.equal(exact[id], 0, id);
    }
  }
});

test('military firearm chance is elevated but never guaranteed; civilian guns are rare', () => {
  const total = 50000;
  const military = sample('military', total);
  const house = sample('house', total);
  const shop = sample('store', total);
  assert.ok(military.firearms > 2000, JSON.stringify(military));
  assert.ok(military.firearms < total * .25);
  assert.ok(military.firearms > house.firearms * 30);
  assert.equal(shop.firearms, 0);
  assert.ok(house.firearms < total * .005);
  assert.ok(military.empty > total * .5);
});

test('searches are mostly empty or single finds; no location guarantees four objects', () => {
  for (const kind of Object.keys(Loot.profiles)) {
    const stats = sample(kind, 12000);
    assert.ok(stats.empty > 5000, kind + ' has too many guaranteed finds');
    assert.ok((stats.counts[0] || 0) + (stats.counts[1] || 0) > 11000, kind);
    assert.ok(!stats.counts[4], kind);
    for (const count of Object.keys(stats.counts)) assert.ok(Number(count) <= 3);
  }
});

test('bodies are usually empty, must be searched, and do not return automatic metal rewards', () => {
  const stats = sample('house', 50000, { corpse: true });
  assert.ok(stats.empty > 40000);
  assert.ok((stats.items.scrap || 0) < 150);
  assert.ok(stats.empty > (stats.items.scrap || 0) * 100);
  const initial = JSON.stringify(Loot.items);
  Loot.roll('military', seeded(9), { corpse: true });
  assert.equal(JSON.stringify(Loot.items), initial);
});

test('seeded searches repeat exactly; returned entries are valid bounded independent values', () => {
  const a = seeded(213), b = seeded(213);
  const sequenceA = [], sequenceB = [];
  for (let i = 0; i < 400; i++) { sequenceA.push(Loot.roll('warehouse', a)); sequenceB.push(Loot.roll('warehouse', b)); }
  assert.deepEqual(sequenceA, sequenceB);
  for (const kind of Object.keys(Loot.profiles)) {
    const rng = seeded(1984);
    for (let i = 0; i < 5000; i++) {
      const result = Loot.roll(kind, rng);
      assert.equal(new Set(result.map(e => e.item)).size, result.length);
      for (const { item, amount } of result) {
        assert.ok(Loot.items[item]);
        assert.ok(Number.isInteger(amount) && amount > 0 && amount <= Loot.items[item].maxFind, `${kind}/${item}/${amount}`);
      }
    }
  }
  assert.deepEqual(Loot.roll('church', () => 0), []);
  assert.doesNotThrow(() => Loot.roll('military', () => 1));
});

test('more loot means usable variety and context-specific finds, not universal item pools', () => {
  assert.equal(Object.keys(Loot.items).length, 28);
  for (const key of ['food', 'water', 'med', 'cloth', 'knife', 'axe', 'gun', 'rifle', 'ammo', 'rifleAmmo', 'wood', 'stone', 'scrap', 'matches', 'camp', 'pickaxe']) assert.ok(Loot.items[key]);
  const clinic = Loot.chances('clinic'), workshop = Loot.chances('workshop');
  assert.ok(clinic.med > workshop.med);
  assert.ok(workshop.pickaxe > clinic.pickaxe);
  const fridge = Loot.config('house', { container: 'fridge' });
  assert.ok(fridge.table.every(e => Loot.items[e.item].effects?.hunger || Loot.items[e.item].effects?.thirst));
  assert.ok(Object.values(Loot.items).every(i => i.name && i.description));
});

test('module loads in a browser without requiring a server, DOM or package loader', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('../loot.js'), 'utf8'), context);
  assert.equal(typeof context.SurvivalLoot.roll, 'function');
  assert.equal(Object.keys(context.SurvivalLoot.items).length, 28);
});
