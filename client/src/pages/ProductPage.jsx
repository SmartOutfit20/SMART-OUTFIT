import { Link, useParams } from 'react-router-dom';
import { useShop } from '../context/ShopContext';

export default function ProductPage() {
  const { id } = useParams();
  const { products, addToCart, addToWishlist } = useShop();
  const product = products.find((item) => item.id === Number(id)) || products[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="space-y-4">
          <img src={product.image} alt={product.name} className="h-[620px] w-full rounded-[2rem] object-cover shadow-soft" />
          <div className="grid grid-cols-3 gap-3">
            {[product.image, product.image, product.image].map((img, idx) => (
              <img key={idx} src={img} alt="Product thumbnail" className="h-28 w-full rounded-2xl object-cover" />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">{product.category}</p>
          <h1 className="mt-3 text-4xl font-black text-slate-900">{product.name}</h1>
          <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
            <span>⭐ {product.rating}</span>
            <span>In stock: {product.stock}</span>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <span className="text-3xl font-black text-brand-700">৳ {product.salePrice}</span>
            <span className="text-lg text-slate-400 line-through">৳ {product.price}</span>
          </div>
          <p className="mt-6 text-slate-600">
            Premium everyday fashion built for movement, comfort, and modern expression. Ideal for both casual outings and smart occasions.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <p className="mb-2 font-semibold">Sizes</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button key={size} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium">{size}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-semibold">Colors</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button key={color} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium">{color}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <button onClick={() => addToCart(product)} className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white">Add to Cart</button>
            <button onClick={() => addToWishlist(product)} className="rounded-full border border-slate-200 px-6 py-3 font-semibold text-slate-700">Add to Wishlist</button>
            <Link to="/checkout" className="rounded-full border border-brand-600 px-6 py-3 font-semibold text-brand-700">Buy Now</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
