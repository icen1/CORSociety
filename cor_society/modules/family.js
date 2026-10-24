{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyFamily() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyFamilyVersion === '1.1.331') {
        return
      }
      // Links to the game's own family rules. The game's
      // marriage screen offers 'Give their inheritance early, and have them & their new spouse move
      // out' only to characters with flagIsPossibleHeir, which it sets on the children who carry the
      // family line (sons, or matrilineally married daughters) and on a dead parent's children. Its
      // inheritance calculator (module 6b82) already reaches any descendant, and nothing else reads
      // the flag (the marriage checkbox, the monthly heir marking and the 'Move out?' action), so
      // marking every household descendant opens the option for daughters, grandchildren and
      // deeper without touching succession.
      Object.assign(window.corSociety, {
        inheritableDescendantIds(state) {
          let current = (state && state.current) || {}
          let characters = (state && state.characters) || {}
          let household = this.idSet(current.householdCharacterIds || [])
          let ids = []
          let seen = {}
          let stack = ((characters[current.id] || {}).childrenIds || []).map((id) => [id, 1])
          while (stack.length) {
            let [id, depth] = stack.pop()
            if (!id || seen[String(id)] || depth > 12) {
              continue
            }
            seen[String(id)] = true
            let character = characters[id]
            if (!character) {
              continue
            }
            if (!character.isDead && household[String(id)] && !character.hasMovedOut && !character.flagWasGivenInheritance &&
              String(id) !== String(current.id) && String(id) !== String(current.flagDesignatedHeirId || '')) {
              ids.push(id)
            }
            ;(character.childrenIds || []).forEach((childId) => stack.push([childId, depth + 1]))
          }
          return ids
        },
        syncInheritanceEligibility(state) {
          // Monthly and on load: let the game offer the inheritance to every household descendant.
          state = state || daapi.getState()
          if (!state || !state.current || !state.characters) {
            return 0
          }
          let changed = 0
          this.inheritableDescendantIds(state).forEach((id) => {
            let character = state.characters[id]
            if (character.flagIsPossibleHeir) {
              return
            }
            try {
              daapi.updateCharacter({ characterId: id, character: { flagIsPossibleHeir: true } })
              character.flagIsPossibleHeir = true
              changed += 1
            } catch (err) {
              console.warn(err)
            }
          })
          return changed
        },
        inheritanceShareReachable(state, heirId) {
          // The game's share calculator (module 6b82) walks down from the player through children who
          // live at home, were never paid and are alive (or have such an heir below them). When the walk
          // cannot reach the heir it charges the whole estate (all cash, influence and property), so a
          // share is only offered to someone it reaches.
          let current = (state && state.current) || {}
          let characters = (state && state.characters) || {}
          if (!heirId || !characters[current.id] || String(heirId) === String(current.id)) {
            return false
          }
          let hasLine = (id, depth) => {
            let character = characters[id]
            return !!character && depth < 16 && !character.flagWasGivenInheritance &&
              (!character.isDead || (character.childrenIds || []).some((childId) => hasLine(childId, depth + 1)))
          }
          let seen = {}
          let reaches = (id, depth) => {
            if (seen[String(id)] || depth > 16) {
              return false
            }
            seen[String(id)] = true
            return ((characters[id] || {}).childrenIds || []).some((childId) => {
              let child = characters[childId]
              if (!childId || !child || child.hasMovedOut || !hasLine(childId, depth + 1)) {
                return false
              }
              return String(childId) === String(heirId) || reaches(childId, depth + 1)
            })
          }
          return reaches(current.id, 0)
        },
        marriageLeavesByMatch(character, isMatrilineal) {
          // The game's performMarriage: a son in a matrilineal match and a daughter in a usual one leave
          // for the spouse's household; anyone else brings the spouse home.
          let gender = character && character.gender
          if (!character || (gender && gender !== 'male' && gender !== 'female')) {
            return false
          }
          let male = gender ? gender === 'male' : character.isMale === true
          let female = gender ? gender === 'female' : character.isMale === false
          return (female && !isMatrilineal) || (male && !!isMatrilineal)
        },
        familyStore(root) {
          root = root || (this.findGameVueRoot ? this.findGameVueRoot() : null)
          return (root && root.$store) || this._familyStore || null
        },
        installFamilyGuards(root) {
          // Two of the game's store actions are wrapped. invokeMethod: 'Move out?' on someone the share
          // calculator cannot reach is offered without a payment. performMarriage: the marriage screen's
          // 'give away share of inheritance' never charges the whole estate either. Both wrappers call
          // the current window.corSociety, so a new boot never leaves them on an old object.
          let store = this.familyStore(root)
          let actions = store && store._actions
          if (!actions) {
            return false
          }
          this._familyStore = store
          let installer = this
          let current = () => window.corSociety || installer
          let moveOut = actions.invokeMethod
          if (moveOut && typeof moveOut[0] === 'function' && !moveOut[0].__corSocietyFamilyGuard) {
            let original = moveOut[0]
            let guarded = function(payload) {
              try {
                if (current().guardMoveOutClick(store, payload)) {
                  return Promise.resolve()
                }
              } catch (err) {
                console.warn(err)
              }
              return original.apply(this, arguments)
            }
            guarded.__corSocietyFamilyGuard = true
            moveOut[0] = guarded
          }
          let marriage = actions.performMarriage
          if (marriage && typeof marriage[0] === 'function' && !marriage[0].__corSocietyFamilyGuard) {
            let original = marriage[0]
            let guarded = function(payload) {
              let plan = null
              try {
                plan = current().marriagePlan(store, payload)
              } catch (err) {
                console.warn(err)
              }
              if (!plan) {
                return original.apply(this, arguments)
              }
              return current().performPlannedMarriage(store, plan, (changed) => original.call(this, changed))
            }
            guarded.__corSocietyFamilyGuard = true
            marriage[0] = guarded
          }
          return true
        },
        guardMoveOutClick(store, payload) {
          let method = payload && payload.method
          if (!method || payload.isDAAPI || method.event !== 'lifeAndDeath/moveOut' || method.method !== 'process') {
            return false
          }
          let context = Object.assign({}, method.context || {}, payload.params || {})
          let state = store && store.state
          let characterId = context.characterId
          if (!characterId || !state || !state.characters || !state.characters[characterId] || this.inheritanceShareReachable(state, characterId)) {
            return false
          }
          this.offerMoveOutWithoutShare(characterId, state)
          return true
        },
        offerMoveOutWithoutShare(characterId, state) {
          let character = state.characters[characterId] || {}
          let name = character.praenomen || 'They'
          let link = '[c|' + characterId + '|' + name + ']'
          daapi.pushInteractionModalQueue({
            title: 'Should ' + name + ' move out?',
            message: link + ' has no share of the patrimony left to receive: they, or the parent they would inherit through, were already paid or disinherited. They can still leave with their family for a household of their own.',
            image: daapi.requireImage('/cor_society/assets/familyTree.svg'),
            options: [
              {
                text: 'Yes, let them set up their own household',
                tooltip: 'Consequences: ' + link + ' (& family) leave your household with nothing more paid, and can no longer be designated heir.',
                action: {
                  event: this.event,
                  method: 'moveOutWithoutShare',
                  context: { characterId }
                }
              },
              {
                text: "Not while I'm around!"
              }
            ]
          })
        },
        moveOutWithoutShare({ characterId } = {}) {
          let store = this.familyStore()
          let state = store && store.state
          let current = state && state.current
          if (!characterId || !current || !state.characters || !state.characters[characterId] || String(characterId) === String(current.id) ||
            (current.householdCharacterIds || []).indexOf(characterId) < 0) {
            return false
          }
          return this.moveOutWithoutShareInStore(store, characterId)
        },
        moveOutWithoutShareInStore(store, characterId) {
          // The game's own move-out (module 9296 doMoveOut) with nothing paid. It marks everyone it moves
          // as paid, so the character's flag is put back as it was.
          let character = store.state.characters[characterId]
          let wasGiven = !!(character && character.flagWasGivenInheritance)
          store.dispatch('invokeMethod', { method: { event: 'lifeAndDeath/moveOut', method: 'doMoveOut', context: { characterId, inheritance: 0 } } })
          let moved = store.state.characters[characterId]
          if (moved && !!moved.flagWasGivenInheritance !== wasGiven) {
            moved.flagWasGivenInheritance = wasGiven
          }
          if (this.invalidateStateSnapshot) {
            this.invalidateStateSnapshot()
          }
          return !!(moved && moved.hasMovedOut)
        },
        marriagePlan(store, payload) {
          // Only the game's marriage screen sends makeMoveOut. Society's own marriages and the game's
          // random ones never do, and are left to the game.
          if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'makeMoveOut') || !payload.makeMoveOut) {
            return null
          }
          let state = store && store.state
          let current = state && state.current
          let characters = state && state.characters
          let characterId = payload.characterId
          let household = (current && current.householdCharacterIds) || []
          if (!characters || !characters[characterId] || !characters[payload.spouseId] || String(characterId) === String(current.id) ||
            household.indexOf(characterId) < 0 || household.indexOf(payload.spouseId) >= 0 || this.inheritanceShareReachable(state, characterId)) {
            return null
          }
          return {
            payload,
            characterId,
            spouseId: payload.spouseId,
            share: false,
            leave: true,
            leavesByMatch: this.marriageLeavesByMatch(characters[characterId], payload.isMatrilineal)
          }
        },
        performPlannedMarriage(store, plan, run) {
          let result = run(Object.assign({}, plan.payload, { makeMoveOut: plan.share ? 1 : 0 }))
          try {
            if (plan.leave && !plan.share && !plan.leavesByMatch) {
              this.moveOutWithoutShareInStore(store, plan.characterId)
            }
          } catch (err) {
            console.warn(err)
          }
          return result
        }
      })
      window.corSociety._mixinCorSocietyFamilyVersion = '1.1.331'
    }
  }
}
