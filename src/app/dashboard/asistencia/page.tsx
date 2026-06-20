"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock, UserCheck, Camera } from "lucide-react";

const PERIODOS = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mes" },
];

function getRango(periodo: string) {
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
      return { desde: hoy.toISOString(), hasta: ahora.toISOString() };
  }
}

export default function AsistenciaPage() {
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [jornadas, setJornadas] = useState<any[]>([]);
  const [periodo, setPeriodo] = useState("hoy");
  const [loading, setLoading] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [periodo]);

  async function cargarDatos() {
    setLoading(true);
    const rango = getRango(periodo);

    const [asist, jorn] = await Promise.all([
      supabase
        .from("asistencias")
        .select(
          "*, perfiles(nombre_completo, apellido, rol), sucursales(nombre)",
        )
        .gte("created_at", rango.desde)
        .lte("created_at", rango.hasta)
        .order("created_at", { ascending: false }),
      supabase
        .from("jornadas")
        .select("*, perfiles(nombre_completo, apellido), sucursales(nombre)")
        .gte("inicio_at", rango.desde)
        .order("inicio_at", { ascending: false }),
    ]);

    if (asist.data) setAsistencias(asist.data);
    if (jorn.data) setJornadas(jorn.data);
    setLoading(false);
  }

  function formatHoras(minutos: number) {
    if (!minutos) return "—";
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h}h ${m}m`;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Asistencia</h1>
        <p className="text-sm text-gray-400 mt-1">
          Registros de entrada y salida con foto
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

      <Tabs defaultValue="registros">
        <TabsList className="mb-6">
          <TabsTrigger value="registros">
            Registros ({asistencias.length})
          </TabsTrigger>
          <TabsTrigger value="jornadas">
            Jornadas ({jornadas.length})
          </TabsTrigger>
        </TabsList>

        {/* REGISTROS DE ASISTENCIA */}
        <TabsContent value="registros">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Foto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-400 text-sm"
                    >
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : asistencias.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-400 text-sm"
                    >
                      Sin registros en este período
                    </TableCell>
                  </TableRow>
                ) : (
                  asistencias.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {(a.perfiles as any)?.nombre_completo}{" "}
                            {(a.perfiles as any)?.apellido}
                          </p>
                          <p className="text-xs text-gray-400 capitalize">
                            {(a.perfiles as any)?.rol}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {(a.sucursales as any)?.nombre}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            a.tipo === "entrada"
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {a.tipo === "entrada" ? "↓ Entrada" : "↑ Salida"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(a.created_at).toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        {a.dentro_rango !== null ? (
                          <span
                            className={`text-xs ${a.dentro_rango ? "text-green-600" : "text-red-500"}`}
                          >
                            {a.dentro_rango
                              ? "✓ En rango"
                              : `⚠ ${a.distancia_metros}m`}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">
                            Dev mode
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {a.foto_url ? (
                          <button
                            onClick={() => setFotoUrl(a.foto_url)}
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                          >
                            <Camera size={16} />
                          </button>
                        ) : (
                          <span className="text-gray-200">
                            <Camera size={16} />
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* JORNADAS */}
        <TabsContent value="jornadas">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-400 text-sm"
                    >
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : jornadas.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-400 text-sm"
                    >
                      Sin jornadas en este período
                    </TableCell>
                  </TableRow>
                ) : (
                  jornadas.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell>
                        <p className="text-sm font-medium text-gray-900">
                          {(j.perfiles as any)?.nombre_completo}{" "}
                          {(j.perfiles as any)?.apellido}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {(j.sucursales as any)?.nombre}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(j.inicio_at).toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {j.fin_at
                          ? new Date(j.fin_at).toLocaleTimeString("es-MX", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        {j.duracion_minutos ? (
                          formatHoras(j.duracion_minutos)
                        ) : (
                          <span className="text-green-600 text-xs">
                            En turno
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            j.fin_at
                              ? "bg-gray-50 text-gray-600"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {j.fin_at ? "Completada" : "Activa"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL FOTO */}
      {fotoUrl && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setFotoUrl(null)}
        >
          <div className="relative max-w-sm w-full">
            <img
              src={fotoUrl}
              alt="Foto de asistencia"
              className="w-full rounded-xl"
            />
            <button
              className="absolute top-3 right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-900"
              onClick={() => setFotoUrl(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
