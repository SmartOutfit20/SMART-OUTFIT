export default function BlogPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-4xl font-black text-slate-900">Fashion Journal</h1>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {['Style Guide', 'Trending Looks', 'Shopping Tips'].map((title, idx) => (
          <article key={title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            <img src={`https://images.unsplash.com/${idx === 0 ? 'photo-1524504388940-b1c1722653e1' : idx === 1 ? 'photo-1515886657613-9f3515b0c78f' : 'photo-1529139574466-a303027c1d8b'}?auto=format&fit=crop&w=1000&q=80`} alt={title} className="h-56 w-full object-cover" />
            <div className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Lifestyle</p>
              <h2 className="mt-3 text-2xl font-black text-slate-900">{title}</h2>
              <p className="mt-3 text-slate-600">Read curated fashion picks, styling inspiration, and expert shopping guidance for Bangladesh trends.</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
