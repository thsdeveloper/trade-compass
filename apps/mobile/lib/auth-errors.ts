import type { AuthError } from '@supabase/supabase-js';

/** Traduz erros de OTP do Supabase para mensagens acionáveis ao usuário. */
export function friendlyOtpError(error: AuthError): string {
  switch (error.code) {
    case 'over_email_send_rate_limit':
      return 'Muitos códigos enviados para este email. Aguarde alguns minutos e tente novamente.';
    case 'email_address_invalid':
      return 'Este email não é válido. Confira e tente de novo.';
    case 'signup_disabled':
      return 'Cadastro de novas contas está temporariamente desativado.';
    case 'otp_disabled':
      return 'Login por código está desativado. Use email e senha.';
    default:
      return 'Não foi possível enviar o código. Tente novamente.';
  }
}
