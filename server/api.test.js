import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSessionToken,
  findScheduleConflicts,
  validateSchedulePayload,
  verifyAdminCredentials,
  verifySessionToken,
} from './api.js'
import { initialSchedules } from '../src/scheduleUtils.js'

const authConfig = {
  username: 'admin',
  password: 'a-unique-password-123',
  secret: '0123456789abcdef0123456789abcdef',
}

test('validates, trims, and normalizes schedule payloads before persistence', () => {
  const valid = validateSchedulePayload({
    day: 'Senin',
    start: '08:00',
    end: '09:40',
    code: 'inf625110',
    name: ' Struktur Data ',
    lecturer: ' Dosen Contoh ',
    room: ' H10 ',
    group: 'A',
    color: 'blue',
    credits: 3,
  }, { creating: true })
  assert.equal(valid.id, 1)
  assert.equal(valid.code, 'INF625110')
  assert.equal(valid.name, 'Struktur Data')
  assert.throws(() => validateSchedulePayload({ ...valid, start: '25:00' }), /Periksa kembali/u)
})

test('detects overlapping classes that share a room, lecturer, or group', () => {
  const candidate = {
    ...initialSchedules[0],
    id: 99,
    day: 'Selasa',
    start: '10:00',
    end: '11:00',
    room: 'H17',
  }
  assert.deepEqual(findScheduleConflicts(initialSchedules, candidate).map(({ id }) => id), [1])
  assert.deepEqual(findScheduleConflicts(initialSchedules, { ...candidate, day: 'Jumat' }), [])
})

test('signs expiring admin sessions and rejects tampering or expired tokens', () => {
  const now = Date.parse('2026-06-18T12:00:00Z')
  const token = createSessionToken(authConfig.username, authConfig.secret, now)
  assert.equal(verifySessionToken(token, authConfig, now), true)
  assert.equal(verifySessionToken(`${token}x`, authConfig, now), false)
  assert.equal(verifySessionToken(token, authConfig, now + 8 * 60 * 60 * 1000), false)
  assert.equal(verifySessionToken(token, { ...authConfig, username: 'other' }, now), false)
})

test('compares server-configured admin credentials without accepting partial matches', () => {
  assert.equal(verifyAdminCredentials(authConfig.username, authConfig.password, authConfig), true)
  assert.equal(verifyAdminCredentials('admin ', authConfig.password, authConfig), false)
  assert.equal(verifyAdminCredentials(authConfig.username, `${authConfig.password}x`, authConfig), false)
})
