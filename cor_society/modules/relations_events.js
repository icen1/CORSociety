{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyRelationsEvents() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyRelationsEventsVersion === '1.1.331') {
        return
      }
      Object.assign(window.corSociety, {
        simulateInterHouseAffairs(society, state) {
                  if (Math.random() > 0.32) {
                    return
                  }
                  let houses = this.sortedHouses(society).filter((house) => house.memberIds && house.memberIds.length)
                  if (houses.length < 2) {
                    return
                  }
                  let first = this.pick(houses)
                  let second = this.pick(houses.filter((house) => house.id !== first.id))
                  if (!first || !second) {
                    return
                  }
                  let relation = this.getHouseRelation(society, first.id, second.id)
                  let roll = Math.random()
                  if (roll < 0.28) {
                    relation = this.changeHouseRelation(society, first.id, second.id, this.randomInt(8, 18))
                    first.stability += 2
                    second.stability += 2
                    this.log(society, first.name + ' and ' + second.name + ' arrange a useful family connection.')
                  } else if (roll < 0.56) {
                    relation = this.changeHouseRelation(society, first.id, second.id, this.randomInt(4, 12))
                    first.wealth += 20
                    second.wealth += 20
                    this.log(society, first.name + ' and ' + second.name + ' share a profitable compact.')
                  } else if (roll < 0.82 || relation < -20) {
                    relation = this.changeHouseRelation(society, first.id, second.id, -this.randomInt(8, 20))
                    first.stability -= 2
                    second.stability -= 2
                    this.log(society, first.name + ' clashes with ' + second.name + ' in public.')
                  } else {
                    first.agenda = 'revenge'
                    second.agenda = 'security'
                    this.changeHouseRelation(society, first.id, second.id, -25)
                    this.log(society, 'A private insult starts a feud between ' + first.name + ' and ' + second.name + '.')
                  }
                },
        relationKey(firstId, secondId) {
                  return [String(firstId), String(secondId)].sort().join('::')
                },
        getHouseRelation(society, firstId, secondId) {
                  let key = this.relationKey(firstId, secondId)
                  if (society.houseRelations[key] === undefined) {
                    society.houseRelations[key] = this.randomInt(-8, 8)
                  }
                  return society.houseRelations[key]
                },
        changeHouseRelation(society, firstId, secondId, delta) {
                  let key = this.relationKey(firstId, secondId)
                  let value = this.getHouseRelation(society, firstId, secondId)
                  value = this.clamp(value + delta, -100, 100)
                  society.houseRelations[key] = value
                  return value
                },
        personalRelationRecord(society, firstId, secondId, create) {
                  society.personalRelations = society.personalRelations || {}
                  let key = this.relationKey(firstId, secondId)
                  if (!society.personalRelations[key] && create !== false) {
                    let month = this.monthKey(daapi.getState())
                    society.personalRelations[key] = {
                      firstId,
                      secondId,
                      score: 0,
                      type: 'neutral',
                      started: month,
                      updated: month
                    }
                  }
                  return society.personalRelations[key] || false
                },
        personalRelationScore(society, state, firstId, secondId) {
                  let record = this.personalRelationRecord(society, firstId, secondId, false)
                  let score = record ? parseFloat(record.score || 0) : 0
                  let first = state && state.characters ? state.characters[firstId] : false
                  let second = state && state.characters ? state.characters[secondId] : false
                  score += this.traitRelationshipModifier(society, first, second, state)
                  score += this.traitRelationshipModifier(society, second, first, state)
                  return this.clamp(Math.round(score), -100, 100)
                },
        changePersonalRelation(society, firstId, secondId, delta, type) {
                  if (!firstId || !secondId || this.sameCharacterId(firstId, secondId)) {
                    return 0
                  }
                  let record = this.personalRelationRecord(society, firstId, secondId, true)
                  record.score = this.clamp((record.score || 0) + delta, -100, 100)
                  record.type = type || this.relationshipTypeFromScore(record.score)
                  record.updated = this.monthKey(daapi.getState())
                  return record.score
                },
        relationshipTypeFromScore(score) {
                  score = parseFloat(score || 0)
                  if (score >= 85) return 'bestFriend'
                  if (score >= 55) return 'friend'
                  if (score >= 30) return 'admirer'
                  if (score <= -80) return 'enemy'
                  if (score <= -55) return 'rival'
                  if (score <= -30) return 'resentful'
                  return 'neutral'
                },
        relationshipLabel(type) {
                  let labels = {
                    bestFriend: 'Best friend',
                    friend: 'Friend',
                    mentor: 'Mentor',
                    student: 'Student',
                    protector: 'Protector',
                    admirer: 'Admirer',
                    lover: 'Lover',
                    rival: 'Rival',
                    enemy: 'Enemy',
                    traitor: 'Traitor',
                    resentful: 'Resentful',
                    humiliated: 'Humiliated',
                    neutral: 'Neutral'
                  }
                  return labels[type] || 'Neutral'
                },
        relationBadge(society, state, character) {
                  let visual = this.relationVisual(society, state, character)
                  return visual ? visual.text + ' ' + visual.label : ''
                },
        relationVisual(society, state, character, options) {
                  if (!character || !character.id) {
                    return false
                  }
                  state = state || daapi.getState()
                  society = society || this.load()
                  let currentId = this.currentCharacterId(state)
                  if (!currentId || this.sameCharacterId(currentId, character.id)) {
                    return false
                  }
                  let record = this.personalRelationRecord(society, currentId, character.id, false)
                  let useLastKnown = options && options.lastKnownForDead && character.isDead
                  let score = useLastKnown && record ? this.clamp(Math.round(record.score || 0), -100, 100) : this.personalRelationScore(society, state, currentId, character.id)
                  let type = record && record.type ? record.type : this.relationshipTypeFromScore(score)
                  let label = this.relationshipLabel(type)
                  return {
                    score,
                    type,
                    label,
                    text: this.signed(score),
                    tone: this.scoreTone(score),
                    icon: this.relationIcon(score, type),
                    tooltip: (character.isDead ? 'Last known relation' : 'Relation') + ': ' + this.signed(score) + ' - ' + label
                  }
                },
        syncFamilyRelationStatuses(society, state) {
                  if (!society || !state || !state.characters) {
                    return
                  }
                  let currentId = this.currentCharacterId(state)
                  let active = {}
                  let previous = society.relationStatusCharacterIds || []
                  this._relationStatusHashCache = this._relationStatusHashCache || {}
                  this.familyRelationCandidateIds(state).forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character || this.sameCharacterId(characterId, currentId)) {
                      return
                    }
                    character.id = character.id || characterId
                    let record = this.personalRelationRecord(society, currentId, characterId, false)
                    let visual = this.relationVisual(society, state, character, { lastKnownForDead: true })
                    if (!visual) {
                      return
                    }
                    let meaningful = !!record || Math.abs(visual.score || 0) >= 15 || ['friend', 'bestFriend', 'mentor', 'student', 'protector', 'admirer', 'lover', 'rival', 'enemy', 'traitor', 'resentful', 'humiliated'].indexOf(visual.type) >= 0
                    if (!meaningful) {
                      return
                    }
                    active[characterId] = true
                    let hash = visual.tooltip + '::' + visual.icon
                    if (this._relationStatusHashCache[characterId] === hash) {
                      return
                    }
                    try {
                      daapi.addCharacterStatus({
                        characterId,
                        key: 'cor_society_relation',
                        status: {
                          title: visual.tooltip,
                          icon: visual.icon,
                          active: true
                        }
                      })
                      this._relationStatusHashCache[characterId] = hash
                    } catch (err) {
                      console.warn(err)
                    }
                  })
                  previous.forEach((characterId) => {
                    if (!active[characterId]) {
                      delete this._relationStatusHashCache[characterId]
                    }
                  })
                  this.clearStaleSocietyStatuses(state, 'cor_society_relation', active)
                  society.relationStatusCharacterIds = Object.keys(active)
                },
        syncSlaveStatuses(society, state) {
                  if (!society || !state || !state.characters) {
                    return
                  }
                  let active = {}
                  this._slaveStatusHashCache = this._slaveStatusHashCache || {}
                  this.sortedHouses(society).forEach((house) => {
                    this.visibleHousePeople(house, state).forEach((characterId) => {
                      let character = state.characters[characterId]
                      if (!character || character.isDead) return
                      if (!this.isSlaveCharacter(character, house)) return
                      active[characterId] = true
                      let title = this.slaveStatusTitle(character, null, state)
                      let icon = this.slaveStatusIcon(character.corSocietySlaveOrigin || 'unknown')
                      let hash = title + '::' + icon
                      if (this._slaveStatusHashCache[characterId] === hash) {
                         return
                      }
                      try {
                        daapi.addCharacterStatus({
                          characterId,
                          key: 'cor_society_slave_status',
                          status: {
                            title: title,
                            icon: icon,
                            active: true
                          }
                        })
                        this._slaveStatusHashCache[characterId] = hash
                      } catch (err) {
                        console.warn(err)
                      }
                    })
                  })
                  ;(society.playerSlaves || []).forEach((record) => {
                    if (!record || !record.characterId || active[record.characterId]) return
                    let character = state.characters[record.characterId]
                    if (!character || character.isDead) return
                    active[record.characterId] = true
                    let title = this.slaveStatusTitle(character, record, state)
                    let icon = this.slaveStatusIcon(record.origin || character.corSocietySlaveOrigin || 'unknown')
                    let hash = title + '::' + icon
                    if (this._slaveStatusHashCache[record.characterId] === hash) {
                       return
                    }
                    try {
                      daapi.addCharacterStatus({
                        characterId: record.characterId,
                        key: 'cor_society_slave_status',
                        status: {
                          title: title,
                          icon: icon,
                          active: true
                        }
                      })
                      this._slaveStatusHashCache[record.characterId] = hash
                    } catch (err) {
                      console.warn(err)
                    }
                  })
                  ;(society.slaveStatusCharacterIds || []).forEach((characterId) => {
                    if (!active[characterId]) {
                      delete this._slaveStatusHashCache[characterId]
                    }
                  })
                  this.clearStaleSocietyStatuses(state, 'cor_society_slave_status', active)
                  society.slaveStatusCharacterIds = Object.keys(active)
                },
        slaveStatusTitle(character, record, state) {
                  let origin = (record && record.origin) || (character && character.corSocietySlaveOrigin) || 'unknown'
                  let originText = this.slaveOriginDescription(origin)
                  if (character && (character.corSocietyOrigin === 'private_company_bastard' || (character.corSocietyBastard && (character.corSocietySlave || character.corSocietySlaveActive)))) {
                    let notes = []
                    if (character.corSocietyTrueFatherId && character.fatherId && !this.sameCharacterId(character.corSocietyTrueFatherId, character.fatherId)) {
                      notes.push('different true father')
                    }
                    if (character.corSocietyTrueMotherId && character.motherId && !this.sameCharacterId(character.corSocietyTrueMotherId, character.motherId)) {
                      notes.push('different true mother')
                    }
                    return 'Slave-born bastard: ' + originText + (notes.length ? '; ' + notes.join(', ') : '; parentage recorded by Society') + '.'
                  }
                  return ((record && record.characterId) ? 'Household slave: ' : 'Society slave: ') + originText
                },
        slaveStatusIcon(origin) {
                  this._slaveIconCache = this._slaveIconCache || {}
                  let short = String(origin || 'SL').slice(0, 2).toUpperCase()
                  if (this._slaveIconCache[short]) return this._slaveIconCache[short]
                  let uri = this.svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">' +
                    '<rect x="8" y="8" width="56" height="56" rx="14" fill="#242424" stroke="#b8b8b8" stroke-width="4"/>' +
                    '<path d="M18 29 C24 20 34 20 40 29 M32 29 C38 20 48 20 54 29" fill="none" stroke="#d5d5d5" stroke-width="6" stroke-linecap="round"/>' +
                    '<path d="M18 43 H54" stroke="#d5d5d5" stroke-width="6" stroke-linecap="round"/>' +
                    '<circle cx="18" cy="29" r="5" fill="#777"/><circle cx="40" cy="29" r="5" fill="#777"/><circle cx="32" cy="29" r="5" fill="#777"/><circle cx="54" cy="29" r="5" fill="#777"/>' +
                    '<text x="36" y="58" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#fff">' + this.escapeSvg(short) + '</text>' +
                    '</svg>')
                  this._slaveIconCache[short] = uri
                  return uri
                },
        relationIcon(score, type) {
                  score = parseFloat(score || 0)
                  type = type || this.relationshipTypeFromScore(score)
                  let tone = this.scoreTone(score)
                  let key = tone + '::' + type + '::' + score
                  this._relationIconCache = this._relationIconCache || {}
                  if (this._relationIconCache[key]) return this._relationIconCache[key]
                  let colors = {
                    good: ['#2f855a', '#9ae6b4'],
                    calm: ['#2b6cb0', '#90cdf4'],
                    neutral: ['#4a5568', '#cbd5e0'],
                    warn: ['#b7791f', '#fbd38d'],
                    bad: ['#9b2c2c', '#feb2b2']
                  }
                  let pair = colors[tone] || colors.neutral
                  let glyph = '<path d="M20 38 C20 28 29 24 36 31 C43 24 52 28 52 38 C52 49 36 56 36 56 C36 56 20 49 20 38 Z" fill="' + pair[1] + '"/>'
                  if (score <= -30 || type === 'enemy' || type === 'rival' || type === 'traitor') {
                    glyph = '<path d="M22 17 L43 32 L31 32 L45 49 L20 31 L33 31 Z" fill="' + pair[1] + '"/>'
                  } else if (score < 15 && score > -15) {
                    glyph = '<path d="M20 35 H52" stroke="' + pair[1] + '" stroke-width="8" stroke-linecap="round"/>'
                  } else if (type === 'mentor' || type === 'student' || type === 'protector') {
                    glyph = '<path d="M18 45 C25 31 47 31 54 45" fill="none" stroke="' + pair[1] + '" stroke-width="7" stroke-linecap="round"/><circle cx="36" cy="26" r="8" fill="' + pair[1] + '"/>'
                  }
                  let scoreText = this.escapeSvg(this.signed(score))
                  let uri = this.svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><circle cx="36" cy="36" r="33" fill="' + pair[0] + '"/><circle cx="36" cy="36" r="29" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3"/><g transform="translate(0 -4)">' + glyph + '</g><rect x="16" y="52" width="40" height="15" rx="7.5" fill="rgba(0,0,0,.48)"/><text x="36" y="63.5" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="800" fill="#fff">' + scoreText + '</text></svg>')
                  this._relationIconCache[key] = uri
                  return uri
                },
        relationBadgeHtml(visual) {
                  if (!visual) {
                    return ''
                  }
                  return '<span class="cor-society-relation-badge cor-society-tone-' + this.escapeHtml(visual.tone) + '" title="' + this.escapeHtml(visual.tooltip) + '">' +
                    this.summaryIcon(visual.icon, 'Relation') +
                    '<strong>' + this.escapeHtml(visual.text) + '</strong>' +
                    '<span>' + this.escapeHtml(visual.label) + '</span>' +
                    '</span>'
                },
        traitRelationshipModifier(society, source, target, state) {
                  if (!source || !target) {
                    return 0
                  }
                  let sourceTraits = this.societyTraitsForCharacter(society, source.id)
                  let targetTraits = this.societyTraitsForCharacter(society, target.id)
                  let modifier = 0
                  let spouse = source.spouseId && this.sameCharacterId(source.spouseId, target.id)
                  if (sourceTraits.indexOf('adulterer') >= 0 && spouse) modifier -= 28
                  if (sourceTraits.indexOf('faithful') >= 0 && spouse) modifier += 12
                  if (sourceTraits.indexOf('liar') >= 0 && this.characterHasTrait(society, target, 'honorable')) modifier -= 10
                  if (sourceTraits.indexOf('manipulator') >= 0 && this.characterHasTrait(society, target, 'trusting')) modifier -= 6
                  if (sourceTraits.indexOf('charitable') >= 0) modifier += 4
                  if (sourceTraits.indexOf('cruel') >= 0) modifier -= 8
                  if (sourceTraits.indexOf('gossip') >= 0 && spouse) modifier -= 6
                  if (sourceTraits.indexOf('ambitious') >= 0 && targetTraits.indexOf('ambitious') >= 0) modifier += 3
                  return modifier
                },
        societyTraitIconList(society, character) {
                  return this.societyTraitsForCharacter(society, character && character.id)
                    .slice(0, 4)
                    .map((trait) => this.traitIcon(trait))
                },
        driftRelations(society) {
                  let validHouses = this.idSet(Object.keys(society.houses || {}))
                  Object.keys(society.houseRelations || {}).forEach((key) => {
                    let parts = String(key || '').split('::')
                    if (parts.length !== 2 || !validHouses[parts[0]] || !validHouses[parts[1]]) {
                      delete society.houseRelations[key]
                    }
                  })
                  for (let houseId in society.houses) {
                    if (!society.houses.hasOwnProperty(houseId)) {
                      continue
                    }
                    let house = society.houses[houseId]
                    if (house.relation > 4) {
                      house.relation -= 1
                    } else if (house.relation < -4) {
                      house.relation += 1
                    }
                    house.heat = Math.max(0, (house.heat || 0) - 1)
                    if (house.favor > 0 && Math.random() < 0.06) {
                      house.favor -= 1
                    }
                  }
                },
        applyNetworkModifiers(society) {
                  let allyIncome = 0
                  let allyCount = 0
                  for (let houseId in society.houses) {
                    if (!society.houses.hasOwnProperty(houseId)) {
                      continue
                    }
                    let house = society.houses[houseId]
                    let profile = this.strata[house.stratum] || this.strata.plebeian
                    if ((house.relation || 0) >= 55 || (house.favor || 0) >= 2) {
                      allyCount += 1
                      allyIncome += Math.max(1, Math.round((profile.revenue || 20) * ((house.relation || 50) / 100)))
                    }
                  }
                  if (allyIncome > 0) {
                    let cap = Math.max(35, Math.round(80 + Math.min(220, allyCount * 18)))
                    allyIncome = Math.min(allyIncome, cap)
                  }
                  try {
                    daapi.removeAdditiveModifier({ key: 'revenue', id: 'cor_society_network_income' })
                    daapi.removeAdditiveModifier({ key: 'revenue', id: 'cor_society_rival_pressure' })
                  } catch (err) {
                    console.warn(err)
                  }
                  if (allyIncome > 0) {
                    daapi.addAdditiveModifier({
                      key: 'revenue',
                      id: 'cor_society_network_income',
                      durationInMonths: 2,
                      amount: allyIncome
                    })
                  }
                },
        resolvePendingVentures(society, state) {
                  society.pendingVentures = society.pendingVentures || []
                  let due = society.pendingVentures.find((venture) => {
                    return venture && !venture.notified && this.monthKeyReached(venture.due, state)
                  })
                  if (!due) {
                    return
                  }
                  due.notified = true
                  let house = society.houses[due.houseId] || {}
                  let success = due.roll >= 0.28
                  let payout = success ? Math.max(1, Math.round(due.expected * (0.75 + due.roll))) : 0
                  due.payout = payout
                  due.success = success
                  this.save(society)
                  this.pushModal({
                    corTranslatorPretranslateNow: true,
                    title: success ? 'Venture returns' : 'Venture fails',
                    message: 'House: ' + (house.name || 'Unknown house') + '\nThe trade venture has reached its settlement month.\nResult: ' + (success ? 'your share is ready to collect.' : 'the opening failed and produced no profit.'),
                    image: this.affairIcon('tradeVenture'),
                    options: [
                      {
                        variant: success ? 'info' : 'warning',
                        text: success ? 'Collect your share' : 'Accept the loss',
                        statChanges: success ? { cash: payout } : {},
                        action: {
                          event: this.event,
                          method: 'collectVentureResult',
                          context: { ventureId: due.id }
                        }
                      }
                    ]
                  })
                },
        queueFamilyCareEvent(society, state) {
                  if (!society || !state || !state.characters) {
                    return false
                  }
                  if (society.lastFamilyCareEventMonth && this.monthIndex(this.monthKey(state)) - this.monthIndex(society.lastFamilyCareEventMonth) < 4) {
                    return false
                  }
                  let candidates = this.playerFamilyMembers(state).filter((character) => {
                    return character && !character.isDead && this.distressTrait(character)
                  })
                  if (!candidates.length || Math.random() > 0.45) {
                    return false
                  }
                  let character = this.pick(candidates)
                  character.id = character.id || this.playerFamilyMemberIds(state).find((id) => state.characters[id] === character) || character.id
                  let trait = this.distressTrait(character)
                  let cost = this.familyCareCost(state, trait)
                  society.lastFamilyCareEventMonth = this.monthKey(state)
                  this.pushModal({
                    corTranslatorPretranslateNow: true,
                    title: 'Family needs care',
                    message: this.characterName(character, state) + ' is suffering from ' + this.distressTraitLabel(trait) + '. Your household can respond.',
                    image: this.traitStatusIcon(trait),
                    options: [
                      {
                        variant: 'info',
                        text: 'Arrange treatment',
                        tooltip: 'Spend cash for the best chance to remove the condition and improve family rapport.',
                        statChanges: { cash: -cost },
                        icons: [this.traitStatusIcon(trait), this.affairIcon('coins')],
                        action: {
                          event: this.event,
                          method: 'treatFamilyMember',
                          context: { characterId: character.id, trait, cost }
                        }
                      },
                      {
                        text: 'Let them rest',
                        tooltip: 'No cash cost. Moderate chance to improve stress or depression; less effective for illness.',
                        icons: [this.affairIcon('support')],
                        action: {
                          event: this.event,
                          method: 'comfortFamilyMember',
                          context: { characterId: character.id, trait }
                        }
                      },
                      {
                        variant: 'warning',
                        text: 'Ignore it',
                        tooltip: 'No immediate cost, but relation may worsen and prestige can suffer.',
                        icons: [this.affairIcon('rivalry')],
                        action: {
                          event: this.event,
                          method: 'ignoreFamilyDistress',
                          context: { characterId: character.id, trait }
                        }
                      }
                    ]
                  })
                  return true
                },
        distressTrait(character) {
                  let traits = (character && character.traits) || []
                  let order = ['illness', 'sick', 'ill', 'wounded', 'depressed', 'highlyStress', 'stress']
                  for (let i = 0; i < order.length; i++) {
                    if (traits.indexOf(order[i]) >= 0) {
                      return order[i]
                    }
                  }
                  return ''
                },
        distressTraitLabel(trait) {
                  let labels = {
                    illness: 'illness',
                    sick: 'sickness',
                    ill: 'illness',
                    wounded: 'wounds',
                    depressed: 'depression',
                    highlyStress: 'severe stress',
                    stress: 'stress'
                  }
                  return labels[trait] || String(trait || 'trouble')
                },
        traitStatusIcon(trait) {
                  try {
                    if (trait === 'illness' || trait === 'sick' || trait === 'ill') return daapi.requireImage('icons/traits/illness.svg')
                    if (trait === 'wounded') return daapi.requireImage('icons/traits/illness.svg')
                    if (trait === 'depressed' || trait === 'stress' || trait === 'highlyStress') return daapi.requireImage('icons/traits/stress.svg')
                    return daapi.requireImage('icons/traits/' + trait + '.svg')
                  } catch (err) {
                    return this.affairIcon('support')
                  }
                },
        familyCareCost(state, trait) {
                  let cash = Math.max(0, parseFloat((state.current && state.current.cash) || 0))
                  let factor = trait === 'illness' || trait === 'sick' || trait === 'ill' || trait === 'wounded' ? 0.18 : 0.08
                  return Math.max(2, Math.min(Math.max(2, Math.round(cash * factor)), trait === 'illness' ? 90 : 45))
                },
        treatFamilyMember({ characterId, trait, cost }) {
                  let state = daapi.getState()
                  let character = state.characters && state.characters[characterId]
                  if (!character) {
                    this.openHub()
                    return
                  }
                  let success = Math.random() < (trait === 'illness' || trait === 'sick' || trait === 'ill' || trait === 'wounded' ? 0.62 : 0.78)
                  this.applyStats({ cash: -parseInt(cost || this.familyCareCost(state, trait), 10), prestige: success ? 3 : 0 })
                  if (success) {
                    this.removeCharacterTrait(characterId, trait)
                  }
                  let society = this.loadForAction()
                  this.changePersonalRelation(society, this.currentCharacterId(state), characterId, success ? 12 : 4, success ? 'protector' : 'neutral')
                  this.save(society)
                  this.pushModal({
                    title: success ? 'Care succeeds' : 'Care helps a little',
                    message: success ? this.characterName(character, state) + ' recovers from ' + this.distressTraitLabel(trait) + '.' : this.characterName(character, state) + ' is not fully recovered, but the household notices your care.',
                    image: this.traitStatusIcon(trait),
                    options: [{ text: 'Good' }]
                  })
                },
        comfortFamilyMember({ characterId, trait }) {
                  let state = daapi.getState()
                  let character = state.characters && state.characters[characterId]
                  if (!character) {
                    this.openHub()
                    return
                  }
                  let success = Math.random() < (trait === 'stress' || trait === 'highlyStress' || trait === 'depressed' ? 0.55 : 0.22)
                  if (success) {
                    this.removeCharacterTrait(characterId, trait)
                  }
                  let society = this.loadForAction()
                  this.changePersonalRelation(society, this.currentCharacterId(state), characterId, success ? 10 : 5, 'protector')
                  this.save(society)
                  this.pushModal({
                    title: success ? 'Rest restores them' : 'Rest is not enough',
                    message: success ? this.characterName(character, state) + ' improves after rest and family attention.' : this.characterName(character, state) + ' appreciates the attention, but the problem remains.',
                    image: this.traitStatusIcon(trait),
                    options: [{ text: 'Continue' }]
                  })
                },
        ignoreFamilyDistress({ characterId, trait }) {
                  let state = daapi.getState()
                  let character = state.characters && state.characters[characterId]
                  let society = this.loadForAction()
                  this.applyStats({ prestige: -2 })
                  this.changePersonalRelation(society, this.currentCharacterId(state), characterId, -8, 'resentful')
                  this.save(society)
                  this.pushModal({
                    title: 'Problem ignored',
                    message: (character ? this.characterName(character, state) : 'A relative') + ' receives no help. Family feeling worsens.',
                    image: this.affairIcon('rivalry'),
                    options: [{ text: 'So be it' }]
                  })
                },
        removeCharacterTrait(characterId, trait) {
                  let state = daapi.getState()
                  let character = state.characters && state.characters[characterId]
                  if (!character || !trait) {
                    return false
                  }
                  let traits = (character.traits || []).filter((item) => item !== trait)
                  try {
                    daapi.updateCharacter({ characterId, character: { traits } })
                    character.traits = traits
                    daapi.forceUpdateCharacterDisplay({ characterId })
                    return true
                  } catch (err) {
                    console.warn(err)
                    return false
                  }
                },
        queueMonthlyEvent(society, state) {
                  let allHouses = this.sortedHouses(society)
                  let houses = allHouses.filter((house) => house.memberIds && house.memberIds.length)
                  if (!houses.length) {
                    return
                  }
                  let pending = houses.filter((house) => house.pendingPlayerEvent)
                  if (pending.length) {
                    this.eventFamilyAffair(society, this.pick(pending), { silent: true })
                    return
                  }
                  let hostile = houses.filter((house) => house.rivalry || house.relation <= -45)
                  let friendly = houses.filter((house) => house.relation >= 35)
                  let lower = houses.filter((house) => ['plebeian', 'freedmen', 'poor'].indexOf(house.stratum) >= 0)
                  let currentMonthIndex = this.monthIndex(this.monthKey(state))
                  let recently = (key, gap) => society[key] && currentMonthIndex - this.monthIndex(society[key]) < gap
                  let tradeReviews = recently('lastTradeReviewMonth', 5) ? [] : houses.filter((house) => this.houseTradeActive(house, state) && (house.relation || 0) >= -15)
                  let patronageReviews = recently('lastPatronageAuditMonth', 5) ? [] : houses.filter((house) => this.housePatronageActive(house, state))
                  let tutorshipChild = recently('lastTutorshipEventMonth', 8) ? false : this.playerTutorshipCandidate(state)
                  let tutorshipHouses = tutorshipChild ? friendly.filter((house) => house.stratum !== 'poor' && (house.relation || 0) >= 40) : []
                  
                  let capturable = []
                  let roll = Math.random()
                  if (roll >= 0.72 && roll < 0.84) {
                     capturable = this.knownEnslavedCandidates(society, state, null, { houses: allHouses }).filter((item) => item.house && item.house.stratum === 'poor' && item.info.visible)
                  }
        
                  if (tradeReviews.length && roll < 0.16) {
                    this.eventTradeCompactReview(society, this.pick(tradeReviews), { silent: true })
                  } else if (patronageReviews.length && roll < 0.28) {
                    this.eventPatronageAudit(society, this.pick(patronageReviews), { silent: true })
                  } else if (tutorshipChild && tutorshipHouses.length && roll < 0.40) {
                    this.eventTutorshipExchange(society, this.pick(tutorshipHouses), tutorshipChild, { silent: true })
                  } else if (hostile.length && roll < 0.55) {
                    this.eventRivalSlander(society, this.pick(hostile), { silent: true })
                  } else if (friendly.length && roll < 0.72) {
                    this.eventFriendlyOpening(society, this.pick(friendly), { silent: true })
                  } else if (capturable.length && roll < 0.84) {
                    this.eventSlaveCaptureOpportunity(society, this.pick(capturable), { silent: true })
                  } else if (lower.length) {
                    this.eventPetition(society, this.pick(lower), { silent: true })
                  } else {
                    this.eventFamilyInvitation(society, this.pick(houses), { silent: true })
                  }
                },
        housePatronageActive(house, state) {
                  return !!(house && house.patronageUntil && !this.monthKeyReached(house.patronageUntil, state || daapi.getState()))
                },
        playerTutorshipCandidate(state) {
                  state = state || daapi.getState()
                  let children = this.playerFamilyMembers(state).filter((character) => {
                    let age = this.age(character, state)
                    return character && !character.isDead && age >= 5 && age < 13
                  })
                  return children.length ? this.pick(children) : false
                },
        eventTradeCompactReview(society, house, options) {
                  if (!house) {
                    return false
                  }
                  let state = daapi.getState()
                  if (!options || !options.silent) this.save(society)
                  society.lastTradeReviewMonth = this.monthKey(state)
                  this.save(society)
                  let cost = Math.max(4, this.actionCost(house, 'gift'))
                  let influenceCost = Math.max(12, Math.round((this.strata[house.stratum] || this.strata.plebeian).support * 0.2))
                  let amount = Math.max(2, Math.round(Math.max(6, house.tradeAmount || 8) * 0.35))
                  this.pushModal({
                    corTranslatorPretranslateNow: true,
                    disableSocietyClose: true,
                    title: 'Trade compact review',
                    message: house.name + ' asks to review safeguards around your active trade compact. A little attention can keep the income steady; pressure can squeeze more value but risks trust.',
                    image: this.affairIcon('tradeVenture'),
                    options: [
                      {
                        variant: 'info',
                        text: 'Fund safeguards (' + cost + ')',
                        tooltip: 'Pay for contracts and escorts. Consequences: steadier relation and a short revenue guard bonus.',
                        statChanges: { cash: -cost, prestige: 3 },
                        icons: [this.affairIcon('coins'), this.affairIcon('trade')],
                        action: { event: this.event, method: 'fundTradeSafeguards', context: { houseId: house.id, cost, amount } }
                      },
                      {
                        text: 'Press better terms',
                        tooltip: 'Spend influence to push for better terms. Consequences: success improves trade income; failure strains relations.',
                        statChanges: { influence: -influenceCost },
                        icons: [this.affairIcon('influence'), this.affairIcon('tradeVenture')],
                        action: { event: this.event, method: 'pressTradeTerms', context: { houseId: house.id, cost: influenceCost, amount } }
                      },
                      {
                        text: 'Let it stand',
                        tooltip: 'No change. Consequences: the existing trade compact continues as written.',
                        action: { event: this.event, method: 'letStandTradeReview', context: { houseId: house.id } }
                      }
                    ]
                  })
                  return true
                },
        eventPatronageAudit(society, house, options) {
                  if (!house) {
                    return false
                  }
                  let state = daapi.getState()
                  if (!options || !options.silent) this.save(society)
                  society.lastPatronageAuditMonth = this.monthKey(state)
                  this.save(society)
                  let cost = Math.max(5, Math.round(this.actionCost(house, 'gift') * 0.7))
                  let influenceCost = Math.max(10, Math.round((this.strata[house.stratum] || this.strata.plebeian).support * 0.16))
                  this.pushModal({
                    corTranslatorPretranslateNow: true,
                    disableSocietyClose: true,
                    title: 'Patronage accounts',
                    message: house.name + ' sends accounts from your patronage tie. Shortages can be covered, audited, or the relationship can be ended before it becomes a burden.',
                    image: this.affairIcon('patronage'),
                    options: [
                      {
                        variant: 'info',
                        text: 'Cover shortages (' + cost + ')',
                        tooltip: 'Spend cash to protect the relationship. Consequences: prestige and better relation.',
                        statChanges: { cash: -cost, prestige: 3 },
                        icons: [this.affairIcon('coins'), this.affairIcon('prestige')],
                        action: { event: this.event, method: 'coverPatronageShortage', context: { houseId: house.id, cost } }
                      },
                      {
                        text: 'Audit accounts',
                        tooltip: 'Spend influence to demand order. Consequences: may improve stability, but can offend the house.',
                        statChanges: { influence: -influenceCost },
                        icons: [this.affairIcon('influence'), this.affairIcon('log')],
                        action: { event: this.event, method: 'auditPatronageAccounts', context: { houseId: house.id, cost: influenceCost } }
                      },
                      {
                        variant: 'warning',
                        text: 'End patronage',
                        tooltip: 'Cancel the patronage modifier early. Consequences: loses prestige and relation, but stops the tie.',
                        statChanges: { prestige: -3 },
                        icons: [this.affairIcon('rivalry')],
                        action: { event: this.event, method: 'endPatronage', context: { houseId: house.id } }
                      }
                    ]
                  })
                  return true
                },
        eventTutorshipExchange(society, house, child, options) {
                  if (!house || !child) {
                    return false
                  }
                  let state = daapi.getState()
                  child.id = child.id || this.playerFamilyMemberIds(state).find((id) => state.characters[id] === child) || child.id
                  if (!child.id) {
                    return false
                  }
                  if (!options || !options.silent) this.save(society)
                  society.lastTutorshipEventMonth = this.monthKey(state)
                  this.save(society)
                  let cost = Math.max(6, Math.round(this.actionCost(house, 'gift') * 0.6))
                  let influenceCost = Math.max(8, Math.round((this.strata[house.stratum] || this.strata.plebeian).support * 0.13))
                  let skill = house.stratum === 'senatorial' ? 'eloquence' : house.stratum === 'equestrian' ? 'stewardship' : house.stratum === 'poor' ? 'combat' : this.pick(['intelligence', 'stewardship', 'eloquence'])
                  this.pushModal({
                    corTranslatorPretranslateNow: true,
                    disableSocietyClose: true,
                    title: 'Household tutorship',
                    message: house.name + ' offers contacts who can help educate ' + this.characterName(child, state) + '. This uses the child\'s real vanilla skills and keeps the Society tie meaningful.',
                    image: this.characterPortrait(child, state),
                    options: [
                      {
                        variant: 'info',
                        text: 'Sponsor lessons (' + cost + ')',
                        tooltip: 'Pay for lessons. Consequences: small skill gain, prestige, and better house relation.',
                        statChanges: { cash: -cost, prestige: 2 },
                        icons: [this.affairIcon('coins'), this.affairIcon('prestige')],
                        action: { event: this.event, method: 'sponsorTutorship', context: { houseId: house.id, characterId: child.id, skill, cost } }
                      },
                      {
                        text: 'Ask as a favor',
                        tooltip: 'Spend influence to call on the relationship. Consequences: smaller skill gain and a social tie.',
                        statChanges: { influence: -influenceCost },
                        icons: [this.affairIcon('influence'), this.affairIcon('support')],
                        action: { event: this.event, method: 'requestTutorshipFavor', context: { houseId: house.id, characterId: child.id, skill, cost: influenceCost } }
                      },
                      {
                        text: 'Decline',
                        tooltip: 'No change. Consequences: the offer passes.',
                        action: { event: this.event, method: 'declineTutorshipExchange', context: { houseId: house.id, characterId: child.id } }
                      }
                    ]
                  })
                  return true
                },
        eventFamilyAffair(society, house, options) {
                  let event = house.pendingPlayerEvent
                  let state = daapi.getState()
                  let image = this.affairIcon(event)
                  if (!options || !options.silent) this.save(society)
                  this.refreshHouseMemberLists(society, state, house)
                  if (event === 'officeCampaign') {
                    this.pushModal({
                      corTranslatorPretranslateNow: true,
                      disableSocietyClose: true,
                      title: 'House seeks office',
                      message: 'House: ' + house.name + '\nThis house is gathering support for a magistracy. They ask whether your household will be seen beside them.',
                      image: image,
                      options: [
                        {
                          variant: 'info',
                          text: 'Endorse them',
                          statChanges: { influence: -45, prestige: 10 },
                          action: {
                            event: this.event,
                            method: 'endorseOffice',
                            context: { houseId: house.id }
                          }
                        },
                        {
                          text: 'Stay out of it',
                          action: {
                            event: this.event,
                            method: 'declineFamilyAffair',
                            context: { houseId: house.id }
                          }
                        }
                      ]
                    })
                  } else if (event === 'marriageAlliance') {
                    let weddingCost = this.actionCost(house, 'wedding')
                    this.pushModal({
                      corTranslatorPretranslateNow: true,
                      disableSocietyClose: true,
                      title: 'Wedding politics',
                      message: 'House: ' + house.name + '\nThis house invites your household to honor a marriage alliance. A gift would be noticed; absence would be noticed too.',
                      image: image,
                      options: [
                        {
                          text: 'Send a wedding gift',
                          statChanges: { cash: -weddingCost, prestige: 5 },
                          action: {
                            event: this.event,
                            method: 'honorWedding',
                            context: { houseId: house.id }
                          }
                        },
                        {
                          text: 'Offer only words',
                          action: {
                            event: this.event,
                            method: 'declineFamilyAffair',
                            context: { houseId: house.id }
                          }
                        }
                      ]
                    })
                  } else if (event === 'inheritanceDispute') {
                    this.pushModal({
                      corTranslatorPretranslateNow: true,
                      disableSocietyClose: true,
                      title: 'Inheritance dispute',
                      message: 'House: ' + house.name + '\nA dispute inside this house has become public. They ask you to lend judgment and pressure.',
                      image: image,
                      options: [
                        {
                          variant: 'warning',
                          text: 'Intervene',
                          statChanges: { influence: -30 },
                          action: {
                            event: this.event,
                            method: 'judgeInheritance',
                            context: { houseId: house.id }
                          }
                        },
                        {
                          text: 'Let them quarrel',
                          action: {
                            event: this.event,
                            method: 'declineFamilyAffair',
                            context: { houseId: house.id }
                          }
                        }
                      ]
                    })
                  } else if (event === 'tradeVenture') {
                    let offer = this.ventureOffer(house)
                    this.pushModal({
                      corTranslatorPretranslateNow: true,
                      disableSocietyClose: true,
                      title: 'Trade venture',
                      message: 'House: ' + house.name + '\nThis house has found a profitable opening and offers you a place in the venture.\nCost: ' + offer.cost + ' cash.\nExpected result: about ' + offer.expected + ' cash in ' + offer.months + ' months if the venture succeeds.',
                      image: image,
                      options: [
                        {
                          variant: 'info',
                          text: 'Invest with them',
                          statChanges: { cash: -offer.cost },
                          action: {
                            event: this.event,
                            method: 'investVenture',
                            context: { houseId: house.id, cost: offer.cost, expected: offer.expected, months: offer.months }
                          }
                        },
                        {
                          text: 'Decline',
                          action: {
                            event: this.event,
                            method: 'declineFamilyAffair',
                            context: { houseId: house.id, kind: 'tradeVenture' }
                          }
                        }
                      ]
                    })
                  } else if (event === 'scandal') {
                    this.pushModal({
                      corTranslatorPretranslateNow: true,
                      disableSocietyClose: true,
                      title: 'House scandal',
                      message: 'House: ' + house.name + '\nThis house has been embarrassed by a scandal. You can shield them, exploit it, or let the city talk.',
                      image: image,
                      options: [
                        {
                          text: 'Shield them',
                          statChanges: { influence: -35, prestige: -4 },
                          action: {
                            event: this.event,
                            method: 'shieldScandal',
                            context: { houseId: house.id }
                          }
                        },
                        {
                          variant: 'danger',
                          text: 'Exploit it',
                          statChanges: { influence: 50, prestige: 6 },
                          action: {
                            event: this.event,
                            method: 'exploitScandal',
                            context: { houseId: house.id }
                          }
                        },
                        {
                          text: 'Do nothing',
                          action: {
                            event: this.event,
                            method: 'declineFamilyAffair',
                            context: { houseId: house.id }
                          }
                        }
                      ]
                    })
                  } else {
                    this.eventRivalSlander(society, house)
                  }
                },
        eventRivalSlander(society, house, options) {
                  let state = daapi.getState()
                  if (!options || !options.silent) this.save(society)
                  this.pushModal({
                    corTranslatorPretranslateNow: true,
                    disableSocietyClose: true,
                    title: 'Rival rumor',
                    message: 'House: ' + house.name + '\nYour rivals are whispering that your household has overreached its station. The rumor is small now, but it has teeth.',
                    image: this.affairIcon('slander'),
                    options: [
                      {
                        variant: 'warning',
                        text: 'Answer publicly',
                        tooltip: 'Spend influence to blunt the attack and make the rivalry hotter.',
                        statChanges: { influence: -35, prestige: 4 },
                        action: {
                          event: this.event,
                          method: 'answerSlander',
                          context: { houseId: house.id }
                        }
                      },
                      {
                        text: 'Ignore it',
                        tooltip: 'Lose some prestige, but avoid making the quarrel worse.',
                        statChanges: { prestige: -10 },
                        action: {
                          event: this.event,
                          method: 'ignoreSlander',
                          context: { houseId: house.id }
                        }
                      }
                    ]
                  })
                },
        eventFriendlyOpening(society, house, options) {
                  let state = daapi.getState()
                  if (!options || !options.silent) this.save(society)
                  this.pushModal({
                    corTranslatorPretranslateNow: true,
                    disableSocietyClose: true,
                    title: 'Political opening',
                    message: 'House: ' + house.name + '\nA friendly contact suggests a public exchange of support. It would strengthen your network, though it may bind you to their interests.',
                    image: this.affairIcon('support'),
                    options: [
                      {
                        variant: 'info',
                        text: 'Accept their support',
                        statChanges: { influence: 60 },
                        action: {
                          event: this.event,
                          method: 'acceptOpening',
                          context: { houseId: house.id }
                        }
                      },
                      {
                        text: 'Stay independent',
                        statChanges: { prestige: 3 },
                        action: {
                          event: this.event,
                          method: 'declineOpening',
                          context: { houseId: house.id }
                        }
                      }
                    ]
                  })
                },
        eventSlaveCaptureOpportunity(society, item, options) {
                  let state = daapi.getState()
                  if (!item || !item.house || !item.character) {
                    return false
                  }
                  let cost = Math.max(35, Math.round((item.info && item.info.cost ? item.info.cost : 120) * 0.45))
                  if (!options || !options.silent) this.save(society)
                  this.pushModal({
                    corTranslatorPretranslateNow: true,
                    disableSocietyClose: true,
                    title: 'Slave capture opportunity',
                    message: 'House: ' + item.house.name + '\nBrokers and retainers report that ' + this.slaveDisplayName(item.character, null, state) + ' can be seized from a vulnerable slave kin group.\nOrigin: ' + this.slaveOriginDescription(item.character.corSocietySlaveOrigin || 'unknown') + '\nThis is not a polite purchase; the origin house will resent it.',
                    image: this.characterPortrait(item.character, state, item.house),
                    options: [
                      {
                        variant: 'danger',
                        text: 'Fund the capture (' + cost + ')',
                        statChanges: { cash: -cost, influence: -10 },
                        icons: [this.slaveTypeIcon(item.info.type), this.affairIcon('rivalry')],
                        action: {
                          event: this.event,
                          method: 'captureEnslavedCharacter',
                          context: { houseId: item.house.id, characterId: item.character.id, cost }
                        }
                      },
                      {
                        text: 'Leave them',
                        tooltip: 'No action. The person remains in their current Society house.',
                        action: {
                          event: this.event,
                          method: 'declineFamilyAffair',
                          context: { houseId: item.house.id, kind: 'slaveCapture' }
                        }
                      }
                    ]
                  })
                  return true
                },
        eventPetition(society, house, options) {
                  let state = daapi.getState()
                  if (!options || !options.silent) this.save(society)
                  let petitionCost = this.petitionCost(house)
                  this.pushModal({
                    corTranslatorPretranslateNow: true,
                    disableSocietyClose: true,
                    title: 'Local petition',
                    message: 'House: ' + house.name + '\nA lesser family connected to this house asks for your help in a local dispute. It is not glamorous politics, but gratitude from the lower orders can travel far.',
                    image: this.affairIcon('petition'),
                    options: [
                      {
                        variant: 'info',
                        text: 'Hear their petition',
                        statChanges: { cash: -petitionCost, prestige: 7 },
                        action: {
                          event: this.event,
                          method: 'supportPetition',
                          context: { houseId: house.id }
                        }
                      },
                      {
                        text: 'Send them away',
                        action: {
                          event: this.event,
                          method: 'refusePetition',
                          context: { houseId: house.id }
                        }
                      }
                    ]
                  })
                },
        eventFamilyInvitation(society, house, options) {
                  let state = daapi.getState()
                  if (!options || !options.silent) this.save(society)
                  let invitationCost = this.invitationCost(house)
                  this.pushModal({
                    corTranslatorPretranslateNow: true,
                    disableSocietyClose: true,
                    title: 'Family invitation',
                    message: 'House: ' + house.name + '\nThis house invites your household to a public family occasion. Attending would cost time and gifts, but the city notices who stands beside whom.',
                    image: this.affairIcon('invitation'),
                    options: [
                      {
                        variant: 'info',
                        text: 'Attend',
                        tooltip: 'Spend a little cash for prestige and better relations.',
                        statChanges: { cash: -invitationCost, prestige: 10 },
                        action: {
                          event: this.event,
                          method: 'attendFamilyInvitation',
                          context: { houseId: house.id }
                        }
                      },
                      {
                        text: 'Decline',
                        tooltip: 'Avoid the cost, but the house may feel slighted.',
                        action: {
                          event: this.event,
                          method: 'declineFamilyInvitation',
                          context: { houseId: house.id }
                        }
                      }
                    ]
                  })
                }
      })
      window.corSociety._mixinCorSocietyRelationsEventsVersion = '1.1.331'
    }
  }
}
