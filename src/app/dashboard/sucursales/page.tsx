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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, MapPin, Trash2, QrCode } from "lucide-react";

const TIPOS: Record<string, string> = {
  sucursal: "Sucursal",
  fabrica: "Fábrica",
  almacen_general: "Almacén general",
  almacen_regional: "Almacén regional",
};

export default function SucursalesPage() {
  const [sucursalQR, setSucursalQR] = useState<any>(null);
  const [perfiles, setPerfiles] = useState<any[]>([]);
  const [unidadConfig, setUnidadConfig] = useState<any>(null);
  const [config, setConfig] = useState({
    tipo: "sucursal",
    proveedor_id: "",
    encargado_id: "",
  });
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    direccion: "",
    latitud: "",
    longitud: "",
    radio_metros: "100",
    tiene_area_consumo: false,
    tipo: "sucursal",
    proveedor_id: "",
    encargado_id: "",
  });

  useEffect(() => {
    cargarSucursales();
    cargarPerfiles();
  }, []);

  async function cargarPerfiles() {
    const { data } = await supabase
      .from("perfiles")
      .select("id, nombre_completo, apellido")
      .eq("activo", true)
      .order("nombre_completo");
    if (data) setPerfiles(data);
  }

  function abrirConfig(u: any) {
    setUnidadConfig(u);
    setConfig({
      tipo: u.tipo || "sucursal",
      proveedor_id: u.proveedor_id || "",
      encargado_id: u.encargado_id || "",
    });
  }

  async function guardarConfig() {
    if (!unidadConfig) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sucursales")
      .update({
        tipo: config.tipo,
        proveedor_id: config.proveedor_id || null,
        encargado_id: config.encargado_id || null,
      })
      .eq("id", unidadConfig.id)
      .select("id");
    setLoading(false);
    if (error || !data || data.length === 0) {
      alert(
        `No se pudo guardar: ${error?.message || "la base no aplicó el cambio (permisos)"}`,
      );
      return;
    }
    setUnidadConfig(null);
    cargarSucursales();
  }

  async function cargarSucursales() {
    const { data } = await supabase
      .from("sucursales")
      .select("*")
      .order("nombre");
    if (data) setSucursales(data);
  }

  async function crearSucursal() {
    if (!form.nombre) return;
    setLoading(true);

    const { data: sucursal, error } = await supabase
      .from("sucursales")
      .insert({
        nombre: form.nombre,
        direccion: form.direccion || null,
        latitud: form.latitud ? parseFloat(form.latitud) : null,
        longitud: form.longitud ? parseFloat(form.longitud) : null,
        radio_metros: parseFloat(form.radio_metros) || 100,
        tiene_area_consumo: form.tiene_area_consumo,
        tipo: form.tipo,
        proveedor_id: form.proveedor_id || null,
        encargado_id: form.encargado_id || null,
        activa: true,
      })
      .select()
      .single();

    if (error) {
      setLoading(false);
      alert("Error: " + error.message);
      return;
    }

    // Crear registros de inventario para todos los insumos existentes
    const { data: insumos } = await supabase.from("insumos").select("id");
    if (insumos && sucursal) {
      for (const insumo of insumos) {
        await supabase.from("inventario_insumos").insert({
          sucursal_id: sucursal.id,
          insumo_id: insumo.id,
          cantidad_actual: 0,
        });
      }
    }

    setLoading(false);
    setDialogOpen(false);
    setForm({
      nombre: "",
      direccion: "",
      latitud: "",
      longitud: "",
      radio_metros: "100",
      tiene_area_consumo: false,
      tipo: "sucursal",
      proveedor_id: "",
      encargado_id: "",
    });
    cargarSucursales();
  }

  async function toggleActiva(id: string, activa: boolean) {
    await supabase.from("sucursales").update({ activa: !activa }).eq("id", id);
    cargarSucursales();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Unidades</h1>
          <p className="text-sm text-gray-400 mt-1">
            {sucursales.length} sucursales registradas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              Nueva unidad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva unidad</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Sucursal Centro"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Dirección</Label>
                <Input
                  value={form.direccion}
                  onChange={(e) =>
                    setForm({ ...form, direccion: e.target.value })
                  }
                  placeholder="Av. Juárez 123"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">
                  📍 Coordenadas GPS
                </p>
                <p className="text-xs text-blue-500">
                  Ve físicamente a la sucursal, abre Google Maps, mantén
                  presionado en tu ubicación y copia las coordenadas.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Latitud</Label>
                  <Input
                    value={form.latitud}
                    onChange={(e) =>
                      setForm({ ...form, latitud: e.target.value })
                    }
                    placeholder="20.4836856"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Longitud</Label>
                  <Input
                    value={form.longitud}
                    onChange={(e) =>
                      setForm({ ...form, longitud: e.target.value })
                    }
                    placeholder="-99.2186149"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Radio asistencia (metros)</Label>
                  <Input
                    type="number"
                    value={form.radio_metros}
                    onChange={(e) =>
                      setForm({ ...form, radio_metros: e.target.value })
                    }
                    placeholder="100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>¿Área de consumo?</Label>
                  <div className="flex items-center gap-2 h-10">
                    <input
                      type="checkbox"
                      id="area_consumo"
                      checked={form.tiene_area_consumo}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          tiene_area_consumo: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <label
                      htmlFor="area_consumo"
                      className="text-sm text-gray-600"
                    >
                      Sí tiene
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tipo de unidad</Label>
                  <select
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  >
                    {Object.entries(TIPOS).map(([valor, etiqueta]) => (
                      <option key={valor} value={valor}>
                        {etiqueta}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Quién la surte</Label>
                  <select
                    className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
                    value={form.proveedor_id}
                    onChange={(e) =>
                      setForm({ ...form, proveedor_id: e.target.value })
                    }
                  >
                    <option value="">Nadie (compra a proveedores)</option>
                    {sucursales
                      .filter((u) => u.tipo !== "sucursal")
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Encargado</Label>
                <select
                  className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
                  value={form.encargado_id}
                  onChange={(e) =>
                    setForm({ ...form, encargado_id: e.target.value })
                  }
                >
                  <option value="">Sin asignar</option>
                  {perfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre_completo} {p.apellido || ""}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                className="w-full"
                onClick={crearSucursal}
                disabled={loading}
              >
                {loading ? "Guardando..." : "Crear sucursal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {sucursales.map((s) => (
          <div
            key={s.id}
            className={`bg-white rounded-xl border p-5 ${s.activa ? "border-gray-100" : "border-gray-100 opacity-60"}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{s.nombre}</h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  {s.direccion || "Sin dirección"}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.activa ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}
              >
                {s.activa ? "Activa" : "Inactiva"}
              </span>
            </div>

            <div className="space-y-1.5">
              {s.latitud && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <MapPin size={12} />
                  <span>
                    {s.latitud}, {s.longitud}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                  {TIPOS[s.tipo] || "Sucursal"}
                </span>
                <span className="text-gray-500">
                  {s.proveedor_id
                    ? `La surte: ${sucursales.find((u) => u.id === s.proveedor_id)?.nombre || "—"}`
                    : "Compra a proveedores"}
                </span>
              </div>
              {s.encargado_id && (
                <div className="text-xs text-gray-500">
                  Encargado:{" "}
                  {perfiles.find((p) => p.id === s.encargado_id)?.nombre_completo || "—"}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Radio: {s.radio_metros}m</span>
                {s.tiene_area_consumo && (
                  <span className="text-blue-500">· Área de consumo</span>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => toggleActiva(s.id, s.activa)}
              >
                {s.activa ? "Desactivar" : "Activar"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setSucursalQR(s)}
              >
                <QrCode size={14} className="mr-1.5" />
                QR del menú
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => abrirConfig(s)}
              >
                Configurar
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={!!unidadConfig}
        onOpenChange={(v) => {
          if (!v) setUnidadConfig(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar {unidadConfig?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Tipo de unidad</Label>
              <select
                className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
                value={config.tipo}
                onChange={(e) => setConfig({ ...config, tipo: e.target.value })}
              >
                {Object.entries(TIPOS).map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Quién la surte</Label>
              <select
                className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
                value={config.proveedor_id}
                onChange={(e) =>
                  setConfig({ ...config, proveedor_id: e.target.value })
                }
              >
                <option value="">Nadie (compra a proveedores)</option>
                {sucursales
                  .filter((u) => u.tipo !== "sucursal" && u.id !== unidadConfig?.id)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-400">
                Los pedidos de esta unidad le llegarán a quien elijas aquí.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Encargado</Label>
              <select
                className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
                value={config.encargado_id}
                onChange={(e) =>
                  setConfig({ ...config, encargado_id: e.target.value })
                }
              >
                <option value="">Sin asignar</option>
                {perfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_completo} {p.apellido || ""}
                  </option>
                ))}
              </select>
            </div>
            <Button className="w-full" onClick={guardarConfig} disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!sucursalQR}
        onOpenChange={(v) => {
          if (!v) setSucursalQR(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Menú de {sucursalQR?.nombre}</DialogTitle>
          </DialogHeader>
          {sucursalQR && (
            <div className="space-y-4 pt-2 text-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&data=${encodeURIComponent(
                  `${window.location.origin}/menu/${sucursalQR.id}`,
                )}`}
                alt={`QR del menú de ${sucursalQR.nombre}`}
                className="mx-auto h-56 w-56 rounded-lg border border-gray-100"
              />
              <p className="text-xs text-gray-500 break-all">
                {`${window.location.origin}/menu/${sucursalQR.id}`}
              </p>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <a
                    href={`/menu/${sucursalQR.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir menú
                  </a>
                </Button>
                <Button asChild className="flex-1">
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&margin=30&data=${encodeURIComponent(
                      `${window.location.origin}/menu/${sucursalQR.id}`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    QR para imprimir
                  </a>
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Imprime el QR y colócalo donde los clientes hacen fila.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
