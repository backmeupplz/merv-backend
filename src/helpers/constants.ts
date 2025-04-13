import { FarcasterNetwork } from '@farcaster/hub-nodejs'

export const HUB_URL = '34.172.154.21:2283'
export const WARPCAST_API = 'https://api.warpcast.com'
export const SIGNER_REQUEST_DEADLINE = 60 * 60_000 // 1 hour
export const FC_NETWORK = FarcasterNetwork.MAINNET
// EIP-712 Domain and Types as defined in the Farcaster docs
const SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN = {
  name: 'Farcaster SignedKeyRequestValidator',
  version: '1',
  chainId: 10,
  verifyingContract:
    '0x00000000fc700472606ed4fa22623acf62c60553' as `0x${string}`,
}
const SIGNED_KEY_REQUEST_TYPE = [
  { name: 'requestFid', type: 'uint256' },
  { name: 'key', type: 'bytes' },
  { name: 'deadline', type: 'uint256' },
]
