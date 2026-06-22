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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function CatalogoPage() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [toppings, setToppings] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);

  // Diálogos
  const [dialogCategoria, setDialogCategoria] = useState(false);
  const [dialogProducto, setDialogProducto] = useState(false);
  const [dialogTopping, setDialogTopping] = useState(false);
  const [dialogReceta, setDialogReceta] = useState(false);
  const [productoReceta, setProductoReceta] = useState<any>(null);
  const [recetaItems, setRecetaItems] = useState<any[]>([]);

  // Forms
  const [formCategoria, setFormCategoria] = useState({
    nombre: "",
    orden: "0",
  });
  const [formProducto, setFormProducto] = useState({
    nombre: "",
    categoria_id: "",
    precio: "",
    permite_toppings: "false",
    tiene_variantes: "false",
  });
  const [formTopping, setFormTopping] = useState({
    nombre: "",
    precio_extra: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    const [cats, prods, tops, ins] = await Promise.all([
      supabase.from("categorias").select("*").order("orden"),
      supabase
        .from("productos")
        .select("*, categorias(nombre)")
        .order("nombre"),
      supabase.from("toppings").select("*").order("nombre"),
      supabase.from("insumos").select("*").order("nombre"),
    ]);
    if (cats.data) setCategorias(cats.data);
    if (prods.data) setProductos(prods.data);
    if (tops.data) setToppings(tops.data);
    if (ins.data) setInsumos(ins.data);
  }

  async function crearCategoria() {
    if (!formCategoria.nombre) return;
    setLoading(true);
    await supabase.from("categorias").insert({
      nombre: formCategoria.nombre,
      orden: parseInt(formCategoria.orden) || 0,
    });
    setLoading(false);
    setDialogCategoria(false);
    setFormCategoria({ nombre: "", orden: "0" });
    cargarTodo();
  }

  async function crearProducto() {
    if (
      !formProducto.nombre ||
      !formProducto.categoria_id ||
      !formProducto.precio
    )
      return;
    setLoading(true);
    await supabase.from("productos").insert({
      nombre: formProducto.nombre,
      categoria_id: formProducto.categoria_id,
      precio: parseFloat(formProducto.precio),
      permite_toppings: formProducto.permite_toppings === "true",
      tiene_variantes: formProducto.tiene_variantes === "true",
    });
    setLoading(false);
    setDialogProducto(false);
    setFormProducto({
      nombre: "",
      categoria_id: "",
      precio: "",
      permite_toppings: "false",
      tiene_variantes: "false",
    });
    cargarTodo();
  }

  async function crearTopping() {
    if (!formTopping.nombre) return;
    setLoading(true);
    await supabase.from("toppings").insert({
      nombre: formTopping.nombre,
      precio_extra: parseFloat(formTopping.precio_extra) || 0,
    });
    setLoading(false);
    setDialogTopping(false);
    setFormTopping({ nombre: "", precio_extra: "" });
    cargarTodo();
  }

  async function eliminarCategoria(id: string) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    await supabase.from("categorias").delete().eq("id", id);
    cargarTodo();
  }

  async function eliminarProducto(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    await supabase.from("productos").delete().eq("id", id);
    cargarTodo();
  }

  async function eliminarTopping(id: string) {
    if (!confirm("¿Eliminar este topping?")) return;
    await supabase.from("toppings").delete().eq("id", id);
    cargarTodo();
  }

  async function abrirReceta(producto: any) {
    setProductoReceta(producto);
    const { data } = await supabase
      .from("producto_insumos")
      .select("*, insumos(nombre, unidad_medida)")
      .eq("producto_id", producto.id);
    setRecetaItems(data || []);
    setDialogReceta(true);
  }

  async function agregarInsumoReceta(insumoId: string, cantidad: number) {
    if (!productoReceta || !insumoId || !cantidad) return;
    await supabase.from("producto_insumos").upsert(
      {
        producto_id: productoReceta.id,
        insumo_id: insumoId,
        cantidad_usada: cantidad,
      },
      { onConflict: "producto_id,insumo_id" },
    );
    const { data } = await supabase
      .from("producto_insumos")
      .select("*, insumos(nombre, unidad_medida)")
      .eq("producto_id", productoReceta.id);
    setRecetaItems(data || []);
  }

  async function eliminarInsumoReceta(id: string) {
    await supabase.from("producto_insumos").delete().eq("id", id);
    const { data } = await supabase
      .from("producto_insumos")
      .select("*, insumos(nombre, unidad_medida)")
      .eq("producto_id", productoReceta.id);
    setRecetaItems(data || []);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Catálogo</h1>
        <p className="text-sm text-gray-400 mt-1">
          Gestiona categorías, productos y extras
        </p>
      </div>

      <Tabs defaultValue="productos">
        <TabsList className="mb-6">
          <TabsTrigger value="productos">
            Productos ({productos.length})
          </TabsTrigger>
          <TabsTrigger value="categorias">
            Categorías ({categorias.length})
          </TabsTrigger>
          <TabsTrigger value="toppings">
            Extras / Toppings ({toppings.length})
          </TabsTrigger>
        </TabsList>

        {/* PRODUCTOS */}
        <TabsContent value="productos">
          <div className="flex justify-end mb-4">
            <Dialog open={dialogProducto} onOpenChange={setDialogProducto}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus size={16} />
                  Nuevo producto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nuevo producto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Nombre *</Label>
                    <Input
                      value={formProducto.nombre}
                      onChange={(e) =>
                        setFormProducto({
                          ...formProducto,
                          nombre: e.target.value,
                        })
                      }
                      placeholder="Paleta de mango"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Categoría *</Label>
                    <Select
                      value={formProducto.categoria_id}
                      onValueChange={(v) =>
                        setFormProducto({ ...formProducto, categoria_id: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Precio *</Label>
                    <Input
                      type="number"
                      value={formProducto.precio}
                      onChange={(e) =>
                        setFormProducto({
                          ...formProducto,
                          precio: e.target.value,
                        })
                      }
                      placeholder="28.00"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>¿Permite toppings?</Label>
                      <Select
                        value={formProducto.permite_toppings}
                        onValueChange={(v) =>
                          setFormProducto({
                            ...formProducto,
                            permite_toppings: v,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Sí</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>¿Tiene variantes?</Label>
                      <Select
                        value={formProducto.tiene_variantes}
                        onValueChange={(v) =>
                          setFormProducto({
                            ...formProducto,
                            tiene_variantes: v,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Sí</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={crearProducto}
                    disabled={loading}
                  >
                    {loading ? "Guardando..." : "Crear producto"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Toppings</TableHead>
                  <TableHead>Variantes</TableHead>
                  <TableHead>Receta</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-gray-900">
                      {p.nombre}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {(p.categorias as any)?.nombre}
                    </TableCell>
                    <TableCell className="text-sm">
                      ${Number(p.precio).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${p.permite_toppings ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}
                      >
                        {p.permite_toppings ? "Sí" : "No"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${p.tiene_variantes ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-400"}`}
                      >
                        {p.tiene_variantes ? "Sí" : "No"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => abrirReceta(p)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Ver receta
                      </button>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => eliminarProducto(p.id)}
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
                      placeholder="Paletas"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Orden</Label>
                    <Input
                      type="number"
                      value={formCategoria.orden}
                      onChange={(e) =>
                        setFormCategoria({
                          ...formCategoria,
                          orden: e.target.value,
                        })
                      }
                      placeholder="1"
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

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-gray-900">
                      {c.nombre}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {c.orden}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${c.activa ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}
                      >
                        {c.activa ? "Activa" : "Inactiva"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => eliminarCategoria(c.id)}
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

        {/* TOPPINGS */}
        <TabsContent value="toppings">
          <div className="flex justify-end mb-4">
            <Dialog open={dialogTopping} onOpenChange={setDialogTopping}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus size={16} />
                  Nuevo topping
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Nuevo topping / extra</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Nombre *</Label>
                    <Input
                      value={formTopping.nombre}
                      onChange={(e) =>
                        setFormTopping({
                          ...formTopping,
                          nombre: e.target.value,
                        })
                      }
                      placeholder="Chamoy"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Precio extra</Label>
                    <Input
                      type="number"
                      value={formTopping.precio_extra}
                      onChange={(e) =>
                        setFormTopping({
                          ...formTopping,
                          precio_extra: e.target.value,
                        })
                      }
                      placeholder="5.00"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={crearTopping}
                    disabled={loading}
                  >
                    {loading ? "Guardando..." : "Crear topping"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Precio extra</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toppings.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-gray-900">
                      {t.nombre}
                    </TableCell>
                    <TableCell className="text-sm">
                      ${Number(t.precio_extra).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${t.activo ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}
                      >
                        {t.activo ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => eliminarTopping(t.id)}
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
      </Tabs>

      {/* MODAL RECETA */}
      <Dialog open={dialogReceta} onOpenChange={setDialogReceta}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Receta — {productoReceta?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RecetaForm insumos={insumos} onAgregar={agregarInsumoReceta} />
            <div className="space-y-2">
              {recetaItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Sin insumos en la receta
                </p>
              ) : (
                recetaItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50"
                  >
                    <span className="text-sm text-gray-900">
                      {(item.insumos as any)?.nombre}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {item.cantidad_usada}{" "}
                        {(item.insumos as any)?.unidad_medida}
                      </span>
                      <button
                        onClick={() => eliminarInsumoReceta(item.id)}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecetaForm({
  insumos,
  onAgregar,
}: {
  insumos: any[];
  onAgregar: (id: string, cantidad: number) => void;
}) {
  const [insumoId, setInsumoId] = useState("");
  const [cantidad, setCantidad] = useState("");

  function handleAgregar() {
    if (!insumoId || !cantidad) return;
    onAgregar(insumoId, parseFloat(cantidad));
    setInsumoId("");
    setCantidad("");
  }

  return (
    <div className="flex gap-2">
      <Select value={insumoId} onValueChange={setInsumoId}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Selecciona un insumo" />
        </SelectTrigger>
        <SelectContent>
          {insumos.map((i) => (
            <SelectItem key={i.id} value={i.id}>
              {i.nombre} ({i.unidad_medida})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        className="w-24"
        type="number"
        placeholder="Cant."
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
      />
      <Button onClick={handleAgregar} size="sm">
        <Plus size={16} />
      </Button>
    </div>
  );
}
