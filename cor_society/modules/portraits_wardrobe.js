{
  canTriggerIfUnavailable: true,
  checkType: 'general',
  checkAndAct() {},
  methods: {
    _mixinCorSocietyPortraitsWardrobe() {
      if (!window.corSociety) {
        return
      }
      if (window.corSociety._mixinCorSocietyPortraitsWardrobeVersion === '1.1.331') {
        return
      }
      Object.assign(window.corSociety, {
        characterName(character, state) {
                  let dynasty = state.dynasties[character.dynastyId] || {}
                  return (character.praenomen || 'Unknown') + ', ' + this.houseName(dynasty, character.dynastyId)
                },
        slaveDisplayName(character, record, state) {
                  let name = (record && record.fullName) ||
                    (character && (character.corSocietySlaveFullName || character.corSocietyForeignName)) ||
                    (record && record.name) ||
                    ''
                  if (name) {
                    return name
                  }
                  if (character) {
                    return this.characterName(character, state || daapi.getState())
                  }
                  return 'Servus'
                },
        characterTooltip(character, state) {
                  let skills = character.skills || {}
                  let lines = [
                    'Age: ' + this.formatAge(character, state),
                    'Job: ' + (character.job || 'none') + ' ' + (character.jobLevel || 0),
                    'Skills: I ' + Math.round(skills.intelligence || 0) + ', S ' + Math.round(skills.stewardship || 0) + ', E ' + Math.round(skills.eloquence || 0) + ', C ' + Math.round(skills.combat || 0)
                  ]
                  if (character.corSocietyOrigin === 'enslaved_dependant' || character.corSocietySlave || character.corSocietySlaveMarket) {
                    lines.push('Origin: ' + this.slaveOriginDescription(character.corSocietySlaveOrigin || 'unknown'))
                  }
                  return lines.join('\n')
                },
        vanillaPortraitAsset(path) {
                  path = String(path || '').replace(/^\.\//, '').replace(/^\/+/, '')
                  try {
                    return daapi.requireImage('/' + path) || daapi.requireImage(path) || this.vanillaPortraitAssets[path] || ''
                  } catch (err) {
                    return this.vanillaPortraitAssets[path] || ''
                  }
                },
        characterPortrait(character, state, house) {
                  if (character && character.corSocietyOutfit) {
                    return this.characterPortraitWithOutfit(character, state, character.corSocietyOutfit)
                  }
                  let portrait = this.vanillaCharacterPortrait(character, state)
                  if (this.isImageData(portrait)) {
                    return portrait
                  }
                  return this.genericVanillaCharacterPortrait(character, state)
                },
        isExplicitlyEnslavedCharacter(character) {
                  return !!(
                    character &&
                    (
                      character.corSocietySlave === true ||
                      character.corSocietySlaveActive === true ||
                      character.corSocietySlaveMarket === true ||
                      character.corSocietyOrigin === 'enslaved_dependant' ||
                      character.corSocietyOrigin === 'private_company_bastard'
                    )
                  )
                },
        isSlaveCharacter(character, house) {
                  if (!character) {
                    return false
                  }
                  if (this.isExplicitlyEnslavedCharacter(character)) {
                    return true
                  }
                  let characterId = character.id || character.characterId || ''
                  return !!(
                    characterId &&
                    house &&
                    (house.slaveIds || []).some((id) => String(id) === String(characterId))
                  )
                },
        isSocietyGeneratedCharacter(character, house) {
                  return !!(
                    character &&
                    (character.corSocietyGenerated || (house && house.generated))
                  )
                },
        vanillaCharacterPortrait(character, state) {
                  try {
                    character = character || {}
                    let look = character.look || {}
                    if ((look.group === 'cor_society' || look.group === this.wardrobeLookGroup) && character.corSocietyOriginalLook) {
                      look = character.corSocietyOriginalLook
                    }
                    let age = this.age(character, state || daapi.getState())
                    let gender = character.gender || look.gender || (character.isMale ? 'male' : 'female')
                    let ageStage = look.ageStage || this.characterAgeStage(age)
                    let group = look.group || 'roman'
                    let type = look.type || 'brown'
                    let portrait = false
                    if (look.isDAAPI && daapi.getCharacterIcon) {
                      portrait = daapi.getCharacterIcon({
                        group,
                        gender,
                        type,
                        ageStage
                      })
                    } else {
                      portrait = this.vanillaPortraitAsset('icons/characters/' + group + '/' + type + '/' + gender + '/' + ageStage + '.svg')
                    }
                    if (this.isImageData(portrait)) {
                      return portrait
                    }
                  } catch (err) {
                    console.warn(err)
                  }
                  return false
                },
        genericVanillaCharacterPortrait(character, state) {
                  try {
                    character = character || {}
                    let look = character.look || {}
                    let age = this.age(character, state || daapi.getState())
                    let gender = character.gender || look.gender || (character.isMale ? 'male' : 'female')
                    gender = gender === 'female' ? 'female' : 'male'
                    let ageStage = look.ageStage || this.characterAgeStage(age)
                    let suffix = ageStage === 'adult' ? '' : '_' + ageStage
                    return this.vanillaPortraitAsset('icons/characters/' + gender + suffix + '.svg')
                  } catch (err) {
                    console.warn(err)
                  }
                  return ''
                },
        nativeCharacterPortraitWithOutfit(character, state, house, outfit) {
                  state = state || daapi.getState()
                  character = character || {}
                  let baseLook = this.cloneWardrobeLook ? this.cloneWardrobeLook(character.corSocietyOriginalLook || character.look || {}) : { ...(character.corSocietyOriginalLook || character.look || {}) }
                  if (baseLook.group === 'cor_society' || baseLook.group === this.wardrobeLookGroup) {
                    baseLook = this.cloneWardrobeLook ? this.cloneWardrobeLook(character.corSocietyOriginalLook || {}) : { ...(character.corSocietyOriginalLook || {}) }
                  }
                  if (!outfit || outfit === 'auto') {
                    let baseCharacter = { ...character, corSocietyOutfit: '', look: this.cloneWardrobeLook ? this.cloneWardrobeLook(baseLook) : { ...baseLook } }
                    return this.vanillaCharacterPortrait(baseCharacter, state) || this.genericVanillaCharacterPortrait(baseCharacter, state)
                  }
                  let gender = (character.gender || baseLook.gender || (character.isMale ? 'male' : 'female')) === 'female' ? 'female' : 'male'
                  let ageStage = baseLook.ageStage || this.characterAgeStage(this.age(character, state))
                  return this.wardrobePortraitDataUri(character, state, outfit, baseLook, gender, ageStage)
                },
        inlineImageHref(value) {
                  value = this.imageHref(value)
                  if (!value) {
                    return ''
                  }
                  if (value.indexOf('data:image/') === 0) {
                    return value
                  }
                  this.inlineImageCache = this.inlineImageCache || {}
                  if (this.inlineImageCache[value]) {
                    return this.inlineImageCache[value]
                  }
                  this.preloadInlineImage(value)
                  return ''
                },
        preloadInlineImage(value) {
                  if (!value || typeof fetch === 'undefined') {
                    return
                  }
                  let requestUrl = this.absoluteImageHref(value)
                  if (!requestUrl) {
                    return
                  }
                  this.inlineImagePending = this.inlineImagePending || {}
                  if (this.inlineImagePending[value]) {
                    return
                  }
                  this.inlineImagePending[value] = true
                  fetch(requestUrl)
                    .then((response) => response.text())
                    .then((text) => {
                      this.inlineImageCache = this.inlineImageCache || {}
                      this.inlineImageCache[value] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text)
                      delete this.inlineImagePending[value]
                      if (typeof window !== 'undefined' && window.corSociety) {
                        window.setTimeout(() => {
                          try {
                            window.corSociety.applyPortraitOverlays()
                          } catch (err) {
                            console.warn(err)
                          }
                        }, 50)
                      }
                    })
                    .catch((err) => {
                      delete this.inlineImagePending[value]
                      console.warn(err)
                    })
                },
        imageHref(value) {
                  value = String(value || '')
                  if (/^[A-Za-z0-9+/=]+$/.test(value.slice(0, 160)) && value.length > 120) {
                    return 'data:image/svg+xml;base64,' + value
                  }
                  return value
                },
        absoluteImageHref(value) {
                  value = this.imageHref(value)
                  if (!value || value.indexOf('data:image/') === 0 || value.indexOf('http') === 0 || value.indexOf('blob:') === 0) {
                    return value
                  }
                  try {
                    if (typeof document !== 'undefined' && document.baseURI) {
                      return new URL(value, document.baseURI).href
                    }
                    if (typeof window !== 'undefined' && window.location && window.location.href) {
                      return new URL(value, window.location.href).href
                    }
                  } catch (err) {
                    return value
                  }
                  return value
                },
        svgTextFromDataUri(value) {
                  value = String(value || '')
                  if (value.indexOf('data:image/svg+xml') !== 0) {
                    return ''
                  }
                  let commaIndex = value.indexOf(',')
                  if (commaIndex < 0) {
                    return ''
                  }
                  let meta = value.slice(0, commaIndex)
                  let body = value.slice(commaIndex + 1)
                  try {
                    if (meta.indexOf(';base64') > -1 && typeof atob !== 'undefined') {
                      return atob(body)
                    }
                    return decodeURIComponent(body)
                  } catch (err) {
                    console.warn(err)
                    return ''
                  }
                },
        wardrobePalette(outfit, gender, ageStage, role) {
                  let palettes = {
                    senatorToga: { base: '#f6efe3', shade: '#d7cab6', highlight: '#fffaf0', accent: '#8b1f35' },
                    togaPraetexta: { base: '#f4ead9', shade: '#d2c1a8', highlight: '#fff8eb', accent: '#7b2140' },
                    togaCandida: { base: '#fff9ee', shade: '#e4d7c2', highlight: '#ffffff', accent: '#c7b38e' },
                    whiteToga: { base: '#f5eadb', shade: '#d8c9b2', highlight: '#fffaf2', accent: '#b99964' },
                    citizenToga: { base: '#e7d8bf', shade: '#c3a879', highlight: '#f4ead8', accent: '#a57937' },
                    equestrianTunic: { base: '#efe1cb', shade: '#c7a66f', highlight: '#f8eddb', accent: '#263f73' },
                    mantle: { base: '#c3924a', shade: '#8b5d2f', highlight: '#d8af62', accent: '#6b3f24' },
                    simpleTunic: { base: '#d0b17b', shade: '#9b7243', highlight: '#dfc58f', accent: '#6e4d30' },
                    workerTunic: { base: '#a47a4b', shade: '#6e472c', highlight: '#bc9061', accent: '#4f2e1f' },
                    brownMantle: { base: '#7e5736', shade: '#553420', highlight: '#9b7048', accent: '#3f2a1f' },
                    militaryCloak: { base: '#9f2525', shade: '#68191b', highlight: '#bd4938', accent: '#d6aa3c' },
                    armoredTunic: { base: '#9fa3a2', shade: '#6d7173', highlight: '#d2d0c9', accent: '#8f7c59' },
                    redMantle: { base: '#a62624', shade: '#65161a', highlight: '#c74d3b', accent: '#cfa35b' },
                    stola: { base: '#d9bf87', shade: '#aa7f4d', highlight: '#ead3a0', accent: '#8f5f35' },
                    whiteStola: { base: '#f3ead8', shade: '#d4c3a7', highlight: '#fff8ec', accent: '#b99359' },
                    palla: { base: '#bd8d4b', shade: '#86562f', highlight: '#d4aa67', accent: '#744d2b' },
                    purplePalla: { base: '#6e345d', shade: '#3f1f3c', highlight: '#926f9f', accent: '#d6aa3c' },
                    childStola: { base: '#dec58f', shade: '#b28a58', highlight: '#ead9ad', accent: '#9d7340' },
                    childTunic: { base: '#d0b17b', shade: '#9b7243', highlight: '#dfc58f', accent: '#836038' }
                  }
                  if (ageStage === 'baby') {
                    return { base: '#efe7d5', shade: '#d6c7aa', highlight: '#fff7e8', accent: '#b9945d' }
                  }
                  return palettes[outfit] || (role === 'senatorial' ? palettes.senatorToga : role === 'worker' ? palettes.workerTunic : palettes.citizenToga)
                },
        recolorWardrobeSvgText(svg, outfit, gender, ageStage, role) {
                  let palette = this.wardrobePalette(outfit, gender, ageStage, role)
                  let viewBox = this.svgViewBoxSize(svg)
                  let protectedSkinColors = this.svgProtectedSkinColors(svg, viewBox)
                  Object.assign(protectedSkinColors, this.svgProtectedIdentityColors(svg, viewBox))
                  let colorMap = {}
                  let elementIndex = 0
                  return String(svg || '').replace(/<(path|rect|ellipse|circle|polygon|polyline|line)\b[^>]*(?:fill|stroke)="#[0-9a-fA-F]{3,6}"[^>]*>/g, (tag) => {
                    let bounds = this.svgPaintElementBounds(tag)
                    if (!this.isWardrobePaintRegion(bounds, viewBox)) {
                      return tag
                    }
                    return this.recolorWardrobePaintTag(tag, bounds, viewBox, palette, colorMap, elementIndex++, protectedSkinColors)
                  })
                },
        recolorWardrobePaintTag(tag, bounds, viewBox, palette, colorMap, elementIndex, protectedSkinColors) {
                  return String(tag || '').replace(/\b(fill|stroke)="(#[0-9a-fA-F]{3,6})"/g, (match, attr, color) => {
                    if (color.toLowerCase() === '#000' || color.toLowerCase() === '#000000') {
                      return match
                    }
                    if (attr === 'fill' && this.isProtectedSkinPaintColor(color, protectedSkinColors)) {
                      return match
                    }
                    if (this.isProtectedAdornmentPaintColor(color, bounds, viewBox, attr)) {
                      return match
                    }
                    let key = attr + ':' + color.toLowerCase()
                    if (!colorMap[key]) {
                      colorMap[key] = this.wardrobePaintReplacement(color, palette, attr === 'stroke', elementIndex)
                    }
                    return attr + '="' + colorMap[key] + '"'
                  })
                },
        svgViewBoxSize(svg) {
                  let match = String(svg || '').match(/viewBox="([^"]+)"/i)
                  if (!match) {
                    return { width: 512, height: 512 }
                  }
                  let nums = this.numberList(match[1])
                  return {
                    x: nums[0] || 0,
                    y: nums[1] || 0,
                    width: nums[2] || 512,
                    height: nums[3] || 512
                  }
                },
        svgPaintElementBounds(tag) {
                  tag = String(tag || '')
                  let values = []
                  let element = (tag.match(/^<([a-zA-Z]+)/) || [])[1]
                  if (element === 'rect') {
                    let x = this.svgAttributeNumber(tag, 'x', 0)
                    let y = this.svgAttributeNumber(tag, 'y', 0)
                    let width = this.svgAttributeNumber(tag, 'width', 0)
                    let height = this.svgAttributeNumber(tag, 'height', 0)
                    return this.svgBoundsFromPoints([[x, y], [x + width, y + height]])
                  }
                  if (element === 'circle') {
                    let cx = this.svgAttributeNumber(tag, 'cx', 0)
                    let cy = this.svgAttributeNumber(tag, 'cy', 0)
                    let r = this.svgAttributeNumber(tag, 'r', 0)
                    return this.svgBoundsFromPoints([[cx - r, cy - r], [cx + r, cy + r], [cx, cy]])
                  }
                  if (element === 'ellipse') {
                    let cx = this.svgAttributeNumber(tag, 'cx', 0)
                    let cy = this.svgAttributeNumber(tag, 'cy', 0)
                    let rx = this.svgAttributeNumber(tag, 'rx', 0)
                    let ry = this.svgAttributeNumber(tag, 'ry', 0)
                    return this.svgBoundsFromPoints([[cx - rx, cy - ry], [cx + rx, cy + ry], [cx, cy]])
                  }
                  if (element === 'line') {
                    return this.svgBoundsFromPoints([
                      [this.svgAttributeNumber(tag, 'x1', 0), this.svgAttributeNumber(tag, 'y1', 0)],
                      [this.svgAttributeNumber(tag, 'x2', 0), this.svgAttributeNumber(tag, 'y2', 0)]
                    ])
                  }
                  if (element === 'polygon' || element === 'polyline') {
                    let points = (tag.match(/\spoints="([^"]+)"/i) || [])[1]
                    let nums = this.numberList(points)
                    let pairs = []
                    for (let i = 0; i + 1 < nums.length; i += 2) {
                      pairs.push([nums[i], nums[i + 1]])
                    }
                    return this.svgBoundsFromPoints(pairs)
                  }
                  let d = tag.match(/\sd="([^"]+)"/i)
                  if (d) {
                    let pathBounds = this.svgPathBounds(d[1])
                    if (pathBounds) {
                      return pathBounds
                    }
                    values = this.numberList(d[1])
                  } else {
                    values = this.numberList(tag)
                  }
                  let ys = []
                  let xs = []
                  for (let i = 0; i + 1 < values.length; i += 2) {
                    if (isFinite(values[i]) && isFinite(values[i + 1])) {
                      xs.push(values[i])
                      ys.push(values[i + 1])
                    }
                  }
                  return this.svgBoundsFromPoints(xs.map((x, index) => [x, ys[index]]))
                },
        svgPathBounds(pathData) {
                  let tokens = String(pathData || '').match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []
                  let index = 0
                  let command = ''
                  let x = 0
                  let y = 0
                  let startX = 0
                  let startY = 0
                  let xs = []
                  let ys = []
                  let hasNumber = () => index < tokens.length && !/^[a-zA-Z]$/.test(tokens[index])
                  let nextNumber = () => parseFloat(tokens[index++])
                  let addPoint = (px, py) => {
                    if (!isFinite(px) || !isFinite(py)) {
                      return
                    }
                    x = px
                    y = py
                    xs.push(px)
                    ys.push(py)
                  }
                  let safety = 0
                  while (index < tokens.length && safety < 10000) {
                    safety += 1
                    let previousIndex = index
                    if (/^[a-zA-Z]$/.test(tokens[index])) {
                      command = tokens[index++]
                    }
                    if (!command) {
                      break
                    }
                    let relative = command === command.toLowerCase()
                    let cmd = command.toUpperCase()
                    if (cmd === 'Z') {
                      addPoint(startX, startY)
                      command = ''
                      continue
                    }
                    if (cmd === 'M' || cmd === 'L' || cmd === 'T') {
                      while (hasNumber()) {
                        let nx = nextNumber()
                        if (!hasNumber()) break
                        let ny = nextNumber()
                        nx = relative ? x + nx : nx
                        ny = relative ? y + ny : ny
                        addPoint(nx, ny)
                        if (cmd === 'M') {
                          startX = x
                          startY = y
                          cmd = 'L'
                          command = relative ? 'l' : 'L'
                        }
                      }
                    } else if (cmd === 'H') {
                      while (hasNumber()) {
                        let nx = nextNumber()
                        addPoint(relative ? x + nx : nx, y)
                      }
                    } else if (cmd === 'V') {
                      while (hasNumber()) {
                        let ny = nextNumber()
                        addPoint(x, relative ? y + ny : ny)
                      }
                    } else if (cmd === 'C') {
                      while (hasNumber()) {
                        let baseX = x
                        let baseY = y
                        let lastX = x
                        let lastY = y
                        for (let pair = 0; pair < 3; pair += 1) {
                          if (!hasNumber()) break
                          let nx = nextNumber()
                          if (!hasNumber()) break
                          let ny = nextNumber()
                          nx = relative ? baseX + nx : nx
                          ny = relative ? baseY + ny : ny
                          if (isFinite(nx) && isFinite(ny)) {
                            xs.push(nx)
                            ys.push(ny)
                            lastX = nx
                            lastY = ny
                          }
                        }
                        x = lastX
                        y = lastY
                      }
                    } else if (cmd === 'S' || cmd === 'Q') {
                      while (hasNumber()) {
                        let baseX = x
                        let baseY = y
                        let lastX = x
                        let lastY = y
                        for (let pair = 0; pair < 2; pair += 1) {
                          if (!hasNumber()) break
                          let nx = nextNumber()
                          if (!hasNumber()) break
                          let ny = nextNumber()
                          nx = relative ? baseX + nx : nx
                          ny = relative ? baseY + ny : ny
                          if (isFinite(nx) && isFinite(ny)) {
                            xs.push(nx)
                            ys.push(ny)
                            lastX = nx
                            lastY = ny
                          }
                        }
                        x = lastX
                        y = lastY
                      }
                    } else if (cmd === 'A') {
                      while (hasNumber()) {
                        if (index + 6 >= tokens.length) {
                          break
                        }
                        index += 5
                        let nx = nextNumber()
                        let ny = nextNumber()
                        nx = relative ? x + nx : nx
                        ny = relative ? y + ny : ny
                        addPoint(nx, ny)
                      }
                    } else {
                      while (hasNumber()) {
                        index += 1
                      }
                    }
                    if (index === previousIndex) {
                      index += 1
                    }
                  }
                  if (!ys.length) {
                    return false
                  }
                  return this.svgBoundsFromPoints(xs.map((px, pointIndex) => [px, ys[pointIndex]]))
                },
        isWardrobePaintRegion(bounds, viewBox) {
                  if (!bounds) {
                    return false
                  }
                  if (!this.isVisibleSvgPaintRegion(bounds, viewBox)) {
                    return false
                  }
                  let top = (viewBox && viewBox.y) || 0
                  let height = (viewBox && viewBox.height) || 512
                  if (bounds.pointCount <= 1) {
                    return bounds.maxY >= top + height * 0.62
                  }
                  return bounds.maxY >= top + height * 0.66 && (bounds.avgY >= top + height * 0.54 || bounds.firstY >= top + height * 0.54 || bounds.minY >= top + height * 0.50)
                },
        svgProtectedSkinColors(svg, viewBox) {
                  let protectedColors = {}
                  String(svg || '').replace(/<(path|rect|ellipse|circle|polygon|polyline|line)\b[^>]*\bfill="#[0-9a-fA-F]{3,6}"[^>]*>/g, (tag) => {
                    let bounds = this.svgPaintElementBounds(tag)
                    if (!this.isVisibleSvgPaintRegion(bounds, viewBox)) {
                      return tag
                    }
                    let fill = (tag.match(/\bfill="(#[0-9a-fA-F]{3,6})"/i) || [])[1]
                    if (fill && this.isSkinPaintSample(bounds, viewBox, fill)) {
                      protectedColors[fill.toLowerCase()] = true
                    }
                    return tag
                  })
                  return protectedColors
                },
        svgProtectedIdentityColors(svg, viewBox) {
                  let protectedColors = {}
                  String(svg || '').replace(/<(path|rect|ellipse|circle|polygon|polyline|line)\b[^>]*\bfill="#[0-9a-fA-F]{3,6}"[^>]*>/g, (tag) => {
                    let bounds = this.svgPaintElementBounds(tag)
                    if (!this.isVisibleSvgPaintRegion(bounds, viewBox)) {
                      return tag
                    }
                    let fill = (tag.match(/\bfill="(#[0-9a-fA-F]{3,6})"/i) || [])[1]
                    if (fill && this.isUpperIdentityPaintSample(bounds, viewBox, fill)) {
                      protectedColors[fill.toLowerCase()] = true
                    }
                    return tag
                  })
                  return protectedColors
                },
        isUpperIdentityPaintSample(bounds, viewBox, color) {
                  if (!bounds || !color) {
                    return false
                  }
                  let top = (viewBox && viewBox.y) || 0
                  let height = (viewBox && viewBox.height) || 512
                  let upperRegion = bounds.minY <= top + height * 0.58 && bounds.avgY <= top + height * 0.62
                  if (!upperRegion) {
                    return false
                  }
                  return this.isLikelyHairPaintColor(color, bounds, viewBox)
                },
        isLikelyHairPaintColor(color, bounds, viewBox) {
                  color = String(color || '').toLowerCase()
                  if (!color || this.isKnownVanillaSkinPaintColor(color) || this.isLikelySkinPaintColor(color)) {
                    return false
                  }
                  let rgb = this.hexToRgb(color)
                  if (!rgb) {
                    return false
                  }
                  let r = rgb.r / 255
                  let g = rgb.g / 255
                  let b = rgb.b / 255
                  let max = Math.max(r, g, b)
                  let min = Math.min(r, g, b)
                  let delta = max - min
                  let hue = 0
                  if (delta > 0) {
                    if (max === r) hue = ((g - b) / delta) % 6
                    else if (max === g) hue = (b - r) / delta + 2
                    else hue = (r - g) / delta + 4
                    hue *= 60
                    if (hue < 0) hue += 360
                  }
                  let saturation = max === 0 ? 0 : delta / max
                  let luminance = this.colorLuminance(color)
                  let top = (viewBox && viewBox.y) || 0
                  let height = (viewBox && viewBox.height) || 512
                  let touchesHead = bounds.minY <= top + height * 0.40
                  if (luminance <= 0.26 && saturation <= 0.80) return true
                  if (hue >= 12 && hue <= 48 && saturation >= 0.18 && saturation <= 0.90 && luminance >= 0.08 && luminance <= 0.58) return true
                  if (hue >= 38 && hue <= 62 && saturation >= 0.16 && saturation <= 0.72 && luminance >= 0.42 && luminance <= 0.82 && touchesHead) return true
                  if (saturation <= 0.18 && luminance >= 0.20 && luminance <= 0.78 && touchesHead) return true
                  return false
                },
        isSkinPaintSample(bounds, viewBox, color) {
                  if (!bounds || !this.isPossibleHumanSkinPaintColor(color)) {
                    return false
                  }
                  let top = (viewBox && viewBox.y) || 0
                  let height = (viewBox && viewBox.height) || 512
                  return bounds.maxY >= top + height * 0.18 &&
                    bounds.minY <= top + height * 0.76 &&
                    bounds.avgY >= top + height * 0.14 &&
                    bounds.avgY <= top + height * 0.74
                },
        isVisibleSvgPaintRegion(bounds, viewBox) {
                  if (!bounds) {
                    return false
                  }
                  let left = (viewBox && viewBox.x) || 0
                  let top = (viewBox && viewBox.y) || 0
                  let right = left + ((viewBox && viewBox.width) || 512)
                  let bottom = top + ((viewBox && viewBox.height) || 512)
                  return bounds.maxY >= top &&
                    bounds.minY <= bottom &&
                    (bounds.maxX === undefined || bounds.maxX >= left) &&
                    (bounds.minX === undefined || bounds.minX <= right)
                },
        svgAttributeNumber(tag, name, fallback) {
                  let match = String(tag || '').match(new RegExp('\\b' + name + '="([^"]+)"', 'i'))
                  if (!match) {
                    return fallback
                  }
                  let value = parseFloat(match[1])
                  return isFinite(value) ? value : fallback
                },
        svgBoundsFromPoints(points) {
                  points = (points || []).filter((point) => point && isFinite(point[0]) && isFinite(point[1]))
                  if (!points.length) {
                    return false
                  }
                  let xs = points.map((point) => point[0])
                  let ys = points.map((point) => point[1])
                  let sumX = xs.reduce((sum, value) => sum + value, 0)
                  let sumY = ys.reduce((sum, value) => sum + value, 0)
                  return {
                    minX: Math.min.apply(Math, xs),
                    maxX: Math.max.apply(Math, xs),
                    avgX: sumX / xs.length,
                    firstX: xs[0],
                    minY: Math.min.apply(Math, ys),
                    maxY: Math.max.apply(Math, ys),
                    avgY: sumY / ys.length,
                    firstY: ys[0],
                    width: Math.max.apply(Math, xs) - Math.min.apply(Math, xs),
                    height: Math.max.apply(Math, ys) - Math.min.apply(Math, ys),
                    area: (Math.max.apply(Math, xs) - Math.min.apply(Math, xs)) * (Math.max.apply(Math, ys) - Math.min.apply(Math, ys)),
                    pointCount: ys.length
                  }
                },
        wardrobePaintReplacement(color, palette, isStroke, elementIndex) {
                  if (isStroke) {
                    return palette.accent || palette.shade || palette.base
                  }
                  let luminance = this.colorLuminance(color)
                  if (luminance >= 0.78) {
                    return palette.highlight || palette.base
                  }
                  if (luminance >= 0.56) {
                    return elementIndex % 3 === 0 ? (palette.highlight || palette.base) : palette.base
                  }
                  if (luminance <= 0.28) {
                    return palette.shade || palette.base
                  }
                  return elementIndex % 2 === 0 ? palette.base : (palette.shade || palette.base)
                },
        isProtectedAdornmentPaintColor(color, bounds, viewBox, attr) {
                  color = String(color || '').toLowerCase()
                  if (!bounds || !this.isVisibleSvgPaintRegion(bounds, viewBox)) {
                    return false
                  }
                  let width = Math.abs(bounds.width || ((bounds.maxX || 0) - (bounds.minX || 0)))
                  let height = Math.abs(bounds.height || ((bounds.maxY || 0) - (bounds.minY || 0)))
                  let viewWidth = Math.max(1, (viewBox && viewBox.width) || 512)
                  let viewHeight = Math.max(1, (viewBox && viewBox.height) || 512)
                  let relativeArea = Math.max(0, width * height) / Math.max(1, viewWidth * viewHeight)
                  let small = (width <= viewWidth * 0.18 && height <= viewHeight * 0.18) || relativeArea <= 0.018
                  let trim = (width <= viewWidth * 0.45 && height <= viewHeight * 0.09) || (width <= viewWidth * 0.12 && height <= viewHeight * 0.38)
                  let tinyDetail = (width <= viewWidth * 0.14 && height <= viewHeight * 0.14) || relativeArea <= 0.010
                  let mediumAdornment = width <= viewWidth * 0.36 && height <= viewHeight * 0.28 && relativeArea <= 0.055
                  let brightGold = {
                    '#f8a814': true,
                    '#f8b53c': true,
                    '#f9cd45': true,
                    '#c98441': true,
                    '#e5aa17': true,
                    '#db9d12': true,
                    '#ffb000': true,
                    '#efac06': true,
                    '#f7b93e': true,
                    '#e0a632': true,
                    '#eac734': true,
                    '#d6aa3c': true,
                    '#c9a24a': true,
                    '#c99a3c': true
                  }
                  let darkGoldDetail = {
                    '#aa6b07': true,
                    '#825308': true,
                    '#4c350c': true,
                    '#9e793c': true,
                    '#c6943c': true,
                    '#cc902f': true
                  }
                  let metalDetail = {
                    '#7f8585': true,
                    '#8f7c59': true,
                    '#8e9293': true,
                    '#979797': true,
                    '#b8a072': true,
                    '#c7bda7': true,
                    '#d0d5d5': true,
                    '#d6d2c7': true
                  }
                  if (brightGold[color]) {
                    return small || trim || mediumAdornment
                  }
                  if (darkGoldDetail[color]) {
                    return small || trim
                  }
                  if (metalDetail[color]) {
                    return small || trim
                  }
                  let rgb = this.hexToRgb(color)
                  if (!rgb) {
                    return false
                  }
                  let r = rgb.r / 255
                  let g = rgb.g / 255
                  let b = rgb.b / 255
                  let max = Math.max(r, g, b)
                  let min = Math.min(r, g, b)
                  let delta = max - min
                  let hue = 0
                  if (delta > 0) {
                    if (max === r) {
                      hue = ((g - b) / delta) % 6
                    } else if (max === g) {
                      hue = (b - r) / delta + 2
                    } else {
                      hue = (r - g) / delta + 4
                    }
                    hue *= 60
                    if (hue < 0) {
                      hue += 360
                    }
                  }
                  let saturation = max === 0 ? 0 : delta / max
                  let luminance = this.colorLuminance(color)
                  let goldHue = hue >= 28 && hue <= 58 && saturation >= 0.48 && luminance >= 0.32 && luminance <= 0.86
                  let bronzeHue = hue >= 18 && hue <= 45 && saturation >= 0.40 && luminance >= 0.24 && luminance <= 0.62
                  let gemHue = saturation >= 0.45 &&
                    luminance >= 0.18 &&
                    luminance <= 0.72 &&
                    ((hue >= 190 && hue <= 265) || (hue >= 280 && hue <= 345) || hue <= 15 || (hue >= 95 && hue <= 170))
                  let metalHue = saturation <= 0.14 && luminance >= 0.38 && luminance <= 0.86
                  if (goldHue && (tinyDetail || trim)) {
                    return true
                  }
                  if (bronzeHue && tinyDetail) {
                    return true
                  }
                  if ((gemHue || metalHue) && (tinyDetail || trim)) {
                    return true
                  }
                  return false
                },
        isProtectedSkinPaintColor(color, protectedSkinColors) {
                  color = String(color || '').toLowerCase()
                  return !!(protectedSkinColors && protectedSkinColors[color]) || this.isKnownVanillaSkinPaintColor(color) || this.isLikelySkinPaintColor(color)
                },
        isKnownVanillaSkinPaintColor(color) {
                  let known = {
                    '#f0bca6': true,
                    '#e6b09a': true,
                    '#e2a58a': true,
                    '#bc8e79': true,
                    '#b38978': true,
                    '#b28776': true,
                    '#b18675': true,
                    '#bc8169': true,
                    '#c9a594': true,
                    '#c6a89c': true,
                    '#c1a194': true,
                    '#c3a397': true,
                    '#cbad9e': true,
                    '#b38b7b': true,
                    '#b09685': true,
                    '#ae9484': true,
                    '#675f5b': true,
                    '#655f5b': true,
                    '#897f79': true,
                    '#867878': true,
                    '#7c736e': true,
                    '#756e6a': true,
                    '#c2b4b4': true,
                    '#b2a1a1': true
                  }
                  return !!known[String(color || '').toLowerCase()]
                },
        isLikelySkinPaintColor(color) {
                  if (this.isKnownVanillaSkinPaintColor(color)) {
                    return true
                  }
                  let rgb = this.hexToRgb(color)
                  if (!rgb) {
                    return false
                  }
                  let max = Math.max(rgb.r, rgb.g, rgb.b)
                  let min = Math.min(rgb.r, rgb.g, rgb.b)
                  let luminance = (max + min) / 510
                  return rgb.r > rgb.g &&
                    rgb.g >= rgb.b &&
                    luminance > 0.40 &&
                    luminance < 0.90 &&
                    (rgb.r - rgb.b) > 18 &&
                    (rgb.r - rgb.g) < 90 &&
                    (rgb.g - rgb.b) < 72
                },
        isPossibleHumanSkinPaintColor(color) {
                  if (this.isKnownVanillaSkinPaintColor(color)) {
                    return true
                  }
                  let rgb = this.hexToRgb(color)
                  if (!rgb) {
                    return false
                  }
                  let max = Math.max(rgb.r, rgb.g, rgb.b)
                  let min = Math.min(rgb.r, rgb.g, rgb.b)
                  let chroma = max - min
                  let luminance = this.colorLuminance(color)
                  if (luminance < 0.30 || luminance > 0.92) {
                    return false
                  }
                  if (rgb.r + 6 < rgb.g || rgb.g + 10 < rgb.b) {
                    return false
                  }
                  if (rgb.r - rgb.b < 10) {
                    return false
                  }
                  if (luminance < 0.45 && chroma > 60) {
                    return false
                  }
                  if (chroma >= 90) {
                    return false
                  }
                  if (rgb.r - rgb.g < 120 && rgb.g - rgb.b < 105) {
                    return true
                  }
                  return luminance > 0.42 && chroma < 44 && rgb.r - rgb.b >= 10 && rgb.r >= rgb.g && rgb.g >= rgb.b
                },
        colorLuminance(color) {
                  let rgbMatch = String(color || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
                  let rgb = rgbMatch
                    ? { r: parseInt(rgbMatch[1], 10), g: parseInt(rgbMatch[2], 10), b: parseInt(rgbMatch[3], 10) }
                    : this.hexToRgb(color)
                  if (!rgb) {
                    return 0.5
                  }
                  return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
                },
        hexToRgb(color) {
                  color = String(color || '').replace('#', '').trim()
                  if (color.length === 3) {
                    color = color.split('').map((part) => part + part).join('')
                  }
                  if (!/^[0-9a-fA-F]{6}$/.test(color)) {
                    return false
                  }
                  return {
                    r: parseInt(color.slice(0, 2), 16),
                    g: parseInt(color.slice(2, 4), 16),
                    b: parseInt(color.slice(4, 6), 16)
                  }
                },
        numberList(text) {
                  let matches = String(text || '').match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []
                  return matches.map((value) => parseFloat(value)).filter((value) => isFinite(value))
                },
        replaceSvgColor(svg, from, to) {
                  let escaped = String(from || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                  return String(svg || '').replace(new RegExp(escaped, 'gi'), to)
                },
        isImageData(value) {
                  if (!value || typeof value !== 'string') {
                    return false
                  }
                  if (
                    value.indexOf('data:image/') === 0 ||
                    value.indexOf('http') === 0 ||
                    value.indexOf('blob:') === 0 ||
                    value.indexOf('img/') === 0 ||
                    value.indexOf('/img/') === 0 ||
                    /\.(svg|png|jpg|jpeg|webp)(\?|#|$)/i.test(value)
                  ) {
                    return true
                  }
                  return value.length > 120 && /^[A-Za-z0-9+/=]+$/.test(value.slice(0, 160))
                },
        characterAgeStage(age) {
                  if (age < 4) return 'baby'
                  if (age < 16) return 'teen'
                  if (age >= 55) return 'old'
                  return 'adult'
                },
        characterPortraitRole(character, ageStage, stratum) {
                  if (ageStage === 'baby') return 'baby'
                  if (stratum === 'senatorial') return 'senatorial'
                  if (stratum === 'equestrian') return 'equestrian'
                  if (stratum === 'poor') return 'worker'
                  let job = character.job || ''
                  let traits = character.traits || []
                  if (job === 'senator' || traits.indexOf('senator') >= 0 || traits.indexOf('formerPraetor') >= 0 || traits.indexOf('formerQuaestor') >= 0) return 'senatorial'
                  if (['lawyer', 'rhetor', 'physician'].indexOf(job) >= 0) return 'learned'
                  if (['trader'].indexOf(job) >= 0) return 'merchant'
                  if (['soldier', 'gladiator'].indexOf(job) >= 0 || traits.indexOf('veteran') >= 0 || traits.indexOf('gladiator') >= 0) return 'martial'
                  if (job === 'labourer') return 'worker'
                  return 'citizen'
                },
        clothingOptions(gender, ageStage, role, stratum) {
                  if (ageStage === 'teen') return gender === 'female' ? ['childStola', 'palla', 'simpleTunic'] : ['childTunic', 'simpleTunic', 'mantle']
                  if (stratum === 'senatorial') return gender === 'female' ? ['palla', 'purplePalla', 'whiteStola'] : ['senatorToga', 'togaPraetexta', 'togaCandida']
                  if (stratum === 'equestrian') return ['equestrianTunic', 'mantle', 'citizenToga']
                  if (stratum === 'poor') return ['workerTunic', 'brownMantle', 'simpleTunic']
                  if (stratum === 'freedmen') return ['simpleTunic', 'brownMantle', 'mantle']
                  if (role === 'senatorial') return ['senatorToga', 'togaPraetexta', 'togaCandida']
                  if (role === 'equestrian') return ['equestrianTunic', 'mantle', 'citizenToga']
                  if (role === 'martial') return ['militaryCloak', 'armoredTunic', 'redMantle']
                  if (role === 'merchant') return ['mantle', 'equestrianTunic', 'simpleTunic']
                  if (role === 'worker') return ['workerTunic', 'simpleTunic', 'brownMantle']
                  if (gender === 'female') return ['stola', 'palla', 'whiteStola', 'purplePalla']
                  return ['citizenToga', 'mantle', 'simpleTunic', 'whiteToga']
                },
        pickByRandom(list, random) {
                  return list[Math.floor(random() * list.length) % list.length]
                }
      })
      window.corSociety._mixinCorSocietyPortraitsWardrobeVersion = '1.1.331'
    }
  }
}
