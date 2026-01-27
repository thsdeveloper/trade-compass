import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc.js';
import {
  getProfileByUserId,
  upsertProfile,
  getAvatarUploadUrl,
  deleteAvatar,
  getPublicAvatarUrl,
} from '../../data/profile-repository.js';

const phoneRegex = /^(\+55\s?)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}$/;

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getProfileByUserId(ctx.user.id, ctx.accessToken);

    return {
      full_name: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      avatar_url: profile?.avatar_url ?? null,
    };
  }),

  update: protectedProcedure
    .input(
      z.object({
        full_name: z
          .string()
          .min(2, 'Nome deve ter no mínimo 2 caracteres')
          .max(100, 'Nome deve ter no máximo 100 caracteres')
          .optional()
          .nullable(),
        phone: z
          .string()
          .regex(phoneRegex, 'Telefone inválido')
          .optional()
          .nullable()
          .or(z.literal('')),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates: { full_name?: string | null; phone?: string | null } = {};

      if (input.full_name !== undefined) {
        updates.full_name = input.full_name;
      }

      if (input.phone !== undefined) {
        updates.phone = input.phone === '' ? null : input.phone;
      }

      const profile = await upsertProfile(ctx.user.id, updates, ctx.accessToken);

      return {
        full_name: profile.full_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
      };
    }),

  getUploadUrl: protectedProcedure
    .input(
      z.object({
        fileExtension: z.enum(['jpg', 'jpeg', 'png', 'webp']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const timestamp = Date.now();
      const fileName = `avatar_${timestamp}.${input.fileExtension}`;

      const { signedUrl, path } = await getAvatarUploadUrl(ctx.user.id, fileName);
      const publicUrl = getPublicAvatarUrl(path);

      return {
        signedUrl,
        publicUrl,
        path,
      };
    }),

  updateAvatarUrl: protectedProcedure
    .input(
      z.object({
        avatar_url: z.string().url('URL inválida'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await upsertProfile(
        ctx.user.id,
        { avatar_url: input.avatar_url },
        ctx.accessToken
      );

      return {
        avatar_url: profile.avatar_url,
      };
    }),

  deleteAvatar: protectedProcedure.mutation(async ({ ctx }) => {
    await deleteAvatar(ctx.user.id, ctx.accessToken);

    return {
      message: 'Avatar removido com sucesso',
    };
  }),
});
