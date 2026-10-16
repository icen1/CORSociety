{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyPresentation() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyPresentationVersion === '1.1.329') {
        return
      }
      Object.assign(window.corSociety, {
        assetIcon(name) {
                  this._iconCache = this._iconCache || {}
                  let key = 'asset:' + (name || '')
                  if (this._iconCache[key]) {
                    return this._iconCache[key]
                  }
                  try {
                    this._iconCache[key] = daapi.requireImage('/cor_society/assets/' + name + '.svg')
                  } catch (err) {
                    console.warn(err)
                    this._iconCache[key] = daapi.requireImage('/cor_society/icon.svg')
                  }
                  return this._iconCache[key]
                },
        bundledIcon(bundle, name) {
                  this._iconCache = this._iconCache || {}
                  let key = 'bundle:' + (bundle || '') + ':' + (name || '')
                  if (this._iconCache[key]) {
                    return this._iconCache[key]
                  }
                  try {
                    this._iconCache[key] = daapi.requireImage('/cor_society/bundled/' + bundle + '/' + name + '.svg')
                  } catch (err) {
                    console.warn(err)
                    this._iconCache[key] = daapi.requireImage('/cor_society/icon.svg')
                  }
                  return this._iconCache[key]
                },
        slaveTypeIcon(type) {
                  let icons = {
                    scribe: 'educator',
                    tutor: 'educator',
                    nurse: 'doctor',
                    midwife: 'doctor',
                    musician: 'entertainer',
                    dancer: 'entertainer',
                    cook: 'labor',
                    artisan: 'labor',
                    groom: 'labor',
                    courier: 'manager',
                    steward: 'manager',
                    accountant: 'manager',
                    bodyguard: 'warrior',
                    gladiator: 'warrior',
                    hunter: 'warrior'
                  }
                  return this.bundledIcon('household_slaves', icons[type] || type || 'household')
                },
        stratumIcon(stratum) {
                  let icons = {
                    senatorial: 'senate',
                    equestrian: 'eques',
                    civic: 'senator',
                    plebeian: 'plebeian',
                    freedmen: 'freedmen',
                    poor: 'poor'
                  }
                  return this.assetIcon(icons[stratum] || 'familyTree')
                },
        affairIcon(kind) {
                  if ((kind === 'war' || kind === 'legion' || kind === 'military' || kind === 'militaryService') && this.vanillaMilitaryIcon) {
                    return this.vanillaMilitaryIcon(kind)
                  }
                  if (kind === 'coins' || kind === 'bank') {
                    return this.vanillaStatIcon('cash', 1)
                  }
                  if (kind === 'prestige' || kind === 'patronage' || kind === 'scandal') {
                    return this.vanillaStatIcon('prestige', 1)
                  }
                  if (kind === 'influence' || kind === 'feud' || kind === 'slander' || kind === 'rivalry') {
                    return this.vanillaStatIcon('influence', 1)
                  }
                  let icons = {
                    law: 'law',
                    prison: 'prison',
                    crime: 'prison',
                    justice: 'prison',
                    war: 'war',
                    legion: 'war',
                    dictator: 'dictator',
                    officeCampaign: 'senator',
                    tradeVenture: 'trade',
                    marriageAlliance: 'wedding',
                    inheritanceDispute: 'familyTree',
                    feud: 'influence',
                    scandal: 'prestige',
                    romance: 'marriage',
                    lover: 'marriage',
                    divorce: 'rivalry',
                    slander: 'influence',
                    petition: 'plebeian',
                    invitation: 'familyTree',
                    support: 'senate',
                    marriage: 'marriage',
                    birth: 'familyTree',
                    death: 'familyTree',
                    gift: 'coins',
                    coins: 'coins',
                    prestige: 'prestige',
                    trade: 'trade',
                    bank: 'coins',
                    slaves: 'familyTree',
                    matchmaker: 'marriage',
                    patronage: 'prestige',
                    rivalry: 'influence',
                    log: 'familyTree'
                  }
                  return this.assetIcon(icons[kind] || 'familyTree')
                },
        vanillaStatIcon(stat, value) {
                  this._iconCache = this._iconCache || {}
                  let amount = parseFloat(value || 0)
                  let key = 'vanilla-stat:' + stat + ':' + (stat === 'cash' && amount < 0 ? 'loss' : 'normal')
                  if (this._iconCache[key]) {
                    return this._iconCache[key]
                  }
                  let paths = {
                    cash: amount < 0 ? 'img/moneyLoss.d7a3a17f.svg' : 'img/coins.c7069303.svg',
                    influence: 'img/influence.ec1c54e6.svg',
                    prestige: 'img/prestige.015fb54a.svg',
                    revenue: 'img/revenue.9f784a4a.svg',
                    property: 'img/moneybag.aef53b64.svg'
                  }
                  try {
                    this._iconCache[key] = daapi.requireImage(paths[stat] || paths.cash)
                  } catch (err) {
                    console.warn(err)
                    this._iconCache[key] = this.assetIcon(stat === 'cash' ? 'coins' : (stat || 'familyTree'))
                  }
                  return this._iconCache[key]
                },
        installDebtSaleModalPatch() {
                  if (this.debtSaleModalPatchInstalled) {
                    this.startDebtSaleModalObserver()
                    return
                  }
                  this.debtSaleModalPatchInstalled = true
                  ;['pushInteractionModalQueue', 'pushInteractionModalButtonQueue'].forEach((methodName) => {
                    try {
                      let original = daapi[methodName]
                      if (typeof original !== 'function' || original.corSocietyDebtSalePatch) {
                        return
                      }
                      let self = this
                      let wrapped = function(payload) {
                        return original.call(this, self.patchDebtSaleModalPayload(payload))
                      }
                      wrapped.corSocietyDebtSalePatch = true
                      daapi[methodName] = wrapped
                    } catch (err) {
                      console.warn(err)
                    }
                  })
                  this.startDebtSaleModalObserver()
                },
        patchDebtSaleModalPayload(payload) {
                  if (!this.isDebtSaleModalPayload(payload)) {
                    return payload
                  }
                  let amount = this.debtLoanAmount(daapi.getState())
                  let patched = { ...(payload || {}) }
                  let options = (patched.options || []).slice()
                  options.unshift(this.debtLoanOption(amount))
                  patched.options = options
                  patched.corSocietyDebtLoanInjected = true
                  return patched
                },
        isDebtSaleModalPayload(payload) {
                  if (!payload || payload.corSocietyDebtLoanInjected || payload.societyMenu) {
                    return false
                  }
                  let text = (String(payload.title || '') + ' ' + String(payload.message || '')).toLowerCase()
                  if (!text || text.indexOf('bank of rome') >= 0) {
                    return false
                  }
                  let options = payload.options || []
                  if (options.some((option) => option && option.action && option.action.method === 'takeEmergencyDebtLoan')) {
                    return false
                  }
                  let cash = parseFloat(((daapi.getState() || {}).current || {}).cash || 0)
                  if (cash >= 0) {
                    return false
                  }
                  let debtWords = ['debt', 'negative', 'owe', 'owed', 'bankrupt', 'bankruptcy', 'deuda', 'negativo']
                  let saleWords = ['sell', 'sale', 'property', 'asset', 'properties', 'slavery', 'vender', 'venta', 'propiedad', 'propiedades']
                  return debtWords.some((word) => text.indexOf(word) >= 0) && saleWords.some((word) => text.indexOf(word) >= 0)
                },
        debtLoanAmount(state) {
                  let cash = parseFloat(((state || {}).current || {}).cash || 0)
                  return Math.max(50, Math.ceil(Math.abs(Math.min(0, cash)) + 25))
                },
        debtLoanOption(amount) {
                  amount = Math.max(1, Math.round(parseFloat(amount || 0)))
                  return {
                    variant: 'danger',
                    text: 'Borrow from Bank of Rome (' + amount + ')',
                    tooltip: 'Covers the current negative cash before selling property. Consequences: principal increases and annual interest applies.',
                    statChanges: { cash: amount },
                    icons: [this.bundledIcon('bank_of_rome', 'money')],
                    action: {
                      event: this.event,
                      method: 'takeEmergencyDebtLoan',
                      context: { amount, corSocietyVanillaStatChanges: { cash: amount } }
                    }
                  }
                },
        startDebtSaleModalObserver() {
                  if (this.debtSaleObserverStarted || typeof document === 'undefined') {
                    return
                  }
                  this.debtSaleObserverStarted = true
                  let syncTimer = false
                  let sync = () => {
                    try {
                      if (window.corSociety) {
                        window.corSociety.injectDebtLoanButtonIntoDebtModal()
                      }
                    } catch (err) {
                      console.warn(err)
                    }
                  }
                  let schedule = () => {
                    if (syncTimer || typeof window === 'undefined') {
                      return
                    }
                    syncTimer = window.setTimeout(() => {
                      syncTimer = false
                      sync()
                    }, 240)
                  }
                  if (typeof MutationObserver !== 'undefined' && document.body) {
                    this.debtSaleObserver = new MutationObserver(schedule)
                    this.debtSaleObserver.observe(document.body, { childList: true, subtree: false })
                  }
                  if (typeof window !== 'undefined' && window.setTimeout) {
                    window.setTimeout(sync, 500)
                    window.setTimeout(sync, 1500)
                  }
                  sync()
                },
        injectDebtLoanButtonIntoDebtModal() {
                  if (typeof document === 'undefined') {
                    return false
                  }
                  let state = daapi.getState()
                  let cash = parseFloat(((state || {}).current || {}).cash || 0)
                  if (cash >= 0) {
                    return false
                  }
                  let amount = this.debtLoanAmount(state)
                  let modals = Array.prototype.slice.call(document.querySelectorAll('#interactionModal, .interaction-modal, .modal.show, .modal'))
                  let modal = modals.find((node) => {
                    if (!node || node.offsetParent === null || node.querySelector('[data-cor-society-bank-debt-option]')) {
                      return false
                    }
                    let text = (node.textContent || '').toLowerCase()
                    if (!text || text.indexOf('bank of rome') >= 0 || text.indexOf('roman society') >= 0) {
                      return false
                    }
                    let hasDebt = ['debt', 'negative', 'owe', 'owed', 'bankrupt', 'bankruptcy', 'deuda', 'negativo'].some((word) => text.indexOf(word) >= 0)
                    let hasSale = ['sell', 'sale', 'property', 'asset', 'properties', 'slavery', 'vender', 'venta', 'propiedad', 'propiedades'].some((word) => text.indexOf(word) >= 0)
                    return hasDebt && hasSale
                  })
                  if (!modal) {
                    return false
                  }
                  let target = modal.querySelector('.modal-footer, .interaction-modal-options, .interaction-modal-content-options, .interaction-modal-content-buttons, .modal-body') || modal
                  let button = document.createElement('button')
                  button.type = 'button'
                  button.setAttribute('data-cor-society-bank-debt-option', '1')
                  button.className = 'btn btn-info cor-society-bank-debt-option'
                  button.textContent = 'Borrow from Bank of Rome (' + amount + ')'
                  button.title = 'Covers negative cash with a Society bank loan before forced property sales.'
                  button.style.margin = '6px'
                  button.style.whiteSpace = 'normal'
                  button.onclick = (event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    button.disabled = true
                    button.textContent = 'Loan taken'
                    this.takeEmergencyDebtLoan({ amount })
                  }
                  target.appendChild(button)
                  return true
                },
        pushModal(payload) {
                  payload = payload || {}
                  if (!payload.corTranslatorPretranslateNow) {
                    payload.corTranslatorSkipPretranslate = true
                    payload.skipTranslatorPretranslate = true
                  }
                  let options = payload.options || []
                  if (payload.societySummaryOptions && payload.societySummaryOptions.length) {
                    options = payload.societySummaryOptions.concat(options)
                  }
                  payload.options = this.decorateModalOptions(this.addSocietyCloseOption(options, payload), payload)
                  delete payload._corSocietyOptionSociety
                  daapi.pushInteractionModalQueue(payload)
                },
        escapeHtml(value) {
                  return String(value === undefined || value === null ? '' : value)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;')
                },
        summaryIcon(src, label) {
                  if (!src) {
                    return ''
                  }
                  return '<img class="cor-society-summary-icon" src="' + this.escapeHtml(src) + '" alt="' + this.escapeHtml(label || '') + '">'
                },
        summaryChip(label, value, icon, tone) {
                  return '<span class="cor-society-summary-chip cor-society-tone-' + this.escapeHtml(tone || 'neutral') + '">' +
                    this.summaryIcon(icon, label) +
                    '<span class="cor-society-summary-chip-label">' + this.escapeHtml(label) + '</span>' +
                    '<strong>' + this.escapeHtml(value) + '</strong>' +
                    '</span>'
                },
        summaryTile(label, value, icon, tone, detail) {
                  return '<div class="cor-society-summary-tile cor-society-tone-' + this.escapeHtml(tone || 'neutral') + '">' +
                    this.summaryIcon(icon, label) +
                    '<div class="cor-society-summary-tile-copy">' +
                    '<span>' + this.escapeHtml(label) + '</span>' +
                    '<strong>' + this.escapeHtml(value) + '</strong>' +
                    (detail ? '<small>' + this.escapeHtml(detail) + '</small>' : '') +
                    '</div>' +
                    '</div>'
                },
        summaryMeter(label, value, min, max, icon, tone) {
                  value = parseFloat(value || 0)
                  min = parseFloat(min)
                  max = parseFloat(max)
                  let range = Math.max(1, max - min)
                  let percent = this.clamp(Math.round(((value - min) / range) * 100), 0, 100)
                  return '<div class="cor-society-summary-meter cor-society-tone-' + this.escapeHtml(tone || this.scoreTone(value)) + '">' +
                    '<div class="cor-society-summary-meter-head">' +
                    this.summaryIcon(icon, label) +
                    '<span>' + this.escapeHtml(label) + '</span>' +
                    '<strong>' + this.escapeHtml(Math.round(value)) + '</strong>' +
                    '</div>' +
                    '<div class="cor-society-summary-meter-track"><span style="width:' + percent + '%"></span></div>' +
                    '</div>'
                },
        scoreTone(value) {
                  value = parseFloat(value || 0)
                  if (value >= 55) return 'good'
                  if (value >= 15) return 'calm'
                  if (value <= -45) return 'bad'
                  if (value <= -12) return 'warn'
                  return 'neutral'
                },
        summarySection(title, icon, body) {
                  return '<section class="cor-society-summary-section">' +
                    '<h4>' + this.summaryIcon(icon, title) + '<span>' + this.escapeHtml(title) + '</span></h4>' +
                    body +
                    '</section>'
                },
        summaryGrid(items) {
                  return '<div class="cor-society-summary-grid">' + (items || []).join('') + '</div>'
                },
        summaryOption(title, value, icons, tooltip, variant) {
                  let text = title ? (title + ': ' + value) : String(value || '')
                  return {
                    variant: variant || 'info',
                    text,
                    disabled: true,
                    showDisabledWithTooltip: true,
                    tooltip: tooltip || text,
                    icons: (icons || []).filter(Boolean)
                  }
                },
        hubSummaryOptions(state, society, counts, rivals, allies, playerStatus) {
                  let houseCount = Object.keys((society && society.houses) || {}).length
                  let orderText = this.stratumOrder
                    .map((stratum) => this.strata[stratum].title + ' ' + (counts[stratum] || 0))
                    .join(' | ')
                  // Prefer the player's political rank (Dictator / Imperator Augustus)
                  // over the property-derived stratum title when one applies.
                  let standingTitle = playerStatus.title
                  try {
                    if (this.playerPoliticalRank) {
                      let rank = this.playerPoliticalRank(society, state)
                      if (rank === 'emperor') standingTitle = 'Imperator Augustus'
                      else if (rank === 'dictator') standingTitle = 'Dictator'
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                  return [
                    this.summaryOption(
                      'Date and standing',
                      'Year ' + state.year + ', month ' + ((state.month || 0) + 1) + ' - ' + standingTitle + (playerStatus.className ? ' (' + playerStatus.className + ')' : ''),
                      [this.affairIcon('log'), this.stratumIcon(playerStatus.stratum)],
                      'Your current Society order is derived from the same property ladder the base game uses.'
                    ),
                    this.summaryOption(
                      'Known society',
                      houseCount + ' houses in ' + this.stratumOrder.length + ' social orders; ' + allies + ' allies/patrons; ' + rivals + ' rivalries.',
                      [this.affairIcon('familyTree'), this.affairIcon('support'), this.affairIcon('rivalry')],
                      'This is the live map of Society houses currently simulated by the mod.'
                    ),
                    this.summaryOption(
                      'Orders',
                      orderText,
                      this.stratumOrder.map((stratum) => this.stratumIcon(stratum)),
                      'Counts by social order. Open an order to inspect its houses.'
                    )
                  ]
                },
        houseSummaryOptions(society, state, house, profile, tradeActive) {
                  let propertySummary = this.housePropertySummary(house)
                  let propertyValue = this.housePropertyValue(house)
                  let propertyRevenue = this.housePropertyRevenue(house, state)
                  let status = house.rivalry ? 'Rivalry' : ((house.relation || 0) >= 55 ? 'Ally' : 'Neutral')
                  let relationVisual = {
                    icon: this.relationIcon(house.relation || 0, house.rivalry ? 'rival' : this.relationshipTypeFromScore(house.relation || 0))
                  }
                  return [
                    this.summaryOption(
                      'Order',
                      profile.title + '; citizen rank ' + (house.citizenRank || 'unknown') + '; status ' + status + '.',
                      [this.stratumIcon(house.stratum), status === 'Rivalry' ? this.affairIcon('rivalry') : this.affairIcon('support')],
                      'Public position, citizen rank, and diplomatic status of this house.'
                    ),
                    this.summaryOption(
                      'Power',
                      'Prestige ' + Math.round(house.prestige || 0) + '; strength ' + Math.round(house.strength || 0) + '; wealth ' + Math.round(house.wealth || 0) + '; power ' + Math.round(house.power || 0) + '.',
                      [this.affairIcon('prestige'), this.affairIcon('influence'), this.affairIcon('coins')],
                      'These values drive how strongly the house can act in Society events.'
                    ),
                    this.summaryOption(
                      'Estate',
                      'AI cash ' + Math.round((house.ai && house.ai.cash) || 0) + '; influence ' + Math.round((house.ai && house.ai.influence) || 0) + '; property value ' + Math.round(propertyValue) + '; revenue ' + Math.round(propertyRevenue) + '; ' + propertySummary + '.',
                      [this.affairIcon('coins'), this.affairIcon('trade')],
                      'Internal estate resources use vanilla Citizen of Rome property values, limits, sale rate, and revenue formulas.'
                    ),
                    this.summaryOption(
                      'Relations',
                      'House relation ' + this.signed(house.relation || 0) + '; stability ' + Math.round(house.stability || 0) + '; favors owed ' + (house.favor || 0) + '; trade ' + (tradeActive ? 'active' : 'none') + '.',
                      [relationVisual.icon, this.affairIcon('familyTree'), this.affairIcon('gift')],
                      'Relationship, stability, favors, and trade state. Trade does not stack.'
                    ),
                    this.summaryOption(
                      'Current affairs',
                      'Agenda ' + (house.agenda || 'unknown') + '; latest ' + (house.lastFamilyEvent || 'none') + '.',
                      [this.affairIcon(house.lastFamilyKind || 'log')],
                      'Recent and current house behavior used by monthly Society turns.'
                    )
                  ]
                },
        personSummaryOptions(society, state, house, character, relatives, social, romance, relationScore, relationRecord, currentId, characterId) {
                  let skills = character.skills || {}
                  let spouse = character.spouseId && state.characters[character.spouseId] ? this.characterName(state.characters[character.spouseId], state) : 'none'
                  let relationText = currentId && !this.sameCharacterId(currentId, characterId)
                    ? this.signed(relationScore) + ' ' + this.relationshipLabel(relationRecord ? relationRecord.type : this.relationshipTypeFromScore(relationScore))
                    : 'controlled character'
                  let relationVisual = currentId && !this.sameCharacterId(currentId, characterId) ? this.relationVisual(society, state, character) : false
                  return [
                    this.summaryOption(
                      'Relation',
                      relationText,
                      [relationVisual ? relationVisual.icon : this.affairIcon('support')],
                      relationVisual ? relationVisual.tooltip : 'This is the currently controlled character.'
                    ),
                    this.summaryOption(
                      'Profile',
                      'Age ' + this.formatAge(character, state) + '; job ' + ((character.job || 'none') + (character.jobLevel ? ' ' + character.jobLevel : '')) + '; spouse ' + spouse + '; children ' + relatives.children.length + '.',
                      [this.affairIcon('familyTree'), this.affairIcon('marriage')],
                      'Basic character facts from the game character record.'
                    ),
                    this.summaryOption(
                      'Skills',
                      'Int ' + Math.round(skills.intelligence || 0) + '; Steward ' + Math.round(skills.stewardship || 0) + '; Eloquence ' + Math.round(skills.eloquence || 0) + '; Combat ' + Math.round(skills.combat || 0) + '.',
                      [this.affairIcon('prestige'), this.affairIcon('trade'), this.affairIcon('senator'), this.affairIcon('rivalry')],
                      'Vanilla skill values used by Society decisions where relevant.'
                    ),
                    this.summaryOption(
                      'Social state',
                      'Introduced ' + (social.introduced ? 'yes' : 'no') + '; rapport ' + Math.round(social.bond || 0) + '; lover ' + (romance ? ('yes, intensity ' + Math.round(romance.intensity || 0)) : 'no') + '; house relation ' + this.signed(house.relation || 0) + '.',
                      [this.affairIcon('invitation'), this.affairIcon('support'), this.affairIcon('lover')],
                      'Society social state for introductions, visits, courtship, and house relations.'
                    )
                  ]
                },
        hubSummaryHtml(state, society, counts, rivals, allies, playerStatus) {
                  let houseCount = Object.keys((society && society.houses) || {}).length
                  let orderChips = this.stratumOrder.map((stratum) => {
                    let profile = this.strata[stratum]
                    return this.summaryChip(profile.title, counts[stratum] || 0, this.stratumIcon(stratum), stratum)
                  }).join('')
                  return '<div class="cor-society-summary cor-society-summary-hub">' +
                    '<div class="cor-society-summary-ribbon">' +
                    this.summaryChip('Date', 'Year ' + state.year + ', month ' + ((state.month || 0) + 1), this.affairIcon('log'), 'calm') +
                    this.summaryChip('Standing', playerStatus.title + (playerStatus.className ? ' (' + playerStatus.className + ')' : ''), this.stratumIcon(playerStatus.stratum), playerStatus.stratum) +
                    '</div>' +
                    this.summaryGrid([
                      this.summaryTile('Known houses', houseCount, this.affairIcon('familyTree'), 'calm', this.stratumOrder.length + ' social orders'),
                      this.summaryTile('Allies / patrons', allies, this.affairIcon('support'), allies ? 'good' : 'neutral', 'Support, favors, and patrons'),
                      this.summaryTile('Open rivalries', rivals, this.affairIcon('rivalry'), rivals ? 'bad' : 'good', 'Hostile houses watching you')
                    ]) +
                    this.summarySection('Social orders', this.affairIcon('familyTree'), '<div class="cor-society-summary-chip-row">' + orderChips + '</div>') +
                    '</div>'
                },
        houseSummaryHtml(society, state, house, profile, tradeActive) {
                  let propertySummary = this.housePropertySummary(house)
                  let propertyValue = this.housePropertyValue(house)
                  let propertyRevenue = this.housePropertyRevenue(house, state)
                  let relationTone = this.scoreTone(house.relation || 0)
                  let status = house.rivalry ? 'Rivalry' : ((house.relation || 0) >= 55 ? 'Ally' : 'Neutral')
                  return '<div class="cor-society-summary cor-society-summary-house">' +
                    '<div class="cor-society-summary-ribbon">' +
                    this.summaryChip('Order', profile.title, this.stratumIcon(house.stratum), house.stratum) +
                    this.summaryChip('Citizen rank', house.citizenRank || 'Unknown', this.affairIcon('senator'), 'calm') +
                    this.summaryChip('Status', status, house.rivalry ? this.affairIcon('rivalry') : this.affairIcon('support'), house.rivalry ? 'bad' : ((house.relation || 0) >= 55 ? 'good' : 'neutral')) +
                    '</div>' +
                    this.summaryGrid([
                      this.summaryTile('Prestige', Math.round(house.prestige || 0), this.affairIcon('prestige'), 'calm'),
                      this.summaryTile('Strength', Math.round(house.strength || 0), this.affairIcon('influence'), 'calm'),
                      this.summaryTile('Wealth', Math.round(house.wealth || 0), this.affairIcon('coins'), 'good'),
                      this.summaryTile('Power', Math.round(house.power || 0), this.affairIcon('senator'), 'calm'),
                      this.summaryTile('AI cash', Math.round((house.ai && house.ai.cash) || 0), this.affairIcon('coins'), 'neutral'),
                      this.summaryTile('AI influence', Math.round((house.ai && house.ai.influence) || 0), this.affairIcon('influence'), 'neutral')
                    ]) +
                    this.summaryMeter('Relation', house.relation || 0, -100, 100, this.affairIcon('support'), relationTone) +
                    this.summaryMeter('Stability', house.stability || 0, 0, 100, this.affairIcon('familyTree'), (house.stability || 0) >= 55 ? 'good' : ((house.stability || 0) < 30 ? 'warn' : 'calm')) +
                    this.summarySection('House economy', this.affairIcon('trade'), '<div class="cor-society-summary-chip-row">' +
                      this.summaryChip('Property value', Math.round(propertyValue), this.affairIcon('coins'), 'neutral') +
                      this.summaryChip('Property revenue', Math.round(propertyRevenue), this.affairIcon('trade'), propertyRevenue > 0 ? 'good' : 'neutral') +
                      this.summaryChip('Holdings', propertySummary, this.affairIcon('familyTree'), 'neutral') +
                      this.summaryChip('Favors owed', house.favor || 0, this.affairIcon('gift'), (house.favor || 0) > 0 ? 'good' : 'neutral') +
                      this.summaryChip('Trade compact', tradeActive ? 'active' : 'none', this.affairIcon('trade'), tradeActive ? 'good' : 'neutral') +
                      '</div>') +
                    this.summarySection('Current affairs', this.affairIcon(house.lastFamilyKind || 'log'), '<div class="cor-society-summary-note">' +
                      '<strong>Agenda:</strong> ' + this.escapeHtml(house.agenda || 'unknown') + '<br>' +
                      '<strong>Latest:</strong> ' + this.escapeHtml(house.lastFamilyEvent || 'none') +
                      '</div>') +
                    '</div>'
                },
        personSummaryHtml(society, state, house, character, relatives, social, romance, relationScore, relationRecord, currentId, characterId) {
                  let skills = character.skills || {}
                  let spouse = character.spouseId && state.characters[character.spouseId] ? this.characterName(state.characters[character.spouseId], state) : 'none'
                  let relationText = currentId && !this.sameCharacterId(currentId, characterId)
                    ? this.signed(relationScore) + ' (' + this.relationshipLabel(relationRecord ? relationRecord.type : this.relationshipTypeFromScore(relationScore)) + ')'
                    : 'controlled character'
                  let relationVisual = currentId && !this.sameCharacterId(currentId, characterId) ? this.relationVisual(society, state, character) : false
                  let traitIcons = this.societyTraitIconList(society, character)
                  let traitBody = traitIcons.length
                    ? traitIcons.map((icon) => this.summaryIcon(icon, 'Trait')).join('') + '<span>' + this.escapeHtml(this.socialTraitSummary(society, character)) + '</span>'
                    : '<span>none</span>'
                  return '<div class="cor-society-summary cor-society-summary-person">' +
                    '<div class="cor-society-summary-ribbon">' +
                    this.summaryChip('Age', this.formatAge(character, state), this.affairIcon('familyTree'), 'calm') +
                    this.summaryChip('Job', (character.job || 'none') + (character.jobLevel ? ' ' + character.jobLevel : ''), this.affairIcon('senator'), 'neutral') +
                    this.summaryChip('Relation to you', relationText, relationVisual ? relationVisual.icon : this.affairIcon('support'), this.scoreTone(relationScore)) +
                    '</div>' +
                    this.summaryGrid([
                      this.summaryTile('Intelligence', Math.round(skills.intelligence || 0), this.affairIcon('prestige'), 'calm'),
                      this.summaryTile('Stewardship', Math.round(skills.stewardship || 0), this.affairIcon('trade'), 'calm'),
                      this.summaryTile('Eloquence', Math.round(skills.eloquence || 0), this.affairIcon('senator'), 'calm'),
                      this.summaryTile('Combat', Math.round(skills.combat || 0), this.affairIcon('rivalry'), 'neutral')
                    ]) +
                    this.summarySection('Family', this.affairIcon('familyTree'), '<div class="cor-society-summary-chip-row">' +
                      this.summaryChip('Spouse', spouse, this.affairIcon('marriage'), spouse === 'none' ? 'neutral' : 'good') +
                      this.summaryChip('Children', relatives.children.length, this.affairIcon('birth'), relatives.children.length ? 'good' : 'neutral') +
                      this.summaryChip('House relation', this.signed(house.relation || 0), this.affairIcon('support'), this.scoreTone(house.relation || 0)) +
                      this.summaryChip('House favors', house.favor || 0, this.affairIcon('gift'), (house.favor || 0) > 0 ? 'good' : 'neutral') +
                      '</div>') +
                    this.summarySection('Social state', this.affairIcon('prestige'), '<div class="cor-society-summary-chip-row">' +
                      this.summaryChip('Introduced', social.introduced ? 'yes' : 'no', this.affairIcon('invitation'), social.introduced ? 'good' : 'neutral') +
                      this.summaryChip('Rapport', Math.round(social.bond || 0), this.affairIcon('support'), this.scoreTone(social.bond || 0)) +
                      this.summaryChip('Lover', romance ? ('yes, intensity ' + Math.round(romance.intensity || 0)) : 'no', this.affairIcon('lover'), romance ? 'warn' : 'neutral') +
                      '</div>') +
                    this.summarySection('Society traits', this.affairIcon('prestige'), '<div class="cor-society-summary-traits">' + traitBody + '</div>') +
                    '</div>'
                },
        addSocietyCloseOption(options, payload) {
                  options = (options || []).slice()
                  if (payload && (payload.disableSocietyClose || payload.requireChoice || payload.isPriority || !payload.societyMenu)) {
                    return options
                  }
                  let hasClose = false
                  for (let i = 0; i < options.length; i++) {
                    let opt = options[i]
                    if (opt && /^close( society)?$/i.test(String(opt.text || '').trim()) && !opt.action) {
                      hasClose = true
                      break
                    }
                  }
                  if (!hasClose) {
                    options.push({
                      text: 'Close Society',
                      tooltip: 'Consequences: closes this Society window; no stats change.'
                    })
                  }
                  return options
                },
        decorateModalOptions(options, payload) {
                  return (options || []).map((option) => this.decorateModalOption(option, payload)).filter(Boolean)
                },
        decorateModalOption(option, payload) {
                  if (!option || typeof option !== 'object') {
                    return option
                  }
                  if (option.options) {
                    option.options = this.decorateModalOptions(option.options, payload)
                  }
                  this.decorateOptionVanillaStatChanges(option, payload)
                  let consequence = this.optionConsequence(option, payload)
                  if (consequence) {
                    option.tooltip = option.tooltip ? option.tooltip + '\n' + consequence : consequence
                  } else if (!option.tooltip) {
                    option.tooltip = this.defaultOptionTooltip(option)
                  }
                  if (option.disabled && option.tooltip) {
                    option.showDisabledWithTooltip = true
                  }
                  return option
                },
        decorateOptionVanillaStatChanges(option, payload) {
                  if (!option || !option.action || option.action.event !== this.event || !option.action.method) {
                    return
                  }
                  let statChanges = option.statChanges || this.methodStatChanges(option, payload)
                  if (!statChanges || typeof statChanges !== 'object') {
                    return
                  }
                  if (!option.statChanges) {
                    option.statChanges = statChanges
                  }
                  option.action.context = option.action.context || {}
                  option.action.context.corSocietyVanillaStatChanges = this.baseStatChangesOnly(statChanges)
                },
        baseStatChangesOnly(statChanges) {
                  statChanges = statChanges || {}
                  let clean = {}
                  ;['cash', 'influence', 'prestige'].forEach((key) => {
                    let value = parseFloat(statChanges[key] || 0)
                    if (value) {
                      clean[key] = value
                    }
                  })
                  return clean
                },
        methodStatChanges(option, payload) {
                  let action = option && option.action
                  let method = action && action.method
                  if (!method) {
                    return false
                  }
                  let context = action.context || {}
                  let house = this.houseFromContext(context, payload)
                  let profile = house ? (this.strata[house.stratum] || this.strata.plebeian) : this.strata.plebeian
                  if (method === 'sendGift' && house) return { cash: -this.actionCost(house, 'gift') }
                  if (method === 'hostDinner' && house) return { cash: -this.actionCost(house, 'dinner'), prestige: 12 }
                  if (method === 'askSupport' && house) return { influence: Math.max(20, Math.round((profile.support || 50) + (house.strength || 0) * 2)) }
                  if (method === 'callFamilyCouncil') return { influence: 12, prestige: 6 }
                  if (method === 'holdHouseholdRites') return { cash: -Math.max(20, Math.round(parseFloat(context.cost || (house ? this.actionCost(house, 'dinner') * 0.45 : 20)))), prestige: 12, influence: 4 }
                  if (method === 'offerPatronage' && house) return { prestige: 8 }
                  if (method === 'seekPatronage' && house) return { influence: Math.max(60, Math.round((house.strength || 20) * 3)), prestige: -5 }
                  if (method === 'startRivalry') return { prestige: 10, influence: 25 }
                  if (method === 'reconcile' && house) return { cash: -this.actionCost(house, 'reconcile'), influence: -20 }
                  if (method === 'praisePerson') return { prestige: 3 }
                  if (method === 'requestIntroduction') return { influence: 35 }
                  if (method === 'supportPetition' && house) return { cash: -this.petitionCost(house), prestige: 7 }
                  if (method === 'attendFamilyInvitation' && house) return { cash: -this.invitationCost(house), prestige: 10 }
                  if (method === 'performSocietyMarriage' && house) {
                    try {
                      let effects = this.marriageEffects(daapi.getState(), house)
                      return effects && effects.stats ? effects.stats : false
                    } catch (err) {
                      console.warn(err)
                    }
                  }
                  let amount = Math.round(parseFloat(context.amount || 0))
                  let cost = Math.round(parseFloat(context.cost || 0))
                  let price = Math.round(parseFloat(context.price || 0))
                  if ((method === 'takeBankLoan' || method === 'takeEmergencyDebtLoan') && amount > 0) return { cash: amount }
                  if (method === 'payBankLoan') {
                    try {
                      let society = this.load()
                      let principal = Math.max(0, Math.round(parseFloat(((society || {}).bank || {}).principal || 0)))
                      let interest = principal ? this.bankInterest(society) : 0
                      let principalPayment = context.interestOnly ? 0 : Math.min(principal, Math.max(0, amount))
                      return { cash: -(interest + principalPayment) }
                    } catch (err) {
                      console.warn(err)
                    }
                  }
                  if (method === 'deferBankPayment') return { prestige: -8, influence: -20 }
                  if (method === 'requestPrivateLoan' && amount > 0) return { cash: amount }
                  if (method === 'payPlayerPrivateLoan' && context.loanId) {
                    try {
                      let society = this.load()
                      let loan = (society.privateLoans || []).find((item) => item && item.id === context.loanId)
                      if (loan && this.playerPrivateLoanTotals) {
                        return { cash: -this.playerPrivateLoanTotals(loan).total }
                      }
                    } catch (err) {
                      console.warn(err)
                    }
                  }
                  if (method === 'defaultPlayerPrivateLoan') return { prestige: -8, influence: -12 }
                  if ((method === 'buySlave' || method === 'buyEnslavedCharacter') && cost > 0) return { cash: -cost }
                  if (method === 'captureEnslavedCharacter' && cost > 0) return { cash: -cost, influence: -10 }
                  if (method === 'privateCompanySlave') return { prestige: 1 }
                  if (method === 'acceptSlaveSelfPurchase' && price > 0) return { cash: price, prestige: 8, influence: 10 }
                  if (method === 'legitimizeSlaveBastard' && cost > 0) return { cash: -cost, prestige: -6, influence: -8 }
                  if (method === 'acceptMatchmakerCandidate' && cost > 0) return { cash: -cost }
                  if (method === 'treatFamilyMember' && cost > 0) return { cash: -cost }
                  if (method === 'ignoreFamilyDistress') return { prestige: -2 }
                  if (method === 'fundTradeSafeguards' && cost > 0) return { cash: -cost, prestige: 3 }
                  if (method === 'pressTradeTerms' && cost > 0) return { influence: -cost }
                  if (method === 'coverPatronageShortage' && cost > 0) return { cash: -cost, prestige: 3 }
                  if (method === 'auditPatronageAccounts' && cost > 0) return { influence: -cost }
                  if (method === 'endPatronage') return { prestige: -3 }
                  if (method === 'sponsorTutorship' && cost > 0) return { cash: -cost, prestige: 2 }
                  if (method === 'requestTutorshipFavor' && cost > 0) return { influence: -cost }
                  return false
                },
        defaultOptionTooltip(option) {
                  let text = String((option && option.text) || '')
                  if (/close/i.test(text)) return 'Consequences: closes this Society window; no stats change.'
                  if (/back|cancel|later|previous/i.test(text)) return 'Consequences: returns without changing stats.'
                  if (/next page/i.test(text)) return 'Consequences: opens the next page; no stats change.'
                  let method = option && option.action && option.action.method
                  if (method && /^open/.test(method)) return 'Consequences: opens another Society view; no stats change.'
                  return ''
                },
        optionConsequence(option, payload) {
                  let action = option && option.action
                  let method = action && action.method
                  if (!method) {
                    return ''
                  }
                  let context = action.context || {}
                  let state = false // Lazy load state only if needed
                  if (method === 'openEstate') return 'Consequences: opens that social order; no stats change.'
                  if (method === 'openRelations') return 'Consequences: opens allies and patrons; no stats change.'
                  if (method === 'openAllies') return 'Consequences: opens allies and patrons; no stats change.'
                  if (method === 'openRivals') return 'Consequences: opens rival houses; no stats change.'
                  if (method === 'openWardrobe') return 'Consequences: opens the household wardrobe; no stats change.'
                  if (method === 'openBankOfRome') return 'Consequences: opens Bank of Rome loans and payments; no stats change yet.'
                  if (method === 'openPrivateLoans') return 'Consequences: opens private lending and borrowing; no stats change yet.'
                  if (method === 'openPrivateLoanBorrowers') return 'Consequences: opens houses you can ask for private loans; no stats change yet.'
                  if (method === 'openPrivateLoanRequest') return 'Consequences: opens possible loan request amounts; no stats change yet.'
                  if (method === 'openHouseholdSlaves') return 'Consequences: opens household slave management; no stats change yet.'
                  if (method === 'openMatchmaker') return 'Consequences: opens matchmaker offers for this character; no stats change yet.'
                  if (method === 'openPlayerFamilyTree') return 'Consequences: opens your Society-style dynasty tree; may add missing dead ancestors and up to a few living kin if absent.'
                  if (method === 'openWardrobeCharacter') return 'Consequences: opens clothing choices for this family member; no stats change.'
                  if (method === 'applyWardrobeOutfit') return 'Consequences: changes Society portrait clothing only; no stats change.'
                  if (method === 'openLog') return 'Consequences: opens past affairs; no stats change.'
                  if (method === 'openLogEntry') return 'Consequences: opens this affair notice; no stats change.'
                  if (method === 'openHub') return 'Consequences: returns to the Society overview; no stats change.'
                  if (method === 'openHouse') return 'Consequences: opens the selected house; no stats change.'
                  if (method === 'openPeople') return 'Consequences: opens member groups; no stats change.'
                  if (method === 'openMemberGroups') return 'Consequences: opens member groups; no stats change.'
                  if (method === 'openMemberGroup') return 'Consequences: opens one member category; no stats change.'
                  if (method === 'openPerson') return 'Consequences: opens this character; no stats change.'
                  if (method === 'openFamilyCharacterSheet') return 'Consequences: opens this family member in Roman Society; no stats change.'
                  if (method === 'openVanillaActions') return 'Consequences: opens this character\'s vanilla / other mods actions; no stats change yet.'
                  if (method === 'openVanillaKnownFamily') return 'Consequences: opens the vanilla known-family screen if the game route is available; no stats change.'
                  if (method === 'openVanillaFullFamilyTree') return 'Consequences: opens the vanilla full-family-tree screen if the game route is available; no stats change.'
                  if (method === 'openFamilyTree') return 'Consequences: opens Society\'s graphical family-tree view; no stats change.'
                  if (method === 'openMarriageHousehold') return 'Consequences: chooses one of your unmarried adult family members; no stats change yet.'
                  if (method === 'openMarriageCandidates') return 'Consequences: chooses possible spouses from this house; no stats change yet.'
                  if (method === 'confirmSocietyMarriage') return 'Consequences: opens the final wedding confirmation; no stats change yet.'
                  if (method === 'randomizePlayerCrest') return 'Consequences: creates a new player shield; no stats change.'
                  if (method === 'cyclePlayerCrest') return 'Consequences: changes this shield part only; no stats change.'
                  if (method === 'togglePlayerCrestOverlay') return 'Consequences: toggles the floating player shield badge; no stats change.'
                  let house = this.houseFromContext(context, payload)
                  let profile = house ? (this.strata[house.stratum] || this.strata.plebeian) : this.strata.plebeian
                  if (method === 'sendGift') return this.effectLine([this.changeText('cash', -this.actionCost(house || {}, 'gift')), '+8 to +16 house relation', 'possible +1 favor'])
                  if (method === 'hostDinner') return this.effectLine([this.changeText('cash', -this.actionCost(house || {}, 'dinner')), '+12 prestige', '+10 to +20 house relation', 'lowers house heat'])
                  if (method === 'askSupport') {
                    let support = Math.max(20, Math.round((profile.support || 50) + ((house && house.strength) || 0) * 2))
                    return this.effectLine(['+' + support + ' influence', (house && house.favor > 0) ? '-1 favor, -4 house relation' : '-16 house relation', '+1 house heat'])
                  }
                  if (method === 'callFamilyCouncil') return this.effectLine(['+12 influence', '+6 prestige', '+house stability', '+close-family relations', '6 month cooldown'])
                  if (method === 'holdHouseholdRites') return this.effectLine(['cash cost', '+12 prestige', '+4 influence', '+house stability', 'lowers household heat', '8 month cooldown'])
                  if (method === 'tradeDeal') {
                    let amount = Math.max(8, Math.round((profile.revenue || 20) + ((house && house.strength) || 0) / 3))
                    return this.effectLine(['+' + amount + ' monthly revenue for 12 months', '+5 house relation'])
                  }
                  if (method === 'takeBankLoan') return this.effectLine(['cash now', 'annual interest payment', 'loan principal remains until repaid'])
                  if (method === 'takeEmergencyDebtLoan') return this.effectLine(['cash enough to cover current debt', 'annual interest payment', 'loan principal remains until repaid'])
                  if (method === 'payBankLoan') return this.effectLine(['cash payment', 'reduces or clears loan principal'])
                  if (method === 'requestPrivateLoan') return this.effectLine(['if accepted: cash gain now', 'private debt due later with interest', 'if refused: no cash changes'])
                  if (method === 'payPlayerPrivateLoan') return this.effectLine(['cash payment', 'closes player private loan', 'creditor relation improves'])
                  if (method === 'extendPlayerPrivateLoan') return this.effectLine(['interest added to principal', 'due date delayed six months', 'creditor relation worsens slightly'])
                  if (method === 'defaultPlayerPrivateLoan') return this.effectLine(['debt grows', '-8 prestige', '-12 influence', 'creditor relation worsens'])
                  if (method === 'buySlave') return this.effectLine(['cash cost', 'adds one household slave', 'monthly task may improve cash, prestige, influence, education, health, or labor output'])
                  if (method === 'buyEnslavedCharacter') return this.effectLine(['cash cost', 'moves this real Society character into your household as a slave', 'origin and previous owner are preserved'])
                  if (method === 'captureEnslavedCharacter') return this.effectLine(['cash and influence cost', 'captures this real Society character as a household slave', 'origin house relation worsens'])
                  if (method === 'sellSlave') return this.effectLine(['cash gain', 'removes that slave and their bonuses'])
                  if (method === 'freeSlave') return this.effectLine(['prestige and influence gain', 'removes that slave and their bonuses'])
                  if (method === 'openSlaveMarket') return 'Consequences: opens available slaves; no stats change until purchase.'
                  if (method === 'openManageSlave') return 'Consequences: opens this slave management view; no stats change yet.'
                  if (method === 'openAssignSlaveTask') return 'Consequences: opens task choices; no stats change yet.'
                  if (method === 'assignSlaveTask') return this.effectLine(['changes future household slave output', 'no immediate stats change'])
                  if (method === 'openSlaveEducationTargets') return 'Consequences: selects a child under 13 for future education ticks; no immediate stats change.'
                  if (method === 'setSlaveEducationTarget') return this.effectLine(['sets pupil for education task', 'future ticks improve skills and may add education traits'])
                  if (method === 'privateCompanySlave') return this.effectLine(['+1 prestige', '+small personal relation', '+2 slave savings', 'risk of illegitimate child (female, age 10-42)', '5 month cooldown'])
                  if (method === 'openSlaveMarriageCandidates') return 'Consequences: chooses another owned household slave; no stats change yet.'
                  if (method === 'marryOwnedSlaves') return this.effectLine(['creates spouse link between two owned slaves', 'future slave-spouse pregnancy may occur', 'no family alliance'])
                  if (method === 'acceptSlaveSelfPurchase') return this.effectLine(['cash payment to your household', 'manumits slave into their own Freedmen house'])
                  if (method === 'legitimizeSlaveBastard') return this.effectLine(['cash, prestige, and influence cost', 'removes slave status', 'moves child into the non-slave father dynasty'])
                  if (method === 'acceptMatchmakerCandidate') return this.effectLine(['cash fee', 'performs vanilla marriage if still valid', 'candidate remains a real Society character'])
                  if (method === 'declineMatchmakerCandidates') return 'Consequences: returns without choosing; candidates remain real Society characters.'
                  if (method === 'offerPatronage') {
                    let stipend = Math.max(8, Math.round((profile.revenue || 20) / 2))
                    return this.effectLine(['-' + stipend + ' monthly revenue for 12 months', '+8 prestige', '+22 house relation', '+1 favor'])
                  }
                  if (method === 'seekPatronage') {
                    let amount = Math.max(60, Math.round(((house && house.strength) || 20) * 3))
                    return this.effectLine(['+' + amount + ' influence', '-5 prestige', '-8 house relation', 'may spend 1 favor'])
                  }
                  if (method === 'startRivalry') return this.effectLine(['+10 prestige', '+25 influence', 'sets relation to -65 or worse', 'starts rivalry'])
                  if (method === 'reconcile') return this.effectLine([this.changeText('cash', -this.actionCost(house || {}, 'reconcile')), '-20 influence', '+38 house relation', 'may end rivalry'])
                  if (method === 'praisePerson') return this.effectLine(['+3 prestige', '+6 house relation'])
                  if (method === 'requestIntroduction') return this.effectLine(['+35 influence', '-3 house relation', 'possible +1 favor', 'unlocks private visits and courtship'])
                  if (method === 'inviteHomeTalk') return this.effectLine(['+4 to +12 personal rapport', '+2 to +8 house relation', '4 month cooldown', 'small chance of gossip'])
                  if (method === 'courtCharacter') return this.effectLine(['may start or deepen a lover relationship', '+rapport on success', '6 month cooldown on failure', 'risk of scandal if either lover is married'])
                  if (method === 'resolveCourtship') return this.effectLine(['success depends on choosing an approach that fits traits and situation', '+rapport and personal relation on success', 'cooldown after attempt', 'possible scandal if married'])
                  if (method === 'treatFamilyMember') return this.effectLine(['cash cost', 'high chance to remove stress/illness/wounds', '+prestige and personal relation on success'])
                  if (method === 'comfortFamilyMember') return this.effectLine(['no cash cost', 'moderate chance to remove stress/depression', '+personal relation'])
                  if (method === 'ignoreFamilyDistress') return this.effectLine(['-2 prestige', '-personal relation'])
                  if (method === 'spreadRumor') return this.effectLine(['usually +35 influence, +5 prestige, -22 house relation', 'if exposed: -15 prestige, -35 relation, rivalry'])
                  if (method === 'answerSlander') return this.effectLine(['-35 influence', '+4 prestige', '-8 house relation', '+2 house heat'])
                  if (method === 'ignoreSlander') return this.effectLine(['-10 prestige', 'lowers house heat'])
                  if (method === 'acceptOpening') return this.effectLine(['+60 influence', '+8 house relation', '+1 favor'])
                  if (method === 'declineOpening') return this.effectLine(['+3 prestige', '-4 house relation'])
                  if (method === 'supportPetition') return this.effectLine([this.changeText('cash', -this.petitionCost(house || {})), '+7 prestige', '+18 house relation', 'possible +1 favor'])
                  if (method === 'refusePetition') return this.effectLine(['-12 house relation'])
                  if (method === 'attendFamilyInvitation') {
                    let cost = this.invitationCost(house || {})
                    return this.effectLine(['-' + cost + ' cash', '+10 prestige', '+14 house relation', 'possible +1 favor'])
                  }
                  if (method === 'declineFamilyInvitation') return this.effectLine(['-7 house relation', '+1 house heat'])
                  if (method === 'endorseOffice') return this.effectLine(['-45 influence', '+10 prestige', '+14 house relation', '+10 house power', '+1 favor'])
                  if (method === 'honorWedding') {
                    let cost = this.actionCost(house || {}, 'wedding')
                    return this.effectLine(['-' + cost + ' cash', '+5 prestige', '+16 house relation', '+5 house stability'])
                  }
                  if (method === 'judgeInheritance') return this.effectLine(['-30 influence', '70%: +12 prestige, +18 relation, +12 stability, +1 favor', 'failure: -8 prestige, -16 relation, -8 stability'])
                  if (method === 'investVenture') {
                    let offer = this.ventureOffer(house || {})
                    let offerCost = context.cost || offer.cost
                    let offerMonths = context.months || offer.months
                    let offerExpected = context.expected || offer.expected
                    return this.effectLine(['-' + offerCost + ' cash', 'result in ' + offerMonths + ' months', 'expected share about +' + offerExpected + ' cash', '+10 house relation'])
                  }
                  if (method === 'shieldScandal') return this.effectLine(['-35 influence', '-4 prestige', '+20 house relation', '+8 stability', '+1 favor'])
                  if (method === 'exploitScandal') return this.effectLine(['+50 influence', '+6 prestige', '-35 house relation', '-8 house power', 'may start rivalry'])
                  if (method === 'declineFamilyAffair') return this.effectLine(['-3 house relation'])
                  if (method === 'performSocietyMarriage') {
                    state = daapi.getState()
                    let effects = house ? this.marriageEffects(state, house) : false
                    if (!effects) return 'Consequences: performs the vanilla marriage and refreshes Society.'
                    let parts = [
                      this.changeText('cash', effects.stats && effects.stats.cash),
                      this.changeText('prestige', effects.stats && effects.stats.prestige),
                      this.changeText('influence', effects.stats && effects.stats.influence),
                      effects.revenue ? '+' + effects.revenue + ' monthly revenue for 24 months' : '',
                      '+' + effects.relation + ' house relation',
                      '+1 favor',
                      'spouse link in vanilla family UI'
                    ]
                    return this.effectLine(parts)
                  }
                  return ''
                },
        houseFromContext(context, payload) {
                  context = context || {}
                  if (context.houseId === undefined || context.houseId === null || context.houseId === '') {
                    return false
                  }
                  let society = payload && payload._corSocietyOptionSociety
                  if (!society) {
                    society = this.load()
                    if (payload) {
                      payload._corSocietyOptionSociety = society
                    }
                  }
                  return society && society.houses ? society.houses[context.houseId] : false
                },
        effectLine(parts) {
                  return 'Consequences: ' + (parts || []).filter(Boolean).join(', ') + '.'
                }
      })
      window.corSociety._mixinCorSocietyPresentationVersion = '1.1.329'
    }
  }
}
