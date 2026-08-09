# Current State - Matemostri

Last inspected and updated: 2026-08-08

This is the authoritative current-state document for this working tree. It is based on the real `index.html`, tests, and assets in the repository, not on older prompts.

## Repository State

- Repository: `livioq/matemostri`
- Current implementation: full single-file game in `index.html`, ~1969 lines
- `origin/main` carries the complete working game. The older note in this
  document about `main` holding only a placeholder no longer applies; the
  adventure-map work and everything since has been merged there.
- Stable engine preserved: arithmetic generation, column-working UI, long
  multiplication, long division, profiles, saves, custom Momo names,
  collectibles, settings, hints, sounds, and developer tools.

## Current Maths Progression

`MATH_STAGES` defines 15 lessons. Unlocks are linear: lesson 1 is available for a new player; completing a lesson unlocks the next lesson. Completed lessons remain replayable for collectibles and do not advance story/evolution again.

Pass rule:

- Normal lessons: 10 questions, pass with 8 mastered answers.
- Three-digit column lessons: 7 questions, pass with 6 mastered answers.
- Four-digit column lessons: 5 questions, pass with 4 mastered answers.
- Mastered means correct unaided, or clean column/long-working without hints/errors.

| # | Lesson ID | Lesson | Interface | Questions | Pass | Unlocks |
|---:|---|---|---|---:|---:|---|
| 1 | `add_1digit` | One-digit addition | Mental keypad | 10 | 8 | `add_2column` |
| 2 | `add_2column` | Two-digit column addition | Column addition | 10 | 8 | `add_2mental` |
| 3 | `add_2mental` | Two-digit mental addition | Mental keypad | 10 | 8 | `add_3column` |
| 4 | `add_3column` | Three-digit column addition | Column addition | 7 | 6 | `add_4column` |
| 5 | `add_4column` | Four-digit column addition | Column addition | 5 | 4 | `sub_1digit` |
| 6 | `sub_1digit` | One-digit subtraction | Mental keypad | 10 | 8 | `sub_2column` |
| 7 | `sub_2column` | Two-digit column subtraction | Column subtraction | 10 | 8 | `sub_2mental` |
| 8 | `sub_2mental` | Two-digit mental subtraction | Mental keypad | 10 | 8 | `sub_3column` |
| 9 | `sub_3column` | Three-digit column subtraction | Column subtraction | 7 | 6 | `sub_4column` |
| 10 | `sub_4column` | Four-digit column subtraction | Column subtraction | 5 | 4 | `mul_1x1` |
| 11 | `mul_1x1` | Single digit × single digit | Mental keypad | 10 | 8 | `mul_1x2` |
| 12 | `mul_1x2` | Single digit × two digits | Column multiplication | 10 | 8 | `mul_2x2` |
| 13 | `mul_2x2` | Two digits × two digits | Long multiplication | 10 | 8 | `div_simple` |
| 14 | `div_simple` | Simple division | Mental keypad | 10 | 8 | `div_long` |
| 15 | `div_long` | Long division | Long division UI | 10 | 8 | End |

Long division uses a single-digit divisor into a multi-digit dividend. The dividend grows from two digits to three digits to four digits, and later questions include remainders.

## Evolution and Story Audit

The production progression is 17 stages. Stage 2 is a special intermediate
state during the first lesson, not a map destination.

The artwork was audited and renamed once, because several old filenames and
slugs described art they no longer matched: the file called `bright-tail`
showed wide wings, `goggles` showed glowing body marks, and so on. Every id,
slug and filename now describes what the picture actually shows. The old
names are in git history and are not repeated here.

| Stage | Momo | Trigger | Major? | File in `assets/monsters` |
|---:|---|---|---|---|
| 1 | Magical Egg | New player, 0 lessons | No | `stage-01-magical-egg.webp` |
| 2 | First Crack | 4 mastered in the first 5 questions of `add_1digit` | No | `stage-02-first-crack.webp` |
| 3 | Hatched Friend | Complete `add_1digit` | No | `stage-03-hatched-friend.webp` |
| 4 | Fluffy Ears | Complete `add_2column` | No | `stage-04-fluffy-ears.webp` |
| 5 | Bright Tail | Complete `add_2mental` | No | `stage-05-bright-tail.webp` |
| 6 | Wide Wings | Complete `add_3column` | No | `stage-06-wide-wings.webp` |
| 7 | Addition Flight | Complete `add_4column`, addition finale | **Yes** | `stage-07-addition-flight.webp` |
| 8 | Backpack Explorer | Complete `sub_1digit` | No | `stage-08-backpack-explorer.webp` |
| 9 | Explorer Goggles | Complete `sub_2column` | No | `stage-09-explorer-goggles.webp` |
| 10 | Magic Marks | Complete `sub_2mental` | No | `stage-10-magic-marks.webp` |
| 11 | Flower Crown | Complete `sub_3column` | No | `stage-11-flower-crown.webp` |
| 12 | Subtraction Guardian Light | Complete `sub_4column`, subtraction finale | **Yes** | `stage-12-subtraction-guardian-light.webp` |
| 13 | Star Cape | Complete `mul_1x1` | No | `stage-13-star-cape.webp` |
| 14 | Celestial Wings | Complete `mul_1x2` | No | `stage-14-celestial-wings.webp` |
| 15 | Multiplication Mage | Complete `mul_2x2`, multiplication finale | **Yes** | `stage-15-multiplication-mage.webp` |
| 16 | Arcane Master | Complete `div_simple` | No | `stage-16-arcane-master.webp` |
| 17 | Guardian of Maths | Complete `div_long`, division finale | **Yes** | `stage-17-guardian-of-maths.webp` |

