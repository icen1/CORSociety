{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyCoreStartup() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyCoreStartupVersion === '1.1.331') {
        return
      }
      Object.assign(window.corSociety, {
        ensure(options) {
                  let state = daapi.getState()
                  if (!state || !state.current) {
                    return this.createState()
                  }
                  let society = this.load()
                  if (this.runSocietyMigrations) {
                    this.runSocietyMigrations(society, state)
                  }
                  options = options || {}
                  let wardrobeRepairSchemaVersion = 'native-portrait-wardrobe-v2'
                  if (society.wardrobeRepairSchemaVersion !== wardrobeRepairSchemaVersion) {
                    this.repairUnsafeWardrobeLooks(state)
                    society.wardrobeRepairSchemaVersion = wardrobeRepairSchemaVersion
                    society.wardrobeRepairVersion = this.version
                  }
                  this.normalizeDynastyHouseModel(society, state)
                  this.syncPlayerHouseRecord(society, state)
                  this.repairDynastyHouseSystem(society, state)
                  this.maintainDynastyHouseSystem(society, state, { phase: 'ensure-start' })
                  let monthKey = this.monthKey(state)
                  let ensureKey = this.ensureKey(society, state)
                  let monthChanged = society.lastProcessedStatusMonth !== monthKey
                  let falseSlaveRepairKey = 'false-player-slave-v1'
                  let falseSlaveRepairNeeded = society.falsePlayerSlaveRepairVersion !== falseSlaveRepairKey
                  let playerHouseRepairKey = 'player-house-v2'
                  let playerHouseRepairNeeded = society.playerHouseRepairVersion !== playerHouseRepairKey
                  if (falseSlaveRepairNeeded) {
                    this.repairFalsePlayerSlaveFlags(society, state)
                  }
                  if (playerHouseRepairNeeded) {
                    this.repairFalsePlayerSlaveFlags(society, state)
                    this.syncPlayerHouseRecord(society, state)
                    society.playerHouseRepairVersion = playerHouseRepairKey
                  }
                  if (falseSlaveRepairNeeded) {
                    society.falsePlayerSlaveRepairVersion = falseSlaveRepairKey
                  }
                  if (!options || !options.force) {
                    if (society.lastEnsureKey === ensureKey) {
                      this.registerPlayerEntryActions(state)
                      this.registerSocietyTraitDefinitions()
                      if (monthChanged) {
                        this.repairFalsePlayerSlaveFlags(society, state)
                        this.syncPlayerHouseRecord(society, state)
                        this.maintainDynastyHouseSystem(society, state, { phase: 'status-month' })
                        this.syncExtendedKinVisibility(society, state)
                        this.ensureSlaveOrderPeople(society, state)
                        this.syncSocietyTraitsWithVanilla(society, state)
                        this.syncFamilyRelationStatuses(society, state)
                        this.syncSlaveStatuses(society, state)
                        if (this.syncCrimeStatuses) {
                          this.syncCrimeStatuses(society, state)
                        }
                        if (this.syncMilitaryStatuses) {
                          this.syncMilitaryStatuses(society, state)
                        }
                        society.lastProcessedStatusMonth = monthKey
                        this.save(society)
                      }
                      if (falseSlaveRepairNeeded || playerHouseRepairNeeded) {
                        this.save(society)
                      }
                      return society
                    }
                  }
                  this.registerSocietyTraitDefinitions()
                  this.registerPlayerEntryActions(state)
                  this.syncWithGame(society, state)
                  state = daapi.getState()
                  this.repairFalsePlayerSlaveFlags(society, state)
                  this.syncPlayerHouseRecord(society, state)
                  this.repairDynastyHouseSystem(society, state)
                  this.maintainDynastyHouseSystem(society, state, { phase: 'ensure-main' })
                  this.syncExtendedKinVisibility(society, state, { force: true })
                  this.ensureVisibleHouseMembers(society, state)
                  this.retireDeadHouses(society, state, { notify: false })
                  state = daapi.getState()
                  this.ensureMinimumHouses(society, state)
                  state = daapi.getState()
                  this.repairGeneratedHouseInitialGenderPairs(society, state)
                  state = daapi.getState()
                  this.repairFalsePlayerSlaveFlags(society, state)
                  this.syncPlayerHouseRecord(society, state)
                  this.ensureSlaveOrderPeople(society, state)
                  this.normalizeGeneratedPeople(society, state)
                  this.ensureGeneratedParents(society, state)
                  this.repairIncompleteGeneratedParentPairs(society, state)
                  if (this.repairFamilyLinkIntegrity) {
                    this.repairFamilyLinkIntegrity(society, state)
                    state = daapi.getState()
                  }
                  this.ensureGeneratedDynastyTrees(society, state)
                  this.ensureGeneratedLooks(society, state)
                  this.ensureCrests(society, state)
                  this.syncPlayerSocietyStatus(society, state)
                  this.preparePlayerDynastyTreeOnce(society, state)
                  this.syncSocietyTraitsWithVanilla(society, state)
                  this.syncFamilyRelationStatuses(society, state)
                  this.syncSlaveStatuses(society, state)
                  if (this.syncCrimeStatuses) {
                    this.syncCrimeStatuses(society, state)
                  }
                  if (this.syncMilitaryStatuses) {
                    this.syncMilitaryStatuses(society, state)
                  }
                  this.maintainDynastyHouseSystem(society, daapi.getState(), { force: true, phase: 'ensure-final', repairCadetBranches: true })
                  society.lastProcessedStatusMonth = monthKey
                  this.restoreSocietyPortraitLooks(state)
                  this.allowAchievementsWithSociety(state)
                  society.lastEnsureKey = this.ensureKey(society, state)
                  this.save(society)
                  return society
                },
        ensureKey(society, state) {
                  let societyDynastyCount = society && society.dynasties ? Object.keys(society.dynasties).length : 0
                  let houseCount = society && society.houses ? Object.keys(society.houses).length : 0
                  let socialCount = society && society.characterSocial ? Object.keys(society.characterSocial).length : 0
                  let romanceCount = society && society.romances ? Object.keys(society.romances).length : 0
                  let slaveCount = society && society.playerSlaves ? society.playerSlaves.length : 0
                  let pendingPaternityCount = society && society.pendingPaternities ? society.pendingPaternities.length : 0
                  let privateLoanCount = society && society.privateLoans ? society.privateLoans.length : 0
                  let deadHouseCount = society && society.deadHouseIds ? society.deadHouseIds.length : 0
                  let currentId = state && state.current ? state.current.id : 'none'
                  let currentClass = state && state.current ? (state.current.class || state.current.currentClass || '') : ''
                  let senatorial = state && state.current && (state.current.flagIsSenetorialClass || state.current.flagIsSenatorialClass) ? 'senate' : ''
                  return [
                    currentId,
                    currentClass,
                    senatorial,
                    societyDynastyCount,
                    houseCount,
                    socialCount,
                    romanceCount,
                    slaveCount,
                    pendingPaternityCount,
                    privateLoanCount,
                    deadHouseCount,
                    this.version
                  ].join(':')
                },
        syncExtendedKinVisibility(society, state, options) {
                  if (!society || !state || !state.current || !state.characters) {
                    return false
                  }
                  options = options || {}
                  let month = this.monthKey(state)
                  if (!options.force && society.extendedKinVisibilityMonth === month) {
                    return false
                  }
                  let current = state.current
                  current.formerHouseholdCharacterIds = current.formerHouseholdCharacterIds || []
                  let household = this.idSet(current.householdCharacterIds || [])
                  let played = this.idSet(current.playedCharacters || [])
                  let previousInjected = (society.extendedKinVisibilityIds || []).filter((id) => state.characters[id] && !household[id] && !played[id])
                  let previousMap = this.idSet(previousInjected)
                  let naturalFormer = []
                  let naturalSeen = {}
                  ;(current.formerHouseholdCharacterIds || []).forEach((id) => {
                    if (!id || !state.characters[id] || naturalSeen[id] || previousMap[id]) {
                      return
                    }
                    naturalSeen[id] = true
                    naturalFormer.push(id)
                  })
                  let depthLimit = this.extendedKinVisibilityDepth(society, state)
                  let limit = this.extendedKinVisibilityLimit(society, state)
                  let seeds = this.extendedKinSeedIds(state, naturalFormer)
                  let candidates = this.extendedKinCandidates(society, state, seeds, depthLimit)
                  let naturalMap = this.idSet(naturalFormer)
                  let target = []
                  let targetSeen = {}
                  candidates.forEach((entry) => {
                    let id = entry.id
                    let character = state.characters[id]
                    if (!character || character.isDead || character.corSocietyGhostParent || household[id] || played[id] || naturalMap[id] || targetSeen[id]) {
                      return
                    }
                    targetSeen[id] = true
                    target.push(id)
                  })
                  target = target.slice(0, limit)
                  current.formerHouseholdCharacterIds = this.uniqueIds(naturalFormer.concat(target))
                  // state.current is a getState() copy edited in place; keep the edit out of the shared snapshot.
                  this.invalidateStateSnapshot()
                  society.extendedKinVisibilityIds = target
                  society.extendedKinVisibilityMonth = month
                  society.extendedKinVisibility = {
                    month,
                    depth: depthLimit,
                    limit,
                    roots: seeds.length,
                    candidates: candidates.length,
                    injected: target.length
                  }
                  return true
                },
        extendedKinVisibilityDepth(society, state) {
                  let configured = parseInt(society && society.settings && society.settings.extendedKinDepth, 10)
                  if (configured) {
                    return this.clamp(configured, 4, 9)
                  }
                  let householdSize = state && state.current && state.current.householdCharacterIds ? state.current.householdCharacterIds.length : 0
                  return householdSize > 12 ? 6 : 7
                },
        extendedKinVisibilityLimit(society, state) {
                  let configured = parseInt(society && society.settings && society.settings.extendedKinLimit, 10)
                  if (configured) {
                    return this.clamp(configured, 80, 320)
                  }
                  let characterCount = state && state.characterIds ? state.characterIds.length : Object.keys((state && state.characters) || {}).length
                  if (characterCount > 900) return 150
                  if (characterCount > 600) return 190
                  return 240
                },
        extendedKinSeedIds(state, naturalFormer) {
                  let current = (state && state.current) || {}
                  let ids = []
                  let add = (id) => {
                    if (id && state.characters && state.characters[id] && ids.indexOf(id) < 0) {
                      ids.push(id)
                    }
                  }
                  ;(current.householdCharacterIds || []).forEach(add)
                  ;(naturalFormer || []).forEach(add)
                  ;(current.playedCharacters || []).forEach(add)
                  ;(current.specialCharacterIds || []).forEach(add)
                  add(this.currentCharacterId(state))
                  return ids.slice(0, 180)
                },
        extendedKinCandidates(society, state, seeds, depthLimit) {
                  let visited = {}
                  let queue = []
                  let results = []
                  ;(seeds || []).forEach((id) => {
                    if (id && state.characters && state.characters[id] && !visited[id]) {
                      visited[id] = true
                      queue.push({ id, depth: 0 })
                    }
                  })
                  let guardLimit = Math.max(260, this.extendedKinVisibilityLimit(society, state) * 3)
                  let inspected = 0
                  let queueIndex = 0
                  while (queueIndex < queue.length && inspected < guardLimit) {
                    let entry = queue[queueIndex]
                    queueIndex += 1
                    inspected += 1
                    let character = state.characters[entry.id]
                    if (!character) {
                      continue
                    }
                    if (entry.depth > 0) {
                      results.push({
                        id: entry.id,
                        depth: entry.depth,
                        score: this.extendedKinPriority(character, state, society, entry.depth)
                      })
                    }
                    if (entry.depth >= depthLimit) {
                      continue
                    }
                    this.extendedKinNeighbors(character, state).forEach((nextId) => {
                      if (!nextId || visited[nextId] || !state.characters[nextId]) {
                        return
                      }
                      visited[nextId] = true
                      queue.push({ id: nextId, depth: entry.depth + 1 })
                    })
                  }
                  return results.sort((a, b) => {
                    if (a.depth !== b.depth) return a.depth - b.depth
                    return b.score - a.score
                  })
                },
        extendedKinNeighbors(character, state) {
                  let ids = []
                  let add = (id) => {
                    if (id && state.characters && state.characters[id] && ids.indexOf(id) < 0) {
                      ids.push(id)
                    }
                  }
                  add(character.spouseId)
                  add(character.fatherId)
                  add(character.motherId)
                  ;(character.childrenIds || []).forEach(add)
                  return ids
                },
        extendedKinPriority(character, state, society, depth) {
                  let age = this.age(character, state)
                  let score = 80 - depth * 7
                  if (!character.isDead) score += 20
                  if (character.spouseId && state.characters[character.spouseId] && !state.characters[character.spouseId].isDead) score += 18
                  if (age >= 16 && age <= 42) score += 16
                  if (age < 16) score += 10
                  if (character.corSocietyGenerated || character.corSocietyHouseId) score += 8
                  if ((character.childrenIds || []).length) score += Math.min(18, (character.childrenIds || []).length * 3)
                  return score
                },
        idSet(ids) {
                  let set = {}
                  ;(ids || []).forEach((id) => {
                    if (id !== undefined && id !== null) set[id] = true
                  })
                  return set
                },
        uniqueIds(ids) {
                  let seen = {}
                  let result = []
                  ;(ids || []).forEach((id) => {
                    if (!id || seen[id]) return
                    seen[id] = true
                    result.push(id)
                  })
                  return result
                },
        sameCharacterId(first, second) {
                  return first !== undefined && first !== null && second !== undefined && second !== null && String(first) === String(second)
                },
        legacyGlobalActionKeys() {
                  return [
                    'cor_society',
                    'cor_society_player_crest',
                    'cor_society_wardrobe',
                    'cor_society_bank_of_rome',
                    'cor_society_household_slaves'
                  ]
                },
        cleanupLegacyGlobalActions() {
                  try {
                    if (!daapi.deleteGlobalAction) {
                      return
                    }
                    this.legacyGlobalActionKeys().forEach((key) => {
                      try {
                        daapi.deleteGlobalAction({ key })
                      } catch (err) {
                      }
                      try {
                        daapi.deleteGlobalAction(key)
                      } catch (err) {
                      }
                    })
                  } catch (err) {
                    console.warn(err)
                  }
                },
        registerCurrentCharacterAction(state, key, title, tooltip, icon, method, context) {
                  state = state || daapi.getState()
                  let characterId = state && state.current && state.current.id
                  if (!characterId) {
                    return false
                  }
                  daapi.addCharacterAction({
                    characterId,
                    key,
                    action: {
                      title,
                      tooltip,
                      icon,
                      isAvailable: true,
                      hideWhenBusy: false,
                      process: {
                        event: this.event,
                        method,
                        context: { characterId, ...(context || {}) }
                      }
                    }
                  })
                  return true
                },
        registerPlayerEntryActions(state) {
                  try {
                    state = state || daapi.getState()
                    let currentId = this.currentCharacterId(state)
                    let current = state && state.characters && state.characters[currentId]
                    let familyActionIds = this.playerFamilyActionMemberIds(state)
                    let key = [this.version, 'sheet-actions-v1', currentId || '', current && this.isSlaveCharacter(current) ? 'slave' : 'free', familyActionIds.length].join(':')
                    let now = Date.now ? Date.now() : 0
                    this._registeredEntryActionKey = key
                    this._registeredEntryActionAt = now || 1
                    if (!this._legacyGlobalActionsCleaned || (now && now - (this._legacyGlobalActionsCleanedAt || 0) > 60000)) {
                      this.cleanupLegacyGlobalActions()
                      this._legacyGlobalActionsCleaned = true
                      this._legacyGlobalActionsCleanedAt = now || 1
                    }
                    this.registerCurrentCharacterAction(state, 'cor_society', 'Roman Society', 'Opens the Society overview. Consequences: no stats change until you choose an action inside.', daapi.requireImage('/cor_society/icon.svg'), 'openHub')
                    this.registerCurrentCharacterAction(state, 'cor_society_player_crest', 'House Shield', 'Opens player house shield settings. Consequences: visual shield changes only; no stats change.', daapi.requireImage('/cor_society/shield.svg'), 'openPlayerCrest')
                    this.registerCurrentCharacterAction(state, 'cor_society_wardrobe', 'Family Wardrobe', 'Change Society portrait clothing for members of your household. Consequences: visual clothing changes only; no stats change.', daapi.requireImage('/cor_society/assets/wardrobe.svg'), 'openWardrobe')
                    this.registerCurrentCharacterAction(state, 'cor_society_bank_of_rome', 'Bank of Rome', 'Open Society banking. Consequences happen only when taking or repaying a loan.', this.bundledIcon('bank_of_rome', 'money'), 'openBankOfRome')
                    this.registerCurrentCharacterAction(state, 'cor_society_household_slaves', 'Household Slaves', 'Open Society household slave management. Slaves are real generated characters.', this.slaveTypeIcon('household'), 'openHouseholdSlaves')
                    this.unregisterPlayerDynastyTreeAction(state)
                    this.registerFamilyCharacterSheetActions(state, familyActionIds)
                    if (current && this.isSlaveCharacter(current)) {
                      this.registerCurrentCharacterAction(state, 'cor_society_slave_path', 'Path to Freedom', 'Open slave-focused Society actions for earning or negotiating freedom.', this.slaveTypeIcon(current.corSocietySlaveType || 'labor'), 'openPlayerSlavePath')
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                },
        playerFamilyActionMemberIds(state) {
                  state = state || daapi.getState()
                  let current = state.current || {}
                  let characters = state.characters || {}
                  let seen = {}
                  let ids = []
                  let add = (characterId) => {
                    if (characterId === undefined || characterId === null || characterId === '' || seen[characterId] || !characters[characterId]) {
                      return
                    }
                    seen[characterId] = true
                    ids.push(characterId)
                  }
                  add(this.currentCharacterId(state))
                  ;[
                    current.householdCharacterIds,
                    current.formerHouseholdCharacterIds,
                    current.deadHouseholdCharacterIds,
                    current.familyCharacterIds,
                    current.dependantCharacterIds,
                    current.dependentCharacterIds
                  ].forEach((list) => {
                    ;(list || []).forEach(add)
                  })
                  this.playerFamilyMemberIds(state).forEach(add)
                  return ids.slice(0, 180)
                },
        registerFamilyCharacterSheetActions(state, ids) {
                  try {
                    state = state || daapi.getState()
                    let icon = daapi.requireImage('/cor_society/assets/scroll.svg')
                    ;(ids || this.playerFamilyActionMemberIds(state)).forEach((characterId) => {
                      try {
                        let character = state.characters && state.characters[characterId]
                        if (!character) {
                          return
                        }
                        daapi.addCharacterAction({
                          characterId,
                          key: 'cor_society_character_sheet',
                          action: {
                            title: 'Society Sheet',
                            tooltip: 'Open this family member in Roman Society. Consequences: opens the Society character sheet; no stats change.',
                            icon,
                            isAvailable: true,
                            hideWhenBusy: false,
                            process: {
                              event: this.event,
                              method: 'openFamilyCharacterSheet',
                              context: { characterId }
                            }
                          }
                        })
                      } catch (err) {
                        console.warn('Roman Society character sheet action failed for ' + characterId, err)
                      }
                    })
                  } catch (err) {
                    console.warn(err)
                  }
                },
        unregisterPlayerDynastyTreeAction(state) {
                  try {
                    state = state || daapi.getState()
                    let characterId = state && state.current && state.current.id
                    if (!characterId || !daapi.deleteCharacterAction) {
                      return false
                    }
                    try {
                      daapi.deleteCharacterAction({ characterId, key: 'cor_society_player_tree' })
                    } catch (err) {
                      daapi.deleteCharacterAction(characterId, 'cor_society_player_tree')
                    }
                    return true
                  } catch (err) {
                    return false
                  }
                },
        registerBundledBankActions() {
                  try {
                    this.cleanupLegacyGlobalActions()
                    this.registerCurrentCharacterAction(daapi.getState(), 'cor_society_bank_of_rome', 'Bank of Rome', 'Open Society banking. Consequences happen only when taking or repaying a loan.', this.bundledIcon('bank_of_rome', 'money'), 'openBankOfRome')
                  } catch (err) {
                    console.warn(err)
                  }
                },
        registerBundledSlaveActions() {
                  try {
                    this.cleanupLegacyGlobalActions()
                    this.registerCurrentCharacterAction(daapi.getState(), 'cor_society_household_slaves', 'Household Slaves', 'Open Society household slave management. Slaves are real generated characters.', this.slaveTypeIcon('household'), 'openHouseholdSlaves')
                  } catch (err) {
                    console.warn(err)
                  }
                },
        registerBundledMatchmakerAction({ characterId } = {}) {
                  try {
                    let state = daapi.getState()
                    let character = state.characters && state.characters[characterId]
                    if (!character || !this.isPlayerFamilyCharacter(state, characterId) || !this.isMarriageEligible({ ...character, id: characterId }, state)) {
                      return
                    }
                    daapi.addCharacterAction({
                      characterId,
                      key: 'cor_society_coemptio_' + characterId,
                      action: {
                        title: 'Coemptio matchmaker',
                        tooltip: 'Search Society houses for a real spouse candidate. Consequences: no stats change until a candidate is chosen.',
                        icon: this.bundledIcon('coemptio', 'marriage'),
                        isAvailable: true,
                        hideWhenBusy: false,
                        process: {
                          event: this.event,
                          method: 'openMatchmaker',
                          context: { characterId }
                        }
                      }
                    })
                  } catch (err) {
                    console.warn(err)
                  }
                },
        showInstallNoticeOnce() {
                  let seen = false
                  try {
                    seen = !!daapi.getGlobalFlag({ flag: this.noticeFlag })
                  } catch (err) {
                    seen = false
                  }
                  if (seen) {
                    return
                  }
                  daapi.setGlobalFlag({ flag: this.noticeFlag, data: true })
                  this.pushModal({
                    title: 'Roman Society loaded',
                    message: 'Roman Society is active. It adds social orders, houses, virtual-player families, monthly family affairs, alliances, rivalries, patronage, trade, scandals, petitions, and political support.',
                    image: daapi.requireImage('/cor_society/icon.svg'),
                    options: [
                      {
                        variant: 'info',
                        text: 'Open Roman Society',
                        action: {
                          event: this.event,
                          method: 'openHub'
                        }
                      },
                      {
                        text: 'Later'
                      }
                    ]
                  })
                },
        createState() {
                  return {
                    version: this.version,
                    settings: {
                      enabled: true,
                      monthlyEvents: true,
                      autoGenerate: true
                    },
                    dynasties: {},
                    houses: {},
                    generatedHouseIds: [],
                    generatedCharacterIds: [],
                    pendingVentures: [],
                    crests: {},
                    crestSettings: {
                      playerOverlay: true
                    },
                    houseRelations: {},
                    characterSocial: {},
                    personalRelations: {},
                    romances: {},
                    pendingPaternities: [],
                    discoveredPaternities: {},
                    playerTreeGeneratedLivingIds: [],
                    extendedKinVisibilityIds: [],
                    extendedKinVisibilityMonth: '',
                    extendedKinVisibility: {},
                    relationStatusCharacterIds: [],
                    slaveStatusCharacterIds: [],
                    pendingSteals: {},
                    bank: {
                      principal: 0,
                      interestRate: 0.083,
                      loansTaken: 0,
                      lastPaymentYear: '',
                      lastNoticeYear: '',
                      lastClearedYear: ''
                    },
                    privateLoans: [],
                    deadHouses: {},
                    deadHouseIds: [],
                    playerSlaves: [],
                    slaveMarketOffers: [],
                    lastProcessedMonth: '',
                    log: []
                  }
                },
        load() {
                  let society = false
                  try {
                    society = daapi.getGlobalFlag({ flag: this.flag })
                  } catch (err) {
                    society = false
                  }
                  if (!society || typeof society !== 'object') {
                    society = this.createState()
                  }
                  society.version = this.version
                  society.settings = { enabled: true, monthlyEvents: true, autoGenerate: true, ...(society.settings || {}) }
                  society.dynasties = society.dynasties || {}
                  society.houses = society.houses || {}
                  society.generatedHouseIds = society.generatedHouseIds || []
                  society.generatedCharacterIds = society.generatedCharacterIds || []
                  society.pendingVentures = society.pendingVentures || []
                  society.crests = society.crests || {}
                  society.crestSettings = { playerOverlay: true, ...(society.crestSettings || {}) }
                  society.houseRelations = society.houseRelations || {}
                  society.characterSocial = society.characterSocial || {}
                  if (society.socialRecords && typeof society.socialRecords === 'object') {
                    Object.keys(society.socialRecords).forEach((characterId) => {
                      if (!society.characterSocial[characterId]) {
                        society.characterSocial[characterId] = society.socialRecords[characterId]
                      }
                    })
                    delete society.socialRecords
                  }
                  society.personalRelations = society.personalRelations || {}
                  society.romances = society.romances || {}
                  society.pendingPaternities = society.pendingPaternities || []
                  society.discoveredPaternities = society.discoveredPaternities || {}
                  society.playerTreeGeneratedLivingIds = society.playerTreeGeneratedLivingIds || []
                  society.extendedKinVisibilityIds = society.extendedKinVisibilityIds || []
                  society.extendedKinVisibilityMonth = society.extendedKinVisibilityMonth || ''
                  society.extendedKinVisibility = society.extendedKinVisibility || {}
                  society.relationStatusCharacterIds = society.relationStatusCharacterIds || []
                  society.slaveStatusCharacterIds = society.slaveStatusCharacterIds || []
                  society.pendingSteals = society.pendingSteals || {}
                  society.bank = {
                    principal: 0,
                    interestRate: 0.083,
                    loansTaken: 0,
                    lastPaymentYear: '',
                    lastNoticeYear: '',
                    lastClearedYear: '',
                    ...(society.bank || {})
                  }
                  society.privateLoans = society.privateLoans || []
                  society.deadHouses = society.deadHouses || {}
                  society.deadHouseIds = society.deadHouseIds || []
                  society.playerSlaves = society.playerSlaves || []
                  society.slaveMarketOffers = society.slaveMarketOffers || []
                  society.log = society.log || []
                  if (this.runSocietyMigrations) {
                    this.runSocietyMigrations(society, daapi.getState())
                  }
                  return society
                },
        save(society) {
                  this.compactBeforeSave(society)
                  daapi.setGlobalFlag({ flag: this.flag, data: society })
                },
        compactBeforeSave(society) {
                  if (!society || typeof society !== 'object') {
                    return society
                  }
                  let limit = this.logLimit || 240
                  if (society.log && society.log.length > limit) {
                    society.log = society.log.slice(0, limit)
                  }
                  if (society.pendingVentures && society.pendingVentures.length > 80) {
                    society.pendingVentures = society.pendingVentures.slice(-80)
                  }
                  if (society.privateLoans && society.privateLoans.length > 80) {
                    society.privateLoans = society.privateLoans.slice(-80)
                  }
                  if (society.deadHouseIds && society.deadHouseIds.length > 80) {
                    society.deadHouseIds = society.deadHouseIds.slice(0, 80)
                  }
                  if (society.deadHouses && society.deadHouseIds) {
                    let keepDeadHouses = {}
                    society.deadHouseIds.forEach((houseId) => {
                      if (society.deadHouses[houseId]) {
                        keepDeadHouses[houseId] = society.deadHouses[houseId]
                      }
                    })
                    society.deadHouses = keepDeadHouses
                  }
                  if (society.slaveMarketOffers && society.slaveMarketOffers.length > 80) {
                    society.slaveMarketOffers = society.slaveMarketOffers.slice(0, 80)
                  }
                  if (society.extendedKinVisibilityIds && society.extendedKinVisibilityIds.length > 320) {
                    society.extendedKinVisibilityIds = society.extendedKinVisibilityIds.slice(0, 320)
                  }
                  if (society.generatedCharacterIds && society.generatedCharacterIds.length > 420) {
                    society.generatedCharacterIds = society.generatedCharacterIds.slice(-420)
                  }
                  if (this.compactAdvancedState) {
                    this.compactAdvancedState(society)
                  }
                  delete society._relationStatusHashCache
                  delete society._slaveStatusHashCache
                  Object.keys(society.houses || {}).forEach((houseId) => {
                    let house = society.houses[houseId]
                    if (!house) return
                    if (house.notableIds && house.notableIds.length > 12) house.notableIds = house.notableIds.slice(0, 12)
                    if (house.notes && house.notes.length > 12) house.notes = house.notes.slice(-12)
                  })
                  return society
                }
      })
      window.corSociety._mixinCorSocietyCoreStartupVersion = '1.1.331'
    }
  }
}
