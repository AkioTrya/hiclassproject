import assert from 'node:assert/strict'
import test from 'node:test'
import createStudentAccountHandler from '../api/admin/students.js'
import studentBooksHandler from '../api/student/books.js'
import studentLoginHandler from '../api/student/login.js'
import studentTasksHandler from '../api/student/tasks.js'
import {
  createSessionToken,
  createStudentSessionToken,
  hashStudentPassword,
} from './api.js'

const sessionSecret = 'student-session-secret-0123456789abcdef'
const account = { id: 42, username: 'student42' }
const taskId = '8b5a7a5d-ef36-4ed1-b915-9504bb2f0468'

function withEnvironment(values, callback) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]))
  for (const [key, value] of Object.entries(values)) process.env[key] = value
  return Promise.resolve()
    .then(callback)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    })
}

async function invoke(handler, { method = 'GET', path = '/', body, cookie = '', origin = '' } = {}) {
  const headers = {
    host: 'localhost:5173',
    ...(cookie ? { cookie } : {}),
    ...(origin ? { origin } : {}),
  }
  const responseHeaders = {}
  const response = {
    statusCode: 0,
    setHeader(name, value) { responseHeaders[name] = value },
    end(value) { this.body = value },
  }
  await handler({
    method,
    url: path,
    body,
    headers,
    socket: { remoteAddress: '127.0.0.1' },
  }, response)
  return {
    status: response.statusCode,
    headers: responseHeaders,
    body: response.body ? JSON.parse(response.body) : null,
  }
}

function studentCookie(id = account.id, username = account.username) {
  const token = createStudentSessionToken({ id, username }, sessionSecret)
  return `k7a_student=${encodeURIComponent(token)}`
}

test('admin-created student accounts store normalized usernames and password hashes only', async () => {
  const previousFetch = globalThis.fetch
  let inserted
  globalThis.fetch = async (url, options) => {
    inserted = JSON.parse(options.body)
    return new Response(JSON.stringify([{ id: 42, username: inserted.username, created_at: '2026-11-06T00:00:00Z' }]), { status: 201 })
  }
  try {
    await withEnvironment({
      SUPABASE_URL: 'https://project-ref.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'server-only-key',
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD: 'a-unique-admin-password',
      SESSION_SECRET: sessionSecret,
    }, async () => {
      const adminToken = createSessionToken('admin', sessionSecret)
      const response = await invoke(createStudentAccountHandler, {
        method: 'POST',
        path: '/api/admin/students',
        origin: 'http://localhost:5173',
        cookie: `wangsa_admin=${encodeURIComponent(adminToken)}`,
        body: { username: ' New.Student ', password: 'a-strong-password-123' },
      })
      assert.equal(response.status, 201)
      assert.equal(response.body.username, 'new.student')
      assert.equal(inserted.username, 'new.student')
      assert.match(inserted.password_hash, /^scrypt\$16384\$/u)
      assert.equal(inserted.password_hash.includes('a-strong-password-123'), false)
      assert.equal('password_hash' in response.body, false)
    })
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('student login verifies the stored hash and issues an HTTP-only student session', async () => {
  const previousFetch = globalThis.fetch
  const passwordHash = await hashStudentPassword('a-student-password-123')
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options })
    if (String(url).includes('/rpc/is_admin_login_locked')) return new Response('false', { status: 200 })
    if (String(url).includes('/rpc/clear_admin_login_failures')) return new Response(null, { status: 204 })
    return new Response(JSON.stringify([{ id: account.id, username: account.username, password_hash: passwordHash }]), { status: 200 })
  }
  try {
    await withEnvironment({
      SUPABASE_URL: 'https://project-ref.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'server-only-key',
      SESSION_SECRET: sessionSecret,
    }, async () => {
      const response = await invoke(studentLoginHandler, {
        method: 'POST',
        path: '/api/student/login',
        origin: 'http://localhost:5173',
        body: { username: 'STUDENT42', password: 'a-student-password-123' },
      })
      assert.equal(response.status, 200)
      assert.deepEqual(response.body.student, account)
      assert.match(response.headers['Set-Cookie'], /k7a_student=.*HttpOnly.*SameSite=Strict/u)
      assert.equal(calls.length, 3)
    })
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('task reads and writes are always constrained to the signed-in student', async () => {
  const previousFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options })
    if (options.method === 'POST') {
      const inserted = JSON.parse(options.body)
      return new Response(JSON.stringify([{
        id: taskId,
        ...inserted,
        due_date: inserted.due_date,
        created_at: '2026-11-06T00:00:00Z',
      }]), { status: 201 })
    }
    if (options.method === 'PATCH') {
      return new Response(JSON.stringify([{
        id: taskId,
        title: 'Tugas',
        course_name: null,
        due_date: null,
        completed: true,
        created_at: '2026-11-06T00:00:00Z',
      }]), { status: 200 })
    }
    return new Response(JSON.stringify([{
      id: taskId,
      title: 'Tugas',
      course_name: null,
      due_date: null,
      completed: false,
      created_at: '2026-11-06T00:00:00Z',
    }]), { status: 200 })
  }
  try {
    await withEnvironment({
      SUPABASE_URL: 'https://project-ref.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'server-only-key',
      SESSION_SECRET: sessionSecret,
    }, async () => {
      const cookie = studentCookie()
      const read = await invoke(studentTasksHandler, { path: '/api/student/tasks', cookie })
      assert.equal(read.status, 200)
      assert.match(calls[0].url, /user_id=eq\.42/u)

      const created = await invoke(studentTasksHandler, {
        method: 'POST',
        path: '/api/student/tasks',
        cookie,
        origin: 'http://localhost:5173',
        body: { title: '  Tugas  ', user_id: 999 },
      })
      assert.equal(created.status, 201)
      assert.equal(JSON.parse(calls[1].options.body).user_id, account.id)
      assert.equal(JSON.parse(calls[1].options.body).title, 'Tugas')

      const updated = await invoke(studentTasksHandler, {
        method: 'PATCH',
        path: `/api/student/tasks?id=${taskId}`,
        cookie,
        origin: 'http://localhost:5173',
        body: { completed: true },
      })
      assert.equal(updated.body.completed, true)
      assert.match(calls[2].url, /user_id=eq\.42/u)
    })
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('ebook URLs reject unsafe schemes and student reads remain owner-scoped', async () => {
  const previousFetch = globalThis.fetch
  let requestedUrl = ''
  globalThis.fetch = async (url) => {
    requestedUrl = String(url)
    return new Response(JSON.stringify([]), { status: 200 })
  }
  try {
    await withEnvironment({
      SUPABASE_URL: 'https://project-ref.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'server-only-key',
      SESSION_SECRET: sessionSecret,
    }, async () => {
      const read = await invoke(studentBooksHandler, {
        path: '/api/student/books',
        cookie: studentCookie(),
      })
      assert.equal(read.status, 200)
      assert.match(requestedUrl, /user_id=eq\.42/u)

      const unsafe = await invoke(studentBooksHandler, {
        method: 'POST',
        path: '/api/student/books',
        cookie: studentCookie(),
        origin: 'http://localhost:5173',
        body: { title: 'Unsafe', url: 'javascript:alert(1)' },
      })
      assert.equal(unsafe.status, 400)
    })
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('student task and ebook endpoints reject requests without a student session', async () => {
  const taskResponse = await invoke(studentTasksHandler, { path: '/api/student/tasks' })
  const bookResponse = await invoke(studentBooksHandler, { path: '/api/student/books' })
  assert.equal(taskResponse.status, 401)
  assert.equal(bookResponse.status, 401)
})
