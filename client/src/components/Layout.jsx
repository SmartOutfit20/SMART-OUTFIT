import { Link, NavLink, Outlet } from 'react-router-dom'
import { ShoppingBag, Package, Menu, X, UserRound, House } from 'lucide-react'
import { useShop } from '../context/ShopContext'
import { useEffect, useState } from 'react'
import api from '../services/api'
export function Layout(){
 const {cart}=useShop()
 const [menuOpen,setMenuOpen]=useState(false)
 const [store,setStore]=useState({storeName:'SMART OUTFIT',tagline:'Your Style, Our Inspiration.',storeNotice:'FREE DELIVERY ON ORDERS OVER ৳3,000 • NEW SEASON, NEW YOU',announcementEnabled:true,supportEmail:'',supportPhone:'',aboutText:''})
 useEffect(()=>{api.get('/storefront').then(({data})=>setStore(s=>({...s,...data}))).catch(()=>{})},[])
 return <>{store.announcementEnabled&&store.storeNotice&&<div className="announcement">{store.storeNotice}</div>}{store.maintenanceMode&&<div className="api-notice" style={{textAlign:"center",margin:0}}>Store maintenance notice: some services may be temporarily limited.</div>}
 <header className="header">
  <Link className="brand" to="/" onClick={()=>setMenuOpen(false)}><span className="brand-mark">S</span><span>{store.storeName||"SMART OUTFIT"}<small>{store.tagline}</small></span></Link>
  <button className="mobile-menu-toggle" type="button" aria-label={menuOpen?'Close menu':'Open menu'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?<X size={21}/>:<Menu size={21}/>}</button>
  <nav className={menuOpen?'nav nav-open':'nav'} onClick={()=>setMenuOpen(false)}><NavLink to="/shop">SHOP</NavLink><NavLink to="/shop?category=Men">MEN</NavLink><NavLink to="/shop?category=Women">WOMEN</NavLink><NavLink to="/shop?category=Accessories">ACCESSORIES</NavLink><NavLink to="/shop?sale=true">SALE</NavLink></nav>
  <div className="header-actions"><Link className="icon-btn my-orders-link" to="/account" aria-label="My Orders"><Package size={19}/><small>MY ORDERS</small></Link><Link className="icon-btn" to="/cart" aria-label="Shopping bag"><ShoppingBag size={19}/><sup>{cart.reduce((n,x)=>n+x.qty,0)}</sup></Link><Link className="icon-btn account-icon" to="/account" aria-label="My account"><UserRound size={19}/></Link></div>
 </header>
 <nav className="mobile-bottom-nav" aria-label="Quick navigation"><NavLink end to="/"><House size={18}/><span>Home</span></NavLink><NavLink to="/shop"><ShoppingBag size={18}/><span>Shop</span></NavLink><NavLink to="/account"><Package size={18}/><span>My Orders</span></NavLink><NavLink to="/cart"><ShoppingBag size={18}/><span>Cart</span></NavLink><NavLink to="/account"><UserRound size={18}/><span>Account</span></NavLink></nav>
 <main><Outlet/></main><footer className="footer"><div><div className="brand footer-brand"><span className="brand-mark">S</span><span>{store.storeName||"SMART OUTFIT"}<small>{store.tagline}</small></span></div><p>{store.aboutText||"Style made simple. Discover everyday essentials and statement pieces made for you."}</p></div><div><b>SHOP</b><Link to="/shop">All products</Link><Link to="/shop">New arrivals</Link><Link to="/shop">Best sellers</Link></div><div><b>HELP</b><Link to="/about">About us</Link><Link to="/contact">Contact</Link><Link to="/track">Track order</Link></div><div><b>CONTACT & UPDATES</b><p>{store.supportEmail}{store.supportPhone&&<><br/>{store.supportPhone}</>}</p><p>Get updates on new drops and exclusive offers.</p><div className="newsletter"><input placeholder="Your email address"/><button>JOIN</button></div></div><div className="copyright">© {new Date().getFullYear()} SMART OUTFIT. All rights reserved. <span>Made for Bangladesh · BDT ৳</span></div></footer></>
}
