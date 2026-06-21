"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ClienteMenuPage() {
  const router = useRouter();
  const [cliente, setCliente] = useState<any>(null);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [verCarrito, setVerCarrito] = useState(false);
  const [notas, setNotas] = useState("");

  useEffect(() => {
    const session = localStorage.getItem("cliente_session");
    if (!session) {
      router.push("/cliente");
      return;
    }
    const cli = JSON.parse(session);
    setCliente(cli);
    cargarCategorias();
  }, []);

  useEffect(() => {
    if (categoriaActiva) cargarProductos(categoriaActiva);
  }, [categoriaActiva]);

  async function cargarCategorias() {
    const { data } = await supabase
      .from("categorias")
      .select("*")
      .eq("activa", true)
      .order("orden");
    if (data) {
      setCategorias(data);
      if (data.length > 0) setCategoriaActiva(data[0].id);
    }
    setLoading(false);
  }

  async function cargarProductos(catId: string) {
    const { data } = await supabase
      .from("productos")
      .select("*, producto_variantes(*)")
      .eq("categoria_id", catId)
      .eq("activo", true);
    if (data) setProductos(data);
  }

  function precioConDescuento(precio: number) {
    const descuento = cliente?.categorias_cliente?.descuento_porcentaje || 0;
    return precio - (precio * descuento) / 100;
  }

  function agregarAlCarrito(producto: any, variante: any = null) {
    const precio = variante ? Number(variante.precio) : Number(producto.precio);
    const precioFinal = precioConDescuento(precio);
    const id = `${producto.id}-${variante?.id || "base"}`;

    setCarrito((prev) => {
      const existente = prev.find((i) => i.id === id);
      if (existente) {
        return prev.map((i) =>
          i.id === id ? { ...i, cantidad: i.cantidad + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          id,
          producto_id: producto.id,
          variante_id: variante?.id || null,
          nombre: producto.nombre,
          variante_nombre: variante?.nombre || null,
          cantidad: 1,
          precio_unitario: precio,
          precio_con_descuento: precioFinal,
        },
      ];
    });
  }

  function cambiarCantidad(id: string, delta: number) {
    setCarrito((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, cantidad: Math.max(0, i.cantidad + delta) } : i,
        )
        .filter((i) => i.cantidad > 0),
    );
  }

  const totalCarrito = carrito.reduce(
    (s, i) => s + i.precio_con_descuento * i.cantidad,
    0,
  );
  const descuento = cliente?.categorias_cliente?.descuento_porcentaje || 0;

  async function enviarPedido() {
    if (carrito.length === 0) return;
    setEnviando(true);

    const { data: pedido, error } = await supabase
      .from("pedidos_cliente")
      .insert({
        cliente_id: cliente.id,
        estado: "enviado",
        total: totalCarrito,
        notas: notas.trim() || null,
      })
      .select()
      .single();

    if (error || !pedido) {
      setEnviando(false);
      return;
    }

    for (const item of carrito) {
      await supabase.from("pedido_items").insert({
        pedido_id: pedido.id,
        producto_id: item.producto_id,
        variante_id: item.variante_id,
        nombre_producto: item.nombre,
        nombre_variante: item.variante_nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_con_descuento: item.precio_con_descuento,
      });
    }

    setEnviando(false);
    setPedidoEnviado(true);
    setCarrito([]);
    setVerCarrito(false);
  }

  if (pedidoEnviado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            ¡Pedido enviado!
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Tu pedido fue recibido. Te avisaremos por WhatsApp cuando esté
            listo.
          </p>
          <button
            onClick={() => {
              setPedidoEnviado(false);
              router.push("/cliente/pedidos");
            }}
            className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold mb-3"
          >
            Ver mis pedidos
          </button>
          <button
            onClick={() => setPedidoEnviado(false)}
            className="w-full text-gray-400 text-sm py-2"
          >
            Hacer otro pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Hola,</p>
            <p className="text-sm font-semibold text-gray-900">
              {cliente?.nombre}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {descuento > 0 && (
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
                -{descuento}% desc.
              </span>
            )}
            <button
              onClick={() => router.push("/cliente/pedidos")}
              className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5"
            >
              Mis pedidos
            </button>
          </div>
        </div>

        {/* Categorías */}
        <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoriaActiva(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                categoriaActiva === cat.id
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Productos */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Cargando menú...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {productos.map((p) => {
              const tieneVariantes = p.producto_variantes?.length > 0;
              const precio = Number(p.precio);
              const precioFinal = precioConDescuento(precio);

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                >
                  <div className="h-28 bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center">
                    <span className="text-4xl">🍦</span>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {p.nombre}
                    </p>
                    {descuento > 0 ? (
                      <div>
                        <p className="text-xs text-gray-300 line-through">
                          ${precio.toFixed(2)}
                        </p>
                        <p className="text-sm font-semibold text-green-600">
                          ${precioFinal.toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        ${precio.toFixed(2)}
                      </p>
                    )}

                    {tieneVariantes ? (
                      <div className="mt-2 space-y-1">
                        {p.producto_variantes.map((v: any) => (
                          <button
                            key={v.id}
                            onClick={() => agregarAlCarrito(p, v)}
                            className="w-full flex justify-between items-center text-xs bg-gray-50 hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors"
                          >
                            <span className="text-gray-700">{v.nombre}</span>
                            <span className="font-medium text-gray-900">
                              ${precioConDescuento(Number(v.precio)).toFixed(2)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => agregarAlCarrito(p)}
                        className="mt-2 w-full bg-gray-900 text-white rounded-lg py-1.5 text-xs font-medium"
                      >
                        Agregar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Carrito flotante */}
      {carrito.length > 0 && !verCarrito && (
        <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto">
          <button
            onClick={() => setVerCarrito(true)}
            className="w-full bg-gray-900 text-white rounded-2xl py-4 flex items-center justify-between px-5 shadow-lg"
          >
            <span className="text-sm font-medium">
              {carrito.length} productos
            </span>
            <span className="text-sm font-semibold">
              ${totalCarrito.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* Modal carrito */}
      {verCarrito && (
        <div className="fixed inset-0 bg-black/50 z-20 flex items-end">
          <div className="bg-white rounded-t-2xl w-full max-w-lg mx-auto p-5 max-h-[80vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              Tu pedido
            </h3>

            {carrito.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 border-b border-gray-50"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {item.nombre}
                    {item.variante_nombre ? ` — ${item.variante_nombre}` : ""}
                  </p>
                  <p className="text-xs text-gray-400">
                    ${item.precio_con_descuento.toFixed(2)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cambiarCantidad(item.id, -1)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg"
                  >
                    −
                  </button>
                  <span className="text-sm font-medium w-5 text-center">
                    {item.cantidad}
                  </span>
                  <button
                    onClick={() => cambiarCantidad(item.id, 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm font-semibold text-gray-900 ml-3 w-16 text-right">
                  ${(item.precio_con_descuento * item.cantidad).toFixed(2)}
                </p>
              </div>
            ))}

            <div className="mt-4 space-y-3">
              <textarea
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
                rows={2}
                placeholder="Notas del pedido (opcional)..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />

              <div className="flex justify-between py-2">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-base font-bold text-gray-900">
                  ${totalCarrito.toFixed(2)}
                </span>
              </div>

              <button
                onClick={enviarPedido}
                disabled={enviando}
                className="w-full bg-gray-900 text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50"
              >
                {enviando ? "Enviando..." : "Enviar pedido"}
              </button>
              <button
                onClick={() => setVerCarrito(false)}
                className="w-full text-gray-400 text-sm py-2"
              >
                Seguir agregando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
