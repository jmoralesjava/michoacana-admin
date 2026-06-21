"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ClienteLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const w = searchParams.get("w");
    if (w) setWhatsapp(decodeURIComponent(w));
  }, []);

  async function acceder() {
    if (!whatsapp.trim()) return;
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("clientes")
      .select("*, categorias_cliente(nombre, descuento_porcentaje)")
      .eq("whatsapp", whatsapp.trim())
      .eq("activo", true)
      .single();

    setLoading(false);

    if (error || !data) {
      setError(
        "No encontramos una cuenta con ese número. Contacta a tu vendedor.",
      );
      return;
    }

    localStorage.setItem("cliente_session", JSON.stringify(data));
    router.push("/cliente/menu");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">AM</span>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 text-center mb-1">
            Bienvenido
          </h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            La Auténtica Michoacana
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Tu número de WhatsApp
              </label>
              <input
                type="tel"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="+52 55 1234 5678"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && acceder()}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <button
              onClick={acceder}
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            ¿No tienes cuenta? Contacta a tu vendedor para que te registre.
          </p>
        </div>
      </div>
    </div>
  );
}
