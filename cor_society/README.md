# cor_society Runtime Package

This folder is the installable Roman Society mod package.

Current runtime version: `1.1.330`.

Use the root documentation as the source of truth:

- [Roman Society README](../README.md)
- [1.1.330 changelog](../logs/1.1.330.md)
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

## Module Layout

- `engine.js` boots the shared `window.corSociety` object and applies module mixins.
- `modules/index.js` registers the module manifest and boot order for the 1.1.330 mixins.
- `modules/config.js` stores constants, social orders, names, portrait assets, and crest palettes.
- `modules/core_startup.js` loads, saves, compacts, and initializes Society state.
- `modules/dynasty_model.js` owns dynasty, house, cadet branch, membership, and validation logic.
- `modules/people_generation.js` generates houses, relatives, portraits, ancestors, and genealogy connectors.
- `modules/monthly_economy.js` runs monthly house economy, property, loan, and simulation batches.
- `modules/house_life_romance_slaves.js` runs marriage, pregnancy, romance, slavery, retirement, and household-life systems.
- `modules/technical_safety.js` performs bounded migration, pruning, and integrity checks for advanced Society data.
- `modules/roman_systems.js` owns crimes, courts, prisons, laws, cursus honorum, clientela, legions, coalitions, religion, intrigue, adoption, and property-crisis systems.
- `modules/relations_events.js` manages social events and player choices.
- `modules/menus.js` builds Society menus and graphical family trees.
- `modules/actions_status.js` contains player status, marriage rules, Society traits, and action availability.
- `modules/crests.js`, `modules/portraits_wardrobe.js`, `modules/roster_overlays.js`, and `modules/log_utils.js` provide presentation support.

Do not use this file as a changelog. Structured logs now live in `../logs/`.
