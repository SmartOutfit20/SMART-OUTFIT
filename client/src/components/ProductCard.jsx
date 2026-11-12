import { ArrowRight, Heart, ShoppingBag, Star } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { money } from '../data/products'
export default function ProductCard({product:p}){
 const {toggleWish,wishlist,addToCart}=useShop()
 const navigate=useNavigate()
 const firstVariant=p.variantStocks?.find(v=>Number(v.stock)>0)||p.variantStocks?.[0]
 const firstSize=firstVariant?.size||p.sizes?.[0]||'S'
 const firstColor=firstVariant?.color||p.colors?.[0]||''
 const quickStock=p.variantStocks?.length?(firstVariant?.stock??0):Number(p.stock??1)
 const purchasable=Boolean(p._id)&&quickStock>0
 const discountPercent=p.oldPrice>p.price&&p.oldPrice>0?Math.round((p.oldPrice-p.price)/p.oldPrice*100):0
 const productBadge=discountPercent?discountPercent+'% OFF':(p.tag&&p.tag.toLowerCase()!=='starter'?p.tag:null)
 const addSelectedToCart=()=>addToCart({...p,stock:quickStock},firstSize,firstColor)
 const buyNow=()=>{addSelectedToCart();navigate('/checkout')}
 return <article className="product-card"><div className="product-art" style={{'--art':p.color}}>{productBadge&&<span className={discountPercent?'product-tag discount-tag':'product-tag'}>{productBadge}</span>}<button className={`wish-btn ${wishlist.includes(p.id)?'active':''}`} onClick={()=>toggleWish(p.id)} aria-label={wishlist.includes(p.id)?'Remove from wishlist':'Add to wishlist'}><Heart size={18} fill={wishlist.includes(p.id)?'currentColor':'none'}/></button><Link to={`/product/${p.id}`} className={`art-shape ${p.images?.[0] ? 'has-product-image' : ''}`}>{p.images?.[0]?<img src={p.images[0]} alt={p.name} loading="lazy"/>:<span>SO</span>}</Link><div className="product-actions"><button className="quick-add" disabled={!purchasable} title={purchasable?'Add to cart':p._id?'Out of stock':'Preview only — not for sale'} onClick={addSelectedToCart}><ShoppingBag size={14}/> ADD TO CART</button><button className="buy-now" disabled={!purchasable} title={purchasable?'Buy now':'Currently unavailable'} onClick={buyNow}>BUY NOW <ArrowRight size={14}/></button></div></div><div className="product-info"><div className="product-category">{p.category}</div><Link to={`/product/${p.id}`} className="product-name">{p.name}</Link><div className="product-bottom"><div><b>{money(p.price)}</b>{p.oldPrice>0&&<del>{money(p.oldPrice)}</del>}</div><span className="rating"><Star size={13} fill="currentColor"/> {p.rating}</span></div></div></article>
}
