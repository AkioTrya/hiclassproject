import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Command,
  Download,
  Filter,
  LockKeyhole,
  Library,
  ListTodo,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import './App.css'
import GoldThreadCanvas from './GoldThreadCanvas.jsx'
import { ClassCountdown, FeatureCard, HeroHeadline } from './LandingMotion.jsx'
import { useServerClock } from './useServerClock.js'
import {
  DAYS,
  SCHEDULE_DAYS,
  formatDate,
  getInitialSelectedDay,
  getJakartaDateParts,
  getNextClass,
  getWeekDate,
  initialSchedules,
  isValidSchedule,
  escapeCalendarText,
} from './scheduleUtils.js'
import AcademicCalendarPage from './AcademicCalendarPage.jsx'

function Brand({ onClick, onEasterEggClick }) {
  return (
    <button className="brand" onClick={() => { onClick(); onEasterEggClick?.() }} aria-label="K7A — beranda">
      <span className="brand-mark"><img src="/k7a-logo.png" alt="" /></span>
      <span className="brand-name">K7A<span>.</span></span>
    </button>
  )
}

function Header({ page, onHome, onSchedule, onAcademic, onTasks, onBooks, onEasterEggClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigateHome = () => {
    setMobileMenuOpen(false)
    onHome()
  }
  const navigateSchedule = () => {
    setMobileMenuOpen(false)
    onSchedule()
  }
  const navigateWorkspace = (navigate) => {
    setMobileMenuOpen(false)
    navigate()
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Brand onClick={navigateHome} onEasterEggClick={onEasterEggClick} />
        <nav className={mobileMenuOpen ? 'main-nav mobile-open' : 'main-nav'} id="primary-navigation" aria-label="Navigasi utama">
          <button className={page === 'home' ? 'nav-link active' : 'nav-link'} onClick={navigateHome}>Beranda</button>
          <button className={page === 'schedule' ? 'nav-link active' : 'nav-link'} onClick={navigateSchedule}>Jadwal</button>
          <button className={page === 'academic' ? 'nav-link active' : 'nav-link'} onClick={() => { setMobileMenuOpen(false); onAcademic() }}>Kalender akademik</button>
          <button className={page === 'tasks' ? 'nav-link active' : 'nav-link'} onClick={() => navigateWorkspace(onTasks)}>Tugas</button>
          <button className={page === 'books' ? 'nav-link active' : 'nav-link'} onClick={() => navigateWorkspace(onBooks)}>Rak Ebook</button>
          <a className="nav-link" href="#tentang" onClick={navigateHome}>Tentang</a>
        </nav>
        <div className="topbar-actions">
          <button className="icon-button notification-button" aria-label="Pengumuman">
            <Bell size={18} /><i />
          </button>
          <button className="avatar" aria-label="Kelas A">A</button>
        </div>
        <button className="mobile-menu icon-button" aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={mobileMenuOpen} aria-controls="primary-navigation" onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}><Menu size={20} /></button>
      </div>
    </header>
  )
}

