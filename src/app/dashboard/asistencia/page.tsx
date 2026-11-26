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
import { Clock, UserCheck, Camera, Pencil } from "lucide-react";

function aCampo(fecha: string | null) {
  if (!fecha) return "";
  const d = new Date(fecha);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

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
  const [editando, setEditando] = useState<any>(null);
  const [ajuste, setAjuste] = useState({
    entrada: "",
    salida: "",
    sinRetardo: false,
    nota: "",
  });
  const [guardando, setGuardando] = useState(false);

  function abrirAjuste(j: any) {
    setEditando(j);
    setAjuste({
      entrada: aCampo(j.inicio_at),
      salida: aCampo(j.fin_at),
      sinRetardo: false,
      nota: j.ajuste_nota || "",
    });
  }

  async function guardarAjuste() {
    if (!editando) return;
    if (!ajuste.entrada) {
      alert("La hora de entrada es obligatoria");
      return;
    }
    if (!ajuste.nota.trim()) {
      alert("Escribe el motivo del ajuste");
      return;
    }
    const entrada = new Date(ajuste.entrada);
    const salida = ajuste.salida ? new Date(ajuste.salida) : null;
    if (salida && salida <= entrada) {
      alert("La salida debe ser posterior a la entrada");
      return;
    }

    let retardo = 0;
    if (!ajuste.sinRetardo && editando.hora_entrada_programada) {
      const [h, m] = String(editando.hora_entrada_programada).split(":").map(Number);
      const programada = new Date(entrada);
      programada.setHours(h, m || 0, 0, 0);
      const tarde = Math.floor((entrada.getTime() - programada.getTime()) / 60000);
      retardo = tarde > 5 ? tarde : 0;
    }

    let perfilAdmin: any = null;
    try {
      perfilAdmin = JSON.parse(localStorage.getItem("perfil_admin") || "null");
    } catch {}

    setGuardando(true);
    const { data, error } = await supabase
      .from("jornadas")
      .update({
        inicio_at: entrada.toISOString(),
        fin_at: salida ? salida.toISOString() : null,
        duracion_minutos: salida
          ? Math.round((salida.getTime() - entrada.getTime()) / 60000)
          : null,
        minutos_retardo: retardo,
        ajuste_nota: ajuste.nota.trim(),
        ajustado_por: perfilAdmin?.id || null,
        ajustado_at: new Date().toISOString(),
      })
      .eq("id", editando.id)
      .select("id");
    setGuardando(false);

    if (error || !data || data.length === 0) {
      alert(
        `No se pudo guardar: ${error?.message || "la base no aplicó el cambio (permisos)"}`,
      );
      return;
    }
    setEditando(null);
    cargarDatos();
  }

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
                  <TableHead></TableHead>
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
                        {j.ajuste_nota && (
                          <span
                            className="ml-2 text-xs text-amber-600"
                            title={j.ajuste_nota}
                          >
                            Ajustada
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => abrirAjuste(j)}
                          title="Corregir entrada o salida"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Pencil size={15} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {editando && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setEditando(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Corregir jornada
              </h2>
              <p className="text-sm text-gray-500">
                {editando.perfiles?.nombre_completo} {editando.perfiles?.apellido}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <label className="space-y-1.5 block">
                <span className="text-sm font-medium text-gray-700">Entrada</span>
                <Input
                  type="datetime-local"
                  value={ajuste.entrada}
                  onChange={(e) => setAjuste({ ...ajuste, entrada: e.target.value })}
                />
              </label>
              <label className="space-y-1.5 block">
                <span className="text-sm font-medium text-gray-700">Salida</span>
                <Input
                  type="datetime-local"
                  value={ajuste.salida}
                  onChange={(e) => setAjuste({ ...ajuste, salida: e.target.value })}
                />
                <span className="text-xs text-gray-400">
                  Déjala vacía si la jornada sigue activa.
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={ajuste.sinRetardo}
                  onChange={(e) =>
                    setAjuste({ ...ajuste, sinRetardo: e.target.checked })
                  }
                />
                No descontar retardo (permiso con goce de sueldo)
              </label>
              <label className="space-y-1.5 block">
                <span className="text-sm font-medium text-gray-700">
                  Motivo del ajuste
                </span>
                <Input
                  value={ajuste.nota}
                  onChange={(e) => setAjuste({ ...ajuste, nota: e.target.value })}
                  placeholder="Ej. olvidó registrar su salida"
                  maxLength={200}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditando(null)}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={guardarAjuste} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

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
