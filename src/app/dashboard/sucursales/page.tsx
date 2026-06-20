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
import { Plus, MapPin, Trash2 } from "lucide-react";

export default function SucursalesPage() {
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
  });

  useEffect(() => {
    cargarSucursales();
  }, []);

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
          <h1 className="text-2xl font-semibold text-gray-900">Sucursales</h1>
          <p className="text-sm text-gray-400 mt-1">
            {sucursales.length} sucursales registradas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              Nueva sucursal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva sucursal</DialogTitle>
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
