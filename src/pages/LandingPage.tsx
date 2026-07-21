import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Brain, MapPin, MessageSquare, Shield, Activity, ChevronDown, CheckCircle, ArrowRight, Layers, Award, Sparkles, UserCheck, Phone, Zap, HelpCircle, Loader2 } from 'lucide-react';

const ThreeHeart = lazy(() => import('../components/ThreeHeart'));
const AIArchitecture = lazy(() => import('../components/AIArchitecture'));


export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [heartRate, setHeartRate] = useState(72);
  const [demoBmi, setDemoBmi] = useState(24.5);
  const [demoBp, setDemoBp] = useState(120);

  // AI Workflow Simulation states
  const [workflowQuery, setWorkflowQuery] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [workflowResponse, setWorkflowResponse] = useState<string>('');

  // Mouse hover ECG speed state
  const [ecgSpeedMultiplier, setEcgSpeedMultiplier] = useState(1.0);

  // Global mouse coordinates for interactive background lights
  const [bgCoords, setBgCoords] = useState({ x: 50, y: 50 });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute ECG beat rate multiplier
  const animationDuration = (60 / heartRate).toFixed(2);

  // Track global cursor for background color updates
  const handleBgMouseMove = (e: React.MouseEvent) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setBgCoords({
      x: Math.round((e.clientX / w) * 100),
      y: Math.round((e.clientY / h) * 100)
    });
  };

  // Canvas particle effects
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number; color: string }> = [];

    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || 700;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const colors = ['rgba(59, 130, 246, 0.35)', 'rgba(6, 182, 212, 0.35)', 'rgba(244, 63, 94, 0.28)'];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.5 + 1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120;
          p.x += (dx / dist) * force * 2.5;
          p.y += (dy / dist) * force * 2.5;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.06 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Demo queries for AI Workflow Simulation
  const workflowQueries = [
    {
      q: "My chest feels tight and painful",
      agent: "Emergency Agent",
      color: "border-health-rose text-health-rose bg-health-rose/5",
      steps: ["Gateway Audit", "Distress Trigger", "Emergency Routing", "ICU Geolocator Active"],
      response: "🚨 EMERGENCY WARNING: Typical angina indicators detected. Emergency protocols engaged. Loosening advice triggered. 112 dialing links compiled. Nearest cardiac hospitals listed."
    },
    {
      q: "Suggest a diet to lower hypertension",
      agent: "Diet Agent",
      color: "border-health-emerald text-health-emerald bg-health-emerald/5",
      steps: ["Gateway Audit", "Metabolic Check", "Diet Routine Routing", "DASH Recipe Generator"],
      response: "🥗 DASH DIET ADVISORY: Target sodium limits under 1,500mg daily. Load potassium-rich leafy greens, bananas, and high-magnesium whole grains. Restrict table salts."
    },
    {
      q: "What is my aerobic workout HR target?",
      agent: "Exercise Agent",
      color: "border-health-cyan text-health-cyan bg-health-cyan/5",
      steps: ["Gateway Audit", "Aerobic Check", "Exercise Routine Routing", "Target HR Zones Calc"],
      response: "🏃 EXERCISE PROTOCOL: Based on age 28, aerobic target heart rate is 110-135 bpm. Engage in 150 mins weekly cardiovascular activity (brisk walks, swimming). Avoid excessive heavy lifting."
    }
  ];

  const handleTriggerWorkflow = (item: typeof workflowQueries[0]) => {
    setWorkflowQuery(item.q);
    setWorkflowResponse('');
    setActiveStep(0);

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setActiveStep(current);
      if (current === 3) {
        clearInterval(interval);
        setWorkflowResponse(item.response);
      }
    }, 850);
  };

  const faqs = [
    {
      q: "How does the multi-agent AI system handle health queries?",
      a: "HridyaAI distributes incoming patient queries to specific expert sub-routines: a Diagnosis Agent for risk metrics, a Diet Agent for DASH recipes, an Exercise Agent for active heart rate guidance, and a Report Agent that scans medical blood files."
    },
    {
      q: "Can I monitor my family members' cardiac logs?",
      a: "Yes. HridyaDarpan includes a Family Dashboard that allows a primary account holder to register and monitor linked profiles for a spouse, children, or parents, tracking their diagnostic logs in one dashboard."
    },
    {
      q: "Is there support for clinic search using actual maps?",
      a: "Yes. We integrate Leaflet Maps with the OpenStreetMap Overpass API. This allows live geolocated queries of real hospitals, cardiologists, and fitness facilities directly inside your active coordinate boundaries."
    },
    {
      q: "What variables does the automated prediction compare?",
      a: "Our FastAPI pipeline automatically trains and compares XGBoost, Random Forest, and Gradient Boosting Classifiers. It evaluates their multiclass ROC-AUC scores on test splits, selects the champion, and performs SHAP computations on that model."
    }
  ];

  return (
    <div 
      onMouseMove={handleBgMouseMove}
      className="min-h-screen bg-health-darker text-white relative overflow-hidden flex flex-col scroll-smooth transition-colors duration-500"
    >
      {/* Dynamic interactive background lights (aurora coordinates react to mouse cursor!) */}
      <div 
        className="absolute w-[50%] h-[50%] bg-health-blue/10 rounded-full blur-[140px] pointer-events-none transition-all duration-700 ease-out" 
        style={{ left: `${bgCoords.x - 25}%`, top: `${bgCoords.y - 25}%` }}
      />
      <div className="absolute top-[35%] right-[-10%] w-[50%] h-[50%] bg-health-violet/8 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[5%] left-[10%] w-[50%] h-[50%] bg-health-cyan/6 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating SVG grids background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Header Bar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2.5">
          <Heart className="h-6 w-6 text-health-rose animate-pulse" />
          <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-health-blue via-health-cyan to-health-emerald bg-clip-text text-transparent">
            HridyaDarpan
          </span>
        </Link>
        <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-health-textMuted">
          <a href="#interactive" className="hover:text-white transition-colors">ECG Simulator</a>
          <a href="#workflow" className="hover:text-white transition-colors">AI Routing</a>
          <a href="#preview" className="hover:text-white transition-colors">Preview</a>
          <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Reviews</a>
        </nav>
        <div className="flex items-center space-x-4">
          <Link to="/login" className="text-sm font-medium hover:text-white text-health-textMuted transition-colors">
            Login
          </Link>
          <Link to="/register" className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-health-blue to-health-cyan text-white hover:shadow-glow transition-all hover:scale-[1.02]">
            Enter Portal
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-24 pb-16 text-center max-w-5xl mx-auto z-10">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[-1]" />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-health-cyan/30 bg-health-cyan/5 text-health-cyan text-[10px] font-bold mb-8 uppercase tracking-widest"
        >
          <Sparkles className="h-3.5 w-3.5 text-health-cyan animate-spin" />
          <span>Next-Gen Multi-Agent Cardiovascular Intelligence</span>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight leading-tight mb-6"
        >
          Enterprise AI Platform for <br />
          <span className="bg-gradient-to-r from-health-blue via-health-cyan to-health-emerald bg-clip-text text-transparent">
            Cardiovascular Diagnostics & Care
          </span>
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg text-health-textMuted max-w-3xl mb-10 leading-relaxed font-light"
        >
          Evaluate patient vitals with ROC-AUC optimized XGBoost pipelines. Inspect game-theoretic SHAP attributions, coordinate specialized diet/exercise agents, parse clinical reports, and audit notes.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 w-full"
        >
          <Link to="/register" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-health-blue to-health-cyan hover:shadow-glow text-white font-semibold transition-all hover:scale-[1.02] flex items-center justify-center space-x-2">
            <span>Access Platform Free</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <a href="#workflow" className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/5 hover:border-white/10 bg-white/5 font-semibold transition-colors flex items-center justify-center">
            Try AI Routing Simulator
          </a>
        </motion.div>
      </section>

      {/* Interactive ECG Heart Rhythm Section */}
      <section id="interactive" className="py-20 border-t border-white/5 relative bg-black/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-health-rose/30 bg-health-rose/5 text-health-rose text-[9px] font-bold uppercase tracking-widest">
              <Activity className="h-3 w-3" />
              <span>Realtime Waveform Monitor</span>
            </div>
            <h2 className="text-3xl font-display font-extrabold tracking-tight">Interactive Heart Rhythm Simulator</h2>
            <p className="text-sm text-health-textMuted leading-relaxed font-light">
              HridyaDarpan's interface beats dynamically. Adjust the heart rate slider to accelerate myocardial contraction cycles and monitor the real-time changes in blood pressure variables. Hover over the ECG to see the trace react!
            </p>
            
            {/* Slider */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-5">
              <div className="flex justify-between text-xs font-semibold">
                <span>Simulated Heart Rate:</span>
                <span className="text-health-rose font-bold text-sm">{heartRate} bpm</span>
              </div>
              <input
                type="range"
                min="40"
                max="160"
                value={heartRate}
                onChange={(e) => setHeartRate(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-health-rose"
              />
              <div className="flex justify-between text-[10px] text-health-textMuted font-medium">
                <span>Bradycardia (40 bpm)</span>
                <span>Normal Pulse (60-100)</span>
                <span>Tachycardia (160 bpm)</span>
              </div>
            </div>
          </div>

          {/* Beating Heart Monitor Panel */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-sm glass-panel rounded-2xl border-white/5 shadow-glow p-6 flex flex-col items-center">
              <span className="absolute top-3 left-3 text-[9px] uppercase font-bold text-health-textMuted tracking-wider">Myocardial Oscillation</span>
              
              {/* Dynamic 3D Beating Heart in center */}
              <div className="h-44 w-full flex items-center justify-center relative overflow-hidden rounded-xl">
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="h-8 w-8 text-health-cyan animate-spin" /></div>}>
                  <ThreeHeart heartRate={heartRate} glowIntensity={heartRate > 100 ? 1.8 : 1.0} />
                </Suspense>
              </div>


              {/* Scrolling ECG Waveform line with mouseover reaction! */}
              <div 
                onMouseEnter={() => setEcgSpeedMultiplier(0.4)} // accelerates the loop scroll speed
                onMouseLeave={() => setEcgSpeedMultiplier(1.0)}
                className="w-full h-16 bg-[#030712]/80 border border-white/5 rounded-lg overflow-hidden relative mt-2 cursor-pointer"
                title="Hover over ECG to accelerate pulse speed"
              >
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 60" preserveAspectRatio="none">
                  <path d="M0 10 H300 M0 20 H300 M0 30 H300 M0 40 H300 M0 50 H300 M50 0 V60 M100 0 V60 M150 0 V60 M200 0 V60 M250 0 V60" stroke="rgba(244, 63, 94, 0.05)" strokeWidth="0.5" />
                  
                  <path
                    d="M0 30 L60 30 L68 25 L73 30 L78 30 L85 10 L92 50 L98 30 L108 30 L115 35 L120 30 L180 30 L188 25 L193 30 L198 30 L205 10 L212 50 L218 30 L228 30 L235 35 L240 30 L300 30"
                    fill="none"
                    stroke="#F43F5E"
                    strokeWidth="1.5"
                    strokeDasharray="200"
                    style={{
                      strokeDashoffset: 0,
                      animation: `ecgScroll ${Number(animationDuration) * 1.5 * ecgSpeedMultiplier}s linear infinite`
                    }}
                    className="drop-shadow-[0_0_4px_rgba(244,63,94,0.5)]"
                  />
                </svg>
              </div>

              <div className="flex justify-between w-full mt-4 text-[9px] text-health-textMuted uppercase font-bold tracking-wider">
                <span>Rhythm Duration: {animationDuration}s</span>
                <span>Active output</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Specialist Routing Simulator */}
      <section id="workflow" className="py-20 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-health-cyan/30 bg-health-cyan/5 text-health-cyan text-[9px] font-bold uppercase tracking-widest">
              <Zap className="h-3 w-3" />
              <span>Multi-Agent Dispatch Broker</span>
            </div>
            <h2 className="text-3xl font-display font-extrabold tracking-tight">HridyaAI Specialist Workflow Routing</h2>
            <p className="text-sm text-health-textMuted max-w-2xl mx-auto font-light leading-relaxed">
              HridyaAI orchestrates specialist health agents to solve patient requests. Click a query below to simulate Gateway routing, active agent selection, and responsive generation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Selection Column */}
            <div className="lg:col-span-4 space-y-4">
              <h4 className="font-display font-bold text-xs uppercase text-health-textMuted tracking-wider mb-2">Simulate Patient Query</h4>
              {workflowQueries.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTriggerWorkflow(item)}
                  className={`w-full text-left p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all flex flex-col text-xs space-y-1.5 ${
                    workflowQuery === item.q ? 'ring-2 ring-health-cyan bg-health-cyan/5 border-transparent' : ''
                  }`}
                >
                  <span className="font-semibold text-white/95 italic">"{item.q}"</span>
                  <span className="text-[9px] text-health-textMuted uppercase font-bold">Target: {item.agent}</span>
                </button>
              ))}
            </div>

            {/* Pipeline Routing Column */}
            <div className="lg:col-span-8 glass-panel p-6 rounded-2xl border-white/5 min-h-[320px] flex flex-col justify-between">
              {!workflowQuery ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-3">
                  <Brain className="h-10 w-10 text-health-cyan/35 animate-pulse" />
                  <p className="text-xs text-health-textMuted font-light">Select a patient query card on the left to start the cognitive orchestration simulation.</p>
                </div>
              ) : (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  {/* Steps Progress */}
                  <div className="grid grid-cols-4 gap-2">
                    {workflowQueries.find((wq) => wq.q === workflowQuery)?.steps.map((stepName, stepIdx) => (
                      <div key={stepIdx} className="space-y-1.5 text-center">
                        <div className={`h-1 rounded-full transition-all duration-500 ${
                          activeStep >= stepIdx ? 'bg-health-cyan shadow-glow' : 'bg-white/5'
                        }`} />
                        <span className={`text-[8px] uppercase tracking-wider font-bold block transition-colors ${
                          activeStep >= stepIdx ? 'text-white' : 'text-health-textMuted'
                        }`}>{stepName}</span>
                      </div>
                    ))}
                  </div>

                  {/* Active Agent Box */}
                  <div className="p-4 rounded-xl bg-[#030712]/50 border border-white/5 flex items-center justify-between min-h-[64px]">
                    <div className="flex items-center space-x-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-white ${
                        activeStep >= 2 ? 'bg-health-cyan shadow-glow animate-pulse' : 'bg-white/5 text-health-textMuted'
                      }`}>
                        <Brain className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[9px] text-health-textMuted uppercase font-bold block">Active Node State</span>
                        <span className="text-xs font-bold">
                          {activeStep === 0 ? "Parsing Request in API Gateway..." :
                           activeStep === 1 ? "Checking Health Profile Context..." :
                           activeStep === 2 ? `Activating Specialist: ${workflowQueries.find((wq) => wq.q === workflowQuery)?.agent}` :
                           "Response Compiled"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Response bubble */}
                  <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-xs min-h-[90px] flex items-center">
                    {activeStep < 3 ? (
                      <div className="flex items-center space-x-2 text-health-textMuted">
                        <span className="h-1.5 w-1.5 bg-health-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 bg-health-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 bg-health-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-[10px] uppercase font-bold pl-1 tracking-wider">Generating recommendations...</span>
                      </div>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5 leading-relaxed font-light">
                        <span className="text-[9px] uppercase font-bold bg-health-cyan/10 text-health-cyan border border-health-cyan/20 px-2 py-0.5 rounded">HridyaAI Response</span>
                        <p className="mt-1">{workflowResponse}</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section (Parallax fade-in) */}
      <section id="preview" className="py-20 bg-health-dark border-t border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">Enterprise Clinical Control Panel</h2>
            <p className="text-xs text-health-textMuted max-w-2xl mx-auto font-light leading-relaxed">
              Experience the command center interface. Visualized vitals, SHAP features, and multi-agent coordination metrics mapped beautifully.
            </p>
          </div>

          {/* Interactive Mock Dashboard Panel */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-5xl mx-auto glass-panel-glow border-white/5 p-6 rounded-2xl relative shadow-glow flex flex-col space-y-6"
          >
            {/* Header bar mock */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 bg-red-500 rounded-full" />
                <span className="h-3 w-3 bg-yellow-500 rounded-full" />
                <span className="h-3 w-3 bg-green-500 rounded-full" />
                <span className="text-[10px] text-health-textMuted font-bold uppercase pl-2">Preview Mode: Dashboard</span>
              </div>
              <div className="text-[9px] uppercase font-bold tracking-wider text-health-cyan bg-health-cyan/5 border border-health-cyan/15 px-2.5 py-1 rounded">Vitals Safe</div>
            </div>

            {/* Content Mock grids */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Vitals radial index mock */}
              <div className="glass-panel p-5 rounded-xl flex flex-col items-center justify-center text-center">
                <span className="text-[8px] uppercase font-bold text-health-textMuted block mb-2 tracking-wider">Health Stability index</span>
                <div className="relative h-28 w-28 flex items-center justify-center my-1">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="transparent" />
                    <circle cx="50" cy="50" r="40" stroke="#06B6D4" strokeWidth="6" fill="transparent" strokeDasharray="251" strokeDashoffset="50" strokeLinecap="round" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-bold font-display">82</span>
                    <span className="text-[8px] text-health-textMuted uppercase font-semibold">Stability</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-white/90 mt-2">Optimal Vitals Range</span>
              </div>

              {/* Weekly summary mock */}
              <div className="glass-panel p-5 rounded-xl col-span-2 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[8px] uppercase font-bold text-health-textMuted tracking-wider">Weekly AI Diagnostic Summary</span>
                  <span className="text-[8px] text-health-emerald font-bold">Stable status</span>
                </div>
                <p className="text-[11px] font-light text-health-textMuted leading-relaxed">
                  "Patient cardiovascular metrics are balanced. Sleep registers at 7.2 hours (+12% improvement), steps aggregate at 8,200 daily. Suggested target: maintain active low-sodium DASH consumption and control daily stress levels."
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2 rounded bg-white/5 border border-white/5 text-center text-[10px]">
                    <span className="text-health-rose font-bold block">120/80</span>
                    <span className="text-[8px] text-health-textMuted block">BP mmHg</span>
                  </div>
                  <div className="p-2 rounded bg-white/5 border border-white/5 text-center text-[10px]">
                    <span className="text-health-blue font-bold block">72 bpm</span>
                    <span className="text-[8px] text-health-textMuted block">Pulse</span>
                  </div>
                  <div className="p-2 rounded bg-white/5 border border-white/5 text-center text-[10px]">
                    <span className="text-health-cyan font-bold block">8.2k</span>
                    <span className="text-[8px] text-health-textMuted block">Steps Avg</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Decoupled Cloud Architecture Diagram with glowing 3D cards tilt! */}
      <section id="architecture" className="py-24 relative overflow-hidden bg-black/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold mb-4">Enterprise Decoupled Cloud Architecture</h2>
            <p className="text-xs text-health-textMuted max-w-2xl mx-auto font-light leading-relaxed">
              Decoupled cloud architecture engineered from scratch to maintain clean segregation of concerns across API modules. Hover cards to tilt them in 3D.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative" style={{ perspective: 1000 }}>
            {/* Vector Connector Lines Mock */}
            <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 border-t-2 border-dashed border-white/5 pointer-events-none hidden md:block z-0" />

            {/* Card 1 */}
            <motion.div 
              whileHover={{ rotateY: 10, rotateX: -5, scale: 1.02 }}
              style={{ transformStyle: 'preserve-3d' }}
              className="glass-panel p-6 rounded-2xl border-white/5 hover:border-health-blue/40 transition-all z-10 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-health-blue/10 flex items-center justify-center mb-5 text-health-blue shadow-glow-blue">
                  <Layers className="h-5 w-5" />
                </div>
                <h4 className="font-display font-bold text-sm mb-2 text-white">React 19 Vite Web App</h4>
                <p className="text-[11px] text-health-textMuted leading-relaxed font-light">
                  Premium glassmorphic client frontend. Deploys to Vercel, implementing strict route splitting, custom CSS spotlight overlays, and Zustand stores.
                </p>
              </div>
              <span className="text-[9px] uppercase font-bold text-health-blue mt-4 block">UI Presentation Layer</span>
            </motion.div>

            {/* Card 2 */}
            <motion.div 
              whileHover={{ rotateY: 10, rotateX: -5, scale: 1.02 }}
              style={{ transformStyle: 'preserve-3d' }}
              className="glass-panel p-6 rounded-2xl border-white/5 hover:border-health-cyan/40 transition-all z-10 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-health-cyan/10 flex items-center justify-center mb-5 text-health-cyan shadow-glow">
                  <Activity className="h-5 w-5" />
                </div>
                <h4 className="font-display font-bold text-sm mb-2 text-white">Express Gateway REST API</h4>
                <p className="text-[11px] text-health-textMuted leading-relaxed font-light">
                  Secured REST API gateway. Runs JWT credential audits, rate-limiting rules, Overpass OSM nearby queries, and multimodal document parsing.
                </p>
              </div>
              <span className="text-[9px] uppercase font-bold text-health-cyan mt-4 block">Secure Router Node</span>
            </motion.div>

            {/* Card 3 */}
            <motion.div 
              whileHover={{ rotateY: 10, rotateX: -5, scale: 1.02 }}
              style={{ transformStyle: 'preserve-3d' }}
              className="glass-panel p-6 rounded-2xl border-white/5 hover:border-health-emerald/40 transition-all z-10 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-health-emerald/10 flex items-center justify-center mb-5 text-health-emerald shadow-glow-emerald">
                  <Brain className="h-5 w-5" />
                </div>
                <h4 className="font-display font-bold text-sm mb-2 text-white">FastAPI AI Predictor</h4>
                <p className="text-[11px] text-health-textMuted leading-relaxed font-light">
                  Microservice comparing XGBoost/RF ROC-AUC folds. Choose champions and export SHAP attributions dynamically via uvicorn nodes.
                </p>
              </div>
              <span className="text-[9px] uppercase font-bold text-health-emerald mt-4 block">Machine Learning Core</span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* AI Orchestrator Pipeline Section */}
      <section id="ai-pipeline" className="py-20 bg-black/20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold mb-4">HridyaAI Orchestrator Pipeline</h2>
            <p className="text-xs text-health-textMuted max-w-2xl mx-auto font-light leading-relaxed">
              Decoupled step-by-step pipeline orchestrating patient telemetry, machine learning predictions, explainable SHAP weights, medical journal search, and interactive digital twin rendering.
            </p>
          </div>
          <div className="max-w-5xl mx-auto">
            <Suspense fallback={
              <div className="h-48 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 text-health-cyan animate-spin" />
                <p className="text-[10px] text-health-textMuted uppercase font-bold tracking-widest">Loading AI Pipeline Visualizer...</p>
              </div>
            }>
              <AIArchitecture />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Patient Testimonials */}
      <section id="testimonials" className="py-20 bg-health-dark border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-display font-extrabold tracking-tight">Trusted by Medical Educators & Developers</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="glass-panel p-6 rounded-xl relative">
              <p className="text-xs text-health-textMuted font-light italic leading-relaxed mb-6">
                "HridyaDarpan represents a major project execution. The integration of SHAP game-theoretic diagrams and the Overpass OpenStreetMap nearby hospital finder completely eliminates boilerplate templates. Highly polished."
              </p>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-health-blue/20 flex items-center justify-center text-health-blue font-bold text-xs">P</div>
                <div>
                  <h5 className="font-semibold text-xs text-white/95">Prof. Arthur Pendelton</h5>
                  <span className="text-[9px] text-health-textMuted">Dept of Cardiology & Software Engineering</span>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-xl relative">
              <p className="text-xs text-health-textMuted font-light italic leading-relaxed mb-6">
                "Consultations with HridyaAI feel responsive and support memory. The model remembers past reports and adjusts diet plans dynamically based on blood sugar levels. A stunning SaaS major project."
              </p>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-health-cyan/20 flex items-center justify-center text-health-cyan font-bold text-xs">M</div>
                <div>
                  <h5 className="font-semibold text-xs text-white/95">Dr. Melissa Vance, MD</h5>
                  <span className="text-[9px] text-health-textMuted">Clinical AI Integrator</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordions */}
      <section id="faq" className="py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-display font-extrabold tracking-tight">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="glass-panel rounded-xl overflow-hidden border-white/5">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="text-xs font-semibold">{faq.q}</span>
                  <ChevronDown className={`h-4.5 w-4.5 text-health-textMuted transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {activeFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-[11px] text-health-textMuted leading-relaxed font-light border-t border-white/5">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-panel border-t border-white/5 py-12 px-6 mt-auto text-center text-health-textMuted text-xs z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <Heart className="h-4 w-4 text-health-rose" />
            <span className="font-display font-bold text-white tracking-wide">HridyaDarpan</span>
          </div>
          <p>© 2026 HridyaDarpan Enterprise SaaS. All rights reserved.</p>
          <div className="flex space-x-6">
            <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
