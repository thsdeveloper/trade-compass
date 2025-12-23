import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/api/server.js';
import { setUseBrapi } from '../src/data/candle-repository.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  // Desabilitar brapi nos testes para usar dados locais
  setUseBrapi(false);
  app = await buildServer();
});

afterAll(async () => {
  await app.close();
});

describe('API Endpoints', () => {
  describe('GET /health', () => {
    it('should return status ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('GET /assets', () => {
    it('should return list of assets', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/assets',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0]).toHaveProperty('ticker');
      expect(body[0]).toHaveProperty('name');
    });
  });

  describe('GET /assets/:ticker/summary', () => {
    it('should return asset summary for valid ticker', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/assets/PETR4/summary',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ticker).toBe('PETR4');
      expect(body.name).toBeDefined();
      expect(body.price).toBeGreaterThan(0);
      expect(body.updatedAt).toBeDefined();
    });

    it('should return 404 for invalid ticker', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/assets/INVALID/summary',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
    });

    it('should normalize ticker to uppercase', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/assets/petr4/summary',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ticker).toBe('PETR4');
    });
  });

  describe('GET /assets/:ticker/analysis', () => {
    it('should return complete analysis for valid ticker', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/assets/PETR4/analysis',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Summary
      expect(body.summary).toBeDefined();
      expect(body.summary.ticker).toBe('PETR4');
      expect(body.summary.price).toBeGreaterThan(0);

      // Context
      expect(body.context).toBeDefined();
      expect(['Alta', 'Baixa', 'Lateral']).toContain(body.context.trend);
      expect(['Abaixo', 'Normal', 'Acima']).toContain(body.context.volume);
      expect(['Baixa', 'Media', 'Alta']).toContain(body.context.volatility);

      // Decision Zone
      expect(body.decisionZone).toBeDefined();
      expect(['FAVORAVEL', 'NEUTRA', 'RISCO']).toContain(body.decisionZone.zone);
      expect(body.decisionZone.message).toBeDefined();
      expect(Array.isArray(body.decisionZone.reasons)).toBe(true);

      // Setups
      expect(Array.isArray(body.setups)).toBe(true);
    });

    it('should return 404 for invalid ticker', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/assets/INVALID/analysis',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
    });

    it('should include setup details when present', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/assets/VALE3/analysis',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      if (body.setups.length > 0) {
        const setup = body.setups[0];
        expect(setup.id).toBeDefined();
        expect(setup.title).toBeDefined();
        expect(['ATIVO', 'EM_FORMACAO', 'INVALIDO']).toContain(setup.status);
        expect(setup.successRate).toBeGreaterThanOrEqual(0);
        expect(setup.successRate).toBeLessThanOrEqual(100);
        expect(['Baixo', 'Moderado', 'Alto']).toContain(setup.risk);
        expect(setup.stopSuggestion).toBeDefined();
        expect(setup.explanation).toBeDefined();
        expect(Array.isArray(setup.signals)).toBe(true);
      }
    });
  });
});
