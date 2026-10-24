'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const World = require('../world.js');
const Loot = require('../loot.js');
const SEEDS = [1, 17, 437, 1729, 69421, 123456, 600001, 999983];
const cache = new Map();
const worldFor = seed => {
  if (!cache.has(seed)) cache.set(seed, World.generate(seed));
  return cache.get(seed);
};
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const footprintOverlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
const boxBlocks = (o, x, y, radius = 3) => Math.abs(x - o.x) <= o.w / 2 + radius && Math.abs(y - o.y) <= o.h / 2 + radius;

test('the same seed reconstructs the same complete terrain, settlements, props and pre-rolled search contents', () => {
  const original = worldFor(437);
  const restored = World.generate(437);
  assert.deepEqual(restored.terrain, original.terrain);
  assert.deepEqual(restored.sites, original.sites);
  assert.deepEqual(restored.objects, original.objects);
  assert.deepEqual(restored.spawn, original.spawn);
});

test('different seeds change terrain, settlement geometry and searchable objects', () => {
  const terrain = new Set(), layouts = new Set(), contents = new Set();
  for (const seed of SEEDS.slice(0, 4)) {
    const world = worldFor(seed);
    terrain.add(digest(world.terrain));
    layouts.add(digest(JSON.stringify(world.sites.map(s => [s.x, s.y, s.w, s.h, s.kind]))));
    contents.add(digest(JSON.stringify(world.objects.filter(o => o.type === 'container').map(o => [o.x, o.y, o.contents]))));
  }
  assert.equal(terrain.size, 4);
  assert.equal(layouts.size, 4);
  assert.equal(contents.size, 4);
});

test('visual roof overhang space stays walkable while physical ground walls stop a radius-3 actor', () => {
  for (const seed of SEEDS) {
    for (const house of worldFor(seed).objects.filter(o => o.type === 'house')) {
      const left = house.x - house.w / 2, right = house.x + house.w / 2;
      const top = house.y - house.h / 2, bottom = house.y + house.h / 2;
      for (const x of [house.x - house.w / 4, house.x, house.x + house.w / 4]) {
        assert.equal(World.blocksBuilding(house, x, top - 14, 3), false, `Roof space blocks actor: seed=${seed} house=${house.id}`);
        assert.equal(World.contains(house, x, top - 14), false);
      }
      for (const [x, y] of [[left + 1, house.y], [right - 1, house.y], [house.x, top + 1]]) {
        assert.equal(World.blocksBuilding(house, x, y, 3), true, `Ground wall does not block: seed=${seed} house=${house.id}`);
      }
      const wallX = Math.abs(left + 8 - house.doorX) > 20 ? left + 8 : right - 8;
      assert.equal(World.blocksBuilding(house, wallX, bottom - 1, 3), true, `South wall open outside doorway: seed=${seed} house=${house.id}`);
    }
  }
});

test('a radius-3 actor can cross each actual doorway from outdoors into the interior', () => {
  for (const seed of SEEDS) {
    for (const house of worldFor(seed).objects.filter(o => o.type === 'house')) {
      for (const offset of [12, 6, 3, 0, -3, -6, -10]) {
        assert.equal(World.blocksBuilding(house, house.doorX, house.doorY + offset, 3), false,
          `Door blocks player: seed=${seed} house=${house.id} offset=${offset}`);
      }
      assert.equal(World.contains(house, house.doorX, house.doorY - 10), true);
      assert.equal(World.contains(house, house.doorX, house.doorY + 10), false);
    }
  }
});

test('actual generated church containers never contain a weapon or ammunition', () => {
  let churchSites = 0, searches = 0;
  for (const seed of SEEDS) {
    const world = worldFor(seed);
    const churches = new Set(world.sites.filter(s => s.kind === 'church').map(s => s.id));
    churchSites += churches.size;
    for (const container of world.objects.filter(o => o.type === 'container' && churches.has(o.site))) {
      searches++;
      for (const { item } of container.contents) {
        assert.ok(Loot.items[item], `Unknown item in church: ${item}`);
        assert.notEqual(Loot.items[item].type, 'weapon', `Church weapon: seed=${seed} container=${container.id} item=${item}`);
        assert.notEqual(Loot.items[item].type, 'ammo', `Church ammo: seed=${seed} container=${container.id} item=${item}`);
      }
    }
  }
  assert.ok(churchSites >= 8, 'Expected several church sites across the generated worlds');
  assert.ok(searches >= 10, 'Expected actual church search points to be exercised');
});

test('houses vary between zero and three search containers and most searches are empty', () => {
  const observedCounts = new Set();
  let searches = 0, empty = 0, found = 0;
  for (const seed of SEEDS) {
    const world = worldFor(seed);
    const containers = world.objects.filter(o => o.type === 'container');
    for (const house of world.objects.filter(o => o.type === 'house')) {
      const count = containers.filter(o => o.house === house.id).length;
      observedCounts.add(count);
      assert.ok(count >= 0 && count <= 3, `Fixed or excessive item points: seed=${seed} house=${house.id} count=${count}`);
    }
    for (const container of containers) {
      searches++;
      if (!container.contents.length) empty++; else found++;
      assert.ok(container.contents.length <= 3);
    }
  }
  assert.deepEqual([...observedCounts].sort(), [0, 1, 2, 3]);
  assert.ok(searches > 500);
  assert.ok(empty / searches > .55, `Only ${empty}/${searches} searches were empty`);
  assert.ok(found > 50, 'Sparse searches should still yield some supplies');
});

test('buildings have distinct, non-overlapping ground footprints within every settlement', () => {
  const failures = [];
  for (const seed of SEEDS) {
    const world = worldFor(seed);
    const houses = world.objects.filter(o => o.type === 'house');
    for (let i = 0; i < houses.length; i++) {
      for (let j = i + 1; j < houses.length; j++) {
        const a = houses[i], b = houses[j];
        if (a.site !== b.site) continue;
        if (footprintOverlap(a, b)) failures.push(`seed=${seed} site=${a.site}: houses ${a.id}/${b.id} (${a.kind}/${b.kind})`);
      }
    }
  }
  assert.deepEqual(failures, [], 'Overlapping ground footprints:\n' + failures.join('\n'));
});

test('door approaches stay clear of solid props and other building footprints', () => {
  const failures = [];
  for (const seed of SEEDS) {
    const world = worldFor(seed);
    const houses = world.objects.filter(o => o.type === 'house');
    const props = world.objects.filter(o => o.type === 'prop' && o.solid);
    for (const house of houses) {
      for (const offset of [5, 10, 16, 22, 28]) {
        const x = house.doorX, y = house.doorY + offset;
        for (const prop of props) {
          if (boxBlocks(prop, x, y, 3)) failures.push(`seed=${seed} house=${house.id} door+${offset} blocked by prop ${prop.id}/${prop.kind}`);
        }
        for (const other of houses) {
          if (other.id !== house.id && World.blocksBuilding(other, x, y, 3)) failures.push(`seed=${seed} house=${house.id} door+${offset} blocked by house ${other.id}`);
        }
      }
    }
  }
  assert.deepEqual(failures, [], 'Blocked door approaches:\n' + failures.join('\n'));
});
