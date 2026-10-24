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
        },
        repairInflatedHouses(society, state) {
          // Step 4. aiSellExcessProperty used to pay a house for property above its management limit
          // without removing it (normalizeHousePropertyDetails replaced the object mid-sale), so a
          // house whose stewardship fell below its holdings minted cash every turn and bought more
          // property with it, reaching millions in cash and billions in property. For every house
          // except the player's:
          // - property above the management limits worth more than the house's max cash holding is
          //   cut to the limits without payment (the economy would otherwise sell it for cash);
          //   honest houses never hold such an excess, the economy sells it every turn;
          // - cash above 10x the max cash holding (honest income cannot get there) is reset to that
          //   holding, at least the median of the honest houses of its order;
          // - a house caught by either rule that is still richer than the richest honest house of its
          //   order is trimmed to that wealth, keeping a proportional share of each holding type.
          // Wealth is recomputed and strength set to the level the monthly formula settles at.
          if (!society || !society.houses || !this.houseEffectiveMaxCashHolding || !this.housePropertyValue || !this.housePropertyMaxCount) {
            return 0
          }
          state = state || daapi.getState()
          let types = this.vanillaPropertyTypes ? this.vanillaPropertyTypes() : {}
          let houses = Object.keys(society.houses).map((houseId) => society.houses[houseId]).filter((house) => house && house.ai && !(this.isPlayerHouseRecord && this.isPlayerHouseRecord(house, state)))
          let median = (list) => {
            let sorted = list.slice().sort((a, b) => a - b)
            return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
          }
          let flagged = []
          houses.forEach((house) => {
            let details = this.normalizeHousePropertyDetails(house)
            let holding = Math.max(this.houseEffectiveMaxCashHolding(house, state), 1000)
            let overValue = 0
            let limits = {}
            Object.keys(details).forEach((key) => {
              limits[key] = Math.max(0, Math.floor(this.housePropertyMaxCount(house, key, state)))
              overValue += Math.max(0, details[key] - limits[key]) * ((types[key] && types[key].value) || 0)
            })
            let property = overValue > holding
            let cash = parseFloat(house.ai.cash || 0) > 10 * holding
            if (!property && !cash) {
              return
            }
            if (property) {
              Object.keys(limits).forEach((key) => {
                details[key] = Math.min(details[key], limits[key])
              })
              this.normalizeHousePropertyDetails(house)
            }
            flagged.push({ house, cash, holding })
          })
          if (!flagged.length) {
            return 0
          }
          let isFlagged = new Set(flagged.map((item) => item.house))
          let honestCash = {}
          let honestCeiling = {}
          houses.forEach((house) => {
            if (isFlagged.has(house)) return
            let wealth = parseFloat(house.ai.cash || 0) + this.housePropertyValue(house)
            honestCash[house.stratum] = honestCash[house.stratum] || []
            honestCash[house.stratum].push(parseFloat(house.ai.cash || 0))
            honestCeiling[house.stratum] = Math.max(honestCeiling[house.stratum] || 0, wealth)
          })
          let anyCeiling = Math.max(0, ...Object.keys(honestCeiling).map((key) => honestCeiling[key]))
          flagged.forEach(({ house, cash, holding }) => {
            if (cash) {
              house.ai.cash = Math.round(Math.max(holding, median(honestCash[house.stratum] || [])))
            }
            let ceiling = honestCeiling[house.stratum] || anyCeiling
            let propertyValue = this.housePropertyValue(house)
            if (ceiling > 0 && parseFloat(house.ai.cash || 0) + propertyValue > ceiling) {
              house.ai.cash = Math.round(Math.min(parseFloat(house.ai.cash || 0), ceiling))
              let room = Math.max(0, ceiling - house.ai.cash)
              let factor = propertyValue > 0 ? Math.min(1, room / propertyValue) : 0
              let details = this.normalizeHousePropertyDetails(house)
              Object.keys(details).forEach((key) => {
                details[key] = Math.floor(details[key] * factor)
              })
              this.normalizeHousePropertyDetails(house)
            }
            house.wealth = Math.max(0, Math.round(house.ai.cash + this.housePropertyValue(house)))
            house.strength = Math.max(1, Math.round(((house.power || 0) * 0.25 + house.wealth / 160 + (house.stability || 0) / 8) / 0.15))
            this.log(society, (house.name || 'A house') + '\'s treasury and estates, swollen by a scribe\'s accounting error, are restored to an honest measure.', 'log', house.id)
          })
          return flagged.length
        },
        fallbackHouseName(society, state, dynastyId) {
          // A name for a house record that has none: the Society dynasty's name, else the game
          // dynasty's nomen + cognomen (game dynasties have no `name`), else the id made readable.
          state = state || daapi.getState()
          let societyDynasty = society && society.dynasties && society.dynasties[dynastyId]
          if (societyDynasty && societyDynasty.name) {
            return String(societyDynasty.name)
          }
          let gameDynasty = state && state.dynasties && state.dynasties[dynastyId]
          let name = gameDynasty ? (String(gameDynasty.nomen || '') + ' ' + String(gameDynasty.cognomen || '')).replace(/\s+/g, ' ').trim() : ''
          return name || String(dynastyId || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || 'Unknown House'
        },
        nameNamelessHouses(society, state) {
          // Step 5. Repair code used to create origin houses for dynasties with no living members
          // without a name, and only the member sync names a house, so menus and the log showed
          // "undefined". New records are named in createHouseRecord; this names the existing ones.
          if (!society) {
            return 0
          }
          let named = 0
          ;[society.houses || {}, society.deadHouses || {}].forEach((houses) => {
            Object.keys(houses).forEach((houseId) => {
              let house = houses[houseId]
              if (!house || typeof house !== 'object' || house.name) {
                return
              }
              house.name = this.fallbackHouseName(society, state, this.gameDynastyIdForHouse ? this.gameDynastyIdForHouse(house) : (house.dynastyId || houseId))
              named += 1
            })
          })
          return named
        },
        foldBackInventedCadets(society, state) {
          // Step 6. The monthly NPC cadet roll let the relatives the mod invents to fill in the
          // player's tree (inventedPlayerRelative) found branches of the player's dynasty. Those
          // branches are dissolved and their people rejoin the player's house; a real relative's
          // branch stays.
          if (!society || !society.houses || !state || !state.characters || !this.dissolvePlayerDynastyCadets) {
            return 0
          }
          let houseIds = Object.keys(society.houses).filter((houseId) => {
            let house = society.houses[houseId]
            if (!this.isNpcCadetOfPlayerDynasty(society, state, house)) {
              return false
            }
            let founder = house.founderId && state.characters[house.founderId]
            return !founder || this.inventedPlayerRelative(founder, state)
          })
          this.dissolvePlayerDynastyCadets(society, state, houseIds, (name) => name + ' is folded back into your house: no real branch of your family founded it.')
          return houseIds.length
        },
        wipeUnwarnedLudiAmbitus(society) {
          // Step 7. Ludi seats bought in the game's campaign were recorded as hidden ambitus before
          // the campaign said so (warnCampaignTickets). The hidden records are wiped; exposed ones,
          // trials and convictions stay.
          let wiped = 0
          Object.keys((society && society.crimes) || {}).forEach((characterId) => {
            let list = society.crimes[characterId]
            if (!Array.isArray(list)) {
              return
            }
            let kept = list.filter((crime) => !(crime && crime.type === 'ambitus' && crime.source === 'election' && !crime.exposed))
            wiped += list.length - kept.length
            if (kept.length) {
              society.crimes[characterId] = kept
            } else {
              delete society.crimes[characterId]
            }
          })
          return wiped
        },
        restoreBridesToTheirGens(society, state) {
          // Step 8. normalizeGeneratedPeople moved generated brides living in the player's house into the
          // player's gens. The game then gave their children the gens's adoption agnomen ('Tullianus',
          // 'Tullia'): a mother of the household's gens counts as a matrilineal marriage. A bride whose
          // old house record names her gens returns to it, and children of the gens born to a father of
          // the gens lose an agnomen made from their own nomen.
          let playerDynastyId = String(this.currentCharacterDynastyId(state) || '')
          let characters = (state && state.characters) || {}
          if (!society || !playerDynastyId || !state.dynasties) {
            return 0
          }
          let inGens = (character) => !!character && String(character.dynastyId || '') === playerDynastyId
          let origins = {}
          ;[society.houses || {}, society.deadHouses || {}].forEach((houses) => {
            Object.keys(houses).forEach((houseId) => {
              let house = houses[houseId]
              let dynastyId = house && String(this.gameDynastyIdForHouse(house) || '')
              if (!dynastyId || dynastyId === playerDynastyId || !state.dynasties[dynastyId]) {
                return
              }
              ;['memberIds', 'knownMemberIds', 'deadMemberIds', 'notableIds'].forEach((key) => {
                ;(house[key] || []).forEach((characterId) => {
                  origins[String(characterId)] = origins[String(characterId)] || dynastyId
                })
              })
            })
          })
          let changed = 0
          Object.keys(characters).forEach((characterId) => {
            let character = characters[characterId]
            let spouse = character && characters[character.spouseId]
            let bornInGens = character && (inGens(characters[character.fatherId]) || inGens(characters[character.motherId]))
            let origin = origins[String(characterId)]
            if (!inGens(character) || !character.corSocietyGenerated || character.corSocietyPlayerTreeRole || !inGens(spouse) || bornInGens || !origin) {
              return
            }
            try {
              daapi.updateCharacter({ characterId, character: { dynastyId: origin } })
              changed += 1
            } catch (err) {
              console.warn(err)
            }
          })
          let nomen = String((state.dynasties[playerDynastyId] || {}).nomen || '')
          let stem = nomen.substr(0, nomen.lastIndexOf('i')) || nomen.substr(0, nomen.lastIndexOf('u')) || nomen.substr(0, nomen.lastIndexOf('a')) || nomen
          Object.keys(characters).forEach((characterId) => {
            let character = characters[characterId]
            if (!nomen || !inGens(character) || !character.agnomen || !inGens(characters[character.fatherId])) {
              return
            }
            if (character.agnomen !== stem + 'ianus' && character.agnomen !== stem + 'ia') {
              return
            }
            try {
              daapi.updateCharacter({ characterId, character: { agnomen: '' } })
              changed += 1
            } catch (err) {
              console.warn(err)
            }
          })
          return changed
        }
      })
      window.corSociety._mixinCorSocietyMigrationsVersion = '1.1.331'
    }
  }
}
