export default function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="mb-8 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">{title}</h2>
      {text && <p className="mx-auto mt-3 max-w-2xl text-slate-600">{text}</p>}
    </div>
  );
}
