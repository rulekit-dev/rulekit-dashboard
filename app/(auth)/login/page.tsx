"use client";

import { useState, useEffect, useRef, CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { login, verifyOtp } from "@/lib/api";
import Button from "@/components/ui/Button";

type Tab = "admin" | "user";
type UserStep = "email" | "otp";

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
    padding: "11px 14px",
    border: `1px solid ${focused ? "var(--orange)" : "var(--border-med)"}`,
    borderRadius: "10px",
    outline: "none",
    boxShadow: focused ? "0 0 0 3px var(--orange-dim)" : "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    color: "var(--ink)",
    background: "var(--white)",
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
      {/* Two-panel card */}
      <div
        style={{
          display: "flex",
          width: "100%",
          maxWidth: "960px",
          minHeight: "620px",
          background: "var(--white)",
          borderRadius: "20px",
          border: "1px solid var(--border)",
          boxShadow:
            "0 1px 3px rgba(28,28,26,0.04), 0 12px 48px rgba(28,28,26,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Left panel — illustration */}
        <div
          style={{
            width: "460px",
            flexShrink: 0,
            position: "relative",
            overflow: "hidden",
            background: "#F05A28",
          }}
        >
          <Image
            src="/rulekit_login_panel.svg"
            alt="RuleKit"
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        </div>

        {/* Right panel — form */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "48px 40px",
          }}
        >
          {/* Logo */}
          <div style={{ marginBottom: "32px" }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: "24px",
                color: "var(--ink)",
              }}
            >
              rulekit<span style={{ color: "var(--orange)" }}>.</span>
            </span>
          </div>

          {/* Tab switcher */}
          <div
            style={{
              display: "flex",
              background: "var(--surface)",
              padding: "3px",
              borderRadius: "10px",
              marginBottom: "28px",
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
                    fontSize: "13px",
                    fontWeight: active ? 600 : 500,
                    padding: "8px 0",
                    borderRadius: "8px",
                    cursor: "pointer",
                    border: "none",
                    background: active
                      ? "var(--white)"
                      : hovered
                        ? "rgba(28,28,26,0.04)"
                        : "transparent",
                    color: active ? "var(--ink)" : "var(--ink-muted)",
                    boxShadow: active
                      ? "0 1px 3px rgba(28,28,26,0.08)"
                      : "none",
                    transition: "all 0.15s ease",
                    textTransform: "capitalize",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* OTP heading — only show when entering code */}
          {tab === "user" && userStep === "otp" && (
            <div style={{ marginBottom: "24px" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "18px",
                  color: "var(--ink)",
                  marginBottom: "6px",
                }}
              >
                Enter verification code
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--ink-muted)",
                  lineHeight: 1.5,
                }}
              >
                Code sent to <span style={{ fontFamily: "var(--font-dm-mono)", fontSize: "12px", color: "var(--ink)" }}>{userEmail}</span>
              </div>
            </div>
          )}

          {/* Admin form */}
          {tab === "admin" && (
            <form onSubmit={handleAdminLogin}>
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--ink-muted)",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
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
              <Button
                variant="primary"
                size="lg"
                type="submit"
                loading={adminLoading}
                style={{ width: "100%" }}
              >
                Sign in
              </Button>
              {adminError && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#DC2626",
                    marginTop: "14px",
                    padding: "10px 12px",
                    background: "#FEF2F2",
                    borderRadius: "8px",
                    border: "1px solid #FECACA",
                  }}
                >
                  {adminError}
                </div>
              )}
            </form>
          )}

          {/* User email step */}
          {tab === "user" && userStep === "email" && (
            <form onSubmit={handleSendCode}>
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--ink-muted)",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
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
              <Button
                variant="primary"
                size="lg"
                type="submit"
                loading={userLoading}
                style={{ width: "100%" }}
              >
                Send code
              </Button>
              {userError && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#DC2626",
                    marginTop: "14px",
                    padding: "10px 12px",
                    background: "#FEF2F2",
                    borderRadius: "8px",
                    border: "1px solid #FECACA",
                  }}
                >
                  {userError}
                </div>
              )}
            </form>
          )}

          {/* User OTP step */}
          {tab === "user" && userStep === "otp" && (
            <form onSubmit={handleVerifyOtp}>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                  marginBottom: "24px",
                }}
              >
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
              <Button
                variant="primary"
                size="lg"
                type="submit"
                loading={userLoading}
                style={{ width: "100%" }}
              >
                Verify
              </Button>
              {userError && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#DC2626",
                    marginTop: "14px",
                    padding: "10px 12px",
                    background: "#FEF2F2",
                    borderRadius: "8px",
                    border: "1px solid #FECACA",
                  }}
                >
                  {userError}
                </div>
              )}
              <button
                type="button"
                onClick={handleResendCode}
                onMouseEnter={() => setResendHovered(true)}
                onMouseLeave={() => setResendHovered(false)}
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: resendHovered ? "var(--orange)" : "var(--ink-muted)",
                  cursor: "pointer",
                  textAlign: "center",
                  background: "none",
                  border: "none",
                  padding: 0,
                  marginTop: "16px",
                  display: "block",
                  width: "100%",
                  transition: "color 0.15s",
                }}
              >
                Resend code
              </button>
            </form>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: "auto",
              paddingTop: "32px",
              fontSize: "12px",
              color: "var(--ink-subtle)",
            }}
          >
            Powered by{" "}
            <a
              href="https://rulekit.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--ink-muted)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              RuleKit
            </a>
          </div>
        </div>
      </div>
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
        width: "46px",
        height: "54px",
        textAlign: "center",
        fontFamily: "var(--font-dm-mono)",
        fontWeight: 500,
        fontSize: "22px",
        border: focused ? "1px solid var(--orange)" : "1px solid var(--border-med)",
        borderRadius: "10px",
        outline: "none",
        boxShadow: focused ? "0 0 0 3px var(--orange-dim)" : "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
        color: "var(--ink)",
        background: "var(--white)",
      }}
    />
  );
}
