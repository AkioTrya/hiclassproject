import {
  getSupabaseConfig,
  hasControlCharacters,
  parseRequestBody,
  RequestError,
  requireSameOrigin,
  requireStudent,
  sendJson,
  supabaseRequest,
} from '../../server/api.js'

const BOOK_FIELDS = 'id,title,course_name,url,created_at'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

function validateBook(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const courseName = typeof body.courseName === 'string' ? body.courseName.trim() : ''
  if (!title || title.length > 120 || hasControlCharacters(title)) {
    throw new RequestError(400, 'Judul ebook wajib diisi (maksimal 120 karakter).')
  }
  if (courseName.length > 100 || hasControlCharacters(courseName)) {
    throw new RequestError(400, 'Nama mata kuliah tidak valid.')
  }
  if (typeof body.url !== 'string' || body.url.length > 2000) {
    throw new RequestError(400, 'Tautan ebook tidak valid.')
  }
  let url
  try {
    url = new URL(body.url)
  } catch {
    throw new RequestError(400, 'Masukkan tautan ebook yang valid.')
  }
  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new RequestError(400, 'Tautan ebook harus memakai HTTP atau HTTPS.')
  }
  return { title, course_name: courseName || null, url: url.href }
}

function getBookId(req) {
  const id = new URL(req.url, 'https://local.invalid').searchParams.get('id')
  if (!id || !UUID_PATTERN.test(id)) throw new RequestError(400, 'ID ebook tidak valid.')
  return id
}

function toBook(row) {
  return {
    id: row.id,
    title: row.title,
    courseName: row.course_name || '',
    url: row.url,
    createdAt: row.created_at,
  }
}

export default async function handler(req, res) {
  try {
    if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST, DELETE')
      return sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
    }
    const student = requireStudent(req, res)
    if (!student) return
    if (req.method !== 'GET') requireSameOrigin(req)
    const supabase = getSupabaseConfig()
    const ownerFilter = `user_id=eq.${student.id}`

    if (req.method === 'GET') {
      const rows = await supabaseRequest(
        supabase,
        `student_ebooks?select=${BOOK_FIELDS}&${ownerFilter}&order=created_at.desc`,
      )
      if (!Array.isArray(rows)) throw new Error('Supabase returned an invalid ebook collection.')
      return sendJson(res, 200, rows.map(toBook))
    }

    if (req.method === 'POST') {
      const book = validateBook(parseRequestBody(req))
      const rows = await supabaseRequest(supabase, `student_ebooks?select=${BOOK_FIELDS}`, {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ...book, user_id: student.id }),
      })
      if (!Array.isArray(rows) || !rows[0]) throw new Error('Supabase did not return the new ebook.')
      return sendJson(res, 201, toBook(rows[0]))
    }

    const id = getBookId(req)
    const rows = await supabaseRequest(
      supabase,
      `student_ebooks?id=eq.${encodeURIComponent(id)}&${ownerFilter}&select=id`,
      {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' },
      },
    )
    if (!Array.isArray(rows) || !rows.length) return sendJson(res, 404, { error: 'Ebook tidak ditemukan.' })
    return sendJson(res, 200, { deleted: true })
  } catch (error) {
    if (error instanceof RequestError) return sendJson(res, error.status, { error: error.message })
    console.error('Student ebook request failed.', error)
    return sendJson(res, 503, { error: 'Rak ebook belum dapat dimuat atau disimpan.' })
  }
}
