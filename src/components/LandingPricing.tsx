"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { trackCtaClick } from "@/lib/analytics";
import { useLang } from "@/components/LangContext";

export default function LandingPricing() {
  const { t } = useLang();

  const plans = [
    {
      key: "free",
      name: t.plan_free,
      price: t.plan_free_p,
      sub: t.plan_free_sub,
      features: t.plan_free_f as readonly string[],
      highlighted: false,
      ctaHref: "/login",
      ctaLabel: t.choose,
      ctaTrack: "pricing_free",
    },
    {
      key: "pro",
      name: t.plan_pro,
      price: t.plan_pro_p,
      sub: t.plan_pro_sub,
      features: t.plan_pro_f as readonly string[],
      highlighted: true,
      ctaHref: "/login?plan=pro",
      ctaLabel: t.choose,
      ctaTrack: "pricing_pro",
    },
    {
      key: "team",
      name: t.plan_team,
      price: t.plan_team_p,
      sub: t.plan_team_sub,
      features: t.plan_team_f as readonly string[],
      highlighted: false,
      ctaHref: "/login?plan=team",
      ctaLabel: t.choose,
      ctaTrack: "pricing_team",
    },
  ];

  return (
    <section className="py-24 sm:py-32" id="preise">
      <div className="landing-shell">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-xl text-center"
        >
          <div className="section-kicker">{t.sec_price_eyebrow}</div>
          <h2 className="section-title mt-5">{t.sec_price_title}</h2>
          <p className="section-copy mt-5">{t.price_lead}</p>
        </motion.div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3 lg:items-start">
          {plans.map((plan, i) => (
            <motion.article
              key={plan.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-2xl p-7 sm:p-8"
              style={plan.highlighted ? {
                background: "rgba(200,121,61,0.04)",
                border: "1px solid rgba(200,121,61,0.22)",
                boxShadow: "0 0 40px rgba(200,121,61,0.08)",
              } : {
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {plan.highlighted && (
                <div
                  className="absolute right-6 top-6 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ background: "var(--color-primary)", color: "white" }}
                >
                  {t.popular}
                </div>
              )}

              <h3
                className="text-lg font-bold"
                style={{ color: "var(--color-text)", fontFamily: "var(--font-display)" }}
              >
                {plan.name}
              </h3>

              <div className="mt-4 flex items-end gap-1.5">
                <span
                  className="text-4xl font-bold leading-none tracking-tight"
                  style={{
                    color: plan.highlighted ? "var(--color-primary)" : "var(--color-text)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {plan.price}
                </span>
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--color-text-soft)" }}>
                {plan.sub}
              </div>

              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--color-text)" }}>
                    <span
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded"
                      style={{ color: plan.highlighted ? "var(--color-primary)" : "var(--color-text-soft)" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`${plan.highlighted ? "cta-primary" : "cta-secondary"} mt-7 w-full`}
                onClick={() => trackCtaClick(plan.ctaTrack)}
              >
                {plan.ctaLabel}
              </Link>
            </motion.article>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-center text-sm"
          style={{ color: "var(--color-text-soft)" }}
        >
          {t.hero_proof2} · {t.hero_proof3}
        </motion.p>

      </div>
    </section>
  );
}
