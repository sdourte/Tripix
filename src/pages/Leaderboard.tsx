import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type LeaderboardEntry = {
  pseudo: string;
  total_score: number;
  photos_count: number;
  votes_received: number;
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("leaderboard") // on interroge directement la vue SQL
        .select("*")
        .order("total_score", { ascending: false });

      if (error) {
        console.error("Erreur Supabase leaderboard:", error.message);
        setLoading(false);
        return;
      }

      console.log("Résultats bruts de la vue leaderboard:", data);

      setLeaderboard(data || []);
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  if (loading) return <p>Chargement du leaderboard...</p>;

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h1>Leaderboard Tripix</h1>
      <table style={{ margin: "auto", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid black", padding: "10px" }}>Rang</th>
            <th style={{ border: "1px solid black", padding: "10px" }}>Joueur</th>
            <th style={{ border: "1px solid black", padding: "10px" }}>Score total</th>
            <th style={{ border: "1px solid black", padding: "10px" }}>Photos postées</th>
            <th style={{ border: "1px solid black", padding: "10px" }}>Votes reçus</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, index) => (
            <tr key={entry.pseudo}>
              <td style={{ border: "1px solid black", padding: "10px" }}>{index + 1}</td>
              <td style={{ border: "1px solid black", padding: "10px" }}>{entry.pseudo}</td>
              <td style={{ border: "1px solid black", padding: "10px" }}>{entry.total_score}</td>
              <td style={{ border: "1px solid black", padding: "10px" }}>{entry.photos_count}</td>
              <td style={{ border: "1px solid black", padding: "10px" }}>{entry.votes_received}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
