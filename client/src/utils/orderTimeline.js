export const ORDER_STATUS_LABELS = Object.freeze({
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  partially_returned: 'Partially returned',
  cancelled: 'Cancelled',
  returned: 'Returned'
})

export const ORDER_HISTORY_LABELS = Object.freeze({
  ...ORDER_STATUS_LABELS,
  return_requested: 'Return requested · রিটার্ন অনুরোধ'
})

export const RETURN_REQUEST_STATUS_LABELS = Object.freeze({
  requested: 'Under review · পর্যালোচনাধীন',
  approved: 'Approved · অনুমোদিত',
  rejected: 'Not approved · অনুমোদিত হয়নি',
  received: 'Items received · পণ্য গ্রহণ করা হয়েছে'
})

function timestamp(value) {
  const parsed = new Date(value || 0).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function sortEntries(entries, field, direction) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const difference = (timestamp(a.entry?.[field]) - timestamp(b.entry?.[field])) * direction
      return difference || a.index - b.index
    })
    .map(({ entry }) => entry)
}

export function getSortedOrderHistory(order) {
  return sortEntries(order?.statusHistory, 'createdAt', 1)
}

export function getSortedReturnRequests(order) {
  return sortEntries(order?.returnRequests, 'requestedAt', 1)
}

export function getSortedRefunds(order) {
  return sortEntries(order?.refunds, 'processedAt', -1)
}

export function getRefundTotal(refunds) {
  const total = (Array.isArray(refunds) ? refunds : []).reduce((sum, refund) => {
    const amount = Number(refund?.amount)
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum
  }, 0)
  return Number(total.toFixed(2))
}