function LandingPage({ onSchedule, now, schedules, onEasterEggClick }) {
  const reducedMotion = useReducedMotion()
  const parts = getJakartaDateParts(now)
  const nextClass = getNextClass(schedules, parts)
  const nextClassDate = nextClass ? new Date(nextClass.startsAt) : null
  const relativeDay = !nextClass ? '' : nextClass.dayOffset === 0 ? 'HARI INI' : nextClass.dayOffset === 1 ? 'BESOK' : `DALAM ${nextClass.dayOffset} HARI`
  const currentTime = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
  const currentClass = schedules.find((item) => item.day === parts.weekday && item.start <= currentTime && currentTime < item.end)
  const minuteOfDay = parts.hour * 60 + parts.minute
  const todayClasses = schedules.filter((item) => item.day === parts.weekday)
  const totalClassMinutes = todayClasses.reduce((total, item) => {
    const [startHour, startMinute] = item.start.split(':').map(Number)
    const [endHour, endMinute] = item.end.split(':').map(Number)
    return total + endHour * 60 + endMinute - startHour * 60 - startMinute
  }, 0)
  const completedClassMinutes = todayClasses.reduce((total, item) => {
    const [startHour, startMinute] = item.start.split(':').map(Number)
    const [endHour, endMinute] = item.end.split(':').map(Number)
    const start = startHour * 60 + startMinute
    const end = endHour * 60 + endMinute
    return total + Math.max(0, Math.min(end - start, minuteOfDay - start))
  }, 0)
  const classProgress = totalClassMinutes > 0 ? Math.min(1, completedClassMinutes / totalClassMinutes) : 0
  const jakartaNow = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  const minutesUntilNextClass = nextClass ? Math.max(1, Math.ceil((nextClass.startsAt - jakartaNow) / 60_000)) : 0
  const radarStatus = currentClass
    ? 'Berlangsung'
    : nextClass?.dayOffset === 0
      ? `Mulai ${minutesUntilNextClass} mnt lagi`
      : nextClass ? `Berikutnya ${relativeDay.toLowerCase()}` : 'Belum ada jadwal'
  const previewDay = currentClass?.day ?? nextClass?.item.day
  const dayClasses = schedules.filter((item) => item.day === previewDay).sort((a, b) => a.start.localeCompare(b.start))
  const currentClassIndex = currentClass ? dayClasses.findIndex((item) => item.id === currentClass.id) : -1
  const previewClasses = currentClassIndex >= 0
    ? dayClasses.slice(Math.max(0, currentClassIndex - 1), currentClassIndex + 2)
    : dayClasses.filter((item) => !nextClass || item.start >= nextClass.item.start).slice(0, 3)
  return (
    <main className="landing">
      <GoldThreadCanvas />
      <section className="hero-section">
        <motion.div className="hero-ambience" aria-hidden="true" animate={reducedMotion ? {} : { scale: [1, 1.04, 1], opacity: [0.35, 0.58, 0.35] }} transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> RUANG KELAS, LEBIH TERATUR</div>
          <HeroHeadline />
          <div className="hero-buttons">
            <motion.button className="button button-gold" onClick={onSchedule} whileTap={reducedMotion ? undefined : { scale: 0.98 }} transition={{ duration: 0.18, ease: 'easeOut' }}>Lihat jadwal <ArrowRight size={17} /></motion.button>
            <button className="button button-quiet" onClick={onSchedule}>Jadwal minggu ini <ArrowDownRight size={16} /></button>
          </div>
          <div className="class-meta">
            <span className="class-meta-mark"><CalendarDays size={16} /></span>
            <span>Agenda kuliah <strong>Kelas A</strong></span>
          </div>
        </div>
        <div className="hero-preview">
          <div className="preview-glow" />
          <div className="preview-heading">
            <div><span className="preview-label">KULIAH BERIKUTNYA</span><span className="preview-date">{nextClassDate ? formatDate(nextClassDate, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Belum ada jadwal'}</span></div>
            {nextClass && <span className="live-pill"><span /> {relativeDay}</span>}
          </div>
          {nextClass ? <div className="next-class">
            <div className="next-class-info">
              <span className="course-code">{nextClass.item.code} <span>·</span> {nextClass.item.credits} SKS</span>
              <h2>{nextClass.item.name}</h2>
              <div className="class-detail"><span><Clock3 size={15} /> {nextClass.item.start}–{nextClass.item.end}</span><span><MapPin size={15} /> {nextClass.item.room}</span></div>
              <ClassCountdown targetTime={nextClass.startsAt} now={now} />
            </div>
            <div className="course-art"><BookOpen size={22} strokeWidth={1.4} /></div>
          </div> : <div className="next-class"><p>Jadwal kelas belum tersedia.</p></div>}
          <div className="preview-footer"><span><Sparkles size={14} /> Jadwal kelasmu, selalu terbaru</span><button onClick={onSchedule}>Buka jadwal <ArrowRight size={14} /></button></div>
        </div>
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <a className="scroll-cue" href="#tentang"><span>JELAJAHI</span><span className="scroll-cue-indicator"><i /><ArrowDownRight size={16} /></span></a>
      </section>
      <section className="landing-features" id="tentang">
        <div className="features-intro"><span className="eyebrow">DIBUAT UNTUK HARI-HARIMU</span><h2>Lebih sedikit mencari.<br /><em>Lebih banyak menjalani.</em></h2><p>Fokus pada waktumu, bukan pada mencari informasi kelas.</p></div>
        <div className="feature-cards">
          <FeatureCard label="01" index={0} variant="primary">
            <span className="feature-icon live-radar-icon"><Clock3 size={20} /><i /><i /></span>
            <div className="live-radar-copy">
              <div className="live-radar-title"><h3>Live Class Radar</h3><span className="feature-live-badge">WAKTU NYATA</span></div>
              <p>Lihat kelas berikutnya, waktu mulai, dan perubahan ruang dalam satu pandangan.</p>
              <div className="live-radar-status-row"><span className="live-radar-pulse" aria-hidden="true"><i /><i /><i /></span><span className="live-radar-status">{radarStatus}</span></div>
              <div className="live-radar-progress" role="progressbar" aria-label="Progres kuliah hari ini" aria-valuenow={Math.round(classProgress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ transform: `scaleX(${classProgress})` }} /></div>
            </div>
          </FeatureCard>
          <FeatureCard label="02" index={1}><span className="feature-icon"><CalendarDays size={18} /></span><div><h3>Jadwal satu pintu</h3><p>Agenda kelas tersusun rapi dan mudah dibuka kapan saja.</p></div></FeatureCard>
          <FeatureCard label="03" index={2}><span className="feature-icon"><ShieldCheck size={18} /></span><div><h3>Info kelas terpusat</h3><p>Detail ruang dan mata kuliah mudah ditemukan saat dibutuhkan.</p></div></FeatureCard>
        </div>
      </section>
      <section className="schedule-preview-section" aria-labelledby="schedule-preview-title">
        <div className="schedule-preview-heading">
          <span className="eyebrow">SATU HARI, TERLIHAT JELAS</span>
          <h2 id="schedule-preview-title">Ritme kelasmu,<br /><em>selangkah di depan.</em></h2>
          <p>Perubahan jadwal tercatat, supaya kamu selalu tahu langkah berikutnya.</p>
        </div>
        <div className="schedule-preview-card">
          <div className="timeline-card-heading"><span>JADWAL HARIAN</span><span>{nextClassDate ? formatDate(nextClassDate, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Pekan ini'}</span></div>
          <div className="schedule-timeline">
            {previewClasses.map((item) => (
              <div className={item.id === currentClass?.id ? 'timeline-entry timeline-entry-active' : item.id === nextClass?.item.id ? 'timeline-entry timeline-entry-featured' : 'timeline-entry'} key={item.id}>
                <span className="timeline-time">{item.start}</span>
                <span className="timeline-rail"><i /></span>
                <div className="timeline-class"><strong>{item.name}</strong><span>{item.room}</span></div>
                {item.id === currentClass?.id && <span className="timeline-now">SEDANG BERLANGSUNG</span>}
                {item.id === nextClass?.item.id && !currentClass && <span className="timeline-now">BERIKUTNYA</span>}
              </div>
            ))}
            {previewClasses.length === 0 && <p className="timeline-empty">Jadwal berikutnya akan tampil di sini.</p>}
          </div>
          <div className="change-feed"><span className="change-feed-mark"><ArrowRight size={15} /></span><div><span>PEMBARUAN RUANG</span><p>Ruang <del>B-201</del> menjadi <strong>A-105</strong></p></div><time>BARU</time></div>
        </div>
      </section>
      <section className="closing-cta">
        <div className="closing-cta-glow" aria-hidden="true" />
        <span className="eyebrow">WAKTUMU DIMULAI DARI SINI</span>
        <h2>Satu pandangan.<br /><em>Siap menjalani harimu.</em></h2>
        <button className="button button-gold closing-cta-button" onClick={onSchedule}>Lihat Jadwal <ArrowRight size={19} /></button>
      </section>
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <Brand onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} onEasterEggClick={onEasterEggClick} />
          <div className="landing-footer-meta">
            <span>© {parts.year} K7A</span>
            <span className="developer-sign">Dikembangkan oleh <strong>K7YZ</strong></span>
          </div>
        </div>
      </footer>
    </main>
  )
}

function ScheduleCard({ item, onRemove, onEdit, onView, adminMode }) {
  return (
    <article className={`schedule-card ${item.color}`}>
      <span className="card-accent" />
      <div className="schedule-card-time"><span>{item.start}</span><span>{item.end}</span></div>
      <div className="schedule-card-content">
        <div className="card-meta"><span className="course-code">{item.code}</span><i /> <span>{item.group === 'A' ? 'Kelompok A' : item.group}</span></div>
        <h3>{item.name}</h3>
        <p>{item.lecturer}</p>
        <div className="card-location"><MapPin size={14} /> {item.room}</div>
      </div>
      <button className="card-type" type="button" onClick={() => onView(item)} aria-label={`Lihat detail ${item.name}`} title="Lihat detail mata kuliah"><BookOpen size={17} /></button>
      {adminMode && <div className="card-admin-actions"><button className="edit-class" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}><Pencil size={14} /></button><button className="remove-class" onClick={() => onRemove(item.id)} aria-label={`Hapus ${item.name}`}><X size={15} /></button></div>}
    </article>
  )
}

function CourseDetailsDialog({ schedule, onClose }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section
        className="schedule-modal course-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-details-title"
        onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}
      >
        <div className="modal-heading">
          <div><span className="eyebrow">DETAIL MATA KULIAH</span><h2 id="course-details-title">{schedule.name}</h2></div>
          <button ref={closeButtonRef} type="button" className="icon-button" onClick={onClose} aria-label="Tutup detail"><X size={19} /></button>
        </div>
        <p className="course-details-code">{schedule.code} <span>·</span> {schedule.credits} SKS</p>
        <dl className="course-details-list">
          <div><dt>Hari</dt><dd>{schedule.day}</dd></div>
          <div><dt>Waktu</dt><dd>{schedule.start}–{schedule.end} WIB</dd></div>
          <div><dt>Dosen</dt><dd>{schedule.lecturer}</dd></div>
          <div><dt>Ruang</dt><dd>{schedule.room}</dd></div>
          <div><dt>Kelompok</dt><dd>{schedule.group === 'A' || schedule.group === 'B' ? `Kelompok ${schedule.group}` : schedule.group}</dd></div>
        </dl>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Tutup</button></div>
      </section>
    </div>
  )
}

