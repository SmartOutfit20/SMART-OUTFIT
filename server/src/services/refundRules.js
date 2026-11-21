export function getReturnRefundableAmount(order) {
  const items = Array.isArray(order?.items) ? order.items : []
  const fallbackSubtotal = items.reduce((sum, item) => sum + Math.max(0, Number(item.unitPrice) || 0) * Math.max(0, Number(item.quantity) || 0), 0)
  const subtotalValue = Number(order?.subtotal)
  const subtotal = Number.isFinite(subtotalValue) && subtotalValue >= 0 ? subtotalValue : fallbackSubtotal
  const requests = Array.isArray(order?.returnRequests) ? order.returnRequests : []
  let returnedGross = 0
  let legacyFullReturn = false
  for (const request of requests) {
    if (request?.status !== 'received') continue
    const returnedItems = Array.isArray(request.items) ? request.items : []
    if (!returnedItems.length) {
      legacyFullReturn = true
      break
    }
    for (const item of returnedItems) {
      const quantity = Math.max(0, Number(item.quantity) || 0)
      const unitPrice = Number(item.unitPrice ?? items[Number(item.orderItemIndex)]?.unitPrice)
      if (Number.isFinite(unitPrice) && unitPrice >= 0) returnedGross += unitPrice * quantity
    }
  }
  // Legacy returned orders without item snapshots are conservatively treated as full returns.
  if (legacyFullReturn || (!requests.length && order?.status === 'returned')) returnedGross = subtotal
  const cappedGross = Math.min(subtotal, returnedGross)
  const discount = Math.max(0, Number(order?.discount) || 0)
  const discountShare = subtotal > 0 ? Math.min(cappedGross, cappedGross * Math.min(discount, subtotal) / subtotal) : 0
  return Math.max(0, Math.round((cappedGross - discountShare) * 100) / 100)
}

export function calculateRefundPlan(order, amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) {
    const error = new Error('Enter a valid refund amount greater than zero.')
    error.status = 400
    throw error
  }
  if (!order || !['partially_returned', 'returned'].includes(order.status)) {
    const error = new Error('Refunds are available only after the store receives returned items.')
    error.status = 404
    throw error
  }
  if (!['paid', 'partially_refunded'].includes(order.paymentStatus)) {
    const error = new Error('This order has no verified payment available to refund.')
    error.status = 409
    throw error
  }

  const paidAmount = Number(order.total || 0)
  const refundableAmount = Math.min(paidAmount, getReturnRefundableAmount(order))
  const refundedSoFar = Number(order.refundAmount || 0)
  if (!Number.isFinite(paidAmount) || paidAmount <= 0 || !Number.isFinite(refundedSoFar) || refundedSoFar < 0 || !Number.isFinite(refundableAmount) || refundableAmount <= 0) {
    const error = new Error('The received return items do not have a valid refundable amount. Review the order before recording a refund.')
    error.status = 409
    throw error
  }
  if (refundedSoFar + value > refundableAmount + 0.01) {
    const error = new Error('Refund amount exceeds the net item value received for return after discount.')
    error.status = 400
    throw error
  }

  const nextRefundAmount = Number((refundedSoFar + value).toFixed(2))
  const fullyRefunded = order.status === 'returned' && nextRefundAmount + 0.01 >= refundableAmount
  return {
    paidAmount,
    refundableAmount,
    refundedSoFar,
    nextRefundAmount,
    paymentStatus: fullyRefunded ? 'refunded' : 'partially_refunded'
  }
}

export function buildRefundCompareAndSetFilter(order, reference) {
  const refundedSoFar = Number(order.refundAmount || 0)
  return {
    _id: order._id,
    status: { $in: ['partially_returned', 'returned'] },
    paymentStatus: { $in: ['paid', 'partially_refunded'] },
    $and: [
      refundedSoFar === 0
        ? { $or: [{ refundAmount: 0 }, { refundAmount: { $exists: false } }] }
        : { refundAmount: refundedSoFar },
      { 'refunds.reference': { $ne: reference } }
    ]
  }
}
