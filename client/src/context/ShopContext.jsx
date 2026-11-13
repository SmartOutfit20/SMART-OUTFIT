import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import api from '../services/api'

const ShopContext = createContext(null)
function readStoredArray(key){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return []}}
function writeStoredArray(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
export function ShopProvider({children}) {
 const {user}=useAuth()
 const userId=String(user?.id||user?._id||'')
 const previousUserId=useRef('')
 const [cart,setCart] = useState(() => readStoredArray('so-cart'))
 const [wishlist,setWishlist] = useState(() => readStoredArray('so-wishlist'))
 const [language,setLanguage] = useState('EN')
 useEffect(()=>writeStoredArray('so-cart',cart),[cart])
 useEffect(()=>writeStoredArray('so-wishlist',wishlist),[wishlist])
 useEffect(()=>{
   if(!userId){
     if(previousUserId.current)setWishlist([])
     previousUserId.current=''
     return
   }
   previousUserId.current=userId
   let active=true
   setWishlist([])
   api.get('/auth/wishlist').then(({data})=>{
     if(active)setWishlist(Array.isArray(data.ids)?data.ids.map(String):[])
   }).catch(()=>{})
   return()=>{active=false}
 },[userId])
 const addToCart = (product, size, color = '') => setCart(old => {
   const key = `${product.id}-${size}-${color}`
   const found = old.find(x=>x.key===key)
   const stock = Number.isFinite(Number(product.stock)) ? Math.max(0,Number(product.stock)) : Infinity
   if (stock < 1) return old
   return found ? old.map(x=>x.key===key?{...x,qty:Math.min(stock,x.qty+1)}:x) : [...old,{...product,key,size,color,qty:1}]
 })
 const changeQty = (key,qty) => setCart(old=>qty<1?old.filter(x=>x.key!==key):old.map(x=>{if(x.key!==key)return x;const stock=Number.isFinite(Number(x.stock))?Math.max(0,Number(x.stock)):Infinity;return {...x,qty:Math.min(stock,qty)}}))
 const clearCart = () => setCart([])
 const toggleWish = id => {
   const productId=String(id)
   const removing=wishlist.includes(productId)
   setWishlist(old=>old.includes(productId)?old.filter(x=>x!==productId):[...old,productId])
   if(userId){
     const request=removing?api.delete('/auth/wishlist/'+productId):api.put('/auth/wishlist/'+productId)
     request.catch(()=>setWishlist(old=>removing?(old.includes(productId)?old:[...old,productId]):old.filter(x=>x!==productId)))
   }
 }
 const value = useMemo(()=>({cart,wishlist,language,setLanguage,addToCart,changeQty,clearCart,toggleWish}),[cart,wishlist,language,userId])
 return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}
export const useShop = () => useContext(ShopContext)
