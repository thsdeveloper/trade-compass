import type { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../../lib/supabase.js';

/**
 * Authentication Routes
 *
 * Registers all authentication-related endpoints with the Fastify server.
 * All endpoints use Supabase Auth for user management and session handling.
 *
 * Endpoints:
 * - POST /auth/register - Create new user account
 * - POST /auth/login - Authenticate existing user
 * - POST /auth/recover-password - Initiate password recovery flow
 * - POST /auth/reset-password - Complete password reset with token
 * - POST /auth/refresh - Refresh expired access token
 * - GET /auth/me - Get current authenticated user
 * - POST /auth/logout - Acknowledge user logout
 *
 * @param app - Fastify application instance
 */
export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /auth/register
   *
   * Creates a new user account in Supabase.
   * Returns user info and session tokens on success.
   *
   * Request Body:
   * - email: string (required)
   * - password: string (required, min 6 characters)
   *
   * Response (201):
   * - user: { id: string, email: string }
   * - session: Session object with access_token and refresh_token
   *
   * Errors:
   * - 400: Missing email/password or password too short
   * - 400: Registration failed (email already exists, etc.)
   * - 500: Server error
   */
  app.post<{
    Body: { email: string; password: string };
  }>('/auth/register', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Email e senha são obrigatórios',
        statusCode: 400,
      });
    }

    if (password.length < 6) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Senha deve ter no mínimo 6 caracteres',
        statusCode: 400,
      });
    }

    try {
      const { data, error } = await supabaseAdmin.auth.signUp({
        email,
        password,
      });

      if (error) {
        return reply.status(400).send({
          error: 'Registration Failed',
          message: error.message,
          statusCode: 400,
        });
      }

      return reply.status(201).send({
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
        session: data.session,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao criar usuário',
        statusCode: 500,
      });
    }
  });

  /**
   * POST /auth/login
   *
   * Authenticates a user with email and password.
   * Returns user info and session tokens on success.
   *
   * Request Body:
   * - email: string (required)
   * - password: string (required)
   *
   * Response (200):
   * - user: { id: string, email: string }
   * - session: Session object with access_token and refresh_token
   *
   * Errors:
   * - 400: Missing email/password
   * - 401: Invalid credentials
   * - 500: Server error
   */
  app.post<{
    Body: { email: string; password: string };
  }>('/auth/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Email e senha são obrigatórios',
        statusCode: 400,
      });
    }

    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return reply.status(401).send({
          error: 'Authentication Failed',
          message: 'Credenciais inválidas',
          statusCode: 401,
        });
      }

      return reply.status(200).send({
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
        session: data.session,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao fazer login',
        statusCode: 500,
      });
    }
  });

  /**
   * POST /auth/recover-password
   *
   * Initiates password recovery by sending reset email via Supabase.
   * Always returns success to prevent email enumeration attacks.
   *
   * Request Body:
   * - email: string (required)
   *
   * Response (200):
   * - message: Success message (same whether email exists or not)
   *
   * Note: The reset link redirects to FRONTEND_URL/auth/reset-password
   * with an access_token query parameter.
   *
   * Errors:
   * - 400: Missing email
   * - 500: Server error
   */
  app.post<{
    Body: { email: string };
  }>('/auth/recover-password', async (request, reply) => {
    const { email } = request.body;

    if (!email) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Email é obrigatório',
        statusCode: 400,
      });
    }

    try {
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password`,
      });

      if (error) {
        app.log.error(error);
        // Don't reveal if email exists or not for security
        return reply.status(200).send({
          message: 'Se o email existir, você receberá um link de recuperação',
        });
      }

      return reply.status(200).send({
        message: 'Email de recuperação enviado com sucesso',
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao enviar email de recuperação',
        statusCode: 500,
      });
    }
  });

  /**
   * POST /auth/reset-password
   *
   * Completes password reset using the token from recovery email.
   * Validates token, then updates user's password in Supabase.
   *
   * Request Body:
   * - access_token: string (required, from email link)
   * - new_password: string (required, min 6 characters)
   *
   * Response (200):
   * - message: Success message
   *
   * Errors:
   * - 400: Missing token/password or password too short
   * - 401: Invalid or expired token
   * - 400: Password update failed
   * - 500: Server error
   */
  app.post<{
    Body: { access_token: string; new_password: string };
  }>('/auth/reset-password', async (request, reply) => {
    const { access_token, new_password } = request.body;

    if (!access_token || !new_password) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Token e nova senha são obrigatórios',
        statusCode: 400,
      });
    }

    if (new_password.length < 6) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Senha deve ter no mínimo 6 caracteres',
        statusCode: 400,
      });
    }

    try {
      // Verify token and get user
      const {
        data: { user },
        error: userError,
      } = await supabaseAdmin.auth.getUser(access_token);

      if (userError || !user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Token inválido ou expirado',
          statusCode: 401,
        });
      }

      // Update password using admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: new_password }
      );

      if (updateError) {
        return reply.status(400).send({
          error: 'Update Failed',
          message: updateError.message,
          statusCode: 400,
        });
      }

      return reply.status(200).send({
        message: 'Senha atualizada com sucesso',
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao atualizar senha',
        statusCode: 500,
      });
    }
  });

  /**
   * POST /auth/refresh
   *
   * Refreshes an expired access token using a valid refresh token.
   * Returns new session with fresh access and refresh tokens.
   *
   * Request Body:
   * - refresh_token: string (required)
   *
   * Response (200):
   * - session: Session object with new access_token and refresh_token
   *
   * Errors:
   * - 400: Missing refresh token
   * - 401: Invalid or expired refresh token
   * - 500: Server error
   */
  app.post<{
    Body: { refresh_token: string };
  }>('/auth/refresh', async (request, reply) => {
    const { refresh_token } = request.body;

    if (!refresh_token) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Refresh token é obrigatório',
        statusCode: 400,
      });
    }

    try {
      const { data, error } = await supabaseAdmin.auth.refreshSession({
        refresh_token,
      });

      if (error) {
        return reply.status(401).send({
          error: 'Refresh Failed',
          message: 'Token inválido ou expirado',
          statusCode: 401,
        });
      }

      return reply.status(200).send({
        session: data.session,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao renovar sessão',
        statusCode: 500,
      });
    }
  });

  /**
   * GET /auth/me
   *
   * Gets the currently authenticated user's information.
   * Requires Bearer token in Authorization header.
   *
   * Headers:
   * - Authorization: Bearer <access_token>
   *
   * Response (200):
   * - user: { id: string, email: string, created_at: string }
   *
   * Errors:
   * - 401: Missing or invalid token
   * - 500: Server error
   */
  app.get('/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Token de autenticação ausente',
        statusCode: 401,
      });
    }

    const token = authHeader.substring(7);

    try {
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Token inválido ou expirado',
          statusCode: 401,
        });
      }

      return reply.status(200).send({
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao buscar usuário',
        statusCode: 500,
      });
    }
  });

  /**
   * POST /auth/logout
   *
   * Acknowledges user logout request.
   * Note: In Supabase, logout is primarily handled client-side by clearing
   * the session from localStorage/cookies. This endpoint just confirms
   * the action server-side.
   *
   * Response (200):
   * - message: Success message
   */
  app.post('/auth/logout', async (request, reply) => {
    // Logout is primarily client-side in Supabase
    // The client will clear the session from localStorage/cookies
    // Server just acknowledges the logout
    return reply.status(200).send({
      message: 'Logout realizado com sucesso',
    });
  });

  /**
   * POST /auth/magic-link
   *
   * Sends a magic link (passwordless login link) to user's email.
   * Uses Supabase's signInWithOtp for secure one-time password authentication.
   *
   * Request Body:
   * - email: string (required)
   *
   * Response (200):
   * - message: Success message
   *
   * The magic link will:
   * - Expire after 1 hour (Supabase default)
   * - Be single-use only
   * - Redirect to FRONTEND_URL/auth/callback with token in URL
   *
   * Errors:
   * - 400: Missing email
   * - 500: Server error
   */
  app.post<{
    Body: { email: string };
  }>('/auth/magic-link', async (request, reply) => {
    const { email } = request.body;

    if (!email) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Email é obrigatório',
        statusCode: 400,
      });
    }

    try {
      const { error } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`,
        },
      });

      if (error) {
        app.log.error(error);
        // Don't reveal if email exists or not for security
        return reply.status(200).send({
          message: 'Se o email estiver cadastrado, você receberá um link de acesso',
        });
      }

      return reply.status(200).send({
        message: 'Link de acesso enviado para seu email',
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Erro ao enviar link de acesso',
        statusCode: 500,
      });
    }
  });
}
