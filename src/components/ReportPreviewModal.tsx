import React from 'react';
import { X, Download, Shield, Heart, Activity, FileText, CheckCircle2, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prediction: any;
  preventionPlan?: any;
  onDownload: () => void;
  isDownloading: boolean;
}

export default function ReportPreviewModal({
  isOpen,
  onClose,
  prediction,
  preventionPlan,
  onDownload,
  isDownloading,
}: ReportPreviewModalProps) {
  if (!isOpen || !prediction) return null;

  const factors = prediction.factors || {};
  const riskLevel = String(prediction.riskLevel || 'LOW').toUpperCase();
  const riskScore = typeof prediction.riskScore === 'number' ? prediction.riskScore : 0;
  const scanDate = prediction.createdAt
    ? new Date(prediction.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent Scan';

  const r30 = prediction.risk30Day != null ? `${prediction.risk30Day}%` : 'Deferred (Cohort N/A)';
  const r1y = prediction.risk1Year != null ? `${prediction.risk1Year}%` : 'Deferred (Cohort N/A)';
  const r5y = prediction.risk5Year != null ? `${prediction.risk5Year}%` : 'Deferred (Cohort N/A)';

  const shapList = Array.isArray(prediction.shapExplanation) ? prediction.shapExplanation : [];
  const recs = preventionPlan?.recommendations || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                Verified Clinical Document
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                ID: {String(prediction.id || '').slice(0, 10)}
              </span>
            </div>
            <h3 className="text-lg font-bold">Cardiovascular Health Risk Report</h3>
            <p className="text-xs text-slate-300">Generated on {scanDate}</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onDownload}
              disabled={isDownloading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-900 text-xs">
          
          {/* Risk Level Highlight Box */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Cardiovascular Risk Status</span>
              <div className="flex items-center space-x-2.5">
                <span className={`text-base font-bold px-3 py-0.5 rounded-full border ${
                  riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : riskLevel === 'MODERATE'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  ● {riskLevel} RISK ({riskScore}%)
                </span>
                <span className="text-xs text-slate-500">
                  {prediction.confidenceScore != null
                    ? `Confidence: ${Math.round(prediction.confidenceScore * 100)}%`
                    : 'Confidence: Uncalibrated'}
                </span>
              </div>
              <p className="text-xs text-slate-600 max-w-md pt-1">
                {prediction.plainExplanation || `Calculated across multi-dataset clinical ensemble models.`}
              </p>
            </div>

            {/* Projected Horizons */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1.5 shrink-0 min-w-[200px]">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500">Projected Horizons</span>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">30-Day:</span>
                <span className="font-bold text-slate-900">{r30}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">1-Year:</span>
                <span className="font-bold text-slate-900">{r1y}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">5-Year:</span>
                <span className="font-bold text-slate-900">{r5y}</span>
              </div>
            </div>
          </div>

          {/* Biometrics Summary Grid */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Recorded Biometrics</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Blood Pressure</span>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{factors.systolicBP || '--'}/{factors.diastolicBP || '--'} mmHg</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Resting Heart Rate</span>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{factors.heartRate || '--'} bpm</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Total Cholesterol</span>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{factors.cholesterol || '--'} mg/dL</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-mono text-slate-500 uppercase">BMI (Body Mass)</span>
                <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{factors.bmi || '--'} kg/m²</p>
              </div>
            </div>
          </div>

          {/* SHAP Contributors */}
          {shapList.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Top Explainability (SHAP) Contributors</h4>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                {shapList.slice(0, 4).map((s: any, idx: number) => {
                  const isRisk = String(s.impact || '').toLowerCase().includes('risk') || String(s.direction || '').toLowerCase().includes('negative');
                  return (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{s.feature || 'Biomarker'}</p>
                        <p className="text-[11px] text-slate-500">{s.value || 'Recorded Value'}</p>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isRisk ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {isRisk ? 'Increases Risk (+)' : 'Protective (-)'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Personalized Prevention Protocol Preview */}
          {recs.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Personalized Prevention Protocol</h4>
              <div className="space-y-2">
                {recs.slice(0, 3).map((r: any) => (
                  <div key={r.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-mono font-bold uppercase px-2 py-0.2 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                        {r.priority} PRIORITY • {r.category}
                      </span>
                      {r.isShapDriver && (
                        <span className="text-[9px] font-mono text-rose-600 font-bold">
                          ★ Key Driver
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-slate-900 text-xs pt-0.5">{r.title}</h5>
                    <p className="text-[11px] text-slate-600 italic">{r.reason}</p>
                    <p className="text-[11px] text-slate-800 font-medium pt-0.5">Action: {r.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-[10px] text-slate-500 text-center leading-relaxed">
            Clinical Decision-Support Notice: This report provides statistical likelihoods for clinical decision-support and does not establish a medical diagnosis. Always consult a certified physician or cardiologist.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Close
          </button>
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>Download Clinical PDF</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
