import { useState, useEffect, useRef } from "react";
import { Sparkles, ArrowRight, Check, X, Trophy, Gift, RotateCcw, ShieldQuestion, ChevronRight, Star, Loader2, Timer, Phone, GraduationCap } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   PROVE YOUR WORTH — TTS Nigeria · Skill Worth campaign prototype
   One-time account (email + password + phone OTP) → leveled, TIMED assessment.
   Level clear → confetti.  L3+ → auto-entered to weekly raffle (raffu).
   L1/L2 → call to action to join the TTS Community (training + placement).
   ───────────────────────────────────────────────────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap');
.pyw *{box-sizing:border-box;margin:0;padding:0;}
.pyw{
  --deep:#004931;--green:#00B75B;--lemon:#8FC14E;--yellow:#FDC00D;
  --cream:#FFF5CC;--red:#E9473A;--green50:#EDF8EC;--ink:#0E0F0F;--muted:#4A5C53;
  font-family:'Inter',system-ui,sans-serif;color:var(--ink);
  background:#FBFBF8;min-height:100%;width:100%;display:flex;justify-content:center;-webkit-font-smoothing:antialiased;
}
.pyw .wrap{width:100%;max-width:460px;min-height:100%;background:#fff;box-shadow:0 0 0 1px rgba(0,73,49,.06);position:relative;overflow:hidden;}
.pyw .pad{padding:26px 22px 30px;}
.pyw .disp{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;line-height:1.02;color:var(--deep);letter-spacing:-.01em;}
.pyw .eyebrow{font-family:'Inter';font-weight:600;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--green);}
.pyw .eyebrow.lemon{color:var(--lemon);}
.pyw .muted{color:var(--muted);}
.pyw .btn{font-family:'Inter';font-weight:600;font-size:15px;border:none;border-radius:14px;padding:15px 18px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;transition:transform .12s ease,filter .15s ease;}
.pyw .btn:active{transform:translateY(1px) scale(.995);}
.pyw .btn-primary{background:var(--green);color:#fff;}
.pyw .btn-primary:hover{filter:brightness(1.05);}
.pyw .btn-dark{background:var(--deep);color:var(--lemon);}
.pyw .btn-ghost{background:#fff;color:var(--deep);border:1.5px solid var(--green);}
.pyw .btn-lemon{background:var(--lemon);color:var(--deep);}
.pyw .btn:disabled{opacity:.45;cursor:not-allowed;}
.pyw .link{background:none;border:none;color:var(--green);font-family:'Inter';font-weight:600;font-size:13px;cursor:pointer;text-decoration:underline;}
.pyw .field{width:100%;font-family:'Inter';font-size:15px;padding:13px 14px;border:1.5px solid #DCE6E0;border-radius:12px;background:#fff;color:var(--ink);outline:none;transition:border-color .15s;}
.pyw .field:focus{border-color:var(--green);}
.pyw .otp{letter-spacing:.5em;text-align:center;font-size:22px;font-weight:700;font-family:'Bricolage Grotesque';}
.pyw .label{font-size:12px;font-weight:600;color:var(--deep);margin-bottom:6px;display:block;}
.pyw .card{border-radius:16px;padding:18px;}
.pyw .card-wash{background:var(--green50);border:1.5px solid var(--green);}
.pyw .card-cream{background:var(--cream);border:1.5px solid var(--yellow);}
.pyw .card-deep{background:var(--deep);color:#fff;}
.pyw .opt{width:100%;text-align:left;font-family:'Inter';font-size:14.5px;line-height:1.35;padding:14px 15px;border:1.5px solid #DCE6E0;border-radius:13px;background:#fff;color:var(--ink);cursor:pointer;display:flex;align-items:center;gap:11px;transition:all .13s ease;}
.pyw .opt:hover{border-color:var(--green);background:#FAFDF9;}
.pyw .opt.sel{border-color:var(--green);background:var(--green50);}
.pyw .opt.correct{border-color:var(--green);background:var(--green50);}
.pyw .opt.wrong{border-color:var(--red);background:#FCE5E2;}
.pyw .dot{width:22px;height:22px;border-radius:50%;border:2px solid #C9D6CE;flex:0 0 22px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--muted);}
.pyw .opt.sel .dot{border-color:var(--green);background:var(--green);color:#fff;}
.pyw .opt.correct .dot{border-color:var(--green);background:var(--green);color:#fff;}
.pyw .opt.wrong .dot{border-color:var(--red);background:var(--red);color:#fff;}
.pyw .lvlbar{display:flex;gap:6px;margin:14px 0 4px;}
.pyw .lvlseg{flex:1;height:6px;border-radius:4px;background:#E4ECE7;transition:background .3s;}
.pyw .lvlseg.on{background:var(--green);}
.pyw .lvlseg.cur{background:var(--lemon);}
.pyw .timer{display:flex;align-items:center;gap:7px;margin-top:10px;}
.pyw .timer .track{flex:1;height:7px;border-radius:5px;background:#E4ECE7;overflow:hidden;}
.pyw .timer .fill{height:100%;background:var(--green);border-radius:5px;transition:width 1s linear;}
.pyw .timer.low .fill{background:var(--red);}
.pyw .timer .num{font-variant-numeric:tabular-nums;font-weight:700;font-size:13px;color:var(--deep);min-width:38px;text-align:right;}
.pyw .timer.low .num{color:var(--red);}
.pyw .tag{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;letter-spacing:.04em;}
.pyw .tag-green{background:var(--green50);color:var(--deep);}
.pyw .tag-lemon{background:var(--lemon);color:var(--deep);}
.pyw .row{display:flex;align-items:center;gap:10px;}
.pyw .tabs{display:flex;gap:6px;background:#F0F4F1;border-radius:13px;padding:5px;margin-bottom:18px;}
.pyw .tab{flex:1;font-family:'Inter';font-size:12.5px;font-weight:600;border:none;background:none;padding:9px 6px;border-radius:9px;cursor:pointer;color:var(--muted);}
.pyw .tab.on{background:#fff;color:var(--deep);box-shadow:0 1px 4px rgba(0,73,49,.1);}
.pyw .lbrow{display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid #EEF3F0;}
.pyw .rank{width:26px;height:26px;border-radius:8px;background:var(--green50);color:var(--deep);font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex:0 0 26px;}
.pyw .rank.me{background:var(--green);color:#fff;}
.pyw .conf{position:absolute;top:-14px;width:9px;height:15px;border-radius:2px;opacity:.95;z-index:50;animation:fall linear forwards;}
@keyframes fall{to{transform:translateY(680px) rotate(680deg);opacity:0;}}
@keyframes pop{0%{transform:scale(.7);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
.pyw .pop{animation:pop .45s cubic-bezier(.2,.9,.3,1.2) both;}
@keyframes spin{to{transform:rotate(360deg)}}
.pyw .spin{animation:spin 1s linear infinite;}
@keyframes flash{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
.pyw .flash{animation:flash .4s ease both;}
@media (prefers-reduced-motion: reduce){.pyw .conf,.pyw .pop,.pyw .spin,.pyw .flash{animation:none!important;}}
.pyw .foot{text-align:center;font-family:'Bricolage Grotesque';font-weight:700;font-style:italic;font-size:12px;color:var(--green);padding:18px 0 4px;}
`;

const CATEGORIES = ["Software development","Data & analytics","Customer support / CX","Technical writing","Digital marketing","Design / UX","Finance & accounting","Virtual assistance","Sales & business dev","Project management","Cybersecurity","QA & testing","Other"];
const LEVEL_META = [
  { n:1, name:"Foundational", focus:"core basics" },{ n:2, name:"Intermediate", focus:"applied skill" },
  { n:3, name:"Advanced", focus:"real-world depth" },{ n:4, name:"Expert", focus:"mastery" },
];
const LEVEL_SECONDS = [60, 70, 85, 100];
const FALLBACK_BANDS = [
  { level:1, label:"Developmental", naira:"₦80k–130k" },{ level:2, label:"Eligible", naira:"₦130k–200k" },
  { level:3, label:"Certified", naira:"₦220k–380k" },{ level:4, label:"Elite", naira:"₦400k–700k+" },
];
const FALLBACK_Q = {
  1:[{q:"A customer writes an angry message about a late delivery. What do you do first?",options:["Defend the company","Acknowledge their frustration and confirm the facts","Ignore until they calm down","Forward to a manager"],correct:1,why:"Acknowledge first, then solve."},
    {q:"Which is the clearest way to confirm an action to a customer?",options:["\u201CIt has been done.\u201D","\u201CWe will look into it.\u201D","\u201CI\u2019ve refunded \u20A65,000 to your account today.\u201D","\u201CSomeone will contact you.\u201D"],correct:2,why:"Specific and active is clearest."},
    {q:"A spreadsheet column shows dates as text. The fastest fix is to:",options:["Retype every cell","Convert the column to a date format","Delete the column","Ignore it"],correct:1,why:"Reformat, don\u2019t retype."}],
  2:[{q:"You must reply to 40 tickets in an hour. The best approach is to:",options:["Answer slowly and perfectly","Triage by urgency, use templates, personalise the close","Pick easy ones only","Escalate all of them"],correct:1,why:"Triage + templates scale quality."},
    {q:"In a VLOOKUP, the last argument FALSE means:",options:["Approximate match","Exact match","Sort the data","Hide errors"],correct:1,why:"FALSE = exact match."},
    {q:"A KPI of \u2018first response time\u2019 measures:",options:["How long to fully resolve","How fast the first reply goes out","Customer satisfaction","Number of tickets"],correct:1,why:"It\u2019s the first reply speed."}],
  3:[{q:"CSAT is up but resolution time is up too. You should:",options:["Celebrate CSAT only","Investigate whether longer handling drives satisfaction, and the trade-off","Cut handling time immediately","Ignore resolution time"],correct:1,why:"Understand the trade-off."},
    {q:"To de-duplicate a 10k-row list reliably you would:",options:["Eyeball it","Use a unique key and a dedupe function/tool","Delete random rows","Sort alphabetically"],correct:1,why:"Key-based dedupe is reliable."},
    {q:"A process keeps breaking at handoff between two teams. The durable fix is to:",options:["Add more reminders","Define a clear owner and a shared definition of \u2018done\u2019","Do both jobs yourself","Hold more meetings"],correct:1,why:"Ownership + shared \u2018done\u2019."}],
  4:[{q:"You\u2019re asked to design a quality bar for new agents. The strongest first step is to:",options:["Copy a competitor","Define measurable outcomes tied to customer impact, then calibrate","Set a long checklist","Trust manager intuition"],correct:1,why:"Outcome-based, calibrated."},
    {q:"A model\u2019s accuracy is 95% but it misses most fraud cases. The issue is likely:",options:["Too much data","Class imbalance \u2014 accuracy is the wrong metric","The model is perfect","Slow training"],correct:1,why:"Imbalanced data needs recall/precision."},
    {q:"To make a weekly report drive decisions, you should:",options:["Add every metric you have","Lead with the one number that changes a decision, and the why","Use more charts","Make it longer"],correct:1,why:"Decision-first beats data-dump."}],
};

/* raffu integration (Next.js 14 + Supabase; raffles/entries/winners; /r/[slug]) */
const RAFFU_BASE = "https://raffu.xyz";
const RAFFLE_SLUG = "skill-worth-week";
async function enterIntoRaffu(entry){
  try{
    // Production (server-side): insert into raffu `entries` for the week's raffle,
    // or POST `${RAFFU_BASE}/api/r/${RAFFLE_SLUG}/enter` with the entrant + meta.
    return { ok:true, raffle: RAFFLE_SLUG };
  }catch(e){ return { ok:false }; }
}

async function callClaude(prompt){
  const res = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, messages:[{ role:"user", content: prompt }] })
  });
  const data = await res.json();
  const text = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n");
  return JSON.parse(text.replace(/```json/g,"").replace(/```/g,"").trim());
}

const seedBoard = (cat) => {
  const names=["Amaka O.","Zainab M.","Chioma E.","Fatima B.","Ngozi A.","Halima S.","Temi A.","Bukola I."];
  return names.map((n,i)=>{ const score=27-i*2-(i%2); return { name:n, skill:cat, score, me:false, entered:score>=20 }; }).sort((a,b)=>b.score-a.score);
};

export default function ProveYourWorth(){
  const [screen,setScreen] = useState("hook");
  const [mode,setMode] = useState("signup"); // signup | login
  const [form,setForm] = useState({ first:"",last:"",email:"",password:"",phone:"",skill:"",category:"Software development",consent:false });
  const [otpCode,setOtpCode] = useState("");
  const [otpInput,setOtpInput] = useState("");
  const [otpErr,setOtpErr] = useState(false);
  const [joined,setJoined] = useState(false);
  const [scaffold,setScaffold] = useState(null);
  const [lvlIdx,setLvlIdx] = useState(0);
  const [questions,setQuestions] = useState([]);
  const [answers,setAnswers] = useState([]);
  const [graded,setGraded] = useState(false);
  const [timedOut,setTimedOut] = useState(false);
  const [perLevel,setPerLevel] = useState([]);
  const [reached,setReached] = useState(0);
  const [offline,setOffline] = useState(false);
  const [tab,setTab] = useState("result");
  const [board,setBoard] = useState([]);
  const [raffleIn,setRaffleIn] = useState(false);
  const [winners,setWinners] = useState(null);
  const [confetti,setConfetti] = useState(false);
  const [disputeNote,setDisputeNote] = useState("");
  const [timeLeft,setTimeLeft] = useState(LEVEL_SECONDS[0]);

  const answersRef = useRef([]); const gradeRef = useRef(()=>{});
  useEffect(()=>{ answersRef.current = answers; },[answers]);

  const bands = scaffold?.bands || FALLBACK_BANDS;
  const levels = scaffold?.levels || LEVEL_META;
  const myScore = perLevel.reduce((s,r)=> s + r.correct*(r.level), 0);
  const tierFor = (lv)=> lv>=3 ? "A" : lv===2 ? "B" : "C";
  const doorFor = (t)=> t==="A" ? "Routed to a QTP partner with active demand" : t==="B" ? "Workshop track \u2014 mentorship and a 90-day re-grade" : "Honest feedback and a foundational route up";
  const bandFor = (lv)=> lv>=1 ? bands[lv-1] : { label:"Emerging", naira:"Not placed yet" };
  const tier = tierFor(reached); const band = bandFor(reached);
  const allAnswered = answers.length>0 && answers.every(a=>a>=0);
  const phoneDigits = form.phone.replace(/\D/g,"");

  function fireConfetti(ms=2600){ setConfetti(true); setTimeout(()=>setConfetti(false), ms); }

  function createAccount(){ const code=String(Math.floor(100000+Math.random()*900000)); setOtpCode(code); setOtpInput(""); setOtpErr(false); setScreen("otp"); }
  function verifyOtp(){ if(otpInput===otpCode){ setScreen("skillpick"); } else { setOtpErr(true); } }

  function gradeLevel(){
    if(graded) return;
    const ans = answersRef.current;
    const correct = questions.reduce((s,q,i)=> s + (ans[i]===q.correct?1:0), 0);
    setGraded(true);
    const lvlNum = lvlIdx+1;
    setPerLevel(prev=> [...prev.filter(r=>r.level!==lvlNum), { level:lvlNum, correct, total:questions.length }]);
    if(correct>=2){ setReached(r=>Math.max(r,lvlNum)); fireConfetti(2400); }
  }
  useEffect(()=>{ gradeRef.current = gradeLevel; });

  useEffect(()=>{
    if(screen!=="play" || graded || questions.length===0) return;
    setTimeLeft(LEVEL_SECONDS[lvlIdx] || 90); setTimedOut(false);
    const id = setInterval(()=>{ setTimeLeft(t=>{ if(t<=1){ clearInterval(id); setTimedOut(true); gradeRef.current(); return 0; } return t-1; }); },1000);
    return ()=>clearInterval(id);
  },[screen, lvlIdx, questions, graded]);

  async function genLevel(skill, lvl){
    const meta = (levels[lvl-1]) || LEVEL_META[lvl-1];
    try{
      const out = await callClaude(`Generate 3 multiple-choice questions to test "${skill}" at the "${meta.name}" level (${meta.focus}), for the Nigerian BPO / tech talent market. Return ONLY valid JSON, no markdown, shape: {"questions":[{"q":"...","options":["..","..","..",".."],"correct":0,"why":"one short line"}]} . Exactly 3 questions, exactly 4 options each, exactly one correct index 0-3. Concise, answerable on a phone. Match the ${meta.name} difficulty.`);
      const qs = out.questions.slice(0,3).map(x=>({ q:x.q, options:x.options.slice(0,4), correct:Math.max(0,Math.min(3,x.correct)), why:x.why||"" }));
      if(qs.length===3 && qs.every(q=>q.options.length===4)) return qs;
      throw new Error("shape");
    }catch(e){ setOffline(true); return FALLBACK_Q[lvl] || FALLBACK_Q[1]; }
  }

  async function startAssessment(){
    setScreen("building"); setOffline(false); setJoined(false);
    let sc = null;
    try{
      sc = await callClaude(`You are calibrating a skills assessment for the Nigerian BPO and tech talent market. A woman says her skill is: "${form.skill}" (category: ${form.category}). Return ONLY valid JSON, no markdown, shape: {"skill":"<normalised>","levels":[{"n":1,"name":"Foundational","focus":"2-4 words"},{"n":2,"name":"Intermediate","focus":"2-4 words"},{"n":3,"name":"Advanced","focus":"2-4 words"},{"n":4,"name":"Expert","focus":"2-4 words"}],"bands":[{"level":1,"label":"Developmental","naira":"\u20A6.."},{"level":2,"label":"Eligible","naira":"\u20A6.."},{"level":3,"label":"Certified","naira":"\u20A6.."},{"level":4,"label":"Elite","naira":"\u20A6.."}]} . Make naira realistic MONTHLY salaries for ${form.skill} in Nigeria, rising by level, using \u20A6 and k/M (e.g. "\u20A6150k\u2013250k").`);
      if(!sc.levels || !sc.bands) throw new Error("shape");
      sc.skill = sc.skill || form.skill;
    }catch(e){ setOffline(true); sc = { skill: form.skill, levels: LEVEL_META, bands: FALLBACK_BANDS }; }
    setScaffold(sc);
    const q = await genLevel(sc.skill, 1);
    setLvlIdx(0); setQuestions(q); setAnswers(Array(q.length).fill(-1)); setGraded(false); setPerLevel([]); setReached(0); setScreen("play");
  }

  async function nextAfterGrade(){
    const last = perLevel.find(r=>r.level===lvlIdx+1);
    const passed = last && last.correct>=2;
    if(passed && lvlIdx < 3){
      setScreen("building");
      const q = await genLevel(scaffold.skill, lvlIdx+2);
      setLvlIdx(lvlIdx+1); setQuestions(q); setAnswers(Array(q.length).fill(-1)); setGraded(false); setScreen("play");
    } else { setTab("result"); setScreen("reveal"); }
  }

  async function accept(){
    const cat = form.category; const eligible = reached>=3;
    let arr = seedBoard(cat).filter(x=>!x.me);
    const mine = { name:`${form.first||"You"} ${form.last? form.last[0]+"." : ""}`.trim(), skill:scaffold?.skill||form.skill, score:myScore, me:true, entered:eligible };
    arr.push(mine); arr.sort((a,b)=>b.score-a.score);
    try{ if(typeof window!=="undefined" && window.storage){ await window.storage.set("pyw_board_"+cat, JSON.stringify(arr)); } }catch(e){}
    if(eligible){ await enterIntoRaffu({ name:mine.name, email:form.email, phone:form.phone, score:myScore, band:band.label, skill:mine.skill, source:"prove-your-worth" }); }
    setBoard(arr); setRaffleIn(eligible); setTab("result"); setScreen("accepted");
  }

  async function reprove(){ if(lvlIdx>=3) return; setScreen("building"); const q=await genLevel(scaffold.skill,lvlIdx+2); setLvlIdx(lvlIdx+1); setQuestions(q); setAnswers(Array(q.length).fill(-1)); setGraded(false); setScreen("play"); }
  function joinCommunity(){ setJoined(true); fireConfetti(2200); }
  function runDraw(){ const all=board.length?board:seedBoard(form.category); const pool=all.filter(e=>e.entered); if(!pool.length){ setWinners({none:true}); return; } const top=pool[0]; const rest=pool.slice(1); const rand=rest[Math.floor(Math.random()*rest.length)]||pool[0]; setWinners({top,rand}); fireConfetti(2800); }
  function reset(){ setScreen("skillpick"); setScaffold(null); setQuestions([]); setAnswers([]); setPerLevel([]); setReached(0); setGraded(false); setOffline(false); setRaffleIn(false); setJoined(false); setForm(f=>({...f, skill:""})); }

  const mm = `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,"0")}`;
  const low = timeLeft<=10;
  const confColors = ["#E9473A","#FDC00D","#00B75B","#8FC14E"];
  const confElems = confetti ? Array.from({length:42}).map((_,i)=>(<span key={i} className="conf" style={{left:(2+(i*2.3)%96)+"%",background:confColors[i%confColors.length],animationDuration:(1.5+(i%5)*0.28)+"s",animationDelay:((i%8)*0.04)+"s"}}/>)) : null;

  // shared: Level 1/2 → join-the-community call to action
  const communityCTA = (
    joined ? (
      <div className="card card-wash pop">
        <div className="row" style={{gap:8}}><Check size={16} color="var(--green)"/><span style={{fontWeight:700,color:"var(--deep)",fontSize:14}}>You&rsquo;ve joined the TTS Community</span></div>
        <p className="muted" style={{fontSize:12.5,marginTop:6}}>Expect an invite to free training and your first workshop, with placement support as you level up.</p>
      </div>
    ) : (
      <div className="card card-deep pop">
        <div className="eyebrow lemon">Ready to level up?</div>
        <p style={{color:"#fff",fontSize:14.5,lineHeight:1.5,marginTop:8}}>Join the <b>TTS Community</b> for better job opportunities, <b>free training</b>, and job placement. We&rsquo;ll help you close the gap to match-ready.</p>
        <button className="btn btn-lemon" style={{marginTop:14}} onClick={joinCommunity}><GraduationCap size={16}/> Take action now</button>
      </div>
    )
  );

  return (
    <div className="pyw"><style>{CSS}</style>
      <div className="wrap">
        {confElems}

        {screen==="hook" && (
          <div className="pad" style={{minHeight:560,display:"flex",flexDirection:"column"}}>
            <div className="row" style={{justifyContent:"space-between"}}>
              <div className="disp" style={{fontSize:18}}>TTS <span style={{color:"var(--green)"}}>Nigeria</span></div>
              <span className="tag tag-green"><Sparkles size={12}/> Skill Worth</span>
            </div>
            <div style={{marginTop:54}}>
              <div className="eyebrow">What is your skill worth?</div>
              <h1 className="disp" style={{fontSize:46,marginTop:12}}>Prove<br/>your worth.</h1>
              <p style={{fontSize:16,lineHeight:1.5,color:"var(--muted)",marginTop:16}}>The average female Python developer in Nigeria earns <b style={{color:"var(--deep)"}}>₦300k a month</b>. Think you can match it? Don&rsquo;t tell us &mdash; <b style={{color:"var(--deep)"}}>prove it.</b></p>
            </div>
            <div className="card card-cream" style={{marginTop:26}}>
              <div className="eyebrow" style={{color:"var(--deep)"}}>How it works</div>
              <p style={{fontSize:13.5,lineHeight:1.5,marginTop:8,color:"var(--ink)"}}>Create your account once. Pick any skill, take a live, timed test, and see what you&rsquo;re really worth. Clear Level 3 and you&rsquo;re in Friday&rsquo;s raffle.</p>
            </div>
            <button className="btn btn-primary" style={{marginTop:"auto"}} onClick={()=>{setMode("signup");setScreen("gate");}}>Start &mdash; prove your worth <ArrowRight size={17}/></button>
            <div className="foot">Dignified Work for a Digital Future.</div>
          </div>
        )}

        {screen==="gate" && (
          <div className="pad">
            <div className="eyebrow">{mode==="signup" ? "Create your account · one time" : "Welcome back"}</div>
            <h2 className="disp" style={{fontSize:28,marginTop:8}}>{mode==="signup" ? "Join Skill Worth." : "Log in."}</h2>
            <p className="muted" style={{fontSize:13.5,marginTop:8,lineHeight:1.45}}>{mode==="signup" ? "Sign up once with your email and phone. After that, just log in to prove new skills." : "Your email is your username."}</p>
            <div style={{marginTop:20,display:"flex",flexDirection:"column",gap:14}}>
              {mode==="signup" && (
                <div className="row" style={{gap:10}}>
                  <div style={{flex:1}}><label className="label">First name</label><input className="field" value={form.first} onChange={e=>setForm({...form,first:e.target.value})} placeholder="Amaka"/></div>
                  <div style={{flex:1}}><label className="label">Last name</label><input className="field" value={form.last} onChange={e=>setForm({...form,last:e.target.value})} placeholder="Okafor"/></div>
                </div>
              )}
              <div><label className="label">Email (your username)</label><input className="field" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="amaka@email.com"/></div>
              <div><label className="label">Password</label><input className="field" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="At least 6 characters"/></div>
              {mode==="signup" && (
                <div><label className="label">Phone (for verification)</label><input className="field" type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="0803 000 0000"/></div>
              )}
              {mode==="signup" && (
                <button className="opt" style={{borderColor:form.consent?"var(--green)":"#DCE6E0",background:form.consent?"var(--green50)":"#fff"}} onClick={()=>setForm({...form,consent:!form.consent})}>
                  <span className="dot" style={form.consent?{borderColor:"var(--green)",background:"var(--green)",color:"#fff"}:{}}>{form.consent && <Check size={12}/>}</span>
                  <span style={{fontSize:12.5,lineHeight:1.4}}>I&rsquo;m a woman in Nigeria, and I agree my answers can be used to assess and match me. <b>(Required)</b></span>
                </button>
              )}
            </div>
            {mode==="signup" ? (
              <button className="btn btn-primary" style={{marginTop:22}} disabled={!form.first||!form.email||form.password.length<6||phoneDigits.length<10||!form.consent} onClick={createAccount}><Phone size={16}/> Create account &amp; send code</button>
            ) : (
              <button className="btn btn-primary" style={{marginTop:22}} disabled={!form.email||form.password.length<6} onClick={()=>setScreen("skillpick")}>Log in <ArrowRight size={16}/></button>
            )}
            <div style={{textAlign:"center",marginTop:16}}>
              {mode==="signup"
                ? <span className="muted" style={{fontSize:13}}>Already have an account? <button className="link" onClick={()=>setMode("login")}>Log in</button></span>
                : <span className="muted" style={{fontSize:13}}>New here? <button className="link" onClick={()=>setMode("signup")}>Create an account</button></span>}
            </div>
          </div>
        )}

        {screen==="otp" && (
          <div className="pad" style={{minHeight:520,display:"flex",flexDirection:"column"}}>
            <div className="eyebrow">Step 2 · Verify your phone</div>
            <h2 className="disp" style={{fontSize:28,marginTop:8}}>Enter your code.</h2>
            <p className="muted" style={{fontSize:13.5,marginTop:8,lineHeight:1.45}}>We sent a 6-digit code to <b style={{color:"var(--deep)"}}>{form.phone}</b>. Enter it to confirm it&rsquo;s really you.</p>
            <input className="field otp" style={{marginTop:22}} inputMode="numeric" maxLength={6} value={otpInput} onChange={e=>{setOtpInput(e.target.value.replace(/\D/g,"").slice(0,6)); setOtpErr(false);}} placeholder="••••••"/>
            {otpErr && <p style={{color:"var(--red)",fontSize:12.5,marginTop:8}}>That code doesn&rsquo;t match. Try again.</p>}
            <div className="card card-cream" style={{marginTop:14}}><p style={{fontSize:12.5,color:"var(--deep)"}}><b>Demo:</b> your code is <b style={{letterSpacing:".1em"}}>{otpCode}</b> (a real SMS in production).</p></div>
            <button className="btn btn-primary" style={{marginTop:18}} disabled={otpInput.length<6} onClick={verifyOtp}>Verify &amp; continue <Check size={16}/></button>
            <button className="link" style={{margin:"14px auto 0"}} onClick={createAccount}>Resend code</button>
          </div>
        )}

        {screen==="skillpick" && (
          <div className="pad" style={{minHeight:460,display:"flex",flexDirection:"column"}}>
            <div className="eyebrow">{form.first?`Hi ${form.first} ·`:""} What will you prove?</div>
            <h2 className="disp" style={{fontSize:28,marginTop:8}}>Pick a skill.</h2>
            <p className="muted" style={{fontSize:13.5,marginTop:8,lineHeight:1.45}}>Name any skill &mdash; we build a live test for it on the spot.</p>
            <div style={{marginTop:20,display:"flex",flexDirection:"column",gap:14}}>
              <div><label className="label">What technical skill do you have?</label><input className="field" value={form.skill} onChange={e=>setForm({...form,skill:e.target.value})} placeholder="e.g. Data science, UX design, SQL…"/></div>
              <div><label className="label">Closest category</label>
                <select className="field" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <button className="btn btn-primary" style={{marginTop:22}} disabled={!form.skill.trim()} onClick={startAssessment}>Build my assessment <Sparkles size={16}/></button>
          </div>
        )}

        {screen==="building" && (
          <div className="pad" style={{minHeight:540,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
            <Loader2 size={40} className="spin" color="#00B75B"/>
            <h2 className="disp" style={{fontSize:24,marginTop:22}}>{perLevel.length===0 ? "Building your assessment" : `Building level ${lvlIdx+2}`}</h2>
            <p className="muted" style={{fontSize:14,marginTop:10,maxWidth:280}}>{perLevel.length===0 ? <>Creating a live test for <b style={{color:"var(--deep)"}}>{form.skill}</b>, calibrated to the Nigerian market.</> : <>You cleared it. Raising the difficulty&hellip;</>}</p>
          </div>
        )}

        {screen==="play" && questions.length>0 && (
          <div className="pad">
            <div className="row" style={{justifyContent:"space-between"}}><span className="tag tag-green">{(scaffold?.skill)||form.skill}</span>{offline && <span className="muted" style={{fontSize:10.5}}>practice set</span>}</div>
            <div className="lvlbar">{[0,1,2,3].map(i=>(<span key={i} className={"lvlseg"+(i<lvlIdx?" on":i===lvlIdx?" cur":"")}/>))}</div>
            <div className="row" style={{justifyContent:"space-between",marginTop:4}}><h2 className="disp" style={{fontSize:22}}>Level {lvlIdx+1} &middot; {levels[lvlIdx]?.name}</h2><span className="tag tag-lemon">≥2 of 3 to advance</span></div>
            <div className={"timer"+(low?" low":"")}><Timer size={15} color={low?"#E9473A":"#004931"}/><div className="track"><div className="fill" style={{width:(graded?0:(timeLeft/(LEVEL_SECONDS[lvlIdx]||90))*100)+"%"}}/></div><span className="num">{graded?"—":mm}</span></div>
            <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:20}}>
              {questions.map((q,qi)=>(
                <div key={qi}>
                  <p style={{fontSize:15,fontWeight:600,color:"var(--deep)",lineHeight:1.4,marginBottom:11}}>{qi+1}. {q.q}</p>
                  <div style={{display:"flex",flexDirection:"column",gap:9}}>
                    {q.options.map((op,oi)=>{ let cls="opt"+(answers[qi]===oi?" sel":""); if(graded){ if(oi===q.correct) cls="opt correct"; else if(answers[qi]===oi) cls="opt wrong"; }
                      return (<button key={oi} className={cls} disabled={graded} onClick={()=>{const a=[...answers];a[qi]=oi;setAnswers(a);}}>
                        <span className="dot">{graded && oi===q.correct ? <Check size={12}/> : graded && answers[qi]===oi ? <X size={12}/> : String.fromCharCode(65+oi)}</span><span>{op}</span></button>); })}
                  </div>
                  {graded && q.why && <p className="muted" style={{fontSize:12,marginTop:7}}>{q.why}</p>}
                </div>
              ))}
            </div>
            {!graded ? (
              <button className="btn btn-primary" style={{marginTop:22}} disabled={!allAnswered} onClick={()=>gradeRef.current()}>Submit level {lvlIdx+1}</button>
            ) : (
              <div className="flash" style={{marginTop:18}}>
                {(()=>{ const r=perLevel.find(x=>x.level===lvlIdx+1); const passed=r&&r.correct>=2; return (
                  <div className={"card "+(passed?"card-wash":"card-cream")} style={{marginBottom:12}}>
                    <div className="row" style={{gap:8}}>{passed ? <Sparkles size={16} color="var(--green)"/> : <Timer size={16} color="var(--deep)"/>}
                      <span style={{fontWeight:700,color:"var(--deep)",fontSize:14}}>{passed ? `Level ${lvlIdx+1} cleared!` : timedOut ? "Time\u2019s up." : "Not quite."} {r?`${r.correct}/${r.total}`:""}</span></div>
                    {!passed && <p className="muted" style={{fontSize:12.5,marginTop:6}}>You need 2 of 3. This is where your worth is set &mdash; honestly.</p>}
                  </div>); })()}
                <button className="btn btn-dark" onClick={nextAfterGrade}>{(perLevel.find(r=>r.level===lvlIdx+1)?.correct>=2 && lvlIdx<3) ? <>Next level <ChevronRight size={17}/></> : <>See what I&rsquo;m worth <ArrowRight size={17}/></>}</button>
              </div>
            )}
          </div>
        )}

        {screen==="reveal" && (
          <div className="pad">
            <div className="card card-deep pop">
              <div className="eyebrow lemon">Your worth, proven</div>
              <div className="disp" style={{color:"#fff",fontSize:20,marginTop:8}}>{scaffold?.skill||form.skill}</div>
              <div className="disp" style={{color:"var(--lemon)",fontSize:40,marginTop:10,lineHeight:1}}>{band.naira}</div>
              <p style={{color:"rgba(255,255,255,.85)",fontSize:13,marginTop:10}}>Proven level: <b style={{color:"#fff"}}>{reached>0 ? `${levels[reached-1]?.name} (Level ${reached})` : "Emerging"}</b> &middot; Band: <b style={{color:"#fff"}}>{band.label}</b></p>
            </div>
            <div className="card card-wash" style={{marginTop:14}}>
              <div className="eyebrow" style={{color:"var(--deep)"}}>Declared vs. proven</div>
              <p style={{fontSize:13.5,lineHeight:1.5,marginTop:8}}>You came in as a <b>{form.skill}</b>. {reached>=3 ? "You proved it at depth \u2014 straight through to match-ready." : reached===2 ? "You\u2019re close \u2014 one focused track away from match-ready." : "Your foundations are showing \u2014 here\u2019s an honest, real route up."}</p>
            </div>
            <div style={{marginTop:16}}>
              <div className="eyebrow" style={{color:"var(--green)"}}>Your climb</div>
              {[1,2,3,4].map(lv=>{ const r=perLevel.find(x=>x.level===lv); const rt=lv<=reached; return (
                <div key={lv} className="row" style={{padding:"8px 0",borderBottom:"1px solid #EEF3F0",justifyContent:"space-between"}}>
                  <span className="row" style={{gap:9}}><span className="rank" style={rt?{background:"var(--green)",color:"#fff"}:{}}>{lv}</span><span style={{fontSize:13.5,fontWeight:600,color:rt?"var(--deep)":"var(--muted)"}}>{LEVEL_META[lv-1].name}</span></span>
                  <span className="muted" style={{fontSize:12.5}}>{r?`${r.correct}/${r.total}`:"—"}</span></div>); })}
            </div>
            {reached<3 && <div style={{marginTop:16}}>{communityCTA}</div>}
            <div className="row" style={{gap:10,marginTop:18}}>
              <button className="btn btn-primary" style={{flex:1}} onClick={accept}><Check size={16}/> Accept</button>
              <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setScreen("dispute")}><ShieldQuestion size={16}/> Dispute</button>
            </div>
          </div>
        )}

        {screen==="dispute" && (
          <div className="pad">
            <div className="eyebrow">Not your full worth?</div>
            <h2 className="disp" style={{fontSize:26,marginTop:8}}>Dispute it.</h2>
            <p className="muted" style={{fontSize:13.5,marginTop:8,lineHeight:1.45}}>Two ways to challenge your band. Prove more, or ask a person to review it.</p>
            {reached<4 && (
              <div className="card card-wash" style={{marginTop:18}}>
                <div className="eyebrow" style={{color:"var(--deep)"}}>Prove more</div>
                <p style={{fontSize:13.5,marginTop:7,lineHeight:1.45}}>Take on <b>Level {reached+1} &middot; {LEVEL_META[reached]?.name}</b> (timed). Clear it and your band moves up on the spot.</p>
                <button className="btn btn-dark" style={{marginTop:12}} onClick={reprove}><RotateCcw size={15}/> Attempt level {reached+1}</button>
              </div>
            )}
            <div className="card" style={{marginTop:14,border:"1.5px solid #DCE6E0",borderRadius:16}}>
              <div className="eyebrow" style={{color:"var(--green)"}}>Ask for a human review</div>
              <p style={{fontSize:13,marginTop:7,lineHeight:1.45,color:"var(--muted)"}}>Tell the calibration team why the result is off. Your current band stands until they review.</p>
              <textarea className="field" style={{marginTop:10,minHeight:74,resize:"none"}} value={disputeNote} onChange={e=>setDisputeNote(e.target.value)} placeholder="e.g. The questions didn't cover my main tools…"/>
              <button className="btn btn-ghost" style={{marginTop:10}} disabled={!disputeNote.trim()} onClick={()=>setScreen("reviewed")}>Send to calibration team</button>
            </div>
            <button className="btn btn-lemon" style={{marginTop:16}} onClick={accept}>Actually, I&rsquo;ll accept it</button>
          </div>
        )}

        {screen==="reviewed" && (
          <div className="pad" style={{minHeight:540,display:"flex",flexDirection:"column",justifyContent:"center"}}>
            <div className="card card-wash pop">
              <div className="eyebrow" style={{color:"var(--deep)"}}>Dispute logged</div>
              <h2 className="disp" style={{fontSize:24,marginTop:8}}>A person will look at this.</h2>
              <p style={{fontSize:13.5,lineHeight:1.5,marginTop:10}}>Your note is flagged to the calibration team (Ashley&rsquo;s curriculum desk). You&rsquo;ll hear back by email. Until then, your band of <b>{band.label}</b> stands.</p>
            </div>
            <button className="btn btn-primary" style={{marginTop:20}} onClick={accept}>Continue <ArrowRight size={16}/></button>
          </div>
        )}

        {screen==="accepted" && (
          <div className="pad">
            <div className="tabs">
              <button className={"tab"+(tab==="result"?" on":"")} onClick={()=>setTab("result")}>My result</button>
              <button className={"tab"+(tab==="board"?" on":"")} onClick={()=>setTab("board")}>Leaderboard</button>
              <button className={"tab"+(tab==="raffle"?" on":"")} onClick={()=>setTab("raffle")}>Friday raffle</button>
            </div>
            {tab==="result" && (
              <div>
                <div className="card card-deep pop">
                  <div className="eyebrow lemon">Locked in &middot; Tier {tier}</div>
                  <div className="disp" style={{color:"var(--lemon)",fontSize:34,marginTop:8,lineHeight:1}}>{band.naira}</div>
                  <p style={{color:"rgba(255,255,255,.85)",fontSize:13,marginTop:8}}>{band.label} &middot; {scaffold?.skill||form.skill}</p>
                </div>
                <div className="card card-wash" style={{marginTop:14}}>
                  <div className="eyebrow" style={{color:"var(--deep)"}}>Your next step</div>
                  <p style={{fontSize:14,lineHeight:1.5,marginTop:8,fontWeight:600,color:"var(--deep)"}}>{doorFor(tier)}.</p>
                </div>
                {reached>=3 ? (
                  <div className="card card-cream" style={{marginTop:12}}>
                    <div className="row" style={{gap:8}}><Trophy size={16} color="var(--deep)"/><span style={{fontWeight:700,color:"var(--deep)",fontSize:14}}>You&rsquo;re in Friday&rsquo;s raffle 🎉</span></div>
                    <p className="muted" style={{fontSize:12.5,marginTop:6}}>Level 3+ auto-qualifies. Your entry was added to the {form.category} raffle.</p>
                  </div>
                ) : (
                  <div style={{marginTop:12}}>{communityCTA}</div>
                )}
                <button className="btn btn-ghost" style={{marginTop:16}} onClick={reset}><Sparkles size={15}/> Prove another skill</button>
              </div>
            )}
            {tab==="board" && (
              <div>
                <div className="row" style={{justifyContent:"space-between"}}><h2 className="disp" style={{fontSize:20}}>{form.category}</h2><span className="muted" style={{fontSize:11.5}}>this week</span></div>
                <div style={{marginTop:6}}>{board.map((e,i)=>(<div key={i} className="lbrow"><span className={"rank"+(e.me?" me":"")}>{i+1}</span><span style={{flex:1,fontSize:14,fontWeight:e.me?700:500,color:e.me?"var(--deep)":"var(--ink)"}}>{e.name}{e.me && <span className="muted" style={{fontWeight:500}}> &middot; you</span>}</span>{e.entered && <Trophy size={13} color="var(--green)"/>}<span style={{fontSize:13,fontWeight:700,color:"var(--green)"}}>{e.score}</span></div>))}</div>
                <p className="muted" style={{fontSize:11.5,marginTop:14,lineHeight:1.4}}><Trophy size={11} color="var(--green)" style={{verticalAlign:"-1px"}}/> = qualified for Friday&rsquo;s raffle (Level 3+). Boards are per category, so more women win.</p>
              </div>
            )}
            {tab==="raffle" && (
              <div>
                <h2 className="disp" style={{fontSize:22}}>Friday Night Raffle</h2>
                <p className="muted" style={{fontSize:13.5,marginTop:8,lineHeight:1.45}}>Reach <b style={{color:"var(--deep)"}}>Level 3</b> and you&rsquo;re entered automatically. Every Friday two women from the pool win &mdash; the top scorer, and one drawn at random.</p>
                <div className="card card-cream" style={{marginTop:16}}><div className="row" style={{justifyContent:"space-between"}}><span className="eyebrow" style={{color:"var(--deep)"}}>This week&rsquo;s pot</span><Gift size={16} color="var(--deep)"/></div><div className="disp" style={{fontSize:26,marginTop:6}}>₦20,000 + merch</div><p className="muted" style={{fontSize:11.5,marginTop:6}}>Runs in raffu &middot; branded in TTS colours</p></div>
                {!winners ? (<button className="btn btn-primary" style={{marginTop:18}} onClick={runDraw}><Trophy size={16}/> Run Friday draw</button>)
                : winners.none ? (<div className="card card-wash" style={{marginTop:18}}><p style={{fontSize:13.5,color:"var(--deep)"}}>No one has reached Level 3 yet this week. The pool fills as women climb.</p></div>)
                : (<div className="pop" style={{marginTop:18}}>
                    <div className="card card-wash"><div className="row" style={{gap:9}}><Star size={15} color="var(--green)"/><span style={{fontSize:12.5,fontWeight:600,color:"var(--deep)"}}>Top scorer</span></div><div className="disp" style={{fontSize:20,marginTop:5}}>{winners.top.name}</div></div>
                    <div className="card card-wash" style={{marginTop:10}}><div className="row" style={{gap:9}}><Gift size={15} color="var(--green)"/><span style={{fontSize:12.5,fontWeight:600,color:"var(--deep)"}}>Random finisher</span></div><div className="disp" style={{fontSize:20,marginTop:5}}>{winners.rand.name}</div></div>
                    <button className="btn btn-ghost" style={{marginTop:14}} onClick={()=>setWinners(null)}>Draw again</button>
                  </div>)}
              </div>
            )}
            <div className="foot">Dignified Work for a Digital Future.</div>
          </div>
        )}

      </div>
    </div>
  );
}
