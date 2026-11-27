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
import { Plus, Search, UserCheck, UserX, Clock, Pencil } from "lucide-react";

const ROLES = [
  "vendedor",
  "cajero",
  "supervisor",
  "administrador",
  "fabrica",
  "repartidor",
  "almacen",
];

const coloresRol: Record<string, string> = {
  vendedor: "bg-blue-50 text-blue-700",
  cajero: "bg-purple-50 text-purple-700",
  supervisor: "bg-amber-50 text-amber-700",
  administrador: "bg-green-50 text-green-700",
  fabrica: "bg-teal-50 text-teal-700",
  repartidor: "bg-orange-50 text-orange-700",
  almacen: "bg-indigo-50 text-indigo-700",
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usuarioHorario, setUsuarioHorario] = useState<any>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<any>(null);
  const [formEdit, setFormEdit] = useState({
    nombre_completo: "",
    apellido: "",
    rol: "vendedor",
    sucursal_id: "",
    nip: "",
    fecha_nacimiento: "",
    domicilio: "",
    salario_diario: "",
    tipo_pago: "diario",
    es_dueno: false,
  });
  const [horario, setHorario] = useState({
    hora_entrada: "",
    hora_salida: "",
    minutos_comida: "15",
    tolerancia_minutos: "5",
  });
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
    salario_diario: "",
    tipo_pago: "diario",
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
      salario_diario: parseFloat(form.salario_diario) || 0,
      tipo_pago: form.tipo_pago,
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
      salario_diario: "",
      tipo_pago: "diario",
    });
    cargarUsuarios();
  }

  function abrirEdicion(u: any) {
    setUsuarioEditando(u);
    setFormEdit({
      nombre_completo: u.nombre_completo || "",
      apellido: u.apellido || "",
      rol: u.rol || "vendedor",
      sucursal_id: u.sucursal_id || "",
      nip: u.nip || "",
      fecha_nacimiento: u.fecha_nacimiento || "",
      domicilio: u.domicilio || "",
      salario_diario: u.salario_diario != null ? String(u.salario_diario) : "",
      tipo_pago: u.tipo_pago || "diario",
      es_dueno: !!u.es_dueno,
    });
  }

  async function guardarEdicion() {
    if (!usuarioEditando) return;
    if (!formEdit.nombre_completo.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    if (formEdit.nip.length !== 6) {
      alert("El NIP debe tener 6 dígitos");
      return;
    }

    setLoading(true);
    const { data: repetido } = await supabase
      .from("perfiles")
      .select("id")
      .eq("nip", formEdit.nip)
      .neq("id", usuarioEditando.id)
      .limit(1);

    if (repetido && repetido.length > 0) {
      setLoading(false);
      alert("Ese NIP ya lo usa otro empleado");
      return;
    }

    const { data, error } = await supabase
      .from("perfiles")
      .update({
        nombre_completo: formEdit.nombre_completo.trim(),
        apellido: formEdit.apellido.trim() || null,
        rol: formEdit.rol,
        sucursal_id: formEdit.sucursal_id || null,
        nip: formEdit.nip,
        fecha_nacimiento: formEdit.fecha_nacimiento || null,
        domicilio: formEdit.domicilio.trim() || null,
        salario_diario: parseFloat(formEdit.salario_diario) || 0,
        tipo_pago: formEdit.tipo_pago,
        es_dueno: formEdit.es_dueno,
      })
      .eq("id", usuarioEditando.id)
      .select("id");
    setLoading(false);

    if (error || !data || data.length === 0) {
      alert(
        `No se pudo guardar: ${error?.message || "la base no aplicó el cambio (permisos)"}`,
      );
      return;
    }
    setUsuarioEditando(null);
    cargarUsuarios();
  }

  function abrirHorario(u: any) {
    setUsuarioHorario(u);
    setHorario({
      hora_entrada: u.hora_entrada?.slice(0, 5) || "",
      hora_salida: u.hora_salida?.slice(0, 5) || "",
      minutos_comida: String(u.minutos_comida ?? 15),
      tolerancia_minutos: String(u.tolerancia_minutos ?? 5),
    });
  }

  async function guardarHorario() {
    if (!usuarioHorario) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("perfiles")
      .update({
        hora_entrada: horario.hora_entrada || null,
        hora_salida: horario.hora_salida || null,
        minutos_comida: parseInt(horario.minutos_comida) || 0,
        tolerancia_minutos: parseInt(horario.tolerancia_minutos) || 0,
      })
      .eq("id", usuarioHorario.id)
      .select("id");
    setLoading(false);

    if (error || !data || data.length === 0) {
      alert(
        `No se pudo guardar el horario: ${error?.message || "la base no aplicó el cambio (permisos)"}`,
      );
      return;
    }
    setUsuarioHorario(null);
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Salario diario</Label>
                  <Input
                    type="number"
                    value={form.salario_diario}
                    onChange={(e) =>
                      setForm({ ...form, salario_diario: e.target.value })
                    }
                    placeholder="350.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de pago</Label>
                  <Select
                    value={form.tipo_pago}
                    onValueChange={(v) => setForm({ ...form, tipo_pago: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diario</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
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

      <div className="bg-white rounded-xl border border-gray-100">
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

        {/* TABLA EN DESKTOP */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Salario diario</TableHead>
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
                      <p className="text-sm font-medium text-gray-900">
                        {u.nombre_completo} {u.apellido}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${coloresRol[u.rol] || "bg-gray-50 text-gray-600"}`}
                    >
                      {u.rol}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {(u.sucursales as any)?.nombre || "—"}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-gray-500">
                    {u.nip || "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${u.activo ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {u.salario_diario
                      ? `$${Number(u.salario_diario).toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => abrirEdicion(u)}
                      title="Editar"
                      className="text-gray-400 hover:text-gray-600 mr-3"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => abrirHorario(u)}
                      title="Horario"
                      className="text-gray-400 hover:text-gray-600 mr-3"
                    >
                      <Clock size={16} />
                    </button>
                    <button
                      onClick={() => toggleActivo(u.id, u.activo)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {u.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* CARDS EN MÓVIL */}
        <div className="md:hidden divide-y divide-gray-50">
          {usuariosFiltrados.map((u) => (
            <div key={u.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-600">
                    {u.nombre_completo?.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {u.nombre_completo} {u.apellido}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${coloresRol[u.rol] || "bg-gray-50 text-gray-600"}`}
                    >
                      {u.rol}
                    </span>
                    <span className="text-xs text-gray-400">
                      {(u.sucursales as any)?.nombre}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-mono text-gray-400">
                      PIN: {u.nip}
                    </span>
                    {u.salario_diario > 0 && (
                      <span className="text-xs text-gray-400">
                        ${Number(u.salario_diario).toFixed(2)}/día
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.activo ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}
                >
                  {u.activo ? "Activo" : "Inactivo"}
                </span>
                <button
                  onClick={() => abrirEdicion(u)}
                  title="Editar"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => abrirHorario(u)}
                  title="Horario"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Clock size={16} />
                </button>
                <button
                  onClick={() => toggleActivo(u.id, u.activo)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {u.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={!!usuarioEditando}
        onOpenChange={(v) => {
          if (!v) setUsuarioEditando(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar empleado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  value={formEdit.nombre_completo}
                  onChange={(e) =>
                    setFormEdit({ ...formEdit, nombre_completo: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Apellido</Label>
                <Input
                  value={formEdit.apellido}
                  onChange={(e) =>
                    setFormEdit({ ...formEdit, apellido: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rol *</Label>
                <Select
                  value={formEdit.rol}
                  onValueChange={(v) => setFormEdit({ ...formEdit, rol: v })}
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
                  value={formEdit.nip}
                  onChange={(e) =>
                    setFormEdit({
                      ...formEdit,
                      nip: e.target.value.replace(/\D/g, "").slice(0, 6),
                    })
                  }
                  maxLength={6}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Sucursal</Label>
              <Select
                value={formEdit.sucursal_id}
                onValueChange={(v) =>
                  setFormEdit({ ...formEdit, sucursal_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((suc) => (
                    <SelectItem key={suc.id} value={suc.id}>
                      {suc.nombre}
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
                  value={formEdit.fecha_nacimiento}
                  onChange={(e) =>
                    setFormEdit({
                      ...formEdit,
                      fecha_nacimiento: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Salario diario</Label>
                <Input
                  type="number"
                  value={formEdit.salario_diario}
                  onChange={(e) =>
                    setFormEdit({ ...formEdit, salario_diario: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Domicilio</Label>
              <Input
                value={formEdit.domicilio}
                onChange={(e) =>
                  setFormEdit({ ...formEdit, domicilio: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de pago</Label>
              <Select
                value={formEdit.tipo_pago}
                onValueChange={(v) => setFormEdit({ ...formEdit, tipo_pago: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diario</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quincenal">Quincenal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="w-4 h-4 mt-0.5"
                checked={formEdit.es_dueno}
                onChange={(e) =>
                  setFormEdit({ ...formEdit, es_dueno: e.target.checked })
                }
              />
              <span>
                Es dueño
                <span className="block text-xs text-gray-400">
                  Puede cargar consumos a su cuenta con su NIP o QR. La sucursal
                  recibe una nota de crédito.
                </span>
              </span>
            </label>
            <p className="text-xs text-gray-400">
              El correo y la contraseña de acceso no se cambian desde aquí.
            </p>
            <Button className="w-full" onClick={guardarEdicion} disabled={loading}>
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!usuarioHorario}
        onOpenChange={(v) => {
          if (!v) setUsuarioHorario(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Horario de {usuarioHorario?.nombre_completo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Hora de entrada</Label>
                <Input
                  type="time"
                  value={horario.hora_entrada}
                  onChange={(e) =>
                    setHorario({ ...horario, hora_entrada: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hora de salida</Label>
                <Input
                  type="time"
                  value={horario.hora_salida}
                  onChange={(e) =>
                    setHorario({ ...horario, hora_salida: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Comida (minutos)</Label>
                <Input
                  type="number"
                  value={horario.minutos_comida}
                  onChange={(e) =>
                    setHorario({ ...horario, minutos_comida: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tolerancia (minutos)</Label>
                <Input
                  type="number"
                  value={horario.tolerancia_minutos}
                  onChange={(e) =>
                    setHorario({
                      ...horario,
                      tolerancia_minutos: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Si llega después de la tolerancia, todos los minutos de retraso
              se descuentan en nómina.
            </p>
            <Button className="w-full" onClick={guardarHorario} disabled={loading}>
              {loading ? "Guardando..." : "Guardar horario"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
