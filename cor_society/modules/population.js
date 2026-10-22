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
        trimLivePopulationCount(store) {
          let state = store && store.state
          if (!state || !state.current || state.current.showSpinner) {
            return 0
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
                  window.corSociety.trimLivePopulationCount(store)
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
