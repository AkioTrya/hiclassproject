export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
export const SCHEDULE_DAYS = DAYS.slice(0, 6)
export const TIME_ZONE = 'Asia/Jakarta'
export const STORAGE_KEY = 'ti26-a-schedules-v1'

export const initialSchedules = [
  { id: 1, day: 'Selasa', start: '10:50', end: '12:30', code: 'INF625101', name: 'Pengenalan Pemrograman', lecturer: 'Yessi Mulyani, S.T., M.T.; Bambang Sundari, S.Kom., M.T.; Nurrahma, M.T.', room: 'H17', group: 'A', color: 'violet', credits: 2 },
  { id: 2, day: 'Senin', start: '14:40', end: '17:10', code: 'INF625102', name: 'Algoritma Pemrograman', lecturer: 'Wahyu Eko Sulistiono, S.T., M.Sc.; Ir. Titin Yulianti, S.T., M.Eng.', room: 'H20', group: 'A', color: 'blue', credits: 3 },
  { id: 3, day: 'Kamis', start: '09:10', end: '10:50', code: 'INF625103', name: 'Kalkulus', lecturer: 'Zulmiftah Huda, S.T., M.Eng.; Nurrahma, M.T.', room: 'Mektan 3.2', group: 'A', color: 'mint', credits: 2 },
  { id: 5, day: 'Rabu', start: '15:30', end: '17:10', code: 'INF625105', name: 'Logika', lecturer: 'Sumadi, S.T., M.T.; Nurrahma, M.T.', room: 'H17', group: 'A', color: 'yellow', credits: 2 },
  { id: 6, day: 'Selasa', start: '13:00', end: '15:30', code: 'INF625106', name: 'Probabilitas dan Statistik', lecturer: 'Resty Annisa, S.ST., M.Kom.; Rio Ariesta Pradipta, S.Kom., M.T.I.', room: 'Mektan 3.2', group: 'A', color: 'blue', credits: 3 },
  { id: 7, day: 'Senin', start: '07:30', end: '09:10', code: 'INF625107', name: 'Teknik Digital', lecturer: 'Mona Arif Muda, S.T., M.T.; Rizkima Akbar Setiawan, S.T., M.T.', room: 'Mektan 3.1', group: 'A', color: 'mint', credits: 2 },
  { id: 9, day: 'Jumat', start: '07:30', end: '09:10', code: 'UNI625107', name: 'Pancasila', lecturer: 'Dayu Rika Perdana, S.Pd., M.Pd.; Deny Budiyanto, S.Kom., M.T.', room: 'H5', group: 'A', color: 'yellow', credits: 2 },
  { id: 10, day: 'Selasa', start: '07:30', end: '09:10', code: 'UNI625109', name: 'Bahasa Indonesia', lecturer: 'Dr. Eka Sofia Agustina, S.Pd., M.Pd.; Ayu Setiyo Putri, S.Pd., M.Pd.', room: 'H5', group: 'A', color: 'violet', credits: 2 },
]

const englishToDay = {
  Monday: 'Senin',
  Tuesday: 'Selasa',
  Wednesday: 'Rabu',
  Thursday: 'Kamis',
  Friday: 'Jumat',
  Saturday: 'Sabtu',
  Sunday: 'Minggu',
}

export function getJakartaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: englishToDay[values.weekday],
  }
}

export function getMondayDate(parts) {
  const weekdayIndex = DAYS.indexOf(parts.weekday)
  const mondayOffset = weekdayIndex === 6 ? 1 : -weekdayIndex
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day + mondayOffset))
}

export function getWeekDate(parts, weekday, weekOffset = 0) {
  if (!Number.isInteger(weekOffset)) throw new TypeError('Week offset must be an integer.')
  const monday = getMondayDate(parts)
  const dayOffset = DAYS.indexOf(weekday)
  if (dayOffset < 0) throw new RangeError(`Unknown weekday: ${weekday}`)
  return new Date(monday.getTime() + (weekOffset * 7 + dayOffset) * 86_400_000)
}

export function formatDate(date, options) {
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', ...options }).format(date)
}

export function getInitialSelectedDay(parts) {
  return SCHEDULE_DAYS.includes(parts.weekday) ? parts.weekday : 'Senin'
}

export function getNextClass(schedules, parts) {
  const todayIndex = DAYS.indexOf(parts.weekday)
  if (todayIndex < 0) return null
  const nowAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)

  return schedules
    .map((item) => {
      const itemDayIndex = DAYS.indexOf(item.day)
      if (itemDayIndex < 0) return null
      let dayOffset = (itemDayIndex - todayIndex + DAYS.length) % DAYS.length
      const [hour, minute] = item.start.split(':').map(Number)
      let startsAt = Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset, hour, minute)
      if (startsAt < nowAsUtc) {
        dayOffset += DAYS.length
        startsAt += DAYS.length * 86_400_000
      }
      return { item, startsAt, dayOffset }
    })
    .filter(Boolean)
    .sort((a, b) => a.startsAt - b.startsAt)[0] ?? null
}

export function getNextDateForDay(parts, weekday, startTime) {
  const todayIndex = DAYS.indexOf(parts.weekday)
  const targetIndex = DAYS.indexOf(weekday)
  if (todayIndex < 0 || targetIndex < 0) throw new RangeError(`Unknown weekday: ${weekday}`)
  let dayOffset = (targetIndex - todayIndex + DAYS.length) % DAYS.length
  if (dayOffset === 0 && startTime) {
    const [hour, minute] = startTime.split(':').map(Number)
    if (hour < parts.hour || (hour === parts.hour && minute <= parts.minute)) dayOffset = DAYS.length
  }
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset))
  return date
}

export function isValidSchedule(schedule) {
  const safeText = (value, maxLength) => typeof value === 'string'
    && value.length > 0
    && value.length <= maxLength
    && ![...value].some((character) => {
      const code = character.charCodeAt(0)
      return code <= 0x1f || (code >= 0x7f && code <= 0x9f)
    })
  const validTime = (value) => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(value)
  return schedule !== null
    && typeof schedule === 'object'
    && !Array.isArray(schedule)
    && Number.isSafeInteger(schedule.id)
    && SCHEDULE_DAYS.includes(schedule.day)
    && safeText(schedule.name, 100)
    && /^[A-Z]{2,4}\d{3,6}$/u.test(schedule.code)
    && safeText(schedule.lecturer, 200)
    && safeText(schedule.room, 60)
    && ['A', 'B', 'Semua'].includes(schedule.group)
    && validTime(schedule.start)
    && validTime(schedule.end)
    && schedule.start < schedule.end
    && ['violet', 'blue', 'mint', 'peach', 'yellow'].includes(schedule.color)
    && Number.isInteger(schedule.credits)
    && schedule.credits >= 1
    && schedule.credits <= 6
}

export function escapeCalendarText(value) {
  return value.replace(/\\/gu, '\\\\').replace(/\r?\n/gu, '\\n').replace(/([,;])/gu, '\\$1')
}
