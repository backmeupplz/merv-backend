import { Post } from '@generated/type-graphql/models/Post.js'
import { prismaClient } from 'helpers/prismaClient.js'
import { type AuthorizedContext } from 'models/Context.js'
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from 'type-graphql'

@Resolver()
export default class PostsResolver {
  @Authorized()
  @Mutation(() => Post)
  async createPost(
    @Arg('title') title: string,
    @Arg('content') content: string,
    @Ctx() { user }: AuthorizedContext,
  ) {
    const post = await prismaClient.post.create({
      data: {
        authorId: user.id,
        content,
        title,
      },
    })

    return post
  }

  @Query(() => Post)
  async getPost(@Arg('id') id: string) {
    return prismaClient.post.findUnique({
      where: {
        id,
      },
    })
  }
}
