# Upstream sprite assets

The user selected https://github.com/011eh/minidayz as the asset source.
Imported revision: `fa2e73a3f899bd59ded1a9e920eda92f822c32ba` (master at import time).

The selected PNG files under `assets/classic/` are unchanged copies from upstream
`asset/images/`. `assets/classic/manifest.json` records every source-relative path,
pinned revision and SHA-256 digest. `tools/import_classic_assets.py` reproduces
this selection from an existing checkout at that revision. Unused sprites and
Godot import caches are not required or included in the portable game.

Upstream describes itself as an unofficial fan reconstruction of Mini DAYZ
(Bohemia Interactive, 2017), not authorized or endorsed by the original rightsholder.
No LICENSE file was present in the pinned upstream tree. This project does not
assert ownership of, or relicense, those sprites. Original asset rights and credit
remain with their respective authors and rightsholders.

Our gameplay systems, generated world, the radio expedition, and the modular
compositions are changes for this prototype. Newly arranged buildings reuse
upstream roof, wall, window, door and floor pixels, rather than presenting the
original location screenshots as a new map. The survivor, clothes, weapons and
infected use the upstream authored animation frames.
