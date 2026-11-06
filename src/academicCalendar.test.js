import assert from 'node:assert/strict'
import test from 'node:test'
import { academicCalendar, academicCalendarSource } from './academicCalendar.js'

test('contains the official 2026/2027 calendar periods and source reference', () => {
  assert.deepEqual(academicCalendar.map(({ id }) => id), ['ganjil', 'genap', 'antara'])
  assert.equal(academicCalendarSource.year, '2026/2027')
  assert.equal(academicCalendarSource.decree, '3165/DST/UN26/PP.03.00.01/2026')
  assert.ok(academicCalendar.every(({ events }) => events.length > 0))
})

test('every academic-calendar event and nested date is populated', () => {
  for (const period of academicCalendar) {
    for (const event of period.events) {
      assert.ok(event.title.trim(), `Missing event title in ${period.id}`)
      assert.ok(event.date.trim(), `Missing event date for ${event.title}`)
      for (const [title, date] of event.details || []) {
        assert.ok(title.trim(), `Missing detail title in ${event.title}`)
        assert.ok(date.trim(), `Missing detail date in ${event.title}`)
      }
    }
  }
})
