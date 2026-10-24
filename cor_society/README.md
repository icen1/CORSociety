# cor_society Runtime Package

This folder is the installable Roman Society mod package.

Current runtime version: `1.1.331`.

Use the root documentation as the source of truth:

- [Roman Society README](../README.md)
- [1.1.332 changelog](../logs/1.1.332.md), for the coming release
- [1.1.331 changelog](../logs/1.1.331.md)
- [1.1.330 changelog](../logs/1.1.330.md)
- [1.1.329 changelog](../logs/1.1.329.md)
- [1.1.328 changelog](../logs/1.1.328.md)
- [1.1.326 changelog](../logs/1.1.326.md)
- [1.1.325 changelog](../logs/1.1.325.md)
- [1.1.324 changelog](../logs/1.1.324.md)
- [1.1.323 changelog](../logs/1.1.323.md)
- [1.1.322 changelog](../logs/1.1.322.md)
- [1.1.321 changelog](../logs/1.1.321.md)
- [1.1.320 changelog](../logs/1.1.320.md)
- [1.1.319 changelog](../logs/1.1.319.md)
- [1.1.318 changelog](../logs/1.1.318.md)
- [1.1.317 changelog](../logs/1.1.317.md)
- [1.1.316 changelog](../logs/1.1.316.md)
- [1.1.315 changelog](../logs/1.1.315.md)
- [1.1.314 changelog](../logs/1.1.314.md)
- [1.1.313 changelog](../logs/1.1.313.md)
- [1.1.312 changelog](../logs/1.1.312.md)
- [1.1.311 changelog](../logs/1.1.311.md)
- [1.1.310 changelog](../logs/1.1.310.md)
- [1.1.309 changelog](../logs/1.1.309.md)
- [1.1.308 changelog](../logs/1.1.308.md)
- [1.1.307 changelog](../logs/1.1.307.md)

## Testing console commands (vanilla command console)

Paste these into the game's daapi command console to jump straight to a rank (for
testing the Senate & Politics system):

```js
// Become Dictator immediately:
daapi.invokeMethod({ event: "/cor_society/engine", method: "debugMakeDictator" })

// Become Emperor (Imperator) immediately:
daapi.invokeMethod({ event: "/cor_society/engine", method: "debugMakeEmperor" })
```

Both open the Senate & Politics screen afterwards. The Emperor command also marks
you as having been Dictator (the first Emperor must pass through the dictatorship).

To measure a month, turn the profiler on, advance a few months, and read its one-line report:

```js
window.corSocietyProfile = true
corSocietyPerf()
```

Each performance change has a switch that restores the older behaviour (`window.<name> = true`):
`corSocietyDisableLiveState`, `corSocietyDisableNoopFilter`, `corSocietyDisableRefreshCoalescing`,
`corSocietyDisableMonthlySlicing` (`corSocietyMonthlySliceMs` sets the slice), `corSocietyDisableSnapshotCache`
and `corSocietyDisableDeadButtonStrip`.

## Module Layout

- `engine.js` boots the shared `window.corSociety` object and applies the module mixins.
- `modules/index.js` registers the module manifest and its load order. The modules are mixed into
  `window.corSociety` in that order, so a later module replaces an earlier module's method of the
  same name; to change an earlier method from a later module, wrap it.

In load order:

1. `modules/config.js` stores constants, social orders, names, portrait assets, crest palettes, and Roman place names.
2. `modules/core_startup.js` loads, saves, compacts, and initializes Society state, and registers the actions.
3. `modules/presentation.js` builds Society modals: option tooltips, stat-change previews, summaries, and icons.
4. `modules/dynasty_model.js` owns dynasty, house, cadet branch, membership, headship, and validation logic.
5. `modules/people_generation.js` generates houses, relatives, portraits, ancestors, and genealogy connectors.
6. `modules/monthly_economy.js` runs the monthly tick in short slices after the game's own month step: house economy, property, loans, and simulation batches.
7. `modules/house_life_romance_slaves.js` runs marriage, pregnancy, romance, slavery, retirement, banking, and household-life systems.
8. `modules/relations_events.js` manages house and personal relations, social events, and player choices.
9. `modules/menus.js` builds Society menus and graphical family trees.
10. `modules/actions_status.js` contains player actions, player status, marriage rules, Society traits, and action availability.
11. `modules/crests.js` draws the house shields.
12. `modules/portraits_wardrobe.js` resolves portraits and recolours outfits.
13. `modules/roster_overlays.js` adds overlays to the game's screens: statuses, portraits, family buttons, and crests.
14. `modules/log_utils.js` holds the log, the debug console, month keys, the live view of the game state (read without copying it), the filter that skips writes changing nothing, the one-rebuild-per-task refresh, and helpers.
15. `modules/politics.js` owns Senate & Politics: factions, land claims, abduction, dictator, emperor, laws, and imperial actions.
16. `modules/migrations.js` holds the one-time save repairs of the migration ladder (steps 3-8).
17. `modules/technical_safety.js` performs bounded migration, pruning, and integrity checks for advanced Society data.
18. `modules/roman_systems.js` owns crimes, courts, prisons, laws, cursus honorum, clientela, legions, coalitions, religion, intrigue, adoption, and property-crisis systems.
19. `modules/diagnostics.js` keeps whole-state copies out of the game's saved session error log and runs the opt-in month profiler.
20. `modules/population.js` keeps dead generated characters out of the game's character count, prunes the unreachable dead once a year, and sweeps stale Play As and Murder buttons monthly.
21. `modules/family.js` owns the family rules on top of the game's: the inheritance on marriage for every household descendant, the marriage screen's three choices, the guards against charging the whole estate, and the names of the women of the player's gens.
22. `modules/politics_integration.js` connects the Society's politics to the game (elections, traits, statuses, income, wars) and scales political prices with the economy.

Do not use this file as a changelog. Structured logs now live in `../logs/`.
