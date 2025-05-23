import { SignerRequestStatus } from '@prisma/client'
import { SIGNER_REQUEST_DEADLINE, WARPCAST_API } from 'helpers/constants'
import { getUserUsername } from 'helpers/hub'
import prismaClient from 'helpers/prismaClient'

let isFetching = false
export default async function checkPendingSignerRequests() {
  if (isFetching) {
    return
  }
  isFetching = true
  await prismaClient.signerRequest.updateMany({
    where: {
      status: SignerRequestStatus.PENDING,
      createdAt: {
        lt: new Date(Date.now() - SIGNER_REQUEST_DEADLINE),
      },
    },
    data: {
      status: SignerRequestStatus.EXPIRED,
    },
  })
  const pendingSignerRequests = await prismaClient.signerRequest.findMany({
    where: {
      status: SignerRequestStatus.PENDING,
    },
  })
  for (const request of pendingSignerRequests) {
    try {
      const pollRes = await fetch(
        `${WARPCAST_API}/v2/signed-key-request?token=${encodeURIComponent(request.token)}`,
      )
      if (!pollRes.ok) {
        throw new Error(`Polling error: ${pollRes.statusText}`)
      }
      const pollJson = await pollRes.json()
      const { signedKeyRequest } = pollJson.result
      const { state, userFid } = signedKeyRequest
      if (state === 'completed') {
        await prismaClient.signerRequest.update({
          where: {
            id: request.id,
          },
          data: {
            status: SignerRequestStatus.SIGNED,
          },
        })
        const userData = await getUserUsername(userFid)
        if (!userData) {
          console.error('Username data not found for fid:', userFid)
          continue
        }
        const username = userData.userDataBody?.value
        const existingSigner = await prismaClient.signer.findFirst({
          where: {
            fid: userFid,
            castCompleted: true,
          },
        })
        await prismaClient.signer.create({
          data: {
            fid: userFid,
            username: username || `!${userFid}`,
            ownerId: request.ownerId,
            privateKey: request.privateKey,
            castCompleted: !!existingSigner,
          },
        })
      }
    } catch (error) {
      console.error('Error polling signed key request:', request.id, error)
    }
  }
  isFetching = false
}
