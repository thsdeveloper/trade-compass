import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { supabaseAdmin, createUserClient } from '../../lib/supabase.js';

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email('Email inválido'),
        password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
      })
    )
    .mutation(async ({ input }) => {
      const { email, password } = input;

      const { data, error } = await supabaseAdmin.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }

      return {
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
        session: data.session,
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email('Email inválido'),
        password: z.string().min(1, 'Senha é obrigatória'),
      })
    )
    .mutation(async ({ input }) => {
      const { email, password } = input;

      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Credenciais inválidas',
        });
      }

      return {
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
        session: data.session,
      };
    }),

  recoverPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email('Email inválido'),
      })
    )
    .mutation(async ({ input }) => {
      const { email } = input;

      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password`,
      });

      // Don't reveal if email exists or not for security
      if (error) {
        return {
          message: 'Se o email existir, você receberá um link de recuperação',
        };
      }

      return {
        message: 'Email de recuperação enviado com sucesso',
      };
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        accessToken: z.string().min(1, 'Token é obrigatório'),
        newPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
      })
    )
    .mutation(async ({ input }) => {
      const { accessToken, newPassword } = input;

      // Verify token and get user
      const {
        data: { user },
        error: userError,
      } = await supabaseAdmin.auth.getUser(accessToken);

      if (userError || !user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Token inválido ou expirado',
        });
      }

      // Update password using admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );

      if (updateError) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: updateError.message,
        });
      }

      return {
        message: 'Senha atualizada com sucesso',
      };
    }),

  refresh: publicProcedure
    .input(
      z.object({
        refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
      })
    )
    .mutation(async ({ input }) => {
      const { refreshToken } = input;

      const { data, error } = await supabaseAdmin.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Token inválido ou expirado',
        });
      }

      return {
        session: data.session,
      };
    }),

  magicLink: publicProcedure
    .input(
      z.object({
        email: z.string().email('Email inválido'),
        platform: z.enum(['web', 'mobile']).default('web'),
      })
    )
    .mutation(async ({ input }) => {
      const { email, platform } = input;

      const redirectUrl =
        platform === 'mobile'
          ? process.env.MOBILE_REDIRECT_URL || 'exp://192.168.15.10:8081/--/auth'
          : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`;

      const { error } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      // Don't reveal if email exists or not for security
      if (error) {
        return {
          message: 'Se o email estiver cadastrado, você receberá um link de acesso',
        };
      }

      return {
        message: 'Link de acesso enviado para seu email',
      };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
      },
    };
  }),

  logout: publicProcedure.mutation(async () => {
    // Logout is primarily client-side in Supabase
    return {
      message: 'Logout realizado com sucesso',
    };
  }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
        newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { currentPassword, newPassword } = input;

      if (currentPassword === newPassword) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'A nova senha deve ser diferente da senha atual',
        });
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: ctx.user.email!,
        password: currentPassword,
      });

      if (signInError) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Senha atual incorreta',
        });
      }

      // Update password using admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        ctx.user.id,
        { password: newPassword }
      );

      if (updateError) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: updateError.message,
        });
      }

      return {
        message: 'Senha alterada com sucesso',
      };
    }),
});
