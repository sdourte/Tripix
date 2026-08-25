import { supabase } from '../lib/supabase'

/**
 * Crée un compte avec une adresse email
 * et un mot de passe.
 */
export async function signUp(
  email: string,
  password: string,
) {
  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
    })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Connecte un utilisateur existant.
 */
export async function signIn(
  email: string,
  password: string,
) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Déconnecte l'utilisateur actuel.
 */
export async function signOut() {
  const { error } =
    await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Récupère l'utilisateur actuellement connecté.
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    throw new Error(
      'Impossible de récupérer ton compte.',
    )
  }

  return user
}