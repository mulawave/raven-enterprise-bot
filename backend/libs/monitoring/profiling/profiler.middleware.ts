export function profilerMiddleware(req: any, res: any, next: any) {
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const end = process.hrtime.bigint()
    const durationMs = Number(end - start) / 1e6
    if (req.services?.profiler) {
      req.services.profiler.recordApiResponse(req.path, durationMs)
    }
  })
  next()
}
