import {
  callSupabaseRpc,
  createStudentSessionToken,
  getClientFingerprint,
  getSessionSecret,
  getSupabaseConfig,
  hashStudentPassword,
  parseRequestBody,
  RequestError,
  requireSameOrigin,
  sendJson,
  studentSessionCookie,
  supabaseRequest,
  validateStudentUsername,
  verifyStudentPassword,
} from '../../server/api.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
  }

  try {
    requireSameOrigin(req)
    const body = parseRequestBody(req)
    const username = validateStudentUsername(body.username)
    if (typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 200) {
      throw new RequestError(400, 'Username atau password tidak valid.')
    }
    const secret = getSessionSecret()
    const supabase = getSupabaseConfig()
    const fingerprint = getClientFingerprint(req, secret)
    if (await callSupabaseRpc(supabase, 'is_admin_login_locked', { p_ip_hash: fingerprint })) {
      return sendJson(res, 429, { error: 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' }, { 'Retry-After': '900' })
    }

    const accounts = await supabaseRequest(
      supabase,
      `student_accounts?select=id,username,password_hash&username=eq.${encodeURIComponent(username)}&limit=1`,
    )
    const account = Array.isArray(accounts) ? accounts[0] : null
    const matches = account ? await verifyStudentPassword(body.password, account.password_hash) : false
    if (!account) await hashStudentPassword(body.password)
    if (!account || !matches) {
      await callSupabaseRpc(supabase, 'record_admin_login_failure', { p_ip_hash: fingerprint })
      return sendJson(res, 401, { error: 'Username atau password salah.' })
    }

    await callSupabaseRpc(supabase, 'clear_admin_login_failures', { p_ip_hash: fingerprint })
    const student = { id: account.id, username: account.username }
    return sendJson(res, 200, { authenticated: true, student }, {
      'Set-Cookie': studentSessionCookie(req, createStudentSessionToken(student, secret)),
    })
  } catch (error) {
    if (error instanceof RequestError) return sendJson(res, error.status, { error: error.message })
    console.error('Student login failed.', error)
    return sendJson(res, 503, { error: 'Login mahasiswa belum tersedia. Periksa konfigurasi server.' })
  }
}
