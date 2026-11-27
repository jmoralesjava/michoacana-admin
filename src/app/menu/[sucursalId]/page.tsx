"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "../menu.css";

type Categoria = { id: string; nombre: string };
type Producto = {
  id: string;
  nombre: string;
  precio: number;
  categoria_id: string;
  permite_toppings: boolean;
  tiene_variantes: boolean;
  imagen_url: string | null;
};
type Variante = { id: string; producto_id: string; nombre: string; precio: number };
type Topping = { id: string; nombre: string; precio_extra: number };
type Item = {
  clave: string;
  producto: Producto;
  variante: Variante | null;
  toppings: Topping[];
  cantidad: number;
};
type Guardado = {
  nombre: string;
  telefono?: string;
  nacimiento?: string;
  clienteCodigo?: string | null;
  puntos?: number;
  codigo: string | null;
  creado: number;
  items: {
    producto_id: string;
    variante_id: string | null;
    toppings: string[];
    cantidad: number;
  }[];
};

const DOS_HORAS = 2 * 60 * 60 * 1000;

const pesos = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

function sinAcentos(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function claveDe(producto: Producto, variante: Variante | null, toppings: Topping[]) {
  return [
    producto.id,
    variante?.id || "",
    toppings
      .map((t) => t.id)
      .sort()
      .join(","),
  ].join("|");
}

function precioUnitario(item: Pick<Item, "producto" | "variante" | "toppings">) {
  const base = Number(item.variante ? item.variante.precio : item.producto.precio) || 0;
  return base + item.toppings.reduce((s, t) => s + (Number(t.precio_extra) || 0), 0);
}

function Paleta() {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden="true">
      <rect x="20" y="6" width="24" height="38" rx="12" fill="#c4127a" opacity="0.28" />
      <rect x="29" y="42" width="6" height="16" rx="3" fill="#c4127a" opacity="0.4" />
    </svg>
  );
}

function Contador({
  cantidad,
  onMenos,
  onMas,
  grande,
}: {
  cantidad: number;
  onMenos: () => void;
  onMas: () => void;
  grande?: boolean;
}) {
  const lado = grande ? "h-11 w-11 text-xl" : "h-9 w-9 text-lg";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Quitar uno"
        onClick={onMenos}
        className={`${lado} rounded-full bg-[var(--hielo)] font-bold text-[var(--rosa-hondo)]`}
      >
        −
      </button>
      <span className={`min-w-6 text-center font-bold ${grande ? "text-lg" : ""}`}>
        {cantidad}
      </span>
      <button
        type="button"
        aria-label="Agregar uno"
        onClick={onMas}
        className={`${lado} rounded-full bg-[var(--rosa)] font-bold text-white`}
      >
        +
      </button>
    </div>
  );
}

