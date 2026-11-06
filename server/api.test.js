import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSessionToken,
  findScheduleConflicts,
  getSupabaseConfig,
  callSupabaseRpc,
  createStudentSessionToken,
  hashStudentPassword,
  supabaseRequest,
  validateStudentPassword,
  validateStudentUsername,
  validateSchedulePayload,
  verifyAdminCredentials,
  verifySessionToken,
  verifyStudentPassword,
  verifyStudentSessionToken,
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

test('normalizes student usernames and enforces password creation requirements', () => {
  assert.equal(validateStudentUsername('  MahaSiswa.1  '), 'mahasiswa.1')
  assert.throws(() => validateStudentUsername('xy'), /3–32/u)
  assert.throws(() => validateStudentUsername('bad username'), /3–32/u)
  assert.equal(validateStudentPassword('strong-password-123'), 'strong-password-123')
  assert.throws(() => validateStudentPassword('short'), /12–200/u)
})

test('hashes student passwords and verifies them without storing plaintext', async () => {
  const hash = await hashStudentPassword('student-password-123')
  assert.match(hash, /^scrypt\$16384\$/u)
  assert.equal(hash.includes('student-password-123'), false)
  assert.equal(await verifyStudentPassword('student-password-123', hash), true)
  assert.equal(await verifyStudentPassword('student-password-124', hash), false)
  assert.equal(await verifyStudentPassword('student-password-123', 'invalid'), false)
})

test('signs and expires student sessions independently of admin sessions', () => {
  const student = { id: 21, username: 'student_21' }
  const now = Date.parse('2026-06-18T12:00:00Z')
  const token = createStudentSessionToken(student, authConfig.secret, now)
  assert.deepEqual(verifyStudentSessionToken(token, authConfig.secret, now), student)
  assert.equal(verifyStudentSessionToken(`${token}x`, authConfig.secret, now), null)
  assert.equal(verifyStudentSessionToken(token, authConfig.secret, now + 8 * 60 * 60 * 1000), null)
  assert.equal(verifyStudentSessionToken(token, 'another-session-secret-value-long-enough', now), null)
})

test('requires a valid HTTPS Supabase project URL and server-role key', () => {
  const previousUrl = process.env.SUPABASE_URL
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  try {
    process.env.SUPABASE_URL = 'https://project-ref.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-key'
    assert.deepEqual(getSupabaseConfig(), {
      url: 'https://project-ref.supabase.co',
      serviceRoleKey: 'server-only-key',
    })
    process.env.SUPABASE_URL = 'http://remote.example'
    assert.throws(() => getSupabaseConfig(), /HTTPS/u)
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL
    else process.env.SUPABASE_URL = previousUrl
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey
  }
})

test('sends Supabase REST and RPC calls with server-only credentials and a restricted RPC allowlist', async () => {
  const previousFetch = globalThis.fetch
  let captured
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options }
    return new Response(JSON.stringify(true), { status: 200 })
  }
  try {
    const config = { url: 'https://project-ref.supabase.co', serviceRoleKey: 'server-only-key' }
    assert.equal(await callSupabaseRpc(config, 'is_admin_login_locked', { p_ip_hash: 'hash' }), true)
    assert.equal(captured.url, 'https://project-ref.supabase.co/rest/v1/rpc/is_admin_login_locked')
    assert.equal(captured.options.headers.apikey, 'server-only-key')
    assert.equal(captured.options.headers.Authorization, 'Bearer server-only-key')
    assert.equal(captured.options.cache, 'no-store')
    await assert.rejects(callSupabaseRpc(config, 'unknown_function', {}), /not allowed/u)
    await supabaseRequest(config, 'course_schedules?select=id', {
      headers: { Authorization: 'Bearer attacker-controlled' },
    })
    assert.equal(captured.options.headers.Authorization, 'Bearer server-only-key')
  } finally {
    globalThis.fetch = previousFetch
  }
})
