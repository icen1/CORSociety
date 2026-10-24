{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyMonthlyEconomy() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyMonthlyEconomyVersion === '1.1.331') {
        return
      }
      Object.assign(window.corSociety, {
        monthlyTick() {
                  // Finish last month's sliced work before starting a new month.
                  this.flushPendingMonthlyWork()
                  if (this.pruneGameSessionErrorLog) {
                    this.pruneGameSessionErrorLog()
                  }
                  // The game's own monthly events ran just before this in the same task; never reuse a
                  // state snapshot taken before them.
                  if (this.invalidateStateSnapshot) {
                    this.invalidateStateSnapshot()
                  }
                  let state = daapi.getState()
                  let society = this.loadForAction()
                  if (!society || !society.settings.enabled) {
                    return
                  }
                  if (society.generatedCharacterIds && society.generatedCharacterIds.length > 420) {
                    society.generatedCharacterIds = society.generatedCharacterIds.slice(-420)
                  }
                  this.installDebtSaleModalPatch()
                  let monthKey = this.monthKey(state)
                  // A processed month only runs again to finish what a save made mid-month left
                  // undone: the game autosaves as soon as its month step ends, before the first slice.
                  let progress = society.monthlyProgress
                  let resumeFrom = 0
                  if (society.lastProcessedMonth === monthKey) {
                    if (!progress || progress.month !== monthKey) {
                      return
                    }
                    resumeFrom = Math.max(0, parseInt(progress.done, 10) || 0)
                  } else {
                    society.monthlyProgress = { month: monthKey, done: 0 }
                  }
                  // Persist the month marker immediately. If any later step throws, the month is
                  // still marked as processed, so the whole pass (and its modals) is not replayed
                  // on every game tick, which used to flood notifications and slow the game down.
                  society.lastProcessedMonth = monthKey
                  this.save(society)
                  // The steps below are queued, not run here: runMonthlyQueue works through them in
                  // small slices so the game stays clickable (pause included) while the month finishes.
                  let queue = []
                  let step = (name, fn) => {
                    queue.push({ name, fn })
                  }
                  let refresh = () => {
                    queue.push({
                      name: '',
                      fn: () => {
                        state = daapi.getState()
                      }
                    })
                  }
                  try {
                    step('repairPlayerFamilyHouseAssignment', () => this.repairPlayerFamilyHouseAssignment(society, state))
                    refresh()
                    step('syncPlayerWorldEffects', () => this.syncPlayerWorldEffects(society, state))
                    if (this.syncInheritanceEligibility) {
                      step('syncInheritanceEligibility', () => this.syncInheritanceEligibility(daapi.getState()))
                    }
                    step('repairFalsePlayerSlaveFlags', () => this.repairFalsePlayerSlaveFlags(society, state))
                    step('syncPlayerHouseRecord', () => this.syncPlayerHouseRecord(society, state))
                    step('repairDynastyHouseSystem', () => this.repairDynastyHouseSystem(society, state))
                    step('maintainDynastyHouseSystem', () => this.maintainDynastyHouseSystem(society, state, { phase: 'monthly-start' }))
                    step('syncExtendedKinVisibility', () => this.syncExtendedKinVisibility(society, state, { force: true }))
                    step('processBankYear', () => this.processBankYear(society, state))
                    step('simulatePrivateLoans', () => this.simulatePrivateLoans(society, state))
                    step('processPlayerSlaves', () => this.processPlayerSlaves(society, state))
                    step('syncOwnedSlavesIntoHousehold', () => this.syncOwnedSlavesIntoHousehold(society, daapi.getState()))
                    step('simulateHouseTurns', () => this.simulateHouseTurns(society, state))
                    step('repairIncompleteGeneratedParentPairs', () => this.repairIncompleteGeneratedParentPairs(society, state))
                    if (this.repairFamilyLinkIntegrity) {
                      step('repairFamilyLinkIntegrity', () => this.repairFamilyLinkIntegrity(society, state))
                      refresh()
                    }
                    if (this.preparePlayerDynastyTreeOnce) {
                      step('preparePlayerDynastyTreeOnce', () => this.preparePlayerDynastyTreeOnce(society, state))
                      refresh()
                    }
                    step('sustainStrugglingHouses', () => this.sustainStrugglingHouses(society, state, { budget: 4 }))
                    refresh()
                    step('retireDeadHouses', () => this.retireDeadHouses(society, state, { notify: this.extinctionNoticesEnabled(society) }))
                    refresh()
                    step('ensureMinimumHouses', () => this.ensureMinimumHouses(society, state))
                    refresh()
                    step('maybeCreateNpcCadetHouses', () => this.maybeCreateNpcCadetHouses(society, state))
                    step('updateDynastyHeadship', () => this.updateDynastyHeadship(society, state))
                    step('simulateInterHouseAffairs', () => this.simulateInterHouseAffairs(society, state))
                    step('maybeStartNpcRomance', () => this.maybeStartNpcRomance(society, state))
                    step('simulateRomances', () => this.simulateRomances(society, state))
                    refresh()
                    step('resolvePendingPaternities', () => this.resolvePendingPaternities(society, state))
                    step('resolvePendingVentures', () => this.resolvePendingVentures(society, state))
                    step('driftRelations', () => this.driftRelations(society))
                    step('resolveTradeCompacts', () => this.resolveTradeCompacts(society, state))
                    step('applyNetworkModifiers', () => this.applyNetworkModifiers(society))
                    if (this.simulatePoliticsMonthly) {
                      step('simulatePoliticsMonthly', () => this.simulatePoliticsMonthly(society, daapi.getState()))
                      refresh()
                    }
                    if (this.simulateRomanSystemsMonthly) {
                      step('simulateRomanSystemsMonthly', () => this.simulateRomanSystemsMonthly(society, daapi.getState()))
                      refresh()
                    }
                    if (this.syncPoliticalStanding) {
                      step('syncPoliticalStanding', () => this.syncPoliticalStanding(society, daapi.getState(), { force: true }))
                    }
                    step('maintainDynastyHouseSystem-final', () => this.maintainDynastyHouseSystem(society, daapi.getState(), { force: true, phase: 'monthly-final', repairCadetBranches: true }))
                    if (this.repairCharacterDynastyPointers) {
                      step('repairCharacterDynastyPointers', () => this.repairCharacterDynastyPointers(society, daapi.getState()))
                    }
                    step('monthlyEvents', () => {
                      let familyCareQueued = this.queueFamilyCareEvent(society, state)
                      if (society.settings.monthlyEvents && Math.random() < (familyCareQueued ? 0.32 : 0.64)) {
                        this.queueMonthlyEvent(society, state)
                      }
                    })
                    if (this.clearFamilyTreeRuntimeCache) {
                      step('clearFamilyTreeRuntimeCache', () => this.clearFamilyTreeRuntimeCache())
                    }
                  } finally {
                    this.runMonthlyQueue(society, queue, resumeFrom)
                  }
                },
        runMonthlyQueue(society, queue, resumeFrom) {
                  // Mod code must run on the game's main thread (the game hard-wires DAAPI events there),
                  // so instead of one long block the month runs in slices with a setTimeout in between:
                  // clicks, pause and the game's own worker results get handled meanwhile. The first slice
                  // waits for a timer too, so the game's own month step (its worker post, this mod list and
                  // its autosave) ends without the month's work. Slices are ~16 ms (reading the state costs
                  // nothing now that getState() is a live view), and the game's character rebuilds are held
                  // until the month is done (holdCoalescedRefreshes): one rebuild for the whole month.
                  // Tune in-game with window.corSocietyMonthlySliceMs; disable with
                  // window.corSocietyDisableMonthlySlicing = true.
                  // Anything that reads Society state first completes the pending month
                  // (flushPendingMonthlyWork from monthlyTick, runAction and ensure).
                  // society.monthlyProgress records how many steps have started, so a save made
                  // mid-month (the game autosaves as soon as its month step ends, and every 15 s) resumes
                  // after the last step that started; a step that crashed the game is not run again.
                  this.flushPendingMonthlyWork()
                  let progress = society.monthlyProgress
                  let from = Math.max(0, parseInt(resumeFrom, 10) || 0)
                  if (from && (!progress || progress.total !== queue.length)) {
                    // The step list changed (another version made this save): do not guess which
                    // steps already ran.
                    delete society.monthlyProgress
                    this.save(society)
                    return
                  }
                  if (progress) {
                    progress.total = queue.length
                  }
                  let job = { society, queue, index: from, done: false }
                  if (this.holdCoalescedRefreshes) {
                    this.holdCoalescedRefreshes(true)
                  }
                  let canSlice = typeof window !== 'undefined' && typeof window.setTimeout === 'function' && !window.corSocietyDisableMonthlySlicing
                  if (!canSlice) {
                    this.runMonthlySteps(job, Infinity)
                    return
                  }
                  this._pendingMonthly = job
                  let pump = () => {
                    if (this._pendingMonthly !== job) {
                      return
                    }
                    this.runMonthlySteps(job, Math.max(1, parseFloat(window.corSocietyMonthlySliceMs) || 16))
                    if (!job.done) {
                      window.setTimeout(pump, 0)
                    }
                  }
                  window.setTimeout(pump, 0)
                },
        runMonthlySteps(job, budgetMs) {
                  if (!this.monthlyJobIsCurrent(job)) {
                    // A save loaded since this month began replaced the Society state: the remaining
                    // steps belong to the old game and must not run against, or save into, the new one.
                    job.done = true
                    if (this._pendingMonthly === job) {
                      this._pendingMonthly = null
                    }
                    if (this.holdCoalescedRefreshes) {
                      this.holdCoalescedRefreshes(false)
                    }
                    return
                  }
                  let clock = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())
                  let started = clock()
                  while (job.index < job.queue.length) {
                    let item = job.queue[job.index]
                    job.index += 1
                    if (job.society.monthlyProgress) {
                      job.society.monthlyProgress.done = job.index
                    }
                    this._runningMonthlyStep = true
                    let stepStarted = clock()
                    try {
                      item.fn()
                    } catch (err) {
                      console.warn('Roman Society monthly step failed: ' + (item.name || 'refresh'), err)
                      if (item.name) {
                        job.society.lastMonthlyError = item.name + ': ' + (err && err.message)
                      }
                    } finally {
                      this._runningMonthlyStep = false
                      if (this.perfTime) {
                        this.perfTime('monthStep:' + (item.name || 'refresh'), clock() - stepStarted)
                      }
                    }
                    if (clock() - started >= budgetMs) {
                      break
                    }
                  }
                  if (job.index >= job.queue.length && !job.done) {
                    job.done = true
                    if (this._pendingMonthly === job) {
                      this._pendingMonthly = null
                    }
                    if (this.holdCoalescedRefreshes) {
                      this.holdCoalescedRefreshes(false)
                    }
                    delete job.society.monthlyProgress
                    this.save(job.society)
                  }
                  if (this.perfTime) {
                    this.perfTime('monthSlice', clock() - started)
                  }
                },
        monthlyJobIsCurrent(job) {
                  // Global flags are kept by reference, so the job's Society object is the live flag
                  // until a save load (or a reset) replaces it.
                  try {
                    return typeof daapi !== 'undefined' && !!daapi && daapi.getGlobalFlag({ flag: this.flag }) === job.society
                  } catch (err) {
                    return false
                  }
                },
        flushPendingMonthlyWork() {
                  let job = this._pendingMonthly
                  if (!job || this._runningMonthlyStep) {
                    return false
                  }
                  this.runMonthlySteps(job, Infinity)
                  return true
                },
        extinctionNoticesEnabled(society) {
                  // Extinct-house popups are opt-in: they are always written to the Society log and
                  // the Dead houses archive, but only interrupt play when explicitly enabled.
                  return !!(society && society.settings && society.settings.extinctionNotices)
                },
        syncPlayerWorldEffects(society, state) {
                  let current = (state && state.current) || {}
                  let snapshot = {
                    cash: parseFloat(current.cash || 0),
                    influence: parseFloat(current.influence || 0),
                    prestige: parseFloat(current.prestige || 0)
                  }
                  if (!society.playerSnapshot) {
                    society.playerSnapshot = snapshot
                    return
                  }
                  let previous = society.playerSnapshot || snapshot
                  let prestigeDelta = snapshot.prestige - parseFloat(previous.prestige || 0)
                  let influenceDelta = snapshot.influence - parseFloat(previous.influence || 0)
                  let cashDelta = snapshot.cash - parseFloat(previous.cash || 0)
                  society.playerSnapshot = snapshot
                  let statusShift = this.clamp(Math.round(prestigeDelta / 250 + influenceDelta / 1200), -4, 4)
                  let wealthShift = this.clamp(Math.round(cashDelta / 2500), -3, 3)
                  if (!statusShift && !wealthShift) {
                    return
                  }
                  let changed = 0
                  this.sortedHouses(society).forEach((house) => {
                    let elite = this.socialLevel(house.stratum) >= 4
                    let lower = this.socialLevel(house.stratum) <= 2
                    let delta = 0
                    if (elite) {
                      delta += statusShift
                    } else if (lower) {
                      delta += Math.round(statusShift / 2) + wealthShift
                    } else {
                      delta += Math.round((statusShift + wealthShift) / 2)
                    }
                    if (house.rivalry && statusShift > 0) {
                      delta -= 1
                      house.heat = (house.heat || 0) + 1
                    }
                    if (delta) {
                      house.relation = this.clamp((house.relation || 0) + delta, -100, 100)
                      changed += 1
                    }
                  })
                  if (changed && (Math.abs(statusShift) >= 2 || Math.abs(wealthShift) >= 2)) {
                    this.log(society, 'Your changing public fortune shifts the mood of ' + changed + ' houses.', statusShift >= 0 || wealthShift >= 0 ? 'support' : 'rivalry')
                  }
                },
        simulateHouseTurns(society, state) {
                  let houses = this.sortedHouses(society)
                  let activeHouses = this.monthlyHouseSimulationBatch(society, houses)
                  let allSlaveCandidates = false
                  activeHouses.forEach((house) => {
                    this.refreshHouseMemberLists(society, state, house)
                    this.initHouseAI(house)
                    this.runHouseEconomy(society, state, house)
                    this.simulateHouseBanking(society, state, house)
                    
                    if (house.stratum !== 'poor' && house.ai.cash > 180) {
                      if (!allSlaveCandidates) allSlaveCandidates = this.npcEnslavedCandidates(society, state)
                      this.simulateHouseSlaves(society, state, house, allSlaveCandidates)
                    }
                    this.simulateFreedmanRescueAttempts(society, state, house, allSlaveCandidates)
                    
                    let profile = this.strata[house.stratum] || this.strata.plebeian
                    let event = ''
                    if (house.agenda === 'office') {
                      house.ai.influence = Math.max(0, house.ai.influence - this.randomInt(2, 10))
                      house.ai.cash = Math.max(0, house.ai.cash - this.randomInt(0, Math.round((profile.cost || 100) / 10)))
                      house.power += this.randomInt(1, 6)
                      house.wealth -= this.randomInt(0, Math.round((profile.cost || 100) / 8))
                      if (Math.random() < 0.14) {
                        event = 'officeCampaign'
                        house.power += 8
                        house.ai.prestige += 12
                        house.stability -= 2
                      }
                    } else if (house.agenda === 'wealth') {
                      if (house.ai.cash > (profile.cost || 200) && Math.random() < 0.35) {
                        this.aiBuyProperty(house, {}, state)
                      }
                      house.wealth += this.randomInt(10, profile.revenue || 40)
                      if (Math.random() < 0.12) {
                        event = 'tradeVenture'
                        house.wealth += profile.revenue || 20
                        this.aiBuyProperty(house, { preferred: ['tradeships', 'seafaringTradeships', 'insulae', 'fishingBoat'] }, state)
                      }
                    } else if (house.agenda === 'marriage') {
                      house.stability += this.randomInt(0, 4)
                      if (Math.random() < 0.10) {
                        event = 'marriageAlliance'
                        house.power += 3
                        if ((house.memberIds || []).length < 8 && this.livingGeneratedCount(society, state) < 140) {
                          this.generateHouseMember(society, state, house)
                        }
                      }
                    } else if (house.agenda === 'security') {
                      house.ai.cash += this.randomInt(0, profile.revenue || 20)
                      house.stability += this.randomInt(1, 5)
                      house.wealth += this.randomInt(0, Math.round((profile.revenue || 20) / 2))
                      if (Math.random() < 0.08) {
                        event = 'inheritanceDispute'
                        house.stability -= 8
                      }
                    } else if (house.agenda === 'revenge') {
                      house.power += this.randomInt(0, 4)
                      house.stability -= this.randomInt(0, 3)
                      if (Math.random() < 0.13) {
                        event = 'feud'
                        house.heat = (house.heat || 0) + 1
                      }
                    } else {
                      house.wealth += this.randomInt(0, profile.revenue || 20)
                      house.stability += this.randomInt(-1, 2)
                    }
                    if (house.wealth < 0) {
                      house.wealth = 0
                      house.stability -= 4
                    }
                    house.stability = this.clamp(house.stability, 0, 100)
                    if (house.stability < 18 && Math.random() < 0.25) {
                      event = 'scandal'
                      house.power = Math.max(0, house.power - 8)
                    }
                    if (event) {
                      this.recordFamilyEvent(society, house, event)
                    }
                    this.simulateHouseFamilyLife(society, state, house, houses)
                    this.simulateHouseHostileActions(society, state, house, houses)
                    house.ai.cash = Math.max(0, Math.round(house.ai.cash))
                    house.ai.influence = Math.max(0, Math.round(house.ai.influence))
                    house.ai.prestige = Math.max(0, Math.round(house.ai.prestige))
                    house.wealth = Math.max(0, Math.round(house.ai.cash + this.housePropertyValue(house)))
                    house.power = Math.max(house.power || 0, Math.round(house.ai.influence / 18 + house.ai.prestige / 2500))
                    house.strength = Math.max(1, Math.round((house.strength || 0) * 0.85 + (house.power || 0) * 0.25 + (house.wealth || 0) / 160 + (house.stability || 0) / 8))
                    this.updateHouseStratumFromAI(society, house)
                  })
                },
        monthlyHouseSimulationBatch(society, houses) {
                  houses = houses || []
                  if (houses.length <= 32) {
                    return houses
                  }
                  let limit = Math.max(18, Math.min(32, parseInt((society.settings && society.settings.monthlyHouseBudget) || 26, 10) || 26))
                  let pinnedCandidates = houses.filter((house) => {
                    return house && (
                      house.pendingPlayerEvent ||
                      house.rivalry ||
                      (house.favor || 0) > 0 ||
                      (house.relation || 0) >= 55 ||
                      (house.relation || 0) <= -45 ||
                      ((house.memberIds || []).length > 0 && (house.memberIds || []).length <= 3) ||
                      house.agenda === 'marriage'
                    )
                  })
                  let pinnedCursor = parseInt(society.pinnedHouseSimulationCursor || 0, 10) || 0
                  let pinned = []
                  let pinnedGuard = 0
                  while (pinned.length < 8 && pinnedGuard < pinnedCandidates.length) {
                    pinned.push(pinnedCandidates[(pinnedCursor + pinnedGuard) % pinnedCandidates.length])
                    pinnedGuard += 1
                  }
                  society.pinnedHouseSimulationCursor = pinnedCandidates.length ? (pinnedCursor + Math.max(1, pinned.length)) % pinnedCandidates.length : 0
                  let seen = {}
                  pinned.forEach((house) => {
                    if (house && house.id) seen[house.id] = true
                  })
                  let cursor = parseInt(society.houseSimulationCursor || 0, 10) || 0
                  let rotating = []
                  let guard = 0
                  while (rotating.length + pinned.length < limit && guard < houses.length) {
                    let house = houses[(cursor + guard) % houses.length]
                    guard += 1
                    if (!house || !house.id || seen[house.id]) {
                      continue
                    }
                    seen[house.id] = true
                    rotating.push(house)
                  }
                  society.houseSimulationCursor = houses.length ? (cursor + Math.max(1, rotating.length)) % houses.length : 0
                  return pinned.concat(rotating)
                },
        maybeCreateNpcCadetHouses(society, state) {
                  if (!society || !society.dynasties || !state || !state.characters) {
                    return false
                  }
                  let created = false
                  let excludedIds = this.playerKeptIdMap(state)
                  for (let dynastyId in society.dynasties) {
                    if (!society.dynasties.hasOwnProperty(dynastyId)) continue
                    let dynasty = society.dynasties[dynastyId]
                    let originHouse = this.primaryHouseForDynasty(society, dynastyId)
                    if (!originHouse || originHouse.stratum === 'poor') continue
                    let houses = this.housesForDynasty(society, dynastyId)
                    let limit = this.cadetHouseLimitForStratum(originHouse.stratum || dynasty.stratum)
                    if (houses.length >= limit) continue
                    let score = this.houseHeadshipScore(originHouse)
                    let threshold = originHouse.stratum === 'senatorial' ? 180 : originHouse.stratum === 'equestrian' ? 135 : originHouse.stratum === 'civic' ? 95 : 70
                    let chance = originHouse.stratum === 'senatorial' ? 0.018 : originHouse.stratum === 'equestrian' ? 0.014 : 0.008
                    if (score < threshold || Math.random() >= chance) continue
                    // The player, their line, ancestors and household never found or join an NPC
                    // cadet house; a sibling's or cousin's line may.
                    let founder = this.cadetFounderCandidate(society, state, dynastyId, false, excludedIds)
                    if (!founder) continue
                    if (this.createCadetHouse(society, state, dynastyId, founder, 'npc cadet foundation')) {
                      created = true
                      state = daapi.getState()
                    }
                  }
                  return created
                },
        updateHouseStratumFromAI(society, house) {
                  let previous = house.stratum || 'plebeian'
                  let strength = house.strength || 0
                  let next = previous
                  if (strength >= 120 && previous !== 'senatorial') {
                    next = 'senatorial'
                  } else if (strength >= 72 && this.socialLevel(previous) < 4) {
                    next = 'equestrian'
                  } else if (strength >= 38 && this.socialLevel(previous) < 3) {
                    next = 'civic'
                  } else if (strength >= 18 && this.socialLevel(previous) < 2) {
                    next = 'plebeian'
                  } else if (strength < 8 && previous !== 'poor') {
                    next = previous === 'freedmen'
                      ? 'poor'
                      : previous === 'plebeian'
                        ? 'freedmen'
                        : previous === 'civic'
                          ? 'plebeian'
                          : previous === 'equestrian'
                            ? 'civic'
                            : 'equestrian'
                  } else if (strength < 15 && previous === 'plebeian') {
                    next = 'freedmen'
                  } else if (strength < 15 && this.socialLevel(previous) > 2) {
                    next = previous === 'senatorial' ? 'equestrian' : previous === 'equestrian' ? 'civic' : 'plebeian'
                  }
                  if (next !== previous) {
                    house.stratum = next
                    this.log(society, house.name + ' moves from ' + this.stratumTitle(previous) + ' to ' + this.stratumTitle(next) + '.', strength >= 18 ? 'support' : 'scandal', house.id)
                  }
                },
        vanillaPropertyGroups() {
                  return {
                    land: ['farmland', 'vinyard', 'orchard', 'primeFarmland', 'primeVinyard', 'primeOrchard'],
                    animal: ['horse', 'donkey', 'pig', 'goat', 'sheep', 'cattle', 'duck', 'chicken'],
                    boat: ['fishingBoat', 'tradeships', 'seafaringTradeships'],
                    estate: ['insulae', 'latifundiumFood', 'latifundiumAnimal', 'latifundiumFish', 'latifundiumOil']
                  }
                },
        vanillaPropertyTypes() {
                  return {
                    farmland: { value: 250, revenue: 1.7496, group: 'land', title: 'Farmland' },
                    vinyard: { value: 360, revenue: 2.5272, group: 'land', title: 'Vinyard' },
                    orchard: { value: 420, revenue: 2.7864, group: 'land', title: 'Orchard' },
                    primeFarmland: { value: 2700, revenue: 17.253, group: 'land', title: 'Prime farmland' },
                    primeVinyard: { value: 3300, revenue: 21.978, group: 'land', title: 'Prime vinyard' },
                    primeOrchard: { value: 3900, revenue: 27.027, group: 'land', title: 'Prime orchard' },
                    latifundiumFood: { value: 11000, revenue: 67.32, group: 'estate', title: 'Food latifundium' },
                    latifundiumAnimal: { value: 14000, revenue: 88.2, group: 'estate', title: 'Animal latifundium' },
                    latifundiumFish: { value: 17000, revenue: 113.22, group: 'estate', title: 'Fish latifundium' },
                    latifundiumOil: { value: 21000, revenue: 145.53, group: 'estate', title: 'Oil latifundium' },
                    insulae: { value: 4500, revenue: 27.945, group: 'estate', title: 'Insulae' },
                    fishingBoat: { value: 41, revenue: 0.29799, group: 'boat', title: 'Fishing boat', baseMax: 0.54 },
                    tradeships: { value: 630, revenue: 4.71744, group: 'boat', title: 'Trade ship', isCommercial: true },
                    seafaringTradeships: { value: 7500, revenue: 54, group: 'boat', title: 'Seafaring trade ship', isCommercial: true },
                    horse: { value: 125, revenue: 0.324, group: 'animal', title: 'Horse' },
                    donkey: { value: 28, revenue: 0.216, group: 'animal', title: 'Donkey' },
                    pig: { value: 26, revenue: 0.2016, group: 'animal', title: 'Pig' },
                    goat: { value: 32, revenue: 0.2304, group: 'animal', title: 'Goat' },
                    sheep: { value: 36, revenue: 0.252, group: 'animal', title: 'Sheep' },
                    cattle: { value: 40, revenue: 0.288, group: 'animal', title: 'Cattle' },
                    duck: { value: 15, revenue: 0.10368, group: 'animal', title: 'Duck' },
                    chicken: { value: 10, revenue: 0.072, group: 'animal', title: 'Chicken' }
                  }
                },
        seedHousePropertyDetails(house) {
                  let property = (house && house.ai && house.ai.property) || {}
                  let strength = Math.max(1, Math.round((house && house.strength) || 10))
                  let details = {}
                  let add = (key, count) => {
                    count = Math.max(0, Math.round(parseFloat(count || 0)))
                    if (count) details[key] = (details[key] || 0) + count
                  }
                  let land = Math.max(0, Math.round(parseFloat(property.land || 0)))
                  let animals = Math.max(0, Math.round(parseFloat(property.animals || 0)))
                  let trade = Math.max(0, Math.round(parseFloat(property.trade || 0)))
                  if (!land && strength >= 18 && house.stratum !== 'poor') land = Math.max(1, Math.round(strength / 26))
                  if (!animals && strength >= 10 && house.stratum !== 'poor') animals = Math.max(1, Math.round(strength / 34))
                  if (!trade && (house.stratum === 'equestrian' || house.stratum === 'senatorial' || house.agenda === 'wealth')) trade = 1
                  for (let i = 0; i < land; i++) {
                    if (house.stratum === 'senatorial' && strength > 90 && Math.random() < 0.22) add(this.pick(['primeFarmland', 'primeVinyard', 'primeOrchard']), 1)
                    else if ((house.stratum === 'equestrian' || house.stratum === 'civic') && Math.random() < 0.16) add(this.pick(['vinyard', 'orchard']), 1)
                    else add(this.pick(['farmland', 'vinyard', 'orchard']), 1)
                  }
                  for (let i = 0; i < animals; i++) {
                    add(this.pick(['chicken', 'duck', 'goat', 'sheep', 'pig', 'cattle', 'donkey', 'horse']), i % 3 === 0 ? 2 : 1)
                  }
                  for (let i = 0; i < trade; i++) {
                    if (house.stratum === 'senatorial' && strength > 115 && Math.random() < 0.18) add(this.pick(['insulae', 'latifundiumFood', 'latifundiumAnimal', 'latifundiumFish', 'latifundiumOil']), 1)
                    else if (house.stratum === 'senatorial') add(this.pick(['insulae', 'primeFarmland', 'primeVinyard', 'primeOrchard']), 1)
                    else if (house.stratum === 'equestrian' && Math.random() < 0.24) add('tradeships', 1)
                    else add(this.pick(['fishingBoat', 'tradeships']), 1)
                  }
                  return details
                },
        normalizeHousePropertyDetails(house) {
                  if (!house || !house.ai) {
                    return {}
                  }
                  let types = this.vanillaPropertyTypes()
                  // Cleaned in place, never replaced: callers keep this object across calls that
                  // normalise again (aiSellExcessProperty -> housePropertyMaxCount -> stewardship ->
                  // property class -> here). Swapping it made sales pay while the house kept the
                  // property, minting cash every turn, and made purchases vanish.
                  let details = house.ai.propertyDetails || this.seedHousePropertyDetails(house) || {}
                  Object.keys(details).forEach((key) => {
                    let count = types[key] ? Math.max(0, Math.round(parseFloat(details[key] || 0))) : 0
                    if (count) {
                      details[key] = count
                    } else {
                      delete details[key]
                    }
                  })
                  house.ai.propertyDetails = details
                  this.syncAggregateHouseProperty(house)
                  return details
                },
        syncAggregateHouseProperty(house) {
                  let details = (house && house.ai && house.ai.propertyDetails) || {}
                  let types = this.vanillaPropertyTypes()
                  let aggregate = { land: 0, animals: 0, trade: 0 }
                  Object.keys(details).forEach((key) => {
                    let def = types[key]
                    let count = Math.max(0, Math.round(parseFloat(details[key] || 0)))
                    if (!def || !count) return
                    if (def.group === 'land') aggregate.land += count
                    else if (def.group === 'animal') aggregate.animals += count
                    else if (def.group === 'boat' || def.group === 'estate') aggregate.trade += count
                  })
                  house.ai.property = aggregate
                  return aggregate
                },
        housePropertyValue(house) {
                  let details = this.normalizeHousePropertyDetails(house)
                  let types = this.vanillaPropertyTypes()
                  let total = 0
                  Object.keys(details).forEach((key) => {
                    total += Math.max(0, Math.round(parseFloat(details[key] || 0))) * ((types[key] && types[key].value) || 0)
                  })
                  return Math.round(total)
                },
        housePropertyClass(house) {
                  if (house && house.stratum === 'senatorial') return 7
                  let total = this.housePropertyValue(house) + Math.max(0, Math.round(parseFloat((house && house.ai && house.ai.cash) || 0)))
                  return total < 1100 ? 0 : total < 2500 ? 1 : total < 5000 ? 2 : total < 7500 ? 3 : total < 10000 ? 4 : total < 25000 ? 5 : 6
                },
        housePropertyClassProgress(house, usePreviousBand) {
                  let limits = [1100, 2500, 5000, 7500, 10000, 25000]
                  let propertyValue = this.housePropertyValue(house)
                  let cash = Math.max(0, Math.round(parseFloat((house && house.ai && house.ai.cash) || 0)))
                  let classIndex = this.housePropertyClass(house)
                  if (limits.length <= classIndex) return 1
                  let lower = !usePreviousBand && classIndex > 0 ? limits[classIndex - 1] : 0
                  let progress = (propertyValue + cash - lower) / (limits[classIndex] - lower)
                  return this.clamp(progress, 0, 1)
                },
        houseClassStewardshipFactor(house) {
                  return 1 + Math.max(0, this.housePropertyClass(house) + this.housePropertyClassProgress(house) - 1) / 2.25
                },
        houseHeadCharacter(house, state) {
                  let ids = (house && house.notableIds && house.notableIds.length ? house.notableIds : (house && house.memberIds) || [])
                  for (let i = 0; i < ids.length; i++) {
                    let character = state && state.characters && state.characters[ids[i]]
                    if (character && !character.isDead) return character
                  }
                  return false
                },
        houseCharacterStewardshipContribution(house, state, characterId) {
                  let character = state && state.characters && state.characters[characterId]
                  if (!character) return 0
                  let head = this.houseHeadCharacter(house, state)
                  let headId = head && (head.id || characterId)
                  let age = this.age(character, state)
                  let skills = character.skills || {}
                  let stewardship = parseFloat(skills.stewardship || 0)
                  if (this.sameCharacterId(headId, characterId) && age < 7) {
                    return stewardship / 9
                  }
                  if (character.isDead || character.hasMovedOut || character.hasMovedout || character.flagIsAway || (!this.sameCharacterId(headId, characterId) && age < 7)) {
                    return 0
                  }
                  let weight = 1 / 6
                  if (this.sameCharacterId(headId, characterId)) {
                    weight = 1
                  } else if (head && this.sameCharacterId(head.spouseId, characterId)) {
                    weight = 0.5
                  } else if (head && (head.childrenIds || []).map(String).indexOf(String(characterId)) >= 0) {
                    weight = 0.25
                  }
                  if (!character.job) weight *= 1.35
                  if (character.flagIsBusy) weight /= 4.5
                  return stewardship * weight * this.houseClassStewardshipFactor(house)
                },
        houseHouseholdStewardship(house, state) {
                  let total = 0
                  ;((house && house.memberIds) || []).forEach((characterId) => {
                    total += this.houseCharacterStewardshipContribution(house, state, characterId)
                  })
                  let caretakerId = house && house.ai && house.ai.caretakerCharacterId
                  let caretaker = caretakerId && state && state.characters && state.characters[caretakerId]
                  if (caretaker) {
                    let inHouse = ((house.memberIds || []).map(String).indexOf(String(caretakerId)) >= 0)
                    total += (parseFloat((caretaker.skills || {}).stewardship || 0) / 1.8) * (inHouse ? 0.5 : 1) * this.houseClassStewardshipFactor(house)
                  }
                  return Math.max(5, total)
                },
        housePropertyMaxCount(house, key, state) {
                  let types = this.vanillaPropertyTypes()
                  let groups = this.vanillaPropertyGroups()
                  let def = types[key] || {}
                  if (def.isCommercial && house && house.stratum === 'senatorial') return 0
                  let group = groups[def.group] ? def.group : ''
                  let baseMax = def.baseMax || (group === 'land' ? 0.45 : group === 'animal' ? 1.251 : group === 'boat' ? 0.126 : group === 'estate' ? 0.18 : 0)
                  return baseMax * this.houseHouseholdStewardship(house, state || daapi.getState()) || 0
                },
        housePropertyExcessLoss(house, key, state, extra) {
                  let types = this.vanillaPropertyTypes()
                  let details = this.normalizeHousePropertyDetails(house)
                  let count = Math.max(0, parseFloat(details[key] || 0)) + Math.max(0, parseFloat(extra || 0))
                  return 0.05 * ((types[key] || {}).revenue || 0) * (count - this.housePropertyMaxCount(house, key, state || daapi.getState())) || 0
                },
        houseModifierFactor(house, key, state) {
                  let modifiers = house && house.ai && house.ai.modifiers && house.ai.modifiers[key]
                  if (!modifiers || !modifiers.length) return 1
                  let kept = []
                  let factor = 1
                  ;(modifiers || []).forEach((modifier) => {
                    if (!modifier) return
                    if (modifier.until && this.monthKeyReached(modifier.until, state || daapi.getState())) return
                    kept.push(modifier)
                    factor *= parseFloat(modifier.factor || 1)
                  })
                  house.ai.modifiers[key] = kept
                  return factor || 0
                },
        houseAdditiveModifier(house, key, state) {
                  let modifiers = house && house.ai && house.ai.additiveModifiers && house.ai.additiveModifiers[key]
                  if (!modifiers || !modifiers.length) return 0
                  let kept = []
                  let total = 0
                  ;(modifiers || []).forEach((modifier) => {
                    if (!modifier) return
                    if (modifier.until && this.monthKeyReached(modifier.until, state || daapi.getState())) return
                    kept.push(modifier)
                    total += parseFloat(modifier.amount || 0)
                  })
                  house.ai.additiveModifiers[key] = kept
                  return total
                },
        houseEconomyOfScaleFactor(house, key, state) {
                  let details = this.normalizeHousePropertyDetails(house)
                  let types = this.vanillaPropertyTypes()
                  let def = types[key] || {}
                  let groupBase = def.group === 'land' ? 0.45 : def.group === 'animal' ? 1.251 : def.group === 'boat' ? 0.126 : def.group === 'estate' ? 0.18 : 0
                  let baseMax = def.baseMax || groupBase
                  if (!baseMax) return 1
                  let maxCount = this.housePropertyMaxCount(house, key, state || daapi.getState())
                  let count = Math.max(0, parseFloat(details[key] || 0))
                  let perStewardshipMax = baseMax
                  let ratio = count / 810 / perStewardshipMax
                  if (count <= maxCount) return 1 + ratio
                  if (count <= 1.26 * maxCount) return 1 + ratio / 1.5
                  if (count <= 1.53 * maxCount) return 1 + ratio / 2
                  if (count <= 2.17 * maxCount) return 1 + ratio / 5
                  if (count <= 2.53 * maxCount) return 1 + ratio / 15
                  return 1
                },
        houseUnemployedHouseholdersFactor(house, state) {
                  state = state || daapi.getState()
                  let factor = 1
                  let head = this.houseHeadCharacter(house, state)
                  let headId = head && head.id
                  ;((house && house.memberIds) || []).forEach((characterId) => {
                    let character = state && state.characters && state.characters[characterId]
                    if (!character || character.isDead || character.hasMovedOut || character.hasMovedout || character.flagIsBusy || character.flagIsAway || character.job || character.startedPregnancyTime) return
                    if (!this.sameCharacterId(headId, characterId) && this.age(character, state) < 7) return
                    factor += parseFloat((character.skills || {}).stewardship || 0) / 900
                  })
                  return factor
                },
        housePropertyModifierFactor(house, key, state) {
                  return this.houseModifierFactor(house, 'property_' + key, state) *
                    this.houseModifierFactor(house, 'revenue', state) *
                    this.houseEconomyOfScaleFactor(house, key, state) *
                    this.houseUnemployedHouseholdersFactor(house, state || daapi.getState())
                },
        housePropertyRevenueForKey(house, key, state) {
                  let details = this.normalizeHousePropertyDetails(house)
                  let types = this.vanillaPropertyTypes()
                  let def = types[key] || {}
                  let maxCount = this.housePropertyMaxCount(house, key, state || daapi.getState())
                  let count = Math.max(0, parseFloat(details[key] || 0))
                  let revenue = Math.min(count, maxCount) * (def.revenue || 0)
                  if (count > maxCount) {
                    revenue -= this.housePropertyExcessLoss(house, key, state)
                  }
                  revenue *= this.housePropertyModifierFactor(house, key, state || daapi.getState())
                  return revenue || 0
                },
        housePropertyRevenue(house, state) {
                  let details = this.normalizeHousePropertyDetails(house)
                  let total = 0
                  Object.keys(details).forEach((key) => {
                    total += this.housePropertyRevenueForKey(house, key, state || daapi.getState())
                  })
                  return total
                },
        housePropertySummary(house) {
                  let details = this.normalizeHousePropertyDetails(house)
                  let groups = this.vanillaPropertyGroups()
                  let groupTotals = {}
                  Object.keys(groups).forEach((group) => {
                    groupTotals[group] = groups[group].reduce((sum, key) => sum + Math.max(0, Math.round(parseFloat(details[key] || 0))), 0)
                  })
                  let chips = []
                  if (groupTotals.land) chips.push('land ' + groupTotals.land)
                  if (groupTotals.animal) chips.push('animals ' + groupTotals.animal)
                  if (groupTotals.boat) chips.push('boats ' + groupTotals.boat)
                  if (groupTotals.estate) chips.push('estates ' + groupTotals.estate)
                  return chips.length ? chips.join(', ') : 'none'
                },
        allowedHousePropertyKeys(house, state) {
                  let types = this.vanillaPropertyTypes()
                  state = state || daapi.getState()
                  return Object.keys(types).filter((key) => {
                    return this.housePropertyMaxCount(house, key, state) > 0
                  })
                },
        aiPropertyInvestmentChoice(house, options, state) {
                  let types = this.vanillaPropertyTypes()
                  let details = this.normalizeHousePropertyDetails(house)
                  let cash = Math.max(0, Math.floor(parseFloat((house.ai && house.ai.cash) || 0)))
                  state = state || daapi.getState()
                  let keys = this.allowedHousePropertyKeys(house, state)
                  let preferred = this.uniqueIds(((options && options.preferred) || []).filter((key) => types[key]))
                  if (preferred.length) {
                    keys = preferred.concat(keys.filter((key) => preferred.indexOf(key) < 0))
                  }
                  let candidates = keys.filter((key) => {
                    let def = types[key]
                    if (!def || def.value > cash) return false
                    let limit = Math.floor(this.housePropertyMaxCount(house, key, state))
                    return limit > Math.max(0, Math.floor(parseFloat(details[key] || 0)))
                  })
                  if (!candidates.length) return false
                  let preferredCandidates = candidates.filter((key) => preferred.indexOf(key) >= 0)
                  return this.pick(preferredCandidates.length ? preferredCandidates : candidates)
                },
        initHouseAI(house) {
                  if (!house.agenda) {
                    house.agenda = this.pick(['office', 'wealth', 'honor', 'marriage', 'security', 'revenge'])
                  }
                  if (house.wealth === undefined || house.wealth === null) {
                    house.wealth = Math.max(20, Math.round((house.strength || 10) * 18))
                  }
                  if (house.power === undefined || house.power === null) {
                    house.power = Math.max(5, Math.round((house.strength || 10) / 2))
                  }
                  if (house.stability === undefined || house.stability === null) {
                    house.stability = this.randomInt(35, 75)
                  }
                  if (!house.ai) {
                    house.ai = {
                      cash: Math.max(50, Math.round((house.wealth || 100) * 0.8)),
                      influence: Math.max(10, Math.round((house.power || 10) * 18)),
                      prestige: Math.max(0, Math.round(house.prestige || 0)),
                      property: {
                        land: Math.max(0, Math.round((house.strength || 10) / 18)),
                        animals: Math.max(0, Math.round((house.strength || 10) / 22)),
                        trade: house.stratum === 'equestrian' || house.agenda === 'wealth' ? 1 : 0
                      },
                      focus: house.agenda,
                      controlledBy: 'cor_society_ai'
                    }
                  }
                  house.ai.property = house.ai.property || {
                    land: Math.max(0, Math.round((house.strength || 10) / 18)),
                    animals: Math.max(0, Math.round((house.strength || 10) / 22)),
                    trade: house.stratum === 'equestrian' || house.agenda === 'wealth' ? 1 : 0
                  }
                  house.ai.focus = house.ai.focus || house.agenda
                  house.ai.controlledBy = 'cor_society_ai'
                  house.ai.modifiers = house.ai.modifiers || {}
                  house.ai.additiveModifiers = house.ai.additiveModifiers || {}
                  this.normalizeHousePropertyDetails(house)
                }
      })
      window.corSociety._mixinCorSocietyMonthlyEconomyVersion = '1.1.331'
    }
  }
}
