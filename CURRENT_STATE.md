# Current State - Matemostri

Last inspected: 2026-08-08

This document is the authoritative description of the current implementation in this working tree. It is based on the source code and tests, not on older design prompts. Existing documents such as `EVOLUTION_ROADMAP.md` and parts of `CLAUDE.md` are useful history but can be stale.

## 1. Repository State

- Repository: `livioq/matemostri`
- Remote: `https://github.com/livioq/matemostri.git`
- Default remote branch: `origin/main`
- Current local branch inspected: `fix/cracked-egg-visual`
- Implementation baseline inspected: `4428417 Update monster evolution path`
- GitHub Pages entry point, if served from the repository root, is `index.html`.

Important blocker:

- `origin/main:index.html` is not the working game. It is a one-line placeholder:
  `PLACEHOLDER - the full content of /tmp/new_index.html is 101k characters...`
- The working game currently exists in this branch's root `index.html`.
- No repair to `origin/main` was made as part of this documentation task.
- I did not confirm a live deployed GitHub Pages page. Search did not surface a public `livioq.github.io/matemostri` result. If GitHub Pages currently serves `origin/main` from the root, it would serve the placeholder rather than the working game.

Relevant files:

- `index.html`: entire implemented app: markup, CSS, model, question generators, session flow, UI, story, developer tools.
- `tests/arithmetic-model.test.js`: automated model/UI logic tests using `node:vm` and DOM stubs.
- `assets/monsters/stages.json`: stage asset manifest.
- `assets/monsters/*.png`: current monster production image files.
- `assets/story/*.png`: opening story images.
- `assets/ui/magic-glow.png`: celebration backdrop.
- `assets/accessories/manifest.json`: accessory stage manifest, not the runtime collectible unlock table.
- `assets/expressions/manifest.json`: expression-name manifest.
- `CLAUDE.md`, `CONTRIBUTING.md`, `EVOLUTION_ROADMAP.md`: project docs. Treat `EVOLUTION_ROADMAP.md` as stale relative to the current code.

Recent meaningful commits in this working tree:

- `4428417 Update monster evolution path`
- `3abe4f0 Remove test file`
- `b7923a5 Test binary upload handling`
- `9d4419e Fix stage-15 image name to guardian-light and confirm stages 6-15 ready`
- `4b42206 Mark evolution stages 6-15 ready and align ids with art roadmap`
- `dd7b1b6 Add evolution roadmap documentation for agents`
- `3b597d8 Say what the home screen numbers mean`
- `18c407c Show stars instead of a counter, and write column digits right to left`
- `5cb9486 Add two-digit mental subtraction`
- `c88e303 Rename the creature in settings, and drop the duplicate lesson list`
- `9b6e83b Remove XP`

## 2. Current Lesson Structure

`MATH_STAGES` defines 15 lessons. A lesson is available when it is the first lesson, already completed, or the next lesson after the furthest completed lesson. Completing a lesson unlocks the next lesson.

Pass rule:

- Normal lessons: 10 questions, pass with 8 mastered answers.
- Three-digit column lessons: 7 questions, pass with 6 mastered answers.
- Four-digit column lessons: 5 questions, pass with 4 mastered answers.
- "Mastered" means correct on the first attempt or clean column/long-working without hints/errors. Helped answers advance the question but do not count toward the pass mark.

