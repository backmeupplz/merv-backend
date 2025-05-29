import {
  getInsecureHubRpcClient,
  makeCastAdd,
  Message,
  NobleEd25519Signer,
  UserDataType,
  type CastAddBody,
  type HubAsyncResult,
} from '@farcaster/hub-nodejs'
import { FC_NETWORK, HUB_URL } from 'helpers/constants'
import { fromHex } from 'viem'

const hubClient = getInsecureHubRpcClient(HUB_URL)

async function submitMessage(resultPromise: HubAsyncResult<Message>) {
  const result = await resultPromise
  if (result.isErr()) {
    throw new Error(`Error creating message: ${result.error}`)
  }
  const messageSubmitResult = await hubClient.submitMessage(result.value)
  if (messageSubmitResult.isErr()) {
    throw new Error(
      `Error submitting message to hub: ${messageSubmitResult.error}`,
    )
  }
  return messageSubmitResult.value
}

export async function getUserUsername(fid: number) {
  const result = await hubClient.getUserData({
    fid,
    userDataType: UserDataType.USERNAME,
  })
  if (result.isErr()) {
    throw new Error(`Error fetching user data: ${result.error}`)
  }
  return result.value.data
}

export async function publishCast({
  data,
  fid,
  signerPrivateKey,
}: {
  data: CastAddBody
  fid: number
  signerPrivateKey: `0x${string}`
}) {
  const privateKeyBytes = fromHex(signerPrivateKey, 'bytes')
  const signer = new NobleEd25519Signer(privateKeyBytes)
  const message = await submitMessage(
    makeCastAdd(
      data,
      {
        fid,
        network: FC_NETWORK,
      },
      signer,
    ),
  )
  return {
    signerPrivateKey: signer,
    message,
  }
}
