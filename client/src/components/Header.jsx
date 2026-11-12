import { Link } from 'react-router-dom';
import { useShop } from '../context/ShopContext';

export default function Header() {
  const { totalItems, wishlist } = useShop();

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-40">
      <div className="bg-brand-900 text-white text-xs md:text-sm">
        <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-between gap-3">
          <span>Free shipping over ৳ 2,500 in Bangladesh</span>
          <span>Bangladesh | বাংলা / English</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-lg font-bold text-white">
            S
          </div>
          <div>
            <div className="text-xl font-black tracking-wide">SMART OUTFIT</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Your Style, Our Inspiration</div>
          </div>
        </Link>

        <div className="hidden lg:flex flex-1 max-w-xl items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-slate-400">⌕</span>
          <input className="w-full bg-transparent outline-none text-sm" placeholder="Search products, brands, collections..." />
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
          <Link to="/shop">Shop</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/account">Account</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/account" className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium">Wishlist ({wishlist.length})</Link>
          <Link to="/cart" className="relative rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm">
            Cart ({totalItems})
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50/80">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <Link to="/shop">Men's Fashion</Link>
          <Link to="/shop">Women's Fashion</Link>
          <Link to="/shop">T-Shirts</Link>
          <Link to="/shop">Hoodies</Link>
          <Link to="/shop">Pants</Link>
          <Link to="/shop">Shoes</Link>
          <Link to="/shop">Accessories</Link>
          <Link to="/shop">New Arrivals</Link>
        </div>
      </div>
    </header>
  );
}
