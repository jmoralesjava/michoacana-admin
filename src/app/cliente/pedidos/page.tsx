"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const coloresEstado: Record<string, string> = {
  enviado: "bg-blue-50 text-blue-700",
  revisado: "bg-amber-50 text-amber-700",
  aprobado: "bg-green-50 text-green-700",
  rechazado: "bg-red-50 text-red-700",
  en_camino: "bg-purple-50 text-purple-700",
  en_ruta: "bg-indigo-50 text-indigo-700",
  entregado_parcial: "bg-orange-50 text-orange-700",
  entregado: "bg-gray-50 text-gray-600",
};

const etiquetasEstado: Record<string, string> = {
  enviado: "Enviado",
  revisado: "En revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  en_camino: "Listo para recoger",
  en_ruta: "En camino a ti",
  entregado_parcial: "Entrega parcial",
  entregado: "Entregado",
};

function QRCode({ value }: { value: string }) {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    setQrUrl(
      `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(value)}&bgcolor=ffffff&color=1a1a1a&margin=10`,
    );
  }, [value]);

  if (!qrUrl) return null;

  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-xl mt-3">
      <p className="text-xs text-gray-500 font-medium">
        Muestra este QR al repartidor
      </p>
      <img src={qrUrl} alt={`QR ${value}`} className="w-32 h-32 rounded-lg" />
      <p className="text-sm font-bold text-gray-900 tracking-widest">{value}</p>
    </div>
  );
}

export default function ClientePedidosPage() {
  const router = useRouter();
  const [cliente, setCliente] = useState<any>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pedidoQR, setPedidoQR] = useState<string | null>(null);

  useEffect(() => {
    const session = localStorage.getItem("cliente_session");
    if (!session) {
      router.push("/cliente");
      return;
    }
    const cli = JSON.parse(session);
    setCliente(cli);
    cargarPedidos(cli.id);
  }, []);

  async function cargarPedidos(clienteId: string) {
    const { data } = await supabase
      .from("pedidos_cliente")
      .select("*, pedido_items(*)")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });
    if (data) setPedidos(data);
    setLoading(false);
  }

  const estadosConQR = ["aprobado", "en_camino", "en_ruta"];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push("/cliente/menu")}
            className="text-gray-400 text-sm"
          >
            ← Menú
          </button>
          <h1 className="text-base font-semibold text-gray-900">Mis pedidos</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Cargando...
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            <p className="text-3xl mb-3">📦</p>
            <p>No tienes pedidos aún</p>
          </div>
        ) : (
          pedidos.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-gray-100 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {p.folio && (
                    <p className="text-xs font-bold text-gray-700 mt-0.5 tracking-wider">
                      #{p.folio}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${coloresEstado[p.estado] || "bg-gray-50 text-gray-500"}`}
                >
                  {etiquetasEstado[p.estado] || p.estado.replace("_", " ")}
                </span>
              </div>

              {p.pedido_items?.map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm py-1 border-b border-gray-50"
                >
                  <span className="text-gray-700">
                    {item.cantidad}x {item.nombre_producto}
                    {item.nombre_variante ? ` (${item.nombre_variante})` : ""}
                    {item.cantidad_aprobada !== null &&
                      item.cantidad_aprobada !== item.cantidad && (
                        <span className="text-orange-500 ml-1">
                          (aprobado: {item.cantidad_aprobada})
                        </span>
                      )}
                  </span>
                  <span className="text-gray-500">
                    ${(item.precio_con_descuento * item.cantidad).toFixed(2)}
                  </span>
                </div>
              ))}

              <div className="flex justify-between mt-3">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-sm font-bold text-gray-900">
                  ${Number(p.total).toFixed(2)}
                </span>
              </div>

              {p.notas_fabrica && (
                <p className="text-xs text-green-600 bg-green-50 rounded-lg p-2 mt-3">
                  📋 {p.notas_fabrica}
                </p>
              )}

              {/* QR DEL PEDIDO */}
              {estadosConQR.includes(p.estado) && p.folio && (
                <div>
                  {pedidoQR === p.id ? (
                    <div>
                      <QRCode value={p.folio} />
                      <button
                        onClick={() => setPedidoQR(null)}
                        className="w-full text-xs text-gray-400 mt-2 py-1"
                      >
                        Ocultar QR
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPedidoQR(p.id)}
                      className="w-full mt-3 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium"
                    >
                      Ver QR para entrega
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
