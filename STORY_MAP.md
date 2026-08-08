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
2. Continue opens the adventure map.
3. The current map node pulses.
4. Tapping an unlocked node opens a short story card.
5. Start Lesson opens the existing maths interface.
6. Completing a new lesson unlocks the next node and may evolve Momo.
7. Continue Adventure returns to the map.
8. Practise Again replays the same lesson without advancing story.

Completed map nodes stay replayable for collectibles.
