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
        perfCount(key, n) {
          // Cheap counters and timings the mod records about its own cost; read with corSocietyPerf().
          let perf = this._perf || (this._perf = { counts: {}, times: {} })
          perf.counts[key] = (perf.counts[key] || 0) + (n === undefined ? 1 : n)
        },
        perfTime(key, ms) {
          let perf = this._perf || (this._perf = { counts: {}, times: {} })
          let entry = perf.times[key] || (perf.times[key] = { n: 0, total: 0, max: 0 })
          entry.n += 1
          entry.total += ms
          entry.max = Math.max(entry.max, ms)
        },
        perfReset() {
          this._perf = { counts: {}, times: {} }
        },
        perfReport() {
          // One line: timings by total time (only the slowest monthly step), then counts.
          let perf = this._perf || { counts: {}, times: {} }
          let times = Object.keys(perf.times)
          let slowestStep = times.filter((key) => key.indexOf('monthStep:') === 0).sort((a, b) => perf.times[b].max - perf.times[a].max)[0]
          let parts = times
            .filter((key) => key.indexOf('monthStep:') !== 0 || key === slowestStep)
            .sort((a, b) => perf.times[b].total - perf.times[a].total)
            .map((key) => {
              let entry = perf.times[key]
              return key + ' ' + entry.n + 'x total ' + Math.round(entry.total) + ' ms max ' + Math.round(entry.max)
            })
          Object.keys(perf.counts).forEach((key) => parts.push(key + ' ' + perf.counts[key]))
          return parts.length ? parts.join(' | ') : 'nothing recorded yet'
        },
        installMonthProfiler(store) {
          // Opt-in (window.corSocietyProfile = true in the command console): times each month from the
          // advance until the game's spinner stops, each game save (forceUpdateStore, also every 15 s),
          // and every main-thread task over 50 ms. The mod's own costs are always counted.
          if (typeof window === 'undefined' || window.corSocietyProfile !== true) {
            return false
          }
          if (!store) {
            let root = this.findGameVueRoot ? this.findGameVueRoot() : null
            store = root && root.$store
          }
          if (!store || store.__corSocietyMonthProfiler || typeof store.subscribeAction !== 'function') {
            return false
          }
          store.__corSocietyMonthProfiler = true
          let clock = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())
          let saveStarted = 0
          let actionType = (action) => String((action && action.type) || '').split('/').pop()
          store.subscribeAction({
            before: (action) => {
              try {
                let type = actionType(action)
                if (type === 'nextTimeSlot') {
                  window.corSociety._perfMonthStarted = clock()
                } else if (type === 'forceUpdateStore') {
                  saveStarted = clock()
                }
              } catch (err) {
                // never block a game action
              }
            },
            after: (action) => {
              try {
                if (actionType(action) === 'forceUpdateStore' && saveStarted) {
                  window.corSociety.perfTime('gameSave', clock() - saveStarted)
                  saveStarted = 0
                }
              } catch (err) {
                // never block a game action
              }
            }
          })
          if (typeof store.watch === 'function') {
            store.watch((state) => !!(state && state.current && state.current.showSpinner), (busy) => {
              let started = window.corSociety && window.corSociety._perfMonthStarted
              if (!busy && started) {
                window.corSociety.perfTime('month', clock() - started)
                window.corSociety._perfMonthStarted = 0
              }
            })
          }
          if (!this._perfLongTaskObserver && typeof PerformanceObserver !== 'undefined') {
            try {
              this._perfLongTaskObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => window.corSociety.perfTime('longTask', entry.duration))
              })
              this._perfLongTaskObserver.observe({ entryTypes: ['longtask'] })
            } catch (err) {
              console.warn(err)
            }
          }
          return true
        },
        installGameErrorLogGuard() {
          // Prune now, and right before every store action (the month advance and its autosave run
          // inside the nextTimeSlot action).
          this.pruneGameSessionErrorLog()
          let root = this.findGameVueRoot ? this.findGameVueRoot() : null
          let store = root && root.$store
          if (store) {
            this.installMonthProfiler(store)
          }
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
