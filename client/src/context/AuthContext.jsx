import { createContext, useContext, useMemo, useState } from 'react'
import api from '../services/api'
const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('so-user') || 'null') } catch { return null }
  })
  const [busy, setBusy] = useState(false)
  async function login(identity, password) {
    setBusy(true)
    try {
      const { data } = await api.post('/auth/login', { identity, password })
      localStorage.setItem('so-token', data.token)
      localStorage.setItem('so-user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } finally { setBusy(false) }
  }
  async function googleLogin(credential) {
    setBusy(true)
    try {
      const { data } = await api.post('/auth/google', { credential })
      localStorage.setItem('so-token', data.token)
      localStorage.setItem('so-user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } finally { setBusy(false) }
  }
  async function adminLogin(identity, password) {
    setBusy(true)
    try {
      const { data } = await api.post('/auth/admin-login', { identity, password })
      localStorage.setItem('so-token', data.token)
      localStorage.setItem('so-user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } finally { setBusy(false) }
  }
  async function register(payload) {
    setBusy(true)
    try {
      const { data } = await api.post('/auth/register', payload)
      localStorage.setItem('so-token', data.token)
      localStorage.setItem('so-user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } finally { setBusy(false) }
  }
  function setProfile(next) { setUser(next); localStorage.setItem('so-user', JSON.stringify(next)) }
  function logout() {
    localStorage.removeItem('so-token')
    localStorage.removeItem('so-user')
    setUser(null)
  }
  const value = useMemo(() => ({ user, busy, login, googleLogin, adminLogin, register, setProfile, logout }), [user, busy])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
