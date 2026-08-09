# Matemostri

A magical-pet maths game. Children help a creature called Momo grow by
learning maths. Built for the owner's two children, ages 7 and 9. Not a
public release.

## Hard constraints

- The whole app is a single self-contained index.html. Keep it that way:
  no build step, no bundler, no external dependencies at runtime. The only
  files beside it are the images in assets and `manifest.webmanifest`,
  which Android reads to give the home-screen shortcut its icon.
- It runs on an Android phone. Check layouts at ~360px wide.
- Run `node tests/arithmetic-model.test.js` before every commit. Add
  tests for any change to arithmetic or question generation.
- The seventeen Momo images in assets/monsters and the eight painted map
  sections in assets/map are final art. Do not redesign or regenerate
  them. Re-encoding to another format is not redesigning.
- Ship images as WebP. Nothing in assets is a PNG and a test fails if one
  appears. The art arrives as PNG and is converted on the way in: the map
  went from 36.6 MB to 3.4 MB, the whole assets folder from 40 MB to 8.8.
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
- Every lesson can be sat on three difficulties, chosen on its map stop.
  Easy is aimed at the seven-year-old: small numbers drawn as dots in
  rows of five, times tables no further than four, eight questions
  rather than ten. Medium is the game as it was. Hard is medium with the
  talking removed — the working is laid out with its boxes empty and the
  child taps whichever one to fill next.
- Passing a difficulty wins a badge. Every map stop shows all three
  slots, the unwon ones greyed, so a lesson does not read as finished
  until all three are won. Finishing any one of them lights the path and
  unlocks the next stop; the badges are what say how thoroughly.
- Finishing a difficulty offers the next one up on the end screen.
- The column working must fit the screen without scrolling. `fitCell`
  sizes the grid from the room left once the keypad is built, which is
  why the working is rendered again after `buildPad`.
- Who is playing, girl or boy, is remembered on the player. It will
  choose the artwork one day; today it only stores the choice. Age used
  to be asked for and never changed anything, so it is gone.
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
- The adaptive-difficulty subsystem is gone. `ease` wrote `P.ease` on
  every single answer, its only reader was `tierFor`, and nothing called
  `tierFor`; `bandOf`, `HARD_P` and the `genEasy`/`genHard` generators
  went with it, along with `S.q.vid`, which `ease` was all that read.
  `ease` is a retired save field now, so the map it left behind is
  dropped from existing games.
- The trail meanders between stops, as one spline through every stop
  rather than a curve pulled past them, and is split at the current stop:
  gold dashes with a dark outline behind the child, only a soft glow
  ahead. `.adventure-path` has to state its width and height, or the
  `<svg>` sizes itself from the viewBox ratio and draws the whole trail
  at three times scale, clipped and clear of the stops.
- Opening the map lands on the stop the child is actually at rather than
  the top of a nine-thousand-pixel scroll. `scrollMapToCurrent` puts it a
  little above the middle so the path ahead is visible.
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

## Code map

`index.html` is ~1990 lines: one `<style>` block, the screen markup, then
three `<script>` blocks. Line numbers drift as the file is edited — the
`/* ---- name ---- */` banner comments are the durable anchors, so grep for
those rather than trusting the numbers.

### Styles (17-327)

| Lines | Contents |
| --- | --- |
| 18-53 | Design tokens (`:root` colours, `--cell`), page chrome, `.card`, `.btn`, `.screen` show/hide |
| 54-77 | `/* magical companion */` — Momo art frame, glow, bob and evolution-burst animations |
| 78-84 | `/* practice menu */` — lock states |
| 85-102 | `/* question */` — question card, answer box, stamps, and `.stars`, the row of star spaces that replaced the question counter |
| 103-108 | `/* keypad */` — the digit pad |
| 109-135 | `/* column working */` — the paper-style grid: carry row, crossed-out regrouping, long-multiplication and division layout |
| 136-199 | `/* settings */` |
| 200-326 | `/* opening story + maths journey */` — story panels, then the adventure map: `.adventure-map`, `.map-art` (the painted panels), `.adventure-path`, `.map-scene`, `.scene-art-slot`, `.map-location`, `.map-momo`, and the major-transition overlay |

### Markup (323-517)

Every screen is a `<section class="screen">`; `show(id)` toggles the `on`
class. In DOM order: `s-story` (332), `s-players` (348), `s-home` (365),
`s-menu` (384, the adventure map), `s-node` (393, the story card for one
map stop), `s-play` (407, whose `#progress` is the star row), `s-crack`
(430, the midpoint first-crack beat), `s-end` (441), `s-set` (454), the
`lvUp` overlay (480), and the hidden `s-dev` spellbook (501).

### Script 1 — data and maths (524-1183)

