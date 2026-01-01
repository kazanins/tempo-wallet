'use client'

import React from 'react'

interface AuthScreenProps {
  onSignUp: () => void
  onSignIn: () => void
  isPending: boolean
}

export function AuthScreen({ onSignUp, onSignIn, isPending }: AuthScreenProps) {
  return (
    <div className="flex flex-col h-full bg-[#E6F0FF] px-8">
      {/* Logo/Brand area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-6 h-24 w-24">
            <svg
              viewBox="0 0 96 96"
              className="h-full w-full"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0B0B0B" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
              <circle cx="48" cy="48" r="40" fill="url(#logoGradient)" />
              <path
                d="M26 56c8-14 20-22 34-24"
                fill="none"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <path
                d="M38 64c7-8 17-13 30-14"
                fill="none"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
                opacity="0.7"
              />
              <circle cx="66" cy="30" r="5" fill="white" />
            </svg>
          </div>
          <p className="text-black/70 text-lg">Sign in with passkey</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="w-full space-y-3 mb-12">
        <button
          onClick={onSignUp}
          disabled={isPending}
          className="w-full py-4 bg-black text-white font-bold text-lg rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Processing...' : 'Sign Up'}
        </button>

        <button
          onClick={onSignIn}
          disabled={isPending}
          className="w-full py-4 bg-white text-black font-bold text-lg rounded-full border-2 border-black/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Processing...' : 'Sign In'}
        </button>
      </div>
    </div>
  )
}
