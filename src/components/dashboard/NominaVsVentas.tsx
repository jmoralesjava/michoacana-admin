"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const LIMITE_SANO = 35;
const LIMITE_ALERTA = 100;

type Fila = {
  id: string;
  nombre: string;
  ventas: number;
  nomina: number;
  empleados: number;
  vende: boolean;
};

const pesos = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

function aMinutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

function nivel(porcentaje: number | null) {
  if (porcentaje === null) return "sin";
  if (porcentaje >= LIMITE_ALERTA) return "rojo";
  if (porcentaje >= LIMITE_SANO) return "ambar";
  return "verde";
}

const ESTILOS: Record<string, { barra: string; texto: string; fondo: string; etiqueta: string }> = {
  verde: {
    barra: "bg-green-500",
    texto: "text-green-700",
    fondo: "bg-green-50",
    etiqueta: "Saludable",
  },
  ambar: {
    barra: "bg-amber-500",
    texto: "text-amber-700",
    fondo: "bg-amber-50",
    etiqueta: "Atención",
  },
  rojo: {
    barra: "bg-red-500",
    texto: "text-red-700",
    fondo: "bg-red-50",
    etiqueta: "Nómina supera la venta",
  },
  sin: {
    barra: "bg-gray-300",
    texto: "text-gray-500",
    fondo: "bg-gray-50",
    etiqueta: "Sin ventas todavía",
  },
};

export default function NominaVsVentas() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizado, setActualizado] = useState<Date | null>(null);

  useEffect(() => {
    cargar();
    const reloj = setInterval(cargar, 60000);
    const canal = supabase
      .channel("nomina-vs-ventas")
      .on("postgres_changes", { event: "*", schema: "public", table: "ordenes" }, () =>
        cargar(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "jornadas" }, () =>
        cargar(),
      )
      .subscribe();

    return () => {
      clearInterval(reloj);
      supabase.removeChannel(canal);
    };
  }, []);

  async function cargar() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [sucursales, ordenes, jornadas] = await Promise.all([
      supabase.from("sucursales").select("id, nombre, activa").order("nombre"),
      supabase
        .from("ordenes")
        .select("sucursal_id, total, total_con_descuento")
        .eq("estado", "cerrada")
        .gte("cerrada_at", hoy.toISOString()),
      supabase
        .from("jornadas")
        .select(
          "perfil_id, sucursal_id, inicio_at, fin_at, perfiles(salario_diario, hora_entrada, hora_salida)",
        )
        .gte("inicio_at", hoy.toISOString()),
    ]);

    const ahora = Date.now();
    const porSucursal: Record<string, Fila> = {};
    for (const s of (sucursales.data || []) as any[]) {
      if (s.activa === false) continue;
      porSucursal[s.id] = {
        id: s.id,
        nombre: s.nombre,
        ventas: 0,
        nomina: 0,
        empleados: 0,
        vende: !/f[aá]brica/i.test(s.nombre),
      };
    }

    for (const o of (ordenes.data || []) as any[]) {
      const fila = porSucursal[o.sucursal_id];
      if (fila) fila.ventas += Number(o.total_con_descuento ?? o.total) || 0;
    }

    const contados = new Set<string>();
    for (const j of (jornadas.data || []) as any[]) {
      const fila = porSucursal[j.sucursal_id];
      if (!fila) continue;
      const perfil = Array.isArray(j.perfiles) ? j.perfiles[0] : j.perfiles;
      const salario = Number(perfil?.salario_diario) || 0;

      let minutosJornada = 480;
      if (perfil?.hora_entrada && perfil?.hora_salida) {
        const diferencia = aMinutos(perfil.hora_salida) - aMinutos(perfil.hora_entrada);
        if (diferencia > 0) minutosJornada = diferencia;
      }

      const fin = j.fin_at ? new Date(j.fin_at).getTime() : ahora;
      const trabajados = Math.max(0, (fin - new Date(j.inicio_at).getTime()) / 60000);
      fila.nomina += salario * Math.min(1, trabajados / minutosJornada);

      const llave = `${j.sucursal_id}-${j.perfil_id}`;
      if (!contados.has(llave)) {
        contados.add(llave);
        fila.empleados += 1;
      }
    }

    setFilas(Object.values(porSucursal));
    setActualizado(new Date());
    setCargando(false);
  }

  const tiendas = filas.filter((f) => f.vende);
  const totalVentas = tiendas.reduce((s, f) => s + f.ventas, 0);
  const totalNomina = tiendas.reduce((s, f) => s + f.nomina, 0);
  const porcentajeTotal = totalVentas > 0 ? (totalNomina / totalVentas) * 100 : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Nómina contra ventas de hoy
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Cuánto de lo vendido se está yendo en sueldos, por sucursal
          </p>
        </div>
        {actualizado && (
          <p className="text-xs text-gray-400">
            Actualizado{" "}
            {actualizado.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>

      {cargando ? (
        <p className="text-sm text-gray-400">Calculando...</p>
      ) : filas.length === 0 ? (
        <p className="text-sm text-gray-400">No hay sucursales activas.</p>
      ) : (
        <div className="space-y-5">
          {filas.map((f) => {
            const porcentaje =
              f.vende && f.ventas > 0 ? (f.nomina / f.ventas) * 100 : null;
            const clave = f.vende
              ? f.ventas === 0 && f.nomina === 0
                ? "sin"
                : f.ventas === 0
                  ? "rojo"
                  : nivel(porcentaje)
              : "sin";
            const e = ESTILOS[clave];
            const ancho = porcentaje === null ? (clave === "rojo" ? 100 : 0) : Math.min(100, porcentaje);

            return (
              <div key={f.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-sm font-medium text-gray-900">{f.nombre}</p>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.fondo} ${e.texto}`}
                  >
                    {!f.vende
                      ? "No vende al público"
                      : clave === "rojo" && f.ventas === 0
                        ? "Hay nómina y aún no hay ventas"
                        : e.etiqueta}
                  </span>
                </div>

                <div className="mt-2 h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${e.barra} transition-all duration-500`}
                    style={{ width: `${ancho}%` }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>
                    Ventas <strong className="text-gray-900">{pesos(f.ventas)}</strong>
                  </span>
                  <span>
                    Nómina <strong className="text-gray-900">{pesos(f.nomina)}</strong>
                    {f.empleados > 0 ? ` (${f.empleados} en turno hoy)` : ""}
                  </span>
                  {f.vende && (
                    <span className={`font-semibold ${e.texto}`}>
                      {porcentaje === null ? "—" : `${porcentaje.toFixed(0)}% de la venta`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {tiendas.length > 1 && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-gray-100 pt-4 text-sm">
              <span className="font-medium text-gray-900">Todas las sucursales</span>
              <span className="text-gray-500">
                Ventas <strong className="text-gray-900">{pesos(totalVentas)}</strong>
              </span>
              <span className="text-gray-500">
                Nómina <strong className="text-gray-900">{pesos(totalNomina)}</strong>
              </span>
              <span className={`font-semibold ${ESTILOS[nivel(porcentajeTotal)].texto}`}>
                {porcentajeTotal === null ? "—" : `${porcentajeTotal.toFixed(0)}% de la venta`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