| # | Lesson ID | Name | Operation | Questions | Type/interface | Question-number ranges and generation | Carrying/borrowing | Pass | Prerequisite | Next |
|---|---|---|---|---:|---|---|---|---:|---|---|
| 1 | `add_1digit` | One-digit addition | Addition | 10 | Mental keypad | Each question uses `a` 0-9 and `b` 0-9. | No column carrying. | 8 | None | `add_2column` |
| 2 | `add_2column` | Two-digit column addition | Addition | 10 | Column | Q1-Q3 no carry; Q4-Q6 exactly one carry from ones; Q7-Q10 mixed. Numbers are 10-89. | Yes, by phase. | 8 | `add_1digit` | `add_2mental` |
| 3 | `add_2mental` | Two-digit mental addition | Addition | 10 | Mental keypad | `a` 12-58, `b` 11-39. | Mental only; no column UI. Sums may cross tens. | 8 | `add_2column` | `add_3column` |
| 4 | `add_3column` | Three-digit column addition | Addition | 7 | Column | Both addends 100-899; generator requires at least one carry. | Yes. | 6 | `add_2mental` | `add_4column` |
| 5 | `add_4column` | Four-digit column addition | Addition | 5 | Column | Both addends 1000-8999; generator requires at least one carry. | Yes. | 4 | `add_3column` | `sub_1digit` |
| 6 | `sub_1digit` | One-digit subtraction | Subtraction | 10 | Mental keypad | `a` 2-9, `b` 0-`a`; never below zero. | No column borrowing. | 8 | `add_4column` | `sub_2column` |
| 7 | `sub_2column` | Two-digit column subtraction | Subtraction | 10 | Column | Q1-Q3 no regroup; Q4-Q6 regroup; Q7-Q10 mixed. `a` 21-99, `b` 11 to `a-10`; answer stays two-digit. | Yes, by phase. | 8 | `sub_1digit` | `sub_2mental` |
| 8 | `sub_2mental` | Two-digit mental subtraction | Subtraction | 10 | Mental keypad | `a` 25-95, `b` 11 to `min(49, a-10)`; answer is positive and two-digit. | Mental only; no column UI. | 8 | `sub_2column` | `sub_3column` |
| 9 | `sub_3column` | Three-digit column subtraction | Subtraction | 7 | Column | `a` 100-999, `b` 100 to `a-1`; generator requires at least one borrow annotation. | Yes. | 6 | `sub_2mental` | `sub_4column` |
| 10 | `sub_4column` | Four-digit column subtraction | Subtraction | 5 | Column | `a` 1000-9999, `b` 1000 to `a-1`; generator requires at least one borrow annotation. | Yes. | 4 | `sub_3column` | `mul_1x1` |
| 11 | `mul_1x1` | Single digit x single digit | Multiplication | 10 | Mental keypad | `a` 2-12, `b` 2-12. | No column UI. | 8 | `sub_4column` | `mul_1x2` |
| 12 | `mul_1x2` | Single digit x two digits | Multiplication | 10 | Column | Two-digit multiplicand 12-99 times single-digit multiplier 2-9. | Multiplication carries, shown as side carry notes. | 8 | `mul_1x1` | `mul_2x2` |
| 13 | `mul_2x2` | Two digits x two digits | Multiplication | 10 | Long multiplication | `a` 12-99, `b` 12-99. | Partial products, placeholders, row carries, final sum carries. | 8 | `mul_1x2` | `div_simple` |
| 14 | `div_simple` | Simple division | Division | 10 | Mental keypad | Exact division: divisor 2-12, quotient 2-12, shown as `(d*q) / d`. | No column UI. | 8 | `mul_2x2` | `div_long` |
| 15 | `div_long` | Long division | Division | 10 | Long division UI | Q1-Q3 two-digit dividends; Q4-Q6 three-digit; Q7-Q10 four-digit. Q3, Q6, Q9, Q10 leave something over; others divide exactly. | Single-digit divisors only, 2-9. Bring-down interaction is step-by-step. | 8 | `div_simple` | None |

Long division currently uses single-digit divisors, not two-digit divisors.

## 3. First-Lesson Intermediate Milestone

The opening crack milestone is an in-session pause, not a saved lesson and not a completed-lesson evolution.

Exact behavior:

