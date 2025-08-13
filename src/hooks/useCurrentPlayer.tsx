import { useEffect, useState } from "react";
import { supabase } from "../app/supabase";

type Player = { id: string; pseudo: string; room_id: string; auth_user_id: string };

export function useCurrentPlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribed = false;

    (async () => {
      setLoading(true);

      const room_id = localStorage.getItem("room_id") || null;
      let player_id = localStorage.getItem("player_id") || null;

      // 1) S'assurer qu'on est bien loggé
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPlayer(null);
        setLoading(false);
        return;
      }

      // 2) Si pas de player_id en localStorage, essaie de le retrouver (fallback)
      if (!player_id && room_id) {
        const { data } = await supabase
          .from("players")
          .select("id,pseudo,room_id,auth_user_id")
          .eq("room_id", room_id)
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (data) {
          player_id = data.id;
          localStorage.setItem("player_id", data.id);
          if (!unsubscribed) setPlayer(data as Player);
        }
      }

      // 3) Si on a un player_id, charge le player
      if (player_id) {
        const { data } = await supabase
          .from("players")
          .select("id,pseudo,room_id,auth_user_id")
          .eq("id", player_id)
          .maybeSingle();
        if (!unsubscribed) setPlayer((data as Player) || null);

        // 4) Realtime: si le pseudo change
        supabase
          .channel(`player-${player_id}`)
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "players", filter: `id=eq.${player_id}` },
            (payload: { new: Player }) => {
              if (!unsubscribed) setPlayer(payload.new as Player);
            }
          )
          .subscribe();
      }

      setLoading(false);
    })();

    return () => { unsubscribed = true; };
  }, []);

  return { player, loading };
}
