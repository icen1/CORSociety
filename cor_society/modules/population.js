{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyPopulation() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyPopulationVersion === '1.1.331') {
        return
      }
      // Keeps NPCs from dying the month the game first looks at them. The
      // game's natural-death roll multiplies the risk of everyone outside the household and the
      // former household by 1 + state.characterIds.length / 15, and divides NPC fertility by the
      // same. The game rebuilds characterIds from every record on load and every month 3, and the
      // mod keeps thousands of dead generated records (ghost parents, connectors, dead house
      // members), so in a real save the count was 4,685 for 199 living people: every NPC, the
      // player's in-laws included, died at its first check. The records stay in state.characters
      // (trees and houses need them); only dead generated ones that no tree of the player's family
      // starts from are left out of the list. Disable with window.corSocietyDisablePopulationTrim = true.
      Object.assign(window.corSociety, {
        livingGeneratedCount(society, state) {
          // How many generated people are alive, for the generation budgets (140/180/260/320/420).
          // society.generatedCharacterIds is only a window of the last 420 ids, dead and ghost parents
          // included: compared with the budgets, a mature save stayed at 420 and never generated
          // anyone again, and houses aged out to extinction. Counts
          // the flag over all records (living people fall out of the window), cached per state copy,
          // plus ids appended to the window since that count (generated earlier in this loop, so
          // missing from the copy or mirrored into it). Ids of pruned records are never counted.
          state = state || daapi.getState()
          let characters = (state && state.characters) || {}
          let ids = (society && society.generatedCharacterIds) || []
          this._livingGeneratedCache = this._livingGeneratedCache || new WeakMap()
          let entry = this._livingGeneratedCache.get(characters)
          if (!entry) {
            entry = { base: 0, lastId: ids.length ? String(ids[ids.length - 1]) : '' }
            Object.keys(characters).forEach((id) => {
              let character = characters[id]
              if (character && character.corSocietyGenerated && !character.isDead) {
                entry.base += 1
              }
            })
            this._livingGeneratedCache.set(characters, entry)
          }
          let from = entry.lastId ? ids.map(String).lastIndexOf(entry.lastId) + 1 : 0
          let pending = from > 0 || !entry.lastId
            ? ids.slice(from).filter((id) => !(characters[id] && characters[id].isDead)).length
            : 0
          return entry.base + pending
        },
        stripStaleCharacterButtons(state) {
          // The bundled murder and play_as sub-mods store a per-character button, with its icon inline,
          // and the game re-serializes them with the whole state on every save and month. The game runs
          // per-character events for the living only, so the dead kept theirs (6.3 MB of a 12.2 MB state
          // in a real save); Play As is now offered in the household only, and the murder icon is small.
          // Bring every record in line: the dead lose both buttons, Play As stays only on household
          // members other than the played character, and stored murder icons become the current one.
          // Live store state, worker idle; written directly, so the game rebuilds nothing.
          if (typeof window !== 'undefined' && window.corSocietyDisableDeadButtonStrip) {
            return 0
          }
          let characters = (state && state.characters) || {}
          let current = (state && state.current) || {}
          let household = {}
          ;(current.householdCharacterIds || []).forEach((id) => {
            household[String(id)] = true
          })
          let murderIcon = ''
          try {
            murderIcon = this.daapiReady && this.daapiReady() ? daapi.requireImage('/cor_society/bundled/murder/plot.svg') || '' : ''
          } catch (err) {
            murderIcon = ''
          }
          let changed = 0
          Object.keys(characters).forEach((id) => {
            let character = characters[id]
            let actions = character && character.actions
            if (!actions || (!actions.mod_murder_startPlot && !actions.play_as)) {
              return
            }
            let rest = null
            let edit = () => rest || (rest = Object.assign({}, actions))
            if (character.isDead) {
              delete edit().mod_murder_startPlot
              delete edit().play_as
            } else {
              if (actions.play_as && (!household[String(id)] || String(id) === String(current.id))) {
                delete edit().play_as
              }
              let plot = actions.mod_murder_startPlot
              if (plot && murderIcon && plot.icon !== murderIcon) {
                edit().mod_murder_startPlot = Object.assign({}, plot, { icon: murderIcon })
              }
            }
            if (rest) {
              character.actions = rest
              changed += 1
            }
          })
          return changed
        },
        populationPruneProtectedIds(state, society) {
          // Who a yearly prune must keep: everyone alive, the household, former household and played
          // characters, the player's whole family (descendants of the player's ancestors, spouses, and
          // the player's dynasty), and the members of archived extinct houses. Then, repeatedly, the
          // ancestors and spouses of everyone kept.
          let characters = state.characters || {}
          let current = state.current || {}
          let seeds = []
          Object.keys(characters).forEach((id) => {
            if (characters[id] && !characters[id].isDead) seeds.push(id)
          })
          seeds = seeds.concat(current.householdCharacterIds || [], current.formerHouseholdCharacterIds || [], current.playedCharacters || [], [current.id])
          let roots = []
          let seenRoots = {}
          let up = [current.id].concat(current.playedCharacters || [])
          while (up.length) {
            let id = up.pop()
            if (!id || seenRoots[String(id)]) continue
            seenRoots[String(id)] = true
            roots.push(id)
            let character = characters[id]
            if (character) up.push(character.fatherId, character.motherId)
          }
          let seenDown = {}
          let down = roots.slice()
          while (down.length) {
            let id = down.pop()
            if (!id || seenDown[String(id)]) continue
            seenDown[String(id)] = true
            seeds.push(id)
            let character = characters[id]
            if (!character) continue
            if (character.spouseId) seeds.push(character.spouseId)
            ;(character.childrenIds || []).forEach((childId) => down.push(childId))
          }
          let player = characters[current.id]
          let playerDynastyId = player && player.dynastyId
          let deadHouses = (society && society.deadHouses) || {}
          Object.keys(characters).forEach((id) => {
            let character = characters[id]
            if (!character) return
            if (playerDynastyId && character.dynastyId === playerDynastyId) seeds.push(id)
            if (character.corSocietyHouseId && deadHouses[String(character.corSocietyHouseId)]) seeds.push(id)
          })
          Object.keys(deadHouses).forEach((houseId) => {
            let house = deadHouses[houseId] || {}
            ;['memberIds', 'notableIds', 'knownMemberIds'].forEach((key) => (house[key] || []).forEach((id) => seeds.push(id)))
            ;['headId', 'founderId'].forEach((key) => house[key] && seeds.push(house[key]))
          })
          return this.populationPruneClosure(characters, seeds, new Set())
        },
        populationPruneClosure(characters, seeds, kept) {
          let stack = seeds.slice()
          while (stack.length) {
            let id = stack.pop()
            if (id === undefined || id === null || id === '' || kept.has(String(id))) continue
            kept.add(String(id))
            let character = characters[id]
            if (!character) continue
            stack.push(character.fatherId, character.motherId, character.spouseId)
          }
          return kept
        },
        planPopulationPrune(state, society) {
          // Dead records the yearly prune would delete. Any reference to one from anywhere except
          // the derived lists the prune cleans (characterSocial/socialRecords keys, the generated-id
          // window, houses' knownMemberIds, kept characters' childrenIds) protects it, so a
          // reference nobody anticipated keeps the record instead of dangling.
          let characters = state.characters || {}
          let kept = this.populationPruneProtectedIds(state, society)
          for (let round = 0; round < 6; round += 1) {
            let prune = new Set(Object.keys(characters).filter((id) => characters[id] && characters[id].isDead && !kept.has(String(id))))
            let referenced = []
            let scan = (value, path, depth) => {
              if (value === null || value === undefined || depth > 12) return
              if (typeof value === 'string') {
                if (prune.has(value)) referenced.push(value)
                return
              }
              if (typeof value !== 'object') return
              Object.keys(value).forEach((key) => {
                let childPath = path + '.' + key
                if (/^society\.(characterSocial|socialRecords)$/.test(path) || childPath === 'society.generatedCharacterIds' || /^society\.houses\.[^.]+\.knownMemberIds$/.test(childPath) || /^characters\.[^.]+\.childrenIds$/.test(childPath)) {
                  return
                }
                if (prune.has(key)) referenced.push(key)
                scan(value[key], childPath, depth + 1)
              })
            }
            scan(society || {}, 'society', 0)
            let current = Object.assign({}, state.current || {})
            delete current.modFlags
            delete current.sessionErrorLog
            delete current.lastSessionErrorLog
            scan(current, 'current', 0)
            // other mods' global flags too (the Society's own flag is scanned above as `society`)
            let flags = (state.current && state.current.modFlags) || {}
            Object.keys(flags).forEach((key) => {
              if (flags[key] !== society && key !== 'corSocietyLastDebugSnapshot') scan(flags[key], 'flags.' + key, 0)
            })
            // every other top-level key too (dynasties, selectedMarriageCharacterId, modal queues...)
            Object.keys(state).forEach((key) => {
              if (key !== 'characters' && key !== 'characterIds' && key !== 'current') scan(state[key], key, 0)
            })
            Object.keys(characters).forEach((id) => {
              if (!prune.has(id)) scan(characters[id], 'characters.' + id, 1)
            })
            if (!referenced.length) {
              return { prune, kept }
            }
            kept = this.populationPruneClosure(characters, referenced, kept)
          }
          return { prune: new Set(), kept }
        },
        prunePopulationRecords(state, society) {
          // Yearly: delete dead records nobody alive descends from (see
          // planPopulationPrune for what is always kept) and clean the derived lists that named
          // them, as the game's own cull does for NPCs. Live store state, worker idle, no modal.
          if (typeof window !== 'undefined' && window.corSocietyDisablePopulationPrune) {
            return 0
          }
          if (!state || !state.characters || !state.current || !society) {
            return 0
          }
          let plan = this.planPopulationPrune(state, society)
          let prune = plan.prune
          society.populationPruneYear = state.year
          if (!prune.size) {
            return 0
          }
          let characters = state.characters
          let kept = {}
          Object.keys(characters).forEach((id) => {
            if (!prune.has(id)) kept[id] = characters[id]
          })
          Object.keys(kept).forEach((id) => {
            let character = kept[id]
            if (character && Array.isArray(character.childrenIds) && character.childrenIds.some((childId) => prune.has(String(childId)))) {
              character.childrenIds = character.childrenIds.filter((childId) => !prune.has(String(childId)))
            }
          })
          state.characters = kept
          if (Array.isArray(state.characterIds)) {
            state.characterIds = state.characterIds.filter((id) => !prune.has(String(id)))
          }
          ;['characterSocial', 'socialRecords'].forEach((key) => {
            let records = society[key]
            if (records && typeof records === 'object') {
              Object.keys(records).forEach((id) => {
                if (prune.has(id)) delete records[id]
              })
            }
          })
          if (Array.isArray(society.generatedCharacterIds)) {
            society.generatedCharacterIds = society.generatedCharacterIds.filter((id) => !prune.has(String(id)))
          }
          Object.keys(society.houses || {}).forEach((houseId) => {
            let house = society.houses[houseId]
            if (house && Array.isArray(house.knownMemberIds)) {
              house.knownMemberIds = house.knownMemberIds.filter((id) => !prune.has(String(id)))
            }
          })
          if (this.invalidateStateSnapshot) {
            this.invalidateStateSnapshot()
          }
          if (this.log) {
            this.log(society, 'The archivists of Rome retire the records of ' + prune.size + ' long-dead citizens whom no living Roman descends from.', 'log', '')
          }
          return prune.size
        },
        isPopulationTrimCandidate(character) {
          return !!(character && character.isDead && (character.corSocietyGenerated || character.corSocietyGhostParent || character.corSocietyGeneratedConnector))
        },
        playerFamilyTreeIdMap(state) {
          // Everyone the vanilla family tree of the player's people starts from: the household, the
          // former household and the played characters, their ancestors, and the ancestors' spouses.
          let current = state.current || {}
          let needed = {}
          let stack = [].concat(current.householdCharacterIds || [], current.formerHouseholdCharacterIds || [], current.playedCharacters || [], [current.id])
          while (stack.length) {
            let id = stack.pop()
            if (!id || needed[String(id)]) {
              continue
            }
            needed[String(id)] = true
            let character = state.characters[id]
            if (!character) {
              continue
            }
            if (character.spouseId) {
              needed[String(character.spouseId)] = true
            }
            stack.push(character.fatherId, character.motherId)
          }
          return needed
        },
        trimGamePopulationCount(state) {
          // `state` must be the live store state (daapi.getState() hands out copies), and no vanilla
          // event-worker run may be pending: the worker sends back index-based array diffs computed
          // against the list it was given.
          if (typeof window !== 'undefined' && window.corSocietyDisablePopulationTrim) {
            return 0
          }
          if (!state || !state.current || !state.characters || !Array.isArray(state.characterIds)) {
            return 0
          }
          let ids = state.characterIds
          let month = (state.year || 0) * 13 + (state.month || 0)
          if (ids === this._populationTrimList && ids.length === this._populationTrimLength && month === this._populationTrimMonth) {
            return 0
          }
          let needed = this.playerFamilyTreeIdMap(state)
          let kept = ids.filter((id) => needed[String(id)] || !this.isPopulationTrimCandidate(state.characters[id]))
          let removed = ids.length - kept.length
          if (removed > 0) {
            state.characterIds = kept
            if (this.invalidateStateSnapshot) {
              this.invalidateStateSnapshot()
            }
          }
          this._populationTrimList = state.characterIds
          this._populationTrimLength = state.characterIds.length
          this._populationTrimMonth = month
          return removed
        },
        trimLivePopulationCount(store, options) {
          // Runs before every month advance while the game's event worker is idle, and on install to
          // redo the trim after a load: the monthly strip of dead characters' buttons, the yearly
          // prune, then the population-count trim. The prune only runs at a month advance (which the
          // game only allows from its main screen, so no open screen shows a record it deletes), with
          // no modal open or queued and no month still being processed.
          let state = store && store.state
          if (!state || !state.current || state.current.showSpinner) {
            return 0
          }
          let month = (state.year || 0) * 13 + (state.month || 0)
          if (this._deadButtonStripMonth !== month) {
            this._deadButtonStripMonth = month
            try {
              if (this.stripStaleCharacterButtons(state) && this.invalidateStateSnapshot) {
                this.invalidateStateSnapshot()
              }
            } catch (err) {
              console.warn(err)
            }
          }
          let society = state.current.modFlags && state.current.modFlags[this.flag || 'corSocietyState']
          let modalIdle = !(state.interactionModal && state.interactionModal.show) && !((state.interactionModalQueue || []).length)
          let monthAdvance = !!(options && options.monthAdvance) && !this._pendingMonthly
          if (monthAdvance && society && typeof society === 'object' && modalIdle && society.populationPruneYear !== state.year) {
            try {
              this.prunePopulationRecords(state, society)
            } catch (err) {
              console.warn(err)
            }
          }
          return this.trimGamePopulationCount(state)
        },
        installPopulationCountGuard() {
          // Trim now, and right before every month advance. The game dispatches nextTimeSlot only
          // while its event worker is idle and posts the month's natural-death roll right after, so
          // every roll sees the trimmed list, also after a load or the month-3 rebuild.
          let root = this.findGameVueRoot ? this.findGameVueRoot() : null
          let store = root && root.$store
          if (!store) {
            return false
          }
          try {
            this.trimLivePopulationCount(store)
          } catch (err) {
            console.warn(err)
          }
          if (store.__corSocietyPopulationGuard || typeof store.subscribeAction !== 'function') {
            return false
          }
          store.__corSocietyPopulationGuard = true
          store.subscribeAction({
            before: (action) => {
              try {
                let type = String((action && action.type) || '')
                if (type.split('/').pop() === 'nextTimeSlot' && window.corSociety && window.corSociety.trimLivePopulationCount) {
                  let route = root.$route && root.$route.name
                  window.corSociety.trimLivePopulationCount(store, { monthAdvance: !route || route === 'HomeView' })
                }
              } catch (err) {
                // never block a game action
              }
            }
          })
          return true
        }
      })
      window.corSociety._mixinCorSocietyPopulationVersion = '1.1.331'
    }
  }
}
