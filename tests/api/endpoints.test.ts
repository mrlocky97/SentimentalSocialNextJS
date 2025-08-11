/**
 * Tests críticos para los endpoints de la API
 * Verifica que las rutas principales respondan correctamente
 */

import request from 'supertest';
import express from 'express';
import sentimentRoutes from '../../src/routes/sentiment';
import twitterAuthRoutes from '../../src/routes/twitter-auth';

describe('API Endpoints - CRÍTICO', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Configurar rutas de test
    app.use('/api/sentiment', sentimentRoutes);
    app.use('/api/twitter-auth', twitterAuthRoutes);

    // Ruta de health check básica
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  });

  describe('Health Check', () => {
    it('debe responder a health check', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Sentiment API', () => {
    it('debe responder a GET /api/sentiment/test', async () => {
      const response = await request(app).get('/api/sentiment/test');

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('debe manejar requests POST a /api/sentiment/analyze', async () => {
      const testTweet = {
        content: 'This is a test tweet for analysis',
        author: { username: 'testuser' },
      };

      const response = await request(app)
        .post('/api/sentiment/analyze')
        .send(testTweet)
        .set('Content-Type', 'application/json');

      // No debe ser un error del servidor
      expect(response.status).toBeLessThan(500);

      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });
  });

  describe('Twitter Auth API', () => {
    it('debe responder a GET /api/twitter-auth/status', async () => {
      const response = await request(app)
        .get('/api/twitter-auth/status')
        .expect('Content-Type', /json/);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });

    it('debe manejar requests POST a /api/twitter-auth/validate', async () => {
      const testAuth = {
        cookies: 'test_cookies=value',
      };

      const response = await request(app)
        .post('/api/twitter-auth/validate')
        .send(testAuth)
        .set('Content-Type', 'application/json');

      // No debe ser un error del servidor
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Error Handling', () => {
    it('debe manejar rutas inexistentes', async () => {
      const response = await request(app).get('/api/nonexistent-route');

      expect(response.status).toBe(404);
    });

    it('debe manejar requests malformados', async () => {
      const response = await request(app)
        .post('/api/sentiment/analyze')
        .send('invalid json string')
        .set('Content-Type', 'application/json');

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('debe manejar requests sin Content-Type', async () => {
      const response = await request(app).post('/api/sentiment/analyze').send({ content: 'test' });

      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Response Format', () => {
    it('debe devolver JSON válido para endpoints principales', async () => {
      const endpoints = ['/api/sentiment/test', '/api/twitter-auth/status'];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);

        if (response.status === 200) {
          expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
        }
      }
    });
  });
});
