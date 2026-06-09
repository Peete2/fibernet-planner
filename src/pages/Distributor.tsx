import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Copy, CheckCircle2, Clock, XCircle, Wallet, Users, LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Footer from "@/components/Footer";

interface Distributor {
  id: string;
  business_name: string;
  contact_name: string;
  phone: string | null;
  email: string | null;
  district: string | null;
  code: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  commission_rate: number;
  commission_months: number;
  notes: string | null;
  created_at: string;
}

interface Commission {
  id: string;
  application_id: string;
  month_index: number;
  plan_price: number;
  commission_amount: number;
  due_date: string | null;
  paid: boolean;
  paid_at: string | null;
}

function randomCode(name: string) {
  const slug = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "ETL";
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${slug}${suffix}`;
}

export default function Distributor() {
  const { user, profile, loading: authLoading } = useAuth();
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [referrals, setReferrals] = useState<{ id: string; ref_code: string; customer_name: string; status: string; stage: string; service: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    business_name: "",
    contact_name: profile?.full_name || "",
    phone: profile?.phone || "",
    email: user?.email || "",
    district: profile?.district || "",
    notes: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("distributors")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setDistributor(data ?? null);
      if (data) {
        const [{ data: comm }, { data: refs }] = await Promise.all([
          (supabase as any).from("distributor_commissions").select("*").eq("distributor_id", data.id).order("due_date", { ascending: true }),
          (supabase as any).from("applications").select("id, ref_code, customer_name, status, stage, service").eq("distributor_id", data.id).order("created_at", { ascending: false }),
        ]);
        setCommissions(comm || []);
        setReferrals(refs || []);
      }
      setLoading(false);
    })();
  }, [user, authLoading]);

  const totals = useMemo(() => {
    const earned = commissions.reduce((s, c) => s + Number(c.commission_amount || 0), 0);
    const paid = commissions.filter((c) => c.paid).reduce((s, c) => s + Number(c.commission_amount || 0), 0);
    const pending = earned - paid;
    return { earned, paid, pending, referrals: referrals.length };
  }, [commissions, referrals]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please sign in or register first"); return; }
    if (!form.business_name.trim() || !form.contact_name.trim()) {
      toast.error("Business name and contact name are required"); return;
    }
    setSubmitting(true);
    try {
      const code = randomCode(form.business_name);
      const { data, error } = await (supabase as any)
        .from("distributors")
        .insert({
          user_id: user.id,
          business_name: form.business_name.trim(),
          contact_name: form.contact_name.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          district: form.district.trim() || null,
          notes: form.notes.trim() || null,
          code,
          status: "pending",
        })
        .select("*")
        .single();
      if (error) throw error;
      setDistributor(data);
      toast.success("Application submitted! Waiting for Main Admin approval.");
    } catch (err: any) {
      toast.error(err.message || "Failed to apply");
    } finally { setSubmitting(false); }
  };

  const referralLink = distributor ? `${window.location.origin}/apply?ref=${distributor.code}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  if (authLoading || loading) {
    return (
      <div className="pt-20 min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Not signed in → invite to register first
  if (!user) {
    return (
      <div className="pt-20 min-h-screen bg-background">
        <div className="container mx-auto px-4 py-10 max-w-2xl text-center">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">Become an ETL Distributor</h1>
          <p className="text-muted-foreground mb-6">
            Refer customers to ETL and earn <strong>10% commission</strong> for the first 3 months of every plan they subscribe to.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild><Link to="/login?mode=signup">Register</Link></Button>
            <Button variant="outline" asChild><Link to="/login">Sign In</Link></Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Already a distributor (any status) → show dashboard / status
  if (distributor) {
    const statusBadge = {
      pending:   <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending approval</Badge>,
      approved:  <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>,
      rejected:  <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>,
      suspended: <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Suspended</Badge>,
    }[distributor.status];

    return (
      <div className="pt-20 min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold">Distributor Dashboard</h1>
                <p className="text-muted-foreground">{distributor.business_name}</p>
              </div>
              {statusBadge}
            </div>

            {distributor.status !== "approved" && (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                {distributor.status === "pending" && "Your application is pending Main Admin approval. You'll be able to share your referral link once approved."}
                {distributor.status === "rejected" && "Your application was rejected. Please contact ETL support."}
                {distributor.status === "suspended" && "Your account has been suspended. Please contact ETL support."}
              </div>
            )}

            {distributor.status === "approved" && (
              <>
                {/* Referral link */}
                <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2"><LinkIcon className="w-4 h-4 text-primary" /> Your referral link</div>
                  <div className="flex gap-2">
                    <Input readOnly value={referralLink} className="font-mono text-xs" />
                    <Button onClick={copyLink} variant="outline"><Copy className="w-4 h-4 mr-1" /> Copy</Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Share this link. Every customer who completes their application through it earns you{" "}
                    <strong>{distributor.commission_rate}%</strong> for the first{" "}
                    <strong>{distributor.commission_months}</strong> months of their plan.
                  </p>
                </div>

                {/* KPIs */}
                <div className="mt-6 grid sm:grid-cols-4 gap-3">
                  <Kpi icon={Users} label="Total referrals" value={totals.referrals.toString()} />
                  <Kpi icon={Wallet} label="Total earned" value={`M ${totals.earned.toFixed(2)}`} />
                  <Kpi icon={Wallet} label="Paid out" value={`M ${totals.paid.toFixed(2)}`} />
                  <Kpi icon={Wallet} label="Pending payout" value={`M ${totals.pending.toFixed(2)}`} />
                </div>

                {/* Referrals table */}
                <h2 className="font-display font-semibold text-xl mt-8 mb-3">Your referrals</h2>
                <div className="rounded-xl border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left">
                        <th className="p-3">Ref</th><th className="p-3">Customer</th><th className="p-3">Plan</th><th className="p-3">Stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No referrals yet — share your link!</td></tr>}
                      {referrals.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="p-3 font-mono text-xs">{r.ref_code}</td>
                          <td className="p-3">{r.customer_name}</td>
                          <td className="p-3 text-muted-foreground">{r.service}</td>
                          <td className="p-3"><Badge variant="outline" className="text-xs">{r.stage}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Commissions table */}
                <h2 className="font-display font-semibold text-xl mt-8 mb-3">Commission ledger</h2>
                <div className="rounded-xl border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="text-left">
                        <th className="p-3">Due</th><th className="p-3">Month</th><th className="p-3">Plan</th><th className="p-3">Commission</th><th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Commissions appear after referred applications complete activation.</td></tr>}
                      {commissions.map((c) => (
                        <tr key={c.id} className="border-t border-border">
                          <td className="p-3">{c.due_date || "—"}</td>
                          <td className="p-3">#{c.month_index}</td>
                          <td className="p-3">M {Number(c.plan_price).toFixed(2)}</td>
                          <td className="p-3 font-semibold">M {Number(c.commission_amount).toFixed(2)}</td>
                          <td className="p-3">{c.paid ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Paid</Badge> : <Badge variant="outline">Pending</Badge>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  // Signed in but no distributor record yet → application form
  return (
    <div className="pt-20 min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Become an ETL Distributor</h1>
          <p className="text-muted-foreground mb-6">
            Earn <strong>10% commission</strong> on every plan you refer, for the first <strong>3 months</strong>.
            Submit your details below — Main Admin will review and approve your account.
          </p>
          <form onSubmit={handleApply} className="space-y-4 bg-card border border-border rounded-xl p-6 shadow-telecom">
            <div>
              <Label htmlFor="bn">Business / Trading Name *</Label>
              <Input id="bn" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="e.g. Maseru Connect Agency" />
            </div>
            <div>
              <Label htmlFor="cn">Contact Name *</Label>
              <Input id="cn" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ph">Phone</Label>
                <Input id="ph" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+266 …" />
              </div>
              <div>
                <Label htmlFor="em">Email</Label>
                <Input id="em" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="dis">District</Label>
              <Input id="dis" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="e.g. Maseru" />
            </div>
            <div>
              <Label htmlFor="nt">Notes (optional)</Label>
              <Textarea id="nt" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Tell us about your reach / community" rows={3} />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="w-3.5 h-3.5" /> {label}</div>
      <div className="text-2xl font-display font-bold mt-1">{value}</div>
    </div>
  );
}