- It can happen only in `add_1digit`.
- It can happen only when `S.wasCompleted` is false, so replaying the completed lesson does not split it.
- It is checked after the fifth question is answered: `S.i === 5`.
- It requires `S.mastered >= 4`, meaning at least 4 of the first 5 questions were mastered unaided.
- It is based on mastered answers, not merely questions attempted.
- It is stored only in the current session object as `S.crackSeen` and `S.crackMoment`.
- It is not stored in `DB`, the player save, or `stageProgress`.
- Before the pause, the player remains at monster art stage 1 (`Magical Egg`) unless the current play-session state says otherwise.
- The pause screen displays art stage 2 (`stage-02-cracked-egg.png`) with the text "A crack has started to appear. Keep going and see if it hatches."
- Pressing `Continue` returns to `s-play` and calls `nextQuestion()`, so play resumes at question 6.
- After the pause and within that same session, the play pet uses the cracked artwork because `S.crackSeen` is true.
- If the player leaves the lesson and starts it again before completion, the crack state does not persist; a new session starts at question 1.
- On completing the first lesson, `add_1digit` is marked complete and the evolution becomes stage 3, `Hatched Friend`.

## 4. Current Evolution System

Evolution is driven by completed lesson count, with one special intermediate count of `0.5` used only for the first crack milestone. The code path is:

- `completedCount(player)` counts completed `MATH_STAGES`.
- `evolutionForCount(count)` selects the last `EVOLUTIONS` entry whose `completed` value is less than or equal to `count`.
- `artForCount(count)` returns that evolution's `art`.
- `P.monsterStage` is updated from `artForCount(completedCount(P))`, unless `P.devMonsterOverride` is set by the developer menu.
- `MONSTER_STAGES` has 20 slots, but only stages 1-6 are configured as image-ready in code (`assetReady: i < 6`).
- Image paths are generated from the stage number and slug. Stages 1-6 use `.png`; stages 7-20 would use `.webp` if made ready.
- If `assetReady` is false, `monsterMarkup` uses inline SVG fallback art.
- If an image is marked ready but fails to load, the image's `onerror` hides the image and reveals the SVG fallback.
- There is no separate "major evolution" boolean or flag. Major moments are represented by stage titles/messages and art selection.

| Trigger | Evolution stage | ID | Display name | Asset | Ready? | Fallback |
|---|---:|---|---|---|---|---|
| Start, 0 completed | 1 | `stage-01` / `egg` | Magical Egg | `assets/monsters/stage-01-egg.png` | Yes | SVG egg if image fails |
| First-lesson midpoint, 4 of first 5 mastered | 2 | `stage-02` / `cracked-egg` | First Crack | `assets/monsters/stage-02-cracked-egg.png` | Yes | SVG Momo fallback if image fails |
| 1 lesson completed | 3 | `stage-03` / `hatchling` | Hatched Friend | `assets/monsters/stage-03-hatchling.png` | Yes | SVG fallback |
| 2 lessons completed | 4 | `stage-04` / `fluffy-ears` | Fluffy Ears | `assets/monsters/stage-04-fluffy-ears.png` | Yes | SVG fallback |
| 3 lessons completed | 5 | `stage-05` / `pink-cheeks` | Bright Tail | `assets/monsters/stage-05-pink-cheeks.png` | Yes | SVG fallback |
| 4 lessons completed | 6 | `stage-06` / `bright-tail` | Wide Wings | `assets/monsters/stage-06-bright-tail.png` | Yes | SVG fallback |
| 5 lessons completed | 7 | `stage-07` / `tiny-wings` | Addition Flight | `assets/monsters/stage-07-tiny-wings.webp` | No | SVG fallback |
| 6 lessons completed | 8 | `stage-08` / `scarf` | Soft Scarf | `assets/monsters/stage-08-scarf.webp` | No | SVG fallback |
| 7 lessons completed | 9 | `stage-09` / `backpack` | Backpack Explorer | `assets/monsters/stage-09-backpack.webp` | No | SVG fallback |
| 8 lessons completed | 10 | `stage-10` / `goggles` | Explorer Goggles | `assets/monsters/stage-10-goggles.webp` | No | SVG fallback |
| 9 lessons completed | 11 | `stage-11` / `pencil-wand` | Pencil Wand | `assets/monsters/stage-11-pencil-wand.webp` | No | SVG fallback |
| 10 lessons completed | 12 | `stage-12` / `magic-marks` | Subtraction Guardian Light | `assets/monsters/stage-12-magic-marks.webp` | No | SVG fallback |
| 11 lessons completed | 13 | `stage-13` / `flower-crown` | Flower Crown | `assets/monsters/stage-13-flower-crown.webp` | No | SVG fallback |
| 12 lessons completed | 14 | `stage-14` / `explorer` | Sky Explorer | `assets/monsters/stage-14-explorer.webp` | No | SVG fallback |
| 13 lessons completed | 15 | `stage-15` / `guardian-light` | Multiplication Guardian | `assets/monsters/stage-15-guardian-light.webp` | No | SVG fallback |
| 14 lessons completed | 16 | `stage-16` / `star-cape` | Star Cape | `assets/monsters/stage-16-star-cape.webp` | No | SVG fallback |
| 15 lessons completed | 17 | `stage-17` / `guardian-of-maths` | Guardian of Maths | `assets/monsters/stage-17-guardian-of-maths.webp` | No | SVG fallback |

