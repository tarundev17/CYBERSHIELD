const scenarios = [
  {
    id:"qr",
    title:"UPI / QR Trap",
    category:"UPI & QR Scams",
    icon:"📱",
    text:"A person says: “I am sending you ₹2,000. Scan this QR code to receive the money. Enter your UPI PIN after scanning.”",
    options:[
      {t:"Scan the QR and enter my UPI PIN", ok:false, why:"A UPI PIN is generally used to authorize payments, not to receive money. Never enter your PIN just because someone says you will receive money."},
      {t:"Ask them to send the money without a QR request", ok:false, why:"This is safer than entering your PIN, but you should still verify the transaction independently."},
      {t:"Stop and verify the request before doing anything", ok:true, why:"Correct. Pause, verify the person and transaction, and never enter your UPI PIN merely to receive money."}
    ]
  },
  {
    id:"otp",
    title:"Fake Bank Caller",
    category:"OTP & Call Safety",
    icon:"📞",
    text:"A caller claims to be from your bank and says your account will be blocked unless you tell them the OTP you just received.",
    options:[
      {t:"Tell the caller the OTP", ok:false, why:"Never share OTPs with callers. A legitimate support process should not require you to disclose your OTP."},
      {t:"End the call and contact the bank through an independently verified official channel", ok:true, why:"Correct. Do not trust the caller's number. Verify the bank's contact details independently."},
      {t:"Give only the last 3 digits of the OTP", ok:false, why:"OTP fragments are still sensitive. Do not share OTPs."}
    ]
  },
  {
    id:"link",
    title:"Urgent KYC Message",
    category:"Suspicious Links",
    icon:"🔗",
    text:"SMS: “URGENT! Your bank account will be blocked today. Complete KYC now: http://bank-verify-example.com”",
    options:[
      {t:"Open the link immediately", ok:false, why:"Urgency plus a suspicious link is a common warning sign. Do not use links from unexpected messages."},
      {t:"Forward the SMS to friends", ok:false, why:"Forwarding a suspicious message can expose others to the same scam."},
      {t:"Ignore the link and verify KYC through the bank’s official app/website", ok:true, why:"Correct. Use an independently verified official channel rather than the link in the message."}
    ]
  },
  {
    id:"support",
    title:"Fake Customer Care",
    category:"Fake Support Channels",
    icon:"☎️",
    text:"You search online for bank customer care and find a number in a random forum. The person answering asks for your card details and OTP.",
    options:[
      {t:"Share the details because they know my account name", ok:false, why:"A convincing caller can still be fraudulent. Never disclose OTPs or sensitive banking information."},
      {t:"Use the bank’s official website/app or verified statement to find the contact number", ok:true, why:"Correct. Verify support numbers independently instead of trusting random search results or posts."},
      {t:"Ask them to send a payment link", ok:false, why:"Do not continue a suspicious interaction by clicking or paying through a link."}
    ]
  }
];

const quizzes = [
  {q:"Which action is safest when a caller asks for your OTP?", a:["Share it if they sound professional","Share only part of it","End the call and verify through an official channel","Send a screenshot"], c:2, e:"OTP should not be disclosed. Verify the caller independently."},
  {q:"A QR code asks you to enter your UPI PIN to receive money. What should you do?", a:["Enter the PIN","Pause and verify the transaction","Ask for another QR","Share the PIN with the sender"], c:1, e:"Pause and verify. Do not enter a UPI PIN simply to receive money."},
  {q:"Which is a strong warning sign in a message?", a:["A normal greeting","Artificial urgency and a suspicious link","Your name spelled correctly","A bank logo"], c:1, e:"Urgency and suspicious links can be scam triggers."},
  {q:"Where should you get a bank’s customer-care number?", a:["Random social-media comment","Random forum","Official bank app/website or verified source","A caller who contacts you"], c:2, e:"Verify support details independently using an official channel."},
  {q:"What is the safest general response to an unexpected payment request?", a:["Act immediately","Pause, verify and then decide","Share OTP first","Click the link to understand it"], c:1, e:"The platform teaches users to pause and verify before responding."}
];

