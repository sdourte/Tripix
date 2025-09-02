import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    // Redirige vers Upload après connexion
    navigate("/upload");
  };

  const handleSignup = async () => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);
    alert("Compte créé ! Connecte-toi maintenant.");
  };

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h1>Tripix - Connexion</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      <br />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      <br />
      <button onClick={handleLogin} style={{ marginRight: 10 }}>Se connecter</button>
      <button onClick={handleSignup}>Créer un compte</button>
    </div>
  );
}
