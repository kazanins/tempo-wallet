'use client'

import React, { useEffect, useState } from 'react'

interface PayScreenProps {
  onBack: () => void
  onSend: (recipient: string, amount: string, memo: string) => Promise<string | null>
  isPending: boolean
  explorerBaseUrl?: string
  balance: string
}

type PayStep = 'amount' | 'details'

export function PayScreen({ onBack, onSend, isPending, explorerBaseUrl, balance }: PayScreenProps) {
  const [step, setStep] = useState<PayStep>('amount')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [memo, setMemo] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const numericAmount = amount ? Number(amount) : 0
  const numericBalance = Number(balance.replace(/,/g, ''))
  const hasInsufficientFunds = Number.isFinite(numericBalance) && numericAmount > numericBalance
  const formattedAmount = amount
    ? Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : '0'
  const amountSizeClass =
    formattedAmount.length <= 6 ? 'text-7xl' :
    formattedAmount.length <= 9 ? 'text-6xl' :
    formattedAmount.length <= 12 ? 'text-5xl' :
    formattedAmount.length <= 15 ? 'text-4xl' :
    'text-3xl'

  const handleAmountSubmit = () => {
    if (amount && parseFloat(amount) > 0 && !hasInsufficientFunds) {
      setStep('details')
    }
  }

  const handleConfirm = async () => {
    try {
      const hash = await onSend(recipient, amount, memo)
      setTxHash(hash)
      setShowSuccess(true)
    } catch (error) {
      console.error('Payment error:', error)
    }
  }

  const handleCloseSuccess = () => {
    setShowSuccess(false)
    setStep('amount')
    setAmount('')
    setRecipient('')
    setMemo('')
    setTxHash(null)
    onBack()
  }

  const handleNumberClick = (num: string) => {
    if (num === '.' && amount.includes('.')) return
    if (amount.split('.')[1]?.length >= 2 && num !== '←') return
    setAmount(prev => prev + num)
  }

  const handleBackspace = () => {
    setAmount(prev => prev.slice(0, -1))
  }

  useEffect(() => {
    if (step !== 'amount') return

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()
        setAmount(prev => prev.slice(0, -1))
        return
      }

      if (event.key === 'Enter') {
        if (amount && parseFloat(amount) > 0 && !hasInsufficientFunds) {
          setStep('details')
        }
        return
      }

      if (event.key === '.' || (event.key >= '0' && event.key <= '9')) {
        setAmount(prev => {
          if (event.key === '.' && prev.includes('.')) return prev
          if (prev.split('.')[1]?.length >= 2) return prev
          return prev + event.key
        })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [amount, hasInsufficientFunds, step])

  // Success screen
  if (showSuccess) {
    return (
      <div className="flex flex-col h-full bg-[#E6F0FF]">
        {/* Header */}
        <div className="pt-8 px-6 pb-4">
          <div className="flex items-center justify-between mb-6">
            <button onClick={handleCloseSuccess} className="text-black text-3xl font-light w-8 h-8 flex items-center justify-center">
              ×
            </button>
          <div className="text-black font-semibold text-base"></div>
            <div className="w-8"></div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Success icon */}
          <div className="w-20 h-20 bg-[#4D9FFF] rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-black mb-2">Money sent</h1>
          <p className="text-black/60 text-base mb-6">
            {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </p>

          {/* Amount */}
          <div className="text-5xl font-bold text-black mb-8">
            ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          {/* Details */}
          <div className="w-full bg-white/80 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Transfer amount</span>
              <span className="text-black font-semibold">${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Fees</span>
              <span className="text-black font-semibold">$0.00</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <span className="text-gray-900 font-semibold">Total sent</span>
              <span className="text-black font-bold">${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-black/60 min-h-[20px]">
            {memo ? `For: ${memo}` : ''}
          </div>
          {txHash && explorerBaseUrl && (
            <div className="mt-3 text-center">
              <a
                href={`${explorerBaseUrl}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-black text-sm font-semibold underline underline-offset-4"
              >
                View on Tempo Explorer
              </a>
            </div>
          )}
        </div>

        {/* Close button at bottom */}
        <div className="px-6 pb-6">
          <button
            onClick={handleCloseSuccess}
            className="w-full py-3 bg-black text-white font-bold text-base rounded-full shadow-lg"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#E6F0FF] relative">
      {/* Header */}
      <div className="pt-12 px-6 pb-8">
        <div className="flex items-center justify-between mb-12">
          <button onClick={onBack} className="text-black text-3xl font-light w-8 h-8 flex items-center justify-center">
            ×
          </button>
          <div className="text-black font-semibold text-base"></div>
          <div className="w-8"></div>
        </div>

        {/* Amount Display */}
        {step === 'amount' && (
          <div className="mb-8">
            <div
              className={`text-black font-bold tracking-tight mb-1 whitespace-nowrap overflow-hidden text-left ${amountSizeClass}`}
            >
              ${formattedAmount}
            </div>
            <div className="mt-2 min-h-[20px] text-left text-sm font-semibold text-red-600">
              {hasInsufficientFunds ? 'Insufficient funds' : ''}
            </div>
          </div>
        )}

        {/* Details Input - Combined Recipient and Memo */}
        {step === 'details' && (
          <div className="mb-2 space-y-6">
            <div
              className={`text-black font-bold tracking-tight mb-1 whitespace-nowrap overflow-hidden text-left ${amountSizeClass}`}
            >
              ${formattedAmount}
            </div>

            <div>
              <div className="text-black text-base font-medium mb-2">To</div>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter wallet address"
                className="w-full bg-white/20 text-black placeholder-black/40 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black/20"
                autoFocus
              />
            </div>

            <div>
              <div className="text-black text-base font-medium mb-2">For</div>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="What's it for? (optional)"
                maxLength={32}
                className="w-full bg-white/20 text-black placeholder-black/40 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black/20"
              />
              <div className="text-black/50 text-xs mt-2">{memo.length}/32 characters</div>
            </div>
          </div>
        )}

        {isPending && (
          <div className="mt-4 flex items-center justify-center gap-3 text-black/60 text-sm">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/60" />
            Waiting for approval...
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-start pb-28 px-6">
        {/* Number Pad */}
        {step === 'amount' && (
          <>
            <div className="mt-2 w-[84%] mx-auto grid grid-cols-3 gap-1 mb-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←'].map((key) => (
                <button
                  key={key}
                  onClick={() => key === '←' ? handleBackspace() : handleNumberClick(key)}
                  className="aspect-square bg-white/30 rounded-lg text-black text-sm font-semibold hover:bg-white/40 transition-colors flex items-center justify-center"
                >
                  {key === '←' ? '⌫' : key}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-6 left-6 right-6">
        {step === 'amount' && (
          <button
            onClick={handleAmountSubmit}
            disabled={!amount || parseFloat(amount) <= 0 || hasInsufficientFunds}
            className="w-full py-3 bg-black text-white font-bold text-base rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            Continue
          </button>
        )}
        {step === 'details' && (
          <button
            onClick={handleConfirm}
            disabled={!recipient || !recipient.startsWith('0x') || recipient.length !== 42 || isPending}
            className="w-full py-3 bg-black text-white font-bold text-base rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {isPending ? 'Processing...' : 'Send Payment'}
          </button>
        )}
      </div>
    </div>
  )
}