function AddScheduleModal({ onClose, onSave, schedules, schedule }) {
  const [form, setForm] = useState(() => schedule
    ? { ...schedule }
    : { name: '', code: '', lecturer: '', day: 'Senin', start: '08:00', end: '09:40', room: '', group: 'A', credits: 1 })
  const [conflicts, setConflicts] = useState([])
  const [confirmConflict, setConfirmConflict] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [saving, setSaving] = useState(false)
  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setConflicts([])
    setConfirmConflict(false)
    setValidationError('')
  }
  const submit = async (event) => {
    event.preventDefault()
    if (saving) return
    const name = form.name.trim()
    const code = form.code.trim().toUpperCase()
    const lecturer = form.lecturer.trim()
    const room = form.room.trim()
    const credits = Number(form.credits)
    if (!/^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .,'&()/-]{1,99}$/u.test(name)) {
      setValidationError('Nama mata kuliah hanya boleh berisi huruf, angka, spasi, dan tanda baca umum (maksimal 100 karakter).')
      return
    }
    if (!/^[A-Z]{2,4}\d{3,6}$/u.test(code)) {
      setValidationError('Format kode mata kuliah belum sesuai (contoh: INF625101).')
      return
    }
    if (!/^[\p{L}\p{M} .,';-]{2,200}$/u.test(lecturer)) {
      setValidationError('Periksa nama dosen (maksimal 200 karakter).')
      return
    }
    if (!/^[\p{L}\p{M}\p{N} .#/-]{1,60}$/u.test(room)) {
      setValidationError('Periksa nama ruang (maksimal 60 karakter).')
      return
    }
    if (!SCHEDULE_DAYS.includes(form.day) || !['A', 'B', 'Semua'].includes(form.group) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(form.start) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(form.end) || form.end <= form.start || !Number.isInteger(credits) || credits < 1 || credits > 6) {
      setValidationError('Hari atau rentang waktu tidak valid. Waktu selesai harus setelah waktu mulai.')
      return
    }
    const normalizedForm = { ...form, name, code, lecturer, room, credits }
    if (!confirmConflict) {
      const colliding = schedules.filter((item) => {
        const overlaps = normalizedForm.start < item.end && normalizedForm.end > item.start
        const sharedResource = item.room.toLowerCase() === normalizedForm.room.toLowerCase()
          || item.lecturer.toLowerCase() === normalizedForm.lecturer.toLowerCase()
          || (item.group === normalizedForm.group && item.group !== 'Semua')
          || item.group === 'Semua'
          || normalizedForm.group === 'Semua'
        return item.id !== schedule?.id && item.day === normalizedForm.day && overlaps && sharedResource
      })
      if (colliding.length) {
        setConflicts(colliding)
        setConfirmConflict(true)
        return
      }
    }
    setSaving(true)
    const result = await onSave({
      ...normalizedForm,
      id: schedule?.id ?? Date.now(),
      credits,
      color: schedule?.color ?? ['violet', 'blue', 'mint', 'peach', 'yellow'][Math.floor(Math.random() * 5)],
    }, confirmConflict)
    setSaving(false)
    if (!result.ok) {
      setValidationError(result.error)
      if (result.conflicts?.length) {
        setConflicts(result.conflicts)
        setConfirmConflict(true)
      }
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form className="schedule-modal" onSubmit={submit}>
        <div className="modal-heading"><div><span className="eyebrow">PANEL ADMIN</span><h2>{schedule ? 'Edit mata kuliah' : 'Tambah mata kuliah'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><X size={19} /></button></div>
        {validationError && <p className="validation-error" role="alert">{validationError}</p>}
        <label>Nama mata kuliah<input required maxLength={100} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Contoh: Struktur Data" /></label>
        <div className="form-grid"><label>Kode MK<input required maxLength={10} pattern="[A-Za-z]{2,4}[0-9]{3,6}" value={form.code} onChange={(e) => update('code', e.target.value.toUpperCase())} placeholder="INF625101" /></label><label>Hari<select value={form.day} onChange={(e) => update('day', e.target.value)}>{SCHEDULE_DAYS.map((day) => <option key={day}>{day}</option>)}</select></label></div>
        <label>Nama dosen<input required maxLength={200} value={form.lecturer} onChange={(e) => update('lecturer', e.target.value)} placeholder="Nama dan gelar" /></label>
        <div className="form-grid"><label>Mulai<input required type="time" value={form.start} onChange={(e) => update('start', e.target.value)} /></label><label>Selesai<input required type="time" min={form.start} value={form.end} onChange={(e) => update('end', e.target.value)} /></label></div>
        <div className="form-grid"><label>Ruang<input required maxLength={60} value={form.room} onChange={(e) => update('room', e.target.value)} placeholder="Ruang 302" /></label><label>Kelompok<select value={form.group} onChange={(e) => update('group', e.target.value)}><option>A</option><option>B</option><option>Semua</option></select></label></div>
        <label>SKS<input required type="number" min="1" max="6" step="1" value={form.credits} onChange={(e) => update('credits', e.target.value)} /></label>
        {conflicts.length > 0 && <div className="conflict-warning" role="alert"><ShieldCheck size={17} /><div><strong>Periksa potensi bentrok</strong><span>{conflicts.map((item) => `${item.start} ${item.name} (${item.room})`).join(' · ')}</span><small>Jadwal berbagi ruang, dosen, atau kelompok pada waktu yang sama.</small></div></div>}
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose} disabled={saving}>Batal</button><button type="submit" className="button button-gold" disabled={saving}>{schedule ? <Check size={16} /> : <Plus size={16} />} {saving ? 'Menyimpan…' : confirmConflict ? 'Simpan tetap' : schedule ? 'Simpan perubahan' : 'Simpan jadwal'}</button></div>
      </form>
    </div>
  )
}

function AdminLoginModal({ onClose, onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Gagal masuk sebagai admin.')
      onSuccess()
    } catch (requestError) {
      console.error('Admin sign-in failed.', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Gagal masuk sebagai admin.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <form className="schedule-modal admin-login-modal" onSubmit={submit}>
        <div className="modal-heading"><div><span className="eyebrow">AKSES TERLINDUNGI</span><h2>Masuk admin</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><X size={19} /></button></div>
        <p className="admin-login-copy">Gunakan kredensial admin yang disiapkan pada environment server.</p>
        {error && <p className="validation-error" role="alert">{error}</p>}
        <label>Nama pengguna<input autoComplete="username" required maxLength={100} value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label>Kata sandi<input type="password" autoComplete="current-password" required maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose} disabled={submitting}>Batal</button><button type="submit" className="button button-gold" disabled={submitting}><LockKeyhole size={15} />{submitting ? 'Memeriksa…' : 'Masuk aman'}</button></div>
      </form>
    </div>
  )
}

function SchedulePage({ schedules, setSchedules, adminMode, onAdminAction, now, clockStatus, scheduleMessage, onScheduleError }) {
  const [selectedDay, setSelectedDay] = useState(() => getInitialSelectedDay(getJakartaDateParts(now)))
  const [weekOffset, setWeekOffset] = useState(0)
  const [view, setView] = useState('Harian')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [viewingSchedule, setViewingSchedule] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [groupFilter, setGroupFilter] = useState('Semua kelompok')
  const dateParts = getJakartaDateParts(now)
  const weekStart = getWeekDate(dateParts, 'Senin', weekOffset)
  const weekEnd = getWeekDate(dateParts, 'Sabtu', weekOffset)
  const currentWeekday = dateParts.weekday
  const defaultSelectedDay = SCHEDULE_DAYS.includes(currentWeekday) ? currentWeekday : 'Senin'
  const todayDate = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day))
  const currentDate = formatDate(todayDate, { day: '2-digit' })
  const weekLabel = `${formatDate(weekStart, { day: '2-digit', month: 'short' })} — ${formatDate(weekEnd, { day: '2-digit', month: 'short', year: 'numeric' })}`
  const initialDay = useRef(getInitialSelectedDay(dateParts))

  useEffect(() => {
    const today = defaultSelectedDay
    if (selectedDay === initialDay.current) setSelectedDay(today)
    initialDay.current = today
  }, [defaultSelectedDay, selectedDay])

  const visibleSchedules = useMemo(() => schedules
    .filter((item) => view === 'Mingguan' || item.day === selectedDay)
    .filter((item) => groupFilter === 'Semua kelompok' || item.group === groupFilter || item.group === 'Semua')
    .filter((item) => `${item.name} ${item.code} ${item.lecturer} ${item.room}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start.localeCompare(b.start)), [schedules, view, selectedDay, groupFilter, search])

  const saveSchedule = async (schedule, allowConflicts) => {
    try {
      const isEditing = schedules.some((item) => item.id === schedule.id)
      const response = await fetch('/api/schedules', {
        method: isEditing ? 'PUT' : 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...schedule, allowConflicts }),
      })
      const result = await response.json()
      if (!response.ok) return { ok: false, error: result.error || 'Jadwal tidak dapat disimpan.', conflicts: result.conflicts }
      setSchedules((current) => current.some((item) => item.id === result.id)
        ? current.map((item) => item.id === result.id ? result : item)
        : [...current, result])
      onScheduleError('')
      setSelectedDay(result.day)
      setView('Harian')
      setShowModal(false)
      return { ok: true }
    } catch (error) {
      console.error('Could not save the schedule through the server.', error)
      return { ok: false, error: 'Server tidak dapat menyimpan jadwal. Periksa koneksi lalu coba lagi.' }
    }
  }

  const removeSchedule = async (id) => {
    try {
      const response = await fetch(`/api/schedules?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Mata kuliah tidak dapat dihapus.')
      setSchedules((current) => current.filter((item) => item.id !== id))
      onScheduleError('')
    } catch (error) {
      console.error('Could not delete the schedule through the server.', error)
      onScheduleError(error instanceof Error ? error.message : 'Server tidak dapat menghapus mata kuliah.')
    }
  }

  const openAddSchedule = () => {
    setEditingSchedule(null)
    setShowModal(true)
  }

  const openEditSchedule = (schedule) => {
    setEditingSchedule(schedule)
    setShowModal(true)
  }

  const exportCalendar = () => {
    const eventRows = visibleSchedules.map((item) => {
      const date = getWeekDate(dateParts, item.day, weekOffset)
      const stamp = (time) => `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}T${time.replace(':', '')}00`
      return `BEGIN:VEVENT\nUID:${item.id}@ti26-a-jadwal\nDTSTART;TZID=Asia/Jakarta:${stamp(item.start)}\nDTEND;TZID=Asia/Jakarta:${stamp(item.end)}\nSUMMARY:${escapeCalendarText(`${item.name} (${item.code})`)}\nLOCATION:${escapeCalendarText(item.room)}\nDESCRIPTION:${escapeCalendarText(item.lecturer)} — Kelas ${escapeCalendarText(item.group)}\nEND:VEVENT`
    })
    const blob = new Blob([`BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//K7A//ID\nCALSCALE:GREGORIAN\n${eventRows.join('\n')}\nEND:VCALENDAR`], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'jadwal-ti-26-kelas-a.ics'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 0)
  }

  return (
    <main className="schedule-page">
      <div className="schedule-welcome">
        <div><div className="breadcrumb"><span>Jadwal kelas</span><ChevronRight size={13} /><strong>Kelas A</strong></div><h1>Jadwal kuliah<span>.</span></h1><p>Program Studi Teknik Informatika <i /> Kelas A</p></div>
        <div className="welcome-date"><span>{currentWeekday.toLocaleUpperCase('id-ID')}</span><strong>{currentDate}</strong><span>{formatDate(todayDate, { month: 'long', year: 'numeric' }).toLocaleUpperCase('id-ID')}</span></div>
      </div>
      <div className="schedule-toolbar">
        <div className="view-switch" role="tablist" aria-label="Tampilan jadwal">
          {['Harian', 'Mingguan', 'Daftar'].map((item) => <button key={item} role="tab" aria-selected={view === item} className={view === item ? 'selected' : ''} onClick={() => setView(item)}>{item === 'Harian' ? <CalendarDays size={15} /> : item === 'Mingguan' ? <Command size={15} /> : <Menu size={15} />}{item}</button>)}
        </div>
        <div className="toolbar-actions">
          <div className="search-field"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari mata kuliah..." aria-label="Cari mata kuliah" /><kbd>⌘ K</kbd></div>
          <div className="filter-wrap"><button className={groupFilter !== 'Semua kelompok' ? 'outline-button filter-active' : 'outline-button'} onClick={() => setFilterOpen((value) => !value)}><Filter size={15} /> Filter <ChevronDown size={13} /></button>{filterOpen && <div className="filter-menu">{['Semua kelompok', 'A', 'B'].map((group) => <button key={group} onClick={() => { setGroupFilter(group); setFilterOpen(false) }}>{group === 'A' || group === 'B' ? `Kelompok ${group}` : group}{groupFilter === group && <Check size={14} />}</button>)}</div>}</div>
          <button className="outline-button export-button" onClick={exportCalendar}><Download size={15} /> <span>Ekspor .ics</span></button>
          <button className={adminMode ? 'admin-button admin-active' : 'admin-button'} onClick={onAdminAction}>{adminMode ? <LogOut size={15} /> : <LockKeyhole size={15} />} <span>{adminMode ? 'Keluar admin' : 'Masuk admin'}</span></button>
        </div>
      </div>
      {scheduleMessage && <div className="storage-warning" role="alert"><ShieldCheck size={15} />{scheduleMessage}</div>}
      {adminMode && <div className="admin-banner"><ShieldCheck size={16} /><span>Sesi admin aktif. Perubahan disimpan ke server dan dicatat.</span><button onClick={openAddSchedule}><Plus size={15} /> Tambah jadwal</button></div>}
      <div className="week-navigation" aria-label="Navigasi pekan">
        <button className="day-arrow" onClick={() => setWeekOffset((offset) => offset - 1)} aria-label="Pekan sebelumnya"><ChevronLeft size={17} /></button>
        <span className="week-navigation-label">{weekLabel.toLocaleUpperCase('id-ID')}</span>
        <button className="day-arrow" onClick={() => setWeekOffset((offset) => offset + 1)} aria-label="Pekan berikutnya"><ChevronRight size={17} /></button>
        {weekOffset !== 0 && <button className="week-current-button" onClick={() => setWeekOffset(0)}>Pekan ini</button>}
      </div>
      {view !== 'Mingguan' && <div className="day-selector"><button className="day-arrow" onClick={() => setSelectedDay(SCHEDULE_DAYS[Math.max(0, SCHEDULE_DAYS.indexOf(selectedDay) - 1)])} aria-label="Hari sebelumnya"><ChevronLeft size={17} /></button>{SCHEDULE_DAYS.map((day) => { const date = getWeekDate(dateParts, day, weekOffset); const isToday = weekOffset === 0 && currentWeekday === day; return <button className={selectedDay === day ? 'day-tab current-day' : 'day-tab'} key={day} onClick={() => setSelectedDay(day)} aria-current={isToday ? 'date' : undefined}><span>{day.slice(0, 3)}</span><strong>{formatDate(date, { day: '2-digit' })}</strong>{isToday && <i />}</button> })}<button className="day-arrow" onClick={() => setSelectedDay(SCHEDULE_DAYS[Math.min(SCHEDULE_DAYS.length - 1, SCHEDULE_DAYS.indexOf(selectedDay) + 1)])} aria-label="Hari berikutnya"><ChevronRight size={17} /></button></div>}
      <div className="schedule-content">
        <div className="day-heading"><div><span className="eyebrow">{view === 'Mingguan' ? `AGENDA PEKAN ${weekOffset === 0 ? 'INI' : weekOffset > 0 ? 'MENDATANG' : 'SEBELUMNYA'}` : weekOffset === 0 && selectedDay === currentWeekday ? 'AGENDA HARI INI' : 'AGENDA HARI PILIHAN'}</span><h2>{view === 'Mingguan' ? `Minggu ${weekLabel}` : selectedDay}<span>.</span></h2></div><span className="class-count"><span /> {visibleSchedules.length} kelas terjadwal</span></div>
        {visibleSchedules.length > 0 ? <div className={view === 'Mingguan' || view === 'Daftar' ? 'schedule-list week-list' : 'schedule-list'}>
          {visibleSchedules.map((item) => <div className="schedule-entry" key={item.id}>{(view === 'Mingguan' || view === 'Daftar') && <div className="entry-day">{item.day}<span>{item.start}</span></div>}<ScheduleCard item={item} adminMode={adminMode} onRemove={removeSchedule} onEdit={openEditSchedule} onView={setViewingSchedule} /></div>)}
        </div> : <div className="empty-state"><span className="empty-icon"><CalendarDays size={20} /></span><h3>{search ? 'Mata kuliah tidak ditemukan' : 'Belum ada kelas hari ini'}</h3><p>{search ? 'Coba kata kunci atau nama dosen lain.' : adminMode ? 'Tambahkan jadwal untuk hari ini.' : 'Nikmati waktu kosongmu. Jadwal berikutnya segera menyusul.'}</p>{adminMode && !search && <button className="button button-gold" onClick={openAddSchedule}><Plus size={16} /> Tambah jadwal</button>}</div>}
        <div className="schedule-note"><span className="note-icon"><Sparkles size={15} /></span><div><strong>Informasi jadwal</strong><span>Pastikan jadwal yang digunakan sesuai informasi resmi dari program studi.</span></div><button aria-label="Informasi jadwal"><MoreHorizontal size={19} /></button></div>
      </div>
      <footer className="schedule-footer"><span className="schedule-brand"><img src="/k7a-logo.png" alt="" />K7A<span className="gold-dot">.</span></span><span className="schedule-clock-status" role="status" aria-live="polite">{clockStatus === 'synced' ? 'Waktu server tersinkron · WIB' : clockStatus === 'syncing' ? 'Menyinkronkan waktu server…' : clockStatus === 'stale' ? 'Server terakhir tersinkron · WIB' : 'Waktu perangkat · WIB'}</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Kembali ke atas <ArrowRight size={13} /></button></footer>
      {viewingSchedule && <CourseDetailsDialog schedule={viewingSchedule} onClose={() => setViewingSchedule(null)} />}
      {showModal && <AddScheduleModal onClose={() => setShowModal(false)} onSave={saveSchedule} schedules={schedules} schedule={editingSchedule} />}
    </main>
  )
}

