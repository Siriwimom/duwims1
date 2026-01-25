"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export default function App() {
  // screens: login | signup | forgot | otp | reset
  const [screen, setScreen] = useState("login");

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  const [pendingOtpEmail, setPendingOtpEmail] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState(null); // { title, desc, buttonText, onClose }
  const [resetAllowed, setResetAllowed] = useState(false);

  // ---------- tiny "DB" in localStorage ----------
  const LS_USERS = "AUTH_USERS_V1"; // [{email, password}]
  const LS_OTP = "AUTH_OTP_V1"; // { email, code, expMs }

  function readUsers() {
    try {
      return JSON.parse(localStorage.getItem(LS_USERS) || "[]");
    } catch {
      return [];
    }
  }
  function writeUsers(users) {
    localStorage.setItem(LS_USERS, JSON.stringify(users));
  }
  function findUser(emailX) {
    const users = readUsers();
    return users.find((u) => u.email === (emailX || "").trim().toLowerCase());
  }
  function upsertUser(emailX, password) {
    const emailN = (emailX || "").trim().toLowerCase();
    const users = readUsers();
    const idx = users.findIndex((u) => u.email === emailN);
    if (idx >= 0) users[idx] = { email: emailN, password };
    else users.push({ email: emailN, password });
    writeUsers(users);
  }
  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  }
  function isValidPassword(v) {
    // ปรับเงื่อนไขได้ตามต้องการ
    return String(v || "").length >= 6;
  }

  function getOtpStore() {
    try {
      return JSON.parse(localStorage.getItem(LS_OTP) || "null");
    } catch {
      return null;
    }
  }
  function setOtpStore(obj) {
    localStorage.setItem(LS_OTP, JSON.stringify(obj));
  }
  function clearOtpStore() {
    localStorage.removeItem(LS_OTP);
  }

  function genOtp6() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function resetFormSensitive() {
    setPw("");
    setPw2("");
    setOtp(["", "", "", "", "", ""]);
    setErr("");
  }

  const title = useMemo(() => {
    if (screen === "login") return "Login";
    if (screen === "signup") return "Sign up";
    if (screen === "forgot") return "Reset Your Password";
    if (screen === "otp") return "Reset Your Password.";
    if (screen === "reset") return "Set a Password";
    return "";
  }, [screen]);

  async function run(fn) {
    try {
      setErr("");
      setLoading(true);
      await fn();
    } catch (e) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Actions ----------
  function onGo(to) {
    setScreen(to);
    resetFormSensitive();
    if (to !== "otp") setResetAllowed(false);
  }

  async function handleLogin() {
    await run(async () => {
      const emailN = email.trim().toLowerCase();
      if (!isValidEmail(emailN)) throw new Error("Invalid email");
      if (!pw) throw new Error("Enter password");

      const user = findUser(emailN);
      if (!user) throw new Error("User not found");
      if (user.password !== pw) throw new Error("Wrong password");

      setModal({
        title: "Login Successfully",
        desc: "You can continue to your app now.",
        buttonText: "Back to Home",
        onClose: () => setModal(null)
      });
    });
  }

  async function handleSignup() {
    await run(async () => {
      const emailN = email.trim().toLowerCase();
      if (!isValidEmail(emailN)) throw new Error("Invalid email");
      if (!isValidPassword(pw)) throw new Error("Password must be at least 6 characters");
      if (pw !== pw2) throw new Error("Password not match");

      const exists = findUser(emailN);
      if (exists) throw new Error("Email already exists");

      upsertUser(emailN, pw);

      setModal({
        title: "Sign up Successfully",
        desc: "Sign up successfully, you can login now",
        buttonText: "Back to Login",
        onClose: () => {
          setModal(null);
          setEmail("");
          resetFormSensitive();
          setScreen("login");
        }
      });
    });
  }

  async function handleSendOtp() {
    await run(async () => {
      const emailN = email.trim().toLowerCase();
      if (!isValidEmail(emailN)) throw new Error("Invalid email");

      const user = findUser(emailN);
      if (!user) throw new Error("User not found");

      const code = genOtp6();
      const expMs = Date.now() + 10 * 60 * 1000; // 10 นาที
      setOtpStore({ email: emailN, code, expMs });

      setPendingOtpEmail(emailN);
      setScreen("otp");
      setOtp(["", "", "", "", "", ""]);
      setResetAllowed(false);

      // *** DEMO ONLY ***
      // ในของจริง OTP จะส่ง Email แต่ตอนนี้แสดงให้เห็นเพื่อทดสอบได้ 100%
      setErr(`DEMO OTP: ${code} (valid 10 min)`);
    });
  }

  function setOtpAt(i, v) {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  }

  async function handleVerifyOtp() {
    await run(async () => {
      const store = getOtpStore();
      if (!store) throw new Error("OTP not found. Please resend.");
      if (Date.now() > store.expMs) {
        clearOtpStore();
        throw new Error("OTP expired. Please resend.");
      }

      const code = otp.join("");
      if (code.length !== 6) throw new Error("Enter 6 digits OTP");
      if (store.email !== (pendingOtpEmail || "").trim().toLowerCase()) {
        throw new Error("OTP email mismatch. Please resend.");
      }
      if (code !== store.code) throw new Error("Invalid OTP");

      setResetAllowed(true);
      setScreen("reset");
      setPw("");
      setPw2("");
    });
  }

  async function handleResetPassword() {
    await run(async () => {
      if (!resetAllowed) throw new Error("Reset not allowed. Verify OTP first.");
      const emailN = (pendingOtpEmail || email || "").trim().toLowerCase();
      if (!isValidEmail(emailN)) throw new Error("Invalid email");
      if (!isValidPassword(pw)) throw new Error("Password must be at least 6 characters");
      if (pw !== pw2) throw new Error("Password not match");

      const user = findUser(emailN);
      if (!user) throw new Error("User not found");

      upsertUser(emailN, pw);
      clearOtpStore();
      setResetAllowed(false);

      setModal({
        title: "Password Update Successfully",
        desc: "Password changed successfully, you can login again with new password",
        buttonText: "Back to Home",
        onClose: () => {
          setModal(null);
          setEmail("");
          setPendingOtpEmail("");
          resetFormSensitive();
          setScreen("login");
        }
      });
    });
  }

  // ถ้าผู้ใช้ refresh หน้า ระหว่าง OTP/reset
  useEffect(() => {
    const store = getOtpStore();
    if (store?.email) setPendingOtpEmail(store.email);
  }, []);

  // ---------- UI ----------
  return (
    <div className="page">
      <style>{css}</style>

      <div className="panel">
        <h1>{title}</h1>

        {err && <div className="err">{err}</div>}

        {/* LOGIN */}
        {screen === "login" && (
          <>
            <div className="label">Email</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />

            <div className="label">Password</div>
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />

            <button className="btn blue" onClick={handleLogin} disabled={loading}>
              {loading ? "Loading..." : "Login"}
            </button>

            <div className="row">
              <button className="linkBtn" onClick={() => onGo("signup")}>Create Account</button>
              <button className="linkBtn" onClick={() => onGo("forgot")}>Forget Password ?</button>
            </div>

            <div className="hr"><span>OR</span></div>

            <button
              className="btn googleBtn"
              onClick={() => setErr("Google sign-in (demo): ยังไม่เชื่อมจริง")}
              disabled={loading}
            >
              <span className="gIcon">G</span>
              <span>Sign in with Google</span>
            </button>

            <div className="small">Forgot email or trouble signing in ? Get help.</div>
          </>
        )}

        {/* SIGNUP */}
        {screen === "signup" && (
          <>
            <div className="label">Email</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />

            <div className="label">Password</div>
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />

            <div className="label">Password Confirm</div>
            <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />

            <button className="btn blue" onClick={handleSignup} disabled={loading}>
              {loading ? "Loading..." : "Sign up"}
            </button>

            <div className="hr"><span>OR</span></div>

            <button
              className="btn googleBtn"
              onClick={() => setErr("Google sign-in (demo): ยังไม่เชื่อมจริง")}
              disabled={loading}
            >
              <span className="gIcon">G</span>
              <span>Sign in with Google</span>
            </button>

            <div className="small">Forgot email or trouble signing in ? Get help.</div>

            <div className="row" style={{ justifyContent: "center" }}>
              <button className="linkBtn" onClick={() => onGo("login")}>Back to Login</button>
            </div>
          </>
        )}

        {/* FORGOT */}
        {screen === "forgot" && (
          <>
            <div className="label">Email Address</div>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />

            <button className="btn blue" onClick={handleSendOtp} disabled={loading}>
              {loading ? "Sending..." : "Reset Password 🔒"}
            </button>

            <div className="row">
              <button className="linkBtn" onClick={() => onGo("login")}>Back</button>
              <span />
            </div>
          </>
        )}

        {/* OTP */}
        {screen === "otp" && (
          <>
            <div className="otpHint">Enter your 6 digit OTP code in order to reset.</div>

            <div className="otpRow">
              {otp.map((d, i) => (
                <input
                  key={i}
                  className="otpBox"
                  value={d}
                  onChange={(e) => setOtpAt(i, e.target.value)}
                  ref={(el) => (otpRefs.current[i] = el)}
                  inputMode="numeric"
                  maxLength={1}
                />
              ))}
            </div>

            <button className="btn blue" onClick={handleVerifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Reset Password 🔒"}
            </button>

            <div className="small">Didn't receive the code?</div>

            <div className="row" style={{ marginTop: 10 }}>
              <button className="linkBtn" onClick={handleSendOtp} disabled={loading}>Resend</button>
              <button className="linkBtn" onClick={() => onGo("login")}>Back</button>
            </div>
          </>
        )}

        {/* RESET */}
        {screen === "reset" && (
          <>
            <div className="label">Create Password</div>
            <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />

            <div className="label">Confirm Password</div>
            <input className="input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />

            <button className="btn blue" onClick={handleResetPassword} disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        )}

        {/* MODAL */}
        {modal && (
          <div className="modalOverlay" onMouseDown={() => {}}>
            <div className="modal">
              <div className="checkWrap">
                <div className="checkInner">✓</div>
              </div>

              <div className="modalTitle">{modal.title}</div>
              <div className="modalDesc">{modal.desc}</div>

              <button className="btn solid" style={{ marginTop: 16 }} onClick={modal.onClose}>
                {modal.buttonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const css = `
:root{
  --bg1:#baff9f;
  --bg2:#159a44;
  --blue:#0a66ff;
  --green:#22c55e;
}
*{ box-sizing:border-box; }
html,body{ height:100%; margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }

.page{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:28px 16px;
  background: linear-gradient(135deg, var(--bg1), var(--bg2));
}
.panel{ width:min(720px, 94vw); text-align:center; }

h1{
  color:#fff;
  font-size:56px;
  margin:0 0 18px;
  text-shadow:0 2px 12px rgba(0,0,0,.15);
}
.label{
  width:min(540px, 94vw);
  margin:0 auto 6px;
  text-align:left;
  color:rgba(255,255,255,.45);
  font-size:12px;
  font-weight:700;
}
.input{
  width:min(540px, 94vw);
  height:40px;
  border-radius:22px;
  border:2px solid rgba(0,0,0,.55);
  outline:none;
  padding:0 14px;
  background:#fff;
  display:block;
  margin:0 auto 14px;
  font-weight:700;
}
.btn{
  width:min(540px, 94vw);
  height:44px;
  border-radius:22px;
  border:2px solid rgba(0,0,0,.25);
  background:transparent;
  cursor:pointer;
  font-weight:900;
  display:flex;
  align-items:center;
  justify-content:center;
  margin:0 auto 14px;
}
.btn.blue{
  border:2px solid var(--blue);
  color:#fff;
}
.btn.solid{
  background:var(--green);
  border-color:rgba(0,0,0,.18);
  color:#fff;
}
.row{
  width:min(540px, 94vw);
  margin:4px auto 14px;
  display:flex;
  justify-content:space-between;
  font-weight:800;
}
.linkBtn{
  background:transparent;
  border:0;
  color:#0b4bd6;
  font-weight:900;
  cursor:pointer;
  padding:0;
}
.hr{
  width:min(540px, 94vw);
  margin:10px auto 12px;
  display:flex;
  align-items:center;
  gap:12px;
  color:rgba(255,255,255,.45);
  font-weight:900;
  font-size:12px;
}
.hr:before,.hr:after{
  content:"";
  height:1px;
  background:rgba(255,255,255,.35);
  flex:1;
}
.googleBtn{
  background:#fff;
  color:#333;
  border:2px solid rgba(0,0,0,.45);
  gap:10px;
}
.gIcon{
  width:20px; height:20px;
  border-radius:50%;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
}
.small{
  color:rgba(255,255,255,.35);
  font-size:11px;
}
.otpHint{
  color:rgba(255,255,255,.7);
  margin:0 auto 10px;
  width:min(540px, 94vw);
  font-weight:700;
  font-size:12px;
}
.otpRow{
  display:flex;
  gap:8px;
  justify-content:center;
  margin:10px 0 18px;
}
.otpBox{
  width:36px;
  height:36px;
  border-radius:10px;
  border:0;
  text-align:center;
  font-weight:900;
  font-size:16px;
  outline:none;
}
.err{
  width:min(540px, 94vw);
  margin:0 auto 10px;
  color:#7f1d1d;
  font-weight:900;
  background:rgba(255,255,255,.75);
  border-radius:12px;
  padding:8px 10px;
  text-align:left;
}
.modalOverlay{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.12);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:18px;
}
.modal{
  width:min(520px, 92vw);
  background:rgba(255,255,255,.96);
  border-radius:18px;
  box-shadow:0 12px 36px rgba(0,0,0,.18);
  padding:22px;
  text-align:center;
}
.checkWrap{
  width:78px;
  height:78px;
  border-radius:999px;
  margin:0 auto 12px;
  background:rgba(34,197,94,.18);
  display:flex;
  align-items:center;
  justify-content:center;
}
.checkInner{
  width:54px;
  height:54px;
  border-radius:999px;
  background:rgba(34,197,94,.9);
  color:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
  font-size:20px;
}
.modalTitle{ font-weight:900; font-size:16px; }
.modalDesc{ margin-top:6px; opacity:.7; font-size:12px; }
`;
