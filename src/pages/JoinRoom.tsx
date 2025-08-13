import React, { useEffect, useState } from "react";
import { supabase } from "../app/supabase";

type Room = { id: string; code: string; name: string };

export default function JoinRoom() {
  const [code, setCode] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Pas connecté : on envoie vers /login
        location.href = "/login";
      }
    })();
  }, []);

  async function joinAfterLogin() {
    const cleanCode = code.trim();
    const cleanPseudo = pseudo.trim();
    if (!cleanCode) return alert("Entre le code de la salle.");
    if (!cleanPseudo) return alert("Choisis un pseudo.");

    setLoading(true);
    try {
      // 1) user connecté ?
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { location.href = "/login"; return; }

      // 2) chercher la room
      const { data: rooms, error: e1 } = await supabase
        .from("rooms").select("*").eq("code", cleanCode).limit(1);
      if (e1) throw e1;
      if (!rooms?.[0]) { alert("Salle introuvable."); return; }
      const room: Room = rooms[0];

      // 3) créer/mettre à jour le player (clé unique room_id+auth_user_id)
      const { data: playerRow, error: e2 } = await supabase
        .from("players")
        .upsert(
          { room_id: room.id, auth_user_id: user.id, pseudo: cleanPseudo },
          { onConflict: "room_id,auth_user_id" }
        )
        .select()
        .single();
      if (e2) throw e2;

      localStorage.setItem("room_id", room.id);
      localStorage.setItem("player_id", playerRow.id);
      location.href = "/today";
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message || "Erreur pour rejoindre la salle.");
      } else {
        alert("Erreur pour rejoindre la salle.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Rejoindre une salle</h1>

      <label className="block text-sm font-medium">Code de salle</label>
      <input className="border p-2 w-full rounded" placeholder="ex: TRIP25"
             value={code} onChange={e=>setCode(e.target.value)} />

      <label className="block text-sm font-medium">Pseudo</label>
      <input className="border p-2 w-full rounded" placeholder="Ton pseudo"
             value={pseudo} onChange={e=>setPseudo(e.target.value)} />

      <button className="border px-3 py-2 rounded hover:bg-gray-50 disabled:opacity-60"
              onClick={joinAfterLogin} disabled={loading}>
        {loading ? "Connexion…" : "Entrer"}
      </button>

      <p className="text-sm text-gray-500">
        Non connecté ? <a href="/login" className="underline">Va à la page de connexion</a>.
      </p>
    </div>
  );
}
