import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Save, Loader2, UserRound, School, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DISTRICTS } from "@/lib/mock-data";
import Footer from "@/components/Footer";

const accountTypes = [
  { value: "individual", label: "Individual", icon: UserRound },
  { value: "school", label: "School", icon: School },
  { value: "business", label: "Business", icon: Building2 },
] as const;

export default function Profile() {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({ full_name: "", phone: "", district: "", account_type: "individual" });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        district: profile.district || "",
        account_type: (profile as any).account_type || "individual",
      });
      setLoaded(true);
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name.trim()) { toast.error("Name is required"); return; }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        district: form.district || null,
        account_type: form.account_type,
      })
      .eq("user_id", user.id);

    if (error) toast.error(error.message);
    else toast.success("Profile updated successfully");
    setSaving(false);
  };

  if (!loaded) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-8 max-w-lg flex-1">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <User className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-display font-bold text-foreground">Profile Settings</h1>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-telecom">
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-foreground font-medium">{user?.email}</p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label className="text-foreground mb-3 block">Account Type</Label>
                <RadioGroup
                  value={form.account_type}
                  onValueChange={(val) => setForm({ ...form, account_type: val })}
                  className="grid grid-cols-3 gap-2"
                >
                  {accountTypes.map(({ value, label, icon: Icon }) => (
                    <Label
                      key={value}
                      htmlFor={`profile-type-${value}`}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                        form.account_type === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-muted-foreground/40"
                      }`}
                    >
                      <RadioGroupItem value={value} id={`profile-type-${value}`} className="sr-only" />
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="full_name">
                  {form.account_type === "individual" ? "Full Name" : form.account_type === "school" ? "School Name" : "Business Name"}
                </Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Your name"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+266 ..."
                />
              </div>

              <div>
                <Label htmlFor="district">District</Label>
                <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
                  <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
