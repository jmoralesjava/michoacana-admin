"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Users, AlertTriangle } from "lucide-react";

const PERIODOS = [
  { id: "semana", label: "Esta semana" },
  { id: "quincena", label: "Esta quincena" },
  { id: "mes", label: "Este mes" },
];

function getRango(periodo: string) {
  const ahora = new Date();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  switch (periodo) {
    case "semana": {
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
      return { desde: lunes.toISOString(), hasta: ahora.toISOString() };
    }
    case "quincena": {
      const dia = hoy.getDate();
      const inicio = new Date(hoy);
      inicio.setDate(dia <= 15 ? 1 : 16);
      return { desde: inicio.toISOString(), hasta: ahora.toISOString() };
    }
    case "mes": {
      const primer = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      return { desde: primer.toISOString(), hasta: ahora.toISOString() };
    }
    default:
      return { desde: hoy.toISOString(), hasta: ahora.toISOString() };
  }
}

export default function NominaPage() {
  const [periodo, setPeriodo] = useState("semana");
  const [loading, setLoading] = useState(false);
  const [datos, setDatos] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
  }, [periodo]);

  async function cargarDatos() {
    setLoading(true);
    const rango = getRango(periodo);

    const [perfiles, jornadas, ventas, sucursales] = await Promise.all([
      supabase
        .from("perfiles")
        .select("*, sucursales(nombre)")
        .eq("activo", true),
      supabase
        .from("jornadas")
        .select(
          "*, perfiles(nombre_completo, apellido, salario_diario, tipo_pago, sucursal_id)",
        )
        .gte("inicio_at", rango.desde)
        .lte("inicio_at", rango.hasta),
      supabase
        .from("ordenes")
        .select("sucursal_id, total_con_descuento, total")
        .eq("estado", "cerrada")
        .gte("cerrada_at", rango.desde)
        .lte("cerrada_at", rango.hasta),
      supabase.from("sucursales").select("id, nombre").eq("activa", true),
    ]);

    // Calcular costo por empleado
    const costosPorEmpleado: Record<string, any> = {};

    jornadas.data?.forEach((j) => {
      const perfil = j.perfiles as any;
      if (!perfil) return;

      const id = j.perfil_id;
      if (!costosPorEmpleado[id]) {
        costosPorEmpleado[id] = {
          nombre: `${perfil.nombre_completo} ${perfil.apellido || ""}`.trim(),
          sucursal_id: perfil.sucursal_id,
          salario_diario: Number(perfil.salario_diario) || 0,
          tipo_pago: perfil.tipo_pago,
          dias_trabajados: 0,
          horas_trabajadas: 0,
          costo_total: 0,
        };
      }

      costosPorEmpleado[id].dias_trabajados += 1;
      costosPorEmpleado[id].horas_trabajadas += (j.duracion_minutos || 0) / 60;
      costosPorEmpleado[id].costo_total += Number(perfil.salario_diario) || 0;
    });

    // Calcular ventas por sucursal
    const ventasPorSucursal: Record<string, number> = {};
    ventas.data?.forEach((v) => {
      if (v.sucursal_id) {
        ventasPorSucursal[v.sucursal_id] =
          (ventasPorSucursal[v.sucursal_id] || 0) +
          Number(v.total_con_descuento || v.total);
      }
    });

    // Calcular costo por sucursal
    const costosPorSucursal: Record<string, any> = {};
    sucursales.data?.forEach((s) => {
      costosPorSucursal[s.id] = {
        nombre: s.nombre,
        ventas: ventasPorSucursal[s.id] || 0,
        costo_nomina: 0,
        empleados: 0,
      };
    });

    Object.values(costosPorEmpleado).forEach((emp: any) => {
      if (emp.sucursal_id && costosPorSucursal[emp.sucursal_id]) {
        costosPorSucursal[emp.sucursal_id].costo_nomina += emp.costo_total;
        costosPorSucursal[emp.sucursal_id].empleados += 1;
      }
    });

    const totalNomina = Object.values(costosPorEmpleado).reduce(
      (s: number, e: any) => s + e.costo_total,
      0,
    );
    const totalVentas = Object.values(ventasPorSucursal).reduce(
      (s, v) => s + v,
      0,
    );

    setDatos({
      empleados: Object.values(costosPorEmpleado).sort(
        (a: any, b: any) => b.costo_total - a.costo_total,
      ),
      sucursales: Object.values(costosPorSucursal),
      totalNomina,
      totalVentas,
      ratio: totalVentas > 0 ? (totalNomina / totalVentas) * 100 : 0,
    });
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Nómina y eficiencia
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Costo de personal vs ventas por sucursal
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
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
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          Cargando...
        </div>
      ) : datos ? (
        <div className="space-y-6">
          {/* MÉTRICAS GLOBALES */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-gray-100 shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-400">Total nómina</p>
                  <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
                    <DollarSign size={14} className="text-red-600" />
                  </div>
                </div>
                <p className="text-xl font-semibold text-gray-900">
                  ${datos.totalNomina.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-100 shadow-none">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-400">Total ventas</p>
                  <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
                    <TrendingUp size={14} className="text-green-600" />
                  </div>
                </div>
                <p className="text-xl font-semibold text-gray-900">
                  ${datos.totalVentas.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card
              className={`shadow-none border ${datos.ratio > 30 ? "border-red-200 bg-red-50/30" : "border-gray-100"}`}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-400">Nómina / Ventas</p>
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${datos.ratio > 30 ? "bg-red-100" : "bg-blue-50"}`}
                  >
                    {datos.ratio > 30 ? (
                      <AlertTriangle size={14} className="text-red-600" />
                    ) : (
                      <Users size={14} className="text-blue-600" />
                    )}
                  </div>
                </div>
                <p
                  className={`text-xl font-semibold ${datos.ratio > 30 ? "text-red-600" : "text-gray-900"}`}
                >
                  {datos.ratio.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {datos.ratio > 30
                    ? "⚠ Alto — revisar personal"
                    : "Dentro del rango"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="sucursales">
            <TabsList className="mb-4">
              <TabsTrigger value="sucursales">Por sucursal</TabsTrigger>
              <TabsTrigger value="empleados">Por empleado</TabsTrigger>
            </TabsList>

            {/* POR SUCURSAL */}
            <TabsContent value="sucursales">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sucursal</TableHead>
                      <TableHead className="text-right">Empleados</TableHead>
                      <TableHead className="text-right">Costo nómina</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Ratio</TableHead>
                      <TableHead className="text-right">Eficiencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {datos.sucursales
                      .sort((a: any, b: any) => b.ventas - a.ventas)
                      .map((s: any) => {
                        const ratio =
                          s.ventas > 0 ? (s.costo_nomina / s.ventas) * 100 : 0;
                        const alerta = ratio > 30;
                        return (
                          <TableRow
                            key={s.nombre}
                            className={alerta ? "bg-red-50/20" : ""}
                          >
                            <TableCell className="font-medium">
                              {s.nombre}
                            </TableCell>
                            <TableCell className="text-right text-gray-500">
                              {s.empleados}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              ${s.costo_nomina.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              ${s.ventas.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`font-medium ${alerta ? "text-red-600" : "text-gray-700"}`}
                              >
                                {ratio.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  alerta
                                    ? "bg-red-50 text-red-700"
                                    : "bg-green-50 text-green-700"
                                }`}
                              >
                                {alerta ? "⚠ Revisar" : "✓ OK"}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* POR EMPLEADO */}
            <TabsContent value="empleados">
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead className="text-right">
                        Días trabajados
                      </TableHead>
                      <TableHead className="text-right">Horas</TableHead>
                      <TableHead className="text-right">
                        Salario diario
                      </TableHead>
                      <TableHead className="text-right">
                        Costo período
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {datos.empleados.map((e: any) => (
                      <TableRow key={e.nombre}>
                        <TableCell className="font-medium">
                          {e.nombre}
                        </TableCell>
                        <TableCell className="text-right text-gray-500">
                          {e.dias_trabajados}
                        </TableCell>
                        <TableCell className="text-right text-gray-500">
                          {e.horas_trabajadas.toFixed(1)}h
                        </TableCell>
                        <TableCell className="text-right text-gray-500">
                          ${e.salario_diario.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          ${e.costo_total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {datos.empleados.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-gray-400 text-sm"
                        >
                          Sin jornadas registradas en este período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
}
