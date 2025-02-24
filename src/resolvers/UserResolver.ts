import { User } from '@generated/type-graphql/models/User.js'
import { type AuthorizedContext } from 'models/Context.js'
import { Authorized, Ctx, Query, Resolver } from 'type-graphql'

@Resolver()
export default class UserResolver {
  @Authorized()
  @Query(() => User)
  async getMe(@Ctx() { user }: AuthorizedContext) {
    return user
  }
}
