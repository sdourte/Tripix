import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Upload() {
  const [files, setFiles] = useState<File[]>([]);
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
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return alert("Choisis au moins un fichier");

    setMessage("Vérification des quotas...");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return alert("Utilisateur non connecté");

    // Fenêtre "aujourd'hui"
    const startLocal = new Date();
    startLocal.setHours(0, 0, 0, 0);
    const endLocal = new Date();
    endLocal.setHours(23, 59, 59, 999);
    const toUtcIso = (d: Date) =>
      new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();

    const startISO = toUtcIso(startLocal);
    const endISO = toUtcIso(endLocal);

    // Vérifier combien de photos l'utilisateur a déjà uploadées aujourd'hui
    const { data: existingPhotos, error: fetchError } = await supabase
      .from("photos")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", startISO)
      .lte("created_at", endISO);

    if (fetchError) {
      alert(fetchError.message);
      return;
    }

    const remainingQuota = 3 - (existingPhotos?.length || 0);
    if (remainingQuota <= 0) {
      alert("⚠️ Vous avez déjà uploadé 3 photos aujourd'hui !");
      return;
    }

    // Si plus de fichiers que quota restant → on limite
    const filesToUpload = files.slice(0, remainingQuota);

    setMessage(`Upload de ${filesToUpload.length} photo(s) en cours...`);

    for (const file of filesToUpload) {
      const safeFileName = file.name
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-_.]/g, "");
      const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

      // Upload dans le bucket "photos"
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(filePath, file);
      if (uploadError) {
        alert(uploadError.message);
        continue; // on passe à la photo suivante
      }

      // Récupérer l'URL publique
      const publicData = supabase.storage.from("photos").getPublicUrl(filePath);
      if (!publicData?.data?.publicUrl) {
        alert("Impossible de récupérer l'URL publique");
        continue;
      }

      const url = publicData.data.publicUrl ?? "";

      // Insérer la photo dans la table photos
      const { error: dbError } = await supabase.from("photos").insert({
        user_id: user.id,
        theme_id: themeId,
        url,
      });

      if (dbError) {
        alert(dbError.message);
        continue;
      }
    }

    setMessage("✅ Upload terminé !");
    setFiles([]);
  };

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h1>Uploader vos photos</h1>
      <p>
        Thème du jour : <strong>{themeName}</strong>
      </p>
      <input type="file" accept="image/*" multiple onChange={handleFileChange} />
      <br />
      <br />
      <button onClick={handleUpload}>Envoyer</button>
      <p>{message}</p>
    </div>
  );
}
