import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Wifi, Mail, Lock, User, Eye, EyeOff, Building2, School, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

const accountTypes = [
  { value: "individual", label: "Individual", icon: UserRound },
  { value: "school", label: "School", icon: School },
  { value: "business", label: "Business", icon: Building2 },
] as const;

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(params.get("mode") === "signup");
  useEffect(() => {
    if (params.get("mode") === "signup") setIsSignUp(true);
  }, [params]);
  const [isForgot, setIsForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", accountType: "individual" });

  const handleOAuth = async (provider: "google" | "apple") => {
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
        extraParams: provider === "google" ? { prompt: "select_account" } : {},
      });
      if (result.redirected) return;
      if (result.error) {
        const msg = result.error.message || "";
        // User closed the popup or cancelled — don't show a scary error
        if (/closed|cancel|popup|denied/i.test(msg)) return;
        throw new Error(msg || "Sign-in failed");
      }
      // Confirm session actually landed before navigating
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Session not established. Please try again.");
      toast.success("Welcome!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Sign-in failed");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) { toast.error("Enter your email address"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent! Check your email.");
      setIsForgot(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { full_name: form.fullName, account_type: form.accountType },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary-foreground flex items-center justify-center mx-auto mb-4">
            <Wifi className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-primary-foreground">
            {isForgot ? "Reset Password" : isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-primary-foreground/60 text-sm mt-1">
            {isForgot ? "Enter your email to receive a reset link" : "ETL Fiber Portal"}
          </p>
        </div>

        {isForgot ? (
          <form onSubmit={handleForgotPassword} className="bg-card border border-border rounded-xl p-6 shadow-telecom space-y-4">
            <div>
              <Label htmlFor="reset-email" className="text-foreground">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <div className="text-center">
              <button type="button" onClick={() => setIsForgot(false)} className="text-sm text-primary hover:underline">
                ← Back to sign in
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-telecom space-y-4">
            {isSignUp && (
              <>
                <div>
                  <Label className="text-foreground mb-3 block">Account Type</Label>
                  <RadioGroup
                    value={form.accountType}
                    onValueChange={(val) => setForm({ ...form, accountType: val })}
                    className="grid grid-cols-3 gap-2"
                  >
                    {accountTypes.map(({ value, label, icon: Icon }) => (
                      <Label
                        key={value}
                        htmlFor={`type-${value}`}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                          form.accountType === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-muted-foreground/40"
                        }`}
                      >
                        <RadioGroupItem value={value} id={`type-${value}`} className="sr-only" />
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-medium">{label}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="fullName" className="text-foreground">
                    {form.accountType === "individual" ? "Full Name" : form.accountType === "school" ? "School Name" : "Business Name"}
                  </Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      placeholder={form.accountType === "individual" ? "Thabo Mokhesi" : form.accountType === "school" ? "Maseru High School" : "ETL Solutions Ltd"}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">Password</Label>
                {!isSignUp && (
                  <button type="button" onClick={() => setIsForgot(true)} className="text-xs text-primary hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => handleOAuth("google")} disabled={loading}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                Google
              </Button>
              <Button type="button" variant="outline" onClick={() => handleOAuth("apple")} disabled={loading}>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                Apple
              </Button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline"
              >
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        )}

        <p className="text-center mt-4">
          <Link to="/" className="text-primary-foreground/50 text-xs hover:text-primary-foreground/80">
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
