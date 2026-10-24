{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {
    try {
      daapi.invokeMethod({
        event: '/cor_society/engine',
        method: 'boot'
      })
      daapi.invokeMethod({
        event: '/cor_society/engine',
        method: 'showInstallNoticeOnce'
      })
    } catch (err) {
      console.warn(err)
      try {
        daapi.setGlobalFlag({
          flag: 'corSocietyLastError',
          data: err.name + ': ' + err.message
        })
        if (!daapi.getGlobalFlag({ flag: 'corSocietyStartupErrorShown' })) {
          daapi.setGlobalFlag({ flag: 'corSocietyStartupErrorShown', data: true })
          daapi.pushInteractionModalQueue({
            title: 'Roman Society startup error',
            message: 'The mod button was registered, but startup failed: ' + err.name + ': ' + err.message,
            image: daapi.requireImage('/cor_society/icon.svg')
          })
        }
      } catch (noticeErr) {
        console.warn(noticeErr)
      }
    }
  },
  methods: {
    boot() {
      if (window.corSociety && window.corSociety.version === '1.1.331') {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'applyRefactorMixins' })
        if (window.corSociety.installStateSnapshotCache) {
          window.corSociety.installStateSnapshotCache()
        }
        if (window.corSociety.installRefreshCoalescer) {
          window.corSociety.installRefreshCoalescer()
        }
        if (window.corSociety.installGameErrorLogGuard) {
          window.corSociety.installGameErrorLogGuard()
        }
        if (window.corSociety.installPopulationCountGuard) {
          window.corSociety.installPopulationCountGuard()
        }
        if (window.corSociety.syncInheritanceEligibility) {
          window.corSociety.syncInheritanceEligibility()
        }
        if (window.corSociety.installPoliticsGuards) {
          window.corSociety.installPoliticsGuards()
          window.corSociety.syncPoliticalStanding()
        }
        window.corSociety.installDebugConsoleCommand()
        window.corSociety.installDebtSaleModalPatch()
        window.corSociety.registerPlayerEntryActions()
        window.corSociety.startPlayerCrestOverlay()
        window.corSociety.startPlayerStatusOverlay()
        if (window.corSociety.installVanillaFamilyButtonRedirect) {
        window.corSociety.installVanillaFamilyButtonRedirect()
      }
        return
      }

      window.corSociety = {
        version: '1.1.331',
        event: '/cor_society/engine',
        flag: 'corSocietyState',
        noticeFlag: 'corSocietyInstallNoticeSeen'
      }

      daapi.invokeMethod({ event: '/cor_society/engine', method: 'applyRefactorMixins' })
      if (window.corSociety.installStateSnapshotCache) {
        window.corSociety.installStateSnapshotCache()
      }
      if (window.corSociety.installRefreshCoalescer) {
        window.corSociety.installRefreshCoalescer()
      }
      if (window.corSociety.installGameErrorLogGuard) {
        window.corSociety.installGameErrorLogGuard()
      }
      if (window.corSociety.installPopulationCountGuard) {
        window.corSociety.installPopulationCountGuard()
      }
      if (window.corSociety.syncInheritanceEligibility) {
        window.corSociety.syncInheritanceEligibility()
      }
      if (window.corSociety.installPoliticsGuards) {
        window.corSociety.installPoliticsGuards()
        window.corSociety.syncPoliticalStanding()
      }
      window.corSociety.ensure()
      window.corSociety.installDebugConsoleCommand()
      window.corSociety.installDebtSaleModalPatch()
      window.corSociety.registerPlayerEntryActions()
      window.corSociety.startPlayerCrestOverlay()
      window.corSociety.startPlayerStatusOverlay()
      if (window.corSociety.installVanillaFamilyButtonRedirect) {
        window.corSociety.installVanillaFamilyButtonRedirect()
      }
    },
    applyRefactorMixins() {
      try {
        daapi.invokeMethod({ event: '/cor_society/modules/index', method: '_mixinCorSocietyModuleIndex' })
      } catch (err) {
        console.warn('Roman Society module index failed', err)
      }
      let mixins = window.corSociety && window.corSociety.moduleMixinManifest
        ? window.corSociety.moduleMixinManifest()
        : [
        { event: '/cor_society/modules/config', method: '_mixinCorSocietyConfig' },
        { event: '/cor_society/modules/core_startup', method: '_mixinCorSocietyCoreStartup' },
        { event: '/cor_society/modules/presentation', method: '_mixinCorSocietyPresentation' },
        { event: '/cor_society/modules/dynasty_model', method: '_mixinCorSocietyDynastyModel' },
        { event: '/cor_society/modules/people_generation', method: '_mixinCorSocietyPeopleGeneration' },
        { event: '/cor_society/modules/monthly_economy', method: '_mixinCorSocietyMonthlyEconomy' },
        { event: '/cor_society/modules/house_life_romance_slaves', method: '_mixinCorSocietyHouseLifeRomanceSlaves' },
        { event: '/cor_society/modules/relations_events', method: '_mixinCorSocietyRelationsEvents' },
        { event: '/cor_society/modules/menus', method: '_mixinCorSocietyMenus' },
        { event: '/cor_society/modules/actions_status', method: '_mixinCorSocietyActionsStatus' },
        { event: '/cor_society/modules/crests', method: '_mixinCorSocietyCrests' },
        { event: '/cor_society/modules/portraits_wardrobe', method: '_mixinCorSocietyPortraitsWardrobe' },
        { event: '/cor_society/modules/roster_overlays', method: '_mixinCorSocietyRosterOverlays' },
        { event: '/cor_society/modules/log_utils', method: '_mixinCorSocietyLogUtils' },
        { event: '/cor_society/modules/politics', method: '_mixinCorSocietyPolitics' },
        { event: '/cor_society/modules/migrations', method: '_mixinCorSocietyMigrations' },
        { event: '/cor_society/modules/technical_safety', method: '_mixinCorSocietyTechnicalSafety' },
        { event: '/cor_society/modules/roman_systems', method: '_mixinCorSocietyRomanSystems' },
        { event: '/cor_society/modules/diagnostics', method: '_mixinCorSocietyDiagnostics' },
        { event: '/cor_society/modules/population', method: '_mixinCorSocietyPopulation' },
        { event: '/cor_society/modules/family', method: '_mixinCorSocietyFamily' },
        { event: '/cor_society/modules/politics_integration', method: '_mixinCorSocietyPoliticsIntegration' }
      ]
      mixins.forEach((mixin) => {
        try {
          daapi.invokeMethod(mixin)
        } catch (err) {
          console.warn('Roman Society mixin failed: ' + mixin.event + ' / ' + mixin.method, err)
        }
      })
    },
    monthlyTick() {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.monthlyTick()
    },
    showInstallNoticeOnce() {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.showInstallNoticeOnce()
    },
    openHub() {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.openHub()
    },
    openEstate(args) {
      window.corSociety.runAction('openEstate', args || {})
    },
    openDynasty(args) {
      window.corSociety.runAction('openDynasty', args || {})
    },
    createPlayerCadetHouse(args) {
      window.corSociety.runAction('createPlayerCadetHouse', args || {})
    },
    openRelations() {
      window.corSociety.openRelations()
    },
    openAllies(args) {
      window.corSociety.runAction('openAllies', args || {})
    },
    openRivals(args) {
      window.corSociety.runAction('openRivals', args || {})
    },
    openLog(args) {
      window.corSociety.runAction('openLog', args || {})
    },
    openLogEntry(args) {
      window.corSociety.runAction('openLogEntry', args || {})
    },
    openDebugConsole(args) {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.runAction('openDebugConsole', args || {})
    },
    openDeadHouses(args) {
      window.corSociety.runAction('openDeadHouses', args || {})
    },
    openDeadHouse(args) {
      window.corSociety.runAction('openDeadHouse', args || {})
    },
    openDeadHouseFamilyTree(args) {
      window.corSociety.runAction('openDeadHouseFamilyTree', args || {})
    },
    openPlayerCrest() {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.openPlayerCrest()
    },
    randomizePlayerCrest() {
      window.corSociety.randomizePlayerCrest()
    },
    cyclePlayerCrest(args) {
      window.corSociety.runAction('cyclePlayerCrest', args || {})
    },
    togglePlayerCrestOverlay() {
      window.corSociety.togglePlayerCrestOverlay()
    },
    openWardrobe() {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.openWardrobe()
    },
    openWardrobeCharacter(args) {
      window.corSociety.runAction('openWardrobeCharacter', args || {})
    },
    applyWardrobeOutfit(args) {
      window.corSociety.runAction('applyWardrobeOutfit', args || {})
    },
    openHouse(args) {
      window.corSociety.runAction('openHouse', args || {})
    },
    openPeople(args) {
      window.corSociety.runAction('openPeople', args || {})
    },
    openMemberGroups(args) {
      window.corSociety.runAction('openMemberGroups', args || {})
    },
    openMemberGroup(args) {
      window.corSociety.runAction('openMemberGroup', args || {})
    },
    openPerson(args) {
      window.corSociety.runAction('openPerson', args || {})
    },
    openFamilyCharacterSheet(args) {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.runAction('openFamilyCharacterSheet', args || {})
    },
    openPolitics(args) {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.runAction('openPolitics', args || {})
    },
    politicsAction(args) {
      window.corSociety.runAction('politicsAction', args || {})
    },
    romanSystemsAction(args) {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.runAction('romanSystemsAction', args || {})
    },
    debugMakeDictator(args) {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      return window.corSociety.runAction('debugMakeDictator', args || {})
    },
    debugMakeEmperor(args) {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      return window.corSociety.runAction('debugMakeEmperor', args || {})
    },
    openVanillaActions(args) {
      window.corSociety.runAction('openVanillaActions', args || {})
    },
    openVanillaKnownFamily(args) {
      window.corSociety.runAction('openVanillaKnownFamily', args || {})
    },
    openVanillaFullFamilyTree(args) {
      window.corSociety.runAction('openVanillaFullFamilyTree', args || {})
    },
    openFamilyTree(args) {
      window.corSociety.runAction('openFamilyTree', args || {})
    },
    openDynastyTree(args) {
      window.corSociety.runAction('openDynastyTree', args || {})
    },
    openHouseFamilyTree(args) {
      window.corSociety.runAction('openHouseFamilyTree', args || {})
    },
    openPlayerFamilyTree() {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.openPlayerFamilyTree()
    },
    closeFamilyTreeOverlay() {
      window.corSociety.closeFamilyTreeOverlay()
    },
    openMarriageHousehold(args) {
      window.corSociety.runAction('openMarriageHousehold', args || {})
    },
    openMarriageCandidates(args) {
      window.corSociety.runAction('openMarriageCandidates', args || {})
    },
    confirmSocietyMarriage(args) {
      window.corSociety.runAction('confirmSocietyMarriage', args || {})
    },
    performSocietyMarriage(args) {
      window.corSociety.runAction('performSocietyMarriage', args || {})
    },
    // The bundled sub-mods call these from the game's monthly list, right after main.js starts the
    // month: they only register buttons, so they skip runAction, which would finish the month at once.
    registerBundledBankActions(args) {
      window.corSociety.registerBundledBankActions(args || {})
    },
    registerBundledSlaveActions(args) {
      window.corSociety.registerBundledSlaveActions(args || {})
    },
    registerBundledMatchmakerAction(args) {
      window.corSociety.registerBundledMatchmakerAction(args || {})
    },
    openBankOfRome() {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.openBankOfRome()
    },
    takeBankLoan(args) {
      window.corSociety.runAction('takeBankLoan', args || {})
    },
    takeEmergencyDebtLoan(args) {
      window.corSociety.runAction('takeEmergencyDebtLoan', args || {})
    },
    payBankLoan(args) {
      window.corSociety.runAction('payBankLoan', args || {})
    },
    deferBankPayment(args) {
      window.corSociety.runAction('deferBankPayment', args || {})
    },
    openPrivateLoans(args) {
      window.corSociety.runAction('openPrivateLoans', args || {})
    },
    openPrivateLoanOffer(args) {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.runAction('openPrivateLoanOffer', args || {})
    },
    offerPrivateLoan(args) {
      window.corSociety.runAction('offerPrivateLoan', args || {})
    },
    openPrivateLoanBorrowers(args) {
      window.corSociety.runAction('openPrivateLoanBorrowers', args || {})
    },
    openPrivateLoanRequest(args) {
      window.corSociety.runAction('openPrivateLoanRequest', args || {})
    },
    requestPrivateLoan(args) {
      window.corSociety.runAction('requestPrivateLoan', args || {})
    },
    payPlayerPrivateLoan(args) {
      window.corSociety.runAction('payPlayerPrivateLoan', args || {})
    },
    extendPlayerPrivateLoan(args) {
      window.corSociety.runAction('extendPlayerPrivateLoan', args || {})
    },
    defaultPlayerPrivateLoan(args) {
      window.corSociety.runAction('defaultPlayerPrivateLoan', args || {})
    },
    claimPrivateLoanDebtBond(args) {
      window.corSociety.runAction('claimPrivateLoanDebtBond', args || {})
    },
    extendPrivateLoan(args) {
      window.corSociety.runAction('extendPrivateLoan', args || {})
    },
    openHouseholdSlaves(args) {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.runAction('openHouseholdSlaves', args || {})
    },
    openPlayerSlavePath(args) {
      if (!window.corSociety) {
        daapi.invokeMethod({ event: '/cor_society/engine', method: 'boot' })
      }
      window.corSociety.runAction('openPlayerSlavePath', args || {})
    },
    playerSlaveWorkExtra(args) {
      window.corSociety.runAction('playerSlaveWorkExtra', args || {})
    },
    playerSlavePetitionFreedom(args) {
      window.corSociety.runAction('playerSlavePetitionFreedom', args || {})
    },
    playerSlaveSeekPatron(args) {
      window.corSociety.runAction('playerSlaveSeekPatron', args || {})
    },
    playerSlaveEscape(args) {
      window.corSociety.runAction('playerSlaveEscape', args || {})
    },
    openSlaveMarket(args) {
      window.corSociety.runAction('openSlaveMarket', args || {})
    },
    buySlave(args) {
      window.corSociety.runAction('buySlave', args || {})
    },
    openManageSlave(args) {
      window.corSociety.runAction('openManageSlave', args || {})
    },
    openAssignSlaveTask(args) {
      window.corSociety.runAction('openAssignSlaveTask', args || {})
    },
    assignSlaveTask(args) {
      window.corSociety.runAction('assignSlaveTask', args || {})
    },
    openSlaveEducationTargets(args) {
      window.corSociety.runAction('openSlaveEducationTargets', args || {})
    },
    setSlaveEducationTarget(args) {
      window.corSociety.runAction('setSlaveEducationTarget', args || {})
    },
    privateCompanySlave(args) {
      window.corSociety.runAction('privateCompanySlave', args || {})
    },
    legitimizeSlaveBastard(args) {
      window.corSociety.runAction('legitimizeSlaveBastard', args || {})
    },
    openSlaveMarriageCandidates(args) {
      window.corSociety.runAction('openSlaveMarriageCandidates', args || {})
    },
    marryOwnedSlaves(args) {
      window.corSociety.runAction('marryOwnedSlaves', args || {})
    },
    acceptSlaveSelfPurchase(args) {
      window.corSociety.runAction('acceptSlaveSelfPurchase', args || {})
    },
    sellSlave(args) {
      window.corSociety.runAction('sellSlave', args || {})
    },
    freeSlave(args) {
      window.corSociety.runAction('freeSlave', args || {})
    },
    buyEnslavedCharacter(args) {
      window.corSociety.runAction('buyEnslavedCharacter', args || {})
    },
    captureEnslavedCharacter(args) {
      window.corSociety.runAction('captureEnslavedCharacter', args || {})
    },
    openMatchmaker(args) {
      window.corSociety.runAction('openMatchmaker', args || {})
    },
    acceptMatchmakerCandidate(args) {
      window.corSociety.runAction('acceptMatchmakerCandidate', args || {})
    },
    declineMatchmakerCandidates(args) {
      window.corSociety.runAction('declineMatchmakerCandidates', args || {})
    },
    sendGift(args) {
      window.corSociety.runAction('sendGift', args || {})
    },
    hostDinner(args) {
      window.corSociety.runAction('hostDinner', args || {})
    },
    askSupport(args) {
      window.corSociety.runAction('askSupport', args || {})
    },
    callFamilyCouncil(args) {
      window.corSociety.runAction('callFamilyCouncil', args || {})
    },
    holdHouseholdRites(args) {
      window.corSociety.runAction('holdHouseholdRites', args || {})
    },
    tradeDeal(args) {
      window.corSociety.runAction('tradeDeal', args || {})
    },
    fundTradeSafeguards(args) {
      window.corSociety.runAction('fundTradeSafeguards', args || {})
    },
    pressTradeTerms(args) {
      window.corSociety.runAction('pressTradeTerms', args || {})
    },
    letStandTradeReview(args) {
      window.corSociety.runAction('letStandTradeReview', args || {})
    },
    offerPatronage(args) {
      window.corSociety.runAction('offerPatronage', args || {})
    },
    seekPatronage(args) {
      window.corSociety.runAction('seekPatronage', args || {})
    },
    coverPatronageShortage(args) {
      window.corSociety.runAction('coverPatronageShortage', args || {})
    },
    auditPatronageAccounts(args) {
      window.corSociety.runAction('auditPatronageAccounts', args || {})
    },
    endPatronage(args) {
      window.corSociety.runAction('endPatronage', args || {})
    },
    sponsorTutorship(args) {
      window.corSociety.runAction('sponsorTutorship', args || {})
    },
    requestTutorshipFavor(args) {
      window.corSociety.runAction('requestTutorshipFavor', args || {})
    },
    declineTutorshipExchange(args) {
      window.corSociety.runAction('declineTutorshipExchange', args || {})
    },
    startRivalry(args) {
      window.corSociety.runAction('startRivalry', args || {})
    },
    reconcile(args) {
      window.corSociety.runAction('reconcile', args || {})
    },
    praisePerson(args) {
      window.corSociety.runAction('praisePerson', args || {})
    },
    supportKinshipCharacter(args) {
      window.corSociety.runAction('supportKinshipCharacter', args || {})
    },
    requestIntroduction(args) {
      window.corSociety.runAction('requestIntroduction', args || {})
    },
    inviteHomeTalk(args) {
      window.corSociety.runAction('inviteHomeTalk', args || {})
    },
    courtCharacter(args) {
      window.corSociety.runAction('courtCharacter', args || {})
    },
    courtSpouse(args) {
      window.corSociety.runAction('courtSpouse', args || {})
    },
    resolveCourtship(args) {
      window.corSociety.runAction('resolveCourtship', args || {})
    },
    spreadRumor(args) {
      window.corSociety.runAction('spreadRumor', args || {})
    },
    startStealingFromCharacter(args) {
      window.corSociety.runAction('startStealingFromCharacter', args || {})
    },
    resolveStealingFromCharacter(args) {
      window.corSociety.runAction('resolveStealingFromCharacter', args || {})
    },
    answerSlander(args) {
      window.corSociety.runAction('answerSlander', args || {})
    },
    ignoreSlander(args) {
      window.corSociety.runAction('ignoreSlander', args || {})
    },
    acceptOpening(args) {
      window.corSociety.runAction('acceptOpening', args || {})
    },
    declineOpening(args) {
      window.corSociety.runAction('declineOpening', args || {})
    },
    supportPetition(args) {
      window.corSociety.runAction('supportPetition', args || {})
    },
    refusePetition(args) {
      window.corSociety.runAction('refusePetition', args || {})
    },
    attendFamilyInvitation(args) {
      window.corSociety.runAction('attendFamilyInvitation', args || {})
    },
    declineFamilyInvitation(args) {
      window.corSociety.runAction('declineFamilyInvitation', args || {})
    },
    endorseOffice(args) {
      window.corSociety.runAction('endorseOffice', args || {})
    },
    honorWedding(args) {
      window.corSociety.runAction('honorWedding', args || {})
    },
    judgeInheritance(args) {
      window.corSociety.runAction('judgeInheritance', args || {})
    },
    investVenture(args) {
      window.corSociety.runAction('investVenture', args || {})
    },
    collectVentureResult(args) {
      window.corSociety.runAction('collectVentureResult', args || {})
    },
    treatFamilyMember(args) {
      window.corSociety.runAction('treatFamilyMember', args || {})
    },
    comfortFamilyMember(args) {
      window.corSociety.runAction('comfortFamilyMember', args || {})
    },
    ignoreFamilyDistress(args) {
      window.corSociety.runAction('ignoreFamilyDistress', args || {})
    },
    shieldScandal(args) {
      window.corSociety.runAction('shieldScandal', args || {})
    },
    exploitScandal(args) {
      window.corSociety.runAction('exploitScandal', args || {})
    },
    declineFamilyAffair(args) {
      window.corSociety.runAction('declineFamilyAffair', args || {})
    }
  }
}
