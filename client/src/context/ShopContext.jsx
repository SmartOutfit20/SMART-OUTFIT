import { createContext, useContext, useEffect, useMemo, useState } from 'react'
const ShopContext = createContext(null)
export function ShopProvider({children}) {
 const [cart,setCart] = useState(() => JSON.parse(localStorage.getItem('so-cart') || '[]'))
 const [wishlist,setWishlist] = useState(() => JSON.parse(localStorage.getItem('so-wishlist') || '[]'))
 const [language,setLanguage] = useState('EN')
 useEffect(()=>localStorage.setItem('so-cart',JSON.stringify(cart)),[cart])
 useEffect(()=>localStorage.setItem('so-wishlist',JSON.stringify(wishlist)),[wishlist])
 const addToCart = (product, size, color = '') => setCart(old => {
   const key = `${product.id}-${size}-${color}`
   const found = old.find(x=>x.key===key)
   return found ? old.map(x=>x.key===key?{...x,qty:x.qty+1}:x) : [...old,{...product,key,size,color,qty:1}]
 })
 const changeQty = (key,qty) => setCart(old=>qty<1?old.filter(x=>x.key!==key):old.map(x=>x.key===key?{...x,qty}:x))
 const clearCart = () => setCart([])
 const toggleWish = id => setWishlist(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])
 const value = useMemo(()=>({cart,wishlist,language,setLanguage,addToCart,changeQty,clearCart,toggleWish}),[cart,wishlist,language])
 return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}
export const useShop = () => useContext(ShopContext)
