# Matemostri

A magical-pet maths game. Children help a creature called Momo grow by
learning maths. Built for the owner's two children, ages 7 and 9. Not a
public release.

## Hard constraints

- The whole app is a single self-contained index.html. Keep it that way:
  no build step, no bundler, no external dependencies at runtime.
- It runs on an Android phone. Check layouts at ~360px wide.
- Run `node tests/arithmetic-model.test.js` before every commit. Add
  tests for any change to arithmetic or question generation.
- The five production Momo images in assets/monsters are final art. Do
  not redesign or regenerate them. Later stages may use SVG fallback art.
- Never break saved player progress. Any change to the save format needs
  a migration and a test for it.

## Design direction

- Maths progress drives Momo's growth.
- XP is gone, not merely unused. There is no xp field, no level number
  and no points table left in the code or in a saved game, and a test
  fails if one comes back. Do not reintroduce it.
- Each completed lesson unlocks the next part of the journey.
- Replaying a completed lesson awards collectibles rather than advancing
  the story. Collectibles can later unlock cosmetic items.
- First evolutions should happen very quickly.
- Correct answers earn visible stars, and the child can always see how
  close they are to the next Momo milestone.
- A lesson's length matches how much work one question is: ten
  questions normally, seven for three-digit column work, five for
  four-digit. The share needed to light the path is always 8 in 10, so
  the pass mark moves with the length — `sessionPlan` owns both, and
  they must never drift apart or a lesson becomes impossible to
  complete.
- The player names the creature. Default is Momo. All story and
  evolution text uses the player-chosen name, and the name can be
  changed at any time in settings, not only during the opening story.

## Curriculum

Addition: one-digit; two-digit column; two-digit mental; three-digit
column; four-digit column.
Subtraction: one-digit; two-digit column; three-digit column with
borrowing; four-digit column with borrowing.
Multiplication: single x single; single x two-digit; two-digit x
two-digit.
Division: simple division; long division.

## Teaching rules

- Column work is entered digit by digit with a carry row, the way it is
  written on paper. Subtraction uses regrouping: on 84-16 the 8 is
  crossed out and becomes 7, the 4 becomes 14.
- Long division uses a single-digit divisor (2-9) into a multi-digit
  dividend: 84/4, 126/6, 384/3, 1248/4, 3276/7. Never two-digit divisors
  like 1248/12. The lesson teaches the process, not two new things at once:
  a question never grows a digit longer and starts leaving something over
  at the same time. Each dividend length is met dividing exactly first.
- Something left over is not a mistake and must never read like one. The
  last take-away says so ("nothing left to bring down"), and the summary
  adds that not everything fits evenly.
- No jargon in anything a child reads. Not quotient, product or
  remainder. Say "how many times does 3 go into 22", "write it
  underneath", "write what is left".
- Feedback must never feel punishing. A wrong answer gets a second try
  with nothing revealed; only after that is the answer shown, and the
  child still types it in and still moves forward.

## Current priority

Nothing outstanding.

Recently done, in case something looks unfamiliar:

- XP is removed rather than merely unused. The points table, the `xp`
  field and the `level` it fed are gone from the code and from saved
  games, and `softXP` — which never awarded anything — is now
  `awardHelped`. A test fails if any of it comes back.
- The second subtraction lesson is column work, so 84-16 — the example
  the teaching rules are written around — is finally a lesson the child
  actually sits. It was mental arithmetic before, which meant two-digit
  regrouping was never taught on paper.
- Lesson lengths match how heavy a question is: ten normally, seven at
  three digits, five at four. The journey is 124 questions, not 140.
- The creature can be renamed in settings.
- There was a second lesson list, reached from the home screen, that
  showed the same fourteen rows as `s-menu` but could not be tapped.
  It is gone, and its personalised title moved onto `s-menu`.

Worth watching when the children next play:

- Long division is still ten questions, and its last four are
  four-digit dividends — heavier than a four-digit column sum. If that
  ending drags, shorten the lesson or move the ramp rather than
  reaching for the four-digit rule, which keys on `stage.digits` and
  does not apply to a lesson that grows within itself.
- Two digits x two digits is also still ten questions. It keys as a
  two-digit lesson, but each question is a full long multiplication.
- Whether four long-division questions in ten that leave something over
  is the right amount, and whether the two back-to-back at the end of
  the session are one too many.
- The last four questions of both two-digit column lessons are a free
  mix, so a session can end without a single carry or crossing-out.
  Addition has always behaved this way and subtraction now matches it,
  but if the children coast through the endings, that is the reason.

The adaptive-difficulty leftovers are the obvious next cleanup: `ease`
writes `P.ease` on every answer, but its only reader is `tierFor`,
which nothing calls, and the `genEasy` and `genHard` generators it was
built for are unreachable too. A whole inert subsystem, and removing it
would be another save-shape change.

## Code map

`index.html` is ~1701 lines: one `<style>` block, the screen markup, then
three `<script>` blocks. Line numbers drift as the file is edited — the
`/* ---- name ---- */` banner comments are the durable anchors, so grep for
those rather than trusting the numbers.

### Styles (9-259)

