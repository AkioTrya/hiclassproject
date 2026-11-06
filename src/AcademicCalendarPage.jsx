import { useState } from 'react'
import { ArrowDownRight, CalendarDays, ChevronDown, Clock3, FileText } from 'lucide-react'
import { academicCalendar, academicCalendarSource } from './academicCalendar.js'

export default function AcademicCalendarPage() {
  const [selectedPeriod, setSelectedPeriod] = useState(academicCalendar[0].id)
  const period = academicCalendar.find((item) => item.id === selectedPeriod)

  return (
    <main className="academic-page">
      <header className="academic-intro">
        <div>
          <div className="breadcrumb"><span>Kalender</span><ChevronDown size={13} /><strong>Akademik Unila</strong></div>
          <span className="academic-eyebrow"><CalendarDays size={15} /> TAHUN AKADEMIK {academicCalendarSource.year}</span>
          <h1>Waktu belajar, <em>lebih terarah.</em></h1>
          <p>Rangkuman agenda resmi Universitas Lampung sepanjang tahun akademik 2026/2027.</p>
        </div>
        <div className="academic-source-card">
          <span className="academic-source-icon"><FileText size={18} /></span>
          <span>Sumber resmi</span>
          <strong>SK Rektor Unila</strong>
          <small>{academicCalendarSource.decree}</small>
          <small>Ditetapkan {academicCalendarSource.established}</small>
        </div>
      </header>

      <nav className="academic-periods" aria-label="Pilih periode akademik">
        {academicCalendar.map((item, index) => (
          <button
            type="button"
            className={selectedPeriod === item.id ? 'academic-period active' : 'academic-period'}
            key={item.id}
            onClick={() => setSelectedPeriod(item.id)}
            aria-pressed={selectedPeriod === item.id}
          >
            <span>0{index + 1}</span>
            <strong>{item.label}</strong>
            <small>{item.period}</small>
          </button>
        ))}
      </nav>

      <section className="academic-events" aria-live="polite">
        <div className="academic-events-heading">
          <div>
            <span className="academic-eyebrow"><Clock3 size={14} /> {period.period}</span>
            <h2>{period.label}<span>.</span></h2>
            <p>{period.summary}</p>
          </div>
          <span className="academic-event-count">{period.events.length} agenda</span>
        </div>
        <ol className="academic-event-list">
          {period.events.map((event, index) => (
            <li className={event.highlight ? 'academic-event highlighted' : 'academic-event'} key={`${period.id}-${event.title}`}>
              <span className="academic-event-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="academic-event-marker" aria-hidden="true" />
              <div className="academic-event-body">
                <h3>{event.title}</h3>
                <p className="academic-event-date">{event.date}</p>
                {event.details && (
                  <ul className="academic-event-details">
                    {event.details.map(([title, date]) => (
                      <li key={`${title}-${date}`}><span>{title}</span><strong>{date}</strong></li>
                    ))}
                  </ul>
                )}
              </div>
              {event.highlight && <ArrowDownRight className="academic-event-arrow" size={18} aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>

      <footer className="academic-footer">
        <CalendarDays size={16} />
        <span>Tanggal mengikuti kalender akademik resmi Universitas Lampung.</span>
        <span>SK No. {academicCalendarSource.decree}</span>
      </footer>
    </main>
  )
}
