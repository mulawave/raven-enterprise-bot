import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

export function createUploadsAuthMiddleware(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    const relativePath = req.path.replace(/^\/+/, '')

    if (relativePath.startsWith('settings/') || relativePath.startsWith('logos/')) {
      return next()
    }

    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      try {
        jwt.verify(token, jwtSecret)
        return next()
      } catch {
        return res.status(401).json({ statusCode: 401, message: 'Unauthorized' })
      }
    }

    return res.status(401).json({ statusCode: 401, message: 'Unauthorized' })
  }
}