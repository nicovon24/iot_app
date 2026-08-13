import { toast } from 'sonner';
import { ApiError } from '../api';

export function toastError(title: string, error: unknown) {
  const description = error instanceof ApiError ? error.message : error ? 'Unknown error' : undefined;
  toast.error(title, { description });
}

export function toastSuccess(title: string, description?: string) {
  toast.success(title, { description });
}
