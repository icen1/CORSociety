// Switch characters: offered on the living members of the player's household (the game's household
// list), never on the played character. Roman Society's monthly sweep removes it from anyone who
// leaves the household.
{
  canTriggerIfUnavailable: true,
  checkType: 'householdCharacters',
  checkAndAct(characterId) {
    let character = daapi.getCharacter({ characterId })
    let current = daapi.getState().current
    let icon = daapi.requireImage('/cor_society/bundled/play_as/switch.svg')
    let stored = character && character.actions && character.actions.play_as
    if (
      String(characterId) !== String(current.id) &&
      (current.householdCharacterIds || []).map(String).indexOf(String(characterId)) > -1 &&
      character &&
      !character.isDead
    ) {
      if (stored && stored.icon === icon && stored.title === 'Play As') {
        return
      }
      daapi.addCharacterAction({
        characterId,
        key: 'play_as',
        action: {
          title: 'Play As',
          icon,
          isAvailable: true,
          hideWhenBusy: false,
          process: {
            event: '/cor_society/bundled/play_as/main',
            method: 'process',
            context: {
              characterId
            }
          }
        }
      })
    } else if (stored) {
      daapi.deleteCharacterAction({
        characterId,
        key: 'play_as'
      })
    }
  },
  methods: {
    process({ characterId }) {
      let character = daapi.getCharacter({ characterId })
      if (!character || character.isDead) {
        daapi.deleteCharacterAction({
          characterId,
          key: 'play_as'
        })
        return
      }
      daapi.pushInteractionModalQueue({
        title: 'Play as ' + character.praenomen + '?',
        message: 'Would you like to play as ' + `[c|${characterId}|${character.praenomen}]` + '?',
        image: daapi.requireImage('/cor_society/bundled/play_as/switch.svg'),
        options: [
          {
            variant: 'info',
            text: 'Yes please',
            action:{
              event: '/cor_society/bundled/play_as/main',
              method: 'doSwitch',
              context: {characterId}
            }
          },
          {
            text: 'No, thank you'
          }
        ]
      })
    },
    doSwitch({ characterId }) {
      daapi.setCurrentCharacter({ characterId })
      daapi.deleteCharacterAction({
        characterId,
        key: 'play_as'
      })
    }
  }
}
