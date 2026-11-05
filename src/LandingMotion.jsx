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
