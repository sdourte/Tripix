import { FormEvent, useState } from 'react'
import {
  Alert,
  Button,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { joinRoom } from '../services/roomService'

export default function JoinRoomPage() {
  const navigate = useNavigate()

  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    setError('')

    if (!roomCode.trim() || !playerName.trim()) {
      setError('Tous les champs sont obligatoires.')
      return
    }

    try {
      setLoading(true)

      await joinRoom(
        roomCode.trim(),
        playerName.trim(),
      )

      navigate(`/room/${roomCode.trim().toUpperCase()}`)

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de rejoindre la salle.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container
      maxWidth="sm"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Stack
        component="form"
        onSubmit={handleSubmit}
        spacing={3}
        width="100%"
      >
        <Stack spacing={1}>
          <Typography variant="h4" fontWeight={700}>
            Rejoindre une salle
          </Typography>

          <Typography color="text.secondary">
            Entre le code donné par l'administrateur.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        <TextField
          label="Code de la salle"
          placeholder="ABC123"
          value={roomCode}
          onChange={(event) =>
            setRoomCode(event.target.value.toUpperCase())
          }
          fullWidth
          required
          slotProps={{
            htmlInput: {
              maxLength: 6,
            },
          }}
        />

        <TextField
          label="Ton pseudo"
          placeholder="Alice"
          value={playerName}
          onChange={(event) =>
            setPlayerName(event.target.value)
          }
          fullWidth
          required
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
        >
          {loading ? 'Connexion...' : 'Rejoindre la salle'}
        </Button>

        <Button
          variant="text"
          onClick={() => navigate('/')}
          disabled={loading}
        >
          Retour
        </Button>
      </Stack>
    </Container>
  )
}