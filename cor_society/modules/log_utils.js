{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyLogUtils() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyLogUtilsVersion === '1.1.331') {
        return
      }
      Object.assign(window.corSociety, {
        log(society, text, kind, houseId) {
                  let state = daapi.getState()
                  let entry = {
                    text: 'Y' + state.year + ' M' + ((state.month || 0) + 1) + ': ' + text,
                    kind: kind || this.inferAffairKind(text),
                    houseId: houseId || '',
                    year: state.year || 0,
                    month: (state.month || 0) + 1
                  }
                  society.log = society.log || []
                  society.log.unshift(entry)
                },
        installDebugConsoleCommand() {
                  let self = this
                  let perf = function() {
                    // The profiler's one-line report (see diagnostics.perfReport), then a fresh start.
                    let society = (typeof window !== 'undefined' && window.corSociety) || self
                    let report = society.perfReport ? society.perfReport() : ''
                    if (society.perfReset) {
                      society.perfReset()
                    }
                    return report
                  }
                  let command = function(section) {
                    section = section || 'overview'
                    if (section === 'perf') {
                      // No debug window and no saved snapshot: profiling must not grow the save.
                      let society = (typeof window !== 'undefined' && window.corSociety) || self
                      return society.perfReport ? society.perfReport() : ''
                    }
                    let snapshot = false
                    try {
                      let society = false
                      try {
                        society = (typeof window !== 'undefined' && window.corSociety) || (typeof globalThis !== 'undefined' && globalThis.corSociety) || false
                      } catch (societyErr) {
                        society = false
                      }
                      if (society && society.debugSnapshot) {
                        snapshot = society.debugSnapshot(section)
                      }
                      try {
                        daapi.invokeMethod({
                          event: '/cor_society/engine',
                          method: 'openDebugConsole',
                          context: { section }
                        })
                      } catch (openErr) {
                        console.warn(openErr)
                      }
                    } catch (err) {
                      console.warn(err)
                      snapshot = { error: err.name + ': ' + err.message }
                    }
                    try {
                      daapi.setGlobalFlag({ flag: 'corSocietyLastDebugSnapshot', data: snapshot || { section, requested: true } })
                    } catch (flagErr) {
                      console.warn(flagErr)
                    }
                    return snapshot
                  }
                  let help = function() {
                    return {
                      commands: [
                        'corSocietyDebug()',
                        'daapi.corSocietyDebug()',
                        'daapi.invokeMethod({ event: "/cor_society/engine", method: "openDebugConsole" })',
                        'corSocietyDebug("log")',
                        'corSocietyDebug("houses")',
                        'corSocietyDebug("systems")',
                        'corSocietyDebug("full")',
                        'corSocietyDebug("perf")',
                        'corSocietyPerf()'
                      ],
                      note: 'The command opens the in-game debug window and stores the last snapshot in corSocietyLastDebugSnapshot.'
                    }
                  }
                  let roots = []
                  try { if (typeof window !== 'undefined') roots.push(window) } catch (err) { console.warn(err) }
                  try { if (typeof globalThis !== 'undefined' && roots.indexOf(globalThis) < 0) roots.push(globalThis) } catch (err) { console.warn(err) }
                  try { if (typeof self !== 'undefined' && roots.indexOf(self) < 0) roots.push(self) } catch (err) { console.warn(err) }
                  try {
                    let globalRoot = Function('return this')()
                    if (globalRoot && roots.indexOf(globalRoot) < 0) roots.push(globalRoot)
                  } catch (err) {
                    console.warn(err)
                  }
                  roots.forEach((root) => {
                    try {
                      root.corSocietyDebug = command
                      root.CORSocietyDebug = command
                      root.corSocietyDebugHelp = help
                      root.corSocietyPerf = perf
                    } catch (err) {
                      console.warn(err)
                    }
                  })
                  try {
                    daapi.corSocietyDebug = command
                    daapi.CORSocietyDebug = command
                    daapi.corSocietyDebugHelp = help
                    daapi.corSocietyPerf = perf
                  } catch (err) {
                    console.warn(err)
                  }
                  try {
                    if (typeof document !== 'undefined' && document.documentElement && !document.getElementById('cor-society-debug-command')) {
                      let script = document.createElement('script')
                      script.id = 'cor-society-debug-command'
                      script.textContent = [
                        'function corSocietyDebug(section){',
                        '  if (typeof daapi !== "undefined" && daapi.corSocietyDebug) return daapi.corSocietyDebug(section);',
                        '  if (typeof daapi !== "undefined") return daapi.invokeMethod({event:"/cor_society/engine",method:"openDebugConsole",context:{section:section||"overview"}});',
                        '}',
                        'function CORSocietyDebug(section){ return corSocietyDebug(section); }',
                        'function corSocietyPerf(){ return (typeof daapi !== "undefined" && daapi.corSocietyPerf) ? daapi.corSocietyPerf() : ""; }',
                        'function corSocietyDebugHelp(){ return (typeof daapi !== "undefined" && daapi.corSocietyDebugHelp) ? daapi.corSocietyDebugHelp() : "Use daapi.invokeMethod({ event: \\"/cor_society/engine\\", method: \\"openDebugConsole\\" })"; }'
                      ].join('\n')
                      document.documentElement.appendChild(script)
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                  self.debugConsoleInstalled = true
                  return true
                },
        debugFlag(name) {
                  try {
                    return daapi.getGlobalFlag({ flag: name })
                  } catch (err) {
                    return ''
                  }
                },
        debugSnapshot(section) {
                  section = section || 'overview'
                  let state = daapi.getState()
                  let society = this.load()
                  let houses = Object.keys((society && society.houses) || {}).map((houseId) => society.houses[houseId]).filter(Boolean)
                  let livingHouses = houses.filter((house) => {
                    try {
                      return this.houseLivingMemberIds(society, state, house).length > 0
                    } catch (err) {
                      return false
                    }
                  })
                  let activeLoans = (society.privateLoans || []).filter((loan) => loan && loan.status === 'active')
                  let activeVentures = (society.ventures || []).filter((venture) => venture && venture.status === 'active')
                  let patronage = society.patronage || []
                  let currentId = this.currentCharacterId(state)
                  let current = state.characters && state.characters[currentId]
                  let dynastyHouseValidation = this.validateDynastyHouseSystem ? this.validateDynastyHouseSystem(society, state, { limit: section === 'full' ? 120 : 30 }) : false
                  let snapshot = {
                    version: this.version,
                    section,
                    now: new Date().toISOString(),
                    game: {
                      year: state.year,
                      month: state.month,
                      day: state.day,
                      currentId,
                      currentName: current ? this.characterName({ ...current, id: currentId }, state) : '',
                      currentCash: state.current && state.current.cash,
                      currentInfluence: state.current && state.current.influence,
                      currentPrestige: state.current && state.current.prestige,
                      characterCount: Object.keys(state.characters || {}).length,
                      dynastyCount: Object.keys(state.dynasties || {}).length
                    },
                    society: {
                      houseCount: houses.length,
                      livingHouseCount: livingHouses.length,
                      deadHouseCount: (society.deadHouseIds || []).length,
                      generatedCharacters: (society.generatedCharacterIds || []).length,
                      generatedHouses: (society.generatedHouseIds || []).length,
                      playerFamilyActionMembers: this.playerFamilyActionMemberIds ? this.playerFamilyActionMemberIds(state).length : 0,
                      playerSlaves: (society.playerSlaves || []).length,
                      slaveMarket: (society.slaveMarket || []).length,
                      romances: (society.romances || []).length,
                      pendingPaternities: (society.pendingPaternities || []).length,
                      activePrivateLoans: activeLoans.length,
                      activeVentures: activeVentures.length,
                      logEntries: (society.log || []).length,
                      lastEnsureKey: society.lastEnsureKey || '',
                      lastProcessedStatusMonth: society.lastProcessedStatusMonth || ''
                    },
                    systems: {
                      bank: society.bank || {},
                      activePrivateLoans: activeLoans.slice(0, 20),
                      activeVentures: activeVentures.slice(0, 20),
                      pendingSteals: society.pendingSteals || {},
                      tradeCompacts: society.tradeCompacts || {},
                      patronage: patronage.slice ? patronage.slice(0, 20) : patronage,
                      dynastyHouseValidation
                    },
                    recentLog: (society.log || []).slice(0, 30),
                    errors: {
                      startup: this.debugFlag('corSocietyLastError'),
                      startupShown: this.debugFlag('corSocietyStartupErrorShown')
                    }
                  }
                  if (section === 'houses' || section === 'full') {
                    snapshot.houses = houses.slice(0, section === 'full' ? 500 : 80).map((house) => {
                      return {
                        id: house.id,
                        name: house.name,
                        stratum: house.stratum,
                        relation: house.relation,
                        wealth: house.wealth,
                        power: house.power,
                        stability: house.stability,
                        aiCash: house.ai && house.ai.cash,
                        livingMembers: this.houseLivingMemberIds(society, state, house).length,
                        slaves: (house.slaveIds || []).length,
                        lastFamilyEvent: house.lastFamilyEvent || ''
                      }
                    })
                  }
                  if (section === 'family' || section === 'full') {
                    snapshot.family = this.familyDiagnostics ? this.familyDiagnostics(society, state) : null
                  }
                  if (section === 'full') {
                    // The snapshot is saved in a global flag: plain copies only (getState() hands out live
                    // views), and without modFlags, which hold the Society and earlier snapshots.
                    let current = Object.assign({}, state.current || {})
                    delete current.modFlags
                    snapshot.rawSociety = society
                    snapshot.rawCurrent = this.plainCopy(current)
                    snapshot.rawSettings = this.plainCopy(state.settings)
                  }
                  return snapshot
                },
        familyDiagnostics(society, state) {
                  state = state || daapi.getState()
                  society = society || this.load()
                  let characters = state.characters || {}
                  let currentId = this.currentCharacterId(state)
                  let seen = {}
                  let order = []
                  let addId = (id) => {
                    if (id === undefined || id === null || id === '' || seen[String(id)] || !characters[id]) {
                      return
                    }
                    seen[String(id)] = true
                    order.push(String(id))
                  }
                  let player = characters[currentId] || {}
                  addId(currentId)
                  ;[player.fatherId, player.motherId, player.spouseId].forEach(addId)
                  ;(player.childrenIds || []).forEach(addId)
                  ;[player.fatherId, player.motherId].forEach((pid) => {
                    let parent = characters[pid]
                    if (parent) {
                      ;[parent.fatherId, parent.motherId].forEach(addId)
                      ;(parent.childrenIds || []).forEach(addId)
                    }
                  })
                  let houseId = this.resolveCharacterHouseId ? this.resolveCharacterHouseId(player, state, society, { repair: false }) : ''
                  let house = houseId && society.houses ? society.houses[houseId] : false
                  if (house) {
                    try { (this.buildHouseTreeModel(society, state, house, currentId).memberIds || []).forEach(addId) } catch (err) { console.warn(err) }
                  }
                  let dynastyId = this.gameDynastyIdForHouse(house || {}) || player.dynastyId || ''
                  if (dynastyId) {
                    try { Object.keys(this.dynastyTreeAllowedIdMap(society, state, dynastyId)).forEach(addId) } catch (err) { console.warn(err) }
                  }
                  let members = order.map((id) => {
                    let character = characters[id] || {}
                    let resolvedHouseId = this.resolveCharacterHouseId ? this.resolveCharacterHouseId(character, state, society, { repair: false }) : ''
                    return {
                      id,
                      name: this.characterName({ ...character, id }, state),
                      age: this.age(character, state),
                      dead: !!character.isDead,
                      generated: !!character.corSocietyGenerated,
                      ghost: !!(character.corSocietyGhostParent || character.corSocietyGeneratedConnector),
                      houseId: resolvedHouseId || '',
                      dynastyId: character.dynastyId || '',
                      fatherId: character.fatherId || '',
                      motherId: character.motherId || '',
                      spouseId: character.spouseId || '',
                      childrenIds: (character.childrenIds || []).filter((kid) => characters[kid])
                    }
                  })
                  let issues = []
                  members.forEach((member) => {
                    if (member.fatherId && this.sameCharacterId(member.fatherId, member.id)) issues.push('self-father: ' + member.id)
                    if (member.motherId && this.sameCharacterId(member.motherId, member.id)) issues.push('self-mother: ' + member.id)
                    if (member.spouseId && this.sameCharacterId(member.spouseId, member.id)) issues.push('self-spouse: ' + member.id)
                    if (member.spouseId && characters[member.spouseId]) {
                      let partner = characters[member.spouseId]
                      if (String(partner.spouseId || '') !== String(member.id)) {
                        issues.push('asymmetric-spouse: ' + member.id + ' -> ' + member.spouseId + ' (partner.spouse=' + (partner.spouseId || 'none') + ')')
                      }
                    }
                  })
                  let byKey = {}
                  members.forEach((member) => {
                    let character = characters[member.id] || {}
                    let key = (member.name || '') + '|' + (character.birthYear || '')
                    byKey[key] = byKey[key] || []
                    byKey[key].push(member.id)
                  })
                  Object.keys(byKey).forEach((key) => {
                    if (byKey[key].length > 1) {
                      issues.push('possible-duplicate [' + key + ']: ' + byKey[key].join(', '))
                    }
                  })
                  // Distinct characters that share the exact display name (the usual reason the same
                  // name appears several times in a tree: Roman praenomina repeat within a dynasty).
                  let byName = {}
                  members.forEach((member) => {
                    byName[member.name] = byName[member.name] || []
                    byName[member.name].push(member.id)
                  })
                  let nameCollisions = {}
                  Object.keys(byName).forEach((name) => {
                    if (byName[name].length > 1) {
                      nameCollisions[name] = byName[name]
                      issues.push('same-name-different-ids [' + name + ']: ' + byName[name].join(', '))
                    }
                  })
                  return { currentId: String(currentId || ''), houseId: houseId || '', dynastyId: dynastyId || '', count: members.length, issueCount: issues.length, issues, nameCollisions, members }
                },
        debugSectionOptions(section) {
                  let sections = [
                    ['overview', 'Overview'],
                    ['log', 'Recent log'],
                    ['houses', 'Houses'],
                    ['family', 'Player family'],
                    ['systems', 'Systems'],
                    ['full', 'Dump full']
                  ]
                  return sections.map((item) => {
                    return {
                      variant: item[0] === section ? 'info' : undefined,
                      text: item[1],
                      tooltip: item[0] === 'full'
                        ? 'Prints a larger debug snapshot to the browser console and opens a compact in-game view.'
                        : 'Open the ' + item[1].toLowerCase() + ' debug view.',
                      icons: [this.affairIcon(item[0] === 'houses' ? 'familyTree' : item[0] === 'systems' ? 'bank' : 'log')],
                      action: {
                        event: this.event,
                        method: 'openDebugConsole',
                        context: { section: item[0] }
                      }
                    }
                  })
                },
        openDebugConsole({ section, page } = {}) {
                  section = section || 'overview'
                  page = parseInt(page || 0, 10)
                  let snapshot = this.debugSnapshot(section)
                  let options = this.debugSectionOptions(section)
                  let message = ''
                  let summary = []
                  if (section === 'log') {
                    let pageSize = 8
                    let entries = snapshot.recentLog.slice(page * pageSize, page * pageSize + pageSize)
                    message = entries.length ? 'Recent Society log page ' + (page + 1) + '.' : 'No Society log entries recorded yet.'
                    entries.forEach((entry, index) => {
                      options.push({
                        disabled: true,
                        showDisabledWithTooltip: true,
                        text: this.shortText((entry && entry.text) || '', 72),
                        tooltip: (entry && entry.text) || '',
                        icons: [this.affairIcon((entry && entry.kind) || 'log')]
                      })
                    })
                    if ((page + 1) * pageSize < snapshot.recentLog.length) {
                      options.push({ text: 'Next log page', action: { event: this.event, method: 'openDebugConsole', context: { section, page: page + 1 } } })
                    }
                    if (page > 0) {
                      options.push({ text: 'Previous log page', action: { event: this.event, method: 'openDebugConsole', context: { section, page: page - 1 } } })
                    }
                  } else if (section === 'houses') {
                    message = 'House debug summary. Full details are also printed to the browser console.'
                    summary = [
                      this.summaryOption('Houses', snapshot.society.houseCount, [this.affairIcon('familyTree')], 'Total Society houses.'),
                      this.summaryOption('Living', snapshot.society.livingHouseCount, [this.affairIcon('support')], 'Houses with at least one living member.'),
                      this.summaryOption('Dead', snapshot.society.deadHouseCount, [this.affairIcon('death')], 'Archived extinct houses.')
                    ]
                    ;(snapshot.houses || []).slice(0, 12).forEach((house) => {
                      options.push({
                        disabled: true,
                        showDisabledWithTooltip: true,
                        text: this.shortText(house.name + ' - ' + house.stratum + ' (' + house.livingMembers + ')', 70),
                        tooltip: 'Relation: ' + this.signed(house.relation || 0) + '\nWealth: ' + Math.round(house.wealth || 0) + '\nPower: ' + Math.round(house.power || 0) + '\nStability: ' + Math.round(house.stability || 0) + '\nLast: ' + (house.lastFamilyEvent || 'none'),
                        icons: [this.stratumIcon(house.stratum)]
                      })
                    })
                  } else if (section === 'systems') {
                    message = 'System state for bank, private loans, ventures, romances, slaves, pending paternity, and recent errors.'
                    summary = [
                      this.summaryOption('Bank principal', Math.round((snapshot.systems.bank && snapshot.systems.bank.principal) || 0), [this.affairIcon('bank')], 'Player Bank of Rome principal.'),
                      this.summaryOption('Loans', snapshot.society.activePrivateLoans, [this.affairIcon('coins')], 'Active private loans.'),
                      this.summaryOption('Ventures', snapshot.society.activeVentures, [this.affairIcon('trade')], 'Active Society ventures.'),
                      this.summaryOption('Romances', snapshot.society.romances, [this.affairIcon('romance')], 'Tracked Society romances.'),
                      this.summaryOption('Paternity', snapshot.society.pendingPaternities, [this.affairIcon('birth')], 'Pending secret/illegitimate paternity records.'),
                      this.summaryOption('Last error', snapshot.errors.startup ? 'present' : 'none', [this.affairIcon('log')], snapshot.errors.startup || 'No startup error flag.')
                    ]
                  } else if (section === 'family') {
                    let family = snapshot.family || { count: 0, issueCount: 0, issues: [], members: [] }
                    message = 'Player family diagnostics (full detail in the browser console). Members compared by ID. ' +
                      family.count + ' related characters, ' + family.issueCount + ' data issue(s).'
                    summary = [
                      this.summaryOption('Related', family.count, [this.affairIcon('familyTree')], 'Characters related to the player by blood/house/dynasty.'),
                      this.summaryOption('Issues', family.issueCount, [this.affairIcon(family.issueCount ? 'rivalry' : 'support')], family.issueCount ? family.issues.slice(0, 6).join('\n') : 'No self-link, asymmetric-spouse or duplicate issues detected.'),
                      this.summaryOption('Current', family.currentId || '', [this.affairIcon('familyTree')], 'Player character id.')
                    ]
                    ;(family.issues || []).slice(0, 10).forEach((issue) => {
                      options.push({ disabled: true, showDisabledWithTooltip: true, text: this.shortText(issue, 72), tooltip: issue, icons: [this.affairIcon('rivalry')] })
                    })
                    ;(family.members || []).slice(0, 14).forEach((member) => {
                      options.push({
                        disabled: true,
                        showDisabledWithTooltip: true,
                        text: this.shortText(member.name + ' #' + member.id + (member.dead ? ' (dead)' : ' (age ' + member.age + ')'), 72),
                        tooltip: 'id: ' + member.id + '\nhouse: ' + member.houseId + '\ndynasty: ' + member.dynastyId +
                          '\nfather: ' + member.fatherId + '\nmother: ' + member.motherId + '\nspouse: ' + member.spouseId +
                          '\nchildren: ' + (member.childrenIds.join(', ') || 'none') +
                          '\ngenerated: ' + member.generated + ' ghost: ' + member.ghost,
                        icons: [this.affairIcon('familyTree')]
                      })
                    })
                  } else if (section === 'full') {
                    message = 'Full debug snapshot printed to the browser console. The in-game view stays compact to avoid freezing the UI.'
                    summary = [
                      this.summaryOption('Characters', snapshot.game.characterCount, [this.affairIcon('familyTree')], 'Game character records.'),
                      this.summaryOption('Society houses', snapshot.society.houseCount, [this.affairIcon('support')], 'Society house records.'),
                      this.summaryOption('Generated chars', snapshot.society.generatedCharacters, [this.affairIcon('birth')], 'Generated Society characters.')
                    ]
                  } else {
                    message = 'CORSociety debug console. Use corSocietyDebug(), daapi.corSocietyDebug(), corSocietyDebug("log"), corSocietyDebug("houses"), corSocietyDebug("systems"), or corSocietyDebug("full") from the DAAPI command console.'
                    summary = [
                      this.summaryOption('Version', snapshot.version, [daapi.requireImage('/cor_society/icon.svg')], 'Loaded Society version.'),
                      this.summaryOption('Date', 'Y' + snapshot.game.year + ' M' + ((snapshot.game.month || 0) + 1), [this.affairIcon('log')], 'Current game date.'),
                      this.summaryOption('Current', snapshot.game.currentName || snapshot.game.currentId || 'unknown', [this.affairIcon('familyTree')], 'Current player character.'),
                      this.summaryOption('Actions', snapshot.society.playerFamilyActionMembers, [daapi.requireImage('/cor_society/assets/scroll.svg')], 'Family members registered for Society Sheet action.'),
                      this.summaryOption('Logs', snapshot.society.logEntries, [this.affairIcon('log')], 'Society log entries stored.'),
                      this.summaryOption('Last error', snapshot.errors.startup ? 'present' : 'none', [this.affairIcon('rivalry')], snapshot.errors.startup || 'No startup error flag.')
                    ]
                  }
                  options.push({ text: 'Refresh', action: { event: this.event, method: 'openDebugConsole', context: { section, page } } })
                  options.push({ text: 'Close' })
                  this.pushModal({
                    societyMenu: true,
                    title: 'CORSociety Debug',
                    message,
                    societySummaryOptions: summary,
                    image: daapi.requireImage('/cor_society/icon.svg'),
                    options
                  })
                },
        normalizeLogEntry(entry, index) {
                  if (entry && typeof entry === 'object') {
                    return {
                      index,
                      text: entry.text || '',
                      kind: entry.kind || this.inferAffairKind(entry.text || ''),
                      houseId: entry.houseId || ''
                    }
                  }
                  let text = String(entry || '')
                  return {
                    index,
                    text,
                    kind: this.inferAffairKind(text),
                    houseId: ''
                  }
                },
        inferAffairKind(text) {
                  text = String(text || '').toLowerCase()
                  if (text.indexOf('marriage') >= 0 || text.indexOf('wedding') >= 0) return 'marriage'
                  if (text.indexOf('birth') >= 0 || text.indexOf('child') >= 0 || text.indexOf('expecting') >= 0 || text.indexOf('pregnan') >= 0) return 'birth'
                  if (text.indexOf('trade') >= 0 || text.indexOf('venture') >= 0 || text.indexOf('compact') >= 0) return 'tradeVenture'
                  if (text.indexOf('rival') >= 0 || text.indexOf('feud') >= 0 || text.indexOf('rumor') >= 0 || text.indexOf('slander') >= 0) return 'rivalry'
                  if (text.indexOf('petition') >= 0) return 'petition'
                  if (text.indexOf('office') >= 0 || text.indexOf('campaign') >= 0) return 'officeCampaign'
                  if (text.indexOf('scandal') >= 0) return 'scandal'
                  if (text.indexOf('inheritance') >= 0) return 'inheritanceDispute'
                  if (text.indexOf('gift') >= 0) return 'gift'
                  if (text.indexOf('patronage') >= 0 || text.indexOf('favor') >= 0) return 'patronage'
                  return 'log'
                },
        shortText(text, maxLength) {
                  text = String(text || '').replace(/\s+/g, ' ').trim()
                  maxLength = maxLength || 64
                  if (text.length <= maxLength) {
                    return text
                  }
                  return text.slice(0, Math.max(8, maxLength - 3)).replace(/\s+\S*$/, '') + '...'
                },
        romanPlace(kind) {
                  let pools = {
                    road: this.romanRoads,
                    district: this.romanDistricts,
                    hill: this.romanHills,
                    landmark: this.romanLandmarks,
                    region: this.romanRegions,
                    estate: this.romanEstateLocations
                  }
                  let pool = pools[kind]
                  if (!pool || !pool.length) {
                    pool = [].concat(this.romanDistricts || [], this.romanLandmarks || [], this.romanRoads || [])
                  }
                  if (!pool || !pool.length) {
                    return 'the city'
                  }
                  return this.pick(pool)
                },
        romanEstateLocation() {
                  return this.romanPlace('estate')
                },
        monthKey(state) {
                  return String(state.year || 0) + '-' + String(state.month || 0)
                },
        futureMonthKey(months) {
                  let state = daapi.getState()
                  let total = (state.year || 0) * 13 + (state.month || 0) + months
                  return Math.floor(total / 13) + '-' + (total % 13)
                },
        monthKeyReached(targetKey, state) {
                  return this.monthIndex(this.monthKey(state || daapi.getState())) >= this.monthIndex(targetKey)
                },
        monthIndex(key) {
                  let parts = String(key || '0-0').split('-')
                  return (parseInt(parts[0] || 0, 10) * 13) + parseInt(parts[1] || 0, 10)
                },
        safeId(value) {
                  return String(value || '').replace(/[^a-zA-Z0-9_]/g, '_')
                },
        installStateSnapshotCache(options) {
                  // daapi.getState() deep-copies the whole game state on every call (game 1.6.37:
                  // JSON.parse(stringifySafe(state))), and the mod calls it from ~400 places, so most of a
                  // month's work was copying. Hand out a copy-on-write view of the live state instead
                  // (stateView): reads see the game as it is, writes stay in the view. One view per
                  // synchronous task; any other daapi call may change the game, so it drops the view, and
                  // code that edits a getState() result in place must call invalidateStateSnapshot() so
                  // nobody else in the task sees the edit. window.corSocietyDisableLiveState = true brings
                  // back one copy per task.
                  if (options && typeof options.liveState === 'function') {
                    this._liveStateSource = options.liveState
                  }
                  if (typeof daapi === 'undefined' || !daapi || typeof daapi.getState !== 'function') {
                    return false
                  }
                  if (daapi.getState.__corSocietySnapshot) {
                    // already wrapped (a new boot in the same session): share the task cache it uses
                    this._stateSnapshotHolder = daapi.getState.__corSocietyHolder || this._stateSnapshotHolder
                    return true
                  }
                  let holder = { value: null }
                  this._stateSnapshotHolder = holder
                  // The wrappers outlive this object if window.corSociety is ever replaced (a new boot in
                  // the same session): they work through whichever object is current when they run.
                  let installer = this
                  let current = () => (typeof window !== 'undefined' && window.corSociety) || installer
                  let original = daapi.getState
                  let reads = { getState: true, getCharacter: true, getDynasty: true, getGlobalFlag: true, getCharacterFlag: true, requireImage: true, getCharacterIcon: true, getPetIcon: true, getJobsForCharacter: true }
                  // Modal / UI-only calls change nothing the mod reads back, and the bundled translator
                  // hooks the modal queue by function identity, so leave them untouched.
                  let untouched = { pushInteractionModalQueue: true, pushInteractionModalButtonQueue: true, displayInteractionModal: true, updateInteractionModal: true, processInteractionModalQueue: true, forceUpdateCharacterDisplay: true, playSound: true, openDevTools: true, closeDevTools: true }
                  Object.keys(daapi).forEach((key) => {
                    let fn = daapi[key]
                    if (typeof fn !== 'function' || reads[key] || untouched[key] || /^calculate/.test(key) || /^corSociety|^CORSociety/.test(key)) {
                      return
                    }
                    // Only plain data reaches the game: a state view passed in an argument (a look, a
                    // features object, a debug snapshot) is replaced by a plain copy. The Society flag
                    // is the exception, too big to walk on every save; nothing may store a view there.
                    let wrapped = function() {
                      let self = current()
                      let society = key === 'setGlobalFlag' && arguments[0] && arguments[0].flag === self.flag
                      let args = !society && self.detachStateViews ? Array.prototype.map.call(arguments, (arg) => self.detachStateViews(arg)) : arguments
                      // A write that would change nothing never reaches the game (see isNoOpDaapiWrite).
                      if (!(typeof window !== 'undefined' && window.corSocietyDisableNoopFilter) && self.isNoOpDaapiWrite) {
                        let live = self.liveGameState()
                        if (live && self.isNoOpDaapiWrite(key, args[0], live)) {
                          if (self.perfCount) {
                            self.perfCount('daapiWriteSkipped')
                          }
                          return key === 'updateCharacter' ? self.plainCopy(live.characters[args[0].characterId]) : undefined
                        }
                      }
                      if (self.perfCount) {
                        self.perfCount('daapiWrite')
                      }
                      holder.value = null
                      // the game's character rebuild this write triggers is coalesced (installRefreshCoalescer)
                      self._daapiWriteDepth = (self._daapiWriteDepth || 0) + 1
                      try {
                        return fn.apply(this, args)
                      } finally {
                        self._daapiWriteDepth -= 1
                        holder.value = null
                      }
                    }
                    // keep markers other mods put on the function (e.g. hook versions)
                    Object.keys(fn).forEach((prop) => {
                      wrapped[prop] = fn[prop]
                    })
                    daapi[key] = wrapped
                  })
                  // A redraw request changes nothing the mod reads, but the game answers it with the same
                  // whole-`characters` rebuild as a write: count it as a daapi call so it is coalesced too.
                  if (typeof daapi.forceUpdateCharacterDisplay === 'function') {
                    let redraw = daapi.forceUpdateCharacterDisplay
                    let wrappedRedraw = function() {
                      let self = current()
                      self._daapiWriteDepth = (self._daapiWriteDepth || 0) + 1
                      try {
                        return redraw.apply(this, arguments)
                      } finally {
                        self._daapiWriteDepth -= 1
                      }
                    }
                    Object.keys(redraw).forEach((prop) => {
                      wrappedRedraw[prop] = redraw[prop]
                    })
                    daapi.forceUpdateCharacterDisplay = wrappedRedraw
                  }
                  let clock = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())
                  let take = (target, args) => {
                    let self = current()
                    let live = !(typeof window !== 'undefined' && window.corSocietyDisableLiveState) && self.liveGameState()
                    if (live) {
                      return self.stateView(live)
                    }
                    let started = clock()
                    let value = original.apply(target, args)
                    if (self.perfTime) {
                      self.perfTime('fullCopy', clock() - started)
                    }
                    return value
                  }
                  let snapshot = function() {
                    if (typeof window !== 'undefined' && window.corSocietyDisableSnapshotCache) {
                      holder.value = null
                      return take(this, arguments)
                    }
                    if (holder.value) {
                      return holder.value
                    }
                    holder.value = take(this, arguments)
                    Promise.resolve().then(() => {
                      holder.value = null
                    })
                    return holder.value
                  }
                  snapshot.__corSocietySnapshot = true
                  snapshot.__corSocietyHolder = holder
                  daapi.getState = snapshot
                  return true
                },
        invalidateStateSnapshot() {
                  if (this._stateSnapshotHolder) {
                    this._stateSnapshotHolder.value = null
                  }
                },
        installRefreshCoalescer(store) {
                  // Every character write through daapi makes the game dispatch forceUpdateCharacter, which
                  // rebuilds the whole `characters` object (a copy of every key, made reactive again) and
                  // re-renders whatever shows characters: dozens to hundreds of times in one month. While a
                  // daapi call runs, that dispatch only records the character; the task's end (a microtask)
                  // runs the game's rebuild once for all of them. The game's own dispatches stay immediate.
                  // window.corSocietyDisableRefreshCoalescing = true turns it off.
                  if (!store) {
                    let root = this.findGameVueRoot ? this.findGameVueRoot() : null
                    store = root && root.$store
                  }
                  let entry = store && store._actions && store._actions.forceUpdateCharacter
                  if (!entry || typeof entry[0] !== 'function') {
                    return false
                  }
                  if (entry[0].__corSocietyCoalescer) {
                    return true
                  }
                  // The wrappers outlive this object if window.corSociety is ever replaced (a new boot in
                  // the same session): they work through whichever object is current when they run.
                  let installer = this
                  let current = () => (typeof window !== 'undefined' && window.corSociety) || installer
                  let original = entry[0]
                  let coalesced = function(characterId) {
                    let self = current()
                    if (!(self._daapiWriteDepth > 0) || (typeof window !== 'undefined' && window.corSocietyDisableRefreshCoalescing)) {
                      return original.apply(this, arguments)
                    }
                    let pending = self._pendingRebuild
                    if (!pending || pending.store !== store || pending.state !== store.state) {
                      pending = { store, state: store.state, original, ids: new Set() }
                      self._pendingRebuild = pending
                    }
                    pending.ids.add(String(characterId))
                    if (self.perfCount) {
                      self.perfCount('rebuildRequested')
                    }
                    if (!self._holdRebuilds && !self._rebuildFlushScheduled) {
                      self._rebuildFlushScheduled = true
                      Promise.resolve().then(() => {
                        self._rebuildFlushScheduled = false
                        self.flushCoalescedRefreshes()
                      })
                    }
                    return Promise.resolve()
                  }
                  coalesced.__corSocietyCoalescer = true
                  entry[0] = coalesced
                  return true
                },
        flushCoalescedRefreshes() {
                  // Runs the game's character rebuild once for every character recorded since the last flush.
                  // Records belong to the game state they were made in: after a save load they are dropped.
                  let killed = typeof window !== 'undefined' && window.corSocietyDisableRefreshCoalescing
                  let pending = this._pendingRebuild
                  if (!pending || (this._holdRebuilds && !killed)) {
                    return 0
                  }
                  this._pendingRebuild = null
                  if (pending.store.state !== pending.state) {
                    return 0
                  }
                  let characters = (pending.state && pending.state.characters) || {}
                  let ids = Array.from(pending.ids).filter((id) => characters[id])
                  if (!ids.length) {
                    return 0
                  }
                  try {
                    // the game marks each changed character (charHash) and rebuilds once, for the last one
                    ids.slice(0, -1).forEach((id) => {
                      characters[id].charHash = Math.random()
                    })
                    pending.original.call(pending.store, ids[ids.length - 1])
                    if (this.perfCount) {
                      this.perfCount('rebuildRun')
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                  return ids.length
                },
        holdCoalescedRefreshes(on) {
                  // While held (a month being processed), rebuilds wait; releasing runs them once.
                  this._holdRebuilds = !!on
                  if (!on) {
                    return this.flushCoalescedRefreshes()
                  }
                  return 0
                },
        STATE_VIEW: typeof Symbol === 'function' ? Symbol('corSocietyStateView') : '__corSocietyStateView',
        liveGameState() {
                  // The game's live Vuex state, the object daapi.getState() serializes; null when the game
                  // is not reachable (loading, or outside the game).
                  try {
                    if (this._liveStateSource) {
                      return this._liveStateSource() || null
                    }
                    let root = this.findGameVueRoot ? this.findGameVueRoot() : null
                    let state = root && root.$store && root.$store.state
                    return state && typeof state === 'object' && state.current && state.characters ? state : null
                  } catch (err) {
                    return null
                  }
                },
        stateView(target) {
                  // A read-through, copy-on-write view of a live game object. Reads see the live value
                  // (objects come back as views too); writes and deletes stay in this view and never reach
                  // the game. Arrays answer with the plain Array methods, not Vue's patched ones, so a push on
                  // a view neither changes nor notifies the live array. A prototype change also stays in the
                  // view; freezing or sealing one is refused, since a proxy can only report it by freezing
                  // the live object.
                  let marker = this.STATE_VIEW
                  let overlays = new WeakMap()
                  let views = new WeakMap()
                  let prototypes = new WeakMap()
                  let removed = {}
                  let overlay = (object) => {
                    let entries = overlays.get(object)
                    if (!entries) {
                      entries = new Map()
                      overlays.set(object, entries)
                    }
                    return entries
                  }
                  let viewOf
                  let handler = {
                    get(object, key) {
                      if (key === marker) {
                        return true
                      }
                      let entries = overlays.get(object)
                      if (entries && entries.has(key)) {
                        let value = entries.get(key)
                        return value === removed ? undefined : value
                      }
                      if (prototypes.has(object) && !Object.prototype.hasOwnProperty.call(object, key)) {
                        let proto = prototypes.get(object)
                        return proto ? Reflect.get(proto, key) : undefined
                      }
                      if (Array.isArray(object) && typeof Array.prototype[key] === 'function' && !Object.prototype.hasOwnProperty.call(object, key)) {
                        return Array.prototype[key]
                      }
                      let value = Reflect.get(object, key)
                      if (!value || typeof value !== 'object') {
                        return value
                      }
                      if (!Object.isExtensible(object)) {
                        // a frozen property must report its own object
                        let own = Reflect.getOwnPropertyDescriptor(object, key)
                        if (own && !own.configurable && !own.writable) {
                          return value
                        }
                      }
                      return viewOf(value)
                    },
                    set(object, key, value) {
                      let entries = overlay(object)
                      if (Array.isArray(object) && typeof key === 'string') {
                        // keep array length rules: shortening drops the entries past the new end, writing
                        // past the end grows the array
                        let length = handler.get(object, 'length')
                        if (key === 'length') {
                          for (let i = Number(value); i < length; i += 1) {
                            entries.set(String(i), removed)
                          }
                        } else if (/^(0|[1-9]\d*)$/.test(key) && Number(key) >= length) {
                          entries.set('length', Number(key) + 1)
                        }
                      }
                      entries.set(key, value)
                      return true
                    },
                    deleteProperty(object, key) {
                      overlay(object).set(key, removed)
                      return true
                    },
                    defineProperty(object, key, descriptor) {
                      overlay(object).set(key, descriptor && 'value' in descriptor ? descriptor.value : undefined)
                      return true
                    },
                    has(object, key) {
                      if (key === marker) {
                        return true
                      }
                      let entries = overlays.get(object)
                      if (entries && entries.has(key)) {
                        return entries.get(key) !== removed
                      }
                      if (prototypes.has(object) && !Object.prototype.hasOwnProperty.call(object, key)) {
                        let proto = prototypes.get(object)
                        return !!proto && key in proto
                      }
                      return key in object
                    },
                    getPrototypeOf(object) {
                      return prototypes.has(object) ? prototypes.get(object) : Reflect.getPrototypeOf(object)
                    },
                    setPrototypeOf(object, proto) {
                      prototypes.set(object, proto)
                      return true
                    },
                    preventExtensions() {
                      return false
                    },
                    ownKeys(object) {
                      let keys = Reflect.ownKeys(object)
                      let entries = overlays.get(object)
                      if (!entries) {
                        return keys
                      }
                      let out = keys.filter((key) => entries.get(key) !== removed)
                      entries.forEach((value, key) => {
                        if (value !== removed && out.indexOf(key) < 0) {
                          out.push(key)
                        }
                      })
                      return out
                    },
                    getOwnPropertyDescriptor(object, key) {
                      let own = Reflect.getOwnPropertyDescriptor(object, key)
                      let entries = overlays.get(object)
                      if (entries && entries.has(key)) {
                        let value = entries.get(key)
                        if (value === removed) {
                          return undefined
                        }
                        return { value, writable: true, enumerable: own ? own.enumerable : true, configurable: !own || own.configurable }
                      }
                      if (!own || !own.configurable) {
                        return own
                      }
                      // Answered lazily: listing keys (Object.keys, for...in, JSON) only needs enumerability,
                      // so no view is built for a value until it is read.
                      return {
                        get: () => handler.get(object, key),
                        set: (value) => {
                          handler.set(object, key, value)
                        },
                        enumerable: own.enumerable,
                        configurable: true
                      }
                    }
                  }
                  viewOf = (object) => {
                    let view = views.get(object)
                    if (!view) {
                      view = new Proxy(object, handler)
                      views.set(object, view)
                    }
                    return view
                  }
                  return viewOf(target)
                },
        isNoOpDaapiWrite(name, args, live) {
                  // True when a daapi write would leave the live game state as it is. The game rebuilds its
                  // whole `characters` object and re-renders for every character write (forceUpdateCharacter),
                  // so a write that changes nothing is pure cost. Only writes whose effect is fully known are
                  // judged, and only for a character that exists; anything else is left to the game. Traits are
                  // left alone: adding a trait the character has adds a stack, and neither call rebuilds when
                  // it changes nothing.
                  let character = args && live && live.characters && live.characters[args.characterId]
                  if (!character || typeof character !== 'object') {
                    return false
                  }
                  let isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
                  // deep equality, where a key holding undefined is the same as a missing key
                  let same = (a, b) => {
                    if (a === b) {
                      return true
                    }
                    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) {
                      return false
                    }
                    if (Array.isArray(a)) {
                      return a.length === b.length && a.every((value, i) => same(value, b[i]))
                    }
                    let keys = Object.keys(a).filter((key) => a[key] !== undefined)
                    let other = Object.keys(b).filter((key) => b[key] !== undefined)
                    return keys.length === other.length && keys.every((key) => same(a[key], b[key]))
                  }
                  // the game's merge (updateCharacter): a nested object merges into a live object, anything
                  // else replaces the live value
                  let merged = (base, patch) => Object.keys(patch).every((key) => {
                    if (isObject(patch[key]) && isObject(base[key])) {
                      return merged(base[key], patch[key])
                    }
                    return patch[key] === undefined ? base[key] === undefined : same(base[key], patch[key])
                  })
                  let withoutFlag = (value) => {
                    let copy = Object.assign({}, value)
                    delete copy.isDAAPI
                    return copy
                  }
                  let actions = character.actions || {}
                  let statuses = character.statuses || {}
                  if (name === 'updateCharacter') {
                    return isObject(args.character) && merged(character, args.character)
                  }
                  if (name === 'addCharacterAction') {
                    return !!actions[args.key] && isObject(args.action) && same(withoutFlag(actions[args.key]), withoutFlag(args.action))
                  }
                  if (name === 'deleteCharacterAction') {
                    return !(args.key in actions)
                  }
                  if (name === 'addCharacterStatus') {
                    return !!statuses[args.key] && isObject(args.status) && same(withoutFlag(statuses[args.key]), withoutFlag(args.status))
                  }
                  if (name === 'setCharacterStatusActive') {
                    return !!statuses[args.key] && statuses[args.key].isActive === args.isActive
                  }
                  if (name === 'deleteCharacterStatus') {
                    return !(args.key in statuses)
                  }
                  return false
                },
        isStateView(value) {
                  return !!(value && typeof value === 'object' && this.STATE_VIEW && value[this.STATE_VIEW] === true)
                },
        plainCopy(value) {
                  // A plain deep copy (plain JSON, not the game's slower serializer) of a value that may be
                  // or contain a state view.
                  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
                },
        detachStateViews(value, depth) {
                  // The same value with every state view inside replaced by a plain copy. Containers are
                  // copied only along the path to a view; anything else, undefined values included, passes
                  // through untouched.
                  depth = depth || 0
                  if (!value || typeof value !== 'object' || depth > 12) {
                    return value
                  }
                  if (this.isStateView(value)) {
                    return this.plainCopy(value)
                  }
                  let out = value
                  Object.keys(value).forEach((key) => {
                    let next = this.detachStateViews(value[key], depth + 1)
                    if (next !== value[key]) {
                      if (out === value) {
                        out = Array.isArray(value) ? value.slice() : Object.assign({}, value)
                      }
                      out[key] = next
                    }
                  })
                  return out
                },
        daapiReady() {
                  // The game deletes and rebuilds window.daapi (setupDAAPI) when a save loads, and only
                  // repopulates modData after the mod files reload. Timers and observers must skip
                  // that window or they throw "daapi is not defined" / read modData.images of undefined.
                  return typeof daapi !== 'undefined' && !!daapi && !!daapi.modData && !!daapi.modData.images
                },
        signed(value) {
                  value = Math.round(value || 0)
                  return (value > 0 ? '+' : '') + value
                },
        clamp(value, min, max) {
                  return Math.max(min, Math.min(max, value))
                },
        randomInt(min, max) {
                  return Math.floor(min + Math.random() * (max - min + 1))
                },
        pick(list) {
                  list = (list || []).filter((item) => item !== undefined)
                  return list[Math.floor(Math.random() * list.length)]
                },
        pickUnique(list, count) {
                  let pool = (list || []).filter((item, index, arr) => item && arr.indexOf(item) === index)
                  let picked = []
                  while (pool.length && picked.length < count) {
                    let index = Math.floor(Math.random() * pool.length)
                    picked.push(pool.splice(index, 1)[0])
                  }
                  return picked
                }
      })
      window.corSociety._mixinCorSocietyLogUtilsVersion = '1.1.331'
    }
  }
}
