"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const TIPOS: Record<string, string> = {
  comision: "Comisión",
  bono: "Bono",
  descuento: "Descuento",
};

const SEL =
  "h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900";

function lunesDe(fecha: Date) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function iso(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const pesos = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

export default function ConceptosNomina() {
  const [lunes, setLunes] = useState(iso(lunesDe(new Date())));
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [conceptos, setConceptos] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    perfil_id: "",
    tipo: "comision",
    concepto: "",
    monto: "",
  });

  useEffect(() => {
    supabase
      .from("perfiles")
      .select("id, nombre_completo, apellido, sucursales(nombre)")
      .eq("activo", true)
      .order("nombre_completo")
      .then(({ data }) => setEmpleados(data || []));
  }, []);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lunes]);

  async function cargar() {
    const [c, p] = await Promise.all([
      supabase
        .from("nomina_conceptos")
        .select("*")
        .eq("semana_inicio", lunes)
        .order("created_at"),
      supabase.from("nomina_pagos").select("*").eq("semana_inicio", lunes),
    ]);
    setConceptos(c.data || []);
    setPagos(p.data || []);
  }

  const domingo = new Date(`${lunes}T00:00:00`);
  domingo.setDate(domingo.getDate() + 6);

  const nombre = (id: string) => {
    const e = empleados.find((x) => x.id === id);
    return e ? `${e.nombre_completo} ${e.apellido || ""}`.trim() : "—";
  };
  const yaPagado = (id: string) => pagos.some((p) => p.perfil_id === id);

  async function agregar() {
    const monto = parseFloat(form.monto);
    if (!form.perfil_id || !form.concepto.trim() || !monto || monto <= 0) {
      alert("Elige al empleado y escribe el concepto y un monto mayor a cero");
      return;
    }
    if (yaPagado(form.perfil_id)) {
      alert("La nómina de esa semana ya se le pagó a este empleado");
      return;
    }
    let admin: any = null;
    try {
      admin = JSON.parse(localStorage.getItem("perfil_admin") || "null");
    } catch {}

    setGuardando(true);
    const { data, error } = await supabase
      .from("nomina_conceptos")
      .insert({
        perfil_id: form.perfil_id,
        semana_inicio: lunes,
        tipo: form.tipo,
        concepto: form.concepto.trim(),
        monto,
        creado_por: admin?.id || null,
      })
      .select("id");
    setGuardando(false);

    if (error || !data || data.length === 0) {
      alert(
        `No se pudo guardar: ${error?.message || "la base no aplicó el cambio (permisos)"}`,
      );
      return;
    }
    setForm({ ...form, concepto: "", monto: "" });
    cargar();
  }

  async function quitar(c: any) {
    if (yaPagado(c.perfil_id)) {
      alert("Esa nómina ya se pagó; el concepto ya no se puede quitar");
      return;
    }
    if (!confirm(`¿Quitar "${c.concepto}" de ${nombre(c.perfil_id)}?`)) return;
    const { data, error } = await supabase
      .from("nomina_conceptos")
      .delete()
      .eq("id", c.id)
      .select("id");
    if (error || !data || data.length === 0) {
      alert(
        `No se pudo quitar: ${error?.message || "la base no aplicó el cambio (permisos)"}`,
      );
      return;
    }
    cargar();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Comisiones, bonos y descuentos de la semana
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Se suman al pago semanal del empleado y salen en su recibo
          </p>
        </div>
        <label className="text-xs text-gray-500">
          Semana del{" "}
          <Input
            type="date"
            className="inline-block w-40 h-9 ml-1"
            value={lunes}
            onChange={(e) => {
              if (e.target.value) {
                setLunes(iso(lunesDe(new Date(`${e.target.value}T00:00:00`))));
              }
            }}
          />{" "}
          al {domingo.toLocaleDateString("es-MX")}
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-2 mb-4">
        <select
          className={`${SEL} flex-1 min-w-44`}
          value={form.perfil_id}
          onChange={(e) => setForm({ ...form, perfil_id: e.target.value })}
        >
          <option value="">Empleado</option>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre_completo} {e.apellido || ""}
              {e.sucursales?.nombre ? ` (${e.sucursales.nombre})` : ""}
            </option>
          ))}
        </select>
        <select
          className={SEL}
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value })}
        >
          {Object.entries(TIPOS).map(([valor, etiqueta]) => (
            <option key={valor} value={valor}>
              {etiqueta}
            </option>
          ))}
        </select>
        <Input
          className="h-9 flex-1 min-w-44"
          placeholder="Concepto, ej. reto de ventas"
          value={form.concepto}
          maxLength={28}
          onChange={(e) => setForm({ ...form, concepto: e.target.value })}
        />
        <Input
          type="number"
          className="h-9 w-28"
          placeholder="Monto"
          value={form.monto}
          onChange={(e) => setForm({ ...form, monto: e.target.value })}
        />
        <Button size="sm" className="h-9" onClick={agregar} disabled={guardando}>
          {guardando ? "Guardando..." : "Agregar"}
        </Button>
      </div>

      {conceptos.length === 0 ? (
        <p className="text-sm text-gray-400">
          No hay conceptos capturados para esta semana.
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {conceptos.map((c) => (
            <div key={c.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="flex-1 min-w-0 truncate text-gray-900">
                {nombre(c.perfil_id)}
              </span>
              <span className="text-xs text-gray-500 w-20">
                {TIPOS[c.tipo] || c.tipo}
              </span>
              <span className="flex-1 min-w-0 truncate text-gray-600">
                {c.concepto}
              </span>
              <span
                className={`w-24 text-right font-medium ${c.tipo === "descuento" ? "text-red-600" : "text-gray-900"}`}
              >
                {c.tipo === "descuento" ? "-" : ""}
                {pesos(Number(c.monto))}
              </span>
              {yaPagado(c.perfil_id) ? (
                <span className="text-xs text-green-700 w-14 text-right">Pagado</span>
              ) : (
                <button
                  onClick={() => quitar(c)}
                  title="Quitar"
                  className="w-14 flex justify-end text-gray-300 hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {pagos.length > 0 && (
        <div className="border-t border-gray-100 mt-4 pt-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">
            Pagos registrados esta semana
          </p>
          <div className="divide-y divide-gray-100">
            {pagos.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="flex-1 min-w-0 truncate text-gray-900">
                  {nombre(p.perfil_id)}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(p.pagado_at).toLocaleString("es-MX")}
                </span>
                <span className="w-24 text-right font-medium text-gray-900">
                  {pesos(Number(p.total))}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Total pagado:{" "}
            <strong className="text-gray-900">
              {pesos(pagos.reduce((s, p) => s + Number(p.total || 0), 0))}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
}
