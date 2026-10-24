{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyRosterOverlays() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyRosterOverlaysVersion === '1.1.331') {
        return
      }
      Object.assign(window.corSociety, {
        houseMemberGroups(house, state) {
                  let groups = {
                    notable: [],
                    established: [],
                    common: [],
                    slaves: []
                  }
                  // Members must reflect the same people the house family tree shows (minus
                  // external "guest" spouses, who belong to their own house). The tree resolves
                  // membership more broadly than house.memberIds, so seed the candidate list from
                  // the tree model and merge it with the cached visible members.
                  let candidateIds = this.visibleHousePeople(house, state).slice()
                  if (this.buildHouseTreeModel) {
                    let society = this.load()
                    let model = this.buildHouseTreeModel(society, state, house, '')
                    ;(model.memberIds || []).forEach((characterId) => {
                      let character = state.characters[characterId]
                      if (character && !character.isDead && !this.isSlaveCharacter(character, house)) {
                        candidateIds.push(characterId)
                      }
                    })
                  }
                  let ids = candidateIds
                    .filter((characterId, index, list) => list.indexOf(characterId) === index && state.characters[characterId])
                    .sort((a, b) => this.characterScore(state.characters[b], state) - this.characterScore(state.characters[a], state))
                  ids.forEach((characterId, index) => {
                    let character = state.characters[characterId]
                    character.id = character.id || characterId
                    groups[this.memberCategoryFor(character, state, house, index)].push(characterId)
                  })
                  if (!groups.notable.length && ids.length) {
                    let source = groups.established.length ? groups.established : groups.common
                    if (source.length) {
                      groups.notable.push(source.shift())
                    }
                  }
                  return groups
                },
        memberCategoryFor(character, state, house, index) {
                  if (this.isSlaveCharacter(character, house)) {
                    return 'slaves'
                  }
                  let age = this.age(character, state)
                  let traits = character.traits || []
                  let score = this.characterScore(character, state)
                  let jobLevel = parseFloat(character.jobLevel || 0)
                  let notableTraits = ['senator', 'formerQuaestor', 'formerPraetor', 'formerConsul', 'erudite', 'oratorDeliberative', 'oratorJudicial', 'authoritative', 'ambitious']
                  if (
                    index === 0 ||
                    this.isSenatorialCharacter(character, state) ||
                    score >= 65 ||
                    jobLevel >= 6 ||
                    notableTraits.some((trait) => traits.indexOf(trait) >= 0)
                  ) {
                    return 'notable'
                  }
                  if (
                    age >= 16 &&
                    (score >= 25 || character.job || jobLevel >= 2 || character.spouseId || (character.childrenIds || []).length)
                  ) {
                    return 'established'
                  }
                  return 'common'
                },
        memberGroupLabel(group) {
                  if (group === 'notable') return 'Notables'
                  if (group === 'established') return 'Established members'
                  if (group === 'slaves') return 'Enslaved dependants'
                  return 'Common kin'
                },
        memberGroupDescription(group) {
                  if (group === 'notable') return 'Heads, senators, office-holders, patrons, and high-skill public figures.'
                  if (group === 'established') return 'Adult relatives with work, marriage ties, property weight, or household standing.'
                  if (group === 'slaves') return 'Real generated household slaves and poor dependants attached to this house. They can work, age, die, be freed, or affect household fortunes.'
                  return 'Children, young dependants, laboring relatives, and low-profile members of the dynasty.'
                },
        memberGroupIcon(group) {
                  if (group === 'notable') return this.affairIcon('prestige')
                  if (group === 'established') return this.affairIcon('support')
                  if (group === 'slaves') return this.slaveTypeIcon('manager')
                  return this.affairIcon('familyTree')
                },
        vanillaCharacterActions(character) {
                  let actions = { ...((character && character.actions) || {}) }
                  this.bundledCharacterActions(character).forEach((item) => {
                    if (item && item.key && item.action && !actions[item.key]) {
                      actions[item.key] = item.action
                    }
                  })
                  return Object.keys(actions).map((key) => {
                    return { key, action: actions[key] }
                  }).filter((item) => item.action && typeof item.action === 'object' && !item.action.hideInCharacterActions && !this.isHiddenVanillaFamilyTreeAction(item) && !this.isHiddenLegacyCharacterAction(item))
                },
        isHiddenLegacyCharacterAction(item) {
          // Theft is now a house-targeted crime in "Crimes, courts, and prison", not a
          // per-character action. Hide any legacy per-character "Steal from" action that
          // may still be persisted on a character or cached from an older mod version, so
          // the only bundled per-character actions remain Play As and Attempt Murder.
          if (!item) {
            return false
          }
          if (String(item.key || '') === 'cor_society_stealing_from') {
            return true
          }
          let action = item.action || {}
          let haystacks = [
            item.key,
            action.title,
            action.process && (action.process.method || action.process.path),
            action.action && (action.action.method || action.action.path)
          ].map((value) => String(value || '').toLowerCase())
          return haystacks.some((value) => value.indexOf('stealingfrom') >= 0 || value.indexOf('steal from') >= 0)
        },
        isHiddenVanillaFamilyTreeAction(item) {
                  // The vanilla "Known Family Tree" screen does not render Society's generated kin
                  // correctly, so we hide it from the Society "Vanilla / other mods actions" list.
                  // The player uses the Society House / Dynasty trees instead. (Only the Known tree
                  // is hidden; other vanilla family/tree actions are left untouched.)
                  if (!item) {
                    return false
                  }
                  let action = item.action || {}
                  let haystacks = [
                    item.key,
                    action.title,
                    action.tooltip,
                    action.process && (action.process.path || action.process.route || action.process.hash || action.process.method),
                    action.action && (action.action.path || action.action.route || action.action.hash || action.action.method)
                  ].map((value) => String(value || '').toLowerCase())
                  return haystacks.some((value) => value.indexOf('knownfamily') >= 0 || value.indexOf('known family') >= 0)
                },
        bundledCharacterActions(character) {
                  let state = daapi.getState()
                  let currentId = state && state.current && state.current.id
                  let characterId = character && character.id
                  if (!character || !characterId) {
                    return []
                  }
                  let items = []
                  let isCurrent = characterId === currentId
                  let age = this.age(character, state)
                  if (!isCurrent && !character.isDead) {
                    items.push({
                      key: 'play_as',
                      action: {
                        title: 'Play As',
                        icon: daapi.requireImage('/cor_society/bundled/play_as/switch.svg'),
                        isAvailable: true,
                        hideWhenBusy: false,
                        process: {
                          event: '/cor_society/bundled/play_as/main',
                          method: 'process',
                          context: { characterId }
                        }
                      }
                    })
                  }
                  let currentPlotTarget = currentId ? this.safeCharacterFlag(currentId, 'mod_murder_startedPlotOnTarget') : false
                  if (!isCurrent && !character.isDead && age > 15 && !currentPlotTarget && !this.safeCharacterFlag(characterId, 'mod_murder_plotTarget')) {
                    items.push({
                      key: 'mod_murder_startPlot',
                      action: {
                        title: 'Attempt Murder',
                        icon: daapi.requireImage('/cor_society/bundled/murder/plot.svg'),
                        isAvailable: true,
                        hideWhenBusy: false,
                        process: {
                          event: '/cor_society/bundled/murder/main',
                          method: 'process',
                          context: { characterId }
                        }
                      }
                    })
                  }
                  // Theft is no longer a per-character action; it is now a house-targeted
                  // crime handled from "Crimes, courts, and prison" (openStealTargets).
                  if (isCurrent && currentPlotTarget) {
                    items.push({
                      key: 'mod_murder_cancelPlot',
                      action: {
                        title: 'Stop Plotting Murder',
                        icon: daapi.requireImage('/cor_society/bundled/murder/cancelPlot.svg'),
                        isAvailable: true,
                        hideWhenBusy: false,
                        process: {
                          event: '/cor_society/bundled/murder/main',
                          method: 'cancelPlot'
                        }
                      }
                    })
                  }
                  let householdIds = (state && state.current && state.current.householdCharacterIds) || []
                  let isHousehold = householdIds.indexOf(characterId) >= 0
                  if (isHousehold && !isCurrent && !character.isDead && !character.flagWasGivenInheritance) {
                    items.push({
                      key: 'Disinherit',
                      action: {
                        title: 'Disinherit',
                        icon: daapi.requireImage('/cor_society/bundled/disinheritance/icon.svg'),
                        isAvailable: true,
                        hideWhenBusy: false,
                        process: {
                          event: '/cor_society/bundled/disinheritance/main',
                          method: 'process',
                          context: { characterId }
                        }
                      }
                    })
                  }
                  if (isHousehold && !isCurrent && !character.isDead && character.flagWasGivenInheritance) {
                    items.push({
                      key: 'RestoreInheritance',
                      action: {
                        title: 'Restore Inheritance',
                        icon: daapi.requireImage('/cor_society/bundled/restoreInheritance/icon.svg'),
                        isAvailable: true,
                        hideWhenBusy: false,
                        process: {
                          event: '/cor_society/bundled/restoreInheritance/main',
                          method: 'process',
                          context: { characterId }
                        }
                      }
                    })
                  }
                  return items
                },
        stealingCooldownKey(firstId, secondId) {
                  return 'steal_' + this.relationKey(firstId, secondId)
                },
        stealingFromInfo(society, state, target) {
                  let currentId = this.currentCharacterId(state)
                  let current = state.characters && state.characters[currentId]
                  let targetId = target && target.id
                  let houseId = target ? this.houseIdForCharacter(target, state, society) : ''
                  let house = society.houses && society.houses[houseId]
                  let reason = ''
                  if (!current || !target || !targetId) reason = 'missing character'
                  else if (this.age(current, state) < 16) reason = 'too young'
                  else if (this.sameCharacterId(currentId, targetId)) reason = 'same character'
                  else if (target.isDead) reason = 'dead'
                  else if (!house) reason = 'no target house'
                  else if (target.corSocietySlave || target.corSocietySlaveActive) reason = 'target enslaved'
                  else if (current.dynastyId && target.dynastyId && String(current.dynastyId) === String(target.dynastyId)) reason = 'same dynasty'
                  let cooldown = society.pendingSteals && society.pendingSteals[this.stealingCooldownKey(currentId, targetId)]
                  if (!reason && cooldown && !this.monthKeyReached(cooldown, state)) {
                    reason = 'cooldown until ' + cooldown
                  }
                  let loot = house ? this.stealingLootEstimate(house, target, state) : { label: 'small goods', value: 0 }
                  return {
                    available: !reason,
                    reason,
                    houseId,
                    loot,
                    tooltip: [
                      'Attempt to steal from this character\'s household.',
                      house ? 'Target house: ' + house.name + '.' : '',
                      'Possible gain: ' + loot.label + ', about ' + loot.value + ' cash value.',
                      'If caught: personal relation, house relation, prestige, and influence suffer.',
                      reason ? 'Unavailable: ' + reason + '.' : 'Success depends on stealth, stewardship, combat, target house power, and chosen approach.'
                    ].filter(Boolean).join('\n')
                  }
                },
        stealingLootEstimate(house, target, state) {
                  let property = (house && house.ai && house.ai.property) || {}
                  let score = Math.max(1, Math.round(this.characterScore(target || {}, state) / 12))
                  if ((property.animals || 0) > 0) return { label: 'livestock and tack', value: Math.max(12, Math.round((property.animals || 1) * 18 + score * 4)) }
                  if ((property.trade || 0) > 0) return { label: 'trade goods', value: Math.max(18, Math.round((property.trade || 1) * 45 + score * 5)) }
                  if ((property.land || 0) > 0) return { label: 'estate stores', value: Math.max(15, Math.round((property.land || 1) * 28 + score * 4)) }
                  return { label: 'portable valuables', value: Math.max(8, Math.round((house.wealth || 20) / 20 + score * 4)) }
                },
        startStealingFromCharacter({ houseId, characterId } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let character = state.characters && state.characters[characterId]
                  if (character) character.id = character.id || characterId
                  let info = this.stealingFromInfo(society, state, character)
                  let house = society.houses[houseId || info.houseId]
                  if (!info.available || !house) {
                    this.pushModal({
                      societyMenu: true,
                      title: 'Steal unavailable',
                      message: info.tooltip || 'This target is not available.',
                      image: this.bundledIcon('stealingFrom', 'animalPen'),
                      options: [{ text: 'Back', action: { event: this.event, method: 'openPerson', context: { houseId: houseId || info.houseId, characterId } } }]
                    })
                    return
                  }
                  this.pushModal({
                    societyMenu: true,
                    title: 'Steal from ' + house.name + '?',
                    message: 'Target: ' + this.characterName(character, state) + '\nPossible gain: ' + info.loot.label + ' worth about ' + info.loot.value + ' cash.\nIf you are caught, both the person and the house will remember it.',
                    image: this.bundledIcon('stealingFrom', 'animalPen'),
                    options: [
                      {
                        variant: 'info',
                        text: 'Sneak into stores',
                        tooltip: 'Balanced risk. Better with stewardship and a quiet target house.',
                        icons: [this.affairIcon('trade')],
                        action: { event: this.event, method: 'resolveStealingFromCharacter', context: { houseId: house.id, characterId, approach: 'stores' } }
                      },
                      {
                        variant: 'info',
                        text: 'Take livestock',
                        tooltip: 'Higher gain if the house has animals, but easier to notice.',
                        icons: [this.bundledIcon('stealingFrom', 'animalPen')],
                        action: { event: this.event, method: 'resolveStealingFromCharacter', context: { houseId: house.id, characterId, approach: 'livestock' } }
                      },
                      {
                        variant: 'info',
                        text: 'Bribe a worker',
                        tooltip: 'Lower gain, lower risk, small cash preparation cost.',
                        statChanges: { cash: -this.stealingBribeCost(info.loot.value) },
                        icons: [this.affairIcon('coins')],
                        action: { event: this.event, method: 'resolveStealingFromCharacter', context: { houseId: house.id, characterId, approach: 'bribe', prepCost: this.stealingBribeCost(info.loot.value) } }
                      },
                      {
                        text: 'Leave it',
                        action: { event: this.event, method: 'openPerson', context: { houseId: house.id, characterId } }
                      }
                    ]
                  })
                },
        stealingBribeCost(value) {
                  return Math.max(3, Math.round(Math.max(1, parseFloat(value || 0)) * 0.18 * 0.70))
                },
        resolveStealingFromCharacter({ houseId, characterId, approach } = {}) {
                  let society = this.loadForAction()
                  let state = daapi.getState()
                  let house = society.houses[houseId]
                  let target = state.characters && state.characters[characterId]
                  if (target) target.id = target.id || characterId
                  let info = this.stealingFromInfo(society, state, target)
                  if (!house || !info.available) {
                    this.openPerson({ houseId, characterId })
                    return
                  }
                  let currentId = this.currentCharacterId(state)
                  let current = state.characters && state.characters[currentId]
                  let skills = (current && current.skills) || {}
                  let stealth = parseFloat(skills.stewardship || 0) + parseFloat(skills.combat || 0) * 0.6 + parseFloat(skills.intelligence || 0) * 0.4
                  let difficulty = 28 + Math.max(0, house.power || 0) * 0.35 + Math.max(0, house.stability || 0) * 0.12
                  let value = info.loot.value
                  if (approach === 'livestock') {
                    value = Math.round(value * 1.25)
                    difficulty += 10
                  } else if (approach === 'bribe') {
                    value = Math.round(value * 0.70)
                    difficulty -= 9
                    this.applyStats({ cash: -this.stealingBribeCost(info.loot.value) })
                  }
                  let successChance = this.clamp(0.48 + (stealth - difficulty) / 120, 0.12, 0.82)
                  let success = Math.random() < successChance
                  society.pendingSteals[this.stealingCooldownKey(currentId, characterId)] = this.futureMonthKey(success ? 6 : 9)
                  let caught = !success || Math.random() < (approach === 'livestock' ? 0.28 : approach === 'bribe' ? 0.12 : 0.20)
                  if (success && !caught) {
                    this.applyStats({ cash: value })
                    house.wealth = Math.max(0, (house.wealth || 0) - Math.round(value * 0.45))
                    this.log(society, 'You steal ' + info.loot.label + ' from ' + house.name + ' without being caught.', 'rivalry', house.id)
                    this.save(society)
                    this.pushModal({
                      societyMenu: true,
                      title: 'Theft succeeds',
                      message: 'You get away with ' + info.loot.label + ' worth ' + value + ' cash. No one can prove it was you.',
                      image: this.bundledIcon('stealingFrom', 'animalPen'),
                      options: [{ text: 'Close' }]
                    })
                    return
                  }
                  let personalLoss = caught ? this.randomInt(18, 34) : this.randomInt(8, 16)
                  let houseLoss = caught ? this.randomInt(14, 30) : this.randomInt(4, 10)
                  house.relation = this.clamp((house.relation || 0) - houseLoss, -100, 100)
                  house.heat = (house.heat || 0) + (caught ? 2 : 1)
                  this.changePersonalRelation(society, currentId, characterId, -personalLoss, caught ? 'enemy' : 'resentful')
                  let playerHouseId = this.currentCharacterDynastyId(state)
                  if (playerHouseId && society.houses[playerHouseId]) {
                    this.changeHouseRelation(society, playerHouseId, house.id, -Math.round(houseLoss / 2))
                  }
                  this.applyStats({ prestige: -Math.max(2, Math.round(houseLoss / 3)), influence: -Math.max(3, Math.round(houseLoss / 2)) })
                  this.log(society, 'A theft against ' + house.name + ' is exposed; relations with ' + this.characterName(target, state) + ' worsen.', 'rivalry', house.id)
                  this.save(society)
                  this.pushModal({
                    societyMenu: true,
                    title: 'Caught stealing',
                    message: 'The attempt is traced back to you.\nHouse relation: -' + houseLoss + '. Personal relation: -' + personalLoss + '. Prestige and influence fall.',
                    image: this.bundledIcon('stealingFrom', 'wounded'),
                    options: [
                      { text: 'Back to person', action: { event: this.event, method: 'openPerson', context: { houseId: house.id, characterId } } },
                      { text: 'Close' }
                    ]
                  })
                },
        safeCharacterFlag(characterId, flag) {
                  try {
                    return daapi.getCharacterFlag({ characterId, flag })
                  } catch (err) {
                    let state = daapi.getState()
                    let character = state && state.characters && state.characters[characterId]
                    return character && character.modFlags ? character.modFlags[flag] : false
                  }
                },
        familyTreeRelatives(character, state) {
                  let id = character && character.id
                  let relatives = {
                    children: [],
                    siblings: []
                  }
                  let addUnique = (list, characterId) => {
                    if (!characterId || list.indexOf(characterId) >= 0 || !state.characters[characterId]) {
                      return
                    }
                    list.push(characterId)
                  }
                  ;(character.childrenIds || []).forEach((childId) => addUnique(relatives.children, childId))
                  let spouse = state.characters[character.spouseId]
                  if (spouse && spouse.childrenIds) {
                    spouse.childrenIds.forEach((childId) => {
                      let child = state.characters[childId]
                      if (child && (this.sameCharacterId(child.fatherId, id) || this.sameCharacterId(child.motherId, id))) {
                        addUnique(relatives.children, childId)
                      }
                    })
                  }
                  let father = state.characters[character.fatherId]
                  if (father && father.childrenIds) {
                    father.childrenIds.forEach((childId) => {
                      if (!this.sameCharacterId(childId, id)) addUnique(relatives.siblings, childId)
                    })
                  }
                  let mother = state.characters[character.motherId]
                  if (mother && mother.childrenIds) {
                    mother.childrenIds.forEach((childId) => {
                      if (!this.sameCharacterId(childId, id)) addUnique(relatives.siblings, childId)
                    })
                  }
                  return relatives
                },
        characterLink(characterId, state) {
                  if (!characterId || !state.characters[characterId]) {
                    return 'none'
                  }
                  let character = state.characters[characterId]
                  character.id = character.id || characterId
                  return '[c|' + character.id + '|' + this.characterName(character, state) + ']'
                },
        familyRelativeOption(label, characterId, state, society, fallbackHouseId, returnTo, returnPage) {
                  let character = state.characters[characterId]
                  character.id = character.id || characterId
                  let houseId = this.houseIdForCharacter(character, state, society) || fallbackHouseId
                  let house = society.houses[houseId] || society.houses[fallbackHouseId]
                  return {
                    text: label + ': ' + this.characterName(character, state),
                    tooltip: this.characterTooltip(character, state),
                    icons: [this.characterPortrait(character, state, house)],
                    action: {
                      event: this.event,
                      method: 'openFamilyTree',
                      context: { houseId, characterId: character.id, returnTo, returnPage, mode: 'full' }
                    }
                  }
                },
        visibleHousePeople(house, state) {
                  let seen = {}
                  let ids = []
                  ;[(house && house.notableIds) || [], (house && house.memberIds) || []].forEach((list) => {
                    list.forEach((characterId) => {
                      if (seen[characterId]) {
                        return
                      }
                      let character = state && state.characters ? state.characters[characterId] : false
                      if (character && character.isDead) {
                        return
                      }
                      seen[characterId] = true
                      ids.push(characterId)
                    })
                  })
                  return ids
                },
        housePortrait(house, state) {
                  state = state || daapi.getState()
                  let ids = this.visibleHousePeople(house, state)
                  let character = ids.length ? (state.characters[ids[0]] || false) : false
                  return character ? this.characterPortrait(character, state, house) : this.affairIcon('log')
                },
        startPlayerStatusOverlay() {
                  if (!this.playerStatusOverlayStarted) {
                    this.playerStatusOverlayStarted = true
                    if (typeof window !== 'undefined' && window.setInterval) {
                      window.setInterval(() => {
                        try {
                          if (window.corSociety && window.corSociety.daapiReady && window.corSociety.daapiReady()) {
                            window.corSociety.runPlayerOverlayTick()
                          }
                        } catch (err) {
                          console.warn(err)
                        }
                      }, 4200)
                    }
                  }
                  let state = daapi.getState()
                  this.applyPlayerStatusOverlay(state)
                  this.applyPortraitOverlays(state)
                  this.applyFamilySocietyButtons()
                  this.registerPlayerEntryActions(state)
                  this.clearRelationBadges()
                },
        runPlayerOverlayTick() {
                  // daapi.getState() deep-copies the whole game state, so each tick takes one snapshot
                  // and shares it; every step below only reads it. The player crest is refreshed here
                  // too instead of on its own interval. Owned-slave household sync is not run here:
                  // it edits a getState() copy, so it cannot reach the game.
                  if (typeof document === 'undefined' || document.hidden) {
                    return
                  }
                  let clock = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())
                  let started = clock()
                  let state = daapi.getState()
                  this.applyPlayerStatusOverlay(state)
                  this.applyPortraitOverlays(state)
                  this.applyFamilySocietyButtons()
                  this.registerPlayerEntryActions(state)
                  this.applyPlayerCrestOverlay(state)
                  if (this.installGameErrorLogGuard) {
                    this.installGameErrorLogGuard()
                  }
                  if (this.installPopulationCountGuard) {
                    this.installPopulationCountGuard()
                  }
                  if (this.installPoliticsGuards) {
                    this.installPoliticsGuards()
                  }
                  if (this.installRefreshCoalescer) {
                    this.installRefreshCoalescer()
                  }
                  if (this.perfTime) {
                    this.perfTime('overlayTick', clock() - started)
                  }
                },
        applyPlayerStatusOverlay(state) {
                  if (typeof document === 'undefined') {
                    return
                  }
                  let target = this.findPlayerStatusElement()
                  if (!target) {
                    return
                  }
                  state = state || daapi.getState()
                  let key = this.playerStatusKey(state)
                  if (target.getAttribute('data-cor-society-status-key') === key) {
                    return
                  }
                  let status = this.playerSocietyStatus(state)
                  let text = status.title + (status.className ? ' (' + status.className + ')' : '')
                  if (!target.getAttribute('data-cor-society-original-status')) {
                    target.setAttribute('data-cor-society-original-status', target.textContent || '')
                  }
                  target.setAttribute('data-cor-society-status-key', key)
                  target.setAttribute('title', 'Society order: ' + this.stratumTitle(status.stratum) + (status.className ? '; vanilla property class: ' + status.className : ''))
                  target.textContent = text
                },
        findPlayerStatusElement() {
                  let socialSection = document.querySelector('[aria-label="Social status"]')
                  if (socialSection) {
                    let direct = socialSection.querySelector('.h5')
                    if (direct) {
                      return direct
                    }
                  }
                  let dynastyTitle = document.querySelector('.dynasty-title')
                  if (dynastyTitle && dynastyTitle.parentElement) {
                    let candidates = dynastyTitle.parentElement.querySelectorAll('.h5')
                    if (candidates.length) {
                      return candidates[0]
                    }
                  }
                  return false
                },
        applyPortraitOverlays(state) {
                  if (typeof document === 'undefined') {
                    return
                  }
                  state = state || daapi.getState()
                  if (!state || !state.characters) {
                    return
                  }
                  if (!this.hasActiveWardrobeOutfits(state)) {
                    this.restoreClearedPortraitOverlays(state)
                    return
                  }
                  this.restoreClearedPortraitOverlays(state)
                  this.applyCurrentCharacterPortraitOverlay(state)
                  this.applyAttributedCharacterPortraitOverlays(state)
                  this.applyNamedFamilyPortraitOverlays(state)
                },
        hasActiveWardrobeOutfits(state) {
                  if (!state || !state.current || !state.current.householdCharacterIds) {
                    return false
                  }
                  let active = false
                  for (let i = 0; i < state.current.householdCharacterIds.length; i++) {
                    let characterId = state.current.householdCharacterIds[i]
                    if (state.characters[characterId] && state.characters[characterId].corSocietyOutfit) {
                      active = true
                      break
                    }
                  }
                  return active
                },
        restoreClearedPortraitOverlays(state) {
                  let images = Array.prototype.slice.call(document.querySelectorAll('img[data-cor-society-original-src]'))
                  images.forEach((img) => {
                    let id = img.getAttribute('data-cor-society-character-id') || this.characterIdFromElement(img)
                    let character = id && state.characters[id]
                    if (character && this.shouldUseSocietyPortrait(character)) {
                      return
                    }
                    let original = img.getAttribute('data-cor-society-original-src')
                    if (original) {
                      img.src = original
                    }
                    img.removeAttribute('data-cor-society-original-src')
                    img.removeAttribute('data-cor-society-portrait-src')
                    img.removeAttribute('data-cor-society-character-id')
                  })
                },
        applyCurrentCharacterPortraitOverlay(state) {
                  let currentId = this.currentCharacterId(state)
                  let character = state.characters[currentId]
                  if (!this.shouldUseSocietyPortrait(character)) {
                    return
                  }
                  let img = this.findCurrentPortraitImage(state)
                  if (!img) {
                    return
                  }
                  this.replacePortraitImage(img, character, state)
                },
        applyAttributedCharacterPortraitOverlays(state) {
                  let images = Array.prototype.slice.call(document.querySelectorAll('img[data-character-id], img[data-characterid], img[data-character], img[data-id], [data-character-id] img, [data-characterid] img, [data-character] img, [data-id] img'))
                  images.forEach((img) => {
                    let id = this.characterIdFromElement(img)
                    let character = id && state.characters[id]
                    if (this.shouldUseSocietyPortrait(character)) {
                      this.replacePortraitImage(img, character, state)
                    }
                  })
                },
        applyNamedFamilyPortraitOverlays(state) {
                  if (!state || !state.characters) {
                    return
                  }
                  let ids = this.playerFamilyMemberIds(state).filter((characterId) => {
                    let character = state.characters[characterId]
                    return this.shouldUseSocietyPortrait(character)
                  })
                  if (!ids.length) {
                    return
                  }
                  ids.forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character) return
                    character.id = character.id || characterId
                    this.findPortraitImagesByCharacterText(character, state).forEach((img) => {
                      this.replacePortraitImage(img, character, state)
                    })
                  })
                },
        findPortraitImagesByCharacterText(character, state) {
                  let names = this.characterSearchNames(character, state)
                  if (!names.length || typeof document === 'undefined') {
                    return []
                  }
                  let images = Array.prototype.slice.call(document.querySelectorAll('img'))
                  let matches = []
                  images.forEach((img) => {
                    if (!img || !img.getBoundingClientRect || img.getAttribute('data-cor-society-portrait-src')) return
                    if (img.closest && img.closest('#interactionModal, .interaction-modal, .modal, .cor-society-family-tree-overlay')) return
                    let attributedId = this.characterIdFromElement(img)
                    if (attributedId && !this.sameCharacterId(attributedId, character.id)) return
                    let rect = img.getBoundingClientRect()
                    if (rect.width < 42 || rect.height < 42 || rect.width > 240 || rect.height > 260) return
                    let node = img.parentElement
                    let depth = 0
                    while (node && node !== document.body && depth < 5) {
                      let text = (node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase()
                      if (text && text.length < 260 && names.some((name) => name && text.indexOf(name) >= 0)) {
                        if (!attributedId) {
                          let portraitCount = Array.prototype.slice.call(node.querySelectorAll('img')).filter((candidate) => {
                            if (!candidate.getBoundingClientRect) return false
                            let candidateRect = candidate.getBoundingClientRect()
                            return candidateRect.width >= 42 && candidateRect.height >= 42 && candidateRect.width <= 240 && candidateRect.height <= 260
                          }).length
                          if (portraitCount > 1) return
                        }
                        matches.push(img)
                        return
                      }
                      node = node.parentElement
                      depth += 1
                    }
                  })
                  return matches.slice(0, 3)
                },
        characterSearchNames(character, state) {
                  let names = []
                  let add = (value) => {
                    value = String(value || '').replace(/\s+/g, ' ').trim().toLowerCase()
                    if (value && value.length >= 3 && names.indexOf(value) < 0) names.push(value)
                  }
                  add(this.characterName(character, state))
                  add(character.praenomen)
                  let dynasty = state && state.dynasties && state.dynasties[character.dynastyId]
                  if (dynasty) {
                    add([character.praenomen, dynasty.nomen, dynasty.cognomen].filter(Boolean).join(' '))
                    add([character.praenomen, dynasty.cognomen].filter(Boolean).join(' '))
                  }
                  return names
                },
        applyRelationBadges() {
                  if (typeof document === 'undefined') {
                    return
                  }
                  this.clearRelationBadges()
                  return
                  let state = daapi.getState()
                  if (!state || !state.characters) {
                    return
                  }
                  let society = this.load()
                  this.clearRelationBadges()
                  this.familyRelationCandidateIds(state).forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character || this.sameCharacterId(characterId, this.currentCharacterId(state))) {
                      return
                    }
                    character.id = character.id || characterId
                    let visual = this.relationVisual(society, state, character, { lastKnownForDead: true })
                    if (!visual) {
                      return
                    }
                    this.relationBadgeTargets(character, state).forEach((target) => {
                      this.mountRelationBadge(target.node, visual, characterId, target.mode)
                    })
                  })
                },
        clearRelationBadges() {
                  Array.prototype.slice.call(document.querySelectorAll('.cor-society-vanilla-relation-badge')).forEach((badge) => {
                    if (badge && badge.parentElement) {
                      badge.parentElement.removeChild(badge)
                    }
                  })
                  Array.prototype.slice.call(document.querySelectorAll('[data-cor-society-rel-anchor="1"]')).forEach((node) => {
                    if (node && !node.querySelector('.cor-society-vanilla-relation-badge') && !node.querySelector('.cor-society-character-action-button')) {
                      node.removeAttribute('data-cor-society-rel-anchor')
                      node.classList.remove('cor-society-relation-anchor')
                      node.classList.remove('cor-society-relation-anchor-text')
                    }
                  })
                },
        applyFamilySocietyButtons() {
                  if (typeof document === 'undefined') {
                    return
                  }
                  // Society Sheet is now registered as a native character action; DOM overlays caused stale floating buttons on reused game nodes.
                  this.clearFamilySocietyButtons()
                },
        clearFamilySocietyButtons() {
                  Array.prototype.slice.call(document.querySelectorAll('.cor-society-character-action-button')).forEach((button) => {
                    if (button && button.parentElement) {
                      button.parentElement.removeChild(button)
                    }
                  })
                  Array.prototype.slice.call(document.querySelectorAll('[data-cor-society-rel-anchor="1"]')).forEach((node) => {
                    if (node && !node.querySelector('.cor-society-vanilla-relation-badge') && !node.querySelector('.cor-society-character-action-button')) {
                      node.removeAttribute('data-cor-society-rel-anchor')
                      node.classList.remove('cor-society-relation-anchor')
                      node.classList.remove('cor-society-relation-anchor-text')
                    }
                  })
                },
        mountFamilySocietyButton(node, characterId, houseId, mode) {
                  if (!node || node.querySelector('[data-cor-society-character-action-id="' + this.attrEscape(characterId) + '"]')) {
                    return
                  }
                  node.setAttribute('data-cor-society-rel-anchor', '1')
                  node.classList.add('cor-society-relation-anchor')
                  if (mode === 'text') {
                    node.classList.add('cor-society-relation-anchor-text')
                  }
                  let button = document.createElement('button')
                  button.type = 'button'
                  button.className = 'cor-society-character-action-button'
                  button.setAttribute('data-cor-society-character-action-id', characterId)
                  button.title = 'Open this character in Roman Society'
                  let img = document.createElement('img')
                  img.src = this.assetIcon('scroll')
                  img.alt = ''
                  img.setAttribute('aria-hidden', 'true')
                  button.appendChild(img)
                  button.addEventListener('click', (event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    try {
                      daapi.invokeMethod({
                        event: this.event,
                        method: 'openPerson',
                        context: { houseId, characterId, returnTo: 'hub' }
                      })
                    } catch (err) {
                      console.warn(err)
                      daapi.invokeMethod({ event: this.event, method: 'openHub' })
                    }
                  })
                  node.appendChild(button)
                },
        familyRelationCandidateIds(state) {
                  let currentId = this.currentCharacterId(state)
                  let current = state.characters[currentId] || state.current || {}
                  let ids = []
                  let seen = {}
                  let add = (id) => {
                    if (!id || seen[id] || !state.characters[id]) {
                      return
                    }
                    seen[id] = true
                    ids.push(id)
                  }
                  ;((state.current && state.current.householdCharacterIds) || []).forEach(add)
                  ;((state.current && state.current.formerHouseholdCharacterIds) || []).forEach(add)
                  ;((state.current && state.current.deadHouseholdCharacterIds) || []).forEach(add)
                  ;((current && current.childrenIds) || []).forEach(add)
                  add(current.spouseId)
                  add(current.fatherId)
                  add(current.motherId)
                  if (current.dynastyId && state.dynasties && state.dynasties[current.dynastyId]) {
                    let dynasty = state.dynasties[current.dynastyId]
                    ;(dynasty.memberIds || []).forEach(add)
                  }
                  return ids.slice(0, 120)
                },
        relationBadgeTargets(character, state) {
                  let targets = []
                  let seen = []
                  let add = (node, mode) => {
                    if (!node || seen.indexOf(node) >= 0) {
                      return
                    }
                    if (node.closest && node.closest('#interactionModal, .interaction-modal, .modal, .cor-society-family-tree-overlay')) {
                      return
                    }
                    seen.push(node)
                    targets.push({ node, mode: mode || 'overlay' })
                  }
                  let id = this.attrEscape(character.id)
                  let selectors = [
                    '[data-character-id="' + id + '"] img',
                    '[data-characterid="' + id + '"] img',
                    '[data-character="' + id + '"] img',
                    '[data-id="' + id + '"] img',
                    'img[data-character-id="' + id + '"]',
                    'img[data-characterid="' + id + '"]',
                    'img[data-character="' + id + '"]',
                    'img[data-id="' + id + '"]',
                    '[data-character-id="' + id + '"]',
                    '[data-characterid="' + id + '"]',
                    '[data-character="' + id + '"]',
                    '[data-id="' + id + '"]'
                  ]
                  selectors.forEach((selector) => {
                    Array.prototype.slice.call(document.querySelectorAll(selector)).forEach((node) => {
                      let anchor = node.tagName && node.tagName.toLowerCase() === 'img' ? node.parentElement : node
                      add(anchor, 'overlay')
                    })
                  })
                  if (!targets.length) {
                    this.relationTextTargets(character, state).forEach((node) => add(node, 'text'))
                  }
                  return targets.slice(0, 4)
                },
        relationTextTargets(character, state) {
                  let names = []
                  let full = this.characterName(character, state)
                  if (full) names.push(full)
                  let dynasty = state.dynasties && state.dynasties[character.dynastyId] || {}
                  let expanded = [character.praenomen, dynasty.nomen, dynasty.cognomen].filter(Boolean).join(' ')
                  if (expanded) names.push(expanded)
                  let nodes = []
                  let candidates = Array.prototype.slice.call(document.querySelectorAll('button, a, .card, .list-group-item, .media, .row, .col, [class*="character"], [class*="family"], [class*="member"]'))
                  candidates.forEach((node) => {
                    if (!node || !node.textContent || node.offsetParent === null) {
                      return
                    }
                    let text = node.textContent.replace(/\s+/g, ' ').trim()
                    if (text.length > 180) {
                      return
                    }
                    if (names.some((name) => name && text.indexOf(name) >= 0)) {
                      nodes.push(node)
                    }
                  })
                  return nodes
                },
        mountRelationBadge(node, visual, characterId, mode) {
                  if (!node || !visual) {
                    return
                  }
                  node.setAttribute('data-cor-society-rel-anchor', '1')
                  node.classList.add('cor-society-relation-anchor')
                  if (mode === 'text') {
                    node.classList.add('cor-society-relation-anchor-text')
                  }
                  let badge = document.createElement('span')
                  badge.className = 'cor-society-vanilla-relation-badge cor-society-tone-' + visual.tone
                  badge.setAttribute('data-cor-society-rel-character-id', characterId)
                  badge.setAttribute('title', visual.tooltip)
                  let img = document.createElement('img')
                  img.src = visual.icon
                  img.alt = ''
                  img.setAttribute('aria-hidden', 'true')
                  let score = document.createElement('strong')
                  score.textContent = visual.text
                  let label = document.createElement('span')
                  label.textContent = visual.label
                  badge.appendChild(img)
                  badge.appendChild(score)
                  badge.appendChild(label)
                  node.appendChild(badge)
                },
        shouldUseSocietyPortrait(character) {
                  return !!(character && character.corSocietyOutfit)
                },
        characterIdFromElement(element) {
                  let node = element
                  while (node && node !== document.body) {
                    if (node.getAttribute) {
                      let value = node.getAttribute('data-character-id') || node.getAttribute('data-characterid') || node.getAttribute('data-character') || node.getAttribute('data-id')
                      if (value) {
                        return value
                      }
                    }
                    node = node.parentElement
                  }
                  return ''
                },
        replacePortraitImage(img, character, state) {
                  let portrait = this.characterPortrait(character, state)
                  if (!portrait || img.getAttribute('data-cor-society-portrait-src') === portrait) {
                    return
                  }
                  if (!img.getAttribute('data-cor-society-original-src')) {
                    img.setAttribute('data-cor-society-original-src', img.getAttribute('src') || img.src || '')
                  }
                  if (character && character.id) {
                    img.setAttribute('data-cor-society-character-id', character.id)
                  }
                  img.setAttribute('data-cor-society-portrait-src', portrait)
                  img.src = portrait
                },
        startPlayerCrestOverlay() {
                  // Refreshed by runPlayerOverlayTick with the tick's shared state snapshot.
                  this.playerCrestOverlayStarted = true
                  this.applyPlayerCrestOverlay()
                },
        applyPlayerCrestOverlay(state) {
                  if (typeof document === 'undefined') {
                    return
                  }
                  state = state || daapi.getState()
                  // getGlobalFlag returns the live Society object by reference; load() would add another
                  // full getState() copy plus the migration/prune pass on every tick.
                  let society = daapi.getGlobalFlag({ flag: this.flag })
                  if (!society || typeof society !== 'object' || !society.crests) {
                    society = this.load()
                  }
                  society.crestSettings = { playerOverlay: true, ...(society.crestSettings || {}) }
                  if (!society.crestSettings.playerOverlay) {
                    this.clearPlayerCrestOverlay()
                    return
                  }
                  let crestId = this.playerCrestId(state)
                  let hadCrest = society.crests && society.crests[crestId]
                  let crest = this.ensurePlayerCrest(society, state)
                  if (!hadCrest) {
                    this.save(society)
                  }
                  let badge = document.getElementById('corSocietyPlayerCrestBadge')
                  if (!badge) {
                    badge = document.createElement('img')
                    badge.id = 'corSocietyPlayerCrestBadge'
                    badge.className = 'cor-society-player-crest-badge'
                    badge.setAttribute('aria-hidden', 'true')
                    badge.alt = ''
                    document.body.appendChild(badge)
                  }
                  let viewportWidth = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 360
                  let size = Math.max(26, Math.min(38, Math.round(viewportWidth * 0.09)))
                  let crestKey = JSON.stringify(crest || {})
                  if (!this._playerCrestBadge || this._playerCrestBadge.key !== crestKey) {
                    this._playerCrestBadge = { key: crestKey, src: this.crestIcon(crest, 96) }
                  }
                  if (badge.getAttribute('src') !== this._playerCrestBadge.src) {
                    badge.src = this._playerCrestBadge.src
                  }
                  badge.style.left = '6px'
                  badge.style.top = '6px'
                  badge.style.width = size + 'px'
                  badge.style.height = Math.round(size * 1.15) + 'px'
                  badge.style.display = 'block'
                },
        clearPlayerCrestOverlay() {
                  if (typeof document === 'undefined') {
                    return
                  }
                  let badge = document.getElementById('corSocietyPlayerCrestBadge')
                  if (badge && badge.parentElement) {
                    badge.parentElement.removeChild(badge)
                  }
                },
        findCurrentPortraitImage(state) {
                  if (typeof document === 'undefined') {
                    return false
                  }
                  let currentId = (state.current || {}).id
                  let escapedId = this.attrEscape(currentId)
                  let selectors = [
                    '[data-character-id="' + escapedId + '"] img',
                    '[data-characterid="' + escapedId + '"] img',
                    '[data-character="' + escapedId + '"] img',
                    '[data-id="' + escapedId + '"] img',
                    'img[data-character-id="' + escapedId + '"]',
                    'img[data-characterid="' + escapedId + '"]',
                    'img[data-character="' + escapedId + '"]',
                    'img[data-id="' + escapedId + '"]'
                  ]
                  for (let i = 0; i < selectors.length; i++) {
                    let found = this.bestVisibleImage(Array.prototype.slice.call(document.querySelectorAll(selectors[i])))
                    if (found) {
                      return found
                    }
                  }
                  let character = state.characters[currentId]
                  if (!character) {
                    return false
                  }
                  let portrait = this.vanillaCharacterPortrait(character, state)
                  let exact = []
                  let images = Array.prototype.slice.call(document.querySelectorAll('img'))
                  images.forEach((img) => {
                    let src = img.getAttribute('src') || img.src || ''
                    if (portrait && (src === portrait || img.src === portrait)) {
                      exact.push(img)
                    }
                  })
                  return this.bestVisibleImage(exact)
                },
        bestVisibleImage(images) {
                  let best = false
                  let bestScore = -1
                  images.forEach((img) => {
                    if (!img || !img.getBoundingClientRect) {
                      return
                    }
                    let rect = img.getBoundingClientRect()
                    if (rect.width < 28 || rect.height < 28 || rect.bottom < 0 || rect.right < 0 || rect.top > window.innerHeight || rect.left > window.innerWidth) {
                      return
                    }
                    let style = window.getComputedStyle ? window.getComputedStyle(img) : {}
                    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || 1) === 0) {
                      return
                    }
                    let inModal = img.closest && img.closest('.modal, #interactionModal, .interaction-modal')
                    let score = rect.width * rect.height - (inModal ? 100000 : 0)
                    if (score > bestScore) {
                      best = img
                      bestScore = score
                    }
                  })
                  return best
                },
        attrEscape(value) {
                  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')
                }
      })
      window.corSociety._mixinCorSocietyRosterOverlaysVersion = '1.1.331'
    }
  }
}
