import {
  getRequiredAuthConfig,
  hasAdminSession,
  sendJson,
} from '../../server/api.js'

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
  }
  try {
    getRequiredAuthConfig()
    return sendJson(res, 200, { authenticated: hasAdminSession(req) })
  } catch (error) {
    console.error('Could not verify the admin session.', error)
    return sendJson(res, 503, { error: 'Layanan admin belum siap. Periksa konfigurasi server.' })
  }
}
