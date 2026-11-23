const RETURN_WINDOW_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000
const REVIEW_EXPECTED_STATUS = Object.freeze({ approved: 'requested', rejected: 'requested', received: 'approved' })
const ACTIVE_RETURN_STATUSES = new Set(['requested', 'approved'])
const RESERVED_RETURN_STATUSES = new Set(['requested', 'approved', 'received'])
const GENERIC_ORDER_STATUSES = new Set(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])

export function isGenericOrderStatusAllowed(status) {
  return GENERIC_ORDER_STATUSES.has(status)
}

function conflict(message) { return Object.assign(new Error(message), { status: 409 }) }
function badRequest(message) { return Object.assign(new Error(message), { status: 400 }) }

export function normalizeReturnRequest(input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const reason = String(body.reason ?? '').replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
  if (reason.length < 10) throw badRequest('Please explain the return reason in at least 10 characters.')
  if (reason.length > 1000) throw badRequest('Return reason must be 1,000 characters or fewer.')
  return { reason }
}

export function normalizeReturnItems(input, order) {
  const orderItems = Array.isArray(order?.items) ? order.items : []
  if (!Array.isArray(input) || input.length < 1 || input.length > orderItems.length) {
    throw badRequest('Select at least one item and quantity to return.')
  }

  const alreadyReserved = new Map()
  for (const request of Array.isArray(order?.returnRequests) ? order.returnRequests : []) {
    if (!RESERVED_RETURN_STATUSES.has(request?.status)) continue
    const requestItems = Array.isArray(request.items) ? request.items : []
    // Older return requests predate item-level selection and are treated as full-order returns.
    if (!requestItems.length) {
      orderItems.forEach((line, index) => alreadyReserved.set(index, Number(line.quantity || 0)))
      continue
    }
    for (const item of requestItems) {
      const index = Number(item?.orderItemIndex)
      if (Number.isInteger(index) && index >= 0 && index < orderItems.length) {
        alreadyReserved.set(index, (alreadyReserved.get(index) || 0) + Math.max(0, Number(item.quantity) || 0))
      }
    }
  }

  const seen = new Set()
  const normalized = []
  for (const raw of input) {
    const index = Number(raw?.orderItemIndex)
    const quantity = Number(raw?.quantity)
    if (!Number.isInteger(index) || index < 0 || index >= orderItems.length || !Number.isInteger(quantity) || quantity < 1) {
      throw badRequest('Choose a valid ordered item and a whole-number return quantity.')
    }
    if (seen.has(index)) throw badRequest('Choose each order item only once.')
    seen.add(index)
    const line = orderItems[index]
    const orderedQuantity = Number(line?.quantity || 0)
    const remaining = orderedQuantity - (alreadyReserved.get(index) || 0)
    if (quantity > remaining) {
      throw conflict('The requested return quantity exceeds the remaining quantity for one or more items. Refresh your order and try again.')
    }
    const productId = line.product?._id || line.product || undefined
    normalized.push({
      orderItemIndex: index,
      ...(productId ? { product: productId } : {}),
      name: String(line.name || 'Ordered item').slice(0, 160),
      sku: String(line.sku || '').slice(0, 80),
      quantity,
      size: String(line.size || '').slice(0, 40),
      color: String(line.color || '').slice(0, 40),
      unitPrice: Math.max(0, Number(line.unitPrice) || 0)
    })
  }
  return normalized
}

/**
 * Compare-and-set guard for customer return submissions.
 *
 * A customer may submit another request after a prior partial return has been
 * received. Two requests based on the same order snapshot must not both reserve
 * the same remaining quantities. The order version key makes the reservation
 * update single-winner; legacy orders without a version key are initialized atomically.
 */
export function buildReturnRequestCompareAndSetFilter(order, customerId) {
  if (!order?._id || !customerId) throw badRequest('A valid order and customer are required to submit a return.')
  const filter = {
    _id: order._id,
    customer: customerId,
    status: { $in: ['delivered', 'partially_returned'] },
    returnRequests: { $not: { $elemMatch: { status: { $in: [...ACTIVE_RETURN_STATUSES] } } } }
  }
  const revision = Number(order.returnRequestRevision ?? 0)
  if (!Number.isInteger(revision) || revision < 0) throw badRequest('The return request revision is invalid.')
  if (revision === 0) {
    filter.$or = [{ returnRequestRevision: 0 }, { returnRequestRevision: { $exists: false } }]
  } else {
    filter.returnRequestRevision = revision
  }
  return filter
}

