/**
 * Rutas del Sistema Híbrido de Análisis de Sentimientos
 * Endpoints optimizados para producción
 */

import { Router } from 'express';
import { HybridSentimentController } from '../controllers/hybrid-sentiment.controller';
import { authenticateToken, requireRole } from '../middleware/express-auth';

const router = Router();
const hybridController = new HybridSentimentController();

// Rate limiting middleware (si está disponible)
// import rateLimit from 'express-rate-limit';
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutos
//   max: 1000 // límite de 1000 requests por ventana por IP
// });

/**
 * @swagger
 * /api/v1/hybrid/analyze:
 *   post:
 *     summary: Análisis de sentimientos híbrido
 *     description: Analiza el sentimiento de un texto usando el sistema híbrido optimizado
 *     tags: [Hybrid Sentiment Analysis]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Texto a analizar (máximo 5000 caracteres)
 *                 example: "Me encanta este producto, es fantástico!"
 *               includeDetails:
 *                 type: boolean
 *                 description: Incluir detalles técnicos del análisis
 *                 default: false
 *     responses:
 *       200:
 *         description: Análisis completado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sentiment:
 *                   type: object
 *                   properties:
 *                     label:
 *                       type: string
 *                       enum: [positive, negative, neutral]
 *                     confidence:
 *                       type: number
 *                       minimum: 0
 *                       maximum: 1
 *                     method:
 *                       type: string
 *                       enum: [rule-based, naive-bayes, hybrid]
 *                 processingTime:
 *                   type: number
 *                   description: Tiempo de procesamiento en milisegundos
 *                 modelVersion:
 *                   type: string
 *                   example: "hybrid-v1.0"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.post('/analyze', 
  authenticateToken, 
  requireRole(['admin', 'manager', 'analyst', 'onlyView', 'client']),
  hybridController.analyzeHybrid.bind(hybridController)
);

/**
 * @swagger
 * /api/v1/hybrid/batch:
 *   post:
 *     summary: Análisis de sentimientos por lotes
 *     description: Analiza múltiples textos en una sola petición (máximo 100)
 *     tags: [Hybrid Sentiment Analysis]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - texts
 *             properties:
 *               texts:
 *                 type: array
 *                 items:
 *                   type: string
 *                 maxItems: 100
 *                 example: ["Excelente producto", "Terrible servicio", "Producto normal"]
 *               includeDetails:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Análisis por lotes completado
 */
router.post('/batch',
  authenticateToken,
  requireRole(['admin', 'manager', 'analyst']),
  hybridController.analyzeBatch.bind(hybridController)
);

/**
 * @swagger
 * /api/v1/hybrid/compare:
 *   post:
 *     summary: Comparar modelos híbrido vs rule-based
 *     description: Compara el rendimiento del sistema híbrido contra el rule-based
 *     tags: [Hybrid Sentiment Analysis]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Este producto es increíble, me encanta"
 *     responses:
 *       200:
 *         description: Comparación completada
 */
router.post('/compare',
  authenticateToken,
  requireRole(['admin', 'manager', 'analyst']),
  hybridController.compareModels.bind(hybridController)
);

/**
 * @swagger
 * /api/v1/hybrid/stats:
 *   get:
 *     summary: Estadísticas del modelo híbrido
 *     description: Obtiene estadísticas detalladas del sistema híbrido
 *     tags: [Hybrid Sentiment Analysis]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 modelStats:
 *                   type: object
 *                 systemInfo:
 *                   type: object
 *                   properties:
 *                     version:
 *                       type: string
 *                     accuracy:
 *                       type: string
 *                     f1Score:
 *                       type: string
 *                     supportedLanguages:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/stats',
  authenticateToken,
  requireRole(['admin', 'manager', 'analyst']),
  hybridController.getModelStats.bind(hybridController)
);

/**
 * @swagger
 * /api/v1/hybrid/health:
 *   get:
 *     summary: Health check del sistema híbrido
 *     description: Verifica el estado del sistema híbrido y sus componentes
 *     tags: [Hybrid Sentiment Analysis]
 *     responses:
 *       200:
 *         description: Sistema funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, unhealthy]
 *                 modelTrained:
 *                   type: boolean
 *                 responseTime:
 *                   type: string
 *                 testResult:
 *                   type: object
 *                 checks:
 *                   type: object
 */
router.get('/health', 
  hybridController.healthCheck.bind(hybridController)
);

/**
 * @swagger
 * /api/v1/hybrid/retrain:
 *   post:
 *     summary: Reentrenar el modelo híbrido
 *     description: Reentrenar el modelo Naive Bayes con datos actualizados
 *     tags: [Hybrid Sentiment Analysis]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Modelo reentrenado exitosamente
 */
router.post('/retrain',
  authenticateToken,
  requireRole(['admin']),
  hybridController.retrainModel.bind(hybridController)
);

export default router;
