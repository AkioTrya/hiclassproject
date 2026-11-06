import {
  clearLoginFailures,
  createSessionToken,
  getClientFingerprint,
  getDatabase,
  getRequiredAuthConfig,
  isLoginLocked,
  parseRequestBody,
  recordLoginFailure,
  RequestError,
  requireSameOrigin,
  sendJson,
  sessionCookie,
  verifyAdminCredentials,
} from '../../server/api.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
  }
  try {
    requireSameOrigin(req)
    const body = parseRequestBody(req)
    if (typeof body.username !== 'string' || body.username.length > 100
      || typeof body.password !== 'string' || body.password.length > 200) {
      throw new RequestError(400, 'Nama pengguna dan kata sandi wajib diisi.')
    }
    const config = getRequiredAuthConfig()
    const sql = getDatabase()
    const fingerprint = getClientFingerprint(req, config.secret)
    if (await isLoginLocked(sql, fingerprint)) {
      return sendJson(res, 429, { error: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' }, { 'Retry-After': '900' })
    }
    if (!verifyAdminCredentials(body.username, body.password, config)) {
      await recordLoginFailure(sql, fingerprint)
      return sendJson(res, 401, { error: 'Nama pengguna atau kata sandi salah.' })
    }
    await clearLoginFailures(sql, fingerprint)
    return sendJson(res, 200, { authenticated: true }, {
      'Set-Cookie': sessionCookie(req, createSessionToken(config.username, config.secret)),
    })
  } catch (error) {
    if (error instanceof RequestError) return sendJson(res, error.status, { error: error.message })
    console.error('Admin login failed.', error)
    return sendJson(res, 503, { error: 'Layanan admin belum siap. Periksa konfigurasi server.' })
  }
}
