import { Link, NavLink, Outlet } from 'react-router-dom'
import { Search, ShoppingBag, Heart, Menu, UserRound, Globe } from 'lucide-react'
import { useShop } from '../context/ShopContext'
export function Layout(){
 const {cart,wishlist,language,setLanguage}=useShop()
 return <><div className="announcement">FREE DELIVERY ON ORDERS OVER ৳3,000 <span> • </span> NEW SEASON, NEW YOU</div>
 <header className="header"><Link className="brand" to="/"><span className="brand-mark">S</span><span>SMART <b>OUTFIT</b><small>YOUR STYLE, OUR INSPIRATION</small></span></Link>
 <nav className="nav"><NavLink to="/shop">SHOP</NavLink><a href="/shop?category=Men">MEN</a><a href="/shop?category=Women">WOMEN</a><a href="/shop?category=Accessories">ACCESSORIES</a><a href="/shop?sale=true">SALE</a></nav>
 <div className="header-actions"><button className="icon-btn" onClick={()=>setLanguage(language==='EN'?'বাংলা':'EN')} title="Language"><Globe size={18}/><small>{language}</small></button><Link className="icon-btn" to="/wishlist"><Heart size={19}/><sup>{wishlist.length}</sup></Link><Link className="icon-btn" to="/cart"><ShoppingBag size={19}/><sup>{cart.reduce((n,x)=>n+x.qty,0)}</sup></Link><Link className="icon-btn" to="/account"><UserRound size={19}/></Link></div></header>
 <main><Outlet/></main><footer className="footer"><div><div className="brand footer-brand"><span className="brand-mark">S</span><span>SMART <b>OUTFIT</b><small>YOUR STYLE, OUR INSPIRATION</small></span></div><p>Style made simple. Discover everyday essentials and statement pieces made for you.</p></div><div><b>SHOP</b><Link to="/shop">All products</Link><Link to="/shop">New arrivals</Link><Link to="/shop">Best sellers</Link></div><div><b>HELP</b><Link to="/about">About us</Link><Link to="/contact">Contact</Link><Link to="/track">Track order</Link></div><div><b>STAY IN STYLE</b><p>Get updates on new drops and exclusive offers.</p><div className="newsletter"><input placeholder="Your email address"/><button>JOIN</button></div></div><div className="copyright">© {new Date().getFullYear()} SMART OUTFIT. All rights reserved. <span>Made for Bangladesh · BDT ৳</span></div></footer></>
}
