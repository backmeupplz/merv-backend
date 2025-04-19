import { CastAddBody, CastType } from '@farcaster/hub-nodejs'
import { MervReward } from '@generated/type-graphql'
import { publishCast } from 'helpers/hub'
import { type AuthorizedContext } from 'models/Context.js'
import {
  Arg,
  Authorized,
  Ctx,
  Field,
  InputType,
  Int,
  Mutation,
  registerEnumType,
  Resolver,
} from 'type-graphql'

registerEnumType(CastType, {
  name: 'CastType',
  description: 'Standard or long cast',
})

@InputType()
class CastIdInput {
  @Field(() => Int, { description: 'Fid of the user who created the cast' })
  fid!: number

  @Field(() => [Int], {
    description: 'Hash bytes of the cast, encoded as array of ints',
  })
  hash!: number[]
}

@InputType()
class EmbedInput {
  @Field({ nullable: true, description: 'URL to embed' })
  url?: string

  @Field(() => CastIdInput, {
    nullable: true,
    description: 'If embedding another cast, its id',
  })
  castId?: CastIdInput
}

@InputType({ description: 'All the fields needed to add a new cast' })
class CastAddBodyInput {
  @Field(() => String, { description: 'Text content of the cast' })
  text!: string

  @Field(() => [EmbedInput], {
    description: 'New embed objects (preferred)',
  })
  embeds!: EmbedInput[]

  @Field(() => [String], {
    description: 'Legacy embeds as raw URLs',
  })
  embedsDeprecated!: string[]

  @Field(() => [Int], {
    description: 'List of fids mentioned in the cast',
  })
  mentions!: number[]

  @Field(() => [Int], {
    description: 'Character positions for each mention',
  })
  mentionsPositions!: number[]

  @Field(() => CastType, { description: 'Type of the cast' })
  type!: CastType

  @Field(() => CastIdInput, {
    nullable: true,
    description: 'If this is a reply, the parent cast id',
  })
  parentCastId?: CastIdInput

  @Field({ nullable: true, description: 'If this is a reply, the parent URL' })
  parentUrl?: string
}

@Resolver()
export default class CastResolver {
  @Authorized()
  @Mutation(() => MervReward)
  async publishCast(
    @Ctx() { user, prisma }: AuthorizedContext,
    @Arg('username') username: string,
    @Arg('data', () => CastAddBodyInput) data: CastAddBodyInput,
  ) {
    const signer = await prisma.signer.findFirst({
      where: {
        ownerId: user.id,
        username,
      },
    })
    if (!signer) {
      throw new Error('Signer not found')
    }
    const body: CastAddBody = {
      text: data.text,
      embedsDeprecated: data.embedsDeprecated,
      mentions: data.mentions,
      mentionsPositions: data.mentionsPositions,
      type: data.type,
      embeds: data.embeds.map((e) => ({
        url: e.url,
        castId: e.castId
          ? {
              fid: e.castId.fid,
              hash: new Uint8Array(e.castId.hash),
            }
          : undefined,
      })),
      parentCastId: data.parentCastId
        ? {
            fid: data.parentCastId.fid,
            hash: new Uint8Array(data.parentCastId.hash),
          }
        : undefined,
      parentUrl: data.parentUrl,
    }
    await publishCast({
      data: body,
      fid: signer.fid,
      signerPrivateKey: signer.privateKey as `0x${string}`,
    })
  }
}
