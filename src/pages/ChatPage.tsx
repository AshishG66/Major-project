import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Plus, Send, Loader2, Heart, ShieldAlert, Sparkles, Upload, FileText, CheckCircle, Navigation, Phone, Flame, MapPin, Activity, Shield, Clipboard, Zap, Terminal } from 'lucide-react';
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
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [lastDebugInfo, setLastDebugInfo] = useState<any>(null);

  // Specialist Agents Registry
  const SPECIALISTS: Record<string, AgentConfig> = {
    ORCHESTRATOR: {
      type: 'ORCHESTRATOR',
      name: 'HridyaAI Orchestrator',
      desc: 'Cognitive dispatch system that routes requests to clinical specialists.',
      colorClass: 'text-health-cyan border-health-cyan',
      bgClass: 'bg-health-cyan/5 border-health-cyan/15',
      icon: Sparkles,
      presets: ['Explain my scan risk factors', 'Diet plan for high blood pressure', 'Cardio workout recommendations']
    },
    DIAGNOSIS: {
      type: 'DIAGNOSIS',
      name: 'Diagnosis Agent',
      desc: 'Evaluates ECG waveforms, cholesterol loads, and Stage 2 Hypertension indicators.',
      colorClass: 'text-health-blue border-health-blue',
      bgClass: 'bg-health-blue/5 border-health-blue/15',
      icon: Activity,
      presets: ['What does Left Ventricular Hypertrophy mean?', 'Analyze my high cholesterol score', 'Evaluate risk for systolic BP 160']
    },
    DIET: {
      type: 'DIET',
      name: 'Diet Agent',
      desc: 'Formulates heart-safe DASH dietary schemes, restricting sodium intake.',
      colorClass: 'text-health-emerald border-health-emerald',
      bgClass: 'bg-health-emerald/5 border-health-emerald/15',
      icon: Shield, // representing shield/prevention
      presets: ['Explain the DASH diet limits', 'Low sodium recipe suggestions', 'Potassium foods to reduce BP']
    },
    EXERCISE: {
      type: 'EXERCISE',
      name: 'Exercise Agent',
      desc: 'Computes target aerobic training heart rate zones for cardiorespiratory fitness.',
      colorClass: 'text-health-cyan border-health-cyan',
      bgClass: 'bg-health-cyan/5 border-health-cyan/15',
      icon: Flame,
      presets: ['What is my target training heart rate zone?', 'Cardio exercises for hypertrophy patients', 'Weekly active minutes guidelines']
    },
    REPORT: {
      type: 'REPORT',
      name: 'Report Agent',
      desc: 'Parses lipid spreadsheets, blood sugar ratios, and CBC reports.',
      colorClass: 'text-health-violet border-health-violet',
      bgClass: 'bg-health-violet/5 border-health-violet/15',
      icon: FileText,
      presets: ['Audit my cholesterol levels', 'Is glucose 135 mg/dL prediabetic?', 'Parse my latest blood scan values']
    },
    MEDICATION: {
      type: 'MEDICATION',
      name: 'Medication Agent',
      desc: 'Details prescription statin alerts, beta-blocker timings, and safety parameters.',
      colorClass: 'text-health-blue border-health-blue',
      bgClass: 'bg-health-blue/5 border-health-blue/15',
      icon: Clipboard,
      presets: ['Best time to take Atorvastatin', 'Amlodipine dosing precautions', 'Statins muscle pain side effects']
    },
    NEARBY_HEALTH: {
      type: 'NEARBY_HEALTH',
      name: 'Nearby Health Agent',
      desc: 'Tracks geolocated cardiologists, gyms, and clinic locations.',
      colorClass: 'text-health-cyan border-health-cyan',
      bgClass: 'bg-health-cyan/5 border-health-cyan/15',
      icon: MapPin,
      presets: ['Find local cardiac care clinics', 'Nearest fitness gym centers', 'Dial cardiologists near me']
    },
    EMERGENCY: {
      type: 'EMERGENCY',
      name: 'Emergency Agent',
      desc: 'Triggers distress guidelines and geolocates critical cardiac care units.',
      colorClass: 'text-health-rose border-health-rose animate-pulse',
      bgClass: 'bg-health-rose/10 border-health-rose/30 shadow-glow-rose',
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

  // Scroll to bottom & sync agent state from last assistant response
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    if (messagesRes?.messages && messagesRes.messages.length > 0) {
      const lastMsg = messagesRes.messages[messagesRes.messages.length - 1];
      if (lastMsg.role === 'ASSISTANT' && lastMsg.agentType) {
        setActiveAgentType(lastMsg.agentType);
        if (lastMsg.agentType === 'EMERGENCY') {
          setEmergencyAlert(true);
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
      // Clear scheduling timers immediately on success response
      timerRefs.current.forEach(clearTimeout);
      timerRefs.current = [];
      
      const newSessionId = data.sessionId || activeSessionId;
      if (newSessionId && newSessionId !== activeSessionId) {
        setActiveSessionId(newSessionId);
      }

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
      
      // Auto post to chat as context
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

    // Flush active timers before starting new logging session
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    setRoutingLog(`HridyaAI Router auditing query context...`);
    
    const t1 = setTimeout(() => {
      setRoutingLog(`Mapping parameters against specialist schemas...`);
    }, 400);
    
    const t2 = setTimeout(() => {
      setRoutingLog(`Orchestrating response...`);
    }, 900);

    timerRefs.current.push(t1, t2);

    sendMessageMutation.mutate({
      message: text,
      sessionId: activeSessionId || '',
    });
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

  const renderMessageContent = (content: string) => {
    let formatted = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^\*\s(.*)$/gm, '<li class="ml-4 list-disc mt-1 font-light text-xxs">$1</li>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    return <div dangerouslySetInnerHTML={{ __html: formatted }} className="text-xs md:text-sm leading-relaxed space-y-1.5 font-light" />;
  };

  const sessions = sessionsRes?.sessions || [];
  const messages = messagesRes?.messages || [];
  const activeAgent = SPECIALISTS[activeAgentType] || SPECIALISTS.ORCHESTRATOR;
  const ActiveAgentIcon = activeAgent.icon;

  return (
    <div className={`glass-panel rounded-2xl border-white/5 flex h-[calc(100vh-140px)] overflow-hidden relative transition-all duration-300 ${
      activeAgentType === 'EMERGENCY' ? 'ring-2 ring-health-rose/40 shadow-glow-rose' : ''
    }`}>
      
      {/* Left sessions Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-white/5 p-4 shrink-0 bg-black/20 h-full">
        <button
          onClick={() => createSessionMutation.mutate()}
          className="w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors mb-4 focus:outline-none"
        >
          <Plus className="h-4 w-4" />
          <span>New Consultation</span>
        </button>

        {sessionsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-health-textMuted animate-spin" />
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
                    ? 'bg-white/10 text-white border-l-2 border-health-cyan'
                    : 'text-health-textMuted hover:text-white hover:bg-white/5'
                }`}
              >
                {sess.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right chat panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-health-card/10 h-full justify-between relative">
        
        {/* Header display */}
        <div className="px-6 py-3.5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 bg-black/15 gap-3">
          <div className="flex items-center space-x-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center border transition-all ${activeAgent.bgClass}`}>
              <ActiveAgentIcon className={`h-5 w-5 ${activeAgent.colorClass}`} />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm tracking-tight">{activeAgent.name}</h3>
              <span className="text-[10px] text-health-textMuted leading-none block mt-0.5">{activeAgent.desc}</span>
            </div>
          </div>
          
          {/* Document upload trigger */}
          <div className="flex items-center space-x-3 self-end sm:self-auto">
            <button
              onClick={() => setShowDebugPanel(!showDebugPanel)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
                showDebugPanel 
                  ? 'bg-health-cyan/20 border-health-cyan text-health-cyan shadow-glow-cyan animate-pulse' 
                  : 'bg-white/5 border-white/10 text-health-textMuted hover:text-white hover:bg-white/10'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Debug Panel</span>
            </button>

            <label className="cursor-pointer px-3.5 py-1.5 rounded-lg bg-health-blue/10 hover:bg-health-blue/20 text-health-blue text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-health-blue/10">
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
        <div className="px-6 py-2.5 bg-black/10 border-b border-white/5 overflow-x-auto flex space-x-2 shrink-0 scrollbar-none">
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
                    ? agent.bgClass + ' border-current scale-[1.03]'
                    : 'bg-white/5 border-white/5 text-health-textMuted hover:text-white hover:bg-white/10'
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
          <div className="mx-6 mt-4 p-4 rounded-xl glass-panel border-health-emerald/20 bg-health-emerald/5 flex flex-col shrink-0 space-y-2">
            <div className="flex items-center space-x-2 text-health-emerald text-xs font-bold border-b border-health-emerald/10 pb-1.5">
              <CheckCircle className="h-4 w-4" />
              <span>Parsed Laboratory values (multimodal Vision OCR)</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
              {Object.entries(parsedReport).map(([k, v]: any) => (
                <div key={k} className="p-2 rounded bg-white/5 border border-white/5">
                  <span className="text-health-textMuted capitalize block">{k.replace('_', ' ')}:</span>
                  <span className="font-semibold text-white/90 mt-0.5 block">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message bubble stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          
          {/* Emergency mode dashboard overlay inside Chat window */}
          {emergencyAlert && (
            <div className="p-5 rounded-2xl glass-panel-glow border-health-rose/40 bg-health-rose/5 space-y-4 text-xs">
              <div className="flex items-center space-x-2 text-health-rose font-bold text-sm">
                <ShieldAlert className="h-5 w-5 animate-bounce" />
                <span>CARDIAC DISASTER / EMERGENCY MODE ACTIVE</span>
              </div>
              <p className="text-health-textMuted leading-relaxed font-light">
                HridyaAI has parsed acute distress indicators. Local emergency services dial links and nearest medical hospitals are mapped:
              </p>

              {/* Nearest hospitals list */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {nearbyHospitals.map((h) => (
                  <div key={h.id} className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
                    <div className="flex items-center space-x-1.5 font-semibold text-white/90 truncate">
                      <MapPin className="h-3.5 w-3.5 text-health-rose" />
                      <span>{h.name}</span>
                    </div>
                    <p className="text-[10px] text-health-textMuted truncate">{h.address}</p>
                    <a href={`tel:${h.phone}`} className="flex items-center space-x-1 text-[9px] text-health-cyan hover:underline mt-1">
                      <Phone className="h-2.5 w-2.5" />
                      <span>{h.phone}</span>
                    </a>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-[10px] pt-2 border-t border-white/5 text-health-textMuted gap-2">
                <a href="tel:112" className="px-4 py-2 rounded-xl bg-health-rose/20 text-health-rose font-bold flex items-center space-x-1 hover:bg-health-rose/30 transition-all">
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call Emergency Line (112)</span>
                </a>
                <span>*Stay calm. Loosen clothing. Avoid active motion.*</span>
              </div>
            </div>
          )}

          {messagesLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-health-cyan animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <Heart className="h-10 w-10 text-health-rose/30 animate-pulse" />
              <div>
                <h4 className="font-display font-semibold text-sm mb-1">Consult with HridyaAI</h4>
                <p className="text-xs text-health-textMuted max-w-sm mx-auto font-light">
                  Ask diagnostic inquiries, analyze clinical reports, or get DASH recipes. Specialist agents auto-route inputs.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg: any) => {
                const isUser = msg.role === 'USER';
                const msgAgent = SPECIALISTS[msg.agentType] || SPECIALISTS.ORCHESTRATOR;
                const AgentIcon = msgAgent.icon;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl shadow-md relative group ${
                        isUser
                          ? 'bg-health-blue text-white rounded-tr-none'
                          : 'glass-panel border-white/5 text-white/95 rounded-tl-none'
                      }`}
                    >
                      {/* Agent category label badge */}
                      {!isUser && msg.agentType && (
                        <div className="flex items-center space-x-1 mb-2 text-[8px] uppercase tracking-wider font-bold text-health-cyan bg-health-cyan/5 px-2 py-0.5 rounded border border-health-cyan/10 self-start w-max">
                          <AgentIcon className="h-2.5 w-2.5" />
                          <span>{msg.agentType} AGENT</span>
                        </div>
                      )}

                      {renderMessageContent(msg.content)}
                    </div>
                  </div>
                );
              })}
              
              {/* Cognitive Orchestration Stages logs */}
              {routingLog && (
                <div className="flex justify-start">
                  <div className="glass-panel border-health-cyan/20 bg-health-cyan/5 p-3 rounded-xl flex items-center space-x-2.5 text-xxs font-mono text-health-cyan">
                    <Zap className="h-3.5 w-3.5 animate-bounce" />
                    <span>{routingLog}</span>
                  </div>
                </div>
              )}

              {sendMessageMutation.isPending && (
                <div className="flex justify-start">
                  <div className="glass-panel border-white/5 p-4 rounded-2xl rounded-tl-none flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 text-health-cyan animate-spin" />
                    <span className="text-xs text-health-textMuted font-light">Routing specialist...</span>
                  </div>
                </div>
              )}

              {sendMessageMutation.isError && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl shadow-md rounded-tl-none border-health-rose/20 bg-health-rose/5 text-white/95 animate-fadeIn">
                    <div className="flex items-center space-x-1 mb-2 text-[8px] uppercase tracking-wider font-bold text-health-rose bg-health-rose/5 px-2 py-0.5 rounded border border-health-rose/10 self-start w-max">
                      <ShieldAlert className="h-2.5 w-2.5 animate-bounce" />
                      <span>SYSTEM FALLBACK</span>
                    </div>
                    <div className="text-xs md:text-sm leading-relaxed font-light text-health-rose">
                      HridyaAI is temporarily unable to contact Gemini. Please try again shortly.
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Query presets section */}
        {activeAgent.presets.length > 0 && !sendMessageMutation.isPending && (
          <div className="px-6 py-2 bg-black/10 border-t border-white/5 flex flex-wrap gap-2 shrink-0 items-center">
            <span className="text-[9px] uppercase font-bold text-health-textMuted">Suggestions:</span>
            {activeAgent.presets.map((preset, pIdx) => (
              <button
                key={pIdx}
                onClick={() => triggerSend(preset)}
                className="px-2.5 py-1 rounded bg-white/5 border border-white/5 hover:border-health-cyan/30 text-[9px] text-health-textMuted hover:text-white transition-all text-left focus:outline-none"
              >
                {preset}
              </button>
            ))}
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-black/15 shrink-0">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask ${activeAgent.name} something, or choose a preset prompt above...`}
              className="flex-1 px-4 py-3 text-xs glass-input placeholder-white/20"
              disabled={sendMessageMutation.isPending || (emergencyAlert && activeAgentType !== 'EMERGENCY')}
            />
            <button
              type="submit"
              disabled={sendMessageMutation.isPending || !inputText.trim() || (emergencyAlert && activeAgentType !== 'EMERGENCY')}
              className="h-10 w-10 rounded-xl bg-gradient-to-r from-health-blue to-health-cyan hover:shadow-glow flex items-center justify-center text-white transition-all disabled:opacity-50 shrink-0 focus:outline-none"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </div>
        </form>

      </div>

      {/* Developer Debug Panel */}
      {showDebugPanel && (
        <div className="w-80 border-l border-white/5 p-4 bg-black/40 h-full flex flex-col justify-between shrink-0 overflow-y-auto scrollbar-thin animate-slideIn">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h4 className="font-display font-bold text-xs uppercase tracking-wider text-health-cyan flex items-center space-x-1.5">
                <Terminal className="h-4 w-4" />
                <span>Developer Debug Panel</span>
              </h4>
            </div>

            {/* Verification Checklist */}
            <div className="space-y-2 text-[10px]">
              <h5 className="font-bold text-health-textMuted uppercase text-[8px] tracking-wider">System Connection Status</h5>
              <div className="space-y-1.5 bg-white/5 p-3 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-white/80 font-medium">Gemini Connected:</span>
                  {lastDebugInfo?.geminiConnected ? (
                    <span className="text-health-emerald font-bold">✓ Connected</span>
                  ) : (
                    <span className="text-health-rose font-bold">✗ Disconnected</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80 font-medium">API Key Loaded:</span>
                  {lastDebugInfo?.apiKeyLoaded ? (
                    <span className="text-health-emerald font-bold">✓ Loaded</span>
                  ) : (
                    <span className="text-health-rose font-bold">✗ Missing</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80 font-medium">Model Active:</span>
                  <span className="font-mono text-health-cyan">{lastDebugInfo?.model || 'None'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80 font-medium">Response Latency:</span>
                  <span className="text-white font-semibold">{lastDebugInfo?.latencyMs ? `${lastDebugInfo.latencyMs} ms` : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Token Usage Stats */}
            <div className="space-y-2 text-[10px]">
              <h5 className="font-bold text-health-textMuted uppercase text-[8px] tracking-wider">Token Usage Info</h5>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-white/5 border border-white/5 text-center">
                  <span className="text-health-textMuted block text-[8px]">Prompt</span>
                  <span className="font-mono font-bold text-white text-xs block mt-0.5">{lastDebugInfo?.tokenUsage?.promptTokenCount ?? 0}</span>
                </div>
                <div className="p-2 rounded bg-white/5 border border-white/5 text-center">
                  <span className="text-health-textMuted block text-[8px]">Response</span>
                  <span className="font-mono font-bold text-white text-xs block mt-0.5">{lastDebugInfo?.tokenUsage?.candidatesTokenCount ?? 0}</span>
                </div>
                <div className="p-2 rounded bg-white/5 border border-white/5 text-center bg-health-cyan/5 border-health-cyan/15">
                  <span className="text-health-cyan block text-[8px]">Total</span>
                  <span className="font-mono font-bold text-health-cyan text-xs block mt-0.5">{lastDebugInfo?.tokenUsage?.totalTokenCount ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Prompt Sent */}
            <div className="space-y-1.5 text-[10px]">
              <h5 className="font-bold text-health-textMuted uppercase text-[8px] tracking-wider">Last Request Compiled Prompt</h5>
              <div className="p-3 bg-black/60 rounded-lg border border-white/5 max-h-48 overflow-y-auto scrollbar-thin">
                <pre className="text-[9px] leading-relaxed text-white/70 font-mono whitespace-pre-wrap select-all">
                  {lastDebugInfo?.promptSent || 'No prompt sent yet.'}
                </pre>
              </div>
            </div>

            {/* Response Received */}
            <div className="space-y-1.5 text-[10px]">
              <h5 className="font-bold text-health-textMuted uppercase text-[8px] tracking-wider">Last Response Received</h5>
              <div className="p-3 bg-black/60 rounded-lg border border-white/5 max-h-36 overflow-y-auto scrollbar-thin">
                <pre className="text-[9px] leading-relaxed text-white/70 font-mono whitespace-pre-wrap select-all">
                  {lastDebugInfo?.responseReceived || 'No response received yet.'}
                </pre>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 text-[8px] text-center text-health-textMuted font-mono">
            HridyaAI Observability Panel v1.0.0
          </div>
        </div>
      )}

    </div>
  );
}
