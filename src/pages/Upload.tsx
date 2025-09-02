import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [themeId, setThemeId] = useState<string | null>(null);
  const [themeName, setThemeName] = useState("À définir");

  useEffect(() => {
    const fetchTheme = async () => {
      const { data, error } = await supabase
        .from("themes")
        .select("id, theme")
        .order("date", { ascending: false })
        .limit(1);

      if (!error && data?.length) {
        setThemeId(data[0].id);
        setThemeName(data[0].theme);
      }
    };

    fetchTheme();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Choisis un fichier");

    setMessage("Upload en cours...");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return alert("Utilisateur non connecté");

    const safeFileName = file.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_.]/g, "");
    const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

    // Upload dans le bucket "photos"
    const { error: uploadError } = await supabase.storage.from("photos").upload(filePath, file);
    if (uploadError) return alert(uploadError.message);

    // Récupérer l'URL publique
    const publicData = supabase.storage.from("photos").getPublicUrl(filePath);
    if (!publicData?.data?.publicUrl) return alert("Impossible de récupérer l'URL publique");

    const url = publicData.data.publicUrl ?? "";

    // Insérer la photo dans la table photos
    const { error: dbError } = await supabase.from("photos").insert({
      user_id: user.id,
      theme_id: themeId, // on insère l'ID du thème
      url: url
    });

    if (dbError) return alert(dbError.message);

    setMessage("Upload réussi ! 🎉");
    setFile(null);
  };

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h1>Uploader une photo</h1>
      <p>Thème du jour : <strong>{themeName}</strong></p>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <br /><br />
      <button onClick={handleUpload}>Envoyer</button>
      <p>{message}</p>
    </div>
  );
}
