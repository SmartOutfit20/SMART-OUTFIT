export function calculateRefundPlan(order, amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    const error = new Error('Enter a valid refund amount greater than zero.');
    error.status = 400;
    throw error;
  }
  if (!order || order.status !== 'returned') {
    const error = new Error('Returned order not found.');
    error.status = 404;
    throw error;
  }
  if (!['paid', 'partially_refunded'].includes(order.paymentStatus)) {
    const error = new Error('This order has no verified payment available to refund.');
    error.status = 409;
    throw error;
  }

  const paidAmount = Number(order.advancePaymentAmount) > 0
    ? Number(order.advancePaymentAmount)
    : Number(order.total || 0);
  const refundedSoFar = Number(order.refundAmount || 0);
  if (!Number.isFinite(paidAmount) || paidAmount <= 0 || !Number.isFinite(refundedSoFar) || refundedSoFar < 0) {
    const error = new Error('The order payment totals are invalid. Review the order before recording a refund.');
    error.status = 409;
    throw error;
  }
  if (refundedSoFar + value > paidAmount + 0.01) {
    const error = new Error('Refund amount exceeds the verified amount received for this order.');
    error.status = 400;
    throw error;
  }

  const nextRefundAmount = Number((refundedSoFar + value).toFixed(2));
  return {
    paidAmount,
    refundedSoFar,
    nextRefundAmount,
    paymentStatus: nextRefundAmount + 0.01 >= paidAmount ? 'refunded' : 'partially_refunded'
  };
}

export function buildRefundCompareAndSetFilter(order, reference) {
  const refundedSoFar = Number(order.refundAmount || 0);
  return {
    _id: order._id,
    status: 'returned',
    paymentStatus: { $in: ['paid', 'partially_refunded'] },
    $and: [
      refundedSoFar === 0
        ? { $or: [{ refundAmount: 0 }, { refundAmount: { $exists: false } }] }
        : { refundAmount: refundedSoFar },
      { 'refunds.reference': { $ne: reference } }
    ]
  };
}
