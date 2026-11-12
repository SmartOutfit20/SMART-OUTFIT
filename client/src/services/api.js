import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('so-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function getProducts(params = {}) {
  const { data } = await api.get('/products', { params })
  return data
}
export async function getCategories() {
  const { data } = await api.get('/categories')
  return data
}
export async function getAdminCategories() {
  const { data } = await api.get('/categories/admin/all')
  return data
}
export async function createProduct(payload) {
  const { data } = await api.post('/products', payload)
  return data
}
export async function updateProduct(id, payload) {
  const { data } = await api.patch(`/products/${id}`, payload)
  return data
}
export async function deleteProduct(id) {
  const { data } = await api.delete(`/products/${id}`)
  return data
}
export async function placeOrder(payload) {
  const { data } = await api.post('/orders', payload)
  return data
}
export async function createCategory(payload) {
  const { data } = await api.post('/categories', payload)
  return data
}
export default api
