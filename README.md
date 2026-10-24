# Ultimul Răsărit · 0.2

A playable browser survival game for phones and desktop, with Romanian UI. Version 0.2 uses the three reference images supplied by the user in `game dead silent.zip`: location artwork, the main character and nine zombie designs. The source images are preserved in `assets/`; the Canvas renderer extracts scenery, sprites and textures at runtime.

## Run

```sh
cd /workspace/game-
python3 -m http.server 8080 --bind 0.0.0.0
```

Open the served site in a browser. To access it on a phone, use a server address reachable from that phone. The phone's own localhost does not point to this machine. Deploy `index.html`, `style.css`, `art.js`, `game.js` and `assets/` together to any static web host. No packages, accounts, API keys or databases are needed.

## What changed

- 384 × 384 terrain tiles (12,288 × 12,288 world pixels), four times the previous map area, with 27 locations. All nine panels from the supplied location mosaic appear as playable locations: shop, gas station, warehouse, campsite, roadblock, lake, military post, church and farm. Forests and roads connect them; some locations recur.
- Actual image artwork from the supplied mosaic supplies the buildings, abandoned vehicles, scenery and terrain grain. This is a larger generated world using that artwork, rather than a pixel-for-pixel reconstruction of a single screenshot. Locations have solid building walls and major vehicles/obstacles; some background vegetation is decorative.
- Walk through a front doorway, or interact near it, to enter. The roof is removed, revealing a furnished interior. Walk around to collect individual supplies. Leave through the doorway again. Indoor loot is inaccessible from outside.
- Every new game starts with an empty inventory, empty magazines and bare hands. No free pistol or axe. Find knives, axes, pickaxes, pistols, rifles, ammunition, food, water, cloth, bandages, matches and scrap around the region. Military sites have firearms; stores have food and basic tools; farms and warehouses have resource tools. Collected objects stay collected after saving.
- Main character and portrait use the supplied survivor reference. Nine zombie appearances use the supplied sprite sheet, with directional and walking poses. Runners are faster, soldiers tougher, and elderly zombies slower.
- Trees need an axe; rock deposits need a pickaxe. Loose branches and loose stones can be collected by hand. Craft tools from collected resources, bandages from cloth, or a healing campfire from wood, stone and matches.

## Controls

- WASD or arrows: walk. Shift: sprint.
- Mouse aim + left click: attack. Space: auto-aim attack. R: reload a found firearm.
- E: enter/exit a nearby door, pick up loot, or gather a resource.
- 1: cycle only weapons you own, plus bare hands. 2 / 3 / 4: food / water / bandage.
- Click an inventory weapon to equip it; click a consumable to use it.
- B or ▦: backpack overlay; pauses the world while allowing inventory and crafting.
- M: regional map. Escape: pause or close an overlay. ⛶: fullscreen where supported.
- On phones use the left joystick and right attack/gather buttons. Landscape gives the game the full viewport. The backpack button provides inventory access without scrolling away from the game.

## Saving and limitations

Autosave runs every 15 seconds, on pause and when leaving the page. Saves use this browser's localStorage and do not synchronize between devices. Version 0.2 uses a separate save slot from 0.1 because the world layout and inventory changed; old 0.1 saves are left untouched. A new world starts empty. Pausing or hiding the tab stops the simulation.

This is a browser prototype, with no multiplayer, native Android/iOS package or animation set for every survivor action. The survivor reference contains a single pose; the renderer uses it with facing changes and procedural walking motion. Interior artwork is generated separately. World placement and forest generation are procedural; scene artwork comes from the user-supplied images.

## Portable version

```sh
python3 tools/bundle.py
```

This generates `dist/Ultimul-Rasarit.html` with all code and artwork embedded, plus `dist/Ultimul-Rasarit-JOACA.zip` for downloading from chat. If the chat document viewer shows HTML source, download the ZIP, extract it completely, then right-click `index.html` and choose Open with Chrome, Edge or Firefox on your computer. The bundler verifies the archive and the embedded game bytes. It needs no network after loading. Copy it to a device and open it in a browser; some file viewers do not execute HTML and some browsers restrict saving for local files. A static web host also works.

## Validation

```sh
node --check game.js
node --check art.js
node tests/browser-smoke.cjs
```

The functional suite uses Playwright and Chromium already provided in this cloud environment. Elsewhere install Playwright in your test tooling and set `CHROMIUM_PATH` if needed. `GAME_URL` overrides the default test server address. Tests exercise an empty start, actual doors/interiors, finding and equipping tools, persisted loot, consumables, crafting, tool requirements, harvesting, zombie variety, real projectile combat, map/pause, save/load and mobile touch controls. Test save fixtures use isolated browser storage and do not modify the game source.
