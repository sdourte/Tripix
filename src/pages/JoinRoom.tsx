import { useState } from "react";
import { supabase } from "../app/supabase";

export default function JoinRoom() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");     // ex: TRIP25
  const [pseudo, setPseudo] = useState("");

  async function sendMagicLink() {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) alert(error.message);
    else alert("Email envoyé. Clique le lien puis reviens ici.");
  }

  async function joinAfterLogin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Pas connecté (utilise le magic link d'abord)");

    const { data: rooms, error: e1 } = await supabase
      .from("rooms").select("*").eq("code", code).limit(1);
    if (e1 || !rooms?.[0]) return alert("Salle introuvable");
    const room = rooms[0];

    const { data: player, error: e2 } = await supabase
      .from("players").upsert({
        room_id: room.id, auth_user_id: user.id, pseudo
      }).select().single();
    if (e2) return alert(e2.message);

    localStorage.setItem("room_id", room.id);
    localStorage.setItem("player_id", player.id);
    location.href = "/today";
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-bold">Tripix — Rejoindre une salle</h1>
      <input className="border p-2 w-full" placeholder="email"
             value={email} onChange={e=>setEmail(e.target.value)} />
      <button className="border px-3 py-2" onClick={sendMagicLink}>
        Recevoir le lien par email
      </button>

      <input className="border p-2 w-full" placeholder="code salle (ex: TRIP25)"
             value={code} onChange={e=>setCode(e.target.value)} />
      <input className="border p-2 w-full" placeholder="pseudo"
             value={pseudo} onChange={e=>setPseudo(e.target.value)} />

      <button className="border px-3 py-2" onClick={joinAfterLogin}>
        Entrer
      </button>
    </div>
  );
}
