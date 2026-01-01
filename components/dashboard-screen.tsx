'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { PayScreen } from './pay-screen'
import { usePublicClient, useWalletClient } from 'wagmi'
import { Abis, Actions, Account, WebCryptoP256 } from 'viem/tempo'
import { createWalletClient, getAddress, http, parseUnits, pad, stringToHex } from 'viem'
import { tempoTestnet } from 'viem/chains'
import type { KeyAuthorization } from 'ox/tempo'
import { Address } from 'ox'
import { del, get, set } from 'idb-keyval'

const ALPHA_USD_ADDRESS = '0x20c0000000000000000000000000000000000001' as const
const TOKEN_DECIMALS = 6
const ACCOUNT_KEYCHAIN_ADDRESS = getAddress('0xAAAAAAAA00000000000000000000000000000000')

interface Transaction {
  id: string
  type: 'sent' | 'received'
  amount: string
  address: string
  memo?: string
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
  onRefreshTransactions?: () => Promise<void>
  onRefreshBalance?: () => Promise<unknown>
}

export function DashboardScreen({ address, balance, transactions, onSignOut, onSendPayment, isPaymentPending, explorerBaseUrl, onRefreshTransactions, onRefreshBalance }: DashboardScreenProps) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'pay' | 'discover' | 'settings'>('home')
  const [showPayScreen, setShowPayScreen] = useState(false)
  const [subscriptions, setSubscriptions] = useState<Record<string, {
    active: boolean
    expiresAt: number
    remainingLimit: bigint
    chargesRemaining: number
    keyAuthorized?: boolean
    overdue?: boolean
    accessKey?: Account.AccessKeyAccount
    keyAuthorization?: KeyAuthorization.Signed
    keyPair?: Awaited<ReturnType<typeof WebCryptoP256.createKeyPair>>
  }>>({})
  const subscriptionsRef = useRef(subscriptions)
  const chargingRef = useRef<Set<string>>(new Set())
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const numericBalance = Number(balance.replace(/,/g, ''))
  const services = useMemo(() => ([
    {
      id: 'streamwave',
      name: 'StreamWave',
      description: 'Originals and live sports in one plan.',
      price: 24,
      address: '0x1111111111111111111111111111111111111111',
      logo: (
        <div className="h-12 w-12 min-w-12 shrink-0 rounded-2xl bg-[#E6F0FF] flex items-center justify-center">
          <svg className="h-6 w-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h10" />
          </svg>
        </div>
      ),
    },
    {
      id: 'echo',
      name: 'EchoLane',
      description: 'Hi-fi music with offline mixes.',
      price: 19,
      address: '0x2222222222222222222222222222222222222222',
      logo: (
        <div className="h-12 w-12 min-w-12 shrink-0 rounded-2xl bg-[#FFF3E6] flex items-center justify-center">
          <svg className="h-6 w-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18V6l8-2v12" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="15" cy="16" r="2" />
          </svg>
        </div>
      ),
    },
    {
      id: 'spark',
      name: 'Spark AI',
      description: 'Personal AI assistant for work and ideas.',
      price: 32,
      address: '0x3333333333333333333333333333333333333333',
      logo: (
        <div className="h-12 w-12 min-w-12 shrink-0 rounded-2xl bg-[#EAF7F0] flex items-center justify-center">
          <svg className="h-6 w-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" />
          </svg>
        </div>
      ),
    },
    {
      id: 'north',
      name: 'NorthShield',
      description: 'Fast VPN with global routing.',
      price: 14,
      address: '0x4444444444444444444444444444444444444444',
      logo: (
        <div className="h-12 w-12 min-w-12 shrink-0 rounded-2xl bg-[#F2E9FF] flex items-center justify-center">
          <svg className="h-6 w-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4z" />
          </svg>
        </div>
      ),
    },
  ]), [])

  const subscriptionStorageKey = (serviceId: string) => `subscription:${serviceId}`

  useEffect(() => {
    subscriptionsRef.current = subscriptions
  }, [subscriptions])

  const persistSubscription = async (serviceId: string, data: {
    expiresAt: number
    remainingLimit: bigint
    chargesRemaining: number
    keyAuthorized?: boolean
    overdue?: boolean
    keyAuthorization?: KeyAuthorization.Signed
    keyPair?: Awaited<ReturnType<typeof WebCryptoP256.createKeyPair>>
  }) => {
    if (!data.keyPair || !data.keyAuthorization) return
    await set(subscriptionStorageKey(serviceId), {
      expiresAt: data.expiresAt,
      remainingLimit: data.remainingLimit,
      chargesRemaining: data.chargesRemaining,
      keyAuthorized: data.keyAuthorized ?? false,
      overdue: data.overdue ?? false,
      keyAuthorization: data.keyAuthorization,
      keyPair: data.keyPair,
    })
  }

  const chargeSubscription = async (service: typeof services[number], sub: {
    expiresAt: number
    remainingLimit: bigint
    chargesRemaining: number
    keyAuthorized?: boolean
    overdue?: boolean
    accessKey?: Account.AccessKeyAccount
    keyAuthorization?: KeyAuthorization.Signed
    keyPair?: Awaited<ReturnType<typeof WebCryptoP256.createKeyPair>>
  }) => {
    if (!sub.accessKey || !sub.keyAuthorization) return

    if (Number.isFinite(numericBalance) && numericBalance < service.price) {
      await persistSubscription(service.id, {
        expiresAt: sub.expiresAt,
        remainingLimit: sub.remainingLimit,
        chargesRemaining: sub.chargesRemaining,
        keyAuthorized: sub.keyAuthorized,
        overdue: true,
        keyAuthorization: sub.keyAuthorization,
        keyPair: sub.keyPair,
      })
      setSubscriptions((prev) => ({
        ...prev,
        [service.id]: {
          ...prev[service.id],
          overdue: true,
        },
      }))
      return
    }

    const amountUnits = parseUnits(String(service.price), TOKEN_DECIMALS)
    if (sub.remainingLimit < amountUnits || sub.chargesRemaining <= 0) return

    const client = createWalletClient({
      account: sub.accessKey,
      chain: tempoTestnet,
      transport: http(),
    })

    const memoText = `${service.name} subscription`
    const transferArgs = {
      token: ALPHA_USD_ADDRESS,
      to: service.address as `0x${string}`,
      amount: amountUnits,
      memo: pad(stringToHex(memoText), { size: 32 }),
    }

    const attemptTransfer = async (includeKeyAuthorization: boolean) => {
      if (!includeKeyAuthorization) {
        await Actions.token.transfer(client, transferArgs)
        return true
      }
      await Actions.token.transfer(client, {
        ...transferArgs,
        keyAuthorization: sub.keyAuthorization,
      } as never)
      return true
    }

    try {
      const usedKeyAuth = !sub.keyAuthorized
      await attemptTransfer(usedKeyAuth)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('InsufficientBalance')) {
        await persistSubscription(service.id, {
          expiresAt: sub.expiresAt,
          remainingLimit: sub.remainingLimit,
          chargesRemaining: sub.chargesRemaining,
          keyAuthorized: sub.keyAuthorized,
          overdue: true,
          keyAuthorization: sub.keyAuthorization,
          keyPair: sub.keyPair,
        })
        setSubscriptions((prev) => ({
          ...prev,
          [service.id]: {
            ...prev[service.id],
            overdue: true,
          },
        }))
        return
      }

      try {
        await attemptTransfer(sub.keyAuthorized ?? false)
      } catch (retryError) {
        console.error('Subscription charge failed:', retryError)
        await del(subscriptionStorageKey(service.id))
        setSubscriptions((prev) => ({
          ...prev,
          [service.id]: {
            ...prev[service.id],
            active: false,
          },
        }))
        return
      }
    }

    const nextRemaining = sub.remainingLimit - amountUnits
    const nextCharges = Math.max(0, sub.chargesRemaining - 1)
    const nextKeyAuthorized = true

    if (nextCharges === 0) {
      await del(subscriptionStorageKey(service.id))
      setSubscriptions((prev) => ({
        ...prev,
        [service.id]: {
          ...prev[service.id],
          active: false,
          chargesRemaining: 0,
        },
      }))
      return
    }
    await persistSubscription(service.id, {
      expiresAt: sub.expiresAt,
      remainingLimit: nextRemaining,
      chargesRemaining: nextCharges,
      keyAuthorized: nextKeyAuthorized,
      overdue: false,
      keyAuthorization: sub.keyAuthorization,
      keyPair: sub.keyPair,
    })
    await onRefreshTransactions?.()
    await onRefreshBalance?.()

    setSubscriptions((prev) => ({
      ...prev,
      [service.id]: {
        ...prev[service.id],
        remainingLimit: nextRemaining,
        chargesRemaining: nextCharges,
        keyAuthorized: nextKeyAuthorized,
        overdue: false,
      },
    }))
  }

  useEffect(() => {
    const loadSubscriptions = async () => {
      if (!walletClient?.account) return

      const entries: Record<string, {
        active: boolean
        expiresAt: number
        remainingLimit: bigint
        chargesRemaining: number
        keyAuthorized?: boolean
        accessKey?: Account.AccessKeyAccount
        keyAuthorization?: KeyAuthorization.Signed
      }> = {}

      for (const service of services) {
        const stored = await get(subscriptionStorageKey(service.id))
        if (!stored || !stored.keyPair || !stored.keyAuthorization) continue

        if (stored.expiresAt <= Date.now() || stored.chargesRemaining <= 0) {
          await del(subscriptionStorageKey(service.id))
          continue
        }

        try {
          const accessKey = Account.fromWebCryptoP256(stored.keyPair, { access: walletClient.account })
          entries[service.id] = {
            ...stored,
            active: true,
            accessKey,
            keyPair: stored.keyPair,
            keyAuthorized: stored.keyAuthorized ?? false,
            overdue: stored.overdue ?? false,
          }
        } catch (error) {
          console.error('Failed to restore access key:', error)
          await del(subscriptionStorageKey(service.id))
        }
      }

      setSubscriptions((prev) => ({ ...prev, ...entries }))
    }

    loadSubscriptions()
  }, [services, walletClient?.account])

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => {
      const aActive = subscriptions[a.id]?.active ? 1 : 0
      const bActive = subscriptions[b.id]?.active ? 1 : 0
      return bActive - aActive
    })
  }, [services, subscriptions])

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      const now = Date.now()
      const current = subscriptionsRef.current

      for (const service of services) {
        const sub = current[service.id]
        if (!sub?.active) continue
        const amountUnits = parseUnits(String(service.price), TOKEN_DECIMALS)

        if (sub.expiresAt <= now || sub.remainingLimit < amountUnits || sub.chargesRemaining <= 0) {
          await del(subscriptionStorageKey(service.id))
          setSubscriptions((prev) => ({
            ...prev,
            [service.id]: {
              ...prev[service.id],
              active: false,
            },
          }))
          continue
        }

        if (chargingRef.current.has(service.id)) continue
        chargingRef.current.add(service.id)

        if (!sub.accessKey || !sub.keyAuthorization) {
          chargingRef.current.delete(service.id)
          continue
        }

        try {
          await chargeSubscription(service, sub)
        } catch (error) {
          console.error('Subscription charge failed:', error)
        } finally {
          chargingRef.current.delete(service.id)
        }
      }
    }, 10_000)

    return () => window.clearInterval(intervalId)
  }, [onSendPayment, services])

  const handleToggleSubscription = async (serviceId: string) => {
    const service = services.find((item) => item.id === serviceId)
    if (!service) return

    const existing = subscriptionsRef.current[serviceId]
    if (existing?.active) {
      try {
        if (existing.keyPair && walletClient?.account) {
          const keyId = Address.fromPublicKey(existing.keyPair.publicKey)
          const txHash = await walletClient.writeContract({
            address: ACCOUNT_KEYCHAIN_ADDRESS,
            abi: Abis.accountKeychain,
            functionName: 'revokeKey',
            args: [keyId],
            feeToken: ALPHA_USD_ADDRESS,
          } as never)
          await publicClient?.waitForTransactionReceipt({ hash: txHash })
        }
      } catch (error) {
        console.error('Failed to revoke access key:', error)
      }
      await del(subscriptionStorageKey(serviceId))
      setSubscriptions((prev) => ({
        ...prev,
        [serviceId]: {
          ...prev[serviceId],
          active: false,
        },
      }))
      return
    }

    if (!walletClient?.account || !('signKeyAuthorization' in walletClient.account)) {
      console.error('Wallet client does not support access key provisioning.')
      return
    }

    try {
      const keyPair = await WebCryptoP256.createKeyPair()
      const accessKey = Account.fromWebCryptoP256(keyPair, { access: walletClient.account })
      const expirySeconds = Math.floor(Date.now() / 1000) + 13 * 60
      const limitUnits = parseUnits(String(service.price * 12), TOKEN_DECIMALS)
      const rootAccount = walletClient.account as Account.RootAccount
      const keyAuthorization = await rootAccount.signKeyAuthorization(
        { accessKeyAddress: accessKey.accessKeyAddress, keyType: accessKey.keyType },
        {
          expiry: expirySeconds,
          limits: [{ token: ALPHA_USD_ADDRESS, limit: limitUnits }],
        }
      )

      await persistSubscription(serviceId, {
        expiresAt: expirySeconds * 1000,
        remainingLimit: limitUnits,
        chargesRemaining: 12,
        keyAuthorized: false,
        overdue: false,
        keyAuthorization,
        keyPair,
      })
      const nextSub = {
        active: true,
        expiresAt: expirySeconds * 1000,
        remainingLimit: limitUnits,
        chargesRemaining: 12,
        keyAuthorized: false,
        overdue: false,
        accessKey,
        keyAuthorization,
        keyPair,
      }
      setSubscriptions((prev) => ({
        ...prev,
        [serviceId]: {
          ...nextSub,
        },
      }))
      chargingRef.current.add(serviceId)
      try {
        await chargeSubscription(service, nextSub)
      } finally {
        chargingRef.current.delete(serviceId)
      }
    } catch (error) {
      console.error('Failed to provision access key:', error)
    }
  }

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
      {activeTab === 'discover' ? (
        <div className="pt-12 px-6 pb-6">
          <div className="flex justify-between items-center">
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
          <div className="mt-10">
            <div className="text-7xl font-bold tracking-tight text-black">Discover</div>
            <div className="mt-3 text-sm text-black/60 whitespace-nowrap">
              Discover services you can subscribe to in one tap.
            </div>
          </div>
        </div>
      ) : (
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
      )}

      {/* Content */}
      <div className="flex-1 bg-white rounded-t-3xl px-4 pb-24 overflow-y-auto">
        {activeTab === 'discover' ? (
          <>
            <div className="space-y-4 pb-2 pt-2">
              {sortedServices.map((service) => {
                const isActive = subscriptions[service.id]?.active
                const isOverdue = subscriptions[service.id]?.overdue
                return (
                <div
                  key={service.id}
                  className="bg-[#F7FAFF] rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-start gap-4">
                    {service.logo}
                    <div className="pt-0.5">
                      <div className="text-base font-semibold text-black leading-tight">{service.name}</div>
                      <div className="text-xs text-black/60 leading-relaxed">{service.description}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="text-sm font-semibold text-black">${service.price}/month</div>
                        {isActive && !isOverdue && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                            Active
                          </span>
                        )}
                        {isOverdue && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleSubscription(service.id)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold ${isActive ? 'bg-white text-black border border-black/20' : 'bg-black text-white'}`}
                  >
                    {isActive ? 'Cancel' : 'Subscribe'}
                  </button>
                </div>
                )
              })}
            </div>
          </>
        ) : (
          <>
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
                      {tx.memo ? tx.memo : `${tx.address.slice(0, 6)}...${tx.address.slice(-4)}`}
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
          </>
        )}
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
