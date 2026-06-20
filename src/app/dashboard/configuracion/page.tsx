"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QrCode, RefreshCw, Download } from "lucide-react";

export default function ConfiguracionPage() {
  const [supervisores, setSupervisores] = useState<any[]>([]);
  const [generando, setGenerando] = useState<string | null>(null);
  const [qrGenerado, setQrGenerado] = useState<{
    perfil: any;
    url: string;
  } | null>(null);

  useEffect(() => {
    cargarSupervisores();
  }, []);

  async function cargarSupervisores() {
    const { data } = await supabase
      .from("perfiles")
      .select("*, sucursales(nombre)")
      .in("rol", ["supervisor", "administrador"])
      .eq("activo", true)
      .order("nombre_completo");
    if (data) setSupervisores(data);
  }

  async function generarQR(perfil: any) {
    setGenerando(perfil.id);

    const nuevoQR = `QR-${perfil.id}-${Date.now()}`;

    await supabase
      .from("perfiles")
      .update({ qr_code: nuevoQR })
      .eq("id", perfil.id);

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(nuevoQR)}&margin=10`;

    setQrGenerado({ perfil, url: qrUrl });
    setGenerando(null);
    cargarSupervisores();
  }

  function descargarQR(perfil: any) {
    const qrCode = perfil.qr_code;
    if (!qrCode) return;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}&margin=10`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR-${perfil.nombre_completo}.png`;
    a.target = "_blank";
    a.click();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-400 mt-1">
          Gestión de QR y parámetros del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR CODES */}
        <div className="lg:col-span-2">
          <Card className="border-gray-100 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <QrCode size={18} />
                Códigos QR de autorización
              </CardTitle>
              <p className="text-sm text-gray-400">
                Cada supervisor y administrador tiene un QR único para autorizar
                descuentos y acciones especiales desde la tablet.
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>QR Code</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supervisores.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <p className="text-sm font-medium text-gray-900">
                            {s.nombre_completo} {s.apellido}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                              s.rol === "administrador"
                                ? "bg-green-50 text-green-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {s.rol}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {(s.sucursales as any)?.nombre || "—"}
                        </TableCell>
                        <TableCell>
                          {s.qr_code ? (
                            <span className="text-xs text-green-600 font-medium">
                              ✓ Generado
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Sin QR
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1.5 h-7"
                              disabled={generando === s.id}
                              onClick={() => generarQR(s)}
                            >
                              <RefreshCw
                                size={12}
                                className={
                                  generando === s.id ? "animate-spin" : ""
                                }
                              />
                              {s.qr_code ? "Regenerar" : "Generar"}
                            </Button>
                            {s.qr_code && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs gap-1.5 h-7"
                                onClick={() => descargarQR(s)}
                              >
                                <Download size={12} />
                                Descargar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL QR GENERADO */}
      {qrGenerado && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setQrGenerado(null)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              QR generado
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {qrGenerado.perfil.nombre_completo}
            </p>
            <img
              src={qrGenerado.url}
              alt="QR Code"
              className="w-48 h-48 mx-auto mb-6 rounded-xl"
            />
            <p className="text-xs text-gray-400 mb-6">
              El empleado puede usar este QR para autorizar acciones desde la
              tablet en lugar de su NIP.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setQrGenerado(null)}
              >
                Cerrar
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => descargarQR(qrGenerado.perfil)}
              >
                <Download size={14} />
                Descargar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
