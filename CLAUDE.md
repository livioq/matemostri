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
- XP is being phased out as the main progression mechanic. Do not
  reintroduce it.
- Each completed lesson unlocks the next part of the journey.
- Replaying a completed lesson awards collectibles rather than advancing
  the story. Collectibles can later unlock cosmetic items.
- First evolutions should happen very quickly.
- Correct answers earn visible stars, and the child can always see how
  close they are to the next Momo milestone.
- The player names the creature. Default is Momo. All story and
  evolution text uses the player-chosen name.

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

Nothing outstanding. Long division is done: the divisor is always a
single digit, the dividend ramps from two digits to four across the
lesson, and questions that leave something over are back, on questions
3, 6, 9 and 10.

Worth watching when the children next play: whether four questions in
ten that leave something over is the right amount, and whether the two
back-to-back at the end of the session are one too many.

## Code map

`index.html` is ~1678 lines: one `<style>` block, the screen markup, then
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

### Markup (261-428)

Every screen is a `<section class="screen">`; `show(id)` toggles the `on`
class. In DOM order: `s-story` (264), `s-players` (280), `s-home` (297),
`s-journey` (318), `s-menu` (327), `s-play` (336, holding both `normalQ`
at 343 and `colQ` at 347), `s-end` (359), `s-set` (372), the `lvUp`
level-up overlay (392), and the hidden `s-dev` spellbook (413).

### Script 1 — data and maths (429-976)

| Lines | Section | Notes |
| --- | --- | --- |
| 430-453 | `storage` | `KEY='matemostri:v2'`, `LEGACY_KEYS`, `store` get/set |
| 454-637 | `model` | `MATH_STAGES` (the 14 lessons), `EVOLUTIONS`, `ACC`, `COLLECTIBLES`, `MONSTER_STAGES`; save-shape helpers `blankStageProgress`, `progressFromCount`, `normalizeStageProgress`, `migrateV3StageProgress` (581), `completeMathStage`, `migrate` (607) |
| 638-743 | `pet` | `petSVG` fallback art and `monsterMarkup` (733), which emits the `<img onerror>` → inline-SVG fallback |
| 744-762 | `sound` | WebAudio beeps |
| 763-876 | `column working model` | `buildColumn` (766), `buildLongMultiplication` (834), `twoDigitColumnAddition` (866) — pure step generators |
| 877-975 | `question generation` | `genEasy`, `genHard`, `genDivision` (912), `generateLessonQuestion` (927), `divSteps` (964) |

The test suite text-extracts `buildColumn`, `commitColumnStep`,
`buildLongMultiplication`, `commitLongMultiplicationStep`, `colPrompt`,
`longMulPrompt`, `divSteps`, `longDivisionPhase`, `genDivision`,
`generateLessonQuestion`, `divPlan`, `divPromptText`,
`blankStageProgress`, `progressFromCount`,
`migrateV3StageProgress` and the `MATH_STAGES` array by name, plus the
`SESSION` constant, so keep them as top-level `function name(...)  {...}`
declarations.

### Script 2 — screens and session flow (977-1243)

| Lines | Section | Notes |
| --- | --- | --- |
| 978-1061 | `screens` | `$`, `esc`, `show`; `STORY_SCENES` and story flow (983-1000), `renderGrowthJourney` (1002), `renderPlayers`, `renderHome`, `renderMenu` |
| 1062-1080 | `settings` | |
| 1081-1242 | `gameplay` | `startSession` (1093), `nextQuestion` (1099) dispatching to the right renderer, keypad `press`, `checkNormal` (1164) with the two-try feedback rule, `award`, `awardCollectible` (1204), `maybeCompleteStage` (1212), `endSession` |

### Script 3 — column UIs and wiring (1244-1652)

| Lines | Section | Notes |
| --- | --- | --- |
| 1245-1360 | `columns: addition, subtraction, multiplication` | `colPrompt` (1246), `renderCol` (1268), `commitColumnStep`, `pressCol`, `finishCol` |
| 1361-1443 | `two-digit long multiplication` | `longMulPrompt`, `renderLongMul` (1374), `commitLongMultiplicationStep`, `pressLongMul`, `finishLongMul` |
| 1444-1561 | `division in columns` | `divPlan` (1447), `divPromptText`, `renderDiv` (1464), `pressDiv` (1520), `finishDiv` — the interactive working: multiply-back, subtract, bring down |
| 1562-1575 | `hidden developer spellbook` | `renderDeveloper`, `resetPlayerProgress` |
| 1576-1652 | `wiring` | Age picker, all event listeners, dev-tap unlock, boot |

Note on long division: question generation lives in `longDivisionPhase`
and `genDivision` (912) plus `generateLessonQuestion` (927) in script 1,
while the working UI is `divPlan`/`renderDiv`/`pressDiv` in script 3.
The two are independent — changes to what a question looks like belong
in the former and should leave the latter untouched. The words the child
reads during the working are `divPromptText`, and the summary at the end
is in `finishDiv`.
