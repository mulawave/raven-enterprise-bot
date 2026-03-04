export class VersionResolver {
  resolve(req: any): string {
    const version = req.headers['x-api-version'] || req.headers['api-version']
    if (typeof version === 'string' && /^v\d+$/.test(version)) return version
    return 'v1'
  }
}
