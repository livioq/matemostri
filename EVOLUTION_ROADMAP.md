# Evolution Roadmap – Matemostri

This document captures the agreed evolution design so any agent continuing the project can follow it.

## Goals
- One **noticeable visual change** after every completed lesson (15 lessons total).
- **Big celebratory jumps** when a whole operation group is finished.
- Stages 4 and 5 must feel clearly different (ears-only → ears + first wings + pink cheeks).
- Production art for stages 1–5 is **locked** – do not redesign or regenerate them.
- Later stages need transparent production art (WebP preferred). Until then the SVG fallback is used.

## Lesson order (15 total)

**Addition (1–5)**  
1. One-digit addition  
2. Two-digit column addition  
3. Two-digit mental addition  
4. Three-digit column addition  
5. Four-digit column addition  

**Subtraction (6–10)**  
6. One-digit subtraction  
7. Two-digit column subtraction  
8. Two-digit mental subtraction  
9. Three-digit column subtraction  
10. Four-digit column subtraction  

**Multiplication (11–13)**  
11. Single × single  
12. Single × two-digit  
13. Two-digit × two-digit  

**Division (14–15)**  
14. Simple division  
15. Long division  

## Evolution table

| Completed | Art | Title / what the child notices | Jump size | Notes |
|-----------|-----|--------------------------------|-----------|-------|
| 0 | 1 | Magical Egg – glowing heart | — | Start |
| 1 | 2 | Cracked Egg – bigger cracks, stronger glow | Small | |
| 2 | 3 | Hatchling – fully out of the shell | Medium | |
| 3 | 4 | Fluffy Ears – large soft ears appear | Medium | |
| 4 | 5 | Pink Cheeks + first tiny wings | Medium–Big | Makes 4→5 distinct |
| **5** | **6** | **Bright Tail** – long glowing, sparkling tail | **Big** | End of Addition |
| 6 | 7 | Wings grow more defined | Small | |
| 7 | 8 | Soft Scarf appears | Small–Medium | |
| 8 | 9 | Backpack + more confident pose | Medium | |
| 9 | 10 | Goggles | Medium | |
| **10** | **11** | **Pencil Wand + Explorer energy** | **Big** | End of Subtraction |
| 11 | 12 | Starts hovering slightly | Medium | |
| 12 | 13 | Magic marks appear on the body | Medium | |
| **13** | **14** | **Larger wings + Flower Crown** | **Big** | End of Multiplication |
| 14 | 15 | More regal / wiser expression + stronger glow | Medium | |
| **15** | **16–20** | **Guardian path** (Apprentice → Young → Royal Guardian of Maths) | **Biggest** | Final – Guardian of Maths |

## Implementation notes for agents

- Expand or replace the current sparse `EVOLUTIONS` array so every lesson completion maps to the art stage above.
- `MONSTER_STAGES` / `stages.json` already define 20 slots. Only stages 1–5 have `assetReady: true`.
- Big-jump stages (6, 11, 14, final) should also get special copy in the unlock / level-up overlay.
- Accessories (scarf, backpack, goggles, pencil wand, flower crown, etc.) remain complementary and continue to unlock via the collectible system.
- All new production art must have **transparent backgrounds**.

See also `CLAUDE.md` for the full project constraints and code map.
