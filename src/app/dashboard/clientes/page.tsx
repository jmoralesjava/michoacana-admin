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
import { Plus, Search, UserX, UserCheck, Pencil } from "lucide-react";

const coloresCat: Record<string, string> = {
  Normal: "bg-gray-50 text-gray-600",
  Plus: "bg-blue-50 text-blue-700",
  Premium: "bg-amber-50 text-amber-700",
};

export default function ClientesPage() {
  const [esMobil, setEsMobil] = useState(false);
  const [tabActiva, setTabActiva] = useState("clientes");
  const [clientes, setClientes] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [dialogCliente, setDialogCliente] = useState(false);
  const [dialogCategoria, setDialogCategoria] = useState(false);
  const [dialogSucursal, setDialogSucursal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [sucursalEditando, setSucursalEditando] = useState<any>(null);
  const [categoriaSucursal, setCategoriaSucursal] = useState("");

  const [formCliente, setFormCliente] = useState({
    nombre: "",
    apellido: "",
    whatsapp: "",
    categoria_id: "",
  });
  const [formCategoria, setFormCategoria] = useState({
    nombre: "",
    descuento_porcentaje: "",
    descripcion: "",
  });

  useEffect(() => {
    const check = () => setEsMobil(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    const [cli, cat, sucs] = await Promise.all([
      supabase
        .from("clientes")
        .select("*, categorias_cliente(nombre, descuento_porcentaje)")
        .order("created_at", { ascending: false }),
      supabase
        .from("categorias_cliente")
        .select("*")
        .eq("activa", true)
        .order("descuento_porcentaje"),
      supabase
        .from("sucursales")
        .select("*, categorias_cliente(nombre, descuento_porcentaje)")
        .eq("activa", true)
        .order("nombre"),
    ]);
    if (cli.data)
      setClientes(cli.data.filter((c) => !c.whatsapp?.startsWith("sucursal-")));
    if (cat.data) setCategorias(cat.data);
    if (sucs.data) setSucursales(sucs.data);
  }

  async function crearCliente() {
    if (!formCliente.nombre || !formCliente.whatsapp) return;
    setLoading(true);
    if (editando) {
      await supabase
        .from("clientes")
        .update({
          nombre: formCliente.nombre,
          apellido: formCliente.apellido || null,
          whatsapp: formCliente.whatsapp,
          categoria_id: formCliente.categoria_id || null,
        })
        .eq("id", editando.id);
    } else {
      await supabase.from("clientes").insert({
        nombre: formCliente.nombre,
        apellido: formCliente.apellido || null,
        whatsapp: formCliente.whatsapp,
        categoria_id: formCliente.categoria_id || null,
        activo: true,
      });
    }
    setLoading(false);
    setDialogCliente(false);
    setEditando(null);
    setFormCliente({
      nombre: "",
      apellido: "",
      whatsapp: "",
      categoria_id: "",
    });
    cargarTodo();
  }

  async function crearCategoria() {
    if (!formCategoria.nombre) return;
    setLoading(true);
    await supabase.from("categorias_cliente").insert({
      nombre: formCategoria.nombre,
      descuento_porcentaje: parseFloat(formCategoria.descuento_porcentaje) || 0,
      descripcion: formCategoria.descripcion || null,
    });
    setLoading(false);
    setDialogCategoria(false);
    setFormCategoria({ nombre: "", descuento_porcentaje: "", descripcion: "" });
    cargarTodo();
  }

  async function guardarCategoriaSucursal() {
    if (!sucursalEditando || !categoriaSucursal) return;
    setLoading(true);

    // Actualizar sucursal
    await supabase
      .from("sucursales")
      .update({ categoria_id: categoriaSucursal })
      .eq("id", sucursalEditando.id);

    // Actualizar cliente de la sucursal
    await supabase
      .from("clientes")
      .update({ categoria_id: categoriaSucursal })
      .eq("whatsapp", "sucursal-" + sucursalEditando.id);

    setLoading(false);
    setDialogSucursal(false);
    setSucursalEditando(null);
    setCategoriaSucursal("");
    cargarTodo();
  }

  async function toggleActivo(id: string, activo: boolean) {
    await supabase.from("clientes").update({ activo: !activo }).eq("id", id);
    cargarTodo();
  }

  function abrirEditar(cliente: any) {
    setEditando(cliente);
    setFormCliente({
      nombre: cliente.nombre,
      apellido: cliente.apellido || "",
      whatsapp: cliente.whatsapp,
      categoria_id: cliente.categoria_id || "",
    });
    setDialogCliente(true);
  }

  function abrirEditarSucursal(sucursal: any) {
    setSucursalEditando(sucursal);
    setCategoriaSucursal(sucursal.categoria_id || "");
    setDialogSucursal(true);
  }

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.whatsapp?.includes(busqueda),
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
        <p className="text-sm text-gray-400 mt-1">
          {clientes.length} clientes · {sucursales.length} sucursales
        </p>
      </div>

      {/* TABS MANUALES */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        {[
          { id: "clientes", label: `Clientes (${clientes.length})` },
          { id: "sucursales", label: `Sucursales (${sucursales.length})` },
          { id: "categorias", label: `Categorías (${categorias.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tabActiva === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CLIENTES */}
      {tabActiva === "clientes" && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                className="pl-9"
                placeholder="Buscar..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <Dialog
              open={dialogCliente}
              onOpenChange={(v) => {
                setDialogCliente(v);
                if (!v) {
                  setEditando(null);
                  setFormCliente({
                    nombre: "",
                    apellido: "",
                    whatsapp: "",
                    categoria_id: "",
                  });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus size={16} />
                  Nuevo cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editando ? "Editar cliente" : "Nuevo cliente"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Nombre *</Label>
                      <Input
                        value={formCliente.nombre}
                        onChange={(e) =>
                          setFormCliente({
                            ...formCliente,
                            nombre: e.target.value,
                          })
                        }
                        placeholder="Juan"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Apellido</Label>
                      <Input
                        value={formCliente.apellido}
                        onChange={(e) =>
                          setFormCliente({
                            ...formCliente,
                            apellido: e.target.value,
                          })
                        }
                        placeholder="García"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>WhatsApp *</Label>
                    <Input
                      value={formCliente.whatsapp}
                      onChange={(e) =>
                        setFormCliente({
                          ...formCliente,
                          whatsapp: e.target.value,
                        })
                      }
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Categoría</Label>
                    <Select
                      value={formCliente.categoria_id}
                      onValueChange={(v) =>
                        setFormCliente({ ...formCliente, categoria_id: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombre} ({c.descuento_porcentaje}% desc.)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={crearCliente}
                    disabled={loading}
                  >
                    {loading
                      ? "Guardando..."
                      : editando
                        ? "Guardar cambios"
                        : "Crear cliente"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-xl border border-gray-100">
            {!esMobil ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Descuento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Portal</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesFiltrados.map((c) => {
                      const cat = c.categorias_cliente as any;
                      const link = `${typeof window !== "undefined" ? window.location.origin : ""}/cliente?w=${encodeURIComponent(c.whatsapp)}`;
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-semibold text-gray-600">
                                  {c.nombre?.charAt(0)}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900">
                                {c.nombre} {c.apellido}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {c.whatsapp}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${coloresCat[cat?.nombre] || "bg-gray-50 text-gray-500"}`}
                            >
                              {cat?.nombre || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-green-600 font-medium">
                            {cat?.descuento_porcentaje
                              ? `-${cat.descuento_porcentaje}%`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${c.activo ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}
                            >
                              {c.activo ? "Activo" : "Inactivo"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(link)
                              }
                              className="text-xs text-blue-500 hover:underline"
                            >
                              Copiar link
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => abrirEditar(c)}
                                className="text-gray-300 hover:text-gray-600"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => toggleActivo(c.id, c.activo)}
                                className="text-gray-300 hover:text-gray-600"
                              >
                                {c.activo ? (
                                  <UserX size={14} />
                                ) : (
                                  <UserCheck size={14} />
                                )}
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {clientesFiltrados.map((c) => {
                  const cat = c.categorias_cliente as any;
                  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/cliente?w=${encodeURIComponent(c.whatsapp)}`;
                  return (
                    <div key={c.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {c.nombre} {c.apellido}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {c.whatsapp}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${coloresCat[cat?.nombre] || "bg-gray-50 text-gray-500"}`}
                          >
                            {cat?.nombre || "—"}
                          </span>
                          {cat?.descuento_porcentaje > 0 && (
                            <span className="text-xs text-green-600 font-medium">
                              -{cat.descuento_porcentaje}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${c.activo ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}
                        >
                          {c.activo ? "Activo" : "Inactivo"}
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(link)}
                          className="text-xs text-blue-500"
                        >
                          Copiar link
                        </button>
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => abrirEditar(c)}
                            className="text-gray-300 hover:text-gray-600"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => toggleActivo(c.id, c.activo)}
                            className="text-gray-300 hover:text-gray-600"
                          >
                            {c.activo ? (
                              <UserX size={14} />
                            ) : (
                              <UserCheck size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUCURSALES */}
      {tabActiva === "sucursales" && (
        <div>
          <p className="text-sm text-gray-400 mb-4">
            Asigna categoría de descuento a cada sucursal para sus pedidos a
            fábrica.
          </p>

          <Dialog
            open={dialogSucursal}
            onOpenChange={(v) => {
              setDialogSucursal(v);
              if (!v) {
                setSucursalEditando(null);
                setCategoriaSucursal("");
              }
            }}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>
                  Categoría — {sucursalEditando?.nombre}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Categoría de descuento</Label>
                  <Select
                    value={categoriaSucursal}
                    onValueChange={setCategoriaSucursal}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre} ({c.descuento_porcentaje}% desc.)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={guardarCategoriaSucursal}
                  disabled={loading}
                >
                  {loading ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="bg-white rounded-xl border border-gray-100">
            {!esMobil ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Descuento</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sucursales.map((s) => {
                      const cat = s.categorias_cliente as any;
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium text-gray-900">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-semibold text-gray-600">
                                  🏪
                                </span>
                              </div>
                              {s.nombre}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${coloresCat[cat?.nombre] || "bg-gray-50 text-gray-500"}`}
                            >
                              {cat?.nombre || "Sin categoría"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-green-600 font-medium">
                            {cat?.descuento_porcentaje
                              ? `-${cat.descuento_porcentaje}%`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => abrirEditarSucursal(s)}
                              className="text-gray-300 hover:text-gray-600"
                            >
                              <Pencil size={14} />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {sucursales.map((s) => {
                  const cat = s.categorias_cliente as any;
                  return (
                    <div
                      key={s.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          🏪 {s.nombre}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${coloresCat[cat?.nombre] || "bg-gray-50 text-gray-500"}`}
                          >
                            {cat?.nombre || "Sin categoría"}
                          </span>
                          {cat?.descuento_porcentaje > 0 && (
                            <span className="text-xs text-green-600 font-medium">
                              -{cat.descuento_porcentaje}%
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => abrirEditarSucursal(s)}
                        className="text-gray-300 hover:text-gray-600"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATEGORÍAS */}
      {tabActiva === "categorias" && (
        <div>
          <div className="flex justify-end mb-4">
            <Dialog open={dialogCategoria} onOpenChange={setDialogCategoria}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus size={16} />
                  Nueva categoría
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Nueva categoría</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Nombre *</Label>
                    <Input
                      value={formCategoria.nombre}
                      onChange={(e) =>
                        setFormCategoria({
                          ...formCategoria,
                          nombre: e.target.value,
                        })
                      }
                      placeholder="VIP"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descuento %</Label>
                    <Input
                      type="number"
                      value={formCategoria.descuento_porcentaje}
                      onChange={(e) =>
                        setFormCategoria({
                          ...formCategoria,
                          descuento_porcentaje: e.target.value,
                        })
                      }
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descripción</Label>
                    <Input
                      value={formCategoria.descripcion}
                      onChange={(e) =>
                        setFormCategoria({
                          ...formCategoria,
                          descripcion: e.target.value,
                        })
                      }
                      placeholder="Cliente VIP con 10% descuento"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={crearCategoria}
                    disabled={loading}
                  >
                    {loading ? "Guardando..." : "Crear categoría"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: esMobil ? "1fr" : "repeat(3, 1fr)",
              gap: "1rem",
            }}
          >
            {categorias.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-xl border border-gray-100 p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{cat.nombre}</h3>
                  <span className="text-lg font-bold text-green-600">
                    -{cat.descuento_porcentaje}%
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  {cat.descripcion || "Sin descripción"}
                </p>
                <p className="text-xs text-gray-300 mt-3">
                  {clientes.filter((c) => c.categoria_id === cat.id).length}{" "}
                  clientes ·{" "}
                  {sucursales.filter((s) => s.categoria_id === cat.id).length}{" "}
                  sucursales
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