Unused stage slots still exist in `MONSTER_STAGES` and `stages.json`:

- Stage 18: `apprentice-guardian`
- Stage 19: `young-guardian`
- Stage 20: `royal-guardian`

These are not reached by the current `EVOLUTIONS` array.

## 5. Current Production Art Status

Monster files currently present:

| File | Stage | Referenced by game? | Production image used? | Fallback used? | Metadata / transparency |
|---|---:|---|---|---|---|
| `stage-01-egg.png` | 1 | Yes | Yes | Only if image fails | PNG, 1254x1254, RGB, no alpha channel |
| `stage-02-cracked-egg.png` | 2 | Yes | Yes | Only if image fails | PNG, 1024x1024, RGBA |
| `stage-03-hatchling.png` | 3 | Yes | Yes | Only if image fails | PNG, 1254x1254, RGB, no alpha channel |
| `stage-04-fluffy-ears.png` | 4 | Yes | Yes | Only if image fails | PNG, 1254x1254, RGB, no alpha channel |
| `stage-05-pink-cheeks.png` | 5 | Yes | Yes | Only if image fails | PNG, 1024x1024, RGBA |
| `stage-06-bright-tail.png` | 6 | Yes | Yes | Only if image fails | PNG, 1024x1024, RGBA |
| `test-binary.png` | None | No | No | No | Not a real PNG; `file` reports ASCII text |

Configured but absent production art:

- Stages 7-20 are listed in `stages.json`, but the corresponding WebP files are not present and are marked `ready:false`.
- In runtime code, stages 7-20 use SVG fallback because `assetReady` is false.

Known transparency state from metadata only:

- Stages 1, 3, and 4 are RGB PNGs and therefore do not have an alpha channel.
- Stages 2, 5, and 6 are RGBA PNGs and can contain transparency.

## 6. Progression and Stars

XP:

- XP no longer exists as an active progression system.
- The save migration removes `xp` and `level`.
- Tests fail if XP-like fields or old XP award functions are reintroduced.
- `ease`, `tierFor`, `genEasy`, and `genHard` remain in code, but the current lesson generator path does not call `tierFor`, `genEasy`, or `genHard`. This is inert leftover adaptive-difficulty code.

Stars and lesson progress:

- The play screen shows one star slot per question.
- `renderStars` displays `☆` for unanswered and `★` for answered.
- `markQuestion('won')` means mastered/unaided. `markQuestion('helped')` means answered with help.
- Both won and helped answers visually fill a star, but only `won` stars count toward `mastered` and the pass threshold.
- The ARIA label reports won stars, total questions, and pass mark.
- The menu text uses `sessionPlan(stage).pass`, so the displayed requirement follows the real pass rule.

Unlocking and completion:

- `completeMathStage` marks the current lesson complete and makes the next lesson available.
- `normalizeStageProgress` ensures earlier lessons up to the furthest completed lesson are consistently available/completed.
- `Continue Adventure` / home button text changes by progress: first play says "Help the egg awaken"; completed game says "Revisit the enchanted lessons"; otherwise it uses the custom monster name.
- Replaying a completed lesson does not advance evolution. If the replay passes, it awards a collectible.

## 7. Collectibles

Implemented:

Collectibles are defined in `COLLECTIBLES`:

