const RETURN_WINDOW_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000
const REVIEW_EXPECTED_STATUS = Object.freeze({ approved: 'requested', rejected: 'requested', received: 'approved' })
function conflict(message) { return Object.assign(new Error(message), { status: 409 }) }
function badRequest(message) { return Object.assign(new Error(message), { status: 400 }) }
export function normalizeReturnRequest(input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const reason = String(body.reason ?? '').replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
  if (reason.length < 10) throw badRequest('Please explain the return reason in at least 10 characters.')
  if (reason.length > 1000) throw badRequest('Return reason must be 1,000 characters or fewer.')
  return { reason }
}
export function normalizeReturnReview(input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const status = String(body.status ?? '').trim()
  if (!Object.hasOwn(REVIEW_EXPECTED_STATUS, status)) throw badRequest('Choose approve, reject or mark received.')
  const note = String(body.note ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
  if (note.length > 500) throw badRequest('Return review note must be 500 characters or fewer.')
  if (status === 'rejected' && note.length < 5) throw badRequest('Add a rejection reason of at least 5 characters so the customer can understand the decision.')
  return { status, note }
}
export function buildReturnReviewCompareAndSetFilter(orderId, requestId, status) {
  const expectedStatus = REVIEW_EXPECTED_STATUS[status]
  if (!expectedStatus) throw badRequest('Invalid return review decision.')
  const filter = {
    _id: orderId,
    returnRequests: { $elemMatch: { _id: requestId, status: expectedStatus } }
  }
  if (status === 'received') filter.status = 'delivered'
  return filter
}
export function buildReturnReviewUpdate({ status, note = '', reviewerId, now = new Date() }) {
  const normalized = normalizeReturnReview({ status, note })
  const update = { $set: {
    'returnRequests.$.status': normalized.status,
    'returnRequests.$.reviewedAt': now,
    'returnRequests.$.reviewedBy': reviewerId,
    'returnRequests.$.adminNote': normalized.note
  } }
  if (normalized.status === 'received') {
    update.$set.status = 'returned'
    update.$push = { statusHistory: {
      status: 'returned',
      note: 'Returned item(s) received and checked by the store.',
      createdAt: now
    } }
  }
  return update
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
