import { PrivyClient } from '@privy-io/server-auth'
import env from 'helpers/env.js'

export default new PrivyClient(env.PRIVY_APP_ID, env.PRIVY_APP_SECRET)
