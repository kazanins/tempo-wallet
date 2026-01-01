'use client'

import { IPhoneFrame } from '@/components/iphone-frame'
import { AuthScreen } from '@/components/auth-screen'
import { DashboardScreen } from '@/components/dashboard-screen'
import { config } from '@/lib/wagmi'
import { useAccount, useConnect, useDisconnect, useReadContract, usePublicClient } from 'wagmi'
import { useEffect, useState } from 'react'
import { formatUnits, hexToString, parseAbiItem, parseUnits, pad, stringToHex, type Address } from 'viem'
import { Hooks } from 'tempo.ts/wagmi'

const ALPHA_USD_ADDRESS = '0x20c0000000000000000000000000000000000001' as const

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

interface Transaction {
  id: string
  type: 'sent' | 'received'
  amount: string
  address: string
  memo?: string
  timestamp: string
  blockNumber: bigint
}

export default function Home() {
  const { address, isConnected } = useAccount()
  const { connectors, connect, isPending } = useConnect({ config })
  const { disconnect } = useDisconnect()
  const [mounted, setMounted] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const publicClient = usePublicClient()
  const explorerBaseUrl = publicClient?.chain?.blockExplorers?.default?.url

  // Transfer mutation for sending payments
  const sendPayment = Hooks.token.useTransferSync()

  const { data: balanceData, isLoading: isLoadingBalance, refetch: refetchBalance } = useReadContract({
    address: ALPHA_USD_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  })

  const balance = balanceData
    ? formatUnits(balanceData, 6) // AlphaUSD has 6 decimals
    : '0.00'

  const numericBalance = Number(balance)
  const formattedBalance = isLoadingBalance
    ? 'Loading...'
    : numericBalance.toLocaleString('en-US', {
        minimumFractionDigits: numericBalance >= 1000 ? 0 : 2,
        maximumFractionDigits: numericBalance >= 1000 ? 0 : 2
      })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch transaction history
  useEffect(() => {
    fetchTransactions()
  }, [address, isConnected, publicClient])

  const webAuthnConnector = connectors.find(c => c.type === 'webAuthn')

  const handleSignUp = () => {
    if (webAuthnConnector) {
      connect({
        connector: webAuthnConnector,
        capabilities: { type: 'sign-up' }
      })
    }
  }

  const handleSignIn = () => {
    if (webAuthnConnector) {
      connect({
        connector: webAuthnConnector
      })
    }
  }

  const handleSignOut = () => {
    disconnect()
  }

  const handleSendPayment = async (recipient: string, amount: string, memo: string) => {
    try {
      const result = await sendPayment.mutateAsync({
        amount: parseUnits(amount, 6),
        to: recipient as `0x${string}`,
        token: ALPHA_USD_ADDRESS,
        memo: memo ? pad(stringToHex(memo), { size: 32 }) : undefined
      })
      // Refetch transactions after successful payment
      if (address && isConnected && publicClient) {
        await fetchTransactions()
      }
      return result?.receipt?.transactionHash ?? null
    } catch (error) {
      console.error('Payment failed:', error)
      throw error
    }
  }

  // Extract fetchTransactions to be reusable
  const fetchTransactions = async () => {
    if (!address || !isConnected || !publicClient) return

    setIsLoadingTransactions(true)
    try {
      const currentBlock = await publicClient.getBlockNumber()
      const fromBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n

      // Fetch sent transactions
      const sentLogs = await publicClient.getLogs({
        address: ALPHA_USD_ADDRESS,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        args: {
          from: address as Address,
        },
        fromBlock,
        toBlock: 'latest',
      })

      // Fetch received transactions
      const receivedLogs = await publicClient.getLogs({
        address: ALPHA_USD_ADDRESS,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        args: {
          to: address as Address,
        },
        fromBlock,
        toBlock: 'latest',
      })

      // Fetch memo logs (Tempo TIP-20: memo is indexed bytes32)
      const memoEvent = parseAbiItem(
        'event TransferWithMemo(address indexed from, address indexed to, uint256 amount, bytes32 indexed memo)'
      )
      const [sentMemoLogs, receivedMemoLogs] = await Promise.all([
        publicClient.getLogs({
          address: ALPHA_USD_ADDRESS,
          event: memoEvent,
          args: { from: address as Address },
          fromBlock,
          toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: ALPHA_USD_ADDRESS,
          event: memoEvent,
          args: { to: address as Address },
          fromBlock,
          toBlock: 'latest',
        }),
      ])
      const memoLogs = [...sentMemoLogs, ...receivedMemoLogs]
      const memoMap = new Map<string, string>()
      for (const log of memoLogs) {
        const memoHex = (log.args as { memo?: `0x${string}` }).memo
        if (!memoHex) continue
        const memoText = hexToString(memoHex, { size: 32 }).replace(/\0/g, '').trim()
        if (memoText) memoMap.set(log.transactionHash, memoText)
      }

      // Combine and deduplicate by transaction hash + log index
      const allLogs = [...sentLogs, ...receivedLogs]
      const uniqueLogs = Array.from(
        new Map(
          allLogs.map(log => [
            `${log.transactionHash}-${log.logIndex}`,
            log
          ])
        ).values()
      ).sort((a, b) => Number(b.blockNumber - a.blockNumber))

      const txs: Transaction[] = await Promise.all(
        uniqueLogs.slice(0, 20).map(async (log) => {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
          const isSent = log.args.from?.toLowerCase() === address.toLowerCase()

          return {
            id: `${log.transactionHash}-${log.logIndex}`,
            type: isSent ? 'sent' as const : 'received' as const,
            amount: Number(formatUnits(log.args.value || 0n, 6)).toFixed(2),
            address: isSent ? (log.args.to || '') : (log.args.from || ''),
            memo: memoMap.get(log.transactionHash),
            timestamp: new Date(Number(block.timestamp) * 1000).toLocaleString(),
            blockNumber: log.blockNumber,
          }
        })
      )

      // Filter out zero-amount transactions (TransferWithMemo events)
      const filteredTxs = txs.filter(tx => parseFloat(tx.amount) > 0)

      setTransactions(filteredTxs)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setIsLoadingTransactions(false)
    }
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <IPhoneFrame>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading...</div>
        </div>
      </IPhoneFrame>
    )
  }

  return (
    <IPhoneFrame>
      {isConnected && address ? (
        <DashboardScreen
          address={address}
          balance={formattedBalance}
          transactions={transactions}
          onSignOut={handleSignOut}
          onSendPayment={handleSendPayment}
          isPaymentPending={sendPayment.isPending}
          explorerBaseUrl={explorerBaseUrl}
          onRefreshTransactions={fetchTransactions}
          onRefreshBalance={refetchBalance}
        />
      ) : (
        <AuthScreen
          onSignUp={handleSignUp}
          onSignIn={handleSignIn}
          isPending={isPending}
        />
      )}
    </IPhoneFrame>
  )
}
