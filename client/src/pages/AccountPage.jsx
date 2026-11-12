export default function AccountPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-4xl font-black text-slate-900">My Account</h1>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {[
          ['Total Orders', '28'],
          ['Total Spending', '৳ 42,800'],
          ['Loyalty Points', '920'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-brand-700">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-black text-slate-900">Profile</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Name: Abdullah Rahman</p>
            <p>Email: abdullah@example.com</p>
            <p>Phone: +880 1700-000000</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-black text-slate-900">Orders</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>#SO-1024 — Delivered</li>
            <li>#SO-1032 — Shipped</li>
            <li>#SO-1041 — Processing</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
