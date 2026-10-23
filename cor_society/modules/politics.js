{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyPolitics() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyPoliticsVersion === '1.1.331') {
        return
      }
      Object.assign(window.corSociety, {
        ensureRomeState(society) {
                  society.rome = society.rome || {}
                  let rome = society.rome
                  rome.government = rome.government || 'republic'
                  rome.rulerHouseId = rome.rulerHouseId || ''
                  rome.rulerCharacterId = rome.rulerCharacterId || ''
                  rome.successionLaw = rome.successionLaw || 'designation'
                  rome.dictatorHouseId = rome.dictatorHouseId || ''
                  rome.dictatorCharacterId = rome.dictatorCharacterId || ''
                  rome.dictatorMandate = rome.dictatorMandate || ''
                  rome.dictatorTermEnd = rome.dictatorTermEnd || ''
                  rome.everHadEmperor = !!rome.everHadEmperor
                  rome.successionPressure = parseFloat(rome.successionPressure || 0)
                  rome.empireProgress = this.clamp(parseFloat(rome.empireProgress || 0), 0, 100)
                  rome.wars = rome.wars || []
                  rome.appointments = rome.appointments || {}
                  society.captives = society.captives || []
                  society.investigations = society.investigations || {}
                  society.imprisoned = society.imprisoned || []
                  society.playerPolitics = society.playerPolitics || {}
                  let pp = society.playerPolitics
                  pp.auctoritas = parseFloat(pp.auctoritas || 0)
                  pp.faction = pp.faction || []
                  pp.wasDictator = !!pp.wasDictator
                  pp.laws = pp.laws || []
                  pp.lastDefendMonth = pp.lastDefendMonth || ''
                  return rome
                },
        playerPoliticsHouse(society, state) {
                  let currentId = this.currentCharacterId(state)
                  let character = state.characters && state.characters[currentId]
                  if (!character) {
                    return false
                  }
                  character.id = character.id || currentId
                  let houseId = this.houseIdForCharacter(character, state, society)
                  return houseId && society.houses[houseId] ? society.houses[houseId] : false
                },
        playerIsSenatorial(state) {
                  state = state || daapi.getState()
                  if (state.current && (state.current.flagIsSenetorialClass || state.current.flagIsSenatorialClass)) {
                    return true
                  }
                  let stratum = this.playerStratum ? this.playerStratum(state) : ''
                  return stratum === 'senatorial'
                },
        playerPoliticsUnlocked(state) {
                  state = state || daapi.getState()
                  if (this.playerIsSenatorial(state)) {
                    return true
                  }
                  let stratum = this.playerStratum ? this.playerStratum(state) : ''
                  return stratum === 'equestrian' || stratum === 'senatorial'
                },
        playerSenateOfficeCount(state) {
                  let senate = (state.current && state.current.senate) || {}
                  let currentId = String(this.currentCharacterId(state))
                  let count = 0
                  for (let office in senate) {
                    if (senate.hasOwnProperty(office) && (senate[office] || []).map(String).indexOf(currentId) >= 0) {
                      count += 1
                    }
                  }
                  return count
                },
        playerAuctoritasScore(society, state) {
                  let pp = society.playerPolitics || {}
                  let current = state.current || {}
                  let prestige = parseFloat(current.prestige || 0)
                  let influence = parseFloat(current.influence || 0)
                  let faction = (pp.faction || []).filter((id) => society.houses[id]).length
                  let offices = this.playerSenateOfficeCount(state)
                  let house = this.playerPoliticsHouse(society, state)
                  let propertyValue = house && this.housePropertyValue ? this.housePropertyValue(house) : 0
                  return Math.round(prestige / 40 + influence / 120 + faction * 8 + offices * 16 + propertyValue / 800 + parseFloat(pp.auctoritas || 0))
                },
        playerIsDictator(society, state) {
                  let rome = this.ensureRomeState(society)
                  let house = this.playerPoliticsHouse(society, state)
                  return !!(rome.government === 'dictatorship' && house && String(rome.dictatorHouseId) === String(house.id))
                },
        playerIsEmperor(society, state) {
                  let rome = this.ensureRomeState(society)
                  let house = this.playerPoliticsHouse(society, state)
                  return !!(rome.government === 'empire' && house && String(rome.rulerHouseId) === String(house.id))
                },
        governmentLabel(rome) {
                  if (rome.government === 'dictatorship') return 'Dictatorship'
                  if (rome.government === 'empire') return 'Empire'
                  return 'Republic'
                },
        imperatorIcon() {
                  try {
                    return daapi.requireImage('/cor_society/assets/aquila.svg')
                  } catch (err) {
                    return this.affairIcon('senator')
                  }
                },
        playerPoliticalRank(society, state) {
                  if (this.playerIsEmperor(society, state)) return 'emperor'
                  if (this.playerIsDictator(society, state)) return 'dictator'
                  return ''
                },
        playerPoliticalTitle(society, state) {
                  let rank = this.playerPoliticalRank(society, state)
                  if (rank === 'emperor') return 'Imperator'
                  if (rank === 'dictator') return 'Dictator'
                  return ''
                },
        politicalPowerBonus(society, state) {
                  // Real, ongoing mechanical edge for holding supreme office. Emperor > Dictator.
                  let rank = this.playerPoliticalRank(society, state)
                  if (rank === 'emperor') return 0.28
                  if (rank === 'dictator') return 0.15
                  return 0
                },
        propertyTitleFor(key) {
                  let types = this.vanillaPropertyTypes ? this.vanillaPropertyTypes() : {}
                  return (types[key] && types[key].title) || key
                },
        housePropertyOptions(house) {
                  if (!house) {
                    return []
                  }
                  let details = this.normalizeHousePropertyDetails ? this.normalizeHousePropertyDetails(house) : ((house.ai && house.ai.propertyDetails) || {})
                  let types = this.vanillaPropertyTypes ? this.vanillaPropertyTypes() : {}
                  return Object.keys(details || {})
                    .filter((key) => parseFloat(details[key] || 0) > 0 && types[key])
                    .map((key) => {
                      return { key, title: types[key].title || key, count: Math.round(parseFloat(details[key] || 0)), value: types[key].value || 0, group: types[key].group || '' }
                    })
                    .sort((a, b) => b.value - a.value)
                },
        transferPropertyToPlayer(society, state, targetHouse, key, amount) {
                  // Remove a real vanilla property from the rival house's holdings and grant it to the
                  // player's house (a genuine transfer between houses), returning the value moved.
                  return this.transferPropertyBetweenHouses(targetHouse, this.playerPoliticsHouse(society, state), key, amount)
                },
        transferPropertyBetweenHouses(fromHouse, toHouse, key, amount) {
                  // Move `amount` units of a real vanilla property from one house's holdings to another
                  // (toHouse may be missing: the property is then just lost). Returns the value moved.
                  if (!fromHouse || !key) {
                    return 0
                  }
                  this.normalizeHousePropertyDetails(fromHouse)
                  fromHouse.ai = fromHouse.ai || {}
                  fromHouse.ai.propertyDetails = fromHouse.ai.propertyDetails || {}
                  let have = Math.round(parseFloat(fromHouse.ai.propertyDetails[key] || 0))
                  if (have <= 0) {
                    // Nothing left to take (a menu left open while the month moved on): moving 1 unit
                    // anyway created the property out of nothing.
                    return 0
                  }
                  amount = Math.max(1, Math.min(parseInt(amount || 1, 10), have))
                  fromHouse.ai.propertyDetails[key] = have - amount
                  if (fromHouse.ai.propertyDetails[key] <= 0) {
                    delete fromHouse.ai.propertyDetails[key]
                  }
                  this.normalizeHousePropertyDetails(fromHouse)
                  if (toHouse) {
                    toHouse.ai = toHouse.ai || {}
                    toHouse.ai.propertyDetails = toHouse.ai.propertyDetails || {}
                    toHouse.ai.propertyDetails[key] = Math.round(parseFloat(toHouse.ai.propertyDetails[key] || 0)) + amount
                    this.normalizeHousePropertyDetails(toHouse)
                  }
                  let types = this.vanillaPropertyTypes ? this.vanillaPropertyTypes() : {}
                  return Math.round(((types[key] && types[key].value) || 0) * amount)
                },
        politicsAction(args) {
                  args = args || {}
                  let map = {
                    recruitFactionHouse: 'recruitFactionHouse',
                    pressLandClaim: 'pressLandClaim',
                    openSeizeProperty: 'openSeizeProperty',
                    seizeProperty: 'seizeProperty',
                    raidProperty: 'raidProperty',
                    fortifyProperty: 'fortifyProperty',
                    openAbductTargets: 'openAbductTargets',
                    startAbduction: 'startAbduction',
                    ransomCaptive: 'ransomCaptive',
                    releaseCaptive: 'releaseCaptive',
                    demandHookFromCaptive: 'demandHookFromCaptive',
                    openDemandProperty: 'openDemandProperty',
                    demandProperty: 'demandProperty',
                    openDictatorMandates: 'openDictatorMandates',
                    seekDictatorship: 'seekDictatorship',
                    layDownDictatorship: 'layDownDictatorship',
                    attemptEmpire: 'attemptEmpire',
                    openLaws: 'openLaws',
                    proposeLaw: 'proposeLaw',
                    openPolicyLaws: 'openPolicyLaws',
                    enactPolicyLaw: 'enactPolicyLaw',
                    appointGovernor: 'appointGovernor',
                    declareWar: 'declareWar',
                    holdGames: 'holdGames',
                    defendSuccession: 'defendSuccession',
                    openImperialActions: 'openImperialActions',
                    imperialInvestigate: 'imperialInvestigate',
                    imperialImprison: 'imperialImprison',
                    imperialConfiscate: 'imperialConfiscate',
                    imperialExile: 'imperialExile',
                    imperialExecute: 'imperialExecute',
                    imperialPardon: 'imperialPardon',
                    imperialDemandTribute: 'imperialDemandTribute',
                    imperialFavor: 'imperialFavor',
                    openFactionRecruit: 'openFactionRecruit',
                    openRivalPolitics: 'openRivalPolitics',
                    openCaptives: 'openCaptives',
                    openEmperorActions: 'openEmperorActions',
                    openAppointGovernor: 'openAppointGovernor',
                    openDeclareWar: 'openDeclareWar',
                    openHousePolitics: 'openHousePolitics'
                  }
                  let method = map[args.action]
                  if (method && typeof this[method] === 'function') {
                    return this[method](args)
                  }
                  return this.openPolitics()
                },
        politicsButton(action, text, icon, context, extra) {
                  let option = {
                    text,
                    icons: [this.affairIcon(icon || 'senator')],
                    action: {
                      event: this.event,
                      method: 'politicsAction',
                      context: Object.assign({ action }, context || {})
                    }
                  }
                  return Object.assign(option, extra || {})
                },
        openPolitics() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let rome = this.ensureRomeState(society)
                  this.save(society)
                  if (!this.playerPoliticsUnlocked(state)) {
                    this.pushModal({
                      societyMenu: true,
                      title: 'Senate & Politics (locked)',
                      message: 'Roman high politics is closed to you for now. Rise to the Equestrian order (equites) to enter the political arena, then climb toward the Senate, the Dictatorship, and the purple.',
                      image: this.affairIcon('senator'),
                      options: [{ text: 'Back', action: { event: this.event, method: 'openHub' } }]
                    })
                    return
                  }
                  let pp = society.playerPolitics
                  let house = this.playerPoliticsHouse(society, state)
                  let auctoritas = this.playerAuctoritasScore(society, state)
                  let factionSize = (pp.faction || []).filter((id) => society.houses[id]).length
                  let offices = this.playerSenateOfficeCount(state)
                  let isSenatorial = this.playerIsSenatorial(state)
                  let isDictator = this.playerIsDictator(society, state)
                  let isEmperor = this.playerIsEmperor(society, state)
                  let rulerHouse = rome.rulerHouseId && society.houses[rome.rulerHouseId]
                  let summary = [
                    this.summaryOption('Government', this.governmentLabel(rome), [this.affairIcon('senator')], 'The current form of Roman government.'),
                    this.summaryOption('Ruler', isEmperor ? 'You - Imperator' : isDictator ? 'You - Dictator' : (rulerHouse ? rulerHouse.name : (rome.government === 'republic' ? 'the Senate' : 'none')), [isEmperor ? this.imperatorIcon() : this.affairIcon('prestige')], 'Who currently holds supreme power.'),
                    this.summaryOption('Succession', rome.government === 'empire' ? (rome.successionLaw === 'wealth' ? 'By wealth' : rome.successionLaw === 'power' ? 'By power' : 'By designation/adoption') : 'n/a', [this.affairIcon('familyTree')], 'How imperial succession is decided. Rivals may push to change it.'),
                    this.summaryOption('Auctoritas', auctoritas, [this.affairIcon('influence')], 'Your political weight: prestige, influence, faction, offices, property.'),
                    this.summaryOption('Faction', factionSize + ' houses', [this.affairIcon('support')], 'Houses backing your ambitions.'),
                    this.summaryOption('Senate offices', offices, [this.affairIcon('senator')], 'Magistracies you currently hold (cursus honorum).'),
                    this.summaryOption('Next step', this.pathToPowerHint(society, state) || 'Play your part in the Republic.', [this.affairIcon('log')], 'Guidance on how to advance toward supreme power.')
                  ]
                  let options = []
                  if (isDictator) {
                    options.push(this.politicsButton('openLaws', 'Legislate (laws toward the purple + policy)', 'senator'))
                  } else if (isEmperor) {
                    options.push(this.politicsButton('openLaws', 'Imperial edicts & policy', 'senator'))
                  } else if (isSenatorial) {
                    options.push(this.politicsButton('openLaws', 'Propose a law to the Senate (they vote)', 'senator'))
                  }
                  options.push(this.politicsButton('openRomanPower', 'Roman power systems', 'law', {}, { tooltip: 'Cursus honorum, clientela, adoption, legions, coalitions, religion, intrigue, and property markets.' }))
                  options.push(this.politicsButton('openFactionRecruit', 'Build your faction', 'support'))
                  options.push(this.politicsButton('openRivalPolitics', 'Pressure rival houses (feuds, abduction)', 'rivalry'))
                  if ((society.captives || []).some((c) => c && c.captorIsPlayer)) {
                    options.push(this.politicsButton('openCaptives', 'Held captives (' + (society.captives || []).filter((c) => c && c.captorIsPlayer).length + ')', 'scandal'))
                  }
                  if (rome.government === 'republic') {
                    let gate = this.dictatorshipGate(society, state)
                    options.push(this.politicsButton('openDictatorMandates', 'Seek the Dictatorship' + (gate.ready ? '' : ' (not yet)'), 'prestige', {}, gate.ready ? {} : { disabled: true, showDisabledWithTooltip: true, tooltip: gate.reason }))
                  }
                  if (isDictator) {
                    let remaining = this.monthsUntil(rome.dictatorTermEnd, state)
                    options.push(this.politicsButton('layDownDictatorship', 'Lay down the dictatorship (honourable)', 'prestige'))
                    let egate = this.empireGate(society, state)
                    options.push(this.politicsButton('attemptEmpire', 'Make yourself Emperor' + (egate.ready ? '' : ' (locked)'), 'senator', {}, egate.ready ? {} : { disabled: true, showDisabledWithTooltip: true, tooltip: egate.reason }))
                    summary.push(this.summaryOption('Dictator term', remaining > 0 ? remaining + ' months left' : 'expiring', [this.affairIcon('death')], 'The dictatorship is temporary; the Senate will force you to lay it down when it ends.'))
                  }
                  if (isEmperor) {
                    options.push(this.politicsButton('openEmperorActions', 'Imperial powers', 'senator'))
                  }
                  options = options.filter(Boolean)
                  options.push({ text: 'Back', action: { event: this.event, method: 'openHub' } })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Senate & Politics',
                    message: rome.government === 'republic'
                      ? 'The Republic stands. Climb the cursus honorum, build a faction, and - in a crisis - you may be named Dictator. Few dictators ever become Emperor.'
                      : rome.government === 'dictatorship'
                        ? 'You wield extraordinary powers for a limited term. Lay them down with honour, or risk everything to seize the purple.'
                        : 'The Empire endures. Defend your succession and project power across the provinces.',
                    societySummaryOptions: summary.filter(Boolean),
                    image: isEmperor ? this.imperatorIcon() : this.affairIcon('senator'),
                    options
                  })
                },
        monthsUntil(monthKey, state) {
                  if (!monthKey) {
                    return 0
                  }
                  return Math.max(0, this.monthIndex(monthKey) - this.monthIndex(this.monthKey(state || daapi.getState())))
                },
        politicsRivalHouses(society, state) {
                  let playerHouse = this.playerPoliticsHouse(society, state)
                  return this.sortedHouses(society).filter((house) => {
                    return house && house.id && (!playerHouse || String(house.id) !== String(playerHouse.id)) && !house.isPlayerHouse
                  })
                },
        openFactionRecruit() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let pp = this.ensureRomeState(society).government ? society.playerPolitics : society.playerPolitics
                  let cash = parseFloat((state.current || {}).cash || 0)
                  let houses = this.politicsRivalHouses(society, state).slice(0, 12)
                  let options = houses.map((house) => {
                    let inFaction = (pp.faction || []).indexOf(house.id) >= 0
                    let cost = Math.max(20, Math.round((this.actionCost(house, 'dinner') || 40) * 1.4))
                    return this.politicsButton('recruitFactionHouse', (inFaction ? '* ' : '') + house.name + ' (relation ' + this.signed(house.relation || 0) + ', cost ' + cost + ')', 'support', { houseId: house.id }, inFaction || cash < cost ? { disabled: true, showDisabledWithTooltip: true, tooltip: inFaction ? 'Already in your faction.' : 'Not enough cash (' + cost + ').' } : {})
                  })
                  options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Build your faction',
                    message: 'Win houses to your cause with patronage and favours. Friendly houses are easier to recruit. A strong faction is required to be named Dictator.',
                    image: this.affairIcon('support'),
                    options
                  })
                },
        recruitFactionHouse({ houseId } = {}) {
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let pp = this.ensureRomeState(society).government ? society.playerPolitics : society.playerPolitics
                    if ((pp.faction || []).indexOf(houseId) >= 0) {
                      return
                    }
                    let cost = Math.max(20, Math.round((this.actionCost(house, 'dinner') || 40) * 1.4))
                    this.applyStats({ cash: -cost, influence: -8 })
                    let chance = this.clamp(0.3 + (house.relation || 0) / 160 + (house.favor || 0) * 0.08 + this.politicalPowerBonus(society, state), 0.05, 0.96)
                    if (Math.random() < chance) {
                      pp.faction = pp.faction || []
                      pp.faction.push(houseId)
                      house.relation = this.clamp((house.relation || 0) + 12, -100, 100)
                      pp.auctoritas = parseFloat(pp.auctoritas || 0) + 4
                      this.log(society, house.name + ' joins your political faction.', 'support', houseId)
                    } else {
                      house.relation = this.clamp((house.relation || 0) - 4, -100, 100)
                      this.log(society, house.name + ' declines to join your faction for now.', 'support', houseId)
                    }
                  })
                  this.openFactionRecruit()
                },
        openRivalPolitics() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  this.ensureRomeState(society)
                  let houses = this.politicsRivalHouses(society, state).slice(0, 12)
                  let options = houses.map((house) => {
                    return this.politicsButton('openHousePolitics', house.name + ' (power ' + Math.round(house.power || 0) + ', relation ' + this.signed(house.relation || 0) + ')', 'rivalry', { houseId: house.id })
                  })
                  options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Pressure rival houses',
                    message: 'Choose a house to feud with over property, or to target for abduction. Proscriptions and seizures are legal weapons between powerful families.',
                    image: this.affairIcon('rivalry'),
                    options
                  })
                },
        landClaimCost(house) {
                  return { influence: Math.max(20, Math.round((house.power || 40) * 0.6)), cash: Math.max(20, Math.round((house.power || 40) * 0.5)) }
                },
        abductionCost(house) {
                  return { influence: 30, cash: 40, prestige: 0 }
                },
        costLabel(cost) {
                  let parts = []
                  if (cost.cash) parts.push(cost.cash + ' cash')
                  if (cost.influence) parts.push(cost.influence + ' infl')
                  if (cost.prestige) parts.push(cost.prestige + ' prestige')
                  return parts.join(', ')
                },
        openHousePolitics({ houseId } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  if (!house) {
                    this.openRivalPolitics()
                    return
                  }
                  let claimCost = this.landClaimCost(house)
                  let raidCost = Math.max(15, Math.round((house.power || 40) * 0.4))
                  let abductCost = this.abductionCost(house)
                  let props = this.housePropertyOptions(house)
                  let propSummary = props.length ? props.slice(0, 5).map((p) => p.count + 'x ' + p.title).join(', ') : 'no recorded estates'
                  let options = []
                  options.push(this.politicsButton('pressLandClaim', 'Press a land claim - seize a property (' + this.costLabel(claimCost) + ')', 'coins', { houseId }))
                  options.push(this.politicsButton('raidProperty', 'Raid / blockade their estates (' + raidCost + ' cash)', 'trade', { houseId }))
                  options.push(this.politicsButton('openAbductTargets', 'Abduct a family member for ransom (' + this.costLabel(abductCost) + ')', 'scandal', { houseId }))
                  options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openRivalPolitics' } } })
                  this.pushModal({
                    societyMenu: true,
                    title: house.name,
                    message: 'Power ' + Math.round(house.power || 0) + ', relation ' + this.signed(house.relation || 0) + '.\nHoldings: ' + propSummary + '.',
                    image: this.houseCrestIcon ? this.houseCrestIcon(society, house) : this.affairIcon('rivalry'),
                    options
                  })
                },
        pressLandClaim({ houseId } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  if (!house) {
                    this.save(society)
                    this.openRivalPolitics()
                    return
                  }
                  this.ensureRomeState(society)
                  let playerHouse = this.playerPoliticsHouse(society, state)
                  let cost = this.landClaimCost(house)
                  this.applyStats({ influence: -cost.influence, cash: -cost.cash })
                  let myPower = (playerHouse && playerHouse.power) || 40
                  let theirPower = house.power || 40
                  let myStew = (playerHouse && this.houseHouseholdStewardship) ? this.houseHouseholdStewardship(playerHouse, state) : 30
                  let fortified = house.fortifiedUntil && !this.monthKeyReached(house.fortifiedUntil, state)
                  let chance = this.clamp(0.42 + (myPower - theirPower) / 240 + myStew / 600 + this.politicalPowerBonus(society, state) - (fortified ? 0.2 : 0), 0.08, 0.95)
                  if (Math.random() < chance) {
                    house.relation = this.clamp((house.relation || 0) - 22, -100, 100)
                    house.heat = (house.heat || 0) + 4
                    house.rivalry = true
                    this.save(society)
                    this.openSeizeProperty({ houseId })
                    return
                  }
                  this.applyStats({ prestige: -6 })
                  house.relation = this.clamp((house.relation || 0) - 10, -100, 100)
                  house.heat = (house.heat || 0) + 2
                  let place = this.romanPlace('estate')
                  this.log(society, 'Your land claim against ' + house.name + ' over ' + place + ' fails in the courts; you lose face.', 'rivalry', houseId)
                  this.save(society)
                  this.pushModal({
                    societyMenu: true,
                    title: 'Land claim',
                    message: 'Your claim against ' + house.name + ' over ' + place + ' fails in the courts; you lose face.',
                    image: this.affairIcon('coins'),
                    options: [{ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openHousePolitics', houseId } } }]
                  })
                },
        openSeizeProperty({ houseId } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  if (!house) {
                    this.openRivalPolitics()
                    return
                  }
                  let props = this.housePropertyOptions(house)
                  let options = props.map((p) => {
                    return this.politicsButton('seizeProperty', 'Seize ' + p.title + ' (x' + p.count + ', worth ' + p.value + ' each)', p.group === 'animal' ? 'familyTree' : 'coins', { houseId, key: p.key })
                  })
                  if (!options.length) {
                    options.push(this.politicsButton('seizeProperty', 'Extort coin instead', 'coins', { houseId, key: '__cash' }))
                  }
                  options.push({ text: 'Done', action: { event: this.event, method: 'politicsAction', context: { action: 'openHousePolitics', houseId } } })
                  this.pushModal({
                    societyMenu: true,
                    title: 'You win the seizure',
                    message: 'Your claim succeeds. Choose what to take from ' + house.name + ' - a real property passes into your house. (Animals can be rustled too.)',
                    image: this.affairIcon('coins'),
                    options
                  })
                },
        seizeProperty({ houseId, key } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  let message = ''
                  if (house) {
                    if (key === '__cash' || !key) {
                      let seized = Math.max(20, Math.round((house.wealth || 200) * 0.12))
                      house.wealth = Math.max(0, Math.round((house.wealth || 0) - seized))
                      this.applyStats({ cash: seized, prestige: 4 })
                      message = 'You extort ' + seized + ' cash from ' + house.name + '.'
                      this.log(society, message, 'coins', houseId)
                    } else {
                      let title = this.propertyTitleFor(key)
                      let value = this.transferPropertyToPlayer(society, state, house, key, 1)
                      this.applyStats({ cash: Math.round(value * 0.3), prestige: 6 })
                      message = 'You seize ' + title + ' (worth ' + value + ') from ' + house.name + ' near ' + this.romanPlace('estate') + '. It now belongs to your house.'
                      this.log(society, message, 'rivalry', houseId)
                    }
                  }
                  this.save(society)
                  this.pushModal({
                    societyMenu: true,
                    title: 'Seizure',
                    message: message || 'Nothing was taken.',
                    image: this.affairIcon('coins'),
                    options: [{ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openHousePolitics', houseId } } }]
                  })
                },
        openAbductTargets({ houseId } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  if (!house) {
                    this.openRivalPolitics()
                    return
                  }
                  // Real members of the SELECTED house's tree (the same membership the house tree uses),
                  // never random - pick exactly who to abduct.
                  let memberIds = []
                  if (this.resolvedHouseMemberIds) {
                    memberIds = this.resolvedHouseMemberIds(society, state, house, { includeKnown: true, includeDead: false, repair: false })
                  } else {
                    memberIds = (house.notableIds || []).concat(house.memberIds || [])
                  }
                  let currentId = String(this.currentCharacterId(state))
                  let seen = {}
                  let members = memberIds.map((id) => state.characters && state.characters[id])
                    .filter((c) => c && !c.isDead && String(c.id || '') !== currentId)
                    .filter((c) => { let k = String(c.id || ''); if (!k || seen[k]) return false; seen[k] = true; return true })
                    .slice(0, 14)
                  let abductCost = this.abductionCost(house)
                  let options = members.map((c) => {
                    return this.politicsButton('startAbduction', this.characterName(c, state) + ' (age ' + this.age(c, state) + ')', 'scandal', { houseId, characterId: c.id })
                  })
                  if (!options.length) {
                    options.push({ text: 'No suitable target', disabled: true, showDisabledWithTooltip: true, tooltip: 'This house has no living member to abduct.' })
                  }
                  options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openHousePolitics', houseId } } })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Abduct from ' + house.name,
                    message: 'Choose which relative to seize (' + this.costLabel(abductCost) + '). Holding a more important member buys you more leverage in the ransom.',
                    image: this.affairIcon('scandal'),
                    options
                  })
                },
        raidProperty({ houseId } = {}) {
                  let resultText = ''
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let cost = Math.max(15, Math.round((house.power || 40) * 0.4))
                    this.applyStats({ cash: -cost })
                    house.ai = house.ai || {}
                    house.ai.modifiers = house.ai.modifiers || {}
                    house.ai.modifiers.revenue = house.ai.modifiers.revenue || []
                    house.ai.modifiers.revenue.push({ factor: 0.78, until: this.futureMonthKey(this.randomInt(2, 4)) })
                    house.relation = this.clamp((house.relation || 0) - 8, -100, 100)
                    house.heat = (house.heat || 0) + 2
                    let place = this.romanPlace('landmark')
                    resultText = 'Your clients blockade ' + house.name + "'s trade through " + place + '; their revenue drops for a few months.'
                    this.log(society, resultText, 'trade', houseId)
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Raid / blockade',
                    message: resultText || 'Nothing happened.',
                    image: this.affairIcon('trade'),
                    options: [{ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openHousePolitics', houseId } } }]
                  })
                },
        fortifyProperty() {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let house = this.playerPoliticsHouse(society, state)
                  if (house) {
                    let cost = 60
                    this.applyStats({ cash: -cost })
                    house.fortifiedUntil = this.futureMonthKey(6)
                    this.log(society, 'You fortify your estates and clientela against rival seizures.', 'support', house.id)
                  }
                  this.save(society)
                  this.openPolitics()
                },
        startAbduction({ houseId, characterId } = {}) {
                  let resultText = ''
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    this.ensureRomeState(society)
                    let character = state.characters && state.characters[characterId]
                    if (!character || character.isDead) {
                      resultText = 'There is no suitable target to abduct.'
                      return
                    }
                    character.id = character.id || characterId
                    let cost = this.abductionCost(house)
                    this.applyStats({ influence: -cost.influence, cash: -cost.cash })
                    let exposeChance = this.clamp(0.3 - (house.heat || 0) * 0.01, 0.12, 0.5)
                    if (Math.random() < exposeChance) {
                      this.applyStats({ prestige: -10 })
                      house.relation = this.clamp((house.relation || 0) - 20, -100, 100)
                      house.heat = (house.heat || 0) + 5
                      resultText = 'Your abduction plot against ' + this.characterName(character, state) + ' is exposed! Scandal stains your name.'
                      this.log(society, resultText, 'scandal', houseId)
                      return
                    }
                    society.captives = society.captives || []
                    society.captives.push({
                      id: 'cap_' + characterId + '_' + this.monthKey(state),
                      characterId,
                      houseId,
                      captorIsPlayer: true,
                      until: this.futureMonthKey(this.randomInt(5, 9)),
                      name: this.characterName(character, state)
                    })
                    house.relation = this.clamp((house.relation || 0) - 14, -100, 100)
                    house.heat = (house.heat || 0) + 3
                    resultText = 'You spirit ' + this.characterName(character, state) + ' away to a safe house near ' + this.romanPlace('district') + '. You can now ransom them.'
                    this.log(society, resultText, 'scandal', houseId)
                  })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Abduction',
                    message: resultText || 'Nothing happened.',
                    image: this.affairIcon('scandal'),
                    options: [{ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openHousePolitics', houseId } } }]
                  })
                },
        openCaptives() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  this.ensureRomeState(society)
                  let captives = (society.captives || []).filter((c) => c && c.captorIsPlayer)
                  let options = captives.map((captive) => {
                    let house = society.houses[captive.houseId]
                    return {
                      text: captive.name + (house ? ' of ' + house.name : '') + ' (until ' + (captive.until || '?') + ')',
                      icons: [this.affairIcon('scandal')],
                      tooltip: 'Ransom for cash, demand a future favour (hook), or release for goodwill.',
                      action: { event: this.event, method: 'politicsAction', context: { action: 'ransomCaptive', captiveId: captive.id } }
                    }
                  })
                  captives.forEach((captive) => {
                    let house = society.houses[captive.houseId]
                    if (house && this.housePropertyOptions(house).length) {
                      options.push(this.politicsButton('openDemandProperty', 'Demand a property from ' + house.name + ' for ' + captive.name, 'coins', { captiveId: captive.id }))
                    }
                    options.push(this.politicsButton('demandHookFromCaptive', 'Demand a favour from ' + (house ? house.name : 'the house') + ' for ' + captive.name, 'support', { captiveId: captive.id }))
                    options.push(this.politicsButton('releaseCaptive', 'Release ' + captive.name + ' for goodwill', 'gift', { captiveId: captive.id }))
                  })
                  options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Held captives',
                    message: captives.length ? 'Each captive can be ransomed once for leverage.' : 'You hold no captives.',
                    image: this.affairIcon('scandal'),
                    options
                  })
                },
        findCaptive(society, captiveId) {
                  return (society.captives || []).find((c) => c && c.id === captiveId)
                },
        ransomCaptive({ captiveId } = {}) {
                  let society = this.loadForAction()
                  this.ensureRomeState(society)
                  let captive = this.findCaptive(society, captiveId)
                  if (captive) {
                    let house = society.houses[captive.houseId]
                    let ransom = house ? Math.max(40, Math.round((house.wealth || 200) * 0.12)) : 80
                    if (house) {
                      house.wealth = Math.max(0, Math.round((house.wealth || 0) - ransom))
                      house.relation = this.clamp((house.relation || 0) - 6, -100, 100)
                    }
                    this.applyStats({ cash: ransom })
                    this.log(society, 'You ransom ' + captive.name + ' back to ' + (house ? house.name : 'their house') + ' for ' + ransom + ' cash.', 'coins', captive.houseId)
                    society.captives = (society.captives || []).filter((c) => c && c.id !== captiveId)
                  }
                  this.save(society)
                  this.openCaptives()
                },
        demandHookFromCaptive({ captiveId } = {}) {
                  let society = this.loadForAction()
                  this.ensureRomeState(society)
                  let captive = this.findCaptive(society, captiveId)
                  if (captive) {
                    let house = society.houses[captive.houseId]
                    if (house) {
                      house.playerHookUntil = this.futureMonthKey(24)
                      house.relation = this.clamp((house.relation || 0) - 4, -100, 100)
                      if ((society.playerPolitics.faction || []).indexOf(house.id) < 0 && Math.random() < 0.5) {
                        society.playerPolitics.faction.push(house.id)
                      }
                      this.log(society, 'You extract a binding favour from ' + house.name + ' in exchange for ' + captive.name + '.', 'support', captive.houseId)
                    }
                    society.captives = (society.captives || []).filter((c) => c && c.id !== captiveId)
                  }
                  this.save(society)
                  this.openCaptives()
                },
        openDemandProperty({ captiveId } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  this.ensureRomeState(society)
                  let captive = this.findCaptive(society, captiveId)
                  let house = captive && society.houses[captive.houseId]
                  if (!captive || !house) {
                    this.openCaptives()
                    return
                  }
                  let props = this.housePropertyOptions(house)
                  let options = props.map((p) => {
                    return this.politicsButton('demandProperty', 'Demand ' + p.title + ' (x' + p.count + ', worth ' + p.value + ')', p.group === 'animal' ? 'familyTree' : 'coins', { captiveId, key: p.key })
                  })
                  options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openCaptives' } } })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Ransom ' + captive.name + ' for property',
                    message: 'Force ' + house.name + ' to hand over a property to free ' + captive.name + '. It passes to your house and the captive is released.',
                    image: this.affairIcon('coins'),
                    options
                  })
                },
        demandProperty({ captiveId, key } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  this.ensureRomeState(society)
                  let captive = this.findCaptive(society, captiveId)
                  let house = captive && society.houses[captive.houseId]
                  let message = ''
                  if (captive && house && key) {
                    let title = this.propertyTitleFor(key)
                    let value = this.transferPropertyToPlayer(society, state, house, key, 1)
                    house.relation = this.clamp((house.relation || 0) - 8, -100, 100)
                    this.applyStats({ prestige: 4 })
                    message = house.name + ' surrenders ' + title + ' (worth ' + value + ') to free ' + captive.name + '. It now belongs to your house.'
                    this.log(society, message, 'coins', captive.houseId)
                    society.captives = (society.captives || []).filter((c) => c && c.id !== captiveId)
                  }
                  this.save(society)
                  this.pushModal({
                    societyMenu: true,
                    title: 'Ransom paid in property',
                    message: message || 'Nothing was surrendered.',
                    image: this.affairIcon('coins'),
                    options: [{ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } }]
                  })
                },
        releaseCaptive({ captiveId } = {}) {
                  let society = this.loadForAction()
                  this.ensureRomeState(society)
                  let captive = this.findCaptive(society, captiveId)
                  if (captive) {
                    let house = society.houses[captive.houseId]
                    if (house) {
                      house.relation = this.clamp((house.relation || 0) + 18, -100, 100)
                      house.heat = Math.max(0, (house.heat || 0) - 2)
                    }
                    this.applyStats({ prestige: 4 })
                    this.log(society, 'You release ' + captive.name + ' unharmed, earning goodwill.', 'gift', captive.houseId)
                    society.captives = (society.captives || []).filter((c) => c && c.id !== captiveId)
                  }
                  this.save(society)
                  this.openCaptives()
                },
        dictatorshipGate(society, state) {
                  let rome = this.ensureRomeState(society)
                  if (rome.government !== 'republic') {
                    return { ready: false, reason: 'Rome is not a Republic right now.' }
                  }
                  if (!this.playerIsSenatorial(state)) {
                    return { ready: false, reason: 'You must reach the senatorial order (Senate seat) first.' }
                  }
                  let faction = (society.playerPolitics.faction || []).filter((id) => society.houses[id]).length
                  let auctoritas = this.playerAuctoritasScore(society, state)
                  let cash = parseFloat((state.current || {}).cash || 0)
                  let influence = parseFloat((state.current || {}).influence || 0)
                  let house = this.playerPoliticsHouse(society, state)
                  let propertyValue = house && this.housePropertyValue ? this.housePropertyValue(house) : 0
                  if (faction < 3) {
                    return { ready: false, reason: 'Win more houses to your faction - at least 3 must stand behind you (have ' + faction + ').' }
                  }
                  if (auctoritas < 70) {
                    return { ready: false, reason: 'Your auctoritas is still too light for men to call you to the dictatorship (have ' + auctoritas + ', need ~70).' }
                  }
                  if (cash < 250 && propertyValue < 3000 && influence < 1500) {
                    return { ready: false, reason: 'A dictator must have means - greater wealth (250+ cash or 3000+ in estates) or far more influence - before the Senate would trust you with imperium.' }
                  }
                  return { ready: true, reason: '' }
                },
        dictatorMandateList() {
                  // Historical Republican dictatorships were granted for a stated purpose (causa),
                  // for a limited term, each with a different character. Only the Sullan legislative
                  // mandate opens the real road to one-man rule.
                  return [
                    { id: 'rei_gerundae', title: 'Rei gerundae causa - to wage a war', term: 6, progress: 0, note: 'War powers in a military crisis. Honourable, but a dead end for ambition.' },
                    { id: 'seditionis', title: 'Seditionis sedandae causa - to crush sedition', term: 6, progress: 2, note: 'Emergency powers against unrest at home.' },
                    { id: 'comitiorum', title: 'Comitiorum habendorum causa - to hold the elections', term: 2, progress: -4, note: 'A short, narrow mandate; little room to build power.' },
                    { id: 'legibus', title: 'Legibus scribundis et rei publicae constituendae - to remake the Republic (Sulla)', term: 11, progress: 14, note: 'A long legislative mandate. Lets you LEGISLATE - the true road toward the purple.', powerLaws: true }
                  ]
                },
        openDictatorMandates() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let gate = this.dictatorshipGate(society, state)
                  if (!gate.ready) {
                    this.pushModal({ societyMenu: true, title: 'Dictatorship', message: gate.reason, image: this.affairIcon('senator'), options: [{ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } }] })
                    return
                  }
                  let options = this.dictatorMandateList().map((m) => {
                    return this.politicsButton('seekDictatorship', m.title + ' (' + m.term + ' mo.)', 'senator', { mandate: m.id }, { tooltip: m.note })
                  })
                  options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } })
                  this.pushModal({
                    societyMenu: true,
                    title: 'For what cause? (Dictator mandate)',
                    message: 'The Senate names a Dictator only for a stated purpose and a fixed term. Choose your causa - only a Sullan legislative mandate truly opens the road to the purple.',
                    image: this.affairIcon('senator'),
                    options
                  })
                },
        seekDictatorship({ mandate } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let rome = this.ensureRomeState(society)
                  let gate = this.dictatorshipGate(society, state)
                  if (!gate.ready) {
                    this.save(society)
                    this.pushModal({ societyMenu: true, title: 'Dictatorship', message: gate.reason, image: this.affairIcon('senator'), options: [{ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } }] })
                    return
                  }
                  let mandates = this.dictatorMandateList()
                  let chosen = mandates.find((m) => m.id === mandate) || mandates[0]
                  let auctoritas = this.playerAuctoritasScore(society, state)
                  this.applyStats({ influence: -60 })
                  let chance = this.clamp(0.25 + (auctoritas - 70) / 240, 0.15, 0.7)
                  let house = this.playerPoliticsHouse(society, state)
                  let message = ''
                  if (Math.random() < chance) {
                    rome.government = 'dictatorship'
                    rome.dictatorHouseId = house ? house.id : ''
                    rome.dictatorCharacterId = this.currentCharacterId(state)
                    rome.dictatorMandate = chosen.id
                    rome.dictatorTermEnd = this.futureMonthKey(chosen.term)
                    rome.empireProgress = this.clamp(parseFloat(rome.empireProgress || 0) + (chosen.progress || 0), 0, 100)
                    society.playerPolitics.wasDictator = true
                    society.playerPolitics.auctoritas = parseFloat(society.playerPolitics.auctoritas || 0) + 20
                    this.applyStats({ prestige: 30 })
                    this.politicsRivalHouses(society, state).slice(0, 8).forEach((h) => {
                      if ((society.playerPolitics.faction || []).indexOf(h.id) < 0) {
                        h.heat = (h.heat || 0) + 2
                        h.relation = this.clamp((h.relation || 0) - 6, -100, 100)
                      }
                    })
                    message = 'A consul, on the Senate\'s authority, names you DICTATOR ' + chosen.title.split(' - ')[0] + ' for a ' + chosen.term + '-month term, with a master of horse (magister equitum) at your side.' + (chosen.powerLaws ? ' Your legislative mandate lets you remake the laws - the road to the purple is open.' : ' This is a limited mandate; lay it down with honour when the task is done.')
                    this.log(society, 'You are named Dictator of Rome (' + chosen.id + ').', 'prestige')
                  } else {
                    this.applyStats({ prestige: -20 })
                    message = 'The Senate refuses to name you Dictator; the optimates rally against you and your standing suffers.'
                    this.log(society, 'Your bid for the dictatorship fails in the Senate.', 'rivalry')
                  }
                  this.save(society)
                  this.pushModal({ societyMenu: true, title: 'The Dictatorship', message, image: this.affairIcon('senator'), options: [{ text: 'Continue', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } }] })
                },
        layDownDictatorship() {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let rome = this.ensureRomeState(society)
                  if (this.playerIsDictator(society, state)) {
                    rome.government = 'republic'
                    rome.dictatorHouseId = ''
                    rome.dictatorCharacterId = ''
                    rome.dictatorTermEnd = ''
                    this.applyStats({ prestige: 25, influence: 15 })
                    society.playerPolitics.auctoritas = parseFloat(society.playerPolitics.auctoritas || 0) + 10
                    this.log(society, 'Like Cincinnatus, you lay down the dictatorship and restore the Republic. Your honour soars.', 'prestige')
                  }
                  this.save(society)
                  this.pushModal({ societyMenu: true, title: 'Dictatorship laid down', message: 'You return supreme power to the Senate and the people of Rome. They will remember it.', image: this.affairIcon('prestige'), options: [{ text: 'Continue', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } }] })
                },
        empireGate(society, state) {
                  let rome = this.ensureRomeState(society)
                  if (!this.playerIsDictator(society, state)) {
                    return { ready: false, reason: 'Only a sitting Dictator can make the final bid for the purple. (The first Emperor must first be Dictator.)' }
                  }
                  if (rome.dictatorMandate !== 'legibus') {
                    return { ready: false, reason: 'Only a Dictator named to remake the Republic (legibus scribundis, the Sullan mandate) can reach for the purple. Lay this office down, or wait for a legislative mandate.' }
                  }
                  let faction = (society.playerPolitics.faction || []).filter((id) => society.houses[id]).length
                  let auctoritas = this.playerAuctoritasScore(society, state)
                  let offices = this.playerSenateOfficeCount(state)
                  let cash = parseFloat((state.current || {}).cash || 0)
                  if (faction < 5) return { ready: false, reason: 'You need at least 5 houses in your faction (have ' + faction + ').' }
                  if (auctoritas < 140) return { ready: false, reason: 'You need overwhelming auctoritas (have ' + auctoritas + ', need 140).' }
                  if (offices < 1) return { ready: false, reason: 'You must hold a Senate office to command imperium.' }
                  if (cash < 300) return { ready: false, reason: 'You need a war chest of at least 300 cash for donatives.' }
                  return { ready: true, reason: '' }
                },
        attemptEmpire() {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let rome = this.ensureRomeState(society)
                  let gate = this.empireGate(society, state)
                  if (!gate.ready) {
                    this.save(society)
                    this.pushModal({ societyMenu: true, title: 'The purple', message: gate.reason, image: this.affairIcon('senator'), options: [{ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } }] })
                    return
                  }
                  let auctoritas = this.playerAuctoritasScore(society, state)
                  this.applyStats({ cash: -300, influence: -80 })
                  // Hard multi-stage bid; each stage can fail. Many attempts fail by design.
                  // Laws passed as Dictator (legislative progress) materially improve the odds.
                  let base = this.clamp(0.18 + (auctoritas - 140) / 400 + (rome.empireProgress || 0) / 250, 0.1, 0.65)
                  let stages = [
                    { name: 'Senate vote of extraordinary powers', p: base + 0.05 },
                    { name: 'Army and Praetorian acclamation', p: base },
                    { name: 'Optimates and rival claimants suppressed', p: base - 0.03 }
                  ]
                  let failedStage = ''
                  for (let i = 0; i < stages.length; i++) {
                    if (Math.random() > this.clamp(stages[i].p, 0.05, 0.7)) {
                      failedStage = stages[i].name
                      break
                    }
                  }
                  let house = this.playerPoliticsHouse(society, state)
                  let message = ''
                  if (!failedStage) {
                    this.becomeEmperor(society, state)
                    message = 'After Dictatorship comes the purple. The Senate, army, and people acclaim you IMPERATOR - and the eagle of Rome (SPQR) is raised in your name. Rome becomes an Empire. War-time edicts and your imperial powers now ripple across every house, and the imperial fisc pays you each month.'
                  } else {
                    // Failure branches - costly, sometimes catastrophic.
                    let roll = Math.random()
                    if (roll < 0.45) {
                      rome.government = 'republic'
                      rome.dictatorHouseId = ''
                      rome.dictatorTermEnd = ''
                      this.applyStats({ prestige: -40 })
                      message = 'Your bid collapses at: ' + failedStage + '. You are forced to lay down all power and retreat to private life. The Republic endures.'
                      this.log(society, 'Your bid for the purple fails (' + failedStage + '); you are forced from power.', 'rivalry')
                    } else if (roll < 0.8) {
                      rome.government = 'republic'
                      rome.dictatorHouseId = ''
                      rome.dictatorTermEnd = ''
                      this.applyStats({ prestige: -50, cash: -Math.round(parseFloat((state.current || {}).cash || 0) * 0.4), influence: -60 })
                      if (house) house.heat = (house.heat || 0) + 6
                      message = 'You fail at: ' + failedStage + '. You are proscribed - your property plundered and your name dragged through the courts.'
                      this.log(society, 'Proscription! Your bid for the purple ends in ruin.', 'scandal')
                    } else {
                      rome.government = 'republic'
                      rome.dictatorHouseId = ''
                      rome.dictatorTermEnd = ''
                      this.applyStats({ prestige: -70, influence: -100 })
                      rome.wars = rome.wars || []
                      this.politicsRivalHouses(society, state).slice(0, 6).forEach((h) => {
                        h.heat = (h.heat || 0) + 5
                        h.relation = this.clamp((h.relation || 0) - 20, -100, 100)
                        h.rivalry = true
                      })
                      message = 'Your coup fails at: ' + failedStage + '. Rome plunges into CIVIL WAR; the great houses take up arms and your faction is shattered.'
                      this.log(society, 'Civil war erupts after your failed bid for the purple.', 'rivalry')
                    }
                  }
                  this.save(society)
                  this.pushModal({ societyMenu: true, title: failedStage ? 'The bid for the purple' : 'Imperator', message, image: failedStage ? this.affairIcon('senator') : this.imperatorIcon(), options: [{ text: 'Continue', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } }] })
                },
        openEmperorActions() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let rome = this.ensureRomeState(society)
                  if (!this.playerIsEmperor(society, state)) {
                    this.openPolitics()
                    return
                  }
                  let options = [
                    this.politicsButton('openAppointGovernor', 'Appoint a provincial governor', 'senator'),
                    this.politicsButton('openDeclareWar', 'Declare war on a house', 'rivalry'),
                    this.politicsButton('holdGames', 'Hold games and donatives (defend your position)', 'prestige'),
                    this.politicsButton('defendSuccession', 'Defend the succession (pressure ' + Math.round(rome.successionPressure || 0) + '%)', 'familyTree')
                  ]
                  options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Imperator - Imperial powers',
                    message: 'As Imperator, under the eagle of Rome (SPQR), you command appointments, war, and the loyalty of Rome, and the imperial fisc fills your treasury each month. Rivals will push to change the succession to favour the wealthiest or strongest house - hold them off.',
                    image: this.imperatorIcon(),
                    options
                  })
                },
        openAppointGovernor() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let rome = this.ensureRomeState(society)
                  let houses = this.politicsRivalHouses(society, state).slice(0, 10)
                  let regions = this.romanRegions || ['Latium']
                  let options = houses.map((house, index) => {
                    let region = regions[index % regions.length]
                    return this.politicsButton('appointGovernor', 'Make ' + house.name + ' governor of ' + region, 'senator', { houseId: house.id, region })
                  })
                  options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openEmperorActions' } } })
                  this.pushModal({ societyMenu: true, title: 'Appoint a governor', message: 'Reward a house with a province. It strengthens their loyalty and revenue - and your patronage network.', image: this.affairIcon('senator'), options })
                },
        appointGovernor({ houseId, region } = {}) {
                  this.withHouse(houseId, (society, house) => {
                    let rome = this.ensureRomeState(society)
                    rome.appointments[houseId] = { region: region || 'a province', until: this.futureMonthKey(36) }
                    house.relation = this.clamp((house.relation || 0) + 20, -100, 100)
                    house.wealth = (house.wealth || 0) + 120
                    if ((society.playerPolitics.faction || []).indexOf(houseId) < 0) {
                      society.playerPolitics.faction.push(houseId)
                    }
                    this.log(society, 'You appoint ' + house.name + ' as governor of ' + (region || 'a province') + '.', 'senator', houseId)
                  })
                  this.openEmperorActions()
                },
        openDeclareWar() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let houses = this.politicsRivalHouses(society, state).slice(0, 10)
                  let options = houses.map((house) => {
                    return this.politicsButton('declareWar', 'War on ' + house.name + ' (power ' + Math.round(house.power || 0) + ')', 'rivalry', { houseId: house.id })
                  })
                  options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openEmperorActions' } } })
                  this.pushModal({ societyMenu: true, title: 'Declare war', message: 'Imperial war affects all of Rome: the targeted house and its allies suffer, and war-time notices spread across the houses.', image: this.affairIcon('rivalry'), options })
                },
        declareWar({ houseId } = {}) {
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let rome = this.ensureRomeState(society)
                    rome.wars.push({ houseId, startMonth: this.monthKey(state), endMonth: this.futureMonthKey(this.randomInt(3, 6)) })
                    house.relation = this.clamp((house.relation || 0) - 40, -100, 100)
                    house.heat = (house.heat || 0) + 8
                    house.rivalry = true
                    house.ai = house.ai || {}
                    house.ai.modifiers = house.ai.modifiers || {}
                    house.ai.modifiers.revenue = house.ai.modifiers.revenue || []
                    house.ai.modifiers.revenue.push({ factor: 0.6, until: this.futureMonthKey(5) })
                    this.applyStats({ influence: -40 })
                    this.politicsRivalHouses(society, state).slice(0, 10).forEach((h) => {
                      if (String(h.id) !== String(houseId)) {
                        h.stability = this.clamp((h.stability || 50) - 4, 0, 100)
                      }
                    })
                    this.log(society, 'Imperial war is declared on ' + house.name + '. Levies march near ' + this.romanPlace('region') + '; the houses brace for war.', 'rivalry', houseId)
                  })
                  this.openEmperorActions()
                },
        holdGames() {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let rome = this.ensureRomeState(society)
                  let cost = 150
                  this.applyStats({ cash: -cost, prestige: 20 })
                  society.playerPolitics.auctoritas = parseFloat(society.playerPolitics.auctoritas || 0) + 12
                  rome.successionPressure = Math.max(0, parseFloat(rome.successionPressure || 0) - 25)
                  this.sortedHouses(society).slice(0, 12).forEach((h) => {
                    if (!h.isPlayerHouse) h.relation = this.clamp((h.relation || 0) + 5, -100, 100)
                  })
                  this.log(society, 'You stage lavish games and donatives at ' + this.romanPlace('landmark') + '; the people and houses cheer your name.', 'prestige')
                  this.save(society)
                  this.openEmperorActions()
                },
        defendSuccession() {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let rome = this.ensureRomeState(society)
                  this.applyStats({ influence: -50 })
                  society.playerPolitics.lastDefendMonth = this.monthKey(state)
                  let auctoritas = this.playerAuctoritasScore(society, state)
                  let success = Math.random() < this.clamp(0.4 + auctoritas / 400, 0.2, 0.9)
                  if (success) {
                    rome.successionPressure = Math.max(0, parseFloat(rome.successionPressure || 0) - 50)
                    rome.successionLaw = 'designation'
                    this.applyStats({ prestige: 10 })
                    this.log(society, 'You face down the factions and keep the succession by designation/adoption.', 'familyTree')
                  } else {
                    rome.successionPressure = Math.max(0, parseFloat(rome.successionPressure || 0) - 15)
                    this.log(society, 'You spend heavily to slow the succession factions, but the pressure remains.', 'familyTree')
                  }
                  this.save(society)
                  this.openEmperorActions()
                },
        pathToPowerHint(society, state) {
                  let rome = this.ensureRomeState(society)
                  if (this.playerIsEmperor(society, state)) {
                    return 'You rule as Imperator. Defend the succession and project power - rivals will push to change the law.'
                  }
                  if (this.playerIsDictator(society, state)) {
                    let egate = this.empireGate(society, state)
                    let prog = Math.round(rome.empireProgress || 0)
                    if (egate.ready) {
                      return 'Hint: you are ready to bid for the purple, but it is risky. Pass LAWS to raise your odds (legislative progress ' + prog + '%), or force it with Dictator perpetuo / marching on Rome.'
                    }
                    return 'Hint: to reach the purple - ' + egate.reason + ' As Dictator, propose LAWS to build legislative progress (' + prog + '%) toward the throne.'
                  }
                  if (rome.government === 'republic') {
                    let dgate = this.dictatorshipGate(society, state)
                    if (dgate.ready) {
                      return 'Hint: you can seek the Dictatorship now - the required first step toward becoming Emperor.'
                    }
                    return 'Hint: climb toward the Dictatorship first - ' + dgate.reason
                  }
                  return ''
                },
        becomeEmperor(society, state) {
                  let rome = this.ensureRomeState(society)
                  let house = this.playerPoliticsHouse(society, state)
                  society.playerPolitics.wasDictator = true
                  rome.government = 'empire'
                  rome.rulerHouseId = house ? house.id : ''
                  rome.rulerCharacterId = this.currentCharacterId(state)
                  rome.everHadEmperor = true
                  rome.successionLaw = 'designation'
                  rome.dictatorHouseId = ''
                  rome.dictatorTermEnd = ''
                  rome.successionPressure = 0
                  this.applyStats({ prestige: 80, influence: 60 })
                  this.politicsRivalHouses(society, state).forEach((h) => {
                    let friendly = (society.playerPolitics.faction || []).indexOf(h.id) >= 0
                    h.relation = this.clamp((h.relation || 0) + (friendly ? 10 : -8), -100, 100)
                    if (!friendly) h.heat = (h.heat || 0) + 2
                  })
                  this.log(society, 'You become Imperator - Emperor of Rome.', 'prestige')
                },
        lawList() {
                  return [
                    { id: 'lex_de_imperio', title: 'Lex de Imperio - grant yourself greater imperium', cost: { influence: 40 }, progress: 12, auctoritas: 10, oppose: 3, civilWar: 0 },
                    { id: 'pack_senate', title: 'Pack the Senate with your clients', cost: { cash: 120 }, progress: 14, auctoritas: 12, oppose: 4, civilWar: 0 },
                    { id: 'extend_term', title: 'Dictator legibus scribundis - extend your term', cost: { influence: 60 }, progress: 18, auctoritas: 16, oppose: 6, civilWar: 0.08, extendTerm: 8 },
                    { id: 'perpetual', title: 'Dictator perpetuo - dictator for life (Caesar)', cost: { influence: 100, cash: 150 }, progress: 30, auctoritas: 24, oppose: 10, civilWar: 0.45 },
                    { id: 'march', title: 'March your clients on Rome - force the issue (civil war)', cost: { cash: 200 }, progress: 0, auctoritas: 0, oppose: 12, civilWar: 1 }
                  ]
                },
        canPassPowerLaws(society, state) {
                  // Only a Dictator with the Sullan legislative mandate may legislate his way toward
                  // one-man rule. War / sedition / elections mandates cannot.
                  let rome = this.ensureRomeState(society)
                  return this.playerIsDictator(society, state) && rome.dictatorMandate === 'legibus'
                },
        lawNeedsSenateVote(society, state) {
                  // A plain senator may only PROPOSE laws; the Senate then votes. A Dictator enacts
                  // by decree; an Emperor by edict.
                  return !this.playerIsDictator(society, state) && !this.playerIsEmperor(society, state)
                },
        openLaws() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  let rome = this.ensureRomeState(society)
                  let isDictator = this.playerIsDictator(society, state)
                  let isEmperor = this.playerIsEmperor(society, state)
                  let isSenatorial = this.playerIsSenatorial(state)
                  if (!isDictator && !isEmperor && !isSenatorial) {
                    this.openPolitics()
                    return
                  }
                  let options = []
                  if (this.canPassPowerLaws(society, state)) {
                    this.lawList().forEach((law) => {
                      let passed = (society.playerPolitics.laws || []).indexOf(law.id) >= 0 && law.id !== 'march'
                      options.push(this.politicsButton('proposeLaw', (passed ? '* ' : '') + law.title + ' (' + this.costLabel(law.cost) + (law.civilWar >= 1 ? ', CIVIL WAR' : law.civilWar ? ', war risk' : '') + ')', law.civilWar ? 'rivalry' : 'senator', { lawId: law.id }, passed ? { disabled: true, showDisabledWithTooltip: true, tooltip: 'Already enacted.' } : { tooltip: this.lawTooltip ? this.lawTooltip(law) : (law.description || law.title) }))
                    })
                  } else if (isDictator) {
                    options.push({ text: 'Power laws need a legislative mandate (legibus scribundis)', disabled: true, showDisabledWithTooltip: true, tooltip: 'Only a Dictator named to remake the laws (the Sullan mandate) may legislate toward the purple.' })
                  }
                  options.push(this.politicsButton('openPolicyLaws', isDictator || isEmperor ? 'Economic & social policy laws' : 'Propose policy laws to the Senate', 'trade'))
                  options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } })
                  this.pushModal({
                    societyMenu: true,
                    title: isDictator ? 'Laws (Dictator)' : isEmperor ? 'Imperial edicts' : 'Propose laws',
                    message: (this.canPassPowerLaws(society, state) ? 'Legislate your way toward the throne (progress ' + Math.round(rome.empireProgress || 0) + '%). Bold laws can ignite CIVIL WAR - win it and the purple is yours. ' : isSenatorial && !isDictator && !isEmperor ? 'As a senator you may PROPOSE laws; the Senate then votes. ' : '') + 'Economic and social policy rewards some houses and punishes others.',
                    image: this.affairIcon('senator'),
                    options
                  })
                },
        policyLawList() {
                  return [
                    { id: 'olive_vs_herds', title: 'Tax the oil latifundia, subsidise the herders', cost: { influence: 30 }, populist: 2, hurt: { keys: ['latifundiumOil', 'orchard', 'primeOrchard'], who: 'oil & orchard estates' }, help: { groups: ['animal'], who: 'herders' } },
                    { id: 'lex_agraria', title: 'Lex Agraria - redistribute the great estates', cost: { influence: 55 }, populist: 6, hurt: { groups: ['land', 'estate'], who: 'the great landowners' }, help: { groups: ['animal'], who: 'smallholders & plebs' } },
                    { id: 'lex_claudia', title: 'Lex Claudia - bar senators from sea trade', cost: { influence: 40 }, populist: 1, hurt: { groups: ['boat'], who: 'the shipping houses' }, help: { groups: ['land'], who: 'the landed houses' } },
                    { id: 'lex_frumentaria', title: 'Lex Frumentaria - grain dole for the people', cost: { cash: 160 }, populist: 8, allRelation: 4, hurt: false, help: false },
                    { id: 'novae_tabulae', title: 'Novae Tabulae - cancel debts', cost: { influence: 50 }, populist: 5, hurt: { wealthAbove: 600, who: 'the great creditors' }, help: { wealthBelow: 220, who: 'indebted houses' } },
                    { id: 'vectigal_portus', title: 'Harbour dues - tax the trading fleets', cost: { influence: 25 }, populist: 0, hurt: { groups: ['boat'], who: 'trading fleets' }, help: { groups: ['land', 'animal'], who: 'farmers & herders' } }
                  ]
                },
        houseMatchesPolicy(house, match) {
                  if (!match) {
                    return false
                  }
                  let details = this.normalizeHousePropertyDetails ? this.normalizeHousePropertyDetails(house) : ((house.ai && house.ai.propertyDetails) || {})
                  let types = this.vanillaPropertyTypes ? this.vanillaPropertyTypes() : {}
                  if (match.keys && match.keys.some((key) => parseFloat(details[key] || 0) > 0)) {
                    return true
                  }
                  if (match.groups && Object.keys(details).some((key) => types[key] && match.groups.indexOf(types[key].group) >= 0 && parseFloat(details[key] || 0) > 0)) {
                    return true
                  }
                  if (match.wealthAbove !== undefined && (house.wealth || 0) >= match.wealthAbove) {
                    return true
                  }
                  if (match.wealthBelow !== undefined && (house.wealth || 0) <= match.wealthBelow) {
                    return true
                  }
                  return false
                },
        openPolicyLaws() {
                  let society = this.ensure()
                  let state = daapi.getState()
                  this.ensureRomeState(society)
                  let options = this.policyLawList().map((law) => {
                    return this.politicsButton('enactPolicyLaw', law.title + ' (' + this.costLabel(law.cost) + ')', law.populist >= 5 ? 'support' : 'trade', { lawId: law.id }, { tooltip: this.lawTooltip ? this.lawTooltip(law) : (law.description || law.title) })
                  })
                  options.push({ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openLaws' } } })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Policy laws',
                    message: 'Real Roman policy: every law has winners and losers. Houses you favour warm to you; houses you tax or curb resent you. Choose your base of support.',
                    image: this.affairIcon('trade'),
                    options
                  })
                },
        enactPolicyLaw({ lawId } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let rome = this.ensureRomeState(society)
                  let law = this.policyLawList().find((l) => l.id === lawId)
                  if (!law || (!this.playerIsDictator(society, state) && !this.playerIsEmperor(society, state) && !this.playerIsSenatorial(state))) {
                    this.save(society)
                    this.openPolicyLaws()
                    return
                  }
                  this.applyStats({ cash: -(law.cost.cash || 0), influence: -(law.cost.influence || 0) })
                  // A plain senator must win a Senate vote; a Dictator/Emperor enacts directly.
                  if (this.lawNeedsSenateVote(society, state)) {
                    let auctoritas = this.playerAuctoritasScore(society, state)
                    let voteChance = this.clamp(0.35 + auctoritas / 300, 0.15, 0.85)
                    if (Math.random() >= voteChance) {
                      this.applyStats({ prestige: -4 })
                      this.log(society, 'The Senate votes down your proposed law: ' + law.title + '.', 'rivalry')
                      this.save(society)
                      this.pushModal({ societyMenu: true, title: 'Senate vote', message: 'You propose ' + law.title + ', but the Senate votes it down.', image: this.affairIcon('senator'), options: [{ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolicyLaws' } } }] })
                      return
                    }
                  }
                  let hurt = 0
                  let helped = 0
                  this.politicsRivalHouses(society, state).forEach((house) => {
                    house.ai = house.ai || {}
                    house.ai.modifiers = house.ai.modifiers || {}
                    house.ai.modifiers.revenue = house.ai.modifiers.revenue || []
                    if (law.hurt && this.houseMatchesPolicy(house, law.hurt)) {
                      house.ai.modifiers.revenue.push({ factor: 0.82, until: this.futureMonthKey(10) })
                      house.relation = this.clamp((house.relation || 0) - 12, -100, 100)
                      house.heat = (house.heat || 0) + 1
                      hurt += 1
                    } else if (law.help && this.houseMatchesPolicy(house, law.help)) {
                      house.ai.modifiers.revenue.push({ factor: 1.12, until: this.futureMonthKey(10) })
                      house.relation = this.clamp((house.relation || 0) + 10, -100, 100)
                      helped += 1
                    } else if (law.allRelation) {
                      house.relation = this.clamp((house.relation || 0) + law.allRelation, -100, 100)
                      helped += 1
                    }
                  })
                  this.applyStats({ prestige: law.populist || 0 })
                  society.playerPolitics.auctoritas = parseFloat(society.playerPolitics.auctoritas || 0) + 4
                  rome.policies = rome.policies || []
                  if (rome.policies.indexOf(law.id) < 0) rome.policies.push(law.id)
                  let message = 'You enact: ' + law.title + '.' +
                    (law.hurt ? '\n' + hurt + ' houses (' + law.hurt.who + ') are hit and resent you.' : '') +
                    (law.help ? '\n' + helped + ' houses (' + law.help.who + ') benefit and warm to you.' : '') +
                    (law.allRelation ? '\nThe people and ' + helped + ' houses cheer the measure.' : '')
                  this.log(society, 'Law enacted: ' + law.title + ' (' + hurt + ' hurt, ' + helped + ' favoured).', 'senator')
                  this.save(society)
                  this.pushModal({ societyMenu: true, title: 'Policy enacted', message, image: this.affairIcon('trade'), options: [{ text: 'Back', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolicyLaws' } } }] })
                },
        proposeLaw({ lawId } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let rome = this.ensureRomeState(society)
                  let law = this.lawList().find((l) => l.id === lawId)
                  if (!law || !this.canPassPowerLaws(society, state)) {
                    this.save(society)
                    this.openLaws()
                    return
                  }
                  this.applyStats({ cash: -(law.cost.cash || 0), influence: -(law.cost.influence || 0) })
                  let message = ''
                  if (law.civilWar >= 1) {
                    message = this.triggerCivilWar(society, state, law)
                    this.save(society)
                    this.pushModal({ societyMenu: true, title: 'Civil war', message, image: this.affairIcon('rivalry'), options: [{ text: 'Continue', action: { event: this.event, method: 'politicsAction', context: { action: 'openPolitics' } } }] })
                    return
                  }
                  let auctoritas = this.playerAuctoritasScore(society, state)
                  let factionMod = this.lawFactionModifier ? this.lawFactionModifier(society, state) : 0
                  let voteChance = this.clamp(0.35 + auctoritas / 300 + (rome.empireProgress || 0) / 300 + factionMod, 0.15, 0.92)
                  if (Math.random() < voteChance) {
                    society.playerPolitics.laws = society.playerPolitics.laws || []
                    if (society.playerPolitics.laws.indexOf(law.id) < 0) society.playerPolitics.laws.push(law.id)
                    society.playerPolitics.auctoritas = parseFloat(society.playerPolitics.auctoritas || 0) + (law.auctoritas || 0)
                    rome.empireProgress = this.clamp(parseFloat(rome.empireProgress || 0) + (law.progress || 0), 0, 100)
                    if (law.extendTerm) {
                      rome.dictatorTermEnd = this.futureMonthKey(law.extendTerm)
                    }
                    this.politicsRivalHouses(society, state).slice(0, 8).forEach((h) => {
                      if ((society.playerPolitics.faction || []).indexOf(h.id) < 0) {
                        h.heat = (h.heat || 0) + (law.oppose || 0) / 3
                        h.relation = this.clamp((h.relation || 0) - (law.oppose || 0) / 2, -100, 100)
                      }
                    })
                    message = 'The law passes: ' + law.title + '. Your power grows (legislative progress ' + Math.round(rome.empireProgress || 0) + '%), but the optimates resent it.'
                    this.log(society, 'Law enacted: ' + law.title + '.', 'senator')
                    if (law.civilWar && Math.random() < law.civilWar) {
                      message += '\n\nThe boldness of it tips Rome over the edge...'
                      message += '\n' + this.triggerCivilWar(society, state, law)
                    }
                  } else {
                    this.applyStats({ prestige: -10 })
                    message = 'The Senate blocks your law: ' + law.title + '. The optimates rally against you.'
                    this.log(society, 'Your law fails: ' + law.title + '.', 'rivalry')
                  }
                  this.save(society)
                  this.pushModal({ societyMenu: true, title: 'Legislation', message, image: this.affairIcon('senator'), options: [{ text: 'Continue', action: { event: this.event, method: 'politicsAction', context: { action: 'openLaws' } } }] })
                },
        triggerCivilWar(society, state, law) {
                  let rome = this.ensureRomeState(society)
                  let auctoritas = this.playerAuctoritasScore(society, state)
                  let faction = (society.playerPolitics.faction || []).filter((id) => society.houses[id]).length
                  let winChance = this.clamp(0.25 + (auctoritas - 100) / 350 + faction / 30 + (rome.empireProgress || 0) / 250 + this.politicalPowerBonus(society, state), 0.1, 0.8)
                  // Everyone suffers in civil war.
                  this.politicsRivalHouses(society, state).slice(0, 12).forEach((h) => {
                    h.stability = this.clamp((h.stability || 50) - 8, 0, 100)
                    h.heat = (h.heat || 0) + 3
                  })
                  if (Math.random() < winChance) {
                    this.becomeEmperor(society, state)
                    return 'CIVIL WAR! Your legions and clients prevail. On the ashes of the Republic you are acclaimed IMPERATOR - Rome is now an Empire.'
                  }
                  rome.government = 'republic'
                  rome.dictatorHouseId = ''
                  rome.dictatorTermEnd = ''
                  rome.empireProgress = Math.max(0, (rome.empireProgress || 0) - 40)
                  this.politicsRivalHouses(society, state).slice(0, 8).forEach((h) => {
                    h.relation = this.clamp((h.relation || 0) - 20, -100, 100)
                    h.rivalry = true
                  })
                  // A loser of a civil war was often executed. There is a real chance the player
                  // character dies here - the base game then continues the player with their heir.
                  let executed = Math.random() < 0.55
                  if (executed) {
                    this.log(society, 'Civil war! Your bid is crushed and you are executed. Your house fights on under your heir.', 'rivalry')
                    this.save(society)
                    try {
                      daapi.kill({ characterId: this.currentCharacterId(state), deathCause: ', executed after a failed bid for the purple' })
                    } catch (err) {
                      console.warn(err)
                    }
                    return 'CIVIL WAR! Your legions are crushed and YOU are executed as a traitor. Your house fights on - you continue as your heir.'
                  }
                  this.applyStats({ prestige: -60, influence: -100, cash: -Math.round(parseFloat((state.current || {}).cash || 0) * 0.5) })
                  this.log(society, 'Civil war! Your bid is crushed and you are driven from power.', 'rivalry')
                  return 'CIVIL WAR! Your forces are crushed. You are driven from power, proscribed, and the Republic - battered - endures.'
                },
        imperialCrimes() {
                  return [
                    { id: 'repetundae', label: 'extortion in office (repetundae)', severity: 1, confiscate: true, tribute: true, exile: true },
                    { id: 'adulterium', label: 'adultery against the Lex Iulia', severity: 1, exile: true, tribute: true },
                    { id: 'sedition', label: 'fomenting sedition', severity: 2, imprison: true, confiscate: true, exile: true },
                    { id: 'conspiracy', label: 'conspiracy against the state', severity: 3, imprison: true, confiscate: true, execute: true, exile: true },
                    { id: 'maiestas', label: 'treason (maiestas)', severity: 3, imprison: true, confiscate: true, execute: true, exile: true }
                  ]
                },
        openImperialActions({ houseId, characterId } = {}) {
                  let society = this.ensure()
                  let state = daapi.getState()
                  this.ensureRomeState(society)
                  if (!this.playerIsEmperor(society, state)) {
                    this.openHub()
                    return
                  }
                  let character = state.characters && state.characters[characterId]
                  let house = society.houses[houseId]
                  if (!character) {
                    this.openHub()
                    return
                  }
                  if (this.sameCharacterId && this.sameCharacterId(characterId, this.currentCharacterId(state))) {
                    this.openHub()
                    return
                  }
                  character.id = character.id || characterId
                  let inquiry = society.investigations[characterId]
                  let crime = inquiry && this.imperialCrimes().find((c) => c.id === inquiry.crimeId)
                  let options = []
                  options.push(this.politicsButton('imperialInvestigate', inquiry ? 'Re-open the inquiry' : 'Order an inquiry (investigate, 20 infl)', 'log', { houseId, characterId }))
                  if (crime) {
                    if (crime.imprison) options.push(this.politicsButton('imperialImprison', 'Imprison for ' + crime.label, 'scandal', { houseId, characterId }))
                    if (crime.confiscate && house && this.housePropertyOptions(house).length) options.push(this.politicsButton('imperialConfiscate', 'Confiscate property (proscription)', 'coins', { houseId, characterId }))
                    if (crime.exile) options.push(this.politicsButton('imperialExile', 'Banish into exile', 'rivalry', { houseId, characterId }))
                    if (crime.execute) options.push(this.politicsButton('imperialExecute', 'Execute for treason', 'death', { houseId, characterId }))
                    options.push(this.politicsButton('imperialPardon', 'Pardon (imperial clemency)', 'gift', { houseId, characterId }))
                  }
                  options.push(this.politicsButton('imperialDemandTribute', 'Demand tribute from ' + (house ? house.name : 'the house') + ' (60 cash)', 'coins', { houseId, characterId }))
                  options.push(this.politicsButton('imperialFavor', 'Grant imperial favour (patronage/office)', 'support', { houseId, characterId }))
                  options.push({ text: 'Back', action: { event: this.event, method: 'openPerson', context: { houseId, characterId } } })
                  this.pushModal({
                    societyMenu: true,
                    title: 'Imperial justice - ' + this.characterName(character, state),
                    message: inquiry ? 'The inquiry found: ' + (crime ? crime.label.toUpperCase() : 'nothing - they appear loyal') + '.' : 'As Imperator you hold cognitio over every Roman. Order an inquiry first, then judge.',
                    image: this.imperatorIcon(),
                    options
                  })
                },
        imperialInvestigate({ houseId, characterId } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  this.ensureRomeState(society)
                  let character = state.characters && state.characters[characterId]
                  if (!character) {
                    this.openImperialActions({ houseId })
                    return
                  }
                  this.applyStats({ influence: -20 })
                  let house = society.houses[houseId]
                  let traits = (character && character.traits) || []
                  let suspicion = (house ? (house.heat || 0) * 0.04 + (house.rivalry ? 0.15 : 0) : 0) +
                    (traits.indexOf('manipulator') >= 0 ? 0.1 : 0) + (traits.indexOf('liar') >= 0 ? 0.08 : 0) +
                    (traits.indexOf('ambitious') >= 0 ? 0.06 : 0) + (traits.indexOf('adulterer') >= 0 ? 0.12 : 0) +
                    (traits.indexOf('cruel') >= 0 ? 0.05 : 0) + Math.random() * 0.45
                  if (suspicion < 0.45) {
                    delete society.investigations[characterId]
                    this.log(society, 'Your inquiry into ' + this.characterName(character, state) + ' finds nothing; they appear loyal.', 'log', houseId)
                  } else {
                    let crimeId = 'repetundae'
                    if (traits.indexOf('adulterer') >= 0 && Math.random() < 0.6) crimeId = 'adulterium'
                    else if ((traits.indexOf('ambitious') >= 0 || traits.indexOf('manipulator') >= 0) && suspicion > 0.8) crimeId = Math.random() < 0.5 ? 'conspiracy' : 'maiestas'
                    else if (house && house.rivalry) crimeId = 'sedition'
                    society.investigations[characterId] = { crimeId, month: this.monthKey(state) }
                    let crime = this.imperialCrimes().find((c) => c.id === crimeId)
                    this.log(society, 'Your inquiry uncovers evidence of ' + (crime ? crime.label : 'wrongdoing') + ' by ' + this.characterName(character, state) + '.', 'scandal', houseId)
                  }
                  this.save(society)
                  this.openImperialActions({ houseId, characterId })
                },
        clearInvestigation(society, characterId) {
                  if (society.investigations) {
                    delete society.investigations[characterId]
                  }
                },
        imperialImprison({ houseId, characterId } = {}) {
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let character = state.characters && state.characters[characterId]
                    society.imprisoned = society.imprisoned || []
                    if (society.imprisoned.indexOf(characterId) < 0) society.imprisoned.push(characterId)
                    try { daapi.updateCharacter({ characterId, character: { flagIsBusy: true } }) } catch (err) { console.warn(err) }
                    house.relation = this.clamp((house.relation || 0) - 18, -100, 100)
                    house.heat = (house.heat || 0) + 2
                    this.applyStats({ prestige: 4 })
                    this.clearInvestigation(society, characterId)
                    this.log(society, 'By imperial order, ' + this.characterName(character, state) + ' is imprisoned.', 'scandal', houseId)
                  })
                  this.pushModal({ societyMenu: true, title: 'Imprisoned', message: 'The accused is taken into custody by the Praetorians.', image: this.affairIcon('scandal'), options: [{ text: 'Back', action: { event: this.event, method: 'openPerson', context: { houseId, characterId } } }] })
                },
        imperialConfiscate({ houseId, characterId } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  let message = 'There was nothing to confiscate.'
                  if (house) {
                    let props = this.housePropertyOptions(house)
                    if (props.length) {
                      let target = props[0]
                      let value = this.transferPropertyToPlayer(society, state, house, target.key, 1)
                      house.relation = this.clamp((house.relation || 0) - 14, -100, 100)
                      this.applyStats({ cash: Math.round(value * 0.4), prestige: 3 })
                      message = 'You proscribe and confiscate ' + target.title + ' (worth ' + value + ') near ' + this.romanPlace('estate') + ' into the imperial fisc.'
                      this.log(society, message, 'coins', houseId)
                    }
                  }
                  this.save(society)
                  this.pushModal({ societyMenu: true, title: 'Confiscation', message, image: this.affairIcon('coins'), options: [{ text: 'Back', action: { event: this.event, method: 'openPerson', context: { houseId, characterId } } }] })
                },
        imperialExile({ houseId, characterId } = {}) {
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let character = state.characters && state.characters[characterId]
                    house.relation = this.clamp((house.relation || 0) - 10, -100, 100)
                    house.heat = (house.heat || 0) + 1
                    try { daapi.updateCharacter({ characterId, character: { flagIsAway: true } }) } catch (err) { console.warn(err) }
                    this.clearInvestigation(society, characterId)
                    this.log(society, this.characterName(character, state) + ' is banished from Rome to ' + this.romanPlace('region') + ' by imperial decree.', 'rivalry', houseId)
                  })
                  this.pushModal({ societyMenu: true, title: 'Exile', message: 'The condemned is sent into exile in the provinces.', image: this.affairIcon('rivalry'), options: [{ text: 'Back', action: { event: this.event, method: 'openPerson', context: { houseId, characterId } } }] })
                },
        imperialExecute({ houseId, characterId } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  let character = state.characters && state.characters[characterId]
                  let name = character ? this.characterName(character, state) : 'the condemned'
                  if (house) {
                    house.relation = this.clamp((house.relation || 0) - 35, -100, 100)
                    house.heat = (house.heat || 0) + 6
                    house.rivalry = true
                  }
                  this.applyStats({ prestige: 2 })
                  this.clearInvestigation(society, characterId)
                  this.log(society, 'By imperial sentence for treason, ' + name + ' is put to death.', 'death', houseId)
                  this.save(society)
                  try { daapi.kill({ characterId, deathCause: ', executed for treason on the Emperor\'s order' }) } catch (err) { console.warn(err) }
                  this.pushModal({ societyMenu: true, title: 'Execution', message: name + ' is executed for treason. Their house will not forget it.', image: this.affairIcon('death'), options: [{ text: 'Back', action: { event: this.event, method: 'openHub' } }] })
                },
        imperialPardon({ houseId, characterId } = {}) {
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let character = state.characters && state.characters[characterId]
                    house.relation = this.clamp((house.relation || 0) + 16, -100, 100)
                    house.heat = Math.max(0, (house.heat || 0) - 2)
                    this.applyStats({ prestige: 4 })
                    this.clearInvestigation(society, characterId)
                    this.log(society, 'You grant imperial clemency to ' + this.characterName(character, state) + '. Their house is grateful.', 'gift', houseId)
                  })
                  this.pushModal({ societyMenu: true, title: 'Clemency', message: 'Imperial mercy wins loyalty.', image: this.affairIcon('gift'), options: [{ text: 'Back', action: { event: this.event, method: 'openPerson', context: { houseId, characterId } } }] })
                },
        imperialDemandTribute({ houseId, characterId } = {}) {
                  this.withHouse(houseId, (society, house) => {
                    let take = Math.max(20, Math.round((house.wealth || 200) * 0.1))
                    house.wealth = Math.max(0, Math.round((house.wealth || 0) - take))
                    house.relation = this.clamp((house.relation || 0) - 6, -100, 100)
                    this.applyStats({ cash: take })
                    this.log(society, 'You demand tribute from ' + house.name + ' for the imperial fisc: ' + take + ' cash.', 'coins', houseId)
                  })
                  this.pushModal({ societyMenu: true, title: 'Tribute', message: 'The house pays into the imperial treasury.', image: this.affairIcon('coins'), options: [{ text: 'Back', action: { event: this.event, method: 'openPerson', context: { houseId, characterId } } }] })
                },
        imperialFavor({ houseId, characterId } = {}) {
                  this.withHouse(houseId, (society, house) => {
                    let state = daapi.getState()
                    let character = state.characters && state.characters[characterId]
                    house.relation = this.clamp((house.relation || 0) + 18, -100, 100)
                    house.wealth = (house.wealth || 0) + 60
                    if ((society.playerPolitics.faction || []).indexOf(houseId) < 0) society.playerPolitics.faction.push(houseId)
                    this.applyStats({ influence: -20, prestige: 3 })
                    this.log(society, 'You grant ' + this.characterName(character, state) + ' imperial favour and a post; their house joins your supporters.', 'support', houseId)
                  })
                  this.pushModal({ societyMenu: true, title: 'Imperial favour', message: 'Patronage binds a house to you.', image: this.affairIcon('support'), options: [{ text: 'Back', action: { event: this.event, method: 'openPerson', context: { houseId, characterId } } }] })
                },
        debugMakeDictator() {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let rome = this.ensureRomeState(society)
                  let house = this.playerPoliticsHouse(society, state)
                  rome.government = 'dictatorship'
                  rome.dictatorHouseId = house ? house.id : ''
                  rome.dictatorCharacterId = this.currentCharacterId(state)
                  rome.dictatorTermEnd = this.futureMonthKey(6)
                  society.playerPolitics.wasDictator = true
                  society.playerPolitics.auctoritas = parseFloat(society.playerPolitics.auctoritas || 0) + 50
                  this.save(society)
                  this.log(society, '[debug] You are appointed Dictator.', 'prestige')
                  this.openPolitics()
                  return 'CoR Society: you are now Dictator.'
                },
        debugMakeEmperor() {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let rome = this.ensureRomeState(society)
                  let house = this.playerPoliticsHouse(society, state)
                  society.playerPolitics.wasDictator = true
                  rome.government = 'empire'
                  rome.rulerHouseId = house ? house.id : ''
                  rome.rulerCharacterId = this.currentCharacterId(state)
                  rome.everHadEmperor = true
                  rome.successionLaw = 'designation'
                  rome.dictatorHouseId = ''
                  rome.dictatorTermEnd = ''
                  rome.successionPressure = 0
                  this.save(society)
                  this.log(society, '[debug] You are acclaimed Imperator.', 'prestige')
                  this.openPolitics()
                  return 'CoR Society: you are now Imperator (Emperor).'
                },
        simulatePoliticsMonthly(society, state) {
                  try {
                    let rome = this.ensureRomeState(society)
                    let changed = false
                    // REAL standing advantage: supreme office pays and strengthens your house every
                    // month (the imperial fisc / emergency powers), so the rank is materially superior,
                    // not just a label. Emperor > Dictator.
                    let rank = this.playerPoliticalRank(society, state)
                    if (rank) {
                      let playerHouse = this.playerPoliticsHouse(society, state)
                      if (rank === 'emperor') {
                        this.applyStats({ cash: 90, influence: 30, prestige: 8 })
                        if (playerHouse) {
                          playerHouse.power = (playerHouse.power || 0) + 6
                          playerHouse.wealth = (playerHouse.wealth || 0) + 80
                          playerHouse.stability = this.clamp((playerHouse.stability || 50) + 3, 0, 100)
                        }
                      } else {
                        this.applyStats({ cash: 45, influence: 25, prestige: 4 })
                        if (playerHouse) {
                          playerHouse.power = (playerHouse.power || 0) + 3
                          playerHouse.wealth = (playerHouse.wealth || 0) + 40
                        }
                      }
                      changed = true
                    }
                    // Dictator term expiry: the Senate forces a lay-down if you did not seize the purple.
                    if (rome.government === 'dictatorship' && rome.dictatorTermEnd && this.monthKeyReached(rome.dictatorTermEnd, state)) {
                      rome.government = 'republic'
                      rome.dictatorHouseId = ''
                      rome.dictatorCharacterId = ''
                      rome.dictatorTermEnd = ''
                      this.log(society, 'Your dictatorship term ends; the Senate reclaims its authority and Rome returns to the Republic.', 'senator')
                      changed = true
                    }
                    // Captives: deadline release + rival rescue attempts.
                    let keptCaptives = []
                    ;(society.captives || []).forEach((captive) => {
                      if (!captive) return
                      let house = society.houses[captive.houseId]
                      if (captive.until && this.monthKeyReached(captive.until, state)) {
                        if (house) house.relation = this.clamp((house.relation || 0) + 6, -100, 100)
                        this.log(society, captive.name + ' is freed when your hold over them lapses.', 'gift', captive.houseId)
                        changed = true
                        return
                      }
                      if (house && Math.random() < this.clamp(0.05 + (house.power || 0) / 1200, 0.03, 0.25)) {
                        this.log(society, house.name + ' mounts a daring rescue and frees ' + captive.name + '.', 'rivalry', captive.houseId)
                        house.heat = (house.heat || 0) + 2
                        changed = true
                        return
                      }
                      keptCaptives.push(captive)
                    })
                    society.captives = keptCaptives
                    // NPC-vs-NPC land feud flavour (bounded).
                    if (Math.random() < 0.25) {
                      let houses = this.sortedHouses(society).filter((h) => h && !h.isPlayerHouse)
                      if (houses.length >= 2) {
                        let aggressor = houses[this.randomInt(0, Math.min(4, houses.length - 1))]
                        let victim = this.pick(houses.filter((h) => String(h.id) !== String(aggressor.id)))
                        if (aggressor && victim && (aggressor.power || 0) > (victim.power || 0)) {
                          let seized = Math.max(15, Math.round((victim.wealth || 150) * 0.08))
                          victim.wealth = Math.max(0, Math.round((victim.wealth || 0) - seized))
                          aggressor.wealth = (aggressor.wealth || 0) + Math.round(seized * 0.6)
                          victim.relation = this.clamp((victim.relation || 0), -100, 100)
                          this.log(society, aggressor.name + ' seizes ' + this.romanPlace('estate') + ' from ' + victim.name + ' in a property feud.', 'rivalry', victim.id)
                          changed = true
                        }
                      }
                    }
                    // Wars resolve.
                    let keptWars = []
                    ;(rome.wars || []).forEach((war) => {
                      if (!war) return
                      if (war.endMonth && this.monthKeyReached(war.endMonth, state)) {
                        let house = society.houses[war.houseId]
                        if (house) {
                          house.wealth = Math.max(0, Math.round((house.wealth || 0) * 0.8))
                          house.power = Math.max(0, Math.round((house.power || 0) * 0.85))
                          this.log(society, 'The war against ' + house.name + ' ends; they are weakened across their estates.', 'rivalry', war.houseId)
                        }
                        changed = true
                      } else {
                        keptWars.push(war)
                      }
                    })
                    rome.wars = keptWars
                    // Empire succession pressure from rival families.
                    if (rome.government === 'empire') {
                      let rivalPower = this.sortedHouses(society).filter((h) => h && !h.isPlayerHouse && String(h.id) !== String(rome.rulerHouseId)).slice(0, 6)
                        .reduce((sum, h) => sum + Math.max(0, (h.power || 0) - 30), 0)
                      rome.successionPressure = this.clamp(parseFloat(rome.successionPressure || 0) + 2 + rivalPower / 200, 0, 200)
                      if (rome.successionPressure >= 100) {
                        let defendedRecently = society.playerPolitics.lastDefendMonth && this.monthIndex(this.monthKey(state)) - this.monthIndex(society.playerPolitics.lastDefendMonth) < 4
                        if (!defendedRecently) {
                          rome.successionLaw = Math.random() < 0.5 ? 'wealth' : 'power'
                          rome.successionPressure = 60
                          this.log(society, 'The great houses force through a change: imperial succession will now favour the ' + (rome.successionLaw === 'wealth' ? 'wealthiest' : 'strongest') + ' house. Defend your dynasty or lose the throne.', 'familyTree')
                          changed = true
                        }
                      }
                    }
                    if (changed) {
                      this.save(society)
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                }
      })
      window.corSociety._mixinCorSocietyPoliticsVersion = '1.1.331'
    }
  }
}
