import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type Photo = {
  id: string;
  url: string;
  theme_id?: string;
  theme?: { name: string }[];
  user_id: string;
};

export default function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [hasVotedAll, setHasVotedAll] = useState(false);

  // Récupérer l'utilisateur connecté
  useEffect(() => {
    const fetchUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  // Récupérer les photos
  useEffect(() => {
    const fetchPhotos = async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("id, url, user_id, theme_id, theme:theme_id(name)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) return alert(error.message);

      // Mélanger les photos aléatoirement
      const shuffled = data.sort(() => Math.random() - 0.5);
      setPhotos(shuffled as Photo[]);
    };
    fetchPhotos();
  }, []);

  // Vérifier si l'utilisateur a déjà voté pour toutes les photos
  useEffect(() => {
    const checkVotes = async () => {
      if (!userId || !photos.length) return;

      const { data: votesData, error } = await supabase
        .from("votes")
        .select("photo_id")
        .eq("user_id", userId);

      if (error) return console.error(error.message);

      const votedPhotoIds = votesData?.map((v) => v.photo_id) || [];
      const photoIdsToVote = photos
        .filter((p) => p.user_id !== userId) // on ignore ses propres photos
        .map((p) => p.id);

      // Si toutes les photos à voter sont déjà votées
      if (photoIdsToVote.every((id) => votedPhotoIds.includes(id))) {
        setHasVotedAll(true);
        setMessage("Vous avez déjà voté pour toutes les photos du jour !");
      }
    };

    checkVotes();
  }, [photos, userId]);

  // Passer à la photo suivante
  const goToNextPhoto = () => {
    if (currentIndex + 1 < photos.length) {
      setCurrentIndex(currentIndex + 1);
      setMessage("");
    } else {
      setMessage("🎉 Vous avez parcouru toutes les photos du jour !");
    }
  };

  // Gérer le vote
  const handleVote = async (score: number) => {
    if (!userId) return alert("Utilisateur non connecté");
    if (hasVotedAll) return alert("Vous avez déjà voté pour toutes les photos du jour !");

    const currentPhoto = photos[currentIndex];

    if (currentPhoto.user_id === userId) {
      goToNextPhoto();
      return;
    }

    const { error } = await supabase.from("votes").insert({
      user_id: userId,
      photo_id: currentPhoto.id,
      score,
    });
    if (error) return alert(error.message);

    setMessage(`✅ Vote de ${score} enregistré !`);
    goToNextPhoto();
  };

  if (!photos.length) return <p>Chargement des photos...</p>;
  if (hasVotedAll) return <p>{message}</p>;

  const currentPhoto = photos[currentIndex];

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h1>Galerie - Voter pour les photos</h1>
      <p>
        Photo {currentIndex + 1} sur {photos.length}
      </p>
      <img
        src={currentPhoto.url}
        alt="photo du jour"
        style={{ maxWidth: "80%", height: "auto" }}
      />
      {currentPhoto.theme?.[0]?.name && (
        <p>
          Thème : <strong>{currentPhoto.theme[0].name}</strong>
        </p>
      )}

      <div style={{ marginTop: 20 }}>
        {currentPhoto.user_id === userId ? (
          <>
            <p>📌 C'est votre photo, vous ne pouvez pas voter.</p>
            <button onClick={goToNextPhoto} style={{ margin: 5, padding: "10px 15px" }}>
              Passer
            </button>
          </>
        ) : (
          <>
            <p>Votez pour cette photo :</p>
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                onClick={() => handleVote(score)}
                style={{ margin: 5, padding: "10px 15px" }}
              >
                {score}
              </button>
            ))}
          </>
        )}
      </div>
      <p>{message}</p>
    </div>
  );
}
