# Matemostri Story Map

This document describes the current story-driven progression journey in `index.html`.

The child-facing question is:

> Where are Momo and I going next?

`Momo` is the default friend name. Runtime story text uses the player's chosen monster name.

## Journey Structure

Stage 2, First Crack, is not a map location. It is an intermediate story state during the first lesson.

| Map order | Location | Lesson | Evolution result | Story role |
|---:|---|---|---|---|
| 1 | The Mysterious Egg | One-digit addition | Stage 3, Hatched Friend | The child discovers the egg and helps Momo hatch. |
| 2 | Whispering Woods | Two-digit column addition | Stage 4, Fluffy Ears | Momo hears paths and whispers the child cannot. |
| 3 | Starlight Trail | Two-digit mental addition | Stage 5, Bright Tail | Momo's tail lights the dark path. |
| 4 | Windy Cliffs | Three-digit column addition | Stage 6, Wide Wings | Momo learns to glide but cannot truly fly yet. |
| 5 | The Great Chasm | Four-digit column addition | Stage 7, Addition Flight | Major addition finale: Momo learns to fly across the chasm. |
| 6 | Explorer's Valley | One-digit subtraction | Stage 8, Backpack Explorer | Momo becomes a more prepared explorer. |
| 7 | Crystal Caves | Two-digit column subtraction | Stage 9, Explorer Goggles | Goggles help Momo navigate crystal light. |
| 8 | The Rune Ruins | Two-digit mental subtraction | Stage 10, Magic Marks | Ancient runes awaken Momo's own markings. |
| 9 | The Enchanted Garden | Three-digit column subtraction | Stage 11, Flower Crown | The garden chooses Momo as a little guardian. |
| 10 | The Guardian Gate | Four-digit column subtraction | Stage 12, Subtraction Guardian Light | Major subtraction finale: guardian power opens the sealed gate. |
| 11 | The Star Fields | Single digit × single digit | Stage 13, Star Cape | Multiplication begins with organised groups of stars. |
| 12 | The Celestial Heights | Single digit × two digits | Stage 14, Celestial Wings | Momo rises into higher sky magic. |
| 13 | The Magician's Tower | Two digits × two digits | Stage 15, Multiplication Mage | Major multiplication finale: Momo graduates into mage form. |
| 14 | The Arcane Library | Simple division | Stage 16, Arcane Master | Division begins with a floating spellbook and fair sharing. |
| 15 | The Heart of Matemostri | Long division | Stage 17, Guardian of Maths | Final major evolution: the whole journey pays off. |

## Layout Contract

The adventure map is intentionally tall on mobile. It should feel like travelling through large scenes, not tapping a compressed list of lessons.

Each `PROGRESSION_NODES` entry owns layout metadata:

- `mapPosition.side`: places the lesson node on the left, centre, or right of the winding path.
  The path itself is two curves per gap, bowing out to alternate sides so it meanders rather
  than running taut between stops, and it is drawn twice: a gold dotted trail for the part
  already walked, a faint wider glow for the part still ahead, split at the current stop.
  Both use `vector-effect="non-scaling-stroke"`, since `preserveAspectRatio="none"` scales
  the SVG unevenly and the dashes would otherwise stretch.
- `mapPosition.sceneHeight`: reserves vertical room for the scene, in the units the
  painted map was drawn in. These are the numbers in `docs/MAP_ART_SPEC.json`, measured
  against a 428px content box. At any other width every scene height, node offset and
  Momo offset is multiplied by `mapWidth / 428`, so the painting and the path stay
  locked together on a narrow phone as well as a wide one. Without that scaling the two
  drift apart by a quarter of the map's length at 360px.
- `mapPosition.nodeOffset`: places the lesson node within that scene.
- `mapPosition.momo`: reserves a nearby position for the current Momo sprite.
- `mapPosition.artwork`: reserves a future scenery-art slot with `src`, `position`, `width`, `height`, `offsetX`, `offsetY`, and `label`.

Production currently keeps empty art slots subtle. The hidden developer spellbook has a “Show map art slots” toggle that displays labels like `[GREAT CHASM ART]` for layout debugging.

Current major landmarks receive extra space:

- The Great Chasm
- The Guardian Gate
- The Magician's Tower
- The Heart of Matemostri

## Stage 2 Special Beat

During the first lesson, after question 5:

- If at least 4 answers were mastered, the lesson pauses.
- The screen shows Stage 2, First Crack.
- Message: “A crack has started to appear. Keep going and see if it hatches.”
- Continue returns to the same lesson.
- The state is saved in `storyProgress.firstCrackSeen`.

## Major Evolutions

Major evolutions are:

- Stage 7: Addition Flight
- Stage 12: Subtraction Guardian Light
- Stage 15: Multiplication Mage
- Stage 17: Guardian of Maths

Major moments use the larger transition presentation with previous and new Momo art.

## Player Flow

1. Home shows the current companion and progress.
2. Continue opens the adventure map, scrolled straight to the current stop rather than the
   top. The map is thousands of pixels long, so opening at the top would mean scrolling to
   find yourself every time. `scrollMapToCurrent` places the stop a little above the middle
   so the path ahead is still visible.
