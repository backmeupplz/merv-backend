import { PrismaClient, type User } from '@prisma/client'
import { type YogaInitialContext } from 'graphql-yoga'
import { IncomingMessage } from 'http'

export default interface Context extends YogaInitialContext {
  user: User | null
  req: IncomingMessage
  prisma: PrismaClient
}

export interface AuthorizedContext extends Context {
  user: User
}
