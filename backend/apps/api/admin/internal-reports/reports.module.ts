import { ReportsService } from './reports.service'
import { InternalReportsController } from './reports.controller'

/** All internal-reports providers — registered in AppModule directly. */
export const INTERNAL_REPORTS_SERVICES = [ReportsService, InternalReportsController]
