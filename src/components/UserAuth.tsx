import React, { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser 
} from "firebase/auth";
import { doc, setDoc, getDocs, collection } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { 
  User, 
  LogIn, 
  LogOut, 
  Mail, 
  Lock, 
  Loader2, 
  X, 
  Cloud, 
  Database,
  Activity,
  Shield,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UserAuthProps {
  onUserChanged: (user: FirebaseUser | null) => void;
  savedPipelinesCount: number;
  queryHistoryCount: number;
}

export function UserAuth({ onUserChanged, savedPipelinesCount, queryHistoryCount }: UserAuthProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  
  const [loading, setLoading] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string>("");
  const [successText, setSuccessText] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      onUserChanged(user);
    });
    return unsubscribe;
  }, [onUserChanged]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorText("Please fill in all credentials.");
      return;
    }
    if (password.length < 6) {
      setErrorText("Password must be at least 6 characters.");
      return;
    }
    if (isRegister && !displayName.trim()) {
      setErrorText("Please provide a name for registration.");
      return;
    }

    setLoading(true);
    setErrorText("");
    setSuccessText("");

    try {
      if (isRegister) {
        // Register user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update user profile with name
        await updateProfile(user, {
          displayName: displayName
        });

        // Save user profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
          id: user.uid,
          email: user.email || email,
          displayName: displayName,
          createdAt: new Date().toISOString()
        });

        setSuccessText("Account registered successfully! Synchronizing workspace...");
        setTimeout(() => {
          setShowAuthModal(false);
          setSuccessText("");
        }, 1500);
      } else {
        // Sign in user
        await signInWithEmailAndPassword(auth, email, password);
        setSuccessText("Logged in successfully! Loading your secure data...");
        setTimeout(() => {
          setShowAuthModal(false);
          setSuccessText("");
        }, 1200);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = "Authentication failed. Please verify credentials.";
      if (err.code === "auth/email-already-in-use") {
        msg = "The email address is already in use.";
      } else if (err.code === "auth/invalid-credential") {
        msg = "Invalid email or password. Please try again.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password is too weak.";
      } else if (err.message) {
        msg = err.message;
      }
      setErrorText(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowDropdown(false);
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  const getInitials = (user: FirebaseUser) => {
    if (user.displayName) {
      const parts = user.displayName.split(" ");
      if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    return user.email ? user.email.slice(0, 2).toUpperCase() : "US";
  };

  return (
    <div id="user-auth-root" className="relative flex items-center">
      {currentUser ? (
        // Authenticated user state
        <div className="flex items-center gap-3">
          {/* Connection status badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-mono">
            <Cloud className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Sync Active</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-9 h-9 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shadow-lg shadow-indigo-500/10 hover:border-indigo-400/60 transition-all cursor-pointer"
            >
              {getInitials(currentUser)}
            </button>

            {/* Micro Dot Status */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowDropdown(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-4"
                  >
                    {/* User info header */}
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-sm font-bold text-indigo-300">
                        {getInitials(currentUser)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-200 text-xs truncate">
                          {currentUser.displayName || "Biotech Member"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono truncate">
                          {currentUser.email}
                        </span>
                      </div>
                    </div>

                    {/* Stats info */}
                    <div className="flex flex-col gap-2 mb-4 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/40 text-[11px] text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-blue-500" />
                          Saved Pipelines
                        </span>
                        <span className="font-mono text-slate-200 font-bold">{savedPipelinesCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-500" />
                          Query History
                        </span>
                        <span className="font-mono text-slate-200 font-bold">{queryHistoryCount}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 border-t border-slate-800/50 pt-1 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Shield className="w-3 h-3 text-indigo-400" />
                          Data Security
                        </span>
                        <span className="font-mono text-indigo-400">AES-256</span>
                      </div>
                    </div>

                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="w-full py-2 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-900/50 text-slate-300 hover:text-rose-400 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out Account
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="hidden xl:flex flex-col text-[11px]">
            <span className="font-bold text-slate-300 leading-tight">
              {currentUser.displayName || "Biotech Member"}
            </span>
            <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Secure Synced
            </span>
          </div>
        </div>
      ) : (
        // Unauthenticated sign-in trigger
        <button
          onClick={() => {
            setErrorText("");
            setSuccessText("");
            setShowAuthModal(true);
          }}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Login / Register</span>
        </button>
      )}

      {/* Modern Authentication Modal Overlay */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!loading) setShowAuthModal(false);
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">
                    BioHelix Intelligence
                  </h3>
                  <h2 className="text-base font-extrabold text-slate-100 mt-0.5">
                    {isRegister ? "Create Research Account" : "Secure Member Login"}
                  </h2>
                </div>
                <button
                  disabled={loading}
                  onClick={() => setShowAuthModal(false)}
                  className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-slate-300 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleAuthSubmit} className="p-5 flex flex-col gap-4">
                {/* Mode Selector */}
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(false);
                      setErrorText("");
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      !isRegister 
                        ? "bg-slate-800 text-indigo-400 shadow-inner" 
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setErrorText("");
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      isRegister 
                        ? "bg-slate-800 text-indigo-400 shadow-inner" 
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Register Account
                  </button>
                </div>

                {/* Status alerts */}
                <AnimatePresence mode="wait">
                  {errorText && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-start gap-2 overflow-hidden"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorText}</span>
                    </motion.div>
                  )}

                  {successText && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-start gap-2 overflow-hidden"
                    >
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{successText}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Display Name Input (Only Register) */}
                {isRegister && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-600" />
                      <input
                        type="text"
                        placeholder="Dr. Alexander Fleming"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={loading}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg py-2 pl-9 pr-4 text-xs text-slate-200 placeholder:text-slate-600 transition-all font-sans"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Email Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-600" />
                    <input
                      type="email"
                      placeholder="researcher@biohelix.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg py-2 pl-9 pr-4 text-xs text-slate-200 placeholder:text-slate-600 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-600" />
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-lg py-2 pl-9 pr-4 text-xs text-slate-200 placeholder:text-slate-600 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Processing Setup...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5 text-white" />
                      <span>{isRegister ? "Complete Registration" : "Authenticate Session"}</span>
                    </>
                  )}
                </button>

                {/* Footer terms */}
                <p className="text-[9px] text-slate-600 text-center leading-normal mt-1 font-mono">
                  All synchronization is protected under TLS 1.3 encryption rules. 
                  Saved data stays isolated and secure within your encrypted vault.
                </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
