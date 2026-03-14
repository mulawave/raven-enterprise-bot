import { Request, Response, NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'

export function createUploadsAuthMiddleware(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    const relativePath = req.path.replace(/^\/+/, '')

    if (relativePath.startsWith('settings/') || relativePath.startsWith('logos/')) {
      // Public paths — allow any origin to load these assets (helmet sets
      // Cross-Origin-Resource-Policy: same-origin globally, which blocks
      // cross-origin <img> loads from app.raven-ai.online → api.raven-ai.online)
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
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