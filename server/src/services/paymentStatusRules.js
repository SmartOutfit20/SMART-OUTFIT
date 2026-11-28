const VERIFIED_ADVANCE_STATUSES = new Set(['partially_paid', 'paid', 'partially_refunded', 'refunded'])

export function getAdvancePaymentApprovalStatus(decision) {
  if (decision === 'approve') return 'partially_paid'
  if (decision === 'reject') return 'failed'
  throw Object.assign(new Error('Choose approve or reject.'), { status: 400 })
}

export function hasVerifiedAdvancePayment(order) {
  const amount = Number(order?.advancePaymentAmount)
  return Number.isFinite(amount) && amount > 0 && VERIFIED_ADVANCE_STATUSES.has(String(order?.paymentStatus || ''))
}

export function getPaymentStatusAfterDelivery(order) {
  const current = String(order?.paymentStatus || 'unpaid')
  if (order?.paymentMethod !== 'cod') return current
  return ['unpaid', 'partially_paid'].includes(current) ? 'paid' : current
}
