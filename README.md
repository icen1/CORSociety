# Roman Society

Roman Society is a Citizen of Rome mod that adds a persistent social layer around the vanilla character, dynasty, marriage, property, and pregnancy systems.

Current development version: `1.1.329`.

## Design Goals

- Keep houses, dynasties, marriages, slavery, banking, and family trees tied to real game characters whenever possible.
- Preserve performance on Android by using bounded monthly batches, scoped tree rendering, and capped historical memory.
- Prefer repair and migration of Society-only data over preserving old internal save shapes that cause bad trees or unstable UI.
- Keep fabricated dead ancestors and connector relatives as an intentional genealogy feature, but make them coherent, bounded, and useful.
- Keep the achievement compatibility hook intentional: the mod clears its own mod-used flag while vanilla easy/sandbox restrictions still apply.

## Entry Points

Roman Society registers current-character actions instead of filling the global action bar:

- `Roman Society`
- `House Shield`
- `Family Wardrobe`
- `Bank of Rome`
- `Crimes, courts, and prison`, inside the Society hub below Bank of Rome
- `Household Slaves`
- `Path to Freedom`, when the current player character is enslaved

The bundled modules also expose integrated versions of Play As, Attempt Murder, animal stealing, Disinherit, Restore Inheritance, Bank of Rome, Coemptio, and Household Slaves.

## Roman Systems

Version `1.1.329` integrates the full advanced Society plan as bounded Society systems instead of duplicate vanilla systems.

- Crimes, courts, prison, tax fraud, accusations, pardons, escapes, and legionary sentence alternatives live in the Society hub. Legion sentences reuse vanilla-style military service flags and icons so the character appears as away at war/service instead of using a parallel status.
- Roman power systems add cursus honorum, clientela, factions, coalitions, dictatorship pressure, imperial laws, spies, hooks, adoption, cognomina, property crises, and monthly technical safety passes.
- Every Society law exposed by the Roman power systems has a description/tooltip explaining what it changes.
- The Society hub no longer shows the old Monthly life summary box.
- Slave purchases now register real household slave records and player-house membership links; enslaved characters use a slave-focused character menu instead of the normal free-citizen menu.
- Wardrobe portrait changes are isolated per character so changing the player outfit does not overwrite the spouse portrait.
- Private loan amount buttons use the game stat-change icon as the accepted amount display, with details kept in the tooltip.

## Dynasties And Houses

Roman Society separates dynasties from houses.

- A dynasty is the wider vanilla blood/name group.
- A house is a Society branch inside a dynasty.
- Each dynasty has an active origin or successor house, may create cadet houses, and tracks a current head house separately from the origin name.
- Cadet houses keep `parentHouseId`, `founderId`, `branchRootId`, `createdAtTurn`, and branch metadata.
- Strong cadet houses can become the head house without renaming the dynasty or erasing the origin branch.

The model now uses two kinds of maintenance:

- Versioned migration repairs old Society save layouts when the mod version changes.
- Monthly/lightweight maintenance keeps active dynasty invariants valid: house lists, origin/head references, cadet parent houses, and branch membership.

This split keeps the expensive repair behavior controlled while still preventing stale active data from accumulating after births, deaths, cadet creation, house retirement, or player succession.

## Family Trees And Ancestors

Fabricated ancestors are part of the design.

Generated houses, player dynasty preparation, and dynasty tree repair may create dead parents, grandparents, collateral ancestors, and dead co-parents. These characters are real generated game characters marked with Society connector flags. They exist so trees have believable roots and branches instead of loose one-person islands.

The current rules are:

- Tree and dynasty repair may fabricate dead connectors when needed.
- Living filler is bounded and only used by systems that intentionally seed or preserve a branch.
- House trees filter to the selected house branch.
- Dynasty trees stay inside the selected dynasty and its houses.
- External spouses may appear as spouse cards, but they are not used as roots or expandable members of the selected house.
- Slaves and slave-market characters stay outside free house and dynasty tree expansion unless a specific slave system is showing them.

