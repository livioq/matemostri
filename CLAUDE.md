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
  Difficulty moves the numbers, never the lesson. Medium is the game as
  it was.
- Easy is the same lesson, not a different one. Two-digit column addition
  on easy is still two-digit column addition: same working, same carrying,
  same place on the map. What changes is that the numbers are smaller and
  that every individual sum inside the working is drawn as dots in rows of
  five. It is eight questions rather than ten, the two-digit lessons done
  in the head carry nothing and borrow nothing, and times tables stop at
  four, so the largest fact anywhere on easy is 4 x 9 — that is a cap on
  the multiplier, not on what it multiplies, so 9 x 4 is fine and long
  division divides by 2 to 4. Do not go back to replacing easy questions
  with a separate, simpler kind; that was the first attempt and it taught
  the wrong lesson.
- A picture must not answer the question. A take-away whose dots arrive
  already crossed out has done the work, and so has a share that arrives
  already shared: both start whole and the child taps. Tapping a dot
  crosses it out and tapping it again brings it back; tapping a pile
  shares it out one more time, so 24 into 4 is halve, then halve again,
  and 24 into 3 is one sharing. "How many times does 4 go into 9" takes
  4 away as often as it will go, which is what the working does next
  anyway. None of it is required — a child who can see the answer just
  writes it — and every tap wraps round to the start so nothing can be
  got wrong and stuck.
- A picture only helps while it can be taken in at a glance, so a sum
  over `DOT_LIMIT` dots is left undrawn rather than turned into a wall of
  them. The limit is 45, because the largest thing easy asks for is a
  fact and what it carries: nine fours and the 3 carried into them.
- The dots use the width they are given. A pile of fourteen is five
  across at most, which leaves two thirds of the screen empty, so `fitDot`
  grows them until either a group fills the strip or the picture would
  stand too tall — one number, `--dot`, from which the gaps and the
  padding follow. Nine little groups of four still have to shrink; one
  pile of fourteen does not.
- That sizing is an estimate, and an estimate cannot know what the keypad
  costs on a particular phone. So `settleDots` measures the page after
  the working is drawn and steps the picture down a size, or gives it up
  altogether, rather than letting the working scroll. It is the real
  guard; `DOT_ROWS_IN_WORKING` only stops the obviously hopeless.
- On easy the picture is the help, so the times-table hint button is not
  shown: it was taking room the picture needed.
- The two digits being multiplied are ringed, so the child can see which
  pair the dots are counting: 43 x 27 rings the 3 and the 7, then the 4
  and the 7. An outline, not a border, so the grid does not move.
- The rule that a column with no digits of its own gets no carry mark
  above it applies to long multiplication's final addition too, not only
  to the column additions. Without it 49 x 23 asked for the leading 1 as
  a carry and then again as the answer, which is the same 1 twice.
- A carry note is cleared once the multiplication that uses it is done.
  Left on screen it reads as still owing something, and when the next
  carry happens to be the same digit — 22 x 5 carries 1, then makes 11
  and carries 1 again — the child looks like they are writing 1 twice.
- Zeros lose their group rather than showing an empty box, and a step
  that is not a sum at all — a carry to copy down, a crossing-out — gets
  no picture either. So that a step never goes without help where help is
  the point, every digit in an easy number is 1 to 9: `easyNumber` builds
  them, and a step reading "0 + 5" cannot arise.
- Hard is medium with the talking removed — the working is laid out with
  its boxes empty and the child taps whichever one to fill next.
- A lesson done in the head has no working, so hard cannot take the
  talking out of it. It takes away the easy way through instead: bigger
  numbers, and ones that carry or borrow, which is the part you cannot do
  without holding something in your head. Every hard one-digit addition
  crosses ten (8 + 5), and its mirror, one-digit subtraction, crosses
  back down (15 - 8) — still one digit taken away, still the same lesson.
  Both two-digit mental lessons always carry or always borrow. Times
  tables have nothing to carry, so there bigger is the whole of it: hard
  multiplies and divides at the far end, 6 to 12.
