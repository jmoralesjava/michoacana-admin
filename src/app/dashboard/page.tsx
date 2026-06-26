"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShoppingBag,
  TrendingUp,
  Users,
  AlertTriangle,
  Package,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    ventasHoy: 0,
    ventasAyer: 0,
    ordenesHoy: 0,
    empleadosActivos: 0,
    insumosbajos: 0,
    pedidosPendientes: 0,
    pedidosEnRuta: 0,
    pedidosEntregadosHoy: 0,
  });
  const [pedidosPendientes, setPedidosPendientes] = useState<any[]>([]);
  const [repartidoresEnRuta, setRepartidoresEnRuta] = useState<any[]>([]);
  const [insumosAlerta, setInsumosAlerta] = useState<any[]>([]);

  useEffect(() => {
    cargarTodo();

    const canal = supabase
      .channel("dashboard-realtime")
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
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    const [
      pagosHoy,
      pagosAyer,
      ordenes,
      asistencias,
      inventario,
      pedidos,
      perfiles,
    ] = await Promise.all([
      supabase
        .from("pagos")
        .select("monto")
        .gte("created_at", hoy.toISOString()),
      supabase
        .from("pagos")
        .select("monto")
        .gte("created_at", ayer.toISOString())
        .lt("created_at", hoy.toISOString()),
      supabase
        .from("ordenes")
        .select("id")
        .eq("estado", "cerrada")
        .gte("cerrada_at", hoy.toISOString()),
      supabase
        .from("asistencias")
        .select("perfil_id")
        .eq("tipo", "entrada")
        .gte("created_at", hoy.toISOString()),
      supabase
        .from("inventario_insumos")
        .select(
          "cantidad_actual, insumos(nombre, unidad_medida, stock_minimo), sucursales(nombre)",
        ),
      supabase
        .from("pedidos_cliente")
        .select(
          `
        *,
        clientes(nombre, apellido),
        sucursales(nombre),
        pedido_items(nombre_producto, cantidad),
        repartidor:repartidor_id(nombre_completo)
      `,
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("perfiles")
        .select("id, nombre_completo, ultima_ubicacion_at")
        .eq("rol", "repartidor")
        .eq("activo", true),
    ]);

    const ventasHoy =
      pagosHoy.data?.reduce((s, p) => s + Number(p.monto), 0) || 0;
    const ventasAyer =
      pagosAyer.data?.reduce((s, p) => s + Number(p.monto), 0) || 0;

    const pedidosData = pedidos.data || [];
    const pendientes = pedidosData.filter((p) =>
      ["enviado", "revisado"].includes(p.estado),
    );
    const enRuta = pedidosData.filter((p) =>
      ["en_camino", "en_ruta"].includes(p.estado),
    );
    const entregadosHoy = pedidosData.filter(
      (p) =>
        ["entregado", "entregado_parcial"].includes(p.estado) &&
        new Date(p.updated_at) >= hoy,
    );

    const insumosBajos = (inventario.data || []).filter(
      (i) => i.cantidad_actual <= (i.insumos as any)?.stock_minimo,
    );

    // Repartidores con pedidos activos
    const repsEnRuta = (perfiles.data || [])
      .map((r) => ({
        ...r,
        pedidosActivos: enRuta.filter((p) => p.repartidor_id === r.id),
        pedidosEntregados: entregadosHoy.filter((p) => p.repartidor_id === r.id)
          .length,
      }))
      .filter((r) => r.pedidosActivos.length > 0);

    setStats({
      ventasHoy,
      ventasAyer,
      ordenesHoy: ordenes.data?.length || 0,
      empleadosActivos: new Set(asistencias.data?.map((a) => a.perfil_id)).size,
      insumosbajos: insumosBajos.length,
      pedidosPendientes: pendientes.length,
      pedidosEnRuta: enRuta.length,
      pedidosEntregadosHoy: entregadosHoy.length,
    });

    setPedidosPendientes(pendientes.slice(0, 5));
    setRepartidoresEnRuta(repsEnRuta);
    setInsumosAlerta(insumosBajos.slice(0, 5));
    setLoading(false);
  }

  const variacionVentas =
    stats.ventasAyer > 0
      ? (
          ((stats.ventasHoy - stats.ventasAyer) / stats.ventasAyer) *
          100
        ).toFixed(1)
      : null;

  function tiempoTranscurrido(fecha: string) {
    const diff = Date.now() - new Date(fecha).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-gray-400">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Bienvenido</h1>
        <p className="text-sm text-gray-400 mt-1">
          {new Date().toLocaleDateString("es-MX", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Ventas hoy */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Ventas hoy
            </p>
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp size={15} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${stats.ventasHoy.toFixed(2)}
          </p>
          {variacionVentas !== null && (
            <p
              className={`text-xs mt-1 font-medium ${Number(variacionVentas) >= 0 ? "text-green-600" : "text-red-500"}`}
            >
              {Number(variacionVentas) >= 0 ? "↑" : "↓"}{" "}
              {Math.abs(Number(variacionVentas))}% vs ayer
            </p>
          )}
        </div>

        {/* Pedidos pendientes */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Pedidos pendientes
            </p>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.pedidosPendientes > 0 ? "bg-amber-50" : "bg-gray-50"}`}
            >
              <Clock
                size={15}
                className={
                  stats.pedidosPendientes > 0
                    ? "text-amber-600"
                    : "text-gray-400"
                }
              />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.pedidosPendientes}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            esperando aprobación de fábrica
          </p>
        </div>

        {/* En ruta */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              En ruta
            </p>
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
              <Truck size={15} className="text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.pedidosEnRuta}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.pedidosEntregadosHoy} entregados hoy
          </p>
        </div>

        {/* Empleados */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Empleados activos
            </p>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users size={15} className="text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats.empleadosActivos}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            registraron asistencia hoy
          </p>
        </div>

        {/* Insumos bajos */}
        <div
          className={`rounded-xl border p-5 ${stats.insumosbajos > 0 ? "bg-red-50 border-red-100" : "bg-white border-gray-100"}`}
        >
          <div className="flex items-center justify-between mb-3">
            <p
              className={`text-xs font-medium uppercase tracking-wide ${stats.insumosbajos > 0 ? "text-red-500" : "text-gray-500"}`}
            >
              Insumos bajos
            </p>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.insumosbajos > 0 ? "bg-red-100" : "bg-gray-50"}`}
            >
              <AlertTriangle
                size={15}
                className={
                  stats.insumosbajos > 0 ? "text-red-600" : "text-gray-400"
                }
              />
            </div>
          </div>
          <p
            className={`text-2xl font-bold ${stats.insumosbajos > 0 ? "text-red-600" : "text-gray-900"}`}
          >
            {stats.insumosbajos}
          </p>
          <p
            className={`text-xs mt-1 ${stats.insumosbajos > 0 ? "text-red-400" : "text-gray-400"}`}
          >
            {stats.insumosbajos > 0 ? "requieren atención" : "todo en orden"}
          </p>
        </div>

        {/* Órdenes POS */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Órdenes POS
            </p>
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <ShoppingBag size={15} className="text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.ordenesHoy}</p>
          <p className="text-xs text-gray-400 mt-1">ventas en sucursales hoy</p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* PEDIDOS PENDIENTES */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">
              Pedidos pendientes
            </h2>
            <Link
              href="/dashboard/fabrica"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          {pedidosPendientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <CheckCircle size={32} className="mb-2 text-green-300" />
              <p className="text-sm text-gray-400">Sin pedidos pendientes</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {pedidosPendientes.map((p) => {
                const nombre =
                  p.tipo === "sucursal"
                    ? p.sucursales?.nombre
                    : `${p.clientes?.nombre} ${p.clientes?.apellido || ""}`;
                return (
                  <div
                    key={p.id}
                    className="px-5 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {nombre}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.tipo === "sucursal" ? "🏪" : "👤"}{" "}
                        {p.pedido_items?.length} productos · $
                        {Number(p.total).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.estado === "enviado"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {p.estado === "enviado" ? "Nuevo" : "Revisado"}
                      </span>
                      <p className="text-xs text-gray-300 mt-1">
                        {tiempoTranscurrido(p.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* REPARTIDORES EN RUTA */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">
              Repartidores en ruta
            </h2>
            <Link
              href="/dashboard/repartidores"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              Ver panel <ArrowRight size={12} />
            </Link>
          </div>
          {repartidoresEnRuta.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Truck size={32} className="mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Sin repartidores en ruta</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {repartidoresEnRuta.map((r) => (
                <div
                  key={r.id}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-600">
                          {r.nombre_completo?.charAt(0)}
                        </span>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {r.nombre_completo}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {r.pedidosActivos.length} en ruta ·{" "}
                        {r.pedidosEntregados} entregados
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/repartidores"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Ver →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* INSUMOS CON ALERTA */}
        {insumosAlerta.length > 0 && (
          <div className="bg-white rounded-xl border border-red-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-red-50">
              <h2 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                <AlertTriangle size={14} /> Insumos con stock bajo
              </h2>
              <Link
                href="/dashboard/insumos"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {insumosAlerta.map((inv, i) => {
                const insumo = inv.insumos as any;
                const sucursal = inv.sucursales as any;
                const porcentaje =
                  insumo?.stock_minimo > 0
                    ? Math.min(
                        100,
                        (inv.cantidad_actual / insumo.stock_minimo) * 100,
                      )
                    : 0;
                return (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-gray-900">
                        {insumo?.nombre}
                      </p>
                      <p className="text-xs text-red-500 font-medium">
                        {inv.cantidad_actual} {insumo?.unidad_medida}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 flex-shrink-0">
                        {sucursal?.nombre}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ACTIVIDAD RECIENTE */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">
              Actividad reciente
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {[...pedidosPendientes].slice(0, 4).map((p) => {
              const nombre =
                p.tipo === "sucursal"
                  ? p.sucursales?.nombre
                  : `${p.clientes?.nombre} ${p.clientes?.apellido || ""}`;
              return (
                <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      p.estado === "enviado" ? "bg-blue-50" : "bg-amber-50"
                    }`}
                  >
                    <Package
                      size={13}
                      className={
                        p.estado === "enviado"
                          ? "text-blue-600"
                          : "text-amber-600"
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      Nuevo pedido de{" "}
                      <span className="font-medium">{nombre}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {tiempoTranscurrido(p.created_at)} · $
                      {Number(p.total).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
            {pedidosPendientes.length === 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-400">Sin actividad reciente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
