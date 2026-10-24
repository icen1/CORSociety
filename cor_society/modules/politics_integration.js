{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyPoliticsIntegration() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyPoliticsIntegrationVersion === '1.1.331') {
        return
      }
      // Links the Society's politics to the game. Offices, dictatorship, empire, legions, clients,
      // cognomina, adoption and priesthoods used to live only in corSocietyState, so none of it
      // reached the game: no job, trait, status, income or season. Here:
      // - the cursus runs through the game's own elections (months 10-12, its prerequisites, real
      //   jobs and former-office traits); buying ludi seats in its campaign is recorded as ambitus;
      // - dictator / emperor get traits, a status badge and monthly influence and prestige;
      // - legions and clients pay monthly influence (legions also prestige) with badges; campaigns
      //   declare or join the game's war; victories, triumphs and acclamations give real traits;
      // - cognomina show in the name, adoption is a real adoption, priesthoods are real jobs;
      // - political cash costs follow inflation: the median house wealth / 12,000 (0.5x-4x).
      // replaces: openCursus, standForOffice, buyVotes (offices now go through the game's elections)
      let previousPoliticsAction = window.corSociety.politicsAction
      let previousApplyStats = window.corSociety.applyStats
      let previousCostLabel = window.corSociety.costLabel
      let previousCampaignExterior = window.corSociety.campaignExterior
      let previousHoldTriumph = window.corSociety.holdTriumph
      let previousMilitaryAcclamation = window.corSociety.militaryAcclamation
      let previousAwardCognomen = window.corSociety._awardCognomenSilent
      let previousAdoptHeir = window.corSociety.adoptHeir
      let previousSeekPriesthood = window.corSociety.seekPriesthood
      let previousUpkeep = window.corSociety.simulateClientelaAndLegionUpkeep
      Object.assign(window.corSociety, {
        politicalTraitDefinitions() {
          return {
            corSocietyDictator: { title: 'Dictator', description: 'Holds the dictatorship of Rome.', group: 'skill', skills: { stewardship: 2, combat: 2, eloquence: 2, intelligence: 1 }, points: 900 },
            corSocietyFormerDictator: { title: 'Former Dictator', description: 'Once held the dictatorship of Rome.', group: 'skill', skills: { stewardship: 1, combat: 1, eloquence: 1, intelligence: 0.5 }, points: 850 },
            corSocietyImperatorAugustus: { title: 'Imperator Augustus', description: 'Rules Rome as emperor.', group: 'skill', skills: { stewardship: 3, combat: 3, eloquence: 3, intelligence: 2 }, points: 1200 },
            corSocietyImperatorAcclaimed: { title: 'Imperator (acclaimed)', description: 'Hailed imperator by the legions.', group: 'militaryHonor', skills: { combat: 2, eloquence: 1 }, points: 700 }
          }
        },
        installPoliticalTraitDefinitions() {
          // The game rebuilds daapi (and its mod trait table) on every save load.
          if (typeof daapi === 'undefined' || !daapi || typeof daapi.addOrEditTraitDefinition !== 'function') {
            return false
          }
          if (daapi.modData && daapi.modData.traits && daapi.modData.traits.corSocietyImperatorAugustus) {
            return true
          }
          let icon = this.imperatorIcon ? this.imperatorIcon() : this.affairIcon('senator')
          let traits = this.politicalTraitDefinitions()
          Object.keys(traits).forEach((trait) => {
            let def = traits[trait]
            try {
              daapi.addOrEditTraitDefinition({
                trait,
                traitInfo: { group: def.group, modifiers: { skills: def.skills }, opposites: [], isStackable: false, points: def.points },
                icon: trait === 'corSocietyImperatorAcclaimed' && this.lawIcon ? this.lawIcon('war') : icon,
                text: { title: def.title, description: def.description }
              })
            } catch (err) {
              console.warn(err)
            }
          })
          return true
        },
        politicalPriceIndex(society, state) {
          // Inflation: the median wealth of the Society's houses against a healthy-Society median
          // of 12,000 (measured in a real save), clamped to 0.5x-4x. The player's house counts
          // once, at its real fortune; as one entry in a median, no single house drives prices.
          state = state || daapi.getState()
          let month = this.monthKey(state)
          if (!society && this._priceIndexMemo && this._priceIndexMemo.month === month) {
            return this._priceIndexMemo.value
          }
          society = society || this.load()
          if (society.priceIndexMonth === month && society.priceIndex) {
            this._priceIndexMemo = { month, value: society.priceIndex }
            return society.priceIndex
          }
          let wealth = Object.keys(society.houses || {}).map((houseId) => society.houses[houseId])
            .filter((house) => house && house.ai && !(this.isPlayerHouseRecord && this.isPlayerHouseRecord(house, state)))
            .map((house) => parseFloat(house.wealth || 0))
          // The player's Society record holds simulated wealth, so the house counts at the game's
          // cash and property instead (the same vanilla prices), and only once there are NPC houses.
          if (wealth.length && this.playerWealthValue) {
            wealth.push(parseFloat(this.playerWealthValue(state) || 0))
          }
          wealth.sort((a, b) => a - b)
          let median = wealth.length ? wealth[Math.floor(wealth.length / 2)] : 12000
          society.priceIndex = Math.round(this.clamp(median / 12000, 0.5, 4) * 100) / 100
          society.priceIndexMonth = month
          this._priceIndexMemo = { month, value: society.priceIndex }
          return society.priceIndex
        },
        politicalPrice(amount) {
          let index = this._politicalPriceScale || this.politicalPriceIndex()
          return Math.max(1, Math.round(parseFloat(amount || 0) * index))
        },
        applyStats(stats) {
          // Political cash costs follow inflation (only while a political action or upkeep runs).
          if (this._politicalPriceScale && stats && parseFloat(stats.cash || 0) < 0) {
            stats = Object.assign({}, stats, { cash: Math.round(parseFloat(stats.cash) * this._politicalPriceScale) })
          }
          return previousApplyStats.call(this, stats)
        },
        costLabel(cost) {
          if (cost && cost.cash) {
            cost = Object.assign({}, cost, { cash: this.politicalPrice(cost.cash) })
          }
          return previousCostLabel.call(this, cost)
        },
        politicsAction(args) {
          args = args || {}
          let unscaled = { openPropertyMarket: true, buyMarketProperty: true, sellMarketProperty: true }
          let previousScale = this._politicalPriceScale
          this._politicalPriceScale = unscaled[args.action] ? 0 : this.politicalPriceIndex()
          try {
            return previousPoliticsAction.call(this, args)
          } finally {
            this._politicalPriceScale = previousScale
            if (!/^open/.test(String(args.action || ''))) {
              try {
                this.syncPoliticalStanding()
              } catch (err) {
                console.warn(err)
              }
            }
          }
        },
        simulateClientelaAndLegionUpkeep(society, state) {
          let previousScale = this._politicalPriceScale
          this._politicalPriceScale = this.politicalPriceIndex(society, state)
          try {
            return previousUpkeep.call(this, society, state)
          } finally {
            this._politicalPriceScale = previousScale
          }
        },
        setSocietyIncome(key, id, amount, reason, state, force) {
          // The game appends additive modifiers without replacing by id, so remove ours first.
          // Two-month duration, refreshed monthly (force): the income lapses if the mod is removed.
          amount = Math.max(0, Math.round(amount || 0))
          let existing = ((((state && state.current) || {}).additiveModifiers || {})[key] || []).filter((m) => m && m.id === id)
          if (!force && existing.length === (amount > 0 ? 1 : 0) && (!amount || Math.round(existing[0].amount) === amount)) {
            return
          }
          try {
            daapi.removeAdditiveModifier({ key, id })
            if (amount > 0) {
              daapi.addAdditiveModifier({ key, id, amount, durationInMonths: 2, reason })
            }
          } catch (err) {
            console.warn(err)
          }
        },
        setSocietyStatus(characterId, key, title, icon, character) {
          let existing = character && character.statuses && character.statuses[key]
          if (character && (title ? existing && existing.title === title : !existing)) {
            return
          }
          try {
            if (title) {
              daapi.addCharacterStatus({ characterId, key, status: { active: true, title, icon } })
            } else {
              daapi.deleteCharacterStatus({ characterId, key })
            }
          } catch (err) {
            console.warn(err)
          }
        },
        grantGameTrait(characterId, trait) {
          let character = characterId && daapi.getCharacter({ characterId })
          if (!character || (character.traits || []).indexOf(trait) >= 0) {
            return false
          }
          try {
            daapi.addTrait({ characterId, trait })
            return true
          } catch (err) {
            console.warn(err)
            return false
          }
        },
        vanillaCareerOffice(character) {
          // The Society's office line (auctoritas, Roman Power summary) mirrors the game's career:
          // the current magistracy, else the highest office held before.
          if (!character) return ''
          let byJob = { consul: 'consul', proConsul: 'consul', censor: 'censor', praetor: 'praetor', proPraetor: 'praetor', aedile: 'aedile', proAedile: 'aedile', quaestor: 'quaestor', proQuaestor: 'quaestor' }
          if (byJob[character.job]) return byJob[character.job]
          let traits = character.traits || []
          let former = [['formerConsul', 'consul'], ['formerCensor', 'censor'], ['formerPraetor', 'praetor'], ['formerAedile', 'aedile'], ['formerQuaestor', 'quaestor']]
          let found = former.find((pair) => traits.indexOf(pair[0]) >= 0)
          return found ? found[1] : ''
        },
        legionIncomeFactor(legions) {
          return (legions || []).reduce((sum, legion) => sum + this.clamp(((legion.strength || 0) * (legion.loyalty || 50)) / (60 * 70), 0.2, 1.5), 0)
        },
        syncPoliticalStanding(society, state, options) {
          // Monthly (forced refresh), on load and after political actions: mirror the Society's
          // political standing into the game (traits, status badges, monthly income). Idempotent.
          let force = !!(options && options.force)
          society = society || this.load()
          state = state || daapi.getState()
          if (!society || !state || !state.current || !state.characters) {
            return false
          }
          this.installPoliticalTraitDefinitions()
          this.ensureAdvancedRomanState(society, state)
          let pp = society.playerPolitics || {}
          let currentId = this.currentCharacterId(state)
          let player = state.characters[currentId]
          if (!player) {
            return false
          }
          this.politicalPriceIndex(society, state)
          pp.cursus = pp.cursus || {}
          pp.cursus.office = this.vanillaCareerOffice(player)
          let rank = this.playerPoliticalRank ? this.playerPoliticalRank(society, state) : ''
          let has = (trait) => (player.traits || []).indexOf(trait) >= 0
          let swap = (add, remove) => {
            try {
              if (remove && has(remove)) daapi.removeTrait({ characterId: currentId, trait: remove })
              if (add && !has(add)) daapi.addTrait({ characterId: currentId, trait: add })
            } catch (err) {
              console.warn(err)
            }
          }
          if (rank === 'dictator') {
            swap('corSocietyDictator')
          } else if (has('corSocietyDictator')) {
            swap('corSocietyFormerDictator', 'corSocietyDictator')
          }
          if (rank === 'emperor') {
            swap('corSocietyImperatorAugustus')
          } else if (has('corSocietyImperatorAugustus')) {
            swap('', 'corSocietyImperatorAugustus')
          }
          let rome = society.rome || {}
          let icon = this.imperatorIcon ? this.imperatorIcon() : this.affairIcon('senator')
          let rankTitle = rank === 'emperor' ? 'Imperator Augustus' : rank === 'dictator' ? 'Dictator' + (rome.dictatorTermEnd ? ' until ' + rome.dictatorTermEnd : '') : ''
          this.setSocietyStatus(currentId, 'cor_society_rank_status', rankTitle, icon, player)
          this.setSocietyIncome('influence', 'cor_society_rank', rank === 'emperor' ? 2500 : rank === 'dictator' ? 1500 : 0, ' - Roman Society: ' + (rankTitle || 'rank'), state, force)
          this.setSocietyIncome('prestige', 'cor_society_rank', rank === 'emperor' ? 1500 : rank === 'dictator' ? 750 : 0, ' - Roman Society: ' + (rankTitle || 'rank'), state, force)
          let legions = pp.legions || []
          let factor = this.legionIncomeFactor(legions)
          this.setSocietyStatus(currentId, 'cor_society_legions_status', legions.length ? 'Legions: ' + legions.length : '', this.lawIcon ? this.lawIcon('legion') : icon, player)
          this.setSocietyIncome('influence', 'cor_society_legions', 50 * factor, ' - Roman Society: legions', state, force)
          this.setSocietyIncome('prestige', 'cor_society_legions', 25 * factor, ' - Roman Society: legions', state, force)
          let clients = Math.max(0, Math.round(pp.clients || 0))
          this.setSocietyStatus(currentId, 'cor_society_clients_status', clients ? 'Clients: ' + clients : '', this.affairIcon('support'), player)
          this.setSocietyIncome('influence', 'cor_society_clients', Math.floor(clients / 4), ' - Roman Society: clientela', state, force)
          if (player.corSocietyAgnomen && String(player.agnomen || '').indexOf(player.corSocietyAgnomen) < 0) {
            this.setGameAgnomen(currentId, player.corSocietyAgnomen)
          }
          return true
        },
        setGameAgnomen(characterId, name) {
          // The game shows a name's honorific in its own `agnomen` field.
          let character = daapi.getCharacter({ characterId })
          if (!character || !name) return false
          let existing = String(character.agnomen || '').trim()
          if (existing.split(/\s+/).indexOf(name) >= 0) return false
          try {
            daapi.updateCharacter({ characterId, character: { agnomen: existing ? existing + ' ' + name : name } })
            return true
          } catch (err) {
            console.warn(err)
            return false
          }
        },
        _awardCognomenSilent(society, state) {
          let name = previousAwardCognomen.call(this, society, state)
          this.setGameAgnomen(this.currentCharacterId(state || daapi.getState()), name)
          return name
        },
        campaignExterior(args) {
          // A foreign campaign is fought in the game's own war: declare one if Rome is at peace,
          // and the commander joins it through the game's conscription (rank from their career).
          let state = daapi.getState()
          let currentId = this.currentCharacterId(state)
          let pp = this.load().playerPolitics || {}
          let victories = pp.victories || 0
          try {
            if (state.current && !state.current.flagRomeAtWar && typeof daapi.startWar === 'function') {
              daapi.startWar()
            }
            let player = daapi.getCharacter({ characterId: currentId })
            if (player && !player.flagAtWar && typeof daapi.joinWar === 'function') {
              daapi.joinWar({ characterId: currentId })
            }
          } catch (err) {
            console.warn(err)
          }
          let result = previousCampaignExterior.call(this, args)
          if (((this.load().playerPolitics || {}).victories || 0) > victories) {
            this.grantGameTrait(currentId, 'veteran')
          }
          return result
        },
        holdTriumph(args) {
          let currentId = this.currentCharacterId(daapi.getState())
          let victories = (this.load().playerPolitics || {}).victories || 0
          let result = previousHoldTriumph.call(this, args)
          if (((this.load().playerPolitics || {}).victories || 0) < victories) {
            this.grantGameTrait(currentId, 'coronaTriumphalis')
          }
          return result
        },
        militaryAcclamation(args) {
          let currentId = this.currentCharacterId(daapi.getState())
          let before = (this.load().rome || {}).civilWarPending
          let result = previousMilitaryAcclamation.call(this, args)
          let after = (this.load().rome || {}).civilWarPending
          if (after && after !== before) {
            this.installPoliticalTraitDefinitions()
            this.grantGameTrait(currentId, 'corSocietyImperatorAcclaimed')
          }
          return result
        },
        adoptHeir(args) {
          // The Society only recorded the choice; a Roman adoption makes the adoptee the adopter's
          // child: they join the player's dynasty and household and become the game's heir.
          args = args || {}
          let result = previousAdoptHeir.call(this, args)
          let rome = (this.load().rome) || {}
          if (args.characterId && String(rome.designatedHeirId || '') === String(args.characterId)) {
            this.adoptIntoPlayerFamily(args.characterId)
          }
          return result
        },
        adoptIntoPlayerFamily(characterId) {
          let state = daapi.getState()
          let currentId = this.currentCharacterId(state)
          let player = state.characters[currentId]
          let adoptee = state.characters[characterId]
          if (!player || !adoptee || adoptee.isDead || adoptee.corSocietySlave || String(characterId) === String(currentId)) {
            return false
          }
          let playerIsMale = player.gender ? player.gender === 'male' : player.isMale !== false
          let spouse = player.spouseId && state.characters[player.spouseId] && !state.characters[player.spouseId].isDead ? player.spouseId : ''
          let without = (list) => (list || []).filter((id) => String(id) !== String(characterId))
          try {
            ;[adoptee.fatherId, adoptee.motherId].forEach((parentId) => {
              let parent = parentId && state.characters[parentId]
              if (parent && String(parentId) !== String(currentId) && String(parentId) !== String(spouse)) {
                daapi.updateCharacter({ characterId: parentId, character: { childrenIds: without(parent.childrenIds) } })
              }
            })
            let patch = {
              dynastyId: player.dynastyId,
              corSocietyHouseId: player.dynastyId,
              flagIsAdopted: true,
              hasMovedOut: false,
              corSocietyBirthFatherId: adoptee.fatherId || '',
              corSocietyBirthMotherId: adoptee.motherId || ''
            }
            patch[playerIsMale ? 'fatherId' : 'motherId'] = currentId
            patch[playerIsMale ? 'motherId' : 'fatherId'] = spouse || null
            daapi.updateCharacter({ characterId, character: patch })
            daapi.updateCharacter({ characterId: currentId, character: { childrenIds: without(player.childrenIds).concat([characterId]) } })
            if (spouse) {
              daapi.updateCharacter({ characterId: spouse, character: { childrenIds: without(state.characters[spouse].childrenIds).concat([characterId]) } })
            }
            if (typeof daapi.refreshHouseholdCharactersList === 'function') {
              daapi.refreshHouseholdCharactersList()
            }
            this.invokeGameMethod({ event: 'lifeAndDeath/designateHeir', method: 'process', context: { characterId } })
          } catch (err) {
            console.warn(err)
            return false
          }
          let society = this.load()
          this.log(society, this.characterName(Object.assign({}, adoptee, { id: characterId }), state) + ' is adopted into your family and named your heir.', 'familyTree', this.currentCharacterDynastyId(state))
          this.save(society)
          return true
        },
        seekPriesthood(args) {
          // The game has appointed priesthoods (augur, flamen, epulo) as real jobs, but no
          // pontifex election, so the Society's priesthood becomes one of those when the
          // character has no other office.
          let state = daapi.getState()
          let currentId = this.currentCharacterId(state)
          let player = state.characters[currentId]
          let result = previousSeekPriesthood.call(this, args)
          if (player && !player.job && typeof daapi.setCharacterJob === 'function') {
            let rome = (this.load().rome) || {}
            let held = (rome.priesthoods || {})[currentId]
            let job = held === 'augur' ? 'augures' : this.pick(['flamens', 'epulones'])
            try {
              daapi.setCharacterJob({ characterId: currentId, job, jobLevel: 0 })
            } catch (err) {
              console.warn(err)
            }
          }
          return result
        },
        invokeGameMethod(method) {
          // Run one of the game's own event methods the way its UI does (store action invokeMethod).
          let root = this.findGameVueRoot ? this.findGameVueRoot() : null
          let store = root && root.$store
          if (!store || typeof store.dispatch !== 'function') {
            return false
          }
          store.dispatch('invokeMethod', { isDAAPI: false, method })
          return true
        },
        gameElectionOffices() {
          return [
            { key: 'electionVigintisexviri', event: 'election/vigintisexviri', title: 'Vigintisexvir', rule: 'Age 16+, not yet a senator, family wealth above 25,000.' },
            { key: 'electionMilitaryTribune', event: 'election/militaryTribune', title: 'Military tribune', rule: 'Fit for service: no crippling wound, illness or maiming.' },
            { key: 'electionQuaestor', event: 'election/quaestor', title: 'Quaestor', rule: 'Age 32+, senatorial class; a veteran, senator or former magistrate; not after a praetorship.' },
            { key: 'electionPlebianTribune', event: 'election/plebianTribune', title: 'Plebeian tribune', rule: 'Age 16+, senatorial class, family wealth above 7,500.' },
            { key: 'electionAedile', event: 'election/aedile', title: 'Aedile', rule: 'Age 36+, senatorial class, after a quaestorship or plebeian tribunate.' },
            { key: 'electionPraetor', event: 'election/praetor', title: 'Praetor', rule: 'Age 39+, senatorial class, after a quaestorship, aedileship or plebeian tribunate.' },
            { key: 'electionConsul', event: 'election/consul', title: 'Consul', rule: 'Age 42+, senatorial class, after a praetorship; 9 years between consulships.' },
            { key: 'electionCensor', event: 'election/censor', title: 'Censor', rule: 'Age 51+, senatorial class, a former consul.' }
          ]
        },
        gameElectionReady(state, character) {
          // The game's own processPreCheck for an election action.
          let month = state && state.month
          let household = ((state && state.current && state.current.householdCharacterIds) || []).map(String)
          return !!(character && (month === 10 || month === 11 || month === 12) && household.indexOf(String(character.id)) >= 0 &&
            !character.flagIsBusy && !character.flagIsAway && (!character.flagElection || character.flagElection.won))
        },
        openCursus() {
          let society = this.ensure()
          let state = daapi.getState()
          this.ensureAdvancedRomanState(society, state)
          let season = state.month === 10 || state.month === 11 || state.month === 12
          let household = (state.current.householdCharacterIds || []).map((id) => state.characters[id]).filter((c) => c && !c.isDead)
          let offices = this.gameElectionOffices()
          let options = []
          household.forEach((character) => {
            offices.forEach((office) => {
              let action = character.actions && character.actions[office.key]
              if (!action || !action.isAvailable) return
              let ready = this.gameElectionReady(state, character)
              let text = this.characterName(character, state) + ': stand for ' + office.title
              let tooltip = 'Opens the game\'s election and campaign for ' + office.title + '. ' + office.rule + ' Buying ludi seats for voters in the campaign is recorded as ambitus.'
              options.push(this.politicsButton('standForOffice', text, 'senator', { characterId: character.id, actionKey: office.key }, ready ? { tooltip } : { disabled: true, showDisabledWithTooltip: true, tooltip: tooltip + '\nLocked: ' + (season ? 'busy, away, or already campaigning.' : 'elections are held in months 10-12.') }))
            })
          })
          let player = state.characters[this.currentCharacterId(state)] || {}
          offices.forEach((office) => {
            let action = player.actions && player.actions[office.key]
            if (action && action.isAvailable) return
            options.push({ text: office.title + (season ? ' (not open to you)' : ' (elections open in month 10)'), icons: [this.affairIcon('senator')], disabled: true, showDisabledWithTooltip: true, tooltip: 'The game decides eligibility during the election months (10-12). ' + office.rule })
          })
          options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openRomanPower' } } })
          let job = player.job || ''
          this.pushModal({
            societyMenu: true,
            title: 'Cursus honorum',
            message: 'Offices are won in the game\'s own elections, held in months 10-12 (now month ' + state.month + '). ' +
              (job ? 'Current office: ' + job + '. ' : '') + 'Prerequisites, campaigns and terms are the game\'s.',
            image: this.affairIcon('senator'),
            options
          })
        },
        standForOffice({ characterId, actionKey } = {}) {
          let state = daapi.getState()
          let character = characterId && state.characters[characterId]
          let action = character && character.actions && actionKey && character.actions[actionKey]
          if (!action || !action.isAvailable || !this.gameElectionReady(state, character) || !action.process) {
            this.openCursus()
            return
          }
          this.invokeGameMethod(action.process)
        },
        buyVotes() {
          // Replaced by the game's campaign (buying ludi seats is recorded as ambitus).
          this.openCursus()
        },
        warnCampaignTickets(payload) {
          // The game's campaign offers ludi seats for the voters (election/campaign/buyTickets). For a
          // candidate of the player's household they are recorded as hidden ambitus
          // (recordCampaignAmbitus), so the choices say so before the click.
          let options = payload && Array.isArray(payload.options) ? payload.options : []
          let state = null
          let warned = 0
          options.forEach((option) => {
            let target = option && option.action
            if (!target || target.event !== 'election/campaign/buyTickets' || (target.method !== 'buyTicketsCost' && target.method !== 'buyTicketsResult')) {
              return
            }
            state = state || daapi.getState()
            let characterId = target.context && target.context.characterId
            let household = ((state.current && state.current.householdCharacterIds) || []).map(String)
            if (!characterId || household.indexOf(String(characterId)) < 0) {
              return
            }
            let def = this.crimeCatalog().ambitus
            let character = (state.characters && state.characters[characterId]) || {}
            let who = String(characterId) === String(this.currentCharacterId(state)) ? 'you' : '[c|' + characterId + '|' + (character.praenomen || 'the candidate') + ']'
            let warning = 'Consequences: buying seats for the voters is ambitus. It is recorded against ' + who + ', and if it comes out a trial follows: if convicted, ' + def.jail + ' months in prison, a fine and no office for 3 years.'
            if (String(option.tooltip || '').indexOf(warning) >= 0) {
              return
            }
            option.tooltip = option.tooltip ? option.tooltip + '\n' + warning : warning
            warned += 1
          })
          return warned
        },
        recordCampaignAmbitus(context) {
          let state = daapi.getState()
          let characterId = context && context.characterId
          let household = ((state.current && state.current.householdCharacterIds) || []).map(String)
          if (!characterId || household.indexOf(String(characterId)) < 0) {
            return false
          }
          let society = this.load()
          this.ensureAdvancedRomanState(society, state)
          this.recordCrime(society, state, characterId, 'ambitus', this.politicalPrice(90), 'election')
          this.log(society, 'Ludi seats are bought for the voters. The campaign gains, but ambitus is now hidden in the record.', 'crime')
          this.save(society)
          return true
        },
        installPoliticsGuards(root) {
          // Option clicks go through the game's store action processInteractionModalAction, so the
          // campaign's 'buy tickets' choice can be seen and recorded as ambitus. The modals that offer
          // it go through pushInteractionModalQueue, so their options can state the risk first.
          root = root || (this.findGameVueRoot ? this.findGameVueRoot() : null)
          let store = root && root.$store
          if (!store || store.__corSocietyPoliticsGuard || typeof store.subscribeAction !== 'function') {
            return false
          }
          store.__corSocietyPoliticsGuard = true
          store.subscribeAction({
            before: (action) => {
              try {
                let type = String((action && action.type) || '')
                let option = action && action.payload
                let target = option && option.action
                if (type.split('/').pop() === 'processInteractionModalAction' && target && target.event === 'election/campaign/buyTickets' && target.method === 'buyTicketsResult' && window.corSociety && window.corSociety.recordCampaignAmbitus) {
                  window.corSociety.recordCampaignAmbitus(target.context)
                }
                if (type.split('/').pop() === 'pushInteractionModalQueue' && window.corSociety && window.corSociety.warnCampaignTickets) {
                  window.corSociety.warnCampaignTickets(option)
                }
              } catch (err) {
                // never block a game action
              }
            }
          })
          return true
        }
      })
      window.corSociety._mixinCorSocietyPoliticsIntegrationVersion = '1.1.331'
    }
  }
}