const learnModules = [
  {title:"UPI & QR Scams",icon:"📱",desc:"Practice recognizing QR and payment-request traps.",tips:["Do not enter a UPI PIN just to receive money.","Pause when a QR code or payment request is unexpected.","Verify the transaction before authorizing anything."]},
  {title:"OTP & Call Safety",icon:"🔐",desc:"Learn how fake bank callers create pressure.",tips:["Never share OTPs or PINs with callers.","End suspicious calls.","Use independently verified bank contact details."]},
  {title:"Suspicious Links",icon:"🔗",desc:"Spot misleading messages and fake verification pages.",tips:["Be careful with urgent account-blocking messages.","Do not trust unexpected links.","Open the official app/site yourself instead."]},
  {title:"Fake Support Channels",icon:"☎️",desc:"Avoid fraudulent helpline numbers and impersonation.",tips:["Verify customer-care numbers independently.","Do not give sensitive information to unknown support agents.","Prefer official bank apps and websites."]},
  {title:"Induced Urgency",icon:"⚠️",desc:"Recognize panic-based scam techniques.",tips:["Scammers may create artificial deadlines.","Slow down before acting.","Verification is more important than speed."]},
  {title:"Safe Digital Habits",icon:"🛡️",desc:"Build habits that improve everyday transaction safety.",tips:["Pause and verify.","Protect OTP/PIN information.","Think before clicking and verify before paying."]}
];

let state = {user:null, score:0, scenariosDone:[], quizBest:0, quizDone:0, badgeIds:[]};
let authenticated = false;
let currentScenario = 0;
let currentQuiz = 0;
let quizScore = 0;
let scenarioAnswered = false;

