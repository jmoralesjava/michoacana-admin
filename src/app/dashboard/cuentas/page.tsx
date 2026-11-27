"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const pesos = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const SEL =
  "h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900";

export default function CuentasPage() {
  const [unidades, setUnidades] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("todas");
  const [soloSaldo, setSoloSaldo] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState("");

  useEffect(() => {
    async function cargar() {
      const [u, p, g] = await Promise.all([
        supabase.from("sucursales").select("id, nombre, tipo").order("nombre"),
        supabase
          .from("pedidos_cliente")
          .select("*, clientes(nombre, apellido, whatsapp)")
          .not("despachado_at", "is", null)
          .neq("estado", "rechazado")
          .order("despachado_at", { ascending: false })
          .limit(500),
        supabase
          .from("pagos_surtido")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      setFallo(p.error?.message || g.error?.message || "");
      setUnidades(u.data || []);
      setPedidos(p.data || []);
      setPagos(g.data || []);
      setCargando(false);
    }
    cargar();
  }, []);

  const nombreUnidad = (id: string | null) =>
    unidades.find((u) => u.id === id)?.nombre || "—";
  const adeudo = (p: any) => Number(p.total_recibido ?? p.total ?? 0);
  const saldo = (p: any) => adeudo(p) - Number(p.pagado || 0);
  const comprador = (p: any) =>
    p.sucursal_id
      ? nombreUnidad(p.sucursal_id)
      : `${p.clientes?.nombre || "Cliente"} ${p.clientes?.apellido || ""}`.trim();

  const resumen = useMemo(
    () =>
      unidades
        .map((u) => ({
          id: u.id,
          nombre: u.nombre,
          porCobrar: pedidos
            .filter((p) => p.vendedor_unidad_id === u.id)
            .reduce((s, p) => s + Math.max(0, saldo(p)), 0),
          porPagar: pedidos
            .filter((p) => p.sucursal_id === u.id)
            .reduce((s, p) => s + Math.max(0, saldo(p)), 0),
        }))
        .filter((r) => r.porCobrar > 0.009 || r.porPagar > 0.009),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unidades, pedidos],
  );

  const visibles = pedidos.filter((p) => {
    if (soloSaldo && saldo(p) <= 0.009) return false;
    if (filtro === "todas") return true;
    return p.vendedor_unidad_id === filtro || p.sucursal_id === filtro;
  });

  const totalPendiente = pedidos.reduce((s, p) => s + Math.max(0, saldo(p)), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Cuentas entre unidades
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Lo que cada sucursal, almacén o cliente debe por el producto que se le
          surtió
        </p>
      </div>

      {fallo && (
        <p className="text-sm text-red-600 mb-4">No se pudo cargar: {fallo}</p>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <p className="text-xs text-gray-400">Saldo total pendiente</p>
        <p className="text-2xl font-semibold text-gray-900 mt-1">
          {pesos(totalPendiente)}
        </p>
      </div>

      <h2 className="text-base font-semibold text-gray-900 mb-3">Por unidad</h2>
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto mb-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidad</TableHead>
              <TableHead className="text-right">Le deben (por cobrar)</TableHead>
              <TableHead className="text-right">Debe (por pagar)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resumen.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-gray-900">{r.nombre}</TableCell>
                <TableCell className="text-right text-green-700">
                  {pesos(r.porCobrar)}
                </TableCell>
                <TableCell
                  className={`text-right ${r.porPagar > 0 ? "text-amber-700 font-medium" : "text-gray-500"}`}
                >
                  {pesos(r.porPagar)}
                </TableCell>
              </TableRow>
            ))}
            {resumen.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-gray-400 py-8">
                  {cargando ? "Cargando..." : "No hay saldos pendientes."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h2 className="text-base font-semibold text-gray-900 mr-auto">Órdenes</h2>
        <select
          className={`${SEL} w-56`}
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        >
          <option value="todas">Todas las unidades</option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={soloSaldo}
            onChange={(e) => setSoloSaldo(e.target.checked)}
          />
          Solo con saldo
        </label>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto mb-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Despachado</TableHead>
              <TableHead>Surtió</TableHead>
              <TableHead>Recibió</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead className="text-right">Pagado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm text-gray-500">
                  {new Date(p.despachado_at).toLocaleDateString("es-MX")}
                </TableCell>
                <TableCell className="text-gray-900">
                  {nombreUnidad(p.vendedor_unidad_id)}
                </TableCell>
                <TableCell className="text-gray-900">{comprador(p)}</TableCell>
                <TableCell className="text-right text-gray-700">
                  {pesos(adeudo(p))}
                </TableCell>
                <TableCell className="text-right text-gray-700">
                  {pesos(Number(p.pagado || 0))}
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${saldo(p) > 0.009 ? "text-amber-700" : "text-green-700"}`}
                >
                  {pesos(Math.max(0, saldo(p)))}
                </TableCell>
                <TableCell className="text-xs text-gray-500">
                  {p.recibido_at ? "Recibido" : "Sin confirmar recepción"}
                  {p.diferencia_entrega ? " · con diferencia" : ""}
                  {p.origen === "directa" ? " · orden directa" : ""}
                </TableCell>
              </TableRow>
            ))}
            {visibles.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                  {cargando ? "Cargando..." : "No hay órdenes que mostrar."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <h2 className="text-base font-semibold text-gray-900 mb-3">Últimos pagos</h2>
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Pagó</TableHead>
              <TableHead>Recibió el pago</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagos.map((g) => {
              const p = pedidos.find((x) => x.id === g.pedido_id);
              return (
                <TableRow key={g.id}>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(g.created_at).toLocaleString("es-MX")}
                  </TableCell>
                  <TableCell className="text-gray-900">
                    {p ? comprador(p) : "—"}
                  </TableCell>
                  <TableCell className="text-gray-900">
                    {p ? nombreUnidad(p.vendedor_unidad_id) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 capitalize">
                    {g.metodo}
                  </TableCell>
                  <TableCell className="text-right font-medium text-gray-900">
                    {pesos(Number(g.monto))}
                  </TableCell>
                </TableRow>
              );
            })}
            {pagos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                  Aún no hay pagos registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
