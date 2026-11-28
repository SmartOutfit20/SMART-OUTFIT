const LABELS = {
  unpaid: 'Unpaid · Cash on Delivery',
  pending: 'Advance payment awaiting verification',
  partially_paid: 'Advance verified · COD balance due',
  paid: 'Paid',
  failed: 'Advance payment rejected',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded'
}

export function getPaymentStatusLabel(orderOrStatus) {
  const order = orderOrStatus && typeof orderOrStatus === 'object'
    ? orderOrStatus
    : { paymentStatus: orderOrStatus }
  const status = String(order.paymentStatus || 'unpaid')
  const hasAdvance = Number(order.advancePaymentAmount) > 0
  const isCod = !order.paymentMethod || order.paymentMethod === 'cod'
  const isDelivered = ['delivered', 'partially_returned', 'returned'].includes(order.status)
  // Older orders stored an approved delivery-fee advance as fully paid. Explain
  // the outstanding COD balance until delivery without rewriting historical data.
  if (hasAdvance && isCod && !isDelivered && ['partially_paid', 'paid'].includes(status)) {
    return 'Advance verified · COD balance due'
  }
  return LABELS[status] || status
}
