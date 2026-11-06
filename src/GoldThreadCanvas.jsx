import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const CONFIG = {
  desktopThreadLanes: [
    { x: [0.06, 0.17], sway: [0.018, 0.032] },
    { x: [0.42, 0.58], sway: [0.2, 0.27] },
    { x: [0.83, 0.95], sway: [0.018, 0.032] },
  ],
  mobileThreadLanes: [
    { x: [0.08, 0.24], sway: [0.018, 0.03] },
    { x: [0.52, 0.76], sway: [0.16, 0.23] },
  ],
  threadWidth: [1, 2.5],
  desktopThreadOpacity: [0.31, 0.43],
  mobileThreadOpacity: [0.27, 0.36],
  desktopPoints: 80,
  mobilePoints: 40,
  desktopDustParticles: 25,
  mobileDustParticles: 12,
  mobileBreakpoint: 650,
  tabletBreakpoint: 900,
  maxDpr: 2,
  noiseSpeed: 0.000055,
  noiseScale: 0.0038,
  noiseAmplitude: 52,
  tabletNoiseAmplitude: 10,
  mobileNoiseAmplitude: 5,
  cursorRadius: 160,
  pushStrength: 34,
  springStiffness: 34,
  springDamping: 12,
  dustCursorRadius: 125,
  dustAttraction: 0.68,
  dustDragRadius: 32,
  dustSpringStiffness: 18,
  dustSpringDamping: 8,
  dustDrift: 5,
  resizeDebounce: 120,
  glowBlur: 5,
  gold: '#0F766E',
  lightGold: '#E76F51',
}

function hashGrid(x, y, seed) {
  let value = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2246822519)
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295
}

function randomBetween([min, max]) {
  return min + Math.random() * (max - min)
}

function createThreadDefinitions(lanes, opacityRange) {
  return lanes.map((lane) => ({
    seed: Math.floor(Math.random() * 100_000),
    x: randomBetween(lane.x),
    sway: randomBetween(lane.sway),
    width: randomBetween(CONFIG.threadWidth),
    opacity: randomBetween(opacityRange),
    phase: Math.random() * Math.PI * 2,
  }))
}

function gradientNoise(x, y, seed) {
  const left = Math.floor(x)
  const top = Math.floor(y)
  const fx = x - left
  const fy = y - top
  const smoothX = fx * fx * (3 - 2 * fx)
  const smoothY = fy * fy * (3 - 2 * fy)
  const topValue = hashGrid(left, top, seed) * (1 - smoothX) + hashGrid(left + 1, top, seed) * smoothX
  const bottomValue = hashGrid(left, top + 1, seed) * (1 - smoothX) + hashGrid(left + 1, top + 1, seed) * smoothX
  return (topValue * (1 - smoothY) + bottomValue * smoothY) * 2 - 1
}

function drawSmoothPath(context, points, first = 0, last = points.length - 1, opacity = 1) {
  if (last <= first) return
  for (let index = first; index < last; index += 1) {
    const point = points[index]
    const nextPoint = points[index + 1]
    const startX = index === first ? point.x : (points[index - 1].x + point.x) / 2
    const startY = index === first ? point.y : (points[index - 1].y + point.y) / 2
    const endX = index + 1 === last ? nextPoint.x : (point.x + nextPoint.x) / 2
    const endY = index + 1 === last ? nextPoint.y : (point.y + nextPoint.y) / 2
    context.globalAlpha = opacity * (point.opacity + nextPoint.opacity) / 2
    context.beginPath()
    context.moveTo(startX, startY)
    context.quadraticCurveTo(point.x, point.y, endX, endY)
    context.stroke()
  }
}

