import { getAuthToken } from 'helpers/jwt.js'
import type Context from 'models/Context.js'
import { Args, ArgsType, Ctx, Field, Mutation, Resolver } from 'type-graphql'

@ArgsType()
class LoginParams {
  @Field()
  password!: string
}

@Resolver()
export default class LoginResolver {
  @Mutation(() => String)
  async loginWithPassword(
    @Args()
    { password }: LoginParams,
    @Ctx() { prisma, req }: Context,
  ) {
    const passwordHash = await Bun.password.hash(password)
    const user = await prisma.user.upsert({
      where: {
        passwordHash,
      },
      create: {
        passwordHash,
      },
      update: {},
    })
    const authToken = await prisma.authToken.create({
      data: {
        token: getAuthToken(user),
        userAgent: req.headers['user-agent'] || 'Unknown',
        userId: user.id,
      },
    })
    return authToken.token
  }
}
