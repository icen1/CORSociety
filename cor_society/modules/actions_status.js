{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyActionsStatus() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyActionsStatusVersion === '1.1.331') {
        return
      }
      Object.assign(window.corSociety, {
        currentCharacterDynastyId(state) {
                  state = state || daapi.getState()
                  let current = state.characters && state.characters[this.currentCharacterId(state)]
                  return (current && current.dynastyId) || ((state.current || {}).dynastyId) || ''
                },
        isCurrentPlayerHouse(house, state) {
                  if (!house || !house.id) {
                    return false
                  }
                  state = state || daapi.getState()
                  let currentId = this.currentCharacterId(state)
                  let current = state.characters && state.characters[currentId]
                  let possibleIds = [
                    this.currentCharacterDynastyId(state),
                    current && current.corSocietyHouseId,
                    current && current.dynastyId,
                    (state.current || {}).dynastyId
                  ].filter(Boolean)
                  return possibleIds.some((id) => String(id) === String(house.id))
                },
        playerCloseFamilyIdMap(state) {
                  state = state || daapi.getState()
                  let characters = state.characters || {}
                  let current = state.current || {}
                  let currentId = this.currentCharacterId(state)
                  let player = characters[currentId] || {}
                  let seen = {}
                  let add = (id) => {
                    if (id !== undefined && id !== null && id !== '' && characters[id]) {
                      seen[String(id)] = true
                    }
                  }
                  let addRelatives = (character) => {
                    if (!character) return
                    add(character.id)
                    add(character.spouseId)
                    add(character.fatherId)
                    add(character.motherId)
                    ;(character.childrenIds || []).forEach(add)
                    ;(character.siblingIds || []).forEach(add)
                  }
                  add(currentId)
                  ;[
                    current.householdCharacterIds,
                    current.formerHouseholdCharacterIds,
                    current.familyCharacterIds
                  ].forEach((list) => {
                    ;(list || []).forEach(add)
                  })
                  player.id = player.id || currentId
                  addRelatives(player)
                  ;(player.childrenIds || []).forEach((childId) => {
                    let child = characters[childId]
                    if (!child) return
                    addRelatives(child)
                    ;(child.childrenIds || []).forEach(add)
                  })
                  let dynastyId = player.dynastyId || this.currentCharacterDynastyId(state)
                  if (dynastyId && state.dynasties && state.dynasties[dynastyId]) {
                    ;(state.dynasties[dynastyId].memberIds || []).forEach(add)
                  }
                  return seen
                },
        playerProtectedLineIdMap(state) {
                  // The player's own line: the player, their spouse, every descendant and each
                  // descendant's spouse. Siblings, cousins and their branches are not part of it.
                  state = state || daapi.getState()
                  let characters = state.characters || {}
                  let currentId = this.currentCharacterId(state)
                  let player = characters[currentId]
                  let map = {}
                  if (!player) {
                    return map
                  }
                  let add = (id) => {
                    if (id !== undefined && id !== null && id !== '' && characters[id]) {
                      map[String(id)] = true
                    }
                  }
                  add(currentId)
                  add(player.spouseId)
                  let visited = {}
                  let queue = (player.childrenIds || []).slice()
                  let guard = 0
                  while (queue.length && guard < 400) {
                    guard += 1
                    let id = queue.shift()
                    if (id === undefined || id === null || id === '' || visited[String(id)]) {
                      continue
                    }
                    visited[String(id)] = true
                    let character = characters[id]
                    if (!character) {
                      continue
                    }
                    add(id)
                    add(character.spouseId)
                    ;(character.childrenIds || []).forEach((childId) => queue.push(childId))
                  }
                  return map
                },
        playerKeptIdMap(state) {
                  // The people the player keeps out of NPC-run houses: the protected line (see
                  // playerProtectedLineIdMap) plus the player's ancestors and current household.
                  state = state || daapi.getState()
                  let characters = state.characters || {}
                  let map = this.playerProtectedLineIdMap(state)
                  let add = (id) => {
                    if (id !== undefined && id !== null && id !== '' && characters[id]) {
                      map[String(id)] = true
                    }
                  }
                  ;((state.current && state.current.householdCharacterIds) || []).forEach(add)
                  let player = characters[this.currentCharacterId(state)]
                  let queue = player ? [player.fatherId, player.motherId] : []
                  let guard = 0
                  while (queue.length && guard < 64) {
                    guard += 1
                    let id = queue.shift()
                    let ancestor = id !== undefined && id !== null && id !== '' ? characters[id] : null
                    if (!ancestor) {
                      continue
                    }
                    add(id)
                    queue.push(ancestor.fatherId, ancestor.motherId)
                  }
                  return map
                },
        isPlayerHouseRecord(house, state) {
                  // The Society house that mirrors the player's own dynasty (its id is the dynasty id).
                  if (!house || !house.id) {
                    return false
                  }
                  let playerHouseId = this.currentCharacterDynastyId(state || daapi.getState())
                  return !!(playerHouseId && String(house.id) === String(playerHouseId))
                },
        isPlayerFreeFamilyCharacter(state, characterId, character) {
                  state = state || daapi.getState()
                  characterId = characterId !== undefined && characterId !== null && characterId !== '' ? characterId : (character && character.id)
                  character = character || ((state.characters || {})[characterId])
                  if (!character || character.isDead || characterId === undefined || characterId === null || characterId === '') {
                    return false
                  }
                  let close = this.playerCloseFamilyIdMap(state)
                  if (close[String(characterId)]) {
                    return true
                  }
                  let currentDynastyId = this.currentCharacterDynastyId(state)
                  return !!(currentDynastyId && character.dynastyId && String(character.dynastyId) === String(currentDynastyId))
                },
        freedmanHouseForCharacter(society, state, record, character) {
                  state = state || daapi.getState()
                  let baseName = (record && record.name) || (character && this.characterName(character, state)) || 'Manumitted Freedman'
                  let nomen = this.pick(this.nomina)
                  let cognomen = this.pick(['Liberatus', 'Felix', 'Novus', 'Afer', 'Rufus', 'Varro', 'Crispus'])
                  let founderId = ''
                  let house = false
                  try {
                    founderId = daapi.generateCharacter({
                      characterFeatures: {
                        gender: 'male',
                        isMale: true,
                        praenomen: this.pick(this.maleNames),
                        birthMonth: this.randomInt(0, 11),
                        birthYear: state.year - this.randomInt(58, 78),
                        look: this.generatedVanillaLook(true, 'freedman-founder-' + this.safeId(baseName) + '-' + Date.now()),
                        job: 'labourer',
                        jobLevel: 0,
                        traits: ['content'],
                        skills: this.skillsForStratum('freedmen'),
                        corSocietyGenerated: true,
                        corSocietyFreedmanFounder: true,
                        flagDoNotCull: true
                      },
                      dynastyFeatures: {
                        nomen,
                        cognomen,
                        prestige: this.randomInt(450, 1200),
                        heritage: 'roman_freedman'
                      }
                    })
                    let founder = daapi.getCharacter({ characterId: founderId }) || {}
                    if (founder && founder.dynastyId) {
                      try {
                        daapi.kill({ characterId: founderId, deathCause: 'old age' })
                      } catch (killErr) {
                        daapi.updateCharacter({
                          characterId: founderId,
                          character: {
                            isDead: true,
                            deathYear: state.year,
                            deathMonth: state.month
                          }
                        })
                      }
                      house = society.houses[founder.dynastyId] || this.createHouseRecord(founder.dynastyId)
                      house.name = this.shortText(baseName, 30) + ' Free House'
                      house.stratum = 'freedmen'
                      house.generated = true
                      house.manumittedHouse = true
                      house.freedFromPlayerHouse = true
                      house.memberIds = []
                      house.notableIds = []
                      house.slaveIds = []
                      house.relation = this.clamp((house.relation || 0) + 10, -100, 100)
                      house.strength = Math.max(10, Math.round((house.strength || 0) + 12))
                      house.prestige = Math.max(500, Math.round(house.prestige || 0))
                      house.heritage = 'roman_freedman'
                      house.citizenRank = this.rankFromStrength(house.strength)
                      house.agenda = 'security'
                      society.houses[founder.dynastyId] = house
                      society.generatedHouseIds = society.generatedHouseIds || []
                      if (society.generatedHouseIds.indexOf(founder.dynastyId) < 0) society.generatedHouseIds.push(founder.dynastyId)
                      society.generatedCharacterIds = society.generatedCharacterIds || []
                      if (society.generatedCharacterIds.indexOf(founderId) < 0) society.generatedCharacterIds.push(founderId)
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                  if (!house) {
                    house = this.generateHouse(society, state, 'freedmen')
                  }
                  if (house) {
                    house.name = this.shortText(baseName, 30) + ' Free House'
                    house.agenda = 'security'
                    house.relation = this.clamp((house.relation || 0) + 10, -100, 100)
                    house.manumittedHouse = true
                    house.freedFromPlayerHouse = true
                  }
                  return house
                },
        playerSlaveRecordFromCharacter(record, character, state) {
                  character = character || {}
                  let characterId = record.characterId || character.id || ''
                  return {
                    key: record.key || ('slave_' + this.safeId(characterId || Date.now())),
                    characterId,
                    name: characterId && state && state.characters && state.characters[characterId] ? this.slaveDisplayName({ ...state.characters[characterId], id: characterId }, record, state) : (record.fullName || record.name || character.corSocietySlaveFullName || character.praenomen || 'Servus'),
                    fullName: record.fullName || character.corSocietySlaveFullName || '',
                    type: record.type || character.corSocietySlaveType || 'manager',
                    level: Math.max(1, Math.round(record.level || character.corSocietySlaveLevel || 1)),
                    age: record.age || (character.birthYear !== undefined && state ? this.age(character, state) : 20),
                    acquired: record.acquired || this.monthKey(state || daapi.getState()),
                    active: true,
                    originHouseId: record.originHouseId || character.corSocietyOriginHouseId || '',
                    previousOwnerHouseId: record.previousOwnerHouseId || character.corSocietyPreviousOwnerHouseId || '',
                    origin: record.origin || character.corSocietySlaveOrigin || this.randomSlaveOrigin(),
                    task: record.task || character.corSocietySlaveTask || record.type || character.corSocietySlaveType || 'labor',
                    savings: Math.max(0, parseFloat(record.savings || character.corSocietySlaveSavings || 0)),
                    nextTaskChangeMonth: record.nextTaskChangeMonth || character.corSocietySlaveNextTaskChangeMonth || '',
                    educationTargetId: record.educationTargetId || character.corSocietySlaveEducationTargetId || '',
                    nextCompanionMonth: record.nextCompanionMonth || character.corSocietySlaveNextCompanionMonth || ''
                  }
                },
        registerPlayerSlaveRecord(society, state, record, character) {
                  society = society || this.loadForAction()
                  state = state || daapi.getState()
                  let slaveRecord = this.playerSlaveRecordFromCharacter(record || {}, character || {}, state)
                  if (!slaveRecord || !slaveRecord.characterId) {
                    return false
                  }
                  society.playerSlaves = (society.playerSlaves || []).filter((slave) => !this.sameCharacterId(slave && slave.characterId, slaveRecord.characterId))
                  society.playerSlaves.push(slaveRecord)
                  let playerHouseId = this.currentCharacterDynastyId(state)
                  let playerHouse = playerHouseId && society.houses && society.houses[playerHouseId]
                  if (playerHouse) {
                    playerHouse.slaveIds = playerHouse.slaveIds || []
                    playerHouse.knownMemberIds = playerHouse.knownMemberIds || []
                    if (!playerHouse.slaveIds.some((id) => this.sameCharacterId(id, slaveRecord.characterId))) {
                      playerHouse.slaveIds.push(slaveRecord.characterId)
                    }
                    if (!playerHouse.knownMemberIds.some((id) => this.sameCharacterId(id, slaveRecord.characterId))) {
                      playerHouse.knownMemberIds.push(slaveRecord.characterId)
                    }
                  }
                  this.syncOwnedSlavesIntoHousehold(society, daapi.getState())
                  return slaveRecord
                },
        syncOwnedSlavesIntoHousehold(society, state) {
                  // The vanilla household list is rebuilt from spouse/children links only, so a
                  // purchased slave (no blood or marriage link) never shows in the player household.
                  // Inject owned, living slaves into the live household list and drop the ones we
                  // injected earlier that are no longer owned (sold, freed, dead).
                  if (!society || !state || !state.current || !state.characters) {
                    return 0
                  }
                  let current = state.current
                  current.householdCharacterIds = current.householdCharacterIds || []
                  let owned = {}
                  ;(society.playerSlaves || []).forEach((record) => {
                    let id = record && record.active !== false && record.characterId
                    let character = id && state.characters[id]
                    if (character && !character.isDead && !character.hasMovedOut && character.corSocietySlave !== false) {
                      owned[String(id)] = true
                    }
                  })
                  let changed = 0
                  Object.keys(owned).forEach((id) => {
                    if (current.householdCharacterIds.map(String).indexOf(id) < 0) {
                      current.householdCharacterIds.push(state.characters[id].id || id)
                      changed += 1
                    }
                  })
                  let injected = (society.householdSlaveInjectedIds || []).filter((id) => {
                    if (owned[String(id)]) return true
                    let index = current.householdCharacterIds.map(String).indexOf(String(id))
                    if (index >= 0) {
                      current.householdCharacterIds.splice(index, 1)
                      changed += 1
                    }
                    return false
                  })
                  Object.keys(owned).forEach((id) => {
                    if (injected.map(String).indexOf(id) < 0) injected.push(id)
                  })
                  society.householdSlaveInjectedIds = injected
                  // state.current is a getState() copy edited in place; keep the edit out of the shared snapshot.
                  this.invalidateStateSnapshot()
                  return changed
                },
        enslavedPurchaseInfo(society, state, house, character) {
                  if (!character) return { visible: false, available: false }
                  let month = this.monthKey(state || daapi.getState())
                  if (character._enslavedInfoCache && character._scoreCache && character._scoreCache.month === month) {
                    return character._enslavedInfoCache
                  }
                  let currentDynastyId = this.currentCharacterDynastyId(state)
                  let type = this.slaveTypeFromCharacter(character)
                  let visible = !!(character && (this.isSlaveCharacter(character, house) || (house && house.stratum === 'poor' && (!currentDynastyId || String(character.dynastyId || '') !== String(currentDynastyId)))))
                  let cost = this.enslavedCharacterCost(society, state, house, character)
                  let cash = this.cashBeforeClick(state)
                  let reason = ''
                  if (!visible) reason = 'not enslaved'
                  else if (character.isDead) reason = 'dead'
                  else if (currentDynastyId && String(character.dynastyId || '') === String(currentDynastyId)) reason = 'already household'
                  else if (this.age(character, state) < 5) reason = 'too young'
                  else if (cash < cost) reason = 'need ' + cost + ' cash'
                  let result = {
                    visible,
                    available: visible && !reason,
                    reason,
                    cost,
                    type,
                    tooltip: [
                      'Negotiates purchase of ' + this.slaveDisplayName(character, null, state) + '.',
                      'Origin: ' + this.slaveOriginDescription(character.corSocietySlaveOrigin || 'unknown') + '.',
                      'Current house: ' + ((house && house.name) || 'unknown') + '.',
                      'Cost: ' + cost + '.',
                      reason ? 'Unavailable: ' + reason + '.' : 'On purchase, this real character becomes a household slave in your dynasty; origin data is preserved for navigation.'
                    ].join('\n')
                  }
                  character._enslavedInfoCache = result
                  return result
                },
        slaveTypeFromCharacter(character) {
                  if (!character) return 'manager'
                  if (character.corSocietySlaveType) return character.corSocietySlaveType
                  let job = String(character.job || '').toLowerCase()
                  let skills = character.skills || {}
                  if (job.indexOf('physician') >= 0 || job.indexOf('doctor') >= 0) return parseFloat(skills.intelligence || 0) >= 14 ? 'doctor' : 'nurse'
                  if (job.indexOf('rhetor') >= 0 || job.indexOf('teacher') >= 0) return parseFloat(skills.intelligence || 0) >= 14 ? 'tutor' : 'educator'
                  if (job.indexOf('trader') >= 0 || job.indexOf('merchant') >= 0) return parseFloat(skills.stewardship || 0) >= 14 ? 'accountant' : 'steward'
                  if (job.indexOf('soldier') >= 0 || parseFloat(skills.combat || 0) >= 16) return parseFloat(skills.combat || 0) >= 20 ? 'gladiator' : 'warrior'
                  if (parseFloat(skills.combat || 0) >= 13) return 'bodyguard'
                  if (parseFloat(skills.eloquence || 0) >= 16) return 'musician'
                  if (parseFloat(skills.eloquence || 0) >= 13) return 'entertainer'
                  if (parseFloat(skills.stewardship || 0) >= 15) return 'scribe'
                  if (job.indexOf('labour') >= 0 || job.indexOf('labor') >= 0) return 'labor'
                  return 'manager'
                },
        enslavedCharacterCost(society, state, house, character) {
                  if (!character) return 100
                  let month = this.monthKey(state || daapi.getState())
                  if (character._enslavedCostCache && character._scoreCache && character._scoreCache.month === month) {
                    return character._enslavedCostCache
                  }
                  let level = Math.max(1, Math.round(parseFloat((character && character.corSocietySlaveLevel) || 1) + this.characterScore(character || {}, state) / 22))
                  let base = this.slaveCost({ type: this.slaveTypeFromCharacter(character), level })
                  let relationPenalty = house ? Math.max(0, Math.round((house.relation || 0) * -1.5)) : 0
                  let value = Math.max(60, Math.round(base + relationPenalty))
                  character._enslavedCostCache = value
                  return value
                },
        buyEnslavedCharacter({ houseId, characterId, cost, returnTo, returnPage } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  let character = state.characters && state.characters[characterId]
                  if (!house || !character) {
                    this.refundVanillaStatChanges()
                    this.openSlaveMarket()
                    return
                  }
                  character.id = character.id || characterId
                  let info = this.enslavedPurchaseInfo(society, state, house, character)
                  cost = Math.max(1, Math.round(parseFloat(cost || info.cost)))
                  if (!info.available || this.cashBeforeClick(state) < cost) {
                    this.refundVanillaStatChanges()
                    this.pushModal({
                      societyMenu: true,
                      title: 'Purchase unavailable',
                      message: info.tooltip,
                      image: this.characterPortrait(character, state, house),
                      options: [
                        { text: 'Back', action: { event: this.event, method: 'openPerson', context: { houseId, characterId, returnTo, returnPage } } }
                      ]
                    })
                    return
                  }
                  let playerDynastyId = this.currentCharacterDynastyId(state)
                  let previousOwnerHouseId = character.corSocietySlaveOwnerHouseId || house.id
                  this.applyStats({ cash: -cost })
                  if (society.houses[previousOwnerHouseId]) {
                    let owner = society.houses[previousOwnerHouseId]
                    owner.ai = owner.ai || {}
                    owner.ai.cash = Math.max(0, Math.round(parseFloat(owner.ai.cash || 0) + cost))
                    owner.relation = this.clamp((owner.relation || 0) + 3, -100, 100)
                    owner.slaveIds = (owner.slaveIds || []).filter((id) => !this.sameCharacterId(id, characterId))
                  }
                  let type = info.type
                  let level = Math.max(1, Math.round(character.corSocietySlaveLevel || this.characterScore(character, state) / 22 || 1))
                  let task = character.corSocietySlaveTask || type || 'labor'
                  let savings = Math.max(0, parseFloat(character.corSocietySlaveSavings || 0))
                  try {
                    daapi.updateCharacter({
                      characterId,
                      character: {
                        dynastyId: playerDynastyId || character.dynastyId,
                        corSocietySlave: true,
                        corSocietySlaveActive: true,
                        corSocietySlaveType: type,
                        corSocietySlaveLevel: level,
                        corSocietySlaveOwnerHouseId: playerDynastyId || '',
                        corSocietySlaveOrigin: character.corSocietySlaveOrigin || this.randomSlaveOrigin(),
                        corSocietySlaveTask: task,
                        corSocietySlaveSavings: savings,
                        corSocietyOrigin: 'enslaved_dependant',
                        corSocietyOriginHouseId: character.corSocietyOriginHouseId || house.id,
                        corSocietyPreviousOwnerHouseId: previousOwnerHouseId,
                        flagCannotMarry: true,
                        flagDoNotCull: true
                      }
                    })
                    daapi.forceUpdateCharacterDisplay({ characterId })
                  } catch (err) {
                    console.warn(err)
                  }
                  state = daapi.getState()
                  let updated = (state.characters && state.characters[characterId]) || character
                  let record = this.registerPlayerSlaveRecord(society, state, {
                    key: 'slave_' + this.safeId(characterId),
                    characterId,
                    type,
                    level,
                    age: this.age(updated, state),
                    originHouseId: character.corSocietyOriginHouseId || house.id,
                    previousOwnerHouseId,
                    origin: character.corSocietySlaveOrigin || updated.corSocietySlaveOrigin || this.randomSlaveOrigin(),
                    task,
                    savings
                  }, updated)
                  this.refreshHouseMemberLists(society, state, house)
                  if (society.houses[previousOwnerHouseId] && previousOwnerHouseId !== house.id) {
                    this.refreshHouseMemberLists(society, state, society.houses[previousOwnerHouseId])
                  }
                  this.log(society, 'You purchase ' + record.name + ' from ' + house.name + ' for ' + cost + ' cash.', 'slaves', house.id)
                  this.save(society)
                  this.openManageSlave({ slaveKey: record.key, characterId })
                },
        captureEnslavedCharacter({ houseId, characterId, cost } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  let character = state.characters && state.characters[characterId]
                  if (!house || !character) {
                    this.refundVanillaStatChanges()
                    this.openHub()
                    return
                  }
                  character.id = character.id || characterId
                  let info = this.enslavedPurchaseInfo(society, state, house, character)
                  cost = Math.max(1, Math.round(parseFloat(cost || Math.max(35, info.cost * 0.45))))
                  if (!info.visible || this.cashBeforeClick(state) < cost) {
                    this.refundVanillaStatChanges()
                    this.pushModal({
                      societyMenu: true,
                      title: 'Capture unavailable',
                      message: info.visible ? 'You lack the cash to fund this capture.' : 'This person is no longer capturable.',
                      image: this.characterPortrait(character, state, house),
                      options: [{ text: 'Back', action: { event: this.event, method: 'openHub' } }]
                    })
                    return
                  }
                  let playerDynastyId = this.currentCharacterDynastyId(state)
                  let type = info.type
                  let level = Math.max(1, Math.round(character.corSocietySlaveLevel || this.characterScore(character, state) / 24 || 1))
                  let task = character.corSocietySlaveTask || type || 'labor'
                  let savings = Math.max(0, parseFloat(character.corSocietySlaveSavings || 0))
                  this.applyStats({ cash: -cost, influence: -10 })
                  house.relation = this.clamp((house.relation || 0) - 22, -100, 100)
                  house.heat = (house.heat || 0) + 2
                  house.memberIds = (house.memberIds || []).filter((id) => !this.sameCharacterId(id, characterId))
                  house.notableIds = (house.notableIds || []).filter((id) => !this.sameCharacterId(id, characterId))
                  try {
                    daapi.updateCharacter({
                      characterId,
                      character: {
                        dynastyId: playerDynastyId || character.dynastyId,
                        corSocietySlave: true,
                        corSocietySlaveActive: true,
                        corSocietySlaveMarket: false,
                        corSocietySlaveType: type,
                        corSocietySlaveLevel: level,
                        corSocietySlaveOwnerHouseId: playerDynastyId || '',
                        corSocietySlaveOrigin: character.corSocietySlaveOrigin || this.randomSlaveOrigin(),
                        corSocietySlaveTask: task,
                        corSocietySlaveSavings: savings,
                        corSocietyOriginHouseId: character.corSocietyOriginHouseId || house.id,
                        corSocietyPreviousOwnerHouseId: house.id,
                        flagCannotMarry: true,
                        flagDoNotCull: true
                      }
                    })
                    daapi.forceUpdateCharacterDisplay({ characterId })
                  } catch (err) {
                    console.warn(err)
                  }
                  state = daapi.getState()
                  let updated = (state.characters && state.characters[characterId]) || character
                  let record = this.registerPlayerSlaveRecord(society, state, {
                    key: 'slave_' + this.safeId(characterId),
                    characterId,
                    type,
                    level,
                    age: this.age(updated, state),
                    originHouseId: character.corSocietyOriginHouseId || house.id,
                    previousOwnerHouseId: house.id,
                    origin: character.corSocietySlaveOrigin || updated.corSocietySlaveOrigin || this.randomSlaveOrigin(),
                    task,
                    savings
                  }, updated)
                  this.refreshHouseMemberLists(society, state, house)
                  this.log(society, 'You capture ' + record.name + ' from ' + house.name + '; relations with that slave kin group worsen.', 'slaves', house.id)
                  this.save(society)
                  this.openManageSlave({ slaveKey: record.key, characterId })
                },
        matchmakerCandidates(society, state, character) {
                  let candidates = []
                  let playerStratum = this.playerStratum(state)
                  let playerHouseId = this.currentCharacterDynastyId(state)
                  this.sortedHouses(society).forEach((house) => {
                    if (!house || house.stratum === 'poor') return
                    if (String(house.id) === String(playerHouseId || '')) return
                    if (!house || Math.abs(this.socialLevel(house.stratum) - this.socialLevel(playerStratum)) > 2) return
                    if ((house.relation || 0) < -65) return
                    this.visibleHousePeople(house, state).forEach((characterId) => {
                      let candidate = state.characters && state.characters[characterId]
                      if (!candidate) return
                      candidate.id = candidate.id || characterId
                      if (this.isSlaveCharacter(candidate, house) || !this.isMarriageEligible(candidate, state) || !this.isMarriageCompatible(character, candidate, state)) return
                      candidates.push({ house, character: candidate })
                    })
                  })
                  return candidates.sort((a, b) => this.characterScore(b.character, state) - this.characterScore(a.character, state))
                },
        ensureMatchmakerCandidates(society, state, character) {
                  let candidates = this.matchmakerCandidates(society, state, character)
                  let playerHouseId = this.currentCharacterDynastyId(state)
                  let houses = this.sortedHouses(society).filter((house) => {
                    return house && house.stratum !== 'poor' && String(house.id) !== String(character.dynastyId || '') && String(house.id) !== String(playerHouseId || '') && Math.abs(this.socialLevel(house.stratum) - this.socialLevel(this.playerStratum(state))) <= 2
                  })
                  while (candidates.length < 4 && houses.length && this.livingGeneratedCount(society, state) < 420) {
                    let house = this.pick(houses)
                    let id = this.generateMarriageProspect(society, state, house, character)
                    state = daapi.getState()
                    let generated = state.characters && state.characters[id]
                    if (generated) {
                      generated.id = id
                      candidates.push({ house, character: generated })
                    } else {
                      break
                    }
                  }
                  return candidates
                },
        matchmakerCandidateCost(candidate, house, state) {
                  let score = this.characterScore(candidate, state)
                  let level = this.socialLevel((house && house.stratum) || 'plebeian')
                  let relationDiscount = Math.max(-40, Math.min(40, (house && house.relation) || 0))
                  return Math.max(80, Math.round(80 + score * 5 + level * 70 - relationDiscount))
                },
        matchmakerCandidateDescription(candidate, house, state) {
                  let skills = candidate.skills || {}
                  let traits = (candidate.traits || []).slice(0, 4).join(', ') || 'no notable vanilla traits'
                  return [
                    this.characterName(candidate, state) + ' of ' + house.name,
                    'Age ' + this.formatAge(candidate, state) + '; ' + (candidate.job || 'no job') + '.',
                    'Skills: Int ' + Math.round(skills.intelligence || 0) + ', Stw ' + Math.round(skills.stewardship || 0) + ', Elo ' + Math.round(skills.eloquence || 0) + ', Cmb ' + Math.round(skills.combat || 0) + '.',
                    'Traits: ' + traits + '.'
                  ].join('\n')
                },
        openMatchmaker({ characterId } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  characterId = characterId || this.currentCharacterId(state)
                  let character = state.characters && state.characters[characterId]
                  if (!character) {
                    this.openHub()
                    return
                  }
                  character.id = character.id || characterId
                  if (!this.isPlayerFamilyCharacter(state, characterId) || !this.isMarriageEligible(character, state)) {
                    this.pushModal({
                      societyMenu: true,
                      title: 'Coemptio unavailable',
                      message: 'Only unmarried adult members of your household can use the Society matchmaker.',
                      image: this.bundledIcon('coemptio', 'marriage'),
                      options: [{ text: 'Back' }]
                    })
                    return
                  }
                  let candidates = this.ensureMatchmakerCandidates(society, state, character).slice(0, 8)
                  this.save(society)
                  let cash = parseFloat(((state || {}).current || {}).cash || 0)
                  let options = candidates.map((item) => {
                    let cost = this.matchmakerCandidateCost(item.character, item.house, state)
                    return {
                      text: this.characterName(item.character, state) + ' (' + cost + ')',
                      disabled: cash < cost,
                      showDisabledWithTooltip: true,
                      tooltip: this.matchmakerCandidateDescription(item.character, item.house, state),
                      statChanges: { cash: -cost },
                      icons: [this.characterPortrait(item.character, state, item.house), this.houseCrestIcon(society, item.house)],
                      action: {
                        event: this.event,
                        method: 'acceptMatchmakerCandidate',
                        context: { characterId, spouseId: item.character.id, houseId: item.house.id, cost }
                      }
                    }
                  })
                  options.push({
                    text: 'Back',
                    action: {
                      event: this.event,
                      method: 'declineMatchmakerCandidates',
                      context: { characterId }
                    }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Coemptio matchmaker',
                    message: 'The matchmaker presents real Society candidates. Those not chosen remain in their houses.',
                    image: this.bundledIcon('coemptio', 'marriage'),
                    options
                  })
                },
        acceptMatchmakerCandidate({ characterId, spouseId, houseId, cost } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let character = state.characters && state.characters[characterId]
                  let spouse = state.characters && state.characters[spouseId]
                  let house = society.houses[houseId] || (spouse && spouse.dynastyId && society.houses[spouse.dynastyId])
                  if (!character || !spouse || !house) {
                    this.refundVanillaStatChanges()
                    this.openMatchmaker({ characterId })
                    return
                  }
                  character.id = character.id || characterId
                  spouse.id = spouse.id || spouseId
                  cost = Math.max(0, Math.round(parseFloat(cost || this.matchmakerCandidateCost(spouse, house, state))))
                  if (house.stratum === 'poor' || this.isSlaveCharacter(spouse, house) || !this.isMarriageEligible(character, state) || !this.isMarriageEligible(spouse, state) || !this.isMarriageCompatible(character, spouse, state) || this.cashBeforeClick(state) < cost) {
                    this.refundVanillaStatChanges()
                    this.pushModal({
                      societyMenu: true,
                      title: 'Match no longer valid',
                      message: 'The chosen candidate is no longer available, too closely related, or the fee cannot be paid.',
                      image: this.bundledIcon('coemptio', 'marriage'),
                      options: [{ text: 'Back', action: { event: this.event, method: 'openMatchmaker', context: { characterId } } }]
                    })
                    return
                  }
                  this.applyStats({ cash: -cost })
                  try {
                    daapi.performMarriage({ characterId, spouseId, isMatrilineal: !this.characterIsMale(character) })
                    daapi.forceUpdateCharacterDisplay({ characterId })
                    daapi.forceUpdateCharacterDisplay({ characterId: spouseId })
                  } catch (err) {
                    console.warn(err)
                    this.pushModal({
                      societyMenu: true,
                      title: 'Marriage failed',
                      message: 'The vanilla marriage API rejected this Coemptio match: ' + err.name + ': ' + err.message,
                      image: this.bundledIcon('coemptio', 'marriage'),
                      options: [{ text: 'Back', action: { event: this.event, method: 'openMatchmaker', context: { characterId } } }]
                    })
                    return
                  }
                  house.relation = this.clamp((house.relation || 0) + 10, -100, 100)
                  house.favor = (house.favor || 0) + (Math.random() < 0.25 ? 1 : 0)
                  house.lastFamilyEvent = 'Coemptio marriage with your household.'
                  this.changePersonalRelation(society, characterId, spouseId, 38, 'friend')
                  state = daapi.getState()
                  this.refreshHouseMemberLists(society, state, house)
                  this.log(society, 'Coemptio arranges a marriage between ' + this.characterName(character, state) + ' and ' + this.characterName(spouse, state) + ' of ' + house.name + '.', 'marriage', house.id)
                  this.save(society)
                  this.pushModal({
                    title: 'Coemptio marriage arranged',
                    message: this.characterName(spouse, state) + ' is now married to ' + this.characterName(character, state) + '. The candidate remains a real character and should appear through vanilla family links after refresh.',
                    image: this.characterPortrait(spouse, state, house),
                    options: [
                      { text: 'Back to Society', action: { event: this.event, method: 'openHub' } }
                    ]
                  })
                },
        declineMatchmakerCandidates({ characterId } = {}) {
                  let state = daapi.getState()
                  if (characterId && this.isPlayerFamilyCharacter(state, characterId)) {
                    this.openHub()
                    return
                  }
                  this.openHub()
                },
        patronageOption(house) {
                  if (['plebeian', 'freedmen', 'poor'].indexOf(house.stratum) >= 0) {
                    return {
                      text: 'Offer patronage',
                      tooltip: 'Costs monthly revenue for a year, but builds loyalty and favor among lower orders.',
                      icons: [this.affairIcon('patronage')],
                      action: {
                        event: this.event,
                        method: 'offerPatronage',
                        context: { houseId: house.id }
                      }
                    }
                  }
                  return {
                    text: 'Seek patronage',
                    disabled: (house.relation || 0) < 20,
                    showDisabledWithTooltip: true,
                    tooltip: 'Powerful houses may lend standing when relations are good.',
                    icons: [this.affairIcon('patronage')],
                    action: {
                      event: this.event,
                      method: 'seekPatronage',
                      context: { houseId: house.id }
                    }
                  }
                },
        sendGift({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    let cost = this.actionCost(house, 'gift')
                    this.applyStats({ cash: -cost })
                    house.relation = this.clamp((house.relation || 0) + this.randomInt(8, 16), -100, 100)
                    if (Math.random() < 0.25) {
                      house.favor = (house.favor || 0) + 1
                    }
                    house.lastInteraction = this.monthKey(daapi.getState())
                    this.log(society, 'Gift sent to ' + house.name + ': relation ' + this.signed(house.relation) + '.')
                  })
                  this.openHouse({ houseId })
                },
        hostDinner({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    let cost = this.actionCost(house, 'dinner')
                    this.applyStats({ cash: -cost, prestige: 12 })
                    house.relation = this.clamp((house.relation || 0) + this.randomInt(10, 20), -100, 100)
                    house.heat = Math.max(0, (house.heat || 0) - 1)
                    this.log(society, 'Dinner hosted for ' + house.name + ': prestige rises, relation ' + this.signed(house.relation) + '.')
                  })
                  this.openHouse({ houseId })
                },
        askSupport({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    let profile = this.strata[house.stratum] || this.strata.plebeian
                    let amount = Math.max(20, Math.round((profile.support || 50) + (house.strength || 0) * 2))
                    this.applyStats({ influence: amount })
                    if ((house.favor || 0) > 0) {
                      house.favor -= 1
                      house.relation = this.clamp((house.relation || 0) - 4, -100, 100)
                    } else {
                      house.relation = this.clamp((house.relation || 0) - 16, -100, 100)
                    }
                    house.heat = (house.heat || 0) + 1
                    this.log(society, house.name + ' backs you publicly: +' + amount + ' influence.')
                  })
                  this.openHouse({ houseId })
                },
        callFamilyCouncil({ houseId }) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let house = society.houses && society.houses[houseId]
                  if (!house || !this.isCurrentPlayerHouse(house, state)) {
                    this.refundVanillaStatChanges()
                    this.openHouse({ houseId })
                    return
                  }
                  if (house.nextFamilyCouncilMonth && !this.monthKeyReached(house.nextFamilyCouncilMonth, state)) {
                    this.refundVanillaStatChanges()
                    this.openHouse({ houseId })
                    return
                  }
                  let currentId = this.currentCharacterId(state)
                  this.applyStats({ influence: 12, prestige: 6 })
                  house.stability = this.clamp((house.stability || 50) + 5, 0, 100)
                  house.nextFamilyCouncilMonth = this.futureMonthKey(6)
                  ;(this.playerFamilyMemberIds(state) || []).slice(0, 24).forEach((characterId) => {
                    if (currentId && !this.sameCharacterId(currentId, characterId)) {
                      this.changePersonalRelation(society, currentId, characterId, 4, 'family')
                    }
                  })
                  house.lastFamilyEvent = 'Your household holds a family council.'
                  house.lastFamilyKind = 'familyTree'
                  this.log(society, 'Your household holds a family council: influence, prestige, stability, and close-family relations improve.', 'familyTree', house.id)
                  this.save(society)
                  this.openHouse({ houseId })
                },
        holdHouseholdRites({ houseId, cost } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let house = society.houses && society.houses[houseId]
                  if (!house || !this.isCurrentPlayerHouse(house, state)) {
                    this.refundVanillaStatChanges()
                    this.openHouse({ houseId })
                    return
                  }
                  cost = Math.max(20, Math.round(parseFloat(cost || this.actionCost(house, 'dinner') * 0.45)))
                  let cash = this.cashBeforeClick(state)
                  if ((house.nextHouseholdRitesMonth && !this.monthKeyReached(house.nextHouseholdRitesMonth, state)) || cash < cost) {
                    this.refundVanillaStatChanges()
                    this.openHouse({ houseId })
                    return
                  }
                  this.applyStats({ cash: -cost, prestige: 12, influence: 4 })
                  house.stability = this.clamp((house.stability || 50) + 6, 0, 100)
                  house.heat = Math.max(0, (house.heat || 0) - 2)
                  house.nextHouseholdRitesMonth = this.futureMonthKey(8)
                  house.lastFamilyEvent = 'Your household sponsors domestic rites and hospitality.'
                  house.lastFamilyKind = 'prestige'
                  this.log(society, 'Your household sponsors rites: prestige and influence rise, while internal heat cools.', 'prestige', house.id)
                  this.save(society)
                  this.openHouse({ houseId })
                },
        tradeDeal({ houseId }) {
                  let handled = false
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    if (this.houseTradeActive(house, state)) {
                      handled = true
                      this.pushModal({
                        title: 'Trade already active',
                        message: house.name + ' already has a trade compact with your household until ' + house.tradeUntil + '. It cannot be stacked.',
                        image: this.affairIcon('tradeVenture'),
                        options: [
                          {
                            text: 'Back',
                            action: {
                              event: this.event,
                              method: 'openHouse',
                              context: { houseId }
                            }
                          }
                        ]
                      })
                      return
                    }
                    let profile = this.strata[house.stratum] || this.strata.plebeian
                    let traitBonus = this.houseTradeTraitBonus(society, state, house)
                    let amount = Math.max(8, Math.round((profile.revenue || 20) + (house.strength || 0) / 3 + traitBonus))
                    daapi.addAdditiveModifier({
                      key: 'revenue',
                      id: 'cor_society_trade_' + this.safeId(house.id),
                      durationInMonths: 12,
                      amount
                    })
                    house.tradeUntil = this.futureMonthKey(12)
                    house.tradeAmount = amount
                    house.relation = this.clamp((house.relation || 0) + 5, -100, 100)
                    this.log(society, 'Trade deal with ' + house.name + ' over goods moving through ' + (this.romanPlace ? this.romanPlace('landmark') : 'the city') + ': +' + amount + ' monthly revenue for one year.', 'tradeVenture', house.id)
                  })
                  if (!handled) {
                    this.openHouse({ houseId })
                  }
                },
        houseTradeActive(house, state) {
                  return !!(house && house.tradeUntil && !this.monthKeyReached(house.tradeUntil, state || daapi.getState()))
                },
        houseTradeTraitBonus(society, state, house) {
                  let bonus = 0
                  this.visibleHousePeople(house, state).forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character) return
                    if (this.characterHasTrait(society, character, 'greedy') || this.characterHasTrait(society, character, 'ambitious')) bonus += 1
                    if (this.characterHasTrait(society, character, 'charitable') || this.characterHasTrait(society, character, 'honorable')) bonus += 1
                    if (this.characterHasTrait(society, character, 'liar') || this.characterHasTrait(society, character, 'manipulator')) bonus -= 1
                  })
                  return this.clamp(bonus, -4, 8)
                },
        resolveTradeCompacts(society, state) {
                  let broken = []
                  this.sortedHouses(society).forEach((house) => {
                    if (!house || !house.tradeUntil) {
                      return
                    }
                    let active = this.houseTradeActive(house, state)
                    if (!active) {
                      house.tradeUntil = ''
                      house.tradeAmount = 0
                      return
                    }
                    if ((house.relation || 0) <= -25 || house.rivalry) {
                      try {
                        daapi.removeAdditiveModifier({ key: 'revenue', id: 'cor_society_trade_' + this.safeId(house.id) })
                      } catch (err) {
                        console.warn(err)
                      }
                      house.tradeUntil = ''
                      house.tradeAmount = 0
                      broken.push(house)
                      this.log(society, 'Trade compact with ' + house.name + ' breaks after relations collapse.', 'tradeVenture', house.id)
                    }
                  })
                  if (broken.length) {
                    this.pushModal({
                      corTranslatorPretranslateNow: true,
                      title: 'Trade compact broken',
                      message: broken.map((house) => house.name + ' ended trade after relations fell too low.').join('\n'),
                      image: this.affairIcon('tradeVenture'),
                      options: [
                        {
                          text: 'Noted'
                        }
                      ]
                    })
                  }
                },
        fundTradeSafeguards({ houseId, cost, amount } = {}) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    cost = Math.max(1, Math.round(parseFloat(cost || this.actionCost(house, 'gift'))))
                    amount = Math.max(1, Math.round(parseFloat(amount || Math.max(2, (house.tradeAmount || 8) * 0.35))))
                    this.applyStats({ cash: -cost, prestige: 3 })
                    try {
                      daapi.addAdditiveModifier({
                        key: 'revenue',
                        id: 'cor_society_trade_guard_' + this.safeId(house.id),
                        durationInMonths: 4,
                        amount
                      })
                    } catch (err) {
                      console.warn(err)
                    }
                    house.relation = this.clamp((house.relation || 0) + 8, -100, 100)
                    house.stability = this.clamp((house.stability || 50) + 4, 0, 100)
                    house.lastFamilyEvent = 'Trade safeguards funded by your household.'
                    house.lastFamilyKind = 'tradeVenture'
                    this.log(society, 'You fund safeguards for trade with ' + house.name + ': +' + amount + ' revenue for a short term.', 'tradeVenture', house.id)
                    result = { title: 'Trade secured', message: 'Safeguards are funded. The compact is steadier and short-term revenue improves.', image: this.affairIcon('tradeVenture') }
                  })
                  this.pushModal({ title: result ? result.title : 'Trade review', message: result ? result.message : 'The trade review could not be resolved.', image: result ? result.image : this.affairIcon('tradeVenture'), options: [{ text: 'Continue' }] })
                },
        pressTradeTerms({ houseId, cost, amount } = {}) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    cost = Math.max(1, Math.round(parseFloat(cost || 12)))
                    amount = Math.max(1, Math.round(parseFloat(amount || Math.max(2, (house.tradeAmount || 8) * 0.35))))
                    this.applyStats({ influence: -cost })
                    let success = Math.random() < this.clamp(0.48 + (house.relation || 0) / 240 + ((house.favor || 0) * 0.06), 0.15, 0.82)
                    if (success) {
                      try {
                        daapi.addAdditiveModifier({
                          key: 'revenue',
                          id: 'cor_society_trade_terms_' + this.safeId(house.id),
                          durationInMonths: 4,
                          amount
                        })
                      } catch (err) {
                        console.warn(err)
                      }
                      house.tradeAmount = Math.max(0, Math.round(parseFloat(house.tradeAmount || 0) + amount))
                      house.relation = this.clamp((house.relation || 0) - 3, -100, 100)
                      house.lastFamilyEvent = 'Pressed into better trade terms.'
                      this.log(society, 'You press ' + house.name + ' for better trade terms: +' + amount + ' short-term revenue.', 'tradeVenture', house.id)
                      result = { title: 'Terms improved', message: house.name + ' accepts sharper terms. Revenue improves for a short term, but they notice the pressure.', image: this.affairIcon('tradeVenture') }
                    } else {
                      house.relation = this.clamp((house.relation || 0) - 14, -100, 100)
                      house.heat = (house.heat || 0) + 1
                      house.lastFamilyEvent = 'Rejected your pressure for better trade terms.'
                      this.log(society, house.name + ' refuses your pressure over trade terms.', 'tradeVenture', house.id)
                      result = { title: 'Terms refused', message: house.name + ' resents the pressure. The compact survives, but relations suffer.', image: this.affairIcon('rivalry') }
                    }
                  })
                  this.pushModal({ title: result ? result.title : 'Trade review', message: result ? result.message : 'The trade review could not be resolved.', image: result ? result.image : this.affairIcon('tradeVenture'), options: [{ text: 'Continue' }] })
                },
        letStandTradeReview({ houseId } = {}) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    house.lastFamilyEvent = 'Trade compact continues unchanged.'
                    this.log(society, 'Trade compact with ' + house.name + ' continues unchanged.', 'tradeVenture', house.id)
                    result = { title: 'Terms unchanged', message: house.name + ' keeps the trade compact as it stands.', image: this.affairIcon('tradeVenture') }
                  })
                  this.pushModal({ title: result ? result.title : 'Trade review', message: result ? result.message : 'The trade compact continues unchanged.', image: result ? result.image : this.affairIcon('tradeVenture'), options: [{ text: 'Continue' }] })
                },
        offerPatronage({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    let stipend = Math.max(8, Math.round((this.strata[house.stratum].revenue || 20) / 2))
                    daapi.addAdditiveModifier({
                      key: 'revenue',
                      id: 'cor_society_patronage_' + this.safeId(house.id),
                      durationInMonths: 12,
                      amount: -stipend
                    })
                    house.patronageUntil = this.futureMonthKey(12)
                    house.relation = this.clamp((house.relation || 0) + 22, -100, 100)
                    house.favor = (house.favor || 0) + 1
                    this.applyStats({ prestige: 8 })
                    this.log(society, 'You take ' + house.name + ' under patronage. They owe you a favor.')
                  })
                  this.openHouse({ houseId })
                },
        seekPatronage({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    let amount = Math.max(60, Math.round((house.strength || 20) * 3))
                    this.applyStats({ influence: amount, prestige: -5 })
                    house.favor = Math.max(0, (house.favor || 0) - 1)
                    house.relation = this.clamp((house.relation || 0) - 8, -100, 100)
                    this.log(society, house.name + ' lends you standing: +' + amount + ' influence.')
                  })
                  this.openHouse({ houseId })
                },
        coverPatronageShortage({ houseId, cost } = {}) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    cost = Math.max(1, Math.round(parseFloat(cost || Math.max(5, this.actionCost(house, 'gift') * 0.7))))
                    this.applyStats({ cash: -cost, prestige: 3 })
                    house.relation = this.clamp((house.relation || 0) + 10, -100, 100)
                    house.stability = this.clamp((house.stability || 50) + 5, 0, 100)
                    house.favor = (house.favor || 0) + (Math.random() < 0.35 ? 1 : 0)
                    house.lastFamilyEvent = 'Patronage shortages covered.'
                    house.lastFamilyKind = 'patronage'
                    this.log(society, 'You cover patronage shortages for ' + house.name + '.', 'patronage', house.id)
                    result = { title: 'Patronage steadied', message: house.name + ' remains loyal under your support. Stability and relation improve.', image: this.affairIcon('patronage') }
                  })
                  this.pushModal({ title: result ? result.title : 'Patronage', message: result ? result.message : 'The patronage action could not be resolved.', image: result ? result.image : this.affairIcon('patronage'), options: [{ text: 'Continue' }] })
                },
        auditPatronageAccounts({ houseId, cost } = {}) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    cost = Math.max(1, Math.round(parseFloat(cost || 10)))
                    this.applyStats({ influence: -cost })
                    let success = Math.random() < this.clamp(0.55 + (house.relation || 0) / 260, 0.18, 0.85)
                    if (success) {
                      house.stability = this.clamp((house.stability || 50) + 9, 0, 100)
                      house.relation = this.clamp((house.relation || 0) + 3, -100, 100)
                      house.lastFamilyEvent = 'Patronage accounts audited cleanly.'
                      this.log(society, 'You audit patronage accounts for ' + house.name + ' and restore order.', 'patronage', house.id)
                      result = { title: 'Accounts ordered', message: 'The audit exposes waste without a public quarrel. The house becomes more stable.', image: this.affairIcon('log') }
                    } else {
                      house.relation = this.clamp((house.relation || 0) - 12, -100, 100)
                      house.heat = (house.heat || 0) + 1
                      house.lastFamilyEvent = 'Patronage audit causes resentment.'
                      this.log(society, 'A patronage audit offends ' + house.name + '.', 'patronage', house.id)
                      result = { title: 'Audit resented', message: house.name + ' takes the audit as an insult. Relations suffer.', image: this.affairIcon('rivalry') }
                    }
                  })
                  this.pushModal({ title: result ? result.title : 'Patronage', message: result ? result.message : 'The patronage action could not be resolved.', image: result ? result.image : this.affairIcon('patronage'), options: [{ text: 'Continue' }] })
                },
        endPatronage({ houseId } = {}) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    try {
                      daapi.removeAdditiveModifier({ key: 'revenue', id: 'cor_society_patronage_' + this.safeId(house.id) })
                    } catch (err) {
                      console.warn(err)
                    }
                    house.patronageUntil = ''
                    house.relation = this.clamp((house.relation || 0) - 10, -100, 100)
                    house.lastFamilyEvent = 'Patronage ended by your household.'
                    this.applyStats({ prestige: -3 })
                    this.log(society, 'You end patronage over ' + house.name + '.', 'patronage', house.id)
                    result = { title: 'Patronage ended', message: 'The patronage tie is cancelled. The house resents the withdrawal, but the modifier is removed.', image: this.affairIcon('patronage') }
                  })
                  this.pushModal({ title: result ? result.title : 'Patronage', message: result ? result.message : 'The patronage action could not be resolved.', image: result ? result.image : this.affairIcon('patronage'), options: [{ text: 'Continue' }] })
                },
        improveChildSkill(characterId, skill, amount) {
                  let state = daapi.getState()
                  let character = state.characters && state.characters[characterId]
                  if (!character || !skill) {
                    return false
                  }
                  let skills = { ...(character.skills || {}) }
                  skills[skill] = parseFloat(skills[skill] || 0) + parseFloat(amount || 1)
                  try {
                    daapi.updateCharacter({ characterId, character: { skills } })
                    character.skills = skills
                    daapi.forceUpdateCharacterDisplay({ characterId })
                  } catch (err) {
                    console.warn(err)
                  }
                  return { character, skill, amount }
                },
        sponsorTutorship({ houseId, characterId, skill, cost } = {}) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    cost = Math.max(1, Math.round(parseFloat(cost || Math.max(6, this.actionCost(house, 'gift') * 0.6))))
                    this.applyStats({ cash: -cost, prestige: 2 })
                    let gain = this.randomInt(2, 4)
                    let improved = this.improveChildSkill(characterId, skill || 'intelligence', gain)
                    house.relation = this.clamp((house.relation || 0) + 6, -100, 100)
                    house.lastFamilyEvent = 'Tutorship offered to your household.'
                    this.log(society, house.name + ' provides tutorship for a child of your household.', 'education', house.id)
                    result = {
                      title: 'Lessons sponsored',
                      message: improved ? this.characterName(improved.character, daapi.getState()) + ' gains +' + gain + ' ' + improved.skill + ' from Society tutorship.' : 'Tutorship was funded, but the child could not be updated.',
                      image: improved ? this.characterPortrait(improved.character, daapi.getState(), house) : this.affairIcon('prestige')
                    }
                  })
                  this.pushModal({ title: result ? result.title : 'Tutorship', message: result ? result.message : 'The tutorship action could not be resolved.', image: result ? result.image : this.affairIcon('prestige'), options: [{ text: 'Continue' }] })
                },
        requestTutorshipFavor({ houseId, characterId, skill, cost } = {}) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    cost = Math.max(1, Math.round(parseFloat(cost || 8)))
                    this.applyStats({ influence: -cost })
                    let gain = this.randomInt(1, 2)
                    let improved = this.improveChildSkill(characterId, skill || 'intelligence', gain)
                    house.relation = this.clamp((house.relation || 0) + 3, -100, 100)
                    if (Math.random() < 0.25) {
                      house.favor = (house.favor || 0) + 1
                    }
                    house.lastFamilyEvent = 'A tutorship favor was exchanged.'
                    this.log(society, house.name + ' grants a tutorship favor to your household.', 'education', house.id)
                    result = {
                      title: 'Favor granted',
                      message: improved ? this.characterName(improved.character, daapi.getState()) + ' gains +' + gain + ' ' + improved.skill + '. The relationship remains useful.' : 'The favor was granted, but the child could not be updated.',
                      image: improved ? this.characterPortrait(improved.character, daapi.getState(), house) : this.affairIcon('support')
                    }
                  })
                  this.pushModal({ title: result ? result.title : 'Tutorship', message: result ? result.message : 'The tutorship action could not be resolved.', image: result ? result.image : this.affairIcon('support'), options: [{ text: 'Continue' }] })
                },
        declineTutorshipExchange({ houseId } = {}) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    house.lastFamilyEvent = 'Tutorship offer declined.'
                    this.log(society, 'You decline a tutorship offer from ' + house.name + '.', 'education', house.id)
                    result = { title: 'Tutorship declined', message: 'The offer from ' + house.name + ' passes without offense.', image: this.affairIcon('prestige') }
                  })
                  this.pushModal({ title: result ? result.title : 'Tutorship declined', message: result ? result.message : 'The offer passes.', image: result ? result.image : this.affairIcon('prestige'), options: [{ text: 'Continue' }] })
                },
        startRivalry({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    house.rivalry = true
                    house.relation = Math.min(house.relation || 0, -65)
                    house.heat = 3
                    this.applyStats({ prestige: 10, influence: 25 })
                    this.log(society, 'Open rivalry declared against ' + house.name + '.')
                  })
                  this.openHouse({ houseId })
                },
        reconcile({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    let cost = this.actionCost(house, 'reconcile')
                    this.applyStats({ cash: -cost, influence: -20 })
                    house.relation = this.clamp((house.relation || 0) + 38, -100, 100)
                    if (house.relation > -25) {
                      house.rivalry = false
                    }
                    house.heat = 0
                    this.log(society, 'Reconciliation attempted with ' + house.name + ': relation ' + this.signed(house.relation) + '.')
                  })
                  this.openHouse({ houseId })
                },
        praisePerson({ houseId, characterId }) {
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let character = state.characters[characterId]
                    if (this.sameCharacterId(this.currentCharacterId(state), characterId)) {
                      return
                    }
                    let praiseSocial = this.characterSocialRecord(society, characterId, true)
                    if (praiseSocial.nextPraiseMonth && !this.monthKeyReached(praiseSocial.nextPraiseMonth, state)) {
                      return
                    }
                    praiseSocial.nextPraiseMonth = this.futureMonthKey(4)
                    house.relation = this.clamp((house.relation || 0) + 6, -100, 100)
                    this.changePersonalRelation(society, this.currentCharacterId(state), characterId, 8, 'admirer')
                    this.applyStats({ prestige: 3 })
                    this.log(society, 'You praise ' + (character ? character.praenomen : 'a notable') + ' of ' + house.name + ' in public.')
                  })
                  this.openPerson({ houseId, characterId })
                },
        supportKinshipCharacter({ houseId, characterId, visitKind } = {}) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let currentId = this.currentCharacterId(state)
                    let character = state.characters && state.characters[characterId]
                    if (!character || this.sameCharacterId(currentId, characterId)) {
                      return
                    }
                    character.id = character.id || characterId
                    let kinship = this.societyKinshipContext ? this.societyKinshipContext(society, state, house, character) : { kind: visitKind || 'family', label: 'Family' }
                    let kind = visitKind || kinship.kind || 'family'
                    let social = this.characterSocialRecord(society, characterId, true)
                    if (social.nextSupportMonth && !this.monthKeyReached(social.nextSupportMonth, state)) {
                      return
                    }
                    social.nextSupportMonth = this.futureMonthKey(3)
                    let relationGain = kind === 'spouse' ? 12 : kind === 'family' ? 9 : kind === 'house' ? 7 : 5
                    let houseGain = kind === 'spouse' ? 1 : kind === 'family' ? 2 : kind === 'house' ? 5 : 4
                    social.introduced = true
                    social.bond = this.clamp((social.bond || 0) + relationGain, -100, 100)
                    house.relation = this.clamp((house.relation || 0) + houseGain, -100, 100)
                    this.changePersonalRelation(society, currentId, characterId, relationGain, kind === 'spouse' ? 'bestFriend' : kind === 'family' ? 'friend' : 'admirer')
                    if (kind === 'spouse' || kind === 'family') {
                      this.applyStats({ prestige: 1 })
                    } else {
                      this.applyStats({ influence: 4 })
                    }
                    let title = kind === 'spouse' ? 'Spouse supported' : kind === 'family' ? 'Family supported' : kind === 'house' ? 'House ties reinforced' : 'Dynasty ties reinforced'
                    let message = this.characterName(character, state) + ' receives direct support. Personal relation improves, and the relevant house ties strengthen modestly.'
                    house.lastFamilyEvent = title + '.'
                    house.lastFamilyKind = 'support'
                    this.log(society, title + ': ' + this.characterName(character, state) + '.', 'support', house.id)
                    result = { title, message, image: this.characterPortrait(character, state, house) }
                  })
                  if (result) {
                    this.pushModal({
                      societyMenu: true,
                      title: result.title,
                      message: result.message,
                      image: result.image,
                      options: [{ text: 'Back', action: { event: this.event, method: 'openPerson', context: { houseId, characterId } } }]
                    })
                  } else {
                    this.openPerson({ houseId, characterId })
                  }
                },
        requestIntroduction({ houseId, characterId }) {
                  let alreadyIntroduced = false
                  let kinshipKind = ''
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let character = state.characters && state.characters[characterId]
                    if (character) character.id = character.id || characterId
                    let kinship = this.societyKinshipContext ? this.societyKinshipContext(society, state, house, character) : { kind: 'outsider' }
                    if (kinship.kind && kinship.kind !== 'outsider') {
                      kinshipKind = kinship.kind
                      return
                    }
                    let social = this.characterSocialRecord(society, characterId, true)
                    if (social.introduced) {
                      alreadyIntroduced = true
                      return
                    }
                    social.introduced = true
                    social.introductionMonth = this.monthKey(daapi.getState())
                    social.nextInviteMonth = this.futureMonthKey(2)
                    social.bond = this.clamp((social.bond || 0) + this.randomInt(8, 16), -100, 100)
                    house.relation = this.clamp((house.relation || 0) - 3, -100, 100)
                    house.favor = (house.favor || 0) + (Math.random() < 0.45 ? 1 : 0)
                    this.changePersonalRelation(society, this.currentCharacterId(daapi.getState()), characterId, this.randomInt(6, 12), 'admirer')
                    this.applyStats({ influence: 35 })
                    this.log(society, house.name + ' introduces you to useful contacts.')
                  })
                  if (kinshipKind) {
                    this.inviteHomeTalk({ houseId, characterId, visitKind: kinshipKind })
                  } else if (alreadyIntroduced) {
                    this.inviteHomeTalk({ houseId, characterId })
                  } else {
                    this.openPerson({ houseId, characterId })
                  }
                },
        inviteHomeTalk({ houseId, characterId, visitKind } = {}) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let character = state.characters[characterId]
                    if (!character) {
                      return
                    }
                    character.id = character.id || characterId
                    let social = this.characterSocialRecord(society, characterId, true)
                    let kinship = this.societyKinshipContext ? this.societyKinshipContext(society, state, house, character) : { kind: 'outsider' }
                    visitKind = visitKind || (kinship.kind && kinship.kind !== 'outsider' ? kinship.kind : '')
                    if (!social.introduced) {
                      social.introduced = true
                      social.introductionMonth = this.monthKey(state)
                    }
                    if (social.nextInviteMonth && !this.monthKeyReached(social.nextInviteMonth, state)) {
                      result = {
                        title: 'Visit unavailable',
                        message: this.characterName(character, state) + ' recently visited. Try again after ' + social.nextInviteMonth + '.',
                        image: this.characterPortrait(character, state, house)
                      }
                      return
                    }
                    let familyVisit = ['spouse', 'family', 'house', 'dynasty'].indexOf(visitKind) >= 0
                    let rapport = familyVisit ? this.randomInt(5, 14) : this.randomInt(4, 12)
                    let relation = visitKind === 'spouse' || visitKind === 'family' ? this.randomInt(0, 3) : visitKind === 'house' ? this.randomInt(3, 8) : visitKind === 'dynasty' ? this.randomInt(2, 6) : this.randomInt(2, 8)
                    let gossip = familyVisit ? false : Math.random() < 0.08 + Math.max(0, (house.heat || 0)) * 0.015
                    social.bond = this.clamp((social.bond || 0) + rapport, -100, 100)
                    social.lastVisitMonth = this.monthKey(state)
                    social.nextInviteMonth = this.futureMonthKey(familyVisit ? 3 : 4)
                    house.relation = this.clamp((house.relation || 0) + relation, -100, 100)
                    let currentId = this.currentCharacterId(state)
                    let player = state.characters[currentId] || state.current || {}
                    let personalType = this.visitRelationshipType(society, state, player, character, social)
                    this.changePersonalRelation(society, currentId, characterId, rapport, personalType)
                    if (gossip) {
                      house.heat = (house.heat || 0) + 1
                      house.relation = this.clamp((house.relation || 0) - 4, -100, 100)
                      result = {
                        title: 'Household gossip',
                        message: this.characterName(character, state) + ' accepts your hospitality, but servants talk. Rapport improves, though the house becomes warmer with gossip.',
                        image: this.affairIcon('romance')
                      }
                      this.log(society, 'A private visit with ' + this.characterName(character, state) + ' creates gossip around ' + house.name + '.', 'romance', house.id)
                    } else {
                      let title = 'Private conversation'
                      let message = this.characterName(character, state) + ' spends an evening in conversation. Rapport and house relation improve.'
                      if (visitKind === 'spouse') {
                        title = 'Time with spouse'
                        message = 'You spend private family time with ' + this.characterName(character, state) + '. Personal rapport improves without any formal introduction.'
                      } else if (visitKind === 'family') {
                        title = 'Family conversation'
                        message = this.characterName(character, state) + ' joins a family conversation. Rapport improves inside the household.'
                      } else if (visitKind === 'house') {
                        title = 'Household council'
                        message = this.characterName(character, state) + ' joins a household council. House relation and personal rapport improve.'
                      } else if (visitKind === 'dynasty') {
                        title = 'Dynasty audience'
                        message = this.characterName(character, state) + ' attends a wider dynasty audience. Dynasty ties improve modestly.'
                      }
                      result = {
                        title,
                        message,
                        image: this.characterPortrait(character, state, house)
                      }
                      this.log(society, familyVisit ? 'You hold a ' + (kinship.label || 'family') + ' meeting with ' + this.characterName(character, state) + '.' : 'You invite ' + this.characterName(character, state) + ' of ' + house.name + ' home to talk.')
                    }
                  })
                  if (result) {
                    this.pushModal({
                      title: result.title,
                      message: result.message,
                      image: result.image,
                      options: [
                        {
                          text: 'Back',
                          action: {
                            event: this.event,
                            method: 'openPerson',
                            context: { houseId, characterId }
                          }
                        }
                      ]
                    })
                  } else {
                    this.openPerson({ houseId, characterId })
                  }
                },
        visitRelationshipType(society, state, player, character, social) {
                  let scoreType = this.relationshipTypeFromScore(social.bond || 0)
                  let playerAge = this.age(player || {}, state)
                  let targetAge = this.age(character || {}, state)
                  if (targetAge >= playerAge + 12 && (this.characterHasTrait(society, character, 'educated') || this.characterHasTrait(society, character, 'literate') || this.characterHasTrait(society, character, 'erudite'))) {
                    return 'mentor'
                  }
                  if (playerAge >= targetAge + 12 && (this.characterHasTrait(society, player, 'educated') || this.characterHasTrait(society, player, 'literate') || this.characterHasTrait(society, player, 'erudite'))) {
                    return 'student'
                  }
                  return scoreType
                },
        courtCharacter({ houseId, characterId }) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let currentId = this.currentCharacterId(state)
                    let player = state.characters[currentId] || state.current
                    let character = state.characters[characterId]
                    if (!player || !character || this.sameCharacterId(currentId, characterId)) {
                      return
                    }
                    player.id = player.id || currentId
                    character.id = character.id || characterId
                    // Never court close family (children, parents, siblings, in-laws).
                    // The spouse uses its own dedicated route (courtSpouse).
                    let kinship = this.societyKinshipContext ? this.societyKinshipContext(society, state, house, character) : { kind: 'outsider' }
                    if (kinship.kind === 'self' || kinship.kind === 'family') {
                      result = {
                        title: 'Courtship unavailable',
                        message: 'You cannot court close family.',
                        image: this.characterPortrait(character, state, house)
                      }
                      return
                    }
                    if (this.age(player, state) < 13 || this.age(character, state) < 13) {
                      result = {
                        title: 'Courtship unavailable',
                        message: 'Characters younger than 13 cannot become lovers or be courted.',
                        image: this.characterPortrait(character, state, house)
                      }
                      return
                    }
                    let social = this.characterSocialRecord(society, characterId, true)
                    if (!social.introduced) {
                      result = {
                        title: 'Introduction needed',
                        message: 'You need a proper introduction before attempting something so private.',
                        image: this.characterPortrait(character, state, house)
                      }
                      return
                    }
                    if (social.nextCourtMonth && !this.monthKeyReached(social.nextCourtMonth, state)) {
                      result = {
                        title: 'Courtship cooling down',
                        message: 'This needs time. Try again after ' + social.nextCourtMonth + '.',
                        image: this.characterPortrait(character, state, house)
                      }
                      return
                    }
                    let romance = this.getRomance(society, currentId, characterId)
                    let approaches = this.courtshipApproaches(society, state, house, player, character, social, romance)
                    result = {
                      societyMenu: true,
                      title: romance ? 'Meet lover' : 'Court privately',
                      message: [
                        this.characterName(character, state) + ' will respond according to personality, traits, and situation.',
                        'Known Society traits: ' + this.socialTraitSummary(society, character),
                        'Rapport: ' + Math.round(social.bond || 0) + '. House relation: ' + this.signed(house.relation || 0) + '.'
                      ].join('\n'),
                      image: this.characterPortrait(character, state, house),
                      options: approaches.map((approach) => {
                        return {
                          text: approach.label,
                          tooltip: approach.hint,
                          icons: [this.affairIcon(approach.icon || 'romance')],
                          action: {
                            event: this.event,
                            method: 'resolveCourtship',
                            context: { houseId, characterId, approach: approach.key }
                          }
                        }
                      }).concat([{
                        text: 'Back',
                        action: {
                          event: this.event,
                          method: 'openPerson',
                          context: { houseId, characterId }
                        }
                      }])
                    }
                  })
                  if (result) {
                    this.pushModal({
                      societyMenu: !!result.societyMenu,
                      title: result.title,
                      message: result.message,
                      image: result.image,
                      options: result.options || [
                        {
                          text: 'Back',
                          action: {
                            event: this.event,
                            method: 'openPerson',
                            context: { houseId, characterId }
                          }
                        }
                      ]
                    })
                  } else {
                    this.openPerson({ houseId, characterId })
                  }
                },
        courtSpouse({ houseId, characterId } = {}) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let currentId = this.currentCharacterId(state)
                    let player = state.characters[currentId] || state.current
                    let spouse = state.characters[characterId]
                    if (!player || !spouse || this.sameCharacterId(currentId, characterId)) {
                      return
                    }
                    player.id = player.id || currentId
                    spouse.id = spouse.id || characterId
                    if (!this.sameCharacterId(player.spouseId, characterId)) {
                      // Not actually married: fall back to the normal courtship flow.
                      result = { redirectCourt: true }
                      return
                    }
                    if (this.age(player, state) < 13 || this.age(spouse, state) < 13) {
                      result = {
                        title: 'Too young',
                        message: 'Both spouses must be at least 13.',
                        image: this.characterPortrait(spouse, state, house)
                      }
                      return
                    }
                    // Marital intimacy near-always strengthens the bond.
                    this.changePersonalRelation(society, currentId, characterId, 6, 'lover')
                    let social = this.characterSocialRecord(society, characterId, true)
                    social.bond = this.clamp((social.bond || 0) + 8, 0, 100)
                    this.applyStats({ prestige: 1 })
                    let lines = ['You spend an intimate night with ' + this.characterName(spouse, state) + '. Your bond grows warmer.']
                    // Attempt conception through the shared pregnancy system.
                    let mother = this.characterIsMale(player) ? spouse : player
                    let father = this.characterIsMale(player) ? player : spouse
                    let conceived = false
                    if (mother && father && !mother.startedPregnancyTime && !father.startedPregnancyTime) {
                      let motherAge = this.age(mother, state)
                      let fertile = motherAge >= 16 && motherAge <= 42 && !mother.flagCannotGetPregnant && !father.flagCannotImpregnate
                      if (fertile) {
                        let children = this.childrenCountForCouple(state, mother.id, father.id)
                        let chance = this.clamp(0.9 - children * 0.12, 0.2, 0.92)
                        if (Math.random() < chance) {
                          try {
                            daapi.impregnate({ characterId: mother.id, fatherId: father.id })
                            daapi.forceUpdateCharacterDisplay({ characterId: mother.id })
                            conceived = true
                          } catch (err) {
                            console.warn(err)
                          }
                        }
                      }
                    }
                    if (conceived) {
                      lines.push(this.characterName(mother, state) + ' is now expecting a child.')
                      house.lastFamilyEvent = this.characterName(mother, state) + ' is expecting a child.'
                      this.log(society, this.characterName(mother, state) + ' is expecting a child with ' + this.characterName(father, state) + '.', 'birth', house.id)
                    }
                    this.save(society)
                    result = {
                      title: 'A night with your spouse',
                      message: lines.join('\n'),
                      image: this.characterPortrait(spouse, state, house)
                    }
                  })
                  if (result && result.redirectCourt) {
                    this.courtCharacter({ houseId, characterId })
                    return
                  }
                  if (result) {
                    this.pushModal({
                      title: result.title,
                      message: result.message,
                      image: result.image,
                      options: [{
                        text: 'Back',
                        action: { event: this.event, method: 'openPerson', context: { houseId, characterId } }
                      }]
                    })
                  } else {
                    this.openPerson({ houseId, characterId })
                  }
                },
        courtshipApproaches(society, state, house, player, character, social, romance) {
                  return [
                    {
                      key: 'verse',
                      label: 'Offer poetry and wit',
                      icon: 'prestige',
                      hint: 'Best for educated, literate, erudite, fashionable, or eloquent characters. Consequences: success greatly improves rapport; failure is mild.'
                    },
                    {
                      key: 'family',
                      label: 'Speak of family honor',
                      icon: 'marriage',
                      hint: 'Best for honorable, faithful, charitable, trusting, or status-conscious characters. Consequences: success improves relation and keeps scandal risk lower.'
                    },
                    {
                      key: 'ambition',
                      label: 'Promise advancement',
                      icon: 'senate',
                      hint: 'Best for ambitious, competitive, senatorial, equestrian, or office-minded characters. Consequences: success improves house ties; failure can offend.'
                    },
                    {
                      key: 'gift',
                      label: 'Bring a tasteful gift',
                      icon: 'gift',
                      hint: 'Best for fashionable, greedy, poor, freedmen, merchant, or practical characters. Consequences: costs no direct cash here, but failure hurts trust.'
                    },
                    {
                      key: 'discretion',
                      label: 'Keep everything discreet',
                      icon: 'romance',
                      hint: 'Best when either person is married, sly, manipulative, a gossip, or afraid of scandal. Consequences: success lowers immediate scandal risk.'
                    }
                  ]
                },
        courtshipIdealApproaches(society, state, house, player, character) {
                  let ideals = []
                  let add = (key) => {
                    if (ideals.indexOf(key) < 0) ideals.push(key)
                  }
                  let traits = (character.traits || []).concat(this.societyTraitsForCharacter(society, character.id))
                  let has = (trait) => traits.indexOf(trait) >= 0
                  if (has('educated') || has('literate') || has('erudite') || has('oratorDeliberative') || has('oratorJudicial') || has('fashionable')) add('verse')
                  if (has('honorable') || has('faithful') || has('charitable') || has('trusting') || has('content')) add('family')
                  if (has('ambitious') || has('competitive') || has('senator') || house.stratum === 'senatorial' || house.stratum === 'equestrian') add('ambition')
                  if (has('greedy') || has('fashionable') || house.stratum === 'poor' || house.stratum === 'freedmen' || character.job === 'trader') add('gift')
                  if (has('sly') || has('manipulator') || has('liar') || has('gossip') || character.spouseId || player.spouseId) add('discretion')
                  if (!ideals.length) add('family')
                  return ideals
                },
        resolveCourtship({ houseId, characterId, approach }) {
                  let result = false
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let currentId = this.currentCharacterId(state)
                    let player = state.characters[currentId] || state.current
                    let character = state.characters[characterId]
                    if (!player || !character || this.sameCharacterId(currentId, characterId)) {
                      return
                    }
                    player.id = player.id || currentId
                    character.id = character.id || characterId
                    // Never court close family (children, parents, siblings, in-laws).
                    // The spouse uses its own dedicated route (courtSpouse).
                    let kinship = this.societyKinshipContext ? this.societyKinshipContext(society, state, house, character) : { kind: 'outsider' }
                    if (kinship.kind === 'self' || kinship.kind === 'family') {
                      result = {
                        title: 'Courtship unavailable',
                        message: 'You cannot court close family.',
                        image: this.characterPortrait(character, state, house)
                      }
                      return
                    }
                    if (this.age(player, state) < 13 || this.age(character, state) < 13) {
                      result = {
                        title: 'Courtship unavailable',
                        message: 'Characters younger than 13 cannot become lovers or be courted.',
                        image: this.characterPortrait(character, state, house)
                      }
                      return
                    }
                    let social = this.characterSocialRecord(society, characterId, true)
                    let romance = this.getRomance(society, currentId, characterId)
                    let ideals = this.courtshipIdealApproaches(society, state, house, player, character)
                    let ideal = ideals.indexOf(approach) >= 0
                    let risk = this.romanceBaseRisk(player, character, state)
                    let playerEloquence = player.skills && player.skills.eloquence ? parseFloat(player.skills.eloquence) : 0
                    let base = romance ? 0.58 : 0.24
                    let chance = base + (house.relation || 0) / 320 + (social.bond || 0) / 170 + playerEloquence / 300
                    chance += ideal ? 0.30 : -0.08
                    if (approach === 'discretion' && (player.spouseId || character.spouseId)) chance += 0.10
                    if (approach === 'ambition' && this.characterHasTrait(society, character, 'ambitious')) chance += 0.10
                    if (approach === 'family' && this.characterHasTrait(society, character, 'faithful')) chance += 0.08
                    if (approach === 'gift' && this.characterHasTrait(society, character, 'greedy')) chance += 0.08
                    if (approach === 'verse' && this.characterHasTrait(society, character, 'educated')) chance += 0.08
                    chance = this.clamp(chance, 0.06, 0.92)
                    let success = Math.random() < chance
                    social.nextCourtMonth = this.futureMonthKey(success ? 3 : 6)
                    if (success) {
                      if (romance) {
                        romance.intensity = this.clamp((romance.intensity || 25) + (ideal ? this.randomInt(10, 18) : this.randomInt(5, 12)), 1, 100)
                        romance.secrecy = this.clamp((romance.secrecy || risk) + (approach === 'discretion' ? -4 : this.randomInt(1, 7)), 0, 100)
                      } else {
                        romance = this.createRomance(society, currentId, characterId, {
                          source: 'player',
                          intensity: this.randomInt(24, 42) + Math.max(0, Math.round((social.bond || 0) / 5)) + (ideal ? 8 : 0),
                          secrecy: approach === 'discretion' ? Math.max(5, risk - 12) : risk
                        })
                      }
                      social.bond = this.clamp((social.bond || 0) + (ideal ? this.randomInt(12, 22) : this.randomInt(6, 14)), -100, 100)
                      house.relation = this.clamp((house.relation || 0) + (ideal ? 5 : 2), -100, 100)
                      this.changePersonalRelation(society, currentId, characterId, ideal ? 18 : 10, 'lover')
                      result = {
                        title: romance && romance.months ? 'Secret meeting' : 'A private attachment begins',
                        message: ideal
                          ? this.characterName(character, state) + ' responds warmly. Your choice suited their character, and the bond deepens.'
                          : this.characterName(character, state) + ' accepts the approach, though not perfectly. The relationship grows.',
                        image: this.characterPortrait(character, state, house)
                      }
                      this.log(society, 'A private attachment grows with ' + this.characterName(character, state) + ' of ' + house.name + '.', 'romance', house.id)
                      if (romance && Math.random() < this.romanceScandalChance(romance, player, character, state) * (approach === 'discretion' ? 0.7 : 1.25)) {
                        this.revealRomanceScandal(society, state, romance, player, character, { quietPlayerModal: true })
                        result.title = 'The meeting is discovered'
                        result.message += '\nServants talk, and the affair becomes dangerous gossip.'
                        result.image = this.affairIcon('scandal')
                      }
                    } else {
                      let loss = ideal ? this.randomInt(2, 6) : this.randomInt(7, 16)
                      social.bond = this.clamp((social.bond || 0) - loss, -100, 100)
                      house.relation = this.clamp((house.relation || 0) - Math.max(2, Math.round(loss / 2)), -100, 100)
                      this.changePersonalRelation(society, currentId, characterId, -loss, loss >= 10 ? 'resentful' : 'neutral')
                      result = {
                        title: ideal ? 'Bad timing' : 'Courtship fails',
                        message: ideal
                          ? this.characterName(character, state) + ' might have welcomed the approach another day, but the timing fails. Rapport slips a little.'
                          : this.characterName(character, state) + ' rejects the approach. The choice did not fit their personality or situation.',
                        image: this.affairIcon('rivalry')
                      }
                      this.log(society, 'A private advance toward ' + this.characterName(character, state) + ' fails.', 'romance', house.id)
                      if ((player.spouseId || character.spouseId) && Math.random() < 0.18) {
                        house.heat = (house.heat || 0) + 1
                      }
                    }
                  })
                  if (result) {
                    this.pushModal({
                      title: result.title,
                      message: result.message,
                      image: result.image,
                      options: [
                        {
                          text: 'Back',
                          action: {
                            event: this.event,
                            method: 'openPerson',
                            context: { houseId, characterId }
                          }
                        }
                      ]
                    })
                  } else {
                    this.openPerson({ houseId, characterId })
                  }
                },
        spreadRumor({ houseId, characterId }) {
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let character = state.characters && state.characters[characterId]
                    if (this.sameCharacterId(this.currentCharacterId(state), characterId)) {
                      return
                    }
                    let kinship = this.societyKinshipContext ? this.societyKinshipContext(society, state, house, character) : { kind: 'outsider' }
                    if (kinship.kind === 'self' || kinship.kind === 'spouse' || kinship.kind === 'family') {
                      return
                    }
                    let success = Math.random() > 0.28
                    if (success) {
                      house.relation = this.clamp((house.relation || 0) - 22, -100, 100)
                      this.changePersonalRelation(society, this.currentCharacterId(state), characterId, -18, 'humiliated')
                      this.applyStats({ influence: 35, prestige: 5 })
                      this.log(society, 'A rumor harms ' + house.name + ', and your faction enjoys the advantage.')
                    } else {
                      house.relation = this.clamp((house.relation || 0) - 35, -100, 100)
                      house.rivalry = true
                      this.changePersonalRelation(society, this.currentCharacterId(state), characterId, -30, 'enemy')
                      this.applyStats({ prestige: -15 })
                      this.log(society, 'A rumor against ' + house.name + ' is traced back to your circle.')
                    }
                  })
                  this.openPerson({ houseId, characterId })
                },
        answerSlander({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    this.applyStats({ influence: -35, prestige: 4 })
                    house.pendingPlayerEvent = false
                    house.heat = (house.heat || 0) + 2
                    house.relation = this.clamp((house.relation || 0) - 8, -100, 100)
                    this.log(society, 'You answer ' + house.name + '\'s slander in public.')
                  })
                },
        ignoreSlander({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    this.applyStats({ prestige: -10 })
                    house.pendingPlayerEvent = false
                    house.heat = Math.max(0, (house.heat || 0) - 1)
                    this.log(society, 'You ignore slander from ' + house.name + '.')
                  })
                },
        acceptOpening({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    house.favor = (house.favor || 0) + 1
                    house.relation = this.clamp((house.relation || 0) + 8, -100, 100)
                    this.applyStats({ influence: 60 })
                    this.log(society, house.name + ' exchanges public support with your household.')
                  })
                },
        declineOpening({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    house.relation = this.clamp((house.relation || 0) - 4, -100, 100)
                    this.applyStats({ prestige: 3 })
                    this.log(society, 'You decline a political opening from ' + house.name + '.')
                  })
                },
        supportPetition({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    let cost = this.petitionCost(house)
                    this.applyStats({ cash: -cost, prestige: 7 })
                    house.relation = this.clamp((house.relation || 0) + 18, -100, 100)
                    if (Math.random() < 0.35) {
                      house.favor = (house.favor || 0) + 1
                    }
                    this.log(society, 'You hear a petition from ' + house.name + '.')
                  })
                },
        refusePetition({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    house.relation = this.clamp((house.relation || 0) - 12, -100, 100)
                    this.log(society, 'You refuse a petition from ' + house.name + '.')
                  })
                },
        attendFamilyInvitation({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    let cost = this.invitationCost(house)
                    this.applyStats({ cash: -cost, prestige: 10 })
                    house.relation = this.clamp((house.relation || 0) + 14, -100, 100)
                    if (Math.random() < 0.18) {
                      house.favor = (house.favor || 0) + 1
                    }
                    house.lastFamilyEvent = 'Your household attends a public occasion with ' + house.name + '.'
                    this.log(society, 'You attend a family occasion with ' + house.name + ': relation ' + this.signed(house.relation) + '.')
                  })
                },
        declineFamilyInvitation({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    house.relation = this.clamp((house.relation || 0) - 7, -100, 100)
                    house.heat = (house.heat || 0) + 1
                    house.lastFamilyEvent = 'Your household declines an invitation from ' + house.name + '.'
                    this.log(society, 'You decline an invitation from ' + house.name + ': relation ' + this.signed(house.relation) + '.')
                  })
                },
        endorseOffice({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    this.applyStats({ influence: -45, prestige: 10 })
                    house.pendingPlayerEvent = false
                    house.relation = this.clamp((house.relation || 0) + 14, -100, 100)
                    house.power = (house.power || 0) + 10
                    house.favor = (house.favor || 0) + 1
                    this.log(society, 'You endorse ' + house.name + ' in their campaign for office.')
                  })
                },
        honorWedding({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    let cost = this.actionCost(house, 'wedding')
                    this.applyStats({ cash: -cost, prestige: 5 })
                    house.pendingPlayerEvent = false
                    house.relation = this.clamp((house.relation || 0) + 16, -100, 100)
                    house.stability = this.clamp((house.stability || 50) + 5, 0, 100)
                    this.log(society, 'Your gift honors a wedding alliance in ' + house.name + '.')
                  })
                },
        judgeInheritance({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    let success = Math.random() < 0.7
                    this.applyStats({ influence: -30, prestige: success ? 12 : -8 })
                    house.pendingPlayerEvent = false
                    if (success) {
                      house.relation = this.clamp((house.relation || 0) + 18, -100, 100)
                      house.stability = this.clamp((house.stability || 50) + 12, 0, 100)
                      house.favor = (house.favor || 0) + 1
                      this.log(society, 'You settle an inheritance dispute inside ' + house.name + '.')
                    } else {
                      house.relation = this.clamp((house.relation || 0) - 16, -100, 100)
                      house.stability = this.clamp((house.stability || 50) - 8, 0, 100)
                      this.log(society, 'Your intervention in ' + house.name + '\'s inheritance dispute backfires.')
                    }
                  })
                },
        investVenture({ houseId, cost, expected, months }) {
                  this.withHouse(houseId, (society, house) => {
                    let offer = this.ventureOffer(house)
                    cost = parseInt(cost || offer.cost, 10)
                    expected = parseInt(expected || offer.expected, 10)
                    months = parseInt(months || offer.months, 10)
                    this.applyStats({ cash: -cost })
                    society.pendingVentures = society.pendingVentures || []
                    society.pendingVentures.push({
                      id: 'venture_' + this.safeId(house.id) + '_' + Date.now() + '_' + this.randomInt(1000, 9999),
                      houseId: house.id,
                      invested: cost,
                      expected,
                      due: this.futureMonthKey(months),
                      roll: Math.random(),
                      notified: false
                    })
                    house.pendingPlayerEvent = false
                    house.relation = this.clamp((house.relation || 0) + 10, -100, 100)
                    house.wealth = (house.wealth || 0) + cost
                    this.log(society, 'You invest with ' + house.name + ': expected settlement in ' + months + ' months.')
                  })
                },
        collectVentureResult({ ventureId }) {
                  let society = this.loadForAction()
                  society.pendingVentures = society.pendingVentures || []
                  let index = society.pendingVentures.findIndex((venture) => venture && venture.id === ventureId)
                  if (index < 0) {
                    this.openHub()
                    return
                  }
                  let venture = society.pendingVentures[index]
                  let house = society.houses[venture.houseId]
                  let title = 'Venture settled'
                  let message = ''
                  if (venture.success && venture.payout) {
                    this.applyStats({ cash: venture.payout })
                    if (house) {
                      house.relation = this.clamp((house.relation || 0) + 4, -100, 100)
                      house.wealth = (house.wealth || 0) + Math.round(venture.payout / 2)
                    }
                    let venturePlace = this.romanEstateLocation ? this.romanEstateLocation() : 'the city'
                    this.log(society, 'A trade venture out of ' + venturePlace + ' pays your household ' + venture.payout + ' cash.', 'tradeVenture', venture.houseId)
                    message = 'The trade venture out of ' + venturePlace + ' pays your household ' + venture.payout + ' cash.'
                  } else {
                    if (house) {
                      house.stability = this.clamp((house.stability || 50) - 2, 0, 100)
                    }
                    let venturePlace = this.romanEstateLocation ? this.romanEstateLocation() : 'the city'
                    this.log(society, 'A trade venture out of ' + venturePlace + ' closes without profit.', 'tradeVenture', venture.houseId)
                    message = 'The trade venture out of ' + venturePlace + ' closes without profit.'
                  }
                  society.pendingVentures.splice(index, 1)
                  this.save(society)
                  this.pushModal({
                    societyMenu: true,
                    title,
                    message: message + (house ? '\nHouse: ' + house.name + '.' : ''),
                    image: this.affairIcon('tradeVenture'),
                    options: [
                      {
                        text: 'Back to Society',
                        action: { event: this.event, method: 'openHub' }
                      },
                      {
                        text: 'Close'
                      }
                    ]
                  })
                },
        shieldScandal({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    this.applyStats({ influence: -35, prestige: -4 })
                    house.pendingPlayerEvent = false
                    house.relation = this.clamp((house.relation || 0) + 20, -100, 100)
                    house.stability = this.clamp((house.stability || 50) + 8, 0, 100)
                    house.favor = (house.favor || 0) + 1
                    this.log(society, 'You shield ' + house.name + ' from scandal.')
                  })
                },
        exploitScandal({ houseId }) {
                  this.withHouse(houseId, (society, house) => {
                    this.applyStats({ influence: 50, prestige: 6 })
                    house.pendingPlayerEvent = false
                    house.relation = this.clamp((house.relation || 0) - 35, -100, 100)
                    house.rivalry = house.relation < -45 || house.rivalry
                    house.power = Math.max(0, (house.power || 0) - 8)
                    this.log(society, 'You exploit scandal in ' + house.name + ' for political advantage.')
                  })
                },
        declineFamilyAffair({ houseId, kind }) {
                  this.withHouse(houseId, (society, house) => {
                    house.pendingPlayerEvent = false
                    if (kind === 'tradeVenture') {
                      this.log(society, 'You decline a trade venture from ' + house.name + ' without offense.', 'tradeVenture', house.id)
                      return
                    }
                    house.relation = this.clamp((house.relation || 0) - 3, -100, 100)
                    this.log(society, 'You avoid becoming involved in ' + house.name + '\'s family affairs.')
                  })
                },
        withHouse(houseId, fn) {
                  let society = this.loadForAction()
                  let house = society.houses[houseId]
                  if (!house) {
                    return
                  }
                  fn(society, house)
                  this.save(society)
                },
        loadForAction() {
                  let society = this.load()
                  if (!society.dynasties || !Object.keys(society.dynasties).length) {
                    try {
                      this.normalizeDynastyHouseModel(society, daapi.getState())
                    } catch (err) {
                      console.warn(err)
                    }
                  }
                  return society
                },
        actionCost(house, type) {
                  let profile = this.strata[house.stratum] || this.strata.plebeian
                  let state = daapi.getState()
                  // Inside an action the game has already taken the previewed cost: price it from the
                  // cash before the click, so the charge matches the preview.
                  let cash = Math.max(0, this.cashBeforeClick(state))
                  let level = this.socialLevel(house.stratum)
                  let floors = [8, 12, 18, 32, 55, 90]
                  let baseFloor = floors[level] || 18
                  let floor = cash > 0 ? Math.max(1, Math.min(baseFloor, Math.round(cash * 0.25))) : 1
                  let base = profile.cost || 200
                  let typeFactor = 0.16
                  let cashFactor = 0.08
                  if (type === 'dinner') {
                    typeFactor = 0.34
                    cashFactor = 0.16
                  }
                  if (type === 'reconcile') {
                    typeFactor = 0.24
                    cashFactor = 0.14
                  }
                  if (type === 'wedding') {
                    typeFactor = 0.12
                    cashFactor = 0.10
                  }
                  if (type === 'venture') {
                    typeFactor = 0.22
                    cashFactor = 0.18
                  }
                  let scaled = Math.max(floor, Math.round(base * typeFactor))
                  let affordable = cash > 0 ? Math.max(1, Math.round(cash * cashFactor)) : 1
                  return Math.max(1, Math.round(Math.min(scaled, affordable, cash > 0 ? Math.max(1, Math.floor(cash)) : 1)))
                },
        petitionCost(house) {
                  return Math.max(4, Math.round(this.actionCost(house || {}, 'gift') * 0.45))
                },
        invitationCost(house) {
                  return Math.max(5, Math.round(this.actionCost(house || {}, 'gift') * 0.55))
                },
        ventureOffer(house) {
                  let profile = this.strata[house.stratum] || this.strata.plebeian
                  let cost = this.actionCost(house, 'venture')
                  let expected = Math.max(8, Math.round(cost * (0.35 + Math.min(0.65, (profile.revenue || 20) / 120))))
                  return {
                    cost,
                    expected,
                    months: this.randomInt(1, 2)
                  }
                },
        applyStats(stats) {
                  stats = stats || {}
                  let alreadyApplied = this._currentVanillaStatChanges || {}
                  stats = { ...stats }
                  ;['cash', 'influence', 'prestige'].forEach((key) => {
                    let applied = parseFloat(alreadyApplied[key] || 0)
                    if (!applied || !stats[key]) {
                      return
                    }
                    stats[key] = parseFloat(stats[key] || 0) - applied
                    alreadyApplied[key] = 0
                    if (Math.abs(stats[key]) < 0.0001) {
                      stats[key] = 0
                    }
                  })
                  try {
                    if (stats.cash) daapi.addCash({ cash: stats.cash })
                    if (stats.influence) daapi.addInfluence({ influence: stats.influence })
                    if (stats.prestige) daapi.addPrestige({ prestige: stats.prestige })
                  } catch (err) {
                    console.warn(err)
                    daapi.applyStatChanges({
                      cash: stats.cash || 0,
                      influence: stats.influence || 0,
                      prestige: stats.prestige || 0
                    })
                  }
                },
        cashBeforeClick(state) {
                  // On a modal click the game applies the option's previewed statChanges before the
                  // action runs, so current cash is already net of the cost. Affordability checks
                  // inside an action must add that back, or a player with 1-2x the cost pays and is
                  // refused.
                  let cash = parseFloat(((state || {}).current || {}).cash || 0)
                  let applied = this._currentVanillaStatChanges || {}
                  return cash - parseFloat(applied.cash || 0)
                },
        refundVanillaStatChanges() {
                  // The action refused after the game had already applied its previewed stats: give
                  // them back. Returns true if anything was refunded.
                  let applied = this._currentVanillaStatChanges
                  if (!applied) {
                    return false
                  }
                  let refund = {}
                  ;['cash', 'influence', 'prestige'].forEach((key) => {
                    let value = parseFloat(applied[key] || 0)
                    if (value) {
                      refund[key] = -value
                    }
                    applied[key] = 0
                  })
                  if (!Object.keys(refund).length) {
                    return false
                  }
                  this.applyStats(refund)
                  return true
                },
        hideSocietyStatus(characterId, key) {
                  // The game draws a character status only while its `active` is true, and its own
                  // setCharacterStatusActive writes `isActive` instead, so it never hides one. Delete it.
                  try {
                    daapi.deleteCharacterStatus({ characterId, key })
                    return true
                  } catch (err) {
                    console.warn(err)
                    return false
                  }
                },
        clearStaleSocietyStatuses(state, key, active) {
                  // Everyone showing the status who should not: also the statuses older saves kept on
                  // screen, on people no sync lists any more.
                  let cleared = 0
                  Object.keys((state && state.characters) || {}).forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (active[characterId] || !character || !character.statuses || !character.statuses[key]) {
                      return
                    }
                    if (this.hideSocietyStatus(characterId, key)) {
                      cleared += 1
                    }
                  })
                  return cleared
                },
        runAction(method, args) {
                  args = args || {}
                  if (this.flushPendingMonthlyWork) {
                    this.flushPendingMonthlyWork()
                  }
                  if (!method || typeof this[method] !== 'function') {
                    return false
                  }
                  let previous = this._currentVanillaStatChanges
                  this._currentVanillaStatChanges = args.corSocietyVanillaStatChanges || false
                  try {
                    return this[method](args)
                  } finally {
                    this._currentVanillaStatChanges = previous
                  }
                },
        sortedHouses(society) {
                  if (!society || !society.houses) return []
                  let month = society.lastProcessedMonth || society.lastProcessedStatusMonth || ''
                  let houseCount = Object.keys(society.houses).length
                  // Also keyed on the society object: after reloading a same-month save, month and count
                  // match but the house objects are the reloaded save's.
                  if (this._sortedHousesCache && this._sortedHousesCache.society === society && this._sortedHousesCache.month === month && this._sortedHousesCache.count === houseCount) {
                    return this._sortedHousesCache.list
                  }
                  let houses = []
                  for (let houseId in society.houses) {
                    if (society.houses.hasOwnProperty(houseId)) {
                      houses.push(society.houses[houseId])
                    }
                  }
                  let list = houses.sort((a, b) => {
                    if ((b.strength || 0) !== (a.strength || 0)) {
                      return (b.strength || 0) - (a.strength || 0)
                    }
                    return String(a.name || '').localeCompare(String(b.name || ''))
                  })
                  this._sortedHousesCache = { society, month, count: houseCount, list }
                  return list
                },
        alliedHouses(society) {
                  return this.sortedHouses(society).filter((house) => this.isAlliedHouse(house))
                },
        rivalHouses(society) {
                  return this.sortedHouses(society).filter((house) => this.isRivalHouse(house))
                },
        isAlliedHouse(house) {
                  return !!(house && ((house.relation || 0) >= 45 || (house.favor || 0) > 0))
                },
        isRivalHouse(house) {
                  return !!(house && ((house.relation || 0) <= -35 || house.rivalry))
                },
        dynastyOptionText(society, dynasty) {
                  let houses = this.housesForDynasty(society, dynasty.id)
                  let head = society.houses && society.houses[dynasty.headHouseId]
                  return (dynasty.name || 'Unknown Dynasty') + ' (' + houses.length + ' ' + (houses.length === 1 ? 'house' : 'houses') + (head ? ', head: ' + head.name : '') + ')'
                },
        dynastyTooltip(society, dynasty) {
                  let houses = this.housesForDynasty(society, dynasty.id)
                  let head = society.houses && society.houses[dynasty.headHouseId]
                  let origin = society.houses && society.houses[dynasty.originHouseId]
                  let totalStrength = houses.reduce((sum, house) => sum + Math.round(house.strength || 0), 0)
                  let totalWealth = houses.reduce((sum, house) => sum + Math.round(house.wealth || 0), 0)
                  return [
                    'Dynasty: ' + (dynasty.name || dynasty.id),
                    'Head house: ' + ((head && head.name) || 'unknown'),
                    'Origin house: ' + ((origin && origin.name) || 'unknown'),
                    'Houses: ' + houses.length,
                    'Total strength: ' + totalStrength,
                    'Total wealth: ' + totalWealth,
                    'Heritage: ' + (dynasty.heritage || 'unknown')
                  ].join('\n')
                },
        dynastySummaryOptions(society, state, dynasty, houses, headHouse, originHouse) {
                  houses = houses || this.housesForDynasty(society, dynasty.id)
                  let members = this.memberIdsForDynasty(society, state, dynasty.id)
                  let totalStrength = houses.reduce((sum, house) => sum + Math.round(house.strength || 0), 0)
                  let totalWealth = houses.reduce((sum, house) => sum + Math.round(house.wealth || 0), 0)
                  let totalPower = houses.reduce((sum, house) => sum + Math.round(house.power || 0), 0)
                  let rivals = houses.filter((house) => this.isRivalHouse(house)).length
                  return [
                    this.summaryOption('Dynasty', dynasty.name || dynasty.id, [this.affairIcon('familyTree')], 'A dynasty can contain multiple houses. The name does not change when leadership changes.'),
                    this.summaryOption('Head house', headHouse ? headHouse.name : 'unknown', [headHouse ? this.houseCrestIcon(society, headHouse) : this.affairIcon('prestige')], 'The current leading house of the dynasty. Cadet houses can usurp this role without renaming any house.'),
                    this.summaryOption('Origin house', originHouse ? originHouse.name : 'unknown', [originHouse ? this.houseCrestIcon(society, originHouse) : this.affairIcon('familyTree')], 'The original house of the dynasty. It keeps its name even if it loses leadership.'),
                    this.summaryOption('Branches', houses.length + ' houses, ' + members.length + ' visible members', [this.affairIcon('support')], 'Known living members are connected to houses through Society house IDs.'),
                    this.summaryOption('Power bloc', 'Strength ' + totalStrength + ', wealth ' + totalWealth + ', power ' + totalPower, [this.affairIcon('senator'), this.affairIcon('coins')], 'Aggregated dynasty position across all houses.'),
                    this.summaryOption('Tension', rivals + ' hostile branches / relations', [this.affairIcon(rivals ? 'rivalry' : 'support')], 'Internal and external hostility can let a cadet house become dynasty head.')
                  ]
                },
        houseOptionText(house) {
                  let marker = house.rivalry ? 'Rival ' : (house.relation >= 55 ? 'Ally ' : '')
                  return marker + house.name + ' (' + this.signed(house.relation || 0) + ')'
                },
        houseTooltip(house) {
                  return [
                    'Rank: ' + (house.citizenRank || 'Unknown'),
                    'Strength: ' + Math.round(house.strength || 0),
                    'Wealth: ' + Math.round(house.wealth || 0),
                    'Power: ' + Math.round(house.power || 0),
                    'Stability: ' + Math.round(house.stability || 0),
                    'Favors: ' + (house.favor || 0),
                    'Agenda: ' + (house.agenda || 'unknown')
                  ].join('\n')
                },
        currentCharacterId(state) {
                  let current = (state && state.current) || {}
                  if (current.id !== undefined && current.id !== null) return current.id
                  if (current.characterId !== undefined && current.characterId !== null) return current.characterId
                  if (current.currentCharacterId !== undefined && current.currentCharacterId !== null) return current.currentCharacterId
                  if (current.playerCharacterId !== undefined && current.playerCharacterId !== null) return current.playerCharacterId
                  return null
                },
        isPlayerFamilyCharacter(state, characterId) {
                  if (characterId === undefined || characterId === null) {
                    return false
                  }
                  return this.playerFamilyMemberIds(state || daapi.getState())
                    .map((id) => String(id))
                    .indexOf(String(characterId)) >= 0
                },
        playerFamilyMemberIds(state) {
                  state = state || daapi.getState()
                  let characters = state.characters || {}
                  let current = state.current || {}
                  let currentId = this.currentCharacterId(state)
                  let player = characters[currentId] || {}
                  let dynastyId = player.dynastyId
                  let seen = {}
                  let ids = []
                  let add = (characterId) => {
                    if (characterId === undefined || characterId === null || characterId === '' || seen[characterId]) {
                      return
                    }
                    seen[characterId] = true
                    ids.push(characterId)
                  }
                  add(currentId)
                  ;[
                    current.householdCharacterIds,
                    current.formerHouseholdCharacterIds,
                    current.familyCharacterIds,
                    current.dependantCharacterIds,
                    current.dependentCharacterIds
                  ].forEach((list) => {
                    ;(list || []).forEach(add)
                  })
                  let addRelations = (character) => {
                    if (!character) {
                      return
                    }
                    add(character.fatherId)
                    add(character.motherId)
                    add(character.spouseId)
                    ;(character.childrenIds || []).forEach(add)
                    ;(character.siblingIds || []).forEach(add)
                    ;(character.dependantIds || []).forEach(add)
                    ;(character.dependentIds || []).forEach(add)
                  }
                  addRelations(player)
                  if (dynastyId && state.dynasties && state.dynasties[dynastyId]) {
                    ;(state.dynasties[dynastyId].memberIds || []).slice(0, 160).forEach((characterId) => {
                      let character = characters[characterId]
                      if (!character || character.isDead) return
                      add(character.id || characterId)
                      addRelations(character)
                    })
                  }
                  ;(player.childrenIds || []).forEach((characterId) => {
                    let character = characters[characterId]
                    if (!character || character.isDead) return
                    add(character.id || characterId)
                    addRelations(character)
                  })
                  return ids.filter((characterId) => {
                    let character = characters[characterId]
                    return character && !character.isDead
                  })
                },
        playerFamilyMembers(state) {
                  state = state || daapi.getState()
                  let characters = state.characters || {}
                  return this.playerFamilyMemberIds(state)
                    .map((characterId) => characters[characterId])
                    .filter((character) => character && !character.isDead)
                },
        playerMarriageCandidates(state) {
                  state = state || daapi.getState()
                  let candidates = []
                  this.playerFamilyMemberIds(state).forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (this.isMarriageEligible(character, state)) {
                      if (character.id === undefined || character.id === null) {
                        character.id = characterId
                      }
                      candidates.push(character)
                    }
                  })
                  return candidates.sort((a, b) => this.age(a, state) - this.age(b, state))
                },
        marriageOptionInfo(society, state, house) {
                  let playerStratum = this.playerStratum(state)
                  let diff = this.socialLevel(house.stratum) - this.socialLevel(playerStratum)
                  let candidates = this.playerMarriageCandidates(state)
                  let required = this.marriageRelationRequirement(diff)
                  let relation = house.relation || 0
                  let notes = []
                  let tooltip = [
                    'Player order: ' + this.stratumTitle(playerStratum),
                    'Target order: ' + this.stratumTitle(house.stratum),
                    'Relation: ' + this.signed(relation),
                    'Unmarried adult family members: ' + candidates.length
                  ]
                  if (house.stratum === 'poor') {
                    notes.push('slaves')
                    tooltip.push('Your family cannot arrange marriages with enslaved characters. Use Household Slaves for slave-to-slave household marriages only.')
                  }
                  if (!candidates.length) {
                    notes.push('no adult')
                    tooltip.push('No unmarried adult in your family was found.')
                  }
                  if (diff < -1) {
                    notes.push('too low')
                    tooltip.push('This house is more than one order below you.')
                  }
                  if (diff > 2) {
                    notes.push('too high')
                    tooltip.push('This house is more than two orders above you.')
                  }
                  if (diff <= 2 && diff >= -1 && relation < required) {
                    notes.push('need ' + required + ' rel')
                    tooltip.push('This rank gap requires relation ' + required + ' or higher.')
                  }
                  if (!notes.length) {
                    tooltip.push('If this house lacks a visible eligible spouse, Society can introduce one.')
                  }
                  return {
                    available: notes.length === 0,
                    note: notes.slice(0, 2).join(', '),
                    tooltip: tooltip.join('\n'),
                    playerStratum,
                    diff,
                    required
                  }
                },
        houseMarriageCandidates(house, state, matchCharacter) {
                  let candidates = []
                  if (!house || house.stratum === 'poor') {
                    return candidates
                  }
                  this.visibleHousePeople(house, state).forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!this.isMarriageEligible(character, state) || this.isSlaveCharacter(character, house)) {
                      return
                    }
                    if (character.id === undefined || character.id === null) {
                      character.id = characterId
                    }
                    if (matchCharacter && !this.isMarriageCompatible(matchCharacter, character, state)) {
                      return
                    }
                    candidates.push(character)
                  })
                  return candidates.sort((a, b) => this.characterScore(b, state) - this.characterScore(a, state))
                },
        playerStratum(state) {
                  return this.playerSocietyStatus(state).stratum
                },
        syncPlayerSocietyStatus(society, state) {
                  society.playerStatus = this.playerSocietyStatus(state)
                },
        playerSocietyStatus(state) {
                  state = state || daapi.getState()
                  let currentId = this.currentCharacterId(state)
                  let player = (state.characters && state.characters[currentId]) || {}
                  let dynastyId = player.dynastyId || (state.current && state.current.dynastyId)
                  let dynasty = (state.dynasties && state.dynasties[dynastyId]) || {}
                  let members = this.playerFamilyMembers(state)
                  let heritage = this.normalizedHeritage(dynasty.heritage || player.heritage || '')
                  let currentClass = this.safeCurrentClass(state)
                  let wealth = this.playerWealthValue(state)
                  let hasSenate = members.some((character) => this.isSenatorialCharacter(character, state))
                  let stratum = this.stratumFromPlayerClass(currentClass, heritage, hasSenate, state)
                  return {
                    stratum,
                    title: this.playerStatusTitle(stratum, heritage),
                    heritage,
                    currentClass,
                    className: this.currentClassName(currentClass),
                    wealth
                  }
                },
        stratumFromPlayerClass(currentClass, heritage, hasSenate, state) {
                  let senatorialFlag = !!(state && state.current && (state.current.flagIsSenetorialClass || state.current.flagIsSenatorialClass))
                  if (senatorialFlag || hasSenate || currentClass >= 7) {
                    return 'senatorial'
                  }
                  if (currentClass >= 6) {
                    return 'equestrian'
                  }
                  if (currentClass >= 4) {
                    return 'civic'
                  }
                  if (currentClass >= 1) {
                    if (heritage === 'roman_freedman') {
                      return 'freedmen'
                    }
                    if (heritage === 'roman_novus_homo' && currentClass >= 3) {
                      return 'civic'
                    }
                    return 'plebeian'
                  }
                  if (heritage === 'roman_freedman') {
                    return 'freedmen'
                  }
                  if (heritage === 'roman_novus_homo' && currentClass >= 3) {
                    return 'civic'
                  }
                  return 'poor'
                },
        playerStatusTitle(stratum, heritage) {
                  if (stratum === 'senatorial') return 'Senatorial Roman Citizen'
                  if (stratum === 'equestrian') return 'Equestrian Roman Citizen'
                  if (stratum === 'civic') return heritage === 'roman_novus_homo' ? 'Novus Homo Civic Roman Citizen' : 'Civic Roman Citizen'
                  if (stratum === 'plebeian') return heritage === 'roman_novus_homo' ? 'Novus Homo Plebeian Roman Citizen' : 'Plebeian Roman Citizen'
                  if (stratum === 'freedmen') return 'Freedman Roman Citizen'
                  return 'Proletarii Roman Citizen'
                },
        playerStatusText(state) {
                  let status = this.playerSocietyStatus(state)
                  let classText = status.className ? ' (' + status.className + ')' : ''
                  return status.title + classText
                },
        playerStatusKey(state) {
                  let status = this.playerSocietyStatus(state)
                  return [
                    status.stratum,
                    status.heritage,
                    status.currentClass === null ? 'none' : status.currentClass,
                    status.className || '',
                    !!(state && state.current && (state.current.flagIsSenetorialClass || state.current.flagIsSenatorialClass))
                  ].join(':')
                },
        currentClassName(currentClass) {
                  let names = ['Proletarii', 'Class V', 'Class IV', 'Class III', 'Class II', 'Class I', 'Equites', 'Senatores']
                  return names[currentClass] || ''
                },
        normalizedHeritage(heritage) {
                  heritage = String(heritage || '').toLowerCase()
                  return heritage === 'roman_plebian' ? 'roman_plebeian' : heritage
                },
        safeCurrentClass(state) {
                  state = state || daapi.getState()
                  if (state && state.current && (state.current.flagIsSenetorialClass || state.current.flagIsSenatorialClass)) {
                    return 7
                  }
                  try {
                    if (typeof daapi !== 'undefined' && daapi.calculateCurrentClass) {
                      let currentClass = parseInt(daapi.calculateCurrentClass(), 10)
                      return isNaN(currentClass) ? null : currentClass
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                  let wealth = this.playerWealthValue(state)
                  if (wealth < 1100) return 0
                  if (wealth < 2500) return 1
                  if (wealth < 5000) return 2
                  if (wealth < 7500) return 3
                  if (wealth < 10000) return 4
                  if (wealth < 25000) return 5
                  return 6
                },
        playerWealthValue(state) {
                  let current = (state && state.current) || {}
                  let wealth = parseFloat(current.cash || 0)
                  let details = current.propertyDetails || current.property || {}
                  return wealth + this.propertyValue(details)
                },
        propertyValue(details) {
                  let values = {
                    farmland: 250,
                    vinyard: 360,
                    vineyard: 360,
                    orchard: 420,
                    primeFarmland: 2700,
                    primeVinyard: 3300,
                    primeVineyard: 3300,
                    primeOrchard: 3900,
                    latifundiumFood: 11000,
                    latifundiumAnimal: 14000,
                    latifundiumFish: 17000,
                    latifundiumOil: 21000,
                    insulae: 4500,
                    fishingBoat: 41,
                    tradeships: 630,
                    seafaringTradeships: 7500,
                    horse: 125,
                    donkey: 28,
                    pig: 26,
                    goat: 32,
                    sheep: 36,
                    cattle: 40,
                    duck: 15,
                    chicken: 10
                  }
                  let total = 0
                  Object.keys(values).forEach((key) => {
                    total += parseFloat(details[key] || 0) * values[key]
                  })
                  return total
                },
        socialLevel(stratum) {
                  let levels = {
                    poor: 0,
                    freedmen: 1,
                    plebeian: 2,
                    civic: 3,
                    equestrian: 4,
                    senatorial: 5
                  }
                  return levels[stratum] === undefined ? 2 : levels[stratum]
                },
        stratumTitle(stratum) {
                  return (this.strata[stratum] && this.strata[stratum].title) || stratum || 'Unknown'
                },
        marriageRelationRequirement(diff) {
                  if (diff >= 2) return 80
                  if (diff === 1) return 35
                  if (diff === 0) return 0
                  return -10
                },
        marriageEffects(state, house) {
                  let diff = this.socialLevel(house.stratum) - this.socialLevel(this.playerStratum(state))
                  let profile = this.strata[house.stratum] || this.strata.plebeian
                  let cost = this.actionCost(house, 'wedding')
                  if (diff >= 2) {
                    return {
                      stats: { cash: -Math.round(cost * 2.2), prestige: 70, influence: 150 },
                      revenue: Math.max(8, Math.round((profile.revenue || 30) * 0.35)),
                      relation: 32,
                      summary: 'Marriage far above your station: prestige and influence rise sharply, but the wedding is expensive.'
                    }
                  }
                  if (diff === 1) {
                    return {
                      stats: { cash: -Math.round(cost * 1.45), prestige: 38, influence: 85 },
                      revenue: Math.max(5, Math.round((profile.revenue || 30) * 0.25)),
                      relation: 26,
                      summary: 'Marriage upward: your standing improves and the alliance opens useful doors.'
                    }
                  }
                  if (diff === 0) {
                    return {
                      stats: { cash: -cost, prestige: 16, influence: 35 },
                      revenue: Math.max(3, Math.round((profile.revenue || 30) * 0.15)),
                      relation: 22,
                      summary: 'Marriage within your order: a stable alliance strengthens both households.'
                    }
                  }
                  return {
                    stats: { cash: -Math.round(cost * 0.55), prestige: -8, influence: 18 },
                    revenue: Math.max(2, Math.round((profile.revenue || 20) * 0.18)),
                    relation: 30,
                    summary: 'Marriage downward: some elite standing is lost, but local loyalty and practical support improve.'
                  }
                },
        isMarriageEligible(character, state) {
                  if (!character || character.isDead || character.spouseId) {
                    return false
                  }
                  if (this.isSlaveCharacter(character)) {
                    return false
                  }
                  let age = this.age(character, state)
                  if (age < 16 || age > 60) {
                    return false
                  }
                  if (character.flagCannotMarry) {
                    return false
                  }
                  return true
                },
        areCloseBloodKin(first, second, state) {
                  if (!first || !second || !state || !state.characters) {
                    return false
                  }
                  let firstId = first.id || first.characterId
                  let secondId = second.id || second.characterId
                  if (!firstId || !secondId) {
                    return false
                  }
                  if (this.sameCharacterId(first.fatherId, secondId) || this.sameCharacterId(first.motherId, secondId) || this.sameCharacterId(second.fatherId, firstId) || this.sameCharacterId(second.motherId, firstId)) {
                    return true
                  }
                  let firstParents = [first.fatherId, first.motherId].filter(Boolean).map(String)
                  let secondParents = [second.fatherId, second.motherId].filter(Boolean).map(String)
                  if (firstParents.some((parentId) => secondParents.indexOf(parentId) >= 0)) {
                    return true
                  }
                  return !!(this.sharesAncestorWithin && this.sharesAncestorWithin(state, firstId, secondId, 4))
                },
        isMarriageCompatible(first, second, state) {
                  if (!first || !second || this.sameCharacterId(first.id, second.id) || (first.dynastyId && second.dynastyId && String(first.dynastyId) === String(second.dynastyId))) {
                    return false
                  }
                  if (state && this.areCloseBloodKin(first, second, state)) {
                    return false
                  }
                  return this.characterIsMale(first) !== this.characterIsMale(second)
                },
        isMarriageCompatibleForSlaves(first, second) {
                  if (!first || !second || first.id === second.id) {
                    return false
                  }
                  return this.characterIsMale(first) !== this.characterIsMale(second)
                },
        characterIsMale(character) {
                  if (!character) {
                    return false
                  }
                  if (character.gender) {
                    return character.gender === 'male'
                  }
                  return !!character.isMale
                }
      })
      window.corSociety._mixinCorSocietyActionsStatusVersion = '1.1.331'
    }
  }
}
