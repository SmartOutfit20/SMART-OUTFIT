import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';

export default function ShopPage() {
  const { products, addToCart, addToWishlist } = useShop();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Catalog</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">All Products</h1>
        </div>
        <Link to="/" className="text-sm font-semibold text-brand-700">Back to home</Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {products.map((product) => (
          <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            <img src={product.image} alt={product.name} className="h-64 w-full object-cover" />
            <div className="p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{product.category}</p>
              <Link to={`/product/${product.id}`} className="mt-2 block text-xl font-bold text-slate-900">{product.name}</Link>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xl font-black text-brand-700">৳ {product.salePrice}</span>
                <span className="text-sm text-slate-400 line-through">৳ {product.price}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => addToCart(product)} className="flex-1 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Add to Cart</button>
                <button onClick={() => addToWishlist(product)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">♡</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
