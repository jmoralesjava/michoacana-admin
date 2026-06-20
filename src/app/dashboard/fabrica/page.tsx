"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Clock, CheckCircle, Truck, XCircle } from "lucide-react";

const ESTADOS = [
  "enviada",
  "revisada",
  "aprobada",
  "rechazada",
  "en_camino",
  "entregada_parcial",
  "recibida",
];

const coloresEstado: Record<string, string> = {
  enviada: "bg-blue-50 text-blue-700",
  revisada: "bg-amber-50 text-amber-700",
  aprobada: "bg-green-50 text-green-700",
  rechazada: "bg-red-50 text-red-700",
  en_camino: "bg-purple-50 text-purple-700",
  entregada_parcial: "bg-orange-50 text-orange-700",
  recibida: "bg-gray-50 text-gray-700",
};

const iconosEstado: Record<string, any> = {
  enviada: Clock,
  revisada: Clock,
  aprobada: CheckCircle,
  rechazada: XCircle,
  en_camino: Truck,
  entregada_parcial: Truck,
  recibida: CheckCircle,
};

export default function FabricaPage() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [solicitudActiva, setSolicitudActiva] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notasAlmacen, setNotasAlmacen] = useState("");

  useEffect(() => {
    cargarSolicitudes();
    // Suscripción en tiempo real
    const canal = supabase
      .channel("solicitudes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "solicitudes_inventario",
        },
        () => cargarSolicitudes(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  async function cargarSolicitudes() {
    const { data } = await supabase
      .from("solicitudes_inventario")
      .select(
        `
        *,
        sucursales(nombre),
        perfiles(nombre_completo),
        solicitud_items(
          *,
          insumos(nombre, unidad_medida, unidad_compra, factor_conversion)
        )
      `,
      )
      .order("created_at", { ascending: false });
    if (data) setSolicitudes(data);
  }

  async function cambiarEstado(id: string, estado: string) {
    setLoading(true);
    await supabase
      .from("solicitudes_inventario")
      .update({
        estado,
        notas_almacen: notasAlmacen || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    setLoading(false);
    setDialogOpen(false);
    setNotasAlmacen("");
    cargarSolicitudes();
  }

  async function actualizarCantidadAprobada(itemId: string, cantidad: string) {
    await supabase
      .from("solicitud_items")
      .update({ cantidad_aprobada: parseFloat(cantidad) || null })
      .eq("id", itemId);
  }

  const pendientes = solicitudes.filter((s) =>
    ["enviada", "revisada"].includes(s.estado),
  );
  const enProceso = solicitudes.filter((s) =>
    ["aprobada", "en_camino"].includes(s.estado),
  );
  const historial = solicitudes.filter((s) =>
    ["recibida", "rechazada", "entregada_parcial"].includes(s.estado),
  );

  function SolicitudCard({ solicitud }: { solicitud: any }) {
    const Icon = iconosEstado[solicitud.estado] || Clock;
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 text-sm">
                {(solicitud.sucursales as any)?.nombre}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${coloresEstado[solicitud.estado]}`}
              >
                {solicitud.estado.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {new Date(solicitud.created_at).toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <Icon size={18} className="text-gray-300 flex-shrink-0" />
        </div>

        <div className="space-y-1 mb-4">
          {(solicitud.solicitud_items as any[])?.map((item: any) => (
            <div
              key={item.id}
              className="flex justify-between text-xs text-gray-500"
            >
              <span>{item.insumos?.nombre}</span>
              <span className="font-medium">
                {item.cantidad_solicitada} {item.unidad_solicitada}
              </span>
            </div>
          ))}
        </div>

        {solicitud.notas && (
          <p className="text-xs text-gray-400 bg-gray-50 rounded p-2 mb-3">
            📝 {solicitud.notas}
          </p>
        )}

        {solicitud.notas_almacen && (
          <p className="text-xs text-green-600 bg-green-50 rounded p-2 mb-3">
            🏭 {solicitud.notas_almacen}
          </p>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs"
          onClick={() => {
            setSolicitudActiva(solicitud);
            setNotasAlmacen(solicitud.notas_almacen || "");
            setDialogOpen(true);
          }}
        >
          Gestionar solicitud
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Fábrica / Almacén
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          {pendientes.length} solicitudes pendientes · {enProceso.length} en
          proceso
        </p>
      </div>

      <Tabs defaultValue="pendientes">
        <TabsList className="mb-6">
          <TabsTrigger value="pendientes">
            Pendientes
            {pendientes.length > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendientes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="proceso">
            En proceso ({enProceso.length})
          </TabsTrigger>
          <TabsTrigger value="historial">
            Historial ({historial.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes">
          {pendientes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm">No hay solicitudes pendientes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendientes.map((s) => (
                <SolicitudCard key={s.id} solicitud={s} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="proceso">
          {enProceso.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No hay solicitudes en proceso</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enProceso.map((s) => (
                <SolicitudCard key={s.id} solicitud={s} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historial">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {(s.sucursales as any)?.nombre}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(s.created_at).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {(s.solicitud_items as any[])?.length} insumos
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${coloresEstado[s.estado]}`}
                      >
                        {s.estado.replace("_", " ")}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL GESTIONAR SOLICITUD */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Solicitud — {(solicitudActiva?.sucursales as any)?.nombre}
            </DialogTitle>
          </DialogHeader>

          {solicitudActiva && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Items solicitados
                </p>
                {(solicitudActiva.solicitud_items as any[])?.map(
                  (item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 border-b border-gray-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.insumos?.nombre}
                        </p>
                        <p className="text-xs text-gray-400">
                          Solicitado: {item.cantidad_solicitada}{" "}
                          {item.unidad_solicitada}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 mb-1">
                          Cantidad a aprobar
                        </p>
                        <input
                          type="number"
                          defaultValue={
                            item.cantidad_aprobada || item.cantidad_solicitada
                          }
                          className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-sm"
                          onBlur={(e) =>
                            actualizarCantidadAprobada(item.id, e.target.value)
                          }
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>

              {solicitudActiva.notas && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Notas de la sucursal
                  </p>
                  <p className="text-sm text-gray-700">
                    {solicitudActiva.notas}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Notas del almacén (opcional)
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                  rows={3}
                  placeholder="Ej: Se envía el martes, falta 1 caja de paletas..."
                  value={notasAlmacen}
                  onChange={(e) => setNotasAlmacen(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700">
                  Cambiar estado
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ESTADOS.filter((e) => e !== solicitudActiva.estado).map(
                    (estado) => (
                      <Button
                        key={estado}
                        variant="outline"
                        size="sm"
                        className={`text-xs capitalize justify-start ${coloresEstado[estado]}`}
                        onClick={() =>
                          cambiarEstado(solicitudActiva.id, estado)
                        }
                        disabled={loading}
                      >
                        {estado.replace("_", " ")}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
