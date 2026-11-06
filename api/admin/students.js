import {
  getSupabaseConfig,
  hashStudentPassword,
  parseRequestBody,
  RequestError,
  requireAdmin,
  requireSameOrigin,
  sendJson,
  supabaseRequest,
  validateStudentPassword,
  validateStudentUsername,
} from '../../server/api.js'

export default async function handler(req, res) {
  try {
    if (!['GET', 'POST'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST')
      return sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
    }
    if (req.method === 'POST') requireSameOrigin(req)
    if (!requireAdmin(req, res)) return

    const supabase = getSupabaseConfig()
    if (req.method === 'GET') {
      const students = await supabaseRequest(
        supabase,
        'student_accounts?select=id,username,created_at&order=username.asc',
      )
      if (!Array.isArray(students)) throw new Error('Supabase returned an invalid student collection.')
      return sendJson(res, 200, students.map(({ id, username, created_at: createdAt }) => ({ id, username, createdAt })))
    }

    const body = parseRequestBody(req)
    const username = validateStudentUsername(body.username)
    const password = validateStudentPassword(body.password)
    const passwordHash = await hashStudentPassword(password)
    const created = await supabaseRequest(supabase, 'student_accounts?select=id,username,created_at', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ username, password_hash: passwordHash }),
    })
    if (!Array.isArray(created) || !created[0]) throw new Error('Supabase did not return the new student account.')
    return sendJson(res, 201, {
      id: created[0].id,
      username: created[0].username,
      createdAt: created[0].created_at,
    })
  } catch (error) {
    if (error instanceof RequestError) return sendJson(res, error.status, { error: error.message })
    if (error.code === '23505') return sendJson(res, 409, { error: 'Username tersebut sudah digunakan.' })
    console.error('Student account request failed.', error)
    return sendJson(res, 503, { error: 'Akun mahasiswa belum dapat diproses. Periksa konfigurasi server.' })
  }
}
