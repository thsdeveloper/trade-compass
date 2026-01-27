import type { FastifyInstance } from 'fastify';
import { supabaseAdmin, createUserClient } from '../../lib/supabase.js';
import {
  getProfileByUserId,
  upsertProfile,
  getAvatarUploadUrl,
  deleteAvatar,
  getPublicAvatarUrl,
} from '../../data/profile-repository.js';

/**
 * Helper to extract user from Authorization header
 */
async function getUserFromToken(authHeader: string | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Token de autenticacao ausente' };
  }

  const token = authHeader.substring(7);

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: 'Token invalido ou expirado' };
  }

  return { user, token, error: null };
}

/**
 * Profile Routes
 *
 * Endpoints:
 * - GET /profile/get - Get current user's profile
 * - POST /profile/update - Update profile (name, phone)
 * - POST /profile/getUploadUrl - Get signed URL for avatar upload
 * - POST /profile/updateAvatarUrl - Update avatar URL after upload
 * - POST /profile/deleteAvatar - Delete avatar
 */
export async function profileRoutes(app: FastifyInstance) {
  /**
   * GET /profile/get
   *
   * Gets the current user's profile information.
   */
  app.get('/profile/get', async (request, reply) => {
    const { user, token, error } = await getUserFromToken(request.headers.authorization);

    if (!user || !token) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: error,
        statusCode: 401,
      });
    }

    try {
      const profile = await getProfileByUserId(user.id, token);

      return reply.status(200).send({
        full_name: profile?.full_name ?? null,
        phone: profile?.phone ?? null,
        avatar_url: profile?.avatar_url ?? null,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar perfil',
        statusCode: 500,
      });
    }
  });

  /**
   * POST /profile/update
   *
   * Updates the current user's profile.
   */
  app.post<{
    Body: { full_name?: string | null; phone?: string | null };
  }>('/profile/update', async (request, reply) => {
    const { user, token, error } = await getUserFromToken(request.headers.authorization);

    if (!user || !token) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: error,
        statusCode: 401,
      });
    }

    const { full_name, phone } = request.body;

    // Validate name
    if (full_name !== undefined && full_name !== null) {
      if (full_name.length < 2 || full_name.length > 100) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Nome deve ter entre 2 e 100 caracteres',
          statusCode: 400,
        });
      }
    }

    // Validate phone (Brazilian format)
    if (phone !== undefined && phone !== null && phone !== '') {
      const phoneRegex = /^(\+55\s?)?\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}$/;
      if (!phoneRegex.test(phone)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Telefone invalido',
          statusCode: 400,
        });
      }
    }

    try {
      const updates: { full_name?: string | null; phone?: string | null } = {};

      if (full_name !== undefined) {
        updates.full_name = full_name;
      }

      if (phone !== undefined) {
        updates.phone = phone === '' ? null : phone;
      }

      const profile = await upsertProfile(user.id, updates, token);

      return reply.status(200).send({
        full_name: profile.full_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao atualizar perfil',
        statusCode: 500,
      });
    }
  });

  /**
   * POST /profile/getUploadUrl
   *
   * Generates a signed URL for avatar upload.
   */
  app.post<{
    Body: { fileExtension: 'jpg' | 'jpeg' | 'png' | 'webp' };
  }>('/profile/getUploadUrl', async (request, reply) => {
    const { user, error } = await getUserFromToken(request.headers.authorization);

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: error,
        statusCode: 401,
      });
    }

    const { fileExtension } = request.body;

    if (!fileExtension || !['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Extensao de arquivo invalida. Use jpg, jpeg, png ou webp',
        statusCode: 400,
      });
    }

    try {
      const timestamp = Date.now();
      const fileName = `avatar_${timestamp}.${fileExtension}`;

      const { signedUrl, path } = await getAvatarUploadUrl(user.id, fileName);
      const publicUrl = getPublicAvatarUrl(path);

      return reply.status(200).send({
        signedUrl,
        publicUrl,
        path,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao gerar URL de upload',
        statusCode: 500,
      });
    }
  });

  /**
   * POST /profile/updateAvatarUrl
   *
   * Updates the avatar URL in the profile after successful upload.
   */
  app.post<{
    Body: { avatar_url: string };
  }>('/profile/updateAvatarUrl', async (request, reply) => {
    const { user, token, error } = await getUserFromToken(request.headers.authorization);

    if (!user || !token) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: error,
        statusCode: 401,
      });
    }

    const { avatar_url } = request.body;

    if (!avatar_url) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'URL do avatar e obrigatoria',
        statusCode: 400,
      });
    }

    try {
      const profile = await upsertProfile(user.id, { avatar_url }, token);

      return reply.status(200).send({
        avatar_url: profile.avatar_url,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao atualizar avatar',
        statusCode: 500,
      });
    }
  });

  /**
   * POST /profile/deleteAvatar
   *
   * Deletes the user's avatar from storage and clears the URL.
   */
  app.post('/profile/deleteAvatar', async (request, reply) => {
    const { user, token, error } = await getUserFromToken(request.headers.authorization);

    if (!user || !token) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: error,
        statusCode: 401,
      });
    }

    try {
      await deleteAvatar(user.id, token);

      return reply.status(200).send({
        message: 'Avatar removido com sucesso',
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao remover avatar',
        statusCode: 500,
      });
    }
  });
}
