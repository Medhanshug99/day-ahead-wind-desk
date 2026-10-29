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
import { AlertCircle, RefreshCw, BarChart2, CheckCircle2 } from 'lucide-react';

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

  // Initial load: Health, Overall Metrics, Day Metrics, Hour Metrics, Horizon & Comparison
  useEffect(() => {
    let isMounted = true;
    const initApp = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [
          healthRes,
          overallRes,
          dayRes,
          hourRes,
          compRes,
          horizonRes,
          initialDecisionRes,
        ] = await Promise.all([
          api.getHealth(),
          api.getMetrics('2026-01-02', '2026-02-01', 'overall'),
          api.getMetrics('2026-01-02', '2026-02-01', 'day'),
          api.getMetrics('2026-01-02', '2026-02-01', 'hour'),
          api.getComparison('2026-01-02', '2026-02-01'),
          api.getHorizonMetrics(),
          api.getDecisionForecast(selectedDate),
        ]);

        if (isMounted) {
          setHealth(healthRes);
          if (overallRes.metrics.length > 0) setOverallMetrics(overallRes.metrics[0]);
          setDayMetricsList(dayRes.metrics);
          setHourMetricsList(hourRes.metrics);
          setComparisonData(compRes);
          setHorizonData(horizonRes);
          setDecisionData(initialDecisionRes);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Initial data load error:', err);
          setError(err.message || 'Failed to connect to backend API');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initApp();
    return () => {
      isMounted = false;
    };
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
    <div style={{ minHeight: '100vh', padding: '1.5rem 0 3rem 0' }}>
      <div className="container">
        {/* Header */}
        <Header
          cutoffHour={health?.cutoff_hour ?? 9}
          deliveryWindow={health?.delivery_window ?? '2026-01-02 to 2026-02-01'}
          onOpenMethodology={() => setIsMethodologyOpen(true)}
        />

        {/* Global Error Banner */}
        {error && (
          <div
            className="card flex items-center justify-between"
            style={{
              borderColor: '#f43f5e',
              background: 'rgba(244, 63, 94, 0.1)',
              marginBottom: '1.5rem',
            }}
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-rose" />
              <div>
                <strong className="text-rose">Backend Connection Error: </strong>
                <span className="text-slate-300 text-sm">{error}</span>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-secondary text-xs"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* Date Picker Bar */}
        <DeliveryPicker
          selectedDate={selectedDate}
          onChange={handleDateChange}
          minDate="2026-01-02"
          maxDate="2026-02-01"
        />

        {/* Trader Insight Box */}
        <TraderInsightBox
          overallMetrics={overallMetrics ?? undefined}
          dayMetrics={selectedDayMetrics}
          selectedDate={selectedDate}
        />

        {/* Navigation Tabs */}
        <div className="tab-nav">
          <button
            onClick={() => setActiveTab('decision')}
            className={`tab-btn ${activeTab === 'decision' ? 'active' : ''}`}
          >
            Decision View ({selectedDate})
          </button>
          <button
            onClick={() => setActiveTab('accuracy')}
            className={`tab-btn ${activeTab === 'accuracy' ? 'active' : ''}`}
          >
            Accuracy &amp; Error Analysis (Full Month)
          </button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="card flex flex-col items-center justify-center" style={{ minHeight: '350px' }}>
            <RefreshCw size={36} className="text-cyan animate-spin" style={{ marginBottom: '1rem' }} />
            <div className="text-base font-semibold text-slate-200">
              Loading National Wind Generation Data...
            </div>
            <p className="text-xs text-muted" style={{ marginTop: '0.5rem' }}>
              Retrieving Elexon BMRS WINDFOR forecasts and FUELHH actuals
            </p>
          </div>
        ) : (
          <>
            {/* Tab 1: Decision View */}
            {activeTab === 'decision' && decisionData && (
              <div style={{ opacity: isDayLoading ? 0.6 : 1, transition: 'opacity 0.15s' }}>
                <DecisionView
                  decisionData={decisionData}
                  overallMetrics={overallMetrics ?? undefined}
                />
              </div>
            )}

            {/* Tab 2: Accuracy View */}
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
      </div>

      {/* Methodology Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
        cutoffHour={health?.cutoff_hour ?? 9}
      />
    </div>
  );
};

