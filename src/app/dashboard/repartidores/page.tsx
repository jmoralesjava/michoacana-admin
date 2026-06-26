"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const coloresEstado: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  en_camino: { bg: "#ede7f6", text: "#5e35b1", label: "En camino" },
  en_ruta: { bg: "#e8f5e9", text: "#2e7d32", label: "En ruta" },
  entregado: { bg: "#f5f5f5", text: "#6a6a6e", label: "Entregado" },
  entregado_parcial: { bg: "#fff3e0", text: "#e65100", label: "Parcial" },
};

export default function RepartidoresPage() {
  const [esMobil, setEsMobil] = useState(false);
  const [repartidores, setRepartidores] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [repartidorActivo, setRepartidorActivo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = () => setEsMobil(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    cargarTodo();

    const canal = supabase
      .channel("repartidores-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos_cliente" },
        () => cargarTodo(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  async function cargarTodo() {
    const [reps, peds] = await Promise.all([
      supabase
        .from("perfiles")
        .select("*")
        .eq("rol", "repartidor")
        .eq("activo", true),
      supabase
        .from("pedidos_cliente")
        .select(
          `
        *,
        clientes(nombre, apellido, whatsapp, latitud, longitud, direccion),
        sucursales(nombre, latitud, longitud, direccion),
        pedido_items(nombre_producto, nombre_variante, cantidad, cantidad_aprobada)
      `,
        )
        .in("estado", [
          "en_camino",
          "en_ruta",
          "entregado",
          "entregado_parcial",
        ])
        .order("created_at", { ascending: false }),
    ]);

    if (reps.data) setRepartidores(reps.data);
    if (peds.data) setPedidos(peds.data);
    setLoading(false);
  }

  function pedidosDeRepartidor(repartidorId: string) {
    return pedidos.filter((p) => p.repartidor_id === repartidorId);
  }

  function estadoRepartidor(repartidorId: string) {
    const activos = pedidos.filter(
      (p) =>
        p.repartidor_id === repartidorId &&
        ["en_camino", "en_ruta"].includes(p.estado),
    );
    return activos.length > 0 ? "en_ruta" : "disponible";
  }

  function totalEntregados(repartidorId: string) {
    return pedidos.filter(
      (p) =>
        p.repartidor_id === repartidorId &&
        ["entregado", "entregado_parcial"].includes(p.estado),
    ).length;
  }

  function totalPendientes(repartidorId: string) {
    return pedidos.filter(
      (p) =>
        p.repartidor_id === repartidorId &&
        ["en_camino", "en_ruta"].includes(p.estado),
    ).length;
  }

  function abrirMapa(pedido: any) {
    const lat =
      pedido.tipo === "sucursal"
        ? pedido.sucursales?.latitud
        : pedido.clientes?.latitud;
    const lng =
      pedido.tipo === "sucursal"
        ? pedido.sucursales?.longitud
        : pedido.clientes?.longitud;
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
    }
  }

  const pedidosActivo = repartidorActivo
    ? pedidosDeRepartidor(repartidorActivo.id)
    : [];
  const pedidosEnRuta = pedidosActivo.filter((p) =>
    ["en_camino", "en_ruta"].includes(p.estado),
  );
  const pedidosEntregados = pedidosActivo.filter((p) =>
    ["entregado", "entregado_parcial"].includes(p.estado),
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Repartidores</h1>
        <p className="text-sm text-gray-400 mt-1">
          {repartidores.length} repartidores ·{" "}
          {
            pedidos.filter((p) => ["en_camino", "en_ruta"].includes(p.estado))
              .length
          }{" "}
          entregas activas
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: esMobil
            ? "1fr"
            : repartidorActivo
              ? "300px 1fr"
              : "1fr",
          gap: "1.5rem",
        }}
      >
        {/* LISTA DE REPARTIDORES */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Cargando...
            </p>
          ) : repartidores.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <p className="text-3xl mb-3">🚚</p>
              <p className="text-sm text-gray-400">
                No hay repartidores registrados
              </p>
            </div>
          ) : (
            repartidores.map((r) => {
              const estado = estadoRepartidor(r.id);
              const pendientes = totalPendientes(r.id);
              const entregados = totalEntregados(r.id);
              const activo = repartidorActivo?.id === r.id;

              return (
                <button
                  key={r.id}
                  onClick={() => setRepartidorActivo(activo ? null : r)}
                  className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${
                    activo
                      ? "border-gray-900 shadow-md"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-semibold text-gray-600">
                          {r.nombre_completo?.charAt(0)}
                        </span>
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          estado === "en_ruta" ? "bg-green-500" : "bg-gray-300"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {r.nombre_completo}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {estado === "en_ruta" ? "🟢 En ruta" : "⚪ Disponible"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-gray-900">
                        {pendientes}
                      </p>
                      <p className="text-xs text-gray-400">pendientes</p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-3 pt-3 border-t border-gray-50">
                    <div className="flex-1 text-center">
                      <p className="text-sm font-semibold text-purple-600">
                        {pendientes}
                      </p>
                      <p className="text-xs text-gray-400">En ruta</p>
                    </div>
                    <div className="w-px bg-gray-100" />
                    <div className="flex-1 text-center">
                      <p className="text-sm font-semibold text-green-600">
                        {entregados}
                      </p>
                      <p className="text-xs text-gray-400">Entregados</p>
                    </div>
                    <div className="w-px bg-gray-100" />
                    <div className="flex-1 text-center">
                      <p className="text-sm font-semibold text-gray-900">
                        {pendientes + entregados}
                      </p>
                      <p className="text-xs text-gray-400">Total</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* DETALLE DEL REPARTIDOR */}
        {repartidorActivo && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    🚚 {repartidorActivo.nombre_completo}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {pedidosEnRuta.length} en ruta · {pedidosEntregados.length}{" "}
                    entregados hoy
                  </p>
                </div>
                <button
                  onClick={() => setRepartidorActivo(null)}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✕
                </button>
              </div>

              {/* MAPA DE ENTREGAS */}
              {pedidosEnRuta.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Entregas pendientes
                  </p>
                  <div className="space-y-2">
                    {pedidosEnRuta.map((p, i) => {
                      const nombre =
                        p.tipo === "sucursal"
                          ? p.sucursales?.nombre
                          : `${p.clientes?.nombre} ${p.clientes?.apellido || ""}`;
                      const direccion =
                        p.tipo === "sucursal"
                          ? p.sucursales?.direccion
                          : p.clientes?.direccion;
                      const tieneUbicacion =
                        p.tipo === "sucursal"
                          ? p.sucursales?.latitud
                          : p.clientes?.latitud;
                      const color = coloresEstado[p.estado];

                      return (
                        <div
                          key={p.id}
                          className="border border-gray-100 rounded-xl p-3"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start gap-2">
                              <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-white text-xs font-bold">
                                  {i + 1}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {nombre}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {p.tipo === "sucursal"
                                    ? "🏪 Sucursal"
                                    : "👤 Cliente"}
                                </p>
                                {p.folio && (
                                  <p className="text-xs text-blue-500 font-medium">
                                    #{p.folio}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                style={{
                                  backgroundColor: color?.bg,
                                  color: color?.text,
                                }}
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                              >
                                {color?.label || p.estado}
                              </span>
                              <p className="text-sm font-bold text-gray-900">
                                ${Number(p.total).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {direccion && (
                            <p className="text-xs text-gray-400 ml-8 mb-2">
                              📍 {direccion}
                            </p>
                          )}

                          <div className="ml-8 space-y-0.5 mb-2">
                            {p.pedido_items
                              ?.slice(0, 3)
                              .map((item: any, idx: number) => (
                                <p key={idx} className="text-xs text-gray-500">
                                  • {item.nombre_producto}
                                  {item.nombre_variante
                                    ? ` (${item.nombre_variante})`
                                    : ""}{" "}
                                  — {item.cantidad_aprobada || item.cantidad}{" "}
                                  pzas
                                </p>
                              ))}
                            {p.pedido_items?.length > 3 && (
                              <p className="text-xs text-gray-400">
                                +{p.pedido_items.length - 3} más
                              </p>
                            )}
                          </div>

                          {tieneUbicacion && (
                            <button
                              onClick={() => abrirMapa(p)}
                              className="ml-8 text-xs text-blue-600 hover:underline"
                            >
                              🗺 Ver en Google Maps
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* HISTORIAL DEL DÍA */}
              {pedidosEntregados.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Entregados hoy
                  </p>
                  <div className="space-y-2">
                    {pedidosEntregados.map((p) => {
                      const nombre =
                        p.tipo === "sucursal"
                          ? p.sucursales?.nombre
                          : `${p.clientes?.nombre} ${p.clientes?.apellido || ""}`;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-2 border-b border-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            <div>
                              <p className="text-sm text-gray-700">{nombre}</p>
                              {p.folio && (
                                <p className="text-xs text-gray-400">
                                  #{p.folio}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              ${Number(p.total).toFixed(2)}
                            </p>
                            {p.estado === "entregado_parcial" && (
                              <p className="text-xs text-orange-500">Parcial</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pedidosActivo.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-sm text-gray-400">Sin pedidos asignados</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