Major evolutions are stages 7, 12, 15 and 17. `EVOLUTION_ROADMAP.md` carries
the same table generated straight from the data.

## First Crack Milestone

The first crack remains an intermediate event inside `add_1digit`.

- Exact trigger: `S.i === 5 && S.mastered >= 4`
- It can only trigger if the first lesson was not already completed.
- It is not a separate lesson and is not a separate map node.
- Before it triggers, the displayed art is stage 1, Magical Egg.
- When it triggers, the lesson pauses on the crack screen, showing stage 2.
- Pressing Continue returns to the same 10-question lesson at question 6.
- Save behaviour changed safely: `P.storyProgress.firstCrackSeen` now persists the crack state.
- If a player leaves after the crack but before hatching, the home/play art can resume with stage 2.
- Completing `add_1digit` moves to stage 3, Hatched Friend, based on completed lesson count.

## Story Map Progression

The old tab/list-style lesson picker has been replaced with a vertical, winding adventure map. It is driven by `PROGRESSION_NODES`, a canonical configuration that connects story, map node, lesson ID, stage, asset, unlock, and major-evolution state.

| Map order | Map node | Region | Lesson ID | Evolution stage unlocked on completion | Major? |
|---:|---|---|---|---:|---|
| 1 | The Mysterious Egg | Awakening | `add_1digit` | 3 | No |
| 2 | Whispering Woods | Addition | `add_2column` | 4 | No |
| 3 | Starlight Trail | Addition | `add_2mental` | 5 | No |
| 4 | Windy Cliffs | Addition | `add_3column` | 6 | No |
| 5 | The Great Chasm | Addition Finale | `add_4column` | 7 | Yes |
| 6 | Explorer's Valley | Subtraction | `sub_1digit` | 8 | No |
| 7 | Crystal Caves | Subtraction | `sub_2column` | 9 | No |
| 8 | The Rune Ruins | Subtraction | `sub_2mental` | 10 | No |
| 9 | The Enchanted Garden | Subtraction | `sub_3column` | 11 | No |
| 10 | The Guardian Gate | Subtraction Finale | `sub_4column` | 12 | Yes |
| 11 | The Star Fields | Multiplication | `mul_1x1` | 13 | No |
| 12 | The Celestial Heights | Multiplication | `mul_1x2` | 14 | No |
| 13 | The Magician's Tower | Multiplication Finale | `mul_2x2` | 15 | Yes |
| 14 | The Arcane Library | Division | `div_simple` | 16 | No |
| 15 | The Heart of Matemostri | Division Finale | `div_long` | 17 | Yes |

Map behaviour:

