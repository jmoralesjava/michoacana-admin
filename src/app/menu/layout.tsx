import type { Metadata, Viewport } from "next";
import { Chango, Figtree } from "next/font/google";

const rotulo = Chango({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-rotulo",
});

const texto = Figtree({
  subsets: ["latin"],
  variable: "--font-texto",
});

export const metadata: Metadata = {
  title: "Menú | La Auténtica Michoacana",
  description: "Arma tu pedido mientras esperas.",
};

export const viewport: Viewport = {
  themeColor: "#C4127A",
};

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${rotulo.variable} ${texto.variable} menu-publico`}>
      {children}
    </div>
  );
}
