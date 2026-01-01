import { createConfig, http } from 'wagmi'
import { tempoTestnet } from 'viem/chains'
import { KeyManager, webAuthn } from 'tempo.ts/wagmi'

export const config = createConfig({
  chains: [tempoTestnet],
  connectors: [webAuthn({
    keyManager: KeyManager.localStorage(),
  })],
  multiInjectedProviderDiscovery: false,
  transports: { [tempoTestnet.id]: http() },
})
