'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus2, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { inviteToClassroom, searchUsers, UserSuggestion } from '@/services/invite.apis';

interface InviteModalProps {
  classRoomId: string;
}

export default function InviteModal({ classRoomId }: InviteModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!email.trim()) {
        setSuggestions([]);
        return;
      }

      try {
        const res = await searchUsers(email, classRoomId);
        setSuggestions(res);
        setShowSuggest(true);
      } catch (err) {
        console.error('Failed to search users:', err);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [email]);

  const handleInvite = async (targetEmail?: string) => {
    const finalEmail = targetEmail || email;
    if (!finalEmail.trim()) return;

    try {
      setLoading(true);

      await inviteToClassroom(classRoomId, { email: finalEmail });

      setEmail('');
      setSuggestions([]);
      setOpen(false);
    } catch (err: any) {
      alert(err?.body?.message ?? 'Failed to invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="cursor-pointer text-gray-600 hover:text-gray-800 transition-colors flex items-center gap-1">
        <UserPlus2 />
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] p-0">
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle>Invite students</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Type email address"
              className="border-b-2 rounded-none"
              onFocus={() => setShowSuggest(true)}
            />

            {/* DROPDOWN SUGGEST */}
            {showSuggest && (
              <div className="absolute z-[9999] mt-1 w-full bg-white border rounded shadow max-h-60 overflow-auto">
                {suggestions.length === 0 ? (
                  <div className="p-2 text-sm text-gray-400">No matching users</div>
                ) : (
                  suggestions.map((user) => (
                    <div
                      key={user.id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                      onClick={() => {
                        setEmail(user.email);
                        setShowSuggest(false);
                      }}
                    >
                      <div className="font-medium">{user.name}</div>
                      <div className="text-gray-500">{user.email}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 bg-gray-50">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>

          <Button onClick={() => handleInvite()} disabled={!email || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invite'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
