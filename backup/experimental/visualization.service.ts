/**
 * Visualization Service
 * Generates charts and visual materials for experimental results
 * Based on academic framework visualization requirements
 */

import { ExperimentalResults, ModelComparison, ModelMetrics } from './model-evaluation.service';

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'radar';
  title: string;
  subtitle?: string;
  data: any;
  options: any;
  filename: string;
}

export interface VisualizationReport {
  experiment_id: string;
  charts: ChartData[];
  summary_stats: {
    best_model: string;
    performance_improvement: string;
    processing_time_comparison: string;
    accuracy_ranking: Array<{ model: string, accuracy: number }>;
  };
  academic_insights: string[];
  export_formats: string[];
}

export class VisualizationService {

  /**
   * Generate comprehensive visualization report from experimental results
   */
  generateVisualizationReport(results: ExperimentalResults): VisualizationReport {

    const charts: ChartData[] = [
      this.generateAccuracyComparisonChart(results.models_compared),
      this.generateF1ScoreComparisonChart(results.models_compared),
      this.generateProcessingTimeChart(results.models_compared),
      this.generateConfusionMatrixHeatmap(results.models_compared[0]), // Current model
      this.generateConfusionMatrixHeatmap(results.models_compared.find(m => m.model_name === results.best_model.name)!), // Best model
      this.generateMetricsRadarChart(results.models_compared),
      this.generateClassDistributionChart(results.dataset_info),
      this.generatePerformanceVsSpeedScatter(results.models_compared),
      this.generatePrecisionRecallComparison(results.models_compared)
    ];

    const accuracyRanking = results.models_compared
      .map(m => ({ model: m.model_name, accuracy: m.metrics.accuracy }))
      .sort((a, b) => b.accuracy - a.accuracy);

    const baselineModel = results.models_compared[0];
    const bestModel = results.models_compared.find(m => m.model_name === results.best_model.name)!;
    const performanceImprovement = ((bestModel.metrics.accuracy - baselineModel.metrics.accuracy) * 100).toFixed(1);
    const speedComparison = `${baselineModel.model_name}: ${baselineModel.metrics.processing_time_ms}ms vs ${bestModel.model_name}: ${bestModel.metrics.processing_time_ms}ms`;

    return {
      experiment_id: results.experiment_id,
      charts,
      summary_stats: {
        best_model: results.best_model.name,
        performance_improvement: `+${performanceImprovement}%`,
        processing_time_comparison: speedComparison,
        accuracy_ranking: accuracyRanking
      },
      academic_insights: [
        `Statistical Analysis: ${results.statistical_significance.is_significant ? 'Significant' : 'Non-significant'} improvement (p=${results.statistical_significance.p_value.toFixed(4)})`,
        `Best Model Type: ${bestModel.model_type.replace('_', ' ').toUpperCase()} architecture`,
        `Speed vs Accuracy Trade-off: ${this.analyzeSpeedAccuracyTradeoff(results.models_compared)}`,
        `Dataset Quality: ${(results.dataset_info.quality_score * 100).toFixed(1)}% annotator agreement`,
        `Model Complexity: ${this.analyzeModelComplexity(results.models_compared)}`,
        `Production Readiness: ${this.assessProductionReadiness(bestModel)}`
      ],
      export_formats: ['SVG', 'PNG', 'PDF', 'HTML', 'JSON']
    };
  }

