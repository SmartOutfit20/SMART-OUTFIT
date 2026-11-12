export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-4xl font-black text-slate-900">Admin Dashboard</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-4">
        {[
          ['Total Orders', '184'],
          ['Revenue', '৳ 2,48,500'],
          ['Customers', '1,420'],
          ['Products', '312']
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-brand-700">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-black text-slate-900">Recent Orders</h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-600">
          <li>#SO-2001 — Customer A — ৳ 2,490 — Pending</li>
          <li>#SO-2002 — Customer B — ৳ 3,650 — Processing</li>
          <li>#SO-2003 — Customer C — ৳ 1,980 — Delivered</li>
        </ul>
      </div>
    </div>
  );
}
