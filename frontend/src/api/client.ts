import {
  DecisionResponse,
  ComparisonResponse,
  MetricsResponse,
  HorizonMetricsResponse,
  HealthResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function fetchJson<T>(url: string): Promise<T> {
  const fullUrl = `${API_BASE_URL}${url}`;
  const res = await fetch(fullUrl);
  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // ignore
    }
    throw new Error(errorDetail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  getHealth: () => fetchJson<HealthResponse>('/api/health'),

  getDecisionForecast: (deliveryDate: string) =>
    fetchJson<DecisionResponse>(`/api/forecast/decision?delivery_date=${deliveryDate}`),

  getComparison: (start: string, end: string) =>
    fetchJson<ComparisonResponse>(`/api/comparison?start=${start}&end=${end}`),

  getMetrics: (start?: string, end?: string, groupBy: 'overall' | 'day' | 'hour' = 'overall') => {
    const params = new URLSearchParams({ group_by: groupBy });
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    return fetchJson<MetricsResponse>(`/api/metrics?${params.toString()}`);
  },

  getHorizonMetrics: () => fetchJson<HorizonMetricsResponse>('/api/metrics/horizon'),
};

