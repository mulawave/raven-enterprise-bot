import { VersionResolver } from './version.resolver'

export function deprecationWarningMiddleware(req: any, res: any, next: any) {
  const resolver = new VersionResolver()
  const version = resolver.resolve(req)
  if (version === 'v1') {
    res.setHeader('X-API-Deprecation', 'v1 endpoints will be deprecated in future releases. Please migrate to newer versions when available.')
  }
  next()
}
