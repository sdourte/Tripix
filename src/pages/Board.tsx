import { useEffect, useMemo, useState } from "react";
import { supabase } from "../app/supabase";

type Player = { id: string; pseudo: string };
type Photo = { id: string; player_id: string; room_id: string; day_id: string };
type Vote = { photo_id: string; value: number };

type ScoreRow = { player_id: string; pseudo: string; points: number };

export default function Board() {
  const room_id = localStorage.getItem("room_id")!;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [dayId, setDayId] = useState<string | null>(null);
  const [daily, setDaily] = useState<ScoreRow[]>([]);
  const [overall, setOverall] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    // 1) trouver day_id
    const { data: day } = await supabase
      .from("game_days").select("*")
      .eq("room_id", room_id).eq("date", today).maybeSingle();
    setDayId(day?.id || null);

    // 2) charger joueurs de la room
    const { data: players, error: pErr } = await supabase
      .from("players").select("id,pseudo").eq("room_id", room_id);
    if (pErr) { alert(pErr.message); setLoading(false); return; }
    const playerMap = new Map<string, Player>();
    (players || []).forEach((p: Player) => playerMap.set(p.id, p));

    // 3) charger toutes les photos de la room (id -> owner)
    const { data: photos, error: phErr } = await supabase
      .from("photos").select("id,player_id,room_id,day_id").eq("room_id", room_id);
    if (phErr) { alert(phErr.message); setLoading(false); return; }
    const ownerByPhoto = new Map<string, string>();
    (photos || []).forEach((p: Photo) => ownerByPhoto.set(p.id, p.player_id));

    // 4) charger votes (les policies permettent de lire ceux de la room)
    const { data: votes, error: vErr } = await supabase
      .from("votes").select("photo_id,value");
    if (vErr) { alert(vErr.message); setLoading(false); return; }

    // Agrégation générale
    const totalByPlayer = new Map<string, number>();
    (votes || []).forEach((v: Vote) => {
      const owner = ownerByPhoto.get(v.photo_id);
      if (!owner) return;
      totalByPlayer.set(owner, (totalByPlayer.get(owner) || 0) + v.value);
    });

    // Agrégation du jour
    const dayPhotoIds = new Set((photos || []).filter(p => p.day_id === day?.id).map(p => p.id));
    const dailyByPlayer = new Map<string, number>();
    (votes || []).forEach((v: Vote) => {
      if (!dayId || !dayPhotoIds.has(v.photo_id)) return;
      const owner = ownerByPhoto.get(v.photo_id);
      if (!owner) return;
      dailyByPlayer.set(owner, (dailyByPlayer.get(owner) || 0) + v.value);
    });

    const toRows = (m: Map<string, number>): ScoreRow[] =>
      Array.from(m.entries())
        .map(([player_id, points]) => ({
          player_id,
          pseudo: playerMap.get(player_id)?.pseudo || "???",
          points
        }))
        .sort((a,b) => b.points - a.points);

    setOverall(toRows(totalByPlayer));
    setDaily(toRows(dailyByPlayer));
    setLoading(false);

    // 5) realtime pour mettre à jour en direct si tu veux
    supabase.channel("board")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "votes" }, () => {
        // Recharger vite fait (simple) :
        window.location.reload();
      }).subscribe();

  })(); }, [room_id, today, dayId]);

  if (loading) return <div className="p-6">Chargement…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Classement</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">Du jour {today}</h2>
        {daily.length ? (
          <ol className="space-y-1">
            {daily.map((r, i) => (
              <li key={r.player_id} className="flex items-center justify-between border rounded px-3 py-2">
                <span className="font-medium">{i+1}. {r.pseudo}</span>
                <span className="text-sm">{r.points} pts</span>
              </li>
            ))}
          </ol>
        ) : <p className="text-gray-600">Pas de votes aujourd’hui.</p>}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Général</h2>
        {overall.length ? (
          <ol className="space-y-1">
            {overall.map((r, i) => (
              <li key={r.player_id} className="flex items-center justify-between border rounded px-3 py-2">
                <span className="font-medium">{i+1}. {r.pseudo}</span>
                <span className="text-sm">{r.points} pts</span>
              </li>
            ))}
          </ol>
        ) : <p className="text-gray-600">Aucun point pour le moment.</p>}
      </section>
    </div>
  );
}
