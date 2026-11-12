import { Link, NavLink, Outlet } from 'react-router-dom'
import { ShoppingBag, Heart, Menu, X, UserRound, Globe, House } from 'lucide-react'
import { useShop } from '../context/ShopContext'
import { useEffect, useState } from 'react'
import api from '../services/api'
export function Layout(){
 const {cart,wishlist,language,setLanguage}=useShop()
 const [menuOpen,setMenuOpen]=useState(false)
 const [store,setStore]=useState({storeName:'SMART OUTFIT',tagline:'Your Style, Our Inspiration.',storeNotice:'৳৩,০০০-এর বেশি অর্ডারে ফ্রি ডেলিভারি • নতুন মৌসুম, নতুন সাজ',announcementEnabled:true,supportEmail:'',supportPhone:'',aboutText:''})
 useEffect(()=>{api.get('/storefront').then(({data})=>setStore(s=>({...s,...data}))).catch(()=>{})},[])
 return <>{store.announcementEnabled&&store.storeNotice&&<div className="announcement">{store.storeNotice}</div>}{store.maintenanceMode&&<div className="api-notice" style={{textAlign:"center",margin:0}}>দোকানের রক্ষণাবেক্ষণ চলছে। কিছু সেবা সাময়িকভাবে সীমিত থাকতে পারে。</div>}
 <header className="header">
  <Link className="brand" to="/" onClick={()=>setMenuOpen(false)}><span className="brand-mark">S</span><span>{store.storeName||"SMART OUTFIT"}<small>{store.tagline}</small></span></Link>
  <button className="mobile-menu-toggle" type="button" aria-label={menuOpen?'Close menu':'Open menu'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}>{menuOpen?<X size={21}/>:<Menu size={21}/>}</button>
  <nav className={menuOpen?'nav nav-open':'nav'} onClick={()=>setMenuOpen(false)}><NavLink to="/shop">শপ</NavLink><NavLink to="/shop?category=Men">পুরুষ</NavLink><NavLink to="/shop?category=Women">WOপুরুষ</NavLink><NavLink to="/shop?category=Accessories">অনুষঙ্গ</NavLink><NavLink to="/shop?sale=true">অফার</NavLink></nav>
  <div className="header-actions"><button className="icon-btn language-btn" onClick={()=>setLanguage(language==='EN'?'বাংলা':'EN')} title="ভাষা"><Globe size={18}/><small>{language}</small></button><Link className="icon-btn" to="/wishlist" aria-label="পছন্দের তালিকা"><Heart size={19}/><sup>{wishlist.length}</sup></Link><Link className="icon-btn" to="/cart" aria-label="শপিং ব্যাগ"><ShoppingBag size={19}/><sup>{cart.reduce((n,x)=>n+x.qty,0)}</sup></Link><Link className="icon-btn account-icon" to="/account" aria-label="আমার অ্যাকাউন্ট"><UserRound size={19}/></Link></div>
 </header>
 <nav className="mobile-bottom-nav" aria-label="দ্রুত নেভিগেশন"><NavLink end to="/"><House size={18}/><span>হোম</span></NavLink><NavLink to="/shop"><ShoppingBag size={18}/><span>শপ</span></NavLink><NavLink to="/wishlist"><Heart size={18}/><span>পছন্দ</span></NavLink><NavLink to="/cart"><ShoppingBag size={18}/><span>কার্ট</span></NavLink><NavLink to="/account"><UserRound size={18}/><span>অ্যাকাউন্ট</span></NavLink></nav>
 <main><Outlet/></main><footer className="footer"><div><div className="brand footer-brand"><span className="brand-mark">S</span><span>{store.storeName||"SMART OUTFIT"}<small>{store.tagline}</small></span></div><p>{store.aboutText||"সহজ স্টাইল, প্রতিদিনের প্রয়োজনীয় ও নজরকাড়া পোশাক—আপনার জন্য।"}</p></div><div><b>কেনাকাটা</b><Link to="/shop">সব পণ্য</Link><Link to="/shop">নতুন পণ্য</Link><Link to="/shop">সেরা বিক্রিত পণ্য</Link></div><div><b>সহায়তা</b><Link to="/about">আমাদের সম্পর্কে</Link><Link to="/contact">যোগাযোগ</Link><Link to="/track">অর্ডার ট্র্যাক করুন</Link></div><div><b>যোগাযোগ ও আপডেট</b><p>{store.supportEmail}{store.supportPhone&&<><br/>{store.supportPhone}</>}</p><p>নতুন পণ্য ও বিশেষ অফারের আপডেট পান।</p><div className="newsletter"><input placeholder="আপনার ইমেইল ঠিকানা"/><button>যুক্ত হন</button></div></div><div className="copyright">© {new Date().getFullYear()} SMART OUTFIT. সর্বস্বত্ব সংরক্ষিত। <span>বাংলাদেশের জন্য · মূল্য টাকা (৳)</span></div></footer></>
}
