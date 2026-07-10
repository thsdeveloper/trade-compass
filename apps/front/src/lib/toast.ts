import { toast as sonnerToast, type ExternalToast } from 'sonner';

type ToastOptions = Omit<ExternalToast, 'description'> & {
  description?: string;
};

/**
 * Utilitario de notificacoes toast
 *
 * Uso:
 *   import { toast } from '@/lib/toast';
 *
 *   toast.success('Conta criada com sucesso');
 *   toast.error('Erro ao salvar');
 *   toast.apiError(error); // Extrai mensagem de Error automaticamente
 */
export const toast = {
  success: (message: string, options?: ToastOptions) => {
    sonnerToast.success(message, options);
  },

  error: (message: string, options?: ToastOptions) => {
    sonnerToast.error(message, options);
  },

  warning: (message: string, options?: ToastOptions) => {
    sonnerToast.warning(message, options);
  },

  info: (message: string, options?: ToastOptions) => {
    sonnerToast.info(message, options);
  },

  /**
   * Trata erros da API de forma consistente
   * Extrai a mensagem do objeto Error e exibe toast de erro
   */
  apiError: (error: unknown, fallbackMessage = 'Ocorreu um erro inesperado') => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    sonnerToast.error(message);
  },

  /**
   * Toast baseado em Promise para operacoes async
   * Exibe estados de loading, success e error automaticamente
   */
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return sonnerToast.promise(promise, options);
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },
};
