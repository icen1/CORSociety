{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyModuleIndex() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyModuleIndexVersion === '1.1.331') {
        return
      }
      Object.assign(window.corSociety, {
        moduleManifest() {
          return [
            '/cor_society/modules/index',
            '/cor_society/modules/config',
            '/cor_society/modules/core_startup',
            '/cor_society/modules/presentation',
            '/cor_society/modules/dynasty_model',
            '/cor_society/modules/people_generation',
            '/cor_society/modules/monthly_economy',
            '/cor_society/modules/house_life_romance_slaves',
            '/cor_society/modules/relations_events',
            '/cor_society/modules/menus',
            '/cor_society/modules/actions_status',
            '/cor_society/modules/crests',
            '/cor_society/modules/portraits_wardrobe',
            '/cor_society/modules/roster_overlays',
            '/cor_society/modules/log_utils',
            '/cor_society/modules/politics',
            '/cor_society/modules/technical_safety',
            '/cor_society/modules/roman_systems',
            '/cor_society/modules/diagnostics',
            '/cor_society/modules/population'
          ]
        },
        moduleMixinManifest() {
          return [
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
            { event: '/cor_society/modules/technical_safety', method: '_mixinCorSocietyTechnicalSafety' },
            { event: '/cor_society/modules/roman_systems', method: '_mixinCorSocietyRomanSystems' },
            { event: '/cor_society/modules/diagnostics', method: '_mixinCorSocietyDiagnostics' },
            { event: '/cor_society/modules/population', method: '_mixinCorSocietyPopulation' }
          ]
        }
      })
      window.corSociety._mixinCorSocietyModuleIndexVersion = '1.1.331'
    }
  }
}
