import {
  useEffect,
  useState,
} from 'react'

import {
  Alert,
  Box,
  Card,
  CardContent,
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
  getFinalRoomRanking,
  getRoomByCode,
  type FinalPlayerRanking,
  type Room,
} from '../services/roomService'

export default function FinalRankingPage() {
  const { code } = useParams<{
    code: string
  }>()

  const navigate = useNavigate()

  const [room, setRoom] =
    useState<Room | null>(null)

  const [ranking, setRanking] =
    useState<FinalPlayerRanking[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    async function loadRanking() {
      if (!code) {
        setError('Salle invalide.')
        setLoading(false)
        return
      }

      try {
        const roomData =
          await getRoomByCode(code)

        const rankingData =
          await getFinalRoomRanking(
            roomData.id,
          )

        setRoom(roomData)
        setRanking(rankingData)
      } catch (err) {
        console.error(
          'Erreur classement final:',
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : 'Impossible de charger le classement.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadRanking()
  }, [code])

  /*
   * Actualisation régulière afin que le classement
   * reste à jour lorsqu'une nouvelle journée
   * est terminée par l'admin.
   */
  useEffect(() => {
    if (!room) {
      return
    }

    const interval =
      window.setInterval(
        async () => {
          try {
            const rankingData =
              await getFinalRoomRanking(
                room.id,
              )

            setRanking(rankingData)
          } catch (err) {
            console.error(
              'Erreur actualisation classement:',
              err,
            )
          }
        },
        3000,
      )

    return () => {
      window.clearInterval(interval)
    }
  }, [room?.id])

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

  if (error || !room) {
    return (
      <Container
        maxWidth="md"
        sx={{ py: 5 }}
      >
        <Alert severity="error">
          {error ||
            'Impossible de charger la salle.'}
        </Alert>
      </Container>
    )
  }

  return (
    <Container
      maxWidth="md"
      sx={{
        py: {
          xs: 3,
          md: 6,
        },
      }}
    >
      <Stack spacing={4}>

        <Box textAlign="center">
          <EmojiEventsIcon
            sx={{
              fontSize: 60,
            }}
          />

          <Typography
            variant="h3"
            fontWeight={800}
          >
            Classement final
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            {room.name}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Seules les journées terminées
            sont comptabilisées.
          </Typography>
        </Box>

        <Card>
          <CardContent>
            <Stack spacing={2}>

              {ranking.map(
                (player, index) => (
                  <Box
                    key={player.player_id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent:
                        'space-between',
                      gap: 2,
                      p: 2,
                      borderRadius: 2,
                      backgroundColor:
                        index < 3
                          ? 'action.hover'
                          : 'transparent',
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                    >
                      <Typography
                        variant="h5"
                        fontWeight={800}
                        sx={{
                          minWidth: 45,
                        }}
                      >
                        {index === 0
                          ? '🥇'
                          : index === 1
                            ? '🥈'
                            : index === 2
                              ? '🥉'
                              : index + 1}
                      </Typography>

                      <Typography
                        variant="h6"
                        fontWeight={
                          index < 3
                            ? 800
                            : 600
                        }
                      >
                        {player.player_name}
                      </Typography>
                    </Stack>

                    <Typography
                      variant="h6"
                      fontWeight={800}
                    >
                      {player.total_points}{' '}
                      pts
                    </Typography>
                  </Box>
                ),
              )}

            </Stack>
          </CardContent>
        </Card>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Typography
            component="button"
            onClick={() => navigate(-1)}
            sx={{
              border: 0,
              background: 'none',
              cursor: 'pointer',
              color: 'text.secondary',
              font: 'inherit',
            }}
          >
            Retour
          </Typography>
        </Box>

      </Stack>
    </Container>
  )
}