import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { AdminBootstrap } from './admin-bootstrap';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminBootstrap, RolesGuard],
})
export class AdminModule {}
