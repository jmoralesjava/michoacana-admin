"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError("Correo o contraseña incorrectos");
      setLoading(false);
      return;
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (perfilError || !perfil) {
      setError("No se encontró el perfil del usuario");
      setLoading(false);
      return;
    }

    if (!["administrador", "supervisor"].includes(perfil.rol)) {
      setError("No tienes acceso al panel administrativo");
      setLoading(false);
      return;
    }

    localStorage.setItem("perfil_admin", JSON.stringify(perfil));
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">AM</span>
            </div>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 text-center mb-1">
            Panel administrativo
          </h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            La Auténtica Michoacana
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@paleteria.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>
          </form>
        </div>
      </div>
      {/* Desarrollado por Bridge Solutions */}
      <div className="flex flex-col items-center gap-1.5 mt-8 pt-6 border-t border-gray-100">
        <p className="text-xs text-gray-300">Desarrollado por</p>
        <img
          src="/bridge-logo.png"
          alt="Bridge Solutions"
          className="h-6 opacity-40 hover:opacity-70 transition-opacity"
        />
      </div>
    </div>
  );
}
