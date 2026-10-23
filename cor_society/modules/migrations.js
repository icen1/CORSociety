{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyMigrations() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyMigrationsVersion === '1.1.331') {
        return
      }
      // One-time save repairs, run in order by the migration ladder in technical_safety.js
      // (runSocietyMigrations, schemaVersion steps 3 and up). Each step is idempotent.
      Object.assign(window.corSociety, {
        repairCharacterDynastyPointers(society, state) {
          // Step 3 (also run monthly as a safety net). Slaves of NPC cadet houses used to get the
          // Society house id as their dynastyId. That is not a game dynasty, and the game's
          // education event reads state.dynasties[dynastyId].prestige: it threw, and the game
          // logged the whole state into state.current.sessionErrorLog (saved), which ended in white
          // screens. Point such characters at the real game dynasty of the house (or owner house).
          if (!society || !state || !state.characters || !state.dynasties) {
            return 0
          }
          let houses = society.houses || {}
          let deadHouses = society.deadHouses || {}
          let dynastyOf = (houseId) => {
            let house = houseId && (houses[houseId] || deadHouses[houseId])
            let dynastyId = house && this.gameDynastyIdForHouse(house)
            return dynastyId && state.dynasties[dynastyId] ? dynastyId : ''
          }
          let repaired = 0
          Object.keys(state.characters).forEach((characterId) => {
            let character = state.characters[characterId]
            let dynastyId = character && character.dynastyId
            if (!dynastyId || state.dynasties[dynastyId]) {
              return
            }
            let target = dynastyOf(dynastyId) || dynastyOf(character.corSocietySlaveOwnerHouseId) || dynastyOf(character.corSocietyHouseId)
            if (!target) {
              return
            }
            try {
              daapi.updateCharacter({ characterId, character: { dynastyId: target } })
              character.dynastyId = target
              repaired += 1
            } catch (err) {
              console.warn(err)
            }
          })
          if (repaired) {
            this.log(society, repaired + ' characters had an invalid dynasty (a house id) and were repaired.', 'log', '')
          }
          return repaired
        }
      })
      window.corSociety._mixinCorSocietyMigrationsVersion = '1.1.331'
    }
  }
}