export default function MenuPublico() {
  const { sucursalId } = useParams<{ sucursalId: string }>();
  const llave = `menu-${sucursalId}`;

  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState("");
  const [sucursal, setSucursal] = useState("");
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [variantes, setVariantes] = useState<Record<string, Variante[]>>({});
  const [extras, setExtras] = useState<Record<string, Topping[]>>({});

  const [categoria, setCategoria] = useState("todo");
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<Item[]>([]);
  const [abierto, setAbierto] = useState<Producto | null>(null);
  const [selVariante, setSelVariante] = useState<Variante | null>(null);
  const [selExtras, setSelExtras] = useState<Topping[]>([]);
  const [selCantidad, setSelCantidad] = useState(1);
  const [verPedido, setVerPedido] = useState(false);
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [codigo, setCodigo] = useState<string | null>(null);
  const [telefono, setTelefono] = useState("");
  const [nacimiento, setNacimiento] = useState("");
  const [clienteCodigo, setClienteCodigo] = useState<string | null>(null);
  const [puntos, setPuntos] = useState(0);
  const [restaurado, setRestaurado] = useState(false);

  useEffect(() => {
    async function cargar() {
      const [suc, cats, prods, vars, tops, propios] = await Promise.all([
        supabase.from("sucursales").select("id, nombre").eq("id", sucursalId).maybeSingle(),
        supabase.from("categorias").select("id, nombre").eq("activa", true).order("orden"),
        supabase
          .from("productos")
          .select(
            "id, nombre, precio, categoria_id, permite_toppings, tiene_variantes, imagen_url",
          )
          .eq("activo", true)
          .order("nombre"),
        supabase
          .from("producto_variantes")
          .select("id, producto_id, nombre, precio")
          .eq("activa", true)
          .order("orden"),
        supabase
          .from("producto_toppings")
          .select("producto_id, toppings(id, nombre, precio_extra)"),
        supabase
          .from("productos_unidad")
          .select("producto_id")
          .eq("unidad_id", sucursalId),
      ]);

      if (suc.error || !suc.data) {
        setFallo("Este código no corresponde a una sucursal. Pide ayuda en el mostrador.");
        setCargando(false);
        return;
      }
      if (prods.error) {
        setFallo("No pudimos cargar el menú. Revisa tu conexión y vuelve a intentar.");
        setCargando(false);
        return;
      }

      const porProducto: Record<string, Variante[]> = {};
      for (const v of (vars.data || []) as Variante[]) {
        (porProducto[v.producto_id] ||= []).push(v);
      }
      const extrasPorProducto: Record<string, Topping[]> = {};
      for (const fila of (tops.data || []) as any[]) {
        const t = Array.isArray(fila.toppings) ? fila.toppings[0] : fila.toppings;
        if (t) (extrasPorProducto[fila.producto_id] ||= []).push(t);
      }

      const permitidos = new Set(
        ((propios.data || []) as any[]).map((r) => r.producto_id),
      );
      const lista = ((prods.data || []) as Producto[]).filter(
        (p) =>
          (permitidos.size === 0 || permitidos.has(p.id)) &&
          (!p.tiene_variantes || (porProducto[p.id] || []).length > 0),
      );
      const conProductos = new Set(lista.map((p) => p.categoria_id));

      setSucursal(suc.data.nombre);
      setCategorias(((cats.data || []) as Categoria[]).filter((c) => conProductos.has(c.id)));
      setProductos(lista);
      setVariantes(porProducto);
      setExtras(extrasPorProducto);
      setCargando(false);
    }
    cargar();
  }, [sucursalId]);

  useEffect(() => {
    if (cargando || fallo || restaurado) return;
    try {
      const crudo = localStorage.getItem(llave);
      if (crudo) {
        const g = JSON.parse(crudo) as Guardado;
        if (Date.now() - g.creado < DOS_HORAS) {
          const items: Item[] = [];
          for (const i of g.items) {
            const producto = productos.find((p) => p.id === i.producto_id);
            if (!producto) continue;
            const variante =
              (variantes[producto.id] || []).find((v) => v.id === i.variante_id) || null;
            if (producto.tiene_variantes && !variante) continue;
            const toppings = (extras[producto.id] || []).filter((t) =>
              i.toppings.includes(t.id),
            );
            items.push({
              clave: claveDe(producto, variante, toppings),
              producto,
              variante,
              toppings,
              cantidad: i.cantidad,
            });
          }
          setCarrito(items);
          setNombre(g.nombre || "");
          setTelefono(g.telefono || "");
          setNacimiento(g.nacimiento || "");
          setClienteCodigo(g.clienteCodigo || null);
          setPuntos(g.puntos || 0);
          if (g.codigo && items.length > 0) setCodigo(g.codigo);
        }
      }
    } catch {}
    setRestaurado(true);
  }, [cargando, fallo, restaurado, llave, productos, variantes, extras]);

  useEffect(() => {
    if (!restaurado) return;
    try {
      const g: Guardado = {
        nombre,
        telefono,
        nacimiento,
        clienteCodigo,
        puntos,
        codigo,
        creado: Date.now(),
        items: carrito.map((i) => ({
          producto_id: i.producto.id,
          variante_id: i.variante?.id || null,
          toppings: i.toppings.map((t) => t.id),
          cantidad: i.cantidad,
        })),
      };
      localStorage.setItem(llave, JSON.stringify(g));
    } catch {}
  }, [carrito, nombre, telefono, nacimiento, clienteCodigo, puntos, codigo, restaurado, llave]);

  const buscado = sinAcentos(busqueda.trim());
  const visibles = useMemo(() => {
    if (buscado) return productos.filter((p) => sinAcentos(p.nombre).includes(buscado));
    return categoria === "todo"
      ? productos
      : productos.filter((p) => p.categoria_id === categoria);
  }, [buscado, categoria, productos]);
  const piezas = carrito.reduce((s, i) => s + i.cantidad, 0);
  const total = carrito.reduce((s, i) => s + precioUnitario(i) * i.cantidad, 0);

  function esSimple(p: Producto) {
    return !p.tiene_variantes && !(p.permite_toppings && (extras[p.id] || []).length > 0);
  }

  function sumar(producto: Producto, variante: Variante | null, toppings: Topping[], n: number) {
    const clave = claveDe(producto, variante, toppings);
    setCodigo(null);
    setCarrito((prev) => {
      const existe = prev.find((i) => i.clave === clave);
      if (!existe) {
        return n > 0 ? [...prev, { clave, producto, variante, toppings, cantidad: n }] : prev;
      }
      return prev
        .map((i) => (i.clave === clave ? { ...i, cantidad: i.cantidad + n } : i))
        .filter((i) => i.cantidad > 0);
    });
  }

  function abrir(p: Producto) {
    setAbierto(p);
    setSelVariante(p.tiene_variantes ? (variantes[p.id] || [])[0] || null : null);
    setSelExtras([]);
    setSelCantidad(1);
  }

  async function enviar() {
    if (!nombre.trim()) {
      setAviso("Escribe tu nombre para que el vendedor te llame.");
      return;
    }
    if (telefono && telefono.length !== 10) {
      setAviso("Tu celular debe tener 10 dígitos, o déjalo vacío.");
      return;
    }
    setAviso("");
    setEnviando(true);
    const { data, error } = await supabase.rpc("crear_pedido_menu", {
      p_sucursal_id: sucursalId,
      p_nombre: nombre.trim(),
      p_telefono: telefono || null,
      p_fecha_nacimiento: telefono && nacimiento ? nacimiento : null,
      p_items: carrito.map((i) => ({
        producto_id: i.producto.id,
        variante_id: i.variante?.id || null,
        toppings: i.toppings.map((t) => t.id),
        cantidad: i.cantidad,
      })),
    });
    setEnviando(false);

    if (error || !data) {
      setAviso("No se pudo guardar tu pedido. Revisa tu conexión y vuelve a intentar.");
      return;
    }
    if (typeof data === "object") {
      setClienteCodigo(data.cliente_codigo || null);
      setPuntos(Number(data.puntos) || 0);
      setCodigo(String(data.codigo));
    } else {
      setCodigo(String(data));
    }
    setVerPedido(false);
    window.scrollTo({ top: 0 });
  }

  function empezarDeNuevo() {
    setCarrito([]);
    setCodigo(null);
    setCategoria("todo");
  }

  if (cargando) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <Paleta />
        <p className="text-[var(--ciruela-suave)]">Cargando el menú…</p>
      </main>
    );
  }

  if (fallo) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <Paleta />
        <p className="max-w-xs text-lg font-semibold">{fallo}</p>
      </main>
    );
  }

  if (codigo) {
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=12&color=3a0b26&data=${encodeURIComponent(`PEDIDO:${codigo}`)}`;
    return (
      <main className="mx-auto max-w-md pb-10">
        <header className="bg-[var(--rosa)] px-6 pb-8 pt-10 text-center text-white">
          <p className="text-base opacity-90">Listo, {nombre.trim()}</p>
          <h1 className="rotulo mt-2 text-[2rem] leading-[1.1]">
            Enséñale este código al vendedor
          </h1>
        </header>
        <div className="toldo" />

        <section className="px-5 pt-6 text-center">
          <div className="rebote mx-auto w-fit rounded-[32px] bg-white p-4 shadow-[0_18px_40px_-18px_rgba(156,12,96,0.55)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`Código QR del pedido ${codigo}`} className="h-56 w-56" />
          </div>
          <p className="mt-6 text-sm text-[var(--ciruela-suave)]">
            Si no puede escanearlo, díctale este número
          </p>
          <p className="rotulo mt-1 text-[4.25rem] leading-none tracking-[0.08em] text-[var(--rosa)]">
            {codigo}
          </p>
        </section>

        <section className="mx-5 mt-8 rounded-[24px] bg-white p-5">
          <h2 className="text-lg font-bold">Tu pedido</h2>
          <ul className="mt-3 space-y-3">
            {carrito.map((i) => (
              <li key={i.clave} className="flex justify-between gap-4 text-[15px]">
                <div>
                  <p className="font-semibold">
                    {i.cantidad} × {i.producto.nombre}
                    {i.variante ? `, ${i.variante.nombre}` : ""}
                  </p>
                  {i.toppings.length > 0 && (
                    <p className="text-sm text-[var(--ciruela-suave)]">
                      con {i.toppings.map((t) => t.nombre).join(", ")}
                    </p>
                  )}
                </div>
                <p className="shrink-0 font-semibold">{pesos(precioUnitario(i) * i.cantidad)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-[var(--hielo)] pt-4">
            <span className="font-semibold">Total aproximado</span>
            <span className="rotulo text-2xl text-[var(--rosa)]">{pesos(total)}</span>
          </div>
          <p className="mt-2 text-sm text-[var(--ciruela-suave)]">
            Pagas en caja. El vendedor confirma tu pedido antes de cobrarte.
          </p>
        </section>

        {clienteCodigo && (
          <section className="mx-5 mt-4 rounded-[24px] bg-[var(--ciruela)] p-5 text-white">
            <p className="text-sm opacity-80">Tus puntos</p>
            <p className="rotulo mt-1 text-4xl text-[var(--limon)]">{puntos}</p>
            <p className="mt-2 text-sm leading-snug opacity-90">
              Esta compra suma puntos cuando pagues en caja.
            </p>
            <a
              href={`/menu/puntos?c=${clienteCodigo}`}
              className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[var(--ciruela)]"
            >
              Ver mi tarjeta de puntos
            </a>
          </section>
        )}

        <div className="mt-6 flex flex-col gap-3 px-5">
          <button
            type="button"
            onClick={() => setCodigo(null)}
            className="h-13 rounded-full bg-[var(--hielo)] py-3.5 font-bold text-[var(--rosa-hondo)]"
          >
            Cambiar mi pedido
          </button>
          <button
            type="button"
            onClick={empezarDeNuevo}
            className="py-2 text-sm font-semibold text-[var(--ciruela-suave)] underline underline-offset-4"
          >
            Empezar un pedido nuevo
          </button>
        </div>
      </main>
    );
  }

  const precioSeleccion = abierto
    ? precioUnitario({ producto: abierto, variante: selVariante, toppings: selExtras }) *
      selCantidad
    : 0;

  return (
    <main className="mx-auto max-w-md pb-32">
      <header className="bg-[var(--rosa)] px-6 pb-7 pt-8 text-white">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo_michoacana.jpg"
            alt=""
            className="h-11 w-11 rounded-full bg-white object-cover"
          />
          <div className="leading-tight">
            <p className="font-bold">La Auténtica Michoacana</p>
            <p className="text-sm opacity-85">{sucursal}</p>
          </div>
        </div>
        <h1 className="rotulo mt-7 text-[2.6rem] leading-[1.02]">Arma tu pedido sin hacer fila</h1>
        <p className="mt-3 max-w-[30ch] text-[15px] leading-snug opacity-95">
          Elige con calma. Al terminar te damos un código para el vendedor.
        </p>
      </header>
      <div className="toldo" />

      <div className="sticky top-0 z-10 bg-[var(--nieve)]/95 backdrop-blur">
        <div className="relative px-4 pt-3">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="pointer-events-none absolute left-8 top-1/2 mt-1.5 h-5 w-5 -translate-y-1/2 text-[var(--ciruela-suave)]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Busca tu antojo"
            aria-label="Buscar producto"
            enterKeyHint="search"
            autoComplete="off"
            className="w-full rounded-full bg-white py-3 pl-12 pr-12 text-[16px] ring-1 ring-[var(--hielo)] placeholder:text-[var(--ciruela-suave)] [&::-webkit-search-cancel-button]:hidden"
          />
          {busqueda && (
            <button
              type="button"
              aria-label="Borrar búsqueda"
              onClick={() => setBusqueda("")}
              className="absolute right-6 top-1/2 mt-1.5 h-8 w-8 -translate-y-1/2 rounded-full bg-[var(--hielo)] text-base font-bold text-[var(--rosa-hondo)]"
            >
              ×
            </button>
          )}
        </div>
      <nav
        aria-label="Categorías"
        className="sin-barra flex gap-2 overflow-x-auto px-4 py-3"
      >
        {[{ id: "todo", nombre: "Todo" }, ...categorias].map((c) => {
          const activa = !buscado && categoria === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={activa}
              onClick={() => {
                setBusqueda("");
                setCategoria(c.id);
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-[15px] font-semibold transition-colors ${
                activa
                  ? "bg-[var(--ciruela)] text-white"
                  : "bg-white text-[var(--ciruela)] ring-1 ring-[var(--hielo)]"
              }`}
            >
              {c.nombre}
            </button>
          );
        })}
      </nav>
      </div>

      {visibles.length === 0 ? (
        <p className="px-6 pt-10 text-center text-[var(--ciruela-suave)]">
          {buscado
            ? `No encontramos "${busqueda.trim()}". Prueba con otra palabra o revisa las categorías.`
            : "Aún no hay productos en esta categoría."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 px-4 pt-2">
          {visibles.map((p) => {
            const simple = esSimple(p);
            const lista = variantes[p.id] || [];
            const desde = p.tiene_variantes
              ? Math.min(...lista.map((v) => Number(v.precio) || 0))
              : Number(p.precio) || 0;
            const enCarrito = carrito
              .filter((i) => i.producto.id === p.id)
              .reduce((s, i) => s + i.cantidad, 0);
            return (
              <li key={p.id} className="flex flex-col overflow-hidden rounded-[22px] bg-white">
                <button
                  type="button"
                  onClick={() => (simple ? sumar(p, null, [], 1) : abrir(p))}
                  className="relative block aspect-square w-full bg-[var(--hielo)]"
                  aria-label={`Agregar ${p.nombre}`}
                >
                  {p.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imagen_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Paleta />
                    </span>
                  )}
                  {enCarrito > 0 && (
                    <span
                      key={enCarrito}
                      className="rebote absolute right-2 top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--limon)] px-2 text-sm font-extrabold text-[var(--ciruela)]"
                    >
                      {enCarrito}
                    </span>
                  )}
                </button>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <p className="text-[15px] font-bold leading-tight">{p.nombre}</p>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <p className="text-[15px] font-semibold text-[var(--rosa-hondo)]">
                      {p.tiene_variantes ? `Desde ${pesos(desde)}` : pesos(desde)}
                    </p>
                    {simple && enCarrito === 0 && (
                      <button
                        type="button"
                        aria-label={`Agregar ${p.nombre}`}
                        onClick={() => sumar(p, null, [], 1)}
                        className="h-9 w-9 shrink-0 rounded-full bg-[var(--rosa)] text-lg font-bold text-white"
                      >
                        +
                      </button>
                    )}
                  </div>
                  {simple && enCarrito > 0 && (
                    <Contador
                      cantidad={enCarrito}
                      onMenos={() => sumar(p, null, [], -1)}
                      onMas={() => sumar(p, null, [], 1)}
                    />
                  )}
                  {!simple && (
                    <button
                      type="button"
                      onClick={() => abrir(p)}
                      className="rounded-full bg-[var(--hielo)] py-2 text-sm font-bold text-[var(--rosa-hondo)]"
                    >
                      Elegir
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {piezas > 0 && !verPedido && !abierto && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={() => setVerPedido(true)}
            className="flex h-15 w-full items-center gap-3 rounded-full bg-[var(--rosa)] py-2.5 pl-2.5 pr-6 text-white shadow-[0_14px_30px_-10px_rgba(156,12,96,0.7)]"
          >
            <span
              key={piezas}
              className="rebote flex h-10 min-w-10 items-center justify-center rounded-full bg-[var(--limon)] px-2 font-extrabold text-[var(--ciruela)]"
            >
              {piezas}
            </span>
            <span className="flex-1 text-left text-[17px] font-bold">Ver mi pedido</span>
            <span className="text-[17px] font-bold">{pesos(total)}</span>
          </button>
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-30">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setAbierto(null)}
            className="velo absolute inset-0 h-full w-full bg-[rgba(58,11,38,0.5)]"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={abierto.nombre}
            className="hoja absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] max-w-md overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-5"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="rotulo text-[1.7rem] leading-[1.1]">{abierto.nombre}</h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setAbierto(null)}
                className="h-9 w-9 shrink-0 rounded-full bg-[var(--hielo)] text-lg font-bold text-[var(--rosa-hondo)]"
              >
                ×
              </button>
            </div>

            {abierto.tiene_variantes && (
              <fieldset className="mt-5">
                <legend className="font-bold">Tamaño</legend>
                <div className="mt-2 flex flex-col gap-2">
                  {(variantes[abierto.id] || []).map((v) => {
                    const activa = selVariante?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        aria-pressed={activa}
                        onClick={() => setSelVariante(v)}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left font-semibold ${
                          activa
                            ? "bg-[var(--ciruela)] text-white"
                            : "bg-[var(--nieve)] ring-1 ring-[var(--hielo)]"
                        }`}
                      >
                        <span>{v.nombre}</span>
                        <span>{pesos(Number(v.precio) || 0)}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {abierto.permite_toppings && (extras[abierto.id] || []).length > 0 && (
              <fieldset className="mt-5">
                <legend className="font-bold">Extras, si quieres</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(extras[abierto.id] || []).map((t) => {
                    const activo = selExtras.some((e) => e.id === t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={activo}
                        onClick={() =>
                          setSelExtras((prev) =>
                            activo ? prev.filter((e) => e.id !== t.id) : [...prev, t],
                          )
                        }
                        className={`rounded-full px-4 py-2.5 text-[15px] font-semibold ${
                          activo
                            ? "bg-[var(--limon)] text-[var(--ciruela)]"
                            : "bg-[var(--nieve)] ring-1 ring-[var(--hielo)]"
                        }`}
                      >
                        {t.nombre}
                        {Number(t.precio_extra) > 0 ? ` +${pesos(Number(t.precio_extra))}` : ""}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="mt-6 flex items-center justify-between">
              <span className="font-bold">Cantidad</span>
              <Contador
                grande
                cantidad={selCantidad}
                onMenos={() => setSelCantidad((n) => Math.max(1, n - 1))}
                onMas={() => setSelCantidad((n) => Math.min(30, n + 1))}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                sumar(abierto, selVariante, selExtras, selCantidad);
                setAbierto(null);
              }}
              className="mt-6 flex w-full items-center justify-between rounded-full bg-[var(--rosa)] px-6 py-4 text-[17px] font-bold text-white"
            >
              <span>Agregar al pedido</span>
              <span>{pesos(precioSeleccion)}</span>
            </button>
          </section>
        </div>
      )}

      {verPedido && (
        <div className="fixed inset-0 z-30">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setVerPedido(false)}
            className="velo absolute inset-0 h-full w-full bg-[rgba(58,11,38,0.5)]"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Tu pedido"
            className="hoja absolute inset-x-0 bottom-0 mx-auto max-h-[90dvh] max-w-md overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-5"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="rotulo text-[1.7rem] leading-[1.1]">Tu pedido</h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setVerPedido(false)}
                className="h-9 w-9 shrink-0 rounded-full bg-[var(--hielo)] text-lg font-bold text-[var(--rosa-hondo)]"
              >
                ×
              </button>
            </div>

            {carrito.length === 0 ? (
              <p className="py-10 text-center text-[var(--ciruela-suave)]">
                Tu pedido está vacío. Cierra y elige algo del menú.
              </p>
            ) : (
              <>
                <ul className="mt-4 divide-y divide-[var(--hielo)]">
                  {carrito.map((i) => (
                    <li key={i.clave} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-bold leading-tight">
                          {i.producto.nombre}
                          {i.variante ? `, ${i.variante.nombre}` : ""}
                        </p>
                        {i.toppings.length > 0 && (
                          <p className="text-sm text-[var(--ciruela-suave)]">
                            con {i.toppings.map((t) => t.nombre).join(", ")}
                          </p>
                        )}
                        <p className="mt-0.5 text-sm font-semibold text-[var(--rosa-hondo)]">
                          {pesos(precioUnitario(i) * i.cantidad)}
                        </p>
                      </div>
                      <Contador
                        cantidad={i.cantidad}
                        onMenos={() => sumar(i.producto, i.variante, i.toppings, -1)}
                        onMas={() => sumar(i.producto, i.variante, i.toppings, 1)}
                      />
                    </li>
                  ))}
                </ul>

                <div className="mt-2 flex items-baseline justify-between border-t border-[var(--hielo)] pt-4">
                  <span className="font-bold">Total aproximado</span>
                  <span className="rotulo text-2xl text-[var(--rosa)]">{pesos(total)}</span>
                </div>

                <label className="mt-6 block">
                  <span className="font-bold">¿A nombre de quién?</span>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value.slice(0, 40))}
                    placeholder="Tu nombre"
                    autoComplete="given-name"
                    enterKeyHint="done"
                    className="mt-2 w-full rounded-2xl bg-[var(--nieve)] px-4 py-3.5 text-[17px] ring-1 ring-[var(--hielo)] placeholder:text-[var(--ciruela-suave)]"
                  />
                </label>

                <label className="mt-4 block">
                  <span className="font-bold">Tu celular, si quieres juntar puntos</span>
                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10 dígitos"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    className="mt-2 w-full rounded-2xl bg-[var(--nieve)] px-4 py-3.5 text-[17px] ring-1 ring-[var(--hielo)] placeholder:text-[var(--ciruela-suave)]"
                  />
                  <span className="mt-1.5 block text-sm text-[var(--ciruela-suave)]">
                    Es opcional. Solo lo usamos para tu programa de puntos.
                  </span>
                </label>

                {telefono.length === 10 && (
                  <label className="mt-4 block">
                    <span className="font-bold">Tu cumpleaños, para consentirte ese día</span>
                    <input
                      value={nacimiento}
                      onChange={(e) => setNacimiento(e.target.value)}
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      className="mt-2 w-full rounded-2xl bg-[var(--nieve)] px-4 py-3.5 text-[17px] ring-1 ring-[var(--hielo)]"
                    />
                    <span className="mt-1.5 block text-sm text-[var(--ciruela-suave)]">
                      También es opcional.
                    </span>
                  </label>
                )}

                {aviso && (
                  <p role="alert" className="mt-3 text-sm font-semibold text-[var(--rosa-hondo)]">
                    {aviso}
                  </p>
                )}

                <button
                  type="button"
                  disabled={enviando}
                  onClick={enviar}
                  className="mt-5 w-full rounded-full bg-[var(--rosa)] px-6 py-4 text-[17px] font-bold text-white disabled:opacity-60"
                >
                  {enviando ? "Guardando tu pedido…" : "Terminar y ver mi código"}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
