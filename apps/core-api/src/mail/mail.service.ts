import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { classInviteTemplate } from './templates/class-invite.template';
import { assignmentNotificationTemplate } from './templates/assignment-notification.template';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('MAIL_ACCOUNT'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendInviteMail(params: {
    to: string;
    classroomName: string;
    inviterName?: string;
    inviteUrl: string;
  }) {
    const html = classInviteTemplate(params);

    await this.transporter.sendMail({
      from: `CodeJudge <${this.configService.get('MAIL_ACCOUNT')}>`,
      to: params.to,
      subject: `Invitation to join ${params.classroomName}`,
      html,
    });
  }

  async sendAssignmentNotification(params: {
    to: string[];
    classroomName: string;
    type: 'problem' | 'contest';
    title: string;
    description?: string;
    dueAt?: string;
    url: string;
  }) {
    if (params.to.length === 0) return;

    const fromEmail = this.configService.get<string>('MAIL_ACCOUNT');
    if (!fromEmail) {
      console.warn('[MailerService] MAIL_ACCOUNT not configured, skipping assignment notification');
      return;
    }

    const html = assignmentNotificationTemplate(params);
    const typeLabel = params.type === 'problem' ? 'Assignment' : 'Contest';

    console.log(`[MailerService] Sending ${typeLabel} notification to ${params.to.length} recipients via BCC`);

    await this.transporter.sendMail({
      from: `CodeJudge <${fromEmail}>`,
      to: 'noreply@codejudge.com', // Dummy address to avoid notifying the teacher
      bcc: params.to, // Notifications only to students via BCC
      subject: `[${params.classroomName}] New ${typeLabel}: ${params.title}`,
      html,
    });
  }
}
