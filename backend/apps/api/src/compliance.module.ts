/**
 * ComplianceModule — consent tracking, data retention and feature flag services.
 */
import { Module } from '@nestjs/common'

import { ConsentTracker } from '../../../libs/compliance/consent.service'
import { DataRetentionService } from '../../../libs/compliance/retention.service'
import { FeatureFlagService } from '../../../libs/config/feature-flag.service'

@Module({
  providers: [ConsentTracker, DataRetentionService, FeatureFlagService],
  exports: [ConsentTracker, DataRetentionService, FeatureFlagService],
})
export class ComplianceModule {}
