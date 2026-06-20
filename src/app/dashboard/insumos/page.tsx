"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

const UNIDADES = [
  "pieza",
  "kg",
  "g",
  "litro",
  "ml",
  "caja",
  "paquete",
  "contenedor",
  "rollo",
];

export default function InsumosPage() {
  const [insumos, setInsumos] = useState<any[]>([]);
  const [inventario, setInventario] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [dialogInsumo, setDialogInsumo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    unidad_medida: "pieza",
    unidad_compra: "pieza",
    factor_conversion: "1",
    stock_minimo: "0",
  });

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    const [ins, inv, sucs] = await Promise.all([
      supabase.from("insumos").select("*").order("nombre"),
      supabase
        .from("inventario_insumos")
        .select(
          "*, insumos(nombre, unidad_medida, stock_minimo), sucursales(nombre)",
        )
        .order("insumos(nombre)"),
      supabase.from("sucursales").select("id, nombre").eq("activa", true),
    ]);
    if (ins.data) setInsumos(ins.data);
    if (inv.data) setInventario(inv.data);
    if (sucs.data) setSucursales(sucs.data);
  }

  async function crearInsumo() {
    if (!form.nombre) return;
    setLoading(true);

    const { data: insumo } = await supabase
      .from("insumos")
      .insert({
        nombre: form.nombre,
        unidad_medida: form.unidad_medida,
        unidad_compra: form.unidad_compra,
        factor_conversion: parseFloat(form.factor_conversion) || 1,
        stock_minimo: parseFloat(form.stock_minimo) || 0,
      })
      .select()
      .single();

    if (insumo) {
      for (const sucursal of sucursales) {
        await supabase.from("inventario_insumos").insert({
          sucursal_id: sucursal.id,
          insumo_id: insumo.id,
          cantidad_actual: 0,
        });
      }
    }

    setLoading(false);
    setDialogInsumo(false);
    setForm({
      nombre: "",
      unidad_medida: "pieza",
      unidad_compra: "pieza",
      factor_conversion: "1",
      stock_minimo: "0",
    });
    cargarTodo();
  }

  async function eliminarInsumo(id: string) {
    if (
      !confirm("¿Eliminar este insumo? Se eliminará de todas las sucursales.")
    )
      return;
    await supabase.from("insumos").delete().eq("id", id);
    cargarTodo();
  }

  async function actualizarStock(inventarioId: string, cantidad: string) {
    await supabase
      .from("inventario_insumos")
      .update({
        cantidad_actual: parseFloat(cantidad) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inventarioId);
  }

  const insumosConAlerta = inventario.filter(
    (i) => i.cantidad_actual <= (i.insumos as any)?.stock_minimo,
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Insumos</h1>
          <p className="text-sm text-gray-400 mt-1">
            {insumos.length} insumos registrados
            {insumosConAlerta.length > 0 && (
              <span className="ml-2 text-red-500 font-medium">
                · {insumosConAlerta.length} con stock bajo
              </span>
            )}
          </p>
        </div>
        <Dialog open={dialogInsumo} onOpenChange={setDialogInsumo}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              Nuevo insumo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo insumo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Paleta de mango (producción)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Unidad de consumo *</Label>
                  <Select
                    value={form.unidad_medida}
                    onValueChange={(v) =>
                      setForm({ ...form, unidad_medida: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIDADES.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Unidad de compra</Label>
                  <Select
                    value={form.unidad_compra}
                    onValueChange={(v) =>
                      setForm({ ...form, unidad_compra: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIDADES.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Factor de conversión</Label>
                  <Input
                    type="number"
                    value={form.factor_conversion}
                    onChange={(e) =>
                      setForm({ ...form, factor_conversion: e.target.value })
                    }
                    placeholder="24"
                  />
                  <p className="text-xs text-gray-400">
                    Unidades por unidad de compra
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Stock mínimo</Label>
                  <Input
                    type="number"
                    value={form.stock_minimo}
                    onChange={(e) =>
                      setForm({ ...form, stock_minimo: e.target.value })
                    }
                    placeholder="50"
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={crearInsumo}
                disabled={loading}
              >
                {loading ? "Guardando..." : "Crear insumo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="catalogo">
        <TabsList className="mb-6">
          <TabsTrigger value="catalogo">Catálogo de insumos</TabsTrigger>
          <TabsTrigger value="inventario">
            Inventario por sucursal
            {insumosConAlerta.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {insumosConAlerta.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* CATÁLOGO */}
        <TabsContent value="catalogo">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad consumo</TableHead>
                  <TableHead>Unidad compra</TableHead>
                  <TableHead>Factor</TableHead>
                  <TableHead>Stock mínimo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insumos.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium text-gray-900">
                      {i.nombre}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {i.unidad_medida}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {i.unidad_compra || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {i.factor_conversion || 1}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {i.stock_minimo} {i.unidad_medida}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => eliminarInsumo(i.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* INVENTARIO POR SUCURSAL */}
        <TabsContent value="inventario">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Stock mínimo</TableHead>
                  <TableHead>Cantidad actual</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventario.map((inv) => {
                  const insumo = inv.insumos as any;
                  const sucursal = inv.sucursales as any;
                  const bajo = inv.cantidad_actual <= insumo?.stock_minimo;
                  return (
                    <TableRow
                      key={inv.id}
                      className={bajo ? "bg-red-50/30" : ""}
                    >
                      <TableCell className="font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {bajo && (
                            <AlertTriangle
                              size={14}
                              className="text-red-500 flex-shrink-0"
                            />
                          )}
                          {insumo?.nombre}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {sucursal?.nombre}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {insumo?.stock_minimo} {insumo?.unidad_medida}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          defaultValue={inv.cantidad_actual}
                          className="w-28 h-8 text-sm"
                          onBlur={(e) =>
                            actualizarStock(inv.id, e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${bajo ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}
                        >
                          {bajo ? "Stock bajo" : "OK"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
