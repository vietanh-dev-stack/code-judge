import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailerService } from './mail.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailModule {}
