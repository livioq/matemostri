# Collectibles v2

## Goal

Treasure hunting should reward both progression and useful repetition. A child who is stuck on a new lesson should still have a reason to revisit a lesson they can do, while repeating the easiest lesson must never unlock the whole collection.

## Core model

There are eight treasure families. Each family has three specimens, one associated with each difficulty tier. This gives 24 distinct treasures.

| Family | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Flowers | Daisy Glow | Sunrise Lily | Aurora Orchid |
| Shells | Pearl Shell | Spiral Conch | Nautilus Pearl |
| Crystals | Amethyst Chip | Crystal Cluster | Star Crystal |
| Feathers | Sky Feather | Peacock Feather | Phoenix Feather |
| Fruits | Berry Bud | Moonfruit | Rainbow Fruit |
| Insects | Leaf Beetle | Jewel Butterfly | Emerald Dragonfly |
| Fish | Coral Minnow | Reef Angelfish | Galaxy Whale |
| Constellations | Twinkle Star | Shooting Star | Celestial Crown |

The eight positions in the den remain treasure families. The best specimen found in each family is what appears on the main shelf. A family can later open a small collection view showing all three specimens and their quantities.

## Progression controls what can be found

Every map location has a treasure pool that fits that place. Reaching new locations expands the pool. Difficulty controls the highest tier available.

Easy can eventually discover all eight families, so a child who is comfortable only on Easy can still build a complete and attractive basic den.

Medium makes the eight Medium specimens available. Hard makes the eight Hard specimens available. A child cannot obtain a Medium or Hard specimen simply by repeating Easy.

A treasure cannot be found before at least one reached map location makes its family available.

## Replays remain rewarding

A successful replay of a completed lesson always gives a treasure-hunting reward when the child's score reaches the normal pass threshold.

The replay draws only from specimens that are already eligible for that player, based on reached locations and the difficulty actually played. It may therefore award another copy of an existing specimen. It never reaches forward into a later location or higher difficulty tier.

This means a child stuck on a new lesson can deliberately return to a favourite old location and hunt for treasures there without bypassing curriculum progression.

## First completion versus replay

A first successful completion of a lesson/difficulty combination should favour discovery. If an eligible specimen exists that the player has never found, choose an unfound specimen before choosing a duplicate.

A replay is primarily treasure hunting. Choose among the eligible specimens for that lesson/location and difficulty. Duplicates are expected and useful.

If a replay beats the player's previous mastery score for that lesson/difficulty, give a second treasure draw. A perfect 10/10 on a replay also gives a second draw, but never more than one bonus draw per session.

This makes improving an old score more valuable than mindless repetition.

## Duplicates have value

Quantities remain in the save. They are no longer meaningless counters.

Suggested presentation milestones for each specimen:

- 1 copy: specimen discovered.
- 5 copies: sparkling display treatment.
- 10 copies: master display treatment.

These are presentation upgrades, not access to later treasure tiers. Ten Twinkle Stars never become a Shooting Star.

Future den decorations can also be granted at aggregate duplicate milestones without changing the treasure eligibility rules.

## Location pools

Use the map's existing locations rather than a global random pool. Exact family assignment can be tuned, but the intended pattern is:

- woodland/garden locations: flowers, berries, leaves, mushrooms
- cliffs/sky locations: feathers, stars
- caves/ruins: crystals, mushrooms
- magical late-game locations: stars, crystals, feathers and rarer mixed pools
- shore/final regions: shells and late-game mixed pools

Every family must become available somewhere on the Easy journey before the final lesson, so an Easy-only child can complete the eight-family basic collection.

## Reward rules

1. The session must reach the normal mastery/pass threshold.
2. Determine the map node for the lesson.
3. Determine treasure families available at that node.
4. Cap specimen tier at the difficulty actually played.
5. Never include a specimen whose required tier has not been earned/played.
6. On a new lesson/difficulty badge, prefer an eligible specimen not yet owned.
7. On a replay, draw from the eligible local pool, including duplicates.
8. If the replay sets a new mastery best or scores 10/10, make one bonus draw.
9. Repeating a lesson never unlocks treasure families belonging only to unreached locations.
10. Quantities may grow without limit, but collection completion is based on distinct specimens, not quantity.

## Save migration

The current save has counters by family. Preserve those rewards.

For each old family with quantity greater than zero, grant that quantity as the Easy specimen of the same family. The retired families map without loss: Berries to Fruits, Mushrooms to Insects, Lucky Leaves to Fish, and Magic Stars to Constellations. Do not infer Medium or Hard specimens from old duplicate counts. Existing Medium/Hard badges remain untouched and will make their tiers available through normal future play.

`collectibleSpecimens` stores three quantities per family in Easy, Medium, Hard order while the existing `collectibles` family total remains available for aggregate rewards. Migration version 10 performs this conversion idempotently.

Also add per lesson/difficulty best mastery scores for the replay-improvement bonus. Existing saves begin with no recorded best; the first session after migration establishes the baseline rather than receiving an improvement bonus.

## Den behaviour

The den continues to grow from badge totals at 1, 15, 30 and 45 badges. Badge progression and treasure progression remain separate.

The main den shows one representative per family, using the highest-tier specimen owned. Quantities and the other specimens belong in the family detail view. Empty families remain visible as silhouettes/question marks so there is always something left to seek.

Each summary card is tappable. Its status panel names the displayed specimen and difficulty tier, gives the total collected, and states the exact number remaining to the next duplicate-display milestone. At 10 copies it reports that the Master display is complete instead of inventing another target.

The 24 production files are transparent 256×256 WebP assets named `assets/collectibles/{family}-{tier}.webp`, where tiers 1, 2 and 3 mean Easy, Medium and Hard. They are rendered above the separate cabinet overlay and below Momo.

## Design principle

Badges measure maths mastery. Momo's evolution measures curriculum progress. Treasures measure exploration and replay. The den is the place where those rewards become visible.
