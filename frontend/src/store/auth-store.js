/**
 * 认证 store：管理登录状态、登录对话框
 */
import { create } from "zustand";
import {
  signIn as supaSignIn,
  signOut as supaSignOut,
  isAdmin as supaIsAdmin,
  getCurrentUserEmail,
} from "../lib/supabase-client";

export const useAuthStore = create((set, get) => ({
  isAdmin: false,
  userEmail: null,
  showLoginDialog: false,
  loginEmail: "",
  loginPassword: "",
  loginError: "",

  // 初始化时检查登录状态
  initAuth: async () => {
    try {
      const admin = await supaIsAdmin();
      const email = admin ? await getCurrentUserEmail() : null;
      set({ isAdmin: admin, userEmail: email });
    } catch {
      set({ isAdmin: false, userEmail: null });
    }
  },

  setShowLoginDialog: (show) => set({ showLoginDialog: show, loginError: "" }),
  setLoginEmail: (email) => set({ loginEmail: email }),
  setLoginPassword: (password) => set({ loginPassword: password }),
  setLoginError: (err) => set({ loginError: err }),

  login: async () => {
    const { loginEmail, loginPassword } = get();
    set({ loginError: "" });
    try {
      await supaSignIn(loginEmail, loginPassword);
      const email = await getCurrentUserEmail();
      set({
        isAdmin: true,
        userEmail: email,
        showLoginDialog: false,
        loginEmail: "",
        loginPassword: "",
        loginError: "",
      });
      return true;
    } catch (err) {
      set({ loginError: err.message || "登录失败" });
      return false;
    }
  },

  logout: async () => {
    await supaSignOut();
    set({ isAdmin: false, userEmail: null });
  },
}));
