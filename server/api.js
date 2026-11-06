import { createHmac, timingSafeEqual } from 'node:crypto'
import { isValidSchedule } from '../src/scheduleUtils.js'

export const SESSION_COOKIE = 'wangsa_admin'
const SUPABASE_RPC_FUNCTIONS = new Set([
  'is_admin_login_locked',
  'record_admin_login_failure',
  'clear_admin_login_failures',
  'mutate_course_schedule',
])
const SESSION_TTL_SECONDS = 8 * 60 * 60
export function sendJson(res, status, body, headers = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value)
  res.end(JSON.stringify(body))
}

export function getSupabaseConfig() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase server environment variables are not configured.')
  }
  let url
  try {
    url = new URL(SUPABASE_URL)
  } catch {
    throw new Error('SUPABASE_URL must be a valid URL.')
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('SUPABASE_URL must use HTTPS except for a local development instance.')
  }
  return { url: url.origin, serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY }
}

export async function supabaseRequest(config, path, options = {}) {
  const response = await fetch(new URL(path, `${config.url}/rest/v1/`), {
    ...options,
    cache: 'no-store',
    headers: {
      ...options.headers,
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10_000),
  })
  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('Supabase returned a non-JSON response.')
    }
  }
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${data?.message || response.statusText}`)
  }
  return data
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

export async function callSupabaseRpc(config, name, args) {
  if (!SUPABASE_RPC_FUNCTIONS.has(name)) throw new Error(`Supabase RPC is not allowed: ${name}`)
  return supabaseRequest(config, `rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(args),
  })
}

export async function isLoginLocked(config, ipHash) {
  return await callSupabaseRpc(config, 'is_admin_login_locked', { p_ip_hash: ipHash }) === true
}

export async function recordLoginFailure(config, ipHash) {
  await callSupabaseRpc(config, 'record_admin_login_failure', { p_ip_hash: ipHash })
}

export async function clearLoginFailures(config, ipHash) {
  await callSupabaseRpc(config, 'clear_admin_login_failures', { p_ip_hash: ipHash })
}

export function getClientFingerprint(req, secret = getRequiredAuthConfig().secret) {
  const forwardedIp = req.headers['x-real-ip']
    || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown'
  return createHmac('sha256', secret).update(String(forwardedIp)).digest('hex')
}
