export default function LoginPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft md:grid-cols-2">
        <div className="rounded-[1.5rem] bg-slate-950 p-8 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-200">Welcome</p>
          <h2 className="mt-3 text-3xl font-black">Login to your account</h2>
          <form className="mt-8 space-y-4">
            <input type="email" placeholder="Email Address" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-300" />
            <input type="password" placeholder="Password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-300" />
            <button className="w-full rounded-full bg-brand-500 px-6 py-3 font-semibold text-white">Login</button>
          </form>
        </div>
        <div className="p-4">
          <h3 className="text-2xl font-black text-slate-900">Create an account</h3>
          <form className="mt-6 space-y-4">
            <input placeholder="Full Name" className="w-full rounded-xl border border-slate-200 px-4 py-3" />
            <input placeholder="Phone" className="w-full rounded-xl border border-slate-200 px-4 py-3" />
            <input placeholder="Email" className="w-full rounded-xl border border-slate-200 px-4 py-3" />
            <input type="password" placeholder="Password" className="w-full rounded-xl border border-slate-200 px-4 py-3" />
            <button className="w-full rounded-full border border-brand-600 px-6 py-3 font-semibold text-brand-700">Register</button>
          </form>
        </div>
      </div>
    </div>
  );
}
