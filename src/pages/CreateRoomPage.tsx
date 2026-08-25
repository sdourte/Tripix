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
import { createRoom } from '../services/roomService'

export default function CreateRoomPage() {
  const navigate = useNavigate()

  const [roomName, setRoomName] = useState('')
  const [playerName, setPlayerName] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    setError('')

    if (!roomName.trim() || !playerName.trim()) {
      setError('Tous les champs sont obligatoires.')
      return
    }

    try {
      setLoading(true)

      const room = await createRoom(
        roomName.trim(),
        playerName.trim(),
      )

      navigate(`/room/${room.code}`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue.',
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
            Créer une salle
          </Typography>

          <Typography color="text.secondary">
            Configure ta partie Tripix.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        <TextField
          label="Nom de la salle"
          placeholder="Voyage en Italie 2026"
          value={roomName}
          onChange={(event) => setRoomName(event.target.value)}
          fullWidth
          required
        />

        <TextField
          label="Ton pseudo"
          placeholder="Simon"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          fullWidth
          required
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
        >
          {loading ? 'Création...' : 'Créer la salle'}
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