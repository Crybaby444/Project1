import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/** The audit log for every module that records admin actions (global: no import cycles). */
@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditCoreModule {}
