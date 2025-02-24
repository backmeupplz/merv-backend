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
  PRIVY_APP_ID: str(),
  PRIVY_APP_SECRET: str(),
})
