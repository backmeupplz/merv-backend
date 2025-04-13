import { createAppClient, viemConnector } from '@farcaster/auth-client'
import { User } from '@generated/type-graphql/models/User.js'
import { GraphQLError } from 'graphql'
import { getAuthToken } from 'helpers/jwt'
import type Context from 'models/Context.js'
import {
  Args,
  ArgsType,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Resolver,
} from 'type-graphql'

@ArgsType()
class LoginParams {
  @Field()
  message!: string
  @Field()
  signature!: `0x${string}`
  @Field()
  nonce!: string
  @Field()
  domain!: string
}

@ObjectType()
class LoginResponse {
  @Field()
  token!: string
  @Field()
  user!: User
}

@Resolver()
export default class LoginResolver {
  @Mutation(() => LoginResponse)
  async login(
    @Args()
    { message, signature, nonce, domain }: LoginParams,
    @Ctx() { prisma, req }: Context,
  ) {
    // Verify the signature
    const appClient = createAppClient({
      ethereum: viemConnector(),
    })
    const { success, fid } = await appClient.verifySignInMessage({
      message,
      signature,
      domain,
      nonce,
    })
    if (!success) {
      throw new GraphQLError('Invalid signature')
    }
    // Login
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { fid },
        update: {},
        create: { fid },
      })
      const authToken = await tx.authToken.create({
        data: {
          token: getAuthToken(user),
          userAgent: req?.headers['user-agent'] || 'Unknown',
          userId: user.id,
        },
      })
      return {
        token: authToken.token,
        user: user,
      }
    })
  }
}
