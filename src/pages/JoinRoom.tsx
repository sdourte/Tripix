import React, { useState } from "react";
import { supabase } from "../app/supabase";

type Room = { id: string; name: string; code: string; owner_user_id: string | null };

export default function JoinRoom() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");      // ex: TRIP25
  const [pseudo, setPseudo] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMagicLink() {
    const cleanEmail = email.trim();
    if (!cleanEmail) return alert("Entre un email valide.");
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) alert(error.message);
    else alert("Email envoyé ✅ Ouvre le lien puis reviens ici.");
  }

  async function joinAfterLogin() {
    const cleanCode = code.trim();
    const cleanPseudo = pseudo.trim();
    if (!cleanCode) return alert("Entre le code de la salle.");
    if (!cleanPseudo) return alert("Choisis un pseudo.");

    setLoading(true);
    try {
      // 1) Vérifier que tu es connecté
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const user = userData.user;
      if (!user) {
        alert("Pas connecté : utilise d'abord le lien reçu par email.");
        return;
      }

      // 2) Trouver la salle par code
      const { data: rooms, error: e1 } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", cleanCode)
        .limit(1);

      if (e1) throw e1;
      if (!rooms || rooms.length === 0) {
        alert("Salle introuvable. Vérifie le code.");
        return;
      }
      const room: Room = rooms[0];

      // 3) Créer / mettre à jour ton player (évite l'erreur de doublon)
      const { data: playerRow, error: e2 } = await supabase
        .from("players")
        .upsert(
          { room_id: room.id, auth_user_id: user.id, pseudo: cleanPseudo },
          { onConflict: "room_id,auth_user_id" } // <- clé unique
        )
        .select()
        .single();

      if (e2) throw e2;

      // 4) Mémoriser et rediriger
      localStorage.setItem("room_id", room.id);
      localStorage.setItem("player_id", playerRow.id);
      window.location.href = "/today";
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Erreur inattendue lors de la connexion à la salle.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Tripix — Rejoindre une salle</h1>

      <label className="block text-sm font-medium">Email</label>
      <input
        className="border p-2 w-full rounded"
        placeholder="ton.email@exemple.com"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        className="border px-3 py-2 rounded hover:bg-gray-50"
        onClick={sendMagicLink}
        disabled={!email.trim() || loading}
      >
        Recevoir le lien par email
      </button>

      <div className="h-px bg-gray-200 my-2" />

      <label className="block text-sm font-medium">Code de salle</label>
      <input
        className="border p-2 w-full rounded"
        placeholder="ex: TRIP25"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <label className="block text-sm font-medium">Pseudo</label>
      <input
        className="border p-2 w-full rounded"
        placeholder="Ton pseudo"
        value={pseudo}
        onChange={(e) => setPseudo(e.target.value)}
      />

      <button
        className="border px-3 py-2 rounded hover:bg-gray-50 disabled:opacity-60"
        onClick={joinAfterLogin}
        disabled={loading}
      >
        {loading ? "Connexion…" : "Entrer"}
      </button>

      <p className="text-sm text-gray-500">
        Astuce : crée la salle dans Supabase → <code>rooms</code> avec un{" "}
        <code>code</code> (ex: TRIP25), puis rejoins-la ici.
      </p>
    </div>
  );
}