  /**
   * Generate accuracy comparison bar chart
   */
  private generateAccuracyComparisonChart(models: ModelComparison[]): ChartData {
    return {
      type: 'bar',
      title: 'Model Accuracy Comparison',
      subtitle: 'Accuracy scores across different sentiment analysis models',
      filename: 'accuracy_comparison.svg',
      data: {
        labels: models.map(m => m.model_name),
        datasets: [{
          label: 'Accuracy',
          data: models.map(m => (m.metrics.accuracy * 100).toFixed(1)),
          backgroundColor: [
            '#FF6384', // Current model - Red
            '#36A2EB', // BERT - Blue  
            '#FFCE56', // SVM - Yellow
            '#4BC0C0'  // Hybrid - Teal
          ],
          borderColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Model Accuracy Comparison (%)',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Accuracy (%)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Models'
            }
          }
        }
      }
    };
  }

  /**
   * Generate F1-Score comparison chart
   */
  private generateF1ScoreComparisonChart(models: ModelComparison[]): ChartData {
    return {
      type: 'bar',
      title: 'F1-Score Comparison by Sentiment Class',
      subtitle: 'F1-scores for positive, negative, and neutral sentiment classification',
      filename: 'f1_score_comparison.svg',
      data: {
        labels: models.map(m => m.model_name),
        datasets: [
          {
            label: 'Positive',
            data: models.map(m => (m.metrics.f1_score.positive * 100).toFixed(1)),
            backgroundColor: '#28a745',
            borderColor: '#28a745',
            borderWidth: 1
          },
          {
            label: 'Negative',
            data: models.map(m => (m.metrics.f1_score.negative * 100).toFixed(1)),
            backgroundColor: '#dc3545',
            borderColor: '#dc3545',
            borderWidth: 1
          },
          {
            label: 'Neutral',
            data: models.map(m => (m.metrics.f1_score.neutral * 100).toFixed(1)),
            backgroundColor: '#ffc107',
            borderColor: '#ffc107',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'F1-Score by Sentiment Class (%)',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'top' as const
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'F1-Score (%)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Models'
            }
          }
        }
      }
    };
  }

  /**
   * Generate processing time comparison chart
   */
  private generateProcessingTimeChart(models: ModelComparison[]): ChartData {
    return {
      type: 'bar',
      title: 'Processing Time Comparison',
      subtitle: 'Average processing time per text sample',
      filename: 'processing_time_comparison.svg',
      data: {
        labels: models.map(m => m.model_name),
        datasets: [{
          label: 'Processing Time (ms)',
          data: models.map(m => m.metrics.processing_time_ms),
          backgroundColor: models.map(m => {
            const time = m.metrics.processing_time_ms;
            if (time < 100) return '#28a745'; // Fast - Green
            if (time < 500) return '#ffc107'; // Medium - Yellow  
            if (time < 1000) return '#fd7e14'; // Slow - Orange
            return '#dc3545'; // Very slow - Red
          }),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Processing Time per Sample (ms)',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Time (milliseconds)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Models'
            }
          }
        }
      }
    };
  }

  /**
   * Generate confusion matrix heatmap
   */
  private generateConfusionMatrixHeatmap(model: ModelComparison): ChartData {
    const matrix = model.metrics.confusion_matrix;
    const labels = ['Positive', 'Negative', 'Neutral'];

    // Flatten matrix for heatmap format
    const heatmapData = [];
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        heatmapData.push({
          x: labels[j],
          y: labels[i],
          value: matrix[i][j]
        });
      }
    }

    return {
      type: 'heatmap',
      title: `Confusion Matrix - ${model.model_name}`,
      subtitle: 'Predicted vs Actual sentiment classifications',
      filename: `confusion_matrix_${model.model_name.toLowerCase().replace(/\s+/g, '_')}.svg`,
      data: {
        datasets: [{
          label: 'Count',
          data: heatmapData,
          backgroundColor: function (context: any) {
            const value = context.parsed.v;
            const max = Math.max(...matrix.flat());
            const intensity = value / max;
            return `rgba(54, 162, 235, ${intensity})`;
          }
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Confusion Matrix - ${model.model_name}`,
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          x: {
            type: 'category',
            title: {
              display: true,
              text: 'Predicted'
            }
          },
          y: {
            type: 'category',
            title: {
              display: true,
              text: 'Actual'
            }
          }
        }
      }
    };
  }

  /**
   * Generate radar chart for multiple metrics comparison
   */
  private generateMetricsRadarChart(models: ModelComparison[]): ChartData {
    const metrics = ['accuracy', 'precision', 'recall', 'f1_score'];

    return {
      type: 'radar',
      title: 'Comprehensive Metrics Comparison',
      subtitle: 'Multi-dimensional performance analysis across all models',
      filename: 'metrics_radar_chart.svg',
      data: {
        labels: ['Accuracy', 'Precision (Macro)', 'Recall (Macro)', 'F1-Score (Macro)', 'Cohen\'s Kappa'],
        datasets: models.map((model, index) => ({
          label: model.model_name,
          data: [
            model.metrics.accuracy * 100,
            model.metrics.precision.macro_avg * 100,
            model.metrics.recall.macro_avg * 100,
            model.metrics.f1_score.macro_avg * 100,
            (model.metrics.cohen_kappa + 1) * 50 // Normalize from [-1,1] to [0,100]
          ],
          backgroundColor: this.getModelColor(index, 0.2),
          borderColor: this.getModelColor(index, 1),
          borderWidth: 2,
          pointBackgroundColor: this.getModelColor(index, 1),
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }))
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Multi-Metric Performance Radar',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'top' as const
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20
            }
          }
        }
      }
    };
  }

  /**
   * Generate class distribution pie chart
   */
  private generateClassDistributionChart(datasetInfo: any): ChartData {
    return {
      type: 'pie',
      title: 'Dataset Class Distribution',
      subtitle: 'Distribution of sentiment classes in evaluation dataset',
      filename: 'class_distribution.svg',
      data: {
        labels: ['Positive', 'Negative', 'Neutral'],
        datasets: [{
          data: [
            datasetInfo.positive_samples,
            datasetInfo.negative_samples,
            datasetInfo.neutral_samples
          ],
          backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
          borderColor: ['#1e7e34', '#bd2130', '#e0a800'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Dataset Class Distribution',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'right' as const
          }
        }
      }
    };
  }

  /**
   * Generate performance vs speed scatter plot
   */
  private generatePerformanceVsSpeedScatter(models: ModelComparison[]): ChartData {
    return {
      type: 'scatter',
      title: 'Performance vs Speed Trade-off',
      subtitle: 'Accuracy vs Processing Time relationship',
      filename: 'performance_speed_scatter.svg',
      data: {
        datasets: [{
          label: 'Models',
          data: models.map(m => ({
            x: m.metrics.processing_time_ms,
            y: m.metrics.accuracy * 100,
            label: m.model_name
          })),
          backgroundColor: models.map((_, index) => this.getModelColor(index, 0.7)),
          borderColor: models.map((_, index) => this.getModelColor(index, 1)),
          borderWidth: 2,
          pointRadius: 8
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Performance vs Speed Trade-off',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (context: any) {
                return `${context.raw.label}: ${context.parsed.y.toFixed(1)}% accuracy, ${context.parsed.x}ms`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Processing Time (ms)'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Accuracy (%)'
            },
            min: 70,
            max: 100
          }
        }
      }
    };
  }

  /**
   * Generate precision-recall comparison
   */
  private generatePrecisionRecallComparison(models: ModelComparison[]): ChartData {
    return {
      type: 'line',
      title: 'Precision vs Recall Comparison',
      subtitle: 'Precision and Recall metrics across all models',
      filename: 'precision_recall_comparison.svg',
      data: {
        labels: models.map(m => m.model_name),
        datasets: [
          {
            label: 'Precision (Macro Avg)',
            data: models.map(m => (m.metrics.precision.macro_avg * 100).toFixed(1)),
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            borderWidth: 3,
            fill: false,
            tension: 0.1
          },
          {
            label: 'Recall (Macro Avg)',
            data: models.map(m => (m.metrics.recall.macro_avg * 100).toFixed(1)),
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            borderWidth: 3,
            fill: false,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Precision vs Recall Comparison (%)',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'top' as const
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Score (%)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Models'
            }
          }
        }
      }
    };
  }

  /**
   * Get color for model visualization
   */
  private getModelColor(index: number, alpha: number = 1): string {
    const colors = [
      `rgba(255, 99, 132, ${alpha})`,  // Red
      `rgba(54, 162, 235, ${alpha})`,  // Blue
      `rgba(255, 206, 86, ${alpha})`,  // Yellow
      `rgba(75, 192, 192, ${alpha})`,  // Teal
      `rgba(153, 102, 255, ${alpha})`, // Purple
      `rgba(255, 159, 64, ${alpha})`   // Orange
    ];
    return colors[index % colors.length];
  }

  /**
   * Analyze speed vs accuracy trade-off
   */
  private analyzeSpeedAccuracyTradeoff(models: ModelComparison[]): string {
    const fastestModel = models.reduce((fastest, current) =>
      current.metrics.processing_time_ms < fastest.metrics.processing_time_ms ? current : fastest
    );
    const mostAccurateModel = models.reduce((most, current) =>
      current.metrics.accuracy > most.metrics.accuracy ? current : most
    );

    if (fastestModel.model_name === mostAccurateModel.model_name) {
      return `${fastestModel.model_name} achieves optimal balance of speed and accuracy`;
    }

    const speedDiff = mostAccurateModel.metrics.processing_time_ms / fastestModel.metrics.processing_time_ms;
    const accuracyGain = (mostAccurateModel.metrics.accuracy - fastestModel.metrics.accuracy) * 100;

    return `${accuracyGain.toFixed(1)}% accuracy gain costs ${speedDiff.toFixed(1)}x processing time`;
  }

  /**
   * Analyze model complexity
   */
  private analyzeModelComplexity(models: ModelComparison[]): string {
    const complexityOrder = ['rule_based', 'machine_learning', 'hybrid', 'deep_learning'];
    const complexityAnalysis = models.map(m => ({
      name: m.model_name,
      type: m.model_type,
      complexity: complexityOrder.indexOf(m.model_type),
      accuracy: m.metrics.accuracy
    })).sort((a, b) => a.complexity - b.complexity);

    const simplest = complexityAnalysis[0];
    const mostComplex = complexityAnalysis[complexityAnalysis.length - 1];
    const accuracyGain = (mostComplex.accuracy - simplest.accuracy) * 100;

    return `Complexity increase from ${simplest.name} to ${mostComplex.name} yields ${accuracyGain.toFixed(1)}% accuracy improvement`;
  }

  /**
   * Assess production readiness
   */
  private assessProductionReadiness(model: ModelComparison): string {
    const criteria = {
      accuracy: model.metrics.accuracy > 0.85,
      speed: model.metrics.processing_time_ms < 1000,
      reliability: model.metrics.cohen_kappa > 0.7,
      interpretability: model.model_type === 'rule_based' || model.model_type === 'hybrid'
    };

    const score = Object.values(criteria).filter(Boolean).length;
    const total = Object.keys(criteria).length;
    const percentage = (score / total) * 100;

    if (percentage >= 75) return 'High - Ready for production deployment';
    if (percentage >= 50) return 'Medium - Suitable with monitoring';
    return 'Low - Requires additional development';
  }

  /**
   * Export charts to different formats
   */
  exportChartsToHTML(visualizationReport: VisualizationReport): string {
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sentiment Analysis Model Evaluation Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .chart-container { margin: 40px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .chart-wrapper { position: relative; height: 400px; margin: 20px 0; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .insights { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .metric { display: inline-block; margin: 10px 20px; padding: 10px; background: white; border-radius: 4px; }
        h1 { color: #2c3e50; }
        h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h3 { color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Sentiment Analysis Model Evaluation Report</h1>
            <h3>Experiment ID: ${visualizationReport.experiment_id}</h3>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary">
            <h2>📈 Executive Summary</h2>
            <div class="metric">
                <strong>Best Model:</strong> ${visualizationReport.summary_stats.best_model}
            </div>
            <div class="metric">
                <strong>Performance Improvement:</strong> ${visualizationReport.summary_stats.performance_improvement}
            </div>
            <div class="metric">
                <strong>Processing Time:</strong> ${visualizationReport.summary_stats.processing_time_comparison}
            </div>
        </div>

        <div class="insights">
            <h2>🎯 Academic Insights</h2>
            <ul>
                ${visualizationReport.academic_insights.map(insight => `<li>${insight}</li>`).join('')}
            </ul>
        </div>
    `;

    // Add chart containers
    visualizationReport.charts.forEach((chart, index) => {
      html += `
        <div class="chart-container">
            <h2>${chart.title}</h2>
            <p><em>${chart.subtitle}</em></p>
            <div class="chart-wrapper">
                <canvas id="chart${index}"></canvas>
            </div>
        </div>
      `;
    });

    // Add chart scripts
    html += `
        <script>
            // Chart configurations
            const charts = ${JSON.stringify(visualizationReport.charts)};
            
            charts.forEach((chartConfig, index) => {
                const ctx = document.getElementById('chart' + index).getContext('2d');
                new Chart(ctx, {
                    type: chartConfig.type === 'heatmap' ? 'scatter' : chartConfig.type,
                    data: chartConfig.data,
                    options: {
                        ...chartConfig.options,
                        maintainAspectRatio: false
                    }
                });
            });
        </script>
    </div>
</body>
</html>`;

    return html;
  }
}
