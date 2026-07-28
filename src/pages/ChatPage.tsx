import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, Send, Loader2, Heart, ShieldAlert, Sparkles, Upload, FileText, CheckCircle, Navigation, Phone, Flame, MapPin, Activity, Shield, Clipboard, Zap, Terminal, Copy, RotateCcw, Square, Trash2, Check, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../services/api';

interface AgentConfig {
  type: string;
  name: string;
  desc: string;
  colorClass: string;
  bgClass: string;
  icon: React.ComponentType<any>;
  presets: string[];
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [parsedReport, setParsedReport] = useState<any>(null);
  const [emergencyAlert, setEmergencyAlert] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([]);
  const [activeAgentType, setActiveAgentType] = useState<string>('ORCHESTRATOR');
  const [routingLog, setRoutingLog] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const timerRefs = useRef<any[]>([]);
  const streamTimerRef = useRef<any>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [lastDebugInfo, setLastDebugInfo] = useState<any>(null);

  // Streaming & Message Action states
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string>('');
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [openCitationId, setOpenCitationId] = useState<string | null>(null);
  const [lastUserPrompt, setLastUserPrompt] = useState<string>('');

  // Specialist Agents Registry
  const SPECIALISTS: Record<string, AgentConfig> = {
    ORCHESTRATOR: {
      type: 'ORCHESTRATOR',
      name: 'HridyaAI Orchestrator',
      desc: 'Cognitive dispatch system that routes requests to clinical specialists.',
      colorClass: 'text-blue-600 border-blue-200',
      bgClass: 'bg-blue-50 border-blue-200',
      icon: Sparkles,
      presets: ['Explain my scan risk factors', 'Diet plan for high blood pressure', 'Cardio workout recommendations']
    },
    DIAGNOSIS: {
      type: 'DIAGNOSIS',
      name: 'Diagnosis Agent',
      desc: 'Evaluates ECG waveforms, cholesterol loads, and Stage 2 Hypertension indicators.',
      colorClass: 'text-blue-600 border-blue-200',
      bgClass: 'bg-blue-50 border-blue-200',
      icon: Activity,
      presets: ['What does Left Ventricular Hypertrophy mean?', 'Analyze my high cholesterol score', 'Evaluate risk for systolic BP 160']
    },
    DIET: {
      type: 'DIET',
      name: 'Diet Agent',
      desc: 'Formulates heart-safe DASH dietary schemes, restricting sodium intake.',
      colorClass: 'text-emerald-600 border-emerald-200',
      bgClass: 'bg-emerald-50 border-emerald-200',
      icon: Shield,
      presets: ['Explain the DASH diet limits', 'Low sodium recipe suggestions', 'Potassium foods to reduce BP']
    },
    EXERCISE: {
      type: 'EXERCISE',
      name: 'Exercise Agent',
      desc: 'Computes target aerobic training heart rate zones for cardiorespiratory fitness.',
      colorClass: 'text-cyan-600 border-cyan-200',
      bgClass: 'bg-cyan-50 border-cyan-200',
      icon: Flame,
      presets: ['What is my target training heart rate zone?', 'Cardio exercises for hypertrophy patients', 'Weekly active minutes guidelines']
    },
    REPORT: {
      type: 'REPORT',
      name: 'Report Agent',
      desc: 'Parses lipid spreadsheets, blood sugar ratios, and CBC reports.',
      colorClass: 'text-slate-700 border-slate-200',
      bgClass: 'bg-slate-100 border-slate-200',
      icon: FileText,
      presets: ['Audit my cholesterol levels', 'Is glucose 135 mg/dL prediabetic?', 'Parse my latest blood scan values']
    },
    MEDICATION: {
      type: 'MEDICATION',
      name: 'Medication Agent',
      desc: 'Details prescription statin alerts, beta-blocker timings, and safety parameters.',
      colorClass: 'text-blue-600 border-blue-200',
      bgClass: 'bg-blue-50 border-blue-200',
      icon: Clipboard,
      presets: ['Best time to take Atorvastatin', 'Amlodipine dosing precautions', 'Statins muscle pain side effects']
    },
    NEARBY_HEALTH: {
      type: 'NEARBY_HEALTH',
      name: 'Nearby Health Agent',
      desc: 'Tracks geolocated cardiologists, gyms, and clinic locations.',
      colorClass: 'text-cyan-600 border-cyan-200',
      bgClass: 'bg-cyan-50 border-cyan-200',
      icon: MapPin,
      presets: ['Find local cardiac care clinics', 'Nearest fitness gym centers', 'Dial cardiologists near me']
    },
    EMERGENCY: {
      type: 'EMERGENCY',
      name: 'Emergency Agent',
      desc: 'Triggers distress guidelines and geolocates critical cardiac care units.',
      colorClass: 'text-rose-600 border-rose-300 animate-pulse',
      bgClass: 'bg-rose-50 border-rose-200',
      icon: ShieldAlert,
      presets: ['I have acute squeezing chest pain', 'Dyspnea chest tightness crisis guidelines', 'Emergency dials checklist']
    }
  };

