import {
  getInsecureHubRpcClient,
  makeCastAdd,
  Message,
  NobleEd25519Signer,
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
}

export async function getUserUsername(fid: number): Promise<string> {
  const userDataUrl = `https://hub.merv.fun/v1/userDataByFid?fid=${fid}&user_data_type=6`

  try {
    const response = await fetch(userDataUrl)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Error fetching user data from ${userDataUrl}: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    const responseData = await response.json()

    interface UserDataMessage {
      data?: {
        userDataBody?: {
          type?: string
          value?: string
        }
      }
    }

    interface UserDataApiResponse {
      messages?: UserDataMessage[]
    }

    const parsedData = responseData as UserDataApiResponse

    if (!parsedData.messages || !Array.isArray(parsedData.messages)) {
      throw new Error(
        `Invalid response structure from ${userDataUrl}: 'messages' array not found or not an array.`,
      )
    }

    for (const message of parsedData.messages) {
      if (
        message.data &&
        message.data.userDataBody &&
        message.data.userDataBody.type === 'USER_DATA_TYPE_USERNAME' &&
        typeof message.data.userDataBody.value === 'string'
      ) {
        return message.data.userDataBody.value
      }
    }

    throw new Error(
      `Username not found for FID ${fid} in the response from ${userDataUrl}.`,
    )
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to get username for FID ${fid} from ${userDataUrl}: ${error.message}`,
      )
    }
    throw new Error(
      `Failed to get username for FID ${fid} from ${userDataUrl}: Unknown error.`,
    )
  }
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
  await submitMessage(
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
  }
}
