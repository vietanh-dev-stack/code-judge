export function classInviteTemplate(params: {
  classroomName: string;
  inviterName?: string;
  inviteUrl: string;
}) {
  return `
  <div style="font-family: Arial, sans-serif; background:#f6f8fc; padding:40px;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; padding:28px; box-shadow:0 4px 20px rgba(0,0,0,0.06);">

      <h2 style="margin:0 0 16px; color:#1a73e8;">
        You're invited to join a class
      </h2>

      <p style="font-size:14px; color:#333;">
        <b>${params.inviterName || 'Teacher'}</b> invited you to join:
      </p>

      <div style="margin:16px 0; padding:16px; background:#f1f3f4; border-radius:8px;">
        <h3 style="margin:0; color:#202124;">
          ${params.classroomName}
        </h3>
      </div>

      <p style="font-size:13px; color:#5f6368;">
        Click the button below to accept the invitation.
      </p>

      <div style="text-align:center; margin:24px 0;">
        <a href="${params.inviteUrl}"
           style="
            background:#1a73e8;
            color:#fff;
            padding:12px 20px;
            border-radius:6px;
            text-decoration:none;
            font-weight:600;
            display:inline-block;
           ">
          Accept Invitation
        </a>
      </div>

      <p style="font-size:12px; color:#9aa0a6;">
        If the button doesn't work, copy this link:
      </p>

      <p style="font-size:12px; word-break:break-all; color:#1a73e8;">
        ${params.inviteUrl}
      </p>

      <hr style="margin:24px 0; border:none; border-top:1px solid #eee;" />

      <p style="font-size:11px; color:#9aa0a6;">
        CodeJudge • Classroom Invitation
      </p>

    </div>
  </div>
  `;
}
