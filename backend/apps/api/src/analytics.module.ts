/**
 * AnalyticsModule — tenant analytics ingestion, daily aggregation, enterprise reports and exports.
 */
import { Module } from '@nestjs/common'

// Controllers
import { AnalyticsController } from '../admin/analytics.controller'
import { EnterpriseReportsController } from '../admin/enterprise-reports/enterprise.reports.controller'
import { InternalReportsController } from '../admin/internal-reports/reports.controller'
import { ExportController } from '../admin/exports/export.controller'

// Services
import { TenantAnalyticsStore } from '../../../libs/monitoring/analytics.store'
import { EventCollector } from '../../worker/analytics/event.collector'
import { DailyAggregator } from '../../worker/analytics/daily.aggregator'
import { EnterpriseReportsService } from '../admin/enterprise-reports/enterprise.reports.service'
import { ReportsService } from '../admin/internal-reports/reports.service'
import { ExportService } from '../admin/exports/export.service'

@Module({
  controllers: [
    AnalyticsController,
    EnterpriseReportsController,
    InternalReportsController,
    ExportController,
  ],
  providers: [
    TenantAnalyticsStore,
    EventCollector,
    DailyAggregator,
    EnterpriseReportsService,
    ReportsService,
    ExportService,
  ],
  exports: [TenantAnalyticsStore, EventCollector, DailyAggregator],
})
export class AnalyticsModule {}
