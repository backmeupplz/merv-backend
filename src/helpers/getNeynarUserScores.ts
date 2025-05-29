export default async function getNeynarUsers(fids: number[]) {
  const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids.join(',')}`
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-neynar-experimental': 'true',
      'x-api-key': 'AEF3E1E8-6B6B-4D68-B7A0-7D14A923CBC2',
    },
  }

  const { users } = (await fetch(url, options).then((res) => res.json())) as {
    users: {
      fid: number
      username: string
      display_name: string
      pfp_url: string
      custody_address: string
      profile: {
        bio: {
          text: string
        }
      }
      follower_count: number
      following_count: number
      verifications: string[]
      verified_addresses: {
        eth_addresses: string[]
        sol_addresses: string[]
        primary?: {
          eth_address?: `0x${string}`
          sol_address?: string
        }
      }
      verified_accounts: {
        platform: string
        username: string
      }[]
      power_badge: boolean
      experimental?: {
        neynar_user_score?: number
        deprecation_notice?: string
      }
      score: number
    }[]
    next?: {
      cursor: string | null
    }
  }
  return users
}
