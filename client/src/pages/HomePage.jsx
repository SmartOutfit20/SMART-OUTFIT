import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useShop } from '../context/ShopContext';

const statCards = [
  { label: 'Free Delivery', icon: '🚚', text: 'On orders above ৳ 2,500' },
  { label: 'Secure Payment', icon: '🔒', text: 'Cash on delivery and digital wallets' },
  { label: 'Easy Return', icon: '↩️', text: '7-day return support' }
];

export default function HomePage() {
  const { products } = useShop();

  return (
    <div>
      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-brand-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-200">Premium Collection</p>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">
              Fashion that feels premium and moves with you.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-slate-300">
              Discover curated essentials and statement styles made for Bangladesh’s modern lifestyle.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/shop" className="rounded-full bg-brand-500 px-6 py-3 font-semibold text-white shadow-lg shadow-brand-500/30">
                Shop Now
              </Link>
              <Link to="/shop" className="rounded-full border border-white/25 px-6 py-3 font-semibold text-white">
                Explore Collection
              </Link>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80"
              alt="fashion model"
              className="h-[500px] w-full rounded-[2rem] object-cover shadow-2xl"
            />
            <div className="absolute -bottom-6 left-6 rounded-2xl bg-white p-4 text-slate-900 shadow-soft">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Trending</p>
              <p className="mt-2 text-2xl font-black">Summer Edit</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <div className="text-3xl">{card.icon}</div>
              <p className="mt-3 text-xl font-bold text-slate-900">{card.label}</p>
              <p className="mt-2 text-sm text-slate-600">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Categories</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Shop by Category</h2>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {['Men\'s Fashion', 'Women\'s Fashion', 'T-Shirts', 'Hoodies', 'Pants', 'Shoes', 'Accessories', 'Sale Products'].map((category, idx) => (
            <Link key={category} to="/shop" className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
              <img
                src={`https://images.unsplash.com/${idx % 2 === 0 ? 'photo-1521572267360-ee0c2909d518' : 'photo-1483985988355-763728e1935b'}?auto=format&fit=crop&w=1000&q=80`}
                alt={category}
                className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="p-4 text-center text-lg font-semibold text-slate-800">{category}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Featured</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">New Arrivals</h2>
          </div>
          <Link to="/shop" className="text-sm font-semibold text-brand-700">View all</Link>
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="bg-slate-100 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Special</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Flash Sale</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[2rem] bg-gradient-to-r from-brand-700 to-brand-500 p-8 text-white">
              <p className="text-sm uppercase tracking-[0.2em]">Limited Time</p>
              <h3 className="mt-4 text-3xl font-black">Up to 50% Off On Iconic Pieces</h3>
              <p className="mt-4 max-w-md text-brand-100">Enjoy premium looks and easy delivery across Bangladesh.</p>
              <div className="mt-6 flex gap-3 text-xl font-bold">
                <span className="rounded-xl bg-white/10 px-3 py-2">03h</span>
                <span className="rounded-xl bg-white/10 px-3 py-2">12m</span>
                <span className="rounded-xl bg-white/10 px-3 py-2">24s</span>
              </div>
            </div>
            <div className="rounded-[2rem] bg-white p-6 shadow-soft">
              <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1100&q=80" alt="sale banner" className="h-full w-full rounded-2xl object-cover" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
