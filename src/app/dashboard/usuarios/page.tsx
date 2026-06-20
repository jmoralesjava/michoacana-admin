"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Search, UserCheck, UserX } from "lucide-react";

const ROLES = ["vendedor", "cajero", "supervisor", "administrador"];

const coloresRol: Record<string, string> = {
  vendedor: "bg-blue-50 text-blue-700",
  cajero: "bg-purple-50 text-purple-700",
  supervisor: "bg-amber-50 text-amber-700",
  administrador: "bg-green-50 text-green-700",
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre_completo: "",
    apellido: "",
    email: "",
    password: "",
    rol: "vendedor",
    sucursal_id: "",
    nip: "",
    fecha_nacimiento: "",
    domicilio: "",
  });

  useEffect(() => {
    cargarUsuarios();
    cargarSucursales();
  }, []);

  async function cargarUsuarios() {
    const { data } = await supabase
      .from("perfiles")
      .select("*, sucursales(nombre)")
      .order("created_at", { ascending: false });
    if (data) setUsuarios(data);
  }

  async function cargarSucursales() {
    const { data } = await supabase
      .from("sucursales")
      .select("id, nombre")
      .eq("activa", true);
    if (data) setSucursales(data);
  }

  async function crearUsuario() {
    if (
      !form.nombre_completo ||
      !form.email ||
      !form.password ||
      !form.rol ||
      !form.nip
    )
      return;
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError || !authData.user) {
      setLoading(false);
      alert("Error al crear usuario: " + authError?.message);
      return;
    }

    const { error: perfilError } = await supabase.from("perfiles").insert({
      id: authData.user.id,
      nombre_completo: form.nombre_completo,
      apellido: form.apellido || null,
      rol: form.rol,
      sucursal_id: form.sucursal_id || null,
      nip: form.nip,
      fecha_nacimiento: form.fecha_nacimiento || null,
      domicilio: form.domicilio || null,
      activo: true,
    });

    setLoading(false);

    if (perfilError) {
      alert("Error al crear perfil: " + perfilError.message);
      return;
    }

    setDialogOpen(false);
    setForm({
      nombre_completo: "",
      apellido: "",
      email: "",
      password: "",
      rol: "vendedor",
      sucursal_id: "",
      nip: "",
      fecha_nacimiento: "",
      domicilio: "",
    });
    cargarUsuarios();
  }

  async function toggleActivo(id: string, activo: boolean) {
    await supabase.from("perfiles").update({ activo: !activo }).eq("id", id);
    cargarUsuarios();
  }

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.rol?.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-400 mt-1">
            {usuarios.length} empleados registrados
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              Nuevo usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo empleado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nombre *</Label>
                  <Input
                    value={form.nombre_completo}
                    onChange={(e) =>
                      setForm({ ...form, nombre_completo: e.target.value })
                    }
                    placeholder="Juan"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Apellido</Label>
                  <Input
                    value={form.apellido}
                    onChange={(e) =>
                      setForm({ ...form, apellido: e.target.value })
                    }
                    placeholder="García"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Correo electrónico *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="juan@paleteria.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Contraseña *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Rol *</Label>
                  <Select
                    value={form.rol}
                    onValueChange={(v) => setForm({ ...form, rol: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>NIP (6 dígitos) *</Label>
                  <Input
                    value={form.nip}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nip: e.target.value.replace(/\D/g, "").slice(0, 6),
                      })
                    }
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Sucursal</Label>
                <Select
                  value={form.sucursal_id}
                  onValueChange={(v) => setForm({ ...form, sucursal_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {sucursales.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Fecha de nacimiento</Label>
                  <Input
                    type="date"
                    value={form.fecha_nacimiento}
                    onChange={(e) =>
                      setForm({ ...form, fecha_nacimiento: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Domicilio</Label>
                  <Input
                    value={form.domicilio}
                    onChange={(e) =>
                      setForm({ ...form, domicilio: e.target.value })
                    }
                    placeholder="Calle y número"
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={crearUsuario}
                disabled={loading}
              >
                {loading ? "Creando..." : "Crear empleado"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o rol..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>NIP</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuariosFiltrados.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-600">
                        {u.nombre_completo?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {u.nombre_completo} {u.apellido}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${coloresRol[u.rol] || "bg-gray-50 text-gray-600"}`}
                  >
                    {u.rol}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-600">
                    {(u.sucursales as any)?.nombre || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-mono text-gray-500">
                    {u.nip || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${u.activo ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}
                  >
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleActivo(u.id, u.activo)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title={u.activo ? "Desactivar" : "Activar"}
                  >
                    {u.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
