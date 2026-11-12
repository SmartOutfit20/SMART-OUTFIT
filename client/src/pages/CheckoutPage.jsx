import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';

export default function CheckoutPage() {
  const { subtotal } = useShop();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-4xl font-black text-slate-900">Checkout</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <form className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="grid gap-4 md:grid-cols-2">
            <input className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Full Name" />
            <input className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Phone Number" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Email" />
            <select className="rounded-xl border border-slate-200 px-4 py-3"><option>Dhaka</option><option>Chattogram</option></select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <input className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Upazila / Thana" />
            <input className="rounded-xl border border-slate-200 px-4 py-3" placeholder="Full Address" />
          </div>
          <div>
            <p className="mb-2 font-semibold">Payment Method</p>
            <div className="grid gap-3 md:grid-cols-2">
              {['Cash on Delivery', 'bKash', 'Nagad', 'Rocket'].map((method) => (
                <label key={method} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3">
                  <input type="radio" name="payment" />
                  <span>{method}</span>
                </label>
              ))}
            </div>
          </div>
          <button className="w-full rounded-full bg-brand-600 px-6 py-3 font-semibold text-white">Place Order</button>
        </form>

        <aside className="rounded-2xl bg-slate-50 p-6 shadow-soft">
          <h2 className="text-xl font-black text-slate-900">Order Summary</h2>
          <div className="mt-6 space-y-3 text-sm text-slate-600">
            <div className="flex justify-between"><span>Subtotal</span><span>৳ {subtotal}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>− ৳ 0</span></div>
            <div className="flex justify-between"><span>Delivery</span><span>৳ 100</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-900"><span>Total</span><span>৳ {subtotal + 100}</span></div>
          </div>
          <Link to="/shop" className="mt-6 block text-center text-sm font-semibold text-brand-700">Continue Shopping</Link>
        </aside>
      </div>
    </div>
  );
}
