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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DollarSign, TrendingUp, CreditCard, Smartphone } from "lucide-react";

export default function CortesPage() {
  const [cortes, setCortes] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [sucursalFiltro, setSucursalFiltro] = useState("todas");
  const [desde, setDesde] = useState(
    new Date(new Date().setDate(1)).toISOString().split("T")[0],
  );
  const [hasta, setHasta] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [corteActivo, setCorteActivo] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    cargarSucursales();
    cargarCortes();
  }, []);

  async function cargarSucursales() {
    const { data } = await supabase
      .from("sucursales")
      .select("id, nombre")
      .eq("activa", true);
    if (data) setSucursales(data);
  }

  async function cargarCortes() {
    setLoading(true);

    let query = supabase
      .from("turnos")
      .select(
        `
        *,
        sucursales(nombre),
        perfiles(nombre_completo, apellido)
      `,
      )
      .eq("estado", "cerrado")
      .gte("created_at", desde + "T00:00:00")
      .lte("created_at", hasta + "T23:59:59")
      .order("created_at", { ascending: false });

    if (sucursalFiltro !== "todas") {
      query = query.eq("sucursal_id", sucursalFiltro);
    }

    const { data } = await query;
    if (data) setCortes(data);
    setLoading(false);
  }

  const totalEfectivo = cortes.reduce(
    (s, c) => s + Number(c.efectivo_contado || 0),
    0,
  );
  const totalVentas = cortes.reduce(
    (s, c) => s + Number(c.total_ventas || 0),
    0,
  );
  const totalDiferencia = cortes.reduce(
    (s, c) => s + Number(c.diferencia || 0),
    0,
  );

  function abrirDetalle(corte: any) {
    setCorteActivo(corte);
    setDialogOpen(true);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Cortes de caja</h1>
        <p className="text-sm text-gray-400 mt-1">
          Historial de cierres por sucursal
        </p>
      </div>

      {/* FILTROS */}
      <div className="flex items-end gap-3 mb-6 flex-wrap">
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400">Sucursal</p>
          <Select value={sucursalFiltro} onValueChange={setSucursalFiltro}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {sucursales.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400">Desde</p>
          <Input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-36 h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400">Hasta</p>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-36 h-9 text-sm"
          />
        </div>
        <Button size="sm" onClick={cargarCortes} disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-gray-100 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">Total efectivo contado</p>
              <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign size={14} className="text-green-600" />
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-900">
              ${totalEfectivo.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">Total ventas registradas</p>
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                <TrendingUp size={14} className="text-blue-600" />
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-900">
              ${totalVentas.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card
          className={`shadow-none border ${totalDiferencia < 0 ? "border-red-200" : "border-gray-100"}`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">Diferencia total</p>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${totalDiferencia < 0 ? "bg-red-50" : "bg-gray-50"}`}
              >
                <DollarSign
                  size={14}
                  className={
                    totalDiferencia < 0 ? "text-red-600" : "text-gray-400"
                  }
                />
              </div>
            </div>
            <p
              className={`text-xl font-semibold ${totalDiferencia < 0 ? "text-red-600" : totalDiferencia > 0 ? "text-green-600" : "text-gray-900"}`}
            >
              {totalDiferencia >= 0 ? "+" : ""}${totalDiferencia.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Cajero</TableHead>
              <TableHead className="text-right">Fondo inicial</TableHead>
              <TableHead className="text-right">Ventas</TableHead>
              <TableHead className="text-right">Efectivo contado</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-gray-400 text-sm"
                >
                  Cargando...
                </TableCell>
              </TableRow>
            ) : cortes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-gray-400 text-sm"
                >
                  No hay cortes en este período
                </TableCell>
              </TableRow>
            ) : (
              cortes.map((c) => {
                const diferencia = Number(c.diferencia || 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(c.created_at).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {(c.sucursales as any)?.nombre}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {(c.perfiles as any)?.nombre_completo}{" "}
                      {(c.perfiles as any)?.apellido}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-500">
                      ${Number(c.fondo_inicial || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-gray-900">
                      ${Number(c.total_ventas || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-900">
                      ${Number(c.efectivo_contado || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`text-sm font-medium ${diferencia < 0 ? "text-red-600" : diferencia > 0 ? "text-green-600" : "text-gray-400"}`}
                      >
                        {diferencia >= 0 ? "+" : ""}${diferencia.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => abrirDetalle(c)}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Ver detalle
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL DETALLE */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle del corte</DialogTitle>
          </DialogHeader>
          {corteActivo && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sucursal</span>
                <span className="font-medium">
                  {corteActivo.sucursales?.nombre}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cajero</span>
                <span className="font-medium">
                  {corteActivo.perfiles?.nombre_completo}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fecha</span>
                <span className="font-medium">
                  {new Date(corteActivo.created_at).toLocaleString("es-MX")}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Fondo inicial</span>
                  <span>
                    ${Number(corteActivo.fondo_inicial || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <DollarSign size={13} /> Efectivo
                  </span>
                  <span>
                    ${Number(corteActivo.ventas_efectivo || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <CreditCard size={13} /> Tarjeta
                  </span>
                  <span>
                    ${Number(corteActivo.ventas_tarjeta || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Smartphone size={13} /> Transferencia
                  </span>
                  <span>
                    ${Number(corteActivo.ventas_transferencia || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t border-gray-100 pt-3">
                  <span>Total ventas</span>
                  <span>
                    ${Number(corteActivo.total_ventas || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Efectivo contado</span>
                  <span>
                    ${Number(corteActivo.efectivo_contado || 0).toFixed(2)}
                  </span>
                </div>
                <div
                  className={`flex justify-between text-sm font-semibold ${Number(corteActivo.diferencia) < 0 ? "text-red-600" : "text-green-600"}`}
                >
                  <span>Diferencia</span>
                  <span>
                    {Number(corteActivo.diferencia) >= 0 ? "+" : ""}$
                    {Number(corteActivo.diferencia || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
