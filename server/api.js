import { createHmac, timingSafeEqual } from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import { isValidSchedule } from '../src/scheduleUtils.js'

export const SESSION_COOKIE = 'wangsa_admin'
const SESSION_TTL_SECONDS = 8 * 60 * 60
const LOGIN_WINDOW_MINUTES = 15
const LOGIN_MAX_ATTEMPTS = 5

export function sendJson(res, status, body, headers = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value)
  res.end(JSON.stringify(body))
}

export function getDatabase() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.')
  return neon(process.env.DATABASE_URL)
}

export function getRequiredAuthConfig() {
  const { ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET } = process.env
  if (!ADMIN_USERNAME || ADMIN_USERNAME.length > 100 || !ADMIN_PASSWORD
    || ADMIN_PASSWORD.length < 12 || ADMIN_PASSWORD.length > 200
    || !SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error('Admin authentication environment variables are not configured.')
  }
  return { username: ADMIN_USERNAME, password: ADMIN_PASSWORD, secret: SESSION_SECRET }
}

export function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) return req.body
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch {
      throw new RequestError(400, 'Format JSON tidak valid.')
    }
  }
  throw new RequestError(400, 'Body permintaan tidak valid.')
}

export class RequestError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

export function validateSchedulePayload(body, { creating = false } = {}) {
  const schedule = {
    id: creating ? 1 : body.id,
    day: body.day,
    start: body.start,
    end: body.end,
    code: typeof body.code === 'string' ? body.code.trim().toUpperCase() : body.code,
    name: typeof body.name === 'string' ? body.name.trim() : body.name,
    lecturer: typeof body.lecturer === 'string' ? body.lecturer.trim() : body.lecturer,
    room: typeof body.room === 'string' ? body.room.trim() : body.room,
    group: body.group,
    color: body.color,
    credits: body.credits,
  }
  if (!isValidSchedule(schedule)) throw new RequestError(400, 'Periksa kembali data mata kuliah.')
  return schedule
}

export function findScheduleConflicts(schedules, candidate) {
  return schedules.filter((item) => {
    if (item.id === candidate.id || item.day !== candidate.day) return false
    const overlaps = candidate.start < item.end && candidate.end > item.start
    const sharedResource = item.room.toLowerCase() === candidate.room.toLowerCase()
      || item.lecturer.toLowerCase() === candidate.lecturer.toLowerCase()
      || (item.group === candidate.group && item.group !== 'Semua')
      || item.group === 'Semua'
      || candidate.group === 'Semua'
    return overlaps && sharedResource
  })
}

function hmac(value, secret) {
  return createHmac('sha256', secret).update(value).digest()
}

function safeEqual(left, right) {
  return timingSafeEqual(hmac(left, 'wangsa-credential-check'), hmac(right, 'wangsa-credential-check'))
}

export function verifyAdminCredentials(username, password, config = getRequiredAuthConfig()) {
  return safeEqual(String(username), config.username) && safeEqual(String(password), config.password)
}

export function createSessionToken(username, secret = getRequiredAuthConfig().secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    username,
    expiresAt: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
  })).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifySessionToken(token, config = getRequiredAuthConfig(), now = Date.now()) {
  if (typeof token !== 'string') return false
  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra !== undefined) return false
  const expected = createHmac('sha256', config.secret).update(payload).digest()
  let actual
  try {
    actual = Buffer.from(signature, 'base64url')
  } catch {
    return false
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return decoded.username === config.username
      && Number.isInteger(decoded.expiresAt)
      && decoded.expiresAt > Math.floor(now / 1000)
  } catch {
    return false
  }
}

function getCookie(req, name) {
  const header = req.headers.cookie
  if (typeof header !== 'string') return ''
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name) {
      try {
        return decodeURIComponent(value.join('='))
      } catch {
        return ''
      }
    }
  }
  return ''
}

export function hasAdminSession(req) {
  return verifySessionToken(getCookie(req, SESSION_COOKIE))
}

export function requireAdmin(req, res) {
  if (hasAdminSession(req)) return true
  sendJson(res, 401, { error: 'Sesi admin tidak valid atau sudah berakhir.' })
  return false
}

export function requireSameOrigin(req) {
  const origin = req.headers.origin
  const host = req.headers['x-forwarded-host'] || req.headers.host
  if (typeof origin !== 'string' || typeof host !== 'string') {
    throw new RequestError(403, 'Asal permintaan tidak dapat diverifikasi.')
  }
  let originHost
  try {
    originHost = new URL(origin).host
  } catch {
    throw new RequestError(403, 'Asal permintaan tidak valid.')
  }
  if (originHost.toLowerCase() !== host.toLowerCase()) {
    throw new RequestError(403, 'Permintaan lintas situs ditolak.')
  }
}

export function sessionCookie(req, token, maxAge = SESSION_TTL_SECONDS) {
  const secure = process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https'
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
}

export async function isLoginLocked(sql, ipHash) {
  const rows = await sql`
    SELECT locked_until > now() AS locked
    FROM admin_login_attempts
    WHERE ip_hash = ${ipHash}
  `
  return rows[0]?.locked === true
}

export async function recordLoginFailure(sql, ipHash) {
  await sql`
    INSERT INTO admin_login_attempts (ip_hash, attempts, window_started_at)
    VALUES (${ipHash}, 1, now())
    ON CONFLICT (ip_hash) DO UPDATE SET
      attempts = CASE
        WHEN admin_login_attempts.window_started_at < now() - (${LOGIN_WINDOW_MINUTES} * interval '1 minute') THEN 1
        ELSE admin_login_attempts.attempts + 1
      END,
      window_started_at = CASE
        WHEN admin_login_attempts.window_started_at < now() - (${LOGIN_WINDOW_MINUTES} * interval '1 minute') THEN now()
        ELSE admin_login_attempts.window_started_at
      END,
      locked_until = CASE
        WHEN (
          CASE
            WHEN admin_login_attempts.window_started_at < now() - (${LOGIN_WINDOW_MINUTES} * interval '1 minute') THEN 1
            ELSE admin_login_attempts.attempts + 1
          END
        ) >= ${LOGIN_MAX_ATTEMPTS} THEN now() + (${LOGIN_WINDOW_MINUTES} * interval '1 minute')
        ELSE NULL
      END
  `
  await sql`DELETE FROM admin_login_attempts WHERE window_started_at < now() - interval '1 day'`
}

export async function clearLoginFailures(sql, ipHash) {
  await sql`DELETE FROM admin_login_attempts WHERE ip_hash = ${ipHash}`
}

export function getClientFingerprint(req, secret = getRequiredAuthConfig().secret) {
  const forwardedIp = req.headers['x-real-ip']
    || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown'
  return createHmac('sha256', secret).update(String(forwardedIp)).digest('hex')
}
