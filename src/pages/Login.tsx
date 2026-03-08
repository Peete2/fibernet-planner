import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wifi, Mail, Lock, User, Eye, EyeOff, Building2, School, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const accountTypes = [
  { value: "individual", label: "Individual", icon: UserRound },
  { value: "school", label: "School", icon: School },
  { value: "business", label: "Business", icon: Building2 },
] as const;

export default function Login() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", accountType: "individual" });

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
    <div className="min-h-screen flex items-center justify-center hero-gradient px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Wifi className="w-7 h-7 text-secondary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-primary-foreground">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-primary-foreground/60 text-sm mt-1">
            ETL Fiber Portal
          </p>
        </div>

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
                          ? "border-secondary bg-secondary/10 text-secondary"
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
            <Label htmlFor="password" className="text-foreground">Password</Label>
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

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-secondary hover:underline"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>

        <p className="text-center mt-4">
          <Link to="/" className="text-primary-foreground/50 text-xs hover:text-primary-foreground/80">
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}