{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyPeopleGeneration() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyPeopleGenerationVersion === '1.1.331') {
        return
      }
      Object.assign(window.corSociety, {
        ensureMinimumHouses(society, state) {
                  let counts = this.countByStratum(society)
                  this.stratumOrder.forEach((stratum) => {
                    let needed = (this.strata[stratum].min || 0) - (counts[stratum] || 0)
                    for (let i = 0; i < needed; i++) {
                      this.generateHouse(society, state, stratum)
                    }
                  })
                },
        initialHouseHeadIsMale(society, state, stratum) {
                  let counts = { male: 0, female: 0 }
                  Object.keys((society && society.houses) || {}).forEach((houseId) => {
                    let house = society.houses[houseId]
                    if (!house || house.stratum !== stratum) {
                      return
                    }
                    let ids = ((house.notableIds || []).concat(house.memberIds || [])).filter(Boolean)
                    for (let i = 0; i < ids.length; i++) {
                      let character = state.characters && state.characters[ids[i]]
                      if (character && !character.isDead) {
                        if (this.characterIsMale(character)) counts.male += 1
                        else counts.female += 1
                        return
                      }
                    }
                  })
                  if (counts.male > counts.female) return false
                  if (counts.female > counts.male) return true
                  return Math.random() > 0.5
                },
        generateHouse(society, state, stratum) {
                  let profile = this.strata[stratum]
                  let isMale = this.initialHouseHeadIsMale(society, state, stratum)
                  let nomen = this.pick(this.nomina)
                  let cognomen = this.pick(this.cognomina)
                  let prestige = this.randomInt(profile.basePrestige[0], profile.basePrestige[1])
                  let job = this.pick(profile.jobs)
                  let traits = this.generatedTraitsForStratum(stratum, job)
                  let headId = daapi.generateCharacter({
                    characterFeatures: {
                      gender: isMale ? 'male' : 'female',
                      isMale,
                      praenomen: isMale ? this.pick(this.maleNames) : this.pick(this.femaleNames),
                      birthMonth: this.randomInt(0, 11),
                      birthYear: state.year - this.randomInt(20, 30),
                      look: this.generatedVanillaLook(isMale, stratum + '-' + nomen + '-' + cognomen),
                      job,
                      jobLevel: this.randomInt(0, stratum === 'senatorial' ? 12 : stratum === 'equestrian' ? 9 : 6),
                      traits,
                      skills: this.skillsForStratum(stratum),
                      corSocietyGenerated: true,
                      flagDoNotCull: true,
                      flagCanHoldImperium: stratum === 'senatorial' || stratum === 'equestrian' || Math.random() > 0.55
                    },
                    dynastyFeatures: {
                      nomen,
                      cognomen,
                      prestige,
                      heritage: this.pick(profile.heritage)
                    }
                  })
                  let head = daapi.getCharacter({ characterId: headId })
                  if (!head || !head.dynastyId) {
                    return false
                  }
                  this.applyGeneratedTraits(headId, traits)
                  this.seedSocialTraitsForCharacter(society, headId, traits)
                  let house = society.houses[head.dynastyId] || this.createHouseRecord(head.dynastyId)
                  house.name = this.houseName(daapi.getState().dynasties[head.dynastyId] || {}, head.dynastyId)
                  house.stratum = stratum
                  house.generated = true
                  house.founderId = headId
                  house.branchRootId = headId
                  house.parentHouseId = ''
                  house.type = 'origin'
                  house.houseKind = 'origin'
                  house.createdAtTurn = this.monthKey(state)
                  house.relation = this.randomInt(-8, 12)
                  house.memberIds = [headId]
                  house.notableIds = [headId]
                  house.strength = Math.round(prestige / 1000 + 25)
                  house.prestige = prestige
                  house.heritage = (daapi.getState().dynasties[head.dynastyId] || {}).heritage || this.pick(profile.heritage)
                  house.citizenRank = this.rankFromStrength(house.strength)
                  society.houses[head.dynastyId] = house
                  society.generatedHouseIds.push(head.dynastyId)
                  society.generatedCharacterIds.push(headId)
                  this.seedGeneratedHouseFamily(society, daapi.getState(), house, stratum, headId)
                  this.log(society, 'New ' + profile.singular + ' enters public life: ' + house.name + '.')
                  return house
                },
        ensureInitialHouseGenderPair(society, state, house, stratum) {
                  let counts = this.houseLivingGenderCounts(society, state, house)
                  if (!counts.male || !counts.female) {
                    this.generateHouseSeedMember(society, state, house, { gender: counts.male ? 'female' : 'male' })
                    state = daapi.getState()
                    this.refreshHouseMemberLists(society, state, house)
                  }
                  return daapi.getState()
                },
        repairGeneratedHouseInitialGenderPairs(society, state) {
                  let repairKey = 'initial-gender-pair-v1'
                  if (!society || society.initialGenderPairRepairVersion === repairKey || !society.houses) {
                    return false
                  }
                  Object.keys(society.houses).forEach((houseId) => {
                    let house = society.houses[houseId]
                    if (!house || !house.generated || house.initialGenderPairChecked) {
                      return
                    }
                    this.refreshHouseMemberLists(society, state, house)
                    let living = this.houseLivingMemberIds(society, state, house)
                    if (!living.length) {
                      house.initialGenderPairChecked = true
                      return
                    }
                    let counts = this.houseLivingGenderCounts(society, state, house)
                    if (!counts.male || !counts.female) {
                      this.generateHouseSeedMember(society, state, house, { gender: counts.male ? 'female' : 'male' })
                      state = daapi.getState()
                      this.refreshHouseMemberLists(society, state, house)
                    }
                    house.initialGenderPairChecked = true
                  })
                  society.initialGenderPairRepairVersion = repairKey
                  return true
                },
        seedGeneratedHouseFamily(society, state, house, stratum, headId) {
                  let head = (state.characters && state.characters[headId]) || daapi.getCharacter({ characterId: headId })
                  if (!head) {
                    return
                  }
                  head.id = head.id || headId
                  let headAge = this.age(head, state)
                  let spouse = false
                  if (!head.spouseId && headAge >= 20) {
                    spouse = this.generateHouseSpouse(society, state, house, stratum, head)
                    state = daapi.getState()
                    head = state.characters[headId] || head
                  }
                  state = this.ensureInitialHouseGenderPair(society, state, house, stratum)
                  head = state.characters[headId] || head
                  if (headAge >= 34) {
                    let spouseId = (head.spouseId && state.characters[head.spouseId]) ? head.spouseId : (spouse && spouse.id)
                    let spouseCharacter = spouseId ? state.characters[spouseId] || spouse : false
                    if (spouseCharacter) {
                      let mother = this.characterIsMale(head) ? spouseCharacter : head
                      let father = this.characterIsMale(head) ? head : spouseCharacter
                      let childCount = this.randomInt(1, headAge >= 45 ? 3 : 2)
                      for (let i = 0; i < childCount; i++) {
                        this.generateHouseChild(society, state, house, stratum, mother, father, this.randomInt(0, Math.min(18, headAge - 18)))
                        state = daapi.getState()
                      }
                    }
                  }
                  while (this.visibleHousePeople(house, state).length < this.minimumVisibleMembers(house) && this.livingGeneratedCount(society, state) < 260) {
                    this.generateRelative(society, state, house, stratum, head)
                    state = daapi.getState()
                    head = state.characters[headId] || head
                  }
                  state = this.ensureInitialHouseGenderPair(society, state, house, stratum)
                  head = state.characters[headId] || head
                  this.ensureHouseCommonTree(society, state, house, { allowLivingExtras: true })
                  state = daapi.getState()
                  this.refreshHouseMemberLists(society, state, house)
                },
        generateHouseSpouse(society, state, house, stratum, head) {
                  let profile = this.strata[stratum] || this.strata.plebeian
                  let isMale = !this.characterIsMale(head)
                  let headAge = this.age(head, state)
                  let minAge = Math.max(18, Math.min(30, headAge - 4))
                  let maxAge = Math.max(minAge, Math.min(34, headAge + 6))
                  let age = this.randomInt(minAge, maxAge)
                  let job = this.pick(profile.jobs)
                  let traits = this.generatedTraitsForStratum(stratum, job)
                  let spouseId = daapi.generateCharacter({
                    characterFeatures: {
                      gender: isMale ? 'male' : 'female',
                      isMale,
                      praenomen: isMale ? this.pick(this.maleNames) : this.pick(this.femaleNames),
                      birthMonth: this.randomInt(0, 11),
                      birthYear: state.year - age,
                      look: this.generatedVanillaLook(isMale, stratum + '-' + house.id + '-spouse-' + head.id),
                      job,
                      jobLevel: this.randomInt(0, stratum === 'senatorial' ? 8 : stratum === 'equestrian' ? 6 : 4),
                      traits,
                      skills: this.skillsForStratum(stratum),
                      corSocietyGenerated: true,
                      flagDoNotCull: true,
                      flagCanHoldImperium: stratum === 'senatorial' || stratum === 'equestrian' || Math.random() > 0.7
                    },
                    dynastyFeatures: this.dynastyFeaturesForHouse(house, state)
                  })
                  this.applyGeneratedTraits(spouseId, traits)
                  this.seedSocialTraitsForCharacter(society, spouseId, traits)
                  society.generatedCharacterIds = society.generatedCharacterIds || []
                  if (society.generatedCharacterIds.indexOf(spouseId) < 0) {
                    society.generatedCharacterIds.push(spouseId)
                  }
                  house.memberIds = house.memberIds || []
                  house.notableIds = house.notableIds || []
                  if (house.memberIds.indexOf(spouseId) < 0) {
                    house.memberIds.push(spouseId)
                  }
                  if (house.notableIds.indexOf(spouseId) < 0) {
                    house.notableIds.push(spouseId)
                  }
                  try {
                    daapi.performMarriage({
                      characterId: head.id,
                      spouseId,
                      isMatrilineal: !this.characterIsMale(head)
                    })
                    daapi.updateCharacter({
                      characterId: spouseId,
                      character: {
                        dynastyId: this.gameDynastyIdForHouse(house),
                        corSocietyHouseId: house.id
                      }
                    })
                    daapi.forceUpdateCharacterDisplay({ characterId: head.id })
                    daapi.forceUpdateCharacterDisplay({ characterId: spouseId })
                  } catch (err) {
                    console.warn(err)
                  }
                  let spouse = daapi.getCharacter({ characterId: spouseId }) || {}
                  spouse.id = spouse.id || spouseId
                  return spouse
                },
        generateHouseChild(society, state, house, stratum, mother, father, childAge) {
                  mother = mother || {}
                  father = father || {}
                  if (!mother.id || !father.id) {
                    return false
                  }
                  let isMale = Math.random() > 0.5
                  childAge = Math.max(0, Math.min(18, parseInt(childAge || 0, 10)))
                  let traits = childAge >= 12 ? this.generatedTraitsForStratum(stratum, '') : []
                  let childId = daapi.generateCharacter({
                    characterFeatures: {
                      gender: isMale ? 'male' : 'female',
                      isMale,
                      praenomen: isMale ? this.pick(this.maleNames) : this.pick(this.femaleNames),
                      birthMonth: this.randomInt(0, 11),
                      birthYear: state.year - childAge,
                      look: this.inheritedVanillaLook(isMale, mother, father, stratum + '-' + house.id + '-child-' + mother.id + '-' + father.id + '-' + childAge),
                      traits,
                      skills: this.skillsForStratum(stratum),
                      corSocietyGenerated: true,
                      flagDoNotCull: true,
                      fatherId: father.id || null,
                      motherId: mother.id || null,
                      childrenIds: []
                    },
                    dynastyFeatures: this.dynastyFeaturesForHouse(house, state)
                  })
                  daapi.updateCharacter({
                    characterId: childId,
                    character: {
                      dynastyId: this.gameDynastyIdForHouse(house),
                      corSocietyHouseId: house.id,
                      fatherId: father.id || null,
                      motherId: mother.id || null,
                      childrenIds: []
                    }
                  })
                  ;[mother, father].forEach((parent) => {
                    if (!parent || !parent.id) {
                      return
                    }
                    let children = (parent.childrenIds || []).slice()
                    if (children.indexOf(childId) < 0) {
                      children.push(childId)
                      daapi.updateCharacter({
                        characterId: parent.id,
                        character: {
                          childrenIds: children
                        }
                      })
                      parent.childrenIds = children
                    }
                  })
                  house.memberIds = house.memberIds || []
                  house.notableIds = house.notableIds || []
                  if (house.memberIds.indexOf(childId) < 0) {
                    house.memberIds.push(childId)
                  }
                  if (childAge >= 16 && house.notableIds.indexOf(childId) < 0) {
                    house.notableIds.push(childId)
                  }
                  society.generatedCharacterIds = society.generatedCharacterIds || []
                  if (society.generatedCharacterIds.indexOf(childId) < 0) {
                    society.generatedCharacterIds.push(childId)
                  }
                  this.applyGeneratedTraits(childId, traits)
                  this.seedSocialTraitsForCharacter(society, childId, traits)
                  return childId
                },
        generateRelative(society, state, house, stratum, head) {
                  let profile = this.strata[stratum]
                  let isMale = Math.random() > 0.5
                  let headIsMale = this.characterIsMale(head)
                  let headAge = this.age(head, state)
                  let canBeChild = headAge >= 34
                  let relativeAge = canBeChild ? this.randomInt(0, Math.min(30, headAge - 18)) : this.randomInt(16, 30)
                  let job = relativeAge >= 16 ? this.pick(profile.jobs) : ''
                  let traits = relativeAge >= 12 ? this.generatedTraitsForStratum(stratum, job) : []
                  let spouse = head.spouseId && state.characters[head.spouseId] ? state.characters[head.spouseId] : false
                  let fatherId = ''
                  let motherId = ''
                  if (canBeChild) {
                    if (headIsMale) {
                      fatherId = head.id
                      motherId = spouse && !this.characterIsMale(spouse) ? spouse.id || head.spouseId : this.generateGhostCoParent(society, state, house, head, false, relativeAge)
                    } else {
                      motherId = head.id
                      fatherId = spouse && this.characterIsMale(spouse) ? spouse.id || head.spouseId : this.generateGhostCoParent(society, state, house, head, true, relativeAge)
                    }
                    if (fatherId && motherId) {
                      state = daapi.getState()
                      this.linkParentPair(state, fatherId, motherId)
                    }
                  }
                  let motherLook = motherId && state.characters[motherId] ? state.characters[motherId] : (headIsMale ? spouse : head)
                  let fatherLook = fatherId && state.characters[fatherId] ? state.characters[fatherId] : (headIsMale ? head : spouse)
                  let relativeId = daapi.generateCharacter({
                    characterFeatures: {
                      gender: isMale ? 'male' : 'female',
                      isMale,
                      praenomen: isMale ? this.pick(this.maleNames) : this.pick(this.femaleNames),
                      birthMonth: this.randomInt(0, 11),
                      birthYear: state.year - relativeAge,
                      look: canBeChild ? this.inheritedVanillaLook(isMale, motherLook, fatherLook, stratum + '-' + house.id + '-' + head.id + '-' + relativeAge) : this.generatedVanillaLook(isMale, stratum + '-' + house.id + '-' + head.id + '-' + relativeAge),
                      job,
                      jobLevel: job ? this.randomInt(0, 5) : 0,
                      traits,
                      skills: this.skillsForStratum(stratum),
                      corSocietyGenerated: true,
                      flagDoNotCull: true,
                      fatherId: fatherId || null,
                      motherId: motherId || null,
                      childrenIds: []
                    },
                    dynastyFeatures: this.dynastyFeaturesForHouse(house, state)
                  })
                  daapi.updateCharacter({
                    characterId: relativeId,
                    character: {
                      dynastyId: this.gameDynastyIdForHouse(house),
                      corSocietyHouseId: house.id,
                      fatherId: fatherId || null,
                      motherId: motherId || null
                    }
                  })
                  if (canBeChild) {
                    this.addChildToParent(state, fatherId, relativeId)
                    this.addChildToParent(state, motherId, relativeId)
                  }
                  house.memberIds = house.memberIds || []
                  house.notableIds = house.notableIds || []
                  if (house.memberIds.indexOf(relativeId) < 0) {
                    house.memberIds.push(relativeId)
                  }
                  if (house.notableIds.indexOf(relativeId) < 0) {
                    house.notableIds.push(relativeId)
                  }
                  if (society.generatedCharacterIds.indexOf(relativeId) < 0) {
                    society.generatedCharacterIds.push(relativeId)
                  }
                  this.applyGeneratedTraits(relativeId, traits)
                  this.seedSocialTraitsForCharacter(society, relativeId, traits)
                },
        skillsForStratum(stratum) {
                  let high = stratum === 'senatorial' ? 28 : stratum === 'equestrian' ? 22 : stratum === 'civic' ? 18 : stratum === 'plebeian' ? 14 : 11
                  let low = stratum === 'poor' ? 1 : 4
                  return {
                    intelligence: this.randomInt(low, high),
                    stewardship: this.randomInt(low, high),
                    eloquence: this.randomInt(low, high),
                    combat: this.randomInt(low, high)
                  }
                },
        generatedTraitsForStratum(stratum, job) {
                  let pools = {
                    senatorial: ['senator', 'ambitious', 'authoritative', 'honorable', 'oratorDeliberative', 'erudite', 'competitive'],
                    equestrian: ['educated', 'competitive', 'gregarious', 'ambitious', 'horseRider', 'fashionable', 'greedy'],
                    civic: ['literate', 'educated', 'content', 'trusting', 'honorable', 'erudite', 'oratorJudicial'],
                    plebeian: ['content', 'gregarious', 'charitable', 'stubborn', 'strong', 'trusting'],
                    freedmen: ['literate', 'greedy', 'trusting', 'sly', 'ambitious', 'fashionable'],
                    poor: ['content', 'charitable', 'stubborn', 'strong', 'shy']
                  }
                  let pool = (pools[stratum] || pools.plebeian).slice()
                  if (job === 'lawyer') {
                    pool.push('oratorJudicial', 'authoritative')
                  } else if (job === 'rhetor') {
                    pool.push('oratorDeliberative', 'erudite')
                  } else if (job === 'physician' || job === 'philosophyTutor' || job === 'litterator' || job === 'grammaticus') {
                    pool.push('educated', 'erudite')
                  } else if (job === 'trader') {
                    pool.push('greedy', 'gregarious', 'sly')
                  } else if (job === 'labourer' || job === 'farmer' || job === 'blacksmith') {
                    pool.push('strong', 'stubborn')
                  }
                  return this.pickUnique(pool, this.randomInt(1, stratum === 'senatorial' || stratum === 'equestrian' ? 3 : 2))
                },
        applyGeneratedTraits(characterId, traits) {
                  ;(traits || []).forEach((trait) => {
                    if (!trait) {
                      return
                    }
                    try {
                      daapi.addTrait({ characterId, trait })
                    } catch (err) {
                      console.warn(err)
                    }
                  })
                },
        seedSocialTraitsForCharacter(society, characterId, vanillaTraits) {
                  if (!society || !characterId) {
                    return
                  }
                  let traits = vanillaTraits || []
                  let possible = []
                  if (traits.indexOf('honorable') >= 0) possible.push('faithful', 'honorable')
                  if (traits.indexOf('ambitious') >= 0 || traits.indexOf('competitive') >= 0) possible.push('ambitious')
                  if (traits.indexOf('sly') >= 0 || traits.indexOf('greedy') >= 0) possible.push('manipulator', 'liar')
                  if (traits.indexOf('charitable') >= 0 || traits.indexOf('content') >= 0) possible.push('charitable', 'faithful')
                  if (traits.indexOf('gregarious') >= 0 || traits.indexOf('fashionable') >= 0) possible.push('gossip')
                  if (traits.indexOf('stubborn') >= 0) possible.push('resentful')
                  if ((traits.indexOf('stubborn') >= 0 || traits.indexOf('competitive') >= 0 || traits.indexOf('greedy') >= 0) && Math.random() < 0.22) possible.push('cruel')
                  if (!possible.length) {
                    possible = ['faithful', 'honorable', 'ambitious', 'charitable', 'gossip']
                  }
                  let count = Math.random() < 0.28 ? 2 : 1
                  this.pickUnique(possible, count).forEach((trait) => this.addSocietyTrait(society, characterId, trait))
                },
        societyTraitDefinitions() {
                  return {
                    adulterer: { label: 'Adulterer', vanillaKey: 'corSocietyAdulterer', description: 'Known for dangerous affairs. Spouses and moral rivals react badly, but close friends may ignore the scandal.' },
                    faithful: { label: 'Faithful', vanillaKey: 'corSocietyFaithful', description: 'Values loyalty and stable household bonds. Improves spousal trust and lowers courtship scandal pressure.' },
                    liar: { label: 'Liar', vanillaKey: 'corSocietyLiar', description: 'Uses falsehoods easily. Honorable characters distrust this person.' },
                    honorable: { label: 'Honorable', vanillaKey: 'corSocietyHonorable', description: 'Publicly values reputation, fairness, and proper conduct.' },
                    manipulator: { label: 'Manipulator', vanillaKey: 'corSocietyManipulator', description: 'Pulls people into useful positions. Trusting characters are easier targets but less comfortable afterward.' },
                    charitable: { label: 'Charitable', vanillaKey: 'corSocietyCharitable', description: 'Gains warmth through gifts, mercy, and household support.' },
                    cruel: { label: 'Cruel', vanillaKey: 'corSocietyCruel', description: 'Feared more than loved. Often harms personal relations unless power matters more than affection.' },
                    gossip: { label: 'Gossip', vanillaKey: 'corSocietyGossip', description: 'Trades in rumors. Useful for intrigue, risky for spouses and private affairs.' },
                    ambitious: { label: 'Ambitious', vanillaKey: 'corSocietyAmbitious', description: 'Seeks rank, wealth, and status. Other ambitious characters may admire the drive.' },
                    resentful: { label: 'Resentful', vanillaKey: 'corSocietyResentful', description: 'Remembers slights and feeds rivalries when trust collapses.' },
                    mentor: { label: 'Mentor', vanillaKey: 'corSocietyMentor', description: 'Guides another character through public life and family politics.' },
                    protege: { label: 'Student', vanillaKey: 'corSocietyProtege', description: 'Learns from a patron, elder, or teacher within Society.' }
                  }
                },
        addSocietyTrait(society, characterId, trait) {
                  if (!society || !characterId || !trait) {
                    return false
                  }
                  let social = this.characterSocialRecord(society, characterId, true)
                  social.traits = social.traits || []
                  if (social.traits.indexOf(trait) < 0) {
                    social.traits.push(trait)
                  }
                  return true
                },
        removeSocietyTrait(society, characterId, trait) {
                  let social = this.characterSocialRecord(society, characterId, false)
                  if (!social || !social.traits) {
                    return false
                  }
                  social.traits = social.traits.filter((item) => item !== trait)
                  return true
                },
        societyTraitsForCharacter(society, characterId) {
                  let social = this.characterSocialRecord(society, characterId, false)
                  return (social && social.traits) ? social.traits.slice() : []
                },
        traitLabel(trait) {
                  let def = this.societyTraitDefinitions()[trait]
                  return def ? def.label : String(trait || '')
                },
        traitIcon(trait) {
                  let def = this.societyTraitDefinitions()[trait]
                  if (def) {
                    this._iconCache = this._iconCache || {}
                    let key = 'trait:' + trait
                    if (this._iconCache[key]) {
                      return this._iconCache[key]
                    }
                    try {
                      this._iconCache[key] = daapi.requireImage('/cor_society/assets/traits/' + trait + '.svg')
                      return this._iconCache[key]
                    } catch (err) {
                      console.warn(err)
                    }
                  }
                  return this.affairIcon('log')
                },
        socialTraitSummary(society, character) {
                  if (!character) {
                    return 'none'
                  }
                  let ids = this.societyTraitsForCharacter(society, character.id)
                  if (!ids.length) {
                    return 'none'
                  }
                  return ids.map((trait) => this.traitLabel(trait)).join(', ')
                },
        societyTraitOptions(society, character) {
                  let definitions = this.societyTraitDefinitions()
                  let traits = this.societyTraitsForCharacter(society, character && character.id)
                  if (!traits.length) {
                    return [{
                      text: 'Social traits: none',
                      disabled: true,
                      showDisabledWithTooltip: true,
                      tooltip: 'No Society social trait is currently known for this character.',
                      icons: [this.affairIcon('prestige')]
                    }]
                  }
                  return traits.map((trait) => {
                    let def = definitions[trait] || { label: this.traitLabel(trait), description: '' }
                    return {
                      text: 'Social trait: ' + def.label,
                      disabled: true,
                      showDisabledWithTooltip: true,
                      tooltip: def.description || 'This Society trait affects relationships, courtship, scandals, trade, and family events.',
                      icons: [this.traitIcon(trait)]
                    }
                  })
                },
        registerSocietyTraitDefinitions() {
                  if (this._societyTraitDefinitionsRegisteredVersion === this.version) {
                    return
                  }
                  let definitions = this.societyTraitDefinitions()
                  Object.keys(definitions).forEach((trait) => {
                    let def = definitions[trait]
                    if (!def || !def.vanillaKey) {
                      return
                    }
                    try {
                      daapi.addOrEditTraitDefinition({
                        trait: def.vanillaKey,
                        traitInfo: {
                          group: 'neutral',
                          modifiers: { skills: {} },
                          isStackable: false,
                          points: 0
                        },
                        icon: this.traitIcon(trait),
                        specialGroups: ['otherCharacterTraits'],
                        text: {
                          title: def.label,
                          description: def.description || def.label
                        }
                      })
                    } catch (err) {
                      console.warn(err)
                    }
                  })
                  this._societyTraitDefinitionsRegisteredVersion = this.version
                },
        syncSocietyTraitsWithVanilla(society, state) {
                  if (!society || !state || !state.characters) {
                    return
                  }
                  let definitions = this.societyTraitDefinitions()
                  let candidateMap = {}
                  let addCandidate = (characterId) => {
                    if (characterId && state.characters[characterId]) {
                      candidateMap[characterId] = true
                    }
                  }
                  Object.keys(society.characterSocial || {}).forEach(addCandidate)
                  ;(society.generatedCharacterIds || []).forEach(addCandidate)
                  ;(society.relationStatusCharacterIds || []).forEach(addCandidate)
                  ;(society.slaveStatusCharacterIds || []).forEach(addCandidate)
                  Object.keys(society.houses || {}).forEach((houseId) => {
                    let house = society.houses[houseId]
                    ;(house.memberIds || []).forEach(addCandidate)
                    ;(house.notableIds || []).forEach(addCandidate)
                    ;(house.slaveIds || []).forEach(addCandidate)
                  })
                  let candidateIds = Object.keys(candidateMap)
                  let currentId = this.currentCharacterId(state)
                  if (currentId && candidateIds.indexOf(currentId) < 0) {
                    candidateIds.push(currentId)
                  }
                  candidateIds.forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character) {
                      return
                    }
                    character.id = character.id || characterId
                    let socialTraits = this.societyTraitsForCharacter(society, characterId)
                    let vanillaTraits = character.traits || []
                    Object.keys(definitions).forEach((trait) => {
                      let def = definitions[trait]
                      let key = def && def.vanillaKey
                      if (!key) {
                        return
                      }
                      let shouldHave = socialTraits.indexOf(trait) >= 0
                      let has = vanillaTraits.indexOf(key) >= 0
                      try {
                        if (shouldHave && !has) {
                          daapi.addTrait({ characterId, trait: key })
                          vanillaTraits.push(key)
                        } else if (!shouldHave && has) {
                          daapi.removeTrait({ characterId, trait: key })
                          vanillaTraits = vanillaTraits.filter((item) => item !== key)
                        }
                      } catch (err) {
                        console.warn(err)
                      }
                    })
                    character.traits = vanillaTraits
                  })
                },
        characterHasTrait(society, character, trait) {
                  if (!character || !trait) {
                    return false
                  }
                  let vanilla = character.traits || []
                  return vanilla.indexOf(trait) >= 0 || this.societyTraitsForCharacter(society, character.id).indexOf(trait) >= 0
                },
        generatedVanillaLook(isMale, seedText) {
                  let types = ['black', 'brown', 'brown_curly', 'dusky', 'olive', 'tan', 'hazel', 'auburn', 'blonde']
                  let random = this.seededRandom(seedText || Math.random())
                  return {
                    group: 'roman',
                    type: this.pickByRandom(types, random),
                    gender: isMale ? 'male' : 'female'
                  }
                },
        inheritedVanillaLook(isMale, mother, father, seedText) {
                  let inheritedTypes = []
                  ;[mother, father].forEach((parent) => {
                    if (parent && parent.look && parent.look.type) {
                      inheritedTypes.push(parent.look.type)
                    }
                  })
                  if (!inheritedTypes.length) {
                    return this.generatedVanillaLook(isMale, seedText)
                  }
                  let random = this.seededRandom(seedText || inheritedTypes.join('-'))
                  let type = this.pickByRandom(inheritedTypes, random)
                  if (random() < 0.16) {
                    type = this.nearbyLookType(type, random)
                  }
                  return {
                    group: 'roman',
                    type,
                    gender: isMale ? 'male' : 'female'
                  }
                },
        nearbyLookType(type, random) {
                  let variants = {
                    black: ['black', 'dusky', 'brown'],
                    brown: ['brown', 'brown_curly', 'tan', 'hazel'],
                    brown_curly: ['brown_curly', 'brown', 'hazel'],
                    dusky: ['dusky', 'black', 'olive'],
                    olive: ['olive', 'tan', 'brown'],
                    tan: ['tan', 'olive', 'hazel'],
                    hazel: ['hazel', 'brown', 'auburn', 'tan'],
                    auburn: ['auburn', 'hazel', 'brown'],
                    blonde: ['blonde', 'hazel', 'tan']
                  }
                  return this.pickByRandom(variants[type] || [type || 'brown'], random || Math.random)
                },
        ensureGeneratedParents(society, state) {
                  let ids = (society.generatedCharacterIds || []).slice()
                  let generatedThisTick = 0
                  if (!ids.length) {
                    return
                  }
                  let cursor = parseInt(society.generatedParentsCursor || 0, 10) || 0
                  let inspected = 0
                  while (inspected < ids.length && inspected < 32) {
                    if (generatedThisTick >= 8) break
                    let i = (cursor + inspected) % ids.length
                    inspected += 1
                    let characterId = ids[i]
                    let character = state.characters[characterId]
                    if (!character || character.isDead || character.corSocietyGhostParent) {
                      continue
                    }
                    character.id = character.id || characterId
                    let patch = {}
                    let generatedParents = this.ensureGeneratedParentPair(society, state, character)
                    if (generatedParents.fatherId && !character.fatherId) {
                      patch.fatherId = generatedParents.fatherId
                      generatedThisTick++
                    }
                    if (generatedParents.motherId && !character.motherId) {
                      patch.motherId = generatedParents.motherId
                      generatedThisTick++
                    }
                    if (patch.fatherId || patch.motherId) {
                      try {
                        daapi.updateCharacter({
                          characterId,
                          character: patch
                        })
                        if (patch.fatherId) character.fatherId = patch.fatherId
                        if (patch.motherId) character.motherId = patch.motherId
                      } catch (err) {
                        console.warn(err)
                      }
                    } else {
                      character.corSocietyParentsCheckedVersion = this.version
                    }
                  }
                  society.generatedParentsCursor = ids.length ? (cursor + Math.max(1, inspected)) % ids.length : 0
                },
        repairIncompleteGeneratedParentPairs(society, state) {
                  if (!society || !state || !state.characters) {
                    return 0
                  }
                  let ids = this.uniqueIds([].concat(society.generatedCharacterIds || [], society.playerTreeGeneratedLivingIds || []))
                  let repaired = 0
                  for (let i = 0; i < ids.length && repaired < 12; i++) {
                    let characterId = ids[i]
                    let character = state.characters[characterId]
                    if (!character || character.corSocietyGhostParent) {
                      continue
                    }
                    if (!character.corSocietyGenerated && !character.corSocietyHouseId && !character.corSocietyPlayerTreeGenerated) {
                      continue
                    }
                    character.id = character.id || characterId
                    let hasFather = !!(character.fatherId && state.characters[character.fatherId])
                    let hasMother = !!(character.motherId && state.characters[character.motherId])
                    if (hasFather && hasMother) {
                      // Both parents exist: ensure they are coupled so the vanilla family tree does
                      // not split the family into two. Repairs existing saves; no-op for already
                      // coupled pairs and never breaks a living real marriage.
                      if (this.linkParentPair(state, character.fatherId, character.motherId)) {
                        repaired += 1
                      }
                      continue
                    }
                    let parents = this.ensureGeneratedParentPair(society, state, character)
                    let fatherId = hasFather ? character.fatherId : parents.fatherId
                    let motherId = hasMother ? character.motherId : parents.motherId
                    if (fatherId && motherId && this.connectCharacterToParents(state, characterId, fatherId, motherId)) {
                      this.linkParentPair(state, fatherId, motherId)
                      repaired += 1
                    }
                  }
                  return repaired
                },
        ensureGeneratedDynastyTrees(society, state) {
                  if (!society || !society.houses || !state || !state.characters) {
                    return
                  }
                  let checked = 0
                  for (let houseId in society.houses) {
                    if (!society.houses.hasOwnProperty(houseId)) {
                      continue
                    }
                    let house = society.houses[houseId]
                    if (!house || !house.generated || house.treeIntegrityVersion === this.version) {
                      continue
                    }
                    this.ensureHouseCommonTree(society, state, house, { allowLivingExtras: true })
                    state = daapi.getState()
                    this.ensureDynastyCommonTree(society, state, this.gameDynastyIdForHouse(house), { budget: 8 })
                    state = daapi.getState()
                    checked += 1
                    if (checked >= 4) {
                      break
                    }
                  }
                },
        ensureDynastyCommonTree(society, state, dynastyId, options) {
                  if (!society || !state || !state.characters || !dynastyId) {
                    return false
                  }
                  options = options || {}
                  society.dynastyTreeRepairMonths = society.dynastyTreeRepairMonths || {}
                  society.repairingDynastyIds = society.repairingDynastyIds || {}
                  if (society.repairingDynastyIds[dynastyId]) {
                    return false
                  }
                  let repairKey = this.version + ':' + this.monthKey(state)
                  if (!options.force && society.dynastyTreeRepairMonths[dynastyId] === repairKey) {
                    return false
                  }
                  society.dynastyTreeRepairMonths[dynastyId] = repairKey
                  society.repairingDynastyIds[dynastyId] = true
                  let finishRepair = (value) => {
                    delete society.repairingDynastyIds[dynastyId]
                    return value
                  }
                  try {
                  let houses = this.housesForDynasty ? this.housesForDynasty(society, dynastyId) : []
                  if (!houses.length) {
                    return finishRepair(false)
                  }
                  let seeds = []
                  let seen = {}
                  let addSeed = (id) => {
                    if (!id || seen[id] || !state.characters[id]) {
                      return
                    }
                    let character = state.characters[id]
                    if (!character || character.isDead || !character.dynastyId || String(character.dynastyId) !== String(dynastyId)) {
                      return
                    }
                    seen[id] = true
                    character.id = character.id || id
                    seeds.push(character)
                  }
                  houses.forEach((house) => {
                    let ids = ((house && house.notableIds) || []).concat((house && house.memberIds) || [])
                    for (let i = 0; i < ids.length; i += 1) {
                      let character = state.characters[ids[i]]
                      if (character && !character.isDead) {
                        addSeed(ids[i])
                        break
                      }
                    }
                  })
                  if (state.dynasties && state.dynasties[dynastyId] && state.dynasties[dynastyId].memberIds) {
                    ;(state.dynasties[dynastyId].memberIds || []).slice(0, 80).forEach(addSeed)
                  }
                  if (seeds.length < 2) {
                    return finishRepair(false)
                  }
                  seeds.forEach((character) => {
                    this.ensureDeadParentsAndGrandparents(society, state, character)
                    state = daapi.getState()
                  })
                  let components = this.dynastyTreeComponents(state, seeds.map((character) => character.id), 4)
                  if (components.length <= 1) {
                    return finishRepair(false)
                  }
                  let anchor = state.characters[components[0][0]]
                  if (!anchor) {
                    return finishRepair(false)
                  }
                  anchor.id = anchor.id || components[0][0]
                  this.ensureDeadParentsAndGrandparents(society, state, anchor)
                  state = daapi.getState()
                  anchor = state.characters[anchor.id] || anchor
                  let anchorParent = (anchor.fatherId && state.characters[anchor.fatherId]) || (anchor.motherId && state.characters[anchor.motherId])
                  if (!anchorParent) {
                    return finishRepair(false)
                  }
                  anchorParent.id = anchorParent.id || anchor.fatherId || anchor.motherId
                  let grandFatherId = anchorParent.fatherId || ''
                  let grandMotherId = anchorParent.motherId || ''
                  if (!grandFatherId || !grandMotherId) {
                    this.ensureDeadParentsAndGrandparents(society, state, anchorParent)
                    state = daapi.getState()
                    anchorParent = state.characters[anchorParent.id] || anchorParent
                    grandFatherId = anchorParent.fatherId || ''
                    grandMotherId = anchorParent.motherId || ''
                  }
                  if (!grandFatherId || !grandMotherId) {
                    return finishRepair(false)
                  }
                  let changed = false
                  let budget = Math.max(1, parseInt(options.budget || 4, 10))
                  for (let i = 1; i < components.length && budget > 0; i += 1) {
                    let targetId = components[i][0]
                    let target = state.characters[targetId]
                    if (!target || target.isDead) {
                      continue
                    }
                    target.id = target.id || targetId
                    if (this.sharesAncestorWithin(state, anchor.id, target.id, 5)) {
                      continue
                    }
                    let house = target.corSocietyHouseId && society.houses ? society.houses[target.corSocietyHouseId] : this.primaryHouseForDynasty(society, dynastyId)
                    if (this.connectCharacterThroughCollateralBranch(society, state, house, anchor, target.id, grandFatherId, grandMotherId)) {
                      changed = true
                      budget -= 1
                      state = daapi.getState()
                    }
                  }
                  if (changed) {
                    houses.forEach((house) => {
                      this.refreshHouseMemberLists(society, state, house)
                    })
                  }
                  return finishRepair(changed)
                  } catch (err) {
                    console.warn(err)
                    return finishRepair(false)
                  }
                },
        dynastyTreeComponents(state, seedIds, depthLimit) {
                  let ids = (seedIds || []).filter((id) => id && state.characters && state.characters[id])
                  let allowed = {}
                  ids.forEach((id) => {
                    allowed[String(id)] = true
                  })
                  ids.forEach((id) => {
                    let ancestors = this.ancestorSet(state, id, depthLimit || 4)
                    Object.keys(ancestors || {}).forEach((ancestorId) => {
                      if (state.characters[ancestorId]) {
                        allowed[String(ancestorId)] = true
                      }
                    })
                  })
                  let childIndex = {}
                  Object.keys(allowed).forEach((id) => {
                    let character = state.characters[id]
                    if (!character) return
                    ;[character.fatherId, character.motherId].forEach((parentId) => {
                      if (!parentId || !allowed[String(parentId)]) return
                      childIndex[String(parentId)] = childIndex[String(parentId)] || []
                      childIndex[String(parentId)].push(id)
                    })
                  })
                  let seen = {}
                  let components = []
                  let seedMap = {}
                  ids.forEach((id) => {
                    seedMap[String(id)] = true
                  })
                  ids.forEach((startId) => {
                    startId = String(startId)
                    if (seen[startId]) {
                      return
                    }
                    let queue = [startId]
                    let componentSeeds = []
                    while (queue.length) {
                      let id = String(queue.shift())
                      if (!allowed[id] || seen[id]) {
                        continue
                      }
                      seen[id] = true
                      if (seedMap[id]) {
                        componentSeeds.push(id)
                      }
                      let character = state.characters[id]
                      if (!character) {
                        continue
                      }
                      ;[character.fatherId, character.motherId, character.spouseId].forEach((nextId) => {
                        if (nextId && allowed[String(nextId)] && !seen[String(nextId)]) {
                          queue.push(String(nextId))
                        }
                      })
                      ;(character.childrenIds || []).forEach((nextId) => {
                        if (nextId && allowed[String(nextId)] && !seen[String(nextId)]) {
                          queue.push(String(nextId))
                        }
                      })
                      ;(childIndex[id] || []).forEach((nextId) => {
                        if (nextId && allowed[String(nextId)] && !seen[String(nextId)]) {
                          queue.push(String(nextId))
                        }
                      })
                    }
                    if (componentSeeds.length) {
                      components.push(componentSeeds)
                    }
                  })
                  return components.sort((a, b) => b.length - a.length)
                },
        ensureHouseCommonTree(society, state, house, options) {
                  if (!society || !house || !house.id || !state || !state.characters) {
                    return
                  }
                  options = options || {}
                  this.refreshHouseMemberLists(society, state, house)
                  let livingIds = this.visibleHousePeople(house, state).filter((characterId) => state.characters[characterId])
                  if (!livingIds.length) {
                    return
                  }
                  let rootId = (house.notableIds || []).find((characterId) => state.characters[characterId] && !state.characters[characterId].isDead) || livingIds[0]
                  let root = state.characters[rootId]
                  if (!root) {
                    return
                  }
                  root.id = root.id || rootId
                  this.ensureDeadParentsAndGrandparents(society, state, root)
                  state = daapi.getState()
                  root = state.characters[rootId] || root
                  root.id = root.id || rootId
                  let rootFatherId = root.fatherId
                  let rootMotherId = root.motherId
                  if (!rootFatherId || !rootMotherId) {
                    return
                  }
                  let siblingIds = livingIds.filter((characterId) => {
                    if (this.sameCharacterId(characterId, rootId)) {
                      return false
                    }
                    let character = state.characters[characterId]
                    return character &&
                      this.sameCharacterId(character.fatherId, rootFatherId) &&
                      this.sameCharacterId(character.motherId, rootMotherId)
                  })
                  let livingAdded = 0
                  if (!siblingIds.length && options.allowLivingExtras && this.livingGeneratedCount(society, state) < 320) {
                    let siblingId = this.generateHouseSibling(society, state, house, house.stratum || 'plebeian', root)
                    if (siblingId) {
                      livingAdded += 1
                      state = daapi.getState()
                      livingIds.push(siblingId)
                      root = state.characters[rootId] || root
                    }
                  }
                  let rootAge = this.age(root, state)
                  livingIds.forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character || character.isDead || this.sameCharacterId(characterId, rootId)) {
                      return
                    }
                    character.id = character.id || characterId
                    if (this.sharesAncestorWithin(state, rootId, characterId, 4)) {
                      return
                    }
                    let age = this.age(character, state)
                    let spouse = root.spouseId && state.characters[root.spouseId] ? state.characters[root.spouseId] : false
                    if (spouse && age <= rootAge - 16) {
                      let mother = this.characterIsMale(root) ? spouse : root
                      let father = this.characterIsMale(root) ? root : spouse
                      this.connectCharacterToParents(state, characterId, father.id || rootId, mother.id || spouse.id)
                    } else {
                      this.connectCharacterThroughCollateralBranch(society, state, house, root, characterId, rootFatherId, rootMotherId)
                    }
                  })
                  state = daapi.getState()
                  this.refreshHouseMemberLists(society, state, house)
                  house.treeIntegrityVersion = this.version
                  house.livingExtrasAdded = Math.min(4, (house.livingExtrasAdded || 0) + livingAdded)
                },
        ensureDeadParentsAndGrandparents(society, state, character) {
                  if (!character) {
                    return false
                  }
                  character.id = character.id || character.characterId
                  if (!character.id) {
                    return false
                  }
                  let parents = this.ensureGeneratedParentPair(society, state, character)
                  let patch = {}
                  if (!character.fatherId && parents.fatherId) {
                    patch.fatherId = parents.fatherId
                  }
                  if (!character.motherId && parents.motherId) {
                    patch.motherId = parents.motherId
                  }
                  if (patch.fatherId || patch.motherId) {
                    try {
                      daapi.updateCharacter({ characterId: character.id, character: patch })
                      if (patch.fatherId) character.fatherId = patch.fatherId
                      if (patch.motherId) character.motherId = patch.motherId
                      this.addChildToParent(state, character.fatherId, character.id)
                      this.addChildToParent(state, character.motherId, character.id)
                      this.linkParentPair(state, character.fatherId, character.motherId)
                    } catch (err) {
                      console.warn(err)
                    }
                  }
                  state = daapi.getState()
                  ;[character.fatherId, character.motherId].forEach((parentId) => {
                    let parent = state.characters && state.characters[parentId]
                    if (!parent) {
                      return
                    }
                    parent.id = parent.id || parentId
                    let parentParents = this.ensureGeneratedParentPair(society, state, parent)
                    let parentPatch = {}
                    if (!parent.fatherId && parentParents.fatherId) {
                      parentPatch.fatherId = parentParents.fatherId
                    }
                    if (!parent.motherId && parentParents.motherId) {
                      parentPatch.motherId = parentParents.motherId
                    }
                    if (parentPatch.fatherId || parentPatch.motherId) {
                      try {
                        daapi.updateCharacter({ characterId: parentId, character: parentPatch })
                        if (parentPatch.fatherId) parent.fatherId = parentPatch.fatherId
                        if (parentPatch.motherId) parent.motherId = parentPatch.motherId
                        this.addChildToParent(state, parent.fatherId, parent.id)
                        this.addChildToParent(state, parent.motherId, parent.id)
                        this.linkParentPair(state, parent.fatherId, parent.motherId)
                      } catch (err) {
                        console.warn(err)
                      }
                    }
                  })
                  return true
                },
        generateHouseSibling(society, state, house, stratum, anchor) {
                  if (!anchor || !anchor.id || !anchor.fatherId || !anchor.motherId) {
                    return false
                  }
                  let profile = this.strata[stratum] || this.strata.plebeian
                  let isMale = Math.random() > 0.5
                  let anchorAge = this.age(anchor, state)
                  let age = this.clamp(anchorAge + this.randomInt(-5, 5), 18, 34)
                  let job = this.pick(profile.jobs)
                  let traits = this.generatedTraitsForStratum(stratum, job)
                  let father = state.characters[anchor.fatherId] || {}
                  let mother = state.characters[anchor.motherId] || {}
                  let siblingId = daapi.generateCharacter({
                    characterFeatures: {
                      gender: isMale ? 'male' : 'female',
                      isMale,
                      praenomen: isMale ? this.pick(this.maleNames) : this.pick(this.femaleNames),
                      birthMonth: this.randomInt(0, 11),
                      birthYear: state.year - age,
                      look: this.inheritedVanillaLook(isMale, mother, father, stratum + '-' + house.id + '-sibling-' + anchor.id),
                      job,
                      jobLevel: this.randomInt(0, stratum === 'senatorial' ? 8 : stratum === 'equestrian' ? 6 : 4),
                      traits,
                      skills: this.skillsForStratum(stratum),
                      corSocietyGenerated: true,
                      flagDoNotCull: true,
                      fatherId: anchor.fatherId,
                      motherId: anchor.motherId,
                      childrenIds: []
                    },
                    dynastyFeatures: this.dynastyFeaturesForHouse(house, state)
                  })
                  daapi.updateCharacter({
                    characterId: siblingId,
                    character: {
                      dynastyId: this.gameDynastyIdForHouse(house),
                      corSocietyHouseId: house.id,
                      fatherId: anchor.fatherId,
                      motherId: anchor.motherId,
                      childrenIds: []
                    }
                  })
                  this.addChildToParent(state, anchor.fatherId, siblingId)
                  this.addChildToParent(state, anchor.motherId, siblingId)
                  house.memberIds = house.memberIds || []
                  house.notableIds = house.notableIds || []
                  if (house.memberIds.indexOf(siblingId) < 0) {
                    house.memberIds.push(siblingId)
                  }
                  if (house.notableIds.indexOf(siblingId) < 0) {
                    house.notableIds.push(siblingId)
                  }
                  society.generatedCharacterIds = society.generatedCharacterIds || []
                  if (society.generatedCharacterIds.indexOf(siblingId) < 0) {
                    society.generatedCharacterIds.push(siblingId)
                  }
                  this.applyGeneratedTraits(siblingId, traits)
                  this.seedSocialTraitsForCharacter(society, siblingId, traits)
                  return siblingId
                },
        connectCharacterToParents(state, characterId, fatherId, motherId) {
                  if (!characterId || (!fatherId && !motherId)) {
                    return false
                  }
                  let patch = {}
                  if (fatherId) patch.fatherId = fatherId
                  if (motherId) patch.motherId = motherId
                  try {
                    daapi.updateCharacter({ characterId, character: patch })
                    if (state.characters && state.characters[characterId]) {
                      if (fatherId) state.characters[characterId].fatherId = fatherId
                      if (motherId) state.characters[characterId].motherId = motherId
                    }
                    this.addChildToParent(state, fatherId, characterId)
                    this.addChildToParent(state, motherId, characterId)
                    return true
                  } catch (err) {
                    console.warn(err)
                    return false
                  }
                },
        addChildToParent(state, parentId, childId) {
                  if (!parentId || !childId || !state || !state.characters || !state.characters[parentId]) {
                    return false
                  }
                  let parent = state.characters[parentId]
                  let children = (parent.childrenIds || []).slice()
                  if (children.indexOf(childId) < 0) {
                    children.push(childId)
                    try {
                      daapi.updateCharacter({ characterId: parentId, character: { childrenIds: children } })
                      parent.childrenIds = children
                      return true
                    } catch (err) {
                      console.warn(err)
                    }
                  }
                  return false
                },
        connectCharacterThroughCollateralBranch(society, state, house, root, characterId, rootFatherId, rootMotherId) {
                  if (!society || !state || !state.characters || !characterId || !rootFatherId || !rootMotherId) {
                    return false
                  }
                  let character = state.characters[characterId]
                  if (!character || character.isDead) {
                    return false
                  }
                  character.id = character.id || characterId
                  let rootParent = state.characters[rootFatherId] || state.characters[rootMotherId]
                  let grandFatherId = rootParent && rootParent.fatherId
                  let grandMotherId = rootParent && rootParent.motherId
                  if (!grandFatherId || !grandMotherId) {
                    return this.connectCharacterToParents(state, characterId, rootFatherId, rootMotherId)
                  }
                  let branchParentId = this.generateCollateralGhostParent(society, state, character, house, grandFatherId, grandMotherId)
                  if (!branchParentId) {
                    return false
                  }
                  let otherParentId = this.generateGhostParent(society, state, character, !this.characterIsMale(state.characters[branchParentId]), branchParentId)
                  let fatherId = this.characterIsMale(state.characters[branchParentId]) ? branchParentId : otherParentId
                  let motherId = this.characterIsMale(state.characters[branchParentId]) ? otherParentId : branchParentId
                  this.linkParentPair(state, fatherId, motherId)
                  return this.connectCharacterToParents(state, characterId, fatherId, motherId)
                },
        generateCollateralGhostParent(society, state, child, house, grandFatherId, grandMotherId) {
                  let isMale = Math.random() > 0.5
                  let childBirthYear = parseInt(child.birthYear || state.year || 0, 10)
                  let birthYear = childBirthYear - this.randomInt(20, 34)
                  let deathYear = Math.max(childBirthYear, Math.min(state.year || childBirthYear, childBirthYear + this.randomInt(5, 28)))
                  let deathCause = this.ghostDeathCause(birthYear, deathYear)
                  let parentId = daapi.generateCharacter({
                    characterFeatures: {
                      gender: isMale ? 'male' : 'female',
                      isMale,
                      praenomen: isMale ? this.pick(this.maleNames) : this.pick(this.femaleNames),
                      birthMonth: this.randomInt(0, 11),
                      birthYear,
                      deathMonth: this.randomInt(0, 11),
                      deathYear,
                      isDead: true,
                      deathCause,
                      look: this.inheritedVanillaLook(isMale, state.characters[grandMotherId] || child, state.characters[grandFatherId] || child, 'collateral-parent-' + child.id),
                      corSocietyGenerated: true,
                      corSocietyGhostParent: true,
                      corSocietyCollateralAncestor: true,
                      corSocietyGeneratedConnector: true,
                      flagDoNotCull: true,
                      fatherId: grandFatherId,
                      motherId: grandMotherId,
                      childrenIds: [child.id]
                    },
                    dynastyFeatures: this.dynastyFeaturesForHouse(house, state)
                  })
                  try {
                    daapi.updateCharacter({
                      characterId: parentId,
                      character: {
                        dynastyId: child.dynastyId || this.gameDynastyIdForHouse(house),
                        corSocietyHouseId: child.corSocietyHouseId || (house && house.id),
                        isDead: true,
                        deathCause,
                        corSocietyGenerated: true,
                        corSocietyGhostParent: true,
                        corSocietyCollateralAncestor: true,
                        corSocietyGeneratedConnector: true,
                        fatherId: grandFatherId,
                        motherId: grandMotherId,
                        childrenIds: [child.id],
                        flagDoNotCull: true
                      }
                    })
                    this.addChildToParent(state, grandFatherId, parentId)
                    this.addChildToParent(state, grandMotherId, parentId)
                  } catch (err) {
                    console.warn(err)
                  }
                  society.generatedCharacterIds = society.generatedCharacterIds || []
                  if (society.generatedCharacterIds.indexOf(parentId) < 0) {
                    society.generatedCharacterIds.push(parentId)
                  }
                  return parentId
                },
        sharesAncestorWithin(state, firstId, secondId, depthLimit) {
                  let first = this.ancestorSet(state, firstId, depthLimit || 4)
                  let second = this.ancestorSet(state, secondId, depthLimit || 4)
                  for (let id in first) {
                    if (first.hasOwnProperty(id) && second[id]) {
                      return true
                    }
                  }
                  return false
                },
        ancestorSet(state, characterId, depthLimit, seen) {
                  seen = seen || {}
                  if (!state || !state.characters || !characterId || depthLimit <= 0) {
                    return seen
                  }
                  let queue = [{ id: characterId, depth: depthLimit }]
                  while (queue.length) {
                    let item = queue.shift()
                    let character = state.characters[item.id]
                    if (!character || item.depth <= 0) {
                      continue
                    }
                    ;[character.fatherId, character.motherId].forEach((parentId) => {
                      if (parentId && state.characters[parentId] && !seen[parentId]) {
                        seen[parentId] = true
                        queue.push({ id: parentId, depth: item.depth - 1 })
                      }
                    })
                  }
                  return seen
                },
        normalizeGeneratedPeople(society, state) {
                  if (society.generatedNormalizationVersion === this.version) {
                    return
                  }
                  let ids = (society.generatedCharacterIds || []).slice()
                  ids.forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character) {
                      return
                    }
                    let patch = {
                      corSocietyGenerated: true,
                      flagDoNotCull: true
                    }
                    if (character.corSocietyHouseId && society.houses && society.houses[character.corSocietyHouseId]) {
                      let house = society.houses[character.corSocietyHouseId]
                      let dynastyId = this.gameDynastyIdForHouse(house)
                      // Nobody joins the player's gens this way: a generated bride living in the player's
                      // house keeps her own (in the game a spouse never changes gens), or her children
                      // would be born with an adoption agnomen of their own gens ('Tullianus').
                      if (dynastyId && character.dynastyId !== dynastyId && String(dynastyId) !== String(this.currentCharacterDynastyId(state) || '')) {
                        patch.dynastyId = dynastyId
                      }
                    }
                    try {
                      daapi.updateCharacter({
                        characterId,
                        character: patch
                      })
                    } catch (err) {
                      console.warn(err)
                    }
                  })
                  society.generatedNormalizationVersion = this.version
                },
        ensureGeneratedParentPair(society, state, child) {
                  if (!child || !child.id) {
                    return { fatherId: '', motherId: '' }
                  }
                  let fatherId = child.fatherId && state.characters && state.characters[child.fatherId] ? child.fatherId : ''
                  let motherId = child.motherId && state.characters && state.characters[child.motherId] ? child.motherId : ''
                  if (!fatherId && !motherId) {
                    fatherId = this.generateGhostParent(society, state, child, true)
                    motherId = this.generateGhostParent(society, state, child, false, fatherId)
                    this.linkParentPair(state, fatherId, motherId)
                  } else if (!fatherId) {
                    fatherId = this.generateGhostParent(society, state, child, true, motherId)
                    this.linkParentPair(state, fatherId, motherId)
                  } else if (!motherId) {
                    motherId = this.generateGhostParent(society, state, child, false, fatherId)
                    this.linkParentPair(state, fatherId, motherId)
                  } else {
                    // Both parents already exist: still make sure they are coupled to each other so
                    // the vanilla family tree renders them as one couple instead of splitting the
                    // family into two separate trees. linkParentPair will not break a real living
                    // marriage (see canRelinkGeneratedSpouse).
                    this.linkParentPair(state, fatherId, motherId)
                  }
                  return { fatherId, motherId }
                },
        canRelinkGeneratedSpouse(character, desiredSpouseId, state) {
                  // Decide whether it is safe to point this character's spouseId at desiredSpouseId.
                  // A character is "owned" (safe to set/replace) only if it is a dead ancestor or a
                  // mod-generated ghost connector. LIVING characters (real OR generated) are never
                  // touched, so we never fabricate or overwrite a living marriage.
                  if (!character) {
                    return true
                  }
                  if (character.spouseId && String(character.spouseId) === String(desiredSpouseId)) {
                    return true
                  }
                  let owned = !!(character.isDead || character.corSocietyGhostParent || character.corSocietyGeneratedConnector)
                  if (!character.spouseId) {
                    // Empty link: only fill it for dead ancestors / ghost connectors. Never fabricate
                    // a spouse for a living character (real or generated) who simply has none.
                    return owned
                  }
                  // Stale link to a character that no longer exists: safe to repair.
                  if (state && state.characters && !state.characters[character.spouseId]) {
                    return true
                  }
                  // Different, existing spouse: only dead ancestors / ghost connectors may be recoupled.
                  return owned
                },
        linkParentPair(state, fatherId, motherId) {
                  if (!fatherId || !motherId || !state || !state.characters) {
                    return false
                  }
                  if (String(fatherId) === String(motherId)) {
                    return false
                  }
                  let father = state.characters[fatherId]
                  let mother = state.characters[motherId]
                  if (!father || !mother) {
                    return false
                  }
                  // ATOMIC: only form the couple if BOTH sides can be safely linked. This prevents a
                  // one-directional / fake marriage (e.g. a dead generated parent claiming a living
                  // character as its spouse while that living character stays married to someone
                  // else), which is what made the vanilla tree render the same person several times.
                  if (!this.canRelinkGeneratedSpouse(father, motherId, state) || !this.canRelinkGeneratedSpouse(mother, fatherId, state)) {
                    return false
                  }
                  let changed = false
                  if (String(father.spouseId || '') !== String(motherId)) {
                    try {
                      daapi.updateCharacter({ characterId: fatherId, character: { spouseId: motherId } })
                      father.spouseId = motherId
                      changed = true
                    } catch (err) {
                      console.warn(err)
                    }
                  }
                  if (String(mother.spouseId || '') !== String(fatherId)) {
                    try {
                      daapi.updateCharacter({ characterId: motherId, character: { spouseId: fatherId } })
                      mother.spouseId = fatherId
                      changed = true
                    } catch (err) {
                      console.warn(err)
                    }
                  }
                  return changed
                },
        isSelfAncestor(state, id) {
                  // Returns true if `id` appears among its own ancestors (a corrupt parent cycle).
                  if (!state || !state.characters || !id || !state.characters[id]) {
                    return false
                  }
                  let target = String(id)
                  let seen = {}
                  let start = state.characters[id]
                  let queue = [start.fatherId, start.motherId].filter(Boolean).map(String)
                  let guard = 0
                  while (queue.length && guard < 400) {
                    guard += 1
                    let pid = String(queue.shift())
                    if (!pid || seen[pid]) {
                      continue
                    }
                    if (pid === target || this.sameCharacterId(pid, target)) {
                      return true
                    }
                    seen[pid] = true
                    let parent = state.characters[pid]
                    if (parent) {
                      if (parent.fatherId) queue.push(String(parent.fatherId))
                      if (parent.motherId) queue.push(String(parent.motherId))
                    }
                  }
                  return false
                },
        repairFamilyLinkIntegrity(society, state) {
                  // Conservative invariant repair for mod-owned characters. Fixes the asymmetric /
                  // self-referential links that the over-aggressive 1.1.322 coupling could create in
                  // existing saves (the cause of a character appearing several times in the vanilla
                  // tree). It only ever edits characters the mod generated; it never edits a living
                  // real character and never touches the OTHER side of a link.
                  if (!society || !state || !state.characters) {
                    return 0
                  }
                  let ids = this.uniqueIds([].concat(society.generatedCharacterIds || [], society.playerTreeGeneratedLivingIds || []))
                  let repaired = 0
                  for (let i = 0; i < ids.length && repaired < 60; i++) {
                    let id = ids[i]
                    let character = state.characters[id]
                    if (!character) {
                      continue
                    }
                    character.id = character.id || id
                    let patch = {}
                    if (character.fatherId && this.sameCharacterId(character.fatherId, id)) {
                      patch.fatherId = null
                    }
                    if (character.motherId && this.sameCharacterId(character.motherId, id)) {
                      patch.motherId = null
                    }
                    if (character.spouseId && this.sameCharacterId(character.spouseId, id)) {
                      patch.spouseId = null
                    } else if (character.spouseId && !state.characters[character.spouseId]) {
                      patch.spouseId = null
                    } else if (character.spouseId) {
                      let partner = state.characters[character.spouseId]
                      // Non-mutual spouse link: the partner does not point back. Clear ONLY our side
                      // (the fake claim 1.1.322 may have written). Never edit the partner.
                      // Never sever a link that touches the player's own living family: a transient
                      // mismatch there would drop the spouse from the household on the next tick.
                      let partnerIsPlayerFamily = !!(state.current && (state.current.householdCharacterIds || []).some((hid) => this.sameCharacterId(hid, character.spouseId) || this.sameCharacterId(hid, id)))
                      if (partner && String(partner.spouseId || '') !== String(id) && !partnerIsPlayerFamily) {
                        patch.spouseId = null
                      }
                    }
                    // Ancestor cycle: if this character is its own ancestor (corrupt data), detach its
                    // parent links so the family graph is acyclic. A vanilla family tree has no cycle
                    // guard, so such a cycle would make it render the same person repeatedly.
                    if (this.isSelfAncestor && this.isSelfAncestor(state, id)) {
                      patch.fatherId = null
                      patch.motherId = null
                    }
                    if (Object.keys(patch).length) {
                      try {
                        daapi.updateCharacter({ characterId: id, character: patch })
                        if (Object.prototype.hasOwnProperty.call(patch, 'fatherId')) character.fatherId = null
                        if (Object.prototype.hasOwnProperty.call(patch, 'motherId')) character.motherId = null
                        if (Object.prototype.hasOwnProperty.call(patch, 'spouseId')) character.spouseId = null
                        repaired += 1
                      } catch (err) {
                        console.warn(err)
                      }
                    }
                  }
                  return repaired
                },
        ghostDeathCause(birthYear, deathYear) {
                  let age = parseInt(deathYear || 0, 10) - parseInt(birthYear || 0, 10)
                  if (age >= 62) return 'old age'
                  if (age >= 40) return 'illness'
                  return this.pick(['fever', 'accident', 'illness'])
                },
        generateGhostCoParent(society, state, house, partner, isMale, childAge) {
                  if (!partner || !partner.id) {
                    return ''
                  }
                  childAge = Math.max(0, Math.min(40, parseInt(childAge || 0, 10)))
                  let childBirthYear = parseInt((state.year || 0) - childAge, 10)
                  let partnerBirthYear = parseInt(partner.birthYear || childBirthYear - this.randomInt(20, 34), 10)
                  let birthYear = childBirthYear - this.randomInt(18, 34)
                  if (partnerBirthYear && Math.abs(birthYear - partnerBirthYear) > 14) {
                    birthYear = partnerBirthYear + this.randomInt(-8, 8)
                  }
                  birthYear = Math.min(birthYear, childBirthYear - 16)
                  let deathYear = Math.max(childBirthYear, Math.min(state.year || childBirthYear, childBirthYear + this.randomInt(1, 24)))
                  let dynastyId = (house && this.gameDynastyIdForHouse(house)) || partner.dynastyId || ''
                  let houseId = (house && house.id) || partner.corSocietyHouseId || ''
                  let deathCause = this.ghostDeathCause(birthYear, deathYear)
                  let parentId = daapi.generateCharacter({
                    characterFeatures: {
                      gender: isMale ? 'male' : 'female',
                      isMale,
                      praenomen: isMale ? this.pick(this.maleNames) : this.pick(this.femaleNames),
                      birthMonth: this.randomInt(0, 11),
                      birthYear,
                      deathMonth: this.randomInt(0, 11),
                      deathYear,
                      isDead: true,
                      deathCause,
                      look: this.generatedVanillaLook(isMale, 'ghost-coparent-' + partner.id + '-' + childBirthYear),
                      corSocietyGenerated: true,
                      corSocietyGhostParent: true,
                      corSocietyGeneratedConnector: true,
                      corSocietyGhostCoParent: true,
                      corSocietyHouseId: houseId,
                      flagDoNotCull: true,
                      childrenIds: [],
                      spouseId: partner.id
                    },
                    dynastyFeatures: house ? this.dynastyFeaturesForHouse(house, state) : this.dynastyFeaturesForCharacter(partner, state)
                  })
                  try {
                    daapi.updateCharacter({
                      characterId: parentId,
                      character: {
                        dynastyId,
                        corSocietyHouseId: houseId,
                        isDead: true,
                        deathCause,
                        corSocietyGenerated: true,
                        corSocietyGhostParent: true,
                        corSocietyGeneratedConnector: true,
                        corSocietyGhostCoParent: true,
                        childrenIds: [],
                        spouseId: partner.id,
                        flagDoNotCull: true
                      }
                    })
                    if (!partner.spouseId) {
                      daapi.updateCharacter({ characterId: partner.id, character: { spouseId: parentId } })
                      partner.spouseId = parentId
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                  society.generatedCharacterIds = society.generatedCharacterIds || []
                  if (society.generatedCharacterIds.indexOf(parentId) < 0) {
                    society.generatedCharacterIds.push(parentId)
                  }
                  return parentId
                },
        generateGhostParent(society, state, child, isMale, spouseId) {
                  let childBirthYear = parseInt(child.birthYear || state.year || 0, 10)
                  let parentAgeAtBirth = this.randomInt(19, 34)
                  let birthYear = childBirthYear - parentAgeAtBirth
                  let minDeathYear = birthYear + this.randomInt(42, 68)
                  let currentYear = state.year || minDeathYear
                  let deathYear = Math.max(childBirthYear, Math.min(currentYear, Math.max(minDeathYear, childBirthYear + this.randomInt(8, 30))))
                  let deathCause = this.ghostDeathCause(birthYear, deathYear)
                  let parentId = daapi.generateCharacter({
                    characterFeatures: {
                      gender: isMale ? 'male' : 'female',
                      isMale,
                      praenomen: isMale ? this.pick(this.maleNames) : this.pick(this.femaleNames),
                      birthMonth: this.randomInt(0, 11),
                      birthYear,
                      deathMonth: this.randomInt(0, 11),
                      deathYear,
                      isDead: true,
                      deathCause,
                      look: this.inheritedVanillaLook(isMale, child, child, 'ghost-parent-' + child.id + '-' + (isMale ? 'father' : 'mother')),
                      corSocietyGenerated: true,
                      corSocietyGhostParent: true,
                      corSocietyGeneratedConnector: true,
                      corSocietyHouseId: child.corSocietyHouseId || '',
                      flagDoNotCull: true,
                      childrenIds: [child.id],
                      spouseId: spouseId || ''
                    },
                    dynastyFeatures: this.dynastyFeaturesForCharacter(child, state)
                  })
                  try {
                    daapi.updateCharacter({
                      characterId: parentId,
                      character: {
                        dynastyId: child.dynastyId,
                        corSocietyHouseId: child.corSocietyHouseId || '',
                        isDead: true,
                        deathCause,
                        corSocietyGenerated: true,
                        corSocietyGhostParent: true,
                        corSocietyGeneratedConnector: true,
                        childrenIds: [child.id],
                        spouseId: spouseId || ''
                      }
                    })
                  } catch (err) {
                    console.warn(err)
                  }
                  society.generatedCharacterIds = society.generatedCharacterIds || []
                  if (society.generatedCharacterIds.indexOf(parentId) < 0) {
                    society.generatedCharacterIds.push(parentId)
                  }
                  return parentId
                },
        ensureGeneratedLooks(society, state) {
                  let generatedIds = society.generatedCharacterIds || []
                  generatedIds.forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character || character.isDead) {
                      return
                    }
                    let look = character.look || {}
                    if (look.group && look.type) {
                      return
                    }
                    let newLook = this.generatedVanillaLook(this.characterIsMale(character), characterId + '-' + (character.dynastyId || ''))
                    try {
                      daapi.updateCharacter({
                        characterId,
                        character: {
                          look: newLook,
                          flagDoNotCull: true
                        }
                      })
                      character.look = newLook
                      character.flagDoNotCull = true
                      try {
                        daapi.forceUpdateCharacterDisplay({ characterId })
                      } catch (displayErr) {
                        console.warn(displayErr)
                      }
                    } catch (err) {
                      console.warn(err)
                    }
                  })
                },
        restoreSocietyPortraitLooks(state) {
                  this.repairUnsafeWardrobeLooks(state)
                },
        cloneWardrobeLook(look) {
                  look = look || {}
                  try {
                    return JSON.parse(JSON.stringify(look))
                  } catch (err) {
                    return { ...look }
                  }
                },
        repairUnsafeWardrobeLooks(state) {
                  if (!state || !state.characters) {
                    return
                  }
                  if (state._corSocietyWardrobeRepaired) {
                    return
                  }
                  state._corSocietyWardrobeRepaired = true
                  for (let characterId in state.characters) {
                    if (!state.characters.hasOwnProperty(characterId)) {
                      continue
                    }
                    let character = state.characters[characterId]
                    if (!character || !character.look) {
                      continue
                    }
                    let lookGroup = character.look.group || ''
                    if (lookGroup !== 'cor_society' && lookGroup !== this.wardrobeLookGroup) {
                      continue
                    }
                    character.id = character.id || characterId
                    this.restoreOriginalLookIfNeeded(character, true, true)
                  }
                },
        originalLookForWardrobe(character) {
                  if (!character) {
                    return {}
                  }
                  if (character.corSocietyOriginalLook && character.corSocietyOriginalLook.group && character.corSocietyOriginalLook.type) {
                    return this.cloneWardrobeLook(character.corSocietyOriginalLook)
                  }
                  let look = character.look || {}
                  if (look.group === this.wardrobeLookGroup || look.group === 'cor_society') {
                    return {
                      group: 'roman',
                      type: 'brown'
                    }
                  }
                  return this.cloneWardrobeLook(look)
                },
        applyWardrobeLookToCharacter(character, outfit, state, silent) {
                  if (!character || !character.id || !outfit || outfit === 'auto') {
                    return false
                  }
                  state = state || daapi.getState()
                  if (character.look && (character.look.group === this.wardrobeLookGroup || character.look.group === 'cor_society')) {
                    this.restoreOriginalLookIfNeeded(character, true, true)
                  }
                  character.corSocietyOutfit = outfit
                  character.corSocietyOriginalLook = null
                  if (silent) {
                    return true
                  }
                  try {
                    daapi.updateCharacter({
                      characterId: character.id,
                      character: {
                        corSocietyOriginalLook: null,
                        corSocietyOutfit: outfit
                      }
                    })
                  } catch (err) {
                    console.warn(err)
                  }
                  return true
                },
        wardrobePortraitDataUri(character, state, outfit, originalLook, gender, ageStage) {
                  let baseCharacter = {
                    ...character,
                    gender,
                    isMale: gender === 'male',
                    corSocietyOutfit: '',
                    look: {
                      ...this.cloneWardrobeLook(originalLook || {}),
                      gender,
                      ageStage
                    }
                  }
                  let basePortrait = this.vanillaCharacterPortrait(baseCharacter, state) || this.defaultDetailedRomanPortrait(gender, ageStage) || this.genericVanillaCharacterPortrait(baseCharacter, state)
                  let inlinePortrait = this.inlineImageHref(basePortrait)
                  let baseSvg = this.svgTextFromDataUri(inlinePortrait)
                  if (!baseSvg) {
                    if (basePortrait) {
                      return basePortrait
                    }
                    return this.genericVanillaCharacterPortrait(baseCharacter, state) || this.defaultDetailedRomanPortrait(gender, ageStage)
                  }
                  let role = this.characterPortraitRole(character, ageStage, this.playerStratum(state))
                  return this.svgDataUri(this.recolorWardrobeSvgText(baseSvg, outfit, gender, ageStage, role))
                },
        defaultDetailedRomanPortrait(gender, ageStage) {
                  gender = gender === 'female' ? 'female' : 'male'
                  ageStage = ageStage || 'adult'
                  return this.vanillaPortraitAsset('icons/characters/roman/brown/' + gender + '/' + ageStage + '.svg')
                },
        restoreOriginalLookIfNeeded(character, includeGenerated, keepOutfit) {
                  if (!character || (!includeGenerated && character.corSocietyGenerated)) {
                    return
                  }
                  let update = {
                    corSocietyOriginalLook: null,
                    corSocietyOutfit: keepOutfit ? (character.corSocietyOutfit || '') : ''
                  }
                  let originalLook = character.corSocietyOriginalLook
                  let hasUnsafeLook = !!(character.look && (character.look.group === this.wardrobeLookGroup || character.look.group === 'cor_society'))
                  if (hasUnsafeLook && (!originalLook || !originalLook.group || !originalLook.type)) {
                    originalLook = {
                      group: 'roman',
                      type: 'brown'
                    }
                  }
                  if (hasUnsafeLook && originalLook && originalLook.group && originalLook.type) {
                    character.look = this.cloneWardrobeLook(originalLook)
                    update.look = this.cloneWardrobeLook(originalLook)
                  }
                  character.corSocietyOriginalLook = null
                  if (!keepOutfit) {
                    delete character.corSocietyOutfit
                  }
                  try {
                    daapi.updateCharacter({
                      characterId: character.id,
                      character: update
                    })
                  } catch (err) {
                    console.warn(err)
                  }
                },
        societyLookType(character) {
                  return 'c_' + this.safeId(character.id || character.charHash || character.praenomen || 'unknown')
                },
        houseForPortraitCharacter(character, society) {
                  if (!character || !society || !society.houses) {
                    return false
                  }
                  if (this.resolveCharacterHouseId) {
                    let state = daapi.getState()
                    let houseId = this.resolveCharacterHouseId(character, state, society, { repair: false })
                    if (houseId && society.houses[houseId]) {
                      return society.houses[houseId]
                    }
                  }
                  if (character.corSocietyHouseId && society.houses[character.corSocietyHouseId]) {
                    return society.houses[character.corSocietyHouseId]
                  }
                  if (character.dynastyId && society.houses[character.dynastyId]) {
                    return society.houses[character.dynastyId]
                  }
                  return false
                },
        allowAchievementsWithSociety(state) {
                  try {
                    if (!state || !state.current) {
                      return
                    }
                    if (state.current.flagUsedMods) {
                      state.current.flagUsedMods = false
                      state.current.flagSocietyAllowedAchievementsWithMods = true
                    }
                    if (state.settings) {
                      state.settings.enableAPIAchievements = true
                    }
                    this.invalidateStateSnapshot()
                  } catch (err) {
                    console.warn(err)
                  }
                },
        classifyHouse(dynasty, members, strength, hasSenate) {
                  let heritage = this.normalizedHeritage(dynasty.heritage || '')
                  let prestige = parseFloat(dynasty.prestige || 0)
                  let hasEliteJob = members.some((character) => ['lawyer', 'rhetor', 'physician', 'trader'].indexOf(character.job) >= 0 && parseFloat(character.jobLevel || 0) >= 5)
                  let hasLabor = members.some((character) => character.job === 'labourer')
                  if (hasSenate || heritage === 'roman_patrician' || prestige >= 75000 || strength >= 95) {
                    return 'senatorial'
                  }
                  if (prestige >= 25000 || strength >= 55 || hasEliteJob) {
                    return 'equestrian'
                  }
                  if (prestige >= 8000 || strength >= 30) {
                    return 'civic'
                  }
                  if (heritage === 'roman_freedman') {
                    return prestige < 500 || (prestige < 1200 && hasLabor) ? 'poor' : 'freedmen'
                  }
                  if (heritage === 'roman_plebeian' && prestige >= 1200) {
                    return 'plebeian'
                  }
                  if (prestige < 1200 || strength < 12 || (hasLabor && prestige < 1800)) {
                    return 'poor'
                  }
                  return 'plebeian'
                },
        isSenatorialCharacter(character, state) {
                  if (!character) {
                    return false
                  }
                  let job = character.job || ''
                  let traits = character.traits || []
                  if (['senator', 'consul', 'praetor', 'pretor', 'quaestor', 'aedile'].indexOf(job) >= 0) {
                    return true
                  }
                  if (traits.indexOf('senator') >= 0 || traits.indexOf('formerQuaestor') >= 0 || traits.indexOf('formerPraetor') >= 0) {
                    return true
                  }
                  let senate = (state.current && state.current.senate) || {}
                  for (let office in senate) {
                    if (senate.hasOwnProperty(office) && (senate[office] || []).indexOf(character.id) >= 0) {
                      return true
                    }
                  }
                  return false
                },
        rankFromStrength(strength) {
                  if (strength >= 95) return 'Class I'
                  if (strength >= 65) return 'Class II'
                  if (strength >= 40) return 'Class III'
                  if (strength >= 22) return 'Class IV'
                  if (strength >= 10) return 'Class V'
                  return 'Capite censi'
                },
        characterScore(character, state) {
                  if (!character) return 0
                  let month = this.monthKey(state || daapi.getState())
                  if (character._scoreCache && character._scoreCache.month === month) {
                    return character._scoreCache.value
                  }
                  let age = this.age(character, state)
                  let score = (parseFloat(character.inheritance || 0) / 100) +
                    (parseFloat(character.jobLevel || 0) * 8) +
                    (((character.traits || []).length || 0) * 3) +
                    (age >= 16 ? 10 : 0) +
                    ((character.job || '') ? 12 : 0)
                  character._scoreCache = { month, value: score }
                  return score
                },
        houseName(dynasty, dynastyId) {
                  let nomen = dynasty.nomen || ''
                  let cognomen = dynasty.cognomen || ''
                  let name = (nomen + ' ' + cognomen).replace(/\s+/g, ' ').trim()
                  return name || String(dynastyId || 'Unknown House')
                },
        age(character, state) {
                  if (!character) return 0
                  let month = this.monthKey(state || daapi.getState())
                  if (character._ageCache && character._ageCache.month === month) {
                    return character._ageCache.value
                  }
                  let value = 0
                  try {
                    value = daapi.calculateAge({ month: character.birthMonth, year: character.birthYear })
                  } catch (err) {
                    value = ((state && state.year) || character.birthYear || 0) - (character.birthYear || 0)
                  }
                  character._ageCache = { month, value }
                  return value
                },
        formatAge(character, state) {
                  let age = this.age(character || {}, state || daapi.getState())
                  if (!isFinite(age)) {
                    return 'unknown'
                  }
                  if (age < 1) {
                    return Math.max(0, Math.round(age * 12)) + ' months'
                  }
                  return String(Math.floor(age))
                },
        countByStratum(society) {
                  let counts = {}
                  let dynasties = this.sortedDynasties(society)
                  if (dynasties.length) {
                    dynasties.forEach((dynasty) => {
                      let house = this.primaryHouseForDynasty(society, dynasty.id) || {}
                      let stratum = dynasty.stratum || house.stratum || 'plebeian'
                      counts[stratum] = (counts[stratum] || 0) + 1
                    })
                  } else {
                    for (let houseId in society.houses) {
                      if (!society.houses.hasOwnProperty(houseId)) {
                        continue
                      }
                      let stratum = society.houses[houseId].stratum || 'plebeian'
                      counts[stratum] = (counts[stratum] || 0) + 1
                    }
                  }
                  return counts
                }
      })
      window.corSociety._mixinCorSocietyPeopleGenerationVersion = '1.1.331'
    }
  }
}
