const ORDER_STATUS_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['confirmed', 'cancelled']),
  confirmed: Object.freeze(['processing', 'cancelled']),
  processing: Object.freeze(['shipped', 'cancelled']),
  shipped: Object.freeze(['delivered']),
  delivered: Object.freeze([]),
  cancelled: Object.freeze([]),
  returned: Object.freeze([])
})

export function getAllowedOrderStatusTransitions(currentStatus, paymentStatus = 'unpaid') {
  const current = String(currentStatus || '')
  const allowed = ORDER_STATUS_TRANSITIONS[current] || []
  // Orders awaiting manual bKash/Nagad verification cannot enter fulfilment.
  if (paymentStatus === 'pending') return allowed.filter(status => status === 'cancelled')
  return [...allowed]
}

export function isOrderStatusTransitionAllowed(currentStatus, nextStatus, paymentStatus = 'unpaid') {
  return getAllowedOrderStatusTransitions(currentStatus, paymentStatus).includes(String(nextStatus || ''))
}

export function getOrderStatusTransitionMessage(currentStatus, nextStatus) {
  const current = String(currentStatus || 'unknown')
  const next = String(nextStatus || 'unknown')
  return `Order status cannot move from "${current}" to "${next}". Follow the next available fulfilment step.`
}
