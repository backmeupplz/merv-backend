import env from 'helpers/env'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const basePublicClient = createPublicClient({
  chain: base,
  transport: http(env.RPC_URL),
})

export default basePublicClient
