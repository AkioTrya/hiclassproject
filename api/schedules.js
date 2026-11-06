import {
  findScheduleConflicts,
  getDatabase,
  parseRequestBody,
  RequestError,
  requireAdmin,
  requireSameOrigin,
  sendJson,
  validateSchedulePayload,
} from '../server/api.js'

async function listSchedules(sql) {
  return sql`
    SELECT id, day, to_char(start_time, 'HH24:MI') AS start,
      to_char(end_time, 'HH24:MI') AS end, course_code AS code,
      name, lecturer, room, class_group AS "group", color, credits
    FROM course_schedules
    ORDER BY CASE day
      WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3
      WHEN 'Kamis' THEN 4 WHEN 'Jumat' THEN 5 WHEN 'Sabtu' THEN 6
      ELSE 7 END, start_time
  `
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

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const sql = getDatabase()
      return sendJson(res, 200, await listSchedules(sql))
    }
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST, PUT, DELETE')
      return sendJson(res, 405, { error: 'Metode tidak diizinkan.' })
    }
    requireSameOrigin(req)
    if (!requireAdmin(req, res)) return
    const sql = getDatabase()

    if (req.method === 'DELETE') {
      const id = Number(new URL(req.url, 'https://local.invalid').searchParams.get('id'))
      if (!Number.isSafeInteger(id) || id < 1) throw new RequestError(400, 'ID mata kuliah tidak valid.')
      const deleted = await sql`
        WITH removed AS (
          DELETE FROM course_schedules WHERE id = ${id} RETURNING *
        ), logged AS (
          INSERT INTO admin_audit_log (action, schedule_id, schedule_data)
          SELECT 'delete', id, to_jsonb(removed) FROM removed
          RETURNING id
        )
        SELECT id FROM removed
      `
      if (deleted.length === 0) throw new RequestError(404, 'Mata kuliah tidak ditemukan.')
      return sendJson(res, 200, { deleted: true })
    }

    const body = parseRequestBody(req)
    const schedule = validateSchedulePayload(body, { creating: req.method === 'POST' })
    const existing = await listSchedules(sql)
    const conflicts = findScheduleConflicts(existing, schedule)
    if (conflicts.length && body.allowConflicts !== true) {
      throw new RequestError(409, 'Jadwal berbenturan dengan mata kuliah lain.', conflicts)
    }

    if (req.method === 'POST') {
      const rows = await sql`
        WITH saved AS (
          INSERT INTO course_schedules
            (day, start_time, end_time, course_code, name, lecturer, room, class_group, color, credits)
          VALUES
            (${schedule.day}, ${schedule.start}, ${schedule.end}, ${schedule.code}, ${schedule.name},
              ${schedule.lecturer}, ${schedule.room}, ${schedule.group}, ${schedule.color}, ${schedule.credits})
          RETURNING *
        ), logged AS (
          INSERT INTO admin_audit_log (action, schedule_id, schedule_data)
          SELECT 'create', id, to_jsonb(saved) FROM saved
          RETURNING id
        )
        SELECT id, day, to_char(start_time, 'HH24:MI') AS start,
          to_char(end_time, 'HH24:MI') AS end, course_code AS code,
          name, lecturer, room, class_group AS "group", color, credits
        FROM saved
      `
      return sendJson(res, 201, rows[0])
    }

    const rows = await sql`
      WITH saved AS (
        UPDATE course_schedules SET
          day = ${schedule.day},
          start_time = ${schedule.start},
          end_time = ${schedule.end},
          course_code = ${schedule.code},
          name = ${schedule.name},
          lecturer = ${schedule.lecturer},
          room = ${schedule.room},
          class_group = ${schedule.group},
          color = ${schedule.color},
          credits = ${schedule.credits},
          updated_at = now()
        WHERE id = ${schedule.id}
        RETURNING *
      ), logged AS (
        INSERT INTO admin_audit_log (action, schedule_id, schedule_data)
        SELECT 'update', id, to_jsonb(saved) FROM saved
        RETURNING id
      )
      SELECT id, day, to_char(start_time, 'HH24:MI') AS start,
        to_char(end_time, 'HH24:MI') AS end, course_code AS code,
        name, lecturer, room, class_group AS "group", color, credits
      FROM saved
    `
    if (rows.length === 0) throw new RequestError(404, 'Mata kuliah tidak ditemukan.')
    return sendJson(res, 200, rows[0])
  } catch (error) {
    return returnError(res, error)
  }
}
