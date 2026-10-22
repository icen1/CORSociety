{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyDiagnostics() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyDiagnosticsVersion === '1.1.331') {
        return
      }
      // Guards the game's own error log. The game wraps console.* and pushes every message into
      // state.current.sessionErrorLog, which is saved with the game.
      Object.assign(window.corSociety, {
        pruneGameSessionErrorLog() {
          // Game bug: its event runner logs errors as console.warn(err, event, [{ state }, ...]) and its
          // console hook stores those arguments in state.current.sessionErrorLog, so every vanilla
          // error saves a full copy of the game state inside the game state (13 MB each in a real
          // save; saving that ran out of memory = white screen). Strip such copies from the live
          // logs, keeping the message. daapi only hands out copies, so this goes through the store.
          let root = this.findGameVueRoot ? this.findGameVueRoot() : null
          let current = root && root.$store && root.$store.state && root.$store.state.current
          if (!current) {
            return 0
          }
          let stripped = 0
          let isState = (value) => !!(value && typeof value === 'object' && value.characters && value.current && value.dynasties)
          let strip = (value, depth) => {
            if (!value || typeof value !== 'object' || depth > 4) {
              return value
            }
            if (isState(value)) {
              stripped += 1
              return '[game state omitted by Roman Society]'
            }
            Object.keys(value).forEach((key) => {
              let next = strip(value[key], depth + 1)
              if (next !== value[key]) {
                value[key] = next
              }
            })
            return value
          }
          this._errorLogSeen = this._errorLogSeen || new WeakMap()
          ;['sessionErrorLog', 'lastSessionErrorLog'].forEach((key) => {
            let list = current[key]
            if (!Array.isArray(list)) {
              return
            }
            let from = this._errorLogSeen.get(list) || 0
            for (let i = from; i < list.length; i += 1) {
              let entry = list[i]
              if (!entry || typeof entry !== 'object') {
                continue
              }
              entry.value = strip(entry.value, 0)
            }
            this._errorLogSeen.set(list, list.length)
          })
          return stripped
        },
        installGameErrorLogGuard() {
          // Prune now, and right before every store action (the month advance and its autosave run
          // inside the nextTimeSlot action).
          this.pruneGameSessionErrorLog()
          let root = this.findGameVueRoot ? this.findGameVueRoot() : null
          let store = root && root.$store
          if (!store || store.__corSocietyErrorLogGuard || typeof store.subscribeAction !== 'function') {
            return false
          }
          store.__corSocietyErrorLogGuard = true
          store.subscribeAction({
            before: () => {
              try {
                if (window.corSociety && window.corSociety.pruneGameSessionErrorLog) {
                  window.corSociety.pruneGameSessionErrorLog()
                }
              } catch (err) {
                // never block a game action
              }
            }
          })
          return true
        }
      })
      window.corSociety._mixinCorSocietyDiagnosticsVersion = '1.1.331'
    }
  }
}
