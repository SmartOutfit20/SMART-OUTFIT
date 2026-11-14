const bdPhone = /^01[3-9]\d{8}$/
const mongoId = /^[a-f0-9]{24}$/i

export function normalizeDeliveryAddress(input = {}) {
  return {
    name: String(input?.name || '').trim(),
    phone: String(input?.phone || '').trim(),
    division: String(input?.division || '').trim(),
    district: String(input?.district || '').trim(),
    upazila: String(input?.upazila || '').trim(),
    address: String(input?.address || '').trim()
  }
}

export function isValidBangladeshPhone(value) {
  return bdPhone.test(String(value || '').trim())
}

export function deliveryAddressError(address) {
  if (!address?.name || !isValidBangladeshPhone(address.phone) || !address.division || !address.district || !address.upazila || address.address.length < 8) {
    return 'Complete your name, valid Bangladesh phone, division, district, upazila and full address.'
  }
  return ''
}

export function normalizeRequestedItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 30) {
    throw Object.assign(new Error('Your cart is empty or contains too many items.'), { status: 400 })
  }

  const grouped = new Map()
  for (const line of items) {
    const productId = String(line?.productId || '').trim().toLowerCase()
    const quantity = Number(line?.quantity)
    const size = String(line?.size || '').trim().slice(0, 40)
    const color = String(line?.color || '').trim().slice(0, 40)
    if (!mongoId.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      throw Object.assign(new Error('Invalid cart item or quantity.'), { status: 400 })
    }
    const key = JSON.stringify([productId, size.toLowerCase(), color.toLowerCase()])
    const existing = grouped.get(key)
    const combinedQuantity = (existing?.quantity || 0) + quantity
    if (combinedQuantity > 20) {
      throw Object.assign(new Error('A product variant cannot exceed 20 items per order.'), { status: 400 })
    }
    grouped.set(key, { productId, quantity: combinedQuantity, size: existing?.size || size, color: existing?.color || color })
  }
  return [...grouped.values()]
}

export function calculateCouponDiscount(subtotal, coupon) {
  const amount = Number(subtotal)
  const value = Number(coupon?.value)
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(value) || value <= 0) return 0
  if (coupon.type === 'percentage') return Math.min(amount, Math.floor(amount * Math.min(value, 100) / 100))
  if (coupon.type === 'fixed') return Math.min(amount, Math.floor(value))
  return 0
}

export function calculateDeliveryCharge(subtotal, configuredCharge, freeShippingThreshold) {
  const amount = Number(subtotal)
  const charge = Number(configuredCharge)
  const threshold = Number(freeShippingThreshold)
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(charge) || charge < 0 || !Number.isFinite(threshold)) {
    throw Object.assign(new Error('Delivery settings are invalid. Please contact the store.'), { status: 503 })
  }
  return threshold > 0 && amount >= threshold ? 0 : charge
}
