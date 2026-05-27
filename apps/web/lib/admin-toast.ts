import { toast, type ExternalToast } from 'sonner';
import { getApiErrorMessage } from './api-error';

const ADMIN_TOAST_POSITION = 'top-center' as const;

function withAdminDefaults(options?: ExternalToast): ExternalToast {
  return { position: ADMIN_TOAST_POSITION, ...options };
}

/** Toast thống nhất cho khu vực admin (vị trí + message từ API). */
export const adminToast = {
  success(message: string, options?: ExternalToast) {
    return toast.success(message, withAdminDefaults(options));
  },

  error(message: string, options?: ExternalToast) {
    return toast.error(message, withAdminDefaults(options));
  },

  /** Hiển thị `error.body.message` khi là ApiRequestError. */
  errorFrom(error: unknown, fallback: string, options?: ExternalToast) {
    return toast.error(getApiErrorMessage(error, fallback), withAdminDefaults(options));
  },

  info(message: string, options?: ExternalToast) {
    return toast.info(message, withAdminDefaults(options));
  },

  warning(message: string, options?: ExternalToast) {
    return toast.warning(message, withAdminDefaults(options));
  },
};

export { getApiErrorMessage };