- `stars`: Magic Stars
- `flowers`: Flowers
- `berries`: Magic Berries
- `feathers`: Feathers
- `mushrooms`: Mushrooms
- `crystals`: Crystals
- `leaves`: Lucky Leaves
- `shells`: Forest Shells

How they are earned:

- Replaying a completed lesson and passing it triggers `awardCollectible`.
- `awardCollectible` selects one collectible at random and increments `P.collectibles[item.id]`.
- The end screen reports the found item.

Cosmetic rewards implemented:

- Cosmetic thresholds are implemented in `COSMETIC_REWARDS`.
- When total collectibles reach thresholds, IDs are added to `P.accessories`.
- Current thresholds: Flower Crown 3, Scarf 6, Backpack 10, Star Cape 15, Magic Pencil 22, Crystal Crown 30, Guardian Staff 40.
- `wardrobeBox` on the home screen displays earned cosmetics.
- `petSVG` reads some accessory IDs and draws fallback SVG accessories for scarf, star cape, and crowns. Raster images do not visually compose these accessories.

Planned / unused or partly stale:

- `assets/accessories/manifest.json` lists level-based accessory IDs, including `magic-staff` at level 20. Runtime collectible unlocking uses `COSMETIC_REWARDS`, not this manifest.
- `ACC` still contains level-triggered accessory metadata used by older fallback-art logic, but `monsterMarkup` passes `P.accessories` to `petSVG`, so saved accessory IDs are the meaningful runtime path.

Save format:

- `P.collectibles` is an object keyed by collectible ID with numeric counts.
- `P.accessories` is an array of cosmetic IDs.
- Migration normalizes all collectible counts and creates missing IDs with zero.

## 8. Monster Naming

- Default monster name: `Momo`.
- Player can rename the monster during the opening story on the first story screen.
- Player can rename later in Settings via `setFriendName`.
- The custom name is stored on the player as `momoName`.
- `petName()` returns `P.momoName` or `Momo`.
- Story text, home messages, menu title, journey requirements, feedback, evolution messages, end screen, and settings use `petName()` or saved `momoName`.
- Some internal arrays and variable names still include `Momo` (`PET_NAMES`, `monsterMarkup`, comments, file/doc text), but child-facing dynamic text is intended to use the custom name. Static title text still refers to "magical friend" rather than the custom name in some places.

## 9. Story

Opening story:

- `STORY_SCENES` has 3 screens.
- Screen 1: `assets/story/find-egg.png`, title "A magical egg!", includes the naming input.
- Screen 2: `assets/story/take-home.png`, title "A new friend", uses `{name}`.
- Screen 3: `assets/story/magic-maths.png`, title "Magic maths", uses `{name}`.

When it appears:

- New players are sent to `openStory()`.
- On app boot, if the current player exists and `storySeen` is false, the story opens; otherwise home opens.
- `finishStory` sets `P.storySeen = true`, saves, and goes home.
- The story can be skipped; skip calls `finishStory`.
- The story can be replayed from Settings / developer-adjacent UI via `replayStory`.

Migration note:

- If `storySeen` is undefined during migration, it is set to true. Existing/legacy players are not forced through the story.

## 10. Arithmetic Engine Status

Addition:

- Column addition uses `buildColumn('add', a, b)`.
- Result digits are entered right-to-left.
- A step never asks for two digits at once.
- Carry steps are separate digit steps and are only placed above columns with original digits. If a carry becomes the final leftmost answer digit, it is entered as the answer digit in that column rather than as a carry mark above an empty column.
- Tests cover examples including `63 + 71`, right-to-left order, no two-digit answer steps, and no carry mark over empty columns.

Subtraction:

- Column subtraction uses regrouping annotations.
- It supports borrowing, chained borrowing, and borrowing across zeros.
- For `84 - 16`, tests assert that the 8 becomes 7 and the 4 becomes 14.
- For `1000 - 367`, tests assert the zero-search and chained borrow sequence.
- Step-by-step reveal behavior is tested: future rewritten digits are not shown before the child reaches the relevant step.

