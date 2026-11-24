"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";

type Cliente = {
  id: string;
  codigo: string;
  nombre: string;
  telefono: string;
  fecha_nacimiento: string | null;
  created_at: string;
  puntos: number;
  compras: number;
};

export default function LealtadPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pesosPorPunto, setPesosPorPunto] = useState("10");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const [lista, config] = await Promise.all([
      supabase
        .from("clientes_lealtad")
        .select("*, lealtad_movimientos(puntos, tipo)")
        .order("created_at", { ascending: false }),
      supabase.from("lealtad_config").select("pesos_por_punto").eq("id", 1).maybeSingle(),
    ]);

    if (lista.error) {
      setFallo(lista.error.message);
      setCargando(false);
      return;
    }

    setClientes(
      ((lista.data || []) as any[]).map((c) => {
        const movimientos = c.lealtad_movimientos || [];
        return {
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          telefono: c.telefono,
          fecha_nacimiento: c.fecha_nacimiento,
          created_at: c.created_at,
          puntos: movimientos.reduce((s: number, m: any) => s + (Number(m.puntos) || 0), 0),
          compras: movimientos.filter((m: any) => m.tipo === "compra").length,
        };
      }),
    );
    if (config.data) setPesosPorPunto(String(config.data.pesos_por_punto));
    setFallo("");
    setCargando(false);
  }

  async function guardarRegla() {
    const valor = parseFloat(pesosPorPunto);
    if (!valor || valor <= 0) {
      alert("Escribe cuántos pesos de compra equivalen a 1 punto");
      return;
    }
    setGuardando(true);
    const { data, error } = await supabase
      .from("lealtad_config")
      .update({ pesos_por_punto: valor })
      .eq("id", 1)
      .select("id");
    setGuardando(false);
    if (error || !data || data.length === 0) {
      alert(
        `No se pudo guardar: ${error?.message || "la base no aplicó el cambio (permisos)"}`,
      );
      return;
    }
    alert("Regla guardada. Aplica a las compras que se cobren desde ahora.");
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) => c.nombre.toLowerCase().includes(q) || c.telefono.includes(q),
    );
  }, [busqueda, clientes]);

  const totalPuntos = clientes.reduce((s, c) => s + c.puntos, 0);

  function cumple(fecha: string | null) {
    if (!fecha) return "—";
    const [, mes, dia] = fecha.split("-");
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${Number(dia)} ${meses[Number(mes) - 1]}`;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Programa de puntos</h1>
        <p className="text-sm text-gray-400 mt-1">
          Clientes registrados desde el menú por QR y sus puntos acumulados
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400">Clientes registrados</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{clientes.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400">Puntos en circulación</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{totalPuntos}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400">Regla: 1 punto por cada</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-gray-500">$</span>
            <Input
              type="number"
              className="w-24"
              value={pesosPorPunto}
              onChange={(e) => setPesosPorPunto(e.target.value)}
            />
            <Button size="sm" onClick={guardarRegla} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre o celular"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Celular</TableHead>
              <TableHead>Cumpleaños</TableHead>
              <TableHead className="text-right">Compras</TableHead>
              <TableHead className="text-right">Puntos</TableHead>
              <TableHead>Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-gray-900">{c.nombre}</TableCell>
                <TableCell className="text-gray-600">{c.telefono}</TableCell>
                <TableCell className="text-gray-600">{cumple(c.fecha_nacimiento)}</TableCell>
                <TableCell className="text-right text-gray-600">{c.compras}</TableCell>
                <TableCell className="text-right font-semibold text-gray-900">
                  {c.puntos}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {new Date(c.created_at).toLocaleDateString("es-MX")}
                </TableCell>
              </TableRow>
            ))}
            {filtrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-10">
                  {cargando
                    ? "Cargando..."
                    : fallo
                      ? `No se pudo cargar: ${fallo}`
                      : clientes.length === 0
                        ? "Aún no hay clientes registrados, o tu usuario no tiene permiso para verlos."
                        : "Ningún cliente coincide con la búsqueda."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
