import { useEffect, useState } from "react";
import { supabase } from "../app/supabase";

type Theme = { id:number; label:string };

export default function Today() {
  const room_id = localStorage.getItem("room_id")!;
  const [theme, setTheme] = useState<string|null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0,10);

      const { data: day } = await supabase
        .from("game_days").select("*")
        .eq("room_id", room_id).eq("date", today).maybeSingle();
      if (day?.theme_label) setTheme(day.theme_label);

      const { data: th } = await supabase.from("themes").select("id,label");
      setThemes(th || []);

      supabase.channel("gameday")
        .on("postgres_changes", {
          event: "*", schema: "public", table: "game_days",
          filter: `room_id=eq.${room_id}`
        }, (payload: { new: { date?: string; theme_label?: string } }) => {
          const row = payload.new;
          if (row?.date === today && row?.theme_label) setTheme(row.theme_label);
        }).subscribe();

      setLoading(false);
    })();
  }, [room_id]);

  async function spinRoulette() {
    if (!themes.length) return alert("Aucun thème en base");
    const pick = themes[Math.floor(Math.random()*themes.length)];
    const today = new Date().toISOString().slice(0,10);

    const { error } = await supabase.from("game_days").upsert({
      room_id, date: today, theme_id: pick.id, theme_label: pick.label
    }, { onConflict: "room_id,date" });
    if (error) return alert(error.message);
    setTheme(pick.label);
  }

  if (loading) return <div className="p-4">Chargement…</div>;

  return (
    <div className="p-6 text-center space-y-4">
      <h1 className="text-2xl font-bold">Thème du jour</h1>
      {theme ? (
        <div className="text-3xl">{theme}</div>
      ) : (
        <button className="border px-4 py-2 rounded" onClick={spinRoulette}>
          Lancer la roulette
        </button>
      )}
      <div className="pt-6">
        <a className="underline" href="/upload">→ Upload (prochaine étape)</a>
      </div>
    </div>
  );
}
