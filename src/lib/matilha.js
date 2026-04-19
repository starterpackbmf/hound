// Typed fetchers for the Matilha diário API via our /api/matilha proxy.

const BASE = '/api/matilha'

async function get(params) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}?${qs}`)
  if (!res.ok) throw new Error(`Matilha API ${res.status}`)
  return res.json()
}

export const matilha = {
  students: () => get({ resource: 'students' }),
  student: (id) => get({ resource: 'student', id }),
  trades: (studentId, from, to) => get({ resource: 'trades', student_id: studentId, ...(from && { from }), ...(to && { to }) }),
  summary: (studentId, from, to) => get({ resource: 'summary', student_id: studentId, ...(from && { from }), ...(to && { to }) }),
  daySummaries: (studentId, from, to) => get({ resource: 'day-summaries', student_id: studentId, ...(from && { from }), ...(to && { to }) }),
}
