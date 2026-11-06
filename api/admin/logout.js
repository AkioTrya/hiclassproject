import {
  RequestError,
  requireSameOrigin,
  sendJson,
  sessionCookie,
} from '../../server/api.js'

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
  }
  try {
    requireSameOrigin(req)
    return sendJson(res, 200, { authenticated: false }, {
      'Set-Cookie': sessionCookie(req, '', 0),
    })
  } catch (error) {
    if (error instanceof RequestError) return sendJson(res, error.status, { error: error.message })
    console.error('Admin logout failed.', error)
    return sendJson(res, 500, { error: 'Tidak dapat mengakhiri sesi admin.' })
  }
}
