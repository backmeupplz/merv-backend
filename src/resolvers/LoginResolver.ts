import { User } from '@generated/type-graphql/models/User.js'
import { GraphQLError } from 'graphql'
import { getAuthToken } from 'helpers/jwt.js'
import privy from 'helpers/privy'
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
  token!: string
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
  async loginWithPrivy(
    @Args()
    { token }: LoginParams,
    @Ctx() { prisma, req }: Context,
  ) {
    // Get user
    const verifiedToken = await privy.verifyAuthToken(token)
    const { farcaster, wallet } = await privy.getUserById(verifiedToken.userId)

    if (!farcaster) throw new GraphQLError('No social data provided')

    const avatar = farcaster.pfp || null
    const fid = farcaster.fid

    // See if it's a login
    const user = await prisma.user.findUnique({
      where: {
        privyUserId: verifiedToken.userId,
      },
    })

    if (user) {
      const authToken = await prisma.authToken.create({
        data: {
          token: getAuthToken(user),
          userAgent: req.headers['user-agent'] || 'Unknown',
          userId: user.id,
        },
      })
      if (avatar) {
        await prisma.user.update({
          data: {
            pfpUrl: avatar,
          },
          where: {
            id: user.id,
          },
        })
      }
      return {
        token: authToken.token,
        user,
      }
    }

    const newUser = await prisma.$transaction(async (tx) => {
      const username = farcaster.username
      if (!username) {
        throw new GraphQLError('No username provided')
      }
      const existingUser = await tx.user.findUnique({
        where: {
          username,
        },
      })
      if (existingUser) {
        throw new GraphQLError('Username already taken')
      }
      const latestPassId = await tx.user.findFirst({
        orderBy: {
          passId: 'desc',
        },
        select: {
          passId: true,
        },
      })
      const user = await tx.user.create({
        data: {
          privyUserId: verifiedToken.userId,
          username,
          passId: latestPassId ? latestPassId.passId + 1 : 1,
          pfpUrl: avatar,
          fid,
          ethAddress: wallet?.address,
        },
      })
      return user
    })
    const authToken = await prisma.authToken.create({
      data: {
        token: getAuthToken(newUser),
        userAgent: req.headers['user-agent'] || 'Unknown',
        userId: newUser.id,
      },
    })
    return {
      token: authToken.token,
      user: newUser,
    }
  }
}
