import {
  useEffect,
  useState,
} from 'react'

import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Rating,
  Stack,
  Typography,
} from '@mui/material'

import CloseIcon from '@mui/icons-material/Close'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  getCurrentPlayerForDay,
  getDayVotingPhotos,
  getMyVotes,
  getPhotoUrl,
  submitVote,
  type VotingPhoto,
} from '../services/roomService'

interface DisplayVotingPhoto
  extends VotingPhoto {
  url: string
  isOwn: boolean
}

export default function VotingPage() {
  const { dayId } = useParams<{
    dayId: string
  }>()

  const navigate = useNavigate()

  const [photos, setPhotos] =
    useState<DisplayVotingPhoto[]>([])

  const [votes, setVotes] =
    useState<Record<string, number>>({})

  const [loading, setLoading] =
    useState(true)

  const [savingPhotoId, setSavingPhotoId] =
    useState<string | null>(null)

  const [error, setError] =
    useState('')

  const [selectedPhoto, setSelectedPhoto] =
    useState<DisplayVotingPhoto | null>(null)

  /*
   * ============================================================
   * CHARGEMENT
   * ============================================================
   */

  useEffect(() => {
    async function loadVoting() {
      if (!dayId) {
        setError('Journée invalide.')
        setLoading(false)
        return
      }

      try {
        setError('')

        /*
         * Récupérer les photos de la journée.
         */
        const votingPhotos =
          await getDayVotingPhotos(dayId)

        /*
         * Récupérer les votes déjà effectués
         * par le joueur connecté.
         */
        const existingVotes =
          await getMyVotes(dayId)

        /*
         * S'il n'y a aucune photo,
         * on affiche simplement une galerie vide.
         */
        if (votingPhotos.length === 0) {
          setPhotos([])
          setVotes({})
          return
        }

        /*
         * Récupérer le joueur connecté.
         *
         * IMPORTANT :
         * getCurrentPlayerForDay() s'occupe lui-même
         * de retrouver le room_id correspondant
         * au dayId.
         */
        const currentPlayer =
          await getCurrentPlayerForDay(dayId)

        /*
         * Générer les URLs signées des photos.
         */
        const loadedPhotos =
          await Promise.all(
            votingPhotos.map(
              async (photo) => {
                const url =
                  await getPhotoUrl(
                    photo.storage_path,
                  )

                return {
                  ...photo,
                  url,
                  isOwn:
                    photo.player_id ===
                    currentPlayer.id,
                }
              },
            ),
          )

        setPhotos(loadedPhotos)

        /*
         * Transformer les votes en dictionnaire.
         *
         * Exemple :
         *
         * {
         *   "photo-id-1": 4,
         *   "photo-id-2": 5
         * }
         */
        const voteMap: Record<
          string,
          number
        > = {}

        existingVotes.forEach((vote) => {
          voteMap[vote.photo_id] =
            vote.points
        })

        setVotes(voteMap)
      } catch (err) {
        console.error(
          'Erreur chargement votes:',
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de charger les votes.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadVoting()
  }, [dayId])

  /*
   * ============================================================
   * VOTE
   * ============================================================
   */

  async function handleVote(
    photo: DisplayVotingPhoto,
    value: number | null,
  ) {
    if (!value) {
      return
    }

    /*
     * Impossible de voter pour sa propre photo.
     */
    if (photo.isOwn) {
      return
    }

    try {
      setSavingPhotoId(photo.id)
      setError('')

      await submitVote(
        photo.id,
        value,
      )

      /*
       * Mise à jour immédiate de l'interface.
       */
      setVotes((current) => ({
        ...current,
        [photo.id]: value,
      }))
    } catch (err) {
      console.error(
        'Erreur vote:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Impossible d’enregistrer ton vote.',
      )
    } finally {
      setSavingPhotoId(null)
    }
  }

  /*
   * ============================================================
   * COMPTEUR
   * ============================================================
   */

  const votablePhotos =
    photos.filter(
      (photo) => !photo.isOwn,
    )

  const votedCount =
    votablePhotos.filter(
      (photo) =>
        votes[photo.id] !== undefined,
    ).length

  const allVotesDone =
    votablePhotos.length > 0 &&
    votedCount ===
      votablePhotos.length

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  /*
   * ============================================================
   * ERREUR
   * ============================================================
   */

  if (error && photos.length === 0) {
    return (
      <Container
        maxWidth="md"
        sx={{ py: 4 }}
      >
        <Alert severity="error">
          {error}
        </Alert>
      </Container>
    )
  }

  /*
   * ============================================================
   * INTERFACE
   * ============================================================
   */

  return (
    <>
      <Container
        maxWidth="lg"
        sx={{
          py: {
            xs: 3,
            md: 5,
          },
        }}
      >
        <Stack spacing={3}>

          <Box>
            <Typography
              variant="h4"
              fontWeight={800}
              gutterBottom
            >
              Votez pour les photos
            </Typography>

            <Typography
              color="text.secondary"
            >
              Note chaque photo des autres
              participants de 1 à 5 points
              selon le thème de la journée.
            </Typography>
          </Box>

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

          <Card>
            <CardContent>
              <Stack
                direction={{
                  xs: 'column',
                  sm: 'row',
                }}
                justifyContent="space-between"
                alignItems={{
                  xs: 'flex-start',
                  sm: 'center',
                }}
                spacing={1}
              >
                <Typography fontWeight={700}>
                  Progression
                </Typography>

                <Typography
                  color={
                    allVotesDone
                      ? 'success.main'
                      : 'text.secondary'
                  }
                  fontWeight={700}
                >
                  {votedCount} /{' '}
                  {votablePhotos.length}{' '}
                  photos notées
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          {photos.length === 0 ? (
            <Card>
              <CardContent>
                <Typography
                  color="text.secondary"
                  textAlign="center"
                >
                  Aucune photo n'est disponible
                  pour le moment.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 3,
              }}
            >
              {photos.map((photo) => {
                const vote = votes[photo.id]

                return (
                    <Card
                    key={photo.id}
                    sx={{
                        overflow: 'hidden',
                        opacity: photo.isOwn ? 0.55 : 1,
                    }}
                    >
                    {/* Image cliquable pour l'agrandir */}
                    <CardActionArea
                        disabled={false}
                        onClick={() =>
                        setSelectedPhoto(photo)
                        }
                    >
                        <CardMedia
                        component="img"
                        image={photo.url}
                        alt={`Photo de ${photo.player_name}`}
                        sx={{
                            height: {
                            xs: 240,
                            sm: 260,
                            },
                            objectFit: 'cover',
                            filter: photo.isOwn
                            ? 'grayscale(100%)'
                            : 'none',
                        }}
                        />
                    </CardActionArea>

                    <CardContent>
                        <Typography
                        fontWeight={700}
                        gutterBottom
                        >
                        {photo.isOwn ? 'Ta photo' : ''}
                        </Typography>

                        {photo.isOwn ? (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Tu ne peux pas voter pour ta
                            propre photo.
                        </Typography>
                        ) : (
                        <Stack spacing={1}>
                            <Typography
                            variant="body2"
                            color="text.secondary"
                            >
                            Ta note
                            </Typography>

                            <Rating
                            value={vote ?? null}
                            max={5}
                            precision={1}
                            size="large"
                            onChange={(
                                _event,
                                value,
                            ) => {
                                if (value !== null) {
                                handleVote(
                                    photo,
                                    value,
                                )
                                }
                            }}
                            disabled={
                                savingPhotoId ===
                                photo.id
                            }
                            sx={{
                                fontSize: '2rem',

                                '& .MuiRating-icon': {
                                flexShrink: 0,
                                },
                            }}
                            />

                            {savingPhotoId ===
                            photo.id && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                Enregistrement...
                            </Typography>
                            )}
                        </Stack>
                        )}
                    </CardContent>
                    </Card>
                )
                })}
            </Box>
          )}

          {allVotesDone && (
            <Alert severity="success">
              Tous tes votes sont enregistrés.
            </Alert>
          )}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Button
              variant="outlined"
              onClick={() =>
                navigate(-1)
              }
            >
              Retour
            </Button>
          </Box>

        </Stack>
      </Container>

      {/*
       * =========================================================
       * PHOTO AGRANDIE
       * =========================================================
       */}

      <Dialog
        open={Boolean(selectedPhoto)}
        onClose={() =>
          setSelectedPhoto(null)
        }
        maxWidth="lg"
        fullWidth
      >

        <DialogTitle>
        {selectedPhoto?.isOwn
            ? 'Ta photo'
            : 'Photo'}

        <IconButton
            onClick={() =>
            setSelectedPhoto(null)
            }
            sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            }}
        >
            <CloseIcon />
        </IconButton>
        </DialogTitle>

        <DialogContent>
          {selectedPhoto && (
            <Stack spacing={3}>
              <Box
                component="img"
                src={selectedPhoto.url}
                alt=""
                sx={{
                  width: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                }}
              />

              {!selectedPhoto.isOwn && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent:
                      'center',
                  }}
                >
                  <Rating
                    value={
                        votes[selectedPhoto.id] ??
                        null
                    }
                    max={5}
                    precision={1}
                    size="large"
                    onChange={(
                        _event,
                        value,
                    ) => {
                        if (value !== null) {
                        handleVote(
                            selectedPhoto,
                            value,
                        )
                        }
                    }}
                    disabled={
                        savingPhotoId ===
                        selectedPhoto.id
                    }
                    sx={{
                        fontSize: '2rem',
                    }}
                    />
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}