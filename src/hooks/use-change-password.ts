import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { changePassword } from '@/lib/api';

function parseApiError(err: unknown): string {
  if (err instanceof Error && err.message) {
    try {
      const parsed = JSON.parse(err.message) as { msg?: string; errors?: { msg: string }[] };
      if (parsed.msg) return parsed.msg;
      if (parsed.errors?.[0]?.msg) return parsed.errors[0].msg;
    } catch {
      return err.message;
    }
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}

export function useChangePassword() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetPasswordFields = useCallback(() => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, []);

  /** True when no password change requested, or change succeeded. False on validation/API error. */
  const submitPasswordChange = useCallback(async (): Promise<boolean> => {
    const hasAny = Boolean(currentPassword || newPassword || confirmPassword);
    if (!hasAny) return true;

    if (!currentPassword.trim()) {
      toast({
        title: 'Current password required',
        description: 'Enter your current password to set a new one.',
        variant: 'destructive',
      });
      return false;
    }
    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'New password must be at least 6 characters.',
        variant: 'destructive',
      });
      return false;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'New password and confirmation must match.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      resetPasswordFields();
      toast({
        title: 'Password updated',
        description: 'You can sign in with your new password next time.',
      });
      return true;
    } catch (err) {
      toast({
        title: 'Password change failed',
        description: parseApiError(err),
        variant: 'destructive',
      });
      return false;
    }
  }, [currentPassword, newPassword, confirmPassword, resetPasswordFields, toast]);

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    submitPasswordChange,
    resetPasswordFields,
  };
}
