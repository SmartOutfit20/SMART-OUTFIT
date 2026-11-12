import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-20 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-4">
        <div>
          <h3 className="text-xl font-black text-white">SMART OUTFIT</h3>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Premium Bangladesh fashion for everyday confidence and statement styling.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Shop</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/shop">New Arrivals</Link></li>
            <li><Link to="/shop">Best Sellers</Link></li>
            <li><Link to="/shop">Sale</Link></li>
            <li><Link to="/shop">Accessories</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white">About</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/blog">Journal</Link></li>
            <li><Link to="/account">Customer Account</Link></li>
            <li><Link to="/admin">Admin Panel</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-white">Contact</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li>Dhaka, Bangladesh</li>
            <li>+880 1700-000000</li>
            <li>support@smartoutfit.com</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 px-4 py-5 text-center text-sm text-slate-400">
        © 2026 SMART OUTFIT. All rights reserved.
      </div>
    </footer>
  );
}
