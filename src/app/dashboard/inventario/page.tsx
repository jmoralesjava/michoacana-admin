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

const TIPOS: Record<string, string> = {
  produccion: "Producción",
  consumo_produccion: "Consumo en producción",
  salida_surtido: "Salida por surtido",
  entrada_surtido: "Entrada por surtido",
  venta: "Venta",
  ajuste: "Ajuste de conteo",
};

const SEL =
  "h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900";

const pesos = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

export default function InventarioPage() {
  const [unidades, setUnidades] = useState<any[]>([]);
  const [unidad, setUnidad] = useState("");
  const [filas, setFilas] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState("");
  const [guardando, setGuardando] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    supabase
      .from("sucursales")
      .select("id, nombre, tipo")
      .order("nombre")
      .then(({ data }) => {
        setUnidades(data || []);
        if (data && data.length > 0) setUnidad(data[0].id);
      });
    supabase
      .from("insumos")
      .select("id, nombre")
      .then(({ data }) => setInsumos(data || []));
  }, []);

  useEffect(() => {
    if (unidad) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidad]);

  async function cargar() {
    setCargando(true);
    const [prods, vars, inv, movs] = await Promise.all([
      supabase
        .from("productos")
        .select("id, nombre, tiene_variantes")
        .eq("activo", true)
        .order("nombre"),
      supabase.from("producto_variantes").select("id, producto_id, nombre"),
      supabase.from("inventario_productos").select("*").eq("unidad_id", unidad),
      supabase
        .from("movimientos_inventario")
        .select("*")
        .eq("unidad_id", unidad)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    const problema = inv.error || movs.error || prods.error;
    setFallo(problema ? problema.message : "");

    const existencias = inv.data || [];
    const lista: any[] = [];
    for (const p of prods.data || []) {
      const variantes = (vars.data || []).filter((v: any) => v.producto_id === p.id);
      const opciones =
        p.tiene_variantes && variantes.length > 0 ? variantes : [null];
      for (const v of opciones) {
        const actual = existencias.find(
          (e: any) =>
            e.producto_id === p.id && (e.variante_id || null) === (v?.id || null),
        );
        lista.push({
          clave: `${p.id}-${v?.id || ""}`,
          producto_id: p.id,
          variante_id: v?.id || null,
          nombre: v ? `${p.nombre}, ${v.nombre}` : p.nombre,
          cantidad: Number(actual?.cantidad || 0),
          costo: Number(actual?.costo_promedio || 0),
          conteo: String(Number(actual?.cantidad || 0)),
          costoNuevo: String(Number(actual?.costo_promedio || 0)),
        });
      }
    }
    setFilas(lista);
    setMovimientos(movs.data || []);
    setCargando(false);
  }

  function editar(clave: string, campo: string, valor: string) {
    setFilas((prev) =>
      prev.map((f) => (f.clave === clave ? { ...f, [campo]: valor } : f)),
    );
  }

  async function guardar(f: any) {
    const conteo = parseFloat(f.conteo);
    const costo = parseFloat(f.costoNuevo);
    if (isNaN(conteo) || conteo < 0 || isNaN(costo) || costo < 0) {
      alert("Escribe una cantidad y un costo válidos");
      return;
    }
    setGuardando(f.clave);
    const { error } = await supabase.rpc("ajustar_inventario_producto", {
      p_unidad: unidad,
      p_producto: f.producto_id,
      p_variante: f.variante_id,
      p_cantidad: conteo,
      p_costo: costo,
      p_nota: "Conteo desde el panel",
    });
    setGuardando("");
    if (error) {
      alert(`No se pudo guardar: ${error.message}`);
      return;
    }
    cargar();
  }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? filas.filter((f) => f.nombre.toLowerCase().includes(q)) : filas;
  }, [busqueda, filas]);

  const valorTotal = filas.reduce((s, f) => s + f.cantidad * f.costo, 0);
  const negativos = filas.filter((f) => f.cantidad < 0).length;

  const nombreArticulo = (m: any) => {
    if (m.insumo_id) {
      return `${insumos.find((i) => i.id === m.insumo_id)?.nombre || "Insumo"} (insumo)`;
    }
    return (
      filas.find(
        (f) =>
          f.producto_id === m.producto_id &&
          (f.variante_id || null) === (m.variante_id || null),
      )?.nombre || "Producto"
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Inventario de producto
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Existencias y costo promedio de producto terminado por unidad
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <label className="space-y-1.5">
          <span className="block text-xs text-gray-400">Unidad</span>
          <select
            className={`${SEL} w-60`}
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
          >
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </label>
        <Input
          className="h-9 w-60"
          placeholder="Buscar producto"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400">Valor del inventario</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {pesos(valorTotal)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400">Artículos con existencia</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {filas.filter((f) => f.cantidad > 0).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400">Con existencia negativa</p>
          <p
            className={`text-2xl font-semibold mt-1 ${negativos > 0 ? "text-red-600" : "text-gray-900"}`}
          >
            {negativos}
          </p>
          {negativos > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Salió más producto del que estaba registrado. Captura el conteo.
            </p>
          )}
        </div>
      </div>

      {fallo && (
        <p className="text-sm text-red-600 mb-4">
          No se pudo cargar: {fallo}
        </p>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto mb-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Existencia</TableHead>
              <TableHead className="text-right">Costo promedio</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Conteo físico</TableHead>
              <TableHead>Costo unitario</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.map((f) => {
              const cambio =
                parseFloat(f.conteo) !== f.cantidad ||
                parseFloat(f.costoNuevo) !== f.costo;
              return (
                <TableRow key={f.clave}>
                  <TableCell className="font-medium text-gray-900">
                    {f.nombre}
                  </TableCell>
                  <TableCell
                    className={`text-right ${f.cantidad < 0 ? "text-red-600 font-medium" : "text-gray-700"}`}
                  >
                    {f.cantidad}
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    {pesos(f.costo)}
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    {pesos(f.cantidad * f.costo)}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 w-24"
                      value={f.conteo}
                      onChange={(e) => editar(f.clave, "conteo", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 w-24"
                      value={f.costoNuevo}
                      onChange={(e) =>
                        editar(f.clave, "costoNuevo", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!cambio || guardando === f.clave}
                      onClick={() => guardar(f)}
                    >
                      {guardando === f.clave ? "Guardando..." : "Guardar"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {visibles.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-10">
                  {cargando ? "Cargando..." : "No hay productos que mostrar."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <h2 className="text-base font-semibold text-gray-900 mb-3">
        Últimos movimientos
      </h2>
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Artículo</TableHead>
              <TableHead>Movimiento</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Costo unitario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientos.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-sm text-gray-500">
                  {new Date(m.created_at).toLocaleString("es-MX")}
                </TableCell>
                <TableCell className="text-gray-900">{nombreArticulo(m)}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {TIPOS[m.tipo] || m.tipo}
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${Number(m.cantidad) < 0 ? "text-red-600" : "text-green-700"}`}
                >
                  {Number(m.cantidad) > 0 ? "+" : ""}
                  {Number(m.cantidad)}
                </TableCell>
                <TableCell className="text-right text-gray-700">
                  {pesos(Number(m.costo_unitario))}
                </TableCell>
              </TableRow>
            ))}
            {movimientos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                  Aún no hay movimientos en esta unidad.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