| Lines | Contents |
| --- | --- |
| 10-45 | Design tokens (`:root` colours, `--cell`), page chrome, `.card`, `.btn`, `.screen` show/hide |
| 46-69 | `/* magical companion */` — Momo art frame, glow, bob and evolution-burst animations |
| 70-76 | `/* practice menu */` — lesson list and lock states |
| 77-88 | `/* question */` — question card, answer box, stamps |
| 89-94 | `/* keypad */` — the digit pad |
| 95-121 | `/* column working */` — the paper-style grid: carry row, crossed-out regrouping, long-multiplication and division layout |
| 122-185 | `/* settings */` |
| 186-258 | `/* opening story + maths journey */` — story panels, journey track, level-up overlay |

### Markup (261-422)

Every screen is a `<section class="screen">`; `show(id)` toggles the `on`
class. In DOM order: `s-story` (264), `s-players` (280), `s-home` (297),
`s-menu` (316), `s-play` (325, holding both `normalQ` at 332 and `colQ`
at 336), `s-end` (348), `s-set` (361), the `lvUp` level-up overlay (387),
and the hidden `s-dev` spellbook (407). There is one lesson list, not
two: `s-menu`. A read-only twin used to sit beside it.

### Script 1 — data and maths (423-1018)

| Lines | Section | Notes |
| --- | --- | --- |
| 424-447 | `storage` | `KEY='matemostri:v2'`, `LEGACY_KEYS`, `store` get/set |
| 448-644 | `model` | `MATH_STAGES` (449, the 14 lessons), `EVOLUTIONS`, `ACC`, `COLLECTIBLES`, `MONSTER_STAGES`; save-shape helpers `blankStageProgress`, `progressFromCount`, `normalizeStageProgress`, `migrateV3StageProgress` (568), `RETIRED_STAGE_IDS` and `migrateV4StageProgress` (580), `RETIRED_PLAYER_FIELDS` and `dropRetiredPlayerFields` (591), `completeMathStage`, `migrate` (612) |
| 645-750 | `pet` | `petSVG` (647) fallback art and `monsterMarkup` (740), which emits the `<img onerror>` → inline-SVG fallback |
| 751-769 | `sound` | WebAudio beeps |
| 770-898 | `column working model` | `buildColumn` (773), `buildLongMultiplication` (841), `twoDigitColumnAddition` (873), `twoDigitColumnSubtraction` (885) — pure step generators |
| 899-1018 | `question generation` | `genEasy`, `genHard`, `longDivisionPhase` (937), `genDivision` (942), `generateLessonQuestion` (970), `divSteps` (1005) |

The test suite text-extracts `buildColumn`, `commitColumnStep`,
`buildLongMultiplication`, `commitLongMultiplicationStep`, `colPrompt`,
`longMulPrompt`, `divSteps`, `longDivisionPhase`, `genDivision`,
`generateLessonQuestion`, `divPlan`, `divPromptText`,
`twoDigitColumnAddition`, `twoDigitColumnSubtraction`,
`blankStageProgress`, `progressFromCount`, `normalizeStageProgress`,
`migrateV3StageProgress`, `migrateV4StageProgress`,
`dropRetiredPlayerFields` and the
`MATH_STAGES` array by name, plus `sessionPlan`, and the `SESSION`,
`RETIRED_STAGE_IDS` and `RETIRED_PLAYER_FIELDS` constants, so keep them as top-level
`function name(...)  {...}` declarations.

### Script 2 — screens and session flow (1019-1288)

| Lines | Section | Notes |
| --- | --- | --- |
| 1019-1089 | `screens` | `$`, `esc`, `show`; `STORY_SCENES` (1024) and story flow, `renderPlayers` (1043), `renderHome` (1055), `renderMenu` (1072) — the one lesson list |
| 1090-1117 | `settings` | `captureSettingsName` (1092) renames the creature, `renderSettings` (1099) |
| 1118-1288 | `gameplay` | `SESSION` and `sessionPlan` (1122) sizing the lesson and its pass mark, `startSession` (1136), `nextQuestion` (1143) dispatching to the right renderer, keypad `press`, `checkNormal` (1208) with the two-try feedback rule, `award` and `awardHelped` (1248), `awardCollectible` (1249), `maybeCompleteStage` (1257), `endSession` |

### Script 3 — column UIs and wiring (1289-1701)

| Lines | Section | Notes |
| --- | --- | --- |
| 1290-1405 | `columns: addition, subtraction, multiplication` | `colPrompt` (1291), `renderCol` (1313), `commitColumnStep`, `pressCol`, `finishCol` |
| 1406-1488 | `two-digit long multiplication` | `longMulPrompt`, `renderLongMul` (1419), `commitLongMultiplicationStep`, `pressLongMul`, `finishLongMul` |
| 1489-1609 | `division in columns` | `divPlan` (1492), `divPromptText`, `renderDiv` (1511), `pressDiv` (1567), `finishDiv` — the interactive working: multiply-back, subtract, bring down |
| 1610-1623 | `hidden developer spellbook` | `renderDeveloper`, `resetPlayerProgress` |
| 1624-1701 | `wiring` | Age picker, all event listeners, dev-tap unlock, boot |

Note on long division: question generation lives in `longDivisionPhase`
and `genDivision` (942) plus `generateLessonQuestion` (970) in script 1,
while the working UI is `divPlan`/`renderDiv`/`pressDiv` in script 3.
The two are independent — changes to what a question looks like belong
in the former and should leave the latter untouched. The words the child
reads during the working are `divPromptText`, and the summary at the end
is in `finishDiv`.
