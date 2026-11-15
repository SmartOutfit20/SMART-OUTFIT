// Server-enforced permissions for staff roles. The UI never defines authority.
const ROLE_PERMISSIONS = Object.freeze({
  super_admin: Object.freeze(['*']),
  admin: Object.freeze([
    'products.read','products.write','inventory.read','inventory.write',
    'categories.read','categories.write','coupons.read','coupons.write',
    'orders.read','orders.update','orders.verify_payment',
    'customers.read','customers.manage','reports.read','analytics.read',
    'support.read','support.manage','delivery.read','delivery.manage',
    'settings.read','settings.manage'
  ]),
  editor: Object.freeze([
    'products.read','products.write','inventory.read',
    'categories.read','categories.write','coupons.read','coupons.write'
  ]),
  support: Object.freeze([
    'orders.read','orders.update','customers.read','support.read','support.manage'
  ]),
  viewer: Object.freeze([
    'products.read','inventory.read','categories.read','coupons.read',
    'orders.read','customers.read','reports.read','analytics.read',
    'support.read','delivery.read','settings.read'
  ])
});

export function hasPermission(role, permission) {
  if (typeof permission !== 'string' || !permission.trim()) return false;
  const granted = ROLE_PERMISSIONS[role];
  return Boolean(granted && (granted.includes('*') || granted.includes(permission)));
}

export function getRolePermissions(role) {
  return [...(ROLE_PERMISSIONS[role] || [])];
}
