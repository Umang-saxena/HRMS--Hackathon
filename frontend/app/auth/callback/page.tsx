'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const errorParam = searchParams.get('error')

      if (errorParam) {
        setError(`Authentication error: ${errorParam}`)
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          setError(`Failed to get session: ${error.message}`)
        } else if (data.session) {
          // Successfully authenticated, redirect to home
          router.push('/')
        } else {
          setError('No session found')
        }
      } catch (err) {
        setError('An unexpected error occurred')
      }

      setLoading(false)
    }

    handleAuthCallback()
  }, [searchParams, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-lg">Completing authentication...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Failed</h1>
                    <p className="text-gray-600">{error}</p>
                    <button
                        onClick={() => router.push('/login')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    return null
}
