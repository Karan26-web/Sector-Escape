# Redesign art — status

All of the optional redesign art is installed (2026-10-21) and live in the game:

| Asset | Where it shows | Notes |
|---|---|---|
| `jungle_canopy` | canopy masses framing every ring and the causeway banks | replaces the old 3–6 tree clusters (one sprite per mass) |
| `forest_silhouette` | the distant tree line around the whole chain | dark, low-detail depth layer |
| `ui_map_bg` | backdrop of the 2D expedition map | calm dusk recolour; the game now darkens it only lightly |
| `wall_pillar` | the carved columns at every wall junction | sliced into capital / shaft / base bands and wrapped around 3D columns |
| `causeway_stone`, `causeway_side`, `water` | the causeway deck, parapets and lake | new versions |
| `floor_hatch`, `seal_slab` | the buried-cannon hatch and the slab that closes each ring behind Karan | new versions |
| `jungle_rocks` | rocks along walls and shoreline | new version |

Originals (PNG sources, the zip, repeat previews) are archived outside the project in `../Sector Escape - art source/redesign-2026-10-21/`.

To replace any art later: drop the PNG at the path in its spec (`docs/assets/<name>.md`), run `python3 tools/optimize_assets.py`, reload. For sprite sheets, also re-measure the `baseline` (see `docs/ASSET_INDEX.md`).
