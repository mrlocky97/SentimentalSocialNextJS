/**
 * Experimental Evaluation Routes
 * API endpoints for running model evaluation experiments
 */

import { Router, Request, Response } from 'express';
import { ModelEvaluationService } from '../experimental/model-evaluation.service';
import { VisualizationService } from '../experimental/visualization.service';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const evaluationService = new ModelEvaluationService();
const visualizationService = new VisualizationService();

/**
 * @swagger
 * /api/experimental/evaluate:
 *   post:
 *     summary: Run comprehensive model evaluation experiment
 *     description: Executes experimental evaluation of sentiment analysis models and returns detailed metrics
 *     tags: [Experimental]
 *     responses:
 *       200:
 *         description: Evaluation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Complete experimental results
 *                 execution_time:
 *                   type: number
 *                   description: Total execution time in milliseconds
 *       500:
 *         description: Evaluation failed
 */
router.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();

    // Run complete experiment
    const results = await evaluationService.runCompleteExperiment();

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: results,
      execution_time: executionTime,
      message: 'Experimental evaluation completed successfully'
    });

  } catch (error) {
    console.error('❌ Error in experimental evaluation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to complete experimental evaluation'
    });
  }
});

/**
 * @swagger
 * /api/experimental/visualize:
 *   post:
 *     summary: Generate visualization report from experimental results
 *     description: Creates comprehensive charts and visual materials for model comparison
 *     tags: [Experimental]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [json, html]
 *                 default: json
 *     responses:
 *       200:
 *         description: Visualization generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Visualization report with charts and insights
 *                 charts_count:
 *                   type: number
 *       500:
 *         description: Visualization failed
 */
router.post('/visualize', async (req: Request, res: Response) => {
  try {
    const format = req.body.format || 'json';

    // First run evaluation to get results
    const results = await evaluationService.runCompleteExperiment();

    // Generate visualization report
    const visualizationReport = visualizationService.generateVisualizationReport(results);

    if (format === 'html') {
      const htmlReport = visualizationService.exportChartsToHTML(visualizationReport);

      res.setHeader('Content-Type', 'text/html');
      res.send(htmlReport);
    } else {
      res.json({
        success: true,
        data: visualizationReport,
        charts_count: visualizationReport.charts.length,
        message: 'Visualization report generated successfully'
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to generate visualization report'
    });
  }
});

/**
 * @swagger
 * /api/experimental/compare-models:
 *   get:
 *     summary: Get detailed model comparison analysis
 *     description: Returns comprehensive comparison of different sentiment analysis models
 *     tags: [Experimental]
 *     responses:
 *       200:
 *         description: Model comparison retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     models:
 *                       type: array
 *                       description: Array of model comparisons
 *                     recommendations:
 *                       type: array
 *                       description: Recommendations for model selection
 *                     best_model:
 *                       type: object
 *                       description: Best performing model details
 */
router.get('/compare-models', async (req: Request, res: Response) => {
  try {

    // Simulate model comparisons (in real scenario, this would involve actual model training)
    const models = await evaluationService.simulateModelComparisons();

    // Find best model
    const bestModel = models.reduce((best, current) =>
      current.metrics.f1_score.macro_avg > best.metrics.f1_score.macro_avg ? current : best
    );

    const recommendations = [
      `Recommended for production: ${bestModel.model_name}`,
      `Performance improvement: ${((bestModel.metrics.accuracy - models[0].metrics.accuracy) * 100).toFixed(1)}%`,
      'Consider hybrid approach for optimal balance',
      'Expand training data for better generalization',
      'Implement A/B testing for production validation'
    ];

    res.json({
      success: true,
      data: {
        models,
        recommendations,
        best_model: bestModel,
        comparison_criteria: [
          'Accuracy', 'F1-Score', 'Processing Speed',
          'Interpretability', 'Scalability', 'Maintenance Cost'
        ]
      },
      message: 'Model comparison analysis completed'
    });

  } catch (error) {
    console.error('❌ Error in model comparison:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to generate model comparison'
    });
  }
});

