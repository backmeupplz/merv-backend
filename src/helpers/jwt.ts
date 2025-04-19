import { type User } from '@prisma/client'
import env from 'helpers/env.js'
import jwt from 'jsonwebtoken'

export function getAuthToken(user: User) {
  return jwt.sign(
    { userId: user.id, createdAt: new Date().getTime() },
    env.JWT_SECRET,
  )
}

export function verifyAuthToken(jwtString: string) {
  return jwt.verify(jwtString, env.JWT_SECRET)
}
