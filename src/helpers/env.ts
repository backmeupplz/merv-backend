import { configDotenv } from 'dotenv'
import 'dotenv/config'
import { cleanEnv, num, str } from 'envalid'

configDotenv({
  override: true,
})

export default cleanEnv(process.env, {
  PORT: num({ default: 1337 }),
  POSTGRES: str(),
  JWT_SECRET: str(),
  TELEGRAM_BOT_TOKEN: str(),
  APP_FID: str(),
  APP_MNEMONIC: str(),
  RPC_URL: str(),
  NEYNAR_API_KEY: str(),
  PRO_WALLET_KEY: str<`0x${string}`>(),
})
