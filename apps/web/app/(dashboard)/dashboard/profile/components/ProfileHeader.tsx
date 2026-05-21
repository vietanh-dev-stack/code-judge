'use client';

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Camera, Check, Code2, KeyRound, MailCheck, Pencil, X } from 'lucide-react';
import type { UserProfile } from '@/services/auth.apis';
import { profileApi } from '@/services/profile.apis';
import { usersApi } from '@/services/user.apis';
import { useAuthStore } from '@/store/auth-store';
import type { UserProfileStats } from '@/services/profile.apis';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ProfileHeaderProps {
  user: UserProfile;
  stats: UserProfileStats | null;
  statsLoading: boolean;
}

export function ProfileHeader({ user, stats, statsLoading }: ProfileHeaderProps) {
  const { refreshUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [nameSaveStatus, setNameSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [nameSaveError, setNameSaveError] = useState<string | null>(null);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'success' | 'error'>(
    'idle',
  );
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [passwordTouched, setPasswordTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  useEffect(() => {
    if (!isEditingName) {
      setEditName(user.name);
    }
  }, [user.name, isEditingName]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const startEditingName = () => {
    setEditName(user.name);
    setNameSaveError(null);
    setNameSaveStatus('idle');
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setEditName(user.name);
    setNameSaveError(null);
    setNameSaveStatus('idle');
    setIsEditingName(false);
  };

  const handleSaveName = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setNameSaveError('Name field cannot be empty');
      setNameSaveStatus('error');
      return;
    }
    if (trimmed === user.name) {
      setIsEditingName(false);
      return;
    }

    setNameSaveError(null);
    setNameSaveStatus('saving');
    try {
      await usersApi.updateMe({ name: trimmed });
      await refreshUser();
      setNameSaveStatus('idle');
      setIsEditingName(false);
    } catch (error) {
      setNameSaveStatus('error');
      setNameSaveError(error instanceof Error ? error.message : 'Failed to save name');
    }
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleSaveName();
    }
    if (event.key === 'Escape') {
      cancelEditingName();
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordStatus('idle');
    setPasswordFieldErrors({});
    setPasswordTouched({
      currentPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
  };

  const validatePasswordFields = (
    values: {
      current: string;
      next: string;
      confirm: string;
    },
    markAllTouched = false,
  ) => {
    const errors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!values.current.trim()) {
      errors.currentPassword = 'Please enter your current password';
    }

    if (!values.next) {
      errors.newPassword = 'Please enter a new password';
    } else if (values.next.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters long';
    } else if (values.current && values.next === values.current) {
      errors.newPassword = 'New password must be different from the current password';
    }

    if (!values.confirm) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (values.next && values.confirm !== values.next) {
      errors.confirmPassword = 'Password confirmation does not match the new password';
    }

    if (markAllTouched) {
      setPasswordTouched({
        currentPassword: true,
        newPassword: true,
        confirmPassword: true,
      });
    }

    setPasswordFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openPasswordModal = () => {
    resetPasswordForm();
    setPasswordModalOpen(true);
  };

  const handlePasswordModalChange = (open: boolean) => {
    setPasswordModalOpen(open);
    if (!open) resetPasswordForm();
  };

  const handleChangePassword = async () => {
    const isValid = validatePasswordFields(
      {
        current: currentPassword,
        next: newPassword,
        confirm: confirmPassword,
      },
      true,
    );
    if (!isValid) {
      setPasswordStatus('error');
      return;
    }

    setPasswordError(null);
    setPasswordStatus('saving');
    try {
      await profileApi.changePassword({ currentPassword, newPassword });
      setPasswordStatus('success');
      resetPasswordForm();
      setTimeout(() => {
        setPasswordModalOpen(false);
        setPasswordStatus('idle');
      }, 1200);
    } catch (error) {
      setPasswordStatus('error');
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    }
  };

  const handleAvatarInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      const extension = file.name.split('.').pop() ?? 'bin';
      const uploadData = await usersApi.getAvatarUploadUrl(extension);
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error('Failed to upload image to MinIO');
      await usersApi.confirmAvatar(uploadData.objectKey);
      setAvatarLoadError(false);
      await refreshUser();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 md:p-8 pb-16 -mt-16 relative z-10 mb-8">
      {uploadError && (
        <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {uploadError}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex flex-col items-center md:items-start md:col-span-1">
          <div className="relative mb-4">
            <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-primary/40 via-primary/10 to-transparent p-[3px] shadow-lg shadow-primary/20">
              <div className="relative h-full w-full overflow-hidden rounded-full border border-border/60 bg-secondary">
                {!avatarLoadError && user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarLoadError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-3xl font-semibold text-foreground/80">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-medium text-white">
                    Đang tải...
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-0 cursor-pointer rounded-full border border-border/50 bg-card p-2 text-primary shadow-md transition-all hover:scale-105 hover:bg-accent"
              disabled={isUploading}
              aria-label="Đổi ảnh đại diện"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarInputChange}
            />
          </div>

          <div className="w-full flex flex-col items-center md:items-start gap-1">
            {isEditingName ? (
              <div className="w-full max-w-xs space-y-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  disabled={nameSaveStatus === 'saving'}
                  maxLength={120}
                  className="w-full rounded-lg border border-primary bg-background px-3 py-2 text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  aria-label="Tên người dùng"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveName()}
                    disabled={nameSaveStatus === 'saving'}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                    aria-label="Lưu tên"
                  >
                    <Check className="h-4 w-4" />
                    {nameSaveStatus === 'saving' ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditingName}
                    disabled={nameSaveStatus === 'saving'}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-60"
                    aria-label="Cancel"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
                {nameSaveStatus === 'error' && nameSaveError && (
                  <p className="text-xs text-destructive">{nameSaveError}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <h1 className="text-2xl md:text-3xl font-bold text-center md:text-left">
                  {user.name}
                </h1>
                <button
                  type="button"
                  onClick={startEditingName}
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Edit name"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <p className="text-muted-foreground flex items-center gap-1 mt-2">
            <MailCheck className="w-4 h-4 shrink-0" />
            {user.email}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Joined at {new Date(user.createdAt).toLocaleDateString('vi-VN')}
          </p>
        </div>

        <div className="md:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">
                {statsLoading ? '—' : (stats?.problemsSolved ?? 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Problems Solved</div>
            </div>
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">
                {statsLoading ? '—' : `${stats?.successRate ?? 0}%`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Success Rate</div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={openPasswordModal}
        className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all duration-200 hover:border-primary/40 hover:bg-accent hover:text-accent-foreground hover:shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
      >
        <KeyRound className="h-4 w-4" />
        Change Password
      </button>

      <Dialog open={passwordModalOpen} onOpenChange={handlePasswordModalChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="space-y-5 px-6 pt-6 pb-2">
            <DialogHeader className="text-left">
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>
                Enter your current password and new password. Google login accounts cannot change
                their password here.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium">Current Password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrentPassword(value);
                    if (passwordTouched.currentPassword || passwordFieldErrors.currentPassword) {
                      validatePasswordFields({
                        current: value,
                        next: newPassword,
                        confirm: confirmPassword,
                      });
                    }
                  }}
                  onBlur={() => {
                    setPasswordTouched((t) => ({ ...t, currentPassword: true }));
                    validatePasswordFields({
                      current: currentPassword,
                      next: newPassword,
                      confirm: confirmPassword,
                    });
                  }}
                  disabled={passwordStatus === 'saving'}
                  className={`mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/25 ${
                    passwordTouched.currentPassword && passwordFieldErrors.currentPassword
                      ? 'border-destructive'
                      : 'border-border'
                  }`}
                  autoComplete="current-password"
                />
                {passwordTouched.currentPassword && passwordFieldErrors.currentPassword && (
                  <p className="mt-1.5 text-xs text-destructive">
                    {passwordFieldErrors.currentPassword}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-medium">New Password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewPassword(value);
                    if (passwordTouched.newPassword || passwordFieldErrors.newPassword) {
                      validatePasswordFields({
                        current: currentPassword,
                        next: value,
                        confirm: confirmPassword,
                      });
                    }
                  }}
                  onBlur={() => {
                    setPasswordTouched((t) => ({ ...t, newPassword: true }));
                    validatePasswordFields({
                      current: currentPassword,
                      next: newPassword,
                      confirm: confirmPassword,
                    });
                  }}
                  disabled={passwordStatus === 'saving'}
                  className={`mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/25 ${
                    passwordTouched.newPassword && passwordFieldErrors.newPassword
                      ? 'border-destructive'
                      : 'border-border'
                  }`}
                  autoComplete="new-password"
                />
                {passwordTouched.newPassword && passwordFieldErrors.newPassword ? (
                  <p className="mt-1.5 text-xs text-destructive">
                    {passwordFieldErrors.newPassword}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">Minimum 8 characters</p>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-medium">Confirm New Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    const value = e.target.value;
                    setConfirmPassword(value);
                    if (passwordTouched.confirmPassword || passwordFieldErrors.confirmPassword) {
                      validatePasswordFields({
                        current: currentPassword,
                        next: newPassword,
                        confirm: value,
                      });
                    }
                  }}
                  onBlur={() => {
                    setPasswordTouched((t) => ({ ...t, confirmPassword: true }));
                    validatePasswordFields({
                      current: currentPassword,
                      next: newPassword,
                      confirm: confirmPassword,
                    });
                  }}
                  disabled={passwordStatus === 'saving'}
                  className={`mt-2 w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/25 ${
                    passwordTouched.confirmPassword && passwordFieldErrors.confirmPassword
                      ? 'border-destructive'
                      : 'border-border'
                  }`}
                  autoComplete="new-password"
                />
                {passwordTouched.confirmPassword && passwordFieldErrors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-destructive">
                    {passwordFieldErrors.confirmPassword}
                  </p>
                )}
              </label>

              {passwordStatus === 'success' && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Password changed successfully.
                </p>
              )}
              {passwordStatus === 'error' && passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
          </div>

          <DialogFooter
            className="mt-0 gap-3 border-t border-border bg-muted/30 px-6 py-4 sm:justify-end"
            style={{ marginBottom: '0px' }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => handlePasswordModalChange(false)}
              disabled={passwordStatus === 'saving'}
              className="min-w-[88px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleChangePassword()}
              disabled={passwordStatus === 'saving'}
              className="min-w-[120px]"
            >
              {passwordStatus === 'saving' ? 'Saving...' : 'Save Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {stats && stats.languages.length > 0 && (
        <div className="mt-8 pt-8 border-t border-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            Favorite Languages
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.languages.map((item) => (
              <span
                key={item.language}
                className="bg-secondary text-foreground px-4 py-2 rounded-full text-sm font-medium"
              >
                {item.language} ({item.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