| Lines | Section | Notes |
| --- | --- | --- |
| 525-548 | `storage` | `KEY='matemostri:v2'`, `LEGACY_KEYS`, `store` get/set |
| 549-846 | `model` | `MATH_STAGES` (550, the 15 lessons), `MONSTER_STAGE_DATA` (568, the 17 art stages), `PROGRESSION_NODES` (587, the 15 map stops), `MAP_ART_PANELS` (607) and `MAP_ART_CSS_WIDTH` (621), `EVOLUTIONS` (624), `COLLECTIBLES`, `COSMETIC_REWARDS`; `mapSceneLayout` (677) and `mapPathD` (714) lay the map out; save-shape helpers `blankStageProgress` (734), `progressFromCount` (739), `normalizeStageProgress` (744), `migrateV3StageProgress` (769), `RETIRED_STAGE_IDS` (782) and `migrateV4StageProgress` (783), `RETIRED_PLAYER_FIELDS` (793) and `dropRetiredPlayerFields` (794), `completeMathStage` (799), `migrate` (814) |
| 847-952 | `pet` | `petSVG` (849) fallback art and `monsterMarkup` (942), which emits the `<img onerror>` → inline-SVG fallback |
| 953-971 | `sound` | WebAudio beeps |
| 972-1094 | `column working model` | `buildColumn` (975), `buildLongMultiplication` (1037), `twoDigitColumnAddition` (1069), `twoDigitColumnSubtraction` (1081) — pure step generators |
| 1095-1182 | `question generation` | `longDivisionPhase` (1099), `genDivision` (1104), `generateLessonQuestion` (1132), `divSteps` (1171) |

The test suite text-extracts these by name, so keep them as top-level
`function name(...)  {...}` declarations: `buildColumn`,
`buildLongMultiplication`, `twoDigitColumnAddition`,
`twoDigitColumnSubtraction`, `commitColumnStep`,
`commitLongMultiplicationStep`, `colPrompt`, `longMulPrompt`, `renderCol`,
`renderLongMul`, `divSteps`, `divPlan`, `divPromptText`,
`longDivisionPhase`, `genDivision`, `generateLessonQuestion`,
`sessionPlan`, `renderStars`, `markQuestion`, `renderMenu`,
`shouldShowCrackPause`, `blankStageProgress`, `progressFromCount`,
`normalizeStageProgress`, `dropRetiredPlayerFields`. It also matches the
`MATH_STAGES` array and the `SESSION`, `RETIRED_STAGE_IDS` and
`RETIRED_PLAYER_FIELDS` constants by source text, and runs the whole
`model` section in a sandbox to exercise `migrate` end to end.

### Script 2 — screens and session flow (1184-1573)

| Lines | Section | Notes |
| --- | --- | --- |
| 1185-1323 | `screens` | `$`, `esc`, `show` (1188); `STORY_SCENES` (1190) and the opening story, `renderPlayers` (1209), `renderHome` (1221), `renderMenu` (1241) building the map and `scrollMapToCurrent` (1302) landing it on the stop you are at, `openMapNode` (1309) opening one stop's story card |
| 1324-1351 | `settings` | `captureSettingsName` (1326) renames the creature, `renderSettings` (1333) |
| 1352-1572 | `gameplay` | `SESSION` and `sessionPlan` (1356) sizing the lesson and its pass mark, `renderStars` (1374) and `markQuestion` (1386) filling the star row, `startSession` (1387), `nextQuestion` (1395), `checkNormal` (1460) with the two-try feedback rule, `shouldShowCrackPause` (1490) and `showCrackPause` (1496), `award` (1508) and `awardHelped` (1518), `awardCollectible` (1519), `maybeCompleteStage` (1527), `endSession` (1552) |

### Script 3 — column UIs and wiring (1574-1988)

| Lines | Section | Notes |
| --- | --- | --- |
| 1575-1687 | `columns: addition, subtraction, multiplication` | `colPrompt` (1576), `renderCol` (1597), `commitColumnStep` (1648), `pressCol`, `finishCol` |
| 1688-1765 | `two-digit long multiplication` | `longMulPrompt` (1689), `renderLongMul` (1700), `commitLongMultiplicationStep`, `pressLongMul`, `finishLongMul` |
| 1722-1841 | `division in columns` | `divPlan` (1769), `divPromptText` (1779), `renderDiv` (1788), `pressDiv` (1844), `finishDiv` — the interactive working: multiply-back, subtract, bring down |
| 1886-1900 | `hidden developer spellbook` | `renderDeveloper` (1887), `resetPlayerProgress` |
| 1901-1987 | `wiring` | Age picker, all event listeners, the map resize re-layout (1881), dev-tap unlock, boot |

Note on long division: question generation lives in `longDivisionPhase`
and `genDivision` (1104) plus `generateLessonQuestion` (1132) in script 1,
while the working UI is `divPlan`/`renderDiv`/`pressDiv` in script 3.
The two are independent — changes to what a question looks like belong
in the former and should leave the latter untouched. The words the child
reads during the working are `divPromptText`, and the summary at the end
is in `finishDiv`.

Note on the map: `renderMenu` must run *after* `show('s-menu')`. Scene
heights are measured from the map's width, and a hidden element measures
0, which silently collapses the layout back to full-width sizes while the
painted panels scale down. A test pins the ordering.

Other documents: `STORY_MAP.md` is the child-facing journey and the map
layout contract, `EVOLUTION_ROADMAP.md` the 17 art stages and where they
land, `CURRENT_STATE.md` the implementation notes, `docs/MAP_ART_SPEC.json`
and `docs/MAP_ART_GUIDE.svg` the artwork blueprint.