- Hard covers all three workings: columns, long multiplication and long
  division. Nothing is ever chosen for the child, not even the first box,
  and nothing is chosen for them after each answer either — `si`/`pi` go
  to -1 and the prompt says only "Tap a box, then write what belongs in
  it." Two rules make that safe. Every step type needs a box to tap, or a
  question can be started and never finished: that is why `mulCarry` and
  `partialCarry` get an empty box beside their row. And the steps that
  are only talk have no box at all, so hard drops them — `seek` ("this
  column has a 0, so follow the borrow one left") from columns, `skip`
  ("not even once, take one more digit") from division. A column that is
  crossed out twice offers only the next crossing-out waiting, because
  you cannot cross out what is not yet written.
- Passing a difficulty wins a badge. Every map stop shows all three
  slots, the unwon ones greyed, so a lesson does not read as finished
  until all three are won. Finishing any one of them lights the path and
  unlocks the next stop; the badges are what say how thoroughly.
- A harder sit proves the easier ones, so passing hard wins all three
  badges at once and passing medium wins easy with it. `cascadeBadges`
  applies the same rule to saved games on load, so nothing has to be
  re-sat to catch up.
- Three badges a lesson and a shelf of collectibles look alike enough
  that a child can mistake one for the other, so both are said in plain
  words rather than left to the icons: the map stop that offers a
  difficulty says there are three badges and that a harder pass wins the
  easier ones, and the den says its treasures are a different thing,
  found by replaying a lesson already lit. Both are permanent captions,
  not a one-time tutorial — a child who missed it once sees it every
  time, which suits a fact more than a mechanic does.
- Finishing a difficulty offers the next one up on the end screen.
- Choosing a difficulty on a map stop is the same act as starting the
  lesson. There is nothing to confirm after it, so there is no second
  button: tapping Easy starts the lesson on easy. The one exception is a
  working the child has not met, which gets its explanation first.
- A lesson that introduces a new working explains it before the first
  sit. "Put the ones in the column and keep the tens" is not obvious to a
  seven-year-old, and the lesson itself only ever says it one step at a
  time, by which point the child is already being asked to do it. Five
  lessons have a guide for their working — `add_2column`, `sub_2column`,
  `mul_1x2`, `mul_2x2`, `div_long` — one per working; the two mental
  lessons have one of their own; the other eight introduce nothing new
  and go straight in.
- A guide is paged, never a wall of instructions. Page 0 is a hello — the
  creature, and a line saying that something is about to change, so the
  tutorial is not a cold jump — and each page after it says one thing and
  lights the one thing it is talking about. `#guideDots` shows how far
  through it is, the button reads "Next" until the last page, and back
  steps through the pages before it leaves the screen.
- A working guide is a worked example drawn in the same cells the real
  working uses, and a line per page saying what just happened in the
  words the lesson will use. `LESSON_GUIDES` places its cells by row and
  column, so one renderer draws a column sum, a long multiplication and a
  division. Every cell carries the page it is first written on, so the
  example builds up as the child pages through rather than arriving
  finished. The rule goes on the answer's own row, as its top border, the
  way `renderCol` does it — on a row of its own it leaves an empty gap.
- A lesson done in the head has no working to draw, so its guide is the
  same walk-through in words: one line per page, the newest lit. And
  there the difficulty is the whole of what changes — easy never carries,
  hard always does — so those entries are `byDifficulty` and hold one
  guide each. Easy reassures ("we will keep the numbers small"), medium
  works an example through the carry or the borrow, hard says the numbers
  are bigger and every one of them goes over.
- A guide is shown once, remembered in `storyProgress.guidesSeen`, and
  reachable again from the map stop by "how it works". `guideKey` is what
  is remembered: a stage id for a working guide, which teaches the same
  thing on all three difficulties, and `stage:difficulty` for a mental
  one, which does not. `storyProgressOf` adds the field, so an existing
  save gains it without a version bump.
- Not every child comes to this for the maths. There is a story to read as
  well: one chapter per lesson in `STORY_CHAPTERS`, opened by lighting
  that lesson's path. A chapter says what the last lesson changed about
  her, walks the road to the next stop, and stops on whatever is in the
  way; the chapter after it opens by getting past that. `solves` names
  what the one before ended on, so the chain cannot quietly come apart,
  and only the last chapter has nothing left in the way.
- Reading is never required and never in the road. The chapters wait on a
  shelf reached from the home screen, which is not there at all until
  there is something on it and says how many are new; the end of a lesson
  offers the one it just wrote, as an aside under the main button, so a
  child who would rather do maths taps straight past it. What has been
  read is kept in `storyProgress.chaptersRead`, which is only ever used to
  say a chapter is new — nothing is withheld for not having read one.
- The collectibles were only ever a list, so they have a den to sit in.
  It grows with the badges won, and the thresholds are what a clean sweep
  of each difficulty is worth: 15 badges for easy, 30 for medium, 45 for
  hard. Counting badges rather than asking for the sweep itself means a
  child who mixes difficulties still climbs, and — because passing hard
  quietly wins easy and medium too — nobody jumps a room the way a rule
  reading "all of easy" would have let them.
- The den shows every collectible slot, the unfound ones greyed, the same
  way a map stop shows all three badges. An empty space says there is one
  still out there, which a bare list never did.
- The den art is a placeholder that knows it is one. Each room is drawn
  against `DEN_CANVAS`, and `DEN_ROOMS` holds the anchors in canvas
  units: `pet` is where her feet go and how tall she stands, and each
  shelf gives the top surface of a plank and how many treasures fit along
  it. `denSVG` draws the placeholder **from those anchors** — the plank it
  draws is the plank a collectible lands on — so the drawing and the
  placement cannot drift apart.
- To paint the rooms later: give a room an `art` file and `denBackdrop`
  serves that instead, keeping the drawing as the fallback, exactly as
  `monsterMarkup` does for the creature. Nothing else moves, because the
  creature and the treasures are positioned from the anchors rather than
  from the picture. If a painting puts its shelves somewhere else, edit
  that room's numbers and rerun `node tools/den-art-spec.js`.
  `docs/DEN_ART_SPEC.json` and `docs/DEN_ART_GUIDE.svg` are generated from
  the same table — the brief an artist works to and the numbers the game
  places things at are the same numbers, and a test fails if they drift.
- The column working must fit the screen without scrolling. `fitCell`
  sizes the grid from the room left once the keypad is built, which is
  why the working is rendered again after `buildPad`.
- Who is playing, girl or boy, is remembered on the player. It will
  choose the artwork one day; today it only stores the choice. Age used
  to be asked for and never changed anything, so it is gone.
- The question can be read aloud, for a child who can do the sum but is
  still slow at reading it. Never automatic: a speaker button beside the
  question and beside the working prompt, tapped when it is wanted.
  Symbols become words first — plus, take away, times, divided by,
  equals — because a screen reader saying "six minus three" is not the
  language the game uses anywhere else. A middot, which separates two
  thoughts on screen, becomes a full stop. An English voice if the
  browser has one, read at 0.9.
- The screens between the maths get a speaker too, and they are the
  longest reading in the game: the opening story, a map stop's story
  card, the midpoint crack, what the creature has grown into, and the
  end of a lesson. One button reads its whole panel in the order it is
  written, and `SPEAK_PANELS` says which parts belong to which button. A
  block of little stats is read as separate parts — `textContent` alone
  runs them together into "7answers mastered7answers in a row". A line
  that puts one word in a tag for emphasis, like the den's "15 more
  badges until…" with the 15 in a `<b>`, is not a block of stats and
  reads as the one sentence it looks like; `hasBareText` is what tells
  the two shapes apart, and before it existed the words beside the tag
  were silently dropped, which is what happened to that very line.
  Leaving a screen stops whatever it was reading, so a panel never talks
  over the next one.
- Speech is feature-detected at every step, and the buttons carry
  `hidden` in the markup: a browser without `speechSynthesis` shows no
  button, changes no layout, and runs no speech code. `speechReady`
  checks for `window` itself, so the test suite, which has none, is
  untouched.
- Ten questions is a lot in one sitting, so a lesson does not have to be
  one sitting. What has been answered is kept on the player in `resume`
  and picked up next time, whether that is five minutes or a day later.
  Only how far in the child got is kept, not the question itself, so
  re-entering asks a fresh question at that point rather than the one
  abandoned; `keepResume` runs before each question and `dropResume` when
  the lesson ends. The home screen offers it as the first button, above
  the fold, because it is what a returning child wants.
- One question is the day's maths. Ten in a row before the run moves
  would make the run the thing they cannot reach, so `countToday` fires
  from `award` and `awardHelped` — a question that needed a hand still
  counts, because it is still that day's maths done.
- The run moving is the reward, so it takes the whole screen for a
  moment: a big number that counts up from where it was, the creature,
  and how the month is going. A number that lands already changed is a
  number the child did not see change.
- A month is worth something of its own. `MONTH_GOAL` days of maths in a
  calendar month wins a medal, kept per month in `days.won` so it is
  never awarded twice, and the home screen carries the tally and the
  medals won. A missed day costs the run but not the month's count.
- A daily streak counts how many days in a row a lesson has been sat,
  a replay included: doing your maths is doing your maths. The date is the
  child's own, not UTC, so a lesson finished at nine in the evening
  belongs to that evening. `markLessonDay` is the only thing that moves
  it and `liveStreak` is what any screen shows, because a run is only
  alive while unbroken — a child who last played on Monday must not be
  told on Thursday that they are on a run of five. The best run is kept
  even after one is broken.
- With two kinds of streak on screen, neither is called just a streak:
  the home tiles say "answers in a row" and "days in a row", and the end
  of a lesson says the same.
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
- A column crossed out twice reads newest first, leftwards, the way it is
  written on paper: a 2 that becomes 12 gains its ten in front of it, and
  the 2 it replaced is pushed aside.
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
- A lesson stops as soon as the pass mark is out of reach. Finishing the
  rest proves nothing and only asks a child who is already struggling to
  keep going. `passOutOfReach` is the test, run before each question, and
  the end screen invites another go — "Let's start this one again" — and
  offers the gentler difficulty if there is one. The half-finished lesson
  is let go of, so next time starts fresh, and the day's run is kept,
  because they did do their maths.
- Because the pass mark is 8 in 10 of the answers got right first time,
  that stop can come early: three stumbles in a ten-question lesson, two
  in a seven or an eight. That is the honest arithmetic of the pass mark
  rather than a separate rule, so soften the pass mark if it bites.
- Feedback must never feel punishing. A wrong answer gets a second try
  with nothing revealed; only after that is the answer shown, and the
  child still types it in and still moves forward.

## Current priority

Nothing outstanding.

Recently done, newest first, in case something looks unfamiliar:

- Badges and collectibles are explained in plain words where they are
  seen, rather than left to be inferred from icons: a map stop says
  there are three badges and that a harder pass wins the easier ones,
  and the den says its treasures are found by replaying a lit lesson,
  not by winning a badge. Fixing this also found and fixed a real bug in
  the speech helpers — a `<b>` tag with words beside it, like the den's
  own new "15 more badges until…", was read as just the number, the
  surrounding words silently dropped.
- The collectibles have a den to live in, which grows over four rooms as
  the badges come in. The rooms are drawn placeholders built to be
  replaced by paintings without moving what sits in them.
- There is a story to read now: fifteen chapters, one opened by each
  lesson, each picking up the cliffhanger the last one left.
- The guides are paged now, opening on a hello rather than a wall of
  instructions, and the two mental lessons have one too — a walk-through
  in words, different on each difficulty.
- Five lessons explain their working before the first sit —
  `add_2column`, `sub_2column`, `mul_1x2`, `mul_2x2`, `div_long` — one
  guide per working.
- The question, the working prompt and every screen between the maths can
  be read aloud on request.
- The easy pictures grew to use the width they have, the multiplication
  carry is drawn, and the pair being multiplied is ringed.
- Long multiplication's final addition asked for the last carry twice on
  a question like 49 x 23. It now follows the same rule the column
  additions do.
- Every lesson can be sat on easy, medium or hard, each with its own
  badge. Easy is the same lesson with smaller numbers and pictures; hard
  is the same lesson with the talking taken out, or — on a lesson done in
  the head — with bigger numbers that carry.
- The journey board names each zone once, at one size, above the trail
  rather than under it, and a locked stop stays readable.
- The working fits a phone without scrolling: `fitCell` sizes the grid
  from the room the keypad and the picture leave.
- XP is removed rather than merely unused, and so are `level`, `ease` and
  `age`. `age` is replaced by `look`, girl or boy, which is stored and
  nothing reads yet. A test fails if xp comes back.
- Subtraction mirrors addition at two digits: columns first
  (`sub_2column`), then the same size in the head (`sub_2mental`). That
  makes fifteen lessons, and both legacy migrations moved with it.
- Lesson lengths match how heavy a question is: ten normally, seven at
  three digits, five at four. The journey is 134 questions.
- Column answers are written right to left, one digit at a time.
- The play screen shows a row of star spaces instead of "2/10".
- The map is painted, the trail meanders through every stop, and opening
  it lands on the stop the child is at rather than the top.
- The adaptive-difficulty subsystem is gone, along with the second lesson
  list that could not be tapped.

Worth watching when the children next play:

- Long division is still ten questions, and its last four are four-digit
  dividends — heavier than a four-digit column sum. If that ending drags,
  shorten the lesson or move the ramp rather than reaching for the
  four-digit rule, which keys on `stage.digits` and does not apply to a
  lesson that grows within itself.
- Two digits x two digits is also still ten questions. It keys as a
  two-digit lesson, but each question is a full long multiplication.
- Whether four long-division questions in ten that leave something over
  is the right amount, and whether the two back-to-back at the end are
  one too many.
- The last four questions of both two-digit column lessons are a free
  mix, so a session can end without a single carry or crossing-out.
- On easy, a picture is dropped when it cannot fit above the working. In
  long division that is the four-digit dividends, where the grid alone
  needs the whole screen; roughly a quarter of the biggest "how many
  times" steps go undrawn.

## Code map

`index.html` is ~3500 lines: one `<style>` block, the screen markup, then
three `<script>` blocks. Line numbers drift as the file is edited — the
`/* ---- name ---- */` banner comments are the durable anchors, so grep for
those rather than trusting the numbers.

### Styles (17-421)

| Lines | Contents |
| --- | --- |
| 18-53 | Design tokens (`:root` colours, `--cell`), page chrome, `.card`, `.btn`, `.screen` show/hide |
| 54-72 | `/* magical companion */` — Momo art frame, glow, bob and evolution-burst animations, and the home/end stat tiles |
| 73-98 | `/* question */` — question card, `.ask` (text beside its speaker button), `.speak`, answer box, stamps, `.stars` |
| 99-115 | the easy pictures: `.dots`, `--dot` and the gaps and padding derived from it, `.tappable`, and `#colDots` for the tighter strip above a working |
| 116-121 | `/* keypad */` |
| 122-167 | `/* column working */` — the paper-style grid: carry row, crossed-out regrouping, `.ringed`, long-multiplication and division layout, `.guide-grid` for a guide's worked example and `.guide-lines` for a worded one |
| 168-224 | `/* settings */` and the level-up overlay |
| 225-247 | `/* opening story + maths journey */` — story panels, badge rows, the month card |
| 248-269 | the story shelf: `.story-btn` and its "new" dot, `.tale-item`, and `.chapter-pet`/`.chapter-text` for the reader |
| 270-297 | the den: `.den-room` and its layers — `.den-art`, `.den-props`, `.den-pet` (placed from the room's own anchors) — and the `.den-trophy` slots |
| 298-421 | the day-won overlay, then the adventure map: `.adventure-map`, `.map-art`, `.adventure-path`, `.map-scene`, `.scene-title`, `.map-location` and its badge row, `.silhouette`, `.map-momo`, and the major-transition overlay |

### Markup (425-712)

Every screen is a `<section class="screen">`; `show(id)` toggles the `on`
class. In DOM order: `s-story` (426), `s-players` (442), `s-home` (459),
`s-menu` (489, the adventure map), `s-node` (498, one map stop —
`#nodeBadgeNote` is the standing "3 badges" caption), `s-guide` (515, how a
lesson works), `s-play` (533, whose `#progress` is the star row), `s-crack`
(558), `s-end` (569), `s-tale` (587, the story shelf), `s-chapter` (596, one
chapter), `s-den` (612, the den — `#denCollectNote` is the standing
"different from badges" caption), `s-set` (630), the `lvUp` overlay (656),
the `dayBox` overlay (666), the `unlockBox` overlay (679) and the hidden
`s-dev` spellbook (698).

### Script 1 — data and maths (715-2037)

| Lines | Section | Notes |
| --- | --- | --- |
| 716-739 | `storage` | `KEY='matemostri:v2'`, `LEGACY_KEYS`, `store` get/set |
| 740-1396 | `model` | `MATH_STAGES` (741, the 15 lessons), `DIFFICULTIES` (764) with `badgeCount` (779), `cascadeBadges` (782) and `awardBadges` (787), `MONSTER_STAGE_DATA` (793), `PROGRESSION_NODES` (812), `MAP_ART_PANELS` (832), `EVOLUTIONS` (850), `COLLECTIBLES` (856); the den — `DEN_CANVAS` (887), `DEN_ROOMS` (888), `denSlotPoints` (913), `badgeTotal` (918), `denLevelOf` (920); the day count — `dayKey` (953), `MONTH_GOAL` (966), `daysOf` (969), `liveStreak` (981), `markLessonDay` (985) — `resumeOf` (1003), `storyProgressOf` (1013), `mapSceneLayout` (1016) and `mapPathD` (1053), the save-shape helpers, `migrate`, then `STORY_CHAPTERS` (1203) with `chaptersUnread` (1270), and `LESSON_GUIDES` (1280) with `guideFor` (1389) and `guideKey` (1394) |
| 1397-1563 | `pet` | `petSVG` (1399) fallback art, `monsterMarkup` (1492), then the den's placeholder rooms: `denSVG` (1509), drawn from `DEN_ROOMS`' anchors, and `denBackdrop` (1556), which serves a painting instead when a room has one |
| 1564-1582 | `sound` | WebAudio beeps |
| 1583-1624 | `speech` | `speakableText` (1592), `speechReady` (1597), `englishVoice` (1602), `speak` (1610) — all feature-detected, all no-ops without `speechSynthesis` |
| 1625-1756 | `column working model` | `buildColumn` (1628), `buildLongMultiplication` (1690), `twoDigitColumnAddition` (1729), `twoDigitColumnSubtraction` (1742) — pure step generators |
| 1757-2036 | `question generation` | `longDivisionPhase` (1761), `genDivision` (1766), the easy picture rules — `DOT_LIMIT` (1813), `easyNumber` (1821), `dotShareGroups` (1828), `dotLayouts` (1857), `fitDot` (1880), `stepDots` (1890), `longMulStepDots` (1900), `divStepDots` (1910) — then `pickPair` (1926), `generateLessonQuestion` (1930) and `divSteps` (2025) |

The test suite text-extracts these by name, so keep them as top-level
`function name(...)  {...}` declarations: `buildColumn`,
`buildLongMultiplication`, `twoDigitColumnAddition`,
`twoDigitColumnSubtraction`, `easyNumber`, `pickPair`, `commitColumnStep`,
`commitLongMultiplicationStep`, `colPrompt`, `longMulPrompt`, `renderCol`,
`renderLongMul`, `renderDiv`, `divSteps`, `divPlan`, `divPromptText`,
`longDivisionPhase`, `genDivision`, `generateLessonQuestion`,
`sessionPlan`, `renderStars`, `markQuestion`, `renderMenu`,
`renderDifficultyChoice`, `beginLesson`, `shouldShowCrackPause`,
`blankStageProgress`, `progressFromCount`, `normalizeStageProgress`,
`cascadeBadges`, `badgesFor`, `awardBadges`, `dropRetiredPlayerFields`,
`dotRows`, `dotShareGroups`, `dotLayouts`, `dotLayoutFits`, `fitDot`,
`easyDotsMarkup`, `paintDots`, `advanceDots`, `toggleStruck`, `stepDots`,
`longMulStepDots`, `divStepDots`, `dotBudget`, `hasBareText`, `partWords`,
`elementWords`, `speakableText`, `speechReady`, `speak`, `englishVoice`,
`offerSpeech`, `show`, `hushSpeech`, `storyProgressOf`,
`nextOpenColumnStep`, `selectColumnStep`, `pressDiv`, `blankBadges`,
`migrateV3StageProgress`, `migrateV4StageProgress`, `mapTrailPoints`,
`mapPathD`, `scrollMapToCurrent`, `dayBefore`, `daysOf`, `liveStreak`,
`markLessonDay`, `resumeOf`, `guideFor`, `renderGuideGrid`,
`renderGuideLines`, `renderGuide`, `chaptersUnread`, `renderTale`,
`renderChapter`, `openChapter`, `renderHome`, `endSession`,
`denSlotPoints`, `denLevelOf`, `denSVG`, `denBackdrop`, `denProps`,
`denPetStyle` and `renderDen`. It also matches the `MATH_STAGES`,
`DIFFICULTIES`, `LESSON_GUIDES`, `STORY_CHAPTERS`, `DEN_CANVAS` and
`DEN_ROOMS` tables and the `SESSION`, `DOT_SIZES`, `DOT_SEPARATOR`,
`DOT_ROWS_IN_WORKING`, `MONTH_GOAL`, `RETIRED_STAGE_IDS` and
`RETIRED_PLAYER_FIELDS` constants by source text, runs the whole `model`
section in a sandbox to exercise `migrate` end to end, and checks
`docs/DEN_ART_SPEC.json` against `DEN_ROOMS` so the artwork brief cannot
go stale.

### Script 2 — screens and session flow (2038-2852)

| Lines | Section | Notes |
| --- | --- | --- |
| 2039-2120 | `screens` | `$`, `esc` (2041), `hushSpeech` (2044) and `show` (2045); `STORY_SCENES` (2047), `renderPlayers` (2066), `renderHome` (2078) |
| 2121-2150 | `the story` | `renderTale` (2123), `openTale` (2138), `renderChapter` (2140), `openChapter` (2205) |
| 2151-2397 | `the den` | `denProps` (2155) and `denPetStyle` (2170), both reading `DEN_ROOMS`' anchors, `renderDen` (2175), `openDen` (2203); then `renderMenu` (2214) building the map, `scrollMapToCurrent` (2287), `openMapNode` (2294), and the guide pages: `renderGuideGrid` (2309), `renderGuideLines` (2326), `renderGuide` (2332), `openGuide` (2361), `beginLesson` (2374), `renderDifficultyChoice` (2379) |
| 2398-2425 | `settings` | `captureSettingsName`, `renderSettings` |
| 2426-2851 | `gameplay` | `SESSION` and `sessionPlan`, `renderStars` (2449), `startSession` (2462), `resumeLesson` (2475), `passOutOfReach` (2491), `nextQuestion` (2492), the easy pictures — `easyDotsMarkup` (2560), `settleDots` (2599), `paintDots` (2612), `wireDots` (2630) — `checkNormal` (2669), `showDayWon` (2710), `countToday` (2748), `award` (2753), `awardCollectible` (2765), `maybeCompleteStage` (2773), `endSession` (2800) |

### Script 3 — column UIs and wiring (2853-3498)

| Lines | Section | Notes |
| --- | --- | --- |
| 2854-3043 | `columns: addition, subtraction, multiplication` | `colPrompt` (2855), `dotBudget` (2885) and `fitCell` (2889), `renderCol` (2898), `nextOpenColumnStep` (2992), `commitColumnStep` (2997), `selectColumnStep` (3007), `pressCol` (3012), `finishCol` (3034) |
| 3044-3151 | `two-digit long multiplication` | `longMulPrompt` (3045), `longMulSlot` (3059), `renderLongMul` (3065), `commitLongMultiplicationStep` (3111), `selectLongMulStep` (3121), `pressLongMul` (3126), `finishLongMul` (3145) |
| 3152-3294 | `division in columns` | `divPlan` (3155), `divPromptText` (3165), `renderDiv` (3175), `selectDivStep` (3244), `pressDiv` (3249), `finishDiv` (3284) |
| 3295-3309 | `hidden developer spellbook` | `renderDeveloper` (3296), `resetPlayerProgress` (3304) |
| 3310-3497 | `wiring` | every event listener, `SPEAK_PANELS` (3355) and `offerSpeech` (3395), `hasBareText`/`partWords`/`elementWords` (3375-3394), the story shelf and den buttons, the map resize re-layout, dev-tap unlock, boot |

Note on long division: question generation lives in `longDivisionPhase`
and `genDivision` plus `generateLessonQuestion` in script 1, while the
working UI is `divPlan`/`renderDiv`/`pressDiv` in script 3. The two are
independent — changes to what a question looks like belong in the former
and should leave the latter untouched. The words the child reads during
the working are `divPromptText`, and the summary at the end is in
`finishDiv`.

Note on the map: `renderMenu` must run *after* `show('s-menu')`. Scene
heights are measured from the map's width, and a hidden element measures
0, which silently collapses the layout back to full-width sizes while the
painted panels scale down. A test pins the ordering.

Other documents: `STORY_MAP.md` is the child-facing journey and the map
layout contract, `EVOLUTION_ROADMAP.md` the 17 art stages and where they
land, `CURRENT_STATE.md` the implementation notes, `docs/MAP_ART_SPEC.json`
and `docs/MAP_ART_GUIDE.svg` the map artwork blueprint, and
`docs/DEN_ART_SPEC.json` with `docs/DEN_ART_GUIDE.svg` the same for the den
rooms — both generated by `node tools/den-art-spec.js`, which is the only
thing in `tools/` and is not part of the app.
