import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../../lib/supabase.js';
import { getCategoriesByUser } from '../../data/finance/category-repository.js';
import { parseNfceQr, lookupCnpj } from '../../services/nfce-parser.js';
import { extractReceipt } from '../../services/receipt-extraction-service.js';

// ~1.5MB de base64 ≈ imagem JPEG de ~1MB, suficiente para uma nota legível
const MAX_IMAGE_BASE64_LENGTH = 1_500_000;

const extractInputSchema = z
  .object({
    text: z.string().max(1000).optional(),
    qrData: z.string().max(2000).optional(),
    imageBase64: z
      .string()
      .max(MAX_IMAGE_BASE64_LENGTH)
      .regex(/^[A-Za-z0-9+/=]+$/)
      .optional(),
  })
  .refine((body) => body.text || body.qrData || body.imageBase64, {
    message: 'Envie ao menos um: text, qrData ou imageBase64',
  });

// Rate limit próprio: extração usa visão e é mais cara que o chat
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 6;
const RATE_WINDOW = 60 * 1000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

async function authenticateRequest(
  request: FastifyRequest
): Promise<{ userId: string; accessToken: string } | null> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return { userId: user.id, accessToken: token };
  } catch {
    return null;
  }
}

interface ExtractBody {
  text?: string;
  qrData?: string;
  imageBase64?: string;
}

async function handleExtract(
  request: FastifyRequest<{ Body: ExtractBody }>,
  reply: FastifyReply
) {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  if (!checkRateLimit(auth.userId)) {
    return reply.status(429).send({
      error: 'Muitas leituras em pouco tempo. Aguarde um instante e tente novamente.',
    });
  }

  const parseResult = extractInputSchema.safeParse(request.body);
  if (!parseResult.success) {
    return reply.status(400).send({
      error: 'Invalid request body',
      details: parseResult.error.issues,
    });
  }

  const { text, qrData, imageBase64 } = parseResult.data;

  try {
    const qrInfo = qrData ? parseNfceQr(qrData) : null;

    if (qrData && !qrInfo) {
      return reply.status(422).send({
        error:
          'QR code não reconhecido como NFC-e. Tente fotografar a nota ou descrever a compra.',
      });
    }

    const [categories, merchant] = await Promise.all([
      getCategoriesByUser(auth.userId, auth.accessToken),
      qrInfo ? lookupCnpj(qrInfo.cnpj) : Promise.resolve(null),
    ]);

    const result = await extractReceipt({
      text,
      imageBase64,
      qrInfo,
      merchant,
      categories,
    });

    return reply.send(result);
  } catch (error) {
    request.log.error(error, 'Receipt extraction error');
    return reply.status(500).send({ error: 'Erro ao interpretar a nota fiscal' });
  }
}

export async function agentTransactionRoutes(app: FastifyInstance) {
  // bodyLimit maior que o padrão (1MB) para acomodar a imagem em base64
  app.post<{ Body: ExtractBody }>(
    '/api/agent/nota/extract',
    { bodyLimit: 3 * 1024 * 1024 },
    handleExtract
  );

  app.options('/api/agent/nota/extract', async (_request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return reply.status(204).send();
  });
}
