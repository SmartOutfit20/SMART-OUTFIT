import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';

export default function CartPage() {
  const { cart, updateCartQty, removeFromCart, subtotal } = useShop();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-4xl font-black text-slate-900">Shopping Cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_0.8fr]">
        <div className="space-y-5">
          {cart.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
              Your cart is empty.
            </div>
          ) : (
            cart.map((item) => (
              <div key={`${item.id}-${item.size}-${item.color}`} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft md:flex-row md:items-center">
                <img src={item.image} alt={item.name} className="h-28 w-full rounded-xl object-cover md:w-28" />
                <div className="flex-1">
                  <Link to={`/product/${item.id}`} className="text-xl font-bold text-slate-900">{item.name}</Link>
                  <p className="mt-1 text-sm text-slate-500">Size: {item.size} • Color: {item.color}</p>
                  <p className="mt-2 text-lg font-bold text-brand-700">৳ {(item.salePrice || item.price) * item.quantity}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateCartQty(item.id, item.size, item.color, item.quantity - 1)} className="h-10 w-10 rounded-full border border-slate-200">−</button>
                  <span className="w-8 text-center font-semibold">{item.quantity}</span>
                  <button onClick={() => updateCartQty(item.id, item.size, item.color, item.quantity + 1)} className="h-10 w-10 rounded-full border border-slate-200">+</button>
                </div>
                <button onClick={() => removeFromCart(item.id, item.size, item.color)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <aside className="rounded-2xl bg-slate-50 p-6 shadow-soft">
          <h2 className="text-xl font-black text-slate-900">Order Summary</h2>
          <div className="mt-6 space-y-4 text-sm text-slate-600">
            <div className="flex justify-between"><span>Subtotal</span><span>৳ {subtotal}</span></div>
            <div className="flex justify-between"><span>Delivery</span><span>৳ 100</span></div>
            <div className="flex justify-between"><span>Coupon</span><span>− ৳ 0</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-900"><span>Total</span><span>৳ {subtotal + 100}</span></div>
          </div>
          <Link to="/checkout" className="mt-6 block rounded-full bg-brand-600 px-6 py-3 text-center font-semibold text-white">
            Proceed to Checkout
          </Link>
        </aside>
      </div>
    </div>
  );
}
