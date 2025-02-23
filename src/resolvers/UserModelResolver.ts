import { User } from '@generated/type-graphql/models/User.js'
import { FieldResolver, Resolver, Root } from 'type-graphql'

@Resolver(() => User)
export default class UserModelResolver {
  @FieldResolver(() => Boolean)
  isNewUser(@Root() user: User) {
    return user.createdAt === user.updatedAt
  }
}