function save(){
  updateHeader();
  if(!authenticated) return;
  fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)}).catch(()=>toast('Could not save progress. Check the server.'));
}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function progressPct(){return Math.min(100,Math.round(((state.scenariosDone.length + state.quizDone)/8)*100))}
function updateHeader(){
  document.getElementById("userGreeting").textContent=state.user ? `Hi, ${escapeHTML(state.user)}` : "Guest";
  document.getElementById("loginBtn").textContent=state.user ? "Logout" : "Login";
  document.querySelectorAll(".nav a").forEach(a=>a.classList.toggle("active",a.dataset.page===location.hash.replace("#","")));
}
function go(page){
  location.hash=page;
  document.getElementById("mainNav")?.classList.remove("open");
}
function render(){
  const page=location.hash.replace("#","")||"dashboard";
  updateHeader();
  if(page==="learn") renderLearn();
  else if(page==="simulator") renderSimulator();
  else if(page==="mock-otp") renderSecurityVerification();
  else if(page==="quiz") renderQuiz();
  else if(page==="progress") renderProgress();
  else renderDashboard();
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderDashboard(){
  document.getElementById("app").innerHTML=`
    <section class="hero">
      <div>
        <div class="eyebrow">🛡️ Cyber Safety Learning Platform</div>
        <h1>Think Before You Click.<br><span style="color:var(--primary)">Verify Before You Pay.</span></h1>
        <p>CyberShield is an interactive learning prototype that helps users understand common online banking scams and safely practice how to respond to suspicious calls, messages, links and payment requests.</p>
        <div class="actions">
          <button class="btn btn-primary" onclick="go('simulator')">Start Scam Simulator →</button>
          <button class="btn btn-outline" onclick="go('learn')">Explore Safety Lessons</button>
        </div>
      </div>
      <div class="hero-card">
        <div class="shield">🛡️</div>
        <h3>Practice, don't just read.</h3>
        <p>Learn → Experience → Decide → Understand → Improve</p>
        <div class="progress"><span style="width:${progressPct()}%"></span></div>
        <p style="font-size:12px;margin-bottom:0">${progressPct()}% learning progress</p>
      </div>
    </section>

    <section class="stat-grid section">
      <div class="stat"><span class="label">Safety Score</span><b>${state.score}</b></div>
      <div class="stat"><span class="label">Scenarios Completed</span><b>${state.scenariosDone.length}/${scenarios.length}</b></div>
      <div class="stat"><span class="label">Best Quiz</span><b>${state.quizBest}/${quizzes.length}</b></div>
      <div class="stat"><span class="label">Badges</span><b>${getBadges().filter(b=>state.badgeIds.includes(b.id)).length}</b></div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Core Learning Modules</h2><p>Short, practical topics for everyday digital banking safety.</p></div></div>
      <div class="grid">
        ${learnModules.slice(0,3).map(m=>`<div class="card"><div class="icon">${m.icon}</div><h3>${m.title}</h3><p>${m.desc}</p><button class="btn btn-outline small" onclick="go('learn')">Learn</button></div>`).join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>How CyberShield Works</h2></div></div>
      <div class="grid">
        ${[["1","Learn","Short explanations of common banking scams."],["2","Experience","Simulated real-life scam triggers."],["3","Decide","Choose the action you would take."],["4","Understand","Get instant safety feedback."],["5","Improve","Track score and progress."]].map(x=>`<div class="card"><div class="eyebrow">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}</p></div>`).join("")}
      </div>
    </section>
  `;
}
function renderLearn(){
  document.getElementById("app").innerHTML=`
    <section class="section"><div class="eyebrow">📚 Learn</div><h2>Cyber Safety Lessons</h2><p>Build recognition skills before entering the simulator.</p>
      <div class="grid">${learnModules.map((m,i)=>`<article class="card learn-card">
        <div class="icon">${m.icon}</div><h3>${m.title}</h3><p>${m.desc}</p>
        <ul class="tips">${m.tips.map(t=>`<li>${t}</li>`).join("")}</ul>
      </article>`).join("")}</div>
    </section>
    <section class="section"><div class="alert">⚠️ CyberShield is an educational prototype. Never enter real banking credentials, OTPs, PINs or card details into this website.</div></section>
  `;
}
function renderSimulator(){
  const s=scenarios[currentScenario];
  document.getElementById("app").innerHTML=`
    <section class="section">
      <div class="eyebrow">🎯 Experience & Decide</div>
      <div class="section-head"><div><h2>Scam Simulator</h2><p>Scenario ${currentScenario+1} of ${scenarios.length} • ${s.category}</p></div>
      <span class="badge earned" style="width:auto">${s.icon} ${s.title}</span></div>
      <div class="scenario">
        <div class="message"><div class="sender">${s.icon} Suspicious Trigger</div><div>${escapeHTML(s.text)}</div></div>
        <h3>What would you do?</h3>
        <div class="options">${s.options.map((o,i)=>`<button class="option" ${scenarioAnswered?"disabled":""} onclick="answerScenario(${i})">${o.t}</button>`).join("")}</div>
        <div id="scenarioFeedback"></div>
      </div>
      <div class="actions">
        <button class="btn btn-outline" onclick="prevScenario()">← Previous</button>
        <button class="btn btn-primary" onclick="nextScenario()">Next Scenario →</button>
      </div>
    </section>
  `;
}

let activeSecurityVerification = null;

function renderSecurityVerification(){
  document.getElementById("app").innerHTML=`
    <section class="section">
      <div class="eyebrow">🏦 Secure Account Access</div>
      <h2>JeevanMrityu Bank Security Verification Required</h2>
      <p>For your protection, complete the security verification before continuing. Use a dummy phone number for this college project.</p>
      <div class="grid-2" style="margin-top:20px">
        <div class="card">
          <h3>Security verification</h3>
          <p>Enter a 10-digit phone number to request your verification code.</p>
          <div class="form">
            <label>Phone number</label>
            <input id="securityPhone" inputmode="numeric" maxlength="10" placeholder="9876543210" autocomplete="tel">
            <button class="btn btn-primary" onclick="requestSecurityVerification()">Send Verification Code</button>
          </div>
          <div class="alert" style="margin-top:16px">🔒 For this college project, use a dummy phone number. No real message is sent.</div>
        </div>
        <div class="card">
          <h3>JeevanMrityu Bank</h3>
          <div id="securityMessage" class="phone-screen">
            <div class="phone-empty">🔐<br><span>Verification required</span><small>Request a verification code to continue.</small></div>
          </div>
        </div>
      </div>
      <div id="securityVerifyCard" class="card section hidden">
        <h3>Enter verification code</h3>
        <p>Enter the 6-digit code provided by the verification service.</p>
        <div class="form mock-code-form">
          <input id="securityCode" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code">
          <button class="btn btn-primary" onclick="verifySecurityCode()">Verify & Continue</button>
        </div>
        <div id="securityResult"></div>
      </div>
    </section>
  `;
}

