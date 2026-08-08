# Evolution Roadmap

Not a roadmap any more: the 17-stage progression is built. This is what
it actually is, generated from `EVOLUTIONS` and `PROGRESSION_NODES` in
`index.html`. If it disagrees with the code, the code is right and this
file needs regenerating.

## The seventeen stages

`completed` is how many lessons the child has finished. Momo's art for a
given player is `artForCount(completedCount(p))`, except during the very
first lesson — see the half step below.

| Lessons done | Stage | Momo | Map stop that earns it | Lesson | |
|---:|---:|---|---|---|---|
| 0 | 1 | Magical Egg | — | — |  |
| 0.5 | 2 | First Crack | — | — |  |
| 1 | 3 | Hatched Friend | The Mysterious Egg | One-digit addition |  |
| 2 | 4 | Fluffy Ears | Whispering Woods | Two-digit column addition |  |
| 3 | 5 | Bright Tail | Starlight Trail | Two-digit mental addition |  |
| 4 | 6 | Wide Wings | Windy Cliffs | Three-digit column addition |  |
| 5 | 7 | Addition Flight | The Great Chasm | Four-digit column addition | **major** |
| 6 | 8 | Backpack Explorer | Explorer's Valley | One-digit subtraction |  |
| 7 | 9 | Explorer Goggles | Crystal Caves | Two-digit column subtraction |  |
| 8 | 10 | Magic Marks | The Rune Ruins | Two-digit mental subtraction |  |
| 9 | 11 | Flower Crown | The Enchanted Garden | Three-digit column subtraction |  |
| 10 | 12 | Subtraction Guardian Light | The Guardian Gate | Four-digit column subtraction | **major** |
| 11 | 13 | Star Cape | The Star Fields | Single digit × single digit |  |
| 12 | 14 | Celestial Wings | The Celestial Heights | Single digit × two digits |  |
| 13 | 15 | Multiplication Mage | The Magician's Tower | Two digits × two digits | **major** |
| 14 | 16 | Arcane Master | The Arcane Library | Simple division |  |
| 15 | 17 | Guardian of Maths | The Heart of Matemostri | Long division | **major** |

## The half step

Stage 2, First Crack, is the only stage not earned by finishing a lesson,
which is why its `completed` is 0.5. It appears partway through the first
lesson: after five questions, if at least four were mastered, the lesson
pauses on the `s-crack` screen and then resumes. `shouldShowCrackPause`
decides, and `storyProgress.firstCrackSeen` remembers, so it happens once.
`artForPlayer` is what reads it — a player with no lessons done but the
crack seen shows stage 2 rather than stage 1.

## The four major evolutions

| Stage | Momo | Earned by |
|---:|---|---|
| 7 | Addition Flight | Four-digit column addition, at The Great Chasm |
| 12 | Subtraction Guardian Light | Four-digit column subtraction, at The Guardian Gate |
| 15 | Multiplication Mage | Two digits x two digits, at The Magician's Tower |
| 17 | Guardian of Maths | Long division, at The Heart of Matemostri |

Each closes out one operation. Majors use the larger transition
presentation, showing the previous and the new Momo side by side; the
others use the ordinary overlay. `majorEvolution:true` on the node is
what marks them, and a test pins all four.

## Art

Every stage has production art in `assets/monsters`, named
`stage-NN-slug.webp` and listed in `MONSTER_STAGE_DATA` and in
`assets/monsters/stages.json`. There is no SVG fallback stage left
unpainted, though `petSVG` still exists as the `onerror` fallback if a
file fails to load.

## Related

- `STORY_MAP.md` — the child-facing journey and the map layout contract
- `CURRENT_STATE.md` — implementation notes
- `CLAUDE.md` — constraints, teaching rules and the code map
