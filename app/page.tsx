"use client";

import { useState, useRef, useEffect } from "react";
import { parseOrder, type ParseResult } from "@/lib/parser";
import { catalog, formatPrice } from "@/lib/catalog";

type Message = { from: "cliente" | "bot"; text: string; parsed?: ParseResult };

const EJEMPLOS = [
  "hola! 2 docenas de empanadas y una coca grande",
  "3 milanesas, 2 chorizos y un agua",
  "medio kilo de vacio y 6 empandas de pollo",
  "una docena de jamon y queso + 2 flanes",
];

const SALUDO =
  "¡Hola! Soy el bot de Parrilla El Fogón 🔥\nEscribime tu pedido como se lo dirías a una persona y te lo confirmo con los precios.";

function respuesta(r: ParseResult): string {
  if (r.lines.length === 0) {
    return r.unmatched.length
      ? `No encontré "${r.unmatched.join('", "')}" en la carta. ¿Me lo escribís de otra forma?`
      : "No llegué a entender el pedido. Probá con algo como “2 docenas de empanadas y una coca grande”.";
  }
  const detalle = r.lines
    .map((l) => {
      const cant = Number.isInteger(l.quantity)
        ? l.quantity
        : l.quantity.toString().replace(".", ",");
      const unidad = l.product.unit === "kg" ? " kg de" : " ×";
      return `• ${cant}${unidad} ${l.product.name} — ${formatPrice(l.subtotal)}`;
    })
    .join("\n");
  const faltante = r.unmatched.length
    ? `\n\n⚠️ No encontré: ${r.unmatched.join(", ")}. Eso no lo cargué.`
    : "";
  return `Anoté:\n${detalle}\n\nTotal: ${formatPrice(r.total)}${faltante}\n\n¿Confirmo el pedido?`;
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([{ from: "bot", text: SALUDO }]);
  const [input, setInput] = useState("");
  const [orders, setOrders] = useState<{ id: number; result: ParseResult; at: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastParsed = messages.findLast((m) => m.parsed)?.parsed;

  // Se scrollea el contenedor, no el elemento: `scrollIntoView` arrastraba la
  // pagina entera cada vez que llegaba un mensaje.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const result = parseOrder(clean);
    setMessages((m) => [
      ...m,
      { from: "cliente", text: clean },
      { from: "bot", text: respuesta(result), parsed: result },
    ]);
    setInput("");
  }

  function confirm() {
    if (!lastParsed?.lines.length) return;
    setOrders((o) => [
      { id: o.length + 1, result: lastParsed, at: new Date().toLocaleTimeString("es-AR") },
      ...o,
    ]);
    setMessages((m) => [
      ...m,
      { from: "bot", text: "✅ Pedido confirmado y cargado en el panel. Está en preparación." },
    ]);
  }

  // El stock arranca del catálogo y baja con cada pedido confirmado. Vive en la
  // sesión de este visitante: dos personas probando a la vez no se pisan.
  const stockUsado = new Map<string, number>();
  for (const o of orders) {
    for (const l of o.result.lines) {
      stockUsado.set(l.product.id, (stockUsado.get(l.product.id) ?? 0) + l.quantity);
    }
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-bold">Comanda</h1>
        <p className="mt-2 max-w-2xl text-pretty text-[var(--color-ink-dim)]">
          Un pedido escrito como lo escribe un cliente real se convierte en productos, cantidades y
          precios. Sin formularios y sin que nadie copie nada a mano.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-[var(--color-ink-dim)]">
          Esto es una simulación: no hay un WhatsApp conectado. El mismo análisis corre igual detrás
          de la API oficial de WhatsApp, que es lo que se instala en cada cliente.
        </p>
      </div>

      <section
        aria-label="Conversación"
        className="flex h-[32rem] flex-col overflow-hidden rounded-xl border border-white/10 bg-[var(--color-wa-panel)]"
      >
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-full bg-[var(--color-wa-accent)] text-lg"
          >
            🔥
          </span>
          <div>
            <p className="font-semibold">Parrilla El Fogón</p>
            <p className="text-xs text-[var(--color-wa-accent)]">en línea</p>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.from === "cliente" ? "flex justify-end" : "flex"}>
              <p
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-line ${
                  m.from === "cliente" ? "bg-[var(--color-wa-out)]" : "bg-[var(--color-wa-in)]"
                }`}
              >
                {m.text}
              </p>
            </div>
          ))}
          {lastParsed && lastParsed.lines.length > 0 && (
            <div className="flex justify-end pt-1">
              <button
                onClick={confirm}
                className="rounded-lg bg-[var(--color-wa-accent)] px-4 py-2 text-sm font-semibold text-[#04231d] transition-opacity hover:opacity-90"
              >
                Confirmar pedido
              </button>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 border-t border-white/10 p-3"
        >
          <label htmlFor="msg" className="sr-only">
            Escribí tu pedido
          </label>
          <input
            id="msg"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="2 docenas de empanadas y una coca grande"
            className="flex-1 rounded-lg bg-[var(--color-wa-in)] px-3 py-2 text-sm outline-none placeholder:text-[var(--color-ink-dim)] focus:ring-2 focus:ring-[var(--color-wa-accent)]"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--color-wa-accent)] px-4 py-2 text-sm font-semibold text-[#04231d]"
          >
            Enviar
          </button>
        </form>
      </section>

      <aside className="space-y-6">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
            Probá con
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {EJEMPLOS.map((e) => (
              <button
                key={e}
                onClick={() => send(e)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-left text-xs text-[var(--color-ink-dim)] transition-colors hover:border-[var(--color-wa-accent)] hover:text-[var(--color-ink)]"
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
            Pedidos confirmados ({orders.length})
          </h2>
          {orders.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-ink-dim)]">
              Todavía ninguno. Mandá un pedido y confirmalo.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {orders.map((o) => (
                <li key={o.id} className="rounded-lg border border-white/10 p-3 text-sm">
                  <div className="flex justify-between font-semibold">
                    <span>#{String(o.id).padStart(3, "0")}</span>
                    <span>{formatPrice(o.result.total)}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-ink-dim)]">
                    {o.at} · {o.result.lines.length} ítems
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-dim)]">
            Stock
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {catalog.map((p) => {
              const usado = stockUsado.get(p.id) ?? 0;
              const queda = p.stock - usado;
              return (
                <li key={p.id} className="flex justify-between gap-3">
                  <span
                    className={usado ? "text-[var(--color-ink)]" : "text-[var(--color-ink-dim)]"}
                  >
                    {p.name}
                  </span>
                  <span
                    className={`font-mono tabular-nums ${
                      queda <= 0
                        ? "text-red-400"
                        : usado
                          ? "text-[var(--color-wa-accent)]"
                          : "text-[var(--color-ink-dim)]"
                    }`}
                  >
                    {queda}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      <footer className="text-sm text-[var(--color-ink-dim)] lg:col-span-2">
        Demo de{" "}
        <a href="https://lykos.com.ar" className="text-[var(--color-wa-accent)] hover:underline">
          Lykos
        </a>
        . El código está{" "}
        <a
          href="https://github.com/Lykos-Software-Solutions/comanda"
          className="text-[var(--color-wa-accent)] hover:underline"
        >
          abierto en GitHub
        </a>
        .
      </footer>
    </main>
  );
}
