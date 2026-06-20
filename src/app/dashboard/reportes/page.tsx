"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, ShoppingBag, Users, DollarSign } from "lucide-react";

const PERIODOS = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
  { id: "personalizado", label: "Personalizado" },
];

function getRango(periodo: string, fechas: { desde: string; hasta: string }) {
  const ahora = new Date();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  switch (periodo) {
    case "hoy":
      return { desde: hoy.toISOString(), hasta: ahora.toISOString() };
    case "semana": {
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
      return { desde: lunes.toISOString(), hasta: ahora.toISOString() };
    }
    case "mes": {
      const primer = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return { desde: primer.toISOString(), hasta: ahora.toISOString() };
    }
    default:
      return {
        desde: new Date(fechas.desde + "T00:00:00").toISOString(),
        hasta: new Date(fechas.hasta + "T23:59:59").toISOString(),
      };
  }
}

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState("hoy");
  const [fechas, setFechas] = useState({
    desde: new Date().toISOString().split("T")[0],
    hasta: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [reporte, setReporte] = useState<any>(null);

  useEffect(() => {
    if (periodo !== "personalizado") cargarReporte();
  }, [periodo]);

  async function cargarReporte() {
    setLoading(true);
    const rango = getRango(periodo, fechas);

    const [ordenes, pagos, items, asistencias, sucursales] = await Promise.all([
      supabase
        .from("ordenes")
        .select(
          "id, total, total_con_descuento, sucursal_id, cerrada_at, sucursales(nombre)",
        )
        .eq("estado", "cerrada")
        .gte("cerrada_at", rango.desde)
        .lte("cerrada_at", rango.hasta),
      supabase
        .from("pagos")
        .select("metodo, monto, ordenes(cerrada_at, estado, sucursal_id)")
        .eq("ordenes.estado", "cerrada")
        .gte("ordenes.cerrada_at", rango.desde)
        .lte("ordenes.cerrada_at", rango.hasta),
      supabase
        .from("orden_items")
        .select(
          "cantidad, precio_unitario, productos(nombre), ordenes(cerrada_at, estado, sucursal_id)",
        )
        .eq("ordenes.estado", "cerrada")
        .gte("ordenes.cerrada_at", rango.desde)
        .lte("ordenes.cerrada_at", rango.hasta),
      supabase
        .from("asistencias")
        .select("perfil_id, tipo, sucursal_id")
        .eq("tipo", "entrada")
        .gte("created_at", rango.desde)
        .lte("created_at", rango.hasta),
      supabase.from("sucursales").select("id, nombre").eq("activa", true),
    ]);

    // Totales globales
    const totalVentas =
      pagos.data?.reduce((s, p) => s + (p.ordenes ? Number(p.monto) : 0), 0) ||
      0;
    const totalOrdenes = ordenes.data?.length || 0;
    const ticketPromedio = totalOrdenes > 0 ? totalVentas / totalOrdenes : 0;
    const empleadosActivos = new Set(asistencias.data?.map((a) => a.perfil_id))
      .size;

    // Por método de pago
    const porMetodo: Record<string, number> = {
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0,
    };
    pagos.data?.forEach((p) => {
      if (p.ordenes)
        porMetodo[p.metodo] = (porMetodo[p.metodo] || 0) + Number(p.monto);
    });

    // Por sucursal
    const porSucursal: Record<string, any> = {};
    sucursales.data?.forEach((s) => {
      porSucursal[s.id] = { nombre: s.nombre, ventas: 0, ordenes: 0 };
    });
    ordenes.data?.forEach((o) => {
      if (o.sucursal_id && porSucursal[o.sucursal_id]) {
        porSucursal[o.sucursal_id].ventas += Number(
          o.total_con_descuento || o.total,
        );
        porSucursal[o.sucursal_id].ordenes += 1;
      }
    });

    // Top productos
    const productosMap: Record<string, any> = {};
    items.data?.forEach((item) => {
      if (item.ordenes && item.productos) {
        const nombre = (item.productos as any).nombre;
        if (!productosMap[nombre])
          productosMap[nombre] = { nombre, cantidad: 0, total: 0 };
        productosMap[nombre].cantidad += item.cantidad;
        productosMap[nombre].total +=
          item.cantidad * Number(item.precio_unitario);
      }
    });
    const topProductos = Object.values(productosMap)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    setReporte({
      totalVentas,
      totalOrdenes,
      ticketPromedio,
      empleadosActivos,
      porMetodo,
      porSucursal: Object.values(porSucursal),
      topProductos,
    });
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-400 mt-1">
          Vista global de todas las sucursales
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              periodo === p.id
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {p.label}
          </button>
        ))}
        {periodo === "personalizado" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={fechas.desde}
              onChange={(e) => setFechas({ ...fechas, desde: e.target.value })}
              className="w-36 h-9 text-sm"
            />
            <span className="text-gray-400 text-sm">—</span>
            <Input
              type="date"
              value={fechas.hasta}
              onChange={(e) => setFechas({ ...fechas, hasta: e.target.value })}
              className="w-36 h-9 text-sm"
            />
            <Button size="sm" onClick={cargarReporte}>
              Buscar
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          Cargando reporte...
        </div>
      ) : reporte ? (
        <div className="space-y-6">
          {/* MÉTRICAS GLOBALES */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total ventas",
                value: `$${reporte.totalVentas.toFixed(2)}`,
                icon: DollarSign,
                color: "text-green-600",
                bg: "bg-green-50",
              },
              {
                label: "Órdenes",
                value: reporte.totalOrdenes,
                icon: ShoppingBag,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "Ticket promedio",
                value: `$${reporte.ticketPromedio.toFixed(2)}`,
                icon: TrendingUp,
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                label: "Empleados activos",
                value: reporte.empleadosActivos,
                icon: Users,
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.label} className="border-gray-100 shadow-none">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-gray-400">{m.label}</p>
                      <div
                        className={`w-7 h-7 ${m.bg} rounded-lg flex items-center justify-center`}
                      >
                        <Icon size={14} className={m.color} />
                      </div>
                    </div>
                    <p className="text-xl font-semibold text-gray-900">
                      {m.value}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Tabs defaultValue="sucursales">
            <TabsList className="mb-4">
              <TabsTrigger value="sucursales">Por sucursal</TabsTrigger>
              <TabsTrigger value="productos">Productos</TabsTrigger>
              <TabsTrigger value="pagos">Métodos de pago</TabsTrigger>
            </TabsList>

            {/* POR SUCURSAL */}
            <TabsContent value="sucursales">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sucursal</TableHead>
                      <TableHead className="text-right">Órdenes</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">
                        Ticket promedio
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reporte.porSucursal
                      .sort((a: any, b: any) => b.ventas - a.ventas)
                      .map((s: any) => (
                        <TableRow key={s.nombre}>
                          <TableCell className="font-medium">
                            {s.nombre}
                          </TableCell>
                          <TableCell className="text-right text-gray-500">
                            {s.ordenes}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${s.ventas.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-gray-500">
                            $
                            {s.ordenes > 0
                              ? (s.ventas / s.ordenes).toFixed(2)
                              : "0.00"}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* TOP PRODUCTOS */}
            <TabsContent value="productos">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reporte.topProductos.map((p: any, i: number) => (
                      <TableRow key={p.nombre}>
                        <TableCell className="text-gray-300 font-bold">
                          #{i + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {p.nombre}
                        </TableCell>
                        <TableCell className="text-right text-gray-500">
                          {p.cantidad}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${p.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* MÉTODOS DE PAGO */}
            <TabsContent value="pagos">
              <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                {Object.entries(reporte.porMetodo).map(
                  ([metodo, monto]: any) => {
                    const pct =
                      reporte.totalVentas > 0
                        ? (monto / reporte.totalVentas) * 100
                        : 0;
                    return (
                      <div key={metodo}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium capitalize text-gray-700">
                            {metodo}
                          </span>
                          <span className="text-gray-500">
                            ${monto.toFixed(2)} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-2 bg-gray-900 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
}
