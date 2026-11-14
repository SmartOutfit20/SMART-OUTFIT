import { Component, lazy, Suspense } from 'react'
import { Routes,Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home,Shop,ProductDetail,Cart,Wishlist,Checkout,Login,Register,CustomerDashboard,CustomerOrders,ForgotPassword,ResetPassword,SimplePage } from './pages/StorePages'
// Keep the large administration workspace out of the initial storefront bundle.
const AdminLayout=lazy(()=>import('./admin/Admin').then(m=>({default:m.AdminLayout})))
const AdminLogin=lazy(()=>import('./admin/Admin').then(m=>({default:m.AdminLogin})))
const AdminOverview=lazy(()=>import('./admin/Admin').then(m=>({default:m.AdminOverview})))
const AdminPlaceholder=lazy(()=>import('./admin/Admin').then(m=>({default:m.AdminPlaceholder})))
const AdminProducts=lazy(()=>import('./admin/Admin').then(m=>({default:m.AdminProducts})))
const AdminInventory=lazy(()=>import('./admin/Admin').then(m=>({default:m.AdminInventory})))
const AdminOrders=lazy(()=>import('./admin/Admin').then(m=>({default:m.AdminOrders})))
const AdminCategories=lazy(()=>import('./admin/Admin').then(m=>({default:m.AdminCategories})))
const AdminNavigation=lazy(()=>import('./admin/Admin').then(m=>({default:m.AdminNavigation})))
const AdminCoupons=lazy(()=>import('./admin/Admin').then(m=>({default:m.AdminCoupons})))
const AdminProfile=lazy(()=>import('./admin/Admin').then(m=>({default:m.AdminProfile})))
const AdminSEO=lazy(()=>import('./admin/Admin').then(m=>({default:m.AdminSEO})))
class AdminErrorBoundary extends Component{
 constructor(props){super(props);this.state={failed:false}}
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(error,info){console.error('SMART OUTFIT admin page error:',error,info)}
 render(){if(this.state.failed)return <main style={{minHeight:'60vh',display:'grid',placeItems:'center',padding:'32px',textAlign:'center'}}><div><h1>Admin page could not load</h1><p>এই পেজে একটি সমস্যা হয়েছে। Admin Home-এ ফিরে যান অথবা আবার চেষ্টা করুন।</p><p><a href="/admin">Admin Home</a></p><button type="button" onClick={()=>window.location.reload()}>Reload page</button></div></main>;return this.props.children}
}
export default function App(){return <Suspense fallback={<main className="app-loading-screen" role="status">SMART OUTFIT · পেজ লোড হচ্ছে…</main>}><Routes><Route element={<Layout/>}><Route index element={<Home/>}/><Route path="shop" element={<Shop/>}/><Route path="product/:id" element={<ProductDetail/>}/><Route path="cart" element={<Cart/>}/><Route path="wishlist" element={<Wishlist/>}/><Route path="checkout" element={<Checkout/>}/><Route path="login" element={<Login/>}/><Route path="register" element={<Register/>}/><Route path="forgot-password" element={<ForgotPassword/>}/><Route path="reset-password" element={<ResetPassword/>}/><Route path="account" element={<CustomerDashboard/>}/><Route path="orders" element={<CustomerOrders/>}/><Route path="about" element={<SimplePage title="ABOUT US"/>}/><Route path="contact" element={<SimplePage title="CONTACT US"/>}/><Route path="track" element={<SimplePage title="TRACK YOUR ORDER"/>}/><Route path="faq" element={<SimplePage title="FAQ"/>}/><Route path="shipping" element={<SimplePage title="SHIPPING & DELIVERY"/>}/><Route path="returns" element={<SimplePage title="RETURNS & REFUNDS"/>}/><Route path="privacy" element={<SimplePage title="PRIVACY POLICY"/>}/><Route path="terms" element={<SimplePage title="TERMS & CONDITIONS"/>}/></Route><Route path="/admin/login" element={<AdminLogin/>}/><Route path="/admin" element={<AdminErrorBoundary><AdminLayout/></AdminErrorBoundary>}><Route index element={<AdminOverview/>}/><Route path="products" element={<AdminProducts/>}/><Route path="inventory" element={<AdminInventory/>}/><Route path="orders" element={<AdminOrders/>}/><Route path="categories" element={<AdminCategories/>}/><Route path="navigation" element={<AdminNavigation/>}/><Route path="coupons" element={<AdminCoupons/>}/><Route path="profile" element={<AdminProfile/>}/><Route path="seo" element={<AdminSEO/>}/>{['customers','reports','support','delivery','roles','language','settings'].map(x=><Route key={x} path={x} element={<AdminPlaceholder/>}/>)}</Route><Route path="*" element={<SimplePage title="PAGE NOT FOUND"/>}/></Routes></Suspense>}