Multiplication:

- `mul_1x2` uses column multiplication with one-digit multiplier and side carry notes.
- `mul_2x2` uses `buildLongMultiplication` with:
  - two partial-product rows,
  - a zero placeholder for the tens row,
  - partial-row carry notes,
  - a final addition row.
- Carried leading digits are written as their own right-to-left steps, not combined into two-digit entries.
- Tests cover examples including `27 x 4`, `46 x 7`, `23 x 14`, and `99 x 99`.

Division:

- `div_simple` is exact mental division with divisor and quotient 2-12.
- `div_long` uses long division UI with single-digit divisors only.
- Divisors are 2-9 for long division.
- Dividends ramp from 2 digits to 3 digits to 4 digits.
- Each digit length is introduced with exact division before questions with something left over.
- Bring-down is an explicit interaction in `divPlan`, `renderDiv`, and `pressDiv`.
- Something left over is not treated as an error. The final prompt says there is nothing left to bring down and the summary says not everything fits evenly.
- Tests cover divisor width, dividend length ramp, no zero quotient digits, bring-down behavior, leftover behavior, and no child-facing jargon such as quotient/product/remainder/divisor/dividend.

## 11. Save Data and Migration

Storage:

- Current key: `matemostri:v2`
- Legacy keys read: `matemostri:v4`
- Save backend: `window.storage` if available, otherwise `localStorage`.

Top-level DB shape:

- `DB = { players: [], current: null, sound: true }`

Current player fields:

- `id`
- `name`
- `age`
- `total`
- `ease`
- `right`
- `best`
- `groups`
- `unlocked`
- `stageProgress`
- `monsterStage`
- `momoName`
- `collectibles`
- `accessories`
- `storySeen`
- `migrationVersion`
- Optional developer-only `devMonsterOverride`

Lesson progress:

- `stageProgress.available[id]`: whether a lesson can be selected.
- `stageProgress.completed[id]`: whether a lesson has been completed.
- `blankStageProgress`, `progressFromCount`, and `normalizeStageProgress` own this shape.

Evolution fields:

- `monsterStage`: current visual art stage.
- `devMonsterOverride`: optional developer override.
- There is no saved field for the first crack midpoint.

Crack milestone fields:

- `S.crackSeen` and `S.crackMoment` exist only on the live session object `S`.
- They are not persisted in player save data.

Migration functions:

- `legacyCompletedCount(p)`: maps very old group/unlocked/level progress to a completed lesson count.
- `migrateV3StageProgress(progress)`: maps an older 13-lesson structure into the current 15-lesson structure.
- `RETIRED_STAGE_IDS = { sub_2digit: 'sub_2column' }`
- `migrateV4StageProgress(progress)`: handles renamed lesson IDs.
- `RETIRED_PLAYER_FIELDS = ['xp', 'level']`
- `dropRetiredPlayerFields(p)`: removes XP and old level.
- `migrate(p)`: normalizes all current player fields and sets `migrationVersion = 6`.

Compatibility:

- Tests cover v3/v4 migration, old level-to-progress conversion, retired field deletion, collectible/accessory preservation, and idempotent migration of a fresh save.

## 12. Testing and Developer Tools

Automated tests:

- Run: `node tests/arithmetic-model.test.js`
- Tests extract functions and constants from `index.html` and run them in Node.
- Covered areas include:
  - first crack trigger and continue flow source wiring,
  - addition column steps,
  - subtraction borrowing and reveal behavior,
  - multiplication and long multiplication steps,
  - long division generation and prompts,
  - session lengths and pass marks,
  - star row behavior,
  - save migrations and XP removal,
  - current evolution roadmap,
  - stage 5 and stage 6 asset existence.

Browser/mobile tests:

- There is no committed browser test suite.
- Recent manual checks were done at phone-like widths, but they are not automated.

Developer tools:

- Hidden developer spellbook opens by tapping the player name seven times.
- It can:
  - jump to a lesson count,
  - unlock all maths lessons,
  - unlock all collectibles,
  - trigger a selected evolution,
  - replay the story,
  - rename the monster,
  - reset the player.

