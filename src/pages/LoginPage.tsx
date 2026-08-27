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
import { signIn } from '../services/authService'

export default function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    setError('')

    try {
      setLoading(true)

      await signIn(
        email.trim(),
        password,
      )

      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de se connecter.',
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
        justifyContent: 'center',
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
            Se connecter
          </Typography>

          <Typography color="text.secondary">
            Connecte-toi à ton compte Tripix.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        <TextField
          label="Adresse email"
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          fullWidth
          required
        />

        <TextField
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
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
          {loading
            ? 'Connexion...'
            : 'Se connecter'}
        </Button>

        <Button
          variant="text"
          onClick={() => navigate('/register')}
          disabled={loading}
        >
          Créer un compte
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