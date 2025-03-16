import { Bot } from 'grammy'
import env from 'helpers/env'

const bot = new Bot(env.TELEGRAM_BOT_TOKEN)

export default async function reportToTelegram(message: string) {
  try {
    await bot.api.sendMessage(76104711, `[merv]: ${message}`)
  } catch (error) {
    console.error('Error while sending message to telegram', error)
  }
}
