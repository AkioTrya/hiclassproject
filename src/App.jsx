import { useEffect, useMemo, useRef, useState } from 'react'
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
  MapPin,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import './App.css'
import {
  DAYS,
  SCHEDULE_DAYS,
  STORAGE_KEY,
  formatDate,
  getInitialSelectedDay,
  getJakartaDateParts,
  getNextClass,
  getNextDateForDay,
  getWeekDate,
  initialSchedules,
  isValidSchedule,
  escapeCalendarText,
} from './scheduleUtils.js'

function readSchedules() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return { schedules: initialSchedules, error: '' }
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || !parsed.every(isValidSchedule)) {
      console.error('Stored schedule data is invalid; using the included class schedule.')
      return { schedules: initialSchedules, error: 'Data jadwal lokal tidak valid. Jadwal contoh ditampilkan.' }
    }
    return { schedules: parsed, error: '' }
  } catch (error) {
    console.error('Could not read the saved class schedule.', error)
    return { schedules: initialSchedules, error: 'Jadwal lokal tidak dapat dibaca. Jadwal contoh ditampilkan.' }
  }
}

function Brand({ onClick }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Wangsa Jadwal — beranda">
      <span className="brand-mark"><Command size={19} strokeWidth={2.1} /></span>
      <span className="brand-name">wangsa<span>.</span></span>
    </button>
  )
}

function Header({ page, onHome, onSchedule, onAdmin }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Brand onClick={onHome} />
        <nav className="main-nav" aria-label="Navigasi utama">
          <button className={page === 'home' ? 'nav-link active' : 'nav-link'} onClick={onHome}>Beranda</button>
          <button className={page === 'schedule' ? 'nav-link active' : 'nav-link'} onClick={onSchedule}>Jadwal</button>
          <a className="nav-link" href="#tentang" onClick={onHome}>Tentang</a>
        </nav>
        <div className="topbar-actions">
          <button className="icon-button notification-button" aria-label="Pengumuman">
            <Bell size={18} /><i />
          </button>
          <button className="avatar" aria-label="Kelas A">A</button>
          {import.meta.env.DEV && <button className="user-name" onClick={onAdmin}>Demo admin <ChevronDown size={14} /></button>}
        </div>
        <button className="mobile-menu icon-button" aria-label="Buka menu"><Menu size={20} /></button>
      </div>
    </header>
  )
}

