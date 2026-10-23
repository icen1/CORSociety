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
      // - political cash costs follow inflation: the median house wealth / 12,000 (0.5x-4x).
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
        }
      })
      window.corSociety._mixinCorSocietyPoliticsIntegrationVersion = '1.1.331'
    }
  }
}
