"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CDN = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4";
const CENTRO: [number, number] = [20.4837, -99.2164];

function cargarLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (w.__leafletCargando) return w.__leafletCargando;

  w.__leafletCargando = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = `${CDN}/leaflet.min.css`;
    document.head.appendChild(css);

    const js = document.createElement("script");
    js.src = `${CDN}/leaflet.min.js`;
    js.onload = () => resolve(w.L);
    js.onerror = () => {
      w.__leafletCargando = null;
      reject(new Error("No se pudo cargar el mapa"));
    };
    document.head.appendChild(js);
  });
  return w.__leafletCargando;
}

export default function MapaUbicacion({
  latitud,
  longitud,
  radio,
  onCambio,
}: {
  latitud: string;
  longitud: string;
  radio: string;
  onCambio: (latitud: string, longitud: string) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<any>(null);
  const marcador = useRef<any>(null);
  const circulo = useRef<any>(null);
  const alCambiar = useRef(onCambio);
  alCambiar.current = onCambio;

  const [listo, setListo] = useState(false);
  const [fallo, setFallo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [buscando, setBuscando] = useState(false);

  const lat = parseFloat(latitud);
  const lng = parseFloat(longitud);
  const hayPunto = !isNaN(lat) && !isNaN(lng);
  const metros = Math.max(1, parseFloat(radio) || 100);

  useEffect(() => {
    let cancelado = false;
    cargarLeaflet()
      .then((L) => {
        if (cancelado || !contenedor.current || mapa.current) return;
        const m = L.map(contenedor.current).setView(
          hayPunto ? [lat, lng] : CENTRO,
          hayPunto ? 17 : 14,
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap",
        }).addTo(m);
        m.on("click", (e: any) =>
          alCambiar.current(e.latlng.lat.toFixed(7), e.latlng.lng.toFixed(7)),
        );
        mapa.current = m;
        setListo(true);
        setTimeout(() => m.invalidateSize(), 250);
      })
      .catch((e) => setFallo(e.message));

    return () => {
      cancelado = true;
      if (mapa.current) {
        mapa.current.remove();
        mapa.current = null;
        marcador.current = null;
        circulo.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    const m = mapa.current;
    if (!listo || !L || !m) return;

    if (!hayPunto) {
      if (marcador.current) m.removeLayer(marcador.current);
      if (circulo.current) m.removeLayer(circulo.current);
      marcador.current = null;
      circulo.current = null;
      return;
    }

    if (!marcador.current) {
      marcador.current = L.marker([lat, lng], {
        draggable: true,
        icon: L.icon({
          iconUrl: `${CDN}/images/marker-icon.png`,
          iconRetinaUrl: `${CDN}/images/marker-icon-2x.png`,
          shadowUrl: `${CDN}/images/marker-shadow.png`,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          shadowSize: [41, 41],
        }),
      }).addTo(m);
      marcador.current.on("dragend", () => {
        const p = marcador.current.getLatLng();
        alCambiar.current(p.lat.toFixed(7), p.lng.toFixed(7));
      });
      circulo.current = L.circle([lat, lng], {
        radius: metros,
        color: "#2563eb",
        weight: 1,
        fillOpacity: 0.12,
      }).addTo(m);
    } else {
      marcador.current.setLatLng([lat, lng]);
      circulo.current.setLatLng([lat, lng]);
      circulo.current.setRadius(metros);
    }

    if (!m.getBounds().contains([lat, lng])) {
      m.setView([lat, lng], Math.max(m.getZoom(), 16));
    }
  }, [listo, hayPunto, lat, lng, metros]);

  async function buscar() {
    const q = busqueda.trim();
    if (!q) return;
    setBuscando(true);
    setFallo("");
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=mx&q=${encodeURIComponent(q)}`,
      );
      const datos = await r.json();
      if (!datos.length) {
        setFallo("No encontramos esa dirección. Prueba con colonia y municipio.");
      } else {
        mapa.current?.setView([Number(datos[0].lat), Number(datos[0].lon)], 17);
      }
    } catch {
      setFallo("No se pudo buscar la dirección.");
    }
    setBuscando(false);
  }

  function miUbicacion() {
    if (!navigator.geolocation) {
      setFallo("Este navegador no permite obtener la ubicación.");
      return;
    }
    setFallo("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        mapa.current?.setView([p.coords.latitude, p.coords.longitude], 18);
        alCambiar.current(
          p.coords.latitude.toFixed(7),
          p.coords.longitude.toFixed(7),
        );
      },
      () => setFallo("No se pudo obtener tu ubicación. Revisa el permiso del navegador."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          className="h-9"
          placeholder="Buscar dirección o lugar"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              buscar();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          onClick={buscar}
          disabled={buscando}
        >
          {buscando ? "Buscando..." : "Buscar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 whitespace-nowrap"
          onClick={miUbicacion}
        >
          Mi ubicación
        </Button>
      </div>
      <div
        ref={contenedor}
        className="h-64 w-full rounded-lg border border-gray-200 bg-gray-50 z-0"
      />
      <p className="text-xs text-gray-500">
        {fallo ||
          (hayPunto
            ? "Arrastra el marcador para afinar. El círculo azul es el radio de asistencia."
            : "Haz clic en el mapa donde está la unidad.")}
      </p>
    </div>
  );
}
