/**
 * ComplianceModule — consent tracking, data retention and feature flag services.
 */
import { Module } from '@nestjs/common'

import { ConsentTracker } from '../../../libs/compliance/consent.service'
import { DataRetentionService } from '../../../libs/compliance/retention.service'
import { DataDeletionService } from '../../../libs/compliance/data-deletion.service'
import { FeatureFlagService } from '../../../libs/config/feature-flag.service'

@Module({
  providers: [ConsentTracker, DataRetentionService, DataDeletionService, FeatureFlagService],
  exports: [ConsentTracker, DataRetentionService, DataDeletionService, FeatureFlagService],
})
export class ComplianceModule {}
