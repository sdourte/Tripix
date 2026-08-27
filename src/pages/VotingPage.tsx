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
  LinearProgress,
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
  getVotingProgress,
  type VotingPhoto,
} from '../services/roomService'

interface DisplayVotingPhoto
  extends VotingPhoto {
  url: string
  isOwn: boolean
}

/*
 * Progression globale du vote.
 *
 * Cette interface est volontairement définie ici
 * afin de ne pas dépendre d'un type exporté
 * supplémentaire dans roomService.
 */
interface VotingProgress {
  total_players: number
  completed_players: number
  all_votes_completed: boolean
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

  const [votingProgress, setVotingProgress] =
    useState<VotingProgress | null>(null)

  /*
   * ============================================================
   * CHARGEMENT INITIAL
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
        setLoading(true)
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
         * Récupérer la progression globale.
         */
        const progress =
          await getVotingProgress(dayId)

        setVotingProgress(progress)

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
   * ACTUALISATION DE LA PROGRESSION
   * ============================================================
   *
   * On vérifie régulièrement si les autres participants
   * ont terminé leur vote.
   *
   * Cela permet notamment de voir automatiquement
   * quand tout le monde a terminé sans devoir recharger
   * manuellement la page.
   */

  useEffect(() => {
    if (!dayId) {
      return
    }

    let cancelled = false

    async function refreshProgress() {
      try {
        const progress =
          await getVotingProgress(dayId)

        if (!cancelled) {
          setVotingProgress(progress)
        }
      } catch (err) {
        console.error(
          'Erreur actualisation progression:',
          err,
        )
      }
    }

    /*
     * Première vérification immédiate.
     */
    refreshProgress()

    /*
     * Puis vérification régulière.
     */
    const intervalId =
      window.setInterval(
        refreshProgress,
        3000,
      )

    return () => {
      cancelled = true
      window.clearInterval(
        intervalId,
      )
    }
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

    if (!dayId) {
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

      /*
       * Recharger immédiatement la progression
       * après le vote.
       */
      const progress =
        await getVotingProgress(dayId)

      setVotingProgress(progress)
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
   * COMPTEURS
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

  const personalProgress =
    votablePhotos.length > 0
      ? (votedCount /
          votablePhotos.length) *
        100
      : 0

  const globalProgress =
    votingProgress &&
    votingProgress.total_players > 0
      ? (votingProgress.completed_players /
          votingProgress.total_players) *
        100
      : 0

  const everyoneFinished =
    votingProgress?.all_votes_completed === true

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
   * ERREUR BLOQUANTE
   * ============================================================
   */

  if (
    error &&
    photos.length === 0
  ) {
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

          {/* ==================================================
              TITRE
              ================================================== */}

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

          {/* ==================================================
              ERREUR
              ================================================== */}

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

          {/* ==================================================
              PROGRESSION PERSONNELLE
              ================================================== */}

          <Card>
            <CardContent>
              <Stack spacing={2}>

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
                    Ta progression
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

                <LinearProgress
                  variant="determinate"
                  value={personalProgress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                  }}
                />

                {allVotesDone && (
                  <Alert
                    severity="success"
                  >
                    Tous tes votes sont
                    enregistrés.
                  </Alert>
                )}

              </Stack>
            </CardContent>
          </Card>

          {/* ==================================================
              PROGRESSION GLOBALE
              ================================================== */}

          {votingProgress && (
            <Card>
              <CardContent>
                <Stack spacing={2}>

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
                      Progression des participants
                    </Typography>

                    <Typography
                      color={
                        everyoneFinished
                          ? 'success.main'
                          : 'text.secondary'
                      }
                      fontWeight={700}
                    >
                      {
                        votingProgress.completed_players
                      }{' '}
                      /{' '}
                      {
                        votingProgress.total_players
                      }{' '}
                      participants
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={globalProgress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                    }}
                  />

                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {everyoneFinished
                      ? 'Tous les participants ont terminé leur vote.'
                      : 'En attente des autres participants...'}
                  </Typography>

                </Stack>
              </CardContent>
            </Card>
          )}

          {/* ==================================================
              MESSAGE FIN DU VOTE
              ================================================== */}

          {everyoneFinished && (
            <Card
              sx={{
                border: '2px solid',
                borderColor:
                  'success.main',
              }}
            >
              <CardContent>
                <Stack
                  spacing={2}
                  alignItems="center"
                  textAlign="center"
                >
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    color="success.main"
                  >
                    Le vote est terminé
                  </Typography>

                  <Typography
                    color="text.secondary"
                  >
                    Tous les participants ont
                    enregistré leurs votes.
                    L'administrateur doit
                    maintenant terminer la
                    journée pour clôturer les
                    résultats.
                  </Typography>

                </Stack>
              </CardContent>
            </Card>
          )}

          {/* ==================================================
              GALERIE
              ================================================== */}

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
                const vote =
                  votes[photo.id]

                return (
                  <Card
                    key={photo.id}
                    sx={{
                      overflow: 'hidden',
                      opacity:
                        photo.isOwn
                          ? 0.55
                          : 1,
                    }}
                  >

                    {/* IMAGE CLIQUABLE */}

                    <CardActionArea
                      onClick={() =>
                        setSelectedPhoto(
                          photo,
                        )
                      }
                    >
                      <CardMedia
                        component="img"
                        image={photo.url}
                        alt=""
                        sx={{
                          height: {
                            xs: 240,
                            sm: 260,
                          },
                          objectFit:
                            'cover',
                          filter:
                            photo.isOwn
                              ? 'grayscale(100%)'
                              : 'none',
                        }}
                      />
                    </CardActionArea>

                    <CardContent>

                      {/* NOM UNIQUEMENT POUR SA PROPRE PHOTO */}

                      {photo.isOwn && (
                        <Typography
                          fontWeight={700}
                          gutterBottom
                        >
                          Ta photo
                        </Typography>
                      )}

                      {photo.isOwn ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          Tu ne peux pas voter
                          pour ta propre photo.
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
                            value={
                              vote ?? null
                            }
                            max={5}
                            precision={1}
                            size="large"
                            onChange={(
                              _event,
                              value,
                            ) => {
                              if (
                                value !== null
                              ) {
                                handleVote(
                                  photo,
                                  value,
                                )
                              }
                            }}
                            disabled={
                              savingPhotoId ===
                                photo.id ||
                              everyoneFinished
                            }
                            sx={{
                              fontSize:
                                '2rem',
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

          {/* ==================================================
              MESSAGE FIN PERSONNELLE
              ================================================== */}

          {allVotesDone &&
            !everyoneFinished && (
              <Alert severity="success">
                Tous tes votes sont enregistrés.
                Tu peux encore modifier tes notes
                pendant que le vote reste ouvert.
              </Alert>
            )}

          {/* ==================================================
              RETOUR
              ================================================== */}

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

      {/* ========================================================
          PHOTO AGRANDIE
          ======================================================== */}

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
                    justifyContent: 'center',
                  }}
                >
                  <Rating
                    value={
                      votes[
                        selectedPhoto.id
                      ] ?? null
                    }
                    max={5}
                    precision={1}
                    size="large"
                    onChange={(
                      _event,
                      value,
                    ) => {
                      if (
                        value !== null
                      ) {
                        handleVote(
                          selectedPhoto,
                          value,
                        )
                      }
                    }}
                    disabled={
                      savingPhotoId ===
                        selectedPhoto.id ||
                      everyoneFinished
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