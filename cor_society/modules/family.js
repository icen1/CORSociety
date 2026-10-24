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
        }
      })
      window.corSociety._mixinCorSocietyFamilyVersion = '1.1.331'
    }
  }
}