function StudentWorkspacePage({ section, adminMode }) {
  const [student, setStudent] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState([])
  const [books, setBooks] = useState([])
  const [error, setError] = useState('')
  const [login, setLogin] = useState({ username: '', password: '' })
  const [loginBusy, setLoginBusy] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', courseName: '', dueDate: '' })
  const [bookForm, setBookForm] = useState({ title: '', courseName: '', url: '' })
  const [students, setStudents] = useState([])
  const [accountForm, setAccountForm] = useState({ username: '', password: '' })
  const [accountMessage, setAccountMessage] = useState('')
  const [accountBusy, setAccountBusy] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/student/session', { credentials: 'same-origin' })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Sesi mahasiswa tidak dapat diperiksa.')
        if (active) {
          setStudent(result.authenticated ? result.student : null)
          setLoading(result.authenticated)
        }
      })
      .catch((requestError) => {
        console.error('Could not check the student session.', requestError)
        if (active) setError('Layanan akun belum tersedia. Pastikan migrasi Supabase sudah diterapkan.')
      })
      .finally(() => { if (active) setSessionLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!student) return undefined
    let active = true
    Promise.all(['/api/student/tasks', '/api/student/books'].map(async (path) => {
      const response = await fetch(path, { credentials: 'same-origin' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Data workspace tidak dapat dimuat.')
      if (!Array.isArray(result)) throw new Error('Data workspace dari server tidak valid.')
      return result
    }))
      .then(([nextTasks, nextBooks]) => {
        if (active) {
          setTasks(nextTasks)
          setBooks(nextBooks)
          setError('')
        }
      })
      .catch((requestError) => {
        console.error('Could not load student workspace data.', requestError)
        if (active) setError(requestError.message || 'Data belum dapat dimuat.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [student])

  useEffect(() => {
    if (!adminMode) return undefined
    let active = true
    fetch('/api/admin/students', { credentials: 'same-origin' })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Daftar akun mahasiswa tidak dapat dimuat.')
        if (active) setStudents(result)
      })
      .catch((requestError) => {
        console.error('Could not load student accounts.', requestError)
        if (active) setAccountMessage(requestError.message || 'Daftar akun belum dapat dimuat.')
      })
    return () => { active = false }
  }, [adminMode])

  const submitLogin = async (event) => {
    event.preventDefault()
    setLoginBusy(true)
    setError('')
    try {
      const response = await fetch('/api/student/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(login),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Tidak dapat masuk.')
      setLoading(true)
      setStudent(result.student)
      setLogin({ username: '', password: '' })
    } catch (requestError) {
      console.error('Student sign-in failed.', requestError)
      setError(requestError.message || 'Tidak dapat masuk. Periksa koneksi lalu coba lagi.')
    } finally {
      setLoginBusy(false)
    }
  }

  const signOut = async () => {
    try {
      const response = await fetch('/api/student/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Tidak dapat keluar.')
      setStudent(null)
      setTasks([])
      setBooks([])
    } catch (requestError) {
      console.error('Student sign-out failed.', requestError)
      setError(requestError.message || 'Tidak dapat keluar. Coba lagi.')
    }
  }

  const submitTask = async (event) => {
    event.preventDefault()
    try {
      const response = await fetch('/api/student/tasks', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskForm),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Tugas tidak dapat disimpan.')
      setTasks((current) => [...current, result].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')))
      setTaskForm({ title: '', courseName: '', dueDate: '' })
      setError('')
    } catch (requestError) {
      console.error('Could not save student task.', requestError)
      setError(requestError.message || 'Tugas tidak dapat disimpan.')
    }
  }

  const toggleTask = async (task) => {
    try {
      const response = await fetch(`/api/student/tasks?id=${encodeURIComponent(task.id)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Status tugas tidak dapat diubah.')
      setTasks((current) => current.map((item) => item.id === result.id ? result : item))
    } catch (requestError) {
      console.error('Could not update student task.', requestError)
      setError(requestError.message || 'Status tugas tidak dapat diubah.')
    }
  }

  const deleteTask = async (task) => {
    try {
      const response = await fetch(`/api/student/tasks?id=${encodeURIComponent(task.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Tugas tidak dapat dihapus.')
      setTasks((current) => current.filter((item) => item.id !== task.id))
    } catch (requestError) {
      console.error('Could not delete student task.', requestError)
      setError(requestError.message || 'Tugas tidak dapat dihapus.')
    }
  }

  const submitBook = async (event) => {
    event.preventDefault()
    try {
      const response = await fetch('/api/student/books', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookForm),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Ebook tidak dapat disimpan.')
      setBooks((current) => [result, ...current])
      setBookForm({ title: '', courseName: '', url: '' })
      setError('')
    } catch (requestError) {
      console.error('Could not save ebook.', requestError)
      setError(requestError.message || 'Ebook tidak dapat disimpan.')
    }
  }

  const deleteBook = async (book) => {
    try {
      const response = await fetch(`/api/student/books?id=${encodeURIComponent(book.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Ebook tidak dapat dihapus.')
      setBooks((current) => current.filter((item) => item.id !== book.id))
    } catch (requestError) {
      console.error('Could not delete ebook.', requestError)
      setError(requestError.message || 'Ebook tidak dapat dihapus.')
    }
  }

  const createStudentAccount = async (event) => {
    event.preventDefault()
    setAccountBusy(true)
    setAccountMessage('')
    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Akun mahasiswa tidak dapat dibuat.')
      setStudents((current) => [...current, result].sort((a, b) => a.username.localeCompare(b.username)))
      setAccountForm({ username: '', password: '' })
      setAccountMessage(`Akun ${result.username} berhasil dibuat.`)
    } catch (requestError) {
      console.error('Could not create student account.', requestError)
      setAccountMessage(requestError.message || 'Akun mahasiswa tidak dapat dibuat.')
    } finally {
      setAccountBusy(false)
    }
  }

  const pendingTasks = tasks.filter((task) => !task.completed)
  const completedTasks = tasks.filter((task) => task.completed)

  return (
    <main className="workspace-page">
      <header className="workspace-heading">
        <div>
          <span className="academic-eyebrow">{section === 'tasks' ? <ListTodo size={15} /> : <Library size={15} />} RUANG BELAJAR PRIBADI</span>
          <h1>{section === 'tasks' ? 'Daftar tugas.' : 'Rak ebook.'}</h1>
          <p>{section === 'tasks' ? 'Catat tenggat dan tandai tugas yang sudah selesai.' : 'Simpan tautan bacaan kuliah dalam satu rak.'}</p>
        </div>
        {student && <div className="workspace-user"><span>{student.username}</span><button type="button" className="outline-button" onClick={signOut}><LogOut size={14} /> Keluar</button></div>}
      </header>

      {error && <div className="workspace-message" role="alert">{error}</div>}
      {sessionLoading
        ? <p className="workspace-empty">Memeriksa sesi akun…</p>
        : student
          ? loading
            ? <p className="workspace-empty">Memuat data tersimpan…</p>
            : section === 'tasks'
              ? (
                <div className="workspace-content">
                  <form className="workspace-form task-form" onSubmit={submitTask}>
                    <h2><Plus size={18} /> Tambah tugas</h2>
                    <label>Nama tugas<input required maxLength={120} value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} placeholder="Contoh: Ringkasan bab 3" /></label>
                    <div className="workspace-form-row">
                      <label>Mata kuliah<input maxLength={100} value={taskForm.courseName} onChange={(event) => setTaskForm((current) => ({ ...current, courseName: event.target.value }))} placeholder="Opsional" /></label>
                      <label>Tenggat<input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} /></label>
                    </div>
                    <button className="button button-gold" type="submit"><Plus size={15} /> Simpan tugas</button>
                  </form>
                  <section className="workspace-list" aria-label="Daftar tugas">
                    <h2>Belum selesai <span>{pendingTasks.length}</span></h2>
                    {pendingTasks.length
                      ? pendingTasks.map((task) => <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />)
                      : <p className="workspace-empty">Belum ada tugas aktif. Tambahkan tugas baru di atas.</p>}
                    {completedTasks.length > 0 && <>
                      <h2 className="completed-heading">Selesai <span>{completedTasks.length}</span></h2>
                      {completedTasks.map((task) => <TaskItem key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />)}
                    </>}
                  </section>
                </div>
              )
              : (
                <div className="workspace-content">
                  <form className="workspace-form book-form" onSubmit={submitBook}>
                    <h2><Plus size={18} /> Tambah ke rak</h2>
                    <label>Judul ebook / bacaan<input required maxLength={120} value={bookForm.title} onChange={(event) => setBookForm((current) => ({ ...current, title: event.target.value }))} placeholder="Contoh: Pengantar Struktur Data" /></label>
                    <label>Mata kuliah<input maxLength={100} value={bookForm.courseName} onChange={(event) => setBookForm((current) => ({ ...current, courseName: event.target.value }))} placeholder="Opsional" /></label>
                    <label>Tautan bacaan<input type="url" required maxLength={2000} value={bookForm.url} onChange={(event) => setBookForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://..." /></label>
                    <button className="button button-gold" type="submit"><Plus size={15} /> Simpan bacaan</button>
                    <p className="workspace-form-note">Rak menyimpan tautan, bukan file. Pastikan tautan hanya mengarah ke materi yang kamu berhak akses.</p>
                  </form>
                  <section className="workspace-list" aria-label="Rak ebook">
                    <h2>Koleksi bacaan <span>{books.length}</span></h2>
                    {books.length
                      ? <div className="ebook-grid">{books.map((book) => (
                        <article className="ebook-card" key={book.id}>
                          <span className="ebook-cover"><BookOpen size={24} /></span>
                          <h3>{book.title}</h3>
                          {book.courseName && <p>{book.courseName}</p>}
                          <div><a href={book.url} target="_blank" rel="noopener noreferrer">Buka tautan <ArrowRight size={14} /></a><button type="button" onClick={() => deleteBook(book)} aria-label={`Hapus ${book.title}`}><Trash2 size={15} /></button></div>
                        </article>
                      ))}</div>
                      : <p className="workspace-empty">Rak masih kosong. Simpan tautan bacaan pertamamu.</p>}
                  </section>
                </div>
              )
          : (
            <section className="workspace-login-panel">
              <div><LockKeyhole size={21} /><h2>Masuk ke ruang belajarmu</h2><p>Akun mahasiswa dibuat oleh admin. Tugas dan rak bacaan hanya terlihat oleh akunmu.</p></div>
              <form className="workspace-form" onSubmit={submitLogin}>
                <label>Username<input autoComplete="username" required maxLength={32} value={login.username} onChange={(event) => setLogin((current) => ({ ...current, username: event.target.value }))} /></label>
                <label>Password<input type="password" autoComplete="current-password" required maxLength={200} value={login.password} onChange={(event) => setLogin((current) => ({ ...current, password: event.target.value }))} /></label>
                <button className="button button-gold" type="submit" disabled={loginBusy}>{loginBusy ? 'Memeriksa…' : 'Masuk'}</button>
              </form>
            </section>
          )}

      {adminMode && (
        <section className="student-admin-panel">
          <div><span className="eyebrow">KHUSUS ADMIN</span><h2>Akun mahasiswa</h2><p>Buat username dan password sementara, lalu bagikan secara pribadi kepada pemilik akun. Password tidak dapat dilihat kembali.</p></div>
          <form className="workspace-form student-account-form" onSubmit={createStudentAccount}>
            <label>Username<input required minLength={3} maxLength={32} pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{2,31}" value={accountForm.username} onChange={(event) => setAccountForm((current) => ({ ...current, username: event.target.value }))} /></label>
            <label>Password awal<input type="password" required minLength={12} maxLength={200} autoComplete="new-password" value={accountForm.password} onChange={(event) => setAccountForm((current) => ({ ...current, password: event.target.value }))} /></label>
            <button type="submit" className="button button-gold" disabled={accountBusy}><Plus size={15} />{accountBusy ? 'Membuat…' : 'Buat akun'}</button>
            {accountMessage && <p className="workspace-form-note" role="status">{accountMessage}</p>}
          </form>
          <ul className="student-account-list" aria-label="Akun mahasiswa terdaftar">
            {students.map((account) => <li key={account.id}><span>{account.username}</span><small>{new Date(account.createdAt).toLocaleDateString('id-ID')}</small></li>)}
          </ul>
        </section>
      )}
    </main>
  )
}

function TaskItem({ task, onToggle, onDelete }) {
  const dueLabel = task.dueDate
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${task.dueDate}T00:00:00Z`))
    : 'Tanpa tenggat'
  return (
    <article className={task.completed ? 'task-item completed' : 'task-item'}>
      <label className="task-check"><input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} /><span><Check size={13} /></span></label>
      <div className="task-item-info"><h3>{task.title}</h3><p>{task.courseName || 'Umum'} <span>·</span> {dueLabel}</p></div>
      <button type="button" className="task-delete" onClick={() => onDelete(task)} aria-label={`Hapus ${task.title}`}><Trash2 size={16} /></button>
    </article>
  )
}

function AmongUsEasterEgg({ onClose }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop easter-egg-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="easter-egg-modal" role="dialog" aria-modal="true" aria-labelledby="easter-egg-title">
        <div className="easter-egg-heading">
          <div><span className="eyebrow">EASTER EGG TERBUKA</span><h2 id="easter-egg-title">SUS! 🚨</h2></div>
          <button ref={closeButtonRef} type="button" className="icon-button" onClick={onClose} aria-label="Tutup video"><X size={20} /></button>
        </div>
        <div className="easter-egg-video">
          <iframe
            src="https://www.youtube-nocookie.com/embed/VoQ1q41iJS0?autoplay=1&rel=0"
            title="Video Among Us"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </section>
    </div>
  )
}

function App() {
  const [page, setPage] = useState('home')
  const [schedules, setSchedules] = useState(initialSchedules)
  const [scheduleMessage, setScheduleMessage] = useState('Memuat jadwal dari server…')
  const [adminMode, setAdminMode] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [easterEggOpen, setEasterEggOpen] = useState(false)
  const closeEasterEgg = useCallback(() => setEasterEggOpen(false), [])
  const brandClicks = useRef({ count: 0, lastClickAt: 0 })
  const { now, status: clockStatus } = useServerClock()
  const [transitionState, setTransitionState] = useState(null)
  const reducedMotion = useReducedMotion()
  const handleBrandEasterEggClick = () => {
    const now = performance.now()
    const clickSequence = brandClicks.current
    clickSequence.count = now - clickSequence.lastClickAt <= 1800 ? clickSequence.count + 1 : 1
    clickSequence.lastClickAt = now
    if (clickSequence.count === 7) {
      clickSequence.count = 0
      setEasterEggOpen(true)
    }
  }
  const showSchedule = (withTransition = false) => {
    if (withTransition) {
      setTransitionState('in')
      return
    }
    setPage('schedule')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const goHome = () => {
    setPage('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const showAcademicCalendar = () => {
    setPage('academic')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const showTasks = () => {
    setPage('tasks')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const showBooks = () => {
    setPage('books')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const handleAdminAction = async () => {
    if (!adminMode) {
      setLoginOpen(true)
      return
    }
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Sesi admin tidak dapat diakhiri.')
      setAdminMode(false)
    } catch (error) {
      console.error('Admin sign-out failed.', error)
      setScheduleMessage(error instanceof Error ? error.message : 'Sesi admin tidak dapat diakhiri.')
    }
  }

  useEffect(() => {
    let active = true
    fetch('/api/schedules', { credentials: 'same-origin' })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Jadwal dari server tidak dapat dimuat.')
        if (!Array.isArray(result) || !result.every(isValidSchedule)) throw new Error('Data jadwal dari server tidak valid.')
        if (active) {
          setSchedules(result)
          setScheduleMessage('')
        }
      })
      .catch((error) => {
        console.error('Could not load schedules from the server.', error)
        if (active) setScheduleMessage('Server jadwal belum tersambung; data contoh ditampilkan sementara. Pengeditan memerlukan koneksi server.')
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/admin/session', { credentials: 'same-origin' })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Status sesi admin tidak dapat diperiksa.')
        if (active) setAdminMode(result.authenticated === true)
      })
      .catch((error) => {
        console.error('Could not check the admin session.', error)
        if (active) setAdminMode(false)
      })
    return () => { active = false }
  }, [])

  return (
    <div className="app-shell">
      <Header page={page} onHome={goHome} onSchedule={showSchedule} onAcademic={showAcademicCalendar} onTasks={showTasks} onBooks={showBooks} onEasterEggClick={handleBrandEasterEggClick} />
      {page === 'home' && scheduleMessage && <div className="server-notice" role="status"><ShieldCheck size={15} />{scheduleMessage}</div>}
      {page === 'home'
        ? <LandingPage onSchedule={() => showSchedule(true)} now={now} schedules={schedules} onEasterEggClick={handleBrandEasterEggClick} />
        : page === 'academic'
          ? <AcademicCalendarPage />
          : page === 'tasks' || page === 'books'
            ? <StudentWorkspacePage section={page} adminMode={adminMode} />
            : <SchedulePage schedules={schedules} setSchedules={setSchedules} adminMode={adminMode} onAdminAction={handleAdminAction} now={now} clockStatus={clockStatus} scheduleMessage={scheduleMessage} onScheduleError={setScheduleMessage} />}
      {loginOpen && <AdminLoginModal onClose={() => setLoginOpen(false)} onSuccess={() => { setAdminMode(true); setLoginOpen(false) }} />}
      {easterEggOpen && <AmongUsEasterEgg onClose={closeEasterEgg} />}
      <AnimatePresence>
        {transitionState && (
          <motion.div
            className="page-transition"
            aria-hidden="true"
            initial={reducedMotion ? { opacity: 0 } : { scaleY: 0 }}
            animate={reducedMotion
              ? { opacity: transitionState === 'in' ? 1 : 0 }
              : { scaleY: transitionState === 'in' ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.2 : 0.48, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => {
              if (transitionState === 'in') {
                setPage('schedule')
                window.scrollTo({ top: 0, behavior: 'auto' })
                setTransitionState('out')
              } else {
                setTransitionState(null)
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
