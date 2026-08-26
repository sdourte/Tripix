import {
  useEffect,
  useState,
  type ChangeEvent,
} from 'react'

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material'

import { useNavigate, useParams } from 'react-router-dom'

import { supabase } from '../lib/supabase'

import {
  addPhoto,
  getCurrentPlayer,
  getPhotoUrl,
  getPlayerPhotos,
  getRoomByCode,
  getRoomDays,
  getRoomPlayers,
  type Day,
  type Player,
  type Photo,
  type Room,
} from '../services/roomService'

/* ============================================================
   TYPES LOCAUX
   ============================================================ */

interface SelectedPhoto {
  file: File
  preview: string
}

interface DisplayPhoto extends Photo {
  url: string
}

/* ============================================================
   COMPONENT
   ============================================================ */

export default function DayPage() {
  const { code, dayId } =
    useParams<{
      code: string
      dayId: string
    }>()

  const navigate = useNavigate()

  /* ==========================================================
     STATE
     ========================================================== */

  const [room, setRoom] =
    useState<Room | null>(null)

  const [day, setDay] =
    useState<Day | null>(null)

  const [player, setPlayer] =
    useState<Player | null>(null)

  const [
    selectedPhotos,
    setSelectedPhotos,
  ] = useState<SelectedPhoto[]>([])

  const [
    uploadedPhotos,
    setUploadedPhotos,
  ] = useState<DisplayPhoto[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    loadingPhotos,
    setLoadingPhotos,
  ] = useState(false)

  const [
    uploading,
    setUploading,
  ] = useState(false)

  /*
   * Numéro de la photo actuellement
   * en cours de remplacement.
   *
   * null = aucune modification.
   */
  const [
    replacingPhotoNumber,
    setReplacingPhotoNumber,
  ] = useState<number | null>(null)

  /*
   * Fichier sélectionné pour le remplacement.
   */
  const [
    replacementPhoto,
    setReplacementPhoto,
  ] = useState<SelectedPhoto | null>(
    null,
  )

  const [
    replacing,
    setReplacing,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  /*
   * ==========================================================
   * État de progression des joueurs
   * ==========================================================
   */

  const [
    totalPlayers,
    setTotalPlayers,
  ] = useState(0)

  const [
    playersWhoSubmitted,
    setPlayersWhoSubmitted,
  ] = useState(0)

  const [
    checkingAllPhotos,
    setCheckingAllPhotos,
  ] = useState(false)

  /* ==========================================================
     DERIVED STATE
     ========================================================== */

  const isAdmin =
    !!room &&
    !!player &&
    player.user_id === room.admin_id

  const allPlayersSubmitted =
    totalPlayers > 0 &&
    playersWhoSubmitted === totalPlayers

  /* ==========================================================
     LOAD ROOM / DAY / PLAYER
     ========================================================== */

  useEffect(() => {
    async function loadDay() {
      if (!code || !dayId) {
        setError(
          'Journée invalide.',
        )
        setLoading(false)
        return
      }

      try {
        setError('')

        const roomData =
          await getRoomByCode(code)

        const daysData =
          await getRoomDays(
            roomData.id,
          )

        const dayData =
          daysData.find(
            (item) =>
              item.id === dayId,
          )

        if (!dayData) {
          throw new Error(
            'Impossible de trouver cette journée.',
          )
        }

        const playerData =
          await getCurrentPlayer(
            roomData.id,
          )

        setRoom(roomData)
        setDay(dayData)
        setPlayer(playerData)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de charger la journée.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadDay()
  }, [code, dayId])

  /* ==========================================================
     LOAD PLAYER PHOTOS
     ========================================================== */

  async function loadUploadedPhotos(
    currentDay: Day,
    currentPlayer: Player,
  ) {
    try {
      setLoadingPhotos(true)

      const photos =
        await getPlayerPhotos(
          currentDay.id,
          currentPlayer.id,
        )

      const photosWithUrls =
        await Promise.all(
          photos.map(
            async (photo) => {
              const url =
                await getPhotoUrl(
                  photo.storage_path,
                )

              return {
                ...photo,
                url,
              }
            },
          ),
        )

      setUploadedPhotos(
        photosWithUrls,
      )
    } catch (err) {
      console.error(
        'Erreur lors du chargement des photos :',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de récupérer les photos.',
      )
    } finally {
      setLoadingPhotos(false)
    }
  }

  useEffect(() => {
    if (!day || !player) {
      return
    }

    loadUploadedPhotos(
      day,
      player,
    )
  }, [
    day?.id,
    player?.id,
  ])

  /* ==========================================================
     CHECK ALL PLAYERS PHOTOS
     ========================================================== */

  async function checkAllPlayersSubmitted() {
    if (!room || !day) {
      return
    }

    try {
      setCheckingAllPhotos(true)

      /*
       * Récupérer tous les joueurs de la salle.
       */
      const players =
        await getRoomPlayers(
          room.id,
        )

      /*
       * Récupérer les photos de cette journée.
       *
       * On récupère uniquement player_id et photo_number
       * car nous n'avons pas besoin des images ici.
       */
      const {
        data: photos,
        error: photosError,
      } = await supabase
        .from('photos')
        .select(
          'player_id, photo_number',
        )
        .eq(
          'day_id',
          day.id,
        )

      if (photosError) {
        throw new Error(
          photosError.message,
        )
      }

      /*
       * Chaque joueur doit avoir exactement
       * 3 photos.
       */
      const submittedPlayerIds =
        new Set<string>()

      for (const currentPlayer of players) {
        const playerPhotos =
          (photos ?? []).filter(
            (photo) =>
              photo.player_id ===
              currentPlayer.id,
          )

        if (
          playerPhotos.length >= 3
        ) {
          submittedPlayerIds.add(
            currentPlayer.id,
          )
        }
      }

      setTotalPlayers(
        players.length,
      )

      setPlayersWhoSubmitted(
        submittedPlayerIds.size,
      )
    } catch (err) {
      console.error(
        'Erreur lors de la vérification des photos :',
        err,
      )
    } finally {
      setCheckingAllPhotos(false)
    }
  }

  /*
   * Vérification initiale.
   */
  useEffect(() => {
    if (!room || !day) {
      return
    }

    checkAllPlayersSubmitted()
  }, [
    room?.id,
    day?.id,
  ])

  /* ==========================================================
     REALTIME — DAY
     ========================================================== */

  useEffect(() => {
    if (!day) {
      return
    }

    const channel =
      supabase
        .channel(
          `day-${day.id}`,
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'days',
            filter: `id=eq.${day.id}`,
          },
          (payload) => {
            const updatedDay =
              payload.new as Day

            setDay(updatedDay)

            /*
             * Dès que le statut change,
             * on vérifie également la progression
             * des joueurs.
             */
            checkAllPlayersSubmitted()

            /*
             * Dès que le statut change,
             * on annule une éventuelle
             * modification en cours.
             */
            if (
              updatedDay.status !==
              'submission'
            ) {
              setReplacingPhotoNumber(
                null,
              )

              if (
                replacementPhoto
              ) {
                URL.revokeObjectURL(
                  replacementPhoto.preview,
                )
              }

              setReplacementPhoto(
                null,
              )
            }
          },
        )
        .subscribe()

    return () => {
      supabase.removeChannel(
        channel,
      )
    }
  }, [day?.id])

  /* ==========================================================
     REALTIME — PHOTOS
     ========================================================== */

  useEffect(() => {
    if (!day || !room) {
      return
    }

    const channel =
      supabase
        .channel(
          `photos-day-${day.id}`,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'photos',
            filter: `day_id=eq.${day.id}`,
          },
          () => {
            /*
             * Une photo a été ajoutée,
             * modifiée ou supprimée.
             *
             * On recalcule donc immédiatement
             * la progression globale.
             */
            checkAllPlayersSubmitted()

            /*
             * Si c'est notre propre photo,
             * on recharge également notre galerie.
             */
            if (player) {
              loadUploadedPhotos(
                day,
                player,
              )
            }
          },
        )
        .subscribe()

    return () => {
      supabase.removeChannel(
        channel,
      )
    }
  }, [
    day?.id,
    room?.id,
    player?.id,
  ])

  /* ==========================================================
     SELECT INITIAL 3 PHOTOS
     ========================================================== */

  function handlePhotoSelection(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(
      event.target.files ?? [],
    )

    if (files.length !== 3) {
      setError(
        'Tu dois sélectionner exactement 3 photos.',
      )

      event.target.value = ''
      return
    }

    const invalidFile =
      files.find(
        (file) =>
          !file.type.startsWith(
            'image/',
          ),
      )

    if (invalidFile) {
      setError(
        'Tous les fichiers doivent être des images.',
      )

      event.target.value = ''
      return
    }

    const maxSize =
      10 * 1024 * 1024

    const tooLarge =
      files.find(
        (file) =>
          file.size > maxSize,
      )

    if (tooLarge) {
      setError(
        'Chaque photo doit faire moins de 10 MB.',
      )

      event.target.value = ''
      return
    }

    selectedPhotos.forEach(
      (photo) => {
        URL.revokeObjectURL(
          photo.preview,
        )
      },
    )

    const newPhotos =
      files.map(
        (file) => ({
          file,
          preview:
            URL.createObjectURL(
              file,
            ),
        }),
      )

    setSelectedPhotos(
      newPhotos,
    )

    setError('')
    setSuccess('')

    event.target.value = ''
  }

  /* ==========================================================
     REMOVE SELECTED PHOTO
     ========================================================== */

  function handleRemovePhoto(
    index: number,
  ) {
    const photo =
      selectedPhotos[index]

    if (photo) {
      URL.revokeObjectURL(
        photo.preview,
      )
    }

    setSelectedPhotos(
      selectedPhotos.filter(
        (_, photoIndex) =>
          photoIndex !== index,
      ),
    )
  }

  /* ==========================================================
     INITIAL UPLOAD
     ========================================================== */

  async function handleUpload() {
    if (
      !room ||
      !day ||
      !player
    ) {
      return
    }

    if (
      selectedPhotos.length !== 3
    ) {
      setError(
        'Tu dois sélectionner exactement 3 photos.',
      )
      return
    }

    if (
      day.status !==
      'submission'
    ) {
      setError(
        'Les soumissions ne sont pas ouvertes.',
      )
      return
    }

    try {
      setUploading(true)
      setError('')
      setSuccess('')

      for (
        let index = 0;
        index <
        selectedPhotos.length;
        index++
      ) {
        const selectedPhoto =
          selectedPhotos[index]

        const photoNumber =
          index + 1

        const extension =
          selectedPhoto.file.name
            .split('.')
            .pop()
            ?.toLowerCase() ||
          'jpg'

        const storagePath = [
          room.id,
          day.id,
          player.id,
          `${photoNumber}.${extension}`,
        ].join('/')

        const {
          error:
            uploadError,
        } =
          await supabase.storage
            .from(
              'tripix-photos',
            )
            .upload(
              storagePath,
              selectedPhoto.file,
              {
                upsert: false,
                contentType:
                  selectedPhoto
                    .file.type,
              },
            )

        if (uploadError) {
          throw new Error(
            `Erreur Storage : ${uploadError.message}`,
          )
        }

        try {
          await addPhoto(
            day.id,
            player.id,
            storagePath,
            photoNumber,
          )
        } catch (err) {
          throw new Error(
            `Erreur base de données : ${
              err instanceof Error
                ? err.message
                : 'Erreur inconnue'
            }`,
          )
        }
      }

      await loadUploadedPhotos(
        day,
        player,
      )

      await checkAllPlayersSubmitted()

      selectedPhotos.forEach(
        (photo) => {
          URL.revokeObjectURL(
            photo.preview,
          )
        },
      )

      setSelectedPhotos([])

      setSuccess(
        'Tes 3 photos ont bien été envoyées.',
      )
    } catch (err) {
      console.error(
        'Erreur upload photos:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Impossible d’envoyer les photos.',
      )
    } finally {
      setUploading(false)
    }
  }

  /* ==========================================================
     START REPLACEMENT
     ========================================================== */

  function handleStartReplacement(
    photoNumber: number,
  ) {
    if (
      day?.status !==
      'submission'
    ) {
      return
    }

    if (
      replacementPhoto
    ) {
      URL.revokeObjectURL(
        replacementPhoto.preview,
      )
    }

    setReplacingPhotoNumber(
      photoNumber,
    )

    setReplacementPhoto(
      null,
    )

    setError('')
    setSuccess('')
  }

  /* ==========================================================
     CANCEL REPLACEMENT
     ========================================================== */

  function handleCancelReplacement() {
    if (
      replacementPhoto
    ) {
      URL.revokeObjectURL(
        replacementPhoto.preview,
      )
    }

    setReplacingPhotoNumber(
      null,
    )

    setReplacementPhoto(
      null,
    )

    setError('')
  }

  /* ==========================================================
     SELECT REPLACEMENT
     ========================================================== */

  function handleReplacementSelection(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0]

    if (!file) {
      return
    }

    if (
      !file.type.startsWith(
        'image/',
      )
    ) {
      setError(
        'Le fichier doit être une image.',
      )

      event.target.value = ''
      return
    }

    const maxSize =
      10 * 1024 * 1024

    if (file.size > maxSize) {
      setError(
        'La photo doit faire moins de 10 MB.',
      )

      event.target.value = ''
      return
    }

    if (
      replacementPhoto
    ) {
      URL.revokeObjectURL(
        replacementPhoto.preview,
      )
    }

    setReplacementPhoto({
      file,
      preview:
        URL.createObjectURL(
          file,
        ),
    })

    setError('')
    setSuccess('')

    event.target.value = ''
  }

  /* ==========================================================
     REPLACE PHOTO
     ========================================================== */

  async function handleReplacePhoto() {
    if (
      !room ||
      !day ||
      !player
    ) {
      return
    }

    if (
      replacingPhotoNumber ===
      null
    ) {
      return
    }

    if (
      !replacementPhoto
    ) {
      setError(
        'Sélectionne une nouvelle photo.',
      )
      return
    }

    if (
      day.status !==
      'submission'
    ) {
      setError(
        'Les modifications sont fermées.',
      )
      return
    }

    try {
      setReplacing(true)
      setError('')
      setSuccess('')

      const photoNumber =
        replacingPhotoNumber

      const extension =
        replacementPhoto.file.name
          .split('.')
          .pop()
          ?.toLowerCase() ||
        'jpg'

      const storagePath = [
        room.id,
        day.id,
        player.id,
        `${photoNumber}.${extension}`,
      ].join('/')

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            'tripix-photos',
          )
          .upload(
            storagePath,
            replacementPhoto.file,
            {
              upsert: true,
              contentType:
                replacementPhoto
                  .file.type,
            },
          )

      if (uploadError) {
        throw new Error(
          `Erreur Storage : ${uploadError.message}`,
        )
      }

      await addPhoto(
        day.id,
        player.id,
        storagePath,
        photoNumber,
      )

      await loadUploadedPhotos(
        day,
        player,
      )

      await checkAllPlayersSubmitted()

      URL.revokeObjectURL(
        replacementPhoto.preview,
      )

      setReplacementPhoto(
        null,
      )

      setReplacingPhotoNumber(
        null,
      )

      setSuccess(
        `La photo ${photoNumber} a bien été remplacée.`,
      )
    } catch (err) {
      console.error(
        'Erreur remplacement photo:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de remplacer la photo.',
      )
    } finally {
      setReplacing(false)
    }
  }

  /* ==========================================================
     START SLIDESHOW
     ========================================================== */

  function handleStartSlideshow() {
    if (!code || !dayId) {
      return
    }

    if (!isAdmin) {
      return
    }

    if (!allPlayersSubmitted) {
      setError(
        'Tous les joueurs doivent avoir envoyé leurs 3 photos avant de lancer le diaporama.',
      )
      return
    }

    /*
     * Route vers SlideshowPage.
     */
    navigate(
      `/room/${code}/day/${dayId}/slideshow`,
    )
  }

  /* ==========================================================
     LOADING
     ========================================================== */

  if (loading) {
    return (
      <Container
        sx={{
          minHeight:
            '100vh',
          display:
            'flex',
          alignItems:
            'center',
          justifyContent:
            'center',
        }}
      >
        <CircularProgress />
      </Container>
    )
  }

  /* ==========================================================
     ERROR
     ========================================================== */

  if (
    error &&
    (!room ||
      !day ||
      !player)
  ) {
    return (
      <Container
        maxWidth="sm"
        sx={{
          py: 5,
        }}
      >
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    )
  }

  if (
    !room ||
    !day ||
    !player
  ) {
    return (
      <Container
        maxWidth="sm"
        sx={{
          py: 5,
        }}
      >
        <Alert severity="error">
          Impossible de charger
          la journée.
        </Alert>
      </Container>
    )
  }

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <Container
      maxWidth="sm"
      sx={{
        py: 5,
      }}
    >
      <Stack spacing={3}>

        {/* ====================================================
            HEADER
            ==================================================== */}

        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            {room.name}
          </Typography>

          <Typography
            variant="h4"
            fontWeight={700}
          >
            Jour{' '}
            {day.day_number}
          </Typography>

          <Typography
            variant="h6"
            sx={{
              mt: 1,
            }}
          >
            {day.theme}
          </Typography>
        </Box>

        {/* ====================================================
            ALERTS
            ==================================================== */}

        {error && (
          <Alert
            severity="error"
            onClose={() =>
              setError('')
            }
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            onClose={() =>
              setSuccess('')
            }
          >
            {success}
          </Alert>
        )}

        {/* ====================================================
            THEME
            ==================================================== */}

        <Paper
          elevation={0}
          sx={{
            p: 3,
            border:
              '1px solid',
            borderColor:
              'divider',
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
          >
            THÈME
          </Typography>

          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              mt: 1,
            }}
          >
            {day.theme}
          </Typography>
        </Paper>

        {/* ====================================================
            SLIDESHOW ADMIN
            ==================================================== */}

        {day.status ===
          'submission' &&
          isAdmin && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border:
                  '1px solid',
                borderColor:
                  'divider',
              }}
            >
              <Stack spacing={2}>

                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={700}
                  >
                    Diaporama
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 0.5,
                    }}
                  >
                    Lorsque tous les joueurs
                    ont envoyé leurs 3 photos,
                    tu peux lancer le diaporama
                    pour les présenter à tout
                    le monde avant les votes.
                  </Typography>
                </Box>

                <Box>
                  {checkingAllPhotos ? (
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                    >
                      <CircularProgress
                        size={20}
                      />

                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        Vérification des photos...
                      </Typography>
                    </Stack>
                  ) : (
                    <Stack spacing={1.5}>

                      <Typography
                        variant="body2"
                        fontWeight={600}
                      >
                        {playersWhoSubmitted}
                        {' / '}
                        {totalPlayers}
                        {' joueurs ont envoyé leurs 3 photos'}
                      </Typography>

                      {!allPlayersSubmitted && (
                        <Alert severity="info">
                          Le diaporama sera disponible
                          lorsque tous les joueurs
                          auront envoyé leurs 3 photos.
                        </Alert>
                      )}

                      {allPlayersSubmitted && (
                        <Alert severity="success">
                          Tout le monde a envoyé
                          ses 3 photos. Le diaporama
                          peut être lancé.
                        </Alert>
                      )}

                      <Button
                        variant="contained"
                        size="large"
                        disabled={
                          !allPlayersSubmitted ||
                          checkingAllPhotos
                        }
                        onClick={
                          handleStartSlideshow
                        }
                      >
                        Lancer le diaporama
                      </Button>

                    </Stack>
                  )}
                </Box>

              </Stack>
            </Paper>
          )}

        {/* ====================================================
            UPCOMING
            ==================================================== */}

        {day.status ===
          'upcoming' && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border:
                '1px solid',
              borderColor:
                'divider',
              textAlign:
                'center',
            }}
          >
            <Typography
              variant="h6"
              fontWeight={700}
            >
              Journée à venir
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                mt: 1,
              }}
            >
              La journée n'a
              pas encore
              commencé.
            </Typography>
          </Paper>
        )}

        {/* ====================================================
            ACTIVE
            ==================================================== */}

        {day.status ===
          'active' && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border:
                '1px solid',
              borderColor:
                'divider',
              textAlign:
                'center',
            }}
          >
            <Typography
              variant="h6"
              fontWeight={700}
            >
              Journée en cours
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                mt: 1,
              }}
            >
              Prenez vos
              photos !
            </Typography>
          </Paper>
        )}

        {/* ====================================================
            SUBMISSION
            ==================================================== */}

        {day.status ===
          'submission' && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border:
                '1px solid',
              borderColor:
                'divider',
            }}
          >
            <Stack spacing={2.5}>

              <Box>
                <Typography
                  variant="h6"
                  fontWeight={700}
                >
                  Vos photos
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.5,
                  }}
                >
                  Envoyez vos
                  3 photos puis
                  modifiez-les
                  si nécessaire
                  avant la fin
                  des soumissions.
                </Typography>
              </Box>

              {/* ==========================================
                  LOADING PHOTOS
                  ========================================== */}

              {loadingPhotos ? (
                <Box
                  sx={{
                    display:
                      'flex',
                    justifyContent:
                      'center',
                    py: 3,
                  }}
                >
                  <CircularProgress
                    size={28}
                  />
                </Box>
              ) : (
                <>
                  {/* ========================================
                      PHOTOS EXISTANTES
                      ======================================== */}

                  {uploadedPhotos.length >
                    0 && (
                    <Stack
                      spacing={2}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={600}
                      >
                        Photos
                        envoyées (
                        {
                          uploadedPhotos.length
                        }
                        /3)
                      </Typography>

                      <Box
                        sx={{
                          display:
                            'grid',
                          gridTemplateColumns:
                            'repeat(2, 1fr)',
                          gap: 1.5,
                        }}
                      >
                        {uploadedPhotos.map(
                          (
                            photo,
                          ) => (
                            <Box
                              key={
                                photo.id
                              }
                              sx={{
                                display:
                                  'flex',
                                flexDirection:
                                  'column',
                                border:
                                  '1px solid',
                                borderColor:
                                  'divider',
                                borderRadius:
                                  1,
                                overflow:
                                  'hidden',
                              }}
                            >
                              {/* IMAGE */}

                              <Box
                                sx={{
                                  position:
                                    'relative',
                                  aspectRatio:
                                    '1',
                                }}
                              >
                                <Box
                                  component="img"
                                  src={
                                    photo.url
                                  }
                                  alt={`Photo ${photo.photo_number}`}
                                  sx={{
                                    width:
                                      '100%',
                                    height:
                                      '100%',
                                    objectFit:
                                      'cover',
                                    display:
                                      'block',
                                  }}
                                />

                                <Box
                                  sx={{
                                    position:
                                      'absolute',
                                    top: 8,
                                    left: 8,
                                    px: 1,
                                    py: 0.5,
                                    borderRadius:
                                      1,
                                    backgroundColor:
                                      'rgba(0,0,0,0.65)',
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color:
                                        'white',
                                      fontWeight:
                                        600,
                                    }}
                                  >
                                    Photo{' '}
                                    {
                                      photo.photo_number
                                    }
                                  </Typography>
                                </Box>
                              </Box>

                              {/* ACTION */}

                              <Box
                                sx={{
                                  p: 1,
                                }}
                              >
                                {replacingPhotoNumber ===
                                photo.photo_number ? (
                                  <Stack
                                    spacing={
                                      1
                                    }
                                  >
                                    {!replacementPhoto ? (
                                      <Button
                                        component="label"
                                        variant="outlined"
                                        size="small"
                                        disabled={
                                          replacing
                                        }
                                      >
                                        Choisir
                                        une
                                        nouvelle
                                        photo

                                        <input
                                          hidden
                                          type="file"
                                          accept="image/*"
                                          onChange={
                                            handleReplacementSelection
                                          }
                                        />
                                      </Button>
                                    ) : (
                                      <>
                                        <Box
                                          sx={{
                                            border:
                                              '1px solid',
                                            borderColor:
                                              'divider',
                                            borderRadius:
                                              1,
                                            overflow:
                                              'hidden',
                                          }}
                                        >
                                          <Box
                                            component="img"
                                            src={
                                              replacementPhoto.preview
                                            }
                                            alt="Nouvelle photo"
                                            sx={{
                                              width:
                                                '100%',
                                              display:
                                                'block',
                                              aspectRatio:
                                                '1',
                                              objectFit:
                                                'cover',
                                            }}
                                          />
                                        </Box>

                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          Nouvelle
                                          photo
                                        </Typography>

                                        <Button
                                          variant="contained"
                                          size="small"
                                          disabled={
                                            replacing
                                          }
                                          onClick={
                                            handleReplacePhoto
                                          }
                                        >
                                          {replacing
                                            ? 'Remplacement...'
                                            : 'Confirmer'}
                                        </Button>

                                        <Button
                                          variant="text"
                                          size="small"
                                          disabled={
                                            replacing
                                          }
                                          onClick={
                                            handleCancelReplacement
                                          }
                                        >
                                          Annuler
                                        </Button>
                                      </>
                                    )}
                                  </Stack>
                                ) : (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    disabled={
                                      replacing
                                    }
                                    onClick={() =>
                                      handleStartReplacement(
                                        photo.photo_number,
                                      )
                                    }
                                  >
                                    Modifier
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          ),
                        )}
                      </Box>

                      {uploadedPhotos.length ===
                        3 && (
                        <Alert severity="success">
                          Tes 3 photos
                          ont bien été
                          envoyées.
                        </Alert>
                      )}
                    </Stack>
                  )}

                  {/* ========================================
                      PREMIER ENVOI
                      ======================================== */}

                  {uploadedPhotos.length ===
                    0 && (
                    <Stack
                      spacing={2}
                    >
                      <Button
                        component="label"
                        variant="outlined"
                        disabled={
                          uploading
                        }
                      >
                        Sélectionner
                        3 photos

                        <input
                          hidden
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={
                            handlePhotoSelection
                          }
                        />
                      </Button>

                      {/* APERÇUS */}

                      {selectedPhotos.length >
                        0 && (
                        <Stack
                          spacing={2}
                        >
                          {selectedPhotos.map(
                            (
                              photo,
                              index,
                            ) => (
                              <Paper
                                key={
                                  photo.preview
                                }
                                elevation={
                                  0
                                }
                                sx={{
                                  overflow:
                                    'hidden',
                                  border:
                                    '1px solid',
                                  borderColor:
                                    'divider',
                                }}
                              >
                                <Box
                                  component="img"
                                  src={
                                    photo.preview
                                  }
                                  alt={`Photo ${
                                    index +
                                    1
                                  }`}
                                  sx={{
                                    display:
                                      'block',
                                    width:
                                      '100%',
                                    maxHeight:
                                      300,
                                    objectFit:
                                      'cover',
                                  }}
                                />

                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  sx={{
                                    p: 1.5,
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    fontWeight={
                                      600
                                    }
                                  >
                                    Photo{' '}
                                    {index +
                                      1}
                                  </Typography>

                                  <Button
                                    size="small"
                                    color="error"
                                    onClick={() =>
                                      handleRemovePhoto(
                                        index,
                                      )
                                    }
                                    disabled={
                                      uploading
                                    }
                                  >
                                    Supprimer
                                  </Button>
                                </Stack>
                              </Paper>
                            ),
                          )}
                        </Stack>
                      )}

                      <Button
                        variant="contained"
                        size="large"
                        disabled={
                          uploading ||
                          selectedPhotos.length !==
                            3
                        }
                        onClick={
                          handleUpload
                        }
                      >
                        {uploading
                          ? 'Envoi en cours...'
                          : 'Envoyer mes 3 photos'}
                      </Button>
                    </Stack>
                  )}
                </>
              )}
            </Stack>
          </Paper>
        )}

        {/* ====================================================
            VOTING
            ==================================================== */}

        {day.status ===
          'voting' && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border:
                '1px solid',
              borderColor:
                'divider',
              textAlign:
                'center',
            }}
          >
            <Typography
              variant="h6"
              fontWeight={700}
            >
              Les votes sont
              ouverts
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                mt: 1,
              }}
            >
              Les photos sont
              maintenant
              verrouillées.
            </Typography>
          </Paper>
        )}

        {/* ====================================================
            FINISHED
            ==================================================== */}

        {day.status ===
          'finished' && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border:
                '1px solid',
              borderColor:
                'divider',
              textAlign:
                'center',
            }}
          >
            <Typography
              variant="h6"
              fontWeight={700}
            >
              Journée terminée
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                mt: 1,
              }}
            >
              Les résultats
              seront bientôt
              disponibles.
            </Typography>
          </Paper>
        )}

      </Stack>
    </Container>
  )
}