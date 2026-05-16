"use client";

import { useState, useEffect, useRef, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { login, verifyOtp } from "@/lib/api";
import Button from "@/components/ui/Button";

type Tab = "admin" | "user";
type UserStep = "email" | "otp";

function Logo({ size = 28 }: { size?: number }) {
  const r = Math.round(size * (13 / 64));
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx={r * 4} fill="#111" />
      <text
        x="32" y="44"
        fontFamily="Space Grotesk, system-ui, sans-serif"
        fontWeight="700"
        fontSize="38"
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="auto"
      >R</text>
    </svg>
  );
}

/* ── Product icons ───────────────────────────────────────────────── */

function IconDashboard() {
  return (
    <svg width="13" height="13" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="9" height="9" rx="2"/>
      <rect x="12" y="1" width="9" height="9" rx="2"/>
      <rect x="1" y="12" width="9" height="9" rx="2"/>
      <rect x="12" y="12" width="9" height="9" rx="2"/>
    </svg>
  );
}

function IconRegistry() {
  return (
    <svg width="13" height="13" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="11" cy="5.5" rx="8" ry="2.5"/>
      <path d="M3 5.5v5c0 1.38 3.58 2.5 8 2.5s8-1.12 8-2.5v-5"/>
      <path d="M3 10.5v5c0 1.38 3.58 2.5 8 2.5s8-1.12 8-2.5v-5"/>
    </svg>
  );
}

function IconCLI() {
  return (
    <svg width="13" height="13" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 7.5 8.5 11 3 14.5"/>
      <line x1="12" y1="14.5" x2="19" y2="14.5"/>
    </svg>
  );
}

function IconSDK() {
  return (
    <svg width="13" height="13" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7 4.5 1.5 11 7 17.5"/>
      <polyline points="15 4.5 20.5 11 15 17.5"/>
    </svg>
  );
}

interface Product {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: { icon: string; bg: string };
}

const PRODUCTS: Product[] = [
  {
    id: "dashboard",
    icon: <IconDashboard />,
    label: "Dashboard",
    description: "Author rules visually and publish versioned bundles.",
    color: { icon: "#4361EE", bg: "rgba(67,97,238,0.15)" },
  },
  {
    id: "registry",
    icon: <IconRegistry />,
    label: "Registry",
    description: "Self-hosted service that stores and serves rule bundles.",
    color: { icon: "#D97706", bg: "rgba(217,119,6,0.15)" },
  },
  {
    id: "cli",
    icon: <IconCLI />,
    label: "CLI",
    description: "Spin up the stack and pull bundles with one command.",
    color: { icon: "#1A7F4B", bg: "rgba(26,127,75,0.15)" },
  },
  {
    id: "sdk",
    icon: <IconSDK />,
    label: "SDK",
    description: "Evaluate rules in-process. No network, sub-ms latency.",
    color: { icon: "#9B6DFF", bg: "rgba(155,109,255,0.15)" },
  },
];

