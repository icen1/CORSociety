{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyCrests() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyCrestsVersion === '1.1.329') {
        return
      }
      Object.assign(window.corSociety, {
        ensureCrests(society, state) {
                  society.crests = society.crests || {}
                  society.crestSettings = { playerOverlay: true, ...(society.crestSettings || {}) }
                  this.ensurePlayerCrest(society, state)
                  for (let houseId in society.houses) {
                    if (society.houses.hasOwnProperty(houseId)) {
                      this.ensureHouseCrest(society, society.houses[houseId])
                    }
                  }
                },
        playerCrestId(state) {
                  let currentId = this.currentCharacterId(state)
                  let character = state.characters[currentId] || {}
                  return 'player_' + this.safeId(character.dynastyId || currentId || 'house')
                },
        ensurePlayerCrest(society, state) {
                  society.crests = society.crests || {}
                  let crestId = this.playerCrestId(state)
                  let character = state.characters[this.currentCharacterId(state)] || {}
                  let dynasty = state.dynasties[character.dynastyId] || {}
                  if (!society.crests[crestId]) {
                    society.crests[crestId] = this.generateCrest('player-' + crestId + '-' + this.houseName(dynasty, character.dynastyId || crestId))
                  }
                  society.playerCrestId = crestId
                  return society.crests[crestId]
                },
        ensureHouseCrest(society, house) {
                  society.crests = society.crests || {}
                  if (house && house.isPlayerHouse && society.playerCrestId && society.crests[society.playerCrestId]) {
                    house.crestId = society.playerCrestId
                    return society.crests[society.playerCrestId]
                  }
                  let crestId = 'house_' + this.safeId((house && house.id) || (house && house.name) || 'unknown')
                  if (!society.crests[crestId]) {
                    society.crests[crestId] = this.generateCrest(crestId + '-' + ((house && house.name) || '') + '-' + ((house && house.stratum) || ''))
                  }
                  if (house) {
                    house.crestId = crestId
                  }
                  return society.crests[crestId]
                },
        houseCrestIcon(society, house) {
                  let crest = this.ensureHouseCrest(society, house)
                  return this.crestIcon(crest, 112)
                },
        crestCycleOption(label, part, crest) {
                  return {
                    text: label + ': ' + this.crestLabel(part, crest[part]),
                    tooltip: 'Cycle ' + label.toLowerCase() + '.',
                    action: {
                      event: this.event,
                      method: 'cyclePlayerCrest',
                      context: { part }
                    }
                  }
                },
        crestLabel(part, value) {
                  if (!value) {
                    return 'none'
                  }
                  return String(value)
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (letter) => letter.toUpperCase())
                },
        crestList(part) {
                  if (part === 'field') return this.crestFields
                  if (part === 'metal') return this.crestMetals
                  if (part === 'accent') return this.crestAccents
                  if (part === 'shape') return this.crestShapes
                  if (part === 'division') return this.crestDivisions
                  if (part === 'pattern') return this.crestPatterns
                  if (part === 'charge') return this.crestCharges
                  if (part === 'border') return this.crestBorders
                  return []
                },
        generateCrest(seedText) {
                  let random = this.seededRandom(seedText)
                  let pickSeeded = (list) => {
                    return list[Math.floor(random() * list.length) % list.length]
                  }
                  let field = pickSeeded(this.crestFields)
                  let metal = pickSeeded(this.crestMetals)
                  let accent = pickSeeded(this.crestAccents.filter((color) => color !== field))
                  let charge = pickSeeded(this.crestCharges)
                  return {
                    version: 1,
                    seed: String(seedText || ''),
                    shape: pickSeeded(this.crestShapes),
                    field,
                    metal,
                    accent,
                    division: pickSeeded(this.crestDivisions),
                    pattern: pickSeeded(this.crestPatterns),
                    charge,
                    border: pickSeeded(this.crestBorders),
                    mark: pickSeeded(this.crestMarks)
                  }
                },
        crestIcon(crest, size) {
                  return this.svgDataUri(this.crestSvg(crest, size || 112))
                },
        crestColor(name) {
                  return this.crestPalette[name] || this.crestPalette.crimson
                },
        crestSvg(crest, size) {
                  crest = crest || this.generateCrest('fallback')
                  let field = this.crestColor(crest.field)
                  let metal = this.crestColor(crest.metal)
                  let accent = this.crestColor(crest.accent)
                  let edge = '#151316'
                  let path = this.crestShapePath(crest.shape)
                  let svg = ''
                  svg += '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + Math.round(size * 1.15) + '" viewBox="0 0 96 112">'
                  svg += '<defs><clipPath id="shieldClip"><path d="' + path + '"/></clipPath>'
                  svg += '<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity=".35"/></filter></defs>'
                  svg += '<rect width="96" height="112" fill="none"/>'
                  svg += '<g filter="url(#shadow)">'
                  svg += '<path d="' + path + '" fill="' + field + '" stroke="' + edge + '" stroke-width="3"/>'
                  svg += '<g clip-path="url(#shieldClip)">'
                  svg += this.crestDivisionSvg(crest.division, field, metal, accent)
                  svg += this.crestPatternSvg(crest.pattern, metal, accent)
                  svg += '</g>'
                  svg += this.crestChargeSvg(crest.charge, metal, accent, crest.mark)
                  svg += this.crestBorderSvg(crest.border, path, metal, accent)
                  svg += '</g></svg>'
                  return svg
                },
        crestShapePath(shape) {
                  if (shape === 'oval') return 'M48 8 C70 10 84 26 84 50 C84 80 66 101 48 106 C30 101 12 80 12 50 C12 26 26 10 48 8 Z'
                  if (shape === 'round') return 'M48 10 C70 10 86 27 86 51 C86 77 69 96 48 104 C27 96 10 77 10 51 C10 27 26 10 48 10 Z'
                  if (shape === 'vexillum') return 'M14 12 H82 V82 L66 74 L48 90 L30 74 L14 82 Z'
                  if (shape === 'kite') return 'M48 6 L82 22 V58 C82 80 62 98 48 108 C34 98 14 80 14 58 V22 Z'
                  if (shape === 'hex') return 'M30 10 H66 L86 30 V74 L48 106 L10 74 V30 Z'
                  return 'M16 10 H80 C84 22 86 36 84 52 C82 78 66 98 48 106 C30 98 14 78 12 52 C10 36 12 22 16 10 Z'
                },
        crestDivisionSvg(division, field, metal, accent) {
                  if (division === 'pale') return '<rect x="48" y="0" width="48" height="112" fill="' + metal + '"/>'
                  if (division === 'fess') return '<rect x="0" y="50" width="96" height="62" fill="' + metal + '"/>'
                  if (division === 'bend') return '<path d="M-8 88 L78 2 H106 L18 112 Z" fill="' + metal + '"/>'
                  if (division === 'bendSinister') return '<path d="M-10 4 H20 L106 90 V116 Z" fill="' + metal + '"/>'
                  if (division === 'quartered') return '<rect x="48" y="0" width="48" height="56" fill="' + metal + '"/><rect x="0" y="56" width="48" height="56" fill="' + metal + '"/>'
                  if (division === 'chief') return '<rect x="0" y="0" width="96" height="30" fill="' + metal + '"/>'
                  if (division === 'chevron') return '<path d="M0 76 L48 28 L96 76 L96 96 L48 48 L0 96 Z" fill="' + metal + '"/>'
                  if (division === 'saltire') return '<path d="M-6 8 L8 -6 L102 98 L88 112 Z M88 -6 L102 8 L8 112 L-6 98 Z" fill="' + metal + '"/>'
                  if (division === 'orle') return '<path d="M22 20 H74 C78 32 78 45 76 56 C73 78 60 91 48 97 C36 91 23 78 20 56 C18 45 18 32 22 20 Z" fill="none" stroke="' + metal + '" stroke-width="9"/>'
                  return '<path d="M0 0 H96 V112 H0 Z" fill="' + field + '"/><path d="M12 20 H84" stroke="' + accent + '" stroke-opacity=".35" stroke-width="2"/>'
                },
        crestPatternSvg(pattern, metal, accent) {
                  if (pattern === 'dots') {
                    let dots = ''
                    for (let y = 22; y < 92; y += 18) {
                      for (let x = 24; x < 78; x += 18) {
                        dots += '<circle cx="' + x + '" cy="' + y + '" r="2.6" fill="' + accent + '" opacity=".65"/>'
                      }
                    }
                    return dots
                  }
                  if (pattern === 'bars') return '<path d="M10 28 H86 M8 48 H88 M8 68 H88 M12 88 H84" stroke="' + accent + '" stroke-width="4" opacity=".5"/>'
                  if (pattern === 'waves') return '<path d="M4 36 C18 25 30 47 44 36 C58 25 70 47 92 34 M4 60 C18 49 30 71 44 60 C58 49 70 71 92 58 M4 84 C18 73 30 95 44 84 C58 73 70 95 92 82" fill="none" stroke="' + accent + '" stroke-width="3" opacity=".55"/>'
                  if (pattern === 'rays') return '<path d="M48 56 L48 -10 M48 56 L104 10 M48 56 L108 56 M48 56 L102 104 M48 56 L48 122 M48 56 L-6 104 M48 56 L-12 56 M48 56 L-8 10" stroke="' + accent + '" stroke-width="4" opacity=".35"/>'
                  if (pattern === 'tiles') return '<path d="M0 30 H96 M0 54 H96 M0 78 H96 M24 0 V112 M48 0 V112 M72 0 V112" stroke="' + accent + '" stroke-width="2" opacity=".35"/>'
                  return ''
                },
        crestChargeSvg(charge, metal, accent, mark) {
                  let stroke = ' stroke="' + accent + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"'
                  if (charge === 'spqr') return '<text x="48" y="61" text-anchor="middle" font-family="serif" font-size="22" font-weight="700" fill="' + metal + '" stroke="' + accent + '" stroke-width="1">SPQR</text>'
                  if (charge === 'aquila') return '<path d="M48 26 L56 44 L78 36 L62 55 L76 68 L55 65 L48 86 L41 65 L20 68 L34 55 L18 36 L40 44 Z" fill="' + metal + '" stroke="' + accent + '" stroke-width="3" stroke-linejoin="round"/><circle cx="48" cy="40" r="5" fill="' + accent + '"/>'
                  if (charge === 'laurel') return '<path d="M35 78 C22 58 25 36 42 24 M61 78 C74 58 71 36 54 24" fill="none"' + stroke + '/><path d="M33 68 L23 65 M31 58 L21 54 M31 47 L22 42 M38 34 L30 28 M63 68 L73 65 M65 58 L75 54 M65 47 L74 42 M58 34 L66 28" fill="none"' + stroke + '/><text x="48" y="61" text-anchor="middle" font-family="serif" font-size="15" font-weight="700" fill="' + metal + '">' + this.escapeSvg(mark || 'I') + '</text>'
                  if (charge === 'thunderbolt') return '<path d="M55 20 L30 58 H47 L39 92 L68 48 H50 Z" fill="' + metal + '" stroke="' + accent + '" stroke-width="3" stroke-linejoin="round"/>'
                  if (charge === 'standard') return '<path d="M48 22 V88 M35 30 H68 V48 H35 Z M31 68 H65" fill="none"' + stroke + '/><circle cx="48" cy="20" r="6" fill="' + metal + '" stroke="' + accent + '" stroke-width="3"/>'
                  if (charge === 'column') return '<path d="M35 34 H61 M32 78 H64 M38 34 V78 M48 34 V78 M58 34 V78 M30 28 H66 L60 20 H36 Z M28 86 H68 L62 78 H34 Z" fill="none"' + stroke + '/>'
                  if (charge === 'sun') return '<circle cx="48" cy="56" r="16" fill="' + metal + '" stroke="' + accent + '" stroke-width="3"/><path d="M48 23 V33 M48 79 V91 M15 56 H28 M68 56 H81 M25 33 L34 42 M62 70 L71 79 M71 33 L62 42 M34 70 L25 79" fill="none"' + stroke + '/>'
                  if (charge === 'crescent') return '<path d="M58 26 C40 35 34 58 46 78 C34 74 24 62 24 48 C24 32 39 20 58 26 Z" fill="' + metal + '" stroke="' + accent + '" stroke-width="3" stroke-linejoin="round"/>'
                  if (charge === 'star') return '<path d="M48 22 L56 45 L80 45 L60 59 L68 84 L48 69 L28 84 L36 59 L16 45 L40 45 Z" fill="' + metal + '" stroke="' + accent + '" stroke-width="3" stroke-linejoin="round"/>'
                  if (charge === 'scales') return '<path d="M48 28 V78 M30 40 H66 M36 40 L25 63 H47 Z M60 40 L49 63 H71 Z M36 82 H60" fill="none"' + stroke + '/>'
                  if (charge === 'ship') return '<path d="M22 68 C32 82 64 82 76 68 Z M34 68 V30 L62 48 H34" fill="' + metal + '" stroke="' + accent + '" stroke-width="3" stroke-linejoin="round"/><path d="M31 74 H66" fill="none"' + stroke + '/>'
                  if (charge === 'spear') return '<path d="M48 22 V88 M48 20 L39 38 H57 Z M34 62 H62" fill="none"' + stroke + '/>'
                  if (charge === 'tower') return '<path d="M31 82 V41 H38 V31 H45 V41 H52 V31 H59 V41 H66 V82 Z M41 82 V65 C41 55 55 55 55 65 V82" fill="' + metal + '" stroke="' + accent + '" stroke-width="3" stroke-linejoin="round"/>'
                  if (charge === 'hand') return '<path d="M37 76 V44 C37 39 44 39 44 44 V58 V36 C44 31 51 31 51 36 V58 V42 C51 37 58 37 58 42 V60 L63 52 C66 47 72 51 69 57 L58 81 C54 89 40 87 37 76 Z" fill="' + metal + '" stroke="' + accent + '" stroke-width="3" stroke-linejoin="round"/>'
                  return '<circle cx="48" cy="56" r="20" fill="' + metal + '" stroke="' + accent + '" stroke-width="4"/>'
                },
        crestBorderSvg(border, path, metal, accent) {
                  if (border === 'double') return '<path d="' + path + '" fill="none" stroke="' + metal + '" stroke-width="7"/><path d="' + path + '" fill="none" stroke="' + accent + '" stroke-width="3"/>'
                  if (border === 'bossed') return '<path d="' + path + '" fill="none" stroke="' + metal + '" stroke-width="5"/><circle cx="24" cy="23" r="3" fill="' + accent + '"/><circle cx="72" cy="23" r="3" fill="' + accent + '"/><circle cx="18" cy="57" r="3" fill="' + accent + '"/><circle cx="78" cy="57" r="3" fill="' + accent + '"/><circle cx="48" cy="98" r="3" fill="' + accent + '"/>'
                  if (border === 'laurel') return '<path d="' + path + '" fill="none" stroke="' + metal + '" stroke-width="4"/><path d="M20 30 C31 43 31 72 47 96 M76 30 C65 43 65 72 49 96" fill="none" stroke="' + accent + '" stroke-width="3" opacity=".8"/>'
                  if (border === 'rivets') return '<path d="' + path + '" fill="none" stroke="' + metal + '" stroke-width="4"/><circle cx="28" cy="19" r="2.4" fill="' + metal + '"/><circle cx="48" cy="16" r="2.4" fill="' + metal + '"/><circle cx="68" cy="19" r="2.4" fill="' + metal + '"/><circle cx="22" cy="50" r="2.4" fill="' + metal + '"/><circle cx="74" cy="50" r="2.4" fill="' + metal + '"/><circle cx="48" cy="94" r="2.4" fill="' + metal + '"/>'
                  return '<path d="' + path + '" fill="none" stroke="' + metal + '" stroke-width="5"/>'
                },
        svgDataUri(svg) {
                  try {
                    if (typeof window !== 'undefined' && window.btoa) {
                      return 'data:image/svg+xml;base64,' + window.btoa(svg)
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
                },
        hashString(value) {
                  let hash = 2166136261
                  value = String(value || '')
                  for (let i = 0; i < value.length; i++) {
                    hash ^= value.charCodeAt(i)
                    hash = Math.imul(hash, 16777619)
                  }
                  return hash >>> 0
                },
        seededRandom(seedText) {
                  let seed = this.hashString(seedText) || 1
                  return () => {
                    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
                    return seed / 4294967296
                  }
                },
        escapeSvg(value) {
                  return String(value || '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                }
      })
      window.corSociety._mixinCorSocietyCrestsVersion = '1.1.329'
    }
  }
}
