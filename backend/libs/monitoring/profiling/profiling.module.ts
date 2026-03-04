import { ProfilerService } from './profiler.service'
import { profilerMiddleware } from './profiler.middleware'

export const PROFILING_SERVICES = [ProfilerService, profilerMiddleware]
