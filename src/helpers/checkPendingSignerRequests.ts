import { SignerRequestStatus } from '@prisma/client'
import { FARCASTER_API, SIGNER_REQUEST_DEADLINE } from 'helpers/constants'
import { getUserUsername } from 'helpers/hub'
import prismaClient from 'helpers/prismaClient'

let isFetching = false
export default async function checkPendingSignerRequests() {
  if (isFetching) {
    return
  }
  console.log('Checking pending signer requests...')
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
  console.log(
    `Found ${pendingSignerRequests.length} pending signer requests to process.`,
  )
  for (const request of pendingSignerRequests) {
    console.log('Processing request:', request.id)
    try {
      const pollRes = await fetch(
        `${FARCASTER_API}/v2/signed-key-request?token=${encodeURIComponent(request.token)}`,
      )
      console.log('Polling signed key request:', request.id)
      console.log('Polling status ok:', JSON.stringify(pollRes.ok))
      if (!pollRes.ok) {
        throw new Error(`Polling error: ${pollRes.statusText}`)
      }
      const pollJson = await pollRes.json()
      const { signedKeyRequest } = pollJson.result
      const { state, userFid } = signedKeyRequest
      console.log('Signed key request state:', state, 'for fid:', userFid)
      if (state === 'completed') {
        console.log('Signer request completed for fid:', userFid)
        await prismaClient.signerRequest.update({
          where: {
            id: request.id,
          },
          data: {
            status: SignerRequestStatus.SIGNED,
          },
        })
        console.log(
          `Signer request ${request.id} marked as signed for fid ${userFid}`,
        )
        const username = await getUserUsername(userFid)
        console.log('Fetched username:', username)
        if (!username) {
          console.error('Username data not found for fid:', userFid)
          continue
        }
        console.log('Fetched username:', username, 'for fid:', userFid)
        const existingSigner = await prismaClient.signer.findFirst({
          where: {
            fid: userFid,
            castCompleted: true,
          },
        })
        console.log(
          'Existing signer found:',
          existingSigner ? 'Yes' : 'No',
          'for fid:',
          userFid,
        )
        await prismaClient.signer.create({
          data: {
            fid: userFid,
            username: username || `!${userFid}`,
            ownerId: request.ownerId,
            privateKey: request.privateKey,
            castCompleted: !!existingSigner,
          },
        })
        console.log(
          `Signer request ${request.id} completed for fid ${userFid} (${username || `!${userFid}`})`,
        )
      }
    } catch (error) {
      console.error('Error polling signed key request:', request.id, error)
    }
  }
  isFetching = false
}
