import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, User, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    inviteCode: "",
    role: "main_admin",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.functions.invoke("admin-signup", {
          body: {
            email: form.email,
            password: form.password,
            fullName: form.fullName,
            inviteCode: form.inviteCode,
            role: form.role,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success("Admin account created! You can now sign in.");
        setIsSignUp(false);
        setForm({ ...form, inviteCode: "", password: "" });
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success("Welcome, Admin!");
        const uid = signInData.user?.id;
        let target = "/admin";
        if (uid) {
          const { data: rolesData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", uid);
          const roles = (rolesData || []).map((r: any) => r.role);
          if (roles.includes("main_admin") || roles.includes("admin")) target = "/admin";
          else if (roles.includes("moderator")) target = "/moderator";
          else if (roles.includes("service_delivery")) target = "/service-delivery";
          else if (roles.includes("technical")) target = "/technical";
          else if (roles.includes("billing")) target = "/billing";
          else if (roles.includes("technician")) target = "/tech";
        }
        navigate(target);
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
          <div className="w-14 h-14 rounded-xl bg-destructive/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold text-primary-foreground">
            {isSignUp ? "Admin Registration" : "Admin Sign In"}
          </h1>
          <p className="text-primary-foreground/60 text-sm mt-1">
            ETL Fiber — Admin Portal
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 shadow-telecom space-y-4"
        >
          {isSignUp && (
            <>
              <div>
                <Label htmlFor="fullName" className="text-foreground">
                  Full Name
                </Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    placeholder="Admin Name"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="inviteCode" className="text-foreground">
                  Invite Code
                </Label>
                <div className="relative mt-1">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="inviteCode"
                    value={form.inviteCode}
                    onChange={(e) =>
                      setForm({ ...form, inviteCode: e.target.value })
                    }
                    placeholder="Enter admin invite code"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="role" className="text-foreground">
                  Staff Role
                </Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v })}
                >
                  <SelectTrigger id="role" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main_admin">Main Admin (full access)</SelectItem>
                    <SelectItem value="moderator">Moderator — credit vetting</SelectItem>
                    <SelectItem value="service_delivery">Service Delivery — advisory</SelectItem>
                    <SelectItem value="technical">Technical — provisioning</SelectItem>
                    <SelectItem value="billing">Billing — payments</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Role determines which dashboard and applications you'll see.
                </p>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="email" className="text-foreground">
              Email
            </Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@etlfiber.co.ls"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-foreground">
              Password
            </Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
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
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading
              ? "Loading..."
              : isSignUp
              ? "Register as Admin"
              : "Sign In"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp
                ? "Already an admin? Sign in"
                : "Register new admin account"}
            </button>
          </div>
        </form>

        <p className="text-center mt-4">
          <Link
            to="/"
            className="text-primary-foreground/50 text-xs hover:text-primary-foreground/80"
          >
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