function createCanvasRenderer(canvas) {
  const context = canvas.getContext('2d')
  if (!context) return null

  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  const shouldReduceMotion = () => motionPreference.matches
  const pointer = { x: 0, y: 0, active: false }
  const threads = []
  const dustParticles = []
  const threadDefinitions = {
    desktop: createThreadDefinitions(CONFIG.desktopThreadLanes, CONFIG.desktopThreadOpacity),
    mobile: createThreadDefinitions(CONFIG.mobileThreadLanes, CONFIG.mobileThreadOpacity),
  }
  const dustSeeds = Array.from({ length: CONFIG.desktopDustParticles }, () => ({
    x: Math.random(),
    y: Math.random(),
    phase: Math.random() * Math.PI * 2,
    radius: 1.2 + Math.random() * 1.5,
    opacity: 0.36 + Math.random() * 0.32,
  }))
  let draggedParticle = -1
  let width = 0
  let height = 0
  let dpr = 1
  let animationFrame = 0
  let lastFrameTime = 0
  let resizeTimer = 0
  let isVisible = true
  let isPageActive = document.visibilityState === 'visible'
  let disposed = false
  let maskRects = []
  let lastMaskUpdate = Number.NEGATIVE_INFINITY

  const updateMasks = (timestamp) => {
    if (timestamp - lastMaskUpdate < 180) return
    lastMaskUpdate = timestamp
    maskRects = Array.from(document.querySelectorAll(
      '.hero-copy, .hero-preview, .features-intro, .feature-item, .schedule-preview-heading, .schedule-preview-card, .closing-cta',
    )).map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        text: element.matches('.hero-copy, .features-intro, .schedule-preview-heading'),
      }
    }).filter((rect) => rect.bottom > 0 && rect.top < height)
  }

  const configureCanvas = () => {
    width = window.innerWidth
    height = window.innerHeight
    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    const mobile = width <= CONFIG.mobileBreakpoint
    const definitions = mobile ? threadDefinitions.mobile : threadDefinitions.desktop
    const pointCount = mobile ? CONFIG.mobilePoints : CONFIG.desktopPoints
    const dustCount = mobile ? CONFIG.mobileDustParticles : CONFIG.desktopDustParticles
    threads.splice(0, threads.length, ...definitions.map((definition) => ({
      ...definition,
      points: Array.from({ length: pointCount }, () => ({ x: 0, y: 0, offsetX: 0, offsetY: 0, velocityX: 0, velocityY: 0, influence: 0 })),
    })))
    dustParticles.splice(0, dustParticles.length, ...Array.from({ length: dustCount }, (_, index) => {
      const particleSeed = dustSeeds[index]
      const baseX = particleSeed.x * width
      const baseY = particleSeed.y * height
      return {
        baseX,
        baseY,
        x: baseX,
        y: baseY,
        velocityX: 0,
        velocityY: 0,
        phase: particleSeed.phase,
        radius: particleSeed.radius,
        opacity: particleSeed.opacity,
        influence: 0,
      }
    }))
  }

  const draw = (timestamp = 0, animate = false) => {
    if (disposed || !context) return
    const delta = Math.min((timestamp - (lastFrameTime || timestamp)) / 1000, 0.033)
    lastFrameTime = timestamp
    const pageScroll = window.scrollY
    const time = animate ? timestamp * CONFIG.noiseSpeed : 0
    const pageHeight = document.documentElement.scrollHeight
    updateMasks(timestamp)

    context.clearRect(0, 0, width, height)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    const threadGradient = context.createLinearGradient(0, 0, width, height)
    threadGradient.addColorStop(0, CONFIG.gold)
    threadGradient.addColorStop(0.52, CONFIG.lightGold)
    threadGradient.addColorStop(1, CONFIG.gold)

    threads.forEach((thread) => {
      const points = thread.points
      const noiseAmplitude = width <= CONFIG.mobileBreakpoint
        ? CONFIG.mobileNoiseAmplitude
        : width < CONFIG.tabletBreakpoint ? CONFIG.tabletNoiseAmplitude : CONFIG.noiseAmplitude
      points.forEach((point, index) => {
        const pageY = pageScroll - height * 0.16 + (index / (points.length - 1)) * height * 1.32
        const noise = gradientNoise(pageY * CONFIG.noiseScale, time + thread.phase, thread.seed)
        const secondaryNoise = gradientNoise(pageY * CONFIG.noiseScale * 0.58, time * 0.72 + thread.phase + 8, thread.seed + 19)
        const baseX = width * thread.x + noise * noiseAmplitude * (thread.sway / 0.035) +
          secondaryNoise * width * thread.sway * 0.22
        const baseY = pageY - pageScroll + secondaryNoise * noiseAmplitude * 0.18
        const globalY = pageY
        const startFade = Math.max(0, Math.min(1, globalY / 190))
        const endFade = Math.max(0, Math.min(1, (pageHeight - globalY) / 230))
        let maskOpacity = 1
        for (const rect of maskRects) {
          if (baseX >= rect.left && baseX <= rect.right && baseY >= rect.top && baseY <= rect.bottom) {
            maskOpacity = Math.min(maskOpacity, rect.text ? 0.12 : 0.34)
          }
        }
        point.x = baseX
        point.y = baseY
        point.opacity = startFade * endFade * maskOpacity

        let targetX = 0
        let targetY = 0
        let influence = 0
        if (animate && pointer.active) {
          const dx = baseX + point.offsetX - pointer.x
          const dy = baseY + point.offsetY - pointer.y
          const distance = Math.hypot(dx, dy)
          if (distance < CONFIG.cursorRadius) {
            const ratio = 1 - distance / CONFIG.cursorRadius
            influence = ratio * ratio * (3 - 2 * ratio)
            const direction = distance > 0 ? 1 / distance : 0
            targetX = dx * direction * CONFIG.pushStrength * influence
            targetY = dy * direction * CONFIG.pushStrength * influence
          }
        }

        if (animate) {
          const accelerationX = (targetX - point.offsetX) * CONFIG.springStiffness - point.velocityX * CONFIG.springDamping
          const accelerationY = (targetY - point.offsetY) * CONFIG.springStiffness - point.velocityY * CONFIG.springDamping
          point.velocityX += accelerationX * delta
          point.velocityY += accelerationY * delta
          point.offsetX += point.velocityX * delta
          point.offsetY += point.velocityY * delta
        } else {
          point.offsetX = 0
          point.offsetY = 0
        }
        point.influence = influence
        point.x = baseX + point.offsetX
        point.y = baseY + point.offsetY
      })

      context.save()
      context.strokeStyle = threadGradient
      context.lineWidth = thread.width
      context.shadowColor = CONFIG.gold
      context.shadowBlur = CONFIG.glowBlur
      drawSmoothPath(context, points, 0, points.length - 1, thread.opacity)
      context.restore()

      if (animate && pointer.active) {
        let first = -1
        let last = -1
        let strength = 0
        points.forEach((point, index) => {
          if (point.influence >= 0.02) {
            if (first < 0) first = index
            last = index
            strength = Math.max(strength, point.influence)
          }
        })
        if (first >= 0 && last >= first) {
          first = Math.max(0, first - 1)
          last = Math.min(points.length - 1, last + 1)
          context.strokeStyle = CONFIG.lightGold
          context.lineWidth = thread.width + 0.5
          context.shadowColor = CONFIG.lightGold
          context.shadowBlur = CONFIG.glowBlur + 2
          drawSmoothPath(context, points, first, last, strength * 0.72)
        }
      }
    })

    dustParticles.forEach((particle, index) => {
      const driftX = animate ? Math.sin(time * 2.4 + particle.phase) * CONFIG.dustDrift : 0
      const driftY = animate ? Math.cos(time * 1.8 + particle.phase) * CONFIG.dustDrift : 0
      let targetX = particle.baseX + driftX
      let targetY = particle.baseY + driftY
      let influence = 0

      if (animate && pointer.active) {
        const dx = pointer.x - targetX
        const dy = pointer.y - targetY
        const distance = Math.hypot(dx, dy)
        if (distance < CONFIG.dustCursorRadius) {
          const ratio = 1 - distance / CONFIG.dustCursorRadius
          influence = ratio * ratio * (3 - 2 * ratio)
          targetX += dx * CONFIG.dustAttraction * influence
          targetY += dy * CONFIG.dustAttraction * influence
        }
      }

      if (animate && draggedParticle === index && pointer.active) {
        targetX = pointer.x
        targetY = pointer.y
      }

      if (animate) {
        const accelerationX = (targetX - particle.x) * CONFIG.dustSpringStiffness - particle.velocityX * CONFIG.dustSpringDamping
        const accelerationY = (targetY - particle.y) * CONFIG.dustSpringStiffness - particle.velocityY * CONFIG.dustSpringDamping
        particle.velocityX += accelerationX * delta
        particle.velocityY += accelerationY * delta
        particle.x += particle.velocityX * delta
        particle.y += particle.velocityY * delta
      } else {
        particle.x = targetX
        particle.y = targetY
      }

      let maskOpacity = 1
      for (const rect of maskRects) {
        if (particle.x >= rect.left && particle.x <= rect.right && particle.y >= rect.top && particle.y <= rect.bottom) {
          maskOpacity = Math.min(maskOpacity, rect.text ? 0.12 : 0.34)
        }
      }

      context.save()
      context.globalAlpha = particle.opacity * maskOpacity * (1 + influence * 0.55)
      context.fillStyle = influence > 0.45 ? CONFIG.lightGold : CONFIG.gold
      context.shadowColor = influence > 0.45 ? CONFIG.lightGold : CONFIG.gold
      context.shadowBlur = 4 + influence * 8
      context.beginPath()
      context.arc(particle.x, particle.y, particle.radius + influence * 0.55, 0, Math.PI * 2)
      context.fill()
      context.restore()
      particle.influence = influence
    })

    context.globalAlpha = 1
    context.shadowBlur = 0
  }

  const canAnimate = () => !shouldReduceMotion() && isPageActive && isVisible && !disposed
  const frame = (timestamp) => {
    animationFrame = 0
    if (!canAnimate()) return
    draw(timestamp, true)
    animationFrame = window.requestAnimationFrame(frame)
  }
  const start = () => {
    if (canAnimate() && !animationFrame) animationFrame = window.requestAnimationFrame(frame)
  }
  const stop = () => {
    if (animationFrame) window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
  }
  const resize = () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      configureCanvas()
      if (shouldReduceMotion()) draw(0, false)
      else {
        stop()
        start()
      }
    }, CONFIG.resizeDebounce)
  }
  const handlePointerMove = (event) => {
    if (shouldReduceMotion()) return
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointer.active = true
  }
  const handlePointerDown = (event) => {
    if (shouldReduceMotion() || event.button > 0) return
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointer.active = true
    draggedParticle = dustParticles.findIndex((particle) => Math.hypot(particle.x - pointer.x, particle.y - pointer.y) <= CONFIG.dustDragRadius)
    if (draggedParticle >= 0) {
      document.documentElement.classList.add('gold-dust-dragging')
      window.getSelection()?.removeAllRanges()
    }
  }
  const releasePointer = () => {
    pointer.active = false
    draggedParticle = -1
    document.documentElement.classList.remove('gold-dust-dragging')
  }
  const handlePointerLeave = () => {
    if (draggedParticle < 0) pointer.active = false
  }
  const handleTouchMove = (event) => {
    if (shouldReduceMotion() || !event.touches.length) return
    pointer.x = event.touches[0].clientX
    pointer.y = event.touches[0].clientY
    pointer.active = true
  }
  const handleTouchEnd = releasePointer
  const handleVisibilityChange = () => {
    isPageActive = document.visibilityState === 'visible'
    if (isPageActive) start()
    else stop()
  }
  const handleMotionPreferenceChange = (event) => {
    if (event.matches) {
      stop()
      draw(0, false)
    } else {
      lastFrameTime = 0
      start()
    }
  }

  configureCanvas()
  if (shouldReduceMotion()) draw(0, false)
  else start()

  window.addEventListener('resize', resize, { passive: true })
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('pointerdown', handlePointerDown, { passive: true })
  window.addEventListener('pointerup', releasePointer, { passive: true })
  window.addEventListener('pointercancel', releasePointer, { passive: true })
  window.addEventListener('pointerleave', handlePointerLeave, { passive: true })
  window.addEventListener('touchmove', handleTouchMove, { passive: true })
  window.addEventListener('touchend', handleTouchEnd, { passive: true })
  document.addEventListener('visibilitychange', handleVisibilityChange)
  motionPreference.addEventListener('change', handleMotionPreferenceChange)

  const intersectionObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting
    if (isVisible) start()
    else stop()
  })
  intersectionObserver.observe(canvas)

  return () => {
    disposed = true
    stop()
    document.documentElement.classList.remove('gold-dust-dragging')
    window.clearTimeout(resizeTimer)
    window.removeEventListener('resize', resize)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerdown', handlePointerDown)
    window.removeEventListener('pointerup', releasePointer)
    window.removeEventListener('pointercancel', releasePointer)
    window.removeEventListener('pointerleave', handlePointerLeave)
    window.removeEventListener('touchmove', handleTouchMove)
    window.removeEventListener('touchend', handleTouchEnd)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    motionPreference.removeEventListener('change', handleMotionPreferenceChange)
    intersectionObserver.disconnect()
  }
}

export default function GoldThreadCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    return createCanvasRenderer(canvas) ?? undefined
  }, [])

  return createPortal(
    <canvas className="gold-thread-canvas" ref={canvasRef} aria-hidden="true" />,
    document.body,
  )
}
