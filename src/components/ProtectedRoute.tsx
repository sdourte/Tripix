import { ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  CircularProgress,
  Container,
} from '@mui/material'
import { supabase } from '../lib/supabase'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] =
    useState(false)

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setAuthenticated(!!session)
      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <Container
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Container>
    )
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}