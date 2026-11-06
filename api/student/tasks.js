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

const TASK_FIELDS = 'id,title,course_name,due_date,completed,created_at'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

function validateTask(body, { creating = false } = {}) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const courseName = typeof body.courseName === 'string' ? body.courseName.trim() : ''
  const dueDate = body.dueDate === '' || body.dueDate == null ? null : body.dueDate
  if (!title || title.length > 120 || hasControlCharacters(title)) {
    throw new RequestError(400, 'Judul tugas wajib diisi (maksimal 120 karakter).')
  }
  if (courseName.length > 100 || hasControlCharacters(courseName)) {
    throw new RequestError(400, 'Nama mata kuliah tidak valid.')
  }
  if (dueDate !== null && (typeof dueDate !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/u.test(dueDate)
    || new Date(`${dueDate}T00:00:00Z`).toISOString().slice(0, 10) !== dueDate)) {
    throw new RequestError(400, 'Tanggal tenggat tidak valid.')
  }
  const value = { title, course_name: courseName || null, due_date: dueDate }
  if (!creating && typeof body.completed === 'boolean') value.completed = body.completed
  return value
}

function toTask(row) {
  return {
    id: row.id,
    title: row.title,
    courseName: row.course_name || '',
    dueDate: row.due_date || '',
    completed: row.completed,
    createdAt: row.created_at,
  }
}

function getTaskId(req) {
  const id = new URL(req.url, 'https://local.invalid').searchParams.get('id')
  if (!id || !UUID_PATTERN.test(id)) throw new RequestError(400, 'ID tugas tidak valid.')
  return id
}

export default async function handler(req, res) {
  try {
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
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
        `student_tasks?select=${TASK_FIELDS}&${ownerFilter}&order=due_date.asc.nullslast,created_at.desc`,
      )
      if (!Array.isArray(rows)) throw new Error('Supabase returned an invalid task collection.')
      return sendJson(res, 200, rows.map(toTask))
    }

    if (req.method === 'POST') {
      const task = validateTask(parseRequestBody(req), { creating: true })
      const rows = await supabaseRequest(supabase, `student_tasks?select=${TASK_FIELDS}`, {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ...task, user_id: student.id }),
      })
      if (!Array.isArray(rows) || !rows[0]) throw new Error('Supabase did not return the new task.')
      return sendJson(res, 201, toTask(rows[0]))
    }

    const id = getTaskId(req)
    if (req.method === 'PATCH') {
      const body = parseRequestBody(req)
      if (typeof body.completed !== 'boolean') throw new RequestError(400, 'Status tugas tidak valid.')
      const rows = await supabaseRequest(
        supabase,
        `student_tasks?id=eq.${encodeURIComponent(id)}&${ownerFilter}&select=${TASK_FIELDS}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ completed: body.completed, updated_at: new Date().toISOString() }),
        },
      )
      if (!Array.isArray(rows) || !rows[0]) return sendJson(res, 404, { error: 'Tugas tidak ditemukan.' })
      return sendJson(res, 200, toTask(rows[0]))
    }

    const rows = await supabaseRequest(
      supabase,
      `student_tasks?id=eq.${encodeURIComponent(id)}&${ownerFilter}&select=id`,
      {
        method: 'DELETE',
        headers: { Prefer: 'return=representation' },
      },
    )
    if (!Array.isArray(rows) || !rows.length) return sendJson(res, 404, { error: 'Tugas tidak ditemukan.' })
    return sendJson(res, 200, { deleted: true })
  } catch (error) {
    if (error instanceof RequestError) return sendJson(res, error.status, { error: error.message })
    console.error('Student task request failed.', error)
    return sendJson(res, 503, { error: 'Tugas belum dapat dimuat atau disimpan.' })
  }
}
