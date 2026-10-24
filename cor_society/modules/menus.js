{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyMenus() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyMenusVersion === '1.1.331') {
        return
      }
      Object.assign(window.corSociety, {
        openHub() {
                  this._houseReturn = null
                  let state = daapi.getState()
                  let society = this.ensure()
                  let counts = this.countByStratum(society)
                  let rivals = this.rivalHouses(society).length
                  let allies = this.alliedHouses(society).length
                  let playerStatus = this.playerSocietyStatus(state)
                  this.pushModal({
                    societyMenu: true,
                    title: 'Roman Society',
                    message: 'Roman Society overview.',
                    societySummaryOptions: this.hubSummaryOptions(state, society, counts, rivals, allies, playerStatus),
                    image: daapi.requireImage('/cor_society/icon.svg'),
                    options: [
                      (this.playerPoliticsUnlocked && !this.playerPoliticsUnlocked(state)) ? {
                        variant: 'info',
                        text: 'Senate & Politics (Equestrian order required)',
                        icons: [this.imperatorIcon ? this.imperatorIcon() : this.affairIcon('senator')],
                        disabled: true,
                        showDisabledWithTooltip: true,
                        tooltip: 'Unlocks when you reach the Equestrian order (equites).',
                        action: { event: this.event, method: 'openPolitics' }
                      } : {
                        variant: 'info',
                        text: 'Senate & Politics',
                        icons: [this.imperatorIcon ? this.imperatorIcon() : this.affairIcon('senator')],
                        action: {
                          event: this.event,
                          method: 'openPolitics'
                        }
                      },
                      {
                        variant: 'info',
                        text: 'Bank of Rome',
                        icons: [this.bundledIcon('bank_of_rome', 'money')],
                        action: {
                          event: this.event,
                          method: 'openBankOfRome'
                        }
                      },
                      {
                        variant: 'info',
                        text: 'Crimes, courts, and prison',
                        icons: [this.lawIcon ? this.lawIcon('prison') : this.affairIcon('scandal')],
                        action: {
                          event: this.event,
                          method: 'romanSystemsAction',
                          context: { action: 'openCrimes' }
                        }
                      },
                      {
                        variant: 'info',
                        text: 'Security & bodyguards (lvl ' + (this.playerBodyguardLevel ? this.playerBodyguardLevel(society) : 0) + ')',
                        icons: [this.lawIcon ? this.lawIcon('legion') : this.affairIcon('support')],
                        action: {
                          event: this.event,
                          method: 'romanSystemsAction',
                          context: { action: 'openSecurity' }
                        }
                      },
                      {
                        variant: 'info',
                        text: 'Household Slaves (' + (society.playerSlaves || []).length + ')',
                        icons: [this.slaveTypeIcon('household')],
                        action: {
                          event: this.event,
                          method: 'openHouseholdSlaves'
                        }
                      },
                      ...this.stratumOrder.map((stratum) => {
                        return {
                          text: this.strata[stratum].title + ' (' + (counts[stratum] || 0) + ')',
                          icons: [this.stratumIcon(stratum)],
                          action: {
                            event: this.event,
                            method: 'openEstate',
                            context: { stratum, page: 0 }
                          }
                        }
                      }),
                      {
                        text: 'Allies and patrons (' + allies + ')',
                        icons: [this.affairIcon('support')],
                        action: {
                          event: this.event,
                          method: 'openAllies'
                        }
                      },
                      {
                        text: 'Rivals (' + rivals + ')',
                        icons: [this.affairIcon('rivalry')],
                        action: {
                          event: this.event,
                          method: 'openRivals'
                        }
                      },
                      {
                        text: 'Past affairs',
                        icons: [this.affairIcon('log')],
                        action: {
                          event: this.event,
                          method: 'openLog'
                        }
                      },
                      {
                        text: 'Close'
                      }
                    ]
                  })
                },
        openEstate({ stratum, page }) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  page = parseInt(page || 0, 10)
                  let dynasties = this.sortedDynasties(society).filter((dynasty) => {
                    let house = this.primaryHouseForDynasty(society, dynasty.id) || {}
                    return (dynasty.stratum || house.stratum || 'plebeian') === stratum
                  })
                  let pageSize = 8
                  let start = page * pageSize
                  let shown = dynasties.slice(start, start + pageSize)
                  let options = shown.map((dynasty) => {
                    let house = this.primaryHouseForDynasty(society, dynasty.id) || {}
                    return {
                      text: this.dynastyOptionText(society, dynasty),
                      tooltip: this.dynastyTooltip(society, dynasty),
                      icons: [this.houseCrestIcon(society, house), this.housePortrait(house, state)],
                      action: {
                        event: this.event,
                        method: 'openDynasty',
                        context: { dynastyId: dynasty.id, stratum, page }
                      }
                    }
                  })
                  if (start + pageSize < dynasties.length) {
                    options.push({
                      text: 'Next page',
                      action: {
                        event: this.event,
                        method: 'openEstate',
                        context: { stratum, page: page + 1 }
                      }
                    })
                  }
                  if (page > 0) {
                    options.push({
                      text: 'Previous page',
                      action: {
                        event: this.event,
                        method: 'openEstate',
                        context: { stratum, page: page - 1 }
                      }
                    })
                  }
                  if ((society.deadHouseIds || []).length) {
                    options.push({
                      text: 'Dead houses (' + society.deadHouseIds.length + ')',
                      tooltip: 'Open the archive of houses that no longer have living known members.',
                      icons: [this.affairIcon('death')],
                      action: {
                        event: this.event,
                        method: 'openDeadHouses'
                      }
                    })
                  }
                  options.push({
                    text: 'Back',
                    action: {
                      event: this.event,
                      method: 'openHub'
                    }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: this.strata[stratum].title,
                    message: shown.length ? 'Choose a dynasty to inspect. Each dynasty can contain one or more houses.' : 'No dynasties are known in this order yet.',
                    image: this.stratumIcon(stratum),
                    options
                  })
                },
        openDynasty({ dynastyId, stratum, page } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let dynasty = society.dynasties && society.dynasties[dynastyId]
                  if (!dynasty) {
                    this.openHub()
                    return
                  }
                  let houses = this.housesForDynasty(society, dynastyId)
                  let headHouse = society.houses[dynasty.headHouseId] || this.primaryHouseForDynasty(society, dynastyId)
                  let originHouse = society.houses[dynasty.originHouseId] || this.primaryHouseForDynasty(society, dynastyId)
                  let rootId = this.dynastyTreeFocusId(society, state, dynastyId)
                  let options = []
                  if (rootId) {
                    options.push({
                      variant: 'info',
                      text: 'Dynasty tree',
                      tooltip: 'Opens the total graphical tree for this dynasty, across all known houses.',
                      icons: [this.affairIcon('familyTree')],
                      action: { event: this.event, method: 'openDynastyTree', context: { dynastyId, stratum, page: page || 0 } }
                    })
                  }
                  options.push(...houses.map((house) => {
                    let labels = []
                    if (originHouse && house.id === originHouse.id) labels.push('origin')
                    if (headHouse && house.id === headHouse.id) labels.push('dynasty head')
                    return {
                      text: house.name + (labels.length ? ' (' + labels.join(', ') + ')' : ''),
                      tooltip: this.houseTooltip(house) + '\nBranch: ' + (house.branchName || 'House branch'),
                      icons: [this.houseCrestIcon(society, house), this.housePortrait(house, state)],
                      action: { event: this.event, method: 'openHouse', context: { houseId: house.id, returnTo: 'dynasty', returnPage: page || 0 } }
                    }
                  }))
                  let createInfo = this.playerCadetHouseInfo(society, state, dynasty)
                  if (createInfo.visible) {
                    options.push({
                      variant: 'info',
                      text: 'Found cadet house' + (createInfo.available ? '' : ' (' + createInfo.reason + ')'),
                      disabled: !createInfo.available,
                      showDisabledWithTooltip: true,
                      tooltip: createInfo.tooltip,
                      icons: [this.affairIcon('familyTree'), this.affairIcon('prestige')],
                      action: { event: this.event, method: 'createPlayerCadetHouse', context: { dynastyId } }
                    })
                  }
                  options.push({
                    text: 'Back',
                    action: { event: this.event, method: 'openEstate', context: { stratum: stratum || (headHouse && headHouse.stratum) || dynasty.stratum || 'plebeian', page: page || 0 } }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: dynasty.name,
                    message: 'Dynasty overview.',
                    societySummaryOptions: this.dynastySummaryOptions(society, state, dynasty, houses, headHouse, originHouse),
                    image: headHouse ? this.houseCrestIcon(society, headHouse) : this.affairIcon('familyTree'),
                    options
                  })
                },
        createPlayerCadetHouse({ dynastyId } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let dynasty = society.dynasties && society.dynasties[dynastyId]
                  let info = this.playerCadetHouseInfo(society, state, dynasty)
                  if (!info.available) {
                    this.pushModal({
                      societyMenu: true,
                      title: 'Cadet house unavailable',
                      message: info.tooltip || 'This dynasty cannot create a cadet house right now.',
                      image: this.affairIcon('familyTree'),
                      options: [{ text: 'Back', action: { event: this.event, method: 'openDynasty', context: { dynastyId } } }]
                    })
                    return
                  }
                  this.applyStats({ cash: -info.cost.cash, prestige: -info.cost.prestige, influence: -info.cost.influence })
                  let house = this.createCadetHouse(society, state, dynastyId, info.candidate, 'player branch foundation')
                  this.save(society)
                  if (house) {
                    this.openHouse({ houseId: house.id, returnTo: 'dynasty' })
                  } else {
                    this.openDynasty({ dynastyId })
                  }
                },
        openRelations() {
                  this.openAllies()
                },
        openAllies({ page } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let houses = this.alliedHouses(society)
                  page = parseInt(page || 0, 10)
                  let pageSize = 10
                  let start = page * pageSize
                  let shown = houses.slice(start, start + pageSize)
                  let options = shown.map((house) => {
                    return {
                      text: this.houseOptionText(house),
                      tooltip: this.houseTooltip(house),
                      icons: [this.houseCrestIcon(society, house), this.housePortrait(house, state)],
                      action: {
                        event: this.event,
                        method: 'openHouse',
                        context: { houseId: house.id, returnTo: 'allies', returnPage: page }
                      }
                    }
                  })
                  if (start + pageSize < houses.length) {
                    options.push({
                      text: 'Next page',
                      action: {
                        event: this.event,
                        method: 'openAllies',
                        context: { page: page + 1 }
                      }
                    })
                  }
                  if (page > 0) {
                    options.push({
                      text: 'Previous page',
                      action: {
                        event: this.event,
                        method: 'openAllies',
                        context: { page: page - 1 }
                      }
                    })
                  }
                  options.push({
                    text: 'Back',
                    action: {
                      event: this.event,
                      method: 'openHub'
                    }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Allies and Patrons',
                    message: houses.length ? 'These houses currently support, favor, or owe your household.\nPage ' + (page + 1) + ' of ' + Math.max(1, Math.ceil(houses.length / pageSize)) + '.' : 'No allies, patrons, or favors yet.',
                    image: this.affairIcon('support'),
                    options
                  })
                },
        openRivals({ page } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let houses = this.rivalHouses(society)
                  page = parseInt(page || 0, 10)
                  let pageSize = 10
                  let start = page * pageSize
                  let shown = houses.slice(start, start + pageSize)
                  let options = shown.map((house) => {
                    return {
                      text: this.houseOptionText(house),
                      tooltip: this.houseTooltip(house),
                      icons: [this.houseCrestIcon(society, house), this.housePortrait(house, state)],
                      action: {
                        event: this.event,
                        method: 'openHouse',
                        context: { houseId: house.id, returnTo: 'rivals', returnPage: page }
                      }
                    }
                  })
                  if (start + pageSize < houses.length) {
                    options.push({
                      text: 'Next page',
                      action: {
                        event: this.event,
                        method: 'openRivals',
                        context: { page: page + 1 }
                      }
                    })
                  }
                  if (page > 0) {
                    options.push({
                      text: 'Previous page',
                      action: {
                        event: this.event,
                        method: 'openRivals',
                        context: { page: page - 1 }
                      }
                    })
                  }
                  options.push({
                    text: 'Back',
                    action: {
                      event: this.event,
                      method: 'openHub'
                    }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Rival Houses',
                    message: houses.length ? 'These houses oppose, resent, or openly rival your household.\nPage ' + (page + 1) + ' of ' + Math.max(1, Math.ceil(houses.length / pageSize)) + '.' : 'No serious rivalries yet.',
                    image: this.affairIcon('rivalry'),
                    options
                  })
                },
        openLog({ page } = {}) {
                  let society = this.ensure()
                  page = parseInt(page || 0, 10)
                  let entries = (society.log || []).map((entry, index) => this.normalizeLogEntry(entry, index))
                  let pageSize = this.historyPageSize || 8
                  let start = page * pageSize
                  let shown = entries.slice(start, start + pageSize)
                  let options = shown.map((entry) => {
                    return {
                      text: this.shortText(entry.text, 68),
                      tooltip: entry.text,
                      icons: [this.affairIcon(entry.kind)],
                      action: {
                        event: this.event,
                        method: 'openLogEntry',
                        context: { index: entry.index, page }
                      }
                    }
                  })
                  if (start + pageSize < entries.length) {
                    options.push({
                      text: 'Next page',
                      action: {
                        event: this.event,
                        method: 'openLog',
                        context: { page: page + 1 }
                      }
                    })
                  }
                  if (page > 0) {
                    options.push({
                      text: 'Previous page',
                      action: {
                        event: this.event,
                        method: 'openLog',
                        context: { page: page - 1 }
                      }
                    })
                  }
                  options.push({
                    text: 'Back',
                    action: {
                      event: this.event,
                      method: 'openHub'
                    }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Past Affairs',
                    message: entries.length ? 'Choose an affair to inspect. Page ' + (page + 1) + ' of ' + Math.max(1, Math.ceil(entries.length / pageSize)) + '.' : 'No public affairs recorded yet.',
                    image: this.affairIcon('log'),
                    options
                  })
                },
        openLogEntry({ index, page }) {
                  let society = this.ensure()
                  let entry = this.normalizeLogEntry((society.log || [])[index], index)
                  this.pushModal({
                    societyMenu: true,
                    title: 'Past Affair',
                    message: entry.text || 'No details.',
                    image: this.affairIcon(entry.kind),
                    options: [
                      {
                        text: 'Back',
                        action: {
                          event: this.event,
                          method: 'openLog',
                          context: { page: page || 0 }
                        }
                      }
                    ]
                  })
                },
        openDeadHouses({ page } = {}) {
                  let society = this.ensure()
                  page = parseInt(page || 0, 10)
                  let ids = (society.deadHouseIds || []).filter((houseId) => society.deadHouses && society.deadHouses[houseId])
                  let pageSize = this.historyPageSize || 8
                  let start = page * pageSize
                  let shown = ids.slice(start, start + pageSize)
                  let options = shown.map((houseId) => {
                    let house = society.deadHouses[houseId]
                    return {
                      text: house.name + ' - ' + (house.extinctDate || 'extinct'),
                      tooltip: 'Order: ' + this.stratumTitle(house.stratum) + '\nLast record: ' + (house.lastFamilyEvent || 'No final record.'),
                      icons: [this.houseCrestIcon(society, house), this.affairIcon('death')],
                      action: {
                        event: this.event,
                        method: 'openDeadHouse',
                        context: { houseId, page }
                      }
                    }
                  })
                  if (start + pageSize < ids.length) {
                    options.push({
                      text: 'Next page',
                      action: { event: this.event, method: 'openDeadHouses', context: { page: page + 1 } }
                    })
                  }
                  if (page > 0) {
                    options.push({
                      text: 'Previous page',
                      action: { event: this.event, method: 'openDeadHouses', context: { page: page - 1 } }
                    })
                  }
                  options.push({
                    text: 'Back',
                    action: { event: this.event, method: 'openLog' }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Dead Houses',
                    message: ids.length ? 'Extinct houses are removed from active Society orders but kept here for history and family-tree inspection.' : 'No houses have gone extinct yet.',
                    image: this.affairIcon('death'),
                    options
                  })
                },
        openDeadHouse({ houseId, page } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.deadHouses && society.deadHouses[houseId]
                  if (!house) {
                    this.openDeadHouses({ page })
                    return
                  }
                  let memberIds = (house.deadMemberIds || house.memberIds || []).filter((characterId) => state.characters && state.characters[characterId])
                  let knownMembers = memberIds.length
                  let lastLiving = memberIds
                    .map((characterId) => state.characters[characterId])
                    .filter((character) => character && !character.isDead)
                    .length
                  let options = []
                  if (memberIds.length) {
                    options.push({
                      variant: 'info',
                      text: 'Family tree',
                      tooltip: 'Open the archived graphical tree for this extinct house.',
                      icons: [this.assetIcon('familyTree')],
                      action: { event: this.event, method: 'openDeadHouseFamilyTree', context: { houseId, page } }
                    })
                  }
                  options.push({
                    text: 'Back',
                    action: { event: this.event, method: 'openDeadHouses', context: { page: page || 0 } }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: house.name,
                    message: 'Extinct house record.',
                    societySummaryOptions: [
                      this.summaryOption('Order', this.stratumTitle(house.stratum), [this.stratumIcon(house.stratum)], 'Final Society order before extinction.'),
                      this.summaryOption('Extinct', house.extinctDate || 'unknown', [this.affairIcon('death')], 'Date recorded by Roman Society.'),
                      this.summaryOption('Known members', knownMembers + ' recorded; ' + lastLiving + ' living', [this.assetIcon('familyTree')], 'Archived members remain available for tree inspection.'),
                      this.summaryOption('Last affair', house.lastFamilyEvent || 'No final record.', [this.affairIcon(house.lastFamilyKind || 'log')], 'Last known Society note for this house.')
                    ],
                    image: this.houseCrestIcon(society, house),
                    options
                  })
                },
        openDeadHouseFamilyTree({ houseId, page, origin } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.deadHouses && society.deadHouses[houseId]
                  origin = origin || { method: 'openDeadHouse', context: { houseId, page: page || 0 } }
                  if (!house) {
                    this.openDeadHouses({ page })
                    return
                  }
                  let memberIds = (house.deadMemberIds || house.memberIds || []).filter((characterId) => state.characters && state.characters[characterId])
                  let characterId = memberIds[0]
                  if (!characterId) {
                    this.openDeadHouse({ houseId, page })
                    return
                  }
                  this.openGraphicalFamilyTree({
                    society,
                    state,
                    house,
                    houseId,
                    characterId,
                    group: '',
                    page: 0,
                    mode: 'house',
                    returnTo: 'deadHouse',
                    returnPage: page || 0,
                    origin
                  })
                },
        openPlayerCrest() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let character = state.characters[this.currentCharacterId(state)] || {}
                  let dynasty = state.dynasties[character.dynastyId] || {}
                  let crest = this.ensurePlayerCrest(society, state)
                  this.save(society)
                  this.applyPlayerCrestOverlay()
                  let houseName = this.houseName(dynasty, character.dynastyId || 'player')
                  let overlayText = society.crestSettings.playerOverlay ? 'On' : 'Off'
                  let message = [
                    'Player house: ' + houseName,
                    'Current character: ' + (character.praenomen || 'Unknown'),
                    'Portrait badge: ' + overlayText,
                    'This menu only edits the player house shield.'
                  ].join('\n')
                  let image = this.crestIcon(crest, 132)
                  this.pushModal({
                    societyMenu: true,
                    title: 'House Shield',
                    message,
                    image,
                    options: [
                      {
                        variant: 'info',
                        text: 'Randomize',
                        tooltip: 'Generate a fresh Roman-style shield for the player house.',
                        icons: [image],
                        action: {
                          event: this.event,
                          method: 'randomizePlayerCrest'
                        }
                      },
                      this.crestCycleOption('Field', 'field', crest),
                      this.crestCycleOption('Metal', 'metal', crest),
                      this.crestCycleOption('Accent', 'accent', crest),
                      this.crestCycleOption('Shape', 'shape', crest),
                      this.crestCycleOption('Division', 'division', crest),
                      this.crestCycleOption('Pattern', 'pattern', crest),
                      this.crestCycleOption('Charge', 'charge', crest),
                      this.crestCycleOption('Border', 'border', crest),
                      {
                        text: 'Portrait badge: ' + overlayText,
                        tooltip: 'Show the player house shield above the current player portrait when the mod can find it in the UI.',
                        action: {
                          event: this.event,
                          method: 'togglePlayerCrestOverlay'
                        }
                      },
                      {
                        text: 'Close'
                      }
                    ].filter(Boolean)
                  })
                },
        randomizePlayerCrest() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let crestId = this.playerCrestId(state)
                  society.crests[crestId] = this.generateCrest(crestId + '-player-' + Date.now() + '-' + Math.random())
                  society.crests[crestId].custom = true
                  this.save(society)
                  this.applyPlayerCrestOverlay()
                  this.openPlayerCrest()
                },
        cyclePlayerCrest({ part }) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let crest = this.ensurePlayerCrest(society, state)
                  let list = this.crestList(part)
                  if (list.length) {
                    let index = list.indexOf(crest[part])
                    crest[part] = list[(index + 1 + list.length) % list.length]
                    crest.custom = true
                    crest.seed = String(crest.seed || '') + '-' + part + '-' + crest[part]
                  }
                  this.save(society)
                  this.applyPlayerCrestOverlay()
                  this.openPlayerCrest()
                },
        togglePlayerCrestOverlay() {
                  let society = this.ensure()
                  society.crestSettings.playerOverlay = !society.crestSettings.playerOverlay
                  this.save(society)
                  if (society.crestSettings.playerOverlay) {
                    this.applyPlayerCrestOverlay()
                  } else {
                    this.clearPlayerCrestOverlay()
                  }
                  this.openPlayerCrest()
                },
        openWardrobe() {
                  let state = daapi.getState()
                  let members = this.playerFamilyMembers(state).filter((character) => !character.isDead)
                  let options = members.slice(0, 14).map((character) => {
                    return {
                      text: this.characterName(character, state),
                      tooltip: this.characterTooltip(character, state) + '\nCurrent outfit: ' + this.outfitLabel(character.corSocietyOutfit || 'auto'),
                      icons: [this.characterPortrait(character, state)],
                      action: {
                        event: this.event,
                        method: 'openWardrobeCharacter',
                        context: { characterId: character.id }
                      }
                    }
                  })
                  options.push({ text: 'Close' })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Family Wardrobe',
                    message: 'Choose a household member. Available clothing follows your current Society order and the character age.',
                    image: daapi.requireImage('/cor_society/assets/wardrobe.svg'),
                    options
                  })
                },
        openWardrobeCharacter({ characterId } = {}) {
                  let state = daapi.getState()
                  let character = (state.characters || {})[characterId]
                  if (!character || this.playerFamilyMemberIds(state).indexOf(characterId) < 0) {
                    this.openWardrobe()
                    return
                  }
                  character.id = character.id || characterId
                  let outfits = this.wardrobeOptionsForCharacter(character, state)
                  let options = outfits.map((outfit) => {
                    return {
                      text: this.outfitLabel(outfit) + (character.corSocietyOutfit === outfit || (!character.corSocietyOutfit && outfit === 'auto') ? ' (current)' : ''),
                      tooltip: 'Visual clothing only. Does not change stats, class, genetics, or vanilla look data.',
                      icons: [this.characterPortraitWithOutfit(character, state, outfit)],
                      action: {
                        event: this.event,
                        method: 'applyWardrobeOutfit',
                        context: { characterId, outfit }
                      }
                    }
                  })
                  options.push({
                    text: 'Back',
                    action: {
                      event: this.event,
                      method: 'openWardrobe'
                    }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Wardrobe: ' + this.characterName(character, state),
                    message: 'Society order: ' + this.stratumTitle(this.playerStratum(state)) + '\nCurrent outfit: ' + this.outfitLabel(character.corSocietyOutfit || 'auto'),
                    image: this.characterPortrait(character, state),
                    options
                  })
                },
        applyWardrobeOutfit({ characterId, outfit } = {}) {
                  let state = daapi.getState()
                  let character = (state.characters || {})[characterId]
                  if (!character || this.playerFamilyMemberIds(state).indexOf(characterId) < 0) {
                    this.openWardrobe()
                    return
                  }
                  character.id = character.id || characterId
                  if (outfit && outfit !== 'auto') {
                    this.applyWardrobeLookToCharacter(character, outfit, state)
                  } else {
                    delete character.corSocietyOutfit
                    this.restoreOriginalLookIfNeeded(character, true)
                    try {
                      daapi.updateCharacter({ characterId, character: { corSocietyOutfit: '' } })
                    } catch (err) {
                      console.warn(err)
                    }
                  }
                  try {
                    this.wardrobeOutfitCache = false
                    if (daapi.forceUpdateCharacterDisplay) {
                      daapi.forceUpdateCharacterDisplay({ characterId })
                    }
                    this.applyPortraitOverlays()
                  } catch (err) {
                    console.warn(err)
                  }
                  this.openWardrobeCharacter({ characterId })
                },
        wardrobeOptionsForCharacter(character, state) {
                  let ageStage = this.characterAgeStage(this.age(character, state))
                  let gender = character.gender || ((character.look || {}).gender) || (character.isMale ? 'male' : 'female')
                  let stratum = this.playerStratum(state)
                  let role = this.characterPortraitRole(character, ageStage, stratum)
                  let options = ['auto'].concat(this.clothingOptions(gender, ageStage, role, stratum))
                  if (stratum === 'senatorial') {
                    options = options.concat(gender === 'female' ? ['palla', 'purplePalla', 'whiteStola'] : ['senatorToga', 'togaPraetexta', 'togaCandida'])
                  } else if (stratum === 'equestrian') {
                    options = options.concat(['equestrianTunic', 'citizenToga', 'mantle'])
                  } else if (stratum === 'poor' || stratum === 'freedmen') {
                    options = options.concat(['simpleTunic', 'workerTunic', 'brownMantle'])
                  } else {
                    options = options.concat(gender === 'female' ? ['stola', 'palla', 'whiteStola'] : ['citizenToga', 'whiteToga', 'mantle', 'simpleTunic'])
                  }
                  return options.filter((item, index, list) => item && list.indexOf(item) === index)
                },
        outfitLabel(outfit) {
                  let labels = {
                    auto: 'Automatic',
                    senatorToga: 'Senatorial toga',
                    togaPraetexta: 'Toga praetexta',
                    togaCandida: 'Toga candida',
                    citizenToga: 'Citizen toga',
                    whiteToga: 'Plain white toga',
                    equestrianTunic: 'Equestrian tunic',
                    mantle: 'Mantle',
                    simpleTunic: 'Simple tunic',
                    workerTunic: 'Worker tunic',
                    brownMantle: 'Brown mantle',
                    militaryCloak: 'Military cloak',
                    armoredTunic: 'Armored tunic',
                    redMantle: 'Red mantle',
                    stola: 'Stola',
                    whiteStola: 'White stola',
                    palla: 'Palla',
                    purplePalla: 'Purple palla',
                    childStola: 'Child stola',
                    childTunic: 'Child tunic'
                  }
                  return labels[outfit] || String(outfit || 'Automatic')
                },
        characterPortraitWithOutfit(character, state, outfit) {
                  if (!outfit || outfit === 'auto') {
                    let originalLook = this.originalLookForWardrobe(character)
                    let clone = {
                      ...character,
                      corSocietyOutfit: '',
                      look: originalLook && originalLook.group ? this.cloneWardrobeLook(originalLook) : this.cloneWardrobeLook(character.look || {})
                    }
                    return this.vanillaCharacterPortrait(clone, state) || this.genericVanillaCharacterPortrait(clone, state)
                  }
                  let clone = { ...character, look: this.cloneWardrobeLook(character.look || {}), corSocietyOutfit: outfit }
                  return this.nativeCharacterPortraitWithOutfit(clone, state, false, outfit)
                },
        openHouse({ houseId, returnTo, returnPage } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  if (!house) {
                    this.openHub()
                    return
                  }
                  // House and person actions reopen the house with only its id. Keep the list it was
                  // entered from (Allies, Rivals, a dynasty), so Back still returns there instead of
                  // the house's stratum list. Memory only; openHub forgets it.
                  if (returnTo) {
                    this._houseReturn = { houseId: String(houseId), returnTo, returnPage }
                  } else if (this._houseReturn && this._houseReturn.houseId === String(houseId)) {
                    returnTo = this._houseReturn.returnTo
                    returnPage = this._houseReturn.returnPage
                  }
                  let profile = this.strata[house.stratum] || this.strata.plebeian
                  let cash = parseFloat((state.current || {}).cash || 0)
                  let giftCost = this.actionCost(house, 'gift')
                  let dinnerCost = this.actionCost(house, 'dinner')
                  let canAsk = (house.favor || 0) > 0 || (house.relation || 0) >= 28
                  let marriageInfo = this.marriageOptionInfo(society, state, house)
                  let tradeActive = this.houseTradeActive(house, state)
                  let nav = this.navContext(returnTo, returnPage)
                  let ownHouse = this.isCurrentPlayerHouse(house, state)
                  this.pushModal({
                    societyMenu: true,
                    title: house.name,
                    message: 'House summary.',
                    societySummaryOptions: this.houseSummaryOptions(society, state, house, profile, tradeActive),
                    image: this.houseCrestIcon(society, house),
                    options: [
                      {
                        variant: 'info',
                        text: 'Members',
                        icons: [this.affairIcon('familyTree')],
                        action: {
                          event: this.event,
                          method: 'openMemberGroups',
                          context: { houseId, ...nav }
                        }
                      },
                      {
                        variant: 'info',
                        text: 'House tree',
                        tooltip: 'Open this house branch as an extracted view from the same complete dynasty tree.',
                        icons: [this.affairIcon('familyTree'), this.houseCrestIcon(society, house)],
                        action: {
                          event: this.event,
                          method: 'openHouseFamilyTree',
                          context: { houseId, ...nav }
                        }
                      },
                      {
                        variant: 'info',
                        text: 'Dynasty tree',
                        tooltip: 'Open the complete graphical dynasty tree, including all known branches and houses of this dynasty.',
                        icons: [this.affairIcon('familyTree')],
                        action: {
                          event: this.event,
                          method: 'openDynastyTree',
                          context: { dynastyId: this.gameDynastyIdForHouse(house), ...nav, origin: { method: 'openHouse', context: { houseId, ...nav } } }
                        }
                      },
                      ownHouse ? false : {
                        variant: 'info',
                        text: 'Arrange marriage' + (marriageInfo.note ? ' (' + marriageInfo.note + ')' : ''),
                        disabled: !marriageInfo.available,
                        showDisabledWithTooltip: true,
                        tooltip: marriageInfo.tooltip,
                        icons: [this.affairIcon('marriage')],
                        action: {
                          event: this.event,
                          method: 'openMarriageHousehold',
                          context: { houseId, ...nav }
                        }
                      },
                      ownHouse ? false : {
                        text: 'Send gift (' + giftCost + ')',
                        disabled: cash < giftCost,
                        showDisabledWithTooltip: true,
                        tooltip: 'Spend cash to improve relations and possibly earn a favor.',
                        icons: [this.affairIcon('gift')],
                        action: {
                          event: this.event,
                          method: 'sendGift',
                          context: { houseId, ...nav }
                        }
                      },
                      ownHouse ? false : {
                        text: 'Host dinner (' + dinnerCost + ')',
                        disabled: cash < dinnerCost,
                        showDisabledWithTooltip: true,
                        tooltip: 'A wider social gesture. Improves relations and prestige.',
                        icons: [this.affairIcon('prestige')],
                        action: {
                          event: this.event,
                          method: 'hostDinner',
                          context: { houseId, ...nav }
                        }
                      },
                      ownHouse ? false : {
                        variant: 'info',
                        text: 'Ask for support',
                        disabled: !canAsk,
                        showDisabledWithTooltip: true,
                        tooltip: 'Requires a favor or a warm relationship. Grants influence.',
                        icons: [this.affairIcon('support')],
                        action: {
                          event: this.event,
                          method: 'askSupport',
                          context: { houseId, ...nav }
                        }
                      },
                      ownHouse ? false : {
                        text: tradeActive ? 'Trade active until ' + house.tradeUntil : 'Negotiate trade',
                        disabled: (house.relation || 0) < 5 || tradeActive,
                        showDisabledWithTooltip: true,
                        tooltip: tradeActive ? 'This house already has one active trade compact with you. It cannot stack.' : 'Build one temporary revenue tie with this house. It breaks if relations collapse.',
                        icons: [this.affairIcon('tradeVenture')],
                        action: {
                          event: this.event,
                          method: 'tradeDeal',
                          context: { houseId, ...nav }
                        }
                      },
                      ownHouse ? false : this.patronageOption(house),
                      ownHouse ? false : {
                        variant: house.rivalry ? 'info' : 'danger',
                        text: house.rivalry ? 'Seek reconciliation' : 'Declare rivalry',
                        icons: [this.affairIcon(house.rivalry ? 'support' : 'rivalry')],
                        action: {
                          event: this.event,
                          method: house.rivalry ? 'reconcile' : 'startRivalry',
                          context: { houseId, ...nav }
                        }
                      },
                      ...(ownHouse ? this.ownHouseOptions(society, state, house, nav) : []),
                      {
                        text: 'Back',
                        action: this.houseBackAction(house, returnTo, returnPage)
                      }
                    ].filter(Boolean)
                  })
                },
        ownHouseOptions(society, state, house, nav) {
                  let cash = parseFloat((state.current || {}).cash || 0)
                  let councilReady = !house.nextFamilyCouncilMonth || this.monthKeyReached(house.nextFamilyCouncilMonth, state)
                  let ritesReady = !house.nextHouseholdRitesMonth || this.monthKeyReached(house.nextHouseholdRitesMonth, state)
                  let ritesCost = Math.max(20, Math.round(this.actionCost(house, 'dinner') * 0.45))
                  return [
                    {
                      variant: 'info',
                      text: councilReady ? 'Call family council' : 'Call family council (cooldown)',
                      disabled: !councilReady,
                      showDisabledWithTooltip: true,
                      tooltip: councilReady
                        ? 'Gather your household to settle priorities. Consequences: +12 influence, +6 prestige, improves close-family relations and house stability.'
                        : 'Family council is cooling down until ' + house.nextFamilyCouncilMonth + '.',
                      statChanges: councilReady ? { influence: 12, prestige: 6 } : {},
                      icons: [this.affairIcon('familyTree'), this.affairIcon('support')],
                      action: { event: this.event, method: 'callFamilyCouncil', context: { houseId: house.id, ...nav } }
                    },
                    {
                      variant: 'info',
                      text: 'Household rites (' + ritesCost + ')',
                      disabled: !ritesReady || cash < ritesCost,
                      showDisabledWithTooltip: true,
                      tooltip: !ritesReady
                        ? 'Household rites are cooling down until ' + house.nextHouseholdRitesMonth + '.'
                        : cash < ritesCost
                          ? 'Need ' + ritesCost + ' cash.'
                          : 'Sponsor private family rites and household hospitality. Consequences: -' + ritesCost + ' cash, +12 prestige, +4 influence, improves house stability and cools internal heat.',
                      statChanges: ritesReady ? { cash: -ritesCost, prestige: 12, influence: 4 } : {},
                      icons: [this.affairIcon('prestige'), this.affairIcon('coins')],
                      action: { event: this.event, method: 'holdHouseholdRites', context: { houseId: house.id, cost: ritesCost, ...nav } }
                    },
                    {
                      variant: 'info',
                      text: 'Review family affairs',
                      tooltip: 'Open your household member groups. Consequences: no stats change.',
                      icons: [this.affairIcon('familyTree')],
                      action: { event: this.event, method: 'openMemberGroups', context: { houseId: house.id, ...nav } }
                    }
                  ]
                },
        navContext(returnTo, returnPage) {
                  let nav = {}
                  if (returnTo) nav.returnTo = returnTo
                  if (returnPage !== undefined && returnPage !== null) nav.returnPage = returnPage
                  return nav
                },
        houseBackAction(house, returnTo, returnPage) {
                  if (returnTo === 'allies') {
                    return { event: this.event, method: 'openAllies', context: { page: returnPage || 0 } }
                  }
                  if (returnTo === 'rivals') {
                    return { event: this.event, method: 'openRivals', context: { page: returnPage || 0 } }
                  }
                  if (returnTo === 'hub') {
                    return { event: this.event, method: 'openHub' }
                  }
                  if (returnTo === 'dynasty') {
                    return { event: this.event, method: 'openDynasty', context: { dynastyId: this.gameDynastyIdForHouse(house), stratum: house.stratum, page: returnPage || 0 } }
                  }
                  return { event: this.event, method: 'openEstate', context: { stratum: house.stratum, page: 0 } }
                },
        openPeople({ houseId, returnTo, returnPage } = {}) {
                  this.openMemberGroups({ houseId, returnTo, returnPage })
                },
        openMemberGroups({ houseId, returnTo, returnPage } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  if (!house) {
                    this.openHub()
                    return
                  }
                  this.refreshHouseMemberLists(society, state, house)
                  let groups = this.houseMemberGroups(house, state)
                  let order = ['notable', 'established', 'common', 'slaves']
                  let nav = this.navContext(returnTo, returnPage)
                  let options = order.map((group) => {
                    let count = (groups[group] || []).length
                    return {
                      variant: 'info',
                      text: this.memberGroupLabel(group) + ' (' + count + ')',
                      tooltip: count ? this.memberGroupDescription(group) : 'No living members are currently known in this category.',
                      disabled: !count,
                      showDisabledWithTooltip: true,
                      icons: [this.memberGroupIcon(group)],
                      action: {
                        event: this.event,
                        method: 'openMemberGroup',
                        context: { houseId, group, page: 0, ...nav }
                      }
                    }
                  })
                  options.push({
                    text: 'Back',
                    action: {
                      event: this.event,
                      method: 'openHouse',
                      context: { houseId, ...nav }
                    }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Members of ' + house.name,
                    message: 'Every known living member of this dynasty is grouped by public standing, household role, and career.',
                    image: this.houseCrestIcon(society, house),
                    options
                  })
                },
        openMemberGroup({ houseId, group, page, returnTo, returnPage } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  if (!house) {
                    this.openHub()
                    return
                  }
                  this.refreshHouseMemberLists(society, state, house)
                  group = group || 'notable'
                  page = parseInt(page || 0, 10)
                  let groups = this.houseMemberGroups(house, state)
                  let peopleIds = groups[group] || []
                  let pageSize = 8
                  let start = page * pageSize
                  let shown = peopleIds.slice(start, start + pageSize)
                  let nav = this.navContext(returnTo, returnPage)
                  let options = shown.map((characterId) => {
                    let character = state.characters[characterId]
                    let relationVisual = character ? this.relationVisual(society, state, character) : false
                    let traitIcons = character ? this.societyTraitIconList(society, character) : []
                    return {
                      text: character ? this.characterName(character, state) : characterId,
                      tooltip: character ? this.characterTooltip(character, state) + '\nCategory: ' + this.memberGroupLabel(group) + (relationVisual ? '\n' + relationVisual.tooltip : '') + '\nSociety traits: ' + this.socialTraitSummary(society, character) : '',
                      icons: character ? [this.characterPortrait(character, state, house)].concat(relationVisual ? [relationVisual.icon] : []).concat([this.houseCrestIcon(society, house)]).concat(traitIcons) : [this.houseCrestIcon(society, house)],
                      action: {
                        event: this.event,
                        method: 'openPerson',
                        context: { houseId, characterId, group, page, ...nav }
                      }
                    }
                  })
                  if (start + pageSize < peopleIds.length) {
                    options.push({
                      text: 'Next page',
                      action: {
                        event: this.event,
                        method: 'openMemberGroup',
                        context: { houseId, group, page: page + 1, ...nav }
                      }
                    })
                  }
                  if (page > 0) {
                    options.push({
                      text: 'Previous page',
                      action: {
                        event: this.event,
                        method: 'openMemberGroup',
                        context: { houseId, group, page: page - 1, ...nav }
                      }
                    })
                  }
                  options.push({
                    text: 'Back',
                    action: {
                      event: this.event,
                      method: 'openMemberGroups',
                      context: { houseId, ...nav }
                    }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: this.memberGroupLabel(group) + ' of ' + house.name,
                    message: peopleIds.length ? this.memberGroupDescription(group) + '\nPage ' + (page + 1) + ' of ' + Math.max(1, Math.ceil(peopleIds.length / pageSize)) + '.' : 'No living members are currently known in this category.',
                    image: this.memberGroupIcon(group),
                    options
                  })
                },
        characterSocialRecord(society, characterId, create) {
                  society.characterSocial = society.characterSocial || {}
                  let key = String(characterId || '')
                  if (!key) {
                    return {}
                  }
                  if (!society.characterSocial[key] && create !== false) {
                    society.characterSocial[key] = {
                      introduced: false,
                      bond: 0,
                      nextInviteMonth: '',
                      nextCourtMonth: '',
                      lastVisitMonth: ''
                    }
                  }
                  return society.characterSocial[key] || {}
                },
        societyKinshipContext(society, state, house, character) {
                  state = state || daapi.getState()
                  let characters = state.characters || {}
                  let currentId = this.currentCharacterId(state)
                  let player = characters[currentId] || state.current || {}
                  let characterId = character && character.id
                  let close = {}
                  let add = (id) => {
                    if (id !== undefined && id !== null && id !== '') {
                      close[String(id)] = true
                    }
                  }
                  let addCharacterRelatives = (person) => {
                    if (!person) return
                    add(person.id)
                    add(person.spouseId)
                    add(person.fatherId)
                    add(person.motherId)
                    ;(person.childrenIds || []).forEach(add)
                  }
                  player.id = player.id || currentId
                  addCharacterRelatives(player)
                  ;[player.fatherId, player.motherId].forEach((parentId) => {
                    let parent = characters[parentId]
                    if (parent) {
                      add(parent.fatherId)
                      add(parent.motherId)
                      ;(parent.childrenIds || []).forEach(add)
                    }
                  })
                  ;(player.childrenIds || []).forEach((childId) => {
                    let child = characters[childId]
                    if (child) {
                      add(child.spouseId)
                      ;(child.childrenIds || []).forEach(add)
                    }
                  })
                  let playerRelatives = this.familyTreeRelatives(player, state)
                  ;(playerRelatives.siblings || []).forEach((siblingId) => {
                    add(siblingId)
                    let sibling = characters[siblingId]
                    if (sibling) {
                      add(sibling.spouseId)
                      ;(sibling.childrenIds || []).forEach(add)
                    }
                  })
                  Object.keys(close).forEach((id) => {
                    let closeCharacter = characters[id]
                    if (closeCharacter && closeCharacter.spouseId) {
                      add(closeCharacter.spouseId)
                    }
                  })
                  if (!characterId) {
                    return { kind: 'outsider', label: 'Outsider', text: 'Request introduction', icon: this.affairIcon('support') }
                  }
                  if (this.sameCharacterId(characterId, currentId)) {
                    return { kind: 'self', label: 'Current character', text: 'Personal affairs', icon: this.assetIcon('familyTree') }
                  }
                  if (close[String(characterId)]) {
                    let spouse = this.sameCharacterId(character.spouseId, currentId) || this.sameCharacterId(player.spouseId, characterId)
                    return {
                      kind: spouse ? 'spouse' : 'family',
                      label: spouse ? 'Spouse' : 'Close family',
                      text: spouse ? 'Spend time with spouse' : 'Family conversation',
                      icon: this.assetIcon('familyTree')
                    }
                  }
                  let targetHouseId = this.houseIdForCharacter(character, state, society) || (house && house.id) || ''
                  let playerHouseId = this.houseIdForCharacter(player, state, society) || this.currentCharacterDynastyId(state)
                  if (targetHouseId && playerHouseId && String(targetHouseId) === String(playerHouseId)) {
                    return { kind: 'house', label: 'Same house', text: 'Household council', icon: this.houseCrestIcon(society, house || society.houses[targetHouseId]) }
                  }
                  let targetDynastyId = character.dynastyId || this.gameDynastyIdForHouse(house)
                  let playerDynastyId = player.dynastyId || this.currentCharacterDynastyId(state)
                  if (targetDynastyId && playerDynastyId && String(targetDynastyId) === String(playerDynastyId)) {
                    return { kind: 'dynasty', label: 'Same dynasty', text: 'Dynasty audience', icon: this.assetIcon('familyTree') }
                  }
                  return { kind: 'outsider', label: 'Outsider', text: 'Request introduction', icon: this.affairIcon('support') }
                },
        socialVisitOption(society, state, house, character, nav) {
                  let characterId = character && character.id
                  let kinship = this.societyKinshipContext(society, state, house, character)
                  // No self-directed social visit: you do not invite yourself over.
                  if (kinship.kind === 'self') {
                    return false
                  }
                  let social = this.characterSocialRecord(society, characterId, false)
                  if (kinship.kind !== 'outsider') {
                    let cooldown = social.nextInviteMonth && !this.monthKeyReached(social.nextInviteMonth, state)
                    return {
                      variant: 'info',
                      text: kinship.text,
                      disabled: kinship.kind === 'self' || !!cooldown,
                      showDisabledWithTooltip: true,
                      tooltip: kinship.kind === 'self'
                        ? 'This is the character you currently control.'
                        : cooldown
                          ? kinship.label + ' interaction is cooling down until ' + social.nextInviteMonth + '.'
                          : 'No introduction is needed: ' + kinship.label.toLowerCase() + '. This uses a dedicated ' + kinship.label.toLowerCase() + ' interaction instead of a public presentation.',
                      icons: [kinship.icon],
                      action: {
                        event: this.event,
                        method: 'inviteHomeTalk',
                        context: { houseId: house.id, characterId, visitKind: kinship.kind }
                      }
                    }
                  }
                  if (!social.introduced) {
                    return {
                      variant: 'info',
                      text: 'Request introduction',
                      disabled: (house.relation || 0) < 10,
                      showDisabledWithTooltip: true,
                      tooltip: 'Warm relations let this person introduce you to useful contacts. This can only be used once for this character.',
                      icons: [this.affairIcon('support')],
                      action: {
                        event: this.event,
                        method: 'requestIntroduction',
                        context: { houseId: house.id, characterId }
                      }
                    }
                  }
                  let cooldown = social.nextInviteMonth && !this.monthKeyReached(social.nextInviteMonth, state)
                  return {
                    variant: 'info',
                    text: 'Invite home to talk',
                    disabled: !!cooldown,
                    showDisabledWithTooltip: true,
                    tooltip: cooldown ? 'This person recently visited. Available again after ' + social.nextInviteMonth + '.' : 'A private household visit can build rapport, improve house relation, and sometimes start a small social event.',
                    icons: [this.affairIcon('invitation')],
                    action: {
                      event: this.event,
                      method: 'inviteHomeTalk',
                      context: { houseId: house.id, characterId }
                    }
                  }
                },
        kinshipSupportOption(society, state, house, character) {
                  let kinship = this.societyKinshipContext(society, state, house, character)
                  if (!kinship || ['spouse', 'family', 'house', 'dynasty'].indexOf(kinship.kind) < 0) {
                    return false
                  }
                  let text = kinship.kind === 'spouse'
                    ? 'Support spouse'
                    : kinship.kind === 'family'
                      ? 'Support family member'
                      : kinship.kind === 'house'
                        ? 'Reinforce house ties'
                        : 'Reinforce dynasty ties'
                  let tooltip = kinship.kind === 'spouse' || kinship.kind === 'family'
                    ? 'Special family action. Consequences: improves personal relation and gives a small prestige gain; no formal introduction is used.'
                    : 'Special house/dynasty action. Consequences: improves personal relation and house ties; no formal introduction is used.'
                  let supportSocial = this.characterSocialRecord(society, character.id, false) || {}
                  let supportCooling = !!(supportSocial.nextSupportMonth && !this.monthKeyReached(supportSocial.nextSupportMonth, state))
                  return {
                    variant: 'info',
                    text,
                    disabled: supportCooling,
                    showDisabledWithTooltip: true,
                    tooltip: supportCooling ? 'You supported this person recently. Available again after ' + supportSocial.nextSupportMonth + '. ' : tooltip + ' 3 month cooldown per person.',
                    icons: [kinship.icon],
                    action: {
                      event: this.event,
                      method: 'supportKinshipCharacter',
                      context: { houseId: house.id, characterId: character.id, visitKind: kinship.kind }
                    }
                  }
                },
        romanceOption(society, state, house, character) {
                  let currentId = this.currentCharacterId(state)
                  let player = state.characters[currentId] || state.current || {}
                  let characterId = character && character.id
                  // You cannot court yourself, and you cannot court close family (children,
                  // parents, siblings, grandparents/grandchildren, or in-laws). Only the spouse
                  // route below is allowed within the family. Everyone else can be courted.
                  let kinship = this.societyKinshipContext(society, state, house, character)
                  if (!characterId || this.sameCharacterId(currentId, characterId) || kinship.kind === 'self') {
                    return false
                  }
                  let isSpouse = !!(player && player.spouseId && this.sameCharacterId(player.spouseId, characterId)) || kinship.kind === 'spouse'
                  if (kinship.kind === 'family' && !isSpouse) {
                    return false
                  }
                  // Spouses use a dedicated marital route (no introduction/courtship needed):
                  // near-certain success and a real chance to conceive via the pregnancy system.
                  if (isSpouse) {
                    let playerAgeSpouse = this.age(player, state)
                    let targetAgeSpouse = this.age(character, state)
                    let blocked = playerAgeSpouse < 13 || targetAgeSpouse < 13
                    return {
                      variant: 'info',
                      text: 'Lie together',
                      disabled: blocked,
                      showDisabledWithTooltip: true,
                      tooltip: blocked ? 'Both spouses must be at least 13.' : 'Spend an intimate night with your spouse. Strengthens your bond and may lead to a pregnancy when the couple can conceive.',
                      icons: [this.affairIcon('romance')],
                      action: {
                        event: this.event,
                        method: 'courtSpouse',
                        context: { houseId: house.id, characterId }
                      }
                    }
                  }
                  let social = this.characterSocialRecord(society, characterId, false)
                  let romance = this.getRomance(society, currentId, characterId)
                  let playerAge = this.age(player, state)
                  let targetAge = this.age(character, state)
                  let disabled = false
                  let tooltip = ''
                  if (!currentId || this.sameCharacterId(currentId, characterId)) {
                    disabled = true
                    tooltip = 'You cannot court yourself.'
                  } else if (playerAge < 13 || targetAge < 13) {
                    disabled = true
                    tooltip = 'Characters younger than 13 cannot become lovers or be courted.'
                  } else if (!social.introduced) {
                    disabled = true
                    tooltip = 'Request an introduction first.'
                  } else if (social.nextCourtMonth && !this.monthKeyReached(social.nextCourtMonth, state)) {
                    disabled = true
                    tooltip = 'Courtship is cooling down until ' + social.nextCourtMonth + '.'
                  } else {
                    let risk = this.romanceBaseRisk(player, character, state)
                    tooltip = romance ? 'Meet your lover privately. Higher intensity improves the bond but increases scandal risk.' : 'Attempt to turn rapport into a lover relationship. Works regardless of gender; pregnancy only applies when the couple can conceive.'
                    tooltip += '\nScandal risk: ' + (risk >= 55 ? 'high' : risk >= 30 ? 'moderate' : 'low') + '.'
                  }
                  return {
                    variant: romance ? 'info' : 'danger',
                    text: romance ? 'Meet lover' : 'Court privately',
                    disabled,
                    showDisabledWithTooltip: true,
                    tooltip,
                    icons: [this.affairIcon('romance')],
                    action: {
                      event: this.event,
                      method: 'courtCharacter',
                      context: { houseId: house.id, characterId }
                    }
                  }
                },
        matchmakerOption(state, character) {
                  let characterId = character && character.id
                  let eligible = characterId && this.isPlayerFamilyCharacter(state, characterId) && this.isMarriageEligible(character, state)
                  return {
                    variant: 'info',
                    text: 'Coemptio matchmaker',
                    disabled: !eligible,
                    showDisabledWithTooltip: true,
                    tooltip: eligible ? 'Search Society houses for compatible real spouse candidates.' : 'Only unmarried adult members of your household can use Coemptio.',
                    icons: [this.bundledIcon('coemptio', 'marriage')],
                    action: {
                      event: this.event,
                      method: 'openMatchmaker',
                      context: { characterId }
                    }
                  }
                },
        buyEnslavedPersonOption(society, state, house, character, nav) {
                  if (!house || !character || !character.id) {
                    return false
                  }
                  let info = this.enslavedPurchaseInfo(society, state, house, character)
                  if (!info.available && !info.visible) {
                    return false
                  }
                  return {
                    variant: info.available ? 'info' : 'danger',
                    text: info.available ? 'Negotiate purchase (' + info.cost + ')' : 'Purchase unavailable (' + info.reason + ')',
                    disabled: !info.available,
                    showDisabledWithTooltip: true,
                    tooltip: info.tooltip,
                    icons: [this.slaveTypeIcon(info.type), this.affairIcon('coins')],
                    action: {
                      event: this.event,
                      method: 'buyEnslavedCharacter',
                      context: { houseId: house.id, characterId: character.id, cost: info.cost, ...nav }
                    }
                  }
                },
        openPerson({ houseId, characterId, group, page, returnTo, returnPage } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  let character = state.characters[characterId]
                  if (!house || !character) {
                    this.openHouse({ houseId, returnTo, returnPage })
                    return
                  }
                  character.id = character.id || characterId
                  if (this.isSlaveCharacter(character, house)) {
                    this.openSlavePerson({ houseId, characterId, group, page, returnTo, returnPage })
                    return
                  }
                  let nav = this.navContext(returnTo, returnPage)
                  let vanillaActions = this.vanillaCharacterActions(character)
                  let relatives = this.familyTreeRelatives(character, state)
                  let currentId = this.currentCharacterId(state)
                  let social = this.characterSocialRecord(society, characterId, false)
                  let romance = this.getRomance(society, currentId, characterId)
                  let kinship = this.societyKinshipContext(society, state, house, character)
                  let isSelf = !!(currentId && this.sameCharacterId(currentId, characterId))
                  let relationScore = currentId && !this.sameCharacterId(currentId, characterId) ? this.personalRelationScore(society, state, currentId, characterId) : 0
                  let relationRecord = currentId && !this.sameCharacterId(currentId, characterId) ? this.personalRelationRecord(society, currentId, characterId, false) : false
                  let backAction = group ? {
                    event: this.event,
                    method: 'openMemberGroup',
                    context: { houseId, group, page: page || 0, ...nav }
                  } : {
                    event: this.event,
                    method: 'openMemberGroups',
                    context: { houseId, ...nav }
                  }
                  this.pushModal({
                    societyMenu: true,
                    title: this.characterName(character, state),
                    message: 'Character summary.',
                    societySummaryOptions: this.personSummaryOptions(society, state, house, character, relatives, social, romance, relationScore, relationRecord, currentId, characterId),
                    image: this.characterPortrait(character, state, house),
                    options: [
                      ...this.societyTraitOptions(society, character),
                      this.matchmakerOption(state, character),
                      {
                        variant: 'info',
                        text: 'Vanilla / other mods actions (' + vanillaActions.length + ')',
                        disabled: !vanillaActions.length,
                        showDisabledWithTooltip: true,
                        tooltip: vanillaActions.length ? 'Open actions currently exposed by the base game or other mods for this character.' : 'No vanilla or other mod character action is currently exposed for this character.',
                        icons: vanillaActions.length && vanillaActions[0].icon ? [vanillaActions[0].icon] : [this.affairIcon('support')],
                        action: {
                          event: this.event,
                          method: 'openVanillaActions',
                          context: { houseId, characterId, group, page: page || 0, ...nav }
                        }
                      },
                      isSelf ? false : {
                        text: 'Praise in public',
                        disabled: !!(social && social.nextPraiseMonth && !this.monthKeyReached(social.nextPraiseMonth, state)),
                        showDisabledWithTooltip: true,
                        tooltip: (social && social.nextPraiseMonth && !this.monthKeyReached(social.nextPraiseMonth, state)) ? 'You praised this person recently. Available again after ' + social.nextPraiseMonth + '.' : 'Praise this person in public: +3 prestige, better relations. 4 month cooldown per person.',
                        icons: [this.affairIcon('prestige')],
                        action: {
                          event: this.event,
                          method: 'praisePerson',
                          context: { houseId, characterId }
                        }
                      },
                      this.kinshipSupportOption(society, state, house, character),
                      this.socialVisitOption(society, state, house, character, nav),
                      this.romanceOption(society, state, house, character),
                      this.buyEnslavedPersonOption(society, state, house, character, nav),
                      (isSelf || kinship.kind === 'spouse' || kinship.kind === 'family') ? false : {
                        variant: 'danger',
                        text: 'Spread rumor',
                        icons: [this.affairIcon('rivalry')],
                        action: {
                          event: this.event,
                          method: 'spreadRumor',
                          context: { houseId, characterId }
                        }
                      },
                      (!isSelf && this.playerIsEmperor && this.playerIsEmperor(society, state)) ? {
                        variant: 'info',
                        text: 'Imperial justice (investigate, judge)',
                        icons: [this.imperatorIcon ? this.imperatorIcon() : this.affairIcon('senator')],
                        action: {
                          event: this.event,
                          method: 'politicsAction',
                          context: { action: 'openImperialActions', houseId, characterId }
                        }
                      } : false,
                      {
                        text: 'Back',
                        action: backAction
                      }
                    ].filter(Boolean)
                  })
                },
        openSlavePerson({ houseId, characterId, group, page, returnTo, returnPage } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  let character = state.characters[characterId]
                  if (!house || !character) {
                    this.openHouse({ houseId, returnTo, returnPage })
                    return
                  }
                  character.id = character.id || characterId
                  let currentId = this.currentCharacterId(state)
                  if (this.sameCharacterId(currentId, characterId) && this.currentPlayerSlaveRecord && this.currentPlayerSlaveRecord(society, state)) {
                    this.openPlayerSlavePath()
                    return
                  }
                  let nav = this.navContext(returnTo, returnPage)
                  let backAction = group ? {
                    event: this.event,
                    method: 'openMemberGroup',
                    context: { houseId, group, page: page || 0, ...nav }
                  } : {
                    event: this.event,
                    method: 'openMemberGroups',
                    context: { houseId, ...nav }
                  }
                  let record = (society.playerSlaves || []).find((slave) => slave && this.sameCharacterId(slave.characterId, characterId))
                  let vanillaActions = this.vanillaCharacterActions(character)
                  let ownerHouseId = character.corSocietySlaveOwnerHouseId || character.corSocietyHouseId || ''
                  let originHouseId = character.corSocietyOriginHouseId || ''
                  let ownerHouse = ownerHouseId && society.houses[ownerHouseId]
                  let originHouse = originHouseId && society.houses[originHouseId]
                  let info = this.enslavedPurchaseInfo ? this.enslavedPurchaseInfo(society, state, house, character) : false
                  let options = []
                  if (record) {
                    options.push({
                      variant: 'info',
                      text: 'Manage household slave',
                      tooltip: 'Open this owned slave record: task, pupil, marriage to another slave, sale, manumission, and origin links.',
                      icons: [this.slaveTypeIcon(record.type || character.corSocietySlaveType || 'labor')],
                      action: { event: this.event, method: 'openManageSlave', context: { slaveKey: record.key, characterId } }
                    })
                  }
                  let purchase = this.buyEnslavedPersonOption ? this.buyEnslavedPersonOption(society, state, house, character, nav) : false
                  if (purchase && !record) options.push(purchase)
                  if (ownerHouse && ownerHouse.id !== house.id) {
                    options.push({
                      variant: 'info',
                      text: 'Open owner house',
                      tooltip: 'Open the Society house that currently controls this slave.',
                      icons: [this.houseCrestIcon(society, ownerHouse)],
                      action: { event: this.event, method: 'openHouse', context: { houseId: ownerHouse.id, ...nav } }
                    })
                  }
                  if (originHouse) {
                    options.push({
                      variant: 'info',
                      text: 'Open origin house',
                      tooltip: 'Open the house this person came from before slavery.',
                      icons: [this.houseCrestIcon(society, originHouse)],
                      action: { event: this.event, method: 'openHouse', context: { houseId: originHouse.id, ...nav } }
                    })
                  }
                  options.push({
                    variant: 'info',
                    text: 'Vanilla / other mods actions (' + vanillaActions.length + ')',
                    disabled: !vanillaActions.length,
                    showDisabledWithTooltip: true,
                    tooltip: vanillaActions.length ? 'Open actions currently exposed by the base game or other mods for this character.' : 'No vanilla or other mod character action is currently exposed for this character.',
                    icons: vanillaActions.length && vanillaActions[0].icon ? [vanillaActions[0].icon] : [this.affairIcon('support')],
                    action: { event: this.event, method: 'openVanillaActions', context: { houseId, characterId, group, page: page || 0, ...nav } }
                  })
                  options.push({ text: 'Back', action: backAction })
                  this.pushModal({
                    societyMenu: true,
                    title: this.slaveDisplayName ? this.slaveDisplayName(character, record, state) : this.characterName(character, state),
                    message: 'Enslaved character record.',
                    societySummaryOptions: [
                      this.summaryOption('Status', 'Enslaved' + (ownerHouse ? '; owner ' + ownerHouse.name : ''), [this.slaveTypeIcon((record && record.type) || character.corSocietySlaveType || 'labor')], 'Slave characters use slave management, purchase, origin, and freedom systems instead of normal citizen social actions.'),
                      this.summaryOption('Origin', this.slaveOriginDescription(character.corSocietySlaveOrigin || (record && record.origin) || 'unknown'), [this.affairIcon('log')], 'Origin notes are kept for navigation and cleared on manumission.'),
                      this.summaryOption('Task', this.slaveTaskLabel ? this.slaveTaskLabel(record || character) : (character.corSocietySlaveTask || 'labor'), [this.slaveTypeIcon((record && record.type) || character.corSocietySlaveType || 'labor')], 'Owned slaves can be assigned household work from the slave management screen.'),
                      this.summaryOption('Purchase', info && info.visible ? (info.available ? info.cost + ' cash' : info.reason) : 'not for sale', [this.affairIcon('coins')], info ? info.tooltip : 'This character is not currently available through the slave market.')
                    ],
                    image: this.characterPortrait(character, state, house),
                    options
                  })
                },
        openFamilyCharacterSheet(args = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let characterId = args.characterId || args.targetCharacterId || (args.context && (args.context.characterId || args.context.targetCharacterId)) || ''
                  let character = state.characters && state.characters[characterId]
                  if (!character) {
                    this.openHub()
                    return
                  }
                  character.id = character.id || characterId
                  let houseId = this.houseIdForCharacter(character, state, society)
                  if (!houseId) {
                    let currentId = this.currentCharacterId(state)
                    let current = state.characters && state.characters[currentId]
                    if (current) {
                      current.id = current.id || currentId
                      houseId = this.houseIdForCharacter(current, state, society)
                    }
                  }
                  let house = society.houses && society.houses[houseId]
                  if (house) {
                    this.refreshHouseMemberLists(society, state, house)
                    this.save(society)
                    this.openPerson({ houseId, characterId, returnTo: 'hub' })
                    return
                  }
                  this.openHub()
                },
        openVanillaActions({ houseId, characterId, group, page, returnTo, returnPage } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  let character = state.characters[characterId]
                  if (!house || !character) {
                    this.openHouse({ houseId, returnTo, returnPage })
                    return
                  }
                  character.id = character.id || characterId
                  let nav = this.navContext(returnTo, returnPage)
                  let actions = this.vanillaCharacterActions(character)
                  let options = actions.map((item) => {
                    let action = item.action || {}
                    let process = action.process || action.action || false
                    let disabled = action.isAvailable === false || !process
                    return {
                      text: action.title || item.key,
                      tooltip: action.tooltip || (disabled ? 'This vanilla / other mod action is not currently available.' : 'Runs this vanilla / other mod character action.'),
                      disabled,
                      showDisabledWithTooltip: true,
                      icons: action.icon ? [action.icon] : [this.characterPortrait(character, state, house)],
                      action: process || {
                        event: this.event,
                        method: 'openPerson',
                        context: { houseId, characterId, group, page: page || 0, ...nav }
                      }
                    }
                  })
                  options.push({
                    text: 'Back',
                    action: {
                      event: this.event,
                      method: 'openPerson',
                      context: { houseId, characterId, group, page: page || 0, ...nav }
                    }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Vanilla / other mods actions',
                    message: actions.length ? 'Actions currently exposed by the base game or other mods for ' + this.characterName(character, state) + '.' : 'No vanilla or other mod action is currently exposed for this character.',
                    image: this.characterPortrait(character, state, house),
                    options
                  })
                },
        openVanillaKnownFamily({ houseId, characterId, group, page, returnTo, returnPage, origin } = {}) {
                  // The "Known Family Tree" (vanilla known-family view / Society 'known' mode) is
                  // disabled: it does not represent Society's houses/dynasties or generated kin
                  // coherently. Route the player to the working House Family Tree instead.
                  let society = this.ensure()
                  let state = daapi.getState()
                  let character = characterId && state.characters ? state.characters[characterId] : false
                  let resolvedHouseId = houseId && society.houses[houseId] ? houseId : ''
                  if (!resolvedHouseId && character) {
                    character.id = character.id || characterId
                    resolvedHouseId = this.houseIdForCharacter(character, state, society) || ''
                  }
                  if (resolvedHouseId && society.houses[resolvedHouseId]) {
                    this.openHouseFamilyTree({ houseId: resolvedHouseId, returnTo, returnPage, origin })
                    return
                  }
                  if (houseId && characterId) {
                    this.openPerson({ houseId, characterId, group, page: page || 0, returnTo, returnPage })
                    return
                  }
                  this.openHub()
                },
        openVanillaFullFamilyTree({ houseId, characterId, group, page, returnTo, returnPage, origin } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  if (this.preferSocietyTree(characterId, society, house, state)) {
                    this.openFamilyTree({ houseId, characterId, group, page, mode: 'full', returnTo, returnPage, origin })
                    return
                  }
                  if (!this.openVanillaFamilyRoute(characterId, '#/fullFamilyTree')) {
                    this.openFamilyTree({ houseId, characterId, group, page, mode: 'full', returnTo, returnPage, origin })
                  }
                },
        dynastyTreeFocusId(society, state, dynastyId) {
                  let currentId = this.currentCharacterId(state)
                  let current = state.characters && state.characters[currentId]
                  if (current && current.dynastyId && String(current.dynastyId) === String(dynastyId)) {
                    return currentId
                  }
                  let ids = this.memberIdsForDynasty(society, state, dynastyId)
                  if (!ids.length) {
                    return ''
                  }
                  return ids.slice().sort((a, b) => {
                    let first = state.characters[a] || {}
                    let second = state.characters[b] || {}
                    return this.characterScore(second, state) - this.characterScore(first, state)
                  })[0]
                },
        openDynastyTree({ dynastyId, stratum, page, returnTo, returnPage, origin } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let dynasty = society.dynasties && society.dynasties[dynastyId]
                  let house = this.primaryHouseForDynasty(society, dynastyId)
                  let characterId = this.dynastyTreeFocusId(society, state, dynastyId)
                  if (!dynasty || !house || !characterId) {
                    this.openDynasty({ dynastyId, stratum, page })
                    return
                  }
                  origin = origin || { method: 'openDynasty', context: { dynastyId, stratum, page: page || 0 } }
                  let currentRepairKey = this.version + ':' + this.monthKey(state)
                  let beforeRepairKey = society.dynastyTreeRepairMonths && society.dynastyTreeRepairMonths[dynastyId]
                  let alreadyRepaired = beforeRepairKey === currentRepairKey
                  let repaired = !alreadyRepaired && this.ensureDynastyCommonTree && this.ensureDynastyCommonTree(society, state, dynastyId, { budget: 8 })
                  let afterRepairKey = society.dynastyTreeRepairMonths && society.dynastyTreeRepairMonths[dynastyId]
                  if (repaired || (!alreadyRepaired && beforeRepairKey !== afterRepairKey)) {
                    state = daapi.getState()
                    this.clearFamilyTreeRuntimeCache()
                    this.save(society)
                    house = this.primaryHouseForDynasty(society, dynastyId)
                    characterId = this.dynastyTreeFocusId(society, state, dynastyId) || characterId
                  }
                  this.openGraphicalFamilyTree({
                    society,
                    state,
                    house,
                    houseId: house.id,
                    characterId,
                    group: '',
                    page: 0,
                    mode: 'full',
                    returnTo: returnTo || 'dynasty',
                    returnPage: returnPage !== undefined ? returnPage : (page || 0),
                    origin
                  })
                },
        openHouseFamilyTree({ houseId, returnTo, returnPage, origin } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  if (!house) {
                    this.openHub()
                    return
                  }
                  origin = origin || { method: 'openHouse', context: { houseId, ...this.navContext(returnTo, returnPage) } }
                  if (this.prepareHouseTreeForOpen(society, state, house)) {
                    state = daapi.getState()
                    this.clearFamilyTreeRuntimeCache()
                    this.save(society)
                    house = society.houses[houseId] || house
                  }
                  this.refreshHouseMemberLists(society, state, house)
                  let characterId = this.isCurrentPlayerHouse(house, state)
                    ? this.currentCharacterId(state)
                    : (house.notableIds || house.memberIds || []).find((id) => state.characters && state.characters[id])
                  if (!characterId) {
                    this.openHouse({ houseId, returnTo, returnPage })
                    return
                  }
                  this.openGraphicalFamilyTree({
                    society,
                    state,
                    house,
                    houseId,
                    characterId,
                    group: '',
                    page: 0,
                    mode: 'house',
                    returnTo: returnTo || 'dynasty',
                    returnPage,
                    origin
                  })
                },
        prepareHouseTreeForOpen(society, state, house) {
                  if (!society || !state || !state.characters || !house || !house.id || !this.ensureHouseCommonTree) {
                    return false
                  }
                  society.houseTreeRepairMonths = society.houseTreeRepairMonths || {}
                  society.repairingHouseIds = society.repairingHouseIds || {}
                  if (society.repairingHouseIds[house.id]) {
                    return false
                  }
                  let repairKey = this.version + ':' + this.monthKey(state)
                  if (society.houseTreeRepairMonths[house.id] === repairKey) {
                    return false
                  }
                  society.houseTreeRepairMonths[house.id] = repairKey
                  society.repairingHouseIds[house.id] = true
                  try {
                    if (this.repairHouseMembership) {
                      this.repairHouseMembership(society, state, house.id)
                      state = daapi.getState()
                    }
                    this.ensureHouseCommonTree(society, state, house, { allowLivingExtras: false })
                  } finally {
                    delete society.repairingHouseIds[house.id]
                  }
                  return true
                },
        ensurePlayerDynastyTreeForCurrent(society, state) {
                  try {
                    society = society || this.load()
                    state = state || daapi.getState()
                    let characterId = this.currentCharacterId(state)
                    let character = state.characters && state.characters[characterId]
                    if (!character) {
                      return false
                    }
                    character.id = character.id || characterId
                    let ok = this.ensurePlayerDynastyTree(society, state, character)
                    state = daapi.getState()
                    character = state.characters[characterId] || character
                    let houseId = this.houseIdForCharacter(character, state, society)
                    let house = society.houses[houseId]
                    if (house) {
                      this.refreshHouseMemberLists(society, state, house)
                    }
                    return ok
                  } catch (err) {
                    console.warn(err)
                    return false
                  }
                },
        preparePlayerDynastyTreeOnce(society, state) {
                  society = society || this.load()
                  state = state || daapi.getState()
                  let characterId = this.currentCharacterId(state)
                  if (!characterId) {
                    return false
                  }
                  let month = this.monthKey(state)
                  let key = [this.version, characterId, month].join(':')
                  if (society.playerDynastyTreePreparedKey === key) {
                    return false
                  }
                  let character = state.characters && state.characters[characterId]
                  if (!character) {
                    return false
                  }
                  let needsParents = !character.fatherId || !character.motherId
                  let needsLivingExtras = (society.playerTreeGeneratedLivingIds || []).filter((id) => state.characters[id] && !state.characters[id].isDead).length < 2
                  if (!needsParents && !needsLivingExtras) {
                    society.playerDynastyTreePreparedKey = key
                    return false
                  }
                  let result = this.ensurePlayerDynastyTreeForCurrent(society, state)
                  society.playerDynastyTreePreparedKey = key
                  return result
                },
        openPlayerFamilyTree() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let characterId = this.currentCharacterId(state)
                  let character = state.characters && state.characters[characterId]
                  if (!character) {
                    this.openHub()
                    return
                  }
                  character.id = character.id || characterId
                  let houseId = this.houseIdForCharacter(character, state, society)
                  if (!houseId || !society.houses[houseId]) {
                    this.openHub()
                    return
                  }
                  this.openHouseFamilyTree({ houseId, returnTo: 'hub' })
                },
        ensurePlayerDynastyTree(society, state, character) {
                  if (!society || !state || !state.characters || !character || !character.id) {
                    return false
                  }
                  character.id = character.id || this.currentCharacterId(state)
                  this.ensureDeadParentsAndGrandparents(society, state, character)
                  state = daapi.getState()
                  character = state.characters[character.id] || character
                  let currentAge = this.age(character, state)
                  society.playerTreeGeneratedLivingIds = (society.playerTreeGeneratedLivingIds || []).filter((id) => state.characters[id] && !state.characters[id].isDead)
                  let canAddLiving = society.playerTreeGeneratedLivingIds.length < 4
                  let hasLivingAuntOrUncle = society.playerTreeGeneratedLivingIds.some((id) => {
                    let kin = state.characters[id]
                    return kin && kin.corSocietyPlayerTreeRole === 'auntUncle' && !kin.isDead
                  })
                  if (canAddLiving && !hasLivingAuntOrUncle && character.fatherId && state.characters[character.fatherId]) {
                    let parent = state.characters[character.fatherId]
                    parent.id = parent.id || character.fatherId
                    this.ensureDeadParentsAndGrandparents(society, state, parent)
                    state = daapi.getState()
                    parent = state.characters[character.fatherId] || parent
                    if (parent.fatherId && parent.motherId) {
                      let auntUncleId = this.generatePlayerAuntUncle(society, state, character, parent)
                      if (auntUncleId) {
                        society.playerTreeGeneratedLivingIds.push(auntUncleId)
                      }
                    }
                  }
                  state = daapi.getState()
                  if (society.playerTreeGeneratedLivingIds.length < 4 && currentAge >= 13) {
                    let auntUncleId = society.playerTreeGeneratedLivingIds.find((id) => {
                      let kin = state.characters[id]
                      return kin && kin.corSocietyPlayerTreeRole === 'auntUncle' && !kin.isDead
                    })
                    let auntUncle = auntUncleId && state.characters[auntUncleId]
                    let hasCousin = society.playerTreeGeneratedLivingIds.some((id) => {
                      let kin = state.characters[id]
                      return kin && kin.corSocietyPlayerTreeRole === 'cousin' && !kin.isDead
                    })
                    if (auntUncle && !hasCousin) {
                      let cousinId = this.generatePlayerCousin(society, state, character, auntUncle)
                      if (cousinId) {
                        society.playerTreeGeneratedLivingIds.push(cousinId)
                      }
                    }
                  }
                  return true
                },
        generatePlayerAuntUncle(society, state, player, parent) {
                  let isMale = Math.random() > 0.5
                  let playerAge = this.age(player, state)
                  let age = this.clamp(playerAge + this.randomInt(15, 30), 24, 62)
                  let stratum = this.playerStratum(state)
                  let profile = this.strata[stratum] || this.strata.plebeian
                  let job = this.pick(profile.jobs)
                  let traits = this.generatedTraitsForStratum(stratum, job)
                  let father = state.characters[parent.fatherId] || {}
                  let mother = state.characters[parent.motherId] || {}
                  let id = daapi.generateCharacter({
                    characterFeatures: {
                      gender: isMale ? 'male' : 'female',
                      isMale,
                      praenomen: isMale ? this.pick(this.maleNames) : this.pick(this.femaleNames),
                      birthMonth: this.randomInt(0, 11),
                      birthYear: state.year - age,
                      look: this.inheritedVanillaLook(isMale, mother, father, 'player-aunt-uncle-' + player.id),
                      job,
                      jobLevel: this.randomInt(0, stratum === 'senatorial' ? 7 : stratum === 'equestrian' ? 5 : 3),
                      traits,
                      skills: this.skillsForStratum(stratum),
                      corSocietyGenerated: true,
                      corSocietyPlayerTreeGenerated: true,
                      corSocietyPlayerTreeRole: 'auntUncle',
                      flagDoNotCull: true,
                      fatherId: parent.fatherId,
                      motherId: parent.motherId,
                      childrenIds: []
                    },
                    dynastyFeatures: this.dynastyFeaturesForCharacter(player, state)
                  })
                  daapi.updateCharacter({
                    characterId: id,
                    character: {
                      dynastyId: player.dynastyId,
                      fatherId: parent.fatherId,
                      motherId: parent.motherId,
                      corSocietyGenerated: true,
                      corSocietyPlayerTreeGenerated: true,
                      corSocietyPlayerTreeRole: 'auntUncle',
                      flagDoNotCull: true
                    }
                  })
                  this.addChildToParent(state, parent.fatherId, id)
                  this.addChildToParent(state, parent.motherId, id)
                  society.generatedCharacterIds = society.generatedCharacterIds || []
                  if (society.generatedCharacterIds.indexOf(id) < 0) society.generatedCharacterIds.push(id)
                  this.applyGeneratedTraits(id, traits)
                  this.seedSocialTraitsForCharacter(society, id, traits)
                  return id
                },
        generatePlayerCousin(society, state, player, auntUncle) {
                  let isMale = Math.random() > 0.5
                  let playerAge = this.age(player, state)
                  let age = this.clamp(playerAge + this.randomInt(-6, 6), 13, 36)
                  let stratum = this.playerStratum(state)
                  let traits = age >= 12 ? this.generatedTraitsForStratum(stratum, '') : []
                  let mother = this.characterIsMale(auntUncle) ? {} : auntUncle
                  let father = this.characterIsMale(auntUncle) ? auntUncle : {}
                  let id = daapi.generateCharacter({
                    characterFeatures: {
                      gender: isMale ? 'male' : 'female',
                      isMale,
                      praenomen: isMale ? this.pick(this.maleNames) : this.pick(this.femaleNames),
                      birthMonth: this.randomInt(0, 11),
                      birthYear: state.year - age,
                      look: this.inheritedVanillaLook(isMale, mother, father, 'player-cousin-' + player.id + '-' + auntUncle.id),
                      traits,
                      skills: this.skillsForStratum(stratum),
                      corSocietyGenerated: true,
                      corSocietyPlayerTreeGenerated: true,
                      corSocietyPlayerTreeRole: 'cousin',
                      flagDoNotCull: true,
                      fatherId: this.characterIsMale(auntUncle) ? auntUncle.id : null,
                      motherId: this.characterIsMale(auntUncle) ? null : auntUncle.id,
                      childrenIds: []
                    },
                    dynastyFeatures: this.dynastyFeaturesForCharacter(player, state)
                  })
                  daapi.updateCharacter({
                    characterId: id,
                    character: {
                      dynastyId: player.dynastyId,
                      fatherId: this.characterIsMale(auntUncle) ? auntUncle.id : null,
                      motherId: this.characterIsMale(auntUncle) ? null : auntUncle.id,
                      corSocietyGenerated: true,
                      corSocietyPlayerTreeGenerated: true,
                      corSocietyPlayerTreeRole: 'cousin',
                      flagDoNotCull: true
                    }
                  })
                  this.addChildToParent(state, auntUncle.id, id)
                  society.generatedCharacterIds = society.generatedCharacterIds || []
                  if (society.generatedCharacterIds.indexOf(id) < 0) society.generatedCharacterIds.push(id)
                  this.applyGeneratedTraits(id, traits)
                  this.seedSocialTraitsForCharacter(society, id, traits)
                  return id
                },
        preferSocietyTree(characterId, society, house, state) {
                  let character = state && state.characters ? state.characters[characterId] : false
                  return !!(
                    character &&
                    (
                      character.corSocietyGenerated ||
                      (house && house.generated) ||
                      (society.generatedCharacterIds || []).some((id) => this.sameCharacterId(id, characterId))
                    )
                  )
                },
        openVanillaFamilyRoute(characterId, route) {
                  let state = daapi.getState()
                  if (!state || !state.characters || !state.characters[characterId]) {
                    return false
                  }
                  let path = route === '#/fullFamilyTree' || route === '/fullFamilyTree' ? '/fullFamilyTree' : '/knownFamily'
                  try {
                    let vueRoot = this.findGameVueRoot()
                    if (vueRoot && vueRoot.$store) {
                      let store = vueRoot.$store
                      if (typeof store.commit === 'function') {
                        store.commit('setSelectedCharacterId', characterId)
                      } else if (store.state && store.state.current) {
                        store.state.current.selectedCharacterId = characterId
                      }
                      if (typeof store.dispatch === 'function') {
                        store.dispatch('forceUpdateStore')
                      }
                      if (vueRoot.$router && typeof vueRoot.$router.push === 'function') {
                        let result = vueRoot.$router.push({ path })
                        if (result && typeof result.catch === 'function') {
                          result.catch(() => {})
                        }
                        return true
                      }
                      if (typeof window !== 'undefined' && window.location) {
                        window.location.hash = '#' + path
                        return true
                      }
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                  return false
                },
        installVanillaFamilyButtonRedirect() {
                  // The base game's portrait "view this character's family" menu opens the vanilla
                  // Known Family Tree (route /knownFamily). That view does not render Society's
                  // houses/dynasties or generated kin coherently, so we intercept that navigation at
                  // the router level (language-independent: matched on the route path, not the button
                  // label) and open Society's working House Family Tree for the selected character
                  // instead. Every other navigation is passed straight through to the game.
                  try {
                    let root = this.findGameVueRoot()
                    if (!root || !root.$router || typeof root.$router.push !== 'function') {
                      return false
                    }
                    let router = root.$router
                    if (router.__corSocietyFamilyRedirect === this.version) {
                      return true
                    }
                    let self = this
                    let isKnownFamilyTarget = (to) => {
                      if (!to) {
                        return false
                      }
                      let path = ''
                      let name = ''
                      if (typeof to === 'string') {
                        path = to
                      } else if (typeof to === 'object') {
                        path = to.path || to.fullPath || to.hash || ''
                        name = to.name || ''
                      }
                      path = String(path || '').toLowerCase()
                      name = String(name || '').toLowerCase()
                      return path.indexOf('knownfamily') >= 0 || name.indexOf('knownfamily') >= 0
                    }
                    let wrap = (methodName) => {
                      let key = '__corSocietyOriginal_' + methodName
                      if (typeof router[methodName] !== 'function') {
                        return
                      }
                      router[key] = router[key] || router[methodName]
                      let original = router[key]
                      router[methodName] = function(to, onComplete, onAbort) {
                        try {
                          if (isKnownFamilyTarget(to)) {
                            let state = daapi.getState()
                            let selectedId = (state && state.current && state.current.selectedCharacterId) || ''
                            if (!selectedId && root.$store && root.$store.state && root.$store.state.current) {
                              selectedId = root.$store.state.current.selectedCharacterId || ''
                            }
                            self.openHouseTreeForVanillaCharacter(selectedId)
                            return typeof Promise !== 'undefined' ? Promise.resolve(false) : undefined
                          }
                        } catch (err) {
                          console.warn(err)
                        }
                        return original.call(this, to, onComplete, onAbort)
                      }
                    }
                    wrap('push')
                    wrap('replace')
                    router.__corSocietyFamilyRedirect = this.version
                    return true
                  } catch (err) {
                    console.warn(err)
                    return false
                  }
                },
        openHouseTreeForVanillaCharacter(characterId) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let character = characterId && state.characters ? state.characters[characterId] : false
                  if (!character) {
                    characterId = this.currentCharacterId(state)
                    character = state.characters && state.characters[characterId]
                  }
                  if (!character) {
                    this.openHub()
                    return
                  }
                  character.id = character.id || characterId
                  let houseId = this.houseIdForCharacter(character, state, society)
                  if (houseId && society.houses[houseId]) {
                    this.openHouseFamilyTree({ houseId })
                    return
                  }
                  this.openHub()
                },
        findGameVueRoot() {
                  if (this.cachedGameVueRoot && this.isGameVueRoot(this.cachedGameVueRoot)) {
                    return this.cachedGameVueRoot
                  }
                  if (typeof document === 'undefined') {
                    return false
                  }
                  let nodes = []
                  let app = document.getElementById('app')
                  if (app) {
                    nodes.push(app)
                  }
                  if (document.body) {
                    nodes.push(document.body)
                  }
                  try {
                    let allNodes = document.querySelectorAll('*')
                    for (let i = 0; i < allNodes.length; i++) {
                      nodes.push(allNodes[i])
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                  for (let i = 0; i < nodes.length; i++) {
                    let vm = nodes[i] && nodes[i].__vue__
                    if (!vm) {
                      continue
                    }
                    let root = this.vueRootFromComponent(vm)
                    if (this.isGameVueRoot(root)) {
                      this.cachedGameVueRoot = root
                      return root
                    }
                  }
                  return false
                },
        vueRootFromComponent(vm) {
                  let root = vm && (vm.$root || vm)
                  let guard = 0
                  while (root && root.$parent && guard < 50) {
                    root = root.$parent
                    guard += 1
                  }
                  return root || vm
                },
        isGameVueRoot(root) {
                  return !!(
                    root &&
                    root.$store &&
                    root.$router &&
                    root.$store.state &&
                    root.$store.state.current &&
                    root.$store.state.characters
                  )
                },
        openFamilyTree({ houseId, characterId, group, page, mode, returnTo, returnPage, origin } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  let character = state.characters[characterId]
                  if (!character) {
                    if (returnTo === 'deadHouse') {
                      this.openDeadHouse({ houseId, page: returnPage || 0 })
                      return
                    }
                    this.openHouse({ houseId, returnTo, returnPage })
                    return
                  }
                  character.id = character.id || characterId
                  if (!house) {
                    houseId = this.houseIdForCharacter(character, state, society) || houseId
                    house = society.houses[houseId]
                  }
                  if (house) {
                    this.refreshHouseMemberLists(society, state, house)
                  }
                  let currentRepairKey = this.version + ':' + this.monthKey(state)
                  let beforeRepairKey = character.dynastyId && society.dynastyTreeRepairMonths && society.dynastyTreeRepairMonths[character.dynastyId]
                  let alreadyRepaired = !!(character.dynastyId && beforeRepairKey === currentRepairKey)
                  let repaired = !alreadyRepaired && mode === 'full' && character.dynastyId && this.ensureDynastyCommonTree && this.ensureDynastyCommonTree(society, state, character.dynastyId, { budget: 6 })
                  let afterRepairKey = character.dynastyId && society.dynastyTreeRepairMonths && society.dynastyTreeRepairMonths[character.dynastyId]
                  if (repaired || (!alreadyRepaired && beforeRepairKey !== afterRepairKey)) {
                    state = daapi.getState()
                    this.clearFamilyTreeRuntimeCache()
                    this.save(society)
                    if (houseId) {
                      house = society.houses[houseId]
                    }
                  }
                  this.openGraphicalFamilyTree({ society, state, house, houseId, characterId, group, page, mode, returnTo, returnPage, origin })
                },
        reopenFamilyTreeOrigin(origin) {
                  if (!origin || !origin.method || typeof this[origin.method] !== 'function') {
                    return false
                  }
                  this[origin.method](origin.context || {})
                  return true
                },
        openGraphicalFamilyTree({ society, state, house, houseId, characterId, group, page, mode, returnTo, returnPage, origin }) {
                  if (typeof document === 'undefined' || !document.body) {
                    this.openTextFamilyTreeFallback({ society, state, house, houseId, characterId, group, page, mode, returnTo, returnPage, origin })
                    return
                  }
                  let sourceMode = mode
                  if (mode === 'dynasty') {
                    mode = 'full'
                  }
                  let character = state.characters[characterId]
                  if (!character) {
                    this.openHouse({ houseId, returnTo, returnPage })
                    return
                  }
                  character.id = character.id || characterId
                  this.closeFamilyTreeOverlay()
                  let overlay = document.createElement('div')
                  overlay.id = 'corSocietyFamilyTreeOverlay'
                  overlay.className = 'cor-society-family-tree-overlay'
                  overlay.setAttribute('data-cor-society-ui', 'family-tree')
                  this.applyFamilyTreeTheme(overlay, state)
        
                  let panel = document.createElement('div')
                  panel.className = 'cor-society-family-tree-panel container-main break-word'
                  overlay.appendChild(panel)
        
                  let header = document.createElement('div')
                  header.className = 'cor-society-family-tree-header'
                  panel.appendChild(header)
        
                  let backButton = document.createElement('button')
                  backButton.type = 'button'
                  backButton.className = 'btn btn-sm btn-dark cor-society-tree-toolbar-button'
                  backButton.textContent = 'Back'
                  backButton.title = 'Return to the menu this family tree was opened from.'
                  backButton.addEventListener('click', () => {
                    this.closeFamilyTreeOverlay()
                    if (this.reopenFamilyTreeOrigin(origin)) {
                      return
                    }
                    if ((sourceMode === 'dynasty' || returnTo === 'dynasty') && house) {
                      this.openDynasty({ dynastyId: this.gameDynastyIdForHouse(house), stratum: house.stratum, page: returnPage || 0 })
                    } else if (returnTo === 'deadHouse') {
                      this.openDeadHouse({ houseId, page: returnPage || 0 })
                    } else if (sourceMode === 'house') {
                      this.openHouse({ houseId, returnTo, returnPage })
                    } else {
                      this.openPerson({ houseId, characterId, group, page: page || 0, returnTo, returnPage })
                    }
                  })
                  header.appendChild(backButton)
        
                  let heading = document.createElement('div')
                  heading.className = 'cor-society-family-tree-heading'
                  let title = document.createElement('h3')
                  title.textContent = this.familyTreeTitle(mode)
                  heading.appendChild(title)
                  let subtitle = document.createElement('div')
                  subtitle.className = 'cor-society-family-tree-subtitle'
                  subtitle.textContent = this.characterName(character, state)
                  heading.appendChild(subtitle)
                  header.appendChild(heading)
        
                  let closeButton = document.createElement('button')
                  closeButton.type = 'button'
                  closeButton.className = 'btn btn-sm btn-dark cor-society-tree-toolbar-button'
                  closeButton.textContent = 'Close'
                  closeButton.title = 'Close the family tree.'
                  closeButton.addEventListener('click', () => this.closeFamilyTreeOverlay())
                  header.appendChild(closeButton)
        
                  let toolbar = document.createElement('div')
                  toolbar.className = 'cor-society-family-tree-toolbar'
                  panel.appendChild(toolbar)
        
                  let zoomLabel = document.createElement('label')
                  zoomLabel.className = 'cor-society-tree-zoom-label'
                  zoomLabel.textContent = 'Zoom'
                  toolbar.appendChild(zoomLabel)
        
                  let zoomInput = document.createElement('input')
                  zoomInput.type = 'range'
                  zoomInput.min = '0.45'
                  zoomInput.max = '1.25'
                  zoomInput.step = '0.05'
                  zoomInput.value = '0.9'
                  zoomInput.setAttribute('aria-label', 'Zoom level')
                  toolbar.appendChild(zoomInput)
        
                  let focusButton = document.createElement('button')
                  focusButton.type = 'button'
                  focusButton.className = 'btn btn-sm btn-light cor-society-tree-toolbar-button'
                  focusButton.textContent = 'Center'
                  focusButton.title = 'Pan back to the selected character.'
                  toolbar.appendChild(focusButton)
        
                  let canvas = document.createElement('div')
                  canvas.className = 'cor-society-family-tree-canvas'
                  panel.appendChild(canvas)
        
                  let tree = document.createElement('div')
                  tree.id = 'fullFamilyTree'
                  tree.className = 'cor-society-family-tree vue-family-tree'
                  canvas.appendChild(tree)
        
                  let zoomTarget = document.createElement('div')
                  zoomTarget.className = 'cor-society-family-tree-zoom-target'
                  zoomTarget.style.transform = 'scale(' + parseFloat(zoomInput.value) + ')'
                  tree.appendChild(zoomTarget)
        
                  let loading = document.createElement('div')
                  loading.className = 'cor-society-family-tree-note'
                  loading.textContent = 'Rendering family tree...'
                  zoomTarget.appendChild(loading)
        
                  let setZoom = () => {
                    zoomTarget.style.transform = 'scale(' + parseFloat(zoomInput.value || 1) + ')'
                  }
                  zoomInput.addEventListener('input', setZoom)
                  zoomInput.addEventListener('change', setZoom)
        
                  let panToFocus = () => {
                    let selected = document.getElementById('familyTreeCharacterBox_' + character.id)
                    if (selected && typeof selected.scrollIntoView === 'function') {
                      selected.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
                    }
                  }
                  focusButton.addEventListener('click', panToFocus)
        
                  document.body.appendChild(overlay)
                  let renderTree = () => {
                    if (!overlay.parentNode || document.getElementById('corSocietyFamilyTreeOverlay') !== overlay) {
                      return
                    }
                    zoomTarget.textContent = ''
                    let treeContext = this.cachedFamilyTreeContext(society, state, house, character, mode)
                    let treeFilterIds = treeContext.allowedIds
                    let rootIds = treeContext.rootIds
                    let depthLimit = mode === 'known' ? 2 : mode === 'house' ? 8 : 11
                    let treeBudget = {
                      remaining: mode === 'known' ? 70 : mode === 'house' ? 120 : 220,
                      hidden: 0
                    }
                    // Many characters in one dynasty share the exact display name (praenomen +
                    // dynasty name) because Roman praenomina repeat. Detect names that belong to more
                    // than one distinct id in this tree so the cards can disambiguate them; otherwise
                    // distinct relatives look like the same person rendered several times.
                    let collidingNames = this.collectFamilyTreeNameCollisions(rootIds, character.id, state, treeFilterIds)
                    let forest = document.createElement('div')
                    forest.className = 'cor-society-family-tree-forest'
                    let sharedVisited = {}
                    let renderedBranches = 0
                    rootIds.forEach((rootId) => {
                      if (sharedVisited[String(rootId)]) {
                        return
                      }
                      let branch = this.createFamilyTreeBranch({
                        rootId,
                        focusId: character.id,
                        state,
                        society,
                        fallbackHouse: house,
                        depth: 0,
                        depthLimit,
                        treeBudget,
                        mode,
                        allowedIds: treeFilterIds,
                        visited: sharedVisited,
                        returnTo,
                        returnPage,
                        origin,
                        nameMap: collidingNames
                      })
                    if (branch && branch.childNodes && branch.childNodes.length) {
                      // The first branch is the main line (focus first). Any further branches are
                      // separate known lines that do not share a shown common ancestor; label them
                      // as a distinct section so they are never ambiguous floating groups.
                      if (renderedBranches === 1) {
                        let divider = document.createElement('div')
                        divider.className = 'cor-society-family-tree-branch-divider'
                        divider.textContent = mode === 'house'
                          ? 'Other known lines of this house (no shown common ancestor)'
                          : 'Other known lines of this dynasty (no shown common ancestor)'
                        forest.appendChild(divider)
                      }
                      forest.appendChild(branch)
                      renderedBranches += 1
                    }
                  })
                    if (!forest.childNodes.length && character && character.id && state.characters[character.id]) {
                      let singleAllowed = {}
                      singleAllowed[String(character.id)] = true
                      let fallbackBranch = this.createFamilyTreeBranch({
                        rootId: character.id,
                        focusId: character.id,
                        state,
                        society,
                        fallbackHouse: house,
                        depth: 0,
                        depthLimit: 0,
                        treeBudget,
                        mode,
                        allowedIds: singleAllowed,
                        visited: {},
                        returnTo,
                        returnPage,
                        origin,
                        nameMap: collidingNames
                      })
                      if (fallbackBranch && fallbackBranch.childNodes && fallbackBranch.childNodes.length) {
                        forest.appendChild(fallbackBranch)
                      }
                    }
                    zoomTarget.appendChild(forest)

                    let note = document.createElement('div')
                    note.className = 'cor-society-family-tree-note'
                    note.textContent = mode === 'known'
                      ? 'Known family view: parents, siblings, spouse, and near descendants.'
                      : mode === 'house'
                        ? 'House tree view: this is a filtered house branch from the same dynasty graph.'
                        : 'Dynasty view: only this dynasty is shown, with each known Society house labeled on its members.'
                    if (treeBudget.hidden > 0) {
                      note.textContent += ' ' + treeBudget.hidden + ' distant relatives are hidden for performance.'
                    }
                    zoomTarget.appendChild(note)
                    setTimeout(panToFocus, 80)
                  }
                  let scheduleTreeRender = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
                    ? window.requestAnimationFrame.bind(window)
                    : (fn) => setTimeout(fn, 0)
                  scheduleTreeRender(renderTree)
                },
        closeFamilyTreeOverlay() {
                  if (typeof document === 'undefined') {
                    return
                  }
                  let overlay = document.getElementById('corSocietyFamilyTreeOverlay')
                  if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay)
                  }
                },
        applyFamilyTreeTheme(overlay, state) {
                  let dark = this.isGameDarkTheme(state)
                  overlay.classList.toggle('cor-society-theme-dark', dark)
                  overlay.classList.toggle('cor-society-theme-light', !dark)
                  overlay.setAttribute('data-cor-society-theme', dark ? 'dark' : 'light')
                },
        isGameDarkTheme(state) {
                  state = state || daapi.getState()
                  if (state && state.settings && typeof state.settings.darkMode === 'boolean') {
                    return state.settings.darkMode
                  }
                  if (typeof document !== 'undefined') {
                    let probes = [document.documentElement, document.body, document.getElementById('app')].filter(Boolean)
                    for (let i = 0; i < probes.length; i += 1) {
                      let probe = probes[i]
                      let marker = ((probe.getAttribute('data-bs-theme') || '') + ' ' + (probe.className || '')).toLowerCase()
                      if (marker.indexOf('dark') >= 0 || marker.indexOf('night') >= 0) return true
                      if (marker.indexOf('light') >= 0) return false
                    }
                    let bg = this.firstOpaqueBackground(probes)
                    if (bg) {
                      return this.colorLuminance(bg) < 0.45
                    }
                  }
                  if (typeof window !== 'undefined' && window.matchMedia) {
                    try {
                      return !!window.matchMedia('(prefers-color-scheme: dark)').matches
                    } catch (err) {
                      return false
                    }
                  }
                  return false
                },
        firstOpaqueBackground(elements) {
                  for (let i = 0; i < elements.length; i += 1) {
                    let style = window.getComputedStyle(elements[i])
                    let bg = style && style.backgroundColor
                    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
                      return bg
                    }
                  }
                  return ''
                },
        familyTreeTitle(mode) {
                  if (mode === 'known') return 'Known Family Tree'
                  if (mode === 'house') return 'House Family Tree'
                  if (mode === 'dynasty') return 'Dynasty Tree'
                  if (mode === 'full') return 'Dynasty Tree'
                  return 'Society Family Tree'
                },
        familyTreeStartId(characterId, state, mode) {
                  let character = state.characters[characterId]
                  if (!character) {
                    return characterId
                  }
                  character.id = character.id || characterId
                  if (mode === 'known') {
                    if (character.fatherId && state.characters[character.fatherId]) return character.fatherId
                    if (character.motherId && state.characters[character.motherId]) return character.motherId
                    return character.id
                  }
                  return this.familyTreeRootId(character.id, state)
                },
        familyTreeRuntimeCache() {
                  if (!this._familyTreeRuntimeCache || this._familyTreeRuntimeCache.version !== this.version) {
                    this._familyTreeRuntimeCache = { version: this.version, entries: {}, order: [] }
                  }
                  return this._familyTreeRuntimeCache
                },
        clearFamilyTreeRuntimeCache() {
                  this._familyTreeRuntimeCache = { version: this.version, entries: {}, order: [] }
                },
        familyTreeContextSignature(society, state, house, character, mode) {
                  if (mode === 'known') {
                    return 'known'
                  }
                  if (mode === 'house') {
                    house = house || {}
                    let houseRepair = society && society.houseTreeRepairMonths ? society.houseTreeRepairMonths[house.id] || '' : ''
                    // The house view is derived from the dynasty graph, so its cache must also
                    // invalidate when the dynasty graph changes.
                    let houseDynastyId = this.gameDynastyIdForHouse(house)
                    let houseDynasty = houseDynastyId && state && state.dynasties && state.dynasties[houseDynastyId]
                    let dynastyRepair = society && society.dynastyTreeRepairMonths ? society.dynastyTreeRepairMonths[houseDynastyId] || '' : ''
                    return [
                      house.id || '',
                      house.treeIntegrityVersion || '',
                      houseRepair,
                      house._lastRefreshedMonth || '',
                      houseDynastyId || '',
                      dynastyRepair,
                      (houseDynasty && houseDynasty.memberIds ? houseDynasty.memberIds.length : 0)
                    ].join(':')
                  }
                  let dynastyId = (character && character.dynastyId) || this.gameDynastyIdForHouse(house)
                  let dynasty = dynastyId && state && state.dynasties && state.dynasties[dynastyId]
                  let repair = society && society.dynastyTreeRepairMonths ? society.dynastyTreeRepairMonths[dynastyId] || '' : ''
                  return [
                    dynastyId || '',
                    repair,
                    (dynasty && dynasty.memberIds ? dynasty.memberIds.length : 0)
                  ].join(':')
                },
        familyTreeContextCacheKey(society, state, house, character, mode) {
                  let scope = mode === 'house' ? 'house' : mode === 'known' ? 'known' : 'dynasty'
                  let scopeId = mode === 'house'
                    ? ((house && house.id) || '')
                    : mode === 'known'
                      ? (character && character.id) || ''
                      : ((character && character.dynastyId) || this.gameDynastyIdForHouse(house) || '')
                  return [
                    this.version,
                    this.monthKey(state),
                    scope,
                    scopeId,
                    mode === 'known' ? ((character && character.id) || '') : '',
                    this.familyTreeContextSignature(society, state, house, character, mode)
                  ].join('|')
                },
        cachedFamilyTreeContext(society, state, house, character, mode) {
                  if (mode === 'known') {
                    return {
                      allowedIds: false,
                      rootIds: this.familyTreeRootIds(character.id, state, society, house, mode, false)
                    }
                  }
                  let cache = this.familyTreeRuntimeCache()
                  let key = this.familyTreeContextCacheKey(society, state, house, character, mode)
                  let cached = cache.entries[key]
                  if (cached) {
                    return {
                      allowedIds: cached.allowedIds,
                      rootIds: cached.rootIds.slice()
                    }
                  }
                  let allowedIds = false
                  let rootIds = []
                  let realMemberSet = false
                  // SINGLE SOURCE GRAPH: both views are built from the one dynasty family graph so
                  // they can never order/connect the same people differently. The dynasty view uses
                  // the whole graph; the house view is the same graph restricted to the selected
                  // house's members plus the ancestor spine that connects them (so a member keeps
                  // the exact same position it has in the dynasty view).
                  let dynastyId = character.dynastyId || this.gameDynastyIdForHouse(house)
                  let dynastyAllowed = dynastyId ? this.dynastyTreeAllowedIdMap(society, state, dynastyId) : {}
                  if (mode === 'house' && (!dynastyAllowed || !Object.keys(dynastyAllowed).length)) {
                    // Fallback only if the dynasty graph is unavailable: keep the standalone model
                    // rather than render nothing.
                    let model = this.buildHouseTreeModel(society, state, house, character.id)
                    allowedIds = model.allowedIds
                    rootIds = model.rootIds
                    realMemberSet = model.memberMap || false
                  } else if (mode === 'house') {
                    let restricted = this.restrictDynastyGraphToHouse(dynastyAllowed, state, society, house)
                    allowedIds = restricted.allowed
                    realMemberSet = restricted.members
                  } else {
                    allowedIds = dynastyAllowed
                    // Every id in the dynasty graph is a real dynasty member (the builder filters
                    // by membership), so the whole map is the real-member set.
                    realMemberSet = allowedIds
                  }
                  // Drop connected components that contain no real member (orphaned ancestor or
                  // external-spouse fragments). This removes isolated blocks without hiding any
                  // real member: components that include a member or the focus are always kept.
                  if (allowedIds && realMemberSet) {
                    let scoped = this.keepConnectedFamilyComponents(allowedIds, realMemberSet, state, character.id)
                    if (scoped && Object.keys(scoped).length) {
                      allowedIds = scoped
                    }
                  }
                  // ONE deterministic root rule for both views (focus does NOT influence ordering;
                  // it is only used to highlight/centre later). This keeps the main line and the
                  // secondary "Other known lines" ordering identical across house and dynasty views.
                  if (allowedIds && Object.keys(allowedIds).length) {
                    rootIds = this.treeRootIdsFromAllowed(allowedIds, state, '', 24)
                  }
                  if (!rootIds.length) {
                    rootIds = this.familyTreeRootIds(character.id, state, society, house, mode, allowedIds)
                  }
                  if (!rootIds.length && allowedIds && allowedIds[String(character.id)]) {
                    rootIds = [this.familyTreeRootIdWithinMap(character.id, state, allowedIds)]
                  }
                  if (!rootIds.length && mode === 'full') {
                    let fallbackId = Object.keys(allowedIds || {})[0]
                    if (fallbackId) {
                      rootIds = [this.familyTreeRootIdWithinMap(fallbackId, state, allowedIds)]
                    }
                  }
                  cache.entries[key] = {
                    allowedIds,
                    rootIds: rootIds.slice()
                  }
                  cache.order.push(key)
                  while (cache.order.length > 18) {
                    let oldKey = cache.order.shift()
                    delete cache.entries[oldKey]
                  }
                  return {
                    allowedIds,
                    rootIds
                  }
                },
        buildHouseTreeModel(society, state, house, focusCharacterId) {
                  let allowedIds = {}
                  let memberIds = []
                  let memberMap = {}
                  if (!society || !state || !state.characters || !house || !house.id) {
                    return { allowedIds, rootIds: [], memberIds }
                  }
                  let addAllowed = (id) => {
                    if (id && state.characters[id]) {
                      allowedIds[String(id)] = true
                    }
                  }
                  let addMember = (id) => {
                    if (!id || memberMap[String(id)] || !state.characters[id]) {
                      return
                    }
                    let character = state.characters[id]
                    if (character.corSocietySlave || character.corSocietySlaveActive) {
                      return
                    }
                    let resolvedHouseId = this.resolveCharacterHouseId
                      ? this.resolveCharacterHouseId(character, state, society, { repair: false })
                      : (character.corSocietyHouseId || '')
                    if (resolvedHouseId && String(resolvedHouseId) === String(house.id)) {
                      memberMap[String(id)] = true
                      memberIds.push(String(id))
                      addAllowed(id)
                    }
                  }
                  if (this.resolvedHouseMemberIds) {
                    this.resolvedHouseMemberIds(society, state, house, { includeKnown: true, includeDead: true, repair: false }).forEach(addMember)
                  } else {
                    this.houseTreeSeedIds(society, state, house).forEach(addMember)
                  }
                  addMember(house.founderId)
                  addMember(house.branchRootId)
                  if (house.isPlayerHouse && this.playerFamilyMemberIds) {
                    this.playerFamilyMemberIds(state).forEach(addMember)
                  }
                  let ancestorSeen = {}
                  let addMemberAncestors = (id) => {
                    let queue = [id]
                    let guard = 0
                    while (queue.length && guard < 40) {
                      let currentId = String(queue.shift())
                      guard += 1
                      if (!currentId || ancestorSeen[currentId]) {
                        continue
                      }
                      ancestorSeen[currentId] = true
                      let character = state.characters[currentId]
                      if (!character) {
                        continue
                      }
                      ;[character.fatherId, character.motherId].forEach((parentId) => {
                        if (!parentId || !state.characters[parentId]) return
                        let parent = state.characters[parentId]
                        let parentHouseId = this.resolveCharacterHouseId
                          ? this.resolveCharacterHouseId(parent, state, society, { repair: false })
                          : (parent.corSocietyHouseId || '')
                        if (parentHouseId && String(parentHouseId) === String(house.id)) {
                          addMember(parentId)
                          queue.push(String(parentId))
                        }
                      })
                    }
                  }
                  memberIds.slice(0, 220).forEach(addMemberAncestors)
                  let childIndex = {}
                  memberIds.slice(0, 240).forEach((id) => {
                    let character = state.characters[id]
                    if (!character) return
                    ;(character.childrenIds || []).forEach((childId) => {
                      let child = state.characters[childId]
                      if (!child) return
                      let childHouseId = this.resolveCharacterHouseId
                        ? this.resolveCharacterHouseId(child, state, society, { repair: false })
                        : (child.corSocietyHouseId || '')
                      if (childHouseId && String(childHouseId) === String(house.id)) {
                        addMember(childId)
                        childIndex[String(id)] = childIndex[String(id)] || []
                        childIndex[String(id)].push(String(childId))
                      }
                    })
                  })
                  memberIds.slice(0, 260).forEach((id) => {
                    let character = state.characters[id]
                    if (!character) return
                    addAllowed(id)
                    ;[character.fatherId, character.motherId].forEach((parentId) => {
                      if (parentId && memberMap[String(parentId)]) {
                        addAllowed(parentId)
                      }
                    })
                    // Only mark the spouse as an in-tree (non-guest) node when the spouse is a real
                    // member of this house. External spouses are rendered as labeled guests instead
                    // of being promoted to house members.
                    let spouseId = this.treeSpouseId(character, state)
                    if (spouseId && memberMap[String(spouseId)]) {
                      addAllowed(spouseId)
                    }
                  })
                  let roots = this.houseTreeRootIdsFromMembers(memberIds, memberMap, state, house, focusCharacterId, childIndex)
                  return {
                    allowedIds,
                    rootIds: roots,
                    memberIds,
                    memberMap
                  }
                },
        houseTreeRootIdsFromMembers(memberIds, memberMap, state, house, focusCharacterId, childIndex) {
                  let roots = []
                  let rootMap = {}
                  let addRoot = (id) => {
                    if (!id || !memberMap[String(id)] || rootMap[String(id)]) {
                      return
                    }
                    rootMap[String(id)] = true
                    roots.push(String(id))
                  }
                  let hasHouseParent = (id) => {
                    let character = state.characters[id]
                    if (!character) return false
                    return [character.fatherId, character.motherId].some((parentId) => parentId && memberMap[String(parentId)])
                  }
                  if (house && house.founderId && memberMap[String(house.founderId)] && !hasHouseParent(String(house.founderId))) {
                    addRoot(house.founderId)
                  }
                  if (house && house.branchRootId && memberMap[String(house.branchRootId)] && !hasHouseParent(String(house.branchRootId))) {
                    addRoot(house.branchRootId)
                  }
                  memberIds.forEach((id) => {
                    let character = state.characters[id]
                    if (!character) return
                    if (!hasHouseParent(id)) {
                      let spouseId = character.spouseId && memberMap[String(character.spouseId)] ? String(character.spouseId) : ''
                      if (spouseId) {
                        let canonical = this.canonicalTreeCoupleRootId(id, spouseId, state)
                        if (String(canonical) !== String(id) && !rootMap[canonical]) {
                          return
                        }
                      }
                      addRoot(id)
                    }
                  })
                  if (!roots.length && focusCharacterId && memberMap[String(focusCharacterId)]) {
                    addRoot(this.familyTreeRootIdWithinMap(focusCharacterId, state, memberMap))
                  }
                  if (!roots.length && memberIds.length) {
                    addRoot(memberIds[0])
                  }
                  return roots.sort((a, b) => {
                    let first = state.characters[a] || {}
                    let second = state.characters[b] || {}
                    let firstChildren = (childIndex && childIndex[String(a)] ? childIndex[String(a)].length : 0)
                    let secondChildren = (childIndex && childIndex[String(b)] ? childIndex[String(b)].length : 0)
                    if (secondChildren !== firstChildren) return secondChildren - firstChildren
                    return (first.birthYear || 0) - (second.birthYear || 0)
                  }).slice(0, 24)
                },
        dynastyHouseList(society, dynastyId) {
                  // Robust list of every house in the dynasty: the recorded houseIds PLUS any house
                  // whose gameDynastyId matches (covers a stale/incomplete dynasty.houseIds list so
                  // the dynasty tree never omits a house).
                  let map = {}
                  let list = []
                  ;(this.housesForDynasty(society, dynastyId) || []).forEach((house) => {
                    if (house && house.id && !map[String(house.id)]) {
                      map[String(house.id)] = true
                      list.push(house)
                    }
                  })
                  let houses = society && society.houses
                  if (houses) {
                    Object.keys(houses).forEach((houseId) => {
                      let house = houses[houseId]
                      if (house && house.id && !map[String(house.id)] && String(this.gameDynastyIdForHouse(house)) === String(dynastyId)) {
                        map[String(house.id)] = true
                        list.push(house)
                      }
                    })
                  }
                  return list
                },
        familyTreeDynastySeedIds(society, state, dynastyId, belongsToDynastyTree) {
                  let seen = {}
                  let ids = []
                  let add = (id) => {
                    if (!id || seen[id] || !state.characters[id]) {
                      return
                    }
                    if (belongsToDynastyTree ? !belongsToDynastyTree(id, state.characters[id]) : !this.characterBelongsToDynastyTree(state.characters[id], dynastyId, society)) {
                      return
                    }
                    seen[id] = true
                    ids.push(id)
                  }
                  this.dynastyHouseList(society, dynastyId).forEach((house) => {
                    this.houseKnownMemberIds(society, state, house).forEach(add)
                  })
                  let currentDynastyId = this.currentCharacterDynastyId ? this.currentCharacterDynastyId(state) : ''
                  if (currentDynastyId && String(currentDynastyId) === String(dynastyId) && this.playerFamilyMemberIds) {
                    this.playerFamilyMemberIds(state).forEach(add)
                  }
                  let dynasty = state.dynasties && state.dynasties[dynastyId]
                  ;((dynasty && dynasty.memberIds) || []).forEach(add)
                  ids.slice(0, 280).forEach((id) => {
                    let character = state.characters[id]
                    if (!character) return
                    add(character.fatherId)
                    add(character.motherId)
                    ;(character.childrenIds || []).forEach(add)
                  })
                  return ids.slice(0, 340)
                },
        characterBelongsToDynastyTree(character, dynastyId, society) {
                  // Single criterion: dynasty membership derives from house membership. A character
                  // belongs to the dynasty if their resolved house belongs to the dynasty (compared
                  // directly via gameDynastyIdForHouse, never via the possibly-stale dynasty.houseIds
                  // list). This guarantees every real house member is also a dynasty member, so the
                  // house tree is always a subset of the dynasty tree.
                  if (!character || !dynastyId) {
                    return false
                  }
                  if (character.corSocietySlave || character.corSocietySlaveActive) {
                    return false
                  }
                  society = society || this.load()
                  if (this.resolveCharacterHouseId) {
                    let state = daapi.getState()
                    let houseId = this.resolveCharacterHouseId(character, state, society, { repair: false })
                    if (houseId) {
                      return !!this.houseBelongsToDynasty(society, houseId, dynastyId)
                    }
                  }
                  return !!(character.dynastyId && String(character.dynastyId) === String(dynastyId))
                },
        dynastyTreeAllowedIdMap(society, state, dynastyId) {
                  let allowed = {}
                  if (!dynastyId || !state || !state.characters) {
                    return allowed
                  }
                  let belongsCache = {}
                  let belongsToDynastyTree = (id, character) => {
                    character = character || (id && state.characters[id])
                    let cacheKey = id ? String(id) : (character && (character.id || character.characterId) ? String(character.id || character.characterId) : '')
                    if (cacheKey && Object.prototype.hasOwnProperty.call(belongsCache, cacheKey)) {
                      return belongsCache[cacheKey]
                    }
                    // Same single criterion as characterBelongsToDynastyTree: membership in any
                    // house that belongs to this dynasty (robust against stale dynasty.houseIds).
                    let belongs = this.characterBelongsToDynastyTree(character, dynastyId, society)
                    if (cacheKey) {
                      belongsCache[cacheKey] = belongs
                    }
                    return belongs
                  }
                  let add = (id) => {
                    if (!id || !state.characters[id] || !belongsToDynastyTree(id, state.characters[id])) {
                      return
                    }
                    allowed[String(id)] = true
                  }
                  let addAncestors = (id) => {
                    let currentId = id
                    let guard = 0
                    while (currentId && state.characters[currentId] && guard < 18) {
                      let character = state.characters[currentId]
                      add(currentId)
                      ;[character.fatherId, character.motherId].forEach(add)
                      let parents = [character.fatherId, character.motherId].filter((parentId) => {
                        return parentId && state.characters[parentId] && belongsToDynastyTree(parentId, state.characters[parentId])
                      })
                      let nextId = parents[0]
                      if (!nextId || this.sameCharacterId(nextId, currentId)) {
                        break
                      }
                      currentId = nextId
                      guard += 1
                    }
                  }
                  this.familyTreeDynastySeedIds(society, state, dynastyId, belongsToDynastyTree).forEach((id) => {
                    let character = state.characters[id]
                    add(id)
                    if (character) {
                      ;(character.childrenIds || []).forEach(add)
                    }
                    addAncestors(id)
                  })
                  return allowed
                },
        dynastyTreeRootIdsFromAllowed(allowedIds, state, focusId) {
                  let roots = this.treeRootIdsFromAllowed(allowedIds, state, '', 24)
                  if (!roots.length && focusId && allowedIds && allowedIds[String(focusId)]) {
                    roots.push(this.familyTreeRootIdWithinMap(focusId, state, allowedIds))
                  }
                  if (!roots.length) {
                    let fallbackId = Object.keys(allowedIds || {}).sort((a, b) => {
                      let first = state.characters[a] || {}
                      let second = state.characters[b] || {}
                      return (first.birthYear || 0) - (second.birthYear || 0)
                    })[0]
                    if (fallbackId) {
                      roots.push(this.familyTreeRootIdWithinMap(fallbackId, state, allowedIds))
                    }
                  }
                  return roots
                },
        houseTreeSeedIds(society, state, house) {
                  if (!house || !state || !state.characters) {
                    return []
                  }
                  let seen = {}
                  let ids = []
                  let add = (id) => {
                    if (!id || seen[id] || !state.characters[id]) {
                      return
                    }
                    let character = state.characters[id]
                    if (!character || !this.characterBelongsToHouseTree(character, state, society, house)) {
                      return
                    }
                    seen[id] = true
                    ids.push(id)
                  }
                  if (this.resolvedHouseMemberIds) {
                    this.resolvedHouseMemberIds(society, state, house, { includeKnown: true, includeDead: true, repair: false }).forEach(add)
                  } else {
                    this.houseExplicitTreeMemberIds(house).forEach(add)
                    ;(house.knownMemberIds || []).forEach(add)
                  }
                  if (house.isPlayerHouse) {
                    this.playerFamilyMemberIds(state).forEach(add)
                  }
                  return ids.slice(0, 180)
                },
        houseExplicitTreeMemberIds(house) {
                  let seen = {}
                  let ids = []
                  let add = (id) => {
                    if (!id || seen[id]) {
                      return
                    }
                    seen[id] = true
                    ids.push(id)
                  }
                  ;(house.memberIds || []).forEach(add)
                  ;(house.notableIds || []).forEach(add)
                  ;(house.deadMemberIds || []).forEach(add)
                  return ids
                },
        characterBelongsToHouseTree(character, state, society, house) {
                  if (!character || !house) {
                    return false
                  }
                  if (character.corSocietySlave || character.corSocietySlaveActive) {
                    return false
                  }
                  let houseId = this.resolveCharacterHouseId
                    ? this.resolveCharacterHouseId(character, state, society, { repair: false })
                    : this.treeHouseIdForCharacter(character, state, society)
                  return !!(houseId && String(houseId) === String(house.id))
                },
        treeHouseIdForCharacter(character, state, society) {
                  if (!character) {
                    return ''
                  }
                  if (character.corSocietySlave || character.corSocietySlaveActive) {
                    return ''
                  }
                  return this.resolveCharacterHouseId
                    ? this.resolveCharacterHouseId(character, state, society || this.load(), { repair: false })
                    : (character.corSocietyHouseId || '')
                },
        houseTreeAllowedIdMap(society, state, house) {
                  let allowed = {}
                  if (!house || !state || !state.characters) {
                    return allowed
                  }
                  let add = (id) => {
                    if (id && state.characters[id] && this.characterBelongsToHouseTree(state.characters[id], state, society, house)) {
                      allowed[String(id)] = true
                    }
                  }
                  let addAncestors = (id) => {
                    let currentId = id
                    let guard = 0
                    while (currentId && state.characters[currentId] && guard < 18) {
                      let character = state.characters[currentId]
                      add(currentId)
                      add(character.fatherId)
                      add(character.motherId)
                      let parents = [character.fatherId, character.motherId].filter((parentId) => {
                        return parentId && state.characters[parentId] && this.characterBelongsToHouseTree(state.characters[parentId], state, society, house)
                      })
                      let nextId = parents[0]
                      if (!nextId || this.sameCharacterId(nextId, currentId)) {
                        break
                      }
                      currentId = nextId
                      guard += 1
                    }
                  }
                  this.houseTreeSeedIds(society, state, house).forEach((id) => {
                    let character = state.characters[id]
                    add(id)
                    if (character) {
                      add(character.spouseId)
                      ;(character.childrenIds || []).forEach((childId) => {
                        let child = state.characters[childId]
                        if (child && this.characterBelongsToHouseTree(child, state, society, house)) {
                          add(childId)
                        }
                      })
                    }
                    addAncestors(id)
                  })
                  Object.keys(allowed).slice(0, 260).forEach((id) => {
                    let character = state.characters[id]
                    if (!character) return
                    add(character.spouseId)
                  })
                  return allowed
                },
        treeRootIdsFromAllowed(allowedIds, state, focusId, limit) {
                  let roots = []
                  let seen = {}
                  let ids = Object.keys(allowedIds || {})
                  let childIndex = {}
                  ids.forEach((id) => {
                    let character = state.characters[id]
                    if (!character) return
                    ;[character.fatherId, character.motherId].forEach((parentId) => {
                      if (!parentId || !allowedIds[String(parentId)]) return
                      childIndex[String(parentId)] = childIndex[String(parentId)] || []
                      childIndex[String(parentId)].push(id)
                    })
                  })
                  let rootCandidates = {}
                  ids.forEach((id) => {
                    let character = state.characters[id]
                    if (!character) {
                      return
                    }
                    let hasAllowedParent = [character.fatherId, character.motherId].some((parentId) => {
                      return parentId && allowedIds[String(parentId)] && state.characters[parentId]
                    })
                    if (!hasAllowedParent && !seen[id]) {
                      seen[id] = true
                      rootCandidates[id] = true
                    }
                  })
                  Object.keys(rootCandidates).forEach((id) => {
                    let character = state.characters[id]
                    let hasAllowedFamilyEdge = !!(
                      (character.spouseId && allowedIds[String(character.spouseId)]) ||
                      ((childIndex[id] || []).length)
                    )
                    if (ids.length > 1 && !this.sameCharacterId(id, focusId) && !hasAllowedFamilyEdge) {
                      return
                    }
                    let spouseId = character && character.spouseId && rootCandidates[String(character.spouseId)] ? String(character.spouseId) : ''
                    if (spouseId) {
                      let canonical = this.canonicalTreeCoupleRootId(id, spouseId, state)
                      if (String(id) !== String(canonical)) {
                        return
                      }
                    }
                    roots.push(id)
                  })
                  if (!roots.length && focusId && allowedIds[String(focusId)]) {
                    roots.push(this.familyTreeRootIdWithinMap(focusId, state, allowedIds))
                  }
                  let focusRoot = focusId && allowedIds[String(focusId)] ? this.familyTreeRootIdWithinMap(focusId, state, allowedIds) : ''
                  return roots.sort((a, b) => {
                    if (focusRoot && this.sameCharacterId(a, focusRoot)) return -1
                    if (focusRoot && this.sameCharacterId(b, focusRoot)) return 1
                    let first = state.characters[a] || {}
                    let second = state.characters[b] || {}
                    return (first.birthYear || 0) - (second.birthYear || 0)
                  }).slice(0, limit || 10)
                },
        restrictDynastyGraphToHouse(dynastyAllowed, state, society, house) {
                  // Extract the selected house as a sub-graph of the dynasty graph. The member set is
                  // taken from buildHouseTreeModel (the SAME real-member set the Members screen uses,
                  // so Members and the house tree never disagree). The ancestor spine is taken from
                  // the dynasty graph, so every member keeps the exact same parent/child position it
                  // has in the dynasty view.
                  let allowed = {}
                  let members = {}
                  if (!state || !state.characters || !house || !house.id) {
                    return { allowed, members }
                  }
                  dynastyAllowed = dynastyAllowed || {}
                  let model = this.buildHouseTreeModel(society, state, house, '')
                  ;(model.memberIds || []).forEach((id) => {
                    members[String(id)] = true
                    allowed[String(id)] = true
                  })
                  // Walk up to add every in-dynasty ancestor of a house member (both parent lines),
                  // using the dynasty graph's own nodes so positions match the dynasty view.
                  let queue = Object.keys(members)
                  let guard = 0
                  while (queue.length && guard < 5000) {
                    guard += 1
                    let id = String(queue.shift())
                    let character = state.characters[id]
                    if (!character) {
                      continue
                    }
                    ;[character.fatherId, character.motherId].forEach((parentId) => {
                      if (parentId && dynastyAllowed[String(parentId)] && !allowed[String(parentId)]) {
                        allowed[String(parentId)] = true
                        queue.push(String(parentId))
                      }
                    })
                  }
                  return { allowed, members }
                },
        keepConnectedFamilyComponents(allowedIds, realMemberSet, state, focusId) {
                  let ids = Object.keys(allowedIds || {})
                  if (!ids.length || !state || !state.characters) {
                    return allowedIds
                  }
                  let childIndex = {}
                  ids.forEach((id) => {
                    let character = state.characters[id]
                    if (!character) return
                    ;[character.fatherId, character.motherId].forEach((parentId) => {
                      if (!parentId || !allowedIds[String(parentId)]) return
                      childIndex[String(parentId)] = childIndex[String(parentId)] || []
                      childIndex[String(parentId)].push(id)
                    })
                  })
                  let seen = {}
                  let kept = {}
                  let focusKey = focusId !== undefined && focusId !== null ? String(focusId) : ''
                  let buildComponent = (startId) => {
                    let queue = [String(startId)]
                    let component = []
                    let local = {}
                    while (queue.length) {
                      let id = String(queue.shift())
                      if (!allowedIds[id] || local[id]) {
                        continue
                      }
                      let character = state.characters[id]
                      if (!character) {
                        continue
                      }
                      local[id] = true
                      seen[id] = true
                      component.push(id)
                      ;[character.fatherId, character.motherId, character.spouseId].forEach((nextId) => {
                        if (nextId && allowedIds[String(nextId)] && !local[String(nextId)]) {
                          queue.push(String(nextId))
                        }
                      })
                      ;(character.childrenIds || []).forEach((nextId) => {
                        if (nextId && allowedIds[String(nextId)] && !local[String(nextId)]) {
                          queue.push(String(nextId))
                        }
                      })
                      ;(childIndex[id] || []).forEach((nextId) => {
                        if (nextId && allowedIds[String(nextId)] && !local[String(nextId)]) {
                          queue.push(String(nextId))
                        }
                      })
                    }
                    return component
                  }
                  ids.forEach((id) => {
                    if (seen[id]) {
                      return
                    }
                    let component = buildComponent(id)
                    let hasMember = component.some((memberId) => {
                      return (realMemberSet && realMemberSet[String(memberId)]) || (focusKey && this.sameCharacterId(memberId, focusKey))
                    })
                    if (hasMember) {
                      component.forEach((memberId) => {
                        kept[String(memberId)] = true
                      })
                    }
                  })
                  return Object.keys(kept).length ? kept : allowedIds
                },
        scopedTreeAllowedIdMap(allowedIds, state, focusId, options) {
                  let ids = Object.keys(allowedIds || {})
                  if (!ids.length || !state || !state.characters) {
                    return {}
                  }
                  options = options || {}
                  let limit = options.limit || ids.length
                  let componentLimit = options.componentLimit || 8
                  let childIndex = {}
                  ids.forEach((id) => {
                    let character = state.characters[id]
                    if (!character) return
                    ;[character.fatherId, character.motherId].forEach((parentId) => {
                      if (!parentId || !allowedIds[String(parentId)]) return
                      childIndex[String(parentId)] = childIndex[String(parentId)] || []
                      childIndex[String(parentId)].push(id)
                    })
                  })
                  let seen = {}
                  let components = []
                  let buildComponent = (startId) => {
                    let queue = [String(startId)]
                    let component = {}
                    let ordered = []
                    while (queue.length) {
                      let id = String(queue.shift())
                      if (!allowedIds[id] || seen[id] || component[id]) {
                        continue
                      }
                      let character = state.characters[id]
                      if (!character) {
                        continue
                      }
                      component[id] = true
                      ordered.push(id)
                      ;[character.fatherId, character.motherId, character.spouseId].forEach((nextId) => {
                        if (nextId && allowedIds[String(nextId)] && !component[String(nextId)]) {
                          queue.push(String(nextId))
                        }
                      })
                      ;(character.childrenIds || []).forEach((nextId) => {
                        if (nextId && allowedIds[String(nextId)] && !component[String(nextId)]) {
                          queue.push(String(nextId))
                        }
                      })
                      ;(childIndex[id] || []).forEach((nextId) => {
                        if (nextId && allowedIds[String(nextId)] && !component[String(nextId)]) {
                          queue.push(String(nextId))
                        }
                      })
                    }
                    ordered.forEach((id) => {
                      seen[id] = true
                    })
                    return { ids: ordered, map: component }
                  }
                  if (focusId && allowedIds[String(focusId)]) {
                    let focusComponent = buildComponent(String(focusId))
                    if (focusComponent.ids.length) {
                      focusComponent.focus = true
                      components.push(focusComponent)
                    }
                  }
                  ids.forEach((id) => {
                    if (!seen[id]) {
                      let component = buildComponent(id)
                      if (component.ids.length) {
                        components.push(component)
                      }
                    }
                  })
                  components = components.sort((a, b) => {
                    if (!!a.focus !== !!b.focus) return a.focus ? -1 : 1
                    return b.ids.length - a.ids.length
                  }).slice(0, componentLimit)
                  let scoped = {}
                  let count = 0
                  components.forEach((component) => {
                    component.ids.forEach((id) => {
                      if (count >= limit || scoped[id]) {
                        return
                      }
                      scoped[id] = true
                      count += 1
                    })
                  })
                  return scoped
                },
        canonicalTreeCoupleRootId(firstId, secondId, state) {
                  let first = state.characters[firstId] || {}
                  let second = state.characters[secondId] || {}
                  if (this.characterIsMale && this.characterIsMale(first) && !(this.characterIsMale(second))) {
                    return firstId
                  }
                  if (this.characterIsMale && this.characterIsMale(second) && !(this.characterIsMale(first))) {
                    return secondId
                  }
                  let firstBirth = parseInt(first.birthYear || 0, 10)
                  let secondBirth = parseInt(second.birthYear || 0, 10)
                  if (firstBirth !== secondBirth) {
                    return firstBirth <= secondBirth ? firstId : secondId
                  }
                  return String(firstId) <= String(secondId) ? firstId : secondId
                },
        familyTreeRootIdWithinMap(characterId, state, allowedIds) {
                  let current = state.characters[characterId]
                  let guard = 0
                  while (current && guard < 24) {
                    current.id = current.id || characterId
                    let parents = [current.fatherId, current.motherId].filter((id) => id && allowedIds[String(id)] && state.characters[id])
                    if (!parents.length) {
                      break
                    }
                    let sameDynastyParent = parents.find((id) => state.characters[id].dynastyId && state.characters[id].dynastyId === current.dynastyId)
                    let nextId = sameDynastyParent || parents[0]
                    if (!nextId || this.sameCharacterId(nextId, current.id)) {
                      break
                    }
                    current = state.characters[nextId]
                    characterId = nextId
                    guard += 1
                  }
                  return current && current.id ? current.id : characterId
                },
        familyTreeRootIds(characterId, state, society, house, mode, allowedIds) {
                  if (mode === 'known') {
                    return [this.familyTreeStartId(characterId, state, mode)]
                  }
                  if (allowedIds && Object.keys(allowedIds).length) {
                    let limit = mode === 'house' ? 10 : 1
                    let roots = this.treeRootIdsFromAllowed(allowedIds, state, characterId, limit)
                    if (roots.length) {
                      return roots
                    }
                  }
                  if (allowedIds) {
                    return allowedIds[String(characterId)] ? [characterId] : []
                  }
                  let character = state.characters[characterId]
                  if (!character) {
                    return [characterId]
                  }
                  character.id = character.id || characterId
                  let dynastyId = character.dynastyId || this.gameDynastyIdForHouse(house)
                  if (!dynastyId) {
                    return [this.familyTreeStartId(character.id, state, mode)]
                  }
                  let roots = []
                  let seenRoots = {}
                  let focusRoot = this.familyTreeRootId(character.id, state)
                  let addRoot = (id) => {
                    if (!id || !state.characters[id] || seenRoots[id]) {
                      return
                    }
                    seenRoots[id] = true
                    roots.push(id)
                  }
                  addRoot(focusRoot)
                  this.familyTreeDynastySeedIds(society, state, dynastyId).forEach((seedId) => {
                    addRoot(this.familyTreeRootId(seedId, state))
                  })
                  return roots.sort((a, b) => {
                    if (this.sameCharacterId(a, focusRoot)) return -1
                    if (this.sameCharacterId(b, focusRoot)) return 1
                    let first = state.characters[a] || {}
                    let second = state.characters[b] || {}
                    return (first.birthYear || 0) - (second.birthYear || 0)
                  }).slice(0, 18)
                },
        familyTreeRootId(characterId, state) {
                  let current = state.characters[characterId]
                  let guard = 0
                  while (current && guard < 24) {
                    current.id = current.id || characterId
                    let parents = [current.fatherId, current.motherId].filter((id) => id && state.characters[id])
                    if (!parents.length) {
                      break
                    }
                    let sameDynastyParent = parents.find((id) => state.characters[id].dynastyId && state.characters[id].dynastyId === current.dynastyId)
                    let nextId = sameDynastyParent || parents[0]
                    if (!nextId || this.sameCharacterId(nextId, current.id)) {
                      break
                    }
                    current = state.characters[nextId]
                    characterId = nextId
                    guard += 1
                  }
                  return current && current.id ? current.id : characterId
                },
        collectFamilyTreeNameCollisions(rootIds, focusId, state, allowedIds) {
                  let collisions = {}
                  if (!state || !state.characters) {
                    return collisions
                  }
                  let seen = {}
                  let nameIds = {}
                  let queue = (rootIds || []).map((id) => String(id))
                  if (focusId !== undefined && focusId !== null && focusId !== '') {
                    queue.push(String(focusId))
                  }
                  let guard = 0
                  while (queue.length && guard < 2000) {
                    guard += 1
                    let id = String(queue.shift())
                    if (!id || seen[id] || !state.characters[id]) {
                      continue
                    }
                    seen[id] = true
                    let character = state.characters[id]
                    let name = this.characterName({ ...character, id }, state)
                    nameIds[name] = nameIds[name] || {}
                    nameIds[name][id] = true
                    let spouseId = this.treeSpouseId(character, state)
                    if (spouseId && state.characters[spouseId] && !seen[String(spouseId)]) {
                      queue.push(String(spouseId))
                    }
                    this.treeChildrenIds(character, state).forEach((childId) => {
                      if (allowedIds && !allowedIds[String(childId)]) {
                        return
                      }
                      if (!seen[String(childId)]) {
                        queue.push(String(childId))
                      }
                    })
                  }
                  Object.keys(nameIds).forEach((name) => {
                    if (Object.keys(nameIds[name]).length > 1) {
                      collisions[name] = true
                    }
                  })
                  return collisions
                },
        familyTreeDisplayName(character, state, nameMap) {
                  let name = this.characterName(character, state)
                  if (!nameMap || !nameMap[name]) {
                    return name
                  }
                  // Disambiguate distinct people who share the same praenomen + dynasty name.
                  if (character.isDead && character.deathYear) {
                    return name + ' (d. ' + character.deathYear + ')'
                  }
                  if (character.birthYear) {
                    return name + ' (b. ' + character.birthYear + ')'
                  }
                  return name + ' #' + String(character.id || '').slice(-4)
                },
        createFamilyTreeBranch({ rootId, focusId, state, society, fallbackHouse, depth, depthLimit, treeBudget, mode, allowedIds, visited, returnTo, returnPage, origin, nameMap }) {
                  let character = state.characters[rootId]
                  let branch = document.createElement('div')
                  branch.className = 'cor-society-tree-family'
                  treeBudget = treeBudget || { remaining: 140, hidden: 0 }
                  if (treeBudget.remaining <= 0) {
                    treeBudget.hidden += 1
                    branch.appendChild(this.createFamilyTreeEmptyCard('More kin hidden'))
                    return branch
                  }
                  treeBudget.remaining -= 1
                  if (!character) {
                    branch.appendChild(this.createFamilyTreeEmptyCard('Unknown'))
                    return branch
                  }
                  character.id = character.id || rootId
                  let key = String(character.id)
                  let alreadyVisited = visited[key]
                  if (alreadyVisited) {
                    return branch
                  }
                  visited[key] = true
        
                  let spouseId = this.treeSpouseId(character, state)
                  let spouse = spouseId && state.characters[spouseId] ? state.characters[spouseId] : false
                  let spouseIsTreeGuest = !!(spouse && allowedIds && !allowedIds[String(spouseId)])
                  if (spouse) {
                    spouse.id = spouse.id || spouseId
                    if (visited[String(spouse.id)]) {
                      spouse = false
                      spouseIsTreeGuest = false
                    } else {
                      visited[String(spouse.id)] = true
                    }
                  }
                  let children = this.treeChildrenIds(character, state)
                  if (allowedIds) {
                    children = children.filter((childId) => allowedIds[String(childId)])
                  }
                  if (depth >= depthLimit) {
                    children = []
                  }
        
                  let couple = document.createElement('div')
                  couple.className = 'cor-society-tree-couple' + (children.length ? ' has-children' : '')
                  couple.appendChild(this.createFamilyTreeCharacterCard(character, state, society, fallbackHouse, this.treeRoleLabel(character, focusId, depth, false, mode), focusId, returnTo, returnPage, mode, false, origin, nameMap))
                  if (spouse && !this.sameCharacterId(spouse.id, character.id)) {
                    couple.appendChild(this.createFamilyTreeCharacterCard(spouse, state, society, fallbackHouse, this.treeRoleLabel(spouse, focusId, depth, true, mode, spouseIsTreeGuest), focusId, returnTo, returnPage, mode, spouseIsTreeGuest, origin, nameMap))
                  }
                  branch.appendChild(couple)
        
                  if (children.length) {
                    let childrenWrap = document.createElement('div')
                    childrenWrap.className = 'cor-society-tree-children'
                    children.forEach((childId) => {
                      let childBranch = this.createFamilyTreeBranch({
                        rootId: childId,
                        focusId,
                        state,
                        society,
                        fallbackHouse,
                        depth: depth + 1,
                        depthLimit,
                        treeBudget,
                        mode,
                        allowedIds,
                        visited,
                        returnTo,
                        returnPage,
                        origin,
                        nameMap
                      })
                      if (childBranch && childBranch.childNodes && childBranch.childNodes.length) {
                        childrenWrap.appendChild(childBranch)
                      }
                    })
                    if (childrenWrap.childNodes.length) {
                      branch.appendChild(childrenWrap)
                    }
                  }
                  return branch
                },
        createFamilyTreeCharacterCard(character, state, society, fallbackHouse, role, focusId, returnTo, returnPage, mode, isTreeGuest, origin, nameMap) {
                  let house = this.treeHouseForCharacter(character, state, society, fallbackHouse)
                  let card = document.createElement('button')
                  card.type = 'button'
                  card.id = 'familyTreeCharacterBox_' + character.id
                  card.className = 'btn btn-sm btn-outline-secondary btn-family-tree-card cor-society-tree-card'
                  if (house && house.id) {
                    card.setAttribute('data-cor-society-house-id', String(house.id))
                    card.className += house.originHouse ? ' is-origin-house' : ' is-cadet-house'
                  }
                  if (this.sameCharacterId(character.id, focusId)) {
                    card.className += ' active'
                  }
                  if (character.isDead) {
                    card.className += ' is-dead'
                  }
                  if (isTreeGuest) {
                    card.className += ' is-tree-guest'
                  }
                  card.title = this.characterTooltip(character, state)
                  card.addEventListener('click', () => {
                    let nextHouseId = this.houseIdForCharacter(character, state, society) || (house && house.id) || ''
                    let nextHouse = society.houses[nextHouseId] || house || fallbackHouse
                    let nextMode = mode === 'house' ? 'house' : 'full'
                    if (isTreeGuest && mode !== 'house') {
                      nextMode = 'full'
                    }
                    this.openGraphicalFamilyTree({
                      society,
                      state,
                      house: nextHouse,
                      houseId: nextHouseId,
                      characterId: character.id,
                      group: '',
                      page: 0,
                      mode: nextMode,
                      returnTo,
                      returnPage,
                      origin
                    })
                  })
        
                  let portrait = document.createElement('img')
                  portrait.className = 'img-fluid icon-character-small cor-society-tree-card-portrait'
                  portrait.src = this.characterPortrait(character, state, house)
                  portrait.alt = ''
                  card.appendChild(portrait)
        
                  let text = document.createElement('span')
                  text.className = 'cor-society-tree-card-text'
                  card.appendChild(text)
        
                  let roleEl = document.createElement('span')
                  roleEl.className = 'cor-society-tree-card-role'
                  roleEl.textContent = role
                  text.appendChild(roleEl)
        
                  let nameEl = document.createElement('span')
                  nameEl.className = 'cor-society-tree-card-name'
                  nameEl.textContent = this.familyTreeDisplayName(character, state, nameMap)
                  text.appendChild(nameEl)
        
                  let metaEl = document.createElement('span')
                  metaEl.className = 'cor-society-tree-card-meta'
                  metaEl.textContent = this.treeCharacterMeta(character, state)
                  text.appendChild(metaEl)
        
                  if (house) {
                    let houseEl = document.createElement('span')
                    houseEl.className = 'cor-society-tree-card-house'
                    let houseIcon = document.createElement('img')
                    houseIcon.src = this.houseCrestIcon(society, house)
                    houseIcon.alt = ''
                    houseEl.appendChild(houseIcon)
                    let houseText = document.createElement('span')
                    houseText.textContent = this.treeHouseLabel(house)
                    houseEl.appendChild(houseText)
                    text.appendChild(houseEl)
                  }
                  return card
                },
        createFamilyTreeEmptyCard(label) {
                  let card = document.createElement('div')
                  card.className = 'cor-society-tree-card cor-society-tree-empty-card'
                  card.textContent = label
                  return card
                },
        treeHouseForCharacter(character, state, society, fallbackHouse) {
                  let houseId = this.treeHouseIdForCharacter(character, state, society)
                  if (houseId && society && society.houses && society.houses[houseId]) {
                    return society.houses[houseId]
                  }
                  return fallbackHouse || false
                },
        treeHouseLabel(house) {
                  if (!house) {
                    return ''
                  }
                  let prefix = house.originHouse ? 'Origin' : 'Cadet'
                  return prefix + ': ' + (house.name || 'House')
                },
        treeRoleLabel(character, focusId, depth, isSpouse, mode, isTreeGuest) {
                  if (this.sameCharacterId(character.id, focusId)) return 'Selected'
                  if (isSpouse) return isTreeGuest ? 'Spouse (guest)' : 'Spouse'
                  if (mode === 'house' && depth === 0) return character.isDead ? 'Ancestor' : 'House branch'
                  if (depth === 0) return character.isDead ? 'Ancestor' : 'Root'
                  return character.isDead ? 'Ancestor' : 'Kin'
                },
        treeCharacterMeta(character, state) {
                  if (character.isDead) {
                    return 'Died ' + (character.deathYear || 'unknown')
                  }
                  return 'Age ' + this.age(character, state)
                },
        treeSpouseId(character, state) {
                  if (character.spouseId && state.characters[character.spouseId]) {
                    return character.spouseId
                  }
                  let children = this.treeChildrenIds(character, state)
                  for (let i = 0; i < children.length; i++) {
                    let child = state.characters[children[i]]
                    if (!child) {
                      continue
                    }
                    if (this.sameCharacterId(child.fatherId, character.id) && child.motherId && state.characters[child.motherId]) {
                      return child.motherId
                    }
                    if (this.sameCharacterId(child.motherId, character.id) && child.fatherId && state.characters[child.fatherId]) {
                      return child.fatherId
                    }
                  }
                  return ''
                },
        treeChildrenIds(character, state) {
                  let ids = []
                  let seen = {}
                  let add = (id) => {
                    if (!id || seen[id] || !state.characters[id] || this.sameCharacterId(id, character.id)) {
                      return
                    }
                    seen[id] = true
                    ids.push(id)
                  }
                  ;(character.childrenIds || []).forEach(add)
                  return ids.sort((a, b) => {
                    let first = state.characters[a] || {}
                    let second = state.characters[b] || {}
                    return (first.birthYear || 0) - (second.birthYear || 0)
                  })
                },
        openTextFamilyTreeFallback({ society, state, house, houseId, characterId, group, page, mode, returnTo, returnPage, origin }) {
                  let character = state.characters[characterId]
                  if (!character) {
                    this.openHouse({ houseId, returnTo, returnPage })
                    return
                  }
                  character.id = character.id || characterId
                  let relatives = this.familyTreeRelatives(character, state)
                  let message = [
                    this.characterLink(character.id, state),
                    'Father: ' + this.characterLink(character.fatherId, state),
                    'Mother: ' + this.characterLink(character.motherId, state),
                    'Spouse: ' + this.characterLink(character.spouseId, state),
                    'Children: ' + (relatives.children.length ? relatives.children.map((id) => this.characterLink(id, state)).join(', ') : 'none'),
                    'Siblings: ' + (relatives.siblings.length ? relatives.siblings.map((id) => this.characterLink(id, state)).join(', ') : 'none')
                  ].join('\n')
                  let relativeOptions = []
                  ;[
                    { label: 'Father', id: character.fatherId },
                    { label: 'Mother', id: character.motherId },
                    { label: 'Spouse', id: character.spouseId }
                  ].forEach((relative) => {
                    if (relative.id && state.characters[relative.id]) {
                      relativeOptions.push(this.familyRelativeOption(relative.label, relative.id, state, society, houseId, returnTo, returnPage))
                    }
                  })
                  relatives.children.slice(0, 8).forEach((relativeId) => {
                    relativeOptions.push(this.familyRelativeOption('Child', relativeId, state, society, houseId, returnTo, returnPage))
                  })
                  relatives.siblings.slice(0, 4).forEach((relativeId) => {
                    relativeOptions.push(this.familyRelativeOption('Sibling', relativeId, state, society, houseId, returnTo, returnPage))
                  })
                  let nav = this.navContext(returnTo, returnPage)
                  let backAction = (origin && origin.method) ? {
                    event: this.event,
                    method: origin.method,
                    context: origin.context || {}
                  } : returnTo === 'deadHouse' ? {
                    event: this.event,
                    method: 'openDeadHouse',
                    context: { houseId, page: returnPage || 0 }
                  } : group ? {
                    event: this.event,
                    method: 'openPerson',
                    context: { houseId, characterId, group, page: page || 0, ...nav }
                  } : {
                    event: this.event,
                    method: 'openPerson',
                    context: { houseId, characterId, ...nav }
                  }
                  relativeOptions.push({
                    text: 'Back',
                    action: backAction
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: mode === 'known' ? 'Known Family' : mode === 'full' ? 'Dynasty Tree' : 'Family Tree',
                    message,
                    image: this.characterPortrait(character, state, house),
                    options: relativeOptions
                  })
                },
        openMarriageHousehold({ houseId }) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  if (!house) {
                    this.openHub()
                    return
                  }
                  let access = this.marriageOptionInfo(society, state, house)
                  if (!access.available) {
                    this.pushModal({
                      title: 'Marriage unavailable',
                      message: access.tooltip,
                      image: this.houseCrestIcon(society, house),
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
                  let candidates = this.playerMarriageCandidates(state)
                  let options = candidates.slice(0, 12).map((character) => {
                    return {
                      text: this.characterName(character, state),
                      tooltip: this.characterTooltip(character, state),
                      icons: [this.characterPortrait(character, state)],
                      action: {
                        event: this.event,
                        method: 'openMarriageCandidates',
                        context: { houseId, playerCharacterId: character.id }
                      }
                    }
                  })
                  options.push({
                    text: 'Back',
                    action: {
                      event: this.event,
                      method: 'openHouse',
                      context: { houseId }
                    }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Arrange marriage',
                    message: candidates.length ? 'Choose one of your unmarried adult family members.' : 'No unmarried adult in your family is available.',
                    image: this.houseCrestIcon(society, house),
                    options
                  })
                },
        openMarriageCandidates({ houseId, playerCharacterId }) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  let playerCharacter = state.characters[playerCharacterId]
                  if (!house || !playerCharacter) {
                    this.openHouse({ houseId })
                    return
                  }
                  let access = this.marriageOptionInfo(society, state, house)
                  if (!access.available) {
                    this.pushModal({
                      title: 'Marriage unavailable',
                      message: access.tooltip,
                      image: this.houseCrestIcon(society, house),
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
                  let candidates = this.houseMarriageCandidates(house, state, playerCharacter)
                  if (!candidates.length && this.livingGeneratedCount(society, state) < 180) {
                    let prospectId = this.generateMarriageProspect(society, state, house, playerCharacter)
                    if (!prospectId) {
                      candidates = []
                    } else {
                      this.save(society)
                      state = daapi.getState()
                      try {
                        let prospect = daapi.getCharacter({ characterId: prospectId })
                        if (prospect && state.characters) {
                          state.characters[prospectId] = prospect
                          this.invalidateStateSnapshot()
                        }
                      } catch (err) {
                        console.warn(err)
                      }
                      house = society.houses[houseId]
                      playerCharacter = state.characters[playerCharacterId]
                      candidates = this.houseMarriageCandidates(house, state, playerCharacter)
                    }
                  }
                  let options = candidates.slice(0, 12).map((character) => {
                    return {
                      text: this.characterName(character, state),
                      tooltip: this.characterTooltip(character, state),
                      icons: [this.characterPortrait(character, state, house), this.houseCrestIcon(society, house)],
                      action: {
                        event: this.event,
                        method: 'confirmSocietyMarriage',
                        context: { houseId, playerCharacterId, spouseId: character.id }
                      }
                    }
                  })
                  options.push({
                    text: 'Back',
                    action: {
                      event: this.event,
                      method: 'openMarriageHousehold',
                      context: { houseId }
                    }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Marriage with ' + house.name,
                    message: candidates.length ? 'Choose a spouse for ' + this.characterName(playerCharacter, state) + '.' : 'No compatible unmarried adult is available in this house.',
                    image: this.characterPortrait(playerCharacter, state),
                    options
                  })
                },
        confirmSocietyMarriage({ houseId, playerCharacterId, spouseId }) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  let playerCharacter = state.characters[playerCharacterId]
                  let spouse = state.characters[spouseId]
                  if (!house || !playerCharacter || !spouse) {
                    this.openHouse({ houseId })
                    return
                  }
                  if (house.stratum === 'poor' || this.isSlaveCharacter(spouse, house)) {
                    this.pushModal({
                      title: 'Marriage unavailable',
                      message: 'Your family cannot arrange a marriage with an enslaved character. Use Household Slaves for slave-to-slave household marriages.',
                      image: this.affairIcon('marriage'),
                      options: [{ text: 'Back', action: { event: this.event, method: 'openHouse', context: { houseId } } }]
                    })
                    return
                  }
                  let matrilineal = !this.characterIsMale(playerCharacter)
                  let message = [
                    this.characterName(playerCharacter, state),
                    'and',
                    this.characterName(spouse, state),
                    '',
                    matrilineal ? 'The marriage will be matrilineal, keeping your household line central.' : 'The marriage will follow the usual household line.'
                  ].join('\n')
                  this.pushModal({
                    societyMenu: true,
                    title: 'Confirm marriage?',
                    message,
                    image: this.characterPortrait(spouse, state, house),
                    options: [
                      {
                        variant: 'info',
                        text: 'Arrange wedding',
                        icons: [this.characterPortrait(playerCharacter, state), this.characterPortrait(spouse, state, house)],
                        action: {
                          event: this.event,
                          method: 'performSocietyMarriage',
                          context: { houseId, playerCharacterId, spouseId, isMatrilineal: matrilineal }
                        }
                      },
                      {
                        text: 'Cancel',
                        action: {
                          event: this.event,
                          method: 'openMarriageCandidates',
                          context: { houseId, playerCharacterId }
                        }
                      }
                    ]
                  })
                },
        performSocietyMarriage({ houseId, playerCharacterId, spouseId, isMatrilineal }) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  let playerCharacter = state.characters[playerCharacterId]
                  let spouse = state.characters[spouseId]
                  if (!house || !playerCharacter || !spouse) {
                    this.openHouse({ houseId })
                    return
                  }
                  playerCharacter.id = playerCharacter.id || playerCharacterId
                  spouse.id = spouse.id || spouseId
                  if (house.stratum === 'poor' || this.isSlaveCharacter(spouse, house) || !this.isMarriageEligible(playerCharacter, state) || !this.isMarriageEligible(spouse, state) || !this.isMarriageCompatible(playerCharacter, spouse, state)) {
                    this.pushModal({
                      title: 'Marriage no longer valid',
                      message: 'The selected marriage is no longer available. One character may already be married, too young, too old, dead, enslaved, blocked from marriage, from the same dynasty, closely related, or incompatible.',
                      image: this.affairIcon('marriage'),
                      options: [
                        {
                          text: 'Choose again',
                          action: {
                            event: this.event,
                            method: 'openMarriageHousehold',
                            context: { houseId }
                          }
                        },
                        {
                          text: 'Back to house',
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
                  try {
                    daapi.performMarriage({ characterId: playerCharacterId, spouseId, isMatrilineal: !!isMatrilineal })
                  } catch (err) {
                    console.warn(err)
                    this.pushModal({
                      title: 'Marriage failed',
                      message: 'The vanilla marriage API rejected this wedding: ' + err.name + ': ' + err.message + '\nNo Society marriage effects were applied.',
                      image: this.affairIcon('marriage'),
                      options: [
                        {
                          text: 'Choose again',
                          action: {
                            event: this.event,
                            method: 'openMarriageHousehold',
                            context: { houseId }
                          }
                        },
                        {
                          text: 'Back to house',
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
                  try {
                    daapi.forceUpdateCharacterDisplay({ characterId: playerCharacterId })
                    daapi.forceUpdateCharacterDisplay({ characterId: spouseId })
                  } catch (err) {
                    console.warn(err)
                  }
                  state = daapi.getState()
                  playerCharacter = (state.characters && state.characters[playerCharacterId]) || playerCharacter
                  spouse = (state.characters && state.characters[spouseId]) || spouse
                  let effects = this.marriageEffects(state, house)
                  this.applyStats(effects.stats)
                  if (effects.revenue) {
                    try {
                      daapi.addAdditiveModifier({
                        key: 'revenue',
                        id: 'cor_society_marriage_' + this.safeId(house.id),
                        durationInMonths: 24,
                        amount: effects.revenue
                      })
                    } catch (err) {
                      console.warn(err)
                    }
                  }
                  house.relation = this.clamp((house.relation || 0) + effects.relation, -100, 100)
                  house.favor = (house.favor || 0) + 1
                  this.changePersonalRelation(society, playerCharacterId, spouseId, 45, 'friend')
                  house.lastFamilyEvent = 'Marriage alliance with your household.'
                  this.log(society, 'A marriage joins your household with ' + house.name + ': ' + this.characterName(playerCharacter, state) + ' and ' + this.characterName(spouse, state) + '.', 'marriage', house.id)
                  this.save(society)
                  this.pushModal({
                    title: 'Marriage arranged',
                    message: [
                      this.characterName(spouse, state) + ' is now married to ' + this.characterName(playerCharacter, state) + '.',
                      effects.summary,
                      'The vanilla family screen should show the spouse link after the game refreshes.'
                    ].join('\n'),
                    image: this.characterPortrait(spouse, state, house),
                    options: [
                      {
                        text: 'Back to house',
                        action: {
                          event: this.event,
                          method: 'openHouse',
                          context: { houseId }
                        }
                      }
                    ]
                  })
                },
        openBankOfRome() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let bank = society.bank || {}
                  let principal = Math.round(parseFloat(bank.principal || 0))
                  let interest = principal ? this.bankInterest(society) : 0
                  let cash = parseFloat(((state || {}).current || {}).cash || 0)
                  let debtRelief = cash < 0 ? Math.max(50, Math.ceil(Math.abs(cash) + 25)) : 0
                  let loanAmounts = [250, 600, 1200, 2500].map((amount) => {
                    return {
                      text: 'Borrow ' + amount,
                      tooltip: 'Receive cash now. The Bank of Rome will expect yearly interest until principal is repaid.',
                      statChanges: { cash: amount },
                      icons: [this.bundledIcon('bank_of_rome', 'money')],
                      action: {
                        event: this.event,
                        method: 'takeBankLoan',
                        context: { amount }
                      }
                    }
                  })
                  let options = []
                  if (debtRelief) {
                    options.push({
                      variant: 'danger',
                      text: 'Borrow to cover debt (' + debtRelief + ')',
                      tooltip: 'Emergency loan sized around your current negative cash. This can help before the game forces sales, but annual interest still applies.',
                      statChanges: { cash: debtRelief },
                      icons: [this.bundledIcon('bank_of_rome', 'money'), this.affairIcon('coins')],
                      action: {
                        event: this.event,
                        method: 'takeEmergencyDebtLoan',
                        context: { amount: debtRelief }
                      }
                    })
                  }
                  if (principal) {
                    let payChunk = Math.min(principal, Math.max(50, Math.round(principal * 0.25)))
                    options.push({
                      variant: 'info',
                      text: 'Pay yearly interest (' + interest + ')',
                      disabled: cash < interest,
                      showDisabledWithTooltip: true,
                      tooltip: 'Pays this year\'s interest only. Principal remains at ' + principal + '.',
                      statChanges: { cash: -interest },
                      icons: [this.bundledIcon('bank_of_rome', 'money')],
                      action: {
                        event: this.event,
                        method: 'payBankLoan',
                        context: { amount: 0, interestOnly: true }
                      }
                    })
                    options.push({
                      text: 'Pay principal (' + payChunk + ')',
                      disabled: cash < (interest + payChunk),
                      showDisabledWithTooltip: true,
                      tooltip: 'Pays interest plus ' + payChunk + ' principal.',
                      statChanges: { cash: -(interest + payChunk) },
                      icons: [this.affairIcon('coins')],
                      action: {
                        event: this.event,
                        method: 'payBankLoan',
                        context: { amount: payChunk }
                      }
                    })
                    options.push({
                      text: 'Clear loan (' + (interest + principal) + ')',
                      disabled: cash < (interest + principal),
                      showDisabledWithTooltip: true,
                      tooltip: 'Pays all interest and clears the full principal.',
                      statChanges: { cash: -(interest + principal) },
                      icons: [this.affairIcon('coins')],
                      action: {
                        event: this.event,
                        method: 'payBankLoan',
                        context: { amount: principal }
                      }
                    })
                  }
                  options = options.concat(loanAmounts)
                  options.push({
                    variant: 'info',
                    text: 'Private loans',
                    tooltip: 'Offer your own money to Society houses as private credit. Repayment depends on the borrower house economy.',
                    icons: [this.affairIcon('bank'), this.affairIcon('trade')],
                    action: {
                      event: this.event,
                      method: 'openPrivateLoans'
                    }
                  })
                  options.push({
                    text: 'Back',
                    action: {
                      event: this.event,
                      method: 'openHub'
                    }
                  })
                  let summaryOptions = [
                    this.summaryOption('Principal', principal + ' cash owed', [this.bundledIcon('bank_of_rome', 'money')], 'Outstanding loan principal.'),
                    this.summaryOption('Annual interest', interest + ' cash', [this.affairIcon('coins')], 'Interest is checked at the start of each year.'),
                    this.summaryOption('Payments', 'Loans taken ' + Math.round(bank.loansTaken || 0) + '; last paid ' + (bank.lastPaymentYear || 'never') + '.', [this.affairIcon('log')], 'Bank memory kept inside Society state.')
                  ]
                  if (cash < 0) {
                    summaryOptions.push(this.summaryOption('Debt pressure', Math.round(cash) + ' cash', [this.affairIcon('rivalry')], 'Emergency borrowing is available while your household is in negative cash.'))
                  }
                  this.pushModal({
                    societyMenu: true,
                    title: 'Bank of Rome',
                    message: 'Bank summary.',
                    societySummaryOptions: summaryOptions,
                    image: this.bundledIcon('bank_of_rome', 'money'),
                    options
                  })
                },
        takeBankLoan({ amount } = {}) {
                  let society = this.loadForAction()
                  amount = Math.max(1, Math.round(parseFloat(amount || 0)))
                  society.bank = society.bank || {}
                  society.bank.principal = Math.max(0, Math.round(parseFloat(society.bank.principal || 0) + amount))
                  society.bank.loansTaken = Math.round(parseFloat(society.bank.loansTaken || 0) + 1)
                  this.applyStats({ cash: amount })
                  this.log(society, 'You borrow ' + amount + ' from the Bank of Rome.', 'bank')
                  this.save(society)
                  this.openBankOfRome()
                },
        takeEmergencyDebtLoan({ amount } = {}) {
                  let state = daapi.getState()
                  let cash = parseFloat(((state || {}).current || {}).cash || 0)
                  amount = Math.max(Math.ceil(Math.abs(Math.min(0, cash)) + 25), Math.round(parseFloat(amount || 0)), 50)
                  this.takeBankLoan({ amount })
                },
        payBankLoan({ amount, interestOnly } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  society.bank = {
                    principal: 0,
                    interestRate: 0.083,
                    loansTaken: 0,
                    lastPaymentYear: '',
                    lastNoticeYear: '',
                    lastClearedYear: '',
                    ...(society.bank || {})
                  }
                  let principal = Math.max(0, Math.round(parseFloat((society.bank && society.bank.principal) || 0)))
                  let interest = principal ? this.bankInterest(society) : 0
                  amount = Math.max(0, Math.round(parseFloat(amount || 0)))
                  if (interestOnly) {
                    amount = 0
                  }
                  amount = Math.min(principal, amount)
                  let total = interest + amount
                  let cash = this.cashBeforeClick(state)
                  if (total <= 0 || cash < total) {
                    this.refundVanillaStatChanges()
                    this.pushModal({
                      societyMenu: true,
                      title: 'Bank payment unavailable',
                      message: 'You do not have enough cash for that payment.',
                      image: this.bundledIcon('bank_of_rome', 'money'),
                      options: [
                        {
                          text: 'Back',
                          action: { event: this.event, method: 'openBankOfRome' }
                        }
                      ]
                    })
                    return
                  }
                  this.applyStats({ cash: -total })
                  society.bank.principal = Math.max(0, principal - amount)
                  society.bank.lastPaymentYear = String(state.year || '')
                  society.bank.lastNoticeYear = String(state.year || '')
                  if (society.bank.principal <= 0) {
                    society.bank.principal = 0
                    society.bank.lastClearedYear = String(state.year || '')
                  }
                  this.log(society, 'Bank payment made: ' + total + ' cash, principal now ' + society.bank.principal + '.', 'bank')
                  this.save(society)
                  this.openBankOfRome()
                },
        deferBankPayment() {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let interest = this.bankInterest(society)
                  society.bank.principal = Math.max(0, Math.round(parseFloat(society.bank.principal || 0) + interest))
                  society.bank.lastNoticeYear = String(state.year || '')
                  this.applyStats({ prestige: -8, influence: -20 })
                  this.log(society, 'You defer Bank of Rome interest; debt grows by ' + interest + ' and standing suffers.', 'bank')
                  this.save(society)
                },
        openPrivateLoans({ page } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  page = parseInt(page || 0, 10)
                  let cash = parseFloat(((state || {}).current || {}).cash || 0)
                  let active = (society.privateLoans || []).filter((loan) => loan && loan.status === 'active')
                  let options = active.slice(0, 8).map((loan) => {
                    let borrower = String(loan.borrowerHouseId || '') === 'player' ? { name: 'Your household' } : society.houses && society.houses[loan.borrowerHouseId]
                    let lender = loan.lenderHouseId === 'player' ? 'Your household' : ((society.houses && society.houses[loan.lenderHouseId] && society.houses[loan.lenderHouseId].name) || 'Unknown lender')
                    let principal = Math.round(parseFloat(loan.principal || 0))
                    let interest = Math.max(1, Math.ceil(principal * parseFloat(loan.interestRate || 0.10)))
                    return {
                      text: lender + ' -> ' + (borrower ? borrower.name : 'lost house') + ' (' + (principal + interest) + ')',
                      tooltip: 'Principal: ' + principal + '\nExpected interest: ' + interest + '\nDue: ' + (loan.dueMonth || 'unknown'),
                      disabled: true,
                      showDisabledWithTooltip: true,
                      icons: [this.affairIcon('bank')]
                    }
                  })
                  options.unshift({
                    variant: 'info',
                    text: 'Borrow',
                    tooltip: this.privateLoanActiveForBorrower(society, 'player')
                      ? 'You already have an active private loan as borrower. Repay or settle it before requesting another.'
                      : 'Request private loans from wealthy Society houses. Houses can accept or refuse depending on cash, relation, stability, and amount.',
                    disabled: this.privateLoanActiveForBorrower(society, 'player'),
                    showDisabledWithTooltip: true,
                    icons: [this.affairIcon('coins'), this.affairIcon('bank')],
                    action: { event: this.event, method: 'openPrivateLoanBorrowers' }
                  })
                  let candidates = this.sortedHouses(society)
                    .filter((house) => {
                      return house &&
                        String(house.id) !== String(this.currentCharacterDynastyId(state)) &&
                        this.houseLivingMemberIds(society, state, house).length &&
                        !this.privateLoanActiveForBorrower(society, house.id)
                    })
                    .sort((a, b) => parseFloat(((a.ai || {}).cash) || 0) - parseFloat(((b.ai || {}).cash) || 0))
                    .slice(page * 5, page * 5 + 5)
                  candidates.forEach((house) => {
                    let amounts = this.privateLoanOfferAmounts(state, house, cash)
                    let disabled = !amounts.length || cash < 50
                    options.push({
                      variant: 'info',
                      text: 'Offer terms to ' + house.name,
                      tooltip: amounts.length
                        ? 'Open possible private loan amounts. The house may accept or refuse depending on need, relation, stability, and debt burden.\nExpected rate: ' + Math.round(this.privateLoanRate(house) * 100) + '%.'
                        : 'You do not have enough spare cash to make a sensible private loan offer.',
                      disabled,
                      showDisabledWithTooltip: true,
                      icons: [this.houseCrestIcon(society, house), this.affairIcon('bank')],
                      action: {
                        event: this.event,
                        method: 'openPrivateLoanOffer',
                        context: { houseId: house.id, page }
                      }
                    })
                  })
                  let totalCandidates = this.sortedHouses(society).filter((house) => house && String(house.id) !== String(this.currentCharacterDynastyId(state)) && this.houseLivingMemberIds(society, state, house).length && !this.privateLoanActiveForBorrower(society, house.id)).length
                  if ((page + 1) * 5 < totalCandidates) {
                    options.push({
                      text: 'Next houses',
                      action: { event: this.event, method: 'openPrivateLoans', context: { page: page + 1 } }
                    })
                  }
                  if (page > 0) {
                    options.push({
                      text: 'Previous houses',
                      action: { event: this.event, method: 'openPrivateLoans', context: { page: page - 1 } }
                    })
                  }
                  options.push({
                    text: 'Back',
                    action: { event: this.event, method: 'openBankOfRome' }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Private Loans',
                    message: 'Offer private credit, request loans from wealthy houses, or inspect active contracts. NPC houses can also lend to each other when one has surplus and another needs liquidity.',
                    societySummaryOptions: [
                      this.summaryOption('Your cash', Math.round(cash), [this.affairIcon('coins')], 'Cash available to lend.'),
                      this.summaryOption('Active loans', active.length, [this.affairIcon('bank')], 'Active private loans in Society.'),
                      this.summaryOption('Lend targets', totalCandidates, [this.affairIcon('trade')], 'Eligible active houses you can offer private credit to.')
                    ],
                    image: this.affairIcon('bank'),
                    options
                  })
                },
        openPrivateLoanBorrowers({ page } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  page = parseInt(page || 0, 10)
                  let hasActiveBorrowing = this.privateLoanActiveForBorrower(society, 'player')
                  let houses = this.sortedHouses(society)
                    .filter((house) => {
                      if (!house || String(house.id) === String(this.currentCharacterDynastyId(state)) || !this.houseLivingMemberIds(society, state, house).length) return false
                      return this.privateLoanRequestAmounts(state, house).length > 0
                    })
                    .sort((a, b) => parseFloat(((b.ai || {}).cash) || 0) - parseFloat(((a.ai || {}).cash) || 0))
                  let options = houses.slice(page * 6, page * 6 + 6).map((house) => {
                    let amounts = this.privateLoanRequestAmounts(state, house)
                    let best = amounts.length ? amounts[amounts.length - 1] : 0
                    return {
                      variant: 'info',
                      text: 'Ask ' + house.name,
                      tooltip: 'Estimated house cash: ' + Math.round(parseFloat(((house.ai || {}).cash) || 0)) + '\nMaximum available request: ' + best + '\nRelation: ' + this.signed(house.relation || 0) + '\nOpen amount choices.',
                      disabled: hasActiveBorrowing || !amounts.length,
                      showDisabledWithTooltip: true,
                      icons: [this.houseCrestIcon(society, house), this.affairIcon('bank')],
                      action: { event: this.event, method: 'openPrivateLoanRequest', context: { houseId: house.id, page } }
                    }
                  })
                  if ((page + 1) * 6 < houses.length) {
                    options.push({ text: 'Next lenders', action: { event: this.event, method: 'openPrivateLoanBorrowers', context: { page: page + 1 } } })
                  }
                  if (page > 0) {
                    options.push({ text: 'Previous lenders', action: { event: this.event, method: 'openPrivateLoanBorrowers', context: { page: page - 1 } } })
                  }
                  options.push({ text: 'Back', action: { event: this.event, method: 'openPrivateLoans' } })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Borrow Private Money',
                    message: hasActiveBorrowing ? 'Your household already has an active private loan as borrower.' : 'Choose a wealthy house and request private credit. Acceptance is not guaranteed.',
                    societySummaryOptions: [
                      this.summaryOption('Available lenders', houses.length, [this.affairIcon('bank')], 'Houses with enough cash to consider a private loan request.'),
                      this.summaryOption('Your cash', Math.round(parseFloat(((state || {}).current || {}).cash || 0)), [this.affairIcon('coins')], 'Current household cash.'),
                      this.summaryOption('Rule', hasActiveBorrowing ? 'one active debt' : 'free to ask', [this.affairIcon('log')], 'Only one active private player-borrowed loan is allowed at a time.')
                    ],
                    image: this.affairIcon('bank'),
                    options
                  })
                },
        openPrivateLoanRequest({ houseId, page } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses && society.houses[houseId]
                  if (!house) {
                    this.openPrivateLoanBorrowers({ page: page || 0 })
                    return
                  }
                  let amounts = this.privateLoanRequestAmounts(state, house)
                  let activeDebt = this.privateLoanActiveForBorrower(society, 'player')
                  let options = amounts.map((amount) => {
                    let chance = this.privateLoanRequestAcceptanceChance(society, state, house, amount)
                    let rate = this.privateLoanRateForPlayerRequest(house, state)
                    let interest = Math.max(1, Math.ceil(amount * rate))
                    return {
                      variant: chance >= 0.5 ? 'info' : 'danger',
                      text: 'Request private loan (' + this.privateLoanAcceptanceText(chance) + ')',
                      tooltip: 'Private loan request to ' + house.name + '.\nAcceptance: ' + Math.round(chance * 100) + '% (' + this.privateLoanAcceptanceText(chance) + ').\nExpected repayment: ' + (amount + interest) + ' after interest.\nIf accepted now: +' + amount + ' cash. If refused: no cash changes.',
                      statChanges: { cash: amount },
                      disabled: activeDebt || parseFloat(((house.ai || {}).cash) || 0) < amount,
                      showDisabledWithTooltip: true,
                      icons: [this.affairIcon('coins'), this.houseCrestIcon(society, house)],
                      action: { event: this.event, method: 'requestPrivateLoan', context: { houseId, amount, page: page || 0 } }
                    }
                  })
                  if (!options.length) {
                    options.push({
                      disabled: true,
                      showDisabledWithTooltip: true,
                      text: 'No amount available',
                      tooltip: house.name + ' does not have enough spare cash to lend right now.',
                      icons: [this.affairIcon('bank')]
                    })
                  }
                  options.push({ text: 'Back', action: { event: this.event, method: 'openPrivateLoanBorrowers', context: { page: page || 0 } } })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Request Private Loan',
                    message: 'Choose the amount to request from ' + house.name + '. The house can accept or refuse.',
                    societySummaryOptions: [
                      this.summaryOption('House cash', Math.round(parseFloat(((house.ai || {}).cash) || 0)), [this.affairIcon('coins')], 'Estimated liquid cash held by this house.'),
                      this.summaryOption('Relation', this.signed(house.relation || 0), [this.affairIcon('support')], 'Better relations improve acceptance.'),
                      this.summaryOption('Rate', Math.round(this.privateLoanRateForPlayerRequest(house, state) * 100) + '%', [this.affairIcon('bank')], 'Interest rate for this request.')
                    ],
                    image: this.houseCrestIcon(society, house),
                    options
                  })
                },
        requestPrivateLoan({ houseId, amount, page } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let house = society.houses && society.houses[houseId]
                  amount = Math.max(1, Math.round(parseFloat(amount || 0)))
                  let lenderCash = parseFloat(((house || {}).ai || {}).cash || 0)
                  if (!house || this.privateLoanActiveForBorrower(society, 'player') || lenderCash < amount || amount > Math.floor(lenderCash * 0.5)) {
                    this.openPrivateLoanBorrowers({ page: page || 0 })
                    return
                  }
                  let chance = this.privateLoanRequestAcceptanceChance(society, state, house, amount)
                  let accepted = Math.random() < chance
                  if (accepted) {
                    house.ai = house.ai || {}
                    house.ai.cash = parseFloat(house.ai.cash || 0) - amount
                    let loan = this.createPrivateLoan(society, state, houseId, 'player', amount, 'playerBorrow')
                    if (!loan) {
                      house.ai.cash = parseFloat(house.ai.cash || 0) + amount
                      this.openPrivateLoanBorrowers({ page: page || 0 })
                      return
                    }
                    this.applyStats({ cash: amount })
                    house.relation = this.clamp((house.relation || 0) + 3, -100, 100)
                    house.lastFamilyEvent = 'Extends private credit to your household.'
                    house.lastFamilyKind = 'bank'
                    this.log(society, house.name + ' accepts your private loan request of ' + amount + '.', 'bank', house.id)
                    this.save(society)
                    this.pushModal({
                      societyMenu: true,
                      title: 'Loan Request Accepted',
                      message: house.name + ' lends your household ' + amount + ' cash. Repayment will be requested at the due date.',
                      image: this.houseCrestIcon(society, house),
                      options: [
                        { text: 'Private loans', action: { event: this.event, method: 'openPrivateLoans' } },
                        { text: 'House', action: { event: this.event, method: 'openHouse', context: { houseId } } }
                      ]
                    })
                    return
                  }
                  house.relation = this.clamp((house.relation || 0) - (amount > (house.wealth || 100) * 0.55 ? 3 : 1), -100, 100)
                  house.lastFamilyEvent = 'Refuses a private loan request from your household.'
                  house.lastFamilyKind = 'bank'
                  this.log(society, house.name + ' refuses your private loan request of ' + amount + '.', 'bank', house.id)
                  this.save(society)
                  this.pushModal({
                    societyMenu: true,
                    title: 'Loan Request Refused',
                    message: house.name + ' refuses to lend ' + amount + ' cash. No money changes hands.',
                    image: this.houseCrestIcon(society, house),
                    options: [
                      { text: 'Try another amount', action: { event: this.event, method: 'openPrivateLoanRequest', context: { houseId, page: page || 0 } } },
                      { text: 'Lenders', action: { event: this.event, method: 'openPrivateLoanBorrowers', context: { page: page || 0 } } }
                    ]
                  })
                },
        openPrivateLoanOffer({ houseId, page } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses && society.houses[houseId]
                  let cash = parseFloat(((state || {}).current || {}).cash || 0)
                  if (!house) {
                    this.openPrivateLoans({ page: page || 0 })
                    return
                  }
                  let amounts = this.privateLoanOfferAmounts(state, house, cash)
                  let options = amounts.map((amount) => {
                    let chance = this.privateLoanAcceptanceChance(society, state, house, amount, 'player')
                    let rate = this.privateLoanRate(house)
                    let interest = Math.max(1, Math.ceil(amount * rate))
                    return {
                      variant: chance >= 0.5 ? 'info' : 'danger',
                      text: 'Offer private loan (' + this.privateLoanAcceptanceText(chance) + ')',
                      tooltip: 'Private loan offer to ' + house.name + '.\nAcceptance: ' + Math.round(chance * 100) + '% (' + this.privateLoanAcceptanceText(chance) + ').\nExpected repayment: ' + (amount + interest) + ' after interest.\nIf accepted now: -' + amount + ' cash. If refused: no cash is spent.',
                      statChanges: { cash: -amount },
                      disabled: cash < amount || this.privateLoanActiveForBorrower(society, houseId),
                      showDisabledWithTooltip: true,
                      icons: [this.affairIcon('coins'), this.affairIcon('bank')],
                      action: {
                        event: this.event,
                        method: 'offerPrivateLoan',
                        context: { houseId, amount, page: page || 0 }
                      }
                    }
                  })
                  if (!options.length) {
                    options.push({
                      disabled: true,
                      showDisabledWithTooltip: true,
                      text: 'No sensible offer available',
                      tooltip: 'You need more spare cash or the house is not a useful borrower right now.',
                      icons: [this.affairIcon('bank')]
                    })
                  }
                  options.push({
                    text: 'Back',
                    action: { event: this.event, method: 'openPrivateLoans', context: { page: page || 0 } }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Private Loan Offer',
                    message: 'Choose the amount to offer ' + house.name + '. The house can accept or refuse; no money leaves your household unless the offer is accepted.',
                    societySummaryOptions: [
                      this.summaryOption('Your cash', Math.round(cash), [this.affairIcon('coins')], 'Cash available right now.'),
                      this.summaryOption('House cash', Math.round(parseFloat(((house.ai || {}).cash) || 0)), [this.affairIcon('trade')], 'Estimated liquid cash held by this house.'),
                      this.summaryOption('Rate', Math.round(this.privateLoanRate(house) * 100) + '%', [this.affairIcon('bank')], 'Interest rate based on stability and risk.')
                    ],
                    image: this.houseCrestIcon(society, house),
                    options
                  })
                },
        offerPrivateLoan({ houseId, amount, page } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let house = society.houses && society.houses[houseId]
                  amount = Math.max(1, Math.round(parseFloat(amount || 0)))
                  let cash = parseFloat(((state || {}).current || {}).cash || 0)
                  if (!house || cash < amount || amount > Math.floor(cash * 0.5) || this.privateLoanActiveForBorrower(society, houseId)) {
                    this.openPrivateLoans({ page: page || 0 })
                    return
                  }
                  let chance = this.privateLoanAcceptanceChance(society, state, house, amount, 'player')
                  let accepted = Math.random() < chance
                  if (accepted) {
                    let loan = this.createPrivateLoan(society, state, 'player', houseId, amount, 'player')
                    if (!loan) {
                      this.openPrivateLoans({ page: page || 0 })
                      return
                    }
                    this.applyStats({ cash: -amount })
                    house.relation = this.clamp((house.relation || 0) + 6, -100, 100)
                    house.lastFamilyEvent = 'Accepts a private loan from your household.'
                    house.lastFamilyKind = 'bank'
                    this.log(society, house.name + ' accepts your private loan of ' + amount + '.', 'bank', house.id)
                    this.save(society)
                    this.pushModal({
                      societyMenu: true,
                      title: 'Loan Accepted',
                      message: house.name + ' accepts the private loan of ' + amount + '. The contract is now active and repayment will be checked at the due date.',
                      image: this.houseCrestIcon(society, house),
                      options: [
                        { text: 'Private loans', action: { event: this.event, method: 'openPrivateLoans', context: { page: page || 0 } } },
                        { text: 'House', action: { event: this.event, method: 'openHouse', context: { houseId } } }
                      ]
                    })
                    return
                  }
                  house.relation = this.clamp((house.relation || 0) - (amount > (house.wealth || 100) * 0.45 ? 2 : 0), -100, 100)
                  house.lastFamilyEvent = 'Refuses a private loan offer from your household.'
                  house.lastFamilyKind = 'bank'
                  this.log(society, house.name + ' refuses your private loan offer of ' + amount + '.', 'bank', house.id)
                  this.save(society)
                  this.pushModal({
                    societyMenu: true,
                    title: 'Loan Refused',
                    message: house.name + ' refuses the private loan of ' + amount + '. No cash is spent. Lower amounts, better relations, or greater need make acceptance more likely.',
                    image: this.houseCrestIcon(society, house),
                    options: [
                      { text: 'Try another amount', action: { event: this.event, method: 'openPrivateLoanOffer', context: { houseId, page: page || 0 } } },
                      { text: 'Private loans', action: { event: this.event, method: 'openPrivateLoans', context: { page: page || 0 } } }
                    ]
                  })
                },
        openHouseholdSlaves() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let slaves = this.playerSlaveRecords(society, state)
                  let options = slaves.map((slave) => {
                    let character = slave.characterId && state.characters && state.characters[slave.characterId]
                    let fullName = character ? this.slaveDisplayName({ ...character, id: slave.characterId }, slave, state) : slave.name
                    return {
                      text: fullName + ' - ' + this.slaveTypeLabel(slave.type) + ' L' + Math.round(slave.level || 1),
                      tooltip: 'Owned household slave.\nOrigin: ' + this.slaveOriginDescription(slave.origin || (character && character.corSocietySlaveOrigin) || 'unknown') + '\nOpen for full name, origin, house links, sale, or manumission.',
                      icons: [character ? this.characterPortrait({ ...character, id: slave.characterId }, state) : this.slaveTypeIcon(slave.type), this.slaveTypeIcon(slave.type)],
                      action: {
                        event: this.event,
                        method: 'openManageSlave',
                        context: { slaveKey: slave.key, characterId: slave.characterId }
                      }
                    }
                  })
                  options.push({
                    variant: 'info',
                    text: 'Slave market',
                    tooltip: 'Browse known enslaved Society characters and new market offers.',
                    icons: [this.slaveTypeIcon('money')],
                    action: {
                      event: this.event,
                      method: 'openSlaveMarket'
                    }
                  })
                  options.push({
                    text: 'Back',
                    action: { event: this.event, method: 'openHub' }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Household Slaves',
                    message: 'Household slave management.',
                    societySummaryOptions: [
                      this.summaryOption('Owned', slaves.length + ' active household slaves', [this.slaveTypeIcon('household')], 'Each owned slave is backed by a real game character.'),
                      this.summaryOption('Access', 'Open a slave to see full name, origin house, and management actions.', [this.affairIcon('familyTree')], 'Known origin/owner houses can be opened directly.'),
                      this.summaryOption('Work', 'Tasks give modest owner benefits: cash, prestige, influence, education, health care, or labor.', this.slaveTypes().map((type) => this.slaveTypeIcon(type)), 'Effects are intentionally capped for balance.')
                    ],
                    image: this.slaveTypeIcon('household'),
                    options
                  })
                },
        knownEnslavedCandidates(society, state, limit, options) {
                  let month = this.monthKey(state || daapi.getState())
                  if (!options && this._enslavedCache && this._enslavedCache.month === month) {
                    return this._enslavedCache.list
                  }
                  let currentId = this.currentCharacterId(state)
                  let current = state.characters && state.characters[currentId]
                  let playerDynastyId = current && current.dynastyId
                  let candidates = []
                  let houses = (options && options.houses) || this.sortedHouses(society)
                  houses.forEach((house) => {
                    if (!(options && options.houses)) this.refreshHouseMemberLists(society, state, house)
                    this.visibleHousePeople(house, state).forEach((characterId) => {
                      let character = state.characters && state.characters[characterId]
                      if (!character || character.isDead || (playerDynastyId && character.dynastyId === playerDynastyId)) return
                      character.id = character.id || characterId
                      let info = this.enslavedPurchaseInfo(society, state, house, character)
                      if (info.available || info.visible) {
                        candidates.push({ house, character, info })
                      }
                    })
                  })
                  let list = candidates.sort((a, b) => a.info.cost - b.info.cost)
                  if (!options) this._enslavedCache = { month, list }
                  return list
                },
        ensureSlaveMarketOffers(society, state, count) {
                  count = count || 6
                  society.slaveMarketOffers = society.slaveMarketOffers || []
                  let active = []
                  society.slaveMarketOffers.forEach((offer) => {
                    let character = offer && offer.characterId && state.characters && state.characters[offer.characterId]
                    if (!offer || offer.active === false || !character || character.isDead) {
                      return
                    }
                    if (character.corSocietySlaveActive && !character.corSocietySlaveMarket) {
                      return
                    }
                    active.push(offer)
                  })
                  society.slaveMarketOffers = active.slice(-count)
                  let biases = [0, 0, 1, 1, 2, 3]
                  while (society.slaveMarketOffers.length < count) {
                    let template = this.randomSlaveTemplate(false, biases[society.slaveMarketOffers.length] || 0)
                    template.market = true
                    template.ownerHouseId = ''
                    let record = this.generateSlaveCharacter(society, state, false, template)
                    state = daapi.getState()
                    let character = record.characterId && state.characters && state.characters[record.characterId]
                    if (!character) {
                      break
                    }
                    let cost = this.slaveCost(record)
                    let offerId = 'market_' + this.safeId(record.characterId)
                    try {
                      daapi.updateCharacter({
                        characterId: record.characterId,
                        character: {
                          dynastyId: '',
                          corSocietySlaveMarket: true,
                          corSocietySlaveActive: false,
                          corSocietyMarketOfferId: offerId,
                          corSocietySlaveFullName: record.fullName,
                          corSocietySlaveOrigin: record.origin,
                          flagDoNotCull: true,
                          flagCannotMarry: true
                        }
                      })
                    } catch (err) {
                      console.warn(err)
                    }
                    society.slaveMarketOffers.push({
                      offerId,
                      characterId: record.characterId,
                      template: record,
                      cost,
                      createdMonth: this.monthKey(state),
                      active: true
                    })
                  }
                  return society.slaveMarketOffers.slice(0, count)
                },
        transferMarketSlaveToPlayer(society, state, offer, template, cost) {
                  template = template || {}
                  let characterId = template.characterId || (offer && offer.characterId)
                  let character = characterId && state.characters && state.characters[characterId]
                  if (!character) {
                    return false
                  }
                  let playerDynastyId = this.currentCharacterDynastyId(state)
                  let type = template.type || character.corSocietySlaveType || 'labor'
                  let level = Math.max(1, Math.round(template.level || character.corSocietySlaveLevel || 1))
                  let task = template.task || character.corSocietySlaveTask || this.slaveTypeProfile(type).task || type
                  let origin = template.origin || character.corSocietySlaveOrigin || this.randomSlaveOrigin()
                  let fullName = template.fullName || character.corSocietySlaveFullName || this.slaveDisplayName(character, template, state)
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
                        corSocietySlaveOrigin: origin,
                        corSocietySlaveFullName: fullName,
                        corSocietySlaveTask: task,
                        corSocietySlaveSavings: Math.max(0, parseFloat(template.savings || character.corSocietySlaveSavings || 0)),
                        corSocietyOrigin: 'enslaved_dependant',
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
                  return this.playerSlaveRecordFromCharacter({
                    key: template.key || ('slave_' + this.safeId(characterId)),
                    characterId,
                    name: fullName,
                    fullName,
                    type,
                    level,
                    age: this.age(updated, state),
                    origin,
                    task,
                    savings: Math.max(0, parseFloat(template.savings || updated.corSocietySlaveSavings || 0))
                  }, updated, state)
                },
        openSlaveMarket({ page } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  page = parseInt(page || 0, 10)
                  let known = this.knownEnslavedCandidates(society, state)
                  let pageSize = 7
                  let shown = known.slice(page * pageSize, page * pageSize + pageSize)
                  let knownNavOptions = []
                  let options = shown.map((item) => {
                    let name = this.slaveDisplayName(item.character, null, state)
                    let houseName = item.house && item.house.name || ''
                    let suffix = !item.character.corSocietySlaveFullName && houseName && name.toLowerCase().indexOf(houseName.toLowerCase()) < 0 ? ' of ' + houseName : ''
                    return {
                      text: name + suffix + ' (' + item.info.cost + ')',
                      disabled: !item.info.available,
                      showDisabledWithTooltip: true,
                      tooltip: item.info.tooltip,
                      icons: [this.characterPortrait(item.character, state, item.house), this.houseCrestIcon(society, item.house), this.slaveTypeIcon(item.info.type)],
                      action: {
                        event: this.event,
                        method: 'buyEnslavedCharacter',
                        context: { houseId: item.house.id, characterId: item.character.id, cost: item.info.cost }
                      }
                    }
                  })
                  if (page * pageSize + pageSize < known.length) {
                    knownNavOptions.push({
                      text: 'Next known people',
                      action: { event: this.event, method: 'openSlaveMarket', context: { page: page + 1 } }
                    })
                  }
                  if (page > 0) {
                    knownNavOptions.push({
                      text: 'Previous known people',
                      action: { event: this.event, method: 'openSlaveMarket', context: { page: page - 1 } }
                    })
                  }
                  if (page === 0) {
                    let offers = this.ensureSlaveMarketOffers(society, state, 6)
                    state = daapi.getState()
                    offers.forEach((offer) => {
                      let template = offer.template || {}
                      let character = offer.characterId && state.characters && state.characters[offer.characterId]
                      let cost = Math.max(1, Math.round(parseFloat(offer.cost || this.slaveCost(template))))
                      if (!character) {
                        return
                      }
                      character.id = character.id || offer.characterId
                      let label = this.slaveTypeLabel(template.type || character.corSocietySlaveType)
                      let level = Math.max(1, Math.round(template.level || character.corSocietySlaveLevel || 1))
                      options.push({
                        text: this.slaveDisplayName(character, template, state) + ' - ' + label + ' L' + level + ' (' + cost + ')',
                        tooltip: 'Market slave already generated as a real character.\nOrigin: ' + this.slaveOriginDescription(template.origin || character.corSocietySlaveOrigin) + '\nDefault work: ' + this.slaveTaskInfo(template).label + '.\nBuying transfers this character into your household.',
                        disabled: parseFloat(((state || {}).current || {}).cash || 0) < cost,
                        showDisabledWithTooltip: true,
                        icons: [this.characterPortrait(character, state), this.slaveTypeIcon(template.type || character.corSocietySlaveType), this.affairIcon('coins')],
                        action: {
                          event: this.event,
                          method: 'buySlave',
                          context: { offerId: offer.offerId, template, cost }
                        }
                      })
                    })
                    this.save(society)
                  }
                  options = options.concat(knownNavOptions)
                  options.push({
                    text: 'Back',
                    action: { event: this.event, method: 'openHouseholdSlaves' }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Slave market',
                    message: 'Known enslaved dependants appear first; generated market offers appear after them.',
                    image: this.slaveTypeIcon('money'),
                    options
                  })
                },
        buySlave({ offerId, template, cost } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let offer = offerId && (society.slaveMarketOffers || []).find((item) => item && item.offerId === offerId)
                  if (offer) {
                    template = { ...(offer.template || {}), ...(template || {}), characterId: offer.characterId }
                    cost = offer.cost || cost
                  }
                  template = template || this.randomSlaveTemplate(false)
                  // A purchased slave becomes an ACTIVE owned dependant, never a market listing.
                  // Leaving market:true here would make generateSlaveCharacter set
                  // corSocietySlaveActive:false, so the slave gets purged on the next monthly tick.
                  template = { ...template, market: false }
                  cost = Math.max(1, Math.round(parseFloat(cost || this.slaveCost(template))))
                  if (this.cashBeforeClick(state) < cost) {
                    this.refundVanillaStatChanges()
                    this.openSlaveMarket()
                    return
                  }
                  let playerRecord = false
                  if (template.characterId && state.characters && state.characters[template.characterId]) {
                    playerRecord = this.transferMarketSlaveToPlayer(society, state, offer, template, cost)
                  }
                  if (!playerRecord) {
                    // No live market character to transfer: generate a fresh owned slave.
                    // Drop any stale/missing characterId so generation always mints a valid one.
                    let genTemplate = { ...template }
                    delete genTemplate.characterId
                    let record = this.generateSlaveCharacter(society, state, false, genTemplate)
                    state = daapi.getState()
                    let character = record && record.characterId && state.characters ? state.characters[record.characterId] : false
                    if (record && record.characterId) {
                      playerRecord = this.playerSlaveRecordFromCharacter(record, character, state)
                    }
                  }
                  // Abort and refund (never charged) if we could not secure a valid slave.
                  if (!playerRecord || !playerRecord.characterId) {
                    this.log(society, 'The slave purchase could not be completed; no money was spent.', 'slaves')
                    this.save(society)
                    this.openSlaveMarket()
                    return
                  }
                  // Only now that a valid slave is secured do we charge the buyer.
                  this.applyStats({ cash: -cost })
                  state = daapi.getState()
                  let boughtCharacter = state.characters && state.characters[playerRecord.characterId]
                  if (this.registerPlayerSlaveRecord) {
                    playerRecord = this.registerPlayerSlaveRecord(society, state, playerRecord, boughtCharacter) || playerRecord
                  } else {
                    society.playerSlaves = society.playerSlaves || []
                    society.playerSlaves = society.playerSlaves.filter((slave) => slave && slave.characterId && !this.sameCharacterId(slave.characterId, playerRecord.characterId))
                    society.playerSlaves.push(playerRecord)
                  }
                  if (offerId) {
                    society.slaveMarketOffers = (society.slaveMarketOffers || []).filter((item) => item && item.offerId !== offerId)
                  }
                  this.log(society, 'You purchase ' + playerRecord.name + ', an enslaved ' + this.slaveTypeLabel(playerRecord.type).toLowerCase() + '.', 'slaves')
                  this.save(society)
                  this.openManageSlave({ slaveKey: playerRecord.key, characterId: playerRecord.characterId })
                },
        openManageSlave({ slaveKey, characterId } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let record = (society.playerSlaves || []).find((slave) => {
                    return (slaveKey && slave.key === slaveKey) || (characterId && this.sameCharacterId(slave.characterId, characterId))
                  })
                  if (!record) {
                    this.openHouseholdSlaves()
                    return
                  }
                  let character = record.characterId && state.characters && state.characters[record.characterId]
                  let fullName = character ? this.slaveDisplayName({ ...character, id: record.characterId }, record, state) : record.name
                  let originHouseId = record.originHouseId || (character && character.corSocietyOriginHouseId) || ''
                  let previousOwnerHouseId = record.previousOwnerHouseId || (character && character.corSocietyPreviousOwnerHouseId) || ''
                  let origin = record.origin || (character && character.corSocietySlaveOrigin) || 'unknown'
                  let marriageCandidates = this.ownedSlaveMarriageCandidates(society, state, record)
                  let childrenUnder13 = this.householdChildrenUnder13(state)
                  let freedomPrice = this.slaveFreedomPrice(record)
                  let savings = Math.round(parseFloat(record.savings || 0))
                  let cash = parseFloat(((state || {}).current || {}).cash || 0)
                  let currentDynastyId = this.currentCharacterDynastyId(state)
                  let currentCharacterId = this.currentCharacterId(state)
                  let currentCharacter = currentCharacterId && state.characters && state.characters[currentCharacterId]
                  let fatherId = character && (character.corSocietyTrueFatherId || character.fatherId)
                  let father = fatherId && state.characters && state.characters[fatherId]
                  if (father) father.id = father.id || fatherId
                  let isPrivateCompanyBastard = !!(character && character.corSocietyOrigin === 'private_company_bastard')
                  let canLegitimize = !!(isPrivateCompanyBastard && father && !father.corSocietySlave && father.dynastyId && father.dynastyId === currentDynastyId)
                  let legitimizeCost = Math.max(25, Math.round(freedomPrice * 0.6))
                  let slaveAge = character ? this.age(character, state) : parseFloat(record.age || 0)
                  let privateCompanyCooldown = record.nextCompanionMonth && !this.monthKeyReached(record.nextCompanionMonth, state)
                  let privateCompanyDisabled = !!privateCompanyCooldown || !character || slaveAge < 10 || (currentCharacter && this.age(currentCharacter, state) < 16)
                  let privateCompanyTooltip = privateCompanyCooldown ? 'Available again after ' + record.nextCompanionMonth + '.' :
                    !character ? 'No linked character record is available.' :
                      slaveAge < 10 ? 'Slave must be at least 10 years old.' :
                        currentCharacter && this.age(currentCharacter, state) < 16 ? 'The current household head is not an adult.' :
                          'Private company action. Consequences: prestige effect, relation softening, risk of illegitimate child if female and fertile.'
                  let options = []
                  if (originHouseId && society.houses[originHouseId]) {
                    options.push({
                      variant: 'info',
                      text: 'Open origin house',
                      tooltip: 'Open the Society house this person came from.',
                      icons: [this.houseCrestIcon(society, society.houses[originHouseId])],
                      action: { event: this.event, method: 'openHouse', context: { houseId: originHouseId, returnTo: 'hub' } }
                    })
                  }
                  if (previousOwnerHouseId && society.houses[previousOwnerHouseId] && previousOwnerHouseId !== originHouseId) {
                    options.push({
                      variant: 'info',
                      text: 'Open previous owner',
                      tooltip: 'Open the house that sold this person.',
                      icons: [this.houseCrestIcon(society, society.houses[previousOwnerHouseId])],
                      action: { event: this.event, method: 'openHouse', context: { houseId: previousOwnerHouseId, returnTo: 'hub' } }
                    })
                  }
                  options.push({
                    variant: 'info',
                    text: 'Assign task',
                    disabled: this.slaveTaskCooldownActive(record, state),
                    showDisabledWithTooltip: true,
                    tooltip: this.slaveTaskCooldownActive(record, state) ? 'Task changes are cooling down until ' + record.nextTaskChangeMonth + '.' : 'Choose this slave\'s household task. Tasks affect modest periodic outputs and savings.',
                    icons: [this.slaveTypeIcon(this.slaveTaskInfo(record).icon)],
                    action: { event: this.event, method: 'openAssignSlaveTask', context: { slaveKey: record.key, characterId: record.characterId } }
                  })
                  options.push({
                    variant: 'info',
                    text: 'Choose pupil' + (childrenUnder13.length ? '' : ' (no child)'),
                    disabled: !childrenUnder13.length || this.slaveTaskInfo(record).type !== 'educator',
                    showDisabledWithTooltip: true,
                    tooltip: !childrenUnder13.length ? 'No household child under 13 is available.' : this.slaveTaskInfo(record).type !== 'educator' ? 'Assign this slave to Educate children before selecting a pupil.' : 'Choose which household child under 13 this slave will teach.',
                    icons: [this.slaveTypeIcon('educator')],
                    action: { event: this.event, method: 'openSlaveEducationTargets', context: { slaveKey: record.key, characterId: record.characterId } }
                  })
                  options.push({
                    variant: 'info',
                    text: 'Private company',
                    disabled: privateCompanyDisabled,
                    showDisabledWithTooltip: true,
                    tooltip: privateCompanyTooltip,
                    icons: [this.slaveTypeIcon('entertainer')],
                    action: { event: this.event, method: 'privateCompanySlave', context: { slaveKey: record.key, characterId: record.characterId } }
                  })
                  if (isPrivateCompanyBastard) {
                    options.push({
                      variant: 'info',
                      text: 'Legitimize bastard (' + legitimizeCost + ')',
                      disabled: !canLegitimize || cash < legitimizeCost,
                      showDisabledWithTooltip: true,
                      tooltip: !canLegitimize ? 'Only the free father from your dynasty can legitimize this child.' : cash < legitimizeCost ? 'Need ' + legitimizeCost + ' cash.' : 'Acknowledge the child through the free parent. Consequences: removes slave status, joins the father dynasty, costs cash and standing.',
                      statChanges: canLegitimize && cash >= legitimizeCost ? { cash: -legitimizeCost, prestige: -6, influence: -8 } : undefined,
                      icons: [this.affairIcon('birth'), this.affairIcon('familyTree')],
                      action: { event: this.event, method: 'legitimizeSlaveBastard', context: { slaveKey: record.key, characterId: record.characterId, cost: legitimizeCost } }
                    })
                  }
                  options.push({
                    variant: 'info',
                    text: 'Marry to household slave' + (marriageCandidates.length ? '' : ' (none)'),
                    disabled: !marriageCandidates.length,
                    showDisabledWithTooltip: true,
                    tooltip: marriageCandidates.length ? 'Choose another unmarried adult household slave of different gender.' : 'No compatible unmarried adult slave of different gender is owned by your household.',
                    icons: [this.affairIcon('marriage')],
                    action: { event: this.event, method: 'openSlaveMarriageCandidates', context: { slaveKey: record.key, characterId: record.characterId } }
                  })
                  options.push({
                    variant: 'info',
                    text: 'Accept self-purchase (' + freedomPrice + ')',
                    disabled: savings < freedomPrice,
                    showDisabledWithTooltip: true,
                    tooltip: savings >= freedomPrice ? 'Accept this slave\'s saved payment and manumit them into their own Freedmen house.' : 'Savings ' + savings + '/' + freedomPrice + '. This slave is still trying to buy freedom.',
                    statChanges: savings >= freedomPrice ? { cash: freedomPrice, prestige: 8, influence: 10 } : undefined,
                    icons: [this.affairIcon('coins'), this.affairIcon('prestige')],
                    action: { event: this.event, method: 'acceptSlaveSelfPurchase', context: { slaveKey: record.key, characterId: record.characterId, price: freedomPrice } }
                  })
                  options.push({
                    text: 'Sell (' + Math.round(this.slaveCost(record) * 0.55) + ')',
                    tooltip: 'Sell this slave out of your household. The character remains in the game but no longer gives household effects.',
                    statChanges: { cash: Math.round(this.slaveCost(record) * 0.55) },
                    icons: [this.affairIcon('coins')],
                    action: { event: this.event, method: 'sellSlave', context: { slaveKey: record.key, characterId: record.characterId } }
                  })
                  options.push({
                    variant: 'info',
                    text: 'Manumit',
                    tooltip: 'Free this slave. They keep existing as a real character, but leave the household slave list.',
                    statChanges: { prestige: 8, influence: 10 },
                    icons: [this.affairIcon('prestige')],
                    action: { event: this.event, method: 'freeSlave', context: { slaveKey: record.key, characterId: record.characterId } }
                  })
                  options.push({
                    text: 'Back',
                    action: { event: this.event, method: 'openHouseholdSlaves' }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: fullName,
                    message: 'Household slave record.',
                    societySummaryOptions: [
                      this.summaryOption('Identity', fullName + '; ' + this.slaveTypeLabel(record.type) + ' level ' + Math.round(record.level || 1) + '; age ' + Math.round(record.age || (character ? this.age(character, state) : 0)) + '.', [this.slaveTypeIcon(record.type)], 'This is a real character record, not a loose modifier.'),
                      this.summaryOption('Origin', this.slaveOriginDescription(origin), [this.affairIcon('log')], 'Slave origin is stored by Society. Roman slaves here are treated as renegades/outcasts, not normal citizens.'),
                      this.summaryOption('Freedom fund', savings + '/' + freedomPrice + ' saved; task: ' + this.slaveTaskLabel(record) + '.', [this.affairIcon('coins'), this.slaveTypeIcon(this.slaveTaskInfo(record).icon)], 'Owned slaves slowly save toward buying freedom. Task changes cool down for ' + this.slaveTaskCooldownMonths() + ' months.'),
                      this.summaryOption('Education', this.slaveTaskInfo(record).type === 'educator' ? (record.educationTargetId && state.characters[record.educationTargetId] ? 'Teaching ' + this.characterName({ ...state.characters[record.educationTargetId], id: record.educationTargetId }, state) + '.' : 'No pupil selected.') : 'Not assigned to education.', [this.slaveTypeIcon('educator')], 'Only children under 13 can be selected as pupils.'),
                      this.summaryOption('Family / origin', 'Origin ' + (originHouseId && society.houses[originHouseId] ? society.houses[originHouseId].name : 'unknown') + '; previous owner ' + (previousOwnerHouseId && society.houses[previousOwnerHouseId] ? society.houses[previousOwnerHouseId].name : 'none') + '.', [this.affairIcon('familyTree')], 'Use the house buttons to navigate when origin data is known.'),
                      this.summaryOption('Work', this.slaveTypeLabel(record.type) + ' effects are checked periodically and capped for balance.', [this.slaveTypeIcon(record.type)], 'Owned slaves do not stack infinite modifiers.')
                    ],
                    image: character ? this.characterPortrait({ ...character, id: record.characterId }, state) : this.slaveTypeIcon(record.type),
                    options
                  })
                },
        openAssignSlaveTask({ slaveKey, characterId } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let record = (society.playerSlaves || []).find((slave) => (slaveKey && slave.key === slaveKey) || (characterId && this.sameCharacterId(slave.characterId, characterId)))
                  if (!record) {
                    this.openHouseholdSlaves()
                    return
                  }
                  if (this.slaveTaskCooldownActive(record, state)) {
                    this.openManageSlave({ slaveKey: record.key, characterId: record.characterId })
                    return
                  }
                  let hasChild = this.householdChildrenUnder13(state).length > 0
                  let options = Object.keys(this.slaveTasks()).map((taskKey) => {
                    let task = this.slaveTasks()[taskKey]
                    return {
                      text: task.label,
                      disabled: taskKey === 'educator' && !hasChild,
                      showDisabledWithTooltip: true,
                      tooltip: 'Assign this household task. ' + task.effect,
                      icons: [this.slaveTypeIcon(task.icon)],
                      action: {
                        event: this.event,
                        method: 'assignSlaveTask',
                        context: { slaveKey: record.key, characterId: record.characterId, task: taskKey }
                      }
                    }
                  })
                  options.push({
                    text: 'Back',
                    action: { event: this.event, method: 'openManageSlave', context: { slaveKey: record.key, characterId: record.characterId } }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Assign task',
                    message: 'Choose the household work for this slave.',
                    image: this.slaveTypeIcon(this.slaveTaskInfo(record).icon),
                    options
                  })
                },
        assignSlaveTask({ slaveKey, characterId, task } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let record = (society.playerSlaves || []).find((slave) => (slaveKey && slave.key === slaveKey) || (characterId && this.sameCharacterId(slave.characterId, characterId)))
                  let taskInfo = this.slaveTasks()[task]
                  if (!record || !taskInfo || this.slaveTaskCooldownActive(record, state)) {
                    this.openHouseholdSlaves()
                    return
                  }
                  if (task === 'educator' && !this.householdChildrenUnder13(state).length) {
                    this.openManageSlave({ slaveKey: record.key, characterId: record.characterId })
                    return
                  }
                  record.task = task
                  record.nextTaskChangeMonth = this.futureMonthKey(this.slaveTaskCooldownMonths())
                  if (task !== 'educator') {
                    record.educationTargetId = ''
                  } else if (!record.educationTargetId) {
                    let children = this.householdChildrenUnder13(state)
                    record.educationTargetId = children[0] && children[0].id
                  }
                  try {
                    if (record.characterId) {
                      daapi.updateCharacter({
                        characterId: record.characterId,
                        character: {
                          corSocietySlaveTask: task,
                          corSocietySlaveNextTaskChangeMonth: record.nextTaskChangeMonth,
                          corSocietySlaveEducationTargetId: record.educationTargetId || ''
                        }
                      })
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                  this.log(society, record.name + ' is assigned to ' + taskInfo.label.toLowerCase() + '.', 'slaves')
                  this.save(society)
                  if (task === 'educator') {
                    this.openSlaveEducationTargets({ slaveKey: record.key, characterId: record.characterId })
                    return
                  }
                  this.openManageSlave({ slaveKey: record.key, characterId: record.characterId })
                },
        openSlaveEducationTargets({ slaveKey, characterId } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let record = (society.playerSlaves || []).find((slave) => (slaveKey && slave.key === slaveKey) || (characterId && this.sameCharacterId(slave.characterId, characterId)))
                  if (!record || this.slaveTaskInfo(record).type !== 'educator') {
                    this.openHouseholdSlaves()
                    return
                  }
                  let children = this.householdChildrenUnder13(state)
                  let options = children.map((child) => {
                    let skill = this.educationSkillForSlave(record)
                    return {
                      text: this.characterName(child, state),
                      tooltip: 'Set as pupil. Consequences: future education ticks improve ' + skill + ' and may add an education-related trait.',
                      icons: [this.characterPortrait(child, state), this.slaveTypeIcon('educator')],
                      action: {
                        event: this.event,
                        method: 'setSlaveEducationTarget',
                        context: { slaveKey: record.key, characterId: record.characterId, targetId: child.id }
                      }
                    }
                  })
                  options.push({
                    text: 'Back',
                    action: { event: this.event, method: 'openManageSlave', context: { slaveKey: record.key, characterId: record.characterId } }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Choose pupil',
                    message: children.length ? 'Select a household child under 13.' : 'No household child under 13 is available.',
                    image: this.slaveTypeIcon('educator'),
                    options
                  })
                },
        setSlaveEducationTarget({ slaveKey, characterId, targetId } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let record = (society.playerSlaves || []).find((slave) => (slaveKey && slave.key === slaveKey) || (characterId && this.sameCharacterId(slave.characterId, characterId)))
                  let target = targetId && state.characters && state.characters[targetId]
                  if (!record || !target || target.isDead || this.age(target, state) >= 13 || this.slaveTaskInfo(record).type !== 'educator') {
                    this.openManageSlave({ slaveKey, characterId })
                    return
                  }
                  record.educationTargetId = targetId
                  try {
                    daapi.updateCharacter({
                      characterId: record.characterId,
                      character: {
                        corSocietySlaveEducationTargetId: targetId
                      }
                    })
                  } catch (err) {
                    console.warn(err)
                  }
                  this.log(society, record.name + ' will educate ' + this.characterName({ ...target, id: targetId }, state) + '.', 'slaves')
                  this.save(society)
                  this.openManageSlave({ slaveKey: record.key, characterId: record.characterId })
                },
        privateCompanySlave({ slaveKey, characterId } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let record = (society.playerSlaves || []).find((slave) => (slaveKey && slave.key === slaveKey) || (characterId && this.sameCharacterId(slave.characterId, characterId)))
                  if (!record || (record.nextCompanionMonth && !this.monthKeyReached(record.nextCompanionMonth, state))) {
                    this.openHouseholdSlaves()
                    return
                  }
                  let character = record.characterId && state.characters && state.characters[record.characterId]
                  let currentId = this.currentCharacterId(state)
                  let currentCharacter = currentId && state.characters && state.characters[currentId]
                  if (!character || character.isDead || this.age(character, state) < 16 || (currentCharacter && this.age(currentCharacter, state) < 16)) {
                    this.openManageSlave({ slaveKey: record.key, characterId: record.characterId })
                    return
                  }
                  record.savings = Math.max(0, parseFloat(record.savings || 0) + 2)
                  record.nextCompanionMonth = this.futureMonthKey(5)
                  this.applyStats({ prestige: 1 })
                  if (record.characterId) {
                    this.changePersonalRelation(society, currentId, record.characterId, 4, 'admirer')
                    try {
                      daapi.updateCharacter({
                        characterId: record.characterId,
                        character: {
                          corSocietySlaveSavings: record.savings,
                          corSocietySlaveNextCompanionMonth: record.nextCompanionMonth
                        }
                      })
                    } catch (err) {
                      console.warn(err)
                    }
                  }
                  let hadPregnancy = this.tryPrivateCompanyPregnancy(society, state, record, currentId)
                  if (!hadPregnancy) {
                    this.log(society, record.name + ' provides private company; household mood improves slightly.', 'slaves')
                  } else {
                    this.log(society, record.name + ' becomes pregnant; a bastard child will join the household.', 'slaves')
                  }
                  this.save(society)
                  this.openManageSlave({ slaveKey: record.key, characterId: record.characterId })
                },
        legitimizeSlaveBastard({ slaveKey, characterId, cost } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let record = (society.playerSlaves || []).find((slave) => (slaveKey && slave.key === slaveKey) || (characterId && this.sameCharacterId(slave.characterId, characterId)))
                  let character = record && record.characterId && state.characters && state.characters[record.characterId]
                  if (!record || !character || character.corSocietyOrigin !== 'private_company_bastard') {
                    this.refundVanillaStatChanges()
                    this.openHouseholdSlaves()
                    return
                  }
                  character.id = character.id || record.characterId
                  let currentDynastyId = this.currentCharacterDynastyId(state)
                  let fatherId = character.corSocietyTrueFatherId || character.fatherId
                  let father = fatherId && state.characters && state.characters[fatherId]
                  if (!father || father.corSocietySlave || father.dynastyId !== currentDynastyId) {
                    this.refundVanillaStatChanges()
                    this.openManageSlave({ slaveKey: record.key, characterId: record.characterId })
                    return
                  }
                  father.id = father.id || fatherId
                  cost = Math.max(0, Math.round(parseFloat(cost || Math.max(25, this.slaveFreedomPrice(record) * 0.6))))
                  let cash = this.cashBeforeClick(state)
                  if (cash < cost) {
                    this.refundVanillaStatChanges()
                    this.openManageSlave({ slaveKey: record.key, characterId: record.characterId })
                    return
                  }
                  this.applyStats({ cash: -cost, prestige: -6, influence: -8 })
                  let patch = {
                    dynastyId: father.dynastyId,
                    fatherId: father.id,
                    corSocietySlave: false,
                    corSocietySlaveActive: false,
                    corSocietySlaveMarket: false,
                    corSocietySlaveOrigin: '',
                    corSocietyFreedman: false,
                    corSocietyLegitimizedBastard: true,
                    corSocietyIllegitimate: false,
                    corSocietyOrigin: 'legitimized_bastard',
                    corSocietySlaveOwnerHouseId: '',
                    flagCannotMarry: false,
                    flagDoNotCull: true
                  }
                  try {
                    daapi.updateCharacter({ characterId: character.id, character: patch })
                    Object.assign(character, patch)
                    this.addChildToParent(state, father.id, character.id)
                    this.hideSocietyStatus(character.id, 'cor_society_slave_status')
                    daapi.forceUpdateCharacterDisplay({ characterId: character.id })
                  } catch (err) {
                    console.warn(err)
                  }
                  let house = society.houses[father.dynastyId]
                  if (!house) {
                    house = this.createHouseRecord(father.dynastyId)
                    house.name = this.houseName((state.dynasties && state.dynasties[father.dynastyId]) || {}, father.dynastyId)
                    society.houses[father.dynastyId] = house
                  }
                  house.memberIds = house.memberIds || []
                  if (house.memberIds.indexOf(character.id) < 0) house.memberIds.push(character.id)
                  if (this.age(character, state) >= 16) {
                    house.notableIds = house.notableIds || []
                    if (house.notableIds.indexOf(character.id) < 0) house.notableIds.push(character.id)
                  }
                  society.playerSlaves = (society.playerSlaves || []).filter((slave) => slave !== record)
                  this.log(society, this.characterName(character, state) + ' is legitimized and joins the free father dynasty.', 'birth', father.dynastyId)
                  this.save(society)
                  this.openHouseholdSlaves()
                },
        ownedSlaveMarriageCandidates(society, state, record) {
                  let character = record && record.characterId && state.characters && state.characters[record.characterId]
                  if (!record || !character || character.isDead || character.spouseId || this.age(character, state) < 16 || this.age(character, state) > 60) {
                    return []
                  }
                  character.id = character.id || record.characterId
                  return (society.playerSlaves || [])
                    .filter((candidateRecord) => {
                      if (!candidateRecord || candidateRecord.active === false || !candidateRecord.characterId || this.sameCharacterId(candidateRecord.characterId, record.characterId)) return false
                      let candidate = state.characters && state.characters[candidateRecord.characterId]
                      if (!candidate || candidate.isDead || candidate.spouseId || this.age(candidate, state) < 16 || this.age(candidate, state) > 60) return false
                      candidate.id = candidate.id || candidateRecord.characterId
                      return this.isMarriageCompatibleForSlaves(character, candidate)
                    })
                },
        openSlaveMarriageCandidates({ slaveKey, characterId } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let record = (society.playerSlaves || []).find((slave) => (slaveKey && slave.key === slaveKey) || (characterId && this.sameCharacterId(slave.characterId, characterId)))
                  if (!record) {
                    this.openHouseholdSlaves()
                    return
                  }
                  let candidates = this.ownedSlaveMarriageCandidates(society, state, record)
                  let options = candidates.map((candidateRecord) => {
                    let candidate = state.characters[candidateRecord.characterId]
                    candidate.id = candidate.id || candidateRecord.characterId
                    return {
                      text: this.characterName(candidate, state),
                      tooltip: 'Household slave marriage. Consequences: creates a spouse link between two owned slaves; no family marriage alliance is created.',
                      icons: [this.characterPortrait(candidate, state), this.affairIcon('marriage')],
                      action: {
                        event: this.event,
                        method: 'marryOwnedSlaves',
                        context: { slaveKey: record.key, characterId: record.characterId, spouseSlaveKey: candidateRecord.key, spouseId: candidateRecord.characterId }
                      }
                    }
                  })
                  options.push({
                    text: 'Back',
                    action: { event: this.event, method: 'openManageSlave', context: { slaveKey: record.key, characterId: record.characterId } }
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Slave household marriage',
                    message: candidates.length ? 'Choose a spouse from your household slaves.' : 'No compatible unmarried adult household slave is available.',
                    image: this.affairIcon('marriage'),
                    options
                  })
                },
        marryOwnedSlaves({ slaveKey, characterId, spouseSlaveKey, spouseId } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let firstRecord = (society.playerSlaves || []).find((slave) => (slaveKey && slave.key === slaveKey) || (characterId && this.sameCharacterId(slave.characterId, characterId)))
                  let secondRecord = (society.playerSlaves || []).find((slave) => (spouseSlaveKey && slave.key === spouseSlaveKey) || (spouseId && this.sameCharacterId(slave.characterId, spouseId)))
                  let first = firstRecord && firstRecord.characterId && state.characters && state.characters[firstRecord.characterId]
                  let second = secondRecord && secondRecord.characterId && state.characters && state.characters[secondRecord.characterId]
                  if (!firstRecord || !secondRecord || !first || !second || first.spouseId || second.spouseId) {
                    this.openManageSlave({ slaveKey, characterId })
                    return
                  }
                  first.id = first.id || firstRecord.characterId
                  second.id = second.id || secondRecord.characterId
                  if (this.age(first, state) < 16 || this.age(second, state) < 16 || !this.isMarriageCompatibleForSlaves(first, second)) {
                    this.openManageSlave({ slaveKey, characterId })
                    return
                  }
                  try {
                    daapi.updateCharacter({ characterId: first.id, character: { flagCannotMarry: false } })
                    daapi.updateCharacter({ characterId: second.id, character: { flagCannotMarry: false } })
                    daapi.performMarriage({ characterId: first.id, spouseId: second.id, isMatrilineal: !this.characterIsMale(first) })
                  } catch (err) {
                    console.warn(err)
                    try {
                      daapi.updateCharacter({ characterId: first.id, character: { spouseId: second.id } })
                      daapi.updateCharacter({ characterId: second.id, character: { spouseId: first.id } })
                    } catch (fallbackErr) {
                      console.warn(fallbackErr)
                    }
                  }
                  try {
                    daapi.updateCharacter({ characterId: first.id, character: { flagCannotMarry: true } })
                    daapi.updateCharacter({ characterId: second.id, character: { flagCannotMarry: true } })
                    daapi.forceUpdateCharacterDisplay({ characterId: first.id })
                    daapi.forceUpdateCharacterDisplay({ characterId: second.id })
                  } catch (err) {
                    console.warn(err)
                  }
                  this.changePersonalRelation(society, first.id, second.id, 35, 'friend')
                  this.log(society, firstRecord.name + ' and ' + secondRecord.name + ' are joined as household slaves.', 'marriage')
                  this.save(society)
                  this.openManageSlave({ slaveKey: firstRecord.key, characterId: firstRecord.characterId })
                },
        acceptSlaveSelfPurchase({ slaveKey, characterId, price } = {}) {
                  let society = this.loadForAction()
                  let record = (society.playerSlaves || []).find((slave) => (slaveKey && slave.key === slaveKey) || (characterId && this.sameCharacterId(slave.characterId, characterId)))
                  if (!record) {
                    this.openHouseholdSlaves()
                    return
                  }
                  let freedomPrice = Math.max(1, Math.round(parseFloat(price || this.slaveFreedomPrice(record))))
                  if (parseFloat(record.savings || 0) < freedomPrice) {
                    this.openManageSlave({ slaveKey: record.key, characterId: record.characterId })
                    return
                  }
                  record.savings = Math.max(0, parseFloat(record.savings || 0) - freedomPrice)
                  this.applyStats({ cash: freedomPrice })
                  this.log(society, record.name + ' pays ' + freedomPrice + ' to buy freedom.', 'slaves')
                  this.save(society)
                  this.freeSlave({ slaveKey: record.key, characterId: record.characterId })
                },
        sellSlave({ slaveKey, characterId } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let record = (society.playerSlaves || []).find((slave) => (slaveKey && slave.key === slaveKey) || (characterId && this.sameCharacterId(slave.characterId, characterId)))
                  if (!record) {
                    this.openHouseholdSlaves()
                    return
                  }
                  let value = Math.round(this.slaveCost(record) * 0.55)
                  record.active = false
                  this.applyStats({ cash: value })
                  try {
                    if (record.characterId) {
                      daapi.updateCharacter({
                        characterId: record.characterId,
                        character: {
                          corSocietySlaveActive: false,
                          corSocietySlaveSold: true,
                          corSocietyPreviousOwnerHouseId: this.currentCharacterDynastyId(state) || ''
                        }
                      })
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                  society.playerSlaves = (society.playerSlaves || []).filter((slave) => slave !== record)
                  this.log(society, 'You sell ' + record.name + ' for ' + value + ' cash.', 'slaves')
                  this.save(society)
                  this.openHouseholdSlaves()
                },
        freeSlave({ slaveKey, characterId } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let record = (society.playerSlaves || []).find((slave) => (slaveKey && slave.key === slaveKey) || (characterId && this.sameCharacterId(slave.characterId, characterId)))
                  if (!record) {
                    this.openHouseholdSlaves()
                    return
                  }
                  record.active = false
                  let sourceCharacter = record.characterId && state.characters && state.characters[record.characterId]
                  let freedHouse = this.freedmanHouseForCharacter(society, state, record, sourceCharacter)
                  this.applyStats({ prestige: 8, influence: 10 })
                  try {
                    if (record.characterId) {
                      daapi.updateCharacter({
                        characterId: record.characterId,
                        character: {
                          dynastyId: freedHouse ? this.gameDynastyIdForHouse(freedHouse) : undefined,
                          corSocietyHouseId: freedHouse ? freedHouse.id : '',
                          corSocietySlave: false,
                          corSocietySlaveActive: false,
                          corSocietySlaveMarket: false,
                          corSocietySlaveOrigin: '',
                          corSocietyFreedman: true,
                          corSocietyOrigin: 'manumitted_freedman',
                          corSocietyFreedFromHouseId: this.currentCharacterDynastyId(state) || '',
                          flagCannotMarry: false
                        }
                      })
                      if (freedHouse) {
                        freedHouse.memberIds = freedHouse.memberIds || []
                        if (freedHouse.memberIds.indexOf(record.characterId) < 0) freedHouse.memberIds.push(record.characterId)
                      }
                      this.hideSocietyStatus(record.characterId, 'cor_society_slave_status')
                      daapi.forceUpdateCharacterDisplay({ characterId: record.characterId })
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                  society.playerSlaves = (society.playerSlaves || []).filter((slave) => slave !== record)
                  state = daapi.getState()
                  if (freedHouse) {
                    this.refreshHouseMemberLists(society, state, freedHouse)
                  }
                  this.log(society, 'You manumit ' + record.name + '; they enter the Freedmen order in their own free citizen house.', 'slaves', freedHouse ? freedHouse.id : '')
                  this.save(society)
                  this.openHouseholdSlaves()
                }
      })
      window.corSociety._mixinCorSocietyMenusVersion = '1.1.331'
    }
  }
}
