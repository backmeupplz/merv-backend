import {
  CastType,
  SIGNED_KEY_REQUEST_TYPE,
  SIGNED_KEY_REQUEST_VALIDATOR_EIP_712_DOMAIN,
} from '@farcaster/hub-nodejs'
import {
  ApiKey,
  MervReward,
  ProReward,
  RewardType,
  Signer,
} from '@generated/type-graphql'
import { SignerRequest } from '@generated/type-graphql/models/SignerRequest.js'
import { ed25519 } from '@noble/curves/ed25519'
import { GraphQLError } from 'graphql'
import basePublicClient from 'helpers/basePublicClient'
import {
  CAST_REWARD,
  FARCASTER_API,
  PRO_CAST_REWARD,
  SIGNER_REQUEST_DEADLINE,
} from 'helpers/constants'
import env from 'helpers/env'
import getNeynarUsers from 'helpers/getNeynarUserScores'
import { publishCast } from 'helpers/hub'
import { getAuthToken } from 'helpers/jwt'
import procoinAbi from 'helpers/procoinAbi'
import reportToTelegram from 'helpers/reportToTelegram'
import { type AuthorizedContext } from 'models/Context.js'
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql'
import { createWalletClient, http, parseUnits, toHex } from 'viem'
import { mnemonicToAccount, privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

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

    // Step 3: Create a signed key request via the Farcaster API
    const farcasterRes = await fetch(
      `${FARCASTER_API}/v2/signed-key-requests`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          requestFid: env.APP_FID,
          signature,
          deadline,
          redirectUrl: 'https://farcaster.xyz/miniapps/5HjQbj18YBrE/merv',
        }),
      },
    )
    if (!farcasterRes.ok) {
      throw new GraphQLError(`Farcaster API error: ${farcasterRes.statusText}`)
    }
    const farcasterJson = await farcasterRes.json()
    const { token, deeplinkUrl } = farcasterJson.result.signedKeyRequest
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
      orderBy: {
        createdAt: 'desc',
      },
    })
    return signerRequests
  }

  @Authorized()
  @Query(() => [Signer])
  getMySigners(@Ctx() { user, prisma }: AuthorizedContext) {
    return prisma.signer.findMany({
      where: {
        ownerId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  @Authorized()
  @Mutation(() => ProReward)
  async claimProReward(
    @Ctx() { user, prisma }: AuthorizedContext,
    @Arg('signerId') signerId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      // Check if there's a signer
      const signer = await tx.signer.findFirst({
        where: {
          id: signerId,
          ownerId: user.id,
          proCastCompleted: false,
        },
      })
      if (!signer) {
        throw new GraphQLError('No signer found')
      }
      // Check if signer was already used for the reward
      const castCompletedSigner = await tx.signer.findFirst({
        where: {
          fid: signer.fid,
          proCastCompleted: true,
        },
      })
      if (castCompletedSigner) {
        throw new GraphQLError('This account already claimed the reward!')
      }
      console.log(
        `Claiming pro reward for user ${user.fid} with signer ${signer.username} (${signer.fid})`,
      )
      // Check neynar score
      const users = await getNeynarUsers([signer.fid])
      const neynarUser = users.find((u) => u.fid === signer.fid)
      if (
        !neynarUser ||
        (neynarUser.experimental?.neynar_user_score || 0) < 0.55
      ) {
        throw new GraphQLError(
          `Neynar score is too low, has to be at least 0.55: ${neynarUser?.experimental?.neynar_user_score || 'no Neynar score'}`,
        )
      }
      // Cast the message
      const {
        message: { hash },
      } = await publishCast({
        data: {
          text: `I ratify /merv and am ready for the free $PRO!❤️\n\n𝓈ℯ𝓃𝓉 𝒻𝓇ℴ𝓂 𝓂ℯ𝓇𝓋`,
          embeds: [
            {
              url: 'https://farcaster.xyz/farcasteradmin.eth/0xd9fa37d6',
            },
            {
              url: `https://merv.fun`,
            },
          ],
          mentions: [],
          embedsDeprecated: [],
          mentionsPositions: [],
          type: CastType.CAST,
        },
        fid: signer.fid,
        signerPrivateKey: signer.privateKey as `0x${string}`,
      })
      console.log(
        `Cast published for user ${user.fid} with signer ${signer.username} (${signer.fid})`,
      )
      // Update the signer to mark it as completed
      await tx.signer.updateMany({
        where: {
          fid: signer.fid,
        },
        data: {
          proCastCompleted: true,
        },
      })
      // Create pro reward
      const proReward = await tx.proReward.create({
        data: {
          type: RewardType.CAST,
          amount: PRO_CAST_REWARD,
          userId: user.id,
        },
      })
      // Create tx to send the pro reward
      const proAccount = privateKeyToAccount(env.PRO_WALLET_KEY)
      const proWallet = createWalletClient({
        account: proAccount,
        chain: base,
        transport: http(),
      })
      if (!neynarUser.verified_addresses.primary?.eth_address) {
        throw new GraphQLError('User does not have a verified Ethereum address')
      }
      const transferTx = await proWallet.writeContract({
        abi: procoinAbi,
        address: '0xf65c3c30dd36b508e29a538b79b21e9b9e504e6c',
        functionName: 'transferFrom',
        args: [
          '0xbf74483DB914192bb0a9577f3d8Fb29a6d4c08eE',
          neynarUser.verified_addresses.primary?.eth_address,
          parseUnits(PRO_CAST_REWARD.toString(), 18),
        ],
      })
      const status = await basePublicClient.waitForTransactionReceipt({
        hash: transferTx,
      })
      console.log(
        `Transfer of ${PRO_CAST_REWARD} $PRO to ${neynarUser.verified_addresses.primary?.eth_address} completed with status: ${status.status}`,
      )
      // Cast about the pro reward
      const mervSigner = await tx.signer.findFirst({
        where: {
          fid: 1004626, // Merv's fid
        },
      })
      if (!mervSigner) {
        throw new GraphQLError('Merv signer not found')
      }
      await publishCast({
        data: {
          text: `${PRO_CAST_REWARD} $PRO has been sent to ${neynarUser.verified_addresses.primary.eth_address}! Congrats!`,
          embeds: [],
          mentions: [],
          embedsDeprecated: [],
          mentionsPositions: [],
          type: CastType.CAST,
          parentCastId: {
            fid: signer.fid,
            hash,
          },
        },
        fid: mervSigner.fid,
        signerPrivateKey: mervSigner.privateKey as `0x${string}`,
      })
      // Report to Telegram
      void reportToTelegram(
        `User ${user.fid} claimed a pro reward of ${PRO_CAST_REWARD} for signing with ${signer.username}`,
      )
      return proReward
    })
  }

  @Authorized()
  @Mutation(() => MervReward)
  async claimMervReward(
    @Ctx() { user, prisma }: AuthorizedContext,
    @Arg('signerId') signerId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      // Check if there's a signer
      const signer = await tx.signer.findFirst({
        where: {
          id: signerId,
          ownerId: user.id,
          castCompleted: false,
        },
      })
      if (!signer) {
        throw new GraphQLError('No signer found')
      }
      // Check if signer was already used for the reward
      const castCompletedSigner = await tx.signer.findFirst({
        where: {
          fid: signer.fid,
          castCompleted: true,
        },
      })
      if (castCompletedSigner) {
        throw new GraphQLError('This account already claimed the reward!')
      }
      console.log(
        `Claiming merv reward for user ${user.fid} with signer ${signer.username} (${signer.fid})`,
      )
      // Cast the message
      await publishCast({
        data: {
          text: `It's merving time! I got 1 $merv for this cast, you can get one, too! Open the mini-app to learn more ❤️\n\n𝓈ℯ𝓃𝓉 𝒻𝓇ℴ𝓂 𝓂ℯ𝓇𝓋`,
          embeds: [
            {
              url: `https://merv.fun`,
            },
          ],
          mentions: [],
          embedsDeprecated: [],
          mentionsPositions: [],
          type: CastType.CAST,
        },
        fid: signer.fid,
        signerPrivateKey: signer.privateKey as `0x${string}`,
      })
      console.log(
        `Cast published for user ${user.fid} with signer ${signer.username} (${signer.fid})`,
      )
      // Update the signer to mark it as completed
      await tx.signer.updateMany({
        where: {
          fid: signer.fid,
        },
        data: {
          castCompleted: true,
        },
      })
      // Create merv reward
      const mervReward = await tx.mervReward.create({
        data: {
          type: RewardType.CAST,
          amount: CAST_REWARD,
          userId: user.id,
        },
      })
      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          unclaimedMerv: {
            increment: CAST_REWARD,
          },
        },
      })
      void reportToTelegram(
        `User ${user.fid} claimed a merv reward of ${CAST_REWARD} for signing with ${signer.username}`,
      )
      return mervReward
    })
  }

  @Authorized()
  @Mutation(() => ApiKey)
  async createApiKey(@Ctx() { user, prisma, req }: AuthorizedContext) {
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        token: getAuthToken(user),
        userAgent: req?.headers['user-agent'] || 'Unknown',
      },
    })
    return apiKey
  }

  @Authorized()
  @Query(() => [ApiKey])
  async getMyApiKeys(@Ctx() { user, prisma }: AuthorizedContext) {
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return apiKeys
  }

  @Authorized()
  @Mutation(() => Boolean)
  async deleteApiKey(
    @Ctx() { user, prisma }: AuthorizedContext,
    @Arg('id') id: string,
  ) {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })
    if (!apiKey) {
      throw new GraphQLError('No API key found')
    }
    await prisma.apiKey.delete({
      where: {
        id,
      },
    })
    return true
  }
}