Not currently covered by automated tests:

- Full browser visual layout.
- Actual image transparency/visual quality beyond file presence.
- End-to-end browser clicking for every lesson.
- Audio behavior.
- Live GitHub Pages deployment.

## 13. Known Issues / Blockers

Actual issues found during inspection:

- `origin/main:index.html` is a placeholder, not the working game. This blocks main/default-branch deployment if GitHub Pages serves `main`.
- The working game exists on local branch `fix/cracked-egg-visual`, not on `origin/main`.
- `EVOLUTION_ROADMAP.md` is stale. It describes an older evolution table where the cracked egg is completed lesson 1 and final stages go beyond the current stage 17 finale.
- `CLAUDE.md` is partly stale where it says five production Momo images are final; this branch now has six production-ready monster images and the fifth was replaced.
- `assets/monsters/stages.json` still lists stages 18-20 even though current `EVOLUTIONS` ends at art stage 17.
- `assets/monsters/test-binary.png` is present but is not a real PNG and is not used by the game.
- Stage asset manifest paths for stages 7-20 point to absent WebP files. This is safe at runtime because those stages are `ready:false` and the runtime uses SVG fallback, but the files do not exist.
- `assets/accessories/manifest.json` contains older level-based accessory data that does not match the current collectible-threshold runtime exactly.
- Inert adaptive-difficulty code remains (`ease`, `tierFor`, `genEasy`, `genHard`); it does not currently drive question generation.
- Long division uses 10 questions, with the last four using four-digit dividends; `CLAUDE.md` already flags that this may drag in play.
- Two-digit-by-two-digit multiplication is still 10 full long-multiplication questions; `CLAUDE.md` flags this as worth watching.

No broken runtime asset references were found for stages 1-6. Later stages intentionally use fallback because `assetReady` is false.

## 14. Current Authoritative Roadmap

### A. Implemented now

- Single-file static app in root `index.html`.
- 15 implemented maths lessons.
- 134 total questions across the journey:
  - 10-question normal lessons,
  - 7-question three-digit column lessons,
  - 5-question four-digit column lessons.
- First lesson has an in-session cracked-egg pause after question 5 if at least 4 of the first 5 were mastered.
- Completed lessons drive evolution stages:
  - 0: Stage 1 Magical Egg
  - first midpoint: Stage 2 First Crack
  - 1: Stage 3 Hatched Friend
  - 2: Stage 4 Fluffy Ears
  - 3: Stage 5 Bright Tail
  - 4: Stage 6 Wide Wings
  - 5: Stage 7 Addition Flight
  - 6: Stage 8 Soft Scarf
  - 7: Stage 9 Backpack Explorer
  - 8: Stage 10 Explorer Goggles
  - 9: Stage 11 Pencil Wand
  - 10: Stage 12 Subtraction Guardian Light
  - 11: Stage 13 Flower Crown
  - 12: Stage 14 Sky Explorer
  - 13: Stage 15 Multiplication Guardian
  - 14: Stage 16 Star Cape
  - 15: Stage 17 Guardian of Maths
- Monster images are production-ready for stages 1-6 only.
- Stages 7-17 are implemented via SVG fallback.
- Replaying completed lessons awards collectibles.
- Collectibles unlock cosmetic IDs.
- XP and old level progression are removed from saved games.
- Long division uses single-digit divisors only.

### B. Recent agreed direction, not yet necessarily implemented

Clearly identifiable from recent docs/commits but not fully implemented as production assets:

- Every completed lesson should produce a noticeable evolution.
- The operation endpoints should feel like bigger transformations:
  - four-digit addition: Addition Flight,
  - four-digit subtraction: Subtraction Guardian Light,
  - two-digit-by-two-digit multiplication: Multiplication Guardian,
  - long division: Guardian of Maths.
- Later stages need production artwork. Current stages 7-17 rely on SVG fallback.
- Existing docs mention transparent WebP production art for later stages; that is not present in the repo.
- Stages 18-20 remain configured as possible slots but are not part of the current implemented evolution path.
