# Current State - Matemostri

Last inspected and updated: 2026-08-08

This is the authoritative current-state document for this working tree. It is based on the real `index.html`, tests, and assets in the repository, not on older prompts.

## Repository State

- Repository: `livioq/matemostri`
- Working branch: `fix/cracked-egg-visual`
- Current implementation: full single-file game in `index.html`
- Important repository issue verified: older history contains a placeholder `index.html` on `origin/main`; this branch contains the complete working game build and is the correct source for progression changes.
- Stable engine preserved: arithmetic generation, column-working UI, long multiplication, long division, profiles, saves, custom Momo names, collectibles, settings, hints, sounds, and developer tools remain in the same app.

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

The intended production progression is now 17 stages. Stage 2 is a special intermediate state during the first lesson, not a normal map destination. The artwork was audited before renaming; several old filenames/slugs no longer matched what the art actually showed.

| Stage | Previous code ID / slug | Previous display name | Previous image | Actual visual content | Trigger | Type | Major? | Previous name matched art? | Final canonical ID | Final canonical filename |
|---:|---|---|---|---|---|---|---|---|---|---|
| 1 | `stage-01` / `egg` | Magical Egg | `stage-01-egg.png` | Glowing purple-pink magical egg with golden heart | New player / 0 lessons | Starting state | No | Mostly | `magical-egg` | `stage-01-magical-egg.png` |
| 2 | `stage-02` / `cracked-egg` | First Crack | `stage-02-cracked-egg.png` | Cracked magical egg | 4 mastered answers after first 5 questions in `add_1digit` | Intermediate | No | Yes | `first-crack` | `stage-02-first-crack.png` |
| 3 | `stage-03` / `hatchling` | Hatched Friend | `stage-03-hatchling.png` | Hatchling just out of shell | Complete `add_1digit` | Lesson completion | No | Mostly | `hatched-friend` | `stage-03-hatched-friend.png` |
| 4 | `stage-04` / `fluffy-ears` | Fluffy Ears | `stage-04-fluffy-ears.png` | Young Momo with large fluffy ears | Complete `add_2column` | Lesson completion | No | Yes | `fluffy-ears` | `stage-04-fluffy-ears.png` |
| 5 | `stage-05` / `pink-cheeks` | Bright Tail | `stage-05-pink-cheeks.png` | Momo with bright magical tail and small wings | Complete `add_2mental` | Lesson completion | No | No | `bright-tail` | `stage-05-bright-tail.png` |
| 6 | `stage-06` / `bright-tail` | Wide Wings | `stage-06-bright-tail.png` | Momo with much wider wings and glowing tail | Complete `add_3column` | Lesson completion | No | No | `wide-wings` | `stage-06-wide-wings.png` |
| 7 | `stage-07` / `tiny-wings` | Addition Flight | `stage-07-tiny-wings.png` | Flying Momo with large wings | Complete `add_4column` / Addition finale | Lesson completion | Yes | No | `addition-flight` | `stage-07-addition-flight.png` |
| 8 | `stage-08` / `scarf` | Backpack Explorer | `stage-08-scarf.png` | Explorer Momo with backpack, magnifier, coins | Complete `sub_1digit` | Lesson completion | No | No | `backpack-explorer` | `stage-08-backpack-explorer.png` |
| 9 | `stage-09` / `backpack` | Explorer Goggles | `stage-09-backpack.png` | Explorer Momo with goggles, backpack, pencil | Complete `sub_2column` | Lesson completion | No | No | `explorer-goggles` | `stage-09-explorer-goggles.png` |
| 10 | `stage-10` / `goggles` | Magic Marks | `stage-10-goggles.png` | Momo with goggles, staff, backpack and glowing body marks | Complete `sub_2mental` | Lesson completion | No | No | `magic-marks` | `stage-10-magic-marks.png` |
| 11 | `stage-11` / `pencil-wand` | Flower Crown | `stage-11-pencil-wand.png` | Momo with flower crown, goggles, satchel and star wand | Complete `sub_3column` | Lesson completion | No | No | `flower-crown` | `stage-11-flower-crown.png` |
| 12 | `stage-12` / `magic-marks` | Subtraction Guardian Light | `stage-12-magic-marks.png` | Armoured/light guardian form with cloak, staff and celestial wings | Complete `sub_4column` / Subtraction finale | Lesson completion | Yes | No | `subtraction-guardian-light` | `stage-12-subtraction-guardian-light.png` |
| 13 | `stage-13` / `flower-crown` | Star Cape | `stage-13-flower-crown.png` | Starry caped Momo with wand and explorer satchel | Complete `mul_1x1` | Lesson completion | No | No | `star-cape` | `stage-13-star-cape.png` |
| 14 | `stage-14` / `explorer` | Celestial Wings | `stage-14-explorer.png` | Larger celestial/armoured wings with purple-gold cape and staff | Complete `mul_1x2` | Lesson completion | No | No | `celestial-wings` | `stage-14-celestial-wings.png` |
| 15 | `stage-15` / `guardian-light` | Multiplication Mage | `stage-15-guardian-light.png` | Wizard/mage Momo with hat, cloak, staff and large wings | Complete `mul_2x2` / Multiplication finale | Lesson completion | Yes | No | `multiplication-mage` | `stage-15-multiplication-mage.png` |
| 16 | `stage-16` / `star-cape` | Arcane Master | `stage-16-star-cape.png` | Mage Momo with floating spellbook | Complete `div_simple` | Lesson completion | No | No | `arcane-master` | `stage-16-arcane-master.png` |
| 17 | `stage-17` / `guardian-of-maths` | Guardian of Maths | `stage-17-guardian-of-maths.png` | Final grand mage/guardian form with book, staff, vast wings and flowing magic | Complete `div_long` / Division finale | Lesson completion | Yes | Yes | `guardian-of-maths` | `stage-17-guardian-of-maths.png` |

