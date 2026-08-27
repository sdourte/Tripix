import {
  useEffect,
  useState,
} from 'react'

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material'

import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  finishDayVoting,
  getCurrentPlayer,
  getDay,
  getDayResults,
  getPhotoUrl,
  getRoomById,
  type Day,
  type DayResult,
  type Player,
  type Room,
} from '../services/roomService'

interface DisplayResult
  extends DayResult {
  url: string
}

export default function ResultsPage() {
  const { dayId } =
    useParams<{
      dayId: string
    }>()

  const navigate = useNavigate()

  const [day, setDay] =
    useState<Day | null>(null)

  const [room, setRoom] =
    useState<Room | null>(null)

  const [player, setPlayer] =
    useState<Player | null>(null)

  const [results, setResults] =
    useState<DisplayResult[]>([])

  const [loading, setLoading] =
    useState(true)

  const [finishing, setFinishing] =
    useState(false)

  const [error, setError] =
    useState('')

  /*
   * ============================================================
   * CHARGEMENT
   * ============================================================
   */

  useEffect(() => {
    async function loadResults() {
      if (!dayId) {
        setError('Journée invalide.')
        setLoading(false)
        return
      }

      try {
        setError('')

        /*
         * Journée
         */
        const dayData =
          await getDay(dayId)

        /*
         * Salle
         */
        const roomData =
          await getRoomById(
            dayData.room_id,
          )

        /*
         * Joueur connecté
         */
        const playerData =
          await getCurrentPlayer(
            roomData.id,
          )

        /*
         * Résultats
         */
        const resultData =
          await getDayResults(dayId)

        /*
         * URLs des photos
         */
        const displayResults =
          await Promise.all(
            resultData.map(
              async (result) => {
                const url =
                  await getPhotoUrl(
                    result.storage_path,
                  )

                return {
                  ...result,
                  url,
                }
              },
            ),
          )

        setDay(dayData)
        setRoom(roomData)
        setPlayer(playerData)
        setResults(
          displayResults,
        )
      } catch (err) {
        console.error(
          'Erreur chargement résultats:',
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de charger les résultats.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [dayId])

  /*
   * ============================================================
   * TERMINER LA JOURNÉE
   * ============================================================
   */

  async function handleFinishDay() {
    if (!dayId) {
      return
    }

    try {
      setFinishing(true)
      setError('')

      await finishDayVoting(
        dayId,
      )

      /*
       * Retour à la page précédente.
       */
      navigate(-1)
    } catch (err) {
      console.error(
        'Erreur fin journée:',
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de terminer la journée.',
      )
    } finally {
      setFinishing(false)
    }
  }

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

  if (
    error &&
    results.length === 0
  ) {
    return (
      <Container
        maxWidth="md"
        sx={{ py: 5 }}
      >
        <Stack spacing={3}>
          <Alert severity="error">
            {error}
          </Alert>

          <Button
            variant="outlined"
            onClick={() =>
              navigate(-1)
            }
          >
            Retour
          </Button>
        </Stack>
      </Container>
    )
  }

  if (
    !day ||
    !room ||
    !player
  ) {
    return (
      <Container
        maxWidth="md"
        sx={{ py: 5 }}
      >
        <Alert severity="error">
          Impossible de charger les
          résultats.
        </Alert>
      </Container>
    )
  }

  const isAdmin =
    room.admin_id ===
    player.user_id

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: {
          xs: 3,
          md: 5,
        },
      }}
    >
      <Stack spacing={4}>

        {/* HEADER */}
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
          >
            {room.name}
          </Typography>

          <Typography
            variant="h3"
            fontWeight={800}
            sx={{ mt: 1 }}
          >
            Résultats
          </Typography>

          <Typography
            variant="h5"
            sx={{ mt: 1 }}
          >
            Jour {day.day_number}
          </Typography>

          {day.theme && (
            <Typography
              color="text.secondary"
              sx={{ mt: 1 }}
            >
              Thème : {day.theme}
            </Typography>
          )}
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

        {/* MESSAGE */}
        <Alert severity="success">
          Tous les participants ont
          terminé leur vote.
        </Alert>

        {/* RESULTATS */}
        <Stack spacing={3}>

          {results.map(
            (result, index) => {
              const rank =
                index + 1

              const isWinner =
                rank === 1

              return (
                <Card
                  key={result.photo_id}
                  sx={{
                    overflow: 'hidden',
                    border:
                      isWinner
                        ? '2px solid'
                        : undefined,
                    borderColor:
                      isWinner
                        ? 'warning.main'
                        : undefined,
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        md:
                          'minmax(280px, 420px) 1fr',
                      },
                    }}
                  >

                    {/* PHOTO */}
                    <CardMedia
                      component="img"
                      image={result.url}
                      alt=""
                      sx={{
                        width: '100%',
                        height: {
                          xs: 280,
                          md: 320,
                        },
                        objectFit: 'cover',
                      }}
                    />

                    {/* INFOS */}
                    <CardContent
                      sx={{
                        p: {
                          xs: 3,
                          md: 4,
                        },
                        display: 'flex',
                        alignItems:
                          'center',
                      }}
                    >
                      <Stack
                        spacing={2}
                        sx={{
                          width: '100%',
                        }}
                      >

                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                        >
                          {isWinner && (
                            <EmojiEventsIcon
                              sx={{
                                fontSize: 42,
                                color:
                                  'warning.main',
                              }}
                            />
                          )}

                          <Typography
                            variant="h4"
                            fontWeight={800}
                          >
                            {rank}
                            <Typography
                              component="span"
                              variant="h6"
                              color="text.secondary"
                              sx={{ ml: 1 }}
                            >
                              {rank === 1
                                ? 'ère place'
                                : rank === 2
                                  ? 'ème place'
                                  : 'ème place'}
                            </Typography>
                          </Typography>
                        </Stack>

                        <Typography
                          variant="h5"
                          fontWeight={700}
                        >
                          {result.player_name}
                        </Typography>

                        <Stack
                          direction={{
                            xs: 'column',
                            sm: 'row',
                          }}
                          spacing={2}
                        >
                          <Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              Points
                            </Typography>

                            <Typography
                              variant="h4"
                              fontWeight={800}
                            >
                              {
                                result.total_points
                              }
                            </Typography>
                          </Box>

                          <Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              Moyenne
                            </Typography>

                            <Typography
                              variant="h4"
                              fontWeight={800}
                            >
                              {
                                result.average_points.toFixed(
                                  2,
                                )
                              } / 5
                            </Typography>
                          </Box>

                          <Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              Votes
                            </Typography>

                            <Typography
                              variant="h4"
                              fontWeight={800}
                            >
                              {
                                result.vote_count
                              }
                            </Typography>
                          </Box>
                        </Stack>

                      </Stack>
                    </CardContent>
                  </Box>
                </Card>
              )
            },
          )}

        </Stack>

        {/* ACTIONS */}
        <Stack
          direction={{
            xs: 'column',
            sm: 'row',
          }}
          spacing={2}
          justifyContent="center"
        >
          <Button
            variant="outlined"
            onClick={() =>
              navigate(-1)
            }
          >
            Retour aux votes
          </Button>

          {isAdmin && (
            <Button
              variant="contained"
              color="success"
              disabled={finishing}
              onClick={
                handleFinishDay
              }
            >
              {finishing
                ? 'Finalisation...'
                : 'Terminer la journée'}
            </Button>
          )}
        </Stack>

      </Stack>
    </Container>
  )
}