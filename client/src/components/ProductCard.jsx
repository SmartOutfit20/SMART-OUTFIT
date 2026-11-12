import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';

export default function ProductCard({ product }) {
  const { addToCart, addToWishlist } = useShop();

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative overflow-hidden">
        <img src={product.image} alt={product.name} className="h-72 w-full object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-full bg-brand-600 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
          {product.badge}
        </span>
      </div>
      <div className="p-5">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          <span>{product.category}</span>
          <span>★ {product.rating}</span>
        </div>
        <Link to={`/product/${product.id}`} className="block text-xl font-semibold text-slate-900 hover:text-brand-600">
          {product.name}
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-2xl font-black text-brand-700">৳ {product.salePrice}</span>
          <span className="text-sm text-slate-400 line-through">৳ {product.price}</span>
        </div>
        <div className="mt-5 flex items-center gap-2">
          <button onClick={() => addToCart(product)} className="flex-1 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
            Add to Cart
          </button>
          <button onClick={() => addToWishlist(product)} className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
            ♡
          </button>
        </div>
      </div>
    </article>
  );
}