Final major evolutions are stages 7, 12, 15, and 17.

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
- Tapping an unlocked node opens a short story card, then starts the existing maths lesson.
- Completing a lesson shows the result/evolution, then `Continue Adventure` returns to the map.
- `Practise Again` replays the same lesson and does not advance story.

## Save and Migration Behaviour

- Save key remains `matemostri:v2`.
- Legacy key read fallback remains `matemostri:v4`.
- Migration version is now `7`.
- Existing completed lessons, availability, profile names, ages, custom monster names, stats, collectibles, accessories, sound settings, and storySeen values are preserved.
- Map status is derived from `stageProgress`; old players do not need to replay story beats.
- New `storyProgress` defaults are added safely:
  - `firstCrackSeen:false`
  - `mapSeen:{}`
- Monster art is derived from completed lessons, except that stage 2 can display before the first lesson is complete if `firstCrackSeen` is true.

## Asset State

Production monster artwork now exists for all 17 intended stages and is preferred over SVG fallback. `monsterMarkup` still keeps the inline SVG fallback if an image fails to load.

Known dimensions from current files:

- Stages 1-17 are PNG production assets.
- Stages 1 and 3-17 are 1024×1024 PNGs after the recent replacements/additions.
- Stage 2 is also 1024×1024 PNG.
- Current ready artwork uses alpha where available; the image fallback path remains safe.

`assets/monsters/stages.json` now lists only the intended 17 stages.

## Tests

`tests/arithmetic-model.test.js` verifies:

- First crack trigger remains 4 of first 5 mastered answers.
- Crack state is persisted through `storyProgress.firstCrackSeen`.
- Long division remains single-digit divisor into multi-digit dividend.
- The old XP system is not reintroduced.
- Existing saves migrate without losing progress, stats, custom names, collectibles, or cosmetics.
- Every maths lesson maps to one adventure map node.
- The final evolution requires all 15 lessons.
- Major evolutions are exactly stages 7, 12, 15, and 17.
- Canonical renamed asset filenames exist.
