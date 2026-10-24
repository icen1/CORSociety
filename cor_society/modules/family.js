{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyFamily() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyFamilyVersion === '1.1.331') {
        return
      }
      // Links to the game's own family rules. The game's
      // marriage screen offers 'Give their inheritance early, and have them & their new spouse move
      // out' only to characters with flagIsPossibleHeir, which it sets on the children who carry the
      // family line (sons, or matrilineally married daughters) and on a dead parent's children. Its
      // inheritance calculator (module 6b82) already reaches any descendant, and nothing else reads
      // the flag (the marriage checkbox, the monthly heir marking and the 'Move out?' action), so
      // marking every household descendant opens the option for daughters, grandchildren and
      // deeper without touching succession.
      Object.assign(window.corSociety, {
        inheritableDescendantIds(state) {
          let current = (state && state.current) || {}
          let characters = (state && state.characters) || {}
          let household = this.idSet(current.householdCharacterIds || [])
          let ids = []
          let seen = {}
          let stack = ((characters[current.id] || {}).childrenIds || []).map((id) => [id, 1])
          while (stack.length) {
            let [id, depth] = stack.pop()
            if (!id || seen[String(id)] || depth > 12) {
              continue
            }
            seen[String(id)] = true
            let character = characters[id]
            if (!character) {
              continue
            }
            if (!character.isDead && household[String(id)] && !character.hasMovedOut && !character.flagWasGivenInheritance &&
              String(id) !== String(current.id) && String(id) !== String(current.flagDesignatedHeirId || '')) {
              ids.push(id)
            }
            ;(character.childrenIds || []).forEach((childId) => stack.push([childId, depth + 1]))
          }
          return ids
        },
        syncInheritanceEligibility(state) {
          // Monthly and on load: let the game offer the inheritance to every household descendant.
          state = state || daapi.getState()
          if (!state || !state.current || !state.characters) {
            return 0
          }
          let changed = 0
          this.inheritableDescendantIds(state).forEach((id) => {
            let character = state.characters[id]
            if (character.flagIsPossibleHeir) {
              return
            }
            try {
              daapi.updateCharacter({ characterId: id, character: { flagIsPossibleHeir: true } })
              character.flagIsPossibleHeir = true
              changed += 1
            } catch (err) {
              console.warn(err)
            }
          })
          return changed + this.nameGensWomen(state)
        },
        gensFeminine(name) {
          // The game's feminine form of a nomen or cognomen (module 0013): 'Tullius' -> 'Tullia', but
          // 'Cicero' -> 'Cica'.
          let e = String(name || '')
          return e ? (e.substr(0, e.lastIndexOf('ic')) || e.substr(0, e.lastIndexOf('i')) || e.substr(0, e.lastIndexOf('u')) || e.substr(0, e.lastIndexOf('a')) || e) + (e.lastIndexOf('ic') > -1 ? 'ica' : 'ia') : ''
        },
        isGensWoman(character, state) {
          // A living woman of the player's dynasty. The game's full name (module c896) treats anyone who
          // is neither male nor of another gender as a woman.
          if (!character || character.isDead) {
            return false
          }
          let male = character.gender ? character.gender === 'male' : !!character.isMale
          let other = !!character.gender && character.gender !== 'male' && character.gender !== 'female'
          return !male && !other && String(character.dynastyId || '') === String(this.currentCharacterDynastyId(state) || '')
        },
        gensWomanName(character, state, cognomen) {
          // A woman's full name as the game builds it (module c896): feminine nomen, feminine cognomen,
          // agnomen, praenomen. With no cognomen of her own she is 'Tullia Tertia'.
          let dynasty = (state.dynasties && state.dynasties[character.dynastyId]) || {}
          let own = cognomen === undefined ? (character.cognomen || '') : cognomen
          let agnomen = character.agnomen || character.honorific
          return (this.gensFeminine(dynasty.nomen || '') + (own ? ' ' + this.gensFeminine(own) : '') + (agnomen ? ' "' + agnomen + '"' : '') + ' ' + (character.praenomen || '')).trim()
        },
        nameGensWomen(state) {
          // Monthly and on load. Women of the Republic had no cognomen (Cicero's daughter was simply
          // Tullia), and the game's feminine form mangles some ('Cicero' -> 'Cica'). Every woman of the
          // player's gens gets an empty cognomen of her own, which the game shows as nothing.
          state = state || daapi.getState()
          if (!state || !state.characters) {
            return 0
          }
          let named = 0
          Object.keys(state.characters).forEach((characterId) => {
            let character = state.characters[characterId]
            if (!this.isGensWoman(character, state) || character.cognomen !== undefined) {
              return
            }
            try {
              daapi.updateCharacter({ characterId, character: { cognomen: '' } })
              character.cognomen = ''
              named += 1
            } catch (err) {
              console.warn(err)
            }
          })
          return named
        },
        nameGensWomenInText(state, text) {
          // A girl born into the gens is named in her birth notice and notification before she has her
          // empty cognomen ('Tullia Cica Secunda'). She gets it here, and the text names her as she now is.
          if (typeof text !== 'string' || text.indexOf('[c|') < 0) {
            return text
          }
          return text.replace(/\[c\|([^|\]]+)\|([^\]]*)\]/g, (match, characterId, name) => {
            let character = state.characters && state.characters[characterId]
            if (!this.isGensWoman(character, state) || character.cognomen || name !== this.gensWomanName(character, state, (state.dynasties[character.dynastyId] || {}).cognomen || '')) {
              return match
            }
            character.cognomen = ''
            return '[c|' + characterId + '|' + this.gensWomanName(character, state) + ']'
          })
        },
        inheritanceShareReachable(state, heirId) {
          // The game's share calculator (module 6b82) walks down from the player through children who
          // live at home, were never paid and are alive (or have such an heir below them). When the walk
          // cannot reach the heir it charges the whole estate (all cash, influence and property), so a
          // share is only offered to someone it reaches.
          let current = (state && state.current) || {}
          let characters = (state && state.characters) || {}
          if (!heirId || !characters[current.id] || String(heirId) === String(current.id)) {
            return false
          }
          let hasLine = (id, depth) => {
            let character = characters[id]
            return !!character && depth < 16 && !character.flagWasGivenInheritance &&
              (!character.isDead || (character.childrenIds || []).some((childId) => hasLine(childId, depth + 1)))
          }
          let seen = {}
          let reaches = (id, depth) => {
            if (seen[String(id)] || depth > 16) {
              return false
            }
            seen[String(id)] = true
            return ((characters[id] || {}).childrenIds || []).some((childId) => {
              let child = characters[childId]
              if (!childId || !child || child.hasMovedOut || !hasLine(childId, depth + 1)) {
                return false
              }
              return String(childId) === String(heirId) || reaches(childId, depth + 1)
            })
          }
          return reaches(current.id, 0)
        },
        marriageLeavesByMatch(character, isMatrilineal) {
          // The game's performMarriage: a son in a matrilineal match and a daughter in a usual one leave
          // for the spouse's household; anyone else brings the spouse home.
          let gender = character && character.gender
          if (!character || (gender && gender !== 'male' && gender !== 'female')) {
            return false
          }
          let male = gender ? gender === 'male' : character.isMale === true
          let female = gender ? gender === 'female' : character.isMale === false
          return (female && !isMatrilineal) || (male && !!isMatrilineal)
        },
        familyStore(root) {
          root = root || (this.findGameVueRoot ? this.findGameVueRoot() : null)
          return (root && root.$store) || this._familyStore || null
        },
        installFamilyGuards(root) {
          // Two of the game's store actions are wrapped. invokeMethod: 'Move out?' on someone the share
          // calculator cannot reach is offered without a payment. performMarriage: the marriage screen's
          // choices (installMarriageScreenChoices) are applied, and its share never charges the whole
          // estate. Both wrappers call the current window.corSociety, so a new boot never leaves them
          // on an old object.
          root = root || (this.findGameVueRoot ? this.findGameVueRoot() : null)
          let store = this.familyStore(root)
          let actions = store && store._actions
          if (!actions) {
            return false
          }
          this._familyStore = store
          let installer = this
          let current = () => window.corSociety || installer
          let moveOut = actions.invokeMethod
          if (moveOut && typeof moveOut[0] === 'function' && !moveOut[0].__corSocietyFamilyGuard) {
            let original = moveOut[0]
            let guarded = function(payload) {
              try {
                if (current().guardMoveOutClick(store, payload)) {
                  return Promise.resolve()
                }
              } catch (err) {
                console.warn(err)
              }
              return original.apply(this, arguments)
            }
            guarded.__corSocietyFamilyGuard = true
            moveOut[0] = guarded
          }
          let marriage = actions.performMarriage
          if (marriage && typeof marriage[0] === 'function' && !marriage[0].__corSocietyFamilyGuard) {
            let original = marriage[0]
            let guarded = function(payload) {
              let plan = null
              try {
                plan = current().marriagePlan(store, payload)
              } catch (err) {
                console.warn(err)
              }
              if (!plan) {
                return original.apply(this, arguments)
              }
              return current().performPlannedMarriage(store, plan, (changed) => original.call(this, changed))
            }
            guarded.__corSocietyFamilyGuard = true
            marriage[0] = guarded
          }
          if (typeof store.subscribeAction === 'function' && !store.__corSocietyFamilyNames) {
            // Birth notices and notifications name a girl of the gens before she has her empty cognomen.
            store.__corSocietyFamilyNames = true
            store.subscribeAction({
              before: (action) => {
                try {
                  let type = String((action && action.type) || '').split('/').pop()
                  let payload = action && action.payload
                  let key = type === 'addCharacterNotification' ? 'title' : (type === 'pushInteractionModalQueue' || type === 'pushInteractionModalButtonQueue') ? 'message' : ''
                  if (key && payload && typeof payload[key] === 'string') {
                    payload[key] = current().nameGensWomenInText(store.state, payload[key])
                  }
                } catch (err) {
                  // never block a game action
                }
              }
            })
          }
          this.installMarriageScreenChoices(root)
          return true
        },
        installMarriageScreenChoices(root) {
          // The game's marriage screen (route MarriageView) offers a matrilineal match and one 'give away
          // share of inheritance' that both pays the share and moves the couple out. Its render is wrapped
          // so the second becomes two choices: the share, and the household. The wrapper is set on the
          // component and on any constructor Vue already built from it (Vue reads render from there).
          let routes = (root && root.$router && root.$router.options && root.$router.options.routes) || []
          let route = routes.find((item) => item && item.name === 'MarriageView')
          let options = route && route.component
          if (!options || typeof options !== 'object') {
            return false
          }
          let targets = [options]
          Object.keys(options._Ctor || {}).forEach((key) => {
            if (options._Ctor[key] && options._Ctor[key].options) {
              targets.push(options._Ctor[key].options)
            }
          })
          let installer = this
          targets.forEach((target) => {
            if (typeof target.render !== 'function' || target.render.__corSocietyMarriageChoices) {
              return
            }
            let original = target.render
            let render = function(h) {
              let vnode = original.apply(this, arguments)
              try {
                let society = window.corSociety || installer
                society.decorateMarriageScreen(this, vnode, h || this.$createElement)
              } catch (err) {
                console.warn(err)
              }
              return vnode
            }
            render.__corSocietyMarriageChoices = true
            target.render = render
          })
          return true
        },
        marriageScreenChoices(vm, state) {
          // One set of choices per visit to the screen (a new component instance starts unticked).
          let current = state && state.current
          let characterId = state && state.selectedMarriageCharacterId
          if (!current || !characterId || !state.characters || !state.characters[characterId] || String(characterId) === String(current.id) ||
            (current.householdCharacterIds || []).indexOf(characterId) < 0) {
            return null
          }
          let choices = this._marriageChoices
          if (!choices || choices.vm !== vm || choices.characterId !== characterId) {
            choices = this._marriageChoices = { vm, characterId, share: false, startOwn: false, armed: false }
          }
          return choices
        },
        marriageScreenView(vm, state, choices) {
          let current = state.current
          let character = state.characters[choices.characterId]
          let name = character.praenomen || 'They'
          let isHeir = String(current.flagDesignatedHeirId || '') === String(choices.characterId)
          let shareBlock = current.flagIsDebtSlave ? 'A debtor has no patrimony to hand out.'
            : isHeir ? 'Your designated heir will inherit everything; there is no share to give early.'
              : !this.inheritanceShareReachable(state, choices.characterId) ? 'No share is left for ' + name + ': they, or the parent they would inherit through, were already paid or disinherited.' : ''
          // Only a child whose children carry your name stays at home: when the match gives the children the
          // spouse's name, the child joins the spouse's household (shown ticked and locked).
          let leavesByMatch = this.marriageLeavesByMatch(character, vm.isMatrilineal)
          let household = leavesByMatch
            ? {
              key: 'joinTheirs',
              label: 'Join their household?',
              text: name + " moves into the spouse's household and is no longer a playable heir, since the children of this match take the spouse's name. To keep " + name + ' at home, ' + (vm.isMatrilineal ? 'choose a usual match' : 'look for a matrilineal match') + '.',
              block: '',
              locked: true
            }
            : {
              key: 'startOwn',
              label: 'Start your own household?',
              text: name + ' and the new spouse set up a household of their own, and ' + name + ' is no longer a playable heir. Without an early share, their claim on your estate stays as it is.',
              block: isHeir ? 'Your designated heir stays with you; designate another heir first.' : ''
            }
          return {
            name,
            leavesByMatch,
            share: {
              key: 'share',
              label: 'Give their share of the inheritance now?',
              text: 'Pay ' + name + ' their share of the patrimony now. They stay with you unless they also leave, and receive nothing more at your death.',
              block: shareBlock,
              cost: shareBlock ? null : vm.makeMoveOutCost
            },
            household
          }
        },
        marriageChoiceColumn(h, vm, choices, item) {
          let checked = !!item.locked || (!item.block && !!choices[item.key])
          let text = [item.block || item.text]
          if (!item.block && item.cost) {
            text.push(' ', h('StatChangesComponent', { staticClass: 'btn btn-sm margin-0 padding-0 text-left', attrs: { statChanges: item.cost, scaleByClass: false } }))
          }
          return h('b-col', { staticClass: 'align-self-center mt-2 mb-2', attrs: { sm: '12', md: '4' } }, [
            h('div', [
              h('b-form-checkbox', {
                staticClass: 'js-checkbox-cor-society-' + item.key,
                attrs: { size: 'sm', value: 1, 'unchecked-value': 0, disabled: !!(item.block || item.locked) },
                model: {
                  value: checked ? 1 : 0,
                  callback: (value) => {
                    choices[item.key] = !!value && value !== '0'
                    if (vm && typeof vm.$forceUpdate === 'function') {
                      vm.$forceUpdate()
                    }
                  },
                  expression: 'corSocietyMarriage_' + item.key
                }
              }, [item.label]),
              h('b-form-text', text)
            ])
          ])
        },
        marriageSummaryParts(h, vm, state, view, choices) {
          let spouse = state.characters[vm.selectedSpouseId] || {}
          let spouseName = spouse.praenomen || 'The spouse'
          let gens = [vm.selectedSpouseDyansty.nomen, vm.selectedSpouseDyansty.cognomen].filter(Boolean).join(' ')
          let joining = vm.isMatrilineal ? 'adopted into ' : 'of '
          let name = view.name
          let parts = []
          if (view.leavesByMatch) {
            parts.push(h('b', [name + ' will leave your household']), ' for ' + spouseName + "'s and will no longer be a playable heir. The children of this union will be " + joining + gens + '.')
          } else if (choices.startOwn && !view.household.block) {
            parts.push(h('b', [name + ' and ' + spouseName + ' will start a household of their own']), ', and ' + name + ' will no longer be a playable heir.')
          } else {
            parts.push(spouseName + ' will join your household and any future children with ' + name + ' will be ' + joining + 'your Dynasty/gens.')
          }
          if (choices.share && !view.share.block) {
            parts.push(h('br'), name + ' receives their share of the inheritance now, and nothing more at your death. ',
              h('StatChangesComponent', { staticClass: 'btn btn-sm margin-0 padding-0', attrs: { statChanges: view.share.cost, scaleByClass: false } }))
          }
          return parts
        },
        decorateMarriageScreen(vm, vnode, h) {
          // Finds the game's matrilineal checkbox and its row, drops the game's combined checkbox (the
          // column whose v-model is makeMoveOut), adds the share and household columns, and rewrites the
          // confirmation text. BootstrapVue's b-row and b-col are functional components, so they arrive
          // already rendered as plain divs (the row with staticClass 'row', a column with col-md-<n>
          // classes). A screen that has changed shape is left as the game draws it, and its choices are
          // not applied.
          let state = vm && vm.$store && vm.$store.state
          let choices = this.marriageScreenChoices(vm, state)
          if (!choices) {
            return vnode
          }
          choices.armed = false
          let kids = (node) => (node && ((node.componentOptions && node.componentOptions.children) || node.children)) || []
          let tagOf = (node) => (node && ((node.componentOptions && node.componentOptions.tag) || node.tag)) || ''
          let find = (node, test, path) => {
            if (!node || typeof node !== 'object') {
              return null
            }
            path = (path || []).concat([node])
            if (test(node)) {
              return path
            }
            let children = kids(node)
            for (let i = 0; i < children.length; i++) {
              let found = find(children[i], test, path)
              if (found) {
                return found
              }
            }
            return null
          }
          let anchor = find(vnode, (node) => !!(node.data && String(node.data.staticClass || '').indexOf('js-checkbox-matrilineal') >= 0))
          let isRow = (node) => tagOf(node) === 'b-row' || /(^|\s)row(\s|$)/.test(String((node.data && node.data.staticClass) || ''))
          let rowAt = anchor ? anchor.map(isRow).lastIndexOf(true) : -1
          let row = rowAt >= 0 ? kids(anchor[rowAt]) : null
          let column = rowAt >= 0 ? anchor[rowAt + 1] : null
          if (!row || !column || row.indexOf(column) < 0) {
            return vnode
          }
          for (let i = row.length - 1; i >= 0; i--) {
            if (row[i] !== column && find(row[i], (node) => !!(node.data && node.data.model && node.data.model.expression === 'makeMoveOut'))) {
              row.splice(i, 1)
            }
          }
          let third = (value) => typeof value === 'string' ? value.replace(/\bcol-md-\d+\b/g, 'col-md-4')
            : Array.isArray(value) ? value.map(third)
              : value && typeof value === 'object' ? Object.keys(value).reduce((out, key) => {
                out[third(key)] = value[key]
                return out
              }, {}) : value
          if (column.componentOptions && column.componentOptions.propsData) {
            column.componentOptions.propsData.md = '4'
          } else if (column.data) {
            column.data.class = third(column.data.class)
          }
          let view = this.marriageScreenView(vm, state, choices)
          row.push(this.marriageChoiceColumn(h, vm, choices, view.share))
          row.push(this.marriageChoiceColumn(h, vm, choices, view.household))
          if (vm.selectedSpouseId && vm.selectedSpouseDyansty) {
            let said = find(vnode, (node) => typeof node.text === 'string' && /will (leave|join) your household/.test(node.text))
            let holder = said ? said[said.map(tagOf).lastIndexOf('div')] : null
            if (holder && Array.isArray(holder.children)) {
              holder.children = [h('span', this.marriageSummaryParts(h, vm, state, view, choices))]
            }
          }
          choices.armed = true
          return vnode
        },
        guardMoveOutClick(store, payload) {
          let method = payload && payload.method
          if (!method || payload.isDAAPI || method.event !== 'lifeAndDeath/moveOut' || method.method !== 'process') {
            return false
          }
          let context = Object.assign({}, method.context || {}, payload.params || {})
          let state = store && store.state
          let characterId = context.characterId
          if (!characterId || !state || !state.characters || !state.characters[characterId] || this.inheritanceShareReachable(state, characterId)) {
            return false
          }
          this.offerMoveOutWithoutShare(characterId, state)
          return true
        },
        offerMoveOutWithoutShare(characterId, state) {
          let character = state.characters[characterId] || {}
          let name = character.praenomen || 'They'
          let link = '[c|' + characterId + '|' + name + ']'
          daapi.pushInteractionModalQueue({
            title: 'Should ' + name + ' move out?',
            message: link + ' has no share of the patrimony left to receive: they, or the parent they would inherit through, were already paid or disinherited. They can still leave with their family for a household of their own.',
            image: daapi.requireImage('/cor_society/assets/familyTree.svg'),
            options: [
              {
                text: 'Yes, let them set up their own household',
                tooltip: 'Consequences: ' + link + ' (& family) leave your household with nothing more paid, and can no longer be designated heir.',
                action: {
                  event: this.event,
                  method: 'moveOutWithoutShare',
                  context: { characterId }
                }
              },
              {
                text: "Not while I'm around!"
              }
            ]
          })
        },
        moveOutWithoutShare({ characterId } = {}) {
          let store = this.familyStore()
          let state = store && store.state
          let current = state && state.current
          if (!characterId || !current || !state.characters || !state.characters[characterId] || String(characterId) === String(current.id) ||
            (current.householdCharacterIds || []).indexOf(characterId) < 0) {
            return false
          }
          return this.moveOutWithoutShareInStore(store, characterId)
        },
        moveOutWithoutShareInStore(store, characterId) {
          // The game's own move-out (module 9296 doMoveOut) with nothing paid. It marks everyone it moves
          // as paid, so the character's flag is put back as it was.
          let character = store.state.characters[characterId]
          let wasGiven = !!(character && character.flagWasGivenInheritance)
          store.dispatch('invokeMethod', { method: { event: 'lifeAndDeath/moveOut', method: 'doMoveOut', context: { characterId, inheritance: 0 } } })
          let moved = store.state.characters[characterId]
          if (moved && !!moved.flagWasGivenInheritance !== wasGiven) {
            moved.flagWasGivenInheritance = wasGiven
          }
          if (this.invalidateStateSnapshot) {
            this.invalidateStateSnapshot()
          }
          return !!(moved && moved.hasMovedOut)
        },
        marriagePlan(store, payload) {
          // Only the game's marriage screen sends makeMoveOut. Society's own marriages and the game's
          // random ones never do, and are left to the game. From a screen showing the mod's choices the
          // plan follows them; from the game's own checkbox it only steps in where the share calculator
          // would charge the whole estate.
          if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'makeMoveOut')) {
            return null
          }
          let state = store && store.state
          let current = state && state.current
          let characters = state && state.characters
          let characterId = payload.characterId
          let household = (current && current.householdCharacterIds) || []
          if (!characters || !characters[characterId] || !characters[payload.spouseId] || String(characterId) === String(current.id) ||
            household.indexOf(characterId) < 0 || household.indexOf(payload.spouseId) >= 0) {
            return null
          }
          let character = characters[characterId]
          let leavesByMatch = this.marriageLeavesByMatch(character, payload.isMatrilineal)
          let reachable = this.inheritanceShareReachable(state, characterId)
          let isHeir = String(current.flagDesignatedHeirId || '') === String(characterId)
          let choices = this._marriageChoices
          let screen = !!(choices && choices.armed && choices.vm && !choices.vm._isDestroyed && String(choices.characterId) === String(characterId) &&
            (!choices.vm.selectedSpouseId || String(choices.vm.selectedSpouseId) === String(payload.spouseId)))
          let share = false
          let leave = true
          if (screen) {
            share = !!choices.share && reachable && !isHeir && !current.flagIsDebtSlave
            leave = leavesByMatch || (!!choices.startOwn && !isHeir)
            choices.armed = false
          } else if (!payload.makeMoveOut || reachable) {
            return null
          }
          return {
            payload,
            characterId,
            spouseId: payload.spouseId,
            share,
            leave,
            leavesByMatch,
            householdBefore: household.slice(),
            formerBefore: (current.formerHouseholdCharacterIds || []).slice(),
            movedOutBefore: !!character.hasMovedOut
          }
        },
        performPlannedMarriage(store, plan, run) {
          let result = run(Object.assign({}, plan.payload, { makeMoveOut: plan.share ? 1 : 0 }))
          try {
            this.settleMarriageHousehold(store, plan)
          } catch (err) {
            console.warn(err)
          }
          return result
        },
        settleMarriageHousehold(store, plan) {
          // After the game's performMarriage (with makeMoveOut set to the share): who lives where.
          let current = store.state.current
          let character = store.state.characters[plan.characterId]
          if (!current || !character) {
            return
          }
          if (plan.leave) {
            if (!plan.share && !plan.leavesByMatch) {
              this.moveOutWithoutShareInStore(store, plan.characterId)
            }
            // With a share the game moves the couple out but still adds the spouse to your household.
            current.householdCharacterIds = (current.householdCharacterIds || []).filter((id) => String(id) !== String(plan.spouseId))
            current.formerHouseholdCharacterIds = this.uniqueIds(current.formerHouseholdCharacterIds || [])
          } else {
            // The game moved them out to pay the share: they stay, and the spouse moves in.
            character.hasMovedOut = plan.movedOutBefore
            current.formerHouseholdCharacterIds = plan.formerBefore.slice()
            current.householdCharacterIds = this.uniqueIds(plan.householdBefore.concat([plan.spouseId]))
          }
          if (plan.share) {
            // flagWasGivenInheritance also marks the disinherited; this one was paid, so 'Restore
            // Inheritance' (a second share at your death) is never offered to them.
            character.corSocietyShareGivenEarly = true
          }
          store.dispatch('forceUpdateCharacter', plan.characterId)
          if (this.invalidateStateSnapshot) {
            this.invalidateStateSnapshot()
          }
        }
      })
      window.corSociety._mixinCorSocietyFamilyVersion = '1.1.331'
    }
  }
}