function GoldThread({ landingRef }) {
  const pathRef = useRef(null)
  const pathLengthRef = useRef(0)
  const frameRef = useRef(0)

  useEffect(() => {
    const root = landingRef.current
    const path = pathRef.current
    if (!root || !path) return undefined

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let revealObserver

    const updateProgress = () => {
      frameRef.current = 0
      if (motionPreference.matches) {
        path.style.strokeDashoffset = '0'
        return
      }
      const bounds = root.getBoundingClientRect()
      const visibleProgress = Math.min(1, Math.max(0, (window.innerHeight - bounds.top) / bounds.height))
      path.style.strokeDashoffset = String(pathLengthRef.current * (1 - visibleProgress))
    }

    const scheduleProgressUpdate = () => {
      if (!frameRef.current) frameRef.current = window.requestAnimationFrame(updateProgress)
    }

    const measurePath = () => {
      const bounds = root.getBoundingClientRect()
      const hero = root.querySelector('.hero-section')?.getBoundingClientRect()
      const preview = root.querySelector('.hero-preview')?.getBoundingClientRect()
      const featureSection = root.querySelector('.landing-features')?.getBoundingClientRect()
      const footer = root.querySelector('.landing-footer')?.getBoundingClientRect()
      if (!hero || !preview || !featureSection || !footer) return

      const relativeY = (value) => value - bounds.top
      const points = [
        { x: bounds.width - 14, y: relativeY(hero.top) + 18 },
        { x: preview.right - bounds.left + 14, y: relativeY(hero.bottom) - 12 },
        { x: bounds.width - 10, y: relativeY(featureSection.bottom) - 10 },
        { x: 10, y: relativeY(featureSection.bottom) - 10 },
        { x: 10, y: relativeY(footer.bottom) - 8 },
      ]

      const commands = [`M ${points[0].x} ${points[0].y}`]
      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1]
        const current = points[index]
        const middleY = previous.y + (current.y - previous.y) / 2
        commands.push(`C ${previous.x} ${middleY}, ${current.x} ${middleY}, ${current.x} ${current.y}`)
      }
      path.setAttribute('d', commands.join(' '))
      pathLengthRef.current = path.getTotalLength()
      path.style.strokeDasharray = `${pathLengthRef.current}`
      path.style.strokeDashoffset = String(pathLengthRef.current)
      scheduleProgressUpdate()
    }

    const revealTargets = [...root.querySelectorAll('.feature-item')]
    if (motionPreference.matches || !('IntersectionObserver' in window)) {
      revealTargets.forEach((element) => element.classList.add('is-visible', 'is-lit'))
    } else {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible', 'is-lit')
          else entry.target.classList.remove('is-lit')
        })
      }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' })
      revealTargets.forEach((element, index) => {
        element.classList.add('reveal-ready')
        element.style.setProperty('--reveal-delay', `${index * 100}ms`)
        revealObserver.observe(element)
      })
    }

    const resizeObserver = new ResizeObserver(measurePath)
    resizeObserver.observe(root)
    window.addEventListener('scroll', scheduleProgressUpdate, { passive: true })
    window.addEventListener('resize', measurePath)
    motionPreference.addEventListener('change', scheduleProgressUpdate)
    measurePath()

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
      resizeObserver.disconnect()
      revealObserver?.disconnect()
      window.removeEventListener('scroll', scheduleProgressUpdate)
      window.removeEventListener('resize', measurePath)
      motionPreference.removeEventListener('change', scheduleProgressUpdate)
    }
  }, [landingRef])

  return (
    <svg className="gold-thread-scroll" aria-hidden="true">
      <path ref={pathRef} className="gold-thread-path" fill="none" stroke="url(#gold-thread-gradient)" strokeWidth="1.25" strokeLinecap="round" />
      <defs>
        <linearGradient id="gold-thread-gradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#d7b761" stopOpacity=".25" />
          <stop offset="45%" stopColor="#f0d77a" stopOpacity=".82" />
          <stop offset="100%" stopColor="#d7b761" stopOpacity=".3" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function LandingPage({ onSchedule, now, schedules }) {
  const landingRef = useRef(null)
  const parts = getJakartaDateParts(now)
  const nextClass = getNextClass(schedules, parts)
  const nextClassDate = nextClass ? new Date(nextClass.startsAt) : null
  const relativeDay = nextClass?.dayOffset === 0 ? 'HARI INI' : nextClass?.dayOffset === 1 ? 'BESOK' : `DALAM ${nextClass?.dayOffset} HARI`
  return (
    <main className="landing" ref={landingRef}>
      <GoldThread landingRef={landingRef} />
      <section className="hero-section">
        <div className="hero-thread" aria-hidden="true"><span /></div>
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> RUANG KELAS, LEBIH TERATUR</div>
          <h1><span className="hero-title-line"><span className="hero-word" style={{ '--word-delay': '80ms' }}>Waktu</span> <span className="hero-word" style={{ '--word-delay': '140ms' }}>terbaik</span></span><br /><span className="hero-title-line"><span className="hero-word" style={{ '--word-delay': '200ms' }}>dimulai</span> <span className="hero-word" style={{ '--word-delay': '260ms' }}>dari</span> <em className="hero-word hero-gold-word" style={{ '--word-delay': '320ms' }}>jadwal</em><span className="gold-dot">.</span></span></h1>
          <div className="hero-buttons">
            <button className="button button-gold" onClick={onSchedule}>Lihat jadwal <ArrowRight size={17} /></button>
            <button className="button button-quiet" onClick={onSchedule}>Jadwal minggu ini <ArrowDownRight size={16} /></button>
          </div>
          <div className="class-meta">
            <div className="avatar-stack"><span>A</span><span>N</span><span>R</span><span>+</span></div>
            <span><strong>Kelas A</strong></span>
          </div>
        </div>
        <div className="hero-preview">
          <div className="preview-glow" />
          <div className="preview-heading">
            <div><span className="preview-label">KULIAH BERIKUTNYA</span><span className="preview-date">{nextClassDate ? formatDate(nextClassDate, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Belum ada jadwal'}</span></div>
            {nextClass && <span className="live-pill"><span /> {relativeDay}</span>}
          </div>
          {nextClass ? <div className="next-class">
            <div className="class-time"><span>{nextClass.item.start}</span><i /><span>{nextClass.item.end}</span></div>
            <div className="next-class-info">
              <span className="course-code">{nextClass.item.code} <span>·</span> {nextClass.item.credits} SKS</span>
              <h2>{nextClass.item.name}</h2>
              <div className="class-detail"><span><MapPin size={14} /> {nextClass.item.room}</span><span><Users size={14} /> Kelas A</span></div>
            </div>
            <div className="course-art"><BookOpen size={23} strokeWidth={1.4} /></div>
          </div> : <div className="next-class"><p>Jadwal kelas belum tersedia.</p></div>}
          <div className="preview-footer"><span><Sparkles size={14} /> Jadwal kelasmu, selalu terbaru</span><button onClick={onSchedule}>Buka jadwal <ArrowRight size={14} /></button></div>
        </div>
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
      </section>
      <section className="landing-features" id="tentang">
        <div className="features-intro"><span className="eyebrow">DIBUAT UNTUK HARI-HARIMU</span><h2>Lebih sedikit mencari.<br /><em>Lebih banyak menjalani.</em></h2></div>
        <div className="feature-item"><span className="feature-icon"><CalendarDays size={18} /></span><div><h3>Jadwal satu pintu</h3><p>Agenda kelas yang rapi dan mudah dibuka kapan saja.</p></div></div>
        <div className="feature-item"><span className="feature-icon"><ShieldCheck size={18} /></span><div><h3>Info kelas terpusat</h3><p>Informasi kelas tersedia dalam tampilan yang mudah dibuka.</p></div></div>
        <div className="feature-item"><span className="feature-icon"><Clock3 size={18} /></span><div><h3>Waktumu tetap milikmu</h3><p>Lihat agenda harian dalam sekali pandang.</p></div></div>
      </section>
      <footer className="landing-footer"><Brand onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} /><span>© {parts.year} Wangsa Jadwal</span></footer>
    </main>
  )
}

function ScheduleCard({ item, onRemove, onEdit, adminMode }) {
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
      <div className="card-type"><BookOpen size={17} /></div>
      {adminMode && <div className="card-admin-actions"><button className="edit-class" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}><Pencil size={14} /></button><button className="remove-class" onClick={() => onRemove(item.id)} aria-label={`Hapus ${item.name}`}><X size={15} /></button></div>}
    </article>
  )
}

