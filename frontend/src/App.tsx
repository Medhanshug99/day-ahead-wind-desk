import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import {
  DecisionResponse,
  MetricsResponse,
  ComparisonResponse,
  HorizonMetricsResponse,
  HealthResponse,
  MetricValues,
} from './types';
import { Header } from './components/Header';
import { DeliveryPicker } from './components/DeliveryPicker';
import { TraderInsightBox } from './components/TraderInsightBox';
import { DecisionView } from './components/DecisionView';
import { AccuracyView } from './components/AccuracyView';
import { MethodologyModal } from './components/MethodologyModal';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  // State
  const [selectedDate, setSelectedDate] = useState<string>('2026-01-15');
  const [activeTab, setActiveTab] = useState<'decision' | 'accuracy'>('decision');
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);

  // Data states
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [decisionData, setDecisionData] = useState<DecisionResponse | null>(null);
  const [overallMetrics, setOverallMetrics] = useState<MetricValues | null>(null);
  const [dayMetricsList, setDayMetricsList] = useState<MetricValues[]>([]);
  const [hourMetricsList, setHourMetricsList] = useState<MetricValues[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonResponse | null>(null);
  const [horizonData, setHorizonData] = useState<HorizonMetricsResponse | null>(null);

  // Status
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDayLoading, setIsDayLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load: fast decision view first, background accuracy data
  const initApp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [healthRes, overallRes, initialDecisionRes] = await Promise.all([
        api.getHealth(),
        api.getMetrics('2026-01-02', '2026-02-01', 'overall'),
        api.getDecisionForecast(selectedDate),
      ]);

      setHealth(healthRes);
      if (overallRes.metrics.length > 0) setOverallMetrics(overallRes.metrics[0]);
      setDecisionData(initialDecisionRes);
      setIsLoading(false);

      // Fetch remaining full-month breakdown in background
      Promise.all([
        api.getMetrics('2026-01-02', '2026-02-01', 'day'),
        api.getMetrics('2026-01-02', '2026-02-01', 'hour'),
        api.getComparison('2026-01-02', '2026-02-01'),
        api.getHorizonMetrics(),
      ]).then(([dayRes, hourRes, compRes, horizonRes]) => {
        setDayMetricsList(dayRes.metrics);
        setHourMetricsList(hourRes.metrics);
        setComparisonData(compRes);
        setHorizonData(horizonRes);
      }).catch((err) => {
        console.warn('Background metrics fetch issue:', err);
      });
    } catch (err: any) {
      console.error('Initial data load error:', err);
      setError(err.message || 'Failed to connect to backend API');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  // Update decision view when delivery date changes
  const handleDateChange = async (newDate: string) => {
    setSelectedDate(newDate);
    setIsDayLoading(true);
    try {
      const res = await api.getDecisionForecast(newDate);
      setDecisionData(res);
    } catch (err: any) {
      console.error('Failed to load decision data for date:', newDate, err);
    } finally {
      setIsDayLoading(false);
    }
  };

  const selectedDayMetrics = dayMetricsList.find((d) => d.group_key === selectedDate);

  return (
    <div className="app-shell">
      {/* 1. Slim Header */}
      <Header
        cutoffHour={health?.cutoff_hour ?? 9}
        deliveryWindow={health?.delivery_window ?? '2026-01-02 to 2026-02-01'}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
      />

      {/* 2. Global Error State */}
      {error && (
        <div
          className="card flex items-center justify-between"
          style={{
            borderColor: 'var(--semantic-pos)',
            background: 'var(--semantic-pos-subtle)',
            marginBottom: '1rem',
            padding: '0.875rem 1.25rem',
          }}
          role="alert"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={18} style={{ color: 'var(--semantic-pos)' }} />
            <div>
              <strong style={{ color: 'var(--semantic-pos)' }}>Backend Connection Error: </strong>
              <span className="text-secondary text-xs">{error}</span>
            </div>
          </div>
          <button
            onClick={() => initApp()}
            className="btn btn-secondary text-xs"
            aria-label="Retry connection"
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 3. Unified Toolbar: Date Picker (Left) & Tabs (Right) */}
      <div
        className="flex items-center justify-between md-flex-col gap-3"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        {/* Navigation Tabs */}
        <div className="flex items-center gap-4" role="tablist">
          <button
            onClick={() => setActiveTab('decision')}
            className={`tab-item ${activeTab === 'decision' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'decision'}
          >
            Decision View
          </button>
          <button
            onClick={() => setActiveTab('accuracy')}
            className={`tab-item ${activeTab === 'accuracy' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'accuracy'}
          >
            Accuracy &amp; Error Analysis
          </button>
        </div>

        {/* Date Picker (Active only on Decision View) */}
        {activeTab === 'decision' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Delivery Day:</span>
            <DeliveryPicker
              selectedDate={selectedDate}
              onChange={handleDateChange}
              minDate="2026-01-02"
              maxDate="2026-02-01"
            />
          </div>
        )}
      </div>

      {/* 4. Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {/* Skeleton KPI Strip */}
          <div className="grid grid-cols-4 md-grid-cols-2 sm-grid-cols-1 gap-3">
            <div className="skeleton" style={{ height: '96px' }} />
            <div className="skeleton" style={{ height: '96px' }} />
            <div className="skeleton" style={{ height: '96px' }} />
            <div className="skeleton" style={{ height: '96px' }} />
          </div>
          {/* Skeleton Chart */}
          <div className="skeleton" style={{ height: '420px', borderRadius: 'var(--radius-md)' }} />
          {/* Skeleton Table */}
          <div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius-md)' }} />
        </div>
      ) : (
        <>
          {/* View 1: Decision View */}
          {activeTab === 'decision' && decisionData && (
            <div
              className="flex flex-col gap-4"
              style={{ opacity: isDayLoading ? 0.6 : 1, transition: 'opacity 0.15s' }}
            >
              <DecisionView
                decisionData={decisionData}
                overallMetrics={overallMetrics ?? undefined}
                dayMetrics={selectedDayMetrics}
              />

              {/* Compact Trader Note Panel Below Chart */}
              <TraderInsightBox
                overallMetrics={overallMetrics ?? undefined}
                dayMetrics={selectedDayMetrics}
                selectedDate={selectedDate}
              />
            </div>
          )}

          {/* View 2: Accuracy View */}
          {activeTab === 'accuracy' && (
            <AccuracyView
              overallMetrics={overallMetrics ?? undefined}
              dayMetricsList={dayMetricsList}
              hourMetricsList={hourMetricsList}
              comparisonData={comparisonData?.data ?? []}
              horizonMetricsList={horizonData?.data ?? []}
            />
          )}
        </>
      )}

      {/* 5. Methodology Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
        cutoffHour={health?.cutoff_hour ?? 9}
      />
    </div>
  );
};
