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
import { signUp } from '../services/authService'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] =
    useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (password.length < 6) {
      setError(
        'Le mot de passe doit contenir au moins 6 caractères.',
      )
      return
    }

    if (password !== confirmPassword) {
      setError(
        'Les mots de passe ne correspondent pas.',
      )
      return
    }

    try {
      setLoading(true)

      const data = await signUp(
        email.trim(),
        password,
      )

      if (data.session) {
        navigate('/dashboard')
      } else {
        setSuccess(
          'Compte créé. Vérifie ton adresse email pour pouvoir te connecter.',
        )
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossible de créer le compte.',
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
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
            }}
          >
            Créer un compte
          </Typography>

          <Typography color="text.secondary">
            Crée ton compte Tripix pour retrouver tes
            salles et tes parties.
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success">
            {success}
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

        <TextField
          label="Confirmer le mot de passe"
          type="password"
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(event.target.value)
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
            ? 'Création...'
            : 'Créer mon compte'}
        </Button>

        <Button
          variant="text"
          onClick={() =>
            navigate('/login')
          }
          disabled={loading}
        >
          J'ai déjà un compte
        </Button>

        <Button
          variant="text"
          onClick={() =>
            navigate('/')
          }
          disabled={loading}
        >
          Retour
        </Button>
      </Stack>
    </Container>
  )
}