function AddScheduleModal({ onClose, onSave, schedules, schedule }) {
  const [form, setForm] = useState(() => schedule
    ? { ...schedule }
    : { name: '', code: '', lecturer: '', day: 'Senin', start: '08:00', end: '09:40', room: '', group: 'A', credits: 1 })
  const [conflicts, setConflicts] = useState([])
  const [confirmConflict, setConfirmConflict] = useState(false)
  const [validationError, setValidationError] = useState('')
  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setConflicts([])
    setConfirmConflict(false)
    setValidationError('')
  }
  const submit = (event) => {
    event.preventDefault()
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
    onSave({
      ...normalizedForm,
      id: schedule?.id ?? Date.now(),
      credits,
      color: schedule?.color ?? ['violet', 'blue', 'mint', 'peach', 'yellow'][Math.floor(Math.random() * 5)],
    })
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
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Batal</button><button type="submit" className="button button-gold">{schedule ? <Check size={16} /> : <Plus size={16} />} {confirmConflict ? 'Simpan tetap' : schedule ? 'Simpan perubahan' : 'Simpan jadwal'}</button></div>
      </form>
    </div>
  )
}

function SchedulePage({ schedules, setSchedules, adminMode, setAdminMode, now, storageMessage, onStorageError }) {
  const [selectedDay, setSelectedDay] = useState(() => getInitialSelectedDay(getJakartaDateParts(now)))
  const [view, setView] = useState('Harian')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [groupFilter, setGroupFilter] = useState('Semua kelompok')
  const dateParts = getJakartaDateParts(now)
  const weekStart = getWeekDate(dateParts, 'Senin')
  const weekEnd = getWeekDate(dateParts, 'Sabtu')
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

  const saveSchedule = (schedule) => {
    const updated = schedules.some((item) => item.id === schedule.id)
      ? schedules.map((item) => item.id === schedule.id ? schedule : item)
      : [...schedules, schedule]
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Could not save the updated schedule.', error)
      onStorageError('Jadwal tidak tersimpan di perangkat ini. Periksa ruang penyimpanan browser.')
      return
    }
    setSchedules(updated)
    onStorageError('')
    setSelectedDay(schedule.day)
    setView('Harian')
    setShowModal(false)
  }

  const removeSchedule = (id) => {
    const updated = schedules.filter((item) => item.id !== id)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Could not save the updated schedule.', error)
      onStorageError('Perubahan tidak tersimpan di perangkat ini. Periksa ruang penyimpanan browser.')
      return
    }
    setSchedules(updated)
    onStorageError('')
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
      const date = getNextDateForDay(dateParts, item.day, item.start)
      const stamp = (time) => `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}T${time.replace(':', '')}00`
      return `BEGIN:VEVENT\nUID:${item.id}@ti26-a-jadwal\nDTSTART;TZID=Asia/Jakarta:${stamp(item.start)}\nDTEND;TZID=Asia/Jakarta:${stamp(item.end)}\nSUMMARY:${escapeCalendarText(`${item.name} (${item.code})`)}\nLOCATION:${escapeCalendarText(item.room)}\nDESCRIPTION:${escapeCalendarText(item.lecturer)} — Kelas ${escapeCalendarText(item.group)}\nEND:VEVENT`
    })
    const blob = new Blob([`BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Wangsa Jadwal//ID\nCALSCALE:GREGORIAN\n${eventRows.join('\n')}\nEND:VCALENDAR`], { type: 'text/calendar;charset=utf-8' })
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
          {import.meta.env.DEV && <button className={adminMode ? 'admin-button admin-active' : 'admin-button'} onClick={() => setAdminMode((value) => !value)}><Settings2 size={15} /> <span>{adminMode ? 'Mode demo' : 'Demo admin'}</span></button>}
        </div>
      </div>
      {storageMessage && <div className="storage-warning" role="alert"><ShieldCheck size={15} />{storageMessage}</div>}
      {adminMode && <div className="admin-banner"><ShieldCheck size={16} /><span>Demo admin lokal saja; belum ada login atau izin yang aman untuk produksi.</span><button onClick={openAddSchedule}><Plus size={15} /> Tambah jadwal</button></div>}
      {view !== 'Mingguan' && <div className="day-selector"><button className="day-arrow" onClick={() => setSelectedDay(SCHEDULE_DAYS[Math.max(0, SCHEDULE_DAYS.indexOf(selectedDay) - 1)])} aria-label="Hari sebelumnya"><ChevronLeft size={17} /></button>{SCHEDULE_DAYS.map((day) => { const date = getWeekDate(dateParts, day); const isToday = currentWeekday === day; return <button className={selectedDay === day ? 'day-tab current-day' : 'day-tab'} key={day} onClick={() => setSelectedDay(day)} aria-current={isToday ? 'date' : undefined}><span>{day.slice(0, 3)}</span><strong>{formatDate(date, { day: '2-digit' })}</strong>{isToday && <i />}</button> })}<button className="day-arrow" onClick={() => setSelectedDay(SCHEDULE_DAYS[Math.min(SCHEDULE_DAYS.length - 1, SCHEDULE_DAYS.indexOf(selectedDay) + 1)])} aria-label="Hari berikutnya"><ChevronRight size={17} /></button><span className="week-label">{weekLabel.toLocaleUpperCase('id-ID')}</span></div>}
      <div className="schedule-content">
        <div className="day-heading"><div><span className="eyebrow">{view === 'Mingguan' ? 'AGENDA MINGGU INI' : selectedDay === currentWeekday ? 'AGENDA HARI INI' : 'AGENDA HARI PILIHAN'}</span><h2>{view === 'Mingguan' ? 'Minggu perkuliahan' : selectedDay}<span>.</span></h2></div><span className="class-count"><span /> {visibleSchedules.length} kelas terjadwal</span></div>
        {visibleSchedules.length > 0 ? <div className={view === 'Mingguan' || view === 'Daftar' ? 'schedule-list week-list' : 'schedule-list'}>
          {visibleSchedules.map((item) => <div className="schedule-entry" key={item.id}>{(view === 'Mingguan' || view === 'Daftar') && <div className="entry-day">{item.day}<span>{item.start}</span></div>}<ScheduleCard item={item} adminMode={adminMode} onRemove={removeSchedule} onEdit={openEditSchedule} /></div>)}
        </div> : <div className="empty-state"><span className="empty-icon"><CalendarDays size={20} /></span><h3>{search ? 'Mata kuliah tidak ditemukan' : 'Belum ada kelas hari ini'}</h3><p>{search ? 'Coba kata kunci atau nama dosen lain.' : adminMode ? 'Tambahkan jadwal untuk hari ini.' : 'Nikmati waktu kosongmu. Jadwal berikutnya segera menyusul.'}</p>{adminMode && !search && <button className="button button-gold" onClick={openAddSchedule}><Plus size={16} /> Tambah jadwal</button>}</div>}
        <div className="schedule-note"><span className="note-icon"><Sparkles size={15} /></span><div><strong>Informasi jadwal</strong><span>Pastikan jadwal yang digunakan sesuai informasi resmi dari program studi.</span></div><button aria-label="Informasi jadwal"><MoreHorizontal size={19} /></button></div>
      </div>
      <footer className="schedule-footer"><span>wangsa<span className="gold-dot">.</span></span><span>Waktu WIB</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Kembali ke atas <ArrowRight size={13} /></button></footer>
      {showModal && <AddScheduleModal onClose={() => setShowModal(false)} onSave={saveSchedule} schedules={schedules} schedule={editingSchedule} />}
    </main>
  )
}

function App() {
  const [page, setPage] = useState('home')
  const [savedScheduleState] = useState(readSchedules)
  const [schedules, setSchedules] = useState(savedScheduleState.schedules)
  const [storageMessage, setStorageMessage] = useState(savedScheduleState.error)
  const [adminMode, setAdminMode] = useState(false)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    const refreshVisibleClock = () => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }
    document.addEventListener('visibilitychange', refreshVisibleClock)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refreshVisibleClock)
    }
  }, [])
  const showSchedule = () => {
    setPage('schedule')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const goHome = () => {
    setPage('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return (
    <div className="app-shell">
      <Header page={page} onHome={goHome} onSchedule={showSchedule} onAdmin={() => { setPage('schedule'); setAdminMode(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
      {page === 'home' ? <LandingPage onSchedule={showSchedule} now={now} schedules={schedules} /> : <SchedulePage schedules={schedules} setSchedules={setSchedules} adminMode={adminMode} setAdminMode={setAdminMode} now={now} storageMessage={storageMessage} onStorageError={setStorageMessage} />}
    </div>
  )
}

export default App
