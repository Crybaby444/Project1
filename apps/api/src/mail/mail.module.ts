import { Module } from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import { createMailProvider, MAIL_PROVIDER } from './mail.provider';
import { MailService } from './mail.service';

@Module({
  providers: [
    { provide: MAIL_PROVIDER, inject: [ENV], useFactory: (env: Env) => createMailProvider(env) },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
