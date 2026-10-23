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
      // - political cash costs follow inflation: the median house wealth / 12,000 (0.5x-4x).
      // replaces: openCursus, standForOffice, buyVotes (offices now go through the game's elections)
      let previousPoliticsAction = window.corSociety.politicsAction
      let previousApplyStats = window.corSociety.applyStats
      let previousCostLabel = window.corSociety.costLabel
      let previousUpkeep = window.corSociety.simulateClientelaAndLegionUpkeep
      Object.assign(window.corSociety, {
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
        installPoliticsGuards() {
          // Option clicks go through the game's store action processInteractionModalAction, so the
          // campaign's 'buy tickets' choice can be seen and recorded as ambitus.
          let root = this.findGameVueRoot ? this.findGameVueRoot() : null
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
