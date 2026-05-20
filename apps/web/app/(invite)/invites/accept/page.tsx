import { Suspense } from 'react';
import { AcceptInviteContent } from './AcceptInviteContent';

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">Accepting invitation...</div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
