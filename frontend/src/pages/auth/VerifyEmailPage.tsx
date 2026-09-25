import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * VerifyEmailPage - OTP Verification Bypassed
 *
 * For the college demonstration, email verification and OTP prompts
 * have been decommissioned. Any direct navigation to /verify-email
 * is immediately redirected to /login.
 */
export default function VerifyEmailPage() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/login', { replace: true })
  }, [navigate])

  return null
}
