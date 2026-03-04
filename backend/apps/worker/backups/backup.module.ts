import { runTenantBackup } from './backup.worker'
import { runTenantRestore } from './restore.worker'

export const BACKUP_WORKERS = [runTenantBackup, runTenantRestore]
