const httpError = (message, status = 400) => Object.assign(new Error(message), { status })

export function normalizeReviewInput(body = {}) {
  const rating = Number(body.rating)
  const comment = typeof body.comment === 'string' ? body.comment.trim() : ''
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw httpError('Choose a rating from 1 to 5 stars.')
  }
  if (comment.length < 10 || comment.length > 1000) {
    throw httpError('Review comments must be 10–1,000 characters.')
  }
  return { rating, comment }
}

function productIdOf(value) {
  return String(value?._id || value || '')
}

function reservedReturnQuantity(order, orderItemIndex) {
  return (order.returnRequests || [])
    .filter(request => ['requested', 'approved', 'received'].includes(request.status))
    .reduce((total, request) => total + (request.items || [])
      .filter(item => Number(item.orderItemIndex) === orderItemIndex)
      .reduce((quantity, item) => quantity + Math.max(0, Number(item.quantity) || 0), 0), 0)
}

export function hasReviewablePurchase(orders, productId) {
  const target = String(productId || '')
  if (!target) return false
  return (orders || []).some(order => {
    if (!['delivered', 'partially_returned'].includes(order.status) || order.paymentStatus !== 'paid') return false
    return (order.items || []).some((item, index) => {
      if (productIdOf(item.product) !== target) return false
      const ordered = Math.max(0, Number(item.quantity) || 0)
      return ordered > reservedReturnQuantity(order, index)
    })
  })
}

export function buildReviewEligibility({ orders = [], productId, alreadyReviewed = false } = {}) {
  return {
    eligible: !alreadyReviewed && hasReviewablePurchase(orders, productId),
    alreadyReviewed: Boolean(alreadyReviewed)
  }
}
