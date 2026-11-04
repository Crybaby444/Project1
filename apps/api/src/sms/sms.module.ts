import { Module } from '@nestjs/common';
import { ENV, type Env } from '../config/env';
import { MailModule } from '../mail/mail.module';
import { MailService } from '../mail/mail.service';
import { MailboxSmsProvider } from './mailbox-sms.provider';
import { SMS_PROVIDER, type SmsProvider } from './sms.provider';

@Module({
  imports: [MailModule],
  providers: [
    {
      provide: SMS_PROVIDER,
      inject: [ENV, MailService],
      useFactory: (env: Env, mail: MailService): SmsProvider | null =>
        env.SMS_PROVIDER === 'mailbox' ? new MailboxSmsProvider(mail) : null,
    },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
