"use client";

import { useEffect, useRef, useState } from "react";
import { FOUNDER_CTA_LABEL } from "@/lib/sale-page";

type StartState = "working" | "error";

function go(url: string) {
  try {
    window.location.assign(url);
  } catch {
    // Navigation can throw in test environments.
  }
}

export default function StartLifetimeCheckout() {
  const [state, setState] = useState<StartState>("working");
  const [message, setMessage] = useState("Wir leiten Sie zur Zahlung weiter.");
  const started = useRef(false);

  async function start() {
    setState("working");
    setMessage("Wir leiten Sie zur Zahlung weiter.");
    try {
      const response = await fetch("/api/checkout/lifetime", {
        method: "POST",
        redirect: "manual",
        credentials: "same-origin",
      });
      if (response.type === "opaqueredirect" || response.status === 401 || response.status === 302) {
        go("/login?next=/gruenderplatz");
        return;
      }
      const data = (await response.json()) as {
        url?: string;
        error?: string;
        soldOut?: boolean;
        alreadyLifetime?: boolean;
      };
      if (data.alreadyLifetime) {
        go("/einrichtung");
        return;
      }
      if (data.url) {
        go(data.url);
        return;
      }
      setState("error");
      setMessage(data.error || "Checkout konnte nicht gestartet werden.");
    } catch {
      setState("error");
      setMessage("Checkout konnte nicht gestartet werden.");
    }
  }

  useEffect(() => {
    if (started.current) return;
    const key = "offertio-lifetime-checkout-start";
    const previous = Number(sessionStorage.getItem(key) || "0");
    if (Date.now() - previous < 4000) return;
    started.current = true;
    sessionStorage.setItem(key, String(Date.now()));
    void start();
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-16">
      <h1
        className="text-3xl font-bold"
        style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}
      >
        {FOUNDER_CTA_LABEL}
      </h1>
      <p role="status" className="mt-4 text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
        {message}
      </p>
      <button
        type="button"
        className="cta-primary mt-8 min-h-12 w-full sm:w-auto"
        onClick={() => void start()}
        disabled={state === "working"}
      >
        {state === "working" ? "Weiterleitung…" : FOUNDER_CTA_LABEL}
      </button>
      <a href="/" className="mt-6 inline-flex min-h-11 items-center text-sm" style={{ color: "var(--color-text-soft)" }}>
        Zur Startseite
      </a>
    </div>
  );
}
