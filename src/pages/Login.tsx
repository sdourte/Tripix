import { useState } from "react";
import { supabase } from "../app/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUp() {
    const cleanEmail = email.trim();
    const cleanPass = pass.trim();
    if (!cleanEmail || !cleanPass) return alert("Email et mot de passe requis.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
      });
      if (error) throw error;
      // Si les confirmations email sont OFF, tu es déjà connecté.
      // Sinon, Supabase t'a envoyé un mail de confirmation.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) location.href = "/"; // va rejoindre la salle
      else alert("Compte créé. Si la confirmation email est ON, confirme ton email.");
    } catch (e: unknown) {
      if (e instanceof Error) {
        alert(e.message || "Erreur d'inscription");
      } else {
        alert("Erreur d'inscription");
      }
    } finally {
      setLoading(false);
    }
  }

  async function signIn() {
    const cleanEmail = email.trim();
    const cleanPass = pass.trim();
    if (!cleanEmail || !cleanPass) return alert("Email et mot de passe requis.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });
      if (error) throw error;
      location.href = "/"; // va rejoindre la salle
    } catch (e: unknown) {
      if (e instanceof Error) {
        alert(e.message || "Erreur de connexion");
      } else {
        alert("Erreur de connexion");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Se connecter à Tripix</h1>

      <label className="block text-sm font-medium">Email</label>
      <input className="border p-2 w-full rounded" type="email"
             value={email} onChange={e=>setEmail(e.target.value)} placeholder="toi@exemple.com" />

      <label className="block text-sm font-medium">Mot de passe</label>
      <input className="border p-2 w-full rounded" type="password"
             value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" />

      <div className="flex gap-2">
        <button className="border px-3 py-2 rounded hover:bg-gray-50 disabled:opacity-60"
                onClick={signIn} disabled={loading}>Se connecter</button>
        <button className="border px-3 py-2 rounded hover:bg-gray-50 disabled:opacity-60"
                onClick={signUp} disabled={loading}>Créer un compte</button>
      </div>
      <p className="text-sm text-gray-500">
        Astuce : pour les tests, tu peux désactiver la confirmation d’email dans Supabase → Auth.
      </p>
    </div>
  );
}
