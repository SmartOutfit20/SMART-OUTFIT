import { Link, NavLink, Outlet } from 'react-router-dom'
import { শপpingBag, Heart, Menu, X, UserRound, Globe, House } from 'lucide-react'
import { useশপ } from '../context/শপContext'
import { useEffect, useState } from 'react'
import api from '../services/api'
export function Layout(){
 const {cart,wishlist,language,setভাষা}=useশপ()
 const [menuখোলা,setMenuখোলা]=useState(false)
 const [store,setStore]=useState({storeনাম:'SMART OUTFIT',tagline:'Your Style, Our Inspiration.',storeNotice:'৳৩,০০০-এর বেশি অর্ডারে ফ্রি ডেলিভারি • নতুন মৌসুম, নতুন সাজ',announcementEnabled:true,supportইমেইল:'',supportফোন নম্বর:'',aboutText:''})
 useEffect(()=>{api.get('/storefront').then(({data})=>setStore(s=>({...s,...data}))).catch(()=>{})},[])
 return <>{store.announcementEnabled&&store.storeNotice&&<div classনাম="announcement">{store.storeNotice}</div>}{store.maintenanceMode&&<div classনাম="api-notice" style={{textAlign:"center",margin:0}}>দোকানের রক্ষণাবেক্ষণ চলছে। কিছু সেবা সাময়িকভাবে সীমিত থাকতে পারে।</div>}
 <header classনাম="header">
  <Link classনাম="brand" to="/" onClick={()=>setMenuখোলা(false)}><span classনাম="brand-mark">S</span><span>{store.storeনাম||"SMART OUTFIT"}<small>{store.tagline}</small></span></Link>
  <button classনাম="mobile-menu-toggle" type="button" aria-label={menuখোলা?'বন্ধ করুন menu':'খোলা menu'} aria-expanded={menuখোলা} onClick={()=>setMenuখোলা(v=>!v)}>{menuখোলা?<X size={21}/>:<Menu size={21}/>}</button>
  <nav classনাম={menuখোলা?'nav nav-open':'nav'} onClick={()=>setMenuখোলা(false)}><NavLink to="/shop">শপ</NavLink><NavLink to="/shop?category=Men">পুরুষ</NavLink><NavLink to="/shop?category=Women">WOপুরুষ</NavLink><NavLink to="/shop?category=Accessories">অনুষঙ্গ</NavLink><NavLink to="/shop?sale=true">অফার</NavLink></nav>
  <div classনাম="header-actions"><button classনাম="icon-btn language-btn" onClick={()=>setভাষা(language==='EN'?'বাংলা':'EN')} title="ভাষা"><Globe size={18}/><small>{language}</small></button><Link classনাম="icon-btn" to="/wishlist" aria-label="পছন্দের তালিকা"><Heart size={19}/><sup>{wishlist.length}</sup></Link><Link classনাম="icon-btn" to="/cart" aria-label="শপping bag"><শপpingBag size={19}/><sup>{cart.reduce((n,x)=>n+x.qty,0)}</sup></Link><Link classনাম="icon-btn account-icon" to="/account" aria-label="My account"><UserRound size={19}/></Link></div>
 </header>
 <nav classনাম="mobile-bottom-nav" aria-label="Quick navigation"><NavLink end to="/"><House size={18}/><span>হোম</span></NavLink><NavLink to="/shop"><শপpingBag size={18}/><span>শপ</span></NavLink><NavLink to="/wishlist"><Heart size={18}/><span>পছন্দের তালিকা</span></NavLink><NavLink to="/cart"><শপpingBag size={18}/><span>কার্ট</span></NavLink><NavLink to="/account"><UserRound size={18}/><span>অ্যাকাউন্ট</span></NavLink></nav>
 <main><Outlet/></main><footer classনাম="footer"><div><div classনাম="brand footer-brand"><span classনাম="brand-mark">S</span><span>{store.storeনাম||"SMART OUTFIT"}<small>{store.tagline}</small></span></div><p>{store.aboutText||"Style made simple. Discover everyday essentials and statement pieces made for you."}</p></div><div><b>শপ</b><Link to="/shop">সব পণ্য</Link><Link to="/shop">নতুন পণ্য</Link><Link to="/shop">সেরা বিক্রিত পণ্য</Link></div><div><b>সহায়তা</b><Link to="/about">আমাদের সম্পর্কে</Link><Link to="/contact">যোগাযোগ</Link><Link to="/track">অর্ডার ট্র্যাক করুন</Link></div><div><b>যোগাযোগ ও আপডেট</b><p>{store.supportইমেইল}{store.supportফোন নম্বর&&<><br/>{store.supportফোন নম্বর}</>}</p><p>Get updates on new drops and exclusive offers.</p><div classনাম="newsletter"><input placeholder="আপনার ইমেইল ঠিকানা"/><button>যুক্ত হন</button></div></div><div classনাম="copyright">© {new Date().getFullYear()} SMART OUTFIT. All rights reserved. <span>বাংলাদেশের জন্য · মূল্য টাকা (৳)</span></div></footer></>
}
