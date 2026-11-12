export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Contact Us</p>
          <h1 className="mt-3 text-4xl font-black text-slate-900">We’d love to hear from you</h1>
          <div className="mt-8 space-y-3 text-slate-600">
            <p>Phone: +880 1700-000000</p>
            <p>WhatsApp: +880 1700-000000</p>
            <p>Email: support@smartoutfit.com</p>
            <p>Address: Dhaka, Bangladesh</p>
          </div>
        </div>
        <form className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Your Name" />
          <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Email" />
          <input className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Subject" />
          <textarea className="min-h-32 w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="Message" />
          <button className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white">Send Message</button>
        </form>
      </div>
    </div>
  );
}