## Marriage And Family Simulation

Society marriages use the game's `daapi.performMarriage` API. If the game rejects a marriage, Society does not fake the spouse link.

Marriage compatibility now checks:

- Both characters are alive, unmarried, adult, free, and allowed to marry.
- They are different genders.
- They are not from the same dynasty.
- They are not close blood relatives through known parent or ancestor links.
- Cadet-house marriages use the actual source house of each spouse, not only the dynasty id.

Pregnancies use `daapi.impregnate`, leaving birth resolution to the base game. Society then refreshes house and dynasty membership from real character links.

## Social Orders

Roman Society groups houses into social orders:

- Senatorial houses
- Equestrian houses
- Civic citizens
- Plebeian citizens
- Freedmen
- Slaves

The slave order still uses the internal `poor` key for save compatibility.

Order classification uses available game data: prestige, heritage, property status, jobs, Senate links, inheritance, living members, and simulated AI resources.

## Slavery

Roman Society represents slaves as real characters where possible.

Slave systems include:

- Household slaves with assignable work.
- Slave market offers.
- Debt-bondage, condemnation, renegade, and foreign-origin slavery notes.
- Private-company pregnancy risk and hidden paternity.
- Manumission into a new Freedmen house.
- Self-purchase savings for owned slaves.
- Freedman rescue attempts for enslaved relatives.

False slave flags on legitimate player family members are repaired conservatively. Slave-born bastards remain distinct unless a later system manumits or legitimizes them.

## Economy And Politics

NPC houses are simulated as virtual players with cash, influence, prestige, property, stability, agendas, allies, rivals, favors, patronage, trade ties, loans, and family events.

House property uses vanilla Citizen of Rome property keys, values, revenue, stewardship limits, economy-of-scale behavior, sale rates, and senatorial commercial restrictions.

Bank of Rome includes:

- Player bank loans.
- Player private lending to houses.
- Player borrowing from wealthy houses.
- NPC-to-NPC private loans.
- Debt-bond consequences when loans default.

## UI And Portraits

Roman Society uses vanilla Citizen of Rome portrait assets and stores lightweight Society outfit choices instead of unsafe custom persistent looks.

The graphical tree UI includes:

- Portrait cards.
- Spouse links.
- Children branches.
- House crest labels.
- Origin/cadet house labels.
- Back navigation.
- Dark/light theme detection.
- Runtime tree context caching per month.

## Debugging

Open the in-game DAAPI/developer command console and run:

```js
corSocietyDebug()
```

Useful variants:

```js
corSocietyDebug("log")
corSocietyDebug("houses")
corSocietyDebug("systems")
corSocietyDebug("full")
```

If the platform command scope does not expose bare globals, use:

```js
daapi.corSocietyDebug()
daapi.invokeMethod({ event: "/cor_society/engine", method: "openDebugConsole" })
```

The debug snapshot stores its last result in the `corSocietyLastDebugSnapshot` global flag. The dynasty/house validator reports invalid origins, missing head houses, cadet parent problems, member contamination, and close-kin marriages.

## Changelog

The old README had become a mixed feature list and changelog. Starting with `1.1.307`, version notes live in `logs/`.

Latest structured changelog: [logs/1.1.329.md](logs/1.1.329.md).

See [logs/1.1.307.md](logs/1.1.307.md) for the first structured changelog entry and the corrected historical notes recovered from the previous README.

## Bundled Mod Credits

The bundled Play As, Murder, Stealing From, and Open DevTools snippets come from `CitizenOfRomeDynastyAscendant` / the Citizen of Rome example mod ecosystem and are included with paths adapted for Roman Society.

Disinheritance and Restore Inheritance are adapted from local `CORmods` versions.

Bank of Rome, Coemptio, and Household Slaves are based on older open `peritiSumus/CoR-Mods` mods, with mechanics and assets integrated into Roman Society's house, character, slave, banking, and matchmaking simulation.
