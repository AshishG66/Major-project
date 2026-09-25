import React from 'react';
import { motion } from 'framer-motion';
import {
  X,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Activity,
  Award,
  Zap,
  Clock,
  Printer
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  PhysiologicalParameters,
  PhysiologicalResponse,
  SimulationLogEntry
} from '../../utils/cardiovascularSimulationEngine';

interface SimulationSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialParams: PhysiologicalParameters;
  finalResponse: PhysiologicalResponse;
  logEntries: SimulationLogEntry[];
  vitalsHistory: Array<{
    second: number;
    hr: number;
    sysBP: number;
    diaBP: number;
    spo2: number;
    co: number;
  }>;
}

export default function SimulationSummaryModal({
  isOpen,
  onClose,
  initialParams,
  finalResponse,
  logEntries,
  vitalsHistory,
}: SimulationSummaryModalProps) {
  if (!isOpen) return null;

  // Calculate Min / Max / Avg stats
  const hrArr = vitalsHistory.map(v => v.hr);
  const minHR = hrArr.length ? Math.min(...hrArr) : finalResponse.vitals.heartRate;
  const maxHR = hrArr.length ? Math.max(...hrArr) : finalResponse.vitals.heartRate;

  const sysArr = vitalsHistory.map(v => v.sysBP);
  const minSys = sysArr.length ? Math.min(...sysArr) : finalResponse.vitals.systolicBP;
  const maxSys = sysArr.length ? Math.max(...sysArr) : finalResponse.vitals.systolicBP;

  // Download CSV export handler
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Second,HeartRate_BPM,SystolicBP_mmHg,DiastolicBP_mmHg,SpO2_Percent,CardiacOutput_Lmin\n';

    vitalsHistory.forEach(v => {
      csvContent += `${v.second},${v.hr},${v.sysBP},${v.diaBP},${v.spo2},${v.co}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cardiovascular_simulation_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download JSON report handler
  const handleExportJSON = () => {
    const reportObj = {
      title: 'HridayaDarpana 1-Minute Cardiovascular Simulation Summary',
      generatedAt: new Date().toISOString(),
      disclaimer: 'Educational Simulation Model - Not intended for clinical diagnostic or treatment use.',
      initialParameters: initialParams,
      finalVitals: finalResponse.vitals,
      finalECG: finalResponse.ecg,
      overallStatus: finalResponse.status,
      parameterChangeLogs: logEntries,
      telemetryTimeSeries: vitalsHistory,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportObj, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `simulation_summary_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1c30]/75 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white border border-[#c3c5d9] rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003ec7] to-[#0052ff] p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Heart className="h-6 w-6 text-[#3ee5fe] animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-geist font-bold">1-Minute Simulation Summary Report</h2>
              <p className="text-xs text-blue-100 font-inter">
                Real-Time Cardiovascular & Medication Digital Twin Analytics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#f8f9ff]">
          {/* Status Alert Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start space-x-3 ${
              finalResponse.status === 'CRITICAL'
                ? 'bg-[#ffdad6] border-[#ba1a1a]/40 text-[#93000a]'
                : finalResponse.status === 'WARNING'
                ? 'bg-[#fffbeb] border-[#f59e0b]/40 text-[#92400e]'
                : 'bg-[#e6f4ea] border-[#10b981]/40 text-[#005a3c]'
            }`}
          >
            {finalResponse.status === 'CRITICAL' ? (
              <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-6 w-6 shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className="font-geist font-bold text-sm uppercase tracking-wide">
                Final Heart State: {finalResponse.statusTitle}
              </h3>
              <p className="text-xs mt-1 leading-relaxed">{finalResponse.statusReason}</p>
            </div>
          </div>

          {/* Vitals Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-[#c3c5d9]/60 shadow-xs">
              <span className="font-mono-data text-[10px] text-[#737688] uppercase tracking-wider block">Heart Rate Range</span>
              <p className="text-lg font-geist font-bold text-[#003ec7] mt-1">
                {minHR} - {maxHR} <span className="text-xs font-normal text-slate-500">BPM</span>
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Final: {finalResponse.vitals.heartRate} BPM</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#c3c5d9]/60 shadow-xs">
              <span className="font-mono-data text-[10px] text-[#737688] uppercase tracking-wider block">Blood Pressure Peak</span>
              <p className="text-lg font-geist font-bold text-[#0b1c30] mt-1">
                {maxSys} <span className="text-xs font-normal text-slate-500">mmHg</span>
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Final: {finalResponse.vitals.systolicBP}/{finalResponse.vitals.diastolicBP} mmHg</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#c3c5d9]/60 shadow-xs">
              <span className="font-mono-data text-[10px] text-[#737688] uppercase tracking-wider block">Cardiac Output</span>
              <p className="text-lg font-geist font-bold text-[#0052ff] mt-1">
                {finalResponse.vitals.cardiacOutput} <span className="text-xs font-normal text-slate-500">L/min</span>
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">SV: {finalResponse.vitals.strokeVolume} mL | EF: {finalResponse.vitals.ejectionFraction}%</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#c3c5d9]/60 shadow-xs">
              <span className="font-mono-data text-[10px] text-[#737688] uppercase tracking-wider block">ECG Morphology</span>
              <p className="text-sm font-geist font-bold text-emerald-600 mt-1 truncate">
                {finalResponse.ecg.rhythmTitle}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">QRS: {finalResponse.ecg.qrsDurationMs}ms | QTc: {finalResponse.ecg.qtcIntervalMs}ms</span>
            </div>
          </div>

          {/* Vitals Telemetry Trend Chart */}
          <div className="bg-white p-5 rounded-2xl border border-[#c3c5d9]/60 shadow-xs">
            <h4 className="text-xs font-geist font-bold text-[#0b1c30] uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Activity className="h-4 w-4 text-[#0052ff]" />
              <span>1-Minute Heart Rate & Blood Pressure Trend</span>
            </h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vitalsHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5eeff" />
                  <XAxis dataKey="second" unit="s" stroke="#737688" fontSize={10} />
                  <YAxis stroke="#737688" fontSize={10} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0b1c30', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  />
                  <Line type="monotone" dataKey="hr" name="Heart Rate (BPM)" stroke="#ef4444" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="sysBP" name="Systolic BP (mmHg)" stroke="#0052ff" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="spo2" name="SpO2 (%)" stroke="#10b981" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Log Timeline Events */}
          <div className="bg-white p-5 rounded-2xl border border-[#c3c5d9]/60 shadow-xs space-y-3">
            <h4 className="text-xs font-geist font-bold text-[#0b1c30] uppercase tracking-wider flex items-center space-x-2">
              <Clock className="h-4 w-4 text-[#0052ff]" />
              <span>Simulation Event & Parameter Changes Log ({logEntries.length})</span>
            </h4>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {logEntries.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No parameter changes were recorded during this 1-minute run.</p>
              ) : (
                logEntries.map(entry => (
                  <div key={entry.id} className="p-3 bg-[#f8f9ff] border border-[#e5eeff] rounded-xl text-xs flex items-start justify-between">
                    <div>
                      <span className="font-mono-data text-[10px] font-bold text-[#0052ff] mr-2">[{entry.timestamp}]</span>
                      <strong className="text-[#0b1c30]">{entry.paramName}:</strong> {entry.oldValue} → <strong>{entry.newValue} {entry.unit || ''}</strong>
                      <p className="text-[11px] text-slate-600 mt-0.5">{entry.physiologicalEffect}</p>
                    </div>
                    <span className={`text-[9px] font-mono-data uppercase font-bold px-2 py-0.5 rounded ${
                      entry.severity === 'CRITICAL' ? 'bg-[#ffdad6] text-[#93000a]' : entry.severity === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {entry.category}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-slate-400 italic text-center border-t border-[#e5eeff] pt-4">
            Educational Cardiovascular Simulation Model. Designed strictly for computational demonstration of physiological feedback loops. Not for clinical treatment or diagnosis.
          </p>
        </div>

        {/* Modal Action Footer */}
        <div className="bg-white p-4 border-t border-[#c3c5d9]/60 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Close Summary
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#0052ff] bg-[#eff4ff] hover:bg-[#e0ebff] border border-[#0052ff]/20 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0052ff] hover:bg-[#003ec7] transition-colors shadow-xs"
            >
              <Download className="h-4 w-4" />
              <span>Download JSON Report</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
