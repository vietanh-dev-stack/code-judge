export function assignmentNotificationTemplate(params: {
  classroomName: string;
  type: 'problem' | 'contest';
  title: string;
  description?: string;
  dueAt?: string;
  url: string;
}) {
  const typeLabel = params.type === 'problem' ? 'Assignment' : 'Contest';
  const color = params.type === 'problem' ? '#1a73e8' : '#e91e63';

  return `
  <div style="font-family: Arial, sans-serif; background:#f6f8fc; padding:40px;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; padding:28px; box-shadow:0 4px 20px rgba(0,0,0,0.06);">

      <h2 style="margin:0 0 16px; color:${color};">
        New ${typeLabel} Posted
      </h2>

      <p style="font-size:14px; color:#333;">
        A new ${params.type} has been posted in your class <b>${params.classroomName}</b>:
      </p>

      <div style="margin:16px 0; padding:16px; background:#f1f3f4; border-radius:8px;">
        <h3 style="margin:0; color:#202124;">
          ${params.title}
        </h3>
        ${params.description ? `<p style="font-size:13px; color:#5f6368; margin:8px 0 0;">${params.description}</p>` : ''}
        ${params.dueAt ? `<p style="font-size:13px; color:#d93025; margin:8px 0 0;"><b>Due date:</b> ${params.dueAt}</p>` : ''}
      </div>

      <div style="text-align:center; margin:24px 0;">
        <a href="${params.url}"
           style="
            background:${color};
            color:#fff;
            padding:12px 20px;
            border-radius:6px;
            text-decoration:none;
            font-weight:600;
            display:inline-block;
           ">
          View ${typeLabel}
        </a>
      </div>

      <p style="font-size:12px; color:#9aa0a6;">
        If the button doesn't work, copy this link:
      </p>

      <p style="font-size:12px; word-break:break-all; color:${color};">
        ${params.url}
      </p>

      <hr style="margin:24px 0; border:none; border-top:1px solid #eee;" />

      <p style="font-size:11px; color:#9aa0a6;">
        CodeJudge • New ${typeLabel} Notification
      </p>

    </div>
  </div>
  `;
}
