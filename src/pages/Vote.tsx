import { useEffect, useMemo, useState } from "react";
import { supabase } from "../app/supabase";

type Photo = { id: string; player_id: string; storage_path: string; day_id: string; created_at: string };
type VoteRow = { photo_id: string; voter_id: string; value: number };

async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("photos").createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export default function Vote() {
  const room_id = localStorage.getItem("room_id")!;
  const myPlayerId = localStorage.getItem("player_id")!;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [dayId, setDayId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [imgUrl, setImgUrl] = useState<Record<string, string>>({});
  const [myVotes, setMyVotes] = useState<Record<string, number>>({}); // photo_id -> value
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      // 1) trouver le game_day du jour
      const { data: day, error: gdErr } = await supabase
        .from("game_days").select("*")
        .eq("room_id", room_id).eq("date", today).maybeSingle();
      if (gdErr) { alert(gdErr.message); return; }
      if (!day) { alert("Pas de journée active. Va sur /today pour tirer un thème."); return; }
      setDayId(day.id);

      // 2) charger les photos du jour (sauf les miennes)
      const { data: ph, error: phErr } = await supabase
        .from("photos")
        .select("id, player_id, storage_path, day_id, created_at")
        .eq("room_id", room_id).eq("day_id", day.id)
        .neq("player_id", myPlayerId) // exclure mes photos
        .order("created_at", { ascending: true });

      if (phErr) { alert(phErr.message); return; }
      setPhotos(ph || []);

      // 3) précharger les URLs signées
      const map: Record<string, string> = {};
      await Promise.all((ph || []).map(async (p) => {
        const url = await getSignedUrl(p.storage_path);
        if (url) map[p.id] = url;
      }));
      setImgUrl(map);

      // 4) mes votes existants
      const { data: votes, error: vErr } = await supabase
        .from("votes")
        .select("photo_id, voter_id, value");
      if (vErr) { alert(vErr.message); return; }
      const mine: Record<string, number> = {};
      (votes || []).forEach((v: VoteRow) => {
        if (v.voter_id === myPlayerId) mine[v.photo_id] = v.value;
      });
      setMyVotes(mine);

      // 5) realtime: nouveaux votes (pour maj si tu votes depuis un autre appareil)
      supabase.channel("votes")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "votes" },
          (payload: { new: VoteRow }) => {
            const v = payload.new;
            if (v.voter_id === myPlayerId) {
              setMyVotes(prev => ({ ...prev, [v.photo_id]: v.value }));
            }
          }
        ).subscribe();

    })();
  }, [room_id, myPlayerId, today]);

  async function vote(photoId: string, value: number) {
    if (!dayId) return;
    if (myVotes[photoId]) return; // déjà voté
    setBusy(true);
    try {
      const { error } = await supabase.from("votes").insert({
        photo_id: photoId,
        voter_id: myPlayerId,
        value
      });
      if (error) {
        if (error.message?.includes("Self-vote")) alert("Tu ne peux pas voter pour ta propre photo.");
        else if (error.code === "23505") alert("Tu as déjà voté pour cette photo.");
        else alert(error.message);
        return;
      }
      setMyVotes(prev => ({ ...prev, [photoId]: value }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Votes du jour — {today}</h1>
      {!dayId && <p>Pas de journée active.</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((p) => {
          const voted = myVotes[p.id];
          return (
            <div key={p.id} className="rounded overflow-hidden border">
              {imgUrl[p.id]
                ? <img src={imgUrl[p.id]} className="w-full aspect-square object-cover" />
                : <div className="w-full aspect-square grid place-items-center text-sm text-gray-500">Chargement…</div>}
              <div className="p-2 border-t">
                {voted ? (
                  <div className="text-sm">Ton vote : <b>{voted}</b>/5</div>
                ) : (
                  <div className="flex gap-2 justify-between">
                    {[1,2,3,4,5].map(n => (
                      <button
                        key={n}
                        disabled={busy}
                        onClick={() => vote(p.id, n)}
                        className="px-2 py-1 border rounded hover:bg-gray-50 text-sm"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-6">
        <a href="/board" className="underline">→ Voir le classement</a>
      </div>
    </div>
  );
}
