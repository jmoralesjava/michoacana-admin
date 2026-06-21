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
import { Plus, Search, UserX, UserCheck, Pencil } from "lucide-react";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [dialogCliente, setDialogCliente] = useState(false);
  const [dialogCategoria, setDialogCategoria] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<any>(null);

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
    cargarTodo();
  }, []);

  async function cargarTodo() {
    const [cli, cat] = await Promise.all([
      supabase
        .from("clientes")
        .select("*, categorias_cliente(nombre, descuento_porcentaje)")
        .order("created_at", { ascending: false }),
      supabase
        .from("categorias_cliente")
        .select("*")
        .eq("activa", true)
        .order("descuento_porcentaje"),
    ]);
    if (cli.data) setClientes(cli.data);
    if (cat.data) setCategorias(cat.data);
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

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.whatsapp?.includes(busqueda),
  );

  const coloresCat: Record<string, string> = {
    Normal: "bg-gray-50 text-gray-600",
    Plus: "bg-blue-50 text-blue-700",
    Premium: "bg-amber-50 text-amber-700",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Clientes</h1>
        <p className="text-sm text-gray-400 mt-1">
          {clientes.length} clientes registrados
        </p>
      </div>

      <Tabs defaultValue="clientes">
        <TabsList className="mb-6">
          <TabsTrigger value="clientes">
            Clientes ({clientes.length})
          </TabsTrigger>
          <TabsTrigger value="categorias">
            Categorías ({categorias.length})
          </TabsTrigger>
        </TabsList>

        {/* CLIENTES */}
        <TabsContent value="clientes">
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-72">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre o WhatsApp..."
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

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
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
                          onClick={() => navigator.clipboard.writeText(link)}
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
        </TabsContent>

        {/* CATEGORÍAS */}
        <TabsContent value="categorias">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  clientes asignados
                </p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
