{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyDynastyModel() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyDynastyModelVersion === '1.1.331') {
        return
      }
      Object.assign(window.corSociety, {
        gameDynastyIdForHouse(house) {
                  if (!house) {
                    return ''
                  }
                  return house.dynastyId || house.gameDynastyId || house.id || ''
                },
        originHouseIdForDynasty(dynastyId) {
                  return String(dynastyId || '')
                },
        dynastyFeaturesForHouse(house, state, fallback) {
                  fallback = fallback || {}
                  let dynastyId = this.gameDynastyIdForHouse(house || {}) || (house && house.dynastyId)
                  let dynasty = dynastyId && state && state.dynasties ? state.dynasties[dynastyId] : false
                  let nameParts = String((house && house.name) || '').split(/\s+/).filter(Boolean)
                  return {
                    nomen: (dynasty && dynasty.nomen) || fallback.nomen || nameParts[0] || this.pick(this.nomina),
                    cognomen: (dynasty && dynasty.cognomen) || fallback.cognomen || nameParts.slice(1).join(' ') || this.pick(this.cognomina),
                    prestige: parseFloat((dynasty && dynasty.prestige) || (house && house.prestige) || fallback.prestige || 0),
                    heritage: this.normalizedHeritage((dynasty && dynasty.heritage) || (house && house.heritage) || fallback.heritage || 'roman_plebeian')
                  }
                },
        dynastyFeaturesForCharacter(character, state, fallback) {
                  fallback = fallback || {}
                  let dynasty = character && character.dynastyId && state && state.dynasties ? state.dynasties[character.dynastyId] : false
                  return {
                    nomen: (dynasty && dynasty.nomen) || fallback.nomen || this.pick(this.nomina),
                    cognomen: (dynasty && dynasty.cognomen) || fallback.cognomen || this.pick(this.cognomina),
                    prestige: parseFloat((dynasty && dynasty.prestige) || fallback.prestige || 0),
                    heritage: this.normalizedHeritage((dynasty && dynasty.heritage) || fallback.heritage || 'roman_plebeian')
                  }
                },
        normalizeDynastyHouseModel(society, state) {
                  if (!society || !society.houses) {
                    return society
                  }
                  society.dynasties = society.dynasties || {}
                  let knownHousesByDynasty = {}
                  for (let houseId in society.houses) {
                    if (!society.houses.hasOwnProperty(houseId)) {
                      continue
                    }
                    let house = society.houses[houseId]
                    if (!house) {
                      continue
                    }
                    house.id = house.id || houseId
                    let dynastyId = house.dynastyId || house.gameDynastyId || house.id
                    house.dynastyId = dynastyId
                    house.gameDynastyId = dynastyId
                    let originHouseId = this.originHouseIdForDynasty(dynastyId)
                    if (house.originHouse === undefined) {
                      house.originHouse = String(house.id) === originHouseId
                    }
                    house.branchName = house.branchName || (house.originHouse ? 'House of origin' : 'Cadet house')
                    house.houseKind = house.houseKind || (house.originHouse ? 'origin' : 'cadet')
                    house.type = house.type || house.houseKind
                    house.createdAtTurn = house.createdAtTurn || house.createdMonth || house.lastSeen || this.monthKey(state || daapi.getState())
                    house.version = house.version || this.version
                    if (house.originHouse) {
                      house.parentHouseId = ''
                      house.founderId = house.founderId || ((house.notableIds || [])[0]) || ((house.memberIds || [])[0]) || ''
                      house.branchRootId = house.branchRootId || house.founderId || ''
                    } else {
                      if (!house.parentHouseId || !society.houses[house.parentHouseId] || String(this.gameDynastyIdForHouse(society.houses[house.parentHouseId])) !== String(dynastyId)) {
                        house.parentHouseId = originHouseId
                      }
                      house.founderId = house.founderId || house.foundedByCharacterId || ((house.notableIds || [])[0]) || ((house.memberIds || [])[0]) || ''
                      house.branchRootId = house.branchRootId || house.founderId || ''
                    }
                    knownHousesByDynasty[dynastyId] = knownHousesByDynasty[dynastyId] || []
                    if (knownHousesByDynasty[dynastyId].indexOf(house.id) < 0) {
                      knownHousesByDynasty[dynastyId].push(house.id)
                    }
                  }
                  for (let dynastyId in knownHousesByDynasty) {
                    if (!knownHousesByDynasty.hasOwnProperty(dynastyId)) {
                      continue
                    }
                    let gameDynasty = (state && state.dynasties && state.dynasties[dynastyId]) || {}
                    let record = society.dynasties[dynastyId] || {}
                    let promoted = this.promoteDynastyOrigin(society, knownHousesByDynasty[dynastyId])
                    if (promoted) {
                      record.originHouseId = promoted.id
                      record.headHouseId = promoted.id
                    }
                    let originHouseId = this.originHouseIdForDynasty(dynastyId)
                    let originHouse = society.houses[originHouseId] || society.houses[knownHousesByDynasty[dynastyId][0]] || {}
                    record.id = dynastyId
                    // The game's family name wins: a new player can edit the cognomen after the
                    // dynasty exists, and the game can rename it later. Houses named after the old
                    // name ('House of Gaius <old>', 'Cadet branch of <old>') are renamed with it.
                    let gameName = gameDynasty.nomen || gameDynasty.cognomen ? this.houseName(gameDynasty, dynastyId) : ''
                    if (gameName && record.name && record.name !== gameName) {
                      this.renameDynastyHouses(society, dynastyId, record.name, gameName)
                    }
                    record.name = gameName || record.name || this.houseName(gameDynasty, dynastyId)
                    if (!record.originHouseId || !society.houses[record.originHouseId] || String(this.gameDynastyIdForHouse(society.houses[record.originHouseId])) !== String(dynastyId)) {
                      record.originHouseId = society.houses[originHouseId] ? originHouseId : originHouse.id
                    }
                    record.rootAncestorId = record.rootAncestorId || ''
                    record.rootCoupleId = record.rootCoupleId || ''
                    record.createdAtTurn = record.createdAtTurn || record.createdMonth || this.monthKey(state || daapi.getState())
                    record.version = record.version || this.version
                    record.headHouseId = record.headHouseId || record.originHouseId
                    record.houseIds = knownHousesByDynasty[dynastyId].slice().sort((a, b) => {
                      let first = society.houses[a] || {}
                      let second = society.houses[b] || {}
                      if (!!second.originHouse !== !!first.originHouse) {
                        return first.originHouse ? -1 : 1
                      }
                      return String(first.name || '').localeCompare(String(second.name || ''))
                    })
                    record.stratum = originHouse.stratum || record.stratum || 'plebeian'
                    record.prestige = Math.max(parseFloat(record.prestige || 0), parseFloat(originHouse.prestige || gameDynasty.prestige || 0))
                    record.heritage = record.heritage || originHouse.heritage || gameDynasty.heritage || 'unknown'
                    record.lastSeen = this.monthKey(state || daapi.getState())
                    if (!society.houses[record.headHouseId]) {
                      record.headHouseId = record.originHouseId
                    }
                    society.dynasties[dynastyId] = record
                  }
                  return society
                },
        promoteDynastyOrigin(society, houseIds) {
                  // A dynasty whose origin house died out is headed by its strongest surviving branch,
                  // which becomes the origin: its own branches now hang from it, and only its members
                  // (never its founder again) can split off from it.
                  let houses = (houseIds || []).map((houseId) => society.houses[houseId]).filter(Boolean)
                  if (!houses.length || houses.some((house) => house.originHouse)) {
                    return false
                  }
                  let head = houses.slice().sort((a, b) => this.houseHeadshipScore(b) - this.houseHeadshipScore(a))[0]
                  head.originHouse = true
                  head.houseKind = 'origin'
                  head.type = 'origin'
                  head.parentHouseId = ''
                  head.branchName = 'House of origin'
                  houses.forEach((house) => {
                    if (house !== head) {
                      house.parentHouseId = head.id
                    }
                  })
                  this.log(society, head.name + ' now heads its dynasty: the house of origin has died out.', 'familyTree', head.id)
                  return head
                },
        renameDynastyHouses(society, dynastyId, oldName, newName) {
                  let renamed = 0
                  Object.keys(society.houses || {}).forEach((houseId) => {
                    let house = society.houses[houseId]
                    if (!house || String(this.gameDynastyIdForHouse(house)) !== String(dynastyId)) {
                      return
                    }
                    let name = String(house.name || '')
                    if (name === oldName) {
                      house.name = newName
                      renamed += 1
                    } else if (name.slice(-(oldName.length + 1)) === ' ' + oldName) {
                      house.name = name.slice(0, name.length - oldName.length) + newName
                      renamed += 1
                    }
                    if (house.branchName === 'Cadet branch of ' + oldName) {
                      house.branchName = 'Cadet branch of ' + newName
                    }
                  })
                  return renamed
                },
        repairDynastyHouseSystem(society, state) {
                  if (!society || !state || !state.characters) {
                    return false
                  }
                  let repairKey = 'dynasty-house-canonical-' + this.version
                  if (society.dynastyHouseRepairVersion === repairKey) {
                    return false
                  }
                  let changed = false
                  this.normalizeDynastyHouseModel(society, state)
                  Object.keys(society.dynasties || {}).forEach((dynastyId) => {
                    let dynasty = society.dynasties[dynastyId]
                    let originHouseId = this.canonicalOriginHouseId(society, dynastyId)
                    if (!society.houses[originHouseId]) {
                      society.houses[originHouseId] = this.createHouseRecord(originHouseId, dynastyId)
                      changed = true
                    }
                    if (dynasty.originHouseId !== originHouseId) {
                      dynasty.originHouseId = originHouseId
                      changed = true
                    }
                  })
                  Object.keys(society.houses || {}).forEach((houseId) => {
                    let house = society.houses[houseId]
                    if (!house) return
                    let dynastyId = this.gameDynastyIdForHouse(house)
                    if (!dynastyId) {
                      house.dynastyId = house.id
                      house.gameDynastyId = house.id
                      dynastyId = house.id
                      changed = true
                    }
                    if (!society.dynasties[dynastyId]) {
                      society.dynasties[dynastyId] = {
                        id: dynastyId,
                        name: house.name || String(dynastyId),
                        originHouseId: this.originHouseIdForDynasty(dynastyId),
                        headHouseId: this.originHouseIdForDynasty(dynastyId),
                        houseIds: []
                      }
                      changed = true
                    }
                    if (!house.originHouse) {
                      if (!house.parentHouseId || !society.houses[house.parentHouseId] || String(this.gameDynastyIdForHouse(society.houses[house.parentHouseId])) !== String(dynastyId)) {
                        house.parentHouseId = this.canonicalOriginHouseId(society, dynastyId)
                        changed = true
                      }
                    }
                    let founder = house.founderId && state.characters[house.founderId]
                    if (founder && founder.dynastyId && String(founder.dynastyId) !== String(dynastyId)) {
                      house.founderId = ''
                      house.branchRootId = ''
                      changed = true
                    }
                    let cleanKnown = []
                    let knownSeen = {}
                    this.canonicalHouseMemberSourceIds(society, state, house, { includeKnown: true, includeSlaves: true }).forEach((characterId) => {
                      let character = state.characters[characterId]
                      if (!character || knownSeen[characterId]) return
                      let resolvedHouseId = this.resolveCharacterHouseId(character, state, society, { repair: true, includeSlaves: true })
                      if (resolvedHouseId && String(resolvedHouseId) === String(house.id)) {
                        knownSeen[characterId] = true
                        cleanKnown.push(characterId)
                      } else {
                        changed = true
                      }
                    })
                    house.knownMemberIds = cleanKnown.slice(-160)
                    house._lastRefreshedSignature = ''
                    this.refreshHouseMemberLists(society, state, house)
                  })
                  this.normalizeDynastyHouseModel(society, state)
                  society.dynastyHouseRepairVersion = repairKey
                  if (changed && this.clearFamilyTreeRuntimeCache) {
                    this.clearFamilyTreeRuntimeCache()
                  }
                  return changed
                },
        maintainDynastyHouseSystem(society, state, options) {
                  if (!society || !state || !state.characters || !society.houses) {
                    return false
                  }
                  options = options || {}
                  let month = this.monthKey(state)
                  let phase = options.phase || 'default'
                  let maintenanceKey = [this.version, month, phase, Object.keys(society.houses || {}).length].join(':')
                  if (!options.force && society.dynastyHouseMaintenanceKey === maintenanceKey) {
                    return false
                  }
                  let changed = false
                  this.normalizeDynastyHouseModel(society, state)
                  let housesByDynasty = {}
                  let cadetRepairs = 0
                  Object.keys(society.houses || {}).forEach((houseId) => {
                    let house = society.houses[houseId]
                    if (!house) return
                    house.id = house.id || houseId
                    let dynastyId = this.gameDynastyIdForHouse(house) || house.id
                    if (!house.dynastyId || !house.gameDynastyId) {
                      house.dynastyId = dynastyId
                      house.gameDynastyId = dynastyId
                      changed = true
                    }
                    if (!society.dynasties[dynastyId]) {
                      society.dynasties[dynastyId] = {
                        id: dynastyId,
                        name: house.name || String(dynastyId),
                        originHouseId: house.id,
                        headHouseId: house.id,
                        houseIds: []
                      }
                      changed = true
                    }
                    if (options.repairCadetBranches && !house.originHouse && house.founderId && cadetRepairs < 8 && this.repairHouseMembership) {
                      if (this.repairHouseMembership(society, state, house.id)) {
                        changed = true
                      }
                      cadetRepairs += 1
                    }
                    housesByDynasty[dynastyId] = housesByDynasty[dynastyId] || []
                    housesByDynasty[dynastyId].push(house)
                  })
                  Object.keys(society.dynasties || {}).forEach((dynastyId) => {
                    let record = society.dynasties[dynastyId]
                    if (!record) return
                    let houses = housesByDynasty[dynastyId] || []
                    if (!houses.length) {
                      if ((record.houseIds || []).length || record.headHouseId || record.originHouseId) {
                        record.houseIds = []
                        record.headHouseId = ''
                        record.originHouseId = ''
                        changed = true
                      }
                      return
                    }
                    houses.sort((a, b) => {
                      if (!!b.originHouse !== !!a.originHouse) {
                        return a.originHouse ? -1 : 1
                      }
                      return this.houseHeadshipScore(b) - this.houseHeadshipScore(a)
                    })
                    let currentOrigin = record.originHouseId && society.houses[record.originHouseId] && String(this.gameDynastyIdForHouse(society.houses[record.originHouseId])) === String(dynastyId)
                      ? society.houses[record.originHouseId]
                      : false
                    let origin = currentOrigin || houses.find((house) => house.originHouse) || houses.find((house) => String(house.id) === String(dynastyId)) || houses[0]
                    if (origin && record.originHouseId !== origin.id) {
                      record.originHouseId = origin.id
                      changed = true
                    }
                    let validHead = record.headHouseId && society.houses[record.headHouseId] && String(this.gameDynastyIdForHouse(society.houses[record.headHouseId])) === String(dynastyId)
                    if (!validHead) {
                      let playerHouseId = this.currentCharacterDynastyId(state)
                      let head = (playerHouseId && String(dynastyId) === String(playerHouseId) && society.houses[playerHouseId]) ||
                        houses.slice().sort((a, b) => this.houseHeadshipScore(b) - this.houseHeadshipScore(a))[0] || origin
                      if (head && record.headHouseId !== head.id) {
                        record.headHouseId = head.id
                        changed = true
                      }
                    }
                    let orderedHouseIds = houses.map((house) => house.id)
                    if ((record.houseIds || []).join('|') !== orderedHouseIds.join('|')) {
                      record.houseIds = orderedHouseIds
                      changed = true
                    }
                    houses.forEach((house) => {
                      if (house.originHouse) {
                        if (house.parentHouseId) {
                          house.parentHouseId = ''
                          changed = true
                        }
                        return
                      }
                      let validParent = house.parentHouseId && society.houses[house.parentHouseId] && String(this.gameDynastyIdForHouse(society.houses[house.parentHouseId])) === String(dynastyId)
                      if (!validParent && origin) {
                        house.parentHouseId = origin.id
                        changed = true
                      }
                    })
                    record.stratum = (society.houses[record.headHouseId] && society.houses[record.headHouseId].stratum) || (origin && origin.stratum) || record.stratum || 'plebeian'
                    record.lastSeen = month
                  })
                  society.dynastyHouseMaintenanceKey = maintenanceKey
                  if (changed && this.clearFamilyTreeRuntimeCache) {
                    this.clearFamilyTreeRuntimeCache()
                  }
                  return changed
                },
        repairHouseMembership(society, state, houseId) {
                  if (!society || !state || !state.characters || !houseId || !society.houses || !society.houses[houseId]) {
                    return false
                  }
                  let house = society.houses[houseId]
                  let dynastyId = this.gameDynastyIdForHouse(house)
                  let changed = false
                  if (!dynastyId) {
                    return false
                  }
                  // An NPC cadet house never takes back the people the player keeps, even when they
                  // married into its founder's line (playerKeptIdMap); player-founded branches do.
                  let kept = !house.originHouse && house.foundedReason !== 'player branch foundation' ? this.playerKeptIdMap(state) : null
                  let assignToHouse = (characterId) => {
                    let character = state.characters[characterId]
                    if (!character || character.isDead || character.corSocietySlave || character.corSocietySlaveActive) {
                      return
                    }
                    if (kept && kept[String(characterId)]) {
                      return
                    }
                    if (!character.dynastyId || String(character.dynastyId) !== String(dynastyId)) {
                      return
                    }
                    if (String(character.corSocietyHouseId || '') !== String(house.id)) {
                      if (this.repairCharacterHousePointer(state, characterId, house.id)) {
                        changed = true
                      }
                    }
                  }
                  if (!house.originHouse && house.founderId && state.characters[house.founderId]) {
                    this.cadetBranchMemberIds(state, state.characters[house.founderId]).forEach(assignToHouse)
                  }
                  let sourceIds = this.canonicalHouseMemberSourceIds(society, state, house, { includeKnown: true, includeSlaves: false })
                  sourceIds.forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character || character.corSocietySlave || character.corSocietySlaveActive) {
                      return
                    }
                    let explicitHouseId = character.corSocietyHouseId || ''
                    if (explicitHouseId && (!society.houses[explicitHouseId] || String(this.gameDynastyIdForHouse(society.houses[explicitHouseId])) !== String(character.dynastyId || ''))) {
                      if (this.resolveCharacterHouseId(character, state, society, { repair: true })) {
                        changed = true
                      }
                    } else if (!explicitHouseId && character.dynastyId && String(character.dynastyId) === String(dynastyId)) {
                      let resolvedHouseId = this.resolveCharacterHouseId(character, state, society, { repair: true })
                      if (resolvedHouseId) {
                        changed = true
                      }
                    }
                  })
                  let cleanKnown = []
                  let seen = {}
                  this.canonicalHouseMemberSourceIds(society, state, house, { includeKnown: true, includeSlaves: true }).forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character || seen[characterId]) {
                      return
                    }
                    let resolvedHouseId = this.resolveCharacterHouseId(character, state, society, { repair: false, includeSlaves: true })
                    if (resolvedHouseId && String(resolvedHouseId) === String(house.id)) {
                      seen[characterId] = true
                      cleanKnown.push(characterId)
                    } else {
                      changed = true
                    }
                  })
                  house.knownMemberIds = cleanKnown.slice(-160)
                  house._lastRefreshedSignature = ''
                  this.refreshHouseMemberLists(society, state, house)
                  if (changed && this.clearFamilyTreeRuntimeCache) {
                    this.clearFamilyTreeRuntimeCache()
                  }
                  return changed
                },
        validateDynastyHouseSystem(society, state, options) {
                  society = society || this.load()
                  state = state || daapi.getState()
                  options = options || {}
                  let warnings = []
                  let addWarning = (code, message, ref) => {
                    warnings.push({ code, message, ref: ref || '' })
                  }
                  Object.keys(society.dynasties || {}).forEach((dynastyId) => {
                    let dynasty = society.dynasties[dynastyId]
                    if (!dynasty.originHouseId || !society.houses[dynasty.originHouseId]) {
                      addWarning('dynasty.originHouse', 'Dynasty has no valid origin house.', dynastyId)
                    } else if (String(this.gameDynastyIdForHouse(society.houses[dynasty.originHouseId])) !== String(dynastyId)) {
                      addWarning('dynasty.originMismatch', 'Dynasty origin house belongs to another dynasty.', dynastyId)
                    }
                    if (dynasty.headHouseId && (!society.houses[dynasty.headHouseId] || String(this.gameDynastyIdForHouse(society.houses[dynasty.headHouseId])) !== String(dynastyId))) {
                      addWarning('dynasty.headHouse', 'Dynasty has an invalid head house.', dynastyId)
                    }
                    ;(dynasty.houseIds || []).forEach((houseId) => {
                      if (!society.houses[houseId]) {
                        addWarning('dynasty.missingHouse', 'Dynasty references a missing house.', houseId)
                      }
                    })
                  })
                  Object.keys(society.houses || {}).forEach((houseId) => {
                    let house = society.houses[houseId]
                    let dynastyId = this.gameDynastyIdForHouse(house)
                    if (!dynastyId || !society.dynasties[dynastyId]) {
                      addWarning('house.noDynasty', 'House has no valid dynasty record.', houseId)
                    }
                    if (!house.originHouse) {
                      if (!house.parentHouseId || !society.houses[house.parentHouseId]) {
                        addWarning('house.noParent', 'Cadet house has no valid parent house.', houseId)
                      } else if (String(this.gameDynastyIdForHouse(society.houses[house.parentHouseId])) !== String(dynastyId)) {
                        addWarning('house.parentDynasty', 'Cadet parent house belongs to another dynasty.', houseId)
                      }
                    }
                    if (house.founderId && state.characters[house.founderId] && state.characters[house.founderId].dynastyId && String(state.characters[house.founderId].dynastyId) !== String(dynastyId)) {
                      addWarning('house.founderDynasty', 'House founder belongs to another dynasty.', houseId)
                    }
                    let mainIds = this.resolvedHouseMemberIds(society, state, house, { includeKnown: true, includeDead: true, repair: false })
                    mainIds.forEach((characterId) => {
                      let character = state.characters[characterId]
                      if (!character) return
                      if (character.dynastyId && String(character.dynastyId) !== String(dynastyId)) {
                        addWarning('member.dynastyMismatch', 'House member has another dynastyId.', houseId + ':' + characterId)
                      }
                      let resolvedHouseId = this.resolveCharacterHouseId(character, state, society, { repair: false })
                      if (resolvedHouseId && String(resolvedHouseId) !== String(house.id)) {
                        addWarning('member.houseMismatch', 'House list contains a member resolved to another house.', houseId + ':' + characterId)
                      }
                      let spouse = character.spouseId && state.characters[character.spouseId]
                      if (spouse) {
                        spouse.id = spouse.id || character.spouseId
                        character.id = character.id || characterId
                        if (this.areCloseBloodKin && this.areCloseBloodKin(character, spouse, state)) {
                          addWarning('marriage.closeKin', 'Married characters share close blood ancestry.', houseId + ':' + characterId + ':' + spouse.id)
                        }
                      }
                    })
                  })
                  let result = {
                    ok: warnings.length === 0,
                    warnings: warnings.slice(0, options.limit || 80),
                    warningCount: warnings.length,
                    dynastyCount: Object.keys(society.dynasties || {}).length,
                    houseCount: Object.keys(society.houses || {}).length
                  }
                  society.lastDynastyHouseValidation = result
                  return result
                },
        societyDynastyForHouse(society, house) {
                  if (!society || !house) {
                    return false
                  }
                  let dynastyId = this.gameDynastyIdForHouse(house)
                  return dynastyId && society.dynasties ? society.dynasties[dynastyId] : false
                },
        sortedDynasties(society) {
                  society = society || this.load()
                  let dynasties = Object.keys(society.dynasties || {}).map((id) => society.dynasties[id]).filter(Boolean)
                  return dynasties.sort((a, b) => {
                    let firstHouse = society.houses && society.houses[a.originHouseId]
                    let secondHouse = society.houses && society.houses[b.originHouseId]
                    let firstStrength = firstHouse ? firstHouse.strength || 0 : 0
                    let secondStrength = secondHouse ? secondHouse.strength || 0 : 0
                    if (secondStrength !== firstStrength) {
                      return secondStrength - firstStrength
                    }
                    return String(a.name || '').localeCompare(String(b.name || ''))
                  })
                },
        housesForDynasty(society, dynastyId) {
                  society = society || this.load()
                  let record = society.dynasties && society.dynasties[dynastyId]
                  let ids = record && record.houseIds ? record.houseIds.slice() : []
                  if (!ids.length) {
                    ids = Object.keys(society.houses || {}).filter((houseId) => {
                      let house = society.houses[houseId]
                      return house && String(this.gameDynastyIdForHouse(house)) === String(dynastyId)
                    })
                  }
                  return ids.map((houseId) => society.houses[houseId]).filter(Boolean)
                },
        primaryHouseForDynasty(society, dynastyId) {
                  let houses = this.housesForDynasty(society, dynastyId)
                  return houses.find((house) => house.originHouse) || houses[0] || false
                },
        canonicalOriginHouseId(society, dynastyId) {
                  if (!dynastyId) {
                    return ''
                  }
                  let record = society && society.dynasties && society.dynasties[dynastyId]
                  if (record && record.originHouseId && society.houses && society.houses[record.originHouseId]) {
                    return record.originHouseId
                  }
                  if (society && society.houses && society.houses[dynastyId]) {
                    return String(dynastyId)
                  }
                  let house = this.primaryHouseForDynasty(society, dynastyId)
                  return house && house.id ? house.id : String(dynastyId)
                },
        houseBelongsToDynasty(society, houseId, dynastyId) {
                  if (!society || !society.houses || !houseId || !dynastyId || !society.houses[houseId]) {
                    return false
                  }
                  return String(this.gameDynastyIdForHouse(society.houses[houseId])) === String(dynastyId)
                },
        houseIdForCharacter(character, state, society) {
                  if (!character) {
                    return ''
                  }
                  society = society || this.load()
                  state = state || daapi.getState()
                  if (this.resolveCharacterHouseId) {
                    let resolvedHouseId = this.resolveCharacterHouseId(character, state, society, { repair: true })
                    if (resolvedHouseId) {
                      return resolvedHouseId
                    }
                  }
                  let dynastyId = character.dynastyId
                  if (dynastyId) {
                    let house = this.createHouseRecord(dynastyId)
                    let dynasty = state.dynasties[dynastyId] || {}
                    house.name = this.houseName(dynasty, dynastyId)
                    house.stratum = this.classifyHouse(dynasty, [character], this.characterScore(character, state), this.isSenatorialCharacter(character, state))
                    house.memberIds = [character.id]
                    house.notableIds = [character.id]
                    house.generated = false
                    society.houses[dynastyId] = house
                    this.refreshHouseMemberLists(society, state, house)
                    this.maintainDynastyHouseSystem(society, state, { force: true, phase: 'character-house' })
                    this.save(society)
                    return dynastyId
                  }
                  return ''
                },
        resolveCharacterHouseId(character, state, society, options) {
                  if (!character || !state || !state.characters || !society) {
                    return ''
                  }
                  options = options || {}
                  let characterId = String(character.id || character.characterId || '')
                  if ((character.corSocietySlave || character.corSocietySlaveActive) && !options.includeSlaves) {
                    return ''
                  }
                  let dynastyId = character.dynastyId || ''
                  if (!dynastyId) {
                    return ''
                  }
                  let explicitHouseId = character.corSocietyHouseId || ''
                  if (explicitHouseId && this.houseBelongsToDynasty(society, explicitHouseId, dynastyId)) {
                    return explicitHouseId
                  }
                  let depth = parseInt(options.depth || 0, 10)
                  if (depth < 4) {
                    let parentIds = [character.fatherId, character.motherId]
                    for (let i = 0; i < parentIds.length; i += 1) {
                      let parentId = parentIds[i]
                      let parent = parentId && state.characters[parentId]
                      if (!parent || parent.corSocietySlave || parent.corSocietySlaveActive) {
                        continue
                      }
                      let parentHouseId = this.resolveCharacterHouseId(parent, state, society, { ...options, repair: false, depth: depth + 1 })
                      if (parentHouseId && this.houseBelongsToDynasty(society, parentHouseId, dynastyId)) {
                        if (options.repair && explicitHouseId !== parentHouseId) {
                          this.repairCharacterHousePointer(state, characterId, parentHouseId)
                        }
                        return parentHouseId
                      }
                    }
                  }
                  let playerHouseId = this.currentCharacterDynastyId ? this.currentCharacterDynastyId(state) : ''
                  if (!options.ignorePlayerHouse && playerHouseId && characterId && this.isPlayerFreeFamilyCharacter && this.isPlayerFreeFamilyCharacter(state, characterId, character)) {
                    if (!society.houses[playerHouseId] && this.createHouseRecord) {
                      society.houses[playerHouseId] = this.createHouseRecord(playerHouseId)
                    }
                    return playerHouseId
                  }
                  let originHouseId = this.canonicalOriginHouseId(society, dynastyId)
                  if (originHouseId && society.houses && !society.houses[originHouseId] && options.createMissing !== false) {
                    society.houses[originHouseId] = this.createHouseRecord(originHouseId, dynastyId)
                  }
                  if (originHouseId && this.houseBelongsToDynasty(society, originHouseId, dynastyId)) {
                    if (options.repair && explicitHouseId !== originHouseId) {
                      this.repairCharacterHousePointer(state, characterId, originHouseId)
                    }
                    return originHouseId
                  }
                  return ''
                },
        repairCharacterHousePointer(state, characterId, houseId) {
                  if (!characterId || !houseId || !state || !state.characters || !state.characters[characterId]) {
                    return false
                  }
                  try {
                    daapi.updateCharacter({ characterId, character: { corSocietyHouseId: houseId, flagDoNotCull: true } })
                    state.characters[characterId].corSocietyHouseId = houseId
                    state.characters[characterId].flagDoNotCull = true
                    return true
                  } catch (err) {
                    console.warn(err)
                    return false
                  }
                },
        canonicalHouseMemberSourceIds(society, state, house, options) {
                  options = options || {}
                  let seen = {}
                  let ids = []
                  let add = (id) => {
                    if (!id || seen[String(id)] || !state || !state.characters || !state.characters[id]) {
                      return
                    }
                    seen[String(id)] = true
                    ids.push(String(id))
                  }
                  ;(house.memberIds || []).forEach(add)
                  ;(house.notableIds || []).forEach(add)
                  ;(house.deadMemberIds || []).forEach(add)
                  add(house.founderId)
                  add(house.branchRootId)
                  if (options.includeKnown) {
                    ;(house.knownMemberIds || []).forEach(add)
                  }
                  if (options.includeSlaves) {
                    ;(house.slaveIds || []).forEach(add)
                  }
                  let dynastyId = this.gameDynastyIdForHouse(house)
                  let dynasty = dynastyId && state && state.dynasties && state.dynasties[dynastyId]
                  ;((dynasty && dynasty.memberIds) || []).forEach(add)
                  ;((society.generatedCharacterIds || [])).forEach((id) => {
                    let character = state.characters && state.characters[id]
                    if (!character) return
                    if (character.corSocietyHouseId && String(character.corSocietyHouseId) === String(house.id)) add(id)
                  })
                  // Every living character whose house pointer names this house, from all records:
                  // the generated window above keeps only the last 420 ids, so a living member who
                  // dropped off the house's own lists was never found again and the house looked
                  // empty. Callers still check each id with resolveCharacterHouseId.
                  this.livingCharactersPointingToHouse(state, house.id).forEach(add)
                  if (house.isPlayerHouse && this.playerFamilyMemberIds) {
                    this.playerFamilyMemberIds(state).forEach(add)
                  }
                  return ids
                },
        livingCharactersPointingToHouse(state, houseId) {
                  // corSocietyHouseId -> living character ids, built once per state copy.
                  let characters = (state && state.characters) || {}
                  this._housePointerIndex = this._housePointerIndex || new WeakMap()
                  let index = this._housePointerIndex.get(characters)
                  if (!index) {
                    index = {}
                    Object.keys(characters).forEach((id) => {
                      let character = characters[id]
                      let pointer = character && !character.isDead && character.corSocietyHouseId
                      if (pointer) {
                        index[String(pointer)] = index[String(pointer)] || []
                        index[String(pointer)].push(id)
                      }
                    })
                    this._housePointerIndex.set(characters, index)
                  }
                  return index[String(houseId)] || []
                },
        resolvedHouseMemberIds(society, state, house, options) {
                  if (!society || !state || !state.characters || !house) {
                    return []
                  }
                  options = options || {}
                  let seen = {}
                  let ids = []
                  this.canonicalHouseMemberSourceIds(society, state, house, { includeKnown: !!options.includeKnown, includeSlaves: !!options.includeSlaves }).forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character || seen[characterId]) {
                      return
                    }
                    if (!options.includeDead && character.isDead) {
                      return
                    }
                    let resolvedHouseId = this.resolveCharacterHouseId(character, state, society, { repair: !!options.repair, includeSlaves: !!options.includeSlaves })
                    if (resolvedHouseId && String(resolvedHouseId) === String(house.id)) {
                      seen[characterId] = true
                      ids.push(characterId)
                    }
                  })
                  return ids
                },
        memberIdsForDynasty(society, state, dynastyId) {
                  let seen = {}
                  let ids = []
                  this.housesForDynasty(society, dynastyId).forEach((house) => {
                    this.resolvedHouseMemberIds(society, state, house, { includeKnown: true, repair: false }).forEach((characterId) => {
                      if (!characterId || seen[characterId]) {
                        return
                      }
                      let character = state && state.characters && state.characters[characterId]
                      if (!character || character.isDead) {
                        return
                      }
                      seen[characterId] = true
                      ids.push(characterId)
                    })
                  })
                  let dynasty = state && state.dynasties && state.dynasties[dynastyId]
                  ;((dynasty && dynasty.memberIds) || []).forEach((characterId) => {
                    if (!characterId || seen[characterId]) return
                    let character = state.characters && state.characters[characterId]
                    if (!character || character.isDead || !character.dynastyId || String(character.dynastyId) !== String(dynastyId)) return
                    seen[characterId] = true
                    ids.push(characterId)
                  })
                  return ids
                },
        branchHouseId(dynastyId, seed) {
                  return this.originHouseIdForDynasty(dynastyId) + '_branch_' + this.safeId(seed || Date.now() + '_' + this.randomInt(1000, 9999))
                },
        cadetHouseLimitForStratum(stratum) {
                  if (stratum === 'senatorial') return 5
                  if (stratum === 'equestrian') return 4
                  if (stratum === 'civic') return 3
                  if (stratum === 'plebeian') return 2
                  if (stratum === 'freedmen') return 2
                  return 1
                },
        playerCadetHouseInfo(society, state, dynasty) {
                  let currentId = this.currentCharacterId(state)
                  let player = state.characters && state.characters[currentId]
                  let visible = !!(dynasty && player && player.dynastyId && String(player.dynastyId) === String(dynasty.id))
                  if (!visible) {
                    return { visible: false, available: false, reason: 'not your dynasty', tooltip: '' }
                  }
                  let houses = this.housesForDynasty(society, dynasty.id)
                  let headHouse = society.houses[dynasty.headHouseId] || this.primaryHouseForDynasty(society, dynasty.id) || {}
                  let limit = this.cadetHouseLimitForStratum(headHouse.stratum || dynasty.stratum)
                  let cash = parseFloat(((state || {}).current || {}).cash || 0)
                  let prestige = parseFloat(((state || {}).current || {}).prestige || 0)
                  let influence = parseFloat(((state || {}).current || {}).influence || 0)
                  let cost = this.playerCadetHouseCost(headHouse)
                  let candidate = this.cadetFounderCandidate(society, state, dynasty.id, true)
                  let reason = ''
                  if (houses.length >= limit) reason = 'branch limit'
                  else if (!candidate) reason = 'no adult branch'
                  else if (cash < cost.cash) reason = 'need ' + cost.cash + ' cash'
                  else if (prestige < cost.prestige) reason = 'need ' + cost.prestige + ' prestige'
                  else if (influence < cost.influence) reason = 'need ' + cost.influence + ' influence'
                  return {
                    visible,
                    available: !reason,
                    reason,
                    cost,
                    candidate,
                    tooltip: [
                      'Creates a secondary house inside your dynasty. The dynasty name stays unchanged.',
                      'Requires an adult married or landed branch member.',
                      'Cost: ' + cost.cash + ' cash, ' + cost.prestige + ' prestige, ' + cost.influence + ' influence.',
                      'Current houses: ' + houses.length + '/' + limit + '.',
                      reason ? 'Unavailable: ' + reason + '.' : 'The new house may one day contest the dynasty headship.'
                    ].join('\n')
                  }
                },
        playerCadetHouseCost(house) {
                  let level = this.socialLevel((house && house.stratum) || 'plebeian')
                  return {
                    cash: [90, 140, 220, 420, 800, 1400][level] || 220,
                    prestige: [3, 5, 8, 14, 25, 45][level] || 8,
                    influence: [5, 8, 14, 24, 42, 75][level] || 14
                  }
                },
        inventedPlayerRelative(character, state) {
                  // Not a real relative of the player. A real relative's parents lead, through game people only,
                  // up to the player or one of the player's ancestors. Not real: anyone the mod generated or
                  // invented for the player's tree (corSocietyGenerated, corSocietyPlayerTreeRole) and their
                  // descendants, spouses who married in, the unlinked relative the game gives a new player and
                  // his line, and a line whose link was culled.
                  let characters = (state && state.characters) || {}
                  let usable = (id) => id !== undefined && id !== null && id !== ''
                  if (!character) {
                    return false
                  }
                  let ancestry = {}
                  let queue = [this.currentCharacterId(state)]
                  let guard = 0
                  while (queue.length && guard < 200) {
                    guard += 1
                    let id = queue.shift()
                    let person = usable(id) ? characters[id] : null
                    if (!person || ancestry[String(id)]) {
                      continue
                    }
                    ancestry[String(id)] = true
                    queue.push(person.fatherId, person.motherId)
                  }
                  let seen = {}
                  queue = [character.id]
                  guard = 0
                  while (queue.length && guard < 200) {
                    guard += 1
                    let id = queue.shift()
                    if (!usable(id) || seen[String(id)]) {
                      continue
                    }
                    seen[String(id)] = true
                    if (ancestry[String(id)]) {
                      return false
                    }
                    let person = characters[id]
                    if (!person || person.corSocietyGenerated || person.corSocietyPlayerTreeRole) {
                      continue
                    }
                    queue.push(person.fatherId, person.motherId)
                  }
                  return true
                },
        cadetFounderCandidate(society, state, dynastyId, playerOnly, excludedIds) {
                  let currentId = this.currentCharacterId(state)
                  // Only real relatives split off a branch of the player's dynasty, never the line the
                  // mod invented for the player's tree.
                  let playerDynasty = !playerOnly && String(dynastyId) === String(this.currentCharacterDynastyId(state))
                  let founders = playerOnly ? {} : this.houseFounderIdMap(society)
                  let ids = playerOnly ? this.playerFamilyMemberIds(state) : this.memberIdsForDynasty(society, state, dynastyId)
                  let originHouse = this.primaryHouseForDynasty(society, dynastyId)
                  let candidates = ids.map((id) => {
                    let character = state.characters && state.characters[id]
                    if (character) character.id = character.id || id
                    return character
                  }).filter((character) => {
                    if (!character || character.isDead || character.corSocietySlave || character.corSocietySlaveActive) return false
                    if (excludedIds && excludedIds[String(character.id)]) return false
                    if (playerDynasty && this.inventedPlayerRelative(character, state)) return false
                    if (founders[String(character.id)]) return false
                    if (!character.dynastyId || String(character.dynastyId) !== String(dynastyId)) return false
                    let houseId = this.resolveCharacterHouseId(character, state, society, { repair: false })
                    if (originHouse && houseId && String(houseId) !== String(originHouse.id)) return false
                    if (playerOnly && this.sameCharacterId(character.id, currentId)) return false
                    let age = this.age(character, state)
                    return age >= 18 && (character.spouseId || (character.childrenIds || []).length || this.characterScore(character, state) >= 35)
                  })
                  return candidates.sort((a, b) => this.characterScore(b, state) - this.characterScore(a, state))[0] || false
                },
        createCadetHouse(society, state, dynastyId, founder, reason) {
                  if (!society || !state || !dynastyId || !founder) {
                    return false
                  }
                  // An NPC-founded branch never takes the player, their line, ancestors or household
                  // (playerKeptIdMap): in the player's dynasty only a sibling's or cousin's line can
                  // split off. Branches the player founds are not restricted.
                  let excludedIds = reason !== 'player branch foundation' ? this.playerKeptIdMap(state) : null
                  if (excludedIds && excludedIds[String(founder.id)]) {
                    return false
                  }
                  if (excludedIds && String(dynastyId) === String(this.currentCharacterDynastyId(state)) && this.inventedPlayerRelative(founder, state)) {
                    return false
                  }
                  let dynasty = society.dynasties[dynastyId] || {}
                  let originHouse = this.primaryHouseForDynasty(society, dynastyId)
                  if (!originHouse) {
                    return false
                  }
                  let houses = this.housesForDynasty(society, dynastyId)
                  let limit = this.cadetHouseLimitForStratum(originHouse.stratum || dynasty.stratum)
                  if (houses.length >= limit) {
                    return false
                  }
                  let moveIds = this.cadetBranchMemberIds(state, founder)
                  if (excludedIds) {
                    moveIds = moveIds.filter((characterId) => !excludedIds[String(characterId)])
                    // A branch splits off: its founder has never founded a house before, and someone
                    // stays behind in the origin house. Otherwise the whole family would hop to a new
                    // house, leave the old one to die out, and do it again from there.
                    if (this.houseFounderIdMap(society)[String(founder.id)]) {
                      return false
                    }
                    let leaving = this.idSet(moveIds)
                    if (!this.houseLivingMemberIds(society, state, originHouse).some((characterId) => !leaving[String(characterId)])) {
                      return false
                    }
                  }
                  let houseId = this.branchHouseId(dynastyId, founder.id + '_' + houses.length + '_' + this.monthKey(state))
                  let house = this.createHouseRecord(houseId, dynastyId)
                  house.name = 'House of ' + (founder.praenomen || 'Cadet') + ' ' + (dynasty.name || originHouse.name || '')
                  house.branchName = 'Cadet branch of ' + (dynasty.name || originHouse.name || 'the dynasty')
                  house.originHouse = false
                  house.houseKind = 'cadet'
                  house.type = 'cadet'
                  house.parentHouseId = originHouse.id
                  house.founderId = founder.id
                  house.branchRootId = founder.id
                  house.createdAtTurn = this.monthKey(state)
                  house.stratum = originHouse.stratum || dynasty.stratum || 'plebeian'
                  house.generated = true
                  house.cadetHouse = true
                  house.foundedByCharacterId = founder.id
                  house.foundedReason = reason || 'cadet branch'
                  house.relation = this.clamp((originHouse.relation || 0) - this.randomInt(3, 12), -100, 100)
                  house.wealth = Math.max(20, Math.round((originHouse.wealth || 60) * 0.35))
                  house.power = Math.max(5, Math.round((originHouse.power || 15) * 0.35 + this.characterScore(founder, state) / 5))
                  house.strength = Math.max(10, Math.round((originHouse.strength || 30) * 0.30 + this.characterScore(founder, state) / 3))
                  house.prestige = Math.max(100, Math.round((originHouse.prestige || dynasty.prestige || 500) * 0.20))
                  house.heritage = originHouse.heritage || dynasty.heritage || 'unknown'
                  house.citizenRank = this.rankFromStrength(house.strength)
                  house.agenda = this.pick(['wealth', 'marriage', 'office', 'security'])
                  house.memberIds = []
                  house.notableIds = []
                  society.houses[houseId] = house
                  moveIds.forEach((characterId) => {
                    try {
                      daapi.updateCharacter({ characterId, character: { corSocietyHouseId: houseId, dynastyId } })
                    } catch (err) {
                      console.warn(err)
                    }
                  })
                  state = daapi.getState()
                  this.refreshHouseMemberLists(society, state, originHouse)
                  this.refreshHouseMemberLists(society, state, house)
                  if (this.ensureDynastyCommonTree) {
                    this.ensureDynastyCommonTree(society, state, dynastyId, { budget: 6, force: true })
                    state = daapi.getState()
                    if (this.clearFamilyTreeRuntimeCache) {
                      this.clearFamilyTreeRuntimeCache()
                    }
                    this.refreshHouseMemberLists(society, state, originHouse)
                    this.refreshHouseMemberLists(society, state, house)
                  }
                  this.normalizeDynastyHouseModel(society, state)
                  if (this.maintainDynastyHouseSystem) {
                    this.maintainDynastyHouseSystem(society, state, { force: true, phase: 'cadet' })
                  }
                  this.log(society, house.name + ' is founded as a cadet house of ' + (dynasty.name || originHouse.name) + '.', 'familyTree', house.id)
                  return house
                },
        houseFounderIdMap(society) {
                  // Everyone who founded a house that still stands.
                  let map = {}
                  Object.keys((society && society.houses) || {}).forEach((houseId) => {
                    let founderId = society.houses[houseId] && society.houses[houseId].foundedByCharacterId
                    if (founderId) {
                      map[String(founderId)] = true
                    }
                  })
                  return map
                },
        cadetBranchMemberIds(state, founder) {
                  let seen = {}
                  let ids = []
                  let add = (id) => {
                    if (!id || seen[id] || !state.characters || !state.characters[id]) return
                    seen[id] = true
                    ids.push(id)
                  }
                  let dynastyId = founder.dynastyId || ''
                  let queue = [founder.id]
                  let guard = 0
                  while (queue.length && guard < 100) {
                    let id = queue.shift()
                    guard += 1
                    let character = state.characters[id]
                    if (!character || seen[id]) {
                      continue
                    }
                    if (dynastyId && character.dynastyId && String(character.dynastyId) !== String(dynastyId)) {
                      continue
                    }
                    add(id)
                    let spouse = character.spouseId && state.characters[character.spouseId]
                    if (spouse && spouse.dynastyId && String(spouse.dynastyId) === String(dynastyId)) {
                      add(character.spouseId)
                    }
                    ;(character.childrenIds || []).forEach((childId) => {
                      let child = state.characters[childId]
                      if (child && (!dynastyId || String(child.dynastyId || '') === String(dynastyId)) && !seen[childId]) {
                        queue.push(childId)
                      }
                    })
                  }
                  return ids.slice(0, 80)
                },
        updateDynastyHeadship(society, state) {
                  society = society || this.load()
                  let changed = false
                  state = state || daapi.getState()
                  this.normalizeDynastyHouseModel(society, state)
                  let playerHouseId = this.currentCharacterDynastyId(state)
                  for (let dynastyId in society.dynasties) {
                    if (!society.dynasties.hasOwnProperty(dynastyId)) continue
                    let dynasty = society.dynasties[dynastyId]
                    if (playerHouseId && String(dynastyId) === String(playerHouseId)) {
                      // The player's house always heads the player's own dynasty; a relative's cadet
                      // house never takes it over.
                      if (society.houses[playerHouseId] && String(dynasty.headHouseId || '') !== String(playerHouseId)) {
                        dynasty.headHouseId = playerHouseId
                        changed = true
                      }
                      continue
                    }
                    let houses = this.housesForDynasty(society, dynastyId)
                    if (houses.length < 2) continue
                    let currentHead = society.houses[dynasty.headHouseId] || this.primaryHouseForDynasty(society, dynastyId)
                    let challenger = houses.slice().sort((a, b) => this.houseHeadshipScore(b) - this.houseHeadshipScore(a))[0]
                    if (!currentHead || !challenger || challenger.id === currentHead.id) continue
                    let lead = this.houseHeadshipScore(challenger) - this.houseHeadshipScore(currentHead)
                    if (lead >= 35 && (challenger.power || 0) >= (currentHead.power || 0) + 8) {
                      dynasty.headHouseId = challenger.id
                      challenger.lastFamilyEvent = 'Claims leadership of the dynasty.'
                      currentHead.lastFamilyEvent = 'Loses dynasty leadership to a cadet house.'
                      this.log(society, challenger.name + ' becomes head house of ' + (dynasty.name || dynastyId) + ' without changing any house names.', 'familyTree', challenger.id)
                      changed = true
                    }
                  }
                  return changed
                },
        houseHeadshipScore(house) {
                  if (!house) return 0
                  return Math.round((house.strength || 0) + (house.power || 0) * 1.4 + (house.wealth || 0) / 12 + (house.prestige || 0) / 900 + (house.stability || 0) / 3)
                },
        changeText(label, value) {
                  value = Math.round(parseFloat(value || 0))
                  if (!value) {
                    return ''
                  }
                  return (value > 0 ? '+' : '') + value + ' ' + label
                },
        syncWithGame(society, state) {
                  let members = this.collectHouseMembers(state, society)
                  for (let houseId in members) {
                    if (!members.hasOwnProperty(houseId)) {
                      continue
                    }
                    let firstMember = members[houseId][0] || {}
                    let dynastyId = (society.houses[houseId] && this.gameDynastyIdForHouse(society.houses[houseId])) || firstMember.dynastyId || houseId
                    let house = society.houses[houseId] || this.createHouseRecord(houseId, dynastyId)
                    let summary = this.summarizeHouse(dynastyId, members[houseId], state)
                    let previousMembers = {}
                    ;(house.memberIds || []).forEach((characterId) => {
                      previousMembers[characterId] = true
                    })
                    if (house.originHouse || !house.name) {
                      house.name = summary.name
                    }
                    house.stratum = summary.stratum
                    house.strength = summary.strength
                    house.memberIds = summary.memberIds
                    house.notableIds = summary.notableIds
                    house.prestige = summary.prestige
                    house.heritage = summary.heritage
                    house.citizenRank = summary.citizenRank
                    if (!house.wealth) {
                      house.wealth = Math.max(20, Math.round(summary.strength * 18 + summary.prestige / 80))
                    }
                    if (!house.power) {
                      house.power = Math.max(5, Math.round(summary.strength / 2))
                    }
                    if (!house.stability) {
                      house.stability = this.randomInt(35, 75)
                    }
                    summary.memberIds.forEach((characterId) => {
                      let character = state.characters[characterId]
                      if (!previousMembers[characterId] && character && (character.fatherId || character.motherId) && this.age(character, state) <= 1) {
                        this.log(society, 'A child is born into ' + summary.name + ': ' + this.characterName(character, state) + '.', 'birth', house.id)
                      }
                    })
                    house.lastSeen = this.monthKey(state)
                    society.houses[house.id] = house
                  }
                  this.normalizeDynastyHouseModel(society, state)
                  if (society.settings.autoGenerate) {
                    this.ensureMinimumHouses(society, state)
                    state = daapi.getState()
                    this.normalizeDynastyHouseModel(society, state)
                  }
                  this.syncPlayerHouseRecord(society, state)
                },
        isNpcCadetOfPlayerDynasty(society, state, house) {
                  let playerHouseId = this.currentCharacterDynastyId(state)
                  return !!(house && playerHouseId && !house.isPlayerHouse && String(house.id) !== String(playerHouseId) &&
                    (house.cadetHouse || house.houseKind === 'cadet') && house.foundedReason !== 'player branch foundation' &&
                    String(this.gameDynastyIdForHouse(house)) === String(playerHouseId))
                },
        dissolvePlayerDynastyCadets(society, state, houseIds, logText) {
                  // Dissolves branches of the player's dynasty: everyone of the dynasty living in them
                  // moves back to the player's house, and the houses are removed.
                  let playerHouseId = this.currentCharacterDynastyId(state)
                  if (!playerHouseId || !houseIds || !houseIds.length) {
                    return 0
                  }
                  let moved = 0
                  let dissolveMap = this.idSet(houseIds)
                  Object.keys(state.characters).forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character || String(character.dynastyId || '') !== String(playerHouseId)) {
                      return
                    }
                    let houseId = character.corSocietyHouseId && String(character.corSocietyHouseId)
                    if (houseId && dissolveMap[houseId] && this.repairCharacterHousePointer(state, characterId, playerHouseId)) {
                      moved += 1
                    }
                  })
                  let dynasty = society.dynasties && society.dynasties[playerHouseId]
                  houseIds.forEach((houseId) => {
                    let house = society.houses[houseId]
                    delete society.houses[houseId]
                    society.generatedHouseIds = (society.generatedHouseIds || []).filter((id) => String(id) !== String(houseId))
                    if (dynasty) {
                      dynasty.houseIds = (dynasty.houseIds || []).filter((id) => String(id) !== String(houseId))
                      if (String(dynasty.headHouseId || '') === String(houseId)) dynasty.headHouseId = playerHouseId
                    }
                    this.log(society, logText((house && house.name) || 'An AI cadet house'), 'familyTree', playerHouseId)
                  })
                  return moved
                },
        repairPlayerFamilyHouseAssignment(society, state) {
                  // Repairs saves where an NPC cadet foundation absorbed the player's family into an
                  // AI-controlled house. A cadet founded by someone the player keeps (their line,
                  // ancestors or household, see playerKeptIdMap) is dissolved and everyone in it
                  // moves back to the player household; a sibling's or cousin's cadet stays, and only
                  // the people the player keeps move back. Dead people are dropped from active lists.
                  if (!society || !state || !state.characters || !society.houses) {
                    return 0
                  }
                  let playerHouseId = this.currentCharacterDynastyId(state)
                  if (!playerHouseId) {
                    return 0
                  }
                  let repaired = 0
                  let cadetIds = Object.keys(society.houses).filter((houseId) => this.isNpcCadetOfPlayerDynasty(society, state, society.houses[houseId]))
                  if (cadetIds.length) {
                    let kept = this.playerKeptIdMap(state)
                    let cadetMap = this.idSet(cadetIds)
                    let dissolveIds = cadetIds.filter((houseId) => {
                      let founderId = society.houses[houseId].founderId
                      return !founderId || kept[String(founderId)]
                    })
                    let dissolveMap = this.idSet(dissolveIds)
                    Object.keys(state.characters).forEach((characterId) => {
                      let character = state.characters[characterId]
                      if (!character || String(character.dynastyId || '') !== String(playerHouseId)) {
                        return
                      }
                      let houseId = character.corSocietyHouseId && String(character.corSocietyHouseId)
                      if (houseId && cadetMap[houseId] && !dissolveMap[houseId] && kept[String(characterId)]) {
                        if (this.repairCharacterHousePointer(state, characterId, playerHouseId)) {
                          repaired += 1
                        }
                      }
                    })
                    repaired += this.dissolvePlayerDynastyCadets(society, state, dissolveIds, (name) => name + ' is dissolved: your family stays in the protected player household.')
                  }
                  Object.keys(society.houses).forEach((houseId) => {
                    let house = society.houses[houseId]
                    if (!house) return
                    let isDead = (id) => {
                      let character = state.characters[id]
                      return !!(character && character.isDead)
                    }
                    ;['memberIds', 'notableIds', 'knownMemberIds', 'slaveIds'].forEach((key) => {
                      if (!house[key] || !house[key].some(isDead)) return
                      house.deadMemberIds = this.uniqueIds((house.deadMemberIds || []).concat(house[key].filter(isDead)))
                      house[key] = house[key].filter((id) => !isDead(id))
                      repaired += 1
                    })
                  })
                  if (repaired && this.clearFamilyTreeRuntimeCache) {
                    this.clearFamilyTreeRuntimeCache()
                  }
                  return repaired
                },
        syncPlayerHouseRecord(society, state) {
                  if (!society || !state || !state.characters) {
                    return false
                  }
                  let playerHouseId = this.currentCharacterDynastyId(state)
                  if (!playerHouseId) {
                    return false
                  }
                  this.repairPlayerFamilyHouseAssignment(society, state)
                  let currentId = this.currentCharacterId(state)
                  let player = state.characters[currentId] || {}
                  let dynasty = (state.dynasties && state.dynasties[playerHouseId]) || {}
                  let house = society.houses[playerHouseId] || this.createHouseRecord(playerHouseId)
                  let closeMap = this.playerCloseFamilyIdMap ? this.playerCloseFamilyIdMap(state) : {}
                  let candidateMap = {}
                  let add = (id) => {
                    if (id !== undefined && id !== null && id !== '' && state.characters[id]) {
                      candidateMap[String(id)] = true
                    }
                  }
                  Object.keys(closeMap).forEach(add)
                  if (dynasty && dynasty.memberIds) {
                    dynasty.memberIds.forEach(add)
                  }
                  let freeIds = []
                  let slaveIds = []
                  let ownedSlaveIds = {}
                  ;(society.playerSlaves || []).forEach((record) => {
                    if (record && record.characterId) ownedSlaveIds[String(record.characterId)] = true
                  })
                  Object.keys(candidateMap).forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character || character.isDead) {
                      return
                    }
                    character.id = character.id || characterId
                    let explicitHouseId = character.corSocietyHouseId || ''
                    if (explicitHouseId && String(explicitHouseId) !== String(playerHouseId) && this.houseBelongsToDynasty(society, explicitHouseId, character.dynastyId || '')) {
                      return
                    }
                    let resolvedHouseId = this.resolveCharacterHouseId ? this.resolveCharacterHouseId(character, state, society, { repair: false }) : ''
                    if (resolvedHouseId && String(resolvedHouseId) !== String(playerHouseId) && this.houseBelongsToDynasty(society, resolvedHouseId, character.dynastyId || '')) {
                      return
                    }
                    let explicitSlave = this.isExplicitlyEnslavedCharacter && this.isExplicitlyEnslavedCharacter(character)
                    let slaveBastard = character.corSocietyOrigin === 'private_company_bastard' || character.corSocietyBastard === true
                    // Genuinely owned slaves (bought slaves tracked in playerSlaves, enslaved
                    // dependants, or slave bastards) belong in slaveIds. Bought slaves are placed
                    // in the player's dynasty on purpose, so without this they would be classed as
                    // free members and have their enslaved-dependant origin stripped below.
                    let ownedSlave = explicitSlave && (slaveBastard || !!ownedSlaveIds[String(characterId)] || character.corSocietyOrigin === 'enslaved_dependant')
                    if (ownedSlave) {
                      slaveIds.push(characterId)
                      return
                    }
                    freeIds.push(characterId)
                  })
                  if (!freeIds.length && currentId && state.characters[currentId]) {
                    freeIds.push(String(currentId))
                  }
                  let removeFromHouse = (otherHouse, characterId) => {
                    if (!otherHouse || String(otherHouse.id) === String(playerHouseId)) return
                    otherHouse.memberIds = (otherHouse.memberIds || []).filter((id) => !this.sameCharacterId(id, characterId))
                    otherHouse.notableIds = (otherHouse.notableIds || []).filter((id) => !this.sameCharacterId(id, characterId))
                    otherHouse.slaveIds = (otherHouse.slaveIds || []).filter((id) => !this.sameCharacterId(id, characterId))
                    otherHouse.knownMemberIds = (otherHouse.knownMemberIds || []).filter((id) => !this.sameCharacterId(id, characterId))
                    otherHouse._lastRefreshedSignature = ''
                  }
                  freeIds.concat(slaveIds).forEach((characterId) => {
                    Object.keys(society.houses || {}).forEach((houseId) => removeFromHouse(society.houses[houseId], characterId))
                  })
                  freeIds.forEach((characterId) => {
                    let character = state.characters[characterId]
                    if (!character || character.isDead) return
                    if (character.corSocietyHouseId !== playerHouseId || character.corSocietyOrigin === 'enslaved_dependant') {
                      let patch = {
                        corSocietyHouseId: playerHouseId,
                        corSocietyOrigin: character.corSocietyOrigin === 'enslaved_dependant' ? '' : character.corSocietyOrigin,
                        flagDoNotCull: true
                      }
                      try {
                        daapi.updateCharacter({ characterId, character: patch })
                        Object.assign(character, patch)
                      } catch (err) {
                        console.warn(err)
                      }
                    }
                  })
                  let members = freeIds.map((characterId) => state.characters[characterId]).filter(Boolean)
                  let summary = this.summarizeHouse(playerHouseId, members, state)
                  let status = this.playerSocietyStatus ? this.playerSocietyStatus(state) : false
                  house.id = playerHouseId
                  house.dynastyId = playerHouseId
                  house.gameDynastyId = playerHouseId
                  house.originHouse = true
                  house.houseKind = 'origin'
                  house.type = 'origin'
                  house.founderId = house.founderId || currentId
                  house.branchRootId = house.branchRootId || currentId
                  house.parentHouseId = ''
                  house.createdAtTurn = house.createdAtTurn || this.monthKey(state)
                  house.branchName = 'Player household'
                  house.isPlayerHouse = true
                  house.generated = false
                  house.name = summary.name || this.houseName(dynasty, playerHouseId)
                  house.stratum = (status && status.stratum) || summary.stratum || house.stratum || 'plebeian'
                  house.memberIds = freeIds
                  house.slaveIds = slaveIds
                  house.knownMemberIds = this.uniqueIds(freeIds.concat(slaveIds).concat(house.knownMemberIds || [])).slice(-180)
                  house.notableIds = freeIds
                    .slice()
                    .sort((a, b) => this.characterScore(state.characters[b], state) - this.characterScore(state.characters[a], state))
                    .slice(0, 8)
                  house.prestige = Math.max(parseFloat(house.prestige || 0), parseFloat(summary.prestige || dynasty.prestige || 0))
                  house.heritage = (status && status.heritage) || summary.heritage || house.heritage || dynasty.heritage || 'unknown'
                  house.citizenRank = (status && status.className) || summary.citizenRank || house.citizenRank
                  house.strength = Math.max(1, Math.round(summary.strength || house.strength || 1))
                  house.lastSeen = this.monthKey(state)
                  society.houses[playerHouseId] = house
                  society.generatedHouseIds = (society.generatedHouseIds || []).filter((id) => String(id) !== String(playerHouseId))
                  this.normalizeDynastyHouseModel(society, state)
                  return house
                },
        collectHouseMembers(state, society) {
                  let result = {}
                  let current = state.current || {}
                  let player = state.characters[this.currentCharacterId(state)] || {}
                  let playerDynastyId = player.dynastyId
                  let household = {}
                  ;(current.householdCharacterIds || []).forEach((characterId) => {
                    household[characterId] = true
                  })
                  if (state.dynasties) {
                    for (let dynastyId in state.dynasties) {
                      if (!state.dynasties.hasOwnProperty(dynastyId) || dynastyId === playerDynastyId) {
                        continue
                      }
                      let dynasty = state.dynasties[dynastyId]
                      if (!dynasty || !dynasty.memberIds) continue
                      dynasty.memberIds.forEach((characterId) => {
                        let character = state.characters[characterId]
                        if (!character || character.isDead || !character.dynastyId) {
                          return
                        }
                        if (character.corSocietySlaveMarket && character.corSocietySlaveActive === false) {
                          return
                        }
                        if (household[characterId] && character.dynastyId === playerDynastyId) {
                          return
                        }
                        character.id = character.id || characterId
                        let houseId = this.resolveCharacterHouseId
                          ? this.resolveCharacterHouseId(character, state, society, { repair: true })
                          : (character.corSocietyHouseId || character.dynastyId)
                        if (!houseId) {
                          houseId = character.dynastyId
                        }
                        result[houseId] = result[houseId] || []
                        result[houseId].push(character)
                      })
                    }
                  }
                  return result
                },
        createHouseRecord(houseId, dynastyId) {
                  dynastyId = dynastyId || houseId
                  return {
                    id: houseId,
                    dynastyId,
                    gameDynastyId: dynastyId,
                    originHouse: String(houseId) === String(dynastyId),
                    houseKind: String(houseId) === String(dynastyId) ? 'origin' : 'cadet',
                    type: String(houseId) === String(dynastyId) ? 'origin' : 'cadet',
                    founderId: '',
                    parentHouseId: String(houseId) === String(dynastyId) ? '' : String(dynastyId),
                    branchRootId: '',
                    createdAtTurn: '',
                    version: this.version,
                    branchName: String(houseId) === String(dynastyId) ? 'House of origin' : 'Cadet house',
                    // Callers that know better overwrite this; repair code that creates an origin house
                    // for a dynasty with no living members does not, which left it nameless.
                    name: this.fallbackHouseName ? this.fallbackHouseName(null, null, dynastyId) : '',
                    relation: this.randomInt(-12, 16),
                    favor: 0,
                    heat: 0,
                    rivalry: false,
                    patronageUntil: '',
                    tradeUntil: '',
                    wealth: 0,
                    power: 0,
                    stability: this.randomInt(35, 75),
                    ai: false,
                    agenda: this.pick(['office', 'wealth', 'honor', 'marriage', 'security', 'revenge']),
                    lastFamilyEvent: '',
                    pendingPlayerEvent: false,
                    lastInteraction: '',
                    notes: []
                  }
                },
        summarizeHouse(dynastyId, members, state) {
                  let dynasty = state.dynasties[dynastyId] || {}
                  let prestige = parseFloat(dynasty.prestige || 0)
                  let inheritance = 0
                  let maxJob = 0
                  let hasSenate = false
                  let memberIds = []
                  members.forEach((character) => {
                    memberIds.push(character.id)
                    inheritance += parseFloat(character.inheritance || 0)
                    maxJob = Math.max(maxJob, parseFloat(character.jobLevel || 0))
                    if (this.isSenatorialCharacter(character, state)) {
                      hasSenate = true
                    }
                  })
                  let strength = Math.round(prestige / 1000 + inheritance / 100 + maxJob * 8 + members.length * 4 + (hasSenate ? 60 : 0))
                  let notableIds = members
                    .slice()
                    .sort((a, b) => this.characterScore(b, state) - this.characterScore(a, state))
                    .slice(0, 8)
                    .map((character) => character.id)
                  return {
                    name: this.houseName(dynasty, dynastyId),
                    stratum: this.classifyHouse(dynasty, members, strength, hasSenate),
                    strength,
                    memberIds,
                    notableIds,
                    prestige,
                    heritage: dynasty.heritage || 'unknown',
                    citizenRank: this.rankFromStrength(strength)
                  }
                }
      })
      window.corSociety._mixinCorSocietyDynastyModelVersion = '1.1.331'
    }
  }
}
