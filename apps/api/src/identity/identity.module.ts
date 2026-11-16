import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminIdentityController, IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({
  imports: [AuthModule],
  controllers: [IdentityController, AdminIdentityController],
  providers: [IdentityService],
})
export class IdentityModule {}
