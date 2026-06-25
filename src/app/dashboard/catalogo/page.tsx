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
import { Plus, Trash2, Pencil } from "lucide-react";

const formVacio = {
  nombre: "",
  categoria_id: "",
  precio: "",
  permite_toppings: "false",
  tiene_variantes: "false",
  presentacion_nombre: "",
  presentacion_cantidad: "",
};

export default function CatalogoPage() {
  const [esMobil, setEsMobil] = useState(false);
  const [tabActiva, setTabActiva] = useState("productos");
  const [categorias, setCategorias] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [toppings, setToppings] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [dialogCategoria, setDialogCategoria] = useState(false);
  const [dialogProducto, setDialogProducto] = useState(false);
  const [dialogTopping, setDialogTopping] = useState(false);
  const [dialogReceta, setDialogReceta] = useState(false);
  const [productoReceta, setProductoReceta] = useState<any>(null);
  const [recetaItems, setRecetaItems] = useState<any[]>([]);
  const [editandoProducto, setEditandoProducto] = useState<any>(null);
  const [formCategoria, setFormCategoria] = useState({
    nombre: "",
    orden: "0",
  });
  const [formProducto, setFormProducto] = useState(formVacio);
  const [formTopping, setFormTopping] = useState({
    nombre: "",
    precio_extra: "",
  });
  const [loading, setLoading] = useState(false);
  const [variantes, setVariantes] = useState<any[]>([]);
  const [varianteActiva, setVarianteActiva] = useState<string | null>(null);
  const [recetaVarianteItems, setRecetaVarianteItems] = useState<any[]>([]);
  const [dialogVariante, setDialogVariante] = useState(false);
  const [formVariante, setFormVariante] = useState({ nombre: "", precio: "" });

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
    await supabase
      .from("categorias")
      .insert({
        nombre: formCategoria.nombre,
        orden: parseInt(formCategoria.orden) || 0,
      });
    setLoading(false);
    setDialogCategoria(false);
    setFormCategoria({ nombre: "", orden: "0" });
    cargarTodo();
  }

  async function abrirReceta(producto: any) {
    setProductoReceta(producto);
    setVarianteActiva(null);
    setRecetaVarianteItems([]);
    const [receta, vars] = await Promise.all([
      supabase
        .from("producto_insumos")
        .select("*, insumos(nombre, unidad_medida)")
        .eq("producto_id", producto.id),
      supabase
        .from("producto_variantes")
        .select("*")
        .eq("producto_id", producto.id)
        .order("orden"),
    ]);
    setRecetaItems(receta.data || []);
    setVariantes(vars.data || []);
    setDialogReceta(true);
  }

  function abrirEditar(producto: any) {
    setEditandoProducto(producto);
    setFormProducto({
      nombre: producto.nombre,
      categoria_id: producto.categoria_id,
      precio: producto.precio?.toString() || "",
      permite_toppings: producto.permite_toppings ? "true" : "false",
      tiene_variantes: producto.tiene_variantes ? "true" : "false",
      presentacion_nombre: producto.presentacion_nombre || "",
      presentacion_cantidad: producto.presentacion_cantidad?.toString() || "",
    });
    setDialogProducto(true);
  }

  async function cargarRecetaVariante(varianteId: string) {
    setVarianteActiva(varianteId);
    const { data } = await supabase
      .from("variante_insumos")
      .select("*, insumos(nombre, unidad_medida)")
      .eq("variante_id", varianteId);
    setRecetaVarianteItems(data || []);
  }

  async function agregarInsumoVariante(insumoId: string, cantidad: number) {
    if (!varianteActiva || !insumoId || !cantidad) return;
    await supabase
      .from("variante_insumos")
      .upsert(
        {
          variante_id: varianteActiva,
          insumo_id: insumoId,
          cantidad_usada: cantidad,
        },
        { onConflict: "variante_id,insumo_id" },
      );
    cargarRecetaVariante(varianteActiva);
  }

  async function eliminarInsumoVariante(id: string) {
    await supabase.from("variante_insumos").delete().eq("id", id);
    if (varianteActiva) cargarRecetaVariante(varianteActiva);
  }

  async function crearVariante() {
    if (!formVariante.nombre || !formVariante.precio || !productoReceta) return;
    await supabase.from("producto_variantes").insert({
      producto_id: productoReceta.id,
      nombre: formVariante.nombre,
      precio: parseFloat(formVariante.precio),
      orden: variantes.length + 1,
    });
    setFormVariante({ nombre: "", precio: "" });
    setDialogVariante(false);
    const { data } = await supabase
      .from("producto_variantes")
      .select("*")
      .eq("producto_id", productoReceta.id)
      .order("orden");
    setVariantes(data || []);
  }

  async function eliminarVariante(id: string) {
    if (!confirm("¿Eliminar esta variante y su receta?")) return;
    await supabase.from("producto_variantes").delete().eq("id", id);
    if (varianteActiva === id) {
      setVarianteActiva(null);
      setRecetaVarianteItems([]);
    }
    const { data } = await supabase
      .from("producto_variantes")
      .select("*")
      .eq("producto_id", productoReceta.id)
      .order("orden");
    setVariantes(data || []);
  }

  async function guardarProducto() {
    if (
      !formProducto.nombre ||
      !formProducto.categoria_id ||
      !formProducto.precio
    )
      return;
    setLoading(true);

    const payload = {
      nombre: formProducto.nombre,
      categoria_id: formProducto.categoria_id,
      precio: parseFloat(formProducto.precio),
      permite_toppings: formProducto.permite_toppings === "true",
      tiene_variantes: formProducto.tiene_variantes === "true",
      presentacion_nombre: formProducto.presentacion_nombre || null,
      presentacion_cantidad:
        parseInt(formProducto.presentacion_cantidad) || null,
    };

    if (editandoProducto) {
      await supabase
        .from("productos")
        .update(payload)
        .eq("id", editandoProducto.id);
    } else {
      await supabase.from("productos").insert(payload);
    }

    setLoading(false);
    setDialogProducto(false);
    setEditandoProducto(null);
    setFormProducto(formVacio);
    cargarTodo();
  }

  async function crearTopping() {
    if (!formTopping.nombre) return;
    setLoading(true);
    await supabase
      .from("toppings")
      .insert({
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

  async function agregarInsumoReceta(insumoId: string, cantidad: number) {
    if (!productoReceta || !insumoId || !cantidad) return;
    await supabase
      .from("producto_insumos")
      .upsert(
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

  const formDialog = (
    <Dialog
      open={dialogProducto}
      onOpenChange={(v) => {
        setDialogProducto(v);
        if (!v) {
          setEditandoProducto(null);
          setFormProducto(formVacio);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus size={16} />
          Nuevo producto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editandoProducto ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input
              value={formProducto.nombre}
              onChange={(e) =>
                setFormProducto({ ...formProducto, nombre: e.target.value })
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
            <Label>Precio por pieza *</Label>
            <Input
              type="number"
              value={formProducto.precio}
              onChange={(e) =>
                setFormProducto({ ...formProducto, precio: e.target.value })
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
                  setFormProducto({ ...formProducto, permite_toppings: v })
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
                  setFormProducto({ ...formProducto, tiene_variantes: v })
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
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
              Presentación (opcional)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input
                  value={formProducto.presentacion_nombre}
                  onChange={(e) =>
                    setFormProducto({
                      ...formProducto,
                      presentacion_nombre: e.target.value,
                    })
                  }
                  placeholder="Caja, Paquete, Kg..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Piezas incluidas</Label>
                <Input
                  type="number"
                  value={formProducto.presentacion_cantidad}
                  onChange={(e) =>
                    setFormProducto({
                      ...formProducto,
                      presentacion_cantidad: e.target.value,
                    })
                  }
                  placeholder="24"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Ej: "Caja" con 24 piezas → el cliente puede pedir por pieza o por
              caja
            </p>
          </div>
          <Button
            className="w-full"
            onClick={guardarProducto}
            disabled={loading}
          >
            {loading
              ? "Guardando..."
              : editandoProducto
                ? "Guardar cambios"
                : "Crear producto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Catálogo</h1>
        <p className="text-sm text-gray-400 mt-1">
          Gestiona categorías, productos y extras
        </p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 w-fit">
        {[
          { id: "productos", label: `Productos (${productos.length})` },
          { id: "categorias", label: `Categorías (${categorias.length})` },
          { id: "toppings", label: `Extras (${toppings.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tabActiva === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* PRODUCTOS */}
      {tabActiva === "productos" && (
        <div>
          <div className="flex justify-end mb-4">{formDialog}</div>

          <div className="bg-white rounded-xl border border-gray-100">
            {!esMobil ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Presentación</TableHead>
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
                        <TableCell className="text-sm text-gray-500">
                          {p.presentacion_nombre && p.presentacion_cantidad
                            ? `${p.presentacion_nombre} (${p.presentacion_cantidad} pzas)`
                            : "—"}
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => abrirEditar(p)}
                              className="text-gray-300 hover:text-gray-600"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => eliminarProducto(p.id)}
                              className="text-gray-300 hover:text-red-500"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {productos.map((p) => (
                  <div key={p.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {p.nombre}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {(p.categorias as any)?.nombre}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        ${Number(p.precio).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {p.permite_toppings && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          Con toppings
                        </span>
                      )}
                      {p.tiene_variantes && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          Con variantes
                        </span>
                      )}
                      {p.presentacion_nombre && p.presentacion_cantidad && (
                        <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">
                          {p.presentacion_nombre}: {p.presentacion_cantidad}{" "}
                          pzas
                        </span>
                      )}
                      <button
                        onClick={() => abrirReceta(p)}
                        className="text-xs text-blue-600 ml-auto"
                      >
                        Ver receta
                      </button>
                      <button
                        onClick={() => abrirEditar(p)}
                        className="text-gray-300 hover:text-gray-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => eliminarProducto(p.id)}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
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

          <div className="bg-white rounded-xl border border-gray-100">
            {!esMobil ? (
              <div className="overflow-x-auto">
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
                            className="text-gray-300 hover:text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {categorias.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {c.nombre}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Orden: {c.orden}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${c.activa ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}
                      >
                        {c.activa ? "Activa" : "Inactiva"}
                      </span>
                      <button
                        onClick={() => eliminarCategoria(c.id)}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOPPINGS */}
      {tabActiva === "toppings" && (
        <div>
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

          <div className="bg-white rounded-xl border border-gray-100">
            {!esMobil ? (
              <div className="overflow-x-auto">
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
                            className="text-gray-300 hover:text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {toppings.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {t.nombre}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        +${Number(t.precio_extra).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${t.activo ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-400"}`}
                      >
                        {t.activo ? "Activo" : "Inactivo"}
                      </span>
                      <button
                        onClick={() => eliminarTopping(t.id)}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL RECETA */}
      <Dialog open={dialogReceta} onOpenChange={setDialogReceta}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receta — {productoReceta?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {!productoReceta?.tiene_variantes && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Insumos del producto
                </p>
                <RecetaForm insumos={insumos} onAgregar={agregarInsumoReceta} />
                <div className="mt-3 space-y-2">
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
            )}

            {productoReceta?.tiene_variantes && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">Variantes</p>
                  <Dialog
                    open={dialogVariante}
                    onOpenChange={setDialogVariante}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-7 text-xs"
                      >
                        <Plus size={12} />
                        Nueva variante
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Nueva variante</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <Label>Nombre *</Label>
                          <Input
                            value={formVariante.nombre}
                            onChange={(e) =>
                              setFormVariante({
                                ...formVariante,
                                nombre: e.target.value,
                              })
                            }
                            placeholder="Chica, Mediana, Grande..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Precio *</Label>
                          <Input
                            type="number"
                            value={formVariante.precio}
                            onChange={(e) =>
                              setFormVariante({
                                ...formVariante,
                                precio: e.target.value,
                              })
                            }
                            placeholder="28.00"
                          />
                        </div>
                        <Button className="w-full" onClick={crearVariante}>
                          Crear variante
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {variantes.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    Sin variantes — crea una para agregar su receta
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      {variantes.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => cargarRecetaVariante(v.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${varianteActiva === v.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                        >
                          {v.nombre} — ${Number(v.precio).toFixed(2)}
                        </button>
                      ))}
                    </div>

                    {varianteActiva && (
                      <div className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-gray-700">
                            Receta:{" "}
                            {
                              variantes.find((v) => v.id === varianteActiva)
                                ?.nombre
                            }
                          </p>
                          <button
                            onClick={() => {
                              if (!confirm("¿Eliminar esta variante?")) return;
                              eliminarVariante(varianteActiva);
                            }}
                            className="text-gray-300 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <RecetaForm
                          insumos={insumos}
                          onAgregar={agregarInsumoVariante}
                        />
                        <div className="mt-3 space-y-2">
                          {recetaVarianteItems.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-3">
                              Sin insumos en esta variante
                            </p>
                          ) : (
                            recetaVarianteItems.map((item) => (
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
                                    onClick={() =>
                                      eliminarInsumoVariante(item.id)
                                    }
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
                    )}
                  </div>
                )}
              </div>
            )}
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
