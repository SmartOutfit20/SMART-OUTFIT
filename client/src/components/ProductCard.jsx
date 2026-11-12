import { Heart, ShoppingBag, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useShop } from '../context/ShopContext'
import { money } from '../data/products'
export default function ProductCard({product:p}){
 const {toggleWish,wishlist,addToCart}=useShop()
 const purchasable=Boolean(p._id)
 return <article className="product-card"><div className="product-art" style={{'--art':p.color}}><span className="product-tag">{p.tag}</span><button className={`wish-btn ${wishlist.includes(p.id)?'active':''}`} onClick={()=>toggleWish(p.id)}><Heart size={18} fill={wishlist.includes(p.id)?'currentColor':'none'}/></button><Link to={`/product/${p.id}`} className="art-shape">{p.images?.[0]?<img src={p.images[0]} alt={p.name} loading="lazy"/>:<span>SO</span>}</Link><button className="quick-add" disabled={!purchasable} title={purchasable?'Add to bag':'Preview item only — live product not available'} onClick={()=>addToCart(p,p.sizes?.[0]||'S',p.colors?.[0]||'')}><ShoppingBag size={16}/> {purchasable?'QUICK ADD':'PREVIEW ONLY'}</button></div><div className="product-info"><div className="product-category">{p.category}</div><Link to={`/product/${p.id}`} className="product-name">{p.name}</Link><div className="product-bottom"><div><b>{money(p.price)}</b>{p.oldPrice>0&&<del>{money(p.oldPrice)}</del>}</div><span className="rating"><Star size={13} fill="currentColor"/> {p.rating}</span></div></div></article>
}
