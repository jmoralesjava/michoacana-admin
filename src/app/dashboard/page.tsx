"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, TrendingUp, Users, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    ventasHoy: 0,
    ordenesHoy: 0,
    empleadosActivos: 0,
    insumosbajos: 0,
  });

  useEffect(() => {
    cargarStats();
  }, []);

  async function cargarStats() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const { data: pagos } = await supabase
      .from("pagos")
      .select("monto, ordenes(cerrada_at, estado)")
      .eq("ordenes.estado", "cerrada")
      .gte("ordenes.cerrada_at", hoy.toISOString());

    const { data: ordenes } = await supabase
      .from("ordenes")
      .select("id")
      .eq("estado", "cerrada")
      .gte("cerrada_at", hoy.toISOString());

    const { data: asistencias } = await supabase
      .from("asistencias")
      .select("perfil_id")
      .eq("tipo", "entrada")
      .gte("created_at", hoy.toISOString());

    const { data: inventario } = await supabase
      .from("inventario_insumos")
      .select("cantidad_actual, insumos(stock_minimo)");

    const ventasHoy =
      pagos?.reduce((s, p) => s + (p.ordenes ? Number(p.monto) : 0), 0) || 0;
    const insumosbajos =
      inventario?.filter(
        (i) => i.cantidad_actual <= (i.insumos as any)?.stock_minimo,
      ).length || 0;

    setStats({
      ventasHoy,
      ordenesHoy: ordenes?.length || 0,
      empleadosActivos: new Set(asistencias?.map((a) => a.perfil_id)).size,
      insumosbajos,
    });
  }

  const cards = [
    {
      title: "Ventas hoy",
      value: `$${stats.ventasHoy.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Órdenes hoy",
      value: stats.ordenesHoy.toString(),
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Empleados activos",
      value: stats.empleadosActivos.toString(),
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Insumos bajos",
      value: stats.insumosbajos.toString(),
      icon: AlertTriangle,
      color: stats.insumosbajos > 0 ? "text-red-600" : "text-gray-400",
      bg: stats.insumosbajos > 0 ? "bg-red-50" : "bg-gray-50",
    },
  ];

  return (
    <div>
      <div className="mb-8">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-gray-100 shadow-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <div
                    className={`w-8 h-8 ${card.bg} rounded-lg flex items-center justify-center`}
                  >
                    <Icon size={16} className={card.color} />
                  </div>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {card.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
