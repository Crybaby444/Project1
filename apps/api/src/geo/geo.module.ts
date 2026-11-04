import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CLOCK, type Clock } from '../clock/clock';
import { ENV, type Env } from '../config/env';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';
import { GEO_SLEEP, NominatimClient, realSleep, type Sleep } from './nominatim.client';

@Module({
  imports: [AuthModule],
  controllers: [GeoController],
  providers: [
    { provide: GEO_SLEEP, useValue: realSleep },
    {
      provide: NominatimClient,
      inject: [ENV, CLOCK, GEO_SLEEP],
      // One client for the whole server: its one-request-a-second queue is shared by every user.
      useFactory: (env: Env, clock: Clock, sleep: Sleep) => new NominatimClient(env.NOMINATIM_URL, clock, sleep),
    },
    GeoService,
  ],
})
export class GeoModule {}
