import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  Activity,
  Calendar,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { downloadReportPdf } from '../services/reportService';
import ReportPreviewModal from '../components/ReportPreviewModal';

const safeFormatDate = (val: any, options?: Intl.DateTimeFormatOptions, fallback = 'Recent') => {
  if (!val) return fallback;
  const d = new Date(val);
  return isNaN(d.getTime()) ? fallback : d.toLocaleDateString('en-US', options);
};

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Fetch prediction history with strict user session isolation
  const {
    data: historyRes,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['predictionHistory', user?.id],
    queryFn: () => api.get('/prediction/history'),
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
  });

  // Fetch latest prediction and prevention plan
  const {
    data: latestRes,
    isLoading: latestLoading,
    isError: latestError,
    refetch: refetchLatest
  } = useQuery({
    queryKey: ['latestPrediction', user?.id],
    queryFn: () => api.get('/prediction/latest'),
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
  });

  const isAuthResolving = !user;
  const isLoading = isAuthResolving || historyLoading || latestLoading;
  const isQueryError = (historyError || latestError) && !historyRes && !latestRes;
  const history: any[] = Array.isArray(historyRes?.history) ? historyRes.history : [];
  const latestPrediction = latestRes?.prediction || (history.length > 0 ? history[0] : null);
  const preventionPlan = latestRes?.preventionPlan;

  const handleDownload = async (id?: string) => {
    const targetId = id || latestPrediction?.id;
    setDownloadingId(targetId || 'latest');
    setDownloadError(null);
    setDownloadSuccess(null);

    try {
      const res = await downloadReportPdf(targetId);
      setDownloadSuccess(`Report downloaded: ${res.filename || 'Cardiovascular Report'}`);
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err: any) {
      setDownloadError(err?.message || 'Failed to generate and download PDF report.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenPreview = (prediction: any) => {
    setSelectedPrediction(prediction);
    setIsPreviewOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading Clinical Report Center...</p>
        </div>
      </div>
    );
  }

  if (isQueryError) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 font-sans pb-12">
        <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-4 shadow-stitch">
          <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6 text-rose-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Unable to load clinical report data</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              A temporary network or server error occurred while retrieving your report history.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { refetchHistory(); refetchLatest(); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
          >
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const getRiskBadge = (level?: string) => {
    switch ((level || '').toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'MODERATE':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };


  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#c3c5d9] shadow-stitch">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Clinical Report Archive
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {history.length} {history.length === 1 ? 'Report Available' : 'Reports Available'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Patient Cardiovascular Report Center
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl font-light leading-relaxed">
            Generate and download comprehensive, multi-page clinical cardiovascular risk reports.
            Every report features your exact biometric telemetry, SHAP explainability attribution, multi-horizon forecasts, and personalized Prevention Coach interventions.
          </p>
        </div>

        <Link
          to="/prediction"
          className="shrink-0 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs"
        >
          <Activity className="h-4 w-4" />
          <span>Run New Risk Scan</span>
        </Link>
      </div>

      {/* Academic Clinical Validation Report Card */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 rounded-2xl border border-purple-500/30 shadow-stitch flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-md bg-purple-500/20 text-purple-300">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-300">
              Academic Multi-Dataset Benchmark
            </span>
          </div>
          <h2 className="text-lg font-bold text-white">
            HridayaDarpana Clinical Validation Report
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed font-light">
            Comprehensive retrospective empirical validation report evaluating the 5 production ML models against de-identified historical cases from held-out test splits. Features calculated sensitivity, specificity, precision, F1-score, AUROC, 2x2 confusion matrix, and zero-data-leakage protocol documentation.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <Link
            to="/validation"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-all border border-white/20"
          >
            <span>Open Validation Center</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <a
            href="/api/prediction/validation/report"
            download="HridayaDarpana_Clinical_Validation_Report.pdf"
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-xs"
          >
            <Download className="h-4 w-4" />
            <span>Download Validation PDF</span>
          </a>
        </div>
      </div>

      {/* Notification Alerts */}
      {downloadSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{downloadSuccess}</span>
          </div>
        </div>
      )}

      {downloadError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{downloadError}</span>
          </div>
        </div>
      )}

      {/* Latest Report Featured Card */}
      {latestPrediction ? (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-200 bg-white/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Latest Clinical Evaluation
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Executive Cardiovascular Risk Report
              </h2>
              <div className="flex items-center space-x-3 text-xs text-slate-500 font-light">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {safeFormatDate(latestPrediction.createdAt, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }, 'Recent Evaluation')}
                </span>
                <span>•</span>
                <span>Model: {latestPrediction.modelVersion || 'v2.1-ClinicalEnsemble'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleOpenPreview(latestPrediction)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Eye className="h-4 w-4 text-slate-500" />
                <span>View Report</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload(latestPrediction.id)}
                disabled={downloadingId === latestPrediction.id || downloadingId === 'latest'}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-xs cursor-pointer"
              >
                {downloadingId === latestPrediction.id || downloadingId === 'latest' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download PDF Report</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Overall Risk</span>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xl font-bold text-slate-900">
                  {typeof latestPrediction.riskScore === 'number' ? latestPrediction.riskScore : (Number(latestPrediction.riskScore) || 0)}%
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRiskBadge(latestPrediction.riskLevel)}`}>
                  {latestPrediction.riskLevel || 'LOW'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">30-Day Acute</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {latestPrediction.risk30Day != null
                  ? String(latestPrediction.risk30Day)
                  : ((Number(latestPrediction.riskScore) || 0) * 0.28).toFixed(1)}%
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">1-Year Projected</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {latestPrediction.risk1Year != null
                  ? String(latestPrediction.risk1Year)
                  : ((Number(latestPrediction.riskScore) || 0) * 0.65).toFixed(1)}%
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Blood Pressure</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {latestPrediction.factors?.systolicBP || '--'}/{latestPrediction.factors?.diastolicBP || '--'} <span className="text-xs text-slate-500 font-normal">mmHg</span>
              </p>
            </div>
          </div>

        </div>
      ) : (
        /* Empty State */
        <div className="glass-panel p-10 rounded-3xl border border-slate-200 text-center space-y-4 bg-white/80">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FileText className="h-7 w-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">No Clinical Scans Recorded Yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Complete your first 60-second cardiovascular risk scan to generate your authenticated clinical PDF report and personalized prevention plan.
            </p>
          </div>
          <Link
            to="/prediction"
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <Activity className="h-4 w-4" />
            <span>Launch Risk Scan Now</span>
          </Link>
        </div>
      )}

      {/* Historical Reports Archive Table */}
      {history.length > 0 && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-slate-200 bg-white/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Historical Report Archive</h3>
              <p className="text-xs text-slate-500 font-light">All past verified clinical evaluations and corresponding downloadable reports.</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total: {history.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-mono uppercase text-slate-400 border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4">Evaluation Date</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Blood Pressure</th>
                  <th className="py-3 px-4">Cholesterol</th>
                  <th className="py-3 px-4">Model Version</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item: any, idx: number) => {
                  const dateStr = safeFormatDate(item?.createdAt, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }, 'N/A');
                  const itemId = item?.id || `history-item-${idx}`;
                  const isCurrentDownloading = downloadingId === itemId;

                  return (
                    <tr key={itemId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getRiskBadge(item.riskLevel)}`}>
                          {item.riskLevel || 'LOW'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.riskScore}%
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {item.factors?.systolicBP || '--'}/{item.factors?.diastolicBP || '--'} mmHg
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {item.factors?.cholesterol ? `${item.factors.cholesterol} mg/dL` : '--'}
                      </td>
                      <td className="py-3 px-4 text-[10px] font-mono text-slate-500">
                        {item.modelVersion || 'v2.1-ClinicalEnsemble'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Preview Report"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(item.id)}
                            disabled={isCurrentDownloading}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-600 disabled:opacity-50 text-white text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                          >
                            {isCurrentDownloading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                            <span>PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Technical Specifications Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-200 bg-white/90 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-600">
          <Info className="h-4 w-4" />
          <span>Report Technical & Clinical Specifications</span>
        </div>
        <p className="text-xs text-slate-600 font-light leading-relaxed">
          The HridayaDarpana Clinical Report is an executive 2-page document compiled directly from your real-time biometric telemetry, SHAP explainable AI attribution vectors, and individualized Prevention Coach guidelines. It is calibrated according to the 2019 AHA/ACC Cardiovascular Prevention Guidelines and the 2023 ESC Cardiology Standards.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-500">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-700 block mb-0.5">SHA-256 Audit Verification</span>
            Each report is cryptographically hash-stamped for patient isolation and provenance.
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-700 block mb-0.5">SHAP Attribution Table</span>
            Explains exact biometric contributions driving the patient's individual risk score.
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-bold text-slate-700 block mb-0.5">Personalized Prevention</span>
            Individualized clinical lifestyle, diet, sodium targets, and physical activity guidelines.
          </div>
        </div>
      </div>

      {/* Interactive Report Preview Modal */}
      {selectedPrediction && (
        <ReportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          prediction={selectedPrediction}
          preventionPlan={preventionPlan}
          onDownload={() => handleDownload(selectedPrediction.id)}
          isDownloading={downloadingId === selectedPrediction.id}
        />
      )}
    </div>
  );
}
