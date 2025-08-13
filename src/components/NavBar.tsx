import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../app/supabase";
import { useCurrentPlayer } from "../hooks/useCurrentPlayer";

export default function NavBar() {
  const navigate = useNavigate();
  const { player, loading } = useCurrentPlayer();

  async function logout() {
    await supabase.auth.signOut();
    localStorage.clear();
    navigate("/login");
  }

  return (
    <nav className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
        <div className="text-sm">
            {loading ? (
            <span className="opacity-75">…</span>
            ) : player ? (
            <span className="px-2 py-1 bg-gray-700 rounded">{player.pseudo}</span>
            ) : (
            <span className="opacity-75">non connecté</span>
            )}
        </div>
      <div className="flex gap-4">
        <Link to="/today" className="hover:underline">Today</Link>
        <Link to="/upload" className="hover:underline">Upload</Link>
        <Link to="/vote" className="hover:underline">Vote</Link>
        <Link to="/board" className="hover:underline">Board</Link>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
        >
          Déconnexion
        </button>
      </div>
    </nav>
  );
}
