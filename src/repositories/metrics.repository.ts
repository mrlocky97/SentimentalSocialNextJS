/**
 * Metrics Repository
 * Persists dashboard historical points to MongoDB when enabled
 */

import DatabaseConnection from "../lib/database/connection";
import mongoose from "mongoose";
import { systemLogger } from "../lib/observability/logger";

const Schema = mongoose.Schema;

const MetricPointSchema = new Schema(
  {
    metric: { type: String, required: true, index: true },
    value: { type: Number, required: true },
    timestamp: { type: Date, required: true, index: true },
    labels: { type: Schema.Types.Mixed, default: {} },
  },
  { collection: "dashboard_metrics", timestamps: false },
);

let MetricPointModel: mongoose.Model<any> | null = null;

function getModel() {
  if (!MetricPointModel) {
    const conn = DatabaseConnection.getConnection();
    MetricPointModel = conn.model("MetricPoint", MetricPointSchema);
  }
  return MetricPointModel!;
}

export async function saveMetricPoint(
  metric: string,
  value: number,
  timestamp: Date = new Date(),
  labels: Record<string, any> = {},
): Promise<void> {
  try {
    const Model = getModel();
    await Model.create({ metric, value, timestamp, labels });
  } catch (error) {
    systemLogger.error("Error saving metric point", error as Error);
    // Do not throw - metrics persistence should be best-effort
  }
}

export async function queryMetrics(
  metric: string,
  from: Date,
  to: Date,
): Promise<Array<{ timestamp: Date; value: number }>> {
  try {
    const Model = getModel();
    const docs = await Model.find({
      metric,
      timestamp: { $gte: from, $lte: to },
    })
      .sort({ timestamp: 1 })
      .lean()
      .exec();

    return docs.map((d: any) => ({ timestamp: d.timestamp, value: d.value }));
  } catch (error) {
    systemLogger.error("Error querying metric points", error as Error);
    return [];
  }
}

export async function clearOldMetrics(olderThan: Date): Promise<number> {
  try {
    const Model = getModel();
    const res = await Model.deleteMany({ timestamp: { $lt: olderThan } }).exec();
    return res.deletedCount || 0;
  } catch (error) {
    systemLogger.error("Error clearing old metrics", error as Error);
    return 0;
  }
}
