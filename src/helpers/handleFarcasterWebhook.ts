import {
  createVerifyAppKeyWithHub,
  parseWebhookEvent,
} from '@farcaster/frame-node'
import prismaClient from 'helpers/prismaClient'
import reportToTelegram from 'helpers/reportToTelegram'
import sendFarcasterNotification from 'helpers/sendFarcasterNotification'

export default async function handleFarcasterWebhook(req: Request) {
  try {
    const body = await req.json()
    const verifyAppKeyWithHub = createVerifyAppKeyWithHub(
      'https://hub.merv.fun',
    )
    const { event, fid } = await parseWebhookEvent(body, verifyAppKeyWithHub)
    const user = await prismaClient.user.findFirst({
      where: {
        fid,
      },
    })
    if (!user) {
      console.error('User not found:', fid)
      return new Response('User not found', { status: 404 })
    }
    if (
      event.event === 'frame_removed' ||
      event.event === 'notifications_disabled'
    ) {
      // Remove all notification tokens for the user
      await prismaClient.farcasterNotificationToken.deleteMany({
        where: {
          userId: user.id,
        },
      })
      void reportToTelegram(
        `User ${user.username} has ${event.event === 'frame_removed' ? 'removed the frame' : 'disabled the notifications'} for Farcaster`,
      )
    } else if (
      event.event === 'notifications_enabled' ||
      event.event === 'frame_added'
    ) {
      // Add notification token for the user
      if (event.notificationDetails) {
        const { token, url } = event.notificationDetails
        await prismaClient.farcasterNotificationToken.create({
          data: {
            token,
            url,
            userId: user.id,
          },
        })
        void sendFarcasterNotification({
          body: "You're all set to receive notifications!",
          targetUrl: 'https://merv.fun',
          title: "It's merving time!",
          token,
          url,
        })
      } else {
        console.log('No notification details found:', event)
      }
      void reportToTelegram(
        `User ${user.username} has ${event.event === 'frame_added' ? 'added the frame' : 'enabled the notifications'} for Farcaster (notifications: ${event.notificationDetails ? 'enabled' : 'disabled'})`,
      )
    }
    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
