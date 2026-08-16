import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';

const STORAGE_KEY = 'jellysterr_web_vitals';

interface StoredMetric {
  id: string;
  navigationType: Metric['navigationType'];
  navigationURL?: string;
  rating: Metric['rating'];
  recordedAt: string;
  value: number;
}

interface StoredWebVitals {
  metrics: Partial<Record<Metric['name'], StoredMetric>>;
  version: 1;
}

const storeMetric = (metric: Metric) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let report: StoredWebVitals = { metrics: {}, version: 1 };
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<StoredWebVitals>;
        if (parsed.version === 1 && parsed.metrics) report = parsed as StoredWebVitals;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    report.metrics[metric.name] = {
      id: metric.id,
      navigationType: metric.navigationType,
      navigationURL: metric.navigationURL,
      rating: metric.rating,
      recordedAt: new Date().toISOString(),
      value: metric.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
    console.info(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
  } catch (error) {
    console.warn('[Web Vitals] Unable to store local metrics', error);
  }
};

export const reportWebVitals = () => {
  onCLS(storeMetric, { reportSoftNavs: true });
  onFCP(storeMetric, { reportSoftNavs: true });
  onINP(storeMetric, { reportSoftNavs: true });
  onLCP(storeMetric, { reportSoftNavs: true });
  onTTFB(storeMetric, { reportSoftNavs: true });
};
