"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "../menu.css";

type Cliente = { codigo: string; nombre: string; puntos: number };

function Tarjeta() {
  const params = useSearchParams();
  const inicial = params.get("c") || "";
  const [telefono, setTelefono] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [buscando, setBuscando] = useState(!!inicial);
  const [aviso, setAviso] = useState("");

  async function consultar(clave: string) {
    setAviso("");
    setBuscando(true);
    const { data, error } = await supabase.rpc("consultar_cliente_lealtad", {
      p_clave: clave,
    });
    setBuscando(false);
    if (error) {
      setAviso("No pudimos consultar tus puntos. Revisa tu conexión.");
      return;
    }
    if (!data) {
      setCliente(null);
      setAviso("No encontramos ese número. Regístrate al hacer tu pedido desde el menú.");
      return;
    }
    setCliente(data as Cliente);
  }

  useEffect(() => {
    if (inicial) consultar(inicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicial]);

  async function guardarQR() {
    try {
      const respuesta = await fetch(qr);
      const blob = await respuesta.blob();
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(blob);
      enlace.download = "mis-puntos-michoacana.png";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    } catch {
      window.open(qr, "_blank");
    }
  }

  const qr = cliente
    ? `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=12&color=3a0b26&data=${encodeURIComponent(`CLIENTE:${cliente.codigo}`)}`
    : "";

  return (
    <main className="mx-auto max-w-md pb-12">
      <header className="bg-[var(--rosa)] px-6 pb-8 pt-10 text-white">
        <p className="font-bold">La Auténtica Michoacana</p>
        <h1 className="rotulo mt-4 text-[2.4rem] leading-[1.05]">Tu tarjeta de puntos</h1>
      </header>
      <div className="toldo" />

      {cliente ? (
        <section className="px-5 pt-6 text-center">
          <p className="text-lg font-bold">Hola, {cliente.nombre}</p>
          <p className="rotulo mt-3 text-[4.5rem] leading-none text-[var(--rosa)]">
            {cliente.puntos}
          </p>
          <p className="mt-1 text-[var(--ciruela-suave)]">puntos acumulados</p>

          <div className="mx-auto mt-7 w-fit rounded-[32px] bg-white p-4 shadow-[0_18px_40px_-18px_rgba(156,12,96,0.55)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Tu código QR de cliente" className="h-52 w-52" />
          </div>
          <p className="mx-auto mt-5 max-w-[28ch] text-[15px] leading-snug text-[var(--ciruela-suave)]">
            Enséñale este código al vendedor en cada compra para sumar puntos, en
            cualquier sucursal.
          </p>
          <button
            type="button"
            onClick={guardarQR}
            className="mt-6 w-full rounded-full bg-[var(--rosa)] px-6 py-4 text-[17px] font-bold text-white"
          >
            Guardar mi QR en el teléfono
          </button>
          <p className="mx-auto mt-4 max-w-[30ch] text-sm text-[var(--ciruela-suave)]">
            Si lo pierdes, vuelve a esta página y escribe tu celular.
          </p>
          <button
            type="button"
            onClick={() => {
              setCliente(null);
              setTelefono("");
            }}
            className="mt-6 py-2 text-sm font-semibold text-[var(--ciruela-suave)] underline underline-offset-4"
          >
            Consultar otro número
          </button>
        </section>
      ) : (
        <section className="px-5 pt-8">
          <label className="block">
            <span className="font-bold">Escribe tu celular</span>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10 dígitos"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-[17px] ring-1 ring-[var(--hielo)] placeholder:text-[var(--ciruela-suave)]"
            />
          </label>
          {aviso && (
            <p role="alert" className="mt-3 text-sm font-semibold text-[var(--rosa-hondo)]">
              {aviso}
            </p>
          )}
          <button
            type="button"
            disabled={buscando || telefono.length !== 10}
            onClick={() => consultar(telefono)}
            className="mt-5 w-full rounded-full bg-[var(--rosa)] px-6 py-4 text-[17px] font-bold text-white disabled:opacity-50"
          >
            {buscando ? "Buscando…" : "Ver mis puntos"}
          </button>
        </section>
      )}
    </main>
  );
}

export default function PuntosPage() {
  return (
    <Suspense fallback={null}>
      <Tarjeta />
    </Suspense>
  );
}
