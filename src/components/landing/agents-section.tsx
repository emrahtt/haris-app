import { AGENTS } from "@/lib/data/agents";

export function AgentsSection() {
  return (
    <section className="px-[5%] py-20 bg-black/20" id="agents">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="text-[var(--color-gold-bright)] text-xs tracking-[0.2em] uppercase mb-3.5">
          Çoklu-Ajan Mimarisi
        </div>
        <h2 className="text-[clamp(28px,4vw,42px)] leading-[1.15] mb-4">
          12 Uzman. Tek Orkestra.
        </h2>
        <p className="text-[var(--color-text-2)] text-base">
          Bir Baş Avukat&apos;ın yönettiği uzman ekip gibi çalışır. Her ajan kendi alanında
          derinleşir, sonuçlar Editör tarafından kusursuz bir bütünde birleştirilir.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 max-w-6xl mx-auto">
        {AGENTS.map((a, i) => (
          <div
            key={a.id}
            className="relative bg-white/[0.02] border border-[var(--color-line)] rounded-xl p-5 transition-all hover:border-[var(--color-gold-soft)] hover:bg-[var(--color-gold)]/[0.04]"
          >
            <div className="absolute top-3 right-3.5 font-serif text-[32px] text-[var(--color-line-2)] font-bold leading-none">
              {String(i + 1).padStart(2, "0")}
            </div>
            <h4 className="text-[15px] mb-1.5 text-[var(--color-gold-bright)] font-sans font-semibold">
              {a.name}
            </h4>
            <p className="text-[var(--color-text-2)] text-xs">{a.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