3. The current map node pulses.
4. Tapping an unlocked node opens a short story card.
5. Start Lesson opens the existing maths interface.
6. Completing a new lesson unlocks the next node and may evolve Momo.
7. Continue Adventure returns to the map.
8. Practise Again replays the same lesson without advancing story.

Completed map nodes stay replayable for collectibles.

## Production Artwork Geometry

The production artwork blueprint is exported in `docs/MAP_ART_GUIDE.svg` and `docs/MAP_ART_SPEC.json`.

The painted map is delivered in eight sections in `assets/map`, listed in `MAP_ART_PANELS`
in order. Each is 1024 canvas px wide and cut on a scene boundary, so they stack edge to
edge with no gap and together they are exactly the 21892px canvas:

| Panel | Canvas y | Scenes |
|---|---|---|
| map-panel-1a | 0-2536 | The Mysterious Egg, Whispering Woods |
| map-panel-1b | 2536-5120 | Starlight Trail, Windy Cliffs |
| map-panel-2a | 5120-8159 | The Great Chasm, Explorer's Valley |
| map-panel-2b | 8159-10790 | Crystal Caves, The Rune Ruins |
| map-panel-3a | 10790-13853 | The Enchanted Garden, The Guardian Gate |
| map-panel-3b | 13853-16580 | The Star Fields, The Celestial Heights |
| map-panel-4a | 16580-19882 | The Magician's Tower, The Arcane Library |
| map-panel-4b | 19882-21892 | The Heart of Matemostri |

They are a full-bleed background layer under the path and the nodes. The per-scene
`mapPosition.artwork` slots are a different thing: positioned cut-out scenery, still
unused.

Coordinates below use the canonical 1024px-wide artwork canvas. The full guide is 21892px tall and is scaled directly from the current mobile production map content box without vertical compression.

| Scene | Y start | Y end | Node X/Y | Artwork X/Y | Artwork width/height | Clear-space requirements | Filename |
|---|---:|---:|---:|---:|---:|---|---|
| 1. The Mysterious Egg | 0 | 1244 | 512/682 | 512/306 | 737×523 | Node KEEP CLEAR 285/512 455×340; Momo 617/172 220×220 | map-01-mysterious-egg.png |
| 2. Whispering Woods | 1244 | 2536 | 297/1962 | 727/1555 | 594×672 | Node KEEP CLEAR 70/1792 455×340; Momo 402/1409 220×220 | map-02-whispering-woods.png |
| 3. Starlight Trail | 2536 | 3780 | 727/3218 | 297/2818 | 635×597 | Node KEEP CLEAR 500/3048 455×340; Momo 187/2732 220×220 | map-03-starlight-trail.png |
| 4. Windy Cliffs | 3780 | 5120 | 512/4522 | 297/4072 | 614×777 | Node KEEP CLEAR 285/4352 455×340; Momo 617/4017 220×220 | map-04-windy-cliffs.png |
| 5. The Great Chasm | 5120 | 6890 | 727/6089 | 512/5622 | 901×956 | Node KEEP CLEAR 500/5900 455×378; Momo 402/5417 220×220 | map-05-great-chasm.png |
| 6. Explorer's Valley | 6890 | 8159 | 297/7589 | 727/7201 | 614×609 | Node KEEP CLEAR 70/7419 455×340; Momo 617/7082 220×220 | map-06-explorers-valley.png |
| 7. Crystal Caves | 8159 | 9546 | 727/8924 | 297/8441 | 717×805 | Node KEEP CLEAR 500/8754 455×340; Momo 402/8371 220×220 | map-07-crystal-caves.png |
| 8. The Rune Ruins | 9546 | 10790 | 512/10228 | 727/9848 | 614×622 | Node KEEP CLEAR 285/10058 455×340; Momo 187/9728 220×220 | map-08-rune-ruins.png |
| 9. The Enchanted Garden | 10790 | 12130 | 297/11532 | 512/11097 | 799×670 | Node KEEP CLEAR 70/11362 455×340; Momo 617/10991 220×220 | map-09-enchanted-garden.png |
| 10. The Guardian Gate | 12130 | 13853 | 727/13075 | 512/12573 | 778×1068 | Node KEEP CLEAR 500/12886 455×378; Momo 402/12403 220×220 | map-10-guardian-gate.png |
| 11. The Star Fields | 13853 | 15145 | 512/14566 | 727/14149 | 655×646 | Node KEEP CLEAR 285/14396 455×340; Momo 187/14059 220×220 | map-11-star-fields.png |
| 12. The Celestial Heights | 15145 | 16580 | 297/15934 | 512/15499 | 840×775 | Node KEEP CLEAR 70/15764 455×340; Momo 617/15394 220×220 | map-12-celestial-heights.png |
| 13. The Magician's Tower | 16580 | 18399 | 727/17580 | 297/16927 | 573×1309 | Node KEEP CLEAR 500/17391 455×378; Momo 402/16896 220×220 | map-13-magicians-tower.png |
| 14. The Arcane Library | 18399 | 19882 | 297/19212 | 512/18757 | 778×890 | Node KEEP CLEAR 70/19042 455×340; Momo 617/18647 220×220 | map-14-arcane-library.png |
| 15. The Heart of Matemostri | 19882 | 21892 | 512/20982 | 512/20396 | 922×1367 | Node KEEP CLEAR 285/20793 455×378; Momo 617/20250 220×220 | map-15-heart-of-matemostri.png |
