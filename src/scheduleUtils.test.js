import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DAYS,
  getInitialSelectedDay,
  getJakartaDateParts,
  getMondayDate,
  getNextClass,
  getNextDateForDay,
  getWeekDate,
  initialSchedules,
  isValidSchedule,
  escapeCalendarText,
} from './scheduleUtils.js'
import { estimateServerEpoch, getAnchoredServerTime } from './serverClock.js'

test('uses the Asia/Jakarta date and time independent of the browser timezone', () => {
  const parts = getJakartaDateParts(new Date('2026-11-05T13:49:00.000Z'))
  assert.deepEqual(parts, {
    year: 2026,
    month: 11,
    day: 5,
    hour: 20,
    minute: 49,
    second: 0,
    weekday: 'Kamis',
  })
})

test('builds week dates and shifts weeks across month boundaries', () => {
  const sunday = getJakartaDateParts(new Date('2026-11-08T05:00:00.000Z'))
  assert.equal(getMondayDate(sunday).toISOString().slice(0, 10), '2026-11-09')
  assert.equal(getWeekDate(sunday, 'Sabtu').toISOString().slice(0, 10), '2026-11-14')
  assert.equal(getWeekDate(sunday, 'Senin', -1).toISOString().slice(0, 10), '2026-11-02')
  assert.equal(getWeekDate(sunday, 'Senin', 1).toISOString().slice(0, 10), '2026-11-16')
  assert.equal(getInitialSelectedDay(sunday), 'Senin')
  assert.throws(() => getWeekDate(sunday, 'Senin', 0.5), /integer/u)
})

test('selects the next upcoming class using Jakarta wall-clock time', () => {
  const parts = getJakartaDateParts(new Date('2026-11-05T07:00:00.000Z'))
  const next = getNextClass(initialSchedules, parts)
  assert.equal(next.item.code, 'UNI625107')
  assert.equal(next.item.day, 'Jumat')
  assert.equal(next.dayOffset, 1)
  assert.equal(new Date(next.startsAt).toISOString().slice(0, 10), '2026-11-06')
})

test('exports a same-day schedule on its next occurrence when it has passed', () => {
  const parts = getJakartaDateParts(new Date('2026-11-05T07:00:00.000Z'))
  assert.equal(getNextDateForDay(parts, 'Kamis', '09:10').toISOString().slice(0, 10), '2026-11-12')
})

test('accepts the provided class data and rejects unsafe or malformed schedule records', () => {
  assert.equal(initialSchedules.length, 8)
  assert.equal(initialSchedules.reduce((total, item) => total + item.credits, 0), 18)
  assert.ok(initialSchedules.every((item) => item.day !== 'Sabtu'))
  assert.ok(initialSchedules.every(isValidSchedule))
  assert.equal(isValidSchedule({ ...initialSchedules[0], name: 'Course\nInjected' }), false)
  assert.equal(isValidSchedule({ ...initialSchedules[0], code: 'bad code' }), false)
  assert.equal(DAYS.at(-1), 'Minggu')
})

test('escapes text fields before writing calendar entries', () => {
  assert.equal(escapeCalendarText('Data, A; B\\C\nline'), 'Data\\, A\\; B\\\\C\\nline')
})

test('estimates server time using the response Date header and half the request latency', () => {
  const serverDate = 'Thu, 05 Nov 2026 15:26:00 GMT'
  assert.equal(estimateServerEpoch(serverDate, 200), Date.parse(serverDate) + 100)
  assert.throws(() => estimateServerEpoch('not a date', 200), /valid Date header/u)
  assert.throws(() => estimateServerEpoch(serverDate, -1), /non-negative/u)
})

test('advances the synchronized time from a monotonic performance clock', () => {
  const anchor = { epoch: Date.parse('2026-11-05T15:26:00Z'), performanceTime: 500 }
  assert.equal(getAnchoredServerTime(anchor, 1750), anchor.epoch + 1250)
  assert.throws(() => getAnchoredServerTime(null, 1000), /valid server clock anchor/u)
})
