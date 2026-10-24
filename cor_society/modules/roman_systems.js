{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyRomanSystems() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyRomanSystemsVersion === '1.1.331') {
        return
      }
      let previousPoliticsAction = window.corSociety.politicsAction
      let previousPlayerAuctoritasScore = window.corSociety.playerAuctoritasScore
      let previousLawList = window.corSociety.lawList
      let previousPolicyLawList = window.corSociety.policyLawList
      let previousInstallDebtSaleModalPatch = window.corSociety.installDebtSaleModalPatch
      let previousPerformSocietyMarriage = window.corSociety.performSocietyMarriage
      Object.assign(window.corSociety, {
        lawIcon(kind) {
          if (kind === 'prison' || kind === 'crime' || kind === 'justice') return this.assetIcon('prison')
          if (kind === 'war' || kind === 'legion' || kind === 'military' || kind === 'militaryService') return this.vanillaMilitaryIcon(kind)
          if (kind === 'dictator') return this.assetIcon('dictator')
          if (kind === 'law' || kind === 'cursus' || kind === 'religion') return this.assetIcon('law')
          return this.affairIcon(kind || 'senator')
        },
        vanillaMilitaryIcon(kind) {
          let paths = (kind === 'war')
            ? ['img/war.dbdf0e39.svg', '/img/war.dbdf0e39.svg', 'img/soldier.88f11133.svg', 'icons/traits/veteran.svg']
            : ['img/militaryService.88f11133.svg', '/img/militaryService.88f11133.svg', 'img/soldier.88f11133.svg', 'icons/traits/veteran.svg']
          for (let i = 0; i < paths.length; i += 1) {
            try {
              let icon = daapi.requireImage(paths[i])
              if (icon) return icon
            } catch (err) {}
          }
          return this.assetIcon('war')
        },
        installDebtSaleModalPatch() {
          let result = previousInstallDebtSaleModalPatch ? previousInstallDebtSaleModalPatch.call(this) : false
          this.installTaxCrimeModalPatch()
          return result
        },
        installTaxCrimeModalPatch() {
          // Re-checked on every call (cheap): the game rebuilds daapi on save load.
          this.taxCrimeModalPatchInstalled = true
          ;['pushInteractionModalQueue', 'pushInteractionModalButtonQueue'].forEach((methodName) => {
            try {
              this.wrapModalFunction(methodName, 'corSocietyTaxCrimePatch', (payload) => this.patchTaxCrimeModalPayload(payload))
            } catch (err) {
              console.warn(err)
            }
          })
          return true
        },
        patchTaxCrimeModalPayload(payload) {
          if (!payload || payload.societyMenu || payload.corSocietyTaxCrimePatched) return payload
          let text = (String(payload.title || '') + ' ' + String(payload.message || '')).toLowerCase()
          let taxWords = ['tax', 'taxes', 'tributum', 'census', 'fisc', 'impuesto', 'impuestos', 'tributo']
          if (!taxWords.some((word) => text.indexOf(word) >= 0)) return payload
          let patched = { ...(payload || {}) }
          patched.corSocietyTaxCrimePatched = true
          try {
            let state = daapi.getState()
            let society = this.loadForAction()
            this.ensureAdvancedRomanState(society, state)
            let note = this.resolveTaxFraudAtVanillaTaxNotice(society, state)
            if (note) {
              patched.message = String(patched.message || '') + '\n\nRoman Society: ' + note
              this.save(society)
            }
          } catch (err) {
            console.warn(err)
          }
          return patched
        },
        ensureAdvancedRomanState(society, state) {
          if (this.runSocietyMigrations) {
            this.runSocietyMigrations(society, state)
          } else if (this.ensureAdvancedDataShape) {
            this.ensureAdvancedDataShape(society, state)
          }
          society.rome = society.rome || {}
          let rome = this.ensureRomeState ? this.ensureRomeState(society) : society.rome
          rome.depositionCoalitions = rome.depositionCoalitions || []
          rome.houseLoyalty = rome.houseLoyalty || {}
          rome.foreignWars = rome.foreignWars || []
          rome.marketListings = rome.marketListings || []
          rome.crises = rome.crises || []
          rome.legions = rome.legions || []
          rome.priesthoods = rome.priesthoods || {}
          rome.imperialCult = rome.imperialCult || {}
          rome.factions = rome.factions || { optimates: [], populares: [] }
          society.playerPolitics = society.playerPolitics || {}
          society.playerPolitics.cursus = society.playerPolitics.cursus || { office: '', history: [], lastElectionMonth: '', campaignFunds: 0, ambitus: 0 }
          society.playerPolitics.clients = parseInt(society.playerPolitics.clients || 0, 10) || 0
          society.playerPolitics.legions = society.playerPolitics.legions || []
          society.playerPolitics.agnomina = society.playerPolitics.agnomina || []
          return rome
        },
        romanSystemsAction(args) {
          args = args || {}
          let map = {
            openCrimes: 'openCrimes',
            commitTaxFraud: 'commitTaxFraud',
            openCrimeTargets: 'openCrimeTargets',
            openCrimeIntel: 'openCrimeIntel',
            hireCrimeInformers: 'hireCrimeInformers',
            openSecurity: 'openSecurity',
            hireBodyguards: 'hireBodyguards',
            disbandBodyguards: 'disbandBodyguards',
            openStealTargets: 'openStealTargets',
            openStealHouse: 'openStealHouse',
            stealFromHouse: 'stealFromHouse',
            denounceCrime: 'denounceCrime',
            openTrialDefence: 'openTrialDefence',
            chooseTrialDefence: 'chooseTrialDefence',
            payFine: 'payFine',
            bribeJailer: 'bribeJailer',
            attemptEscape: 'attemptEscape',
            acceptLegionSentence: 'acceptLegionSentence',
            seekImperialPardon: 'seekImperialPardon',
            openRomanPower: 'openRomanPower',
            openFactions: 'openFactions',
            setPoliticalAlignment: 'setPoliticalAlignment',
            openCursus: 'openCursus',
            standForOffice: 'standForOffice',
            buyVotes: 'buyVotes',
            openClientela: 'openClientela',
            fundClientela: 'fundClientela',
            holdClientGames: 'holdClientGames',
            openSuccession: 'openSuccession',
            adoptHeir: 'adoptHeir',
            grantCognomen: 'grantCognomen',
            openLegions: 'openLegions',
            raiseLegion: 'raiseLegion',
            campaignExterior: 'campaignExterior',
            holdTriumph: 'holdTriumph',
            militaryAcclamation: 'militaryAcclamation',
            openCoalitions: 'openCoalitions',
            joinDepositionCoalition: 'joinDepositionCoalition',
            leadDepositionCoalition: 'leadDepositionCoalition',
            bribeCoalitionMember: 'bribeCoalitionMember',
            purgeCoalitionLeader: 'purgeCoalitionLeader',
            concedeCoalition: 'concedeCoalition',
            crushCoalition: 'crushCoalition',
            openReligion: 'openReligion',
            seekPriesthood: 'seekPriesthood',
            obstructWithAuspices: 'obstructWithAuspices',
            deifyAncestor: 'deifyAncestor',
            damnatioMemoriae: 'damnatioMemoriae',
            openIntrigue: 'openIntrigue',
            buildSpyNetwork: 'buildSpyNetwork',
            startPoliticalConspiracy: 'startPoliticalConspiracy',
            useBlackmailHook: 'useBlackmailHook',
            openPropertyMarket: 'openPropertyMarket',
            buyMarketProperty: 'buyMarketProperty',
            sellMarketProperty: 'sellMarketProperty'
          }
          let method = map[args.action]
          if (method && typeof this[method] === 'function') return this[method](args)
          return this.openCrimes()
        },
        politicsAction(args) {
          args = args || {}
          let romanActions = {
            openRomanPower: true,
            openFactions: true,
            setPoliticalAlignment: true,
            openCursus: true,
            standForOffice: true,
            buyVotes: true,
            openClientela: true,
            fundClientela: true,
            holdClientGames: true,
            openSuccession: true,
            adoptHeir: true,
            grantCognomen: true,
            openLegions: true,
            raiseLegion: true,
            campaignExterior: true,
            holdTriumph: true,
            militaryAcclamation: true,
            openCoalitions: true,
            joinDepositionCoalition: true,
            leadDepositionCoalition: true,
            bribeCoalitionMember: true,
            purgeCoalitionLeader: true,
            concedeCoalition: true,
            crushCoalition: true,
            openReligion: true,
            seekPriesthood: true,
            obstructWithAuspices: true,
            deifyAncestor: true,
            damnatioMemoriae: true,
            openIntrigue: true,
            buildSpyNetwork: true,
            startPoliticalConspiracy: true,
            useBlackmailHook: true,
            openPropertyMarket: true,
            buyMarketProperty: true,
            sellMarketProperty: true
          }
          if (romanActions[args.action]) return this.romanSystemsAction(args)
          return previousPoliticsAction ? previousPoliticsAction.call(this, args) : this.openPolitics()
        },
        playerAuctoritasScore(society, state) {
          let base = previousPlayerAuctoritasScore ? previousPlayerAuctoritasScore.call(this, society, state) : 0
          this.ensureAdvancedRomanState(society, state)
          let pp = society.playerPolitics || {}
          let clients = parseInt(pp.clients || 0, 10) || 0
          let legions = (pp.legions || []).reduce((sum, legion) => sum + Math.round((legion.strength || 0) * (legion.loyalty || 50) / 100), 0)
          let office = (pp.cursus && pp.cursus.office) || ''
          let officeWeight = { quaestor: 8, aedile: 14, praetor: 24, consul: 40, censor: 32, pontifex: 18 }[office] || 0
          return Math.round(base + clients / 6 + legions / 8 + officeWeight)
        },
        crimeCatalog() {
          return {
            tax_fraud: { label: 'tax fraud', latin: 'fraus tributaria', baseRisk: 0.06, fine: 1.7, jail: 2, infamy: 6, description: 'Underreport taxable wealth. Gain cash now, but the censor or delatores may uncover it.' },
            peculatus: { label: 'theft from the treasury', latin: 'peculatus', baseRisk: 0.12, fine: 2.4, jail: 5, infamy: 12, description: 'Steal public money. It is lucrative and dangerous.' },
            repetundae: { label: 'provincial extortion', latin: 'repetundae', baseRisk: 0.14, fine: 2.2, jail: 4, infamy: 10, disableOffice: true, description: 'Exploit an office or governorship for private gain.' },
            adulterium: { label: 'adultery', latin: 'adulterium', baseRisk: 0.11, fine: 0.8, jail: 1, exile: true, infamy: 8, description: 'A Lex Iulia scandal. It damages marriage prospects, office, and house honour.' },
            ambitus: { label: 'electoral bribery', latin: 'ambitus', baseRisk: 0.10, fine: 1.4, jail: 2, infamy: 8, disableOffice: true, description: 'Buy votes. It helps elections, but secret ballot laws and censors make it risky.' },
            sedition: { label: 'political violence', latin: 'vis publica', baseRisk: 0.16, fine: 1.2, jail: 4, infamy: 12, description: 'Use intimidation in public politics.' },
            forgery: { label: 'forgery and private fraud', latin: 'falsum', baseRisk: 0.09, fine: 1.5, jail: 2, infamy: 7, description: 'Forge records or contracts for profit.' },
            smuggling: { label: 'smuggling', latin: 'contrabandum', baseRisk: 0.08, fine: 1.3, jail: 1, infamy: 5, tradePenalty: true, description: 'Evade harbour dues. Boat and trade houses are especially tempted.' },
            conspiracy: { label: 'conspiracy', latin: 'coniuratio', baseRisk: 0.18, fine: 1.0, jail: 6, infamy: 18, treason: true, description: 'Plot against magistrates or the ruler.' },
            maiestas: { label: 'treason', latin: 'maiestas', baseRisk: 0.22, fine: 1.0, jail: 8, infamy: 25, treason: true, description: 'Attack the majesty of the Roman state. Execution is possible.' },
            sicarii: { label: 'murder by hired killers', latin: 'sicarii', baseRisk: 0.16, fine: 2.0, jail: 8, infamy: 22, treason: false, description: 'Hire assassins to kill a rival. A Lex Cornelia de sicariis capital crime if the delatores trace it back to you.' },
            furtum: { label: 'theft', latin: 'furtum', baseRisk: 0.10, fine: 1.2, jail: 1, infamy: 6, description: 'Burglary against another house. Caught thieves owe multiple damages and lose standing.' }
          }
        },
        crimeListForUi() {
          let catalog = this.crimeCatalog()
          return Object.keys(catalog).map((id) => ({ id, ...catalog[id] }))
        },
        crimesForCharacter(society, characterId) {
          society.crimes = society.crimes || {}
          society.crimes[characterId] = society.crimes[characterId] || []
          return society.crimes[characterId]
        },
        currentConviction(society, characterId) {
          return (society.convictions || {})[characterId] || false
        },
        isImprisonedBySociety(society, characterId, state) {
          let conviction = this.currentConviction(society, characterId)
          if (!conviction) return false
          if (conviction.jail && (!conviction.until || !state || !this.monthKeyReached(conviction.until, state))) return true
          return false
        },
        crimeDetectionChance(society, state, characterId, crime) {
          let catalog = this.crimeCatalog()
          let def = catalog[crime.type] || catalog.tax_fraud
          let character = state.characters && state.characters[characterId]
          let houseId = character ? this.houseIdForCharacter(character, state, society) : ''
          let house = houseId && society.houses ? society.houses[houseId] : false
          let amount = Math.max(0, parseFloat(crime.amount || 0))
          let chance = def.baseRisk + Math.min(0.34, amount / 1800)
          if (house) chance += Math.max(0, house.heat || 0) * 0.015
          if (house && house.rivalry) chance += 0.06
          if ((society.infamy || {})[characterId]) chance += Math.min(0.16, society.infamy[characterId] / 180)
          let traits = (character && character.traits) || []
          if (traits.indexOf('liar') >= 0 || traits.indexOf('manipulator') >= 0) chance -= 0.02
          if (traits.indexOf('gossip') >= 0) chance += 0.03
          let informer = houseId ? (society.crimeInformers || {})[houseId] : null
          if (informer) chance += Math.min(0.20, (informer.level || 1) * 0.05)
          let rome = society.rome || {}
          if ((rome.policies || []).indexOf('lex_tabellaria') >= 0 && crime.type === 'ambitus') chance += 0.12
          if ((rome.policies || []).indexOf('lex_iulia_adulteriis') >= 0 && crime.type === 'adulterium') chance += 0.12
          if ((rome.policies || []).indexOf('lex_sumptuaria') >= 0 && (crime.type === 'forgery' || crime.type === 'smuggling')) chance += 0.04
          return this.clamp(chance, 0.03, 0.65)
        },
        recordCrime(society, state, characterId, type, amount, source) {
          this.ensureAdvancedRomanState(society, state)
          let crime = {
            id: 'crime_' + this.safeId(characterId) + '_' + this.monthKey(state) + '_' + this.randomInt(1000, 9999),
            type,
            amount: Math.round(parseFloat(amount || 0)),
            month: this.monthKey(state),
            exposed: false,
            source: source || 'action'
          }
          this.crimesForCharacter(society, characterId).push(crime)
          return crime
        },
        maybeExposeCrime(society, state, characterId, crime, reason) {
          if (!crime || crime.exposed) return false
          let chance = this.crimeDetectionChance(society, state, characterId, crime)
          if (Math.random() >= chance) return false
          return this.exposeCrime(society, state, characterId, crime, reason || 'investigation')
        },
        exposeCrime(society, state, characterId, crime, reason) {
          let catalog = this.crimeCatalog()
          let def = catalog[crime.type] || catalog.tax_fraud
          let character = state.characters && state.characters[characterId]
          let name = character ? this.characterName({ ...character, id: characterId }, state) : 'A Roman'
          let currentId = this.currentCharacterId(state)
          crime.exposed = true
          crime.exposedMonth = this.monthKey(state)
          crime.exposedReason = reason || 'delatores'
          society.pendingTrials = society.pendingTrials || {}
          society.pendingTrials[characterId] = {
            crimeId: crime.id,
            type: crime.type,
            amount: crime.amount || 0,
            month: this.monthKey(state),
            until: this.futureMonthKey(2)
          }
          this.log(society, name + ' is accused of ' + def.latin + ' (' + def.label + ').', 'scandal', character ? this.houseIdForCharacter(character, state, society) : '')
          let household = ((state.current && state.current.householdCharacterIds) || []).map(String)
          if (this.sameCharacterId(characterId, currentId) || household.indexOf(String(characterId)) >= 0) {
            // The player and their household have until the court sits to prepare a defence.
            this.offerTrialDefence(society, state, characterId)
          } else {
            this.resolveTrial(society, state, characterId, 'npc')
          }
          return true
        },
        trialAcquittalChance(society, state, characterId, approach, defenderId) {
          // The accused's own eloquence and a friendly house help a little; a bribe or a public
          // defence help more, up to 75%, and a plea by someone of the household up to 90%. A trial
          // saved with the older 'self' choice is pleaded by the player.
          let character = state.characters && state.characters[characterId]
          let skills = (character && character.skills) || {}
          let houseId = character ? this.houseIdForCharacter(character, state, society) : ''
          let house = houseId && society.houses ? society.houses[houseId] : false
          let defense = 0.12 + (parseFloat(skills.eloquence || 0) / 450)
          if (approach === 'bribe') defense += 0.24
          if (approach === 'publicDefense') defense += 0.16
          if (approach === 'plead' || approach === 'self') {
            let pleader = (state.characters && state.characters[approach === 'self' ? this.currentCharacterId(state) : defenderId]) || {}
            defense += parseFloat((pleader.skills || {}).eloquence || 0) * 0.015
          }
          if (house && house.relation > 30) defense += 0.06
          let plea = approach === 'plead' || approach === 'self'
          let chosen = plea || approach === 'bribe' || approach === 'publicDefense'
          return this.clamp(defense, 0.04, plea ? 0.9 : chosen ? 0.75 : 0.55)
        },
        trialDefenceCosts(society, state, characterId) {
          // A bribe costs three times the fine the court would impose, at political prices; a public
          // defence costs influence by the player's station.
          let catalog = this.crimeCatalog()
          let trial = (society.pendingTrials || {})[characterId] || {}
          let def = catalog[trial.type] || catalog.tax_fraud
          let fine = Math.round(Math.max(20, parseFloat(trial.amount || 60)) * (def.fine || 1))
          let level = this.socialLevel(this.playerStratum(state))
          return {
            fine,
            bribe: this.politicalPrice ? this.politicalPrice(fine * 3) : fine * 3,
            influence: [10, 15, 25, 40, 70, 120][level] || 40
          }
        },
        pleadsInCourt(character) {
          // Pleading needs judicial oratory (the game's rhetor education) or a lawyer's work.
          return !!character && ((character.traits || []).indexOf('oratorJudicial') >= 0 || character.job === 'lawyer')
        },
        canPleadNow(society, state, characterId) {
          let character = state.characters && state.characters[characterId]
          return !!character && !character.isDead && !character.flagIsAway && this.age(character, state) >= 16 &&
            this.pleadsInCourt(character) && !this.isImprisonedBySociety(society, characterId, state)
        },
        trialPleaders(society, state) {
          // Up to four of the household (the player and the accused included) who can plead now, the
          // most eloquent first.
          let current = state.current || {}
          let eloquence = (id) => parseFloat((((state.characters || {})[id] || {}).skills || {}).eloquence || 0)
          return this.uniqueIds([String(this.currentCharacterId(state))].concat((current.householdCharacterIds || []).map(String)))
            .filter((id) => this.canPleadNow(society, state, id))
            .sort((a, b) => eloquence(b) - eloquence(a))
            .slice(0, 4)
        },
        offerTrialDefence(society, state, characterId) {
          let trial = (society.pendingTrials || {})[characterId]
          if (!trial) return false
          let catalog = this.crimeCatalog()
          let def = catalog[trial.type] || catalog.tax_fraud
          let character = (state.characters && state.characters[characterId]) || {}
          let self = this.sameCharacterId(characterId, this.currentCharacterId(state))
          let link = '[c|' + characterId + '|' + (character.praenomen || 'The accused') + ']'
          let costs = this.trialDefenceCosts(society, state, characterId)
          let currentId = this.currentCharacterId(state)
          let odds = (approach, defenderId) => 'acquittal chance about ' + Math.round(this.trialAcquittalChance(society, state, characterId, approach, defenderId) * 100) + '%.'
          let months = Math.max(1, this.monthsUntil(trial.until, state))
          let penalty = 'If convicted: a fine of ' + costs.fine + (def.jail ? ', ' + def.jail + ' months in prison' : '') + (def.disableOffice ? ' and no office for 3 years' : '') + '.'
          let choose = (approach, defenderId) => ({ event: this.event, method: 'romanSystemsAction', context: { action: 'chooseTrialDefence', characterId, approach, defenderId } })
          let possessive = (person) => this.characterIsMale(person) ? 'his' : person.gender === 'female' || person.isMale === false ? 'her' : 'their'
          let accusedName = self ? 'you' : (character.praenomen || 'the accused')
          let pleas = this.trialPleaders(society, state).map((defenderId) => {
            let defender = (state.characters && state.characters[defenderId]) || {}
            let you = this.sameCharacterId(defenderId, currentId)
            let own = this.sameCharacterId(defenderId, characterId)
            let speaker = you ? 'you' : (defender.praenomen || 'a kinsman')
            return {
              text: own ? (you ? 'Plead your own case' : speaker + ' pleads ' + possessive(defender) + ' own case') : (you ? 'You plead for ' + accusedName : speaker + ' pleads for ' + accusedName),
              tooltip: 'Consequences: ' + (you ? 'you speak' : speaker + ' speaks') + ' for the defence before the court; ' + (you ? 'your' : possessive(defender)) + ' eloquence counts; ' + odds('plead', defenderId),
              icons: [this.lawIcon('law')],
              action: choose('plead', defenderId)
            }
          })
          if (!pleas.length) {
            pleas.push({
              text: 'Plead in court',
              disabled: true,
              showDisabledWithTooltip: 'Nobody in your household who is free to speak is a judicial orator (rhetor education in judicial oratory) or a lawyer.',
              icons: [this.lawIcon('law')],
              action: choose('plead')
            })
          }
          this.pushModal({
            title: 'Trial for ' + def.latin,
            message: (self ? 'You are' : link + ' is') + ' accused of ' + def.latin + ' (' + def.label + '). The court sits in ' + months + (months === 1 ? ' month. ' : ' months. ') + penalty,
            image: this.lawIcon('law'),
            options: pleas.concat([
              {
                variant: 'warning',
                text: 'Bribe the jurors (' + costs.bribe + ' cash)',
                tooltip: 'Consequences: -' + costs.bribe + ' cash now; ' + odds('bribe'),
                icons: [this.affairIcon('coins')],
                action: choose('bribe')
              },
              {
                variant: 'info',
                text: 'Hire a public defence (' + costs.influence + ' influence)',
                tooltip: 'Consequences: -' + costs.influence + ' influence now; a patron pleads in the forum; ' + odds('publicDefense'),
                icons: [this.affairIcon('support')],
                action: choose('publicDefense')
              },
              {
                text: 'Leave it to the court',
                tooltip: 'Consequences: no cost; ' + odds('default'),
                action: choose('default')
              }
            ])
          })
          return true
        },
        openTrialDefence({ characterId } = {}) {
          let society = this.loadForAction()
          if (!this.offerTrialDefence(society, daapi.getState(), characterId)) {
            this.openCrimes()
          }
        },
        chooseTrialDefence({ characterId, approach, defenderId } = {}) {
          let society = this.loadForAction()
          let state = daapi.getState()
          let trial = (society.pendingTrials || {})[characterId]
          if (!trial || ['plead', 'bribe', 'publicDefense', 'default'].indexOf(approach) < 0) {
            return false
          }
          let character = (state.characters && state.characters[characterId]) || {}
          let name = this.sameCharacterId(characterId, this.currentCharacterId(state)) ? 'your' : (character.praenomen || 'the accused') + "'s"
          if (trial.approach) {
            this.log(society, 'The defence for ' + name + ' trial is already prepared.', 'law')
            this.save(society)
            return false
          }
          let costs = this.trialDefenceCosts(society, state, characterId)
          let current = state.current || {}
          if (approach === 'plead' && this.trialPleaders(society, state).indexOf(String(defenderId)) < 0) {
            return false
          }
          if (approach === 'bribe') {
            if (parseFloat(current.cash || 0) < costs.bribe) {
              this.log(society, 'You cannot afford to bribe the jurors (' + costs.bribe + ' cash).', 'law')
              this.save(society)
              return false
            }
            this.applyStats({ cash: -costs.bribe })
          }
          if (approach === 'publicDefense') {
            if (parseFloat(current.influence || 0) < costs.influence) {
              this.log(society, 'You lack the influence for a public defence (' + costs.influence + ').', 'law')
              this.save(society)
              return false
            }
            this.applyStats({ influence: -costs.influence })
          }
          trial.approach = approach
          if (approach === 'plead') {
            trial.defenderId = defenderId
          }
          let defender = (state.characters && state.characters[defenderId]) || {}
          let text = {
            plead: (this.sameCharacterId(defenderId, this.currentCharacterId(state)) ? 'You' : (defender.praenomen || 'A kinsman')) + ' will plead ' + name + ' case.',
            bribe: 'The jurors in ' + name + ' trial are quietly paid.',
            publicDefense: 'A patron will plead ' + name + ' case in the forum.',
            default: name.charAt(0).toUpperCase() + name.slice(1) + ' case is left to the court.'
          }[approach]
          this.log(society, text, 'law')
          this.save(society)
          return true
        },
        resolveTrial(society, state, characterId, approach) {
          let trial = (society.pendingTrials || {})[characterId]
          if (!trial) return false
          let catalog = this.crimeCatalog()
          let def = catalog[trial.type] || catalog.tax_fraud
          let character = state.characters && state.characters[characterId]
          let houseId = character ? this.houseIdForCharacter(character, state, society) : ''
          let house = houseId && society.houses ? society.houses[houseId] : false
          let defenderId = approach === 'self' ? this.currentCharacterId(state) : trial.defenderId
          if ((approach === 'plead' || approach === 'self') && !this.canPleadNow(society, state, defenderId)) {
            let defender = (state.characters && state.characters[defenderId]) || {}
            this.log(society, (defender.praenomen || 'The chosen speaker') + ' cannot plead any more; the court decides alone.', 'law', houseId)
            approach = 'default'
          }
          if (Math.random() < this.trialAcquittalChance(society, state, characterId, approach, defenderId)) {
            if (house) house.relation = this.clamp((house.relation || 0) + 4, -100, 100)
            delete society.pendingTrials[characterId]
            this.log(society, (character ? this.characterName({ ...character, id: characterId }, state) : 'The accused') + ' is acquitted of ' + def.latin + '.', 'law', houseId)
            return { acquitted: true }
          }
          let result = this.applyCrimeSentence(society, state, characterId, trial)
          delete society.pendingTrials[characterId]
          return result
        },
        applyCrimeSentence(society, state, characterId, crime) {
          let catalog = this.crimeCatalog()
          let def = catalog[crime.type] || catalog.tax_fraud
          let currentId = this.currentCharacterId(state)
          let character = state.characters && state.characters[characterId]
          let houseId = character ? this.houseIdForCharacter(character, state, society) : ''
          let house = houseId && society.houses ? society.houses[houseId] : false
          let amount = Math.max(20, parseFloat(crime.amount || 60))
          let fine = Math.round(amount * (def.fine || 1))
          let jailMonths = Math.max(0, Math.round(def.jail || 0))
          let conviction = {
            type: crime.type,
            label: def.label,
            fine,
            paid: false,
            jail: jailMonths > 0,
            until: jailMonths > 0 ? this.futureMonthKey(jailMonths) : '',
            month: this.monthKey(state),
            officeBarredUntil: def.disableOffice ? this.futureMonthKey(36) : ''
          }
          society.convictions = society.convictions || {}
          society.convictions[characterId] = conviction
          society.infamy = society.infamy || {}
          society.infamy[characterId] = Math.round(parseFloat(society.infamy[characterId] || 0) + (def.infamy || 5))
          if (this.sameCharacterId(characterId, currentId)) {
            this.applyStats({ cash: -fine, prestige: -(def.infamy || 5), influence: -Math.round((def.infamy || 5) * 2) })
          } else if (house) {
            house.wealth = Math.max(0, Math.round((house.wealth || 0) - fine))
            house.power = Math.max(0, Math.round((house.power || 0) - (def.infamy || 5) / 2))
            house.heat = Math.max(0, (house.heat || 0) - 1)
            if (house.ai) house.ai.cash = Math.max(0, Math.round((house.ai.cash || 0) - fine))
          }
          if (jailMonths > 0) {
            society.imprisoned = society.imprisoned || []
            if (society.imprisoned.indexOf(characterId) < 0) society.imprisoned.push(characterId)
            try { daapi.updateCharacter({ characterId, character: { flagIsBusy: true } }) } catch (err) { console.warn(err) }
          }
          if (def.exile && Math.random() < 0.25) {
            conviction.exile = true
            try { daapi.updateCharacter({ characterId, character: { flagIsAway: true } }) } catch (err) { console.warn(err) }
          }
          if (def.tradePenalty && house) {
            house.ai = house.ai || {}
            house.ai.modifiers = house.ai.modifiers || {}
            house.ai.modifiers.revenue = house.ai.modifiers.revenue || []
            house.ai.modifiers.revenue.push({ factor: 0.86, until: this.futureMonthKey(8), reason: 'smuggling conviction' })
          }
          if (def.treason && Math.random() < (this.sameCharacterId(characterId, currentId) ? 0.18 : 0.28)) {
            conviction.executed = true
            this.log(society, (character ? this.characterName({ ...character, id: characterId }, state) : 'The condemned') + ' is executed for ' + def.latin + '.', 'death', houseId)
            this.save(society)
            try { daapi.kill({ characterId, deathCause: ', executed after conviction for ' + def.latin }) } catch (err) { console.warn(err) }
          } else {
            this.log(society, (character ? this.characterName({ ...character, id: characterId }, state) : 'The accused') + ' is convicted of ' + def.latin + ': fine ' + fine + (jailMonths ? ', jail ' + jailMonths + ' months' : '') + '.', 'prison', houseId)
          }
          return { convicted: true, conviction }
        },
        openCrimes() {
          let society = this.ensure()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let currentId = this.currentCharacterId(state)
          let crimes = this.crimesForCharacter(society, currentId)
          let hidden = crimes.filter((crime) => crime && !crime.exposed).length
          let exposed = crimes.filter((crime) => crime && crime.exposed).length
          let conviction = this.currentConviction(society, currentId)
          let taxOptions = [40, 120, 300].map((amount) => {
            let fake = { type: 'tax_fraud', amount }
            let risk = Math.round(this.crimeDetectionChance(society, state, currentId, fake) * 100)
            return {
              variant: amount >= 300 ? 'danger' : undefined,
              text: 'Defraud the treasury (+' + amount + ', risk ' + risk + '%)',
              tooltip: 'Fraus tributaria: gain ' + amount + ' cash now. Detection is checked now and again at tax notices/monthly audits. If caught: proportional fine, infamy, and possible jail.',
              icons: [this.lawIcon('crime'), this.affairIcon('coins')],
              action: { event: this.event, method: 'romanSystemsAction', context: { action: 'commitTaxFraud', amount } }
            }
          })
          let options = []
          let household = ((state.current && state.current.householdCharacterIds) || []).map(String)
          Object.keys(society.pendingTrials || {}).forEach((characterId) => {
            let trial = society.pendingTrials[characterId]
            let self = this.sameCharacterId(characterId, currentId)
            if (!trial || trial.approach || (!self && household.indexOf(String(characterId)) < 0)) return
            let accused = (state.characters && state.characters[characterId]) || {}
            options.push({
              variant: 'warning',
              text: 'Prepare the defence of ' + (self ? 'yourself' : (accused.praenomen || 'the accused')),
              tooltip: 'Consequences: opens the trial: plead in person, bribe the jurors, a public defence or leave it to the court.',
              icons: [this.lawIcon('law')],
              action: { event: this.event, method: 'romanSystemsAction', context: { action: 'openTrialDefence', characterId } }
            })
          })
          if (conviction && conviction.fine && !conviction.paid) {
            options.push({
              variant: 'info',
              text: 'Pay legal fine (' + conviction.fine + ')',
              tooltip: 'Pays the outstanding fine. Jail time remains unless the conviction allows release.',
              icons: [this.affairIcon('coins'), this.lawIcon('prison')],
              action: { event: this.event, method: 'romanSystemsAction', context: { action: 'payFine' } }
            })
          }
          if (this.isImprisonedBySociety(society, currentId, state)) {
            options.push({
              variant: 'danger',
              text: 'Bribe jailer (80 cash)',
              tooltip: 'Attempts early release. Failure wastes the bribe and adds infamy.',
              icons: [this.affairIcon('coins'), this.lawIcon('prison')],
              action: { event: this.event, method: 'romanSystemsAction', context: { action: 'bribeJailer' } }
            })
            options.push({
              variant: 'danger',
              text: 'Attempt escape',
              tooltip: 'Risky escape from custody. Success ends jail; failure extends the sentence.',
              icons: [this.lawIcon('prison'), this.affairIcon('rivalry')],
              action: { event: this.event, method: 'romanSystemsAction', context: { action: 'attemptEscape' } }
            })
            options.push({
              variant: 'info',
              text: 'Serve with a legion instead',
              tooltip: 'Commutes jail into twelve months of legion service. Uses the base game military-away flags and at-war status icon; it does not create a duplicate Society war.',
              icons: [this.lawIcon('legion')],
              action: { event: this.event, method: 'romanSystemsAction', context: { action: 'acceptLegionSentence' } }
            })
          }
          options = options.concat(taxOptions)
          options.push({
            text: 'Audit or denounce a rival',
            tooltip: 'Use delatores and account checks to expose a real hidden crime. If a crime is found, you gain reward and influence.',
            icons: [this.lawIcon('law'), this.affairIcon('support')],
            action: { event: this.event, method: 'romanSystemsAction', context: { action: 'openCrimeTargets' } }
          })
          options.push({
            text: 'Hire delatores (criminal informers)',
            tooltip: 'Pay informers to watch a rival house. They raise the chance its crimes are detected and make your audits and denunciations against it land. This is criminal intelligence, separate from political spies.',
            icons: [this.affairIcon('coins'), this.lawIcon('law')],
            action: { event: this.event, method: 'romanSystemsAction', context: { action: 'openCrimeIntel' } }
          })
          options.push({
            text: 'Theft and burglary',
            tooltip: 'Rob another house. Theft (furtum) is checked by the crime system: success depends on your skill and the target house, and being caught means relation loss and a possible furtum charge.',
            icons: [this.lawIcon('crime'), this.affairIcon('trade')],
            action: { event: this.event, method: 'romanSystemsAction', context: { action: 'openStealTargets' } }
          })
          options.push({ text: 'Back', action: { event: this.event, method: 'openHub' } })
          this.pushModal({
            societyMenu: true,
            title: 'Crimes, courts, and prison',
            message: 'Crime is a real Society system for every class. Hidden crimes can surface later through tax notices, censors, spies, rivals, or imperial justice.',
            societySummaryOptions: [
              this.summaryOption('Hidden crimes', hidden, [this.lawIcon('crime')], 'Unexposed crimes still checked by monthly audits.'),
              this.summaryOption('Exposed crimes', exposed, [this.lawIcon('law')], 'Known accusations and convictions.'),
              this.summaryOption('Infamy', Math.round((society.infamy || {})[currentId] || 0), [this.affairIcon('scandal')], 'Infamy closes offices, marriages, and alliances.'),
              this.summaryOption('Legal status', conviction ? (conviction.label + (conviction.jail ? ', jailed until ' + conviction.until : '')) : 'clean record', [conviction ? this.lawIcon('prison') : this.affairIcon('support')], conviction ? 'Active conviction.' : 'No active conviction.')
            ],
            image: this.lawIcon(conviction ? 'prison' : 'law'),
            options
          })
        },
        commitTaxFraud({ amount } = {}) {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let currentId = this.currentCharacterId(state)
          amount = Math.max(20, Math.round(parseFloat(amount || 40)))
          this.applyStats({ cash: amount })
          let crime = this.recordCrime(society, state, currentId, 'tax_fraud', amount, 'player')
          let caught = this.maybeExposeCrime(society, state, currentId, crime, 'fresh audit')
          if (!caught) {
            this.log(society, 'You underreport taxable wealth and hide ' + amount + ' cash from the treasury.', 'crime')
          }
          this.save(society)
          this.openCrimes()
        },
        resolveTaxFraudAtVanillaTaxNotice(society, state) {
          let currentId = this.currentCharacterId(state)
          let month = this.monthKey(state)
          if (society.lastTaxCrimeNoticeMonth === month) return ''
          society.lastTaxCrimeNoticeMonth = month
          let hidden = this.crimesForCharacter(society, currentId).filter((crime) => crime && crime.type === 'tax_fraud' && !crime.exposed)
          if (!hidden.length) return ''
          let caught = false
          hidden.forEach((crime) => {
            if (!caught && this.maybeExposeCrime(society, state, currentId, crime, 'tax notice')) caught = true
          })
          if (caught) return 'A censor compares the tax rolls and exposes your fraud. A trial and sentence follow.'
          let reduction = Math.max(5, Math.round(hidden.reduce((sum, crime) => sum + parseFloat(crime.amount || 0), 0) * 0.08))
          try { daapi.addCash({ cash: reduction }) } catch (err) { console.warn(err) }
          return 'Your false declaration goes unnoticed this time, effectively saving ' + reduction + ' cash.'
        },
        openCrimeTargets() {
          let society = this.ensure()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let options = this.sortedHouses(society).filter((house) => house && !house.isPlayerHouse).slice(0, 12).map((house) => {
            let known = this.houseCrimePressure(society, state, house)
            return {
              text: house.name + ' (suspicion ' + Math.round(known) + ')',
              tooltip: 'Audit this house. Suspicion rises with heat, criminal traits, debt, and hidden crimes. A real hidden crime can be exposed for reward.',
              icons: [this.houseCrestIcon(society, house), this.lawIcon('law')],
              action: { event: this.event, method: 'romanSystemsAction', context: { action: 'denounceCrime', houseId: house.id } }
            }
          })
          options.push({ text: 'Back', action: { event: this.event, method: 'romanSystemsAction', context: { action: 'openCrimes' } } })
          this.pushModal({ societyMenu: true, title: 'Audit or denounce', message: 'Delatores make crime political. Exposing real wrongdoing grants reward; a baseless denunciation hurts your reputation.', image: this.lawIcon('law'), options })
        },
        openCrimeIntel() {
          let society = this.ensure()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let coverage = Object.keys(society.crimeInformers || {}).filter((id) => society.houses && society.houses[id]).length
          let options = this.politicsRivalHouses(society, state).slice(0, 12).map((house) => {
            let informer = (society.crimeInformers || {})[house.id]
            let level = informer ? (informer.level || 1) : 0
            let cost = 50 + level * 30
            let label = (level ? 'Deepen informers in ' : 'Hire informers in ') + house.name + ' (lvl ' + level + ', ' + cost + ' cash)'
            return {
              text: label,
              tooltip: 'Pay ' + cost + ' cash to plant or deepen delatores in ' + house.name + '. Higher levels raise the chance its crimes are detected and strengthen your audits and denunciations against it.',
              icons: [this.houseCrestIcon(society, house), this.affairIcon('coins')],
              disabled: level >= 5,
              showDisabledWithTooltip: level >= 5,
              action: { event: this.event, method: 'romanSystemsAction', context: { action: 'hireCrimeInformers', houseId: house.id } }
            }
          })
          options.push({ text: 'Back', action: { event: this.event, method: 'romanSystemsAction', context: { action: 'openCrimes' } } })
          this.pushModal({
            societyMenu: true,
            title: 'Delatores and informers',
            message: 'Criminal informers are paid agents who watch rival houses for wrongdoing. They feed the courts, not your political schemes - this network is separate from the political spies of the Roman power systems.',
            societySummaryOptions: [
              this.summaryOption('Houses watched', coverage, [this.lawIcon('law')], 'Houses where you keep paid informers.')
            ],
            image: this.lawIcon('law'),
            options
          })
        },
        hireCrimeInformers({ houseId } = {}) {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let house = society.houses[houseId]
          if (house) {
            let informer = (society.crimeInformers || {})[house.id]
            let level = informer ? (informer.level || 1) : 0
            if (level < 5) {
              let cost = 50 + level * 30
              this.applyStats({ cash: -cost, influence: -4 })
              society.crimeInformers[house.id] = { level: Math.min(5, level + 1), month: this.monthKey(state) }
              house.heat = (house.heat || 0)
              this.log(society, 'You pay delatores to watch ' + house.name + ' for crimes (informers level ' + society.crimeInformers[house.id].level + ').', 'law', house.id)
            }
          }
          this.save(society)
          this.openCrimeIntel()
        },
        playerSecurityState(society) {
          society.security = society.security || { bodyguards: 0, lastUpkeepMonth: '' }
          society.security.bodyguards = Math.max(0, Math.min(5, parseInt(society.security.bodyguards || 0, 10) || 0))
          return society.security
        },
        playerBodyguardLevel(society) {
          return this.playerSecurityState(society).bodyguards || 0
        },
        bodyguardUpkeepCost(society) {
          return this.playerBodyguardLevel(society) * 12
        },
        chargeBodyguardUpkeep(society, state) {
          let sec = this.playerSecurityState(society)
          if (!sec.bodyguards) return false
          let month = this.monthKey(state)
          if (sec.lastUpkeepMonth === month) return false
          sec.lastUpkeepMonth = month
          let cost = this.bodyguardUpkeepCost(society)
          if (cost > 0) {
            try { daapi.addCash({ cash: -cost }) } catch (err) { console.warn(err) }
          }
          return true
        },
        characterImportance(society, state, characterId) {
          let character = state.characters && state.characters[characterId]
          if (!character) return 0
          let houseId = this.houseIdForCharacter(character, state, society)
          let house = houseId && society.houses ? society.houses[houseId] : null
          let score = this.characterScore ? this.characterScore(character, state) / 14 : 4
          let prestige = parseFloat(character.prestige || 0) / 220
          let housePower = house ? Math.max(0, house.power || 0) / 26 : 0
          let rome = society.rome || {}
          let boost = 0
          if (rome.designatedHeirId && this.sameCharacterId(characterId, rome.designatedHeirId)) boost += 4
          if (this.sameCharacterId(characterId, this.currentCharacterId(state)) && this.playerIsEmperor && this.playerIsEmperor(society, state)) boost += 6
          return this.clamp(Math.round(score + prestige + housePower + boost), 0, 20)
        },
        targetSecurityLevel(society, state, targetId) {
          if (this.sameCharacterId(targetId, this.currentCharacterId(state))) {
            return this.clamp(this.playerBodyguardLevel(society) + (this.playerIsEmperor && this.playerIsEmperor(society, state) ? 3 : 0), 0, 8)
          }
          let character = state.characters && state.characters[targetId]
          if (!character) return 0
          let houseId = this.houseIdForCharacter(character, state, society)
          let house = houseId && society.houses ? society.houses[houseId] : null
          let guards = house ? Math.round(Math.max(0, house.power || 0) / 40 + Math.max(0, house.wealth || 0) / 400) : 0
          return this.clamp(guards + Math.round(this.characterImportance(society, state, targetId) / 6), 0, 8)
        },
        assassinationSuccessChance(society, state, plotterId, targetId, plotterHouse) {
          let plotter = state.characters && state.characters[plotterId]
          let skills = (plotter && plotter.skills) || {}
          let skill = (parseFloat(skills.combat || 0) + parseFloat(skills.intelligence || 0)) / 80
          let housePower = plotterHouse ? Math.max(0, plotterHouse.power || 0) / 200 : 0
          let security = this.targetSecurityLevel(society, state, targetId)
          let importance = this.characterImportance(society, state, targetId)
          return this.clamp(0.5 + skill + housePower - security * 0.09 - importance * 0.012, 0.05, 0.9)
        },
        assassinationDetectionChance(society, state, plotterId, targetId) {
          let plotter = state.characters && state.characters[plotterId]
          let skills = (plotter && plotter.skills) || {}
          let stealth = (parseFloat(skills.intelligence || 0) + parseFloat(skills.stewardship || 0)) / 160
          let security = this.targetSecurityLevel(society, state, targetId)
          let importance = this.characterImportance(society, state, targetId)
          let target = state.characters && state.characters[targetId]
          let targetHouseId = target ? this.houseIdForCharacter(target, state, society) : ''
          let informer = targetHouseId ? (society.crimeInformers || {})[targetHouseId] : null
          let informerBonus = informer ? Math.min(0.18, (informer.level || 1) * 0.05) : 0
          return this.clamp(0.18 + security * 0.05 + importance * 0.02 + informerBonus - stealth, 0.04, 0.85)
        },
        registerPlayerMurderAttempt(args) {
          args = args || {}
          let targetId = args.targetId || args.characterId
          if (!targetId) return false
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let currentId = this.currentCharacterId(state)
          let crime = this.recordCrime(society, state, currentId, 'sicarii', 0, 'murder plot')
          let detection = this.assassinationDetectionChance(society, state, currentId, targetId)
          let target = state.characters && state.characters[targetId]
          let targetHouseId = target ? this.houseIdForCharacter(target, state, society) : ''
          let caught = Math.random() < detection
          if (caught) {
            this.exposeCrime(society, state, currentId, crime, 'delatores')
            if (targetHouseId && society.houses[targetHouseId]) {
              society.houses[targetHouseId].relation = this.clamp((society.houses[targetHouseId].relation || 0) - 30, -100, 100)
              society.houses[targetHouseId].heat = (society.houses[targetHouseId].heat || 0) + 4
            }
            this.log(society, 'Delatores trace a murder plot back to you (sicarii); the courts and the victim\'s house now know.', 'crime', targetHouseId)
          } else {
            this.log(society, 'Your hand in a murder plot stays hidden, for now.', 'crime')
          }
          this.save(society)
          return { caught }
        },
        openSecurity() {
          let society = this.ensure()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let level = this.playerBodyguardLevel(society)
          let nextCost = 80 + level * 60
          let recentThreats = (society.assassinationLog || []).slice(-5).reverse()
          let options = []
          options.push({
            variant: 'info',
            text: level >= 5 ? 'Bodyguards at maximum (lvl 5)' : 'Hire/strengthen bodyguards (lvl ' + level + ', ' + nextCost + ' cash)',
            tooltip: 'Bodyguards (a private cohort) lower the chance an assassination against you succeeds and help catch the culprits. Upkeep is ' + ((level + (level < 5 ? 1 : 0)) * 12) + ' cash per month.',
            disabled: level >= 5,
            showDisabledWithTooltip: level >= 5,
            icons: [this.affairIcon('support'), this.lawIcon('legion')],
            action: { event: this.event, method: 'romanSystemsAction', context: { action: 'hireBodyguards' } }
          })
          if (level > 0) {
            options.push({
              text: 'Dismiss bodyguards (stop upkeep)',
              tooltip: 'Disband your guards. Saves upkeep but leaves you exposed to assassins.',
              icons: [this.affairIcon('rivalry')],
              action: { event: this.event, method: 'romanSystemsAction', context: { action: 'disbandBodyguards' } }
            })
          }
          options.push({ text: 'Back', action: { event: this.event, method: 'openHub' } })
          this.pushModal({
            societyMenu: true,
            title: 'Security and bodyguards',
            message: 'Your personal safety. Bodyguards reduce assassination success and improve the chance plots against you are uncovered as crimes.' + (recentThreats.length ? '\n\nRecent threats:\n' + recentThreats.map((t) => '- ' + t).join('\n') : ''),
            societySummaryOptions: [
              this.summaryOption('Bodyguards', 'level ' + level, [this.affairIcon('support')], 'Higher levels protect you better.'),
              this.summaryOption('Monthly upkeep', this.bodyguardUpkeepCost(society) + ' cash', [this.affairIcon('coins')], 'Paid automatically each month.')
            ],
            image: this.lawIcon('legion'),
            options
          })
        },
        hireBodyguards() {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let sec = this.playerSecurityState(society)
          if (sec.bodyguards < 5) {
            let cost = 80 + sec.bodyguards * 60
            this.applyStats({ cash: -cost })
            sec.bodyguards = Math.min(5, sec.bodyguards + 1)
            this.log(society, 'You retain a stronger bodyguard cohort (level ' + sec.bodyguards + ').', 'support')
          }
          this.save(society)
          this.openSecurity()
        },
        disbandBodyguards() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let sec = this.playerSecurityState(society)
          sec.bodyguards = 0
          this.log(society, 'You dismiss your bodyguards.', 'rivalry')
          this.save(society)
          this.openSecurity()
        },
        recordAssassinationThreat(society, message) {
          society.assassinationLog = society.assassinationLog || []
          society.assassinationLog.push(message)
          if (society.assassinationLog.length > 20) society.assassinationLog = society.assassinationLog.slice(-20)
        },
        simulateAssassinations(society, state) {
          if (Math.random() > 0.12) return false
          let rivals = this.politicsRivalHouses(society, state).filter((house) => house && this.houseLivingMemberIds(society, state, house).length)
          if (!rivals.length) return false
          let plotterHouse = this.pick(rivals)
          if (!plotterHouse || (plotterHouse.heat || 0) < 1 && Math.random() < 0.5) return false
          let plotterId = this.pick(this.houseLivingMemberIds(society, state, plotterHouse))
          if (!plotterId) return false
          // Target the player sometimes (if rival/hostile), otherwise a rival of the plotter house.
          let currentId = this.currentCharacterId(state)
          let targetPlayer = plotterHouse.rivalry && Math.random() < 0.4
          let targetId = ''
          let targetHouse = null
          if (targetPlayer && currentId) {
            targetId = currentId
          } else {
            let victimHouse = this.pick(rivals.filter((house) => house && house.id !== plotterHouse.id))
            if (!victimHouse) return false
            targetHouse = victimHouse
            targetId = this.pick(this.houseLivingMemberIds(society, state, victimHouse))
          }
          if (!targetId || this.sameCharacterId(targetId, plotterId)) return false
          let success = Math.random() < this.assassinationSuccessChance(society, state, plotterId, targetId, plotterHouse)
          let detected = Math.random() < this.assassinationDetectionChance(society, state, plotterId, targetId)
          let crime = this.recordCrime(society, state, plotterId, 'sicarii', 0, 'assassination plot')
          if (detected) {
            this.exposeCrime(society, state, plotterId, crime, 'delatores')
            plotterHouse.heat = (plotterHouse.heat || 0) + 4
            plotterHouse.relation = this.clamp((plotterHouse.relation || 0) - 8, -100, 100)
          }
          let targetName = (state.characters[targetId] && this.characterName({ ...state.characters[targetId], id: targetId }, state)) || 'a rival'
          if (this.sameCharacterId(targetId, currentId)) {
            // Player target: bodyguards already lowered success via targetSecurityLevel.
            if (success) {
              this.recordAssassinationThreat(society, plotterHouse.name + ' had you killed.')
              this.log(society, plotterHouse.name + ' sends sicarii against you and the attempt succeeds.', 'crime', plotterHouse.id)
              try { daapi.kill({ characterId: currentId, deathCause: ', struck down by hired assassins' }) } catch (err) { console.warn(err) }
            } else {
              this.recordAssassinationThreat(society, plotterHouse.name + ' tried to have you killed' + (detected ? ' (uncovered)' : '') + '.')
              this.log(society, 'Your bodyguards foil an assassination sent by ' + plotterHouse.name + '.' + (detected ? ' The plot is traced to them.' : ''), 'crime', plotterHouse.id)
            }
          } else if (success) {
            this.log(society, plotterHouse.name + ' has ' + targetName + ' assassinated.' + (detected ? ' Delatores expose the deed.' : ''), 'crime', (targetHouse && targetHouse.id) || plotterHouse.id)
            try { daapi.kill({ characterId: targetId, deathCause: ', murdered by hired assassins' }) } catch (err) { console.warn(err) }
            if (targetHouse) targetHouse.relation = this.clamp((targetHouse.relation || 0) - 6, -100, 100)
          } else {
            this.log(society, plotterHouse.name + ' fails to assassinate ' + targetName + '.' + (detected ? ' The plot is uncovered.' : ''), 'rivalry', plotterHouse.id)
          }
          this.save(society)
          return true
        },
        openStealTargets() {
          let society = this.ensure()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let options = this.politicsRivalHouses(society, state).slice(0, 12).map((house) => {
            return {
              text: 'Rob ' + house.name,
              tooltip: 'Plan a burglary against this house. Detection is checked as the crime of furtum; getting caught hurts relations, prestige, and can mean a fine or jail.',
              icons: [this.houseCrestIcon(society, house), this.lawIcon('crime')],
              action: { event: this.event, method: 'romanSystemsAction', context: { action: 'openStealHouse', houseId: house.id } }
            }
          })
          options.push({ text: 'Back', action: { event: this.event, method: 'romanSystemsAction', context: { action: 'openCrimes' } } })
          this.pushModal({
            societyMenu: true,
            title: 'Theft and burglary',
            message: 'Theft (furtum) is now part of the crime system: choose a house to rob. Bigger, more powerful houses are harder and riskier.',
            image: this.lawIcon('crime'),
            options
          })
        },
        stealRepresentativeMember(society, state, house) {
          let ids = this.houseLivingMemberIds(society, state, house).filter((id) => state.characters[id] && !state.characters[id].isDead)
          return ids.length ? ids[0] : ''
        },
        openStealHouse({ houseId } = {}) {
          let society = this.ensure()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let house = society.houses && society.houses[houseId]
          if (!house) { this.openStealTargets(); return }
          let memberId = this.stealRepresentativeMember(society, state, house)
          let loot = this.stealingLootEstimate ? this.stealingLootEstimate(house, state.characters[memberId] || {}, state) : { label: 'valuables', value: 20 }
          let bribeCost = this.stealingBribeCost ? this.stealingBribeCost(loot.value) : 5
          let options = [
            { variant: 'info', text: 'Sneak into stores', tooltip: 'Balanced risk. Better with stewardship.', icons: [this.affairIcon('trade')], action: { event: this.event, method: 'romanSystemsAction', context: { action: 'stealFromHouse', houseId, approach: 'stores' } } },
            { variant: 'info', text: 'Take livestock', tooltip: 'Higher gain if the house has animals, but easier to notice.', icons: [this.lawIcon('crime')], action: { event: this.event, method: 'romanSystemsAction', context: { action: 'stealFromHouse', houseId, approach: 'livestock' } } },
            { variant: 'info', text: 'Bribe a worker (' + bribeCost + ')', tooltip: 'Lower gain, lower risk, small cash cost.', icons: [this.affairIcon('coins')], action: { event: this.event, method: 'romanSystemsAction', context: { action: 'stealFromHouse', houseId, approach: 'bribe' } } },
            { text: 'Back', action: { event: this.event, method: 'romanSystemsAction', context: { action: 'openStealTargets' } } }
          ]
          this.pushModal({
            societyMenu: true,
            title: 'Rob ' + house.name + '?',
            message: 'Possible gain: ' + loot.label + ' worth about ' + loot.value + ' cash. If you are caught it is recorded as furtum.',
            image: this.lawIcon('crime'),
            options
          })
        },
        stealFromHouse({ houseId, approach } = {}) {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let house = society.houses && society.houses[houseId]
          if (!house) { this.openStealTargets(); return }
          let currentId = this.currentCharacterId(state)
          let current = state.characters && state.characters[currentId]
          let memberId = this.stealRepresentativeMember(society, state, house)
          let loot = this.stealingLootEstimate ? this.stealingLootEstimate(house, state.characters[memberId] || {}, state) : { label: 'valuables', value: 20 }
          let skills = (current && current.skills) || {}
          let stealth = parseFloat(skills.stewardship || 0) + parseFloat(skills.combat || 0) * 0.6 + parseFloat(skills.intelligence || 0) * 0.4
          let difficulty = 28 + Math.max(0, house.power || 0) * 0.35 + Math.max(0, house.stability || 0) * 0.12
          let value = loot.value
          if (approach === 'livestock') { value = Math.round(value * 1.25); difficulty += 10 }
          else if (approach === 'bribe') { value = Math.round(value * 0.70); difficulty -= 9; this.applyStats({ cash: -(this.stealingBribeCost ? this.stealingBribeCost(loot.value) : 5) }) }
          let success = Math.random() < this.clamp(0.48 + (stealth - difficulty) / 120, 0.12, 0.82)
          let caught = !success || Math.random() < (approach === 'livestock' ? 0.28 : approach === 'bribe' ? 0.12 : 0.20)
          if (success && !caught) {
            this.applyStats({ cash: value })
            house.wealth = Math.max(0, (house.wealth || 0) - Math.round(value * 0.45))
            this.log(society, 'You burgle ' + house.name + ' and escape clean with ' + loot.label + '.', 'rivalry', house.id)
            this.save(society)
            this.pushModal({ societyMenu: true, title: 'Theft succeeds', message: 'You get away with ' + loot.label + ' worth ' + value + ' cash.', image: this.lawIcon('crime'), options: [{ text: 'Back', action: { event: this.event, method: 'romanSystemsAction', context: { action: 'openStealTargets' } } }] })
            return
          }
          let crime = this.recordCrime(society, state, currentId, 'furtum', value, 'burglary')
          house.relation = this.clamp((house.relation || 0) - this.randomInt(14, 30), -100, 100)
          house.heat = (house.heat || 0) + 2
          this.applyStats({ prestige: -6, influence: -6 })
          let exposed = this.maybeExposeCrime(society, state, currentId, crime, 'caught in the act')
          this.log(society, 'A burglary against ' + house.name + (exposed ? ' is pinned on you' : ' is noticed') + '.', 'crime', house.id)
          this.save(society)
          this.pushModal({ societyMenu: true, title: 'Caught stealing', message: 'The attempt against ' + house.name + ' goes wrong.' + (exposed ? ' You are charged with furtum.' : ' You are not formally charged this time.'), image: this.lawIcon('prison'), options: [{ text: 'Back', action: { event: this.event, method: 'romanSystemsAction', context: { action: 'openStealTargets' } } }] })
        },
        houseCrimePressure(society, state, house) {
          let score = (house.heat || 0) * 8 + Math.max(0, 50 - (house.stability || 50)) / 2
          this.houseLivingMemberIds(society, state, house).slice(0, 8).forEach((characterId) => {
            let character = state.characters[characterId] || {}
            let traits = character.traits || []
            if (traits.indexOf('liar') >= 0) score += 8
            if (traits.indexOf('manipulator') >= 0) score += 10
            if (traits.indexOf('ambitious') >= 0) score += 6
            if (traits.indexOf('adulterer') >= 0) score += 8
            score += (this.crimesForCharacter(society, characterId).filter((crime) => crime && !crime.exposed).length * 12)
          })
          let informer = (society.crimeInformers || {})[house.id]
          if (informer) score += Math.min(40, (informer.level || 1) * 10)
          return score
        },
        denounceCrime({ houseId } = {}) {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let house = society.houses[houseId]
          let found = false
          if (house) {
            // Criminal informers (delatores) deepen the audit: more members are combed
            // through, and a baseless denunciation is less reputationally costly because
            // the informers gave you a credible lead.
            let informer = (society.crimeInformers || {})[house.id]
            let reach = 10 + Math.min(8, (informer ? (informer.level || 1) : 0) * 2)
            this.houseLivingMemberIds(society, state, house).slice(0, reach).forEach((characterId) => {
              if (found) return
              let hidden = this.crimesForCharacter(society, characterId).filter((crime) => crime && !crime.exposed)
              if (hidden.length) {
                found = this.exposeCrime(society, state, characterId, hidden[0], 'denunciation')
              }
            })
            if (found) {
              this.applyStats({ cash: 40, influence: 18, prestige: 4 })
              house.relation = this.clamp((house.relation || 0) - 10, -100, 100)
              this.log(society, 'Your denunciation exposes real wrongdoing in ' + house.name + '; praemia are paid.', 'law', house.id)
            } else {
              let penalty = informer ? 0.5 : 1
              this.applyStats({ prestige: -Math.round(6 * penalty), influence: -Math.round(8 * penalty) })
              house.relation = this.clamp((house.relation || 0) - (informer ? 3 : 6), -100, 100)
              this.log(society, 'Your denunciation against ' + house.name + ' finds no proof and looks like calumnia.', 'rivalry', house.id)
            }
          }
          this.save(society)
          this.openCrimeTargets()
        },
        payFine() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let currentId = this.currentCharacterId(state)
          let conviction = this.currentConviction(society, currentId)
          if (conviction && conviction.fine && !conviction.paid) {
            this.applyStats({ cash: -conviction.fine })
            conviction.paid = true
            if (conviction.jail && conviction.until && this.monthsUntil(conviction.until, state) <= 1) {
              conviction.jail = false
              this.releasePrisoner(society, currentId)
            }
            this.log(society, 'You pay a legal fine of ' + conviction.fine + '.', 'law')
          }
          this.save(society)
          this.openCrimes()
        },
        bribeJailer() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let currentId = this.currentCharacterId(state)
          this.applyStats({ cash: -80 })
          if (Math.random() < 0.55) {
            let conviction = this.currentConviction(society, currentId)
            if (conviction) conviction.jail = false
            this.releasePrisoner(society, currentId)
            this.log(society, 'A jailer accepts your bribe and releases you early.', 'prison')
          } else {
            society.infamy[currentId] = Math.round(parseFloat(society.infamy[currentId] || 0) + 4)
            this.log(society, 'A jailer takes your money but reports the attempted bribe.', 'rivalry')
          }
          this.save(society)
          this.openCrimes()
        },
        attemptEscape() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let currentId = this.currentCharacterId(state)
          let character = state.characters[currentId] || {}
          let skills = character.skills || {}
          let chance = this.clamp(0.18 + parseFloat(skills.combat || 0) / 350, 0.08, 0.55)
          let conviction = this.currentConviction(society, currentId)
          if (Math.random() < chance) {
            if (conviction) conviction.jail = false
            this.releasePrisoner(society, currentId)
            this.log(society, 'You escape from custody and vanish into friendly households.', 'prison')
          } else {
            if (conviction) conviction.until = this.futureMonthKey(this.monthsUntil(conviction.until, state) + 2)
            society.infamy[currentId] = Math.round(parseFloat(society.infamy[currentId] || 0) + 6)
            this.log(society, 'Your escape fails; the sentence is extended.', 'rivalry')
          }
          this.save(society)
          this.openCrimes()
        },
        acceptLegionSentence() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let currentId = this.currentCharacterId(state)
          let conviction = this.currentConviction(society, currentId)
          if (!conviction || !this.isImprisonedBySociety(society, currentId, state)) {
            this.openCrimes()
            return
          }
          conviction.jail = false
          conviction.legionService = true
          conviction.legionUntil = this.futureMonthKey(12)
          conviction.until = conviction.legionUntil
          this.releasePrisoner(society, currentId)
          this.applyVanillaMilitaryService(currentId, state, { title: 'Is at war', job: 'hastati', role: 'hastatus' })
          this.log(society, 'Your sentence is commuted into service with a legion until ' + conviction.legionUntil + '.', 'war')
          this.save(society)
          this.openCrimes()
        },
        releasePrisoner(society, characterId) {
          society.imprisoned = (society.imprisoned || []).filter((id) => !this.sameCharacterId(id, characterId))
          try { daapi.updateCharacter({ characterId, character: { flagIsBusy: false } }) } catch (err) { console.warn(err) }
          this.hideSocietyStatus(characterId, 'cor_society_prison_status')
        },
        applyVanillaMilitaryService(characterId, state, options) {
          options = options || {}
          state = state || daapi.getState()
          let character = state.characters && state.characters[characterId]
          if (!character) return false
          let statuses = { ...(character.statuses || {}) }
          statuses.atWar = {
            active: true,
            title: options.title || 'Is at war',
            icon: this.vanillaMilitaryIcon('legion')
          }
          let patch = {
            flagIsUnavailable: true,
            flagIsBusy: true,
            flagIsAway: true,
            flagAtWar: true,
            flagWarStartYear: character.flagWarStartYear || state.year || 0,
            flagWarIsCommander: !!options.commander,
            flagWarYearsServed: character.flagWarYearsServed || 0,
            militaryJob: options.job || character.militaryJob || 'hastati',
            militaryRole: options.role || character.militaryRole || 'hastatus',
            civilianJob: character.civilianJob || character.job || '',
            civilianJobLevel: character.civilianJobLevel || character.jobLevel || 0,
            corSocietyLegionSentence: true,
            statuses
          }
          try {
            daapi.updateCharacter({ characterId, character: patch })
            Object.assign(character, patch)
            if (daapi.forceUpdateCharacterDisplay) {
              daapi.forceUpdateCharacterDisplay({ characterId })
            }
          } catch (err) {
            console.warn(err)
            return false
          }
          return true
        },
        clearVanillaMilitaryService(characterId, state) {
          state = state || daapi.getState()
          let character = state.characters && state.characters[characterId]
          if (!character || !character.corSocietyLegionSentence) return false
          let statuses = { ...(character.statuses || {}) }
          delete statuses.atWar
          let patch = {
            flagIsUnavailable: false,
            flagIsBusy: false,
            flagIsAway: false,
            flagAtWar: false,
            flagWarIsCommander: false,
            corSocietyLegionSentence: false,
            statuses
          }
          try {
            daapi.updateCharacter({ characterId, character: patch })
            Object.assign(character, patch)
            if (daapi.forceUpdateCharacterDisplay) {
              daapi.forceUpdateCharacterDisplay({ characterId })
            }
          } catch (err) {
            console.warn(err)
            return false
          }
          return true
        },
        syncMilitaryStatuses(society, state) {
          if (!society || !state || !state.characters) return
          Object.keys(society.convictions || {}).forEach((characterId) => {
            let conviction = society.convictions[characterId]
            if (!conviction || !conviction.legionService) return
            if (conviction.legionUntil && this.monthKeyReached(conviction.legionUntil, state)) {
              conviction.legionService = false
              conviction.legionCompleted = true
              this.clearVanillaMilitaryService(characterId, state)
              this.log(society, 'A legion sentence is completed and the veteran returns home.', 'war')
              return
            }
            this.applyVanillaMilitaryService(characterId, state, { title: 'Is at war', job: 'hastati', role: 'hastatus' })
          })
        },
        syncCrimeStatuses(society, state) {
          if (!society || !state || !state.characters) return
          let active = {}
          this._crimeStatusHashCache = this._crimeStatusHashCache || {}
          Object.keys(society.convictions || {}).forEach((characterId) => {
            let conviction = society.convictions[characterId]
            let character = state.characters[characterId]
            if (!conviction || !character || character.isDead) return
            if (conviction.jail && conviction.until && this.monthKeyReached(conviction.until, state)) {
              conviction.jail = false
              this.releasePrisoner(society, characterId)
            }
            if (!conviction.jail) return
            active[characterId] = true
            let title = 'Imprisoned for ' + (conviction.label || conviction.type) + (conviction.until ? ' until ' + conviction.until : '')
            let icon = this.lawIcon('prison')
            let hash = title + '::' + icon
            if (this._crimeStatusHashCache[characterId] === hash) return
            try {
              daapi.addCharacterStatus({
                characterId,
                key: 'cor_society_prison_status',
                status: { title, icon, active: true }
              })
              this._crimeStatusHashCache[characterId] = hash
            } catch (err) {
              console.warn(err)
            }
          })
          Object.keys(this._crimeStatusHashCache).forEach((characterId) => {
            if (!active[characterId]) delete this._crimeStatusHashCache[characterId]
          })
          this.clearStaleSocietyStatuses(state, 'cor_society_prison_status', active)
          society.crimeStatusCharacterIds = Object.keys(active)
        },
        openRomanPower() {
          let society = this.ensure()
          let state = daapi.getState()
          let rome = this.ensureAdvancedRomanState(society, state)
          let pp = society.playerPolitics || {}
          let coalition = this.activeDepositionCoalition(society)
          let options = [
            this.politicsButton('openCursus', 'Cursus honorum', 'senator', {}, { tooltip: 'Run for quaestor, aedile, praetor, consul, or censor. Offices give auctoritas, money, and legal power.' }),
            this.politicsButton('openFactions', 'Optimates and Populares (' + this.playerAlignmentLabel(society) + ')', 'senator', {}, { tooltip: 'Align with the senatorial Optimates or the popular Populares. Your bloc shifts how easily your laws pass and which houses back you.' }),
            this.politicsButton('openClientela', 'Clientela and public games', 'support', {}, { tooltip: 'Clients are a real political resource for elections, factions, legions, feuds, and coalitions.' }),
            this.politicsButton('openSuccession', 'Adoption, cognomina, and succession', 'familyTree', {}, { tooltip: 'Designate/adopt an heir, grant agnomina, and strengthen cadet lines.' }),
            this.politicsButton('openLegions', 'Legions, campaigns, and triumphs', 'rivalry', {}, { tooltip: 'Raise loyal legions, campaign abroad, hold triumphs, and seek military acclamation.' }),
            (rome.government === 'empire')
              ? this.politicsButton('openCoalitions', 'Coalitions against the Emperor' + (coalition ? ' (active)' : ''), 'rivalry', {}, { tooltip: 'Discontent houses can unite to force abdication, restore the Republic, or enthrone a candidate.' })
              : { text: 'Coalitions (only under Empire)', disabled: true, showDisabledWithTooltip: true, tooltip: 'Deposition coalitions against an Emperor only exist under imperial government.', icons: [this.affairIcon('rivalry')] },
            this.politicsButton('openReligion', 'Priesthoods and legitimacy', 'prestige', {}, { tooltip: 'Pontifex, augurs, auspices, imperial cult, deification, and damnatio memoriae.' }),
            this.politicsButton('openIntrigue', 'Political intrigue, agents, and hooks', 'slander', {}, { tooltip: 'Plant political agents, uncover secrets, create blackmail hooks, and start political conspiracies. Criminal informers (delatores) are hired separately from the crime menu.' }),
            this.politicsButton('openPropertyMarket', 'Property market and crises', 'trade', {}, { tooltip: 'Buy and sell property with houses; crises affect land, boats, livestock, and stability.' })
          ]
          options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } })
          this.pushModal({
            societyMenu: true,
            title: 'Roman power systems',
            message: 'These systems connect family, office, clientela, army, religion, economy, intrigue, and imperial succession.',
            societySummaryOptions: [
              this.summaryOption('Office', (pp.cursus && pp.cursus.office) || 'none', [this.affairIcon('senator')], 'Highest active magistracy in the cursus honorum.'),
              this.summaryOption('Clients', Math.round(pp.clients || 0), [this.affairIcon('support')], 'Political followers available for votes, factions, legions, and pressure.'),
              this.summaryOption('Legions', (pp.legions || []).length, [this.lawIcon('war')], 'Loyal military forces tied to you personally.'),
              this.summaryOption('Coalition pressure', coalition ? Math.round(coalition.strength || 0) : 0, [this.affairIcon(coalition ? 'rivalry' : 'support')], coalition ? coalition.goal : 'No active deposition coalition.')
            ],
            image: rome.government === 'empire' ? this.imperatorIcon() : this.lawIcon('law'),
            options
          })
        },
        houseFactionLean(house) {
          // Classify a house into the senatorial Optimates or the popular Populares.
          if (!house) return 'neutral'
          let stratum = house.stratum || ''
          let score = 0
          if (stratum === 'patrician' || stratum === 'senatorial') score += 2
          if (stratum === 'equestrian') score += 1
          if (stratum === 'commoner' || stratum === 'plebeian') score -= 1
          if (stratum === 'poor') score -= 2
          if ((house.wealth || 0) >= 220) score += 1
          if ((house.wealth || 0) <= 60) score -= 1
          if (house.factionLean === 'optimates') score += 2
          if (house.factionLean === 'populares') score -= 2
          if (score > 0) return 'optimates'
          if (score < 0) return 'populares'
          return 'neutral'
        },
        factionCounts(society, state) {
          let counts = { optimates: 0, populares: 0, neutral: 0 }
          let optimates = []
          let populares = []
          Object.keys((society && society.houses) || {}).forEach((id) => {
            let house = society.houses[id]
            if (!house) return
            let lean = this.houseFactionLean(house)
            counts[lean] = (counts[lean] || 0) + 1
            if (lean === 'optimates') optimates.push(id)
            else if (lean === 'populares') populares.push(id)
          })
          let rome = this.ensureRomeState(society)
          rome.factions = { optimates, populares }
          return counts
        },
        playerAlignment(society) {
          let pp = (society && society.playerPolitics) || {}
          return pp.alignment === 'optimates' || pp.alignment === 'populares' ? pp.alignment : 'neutral'
        },
        playerAlignmentLabel(society) {
          let a = this.playerAlignment(society)
          return a === 'optimates' ? 'Optimates' : a === 'populares' ? 'Populares' : 'Unaligned'
        },
        lawFactionModifier(society, state) {
          // The bundled power laws expand the leader's authority against the Senate,
          // so they are inherently popularis-flavoured (the Optimates resist them).
          let alignment = this.playerAlignment(society)
          let counts = this.factionCounts(society, state)
          let total = (counts.optimates || 0) + (counts.populares || 0) || 1
          let popularShare = (counts.populares || 0) / total
          let modifier = 0
          if (alignment === 'populares') {
            // The assemblies and tribunes back you; aligned houses add weight.
            modifier += 0.12 + popularShare * 0.12
          } else if (alignment === 'optimates') {
            // Pushing power laws cuts against your own senatorial bloc.
            modifier -= 0.10
          }
          return this.clamp(modifier, -0.2, 0.25)
        },
        openFactions() {
          let society = this.ensure()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let counts = this.factionCounts(society, state)
          let alignment = this.playerAlignment(society)
          let options = [
            this.politicsButton('setPoliticalAlignment', (alignment === 'optimates' ? '* ' : '') + 'Champion the Optimates', 'senator', { alignment: 'optimates' }, { tooltip: 'Stand with the senatorial elite. Optimate houses warm to you; popular power laws pass harder.' }),
            this.politicsButton('setPoliticalAlignment', (alignment === 'populares' ? '* ' : '') + 'Champion the Populares', 'support', { alignment: 'populares' }, { tooltip: 'Stand with the assemblies and the urban plebs. Your power laws pass more easily; Optimate houses resent you.' }),
            this.politicsButton('setPoliticalAlignment', (alignment === 'neutral' ? '* ' : '') + 'Stay unaligned', 'log', { alignment: 'neutral' }, { tooltip: 'Hold no factional banner. No bonus or penalty to legislation.' })
          ]
          options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openRomanPower' } } })
          this.pushModal({
            societyMenu: true,
            title: 'Optimates and Populares',
            message: 'The late Republic is split between the Optimates (senatorial tradition) and the Populares (popular reform). Your alignment shifts how your power laws fare in the assemblies.',
            societySummaryOptions: [
              this.summaryOption('Your banner', this.playerAlignmentLabel(society), [this.affairIcon('senator')], 'Your current factional alignment.'),
              this.summaryOption('Optimates', counts.optimates || 0, [this.affairIcon('senator')], 'Senatorial-leaning houses currently simulated.'),
              this.summaryOption('Populares', counts.populares || 0, [this.affairIcon('support')], 'Popular-leaning houses currently simulated.')
            ],
            image: this.lawIcon('law'),
            options
          })
        },
        setPoliticalAlignment({ alignment } = {}) {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let pp = society.playerPolitics
          let next = alignment === 'optimates' || alignment === 'populares' ? alignment : 'neutral'
          let previous = this.playerAlignment(society)
          pp.alignment = next
          if (next !== 'neutral' && next !== previous) {
            // Houses react to your new banner: aligned houses warm, opposed houses cool.
            Object.keys(society.houses || {}).forEach((id) => {
              let house = society.houses[id]
              if (!house) return
              let lean = this.houseFactionLean(house)
              if (lean === 'neutral') return
              if (lean === next) {
                house.relation = this.clamp((house.relation || 0) + 6, -100, 100)
              } else {
                house.relation = this.clamp((house.relation || 0) - 5, -100, 100)
                house.heat = (house.heat || 0) + 2
              }
            })
            this.log(society, 'You declare yourself a champion of the ' + (next === 'optimates' ? 'Optimates' : 'Populares') + '.', 'senator')
          } else if (next === 'neutral' && previous !== 'neutral') {
            this.log(society, 'You set aside your factional banner and stand unaligned.', 'senator')
          }
          this.save(society)
          this.openFactions()
        },
        cursusOfficeList() {
          return [
            { id: 'quaestor', title: 'Quaestor', minAge: 30, cost: 80, influence: 25, prestige: 12, clients: 10, next: 'aedile', description: 'Treasury office. Opens the formal cursus and gives modest cash authority.' },
            { id: 'aedile', title: 'Aedile', minAge: 36, cost: 120, influence: 40, prestige: 24, clients: 18, next: 'praetor', description: 'Public works and games. Strong for popularity and clientela.' },
            { id: 'praetor', title: 'Praetor', minAge: 39, cost: 170, influence: 70, prestige: 36, clients: 24, next: 'consul', description: 'Judicial imperium. Improves trials, law proposals, and governorship claims.' },
            { id: 'consul', title: 'Consul', minAge: 42, cost: 260, influence: 120, prestige: 60, clients: 36, next: 'censor', description: 'The summit of Republican office. Greatly improves dictatorship and command gates.' },
            { id: 'censor', title: 'Censor', minAge: 45, cost: 210, influence: 90, prestige: 50, clients: 22, next: '', description: 'Audits morals and property. Increases crime detection and social control.' }
          ]
        },
        openCursus() {
          let society = this.ensure()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let pp = society.playerPolitics
          let current = state.characters[this.currentCharacterId(state)] || state.current || {}
          let age = this.age(current, state)
          let conviction = this.currentConviction(society, this.currentCharacterId(state))
          let options = this.cursusOfficeList().map((office) => {
            let eligible = age >= office.minAge && (!conviction || !conviction.officeBarredUntil || this.monthKeyReached(conviction.officeBarredUntil, state))
            let held = (pp.cursus.history || []).some((entry) => entry && entry.office === office.id)
            let text = (held ? '* ' : '') + 'Stand for ' + office.title + ' (' + office.cost + ' cash)'
            let tooltip = office.description + '\nMinimum age: ' + office.minAge + '. Consequences: on victory gain prestige/influence/clientela; failure costs face. Buying votes adds ambitus crime risk.'
            return this.politicsButton('standForOffice', text, 'senator', { officeId: office.id }, eligible ? { tooltip } : { disabled: true, showDisabledWithTooltip: true, tooltip: tooltip + '\nLocked: age ' + Math.round(age) + (conviction ? ' or office bar.' : '.') })
          })
          options.push(this.politicsButton('buyVotes', 'Buy votes (ambitus, +campaign chance)', 'coins', {}, { tooltip: 'Spend 90 cash for a strong election bonus. Also records a hidden ambitus crime checked by censors.' }))
          options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openRomanPower' } } })
          this.pushModal({ societyMenu: true, title: 'Cursus honorum', message: 'The Roman career ladder is now playable. Age, offices, cash, clients, and ambitus all matter.', image: this.affairIcon('senator'), options })
        },
        standForOffice({ officeId } = {}) {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let pp = society.playerPolitics
          let office = this.cursusOfficeList().find((item) => item.id === officeId)
          if (!office) return this.openCursus()
          this.applyStats({ cash: -office.cost, influence: -Math.round(office.cost / 8) })
          let auctoritas = this.playerAuctoritasScore(society, state)
          let chance = this.clamp(0.28 + auctoritas / 300 + (pp.clients || 0) / 400 + (pp.cursus.ambitus || 0) / 100, 0.08, 0.88)
          pp.cursus.ambitus = Math.max(0, Math.round((pp.cursus.ambitus || 0) * 0.35))
          if (Math.random() < chance) {
            pp.cursus.office = office.id
            pp.cursus.history = pp.cursus.history || []
            pp.cursus.history.push({ office: office.id, month: this.monthKey(state) })
            pp.cursus.lastElectionMonth = this.monthKey(state)
            pp.clients = Math.round((pp.clients || 0) + office.clients)
            pp.auctoritas = parseFloat(pp.auctoritas || 0) + Math.round(office.prestige / 3)
            this.applyStats({ prestige: office.prestige, influence: office.influence })
            this.log(society, 'You are elected ' + office.title + ' in the cursus honorum.', 'senator')
          } else {
            this.applyStats({ prestige: -8 })
            this.log(society, 'Your campaign for ' + office.title + ' fails in the assemblies.', 'rivalry')
          }
          this.save(society)
          this.openCursus()
        },
        buyVotes() {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          this.applyStats({ cash: -90 })
          society.playerPolitics.cursus.ambitus = Math.round((society.playerPolitics.cursus.ambitus || 0) + 35)
          this.recordCrime(society, state, this.currentCharacterId(state), 'ambitus', 90, 'election')
          this.log(society, 'You buy votes through tribal brokers. The campaign improves, but ambitus is now hidden in your record.', 'crime')
          this.save(society)
          this.openCursus()
        },
        openClientela() {
          let society = this.ensure()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let pp = society.playerPolitics
          let options = [
            this.politicsButton('fundClientela', 'Distribute sportulae (' + (this.politicalPrice ? this.politicalPrice(60) : 60) + ' cash, +clients)', 'coins', {}, { tooltip: 'Daily patronage payments grow your clientela and improve lower-order relations.' }),
            this.politicsButton('holdClientGames', 'Hold ludi and games (' + (this.politicalPrice ? this.politicalPrice(140) : 140) + ' cash)', 'prestige', {}, { tooltip: 'Public games add clients, popularity, and prestige, but may look demagogic to elites.' })
          ]
          options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openRomanPower' } } })
          this.pushModal({
            societyMenu: true,
            title: 'Clientela',
            message: 'Clients are now a resource. They help elections, faction recruitment, feuds, legions, and deposition coalitions.',
            societySummaryOptions: [
              this.summaryOption('Clients', Math.round(pp.clients || 0), [this.affairIcon('support')], 'Your personal clientela.'),
              this.summaryOption('Auctoritas effect', '+' + Math.round((pp.clients || 0) / 6), [this.affairIcon('influence')], 'Clients directly improve political weight.')
            ],
            image: this.affairIcon('support'),
            options
          })
        },
        fundClientela() {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          this.applyStats({ cash: -60, prestige: 2 })
          society.playerPolitics.clients = Math.round((society.playerPolitics.clients || 0) + this.randomInt(6, 14))
          this.sortedHouses(society).filter((house) => this.socialLevel(house.stratum) <= 2).slice(0, 8).forEach((house) => {
            house.relation = this.clamp((house.relation || 0) + 2, -100, 100)
          })
          this.log(society, 'Your sportulae bind more clients to your house.', 'support')
          this.save(society)
          this.openClientela()
        },
        holdClientGames() {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          this.applyStats({ cash: -140, prestige: 18, influence: 12 })
          society.playerPolitics.clients = Math.round((society.playerPolitics.clients || 0) + this.randomInt(14, 30))
          this.sortedHouses(society).slice(0, 12).forEach((house) => {
            let delta = this.socialLevel(house.stratum) <= 2 ? 5 : -1
            house.relation = this.clamp((house.relation || 0) + delta, -100, 100)
          })
          this.log(society, 'You hold public games; the plebs cheer and your clientela grows.', 'prestige')
          this.save(society)
          this.openClientela()
        },
        openSuccession() {
          let society = this.ensure()
          let state = daapi.getState()
          let rome = this.ensureAdvancedRomanState(society, state)
          let currentId = this.currentCharacterId(state)
          let playerHouse = this.playerPoliticsHouse ? this.playerPoliticsHouse(society, state) : false
          let seenCandidate = {}
          let validCandidate = (id) => {
            if (!id || seenCandidate[String(id)] || this.sameCharacterId(id, currentId)) return false
            let character = state.characters[id]
            if (!character || character.isDead || this.age(character, state) < 12) return false
            if (character.corSocietyDesignatedHeir) return false
            seenCandidate[String(id)] = true
            return true
          }
          let candidates = playerHouse ? this.houseLivingMemberIds(society, state, playerHouse).filter(validCandidate).slice(0, 8) : []
          let options = candidates.map((characterId) => {
            let character = state.characters[characterId]
            return this.politicsButton('adoptHeir', 'Adopt/designate ' + this.characterName({ ...character, id: characterId }, state), 'familyTree', { characterId }, { tooltip: 'Roman adoption as succession: sets this person as designated heir in Society and strengthens designation succession.' })
          })
          // Roman adoption could cross houses: allow adopting from allied (faction) houses too.
          let alliedHouseIds = ((society.playerPolitics && society.playerPolitics.faction) || []).filter((houseId) => society.houses[houseId] && (!playerHouse || String(houseId) !== String(playerHouse.id)))
          let alliedAdded = 0
          alliedHouseIds.slice(0, 6).forEach((houseId) => {
            let allyHouse = society.houses[houseId]
            this.houseLivingMemberIds(society, state, allyHouse).filter(validCandidate).slice(0, 2).forEach((characterId) => {
              if (alliedAdded >= 8) return
              let character = state.characters[characterId]
              alliedAdded += 1
              options.push(this.politicsButton('adoptHeir', 'Adopt from ' + allyHouse.name + ': ' + this.characterName({ ...character, id: characterId }, state), 'familyTree', { characterId }, { tooltip: 'Adopt a member of an allied house as your heir (Roman adoption crossed houses, e.g. the Julio-Claudians).' }))
            })
          })
          options.push(this.politicsButton('grantCognomen', 'Grant earned cognomen', 'prestige', {}, { tooltip: 'Award an agnomen such as Magnus, Africanus, Felix, Pius, or Victor after achievements. Raises house prestige and distinguishes names.' }))
          options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openRomanPower' } } })
          this.pushModal({
            societyMenu: true,
            title: 'Adoption and succession',
            message: 'Adoption now matters to imperial designation and house continuity. Cognomina add prestige and help distinguish repeated Roman names.',
            societySummaryOptions: [
              this.summaryOption('Succession law', rome.successionLaw || 'designation', [this.affairIcon('familyTree')], 'Designation/adoption, wealth, or power.'),
              this.summaryOption('Designated heir', rome.designatedHeirId && state.characters[rome.designatedHeirId] ? this.characterName({ ...state.characters[rome.designatedHeirId], id: rome.designatedHeirId }, state) : 'none', [this.affairIcon('familyTree')], 'Society heir for imperial designation.'),
              this.summaryOption('Agnomina', (society.playerPolitics.agnomina || []).join(', ') || 'none', [this.affairIcon('prestige')], 'Earned cognomina attached to this political line.')
            ],
            image: this.affairIcon('familyTree'),
            options
          })
        },
        adoptHeir({ characterId } = {}) {
          let society = this.loadForAction()
          let state = daapi.getState()
          let rome = this.ensureAdvancedRomanState(society, state)
          let character = state.characters[characterId]
          let currentId = this.currentCharacterId(state)
          let player = state.characters[currentId] || state.current || {}
          // You cannot adopt yourself or your own spouse as heir.
          if (this.sameCharacterId(currentId, characterId) || (player.spouseId && this.sameCharacterId(player.spouseId, characterId))) {
            this.save(society)
            this.openSuccession()
            return
          }
          if (character) {
            rome.designatedHeirId = characterId
            rome.successionLaw = 'designation'
            society.adoptions.push({ adopterId: this.currentCharacterId(state), adoptedId: characterId, month: this.monthKey(state) })
            try { daapi.updateCharacter({ characterId, character: { corSocietyAdoptedBy: this.currentCharacterId(state), corSocietyDesignatedHeir: true } }) } catch (err) { console.warn(err) }
            this.applyStats({ prestige: 10, influence: -20 })
            this.log(society, 'You adopt/designate ' + this.characterName({ ...character, id: characterId }, state) + ' as heir.', 'familyTree')
          }
          this.save(society)
          this.openSuccession()
        },
        _awardCognomenSilent(society, state) {
          // Awards a cognomen and registers it, WITHOUT any menu navigation, so callers
          // (e.g. holdTriumph) can decide where to go next.
          this.ensureAdvancedRomanState(society, state)
          let pool = ['Magnus', 'Felix', 'Victor', 'Pius', 'Africanus', 'Germanicus', 'Aequus', 'Restitutor']
          let name = this.pick(pool.filter((item) => (society.playerPolitics.agnomina || []).indexOf(item) < 0)) || this.pick(pool)
          society.playerPolitics.agnomina.push(name)
          let currentId = this.currentCharacterId(state)
          try { daapi.updateCharacter({ characterId: currentId, character: { corSocietyAgnomen: name } }) } catch (err) { console.warn(err) }
          let house = this.playerPoliticsHouse(society, state)
          if (house) house.prestige = Math.round((house.prestige || 0) + 400)
          this.applyStats({ prestige: 35 })
          this.log(society, 'The cognomen ' + name + ' is acclaimed for your house.', 'prestige')
          return name
        },
        grantCognomen() {
          let society = this.loadForAction()
          let state = daapi.getState()
          this._awardCognomenSilent(society, state)
          this.save(society)
          this.openSuccession()
        },
        openLegions() {
          let society = this.ensure()
          let state = daapi.getState()
          let rome = this.ensureAdvancedRomanState(society, state)
          let pp = society.playerPolitics
          let pending = rome.civilWarPending
          let acclamationButton
          if (this.playerIsEmperor && this.playerIsEmperor(society, state)) {
            acclamationButton = { text: 'You are already Emperor', disabled: true, showDisabledWithTooltip: true, tooltip: 'You already hold the purple; you cannot be acclaimed Emperor again.', icons: [this.imperatorIcon ? this.imperatorIcon() : this.lawIcon('dictator')] }
          } else if (pending) {
            let months = Math.max(0, this.monthIndex(pending.resolveMonth) - this.monthIndex(this.monthKey(state)))
            acclamationButton = { text: 'Civil war pending - resolves in ' + months + ' month(s)', disabled: true, showDisabledWithTooltip: true, tooltip: 'Your legions have moved on Rome. The houses are taking sides; the outcome resolves automatically.', icons: [this.lawIcon('war')] }
          } else {
            acclamationButton = this.politicsButton('militaryAcclamation', 'Seek military acclamation as Imperator', 'dictator', {}, { tooltip: 'Alternative path to Empire. Requires at least 2 allied houses and 1 loyal legion; triggers a multi-month civil war.' })
          }
          let options = [
            this.politicsButton('raiseLegion', 'Raise a loyal legion (' + (this.politicalPrice ? this.politicalPrice(220) : 220) + ' cash, 20 clients)', 'rivalry', {}, { tooltip: 'Creates a personal legion with strength and loyalty. Upkeep is checked monthly.' }),
            this.politicsButton('campaignExterior', 'Campaign abroad', 'rivalry', {}, { tooltip: 'Uses loyal legions for booty, slaves, prestige, triumphs, and cognomina. Defeat hurts stability and can fuel coalitions.' }),
            this.politicsButton('holdTriumph', 'Hold triumph (requires victory)', 'prestige', {}, { tooltip: 'Spend victory claims for prestige, clients, and a cognomen.' }),
            acclamationButton
          ]
          options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openRomanPower' } } })
          this.pushModal({
            societyMenu: true,
            title: 'Legions and war',
            message: 'Legions are personally loyal forces. They cost money, create victories, and can acclaim an emperor.',
            societySummaryOptions: [
              this.summaryOption('Legions', (pp.legions || []).length, [this.lawIcon('war')], 'Personal forces.'),
              this.summaryOption('Victories', Math.round(pp.victories || 0), [this.affairIcon('prestige')], 'Victories can support triumphs and imperial claims.'),
              this.summaryOption('Clients', Math.round(pp.clients || 0), [this.affairIcon('support')], 'Clientela helps recruitment and legitimacy.')
            ],
            image: this.lawIcon('war'),
            options
          })
        },
        raiseLegion() {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let pp = society.playerPolitics
          if ((pp.clients || 0) < 20) {
            this.pushModal({ societyMenu: true, title: 'Not enough clients', message: 'Raising a legion requires at least 20 clients as recruiters, veterans, and local brokers.', image: this.affairIcon('support'), options: [{ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openLegions' } } }] })
            return
          }
          this.applyStats({ cash: -220, influence: -35 })
          pp.clients = Math.max(0, Math.round((pp.clients || 0) - 20))
          pp.legions.push({ id: 'legion_' + this.monthKey(state) + '_' + this.randomInt(10, 99), strength: this.randomInt(45, 70), loyalty: this.randomInt(55, 80), raised: this.monthKey(state) })
          this.log(society, 'You raise a loyal legion. Its oath is to your house more than to the Senate.', 'war')
          this.save(society)
          this.openLegions()
        },
        campaignExterior() {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let pp = society.playerPolitics
          let strength = (pp.legions || []).reduce((sum, legion) => sum + (legion.strength || 0) * (legion.loyalty || 50) / 100, 0)
          let chance = this.clamp(0.30 + strength / 220 + this.playerAuctoritasScore(society, state) / 500, 0.12, 0.86)
          this.applyStats({ cash: -80, influence: -20 })
          if (Math.random() < chance) {
            let booty = this.randomInt(120, 380)
            pp.victories = Math.round((pp.victories || 0) + 1)
            pp.clients = Math.round((pp.clients || 0) + this.randomInt(8, 18))
            this.applyStats({ cash: booty, prestige: 38, influence: 18 })
            this.log(society, 'A foreign campaign in ' + this.romanPlace('region') + ' succeeds: booty ' + booty + ', captives, and prestige return to Rome.', 'war')
          } else {
            this.applyStats({ prestige: -20, influence: -20 })
            ;(pp.legions || []).forEach((legion) => {
              legion.strength = Math.max(10, Math.round((legion.strength || 40) * 0.82))
              legion.loyalty = Math.max(10, Math.round((legion.loyalty || 50) - 8))
            })
            this.log(society, 'A foreign campaign fails; casualties and shame weaken your legions.', 'rivalry')
          }
          this.save(society)
          this.openLegions()
        },
        holdTriumph() {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let pp = society.playerPolitics
          if ((pp.victories || 0) <= 0) {
            this.pushModal({ societyMenu: true, title: 'No victory claim', message: 'A triumph requires a recent foreign victory.', image: this.affairIcon('prestige'), options: [{ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openLegions' } } }] })
            return
          }
          pp.victories = Math.max(0, Math.round((pp.victories || 0) - 1))
          pp.clients = Math.round((pp.clients || 0) + 24)
          this.applyStats({ cash: -120, prestige: 80, influence: 35 })
          this._awardCognomenSilent(society, state)
          this.save(society)
          this.openLegions()
        },
        militaryAcclamation() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let rome = this.ensureAdvancedRomanState(society, state)
          let pp = society.playerPolitics
          let backToLegions = (title, message, icon) => {
            this.save(society)
            this.pushModal({ societyMenu: true, title, message, image: icon || this.lawIcon('war'), options: [{ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openLegions' } } }] })
          }
          if (this.playerIsEmperor && this.playerIsEmperor(society, state)) {
            backToLegions('Already Emperor', 'You already hold the purple.', this.imperatorIcon ? this.imperatorIcon() : null)
            return
          }
          if (rome.civilWarPending) {
            backToLegions('Civil war under way', 'A civil war for the purple is already in progress; it will resolve on its own.')
            return
          }
          if ((pp.faction || []).filter((id) => society.houses[id]).length < 2) {
            backToLegions('Not enough allies', 'You need at least 2 allied houses in your faction to risk marching on Rome.', this.affairIcon('support'))
            return
          }
          if ((pp.legions || []).length < 1) {
            backToLegions('No loyal legion', 'You need at least one loyal legion to attempt a military acclamation.', this.lawIcon('war'))
            return
          }
          // Multi-turn civil war: register a pending crisis that resolves in 3 months.
          let house = this.playerPoliticsHouse(society, state)
          let strength = (pp.legions || []).reduce((sum, legion) => sum + (legion.strength || 0) * (legion.loyalty || 50) / 100, 0) + (pp.clients || 0) / 4 + this.playerAuctoritasScore(society, state) / 3
          rome.civilWarPending = { claimantHouseId: house ? house.id : '', strength: Math.round(strength), month: this.monthKey(state), resolveMonth: this.futureMonthKey(3) }
          this.applyStats({ cash: -150, influence: -40 })
          this.politicsRivalHouses(society, state).slice(0, 12).forEach((h) => { h.stability = this.clamp((h.stability || 50) - 5, 0, 100) })
          this.log(society, 'Your legions march on Rome and acclaim you Imperator. The houses must now take sides; civil war looms.', 'war')
          this.save(society)
          this.pushModal({ societyMenu: true, title: 'The legions march', message: 'You have begun a bid for the purple by force. Over the next 3 months the great houses will take sides, and the civil war will resolve. Win, and you are Imperator; lose, and you may be executed.', image: this.lawIcon('war'), options: [{ text: 'Continue', action: { event: this.event, method: 'politicsAction', context: { action: 'openLegions' } } }] })
        },
        resolveCivilWarPending(society, state) {
          let rome = society.rome || {}
          let pending = rome.civilWarPending
          if (!pending) return false
          if (!this.monthKeyReached(pending.resolveMonth, state)) return false
          rome.civilWarPending = false
          let pp = society.playerPolitics || {}
          let playerStrength = (pending.strength || 0) + (pp.legions || []).reduce((sum, legion) => sum + (legion.strength || 0) * (legion.loyalty || 50) / 100, 0)
          let opposition = this.politicsRivalHouses(society, state).slice(0, 12).reduce((sum, house) => sum + (this.houseCoalitionStrength ? this.houseCoalitionStrength(society, house) / 2 : (house.power || 0)), 0)
          if (playerStrength >= opposition * (0.85 + Math.random() * 0.3)) {
            this.becomeEmperor(society, state)
            this.log(society, 'The civil war ends: your legions prevail and you are acclaimed Imperator.', 'war')
          } else {
            try { this.triggerCivilWar(society, state, { title: 'failed acclamation', civilWar: 1, oppose: 10 }) } catch (err) { console.warn(err) }
            this.log(society, 'The civil war ends in defeat; your bid for the purple is crushed.', 'rivalry')
          }
          return true
        },
        activeDepositionCoalition(society) {
          let coalitions = ((society.rome || {}).depositionCoalitions || []).filter((coalition) => coalition && coalition.status === 'active')
          return coalitions.sort((a, b) => (b.strength || 0) - (a.strength || 0))[0] || false
        },
        houseCoalitionStrength(society, house) {
          if (!house) return 0
          return Math.round((house.power || 0) * 2 + (house.wealth || 0) / 120 + (house.clients || 0) * 1.5 + (house.strength || 0))
        },
        emperorDefenseStrength(society, state) {
          let rome = society.rome || {}
          let ruler = rome.rulerHouseId && society.houses[rome.rulerHouseId]
          let base = ruler ? this.houseCoalitionStrength(society, ruler) : 160
          if (this.playerIsEmperor && this.playerIsEmperor(society, state)) {
            let pp = society.playerPolitics || {}
            base += (pp.clients || 0) * 2
            base += (pp.legions || []).reduce((sum, legion) => sum + (legion.strength || 0) * (legion.loyalty || 50) / 80, 0)
          }
          return Math.round(base)
        },
        computeHouseImperialDiscontent(society, state, house) {
          let rome = society.rome || {}
          let discontent = Math.max(0, -(house.relation || 0)) + (house.heat || 0) * 8 + Math.max(0, (house.power || 0) - 70) / 2
          if ((rome.policies || []).indexOf('proscriptions') >= 0) discontent += 18
          if ((rome.policies || []).indexOf('lex_frumentaria') >= 0 && this.socialLevel(house.stratum) <= 2) discontent -= 12
          if (house.rivalry) discontent += 18
          if (String(house.id) === String(rome.rulerHouseId)) discontent = 0
          return this.clamp(discontent, 0, 160)
        },
        openCoalitions() {
          let society = this.ensure()
          let state = daapi.getState()
          let rome = this.ensureAdvancedRomanState(society, state)
          let coalition = this.activeDepositionCoalition(society)
          let options = []
          if (coalition) {
            let isEmperorNow = this.playerIsEmperor && this.playerIsEmperor(society, state)
            if (!isEmperorNow) {
              if (!coalition.playerJoined) options.push(this.politicsButton('joinDepositionCoalition', 'Join coalition', 'rivalry', {}, { tooltip: 'Add your house strength to the coalition against the current emperor.' }))
              options.push(this.politicsButton('leadDepositionCoalition', 'Attempt to lead deposition', 'dictator', {}, { tooltip: 'If your power is high enough, seize leadership and force an ultimatum or civil war.' }))
            }
            if (isEmperorNow) {
              options.push(this.politicsButton('bribeCoalitionMember', 'Buy off conspirators (' + (this.politicalPrice ? this.politicalPrice(160) : 160) + ' cash)', 'coins', {}, { tooltip: 'Reduce coalition strength by bribing or appointing a member.' }))
              options.push(this.politicsButton('purgeCoalitionLeader', 'Purge coalition leader', 'prison', {}, { tooltip: 'Imperial justice against the leader. High tyranny and assassination risk.' }))
              options.push(this.politicsButton('concedeCoalition', 'Concede a popular law', 'support', {}, { tooltip: 'Lower discontent by accepting a policy or succession concession.' }))
              options.push(this.politicsButton('crushCoalition', 'Crush coalition militarily', 'war', {}, { tooltip: 'Use legions and loyal houses. Failure can depose or execute the emperor.' }))
            }
          } else if (rome.government === 'empire' && !this.playerIsEmperor(society, state)) {
            options.push(this.politicsButton('leadDepositionCoalition', 'Form anti-emperor coalition', 'rivalry', {}, { tooltip: 'Gather discontent houses behind abdication, republic restoration, or your candidate.' }))
          } else {
            options.push({ text: 'No active coalition', disabled: true, showDisabledWithTooltip: true, tooltip: 'Coalitions form monthly when enough houses become discontent under an empire.', icons: [this.affairIcon('support')] })
          }
          options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openRomanPower' } } })
          this.pushModal({
            societyMenu: true,
            title: 'Deposition coalitions',
            message: coalition ? ('Goal: ' + coalition.goal + '. Leader: ' + (society.houses[coalition.leaderHouseId] ? society.houses[coalition.leaderHouseId].name : 'unknown') + '.') : 'No coalition is active right now.',
            societySummaryOptions: [
              this.summaryOption('Government', rome.government || 'republic', [this.affairIcon('senator')], 'Coalitions matter under an empire.'),
              this.summaryOption('Coalition strength', coalition ? Math.round(coalition.strength || 0) : 0, [this.affairIcon(coalition ? 'rivalry' : 'support')], coalition ? 'Combined discontent house strength.' : 'None.'),
              this.summaryOption('Imperial defense', this.emperorDefenseStrength(society, state), [this.imperatorIcon ? this.imperatorIcon() : this.affairIcon('senator')], 'Ruler house, clients, offices, and legions.')
            ],
            image: this.affairIcon(coalition ? 'rivalry' : 'support'),
            options
          })
        },
        joinDepositionCoalition() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let coalition = this.activeDepositionCoalition(society)
          let house = this.playerPoliticsHouse(society, state)
          if (coalition && house) {
            coalition.playerJoined = true
            if (coalition.members.indexOf(house.id) < 0) coalition.members.push(house.id)
            coalition.strength = Math.round((coalition.strength || 0) + this.houseCoalitionStrength(society, house))
            this.log(society, 'You join the coalition to depose the emperor.', 'rivalry')
          }
          this.save(society)
          this.openCoalitions()
        },
        leadDepositionCoalition() {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let coalition = this.activeDepositionCoalition(society)
          let house = this.playerPoliticsHouse(society, state)
          if (!coalition && house) {
            coalition = {
              id: 'coalition_' + this.monthKey(state),
              status: 'active',
              goal: this.pick(['force abdication', 'restore the Republic', 'change succession by power', 'enthrone coalition candidate']),
              leaderHouseId: house.id,
              members: [house.id],
              strength: this.houseCoalitionStrength(society, house),
              month: this.monthKey(state),
              playerJoined: true
            }
            society.rome.depositionCoalitions.push(coalition)
          } else if (coalition && house) {
            coalition.leaderHouseId = house.id
            coalition.playerJoined = true
            if (coalition.members.indexOf(house.id) < 0) coalition.members.push(house.id)
            coalition.strength = Math.max(coalition.strength || 0, this.houseCoalitionStrength(society, house) + 40)
          }
          this.resolveCoalitionUltimatum(society, state, coalition)
          this.save(society)
          this.openCoalitions()
        },
        bribeCoalitionMember() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let coalition = this.activeDepositionCoalition(society)
          this.applyStats({ cash: -160 })
          if (coalition) {
            coalition.strength = Math.max(0, Math.round((coalition.strength || 0) - this.randomInt(45, 90)))
            coalition.members = (coalition.members || []).slice(0, Math.max(1, coalition.members.length - 1))
            this.log(society, 'Imperial bribes split conspirators away from the deposition coalition.', 'coins')
          }
          this.save(society)
          this.openCoalitions()
        },
        purgeCoalitionLeader() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let coalition = this.activeDepositionCoalition(society)
          if (coalition) {
            let house = society.houses[coalition.leaderHouseId]
            if (house) {
              house.heat = (house.heat || 0) + 8
              house.relation = this.clamp((house.relation || 0) - 35, -100, 100)
              coalition.strength = Math.max(0, Math.round((coalition.strength || 0) - this.houseCoalitionStrength(society, house) * 0.45))
              this.applyStats({ prestige: -10, influence: -30 })
              this.log(society, 'You purge the coalition leader from ' + house.name + '; tyranny rises even as the plot weakens.', 'prison', house.id)
            }
          }
          this.save(society)
          this.openCoalitions()
        },
        concedeCoalition() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let coalition = this.activeDepositionCoalition(society)
          if (coalition) {
            society.rome.successionLaw = this.pick(['designation', 'wealth', 'power'])
            coalition.strength = Math.max(0, Math.round((coalition.strength || 0) * 0.55))
            this.sortedHouses(society).slice(0, 12).forEach((house) => {
              house.relation = this.clamp((house.relation || 0) + 5, -100, 100)
              house.heat = Math.max(0, (house.heat || 0) - 1)
            })
            this.log(society, 'You concede a popular settlement; the deposition coalition loses momentum.', 'support')
          }
          this.save(society)
          this.openCoalitions()
        },
        crushCoalition() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let coalition = this.activeDepositionCoalition(society)
          if (coalition) {
            let win = this.emperorDefenseStrength(society, state) >= (coalition.strength || 0) * (0.75 + Math.random() * 0.6)
            if (win) {
              coalition.status = 'resolved'
              this.applyStats({ prestige: 25, influence: 25 })
              this.log(society, 'Imperial forces crush the deposition coalition.', 'war')
            } else {
              this.deposeCurrentEmperor(society, state, coalition)
            }
          }
          this.save(society)
          this.openPolitics()
        },
        resolveCoalitionUltimatum(society, state, coalition) {
          if (!coalition || coalition.status !== 'active') return false
          let defense = this.emperorDefenseStrength(society, state)
          if ((coalition.strength || 0) < defense * 0.95) return false
          if (Math.random() < 0.45) {
            this.deposeCurrentEmperor(society, state, coalition)
          } else {
            coalition.strength = Math.round((coalition.strength || 0) * 0.80)
            this.log(society, 'A deposition ultimatum fails to settle the crisis; both sides prepare for civil war.', 'rivalry')
          }
          return true
        },
        deposeCurrentEmperor(society, state, coalition) {
          let rome = society.rome || {}
          let playerWasEmperor = this.playerIsEmperor && this.playerIsEmperor(society, state)
          coalition.status = 'resolved'
          if (coalition.goal === 'restore the Republic') {
            rome.government = 'republic'
            rome.rulerHouseId = ''
            rome.rulerCharacterId = ''
            this.log(society, 'A coalition deposes the emperor and restores the Republic.', 'senator')
          } else {
            rome.government = 'empire'
            rome.rulerHouseId = coalition.leaderHouseId || ''
            let leaderHouse = rome.rulerHouseId && society.houses[rome.rulerHouseId]
            rome.rulerCharacterId = leaderHouse && (leaderHouse.notableIds || leaderHouse.memberIds || [])[0] || ''
            rome.successionLaw = coalition.goal === 'change succession by power' ? 'power' : rome.successionLaw || 'designation'
            this.log(society, 'A deposition coalition enthrones ' + (leaderHouse ? leaderHouse.name : 'a new ruler') + '.', 'rivalry', rome.rulerHouseId)
          }
          if (playerWasEmperor && Math.random() < 0.35) {
            this.save(society)
            try { daapi.kill({ characterId: this.currentCharacterId(state), deathCause: ', deposed and executed by a coalition' }) } catch (err) { console.warn(err) }
          }
        },
        openReligion() {
          let society = this.ensure()
          let state = daapi.getState()
          let rome = this.ensureAdvancedRomanState(society, state)
          let options = [
            this.politicsButton('seekPriesthood', 'Seek priesthood (Pontifex/Augur)', 'prestige', {}, { tooltip: 'Costs influence and prestige; grants legitimacy and can improve law or election chances.' }),
            this.politicsButton('obstructWithAuspices', 'Obstruct with bad auspices', 'law', {}, { tooltip: 'Augural obstruction can delay hostile laws or coalitions. Costs influence and may anger rivals.' }),
            this.politicsButton('deifyAncestor', 'Deify an imperial ancestor', 'prestige', {}, { tooltip: 'Consecratio strengthens dynasty legitimacy. Requires empire or very high auctoritas.' }),
            this.politicsButton('damnatioMemoriae', 'Damnatio memoriae against a rival', 'rivalry', {}, { tooltip: 'Attack a rival memory and prestige. It raises tyranny and house heat.' })
          ]
          options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openRomanPower' } } })
          this.pushModal({ societyMenu: true, title: 'Religion and legitimacy', message: 'Priesthoods, auspices, cult, deification, and damnatio now feed political legitimacy.', image: this.lawIcon('religion'), options })
        },
        seekPriesthood() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let rome = this.ensureAdvancedRomanState(society, state)
          let office = Math.random() < 0.5 ? 'pontifex' : 'augur'
          rome.priesthoods[this.currentCharacterId(state)] = office
          society.playerPolitics.cursus.office = society.playerPolitics.cursus.office || office
          society.playerPolitics.auctoritas = parseFloat(society.playerPolitics.auctoritas || 0) + 8
          this.applyStats({ influence: -45, prestige: 18 })
          this.log(society, 'You are accepted among the ' + (office === 'pontifex' ? 'pontifices' : 'augurs') + '.', 'law')
          this.save(society)
          this.openReligion()
        },
        obstructWithAuspices() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let rome = this.ensureAdvancedRomanState(society, state)
          this.applyStats({ influence: -25, prestige: -3 })
          rome.auspicesBlockedUntil = this.futureMonthKey(2)
          let coalition = this.activeDepositionCoalition(society)
          if (coalition) coalition.strength = Math.round((coalition.strength || 0) * 0.85)
          this.log(society, 'You declare bad auspices and delay hostile public action.', 'law')
          this.save(society)
          this.openReligion()
        },
        deifyAncestor() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let rome = this.ensureAdvancedRomanState(society, state)
          rome.imperialCult.deified = Math.round((rome.imperialCult.deified || 0) + 1)
          this.applyStats({ cash: -180, prestige: 60, influence: 25 })
          let house = this.playerPoliticsHouse(society, state)
          if (house) house.prestige = Math.round((house.prestige || 0) + 800)
          this.log(society, 'The Senate recognizes a consecratio; your dynasty gains sacred prestige.', 'prestige')
          this.save(society)
          this.openReligion()
        },
        damnatioMemoriae() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let target = this.politicsRivalHouses(society, state)[0]
          if (target) {
            target.prestige = Math.max(0, Math.round((target.prestige || 0) - 700))
            target.relation = this.clamp((target.relation || 0) - 16, -100, 100)
            target.heat = (target.heat || 0) + 3
            this.applyStats({ influence: -40, prestige: 8 })
            this.log(society, 'Damnatio memoriae stains the records of ' + target.name + '.', 'rivalry', target.id)
          }
          this.save(society)
          this.openReligion()
        },
        openIntrigue({ from } = {}) {
          let society = this.ensure()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          // Political intrigue lives under Roman power systems. These are political agents,
          // distinct from the criminal delatores hired from the crime menu: they uncover
          // secrets, create blackmail hooks, and run conspiracies rather than expose crimes.
          let back = 'openRomanPower'
          let options = this.politicsRivalHouses(society, state).slice(0, 8).map((house) => {
            return this.politicsButton('buildSpyNetwork', 'Political agents in ' + house.name, 'slander', { houseId: house.id, from: back }, { tooltip: 'Plant political agents inside this house to uncover secrets and create blackmail hooks you can use against coalitions and factions.' })
          })
          options.push(this.politicsButton('startPoliticalConspiracy', 'Start Idus-style conspiracy', 'rivalry', { from: back }, { tooltip: 'Political assassination plot. Creates conspiracy crime risk and may destabilize the state.' }))
          let hookCount = Object.keys(society.blackmailHooks || {}).filter((id) => (society.blackmailHooks[id] || []).length && state.characters[id]).length
          options.push(this.politicsButton('useBlackmailHook', 'Use a blackmail hook (' + hookCount + ' available)', 'support', { from: back }, hookCount ? { tooltip: 'Coerce a house out of a coalition or into your faction using secrets your agents uncovered.' } : { disabled: true, showDisabledWithTooltip: true, tooltip: 'You hold no blackmail material yet. Plant political agents to uncover secrets.' }))
          options.push({ text: 'Back', action: { event: this.event, method: 'romanSystemsAction', context: { action: back } } })
          this.pushModal({ societyMenu: true, title: 'Political intrigue and agents', message: 'Political agents uncover secrets, create blackmail hooks, and run conspiracies. For exposing rivals\' crimes, hire delatores from the crime menu instead.', image: this.affairIcon('slander'), options })
        },
        useBlackmailHook({ from } = {}) {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let backToIntrigue = { event: this.event, method: 'romanSystemsAction', context: { action: 'openIntrigue', from } }
          let hookCharacterIds = Object.keys(society.blackmailHooks || {}).filter((id) => (society.blackmailHooks[id] || []).length && state.characters[id])
          if (!hookCharacterIds.length) {
            this.save(society)
            this.pushModal({ societyMenu: true, title: 'No hooks', message: 'You hold no blackmail material. Plant political agents to uncover secrets first.', image: this.affairIcon('slander'), options: [{ text: 'Back', action: backToIntrigue }] })
            return
          }
          let characterId = hookCharacterIds[0]
          let character = state.characters[characterId]
          let houseId = this.houseIdForCharacter(character, state, society)
          let house = houseId && society.houses[houseId]
          society.blackmailHooks[characterId].pop()
          if (!society.blackmailHooks[characterId].length) delete society.blackmailHooks[characterId]
          let coalition = this.activeDepositionCoalition(society)
          let effect
          if (coalition && house && (coalition.members || []).map(String).indexOf(String(house.id)) >= 0) {
            coalition.strength = Math.max(0, Math.round((coalition.strength || 0) - this.houseCoalitionStrength(society, house) * 0.5))
            coalition.members = (coalition.members || []).filter((id) => String(id) !== String(house.id))
            effect = 'You blackmail ' + house.name + ' out of the deposition coalition.'
          } else if (house) {
            let pp = society.playerPolitics
            pp.faction = pp.faction || []
            if (pp.faction.indexOf(house.id) < 0) pp.faction.push(house.id)
            house.relation = this.clamp((house.relation || 0) - 4, -100, 100)
            effect = 'You coerce ' + house.name + ' into backing your faction.'
          } else {
            effect = 'You use the secret, but it leads nowhere useful this time.'
          }
          this.applyStats({ influence: 10 })
          this.log(society, 'Blackmail: ' + effect, 'slander', houseId)
          this.save(society)
          this.pushModal({ societyMenu: true, title: 'Blackmail', message: effect, image: this.affairIcon('slander'), options: [{ text: 'Back', action: backToIntrigue }] })
        },
        seekImperialPardon({ characterId } = {}) {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let backTarget = { event: this.event, method: 'romanSystemsAction', context: { action: 'openCrimes' } }
          if (!(this.playerIsEmperor && this.playerIsEmperor(society, state))) {
            this.save(society)
            this.pushModal({ societyMenu: true, title: 'Imperial pardon', message: 'Only the Emperor may free a prisoner by imperial decree.', image: this.imperatorIcon ? this.imperatorIcon() : this.affairIcon('senator'), options: [{ text: 'Back', action: backTarget }] })
            return
          }
          if (!characterId) {
            let prisoners = (society.imprisoned || []).filter((id) => state.characters[id])
            let options = prisoners.slice(0, 12).map((id) => this.politicsButton('seekImperialPardon', 'Pardon ' + this.characterName({ ...state.characters[id], id }, state), 'gift', { characterId: id }))
            if (!options.length) options.push({ text: 'No prisoners to pardon', disabled: true, showDisabledWithTooltip: true, tooltip: 'No one is currently imprisoned by Roman Society.', icons: [this.lawIcon('prison')] })
            options.push({ text: 'Back', action: backTarget })
            this.save(society)
            this.pushModal({ societyMenu: true, title: 'Imperial clemency', message: 'As Emperor you may release prisoners. Pardons win loyalty from their houses.', image: this.imperatorIcon ? this.imperatorIcon() : this.affairIcon('gift'), options })
            return
          }
          let character = state.characters[characterId]
          if (character && (society.imprisoned || []).some((id) => this.sameCharacterId(id, characterId))) {
            if (this.releasePrisoner) this.releasePrisoner(society, characterId)
            let houseId = this.houseIdForCharacter(character, state, society)
            let house = houseId && society.houses[houseId]
            if (house) { house.relation = this.clamp((house.relation || 0) + 16, -100, 100); house.heat = Math.max(0, (house.heat || 0) - 2) }
            this.applyStats({ prestige: 4 })
            this.log(society, 'Imperial clemency frees ' + this.characterName({ ...character, id: characterId }, state) + '.', 'gift', houseId)
          }
          this.save(society)
          this.pushModal({ societyMenu: true, title: 'Pardon granted', message: 'The prisoner is freed by your imperial clemency.', image: this.affairIcon('gift'), options: [{ text: 'Back', action: backTarget }] })
        },
        buildSpyNetwork({ houseId, from } = {}) {
          let society = this.loadForAction()
          let state = daapi.getState()
          let house = society.houses[houseId]
          this.ensureAdvancedRomanState(society, state)
          this.applyStats({ influence: -35, cash: -45 })
          if (house) {
            let ids = this.houseLivingMemberIds(society, state, house).slice(0, 4)
            ids.forEach((characterId) => {
              society.spyNetworks[characterId] = society.spyNetworks[characterId] || { level: 0, houseId, month: this.monthKey(state) }
              society.spyNetworks[characterId].level = Math.min(5, Math.round((society.spyNetworks[characterId].level || 0) + 1))
            })
            if (Math.random() < 0.35) {
              let targetId = ids[0]
              if (targetId) {
                society.blackmailHooks[targetId] = society.blackmailHooks[targetId] || []
                society.blackmailHooks[targetId].push({ type: 'secret', month: this.monthKey(state), source: 'spies' })
              }
            }
            this.log(society, 'Political agents are planted around ' + house.name + '.', 'slander', house.id)
          }
          this.save(society)
          this.openIntrigue({ from })
        },
        startPoliticalConspiracy({ from } = {}) {
          let society = this.loadForAction()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let target = this.politicsRivalHouses(society, state)[0]
          this.applyStats({ influence: -60, cash: -80 })
          this.recordCrime(society, state, this.currentCharacterId(state), 'conspiracy', 160, 'political plot')
          if (target && Math.random() < this.clamp(0.22 + (society.playerPolitics.clients || 0) / 400, 0.08, 0.55)) {
            target.power = Math.max(0, Math.round((target.power || 0) - 20))
            target.stability = Math.max(0, Math.round((target.stability || 50) - 12))
            this.log(society, 'A political conspiracy wounds the leadership of ' + target.name + '.', 'rivalry', target.id)
          } else {
            this.log(society, 'A political conspiracy stalls; whispers of coniuratio remain dangerous.', 'crime')
          }
          this.save(society)
          this.openIntrigue({ from })
        },
        openPropertyMarket() {
          let society = this.ensure()
          let state = daapi.getState()
          let rome = this.ensureAdvancedRomanState(society, state)
          this.refreshPropertyMarket(society, state)
          let options = (rome.marketListings || []).slice(0, 10).map((listing) => {
            let house = society.houses[listing.houseId]
            return this.politicsButton('buyMarketProperty', (house ? house.name : 'House') + ': ' + this.propertyTitleFor(listing.key) + ' (' + listing.price + ')', 'trade', { listingId: listing.id }, { tooltip: 'Buy property from a Society house. Price reflects demand, crisis, relation, and property type.' })
          })
          options.push(this.politicsButton('sellMarketProperty', 'Sell one surplus property to houses', 'coins', {}, { tooltip: 'Creates a cash sale from the player house property details if Society can find a holding.' }))
          options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openRomanPower' } } })
          this.pushModal({ societyMenu: true, title: 'Property market', message: 'Houses now trade estates and crisis pressure changes prices and revenue.', image: this.affairIcon('trade'), options })
        },
        refreshPropertyMarket(society, state) {
          let rome = society.rome || {}
          if (rome.marketMonth === this.monthKey(state) && (rome.marketListings || []).length) return
          rome.marketMonth = this.monthKey(state)
          rome.marketListings = []
          this.sortedHouses(society).filter((house) => house && !house.isPlayerHouse).slice(0, 14).forEach((house) => {
            let props = this.housePropertyOptions(house)
            if (!props.length || Math.random() > 0.45) return
            let prop = this.pick(props)
            let pressure = (100 - (house.stability || 50)) / 100
            let price = Math.max(20, Math.round(prop.value * (0.75 + Math.random() * 0.35 - pressure * 0.2)))
            rome.marketListings.push({ id: 'listing_' + this.safeId(house.id) + '_' + prop.key, houseId: house.id, key: prop.key, price, month: this.monthKey(state) })
          })
        },
        buyMarketProperty({ listingId } = {}) {
          let society = this.loadForAction()
          let state = daapi.getState()
          let rome = this.ensureAdvancedRomanState(society, state)
          let listing = (rome.marketListings || []).find((item) => item.id === listingId)
          if (listing) {
            let house = society.houses[listing.houseId]
            this.applyStats({ cash: -listing.price })
            let value = this.transferPropertyToPlayer(society, state, house, listing.key, 1)
            if (house) {
              house.ai = house.ai || {}
              house.ai.cash = Math.round((house.ai.cash || 0) + listing.price)
              house.relation = this.clamp((house.relation || 0) + 3, -100, 100)
            }
            rome.marketListings = (rome.marketListings || []).filter((item) => item.id !== listingId)
            this.log(society, 'You buy ' + this.propertyTitleFor(listing.key) + ' on the inter-house market for ' + listing.price + '.', 'trade', listing.houseId)
          }
          this.save(society)
          this.openPropertyMarket()
        },
        sellMarketProperty() {
          let society = this.loadForAction()
          let state = daapi.getState()
          let house = this.playerPoliticsHouse(society, state)
          let props = this.housePropertyOptions(house)
          if (house && props.length) {
            let prop = props[0]
            house.ai = house.ai || {}
            house.ai.propertyDetails = house.ai.propertyDetails || {}
            house.ai.propertyDetails[prop.key] = Math.max(0, Math.round((house.ai.propertyDetails[prop.key] || 0) - 1))
            let price = Math.max(20, Math.round(prop.value * 0.70))
            this.applyStats({ cash: price })
            this.log(society, 'You sell ' + prop.title + ' into the Society property market for ' + price + '.', 'trade')
          }
          this.save(society)
          this.openPropertyMarket()
        },
        performSocietyMarriage(args) {
          let before = false
          try { before = this.load() } catch (err) { before = false }
          let result = previousPerformSocietyMarriage ? previousPerformSocietyMarriage.call(this, args || {}) : false
          try {
            let society = this.loadForAction()
            let state = daapi.getState()
            this.ensureAdvancedRomanState(society, state)
            let house = args && args.houseId && society.houses[args.houseId]
            if (house) {
              let dowry = Math.max(25, Math.round((house.wealth || 120) * 0.06))
              society.marriageAlliances.push({ houseId: house.id, playerCharacterId: args.playerCharacterId, spouseId: args.spouseId, dowry, support: 12, nonAggressionUntil: this.futureMonthKey(24), month: this.monthKey(state) })
              house.relation = this.clamp((house.relation || 0) + 10, -100, 100)
              house.favor = Math.round((house.favor || 0) + 1)
              this.applyStats({ cash: dowry, influence: 8 })
              this.log(society, 'The marriage contract creates a formal alliance with ' + house.name + ': dowry ' + dowry + ', Senate support, and non-aggression.', 'marriage', house.id)
              this.save(society)
            }
          } catch (err) {
            console.warn(err)
          }
          return result
        },
        lawList() {
          let list = previousLawList ? previousLawList.call(this) : []
          let descriptions = {
            lex_de_imperio: 'Expands your imperium by law. Effect: adds legislative progress and auctoritas with low civil-war risk.',
            pack_senate: 'Seats clients and loyalists. Effect: raises progress and auctoritas; elite houses resent the manipulation.',
            extend_term: 'Sullan legislative dictatorship extended. Effect: more time in office, progress, auctoritas, and some civil-war risk.',
            perpetual: 'Dictator perpetuo. Effect: huge progress and auctoritas, but a serious chance of civil war.',
            march: 'Force the issue by arms. Effect: immediate civil war; victory creates the Empire, defeat can execute you.'
          }
          return list.map((law) => Object.assign({}, law, { description: law.description || descriptions[law.id] || 'Power law. Effect: changes imperial progress, auctoritas, and opposition.' }))
        },
        policyLawList() {
          let existing = previousPolicyLawList ? previousPolicyLawList.call(this) : []
          let byId = {}
          existing.forEach((law) => { byId[law.id] = Object.assign({}, law) })
          let add = (law) => { byId[law.id] = Object.assign({}, byId[law.id] || {}, law) }
          add({ id: 'olive_vs_herds', title: 'Tax the oil latifundia, subsidise the herders', cost: { influence: 30 }, populist: 2, hurt: { keys: ['latifundiumOil', 'orchard', 'primeOrchard'], who: 'oil & orchard estates' }, help: { groups: ['animal'], who: 'herders' }, description: 'Shifts wealth from olive/orchard latifundia to animal herders. Effect: oil estates lose revenue and relation; herders gain revenue and relation.' })
          add({ id: 'lex_agraria', title: 'Lex Agraria - redistribute the great estates', cost: { influence: 55 }, populist: 6, hurt: { groups: ['land', 'estate'], who: 'the great landowners' }, help: { groups: ['animal'], who: 'smallholders & plebs' }, description: 'Land reform against great estates. Effect: large landowners lose revenue/relation; poorer rural interests gain support and populist prestige.' })
          add({ id: 'lex_claudia', title: 'Lex Claudia - bar senators from sea trade', cost: { influence: 40 }, populist: 1, hurt: { groups: ['boat'], who: 'the shipping houses' }, help: { groups: ['land'], who: 'the landed houses' }, description: 'Restricts senatorial sea commerce. Effect: shipping houses lose revenue; landed houses benefit.' })
          add({ id: 'lex_frumentaria', title: 'Lex Frumentaria - grain dole for the people', cost: { cash: 160 }, populist: 8, allRelation: 4, hurt: false, help: false, description: 'Public grain dole. Effect: broad relation gain, strong populist prestige, high cash cost.' })
          add({ id: 'novae_tabulae', title: 'Novae Tabulae - cancel debts', cost: { influence: 50 }, populist: 5, hurt: { wealthAbove: 600, who: 'the great creditors' }, help: { wealthBelow: 220, who: 'indebted houses' }, description: 'Debt cancellation. Effect: creditor houses resent and lose revenue; poor/debtor houses improve.' })
          add({ id: 'vectigal_portus', title: 'Harbour dues - tax the trading fleets', cost: { influence: 25 }, populist: 0, hurt: { groups: ['boat'], who: 'trading fleets' }, help: { groups: ['land', 'animal'], who: 'farmers & herders' }, description: 'Port tax on trade fleets. Effect: boat revenue falls; land and animal producers benefit.' })
          add({ id: 'lex_sumptuaria', title: 'Lex Sumptuaria / Oppia - curb luxury', cost: { influence: 35 }, populist: 4, hurt: { wealthAbove: 750, who: 'ostentatious elites' }, help: { wealthBelow: 300, who: 'modest households' }, stability: 3, description: 'Restrains public luxury. Effect: elite prestige/relation falls, poorer houses approve, stability rises, fraud detection slightly improves.' })
          add({ id: 'lex_iulia_adulteriis', title: 'Lex Iulia de adulteriis - prosecute adultery', cost: { influence: 45 }, populist: 2, allRelation: 1, description: 'Criminalizes adultery. Effect: adulterium crimes become easier to detect and punish; moralist houses approve.' })
          add({ id: 'lex_villia_annalis', title: 'Lex Villia Annalis - fix office ages', cost: { influence: 30 }, populist: 1, allRelation: 1, description: 'Formalizes cursus honorum age gates. Effect: offices become more legitimate; young ambitious candidates face stricter checks.' })
          add({ id: 'lex_gabinia_manilia', title: 'Lex Gabinia / Manilia - extraordinary command', cost: { influence: 65 }, populist: 3, hurt: { wealthAbove: 900, who: 'jealous senatorial houses' }, help: { groups: ['boat'], who: 'trade houses needing security' }, description: 'Grants imperium maius for a crisis command. Effect: boosts military route to power and maritime security, but elite rivals resent it.' })
          add({ id: 'lex_de_provinciis', title: 'Lex de provinciis - regulate governorships', cost: { influence: 40 }, populist: 1, allRelation: 2, description: 'Defines provincial commands and audits. Effect: governors generate steadier income but repetundae corruption is easier to detect.' })
          add({ id: 'lex_tabellaria', title: 'Lex Tabellaria - secret ballot', cost: { influence: 35 }, populist: 5, hurt: { wealthAbove: 700, who: 'vote-buying patrons' }, help: { wealthBelow: 350, who: 'voters under pressure' }, description: 'Secret ballot law. Effect: ambitus is harder to profit from and easier to expose; lower houses approve.' })
          add({ id: 'proscriptions', title: 'Proscription lists - legal confiscation of rivals', cost: { influence: 90 }, populist: -6, hurt: { wealthAbove: 500, who: 'listed elite rivals' }, help: { wealthBelow: 250, who: 'rewarded informers' }, description: 'State violence and confiscation. Effect: elites lose property/relation; treasury and informers gain; tyranny and coalition risk rise.' })
          add({ id: 'constitutio_antoniniana', title: 'Constitutio Antoniniana - universal citizenship', cost: { cash: 220, influence: 80 }, populist: 7, allRelation: 5, description: 'Extends citizenship broadly. Effect: lower orders approve, tax base broadens, and social integration improves.' })
          add({ id: 'edictum_de_pretiis', title: 'Edictum de pretiis - price controls', cost: { influence: 50 }, populist: 3, hurt: { groups: ['trade', 'boat'], who: 'merchants and shippers' }, help: { wealthBelow: 260, who: 'urban poor' }, description: 'Price edict against inflation. Effect: merchants lose revenue, poor houses gain stability, crisis damage is softened.' })
          add({ id: 'lex_fufia_aelia', title: 'Lex Fufia Caninia / Aelia Sentia - regulate manumission', cost: { influence: 35 }, populist: 1, hurt: { groups: ['estate'], who: 'slave-heavy estates' }, help: { wealthBelow: 300, who: 'freedmen and dependants' }, description: 'Rules for manumission. Effect: slave-heavy estates are curbed; freedmen clientela becomes more valuable.' })
          return Object.keys(byId).map((id) => byId[id])
        },
        lawTooltip(law) {
          if (!law) return ''
          return (law.description || 'No description recorded.') + '\nCost: ' + this.costLabel(law.cost || {}) + (law.civilWar ? '\nCivil war risk: ' + Math.round(law.civilWar * 100) + '%' : '') + (law.progress ? '\nEmpire progress: +' + law.progress + '%' : '')
        },
        simulateRomanSystemsMonthly(society, state) {
          // Each system runs on its own, like monthlyTick's steps: one failure is recorded and the
          // rest of the month's Roman systems still run.
          ;['ensureAdvancedRomanState', 'installTaxCrimeModalPatch', 'resolveCivilWarPending', 'chargeBodyguardUpkeep', 'simulateNpcCrimes',
            'simulateAssassinations', 'auditHiddenCrimes', 'syncCrimeStatuses', 'syncMilitaryStatuses', 'simulateClientelaAndLegionUpkeep',
            'simulateDepositionCoalitions', 'simulateCrisesAndMarket'].forEach((name) => {
            try {
              this[name](society, state)
            } catch (err) {
              console.warn('Roman Society monthly step failed: ' + name, err)
              if (society) society.lastMonthlyError = name + ': ' + (err && err.message)
            }
          })
        },
        simulateNpcCrimes(society, state) {
          let houses = this.monthlyHouseSimulationBatch ? this.monthlyHouseSimulationBatch(society, this.sortedHouses(society)).slice(0, 10) : this.sortedHouses(society).slice(0, 10)
          houses.forEach((house) => {
            if (!house || house.isPlayerHouse || Math.random() > 0.16) return
            let ids = this.houseLivingMemberIds(society, state, house).filter((id) => state.characters[id] && !state.characters[id].isDead)
            if (!ids.length) return
            let characterId = this.pick(ids)
            let character = state.characters[characterId]
            let traits = (character && character.traits) || []
            let propensity = 0.04 + Math.max(0, 45 - (house.stability || 50)) / 500 + (house.heat || 0) / 200
            if (traits.indexOf('liar') >= 0) propensity += 0.04
            if (traits.indexOf('manipulator') >= 0) propensity += 0.05
            if (traits.indexOf('ambitious') >= 0) propensity += 0.03
            if (traits.indexOf('adulterer') >= 0) propensity += 0.04
            if (Math.random() > this.clamp(propensity, 0.02, 0.30)) return
            let type = 'tax_fraud'
            if (traits.indexOf('adulterer') >= 0 && Math.random() < 0.35) type = 'adulterium'
            else if (house.agenda === 'office' && Math.random() < 0.35) type = 'ambitus'
            else if (house.agenda === 'wealth' && Math.random() < 0.35) type = this.pick(['peculatus', 'smuggling', 'forgery'])
            else if (house.rivalry && Math.random() < 0.25) type = 'sedition'
            let amount = this.randomInt(30, Math.max(60, Math.round((house.wealth || 150) * 0.12)))
            let crime = this.recordCrime(society, state, characterId, type, amount, 'npc')
            if (type === 'tax_fraud' || type === 'smuggling' || type === 'forgery') {
              house.wealth = Math.round((house.wealth || 0) + amount * 0.5)
              house.ai = house.ai || {}
              house.ai.cash = Math.round((house.ai.cash || 0) + amount * 0.35)
            }
            this.maybeExposeCrime(society, state, characterId, crime, 'monthly audit')
          })
        },
        auditHiddenCrimes(society, state) {
          Object.keys(society.crimes || {}).slice(0, 80).forEach((characterId) => {
            ;(society.crimes[characterId] || []).forEach((crime) => {
              if (!crime || crime.exposed) return
              let age = this.monthIndex(this.monthKey(state)) - this.monthIndex(crime.month)
              let oldCrimeFactor = Math.min(0.10, Math.max(0, age) * 0.006)
              if (Math.random() < oldCrimeFactor) this.maybeExposeCrime(society, state, characterId, crime, 'delatores')
            })
          })
          Object.keys(society.pendingTrials || {}).forEach((characterId) => {
            let trial = society.pendingTrials[characterId]
            if (trial && trial.until && this.monthKeyReached(trial.until, state)) {
              this.resolveTrial(society, state, characterId, trial.approach || 'default')
            }
          })
        },
        simulateClientelaAndLegionUpkeep(society, state) {
          let pp = society.playerPolitics || {}
          pp.clients = Math.max(0, Math.round((pp.clients || 0) * 0.985))
          ;(pp.legions || []).forEach((legion) => {
            legion.loyalty = this.clamp(Math.round((legion.loyalty || 50) - 1 + Math.random() * 3), 0, 100)
            legion.strength = Math.max(5, Math.round((legion.strength || 40) * 0.997))
          })
          if ((pp.legions || []).length) {
            this.applyStats({ cash: -Math.round(pp.legions.length * 18) })
          }
        },
        simulateDepositionCoalitions(society, state) {
          let rome = society.rome || {}
          if (rome.government !== 'empire') return
          let active = this.activeDepositionCoalition(society)
          if (!active) {
            let angry = this.sortedHouses(society).filter((house) => this.computeHouseImperialDiscontent(society, state, house) >= 70).slice(0, 6)
            if (angry.length >= 3) {
              let leader = angry.sort((a, b) => this.houseCoalitionStrength(society, b) - this.houseCoalitionStrength(society, a))[0]
              let coalition = {
                id: 'coalition_' + this.monthKey(state),
                status: 'active',
                goal: this.pick(['force abdication', 'restore the Republic', 'change succession by power', 'enthrone coalition candidate']),
                leaderHouseId: leader.id,
                members: angry.map((house) => house.id),
                strength: angry.reduce((sum, house) => sum + this.houseCoalitionStrength(society, house), 0),
                month: this.monthKey(state),
                playerJoined: false
              }
              rome.depositionCoalitions.push(coalition)
              this.log(society, 'Discontent houses form a coalition to ' + coalition.goal + '.', 'rivalry', leader.id)
            }
          } else {
            active.strength = Math.round((active.members || []).reduce((sum, houseId) => sum + this.houseCoalitionStrength(society, society.houses[houseId]), 0))
            this.resolveCoalitionUltimatum(society, state, active)
          }
        },
        simulateCrisesAndMarket(society, state) {
          let rome = society.rome || {}
          if (Math.random() < 0.08) {
            let crisis = this.pick([
              { type: 'harvest', title: 'Bad harvest', group: 'land', factor: 0.88 },
              { type: 'plague', title: 'Pestilence', group: '', factor: 0.92 },
              { type: 'piracy', title: 'Piracy', group: 'boat', factor: 0.82 }
            ])
            crisis.month = this.monthKey(state)
            crisis.until = this.futureMonthKey(this.randomInt(3, 8))
            rome.crises.push(crisis)
            this.sortedHouses(society).slice(0, 24).forEach((house) => {
              if (!crisis.group || this.houseMatchesPolicy(house, { groups: [crisis.group] })) {
                house.ai = house.ai || {}
                house.ai.modifiers = house.ai.modifiers || {}
                house.ai.modifiers.revenue = house.ai.modifiers.revenue || []
                house.ai.modifiers.revenue.push({ factor: crisis.factor, until: crisis.until, reason: crisis.type })
                house.stability = this.clamp((house.stability || 50) - (crisis.type === 'plague' ? 5 : 2), 0, 100)
              }
            })
            this.log(society, crisis.title + ' hits Rome and the provinces; affected houses lose revenue until ' + crisis.until + '.', 'trade')
          }
          rome.crises = (rome.crises || []).filter((crisis) => crisis && (!crisis.until || !this.monthKeyReached(crisis.until, state))).slice(-20)
          this.refreshPropertyMarket(society, state)
        }
      })
      window.corSociety._mixinCorSocietyRomanSystemsVersion = '1.1.331'
    }
  }
}
