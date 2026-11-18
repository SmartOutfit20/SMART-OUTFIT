const RETURN_WINDOW_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000
function conflict(message) { return Object.assign(new Error(message), { status: 409 }) }
function badRequest(message) { return Object.assign(new Error(message), { status: 400 }) }
export function normalizeReturnRequest(input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const reason = String(body.reason ?? '').replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
  if (reason.length < 10) throw badRequest('Please explain the return reason in at least 10 characters.')
  if (reason.length > 1000) throw badRequest('Return reason must be 1,000 characters or fewer.')
  return { reason }
}
export function assessReturnEligibility(order, now = new Date(), returnWindowDays = RETURN_WINDOW_DAYS) {
  if (!order || order.status !== 'delivered') throw conflict('Only delivered orders can be submitted for return.')
  if (!['paid', 'partially_refunded'].includes(order.paymentStatus)) throw conflict('This order does not have a verified payment record for return processing.')
  const deliveredEntries = (Array.isArray(order.statusHistory) ? order.statusHistory : []).filter(entry => entry?.status === 'delivered' && entry.createdAt).map(entry => new Date(entry.createdAt)).filter(date => Number.isFinite(date.getTime())).sort((a, b) => b - a)
  const deliveredAt = deliveredEntries[0]
  if (!deliveredAt) throw conflict('The delivery date is missing from this order. Please contact customer support.')
  const days = Number(returnWindowDays)
  if (!Number.isInteger(days) || days < 1 || days > 30) throw new Error('Return window configuration must be between 1 and 30 days.')
  const expiresAt = new Date(deliveredAt.getTime() + days * DAY_MS)
  const current = new Date(now)
  if (!Number.isFinite(current.getTime()) || current < deliveredAt) throw conflict('The delivery date is not valid for return processing.')
  if (current > expiresAt) throw conflict('The 7-day return request window has expired.')
  if ((Array.isArray(order.returnRequests) ? order.returnRequests : []).some(request => ['requested', 'approved', 'received'].includes(request?.status))) throw conflict('A return request is already active for this order.')
  return { deliveredAt, expiresAt, returnWindowDays: days }
}
export { RETURN_WINDOW_DAYS }