  // Queries
  const { data: sessionsRes, isLoading: sessionsLoading } = useQuery({
    queryKey: ['chatSessions'],
    queryFn: () => api.get('/chat/sessions'),
  });

  const { data: messagesRes, isLoading: messagesLoading } = useQuery({
    queryKey: ['chatMessages', activeSessionId],
    queryFn: () => api.get(`/chat/sessions/${activeSessionId}`),
    enabled: !!activeSessionId,
  });

  // Emergency geolocator
  useEffect(() => {
    if (emergencyAlert) {
      api.get('/maps/nearby?lat=28.6139&lng=77.2090&type=hospital').then((res) => {
        if (res.success) {
          setNearbyHospitals(res.places.slice(0, 3));
        }
      });
    }
  }, [emergencyAlert]);

  // Scroll to bottom & handle typewriter animation for last assistant response
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    if (messagesRes?.messages && messagesRes.messages.length > 0) {
      const lastMsg = messagesRes.messages[messagesRes.messages.length - 1];
      if (lastMsg.role === 'ASSISTANT') {
        if (lastMsg.agentType) {
          setActiveAgentType(lastMsg.agentType);
          if (lastMsg.agentType === 'EMERGENCY') {
            setEmergencyAlert(true);
          }
        }

        // Trigger typewriter streaming for new assistant response
        if (streamingMsgId !== lastMsg.id && lastMsg.content) {
          setStreamingMsgId(lastMsg.id);
          setStreamingText('');
          
          let idx = 0;
          const fullText = lastMsg.content;
          if (streamTimerRef.current) clearInterval(streamTimerRef.current);
          
          streamTimerRef.current = setInterval(() => {
            idx += Math.max(1, Math.floor(fullText.length / 45));
            if (idx >= fullText.length) {
              setStreamingText(fullText);
              clearInterval(streamTimerRef.current);
            } else {
              setStreamingText(fullText.slice(0, idx));
            }
          }, 20);
        }
      }
    }
  }, [messagesRes?.messages]);

  useEffect(() => {
    if (sessionsRes?.sessions) {
      if (sessionsRes.sessions.length > 0) {
        if (!activeSessionId) {
          setActiveSessionId(sessionsRes.sessions[0].id);
        }
      } else if (!activeSessionId && !createSessionMutation.isPending) {
        createSessionMutation.mutate();
      }
    }
  }, [sessionsRes]);

  useEffect(() => {
    return () => {
      timerRefs.current.forEach(clearTimeout);
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, []);

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: () => api.post('/chat/sessions'),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      setActiveSessionId(data.session.id);
      setEmergencyAlert(false);
      setActiveAgentType('ORCHESTRATOR');
      setRoutingLog(null);
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: (body: { message: string; sessionId: string }) => api.post('/chat/message', body),
    onSuccess: (data) => {
      // STEP 8 - VERIFY FRONTEND LOGS
      console.log('\n========================================================');
      console.log('[STEP 8 - FRONTEND RECEIVED JSON]');
      console.log(JSON.stringify(data, null, 2));

      timerRefs.current.forEach(clearTimeout);
      timerRefs.current = [];
      
      const newSessionId = data.sessionId || activeSessionId;
      if (newSessionId && newSessionId !== activeSessionId) {
        setActiveSessionId(newSessionId);
      }

      queryClient.setQueryData(['chatMessages', newSessionId], (oldData: any) => {
        const oldMsgs = oldData?.messages || [];
        const assistantMsg = { id: `msg-ast-${Date.now()}`, role: 'ASSISTANT', content: data.reply, agentType: data.agentType };
        const newMsgs = [...oldMsgs, assistantMsg];

        console.log('[STEP 8 - MESSAGES STATE]');
        console.log(JSON.stringify(newMsgs, null, 2));
        console.log(`VERIFICATION assistant.content == response.reply: ${assistantMsg.content === data.reply ? '✅ MATCHES EXACTLY' : '❌ MISMATCH'}`);
        console.log('========================================================\n');

        return { success: true, messages: newMsgs };
      });

      queryClient.invalidateQueries({ queryKey: ['chatMessages', newSessionId] });
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      setInputText('');
      setRoutingLog(null);
      if (data.debug) {
        setLastDebugInfo(data.debug);
      }
      if (data.agentType) {
        setActiveAgentType(data.agentType);
      }
      if (data.agentType === 'EMERGENCY') {
        setEmergencyAlert(true);
      }
    },
    onError: (err: any) => {
      console.error('HridyaAI Chat Error:', err);
      timerRefs.current.forEach(clearTimeout);
      timerRefs.current = [];
      setRoutingLog(null);
      if (err.response?.data?.debug) {
        setLastDebugInfo(err.response.data.debug);
      } else {
        setLastDebugInfo({
          geminiConnected: false,
          apiKeyLoaded: false,
          model: 'unconfigured-fallback',
          promptSent: 'Request transmission failed',
          responseReceived: err.message || 'Network error',
          latencyMs: 0,
        });
      }
    }
  });

  const uploadReportMutation = useMutation({
    mutationFn: (body: { fileData: string; fileName: string; fileType: string }) => 
      api.post('/chat/report/upload', body),
    onSuccess: (data) => {
      setUploadSuccess("Medical report successfully scanned!");
      setParsedReport(data.report.parsedValues);
      
      sendMessageMutation.mutate({
        message: `I uploaded my medical report "${data.report.title}". Summarize what it means: ${data.report.summary}`,
        sessionId: activeSessionId || '',
      });
    },
    onError: (err: any) => {
      setUploadSuccess(null);
      alert(err.message || 'Report upload parsing failed.');
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSend(inputText);
  };

  const triggerSend = (text: string) => {
    if (!text.trim()) return;
    setLastUserPrompt(text);

    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    setRoutingLog(`HridyaAI Router auditing query context...`);
    
    const t1 = setTimeout(() => {
      setRoutingLog(`Mapping parameters against specialist schemas...`);
    }, 450);
    
    const t2 = setTimeout(() => {
      setRoutingLog(`Formulating clinical response...`);
    }, 1000);

    timerRefs.current.push(t1, t2);

    sendMessageMutation.mutate({
      message: text,
      sessionId: activeSessionId || '',
    });
  };

  const handleStopStreaming = () => {
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
    }
    const lastMsg = messagesRes?.messages?.[messagesRes.messages.length - 1];
    if (lastMsg) {
      setStreamingText(lastMsg.content);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleCopyCode = (codeId: string, code: string) => {
    navigator.clipboard.writeText(decodeURIComponent(code));
    setCopiedCodeId(codeId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  useEffect(() => {
    (window as any).__copyCode = handleCopyCode;
    return () => {
      delete (window as any).__copyCode;
    };
  }, []);

  const handleRegenerate = () => {
    if (lastUserPrompt) {
      triggerSend(lastUserPrompt);
    } else {
      const msgs = messagesRes?.messages || [];
      const userMsgs = msgs.filter((m: any) => m.role === 'USER');
      if (userMsgs.length > 0) {
        triggerSend(userMsgs[userMsgs.length - 1].content);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeSessionId) return;
    const file = e.target.files[0];
    setUploading(true);
    setUploadSuccess(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Content = (reader.result as string).split(',')[1];
      uploadReportMutation.mutate({
        fileData: base64Content,
        fileName: file.name,
        fileType: file.type.includes('pdf') ? 'PDF' : 'IMAGE',
      });
      setUploading(false);
    };
  };

  // Rich Markdown Parser with Code Block Copy Buttons & Table Support
  const renderMessageContent = (content: string, msgId: string, isStreamingNow: boolean) => {
    const textToRender = isStreamingNow ? streamingText : content;

    let formatted = textToRender
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code Blocks: ```lang ... ```
    formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const codeId = `${msgId}-${Math.random().toString(36).substr(2, 5)}`;
      const cleanLang = lang || 'code';
      const isCodeCopied = copiedCodeId === codeId;

      return `
        <div class="my-2.5 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 overflow-hidden shadow-xs">
          <div class="px-3.5 py-1.5 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-[9px] font-mono text-slate-400">
            <span class="uppercase font-bold">${cleanLang}</span>
            <button onclick="window.__copyCode && window.__copyCode('${codeId}', \`${encodeURIComponent(code.trim())}\`)" class="hover:text-white transition-colors flex items-center space-x-1">
              <span>${isCodeCopied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
          <pre class="p-3 text-[11px] font-mono overflow-x-auto leading-relaxed text-slate-200"><code>${code.trim()}</code></pre>
        </div>
      `;
    });

    // Bold, Italics, Lists
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    formatted = formatted.replace(/^\*\s(.*)$/gm, '<li class="ml-4 list-disc mt-1 font-light text-slate-700">$1</li>');
    formatted = formatted.replace(/^-\s(.*)$/gm, '<li class="ml-4 list-disc mt-1 font-light text-slate-700">$1</li>');
    formatted = formatted.replace(/^\d+\.\s(.*)$/gm, '<li class="ml-4 list-decimal mt-1 font-light text-slate-700">$1</li>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic text-slate-800">$1</em>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-blue-600 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-200">$1</code>');

    // Blockquotes
    formatted = formatted.replace(/^>\s(.*)$/gm, '<blockquote class="border-l-4 border-blue-500 pl-3 py-1 my-1.5 italic text-slate-600 bg-blue-50/50 rounded-r-lg">$1</blockquote>');

    return (
      <div 
        dangerouslySetInnerHTML={{ __html: formatted }} 
        className="text-xs md:text-sm leading-relaxed space-y-1.5 font-light" 
      />
    );
  };

  const sessions = sessionsRes?.sessions || [];
  const messages = messagesRes?.messages || [];
  const activeAgent = SPECIALISTS[activeAgentType] || SPECIALISTS.ORCHESTRATOR;
  const ActiveAgentIcon = activeAgent.icon;

  return (
    <div className={`glass-panel rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm flex h-[calc(100vh-140px)] overflow-hidden relative transition-all duration-300 ${
      activeAgentType === 'EMERGENCY' ? 'ring-2 ring-rose-400 shadow-md' : ''
    }`}>
      
      {/* Left sessions Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-slate-200/80 p-4 shrink-0 bg-slate-50 h-full">
        <button
          onClick={() => createSessionMutation.mutate()}
          className="w-full py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors mb-4 focus:outline-none shadow-xs"
        >
          <Plus className="h-4 w-4 text-blue-600" />
          <span>New Consultation</span>
        </button>

        {sessionsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {sessions.map((sess: any) => (
              <button
                key={sess.id}
                onClick={() => {
                  setActiveSessionId(sess.id);
                  setEmergencyAlert(false);
                  setParsedReport(null);
                  setRoutingLog(null);
                  setActiveAgentType('ORCHESTRATOR');
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-medium transition-all truncate block ${
                  activeSessionId === sess.id
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                {sess.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right chat panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-white/40 h-full justify-between relative">
        
        {/* Header display */}
        <div className="px-6 py-3.5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 bg-white gap-3">
          <div className="flex items-center space-x-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center border transition-all ${activeAgent.bgClass}`}>
              <ActiveAgentIcon className={`h-5 w-5 ${activeAgent.colorClass}`} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm tracking-tight text-slate-900">{activeAgent.name}</h3>
              <span className="text-[10px] text-slate-500 leading-none block mt-0.5">{activeAgent.desc}</span>
            </div>
          </div>
          
          {/* Document upload trigger */}
          <div className="flex items-center space-x-3 self-end sm:self-auto">
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
                showDebugPanel 
                  ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Debug Panel</span>
            </button>

            <label className="cursor-pointer px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-blue-200 shadow-xs">
              {uploading || uploadReportMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              <span>Scan Lab Report</span>
              <input type="file" onChange={handleFileUpload} accept="image/*,.pdf" className="hidden" disabled={uploading || uploadReportMutation.isPending} />
            </label>
          </div>
        </div>

        {/* Specialized Agents Command panel */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 overflow-x-auto flex space-x-2 shrink-0 scrollbar-none">
          {Object.values(SPECIALISTS).map((agent) => {
            const Icon = agent.icon;
            const isSelected = activeAgentType === agent.type;
            return (
              <button
                key={agent.type}
                onClick={() => {
                  setActiveAgentType(agent.type);
                  if (agent.type === 'EMERGENCY') {
                    setEmergencyAlert(true);
                  }
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition-all whitespace-nowrap focus:outline-none ${
                  isSelected 
                    ? agent.bgClass + ' border-current scale-[1.03] shadow-xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{agent.name.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* OCR Parsed values visualization */}
        {parsedReport && (
          <div className="mx-6 mt-4 p-4 rounded-xl glass-panel border-emerald-200 bg-emerald-50/70 flex flex-col shrink-0 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-700 text-xs font-bold border-b border-emerald-200 pb-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>Parsed Laboratory values (multimodal Vision OCR)</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
              {Object.entries(parsedReport).map(([k, v]: any) => (
                <div key={k} className="p-2 rounded bg-white border border-emerald-200">
                  <span className="text-slate-500 capitalize block">{k.replace('_', ' ')}:</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message bubble stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          
          {/* Emergency mode dashboard overlay inside Chat window */}
          {emergencyAlert && (
            <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/80 space-y-4 text-xs shadow-xs">
              <div className="flex items-center space-x-2 text-rose-600 font-bold text-sm">
                <ShieldAlert className="h-5 w-5 animate-bounce" />
                <span>CARDIAC DISASTER / EMERGENCY MODE ACTIVE</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-light">
                HridyaAI has parsed acute distress indicators. Local emergency services dial links and nearest medical hospitals are mapped:
              </p>

              {/* Nearest hospitals list */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {nearbyHospitals.map((h) => (
                  <div key={h.id} className="p-3 rounded-lg bg-white border border-rose-200 space-y-1 shadow-xs">
                    <div className="flex items-center space-x-1.5 font-semibold text-slate-900 truncate">
                      <MapPin className="h-3.5 w-3.5 text-rose-600" />
                      <span>{h.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{h.address}</p>
                    <a href={`tel:${h.phone}`} className="flex items-center space-x-1 text-[9px] text-blue-600 hover:underline mt-1 font-semibold">
                      <Phone className="h-2.5 w-2.5" />
                      <span>{h.phone}</span>
                    </a>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-[10px] pt-2 border-t border-rose-200 text-slate-600 gap-2">
                <a href="tel:112" className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold flex items-center space-x-1 hover:bg-rose-700 transition-all shadow-xs">
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call Emergency Line (112)</span>
                </a>
                <span>*Stay calm. Loosen clothing. Avoid active motion.*</span>
              </div>
            </div>
          )}

          {messagesLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <Heart className="h-10 w-10 text-rose-400 animate-pulse" />
              <div>
                <h4 className="font-display font-semibold text-sm mb-1 text-slate-900">Consult with HridyaAI</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-light">
                  Ask diagnostic inquiries, analyze clinical reports, or get DASH recipes. Specialist agents auto-route inputs.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg: any, mIdx: number) => {
                const isUser = msg.role === 'USER';
                const isLastMsg = mIdx === messages.length - 1;
                const isStreamingNow = !isUser && isLastMsg && streamingMsgId === msg.id && streamingText.length < msg.content.length;
                const msgAgent = SPECIALISTS[msg.agentType] || SPECIALISTS.ORCHESTRATOR;
                const AgentIcon = msgAgent.icon;
                const isCopied = copiedMsgId === msg.id;
                const isCitationOpen = openCitationId === msg.id;

                return (
                  <div
                    key={msg.id || mIdx}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl shadow-xs relative group ${
                        isUser
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-tr-none'
                          : 'glass-panel border-slate-200/80 bg-white text-slate-900 rounded-tl-none shadow-xs'
                      }`}
                    >
                      {/* Agent category label badge */}
                      {!isUser && (
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center space-x-1 text-[8px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            <AgentIcon className="h-2.5 w-2.5" />
                            <span>{msg.agentType || 'HRIDYAAI'} AGENT</span>
                          </div>

                          {/* Quick Message Actions */}
                          <div className="opacity-80 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                            <button
                              onClick={() => handleCopyText(msg.id, msg.content)}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Copy response"
                            >
                              {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            </button>
                            
                            {isLastMsg && (
                              <button
                                onClick={handleRegenerate}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Regenerate response"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            )}

                            <button
                              onClick={() => setOpenCitationId(isCitationOpen ? null : msg.id)}
                              className={`p-1 transition-colors flex items-center space-x-0.5 text-[9px] font-bold ${
                                isCitationOpen ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'
                              }`}
                              title="View Clinical Citations"
                            >
                              <BookOpen className="h-3 w-3" />
                              {isCitationOpen ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Content Body */}
                      {renderMessageContent(msg.content, msg.id || String(mIdx), isStreamingNow)}

                      {/* Expandable Clinical Citations Panel */}
                      {!isUser && isCitationOpen && (
                        <div className="mt-3 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-[10px] space-y-1 text-slate-700 animate-fadeIn">
                          <p className="font-bold text-blue-700 flex items-center space-x-1 text-[9px] uppercase tracking-wider">
                            <BookOpen className="h-3 w-3" />
                            <span>Clinical Reference Citations</span>
                          </p>
                          <ul className="space-y-0.5 text-slate-600 font-mono text-[9.5px]">
                            <li>• ACC/AHA 2024 Guidelines for Management of High Blood Pressure</li>
                            <li>• ESC Clinical Guidelines for Heart Failure & Hypertrophy</li>
                            <li>• National Heart, Lung, and Blood Institute (NHLBI) DASH Eating Plan</li>
                          </ul>
                        </div>
                      )}

                      {/* Streaming stop button indicator */}
                      {isStreamingNow && (
                        <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                          <span className="flex items-center space-x-1 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                            <span>Streaming response...</span>
                          </span>
                          <button
                            onClick={handleStopStreaming}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 font-bold flex items-center space-x-1"
                          >
                            <Square className="h-2.5 w-2.5 fill-slate-600" />
                            <span>Stop</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Cognitive Orchestration Stages logs */}
              {routingLog && (
                <div className="flex justify-start">
                  <div className="glass-panel border-blue-200 bg-blue-50 p-3 rounded-xl flex items-center space-x-2.5 text-xxs font-mono text-blue-600 shadow-xs">
                    <Zap className="h-3.5 w-3.5 animate-bounce" />
                    <span>{routingLog}</span>
                  </div>
                </div>
              )}

              {/* Animated Thinking Indicator */}
              {sendMessageMutation.isPending && (
                <div className="flex justify-start">
                  <div className="glass-panel border-blue-200 bg-white p-4 rounded-2xl rounded-tl-none flex items-center space-x-3 shadow-xs">
                    <div className="flex space-x-1 items-center">
                      <span className="h-2 w-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 bg-cyan-500 rounded-full animate-bounce" />
                    </div>
                    <span className="text-xs text-slate-600 font-medium">
                      HridyaAI is analyzing biometric parameters & consulting specialist models...
                    </span>
                  </div>
                </div>
              )}

              {/* Friendly Error Fallback with Retry Button */}
              {sendMessageMutation.isError && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl shadow-xs rounded-tl-none border border-rose-200 bg-rose-50 text-slate-900 animate-fadeIn space-y-2">
                    <div className="flex items-center space-x-1.5 text-[9px] uppercase tracking-wider font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded border border-rose-200 self-start w-max">
                      <ShieldAlert className="h-3 w-3 animate-bounce" />
                      <span>CONNECTION ERROR</span>
                    </div>
                    <p className="text-xs md:text-sm leading-relaxed font-light text-rose-700">
                      HridyaAI is temporarily unavailable.
                    </p>
                    <button
                      onClick={() => handleSendMessage({ preventDefault: () => {} } as any)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Retry Request</span>
                    </button>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Query presets section */}
        {activeAgent.presets.length > 0 && !sendMessageMutation.isPending && (
          <div className="px-6 py-2 bg-slate-50 border-t border-slate-200/80 flex flex-wrap gap-2 shrink-0 items-center">
            <span className="text-[9px] uppercase font-bold text-slate-500">Suggestions:</span>
            {activeAgent.presets.map((preset, pIdx) => (
              <button
                key={pIdx}
                onClick={() => triggerSend(preset)}
                className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-[9px] text-slate-600 hover:text-blue-600 transition-all text-left focus:outline-none shadow-xs"
              >
                {preset}
              </button>
            ))}
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200/80 bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask ${activeAgent.name} something, or choose a preset prompt above...`}
              className="flex-1 px-4 py-3 text-xs glass-input placeholder-slate-400 text-slate-900"
              disabled={sendMessageMutation.isPending || (emergencyAlert && activeAgentType !== 'EMERGENCY')}
            />
            <button
              type="submit"
              disabled={sendMessageMutation.isPending || !inputText.trim() || (emergencyAlert && activeAgentType !== 'EMERGENCY')}
              className="h-10 w-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-xs flex items-center justify-center text-white transition-all disabled:opacity-50 shrink-0 focus:outline-none"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </form>

      </div>

      {/* Developer Debug Panel */}
      {showDebugPanel && (
        <div className="w-80 border-l border-slate-200/80 p-4 bg-slate-50 h-full flex flex-col justify-between shrink-0 overflow-y-auto scrollbar-thin animate-slideIn">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-blue-600 flex items-center space-x-1.5">
                <Terminal className="h-4 w-4" />
                <span>Developer Debug Panel</span>
              </h4>
            </div>

            {/* Verification Checklist */}
            <div className="space-y-2 text-[10px]">
              <h5 className="font-bold text-slate-500 uppercase text-[8px] tracking-wider">System Connection Status</h5>
              <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Gemini Connected:</span>
                  {lastDebugInfo?.geminiConnected ? (
                    <span className="text-emerald-600 font-bold">✓ Connected</span>
                  ) : (
                    <span className="text-rose-600 font-bold">✗ Disconnected</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">API Key Loaded:</span>
                  {lastDebugInfo?.apiKeyLoaded ? (
                    <span className="text-emerald-600 font-bold">✓ Loaded</span>
                  ) : (
                    <span className="text-rose-600 font-bold">✗ Missing</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Model Active:</span>
                  <span className="font-mono text-blue-600">{lastDebugInfo?.model || 'None'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Response Latency:</span>
                  <span className="text-slate-900 font-semibold">{lastDebugInfo?.latencyMs ? `${lastDebugInfo.latencyMs} ms` : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Token Usage Stats */}
            <div className="space-y-2 text-[10px]">
              <h5 className="font-bold text-slate-500 uppercase text-[8px] tracking-wider">Token Usage Info</h5>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-white border border-slate-200 text-center">
                  <span className="text-slate-500 block text-[8px]">Prompt</span>
                  <span className="font-mono font-bold text-slate-900 text-xs block mt-0.5">{lastDebugInfo?.tokenUsage?.promptTokenCount ?? 0}</span>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200 text-center">
                  <span className="text-slate-500 block text-[8px]">Response</span>
                  <span className="font-mono font-bold text-slate-900 text-xs block mt-0.5">{lastDebugInfo?.tokenUsage?.candidatesTokenCount ?? 0}</span>
                </div>
                <div className="p-2 rounded bg-blue-50 border border-blue-200 text-center">
                  <span className="text-blue-600 block text-[8px]">Total</span>
                  <span className="font-mono font-bold text-blue-600 text-xs block mt-0.5">{lastDebugInfo?.tokenUsage?.totalTokenCount ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Prompt Sent */}
            <div className="space-y-1.5 text-[10px]">
              <h5 className="font-bold text-slate-500 uppercase text-[8px] tracking-wider">Last Request Compiled Prompt</h5>
              <div className="p-3 bg-white rounded-lg border border-slate-200 max-h-48 overflow-y-auto scrollbar-thin">
                <pre className="text-[9px] leading-relaxed text-slate-700 font-mono whitespace-pre-wrap select-all">
                  {lastDebugInfo?.promptSent || 'No prompt sent yet.'}
                </pre>
              </div>
            </div>

            {/* Response Received */}
            <div className="space-y-1.5 text-[10px]">
              <h5 className="font-bold text-slate-500 uppercase text-[8px] tracking-wider">Last Response Received</h5>
              <div className="p-3 bg-white rounded-lg border border-slate-200 max-h-36 overflow-y-auto scrollbar-thin">
                <pre className="text-[9px] leading-relaxed text-slate-700 font-mono whitespace-pre-wrap select-all">
                  {lastDebugInfo?.responseReceived || 'No response received yet.'}
                </pre>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 text-[8px] text-center text-slate-500 font-mono">
            HridyaAI Observability Panel v1.0.0
          </div>
        </div>
      )}

    </div>
  );
}
