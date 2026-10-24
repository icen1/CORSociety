{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyTechnicalSafety() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyTechnicalSafetyVersion === '1.1.331') {
        return
      }
      let previousDebugSnapshot = window.corSociety.debugSnapshot
      let previousDebugSectionOptions = window.corSociety.debugSectionOptions
      Object.assign(window.corSociety, {
        currentSchemaVersion() {
          return 8
        },
        runSocietyMigrations(society, state) {
          if (!society || typeof society !== 'object') {
            return society
          }
          let target = this.currentSchemaVersion()
          let current = parseInt(society.schemaVersion || 0, 10) || 0
          if (current < 1) {
            society.crimes = society.crimes || {}
            society.convictions = society.convictions || {}
            society.infamy = society.infamy || {}
            society.pendingTrials = society.pendingTrials || {}
            society.legalNotices = society.legalNotices || []
            society.crimeStatusCharacterIds = society.crimeStatusCharacterIds || []
            society.schemaVersion = 1
            current = 1
          }
          if (current < 2) {
            society.adoptions = society.adoptions || []
            society.marriageAlliances = society.marriageAlliances || []
            society.blackmailHooks = society.blackmailHooks || {}
            society.spyNetworks = society.spyNetworks || {}
            society.rome = society.rome || {}
            society.rome.depositionCoalitions = society.rome.depositionCoalitions || []
            society.rome.foreignWars = society.rome.foreignWars || []
            society.rome.marketListings = society.rome.marketListings || []
            society.rome.crises = society.rome.crises || []
            society.rome.legions = society.rome.legions || []
            society.rome.priesthoods = society.rome.priesthoods || {}
            society.rome.imperialCult = society.rome.imperialCult || {}
            society.schemaVersion = 2
            current = 2
          }
          // Steps 3 and up repair game records (modules/migrations.js) and need the game state.
          let gameState = state || (typeof daapi !== 'undefined' && daapi && daapi.getState ? daapi.getState() : null)
          if (current < 3 && gameState) {
            if (this.repairCharacterDynastyPointers) this.repairCharacterDynastyPointers(society, gameState)
            society.schemaVersion = 3
            current = 3
          }
          if (current < 4 && gameState) {
            if (this.repairInflatedHouses) this.repairInflatedHouses(society, gameState)
            society.schemaVersion = 4
            current = 4
          }
          if (current < 5 && gameState) {
            if (this.nameNamelessHouses) this.nameNamelessHouses(society, gameState)
            society.schemaVersion = 5
            current = 5
          }
          if (current < 6 && gameState) {
            if (this.foldBackInventedCadets) this.foldBackInventedCadets(society, gameState)
            society.schemaVersion = 6
            current = 6
          }
          if (current < 7 && current >= 6) {
            if (this.wipeUnwarnedLudiAmbitus) this.wipeUnwarnedLudiAmbitus(society)
            society.schemaVersion = 7
            current = 7
          }
          if (current < 8 && current >= 7 && gameState) {
            if (this.restoreBridesToTheirGens) this.restoreBridesToTheirGens(society, gameState)
            society.schemaVersion = 8
            current = 8
          }
          if (gameState && society.schemaVersion < target) {
            society.schemaVersion = target
          }
          this.ensureAdvancedDataShape(society, state)
          this.pruneStaleSocietyState(society, state)
          return society
        },
        ensureAdvancedDataShape(society, state) {
          if (!society || typeof society !== 'object') return society
          society.crimes = society.crimes || {}
          society.convictions = society.convictions || {}
          society.infamy = society.infamy || {}
          society.pendingTrials = society.pendingTrials || {}
          society.legalNotices = society.legalNotices || []
          society.crimeStatusCharacterIds = society.crimeStatusCharacterIds || []
          society.blackmailHooks = society.blackmailHooks || {}
          society.spyNetworks = society.spyNetworks || {}
          society.crimeInformers = society.crimeInformers || {}
          society.security = society.security || { bodyguards: 0, lastUpkeepMonth: '' }
          society.assassinationLog = society.assassinationLog || []
          society.adoptions = society.adoptions || []
          society.marriageAlliances = society.marriageAlliances || []
          society.rome = society.rome || {}
          society.rome.depositionCoalitions = society.rome.depositionCoalitions || []
          society.rome.houseLoyalty = society.rome.houseLoyalty || {}
          society.rome.foreignWars = society.rome.foreignWars || []
          society.rome.marketListings = society.rome.marketListings || []
          society.rome.crises = society.rome.crises || []
          society.rome.legions = society.rome.legions || []
          society.rome.priesthoods = society.rome.priesthoods || {}
          society.rome.imperialCult = society.rome.imperialCult || {}
          society.playerPolitics = society.playerPolitics || {}
          society.playerPolitics.cursus = society.playerPolitics.cursus || { office: '', history: [], lastElectionMonth: '', campaignFunds: 0, ambitus: 0 }
          society.playerPolitics.clients = parseInt(society.playerPolitics.clients || 0, 10) || 0
          society.playerPolitics.legions = society.playerPolitics.legions || []
          society.playerPolitics.agnomina = society.playerPolitics.agnomina || []
          return society
        },
        pruneStaleSocietyState(society, state) {
          if (!society || typeof society !== 'object') return false
          let characters = (state && state.characters) || {}
          let nowKey = state ? this.monthKey(state) : ''
          let nowIndex = nowKey ? this.monthIndex(nowKey) : 0
          let changed = false
          let characterExists = (id) => !state || !id || !!characters[id]
          let pruneCrimeBuckets = (buckets, keepExposed) => {
            Object.keys(buckets || {}).forEach((characterId) => {
              if (!characterExists(characterId)) {
                delete buckets[characterId]
                changed = true
                return
              }
              let list = (buckets[characterId] || []).filter((crime) => {
                if (!crime) return false
                if (keepExposed && crime.exposed) return true
                if (!crime.month || !nowIndex) return true
                return nowIndex - this.monthIndex(crime.month) <= 84
              }).slice(-16)
              if (list.length) {
                buckets[characterId] = list
              } else {
                delete buckets[characterId]
              }
            })
          }
          pruneCrimeBuckets(society.crimes || {}, true)
          Object.keys(society.pendingTrials || {}).forEach((characterId) => {
            let trial = society.pendingTrials[characterId]
            // The monthly audit gives the verdict when the court sits (until); only a trial left long
            // after that is dropped. Dropping it on the day itself, before the audit, acquitted
            // everyone the court was waiting for.
            if (!characterExists(characterId) || (trial && trial.until && state && this.monthIndex(this.monthKey(state)) >= this.monthIndex(trial.until) + 3)) {
              delete society.pendingTrials[characterId]
              changed = true
            }
          })
          Object.keys(society.convictions || {}).forEach((characterId) => {
            let conviction = society.convictions[characterId]
            if (!characterExists(characterId) || !conviction) {
              delete society.convictions[characterId]
              changed = true
            }
          })
          society.legalNotices = (society.legalNotices || []).slice(-60)
          society.captives = (society.captives || []).filter((captive) => captive && (!captive.characterId || characterExists(captive.characterId))).slice(-50)
          if (society.investigations) {
            Object.keys(society.investigations).forEach((characterId) => {
              let entry = society.investigations[characterId]
              if (!characterExists(characterId) || (entry && entry.month && nowIndex && nowIndex - this.monthIndex(entry.month) > 72)) {
                delete society.investigations[characterId]
                changed = true
              }
            })
          }
          if (society.crimeInformers) {
            Object.keys(society.crimeInformers).forEach((houseId) => {
              if (!society.houses || !society.houses[houseId]) {
                delete society.crimeInformers[houseId]
                changed = true
              }
            })
          }
          let rome = society.rome || {}
          rome.wars = (rome.wars || []).filter((war) => {
            if (!war) return false
            if (!war.endMonth || !nowIndex) return true
            return nowIndex - this.monthIndex(war.endMonth) <= 18
          }).slice(-30)
          rome.depositionCoalitions = (rome.depositionCoalitions || []).filter((coalition) => coalition && coalition.status !== 'resolved').slice(-12)
          rome.foreignWars = (rome.foreignWars || []).filter((war) => war && war.status !== 'resolved').slice(-12)
          rome.marketListings = (rome.marketListings || []).slice(-40)
          rome.crises = (rome.crises || []).slice(-20)
          society.rome = rome
          return changed
        },
        compactAdvancedState(society) {
          if (!society || typeof society !== 'object') return society
          let trimObjectLists = (object, limit) => {
            Object.keys(object || {}).forEach((key) => {
              if (Array.isArray(object[key]) && object[key].length > limit) {
                object[key] = object[key].slice(-limit)
              }
            })
          }
          trimObjectLists(society.crimes || {}, 16)
          Object.keys(society.blackmailHooks || {}).forEach((characterId) => {
            society.blackmailHooks[characterId] = (society.blackmailHooks[characterId] || []).slice(-8)
          })
          if (society.legalNotices && society.legalNotices.length > 60) society.legalNotices = society.legalNotices.slice(-60)
          if (society.adoptions && society.adoptions.length > 80) society.adoptions = society.adoptions.slice(-80)
          if (society.marriageAlliances && society.marriageAlliances.length > 80) society.marriageAlliances = society.marriageAlliances.slice(-80)
          if (society.rome) {
            if (society.rome.depositionCoalitions && society.rome.depositionCoalitions.length > 12) society.rome.depositionCoalitions = society.rome.depositionCoalitions.slice(-12)
            if (society.rome.foreignWars && society.rome.foreignWars.length > 12) society.rome.foreignWars = society.rome.foreignWars.slice(-12)
            if (society.rome.marketListings && society.rome.marketListings.length > 40) society.rome.marketListings = society.rome.marketListings.slice(-40)
            if (society.rome.crises && society.rome.crises.length > 20) society.rome.crises = society.rome.crises.slice(-20)
          }
          delete society._advancedValidationCache
          return society
        },
        validateFamilyIntegrityFull(society, state, options) {
          options = options || {}
          state = state || daapi.getState()
          society = society || this.load()
          let characters = (state && state.characters) || {}
          let issues = []
          let limit = options.limit || 200
          let addIssue = (kind, characterId, detail) => {
            if (issues.length >= limit) return
            issues.push({ kind, characterId: String(characterId || ''), detail })
          }
          let ids = Object.keys(characters)
          ids.forEach((characterId) => {
            let character = characters[characterId] || {}
            if (this.sameCharacterId(character.fatherId, characterId)) addIssue('self-father', characterId, 'A character is listed as their own father.')
            if (this.sameCharacterId(character.motherId, characterId)) addIssue('self-mother', characterId, 'A character is listed as their own mother.')
            if (this.sameCharacterId(character.spouseId, characterId)) addIssue('self-spouse', characterId, 'A character is listed as their own spouse.')
            if (character.spouseId && characters[character.spouseId]) {
              let spouse = characters[character.spouseId]
              if (String(spouse.spouseId || '') !== String(characterId)) {
                addIssue('asymmetric-spouse', characterId, 'Spouse link does not point back from ' + character.spouseId + '.')
              }
            }
            ;(character.childrenIds || []).forEach((childId) => {
              let child = characters[childId]
              if (!child) {
                addIssue('missing-child', characterId, 'Child id ' + childId + ' is not present.')
                return
              }
              if (String(child.fatherId || '') !== String(characterId) && String(child.motherId || '') !== String(characterId)) {
                addIssue('asymmetric-child', characterId, 'Child ' + childId + ' does not list this character as a parent.')
              }
            })
            let seen = {}
            let walk = (id, depth) => {
              if (!id || !characters[id] || depth > 18) return false
              if (String(id) === String(characterId)) return true
              if (seen[id]) return false
              seen[id] = true
              return walk(characters[id].fatherId, depth + 1) || walk(characters[id].motherId, depth + 1)
            }
            if (walk(character.fatherId, 0) || walk(character.motherId, 0)) {
              addIssue('ancestor-cycle', characterId, 'This character appears inside their own ancestor chain.')
            }
            if (character.corSocietyHouseId && society.houses && !society.houses[character.corSocietyHouseId]) {
              addIssue('orphan-house-pointer', characterId, 'Character points to missing Society house ' + character.corSocietyHouseId + '.')
            }
          })
          Object.keys((society && society.houses) || {}).forEach((houseId) => {
            let house = society.houses[houseId]
            ;['memberIds', 'knownMemberIds', 'notableIds', 'slaveIds'].forEach((field) => {
              let seen = {}
              ;((house && house[field]) || []).forEach((characterId) => {
                if (seen[characterId]) addIssue('duplicate-house-member', characterId, houseId + '.' + field + ' lists this id more than once.')
                seen[characterId] = true
                if (!characters[characterId]) addIssue('missing-house-member', characterId, houseId + '.' + field + ' points to a missing character.')
              })
            })
          })
          return {
            ok: issues.length === 0,
            issueCount: issues.length,
            issues,
            checkedCharacters: ids.length,
            checkedHouses: Object.keys((society && society.houses) || {}).length
          }
        },
        integrityIssueText(issue) {
          if (!issue) return ''
          return issue.kind + (issue.characterId ? ' #' + issue.characterId : '') + ': ' + (issue.detail || '')
        },
        repairAndValidateIntegrity(society, state) {
          society = society || this.loadForAction()
          state = state || daapi.getState()
          if (this.repairFamilyLinkIntegrity) {
            this.repairFamilyLinkIntegrity(society, state)
            state = daapi.getState()
          }
          if (this.maintainDynastyHouseSystem) {
            this.maintainDynastyHouseSystem(society, state, { force: true, phase: 'integrity-debug', repairCadetBranches: true })
          }
          let result = this.validateFamilyIntegrityFull(society, state, { limit: 200 })
          society.lastIntegrityReport = {
            month: this.monthKey(state),
            issueCount: result.issueCount,
            checkedCharacters: result.checkedCharacters,
            checkedHouses: result.checkedHouses
          }
          this.save(society)
          return result
        },
        debugSnapshot(section) {
          if (section === 'integrity') {
            let state = daapi.getState()
            let society = this.load()
            let integrity = this.validateFamilyIntegrityFull(society, state, { limit: 200 })
            let base = previousDebugSnapshot ? previousDebugSnapshot.call(this, 'overview') : {}
            base.section = section
            base.integrity = integrity
            return base
          }
          return previousDebugSnapshot ? previousDebugSnapshot.call(this, section) : { section }
        },
        debugSectionOptions(section) {
          let options = previousDebugSectionOptions ? previousDebugSectionOptions.call(this, section) : []
          let exists = options.some((option) => option && option.action && option.action.context && option.action.context.section === 'integrity')
          if (!exists) {
            options.splice(Math.max(0, options.length - 1), 0, {
              variant: section === 'integrity' ? 'info' : undefined,
              text: 'Integrity',
              tooltip: 'Validate parent, spouse, child, ancestor, and Society house invariants.',
              icons: [this.affairIcon('law')],
              action: {
                event: this.event,
                method: 'openDebugConsole',
                context: { section: 'integrity' }
              }
            })
          }
          return options
        }
      })
      window.corSociety._mixinCorSocietyTechnicalSafetyVersion = '1.1.331'
    }
  }
}
