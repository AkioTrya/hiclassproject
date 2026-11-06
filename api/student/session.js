import { getStudentSession, sendJson } from '../../server/api.js'

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
  }
  const student = getStudentSession(req)
  return sendJson(res, 200, { authenticated: Boolean(student), student })
}
