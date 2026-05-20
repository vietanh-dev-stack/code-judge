'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl">
        <DialogHeader className="flex flex-col items-center pt-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${variant === 'destructive' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}
          >
            <AlertCircle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">{title}</DialogTitle>
          <DialogDescription className="text-center pt-2">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6 sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer sm:w-32 rounded-xl hover:bg-gray-100"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={loading}
            className={`cursor-pointer sm:w-32 border-0 rounded-xl ${variant === 'default' ? 'bg-black hover:bg-gray-800 text-white' : ''}`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
