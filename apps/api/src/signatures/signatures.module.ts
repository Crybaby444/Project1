import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BookingsModule } from '../bookings/bookings.module';
import { ENV, type Env } from '../config/env';
import { ContractService } from '../contracts/contract.service';
import { DokobitSignatureProvider } from './dokobit.provider';
import { SIGNATURE_PROVIDER } from './signature.provider';
import { DokobitPostbackController, SigningController } from './signing.controller';
import { SigningService } from './signing.service';

@Module({
  imports: [AuthModule, BookingsModule],
  controllers: [SigningController, DokobitPostbackController],
  providers: [
    {
      provide: SIGNATURE_PROVIDER,
      inject: [ENV],
      // `typed` (the default): no provider; `dokobit`: Dokobit Documents Gateway (owner: switched on later).
      useFactory: (env: Env) =>
        env.SIGNATURES === 'dokobit' && env.DOKOBIT_ACCESS_TOKEN ? new DokobitSignatureProvider({ accessToken: env.DOKOBIT_ACCESS_TOKEN, apiUrl: env.DOKOBIT_API_URL }) : null,
    },
    ContractService,
    SigningService,
  ],
})
export class SignaturesModule {}