- Completed locations are bright/visited and replayable.
- The current location pulses with a clear “Continue here” affordance.
- Future locations remain visible but dimmed/locked.
- Map layout is scene-based. Each `PROGRESSION_NODES` entry owns a large vertical scene through `mapPosition.sceneHeight`, `mapPosition.nodeOffset`, `mapPosition.side`, and `mapPosition.artwork` metadata.
- Scene sizes are written in the units the painted map was drawn in, which are measured against a 428px content box: 520px for an ordinary scene up to 840px for the largest landmark, 9150px for the whole map. Every one of them, plus node and Momo offsets, is multiplied by `mapWidth / 428` at layout time, so the map is 6798px tall on a 360px phone and the painting and the path stay locked together. Without that scaling they drift apart by a quarter of the map's length.
- `renderMenu` must therefore run after `show('s-menu')`. A hidden element measures 0, which silently collapses the layout back to unscaled heights while the art scales down.
- A resize listener re-lays the map out, so turning the phone does not leave the path where the painting used to be.
- Opening the map scrolls to the current stop rather than the top, via `scrollMapToCurrent`.
- The trail meanders: several swings per gap, drawn as one Catmull-Rom spline so it passes through every stop rather than near it. Split at the current stop: behind, a gold dashed trail with a dark outline around each dash; ahead, only a soft glow.
- `.adventure-path` states its width and height. Without them the `<svg>` takes its height from the viewBox's intrinsic ratio — 21618px against a 6798px map — and the trail is drawn at 3.18x and clipped, never meeting the stops.
- The winding path is drawn as an SVG curve through calculated node coordinates rather than stretched as a single vertical line.
- The map is painted. Eight sections in `assets/map`, listed in `MAP_ART_PANELS`, stack as a full-bleed layer under the path and nodes. Each is 1024 canvas px wide and cut on a scene boundary, and together they are exactly the 21892px canvas in `docs/MAP_ART_SPEC.json`, covering all 15 scenes.
- The per-scene `mapPosition.artwork` slots are a separate, still-unused mechanism for positioned cut-out scenery. Their placeholder labels show only when `DB.mapArtDebug` is enabled from the hidden developer spellbook.
- The current Momo sprite is placed on a separate configurable map layer near the current scene.
- Tapping an unlocked node opens a short story card, then starts the existing maths lesson.
- Completing a lesson shows the result/evolution, then `Continue Adventure` returns to the map.
- `Practise Again` replays the same lesson and does not advance story.

## Save and Migration Behaviour

- Save key remains `matemostri:v2`.
- Legacy key read fallback remains `matemostri:v4`.
- Migration version is now `8`.
- Existing completed lessons, availability, profile names, ages, custom monster names, stats, collectibles, accessories, sound settings, and storySeen values are preserved.
- Map status is derived from `stageProgress`; old players do not need to replay story beats.
- New `storyProgress` defaults are added safely:
  - `firstCrackSeen:false`
  - `mapSeen:{}`
- Monster art is derived from completed lessons, except that stage 2 can display before the first lesson is complete if `firstCrackSeen` is true.
- `xp`, `level` and `ease` are retired fields, listed in `RETIRED_PLAYER_FIELDS` and deleted from any save that still carries them. `ease` held an adaptive-difficulty map that was written on every answer and read by nothing.

## Asset State

Everything in `assets` is WebP. No PNG remains, and a test fails if one
appears there or is referenced from `index.html`. Art arrives as PNG and is
converted on the way in; a re-encode is not a redesign, and the pictures
themselves are untouched.

| Group | Files | Size |
|---|---:|---:|
| `assets/monsters` — the 17 stages | 17 | 5.2 MB |
| `assets/map` — the 8 painted sections | 8 | 3.4 MB |
| `assets/story` + `assets/ui` | 4 | 180 KB |
| **total** | | **8.8 MB**, from 40 MB of PNG |

- Monster art is 1024×1024 RGBA, converted at quality 90 to keep alpha and detail.
- Map sections are 1024 wide by 2010-3302 tall, converted at quality 80.
- `monsterMarkup` still keeps the inline SVG fallback if an image fails to load.
- `assets/monsters/stages.json` lists the 17 stages and their WebP filenames.

## Tests

`tests/arithmetic-model.test.js` runs with `node tests/arithmetic-model.test.js`.
It text-extracts functions from `index.html` and runs them in a sandbox, and
runs the whole `model` section to exercise `migrate` end to end. It verifies:

**Story and progression**

- The first crack triggers on 4 mastered in the first 5 questions, only on a
  first run, and persists through `storyProgress.firstCrackSeen`.
- Every maths lesson maps to one adventure map node.
- The last evolution needs all 15 lessons, milestones climb, and the majors
  are exactly stages 7, 12, 15 and 17.
- The map is shown before it is laid out, at every call site.

**Arithmetic**

- Column answers are written right to left, one digit per step, for addition
  and both multiplications, and no carry mark lands above a column with no
  digits of its own.
- Subtraction regrouping, including chained borrows across zeros.
- Long division keeps a single-digit divisor, ramps its dividend, never grows
  a digit and starts leaving something over in the same question, and uses no
  jargon in anything the child reads.
- Lesson length and pass mark move together and the pass mark is always
  reachable; no screen hard-codes how many answers are needed.
- The star row: one space per question, a helped star does not count towards
  the pass mark, and the row never outgrows the lesson.

**Saves**

- Existing saves migrate without losing progress, stats, custom names,
  collectibles or cosmetics; migrating twice is stable.
- A save stopped on a renamed lesson keeps it and gains nothing free.
- XP cannot return: no field, no property read, no award call.

**Assets**

- Every stage's art file exists, is numbered in order, and is WebP.
- No PNG anywhere in `assets` or referenced from `index.html`.