async function requestSecurityVerification(){
  if(!authenticated){showAuth('login'); return;}
  const phone=document.getElementById('securityPhone').value.replace(/\D/g,'');
  if(phone.length!==10){toast('Enter a 10-digit phone number');return;}
  const r=await fetch('/api/security-verification/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
  const d=await r.json();
  if(!r.ok){toast(d.error||'Could not start security verification');return;}
  activeSecurityVerification=d.verificationId;
  document.getElementById('securityMessage').innerHTML=`<div class="mock-sms">
    <div class="mock-sms-head"><strong>JeevanMrityu Bank</strong><span>Now</span></div>
    <div class="mock-sms-body">${escapeHTML(d.message)}</div>
    <small>Verification contact • ${escapeHTML(d.phoneHint)}</small>
  </div>`;
  document.getElementById('securityVerifyCard').classList.remove('hidden');
  document.getElementById('securityCode').value='';
  document.getElementById('securityResult').innerHTML='';
  document.getElementById('securityCode').focus();
  toast('Verification code generated');
}

async function verifySecurityCode(){
  if(!activeSecurityVerification){toast('Request a verification code first');return;}
  const code=document.getElementById('securityCode').value.trim();

  if(!/^\d{6}$/.test(code)){
    toast('Enter a 6-digit OTP');
    return;
  }

  // Educational simulation: never process or store a real OTP.
  // Any 6-digit dummy OTP triggers the awareness alert.
  alert('⚠️ SECURITY AWARENESS ALERT\n\nNever share an OTP with anyone — not even someone claiming to be from your bank.\n\nCyberShield simulation: this was a dummy OTP exercise. A real OTP should always remain private.');

  state.score+=10;
  save();
  document.getElementById('securityResult').innerHTML=`<div class="feedback good"><strong>🛡️ Awareness Check Complete</strong><p>You entered a dummy OTP into the simulation. In real life, never share an OTP with a caller, message, or website.</p></div>`;
  toast('+10 Safety Score');
  activeSecurityVerification=null;
}

function answerScenario(i){
  if(scenarioAnswered)return;
  scenarioAnswered=true;
  const s=scenarios[currentScenario], o=s.options[i];
  if(o.ok){
    state.score += 10;
    if(!state.scenariosDone.includes(s.id))state.scenariosDone.push(s.id);
    toast("+10 Safety Score");
  }else toast("Good try — review the explanation");
  save();
  document.querySelectorAll(".option").forEach((b,idx)=>{b.classList.toggle("correct",s.options[idx].ok);if(idx===i&&!o.ok)b.classList.add("wrong")});
  document.getElementById("scenarioFeedback").innerHTML=`<div class="feedback ${o.ok?"good":"bad"}"><strong>${o.ok?"✅ Safe decision":"❌ Risky decision"}</strong><p>${o.why}</p></div>`;
}
function nextScenario(){currentScenario=(currentScenario+1)%scenarios.length;scenarioAnswered=false;renderSimulator()}
function prevScenario(){currentScenario=(currentScenario-1+scenarios.length)%scenarios.length;scenarioAnswered=false;renderSimulator()}

function renderQuiz(){
  if(currentQuiz>=quizzes.length){
    document.getElementById("app").innerHTML=`<section class="section"><div class="card" style="text-align:center;padding:45px">
      <div class="shield" style="font-size:60px">🏆</div><h2>Quiz Complete!</h2>
      <p>You scored <strong style="color:var(--primary);font-size:28px">${quizScore}/${quizzes.length}</strong></p>
      <p>${quizScore>=4?"Excellent awareness. Keep practicing real-world scenarios.":"Keep learning and retry the quiz to improve your score."}</p>
      <div class="actions" style="justify-content:center"><button class="btn btn-primary" onclick="restartQuiz()">Try Again</button><button class="btn btn-outline" onclick="go('progress')">View Progress</button></div>
    </div></section>`;
    return;
  }
  const q=quizzes[currentQuiz];
  document.getElementById("app").innerHTML=`<section class="section">
    <div class="eyebrow">🧠 Knowledge Check</div><h2>CyberShield Quiz</h2>
    <div class="card" style="margin-top:18px">
      <div class="quiz-meta"><span>Question ${currentQuiz+1}/${quizzes.length}</span><span>Current score: ${quizScore}</span></div>
      <div class="progress" style="margin-bottom:24px"><span style="width:${(currentQuiz/quizzes.length)*100}%"></span></div>
      <div class="quiz-question">${q.q}</div>
      <div class="options">${q.a.map((a,i)=>`<button class="option" onclick="answerQuiz(${i})">${a}</button>`).join("")}</div>
      <div id="quizFeedback"></div>
    </div>
  </section>`;
}
function answerQuiz(i){
  const q=quizzes[currentQuiz], correct=i===q.c;
  if(correct){quizScore++;state.score+=5;toast("+5 Safety Score")}
  state.quizDone=Math.max(state.quizDone,currentQuiz+1);
  save();
  document.querySelectorAll(".option").forEach((b,idx)=>{b.disabled=true;b.classList.toggle("correct",idx===q.c);if(idx===i&&!correct)b.classList.add("wrong")});
  document.getElementById("quizFeedback").innerHTML=`<div class="feedback ${correct?"good":"bad"}"><strong>${correct?"✅ Correct":"❌ Not quite"}</strong><p>${q.e}</p><button class="btn btn-primary small" onclick="nextQuiz()" style="margin-top:8px">${currentQuiz===quizzes.length-1?"Finish":"Next Question →"}</button></div>`;
}
function nextQuiz(){
  currentQuiz++;
  if(currentQuiz>=quizzes.length){state.quizBest=Math.max(state.quizBest,quizScore);save()}
  renderQuiz();
}
function restartQuiz(){currentQuiz=0;quizScore=0;renderQuiz()}

function getBadges(){
  return [
    {id:"first",emoji:"🎯",name:"First Step",desc:"Complete a scenario"},
    {id:"scout",emoji:"🔎",name:"Scam Scout",desc:"Complete 2 scenarios"},
    {id:"shield",emoji:"🛡️",name:"CyberShield",desc:"Complete all scenarios"},
    {id:"quiz",emoji:"🏆",name:"Quiz Pro",desc:"Score 4+ in quiz"},
    {id:"learner",emoji:"📚",name:"Safe Learner",desc:"Complete quiz"}
  ];
}
function renderProgress(){
  const badges=getBadges();
  const earned=badges.filter(b=>state.badgeIds.includes(b.id));
  // Calculate badges from current state for display and persist them.
  const ids=[];
  if(state.scenariosDone.length>=1)ids.push("first");
  if(state.scenariosDone.length>=2)ids.push("scout");
  if(state.scenariosDone.length>=scenarios.length)ids.push("shield");
  if(state.quizBest>=4)ids.push("quiz");
  if(state.quizDone>=quizzes.length)ids.push("learner");
  state.badgeIds=[...new Set(ids)];
  save();
  document.getElementById("app").innerHTML=`<section class="section">
    <div class="eyebrow">📈 Improve</div><h2>Your Progress</h2><p>Track your learning journey and safety score.</p>
    <div class="stat-grid section">
      <div class="stat"><span class="label">Safety Score</span><b>${state.score}</b></div>
      <div class="stat"><span class="label">Progress</span><b>${progressPct()}%</b></div>
      <div class="stat"><span class="label">Scenarios</span><b>${state.scenariosDone.length}/${scenarios.length}</b></div>
      <div class="stat"><span class="label">Best Quiz</span><b>${state.quizBest}/${quizzes.length}</b></div>
    </div>
    <div class="card section"><h3>Learning Progress</h3><div class="progress" style="margin:14px 0"><span style="width:${progressPct()}%"></span></div><p>${progressPct()}% of the starter learning path completed.</p></div>
    <div class="section"><h2>Badges</h2><div class="badges">${badges.map(b=>`<div class="badge ${state.badgeIds.includes(b.id)?"earned":""}"><div class="emoji">${b.emoji}</div><strong>${b.name}</strong><small>${b.desc}</small></div>`).join("")}</div></div>
    <div class="section"><button class="btn btn-danger" onclick="resetProgress()">Reset Demo Progress</button></div>
  </section>`;
}
function resetProgress(){
  if(confirm("Reset all CyberShield demo progress?")){
    state={user:state.user,score:0,scenariosDone:[],quizBest:0,quizDone:0,badgeIds:[]};save();toast("Progress reset");go("dashboard");
  }
}
function openLogin(){
  if(state.user){ logout(); return; }
  showAuth('login');
}
function showAuth(mode='login'){
  const login=mode==='login';
  document.getElementById("modalContent").innerHTML=`<h2>${login?'CyberShield Login':'Create your CyberShield account'}</h2><p>${login?'Log in to access your saved progress from any device using this server.':'Create an account to save your CyberShield progress securely.'}</p><div class="form">${login?'':`<label>Name</label><input id="authName" autocomplete="name" placeholder="Enter your name">`}<label>Email</label><input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com"><label>Password</label><input id="authPassword" type="password" autocomplete="${login?'current-password':'new-password'}" placeholder="Minimum 8 characters"><button class="btn btn-primary" onclick="${login?'loginDemo()':'registerDemo()'}">${login?'Login':'Create Account'}</button><p style="margin-top:12px;font-size:13px">${login?`Don't have an account? <button class="link-btn" onclick="showAuth('register')">Create one</button>`:`Already have an account? <button class="link-btn" onclick="showAuth('login')">Log in</button>`}</p></div>`;
  document.getElementById("modal").classList.remove("hidden");
  setTimeout(()=>document.getElementById(login?'authEmail':'authName')?.focus(),50);
}
async function registerDemo(){
  const name=document.getElementById('authName').value.trim(), email=document.getElementById('authEmail').value.trim(), password=document.getElementById('authPassword').value;
  if(!name||!email||!password)return toast('Please fill all fields');
  const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})});
  const d=await r.json(); if(!r.ok)return toast(d.error||'Registration failed');
  authenticated=true; state=d.user.state; state.user=d.user.name; document.getElementById('modal').classList.add('hidden'); updateHeader(); toast(`Welcome, ${d.user.name}!`); render();
}
async function loginDemo(){
  const email=document.getElementById('authEmail').value.trim(), password=document.getElementById('authPassword').value;
  if(!email||!password)return toast('Enter your email and password');
  const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const d=await r.json(); if(!r.ok)return toast(d.error||'Login failed');
  authenticated=true; state=d.user.state; state.user=d.user.name; document.getElementById('modal').classList.add('hidden'); updateHeader(); toast(`Welcome back, ${d.user.name}!`); render();
}
async function logout(){await fetch('/api/logout',{method:'POST'}).catch(()=>{});authenticated=false;state={user:null,score:0,scenariosDone:[],quizBest:0,quizDone:0,badgeIds:[]};updateHeader();toast('Logged out');go('dashboard');}
async function initAuth(){
  try{const r=await fetch('/api/me'); const d=await r.json(); if(d.user){authenticated=true;state=d.user.state;state.user=d.user.name;} }catch(e){toast('Please run CyberShield through the Python server.');}
  updateHeader(); render();
}
document.addEventListener("click",e=>{
  const a=e.target.closest("[data-page]");
  if(a){e.preventDefault();go(a.dataset.page)}
});
document.getElementById("loginBtn").addEventListener("click",openLogin);
document.getElementById("modalClose").addEventListener("click",()=>document.getElementById("modal").classList.add("hidden"));
document.getElementById("modal").addEventListener("click",e=>{if(e.target.id==="modal")e.currentTarget.classList.add("hidden")});
document.getElementById("menuBtn")?.addEventListener("click",()=>document.getElementById("mainNav")?.classList.toggle("open"));
window.addEventListener("hashchange",render);
window.answerScenario=answerScenario;window.nextScenario=nextScenario;window.prevScenario=prevScenario;window.requestSecurityVerification=requestSecurityVerification;window.verifySecurityCode=verifySecurityCode;
window.answerQuiz=answerQuiz;window.nextQuiz=nextQuiz;window.restartQuiz=restartQuiz;window.go=go;window.resetProgress=resetProgress;window.loginDemo=loginDemo;window.registerDemo=registerDemo;window.showAuth=showAuth;
initAuth();