export function buildReturnRequestUpdate({ reason, items, requestedQuantity, now = new Date() }) {
  if (!String(reason || '').trim() || !Array.isArray(items) || !items.length) {
    throw badRequest('A return reason and at least one selected item are required.')
  }
  const quantity = Number(requestedQuantity)
  if (!Number.isInteger(quantity) || quantity < 1) throw badRequest('Return quantity must be a positive whole number.')
  return {
    $push: {
      returnRequests: { reason, items, status: 'requested', requestedAt: now },
      statusHistory: {
        status: 'return_requested',
        note: 'Customer requested return of ' + quantity + ' item(s).',
        createdAt: now
      }
    },
    $inc: { returnRequestRevision: 1 }
  }
}

export function normalizeReturnRestockIndexes(input, requestItems) {
  if (input === undefined || input === null) return []
  if (!Array.isArray(input)) throw badRequest('Choose which received items are safe to return to saleable stock.')
  const allowed = new Set((Array.isArray(requestItems) ? requestItems : []).map(item => Number(item.orderItemIndex)))
  const selected = new Set()
  for (const raw of input) {
    const index = Number(raw)
    if (!Number.isInteger(index) || !allowed.has(index)) throw badRequest('A restock selection does not match this return request.')
    selected.add(index)
  }
  return [...selected]
}

export function calculateReturnProgress(order) {
  const orderItems = Array.isArray(order?.items) ? order.items : []
  const orderedQuantity = orderItems.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0)
  let returnedQuantity = 0
  let legacyFullReturn = false
  for (const request of Array.isArray(order?.returnRequests) ? order.returnRequests : []) {
    if (request?.status !== 'received') continue
    const items = Array.isArray(request.items) ? request.items : []
    if (!items.length) {
      legacyFullReturn = true
      break
    }
    returnedQuantity += items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0)
  }
  if (legacyFullReturn) returnedQuantity = orderedQuantity
  return {
    orderedQuantity,
    returnedQuantity: Math.min(orderedQuantity, returnedQuantity),
    allReturned: orderedQuantity > 0 && returnedQuantity >= orderedQuantity
  }
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
  if (status === 'received') filter.status = { $in: ['delivered', 'partially_returned'] }
  return filter
}

export function buildReturnReviewUpdate({ status, note = '', reviewerId, now = new Date(), orderStatus = 'returned' }) {
  const normalized = normalizeReturnReview({ status, note })
  const update = { $set: {
    'returnRequests.$.status': normalized.status,
    'returnRequests.$.reviewedAt': now,
    'returnRequests.$.reviewedBy': reviewerId,
    'returnRequests.$.adminNote': normalized.note
  } }
  if (normalized.status === 'received') {
    if (!['partially_returned', 'returned'].includes(orderStatus)) throw badRequest('A received return must set a valid returned order status.')
    update.$set.status = orderStatus
    update.$push = { statusHistory: {
      status: orderStatus,
      note: 'Returned item(s) received and checked by the store.',
      createdAt: now
    } }
  }
  return update
}

export function assessReturnEligibility(order, now = new Date(), returnWindowDays = RETURN_WINDOW_DAYS) {
  if (!order || !['delivered', 'partially_returned'].includes(order.status)) {
    throw conflict('Only delivered orders with remaining items can be submitted for return.')
  }
  if (!['paid', 'partially_refunded'].includes(order.paymentStatus)) {
    throw conflict('This order does not have a verified payment record for return processing.')
  }
  const deliveredEntries = (Array.isArray(order.statusHistory) ? order.statusHistory : [])
    .filter(entry => entry?.status === 'delivered' && entry.createdAt)
    .map(entry => new Date(entry.createdAt))
    .filter(date => Number.isFinite(date.getTime()))
    .sort((a, b) => b - a)
  const deliveredAt = deliveredEntries[0]
  if (!deliveredAt) throw conflict('The delivery date is missing from this order. Please contact customer support.')
  const days = Number(returnWindowDays)
  if (!Number.isInteger(days) || days < 1 || days > 30) throw new Error('Return window configuration must be between 1 and 30 days.')
  const expiresAt = new Date(deliveredAt.getTime() + days * DAY_MS)
  const current = new Date(now)
  if (!Number.isFinite(current.getTime()) || current < deliveredAt) throw conflict('The delivery date is not valid for return processing.')
  if (current > expiresAt) throw conflict('The 7-day return request window has expired.')
  if ((Array.isArray(order.returnRequests) ? order.returnRequests : []).some(request => ACTIVE_RETURN_STATUSES.has(request?.status))) {
    throw conflict('A return request is already awaiting store review for this order.')
  }
  return { deliveredAt, expiresAt, returnWindowDays: days }
}

export { RETURN_WINDOW_DAYS }
