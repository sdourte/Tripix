import { useEffect, useMemo, useState } from "react";
import { supabase } from "../app/supabase";

// ——— util: compresser en JPEG 1600px côté long ———
async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  return await new Promise<Blob>((res) => canvas.toBlob(b => res(b!), "image/jpeg", quality));
}

// ——— util: URL signé pour afficher une image privée ———
async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("photos").createSignedUrl(path, 60 * 60); // 1h
  if (error) return null;
  return data.signedUrl;
}

type PhotoRow = { id: string; storage_path: string; created_at: string };

export default function Upload() {
  const room_id = localStorage.getItem("room_id")!;
  const player_id = localStorage.getItem("player_id")!;
  const [dayId, setDayId] = useState<string | null>(null);
  const [existing, setExisting] = useState<PhotoRow[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0,10), []);

  // Charger/Créer le game_day du jour + lister mes photos
  useEffect(() => {
    (async () => {
      // 1) récupérer le game_day d'aujourd'hui
      const { data: day, error: e1 } = await supabase
        .from("game_days").select("*")
        .eq("room_id", room_id).eq("date", today).maybeSingle();
      if (e1) { alert(e1.message); return; }
      if (!day) { alert("Pas de thème du jour: va sur /today pour le tirer."); return; }
      setDayId(day.id);

      // 2) Mes photos existantes (pour la limite 3)
      const { data: me } = await supabase
        .from("photos").select("id,storage_path,created_at")
        .eq("room_id", room_id).eq("day_id", day.id).eq("player_id", player_id)
        .order("created_at", { ascending: true });
      setExisting(me || []);

      // 3) précharger des URL signées
      const map: Record<string,string> = {};
      await Promise.all((me||[]).map(async (p) => {
        const url = await getSignedUrl(p.storage_path);
        if (url) map[p.id] = url;
      }));
      setThumbs(map);

      // 4) realtime (si qqun ajoute/si moi j'ajoute depuis un autre device)
      supabase.channel("photos")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "photos", filter: `room_id=eq.${room_id}` },
          async (payload: { new: PhotoRow & { day_id: string; player_id: string; created_at: string; storage_path: string; id: string } }) => {
            const row = payload.new;
            if (row.day_id === day.id && row.player_id === player_id) {
              setExisting(prev => [...prev, { id: row.id, storage_path: row.storage_path, created_at: row.created_at }]);
              const url = await getSignedUrl(row.storage_path);
              if (url) setThumbs(prev => ({ ...prev, [row.id]: url }));
            }
          }
        ).subscribe();
    })();
  }, [room_id, player_id, today]);

  const remaining = Math.max(0, 3 - existing.length);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    if (!dayId) return alert("Pas de journée active.");
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (files.length > remaining) {
      alert(`Tu peux encore envoyer ${remaining} photo(s) maximum aujourd'hui.`);
      return;
    }

    setBusy(true);
    try {
      for (const f of files) {
        // 1) compresser
        const blob = await compressImage(f, 1600, 0.8);
        const asFile = new File([blob], "photo.jpg", { type: "image/jpeg" });

        // 2) path Storage
        const name = (globalThis.crypto?.randomUUID?.() || `${Date.now()}`) + ".jpg";
        const path = `${room_id}/${player_id}/${dayId}/${name}`;

        // 3) upload
        const { error: upErr } = await supabase.storage.from("photos").upload(path, asFile, {
          contentType: "image/jpeg",
          upsert: false,
        });
        if (upErr) throw upErr;

        // 4) insert DB
        const { error: insErr } = await supabase.from("photos").insert({
          room_id, day_id: dayId, player_id, storage_path: path
        });
        if (insErr) throw insErr;
      }
      alert("Upload OK ✅");
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert(String(err));
      }
    } finally {
      setBusy(false);
      e.target.value = ""; // reset input
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Upload — {today}</h1>
      <p>Photos restantes aujourd’hui : <b>{remaining}</b> / 3</p>
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={busy || remaining === 0}
        onChange={onPick}
        className="block"
      />
      {busy && <div>Envoi en cours…</div>}

      <div className="grid grid-cols-3 gap-2 pt-4">
        {existing.map(p => (
          <div key={p.id} className="aspect-square bg-gray-100 rounded overflow-hidden">
            {thumbs[p.id]
              ? <img src={thumbs[p.id]} className="w-full h-full object-cover" />
              : <div className="p-2 text-sm">Chargement…</div>}
          </div>
        ))}
      </div>

      <div className="pt-4">
        <a href="/vote" className="underline">→ Passer aux votes</a>
      </div>
    </div>
  );
}
