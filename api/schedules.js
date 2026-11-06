import {
  callSupabaseRpc,
  getSupabaseConfig,
  parseRequestBody,
  RequestError,
  requireAdmin,
  requireSameOrigin,
  sendJson,
  supabaseRequest,
  validateSchedulePayload,
} from '../server/api.js'

const SCHEDULE_QUERY = 'course_schedules?select=id,day,start_time,end_time,course_code,name,lecturer,room,class_group,color,credits&order=day_order.asc,start_time.asc'

function toSchedule(row) {
  return {
    id: row.id,
    day: row.day,
    start: row.start_time.slice(0, 5),
    end: row.end_time.slice(0, 5),
    code: row.course_code,
    name: row.name,
    lecturer: row.lecturer,
    room: row.room,
    group: row.class_group,
    color: row.color,
    credits: row.credits,
  }
}

function returnError(res, error) {
  if (error instanceof RequestError) {
    return sendJson(res, error.status, {
      error: error.message,
      ...(error.details ? { conflicts: error.details } : {}),
    })
  }
  console.error('Schedule API request failed.', error)
  return sendJson(res, 503, { error: 'Jadwal belum dapat diakses. Periksa konfigurasi server.' })
}

function sendMutationResult(res, result, status) {
  if (result?.error === 'conflict') {
    return sendJson(res, 409, {
      error: 'Jadwal berbenturan dengan mata kuliah lain.',
      conflicts: result.conflicts,
    })
  }
  if (result?.error === 'not_found') {
    return sendJson(res, 404, { error: 'Mata kuliah tidak ditemukan.' })
  }
  if (!result?.schedule) {
    throw new Error('Supabase schedule mutation returned an invalid response.')
  }
  return sendJson(res, status, result.schedule)
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const supabase = getSupabaseConfig()
      const data = await supabaseRequest(supabase, SCHEDULE_QUERY)
      if (!Array.isArray(data)) throw new Error('Supabase returned an invalid schedule collection.')
      return sendJson(res, 200, data.map(toSchedule))
    }

    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST, PUT, DELETE')
      return sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
    }
    requireSameOrigin(req)
    if (!requireAdmin(req, res)) return
    const supabase = getSupabaseConfig()

    if (req.method === 'DELETE') {
      const id = Number(new URL(req.url, 'https://local.invalid').searchParams.get('id'))
      if (!Number.isSafeInteger(id) || id < 1) throw new RequestError(400, 'ID mata kuliah tidak valid.')
      const result = await callSupabaseRpc(supabase, 'mutate_course_schedule', {
        p_action: 'delete',
        p_schedule: { id },
        p_allow_conflicts: false,
      })
      if (result?.deleted === true) return sendJson(res, 200, { deleted: true })
      return sendMutationResult(res, result, 200)
    }

    const body = parseRequestBody(req)
    const schedule = validateSchedulePayload(body, { creating: req.method === 'POST' })
    const result = await callSupabaseRpc(supabase, 'mutate_course_schedule', {
      p_action: req.method === 'POST' ? 'create' : 'update',
      p_schedule: schedule,
      p_allow_conflicts: body.allowConflicts === true,
    })
    return sendMutationResult(res, result, req.method === 'POST' ? 201 : 200)
  } catch (error) {
    return returnError(res, error)
  }
}