/**
 * @swagger
 * /api/experimental/metrics:
 *   get:
 *     summary: Get detailed evaluation metrics
 *     description: Returns comprehensive evaluation metrics for current sentiment analysis model
 *     tags: [Experimental]
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     current_model:
 *                       type: object
 *                       description: Current model performance metrics
 *                     benchmarks:
 *                       type: object
 *                       description: Industry benchmark comparisons
 *                     statistical_tests:
 *                       type: object
 *                       description: Statistical significance tests
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {

    const currentModel = await evaluationService.evaluateCurrentModel();

    // Industry benchmarks for comparison
    const benchmarks = {
      basic_rule_based: { accuracy: 0.65, f1_macro: 0.62 },
      commercial_apis: { accuracy: 0.78, f1_macro: 0.75 },
      academic_research: { accuracy: 0.85, f1_macro: 0.83 },
      state_of_the_art: { accuracy: 0.92, f1_macro: 0.90 }
    };

    // Performance relative to benchmarks
    const performance_comparison = {
      vs_basic_rule_based: {
        accuracy_improvement: ((currentModel.metrics.accuracy - benchmarks.basic_rule_based.accuracy) * 100).toFixed(1) + '%',
        f1_improvement: ((currentModel.metrics.f1_score.macro_avg - benchmarks.basic_rule_based.f1_macro) * 100).toFixed(1) + '%'
      },
      vs_commercial_apis: {
        accuracy_improvement: ((currentModel.metrics.accuracy - benchmarks.commercial_apis.accuracy) * 100).toFixed(1) + '%',
        f1_improvement: ((currentModel.metrics.f1_score.macro_avg - benchmarks.commercial_apis.f1_macro) * 100).toFixed(1) + '%'
      },
      vs_academic_research: {
        accuracy_improvement: ((currentModel.metrics.accuracy - benchmarks.academic_research.accuracy) * 100).toFixed(1) + '%',
        f1_improvement: ((currentModel.metrics.f1_score.macro_avg - benchmarks.academic_research.f1_macro) * 100).toFixed(1) + '%'
      }
    };

    res.json({
      success: true,
      data: {
        current_model: currentModel,
        benchmarks,
        performance_comparison,
        statistical_tests: {
          confidence_level: '95%',
          sample_size: currentModel.metrics.samples_count,
          cohen_kappa_interpretation: currentModel.metrics.cohen_kappa > 0.8 ? 'Almost Perfect Agreement' :
            currentModel.metrics.cohen_kappa > 0.6 ? 'Substantial Agreement' :
              currentModel.metrics.cohen_kappa > 0.4 ? 'Moderate Agreement' : 'Fair Agreement'
        },
        recommendations: [
          currentModel.metrics.accuracy > 0.85 ? 'Model performs above academic standards' : 'Consider model improvements',
          currentModel.metrics.processing_time_ms < 100 ? 'Excellent real-time performance' : 'Optimize for better speed',
          currentModel.metrics.cohen_kappa > 0.7 ? 'Reliable inter-rater agreement' : 'Improve consistency'
        ]
      },
      message: 'Detailed metrics analysis completed'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to calculate detailed metrics'
    });
  }
});

/**
 * @swagger
 * /api/experimental/export/{format}:
 *   get:
 *     summary: Export experimental results in different formats
 *     description: Export evaluation results and visualizations in various formats
 *     tags: [Experimental]
 *     parameters:
 *       - in: path
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [html, pdf, csv, json]
 *         description: Export format
 *     responses:
 *       200:
 *         description: Export successful
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export/:format', async (req: Request, res: Response) => {
  try {
    const format = req.params.format;

    // Run evaluation and generate visualization
    const results = await evaluationService.runCompleteExperiment();
    const visualizationReport = visualizationService.generateVisualizationReport(results);

    switch (format) {
      case 'html':
        const htmlContent = visualizationService.exportChartsToHTML(visualizationReport);
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="sentiment_analysis_report_${results.experiment_id}.html"`);
        res.send(htmlContent);
        break;

      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="experimental_results_${results.experiment_id}.json"`);
        res.json({
          experimental_results: results,
          visualization_report: visualizationReport,
          export_timestamp: new Date().toISOString()
        });
        break;

      case 'csv':
        const csvContent = generateCSVReport(results);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="model_metrics_${results.experiment_id}.csv"`);
        res.send(csvContent);
        break;

      default:
        res.status(400).json({
          success: false,
          error: `Unsupported export format: ${format}`,
          supported_formats: ['html', 'json', 'csv']
        });
    }

  } catch (error) {
    console.error('❌ Error exporting results:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Failed to export results'
    });
  }
});

/**
 * Generate CSV report from experimental results
 */
function generateCSVReport(results: any): string {
  let csv = 'Model,Type,Accuracy,Precision_Macro,Recall_Macro,F1_Macro,Cohen_Kappa,Processing_Time_ms\n';

  results.models_compared.forEach((model: any) => {
    csv += `"${model.model_name}",` +
      `"${model.model_type}",` +
      `${model.metrics.accuracy.toFixed(4)},` +
      `${model.metrics.precision.macro_avg.toFixed(4)},` +
      `${model.metrics.recall.macro_avg.toFixed(4)},` +
      `${model.metrics.f1_score.macro_avg.toFixed(4)},` +
      `${model.metrics.cohen_kappa.toFixed(4)},` +
      `${model.metrics.processing_time_ms}\n`;
  });

  return csv;
}

export default router;
