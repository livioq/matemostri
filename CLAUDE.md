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
- Correct answers earn visible stars: the play screen shows one space
  per question, filling as they are answered, rather than a "2/10"
  counter. A star won unaided is gold; one the child needed a hand with
  still lights, softly, because an empty space beside a right answer
  would read as a telling-off. Only gold ones count towards the pass
  mark.
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
Subtraction: one-digit; two-digit column; two-digit mental;
three-digit column with borrowing; four-digit column with borrowing.
Multiplication: single x single; single x two-digit; two-digit x
two-digit.
Division: simple division; long division.

## Teaching rules

- Column work is entered digit by digit with a carry row, the way it is
  written on paper. Subtraction uses regrouping: on 84-16 the 8 is
  crossed out and becomes 7, the 4 becomes 14.
- Answer digits are always written right to left, one column at a time,
  and a step never asks for two digits at once. On 63+71 that is 4, then
  3, then the 1 that spills over — never 4, then 1, then 3. A column
  with no digits of its own gets no carry mark above it; the carried
  digit is simply written there as the answer on the next turn.
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
  underneath", "write what is left". That includes the game's own
  vocabulary: the screens say "lessons lit" and "right answers", not
  "path lights" and "kind answers", and a count says what it is out of.
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
- Subtraction now mirrors addition at two digits: columns first
  (`sub_2column`, so 84-16 — the example the teaching rules are written
  around — is finally a lesson the child sits), then the same size in
  the head (`sub_2mental`, Moonlit Hollow). That makes fifteen lessons.
  Inserting one shifts everything that counts them: the last evolution
  now waits for fifteen, and both legacy migrations moved with it.
- Lesson lengths match how heavy a question is: ten normally, seven at
  three digits, five at four. The journey is 134 questions across 15
  lessons, where ten-a-lesson would have been 150.
- The play screen shows a row of star spaces instead of "2/10".
- The home tiles, the lesson list header and the end screen said "path
  lights" and "kind answers". They now say "7 of 15 lessons lit" and
  "right answers".
- Column answers are written right to left one digit at a time. The old
  model asked for the last two digits as a single entry, so 63+71 went
  4, then 1, then 3. The `final`, `mulFinal` and `partialFinal` step
  types are gone; a carried digit that lands in an empty column is just
  written there as that column's answer.
- The creature can be renamed in settings.
- There was a second lesson list, reached from the home screen, that
  showed the same rows as `s-menu` but could not be tapped.
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

`index.html` is ~1719 lines: one `<style>` block, the screen markup, then
three `<script>` blocks. Line numbers drift as the file is edited — the
`/* ---- name ---- */` banner comments are the durable anchors, so grep for
those rather than trusting the numbers.

### Styles (9-265)

| Lines | Contents |
| --- | --- |
| 10-45 | Design tokens (`:root` colours, `--cell`), page chrome, `.card`, `.btn`, `.screen` show/hide |
| 46-69 | `/* magical companion */` — Momo art frame, glow, bob and evolution-burst animations |
| 70-76 | `/* practice menu */` — lesson list and lock states |
| 77-94 | `/* question */` — question card, answer box, stamps, and `.stars` — the row of star spaces that replaced the question counter |
| 95-100 | `/* keypad */` — the digit pad |
| 101-127 | `/* column working */` — the paper-style grid: carry row, crossed-out regrouping, long-multiplication and division layout |
| 128-191 | `/* settings */` |
| 192-264 | `/* opening story + maths journey */` — story panels, journey track, level-up overlay |

### Markup (267-428)

Every screen is a `<section class="screen">`; `show(id)` toggles the `on`
class. In DOM order: `s-story` (270), `s-players` (286), `s-home` (303),
`s-menu` (322), `s-play` (331, whose `#progress` is the star row, holding
both `normalQ` at 338 and `colQ` at 342), `s-end` (354), `s-set` (367),
the `lvUp` level-up overlay (393), and the hidden `s-dev` spellbook (413). There is one lesson list, not
two: `s-menu`. A read-only twin used to sit beside it.

### Script 1 — data and maths (429-1024)

