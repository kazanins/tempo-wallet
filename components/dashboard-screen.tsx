'use client'

import React, { useState } from 'react'
import { PayScreen } from './pay-screen'

interface Transaction {
  id: string
  type: 'sent' | 'received'
  amount: string
  address: string
  timestamp: string
}

interface DashboardScreenProps {
  address: string
  balance: string
  transactions: Transaction[]
  onSignOut: () => void
  onSendPayment: (recipient: string, amount: string, memo: string) => Promise<string | null>
  isPaymentPending: boolean
  explorerBaseUrl?: string
}

export function DashboardScreen({ address, balance, transactions, onSignOut, onSendPayment, isPaymentPending, explorerBaseUrl }: DashboardScreenProps) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'pay' | 'discover' | 'settings'>('home')
  const [showPayScreen, setShowPayScreen] = useState(false)

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleSendPayment = async (recipient: string, amount: string, memo: string) => {
    return onSendPayment(recipient, amount, memo)
    // Don't close the pay screen immediately - let the success screen show first
  }

  if (showPayScreen) {
    return (
      <PayScreen
        onBack={() => {
          setShowPayScreen(false)
          setActiveTab('home')
        }}
        onSend={handleSendPayment}
        isPending={isPaymentPending}
        explorerBaseUrl={explorerBaseUrl}
        balance={balance}
      />
    )
  }

  return (
    <div className="flex flex-col h-full relative bg-[#E6F0FF]">
      {/* Header */}
      <div className="pt-12 px-6 pb-8">
        <div className="flex justify-between items-center mb-12">
          <div className="w-8 h-8 bg-black/10 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <button
            onClick={onSignOut}
            className="text-black/70 text-sm font-medium"
          >
            Sign Out
          </button>
        </div>

        {/* Balance */}
        <div className="mb-8">
          <div
            className={`text-black font-bold tracking-tight mb-1 whitespace-nowrap overflow-hidden ${
              balance.length <= 6 ? 'text-7xl' :
              balance.length <= 9 ? 'text-6xl' :
              balance.length <= 12 ? 'text-5xl' :
              balance.length <= 15 ? 'text-4xl' :
              'text-3xl'
            }`}
          >
            ${balance}
          </div>
          <button
            onClick={handleCopyAddress}
            className="flex items-center space-x-2 text-black/70 text-sm mt-4"
          >
            <span className="font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
            {copied ? (
              <svg className="w-4 h-4 animate-scale-check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex-1 bg-white rounded-t-3xl px-4 pb-24 overflow-y-auto">
        <div className="pt-6 pb-4">
          <h2 className="text-xl font-bold text-black">Activity</h2>
        </div>

        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No activity yet
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 border-b border-gray-100"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">{tx.type === 'received' ? '↓' : '↑'}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-black text-base">
                      {tx.type === 'received' ? 'Payment Received' : 'Payment Sent'}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {tx.address.slice(0, 6)}...{tx.address.slice(-4)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-base ${tx.type === 'received' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'received' ? '+' : '−'}${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500">{tx.timestamp.split(',')[0]}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white px-2 py-2">
        <div className="flex items-center justify-around">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-all ${
              activeTab === 'home' ? 'bg-gray-100' : ''
            }`}
          >
            <svg className="w-7 h-7 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            <span className="text-[10px] font-semibold text-black mt-1">Home</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('pay')
              setShowPayScreen(true)
            }}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-all ${
              activeTab === 'pay' ? 'bg-gray-100' : ''
            }`}
          >
            <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l18-7-7 18-2.5-7.5L3 12z" />
            </svg>
            <span className="text-[10px] font-semibold text-black mt-1">Pay</span>
          </button>

          <button
            onClick={() => setActiveTab('discover')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-all ${
              activeTab === 'discover' ? 'bg-gray-100' : ''
            }`}
          >
            <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-[10px] font-semibold text-black mt-1">Discover</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-all ${
              activeTab === 'settings' ? 'bg-gray-100' : ''
            }`}
          >
            <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] font-semibold text-black mt-1">Profile</span>
          </button>
        </div>
      </div>
    </div>
  )
}