function ProductTile({ product }: { product: Product }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "12px 14px",
        background: hovered ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
        transition: "background 0.15s",
        cursor: "default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "6px",
          background: "rgba(255,255,255,0.12)",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "7px",
          flexShrink: 0,
        }}
      >
        {product.icon}
      </div>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.01em", marginBottom: "2px" }}>
        {product.label}
      </div>
      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
        {product.description}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, onLogin } = useAuth();

  const [tab, setTab] = useState<Tab>("admin");
  const [tabHover, setTabHover] = useState<Tab | null>(null);

  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  const [userEmail, setUserEmail] = useState("");
  const [userStep, setUserStep] = useState<UserStep>("email");
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState("");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [resendHovered, setResendHovered] = useState(false);

  useEffect(() => {
    if (user !== null) {
      router.replace("/");
    }
  }, [user, router]);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);
    try {
      const res = await login("admin", adminPassword);
      if (res.access_token) {
        localStorage.setItem("access_token", res.access_token);
        if (res.refresh_token) {
          localStorage.setItem("refresh_token", res.refresh_token);
        }
        onLogin();
        router.push("/");
      } else {
        setAdminError(res.message || "Login failed");
      }
    } catch (err: unknown) {
      setAdminError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setUserError("");
    setUserLoading(true);
    try {
      const res = await login(userEmail);
      if (res.message) {
        setUserStep("otp");
        setOtpValues(["", "", "", "", "", ""]);
      } else if (res.access_token && res.refresh_token) {
        localStorage.setItem("access_token", res.access_token);
        localStorage.setItem("refresh_token", res.refresh_token);
        onLogin();
        router.push("/");
      } else {
        setUserStep("otp");
        setOtpValues(["", "", "", "", "", ""]);
      }
    } catch (err: unknown) {
      setUserError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setUserLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otpValues.join("");
    if (code.length !== 6) {
      setUserError("Please enter all 6 digits");
      return;
    }
    setUserError("");
    setUserLoading(true);
    try {
      const res = await verifyOtp(userEmail, code);
      localStorage.setItem("access_token", res.access_token);
      localStorage.setItem("refresh_token", res.refresh_token);
      onLogin();
      router.push("/");
    } catch (err: unknown) {
      setUserError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setUserLoading(false);
    }
  }

  async function handleResendCode() {
    setUserError("");
    setUserLoading(true);
    try {
      await login(userEmail);
      setOtpValues(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch (err: unknown) {
      setUserError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setUserLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const next = [...otpValues];
    next[index] = value;
    setOtpValues(next);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otpValues];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || "";
    }
    setOtpValues(next);
    const focusIndex = Math.min(pasted.length, 5);
    otpRefs.current[focusIndex]?.focus();
  }

  const inputStyle = (focused: boolean): CSSProperties => ({
    width: "100%",
    fontSize: "13px",
    padding: "10px 13px",
    border: `1px solid ${focused ? "var(--ink)" : "var(--border-med)"}`,
    borderRadius: "9px",
    outline: "none",
    boxShadow: focused ? "0 0 0 3px rgba(28,28,26,0.08)" : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    color: "var(--ink)",
    background: "var(--white)",
    fontFamily: "var(--font-sans)",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          maxWidth: "900px",
          minHeight: "600px",
          background: "var(--white)",
          borderRadius: "18px",
          border: "1px solid var(--border-med)",
          boxShadow: "0 1px 3px rgba(28,28,26,0.04), 0 12px 48px rgba(28,28,26,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Left panel — dark brand */}
        <div
          style={{
            width: "420px",
            flexShrink: 0,
            background: "var(--ink)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "32px",
            padding: "40px 36px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle grid pattern */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.07, pointerEvents: "none" }}
          >
            <defs>
              <pattern id="login-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#fff" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-grid)" />
          </svg>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "48px" }}>
              <svg width="26" height="26" viewBox="0 0 64 64">
                <rect width="64" height="64" rx="13" fill="rgba(255,255,255,0.12)" />
                <text x="32" y="44" fontFamily="Space Grotesk, system-ui" fontWeight="700" fontSize="38" fill="#fff" textAnchor="middle" dominantBaseline="auto">R</text>
              </svg>
              <span style={{ fontWeight: 700, fontSize: "15px", color: "rgba(255,255,255,0.9)", letterSpacing: "-0.03em" }}>rulekit</span>
            </div>

            <h2 style={{ fontSize: "26px", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "14px" }}>
              Change rules,<br />not code.
            </h2>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.65, maxWidth: "280px" }}>
              Define business rules visually. Version and publish them centrally. Evaluate locally.
            </p>
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gridAutoRows: "1fr",
                gap: "1px",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {PRODUCTS.map((p) => (
                <ProductTile key={p.id} product={p} />
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "44px 40px",
          }}
        >
          {/* Logo mark on mobile / small right panel */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Logo size={26} />
              <span style={{ fontWeight: 700, fontSize: "17px", color: "var(--ink)", letterSpacing: "-0.03em" }}>
                Sign in
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "5px" }}>
              Choose how you want to continue.
            </p>
          </div>

          {/* Tab switcher */}
          <div
            style={{
              display: "flex",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              padding: "3px",
              borderRadius: "10px",
              marginBottom: "24px",
            }}
          >
            {(["admin", "user"] as Tab[]).map((t) => {
              const active = tab === t;
              const hovered = tabHover === t && !active;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    setAdminError("");
                    setUserError("");
                  }}
                  onMouseEnter={() => setTabHover(t)}
                  onMouseLeave={() => setTabHover(null)}
                  style={{
                    flex: 1,
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    fontWeight: active ? 600 : 500,
                    padding: "7px 0",
                    borderRadius: "8px",
                    cursor: "pointer",
                    border: "none",
                    background: active
                      ? "var(--white)"
                      : hovered
                        ? "rgba(28,28,26,0.03)"
                        : "transparent",
                    color: active ? "var(--ink)" : "var(--ink-muted)",
                    boxShadow: active ? "0 1px 3px rgba(28,28,26,0.08)" : "none",
                    transition: "all 0.12s ease",
                    textTransform: "capitalize",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* OTP heading */}
          {tab === "user" && userStep === "otp" && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontWeight: 700, fontSize: "16px", color: "var(--ink)", marginBottom: "4px", letterSpacing: "-0.02em" }}>
                Enter verification code
              </div>
              <div style={{ fontSize: "13px", color: "var(--ink-muted)", lineHeight: 1.5 }}>
                Code sent to{" "}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--ink)" }}>{userEmail}</span>
              </div>
            </div>
          )}

          {/* Admin form */}
          {tab === "admin" && (
            <form onSubmit={handleAdminLogin}>
              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--ink-muted)",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  style={inputStyle(passwordFocused)}
                />
              </div>
              <Button variant="primary" size="lg" type="submit" loading={adminLoading} style={{ width: "100%" }}>
                Sign in
              </Button>
              {adminError && <ErrorBox>{adminError}</ErrorBox>}
            </form>
          )}

          {/* User email step */}
          {tab === "user" && userStep === "email" && (
            <form onSubmit={handleSendCode}>
              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--ink-muted)",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="you@example.com"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  style={inputStyle(emailFocused)}
                />
              </div>
              <Button variant="primary" size="lg" type="submit" loading={userLoading} style={{ width: "100%" }}>
                Send code
              </Button>
              {userError && <ErrorBox>{userError}</ErrorBox>}
            </form>
          )}

          {/* User OTP step */}
          {tab === "user" && userStep === "otp" && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "20px" }}>
                {otpValues.map((val, i) => (
                  <OtpCell
                    key={i}
                    value={val}
                    index={i}
                    inputRef={(el) => { otpRefs.current[i] = el; }}
                    onChange={handleOtpChange}
                    onKeyDown={handleOtpKeyDown}
                    onPaste={handleOtpPaste}
                  />
                ))}
              </div>
              <Button variant="primary" size="lg" type="submit" loading={userLoading} style={{ width: "100%" }}>
                Verify
              </Button>
              {userError && <ErrorBox>{userError}</ErrorBox>}
              <button
                type="button"
                onClick={handleResendCode}
                onMouseEnter={() => setResendHovered(true)}
                onMouseLeave={() => setResendHovered(false)}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: resendHovered ? "var(--ink)" : "var(--ink-muted)",
                  cursor: "pointer",
                  textAlign: "center",
                  background: "none",
                  border: "none",
                  padding: 0,
                  marginTop: "14px",
                  display: "block",
                  width: "100%",
                  transition: "color 0.12s",
                }}
              >
                Resend code
              </button>
            </form>
          )}

          <div style={{ marginTop: "auto", paddingTop: "28px", fontSize: "11px", color: "var(--ink-subtle)" }}>
            Powered by{" "}
            <a
              href="https://rulekit.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--ink-muted)", fontWeight: 600, textDecoration: "none" }}
            >
              RuleKit
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "13px",
        color: "var(--red)",
        marginTop: "12px",
        padding: "10px 12px",
        background: "var(--red-dim)",
        borderRadius: "8px",
        border: "1px solid rgba(201,42,42,0.18)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </div>
  );
}

function OtpCell({
  value,
  index,
  inputRef,
  onChange,
  onKeyDown,
  onPaste,
}: {
  value: string;
  index: number;
  inputRef: (el: HTMLInputElement | null) => void;
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={value}
      onChange={(e) => onChange(index, e.target.value)}
      onKeyDown={(e) => onKeyDown(index, e)}
      onPaste={onPaste}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "44px",
        height: "52px",
        textAlign: "center",
        fontFamily: "var(--font-mono)",
        fontWeight: 500,
        fontSize: "20px",
        border: focused ? "1px solid var(--ink)" : "1px solid var(--border-med)",
        borderRadius: "9px",
        outline: "none",
        boxShadow: focused ? "0 0 0 3px rgba(28,28,26,0.08)" : "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
        color: "var(--ink)",
        background: "var(--white)",
      }}
    />
  );
}