| Lines | Section | Notes |
| --- | --- | --- |
| 430-453 | `storage` | `KEY='matemostri:v2'`, `LEGACY_KEYS`, `store` get/set |
| 454-652 | `model` | `MATH_STAGES` (455, the 15 lessons), `EVOLUTIONS`, `ACC`, `COLLECTIBLES`, `MONSTER_STAGES`; save-shape helpers `blankStageProgress`, `progressFromCount`, `normalizeStageProgress`, `migrateV3StageProgress` (575), `RETIRED_STAGE_IDS` and `migrateV4StageProgress` (589), `RETIRED_PLAYER_FIELDS` and `dropRetiredPlayerFields` (600), `completeMathStage`, `migrate` (620) |
| 653-758 | `pet` | `petSVG` (655) fallback art and `monsterMarkup` (748), which emits the `<img onerror>` → inline-SVG fallback |
| 759-777 | `sound` | WebAudio beeps |
| 778-900 | `column working model` | `buildColumn` (781), `buildLongMultiplication` (843), `twoDigitColumnAddition` (875), `twoDigitColumnSubtraction` (887) — pure step generators |
| 901-1024 | `question generation` | `genEasy`, `genHard`, `longDivisionPhase` (939), `genDivision` (944), `generateLessonQuestion` (972), `divSteps` (1011) |

The test suite text-extracts `buildColumn`, `commitColumnStep`,
`buildLongMultiplication`, `commitLongMultiplicationStep`, `colPrompt`,
`longMulPrompt`, `divSteps`, `longDivisionPhase`, `genDivision`,
`generateLessonQuestion`, `divPlan`, `divPromptText`,
`twoDigitColumnAddition`, `twoDigitColumnSubtraction`, `renderStars`,
`markQuestion`,
`blankStageProgress`, `progressFromCount`, `normalizeStageProgress`,
`migrateV3StageProgress`, `migrateV4StageProgress`,
`dropRetiredPlayerFields` and the
`MATH_STAGES` array by name, plus `sessionPlan`, and the `SESSION`,
`RETIRED_STAGE_IDS` and `RETIRED_PLAYER_FIELDS` constants, so keep them as top-level
`function name(...)  {...}` declarations.

### Script 2 — screens and session flow (1025-1313)

| Lines | Section | Notes |
| --- | --- | --- |
| 1025-1095 | `screens` | `$`, `esc`, `show`; `STORY_SCENES` (1030) and story flow, `renderPlayers` (1049), `renderHome` (1061), `renderMenu` (1080) — the one lesson list |
| 1096-1123 | `settings` | `captureSettingsName` (1098) renames the creature, `renderSettings` (1105) |
| 1124-1313 | `gameplay` | `SESSION` and `sessionPlan` (1128) sizing the lesson and its pass mark, `renderStars` (1145) and `markQuestion` (1157) filling the star row, `startSession` (1158), `nextQuestion` (1165) dispatching to the right renderer, keypad `press`, `checkNormal` (1230) with the two-try feedback rule, `award` (1261) and `awardHelped` (1271), `awardCollectible` (1272), `maybeCompleteStage` (1280), `endSession` |

### Script 3 — column UIs and wiring (1314-1719)

| Lines | Section | Notes |
| --- | --- | --- |
| 1315-1428 | `columns: addition, subtraction, multiplication` | `colPrompt` (1316), `renderCol` (1337), `commitColumnStep`, `pressCol`, `finishCol` |
| 1429-1506 | `two-digit long multiplication` | `longMulPrompt`, `renderLongMul` (1441), `commitLongMultiplicationStep`, `pressLongMul`, `finishLongMul` |
| 1507-1627 | `division in columns` | `divPlan` (1510), `divPromptText`, `renderDiv` (1529), `pressDiv` (1585), `finishDiv` — the interactive working: multiply-back, subtract, bring down |
| 1628-1641 | `hidden developer spellbook` | `renderDeveloper`, `resetPlayerProgress` |
| 1642-1719 | `wiring` | Age picker, all event listeners, dev-tap unlock, boot |

Note on long division: question generation lives in `longDivisionPhase`
and `genDivision` (944) plus `generateLessonQuestion` (972) in script 1,
while the working UI is `divPlan`/`renderDiv`/`pressDiv` in script 3.
The two are independent — changes to what a question looks like belong
in the former and should leave the latter untouched. The words the child
reads during the working are `divPromptText`, and the summary at the end
is in `finishDiv`.
