import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { getJakartaDateParts } from './scheduleUtils.js'

const revealEase = [0.22, 1, 0.36, 1]
const featureVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

export function HeroHeadline() {
  const reducedMotion = useReducedMotion()
  const words = ['Waktu', 'terbaik', 'dimulai', 'dari', 'Jadwal']
  const variants = reducedMotion
    ? { hidden: { opacity: 0, y: 0 }, visible: { opacity: 1, y: 0 } }
    : featureVariants
  return (
    <motion.h1
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: reducedMotion ? 0 : 0.06, delayChildren: reducedMotion ? 0 : 0.08 } } }}
    >
      <span className="hero-title-line">
        {words.slice(0, 2).map((word) => <motion.span className="hero-word" variants={variants} transition={{ duration: reducedMotion ? 0.25 : 0.65, ease: revealEase }} key={word}>{word}</motion.span>)}
      </span>
      <br />
      <span className="hero-title-line">
        {words.slice(2).map((word) => <motion.span className={word === 'Jadwal' ? 'hero-word hero-gold-word' : 'hero-word'} variants={variants} transition={{ duration: reducedMotion ? 0.25 : 0.65, ease: revealEase }} key={word}>{word}</motion.span>)}
        <span className="gold-dot">.</span>
      </span>
    </motion.h1>
  )
}

export function FeatureCard({ children, index, label, variant = 'support' }) {
  const reducedMotion = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const rotateY = useTransform(pointerX, [-0.5, 0.5], [-4, 4])
  const rotateX = useTransform(pointerY, [-0.5, 0.5], [4, -4])
  const delay = reducedMotion ? 0 : index * 0.1
  const revealVariants = reducedMotion
    ? { hidden: { opacity: 0, y: 0 }, visible: { opacity: 1, y: 0 } }
    : featureVariants

  const updateTilt = (event) => {
    if (reducedMotion || !window.matchMedia('(min-width: 651px) and (hover: hover) and (pointer: fine)').matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5)
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5)
  }

  const resetTilt = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <motion.div
      className={`feature-item feature-item-${variant}`}
      variants={revealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reducedMotion ? 0.25 : 0.65, delay, ease: revealEase }}
      whileHover={reducedMotion || !window.matchMedia('(min-width: 651px) and (hover: hover) and (pointer: fine)').matches
        ? undefined
        : { y: -2, transition: { duration: 0.5, ease: revealEase } }}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onMouseMove={updateTilt}
      onMouseLeave={resetTilt}
    >
      <span className="feature-thread-glow" aria-hidden="true" />
      <span className="feature-card-label">{label}</span>
      {children}
    </motion.div>
  )
}

function RollingValue({ value, label }) {
  const reducedMotion = useReducedMotion()
  return (
    <span className="countdown-unit">
      <span className="countdown-number" aria-label={`${value} ${label}`}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            className="countdown-digit"
            key={value}
            initial={reducedMotion ? false : { opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -7 }}
            transition={{ duration: reducedMotion ? 0 : 0.38, ease: revealEase }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="countdown-label">{label}</span>
    </span>
  )
}

export function ClassCountdown({ targetTime, now }) {
  const reducedMotion = useReducedMotion()
  const parts = getJakartaDateParts(now)
  const jakartaNow = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  const remaining = Math.max(0, Math.floor((targetTime - jakartaNow) / 1000))
  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60
  const units = [
    { value: String(hours).padStart(2, '0'), label: 'jam' },
    { value: String(minutes).padStart(2, '0'), label: 'mnt' },
    { value: String(seconds).padStart(2, '0'), label: 'dtk' },
  ]

  return (
    <div className={reducedMotion ? 'class-countdown motion-reduced' : 'class-countdown'} aria-label="Hitung mundur ke kuliah berikutnya">
      <span className="countdown-caption">MULAI DALAM</span>
      <div className="countdown-units">
        {units.map((unit, index) => <span className="countdown-group" key={unit.label}><RollingValue value={unit.value} label={unit.label} />{index < units.length - 1 && <span className="countdown-separator">:</span>}</span>)}
      </div>
    </div>
  )
}

const particlePositions = [
  { x: '11%', y: '22%', delay: 0 },
  { x: '26%', y: '71%', delay: 2 },
  { x: '43%', y: '15%', delay: 5 },
  { x: '58%', y: '83%', delay: 1 },
  { x: '73%', y: '28%', delay: 4 },
  { x: '89%', y: '64%', delay: 3 },
  { x: '34%', y: '48%', delay: 6 },
  { x: '66%', y: '54%', delay: 2.5 },
  { x: '93%', y: '14%', delay: 7 },
]

export function GoldDust() {
  const reducedMotion = useReducedMotion()
  if (reducedMotion) return null

  return (
    <div className="gold-dust" aria-hidden="true">
      {particlePositions.map((particle, index) => (
        <motion.i
          className="gold-dust-particle"
          key={particle.x}
          style={{ left: particle.x, top: particle.y }}
          animate={{ x: [0, index % 2 ? 8 : -7, 0], y: [0, -12, 0], opacity: [0.12, 0.38, 0.12] }}
          transition={{ duration: 16 + index * 1.5, delay: particle.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}
