import {
  SIGNED_KEY_REQUEST_TYPE,
  SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
} from '@farcaster/hub-nodejs'
import { SignerRequest } from '@generated/type-graphql/models/SignerRequest.js'
import { ed25519 } from '@noble/curves/ed25519'
import { GraphQLError } from 'graphql'
import { SIGNER_REQUEST_DEADLINE, WARPCAST_API } from 'helpers/constants'
import env from 'helpers/env'
import { type AuthorizedContext } from 'models/Context.js'
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql'
import { toHex } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'

@Resolver()
export default class AccountResolver {
  @Authorized()
  @Mutation(() => SignerRequest)
  async requestSignerDeepLink(@Ctx() { user, prisma }: AuthorizedContext) {
    // Step 1: Generate a new key pair.
    const privateKey = ed25519.utils.randomPrivateKey()
    const publicKeyBytes = ed25519.getPublicKey(privateKey)
    // Convert publicKeyBytes (Uint8Array) to a hex string without Buffer.
    const key = toHex(publicKeyBytes)
    const privateKeyString = toHex(privateKey)

    // Step 2: Obtain the signature from the signer
    const deadline = Math.floor((Date.now() + SIGNER_REQUEST_DEADLINE) / 1000)
    const appFid = env.APP_FID
    const mnemonic = env.APP_MNEMONIC

    // Create an account from the mnemonic.
    const account = mnemonicToAccount(mnemonic)

    // Generate the signature using EIP-712 typed data.
    const signature = await account.signTypedData({
      domain: SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
      types: {
        SignedKeyRequest: SIGNED_KEY_REQUEST_TYPE,
      },
      primaryType: 'SignedKeyRequest',
      message: {
        requestFid: BigInt(appFid),
        key: key,
        deadline: BigInt(deadline),
      },
    })

    // Step 3: Create a signed key request via the Warpcast API
    const warpcastRes = await fetch(`${WARPCAST_API}/v2/signed-key-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        requestFid: env.APP_FID,
        signature,
        deadline,
        redirectUrl: 'https://warpcast.com/~/mini-apps/launch?domain=merv.fun',
      }),
    })
    if (!warpcastRes.ok) {
      throw new GraphQLError(`Warpcast API error: ${warpcastRes.statusText}`)
    }
    const warpcastJson = await warpcastRes.json()
    const { token, deeplinkUrl } = warpcastJson.result.signedKeyRequest
    return prisma.signerRequest.create({
      data: {
        ownerId: user.id,
        token,
        privateKey: privateKeyString,
        deepLink: deeplinkUrl,
      },
    })
  }

  @Authorized()
  @Query(() => SignerRequest)
  async getSignerRequest(
    @Ctx() { user, prisma }: AuthorizedContext,
    @Arg('id') id: string,
  ) {
    const signerRequest = await prisma.signerRequest.findFirst({
      where: {
        ownerId: user.id,
        id,
      },
    })
    if (!signerRequest) {
      throw new GraphQLError('No signer request found')
    }
    return signerRequest
  }

  @Authorized()
  @Query(() => [SignerRequest])
  async getMySignerRequests(@Ctx() { user, prisma }: AuthorizedContext) {
    const signerRequests = await prisma.signerRequest.findMany({
      where: {
        ownerId: user.id,
      },
    })
    return signerRequests
  }
}
