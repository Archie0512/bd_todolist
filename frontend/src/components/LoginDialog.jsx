/**
 * 登录对话框
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/auth-store.js";
import { ShimmerButton } from "./react-bits/ShimmerButton.jsx";
import { X } from "lucide-react";

export function LoginDialog() {
  const { t } = useTranslation();
  const {
    showLoginDialog,
    loginEmail,
    loginPassword,
    loginError,
    setLoginEmail,
    setLoginPassword,
    setShowLoginDialog,
    login,
  } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  if (!showLoginDialog) return null;

  const handleLogin = async () => {
    setSubmitting(true);
    await login();
    setSubmitting(false);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowLoginDialog(false);
    }
  };

  return createPortal(
    <div
      className="dialog-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="login-dialog rounded-lg p-6 w-80 bg-bg-2 border border-bg-4 shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("header.login")}</h2>
          <button
            type="button"
            onClick={() => setShowLoginDialog(false)}
            className="p-1 rounded hover:bg-bg-3 transition-colors"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        {loginError && (
          <p className="login-error text-sm text-danger mb-3 p-2 rounded bg-danger/10">
            {loginError}
          </p>
        )}

        <div className="space-y-3">
          <input
            type="email"
            placeholder={t("header.login") + " - email"}
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="input w-full"
            autoComplete="email"
          />
          <input
            type="password"
            placeholder={t("header.login") + " - password"}
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
            className="input w-full"
            autoComplete="current-password"
          />
        </div>

        <div className="flex gap-2 mt-5 justify-end">
          <button
            type="button"
            onClick={() => setShowLoginDialog(false)}
            className="btn btn--ghost"
          >
            {t("common.cancel")}
          </button>
          <ShimmerButton
            onClick={handleLogin}
            disabled={submitting || !loginEmail || !loginPassword}
            className="px-4 py-1.5 text-sm"
          >
            {submitting ? t("common.loading") : t("header.login")}
          </ShimmerButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
