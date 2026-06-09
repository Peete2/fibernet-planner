import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DistributorRow {
  id: string;
  business_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  district: string | null;
  code: string;
  status: string;
  commission_rate: number;
  commission_months: number;
  created_at: string;
}

interface CommissionRow {
  id: string;
  distributor_id: string;
  application_id: string;
  month_index: number;
  commission_amount: number;
  due_date: string | null;
  paid: boolean;
}

export default function DistributorAdminPanel() {
  const [list, setList] = useState<DistributorRow[]>([]);
  const [comm, setComm] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: ds }, { data: cs }] = await Promise.all([
      (supabase as any).from("distributors").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("distributor_commissions").select("*").order("due_date", { ascending: true }),
    ]);
    setList(ds || []);
    setComm(cs || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("distributors").update({ status, approved_at: status === "approved" ? new Date().toISOString() : null }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Distributor ${status}`); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this distributor? Their commissions will also be removed.")) return;
    const { error } = await (supabase as any).from("distributors").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const markPaid = async (cid: string, paid: boolean) => {
    const { error } = await (supabase as any).from("distributor_commissions").update({ paid, paid_at: paid ? new Date().toISOString() : null }).eq("id", cid);
    if (error) toast.error(error.message); else load();
  };

  if (loading) return <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;

  const earnedFor = (did: string) => comm.filter(c => c.distributor_id === did).reduce((s,c)=>s+Number(c.commission_amount),0);
  const paidFor = (did: string) => comm.filter(c => c.distributor_id === did && c.paid).reduce((s,c)=>s+Number(c.commission_amount),0);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display font-semibold text-lg mb-3">Distributors</h3>
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr><th className="p-3">Business</th><th className="p-3">Contact</th><th className="p-3">Code</th><th className="p-3">Status</th><th className="p-3">Earned</th><th className="p-3">Paid</th><th className="p-3">Actions</th></tr>
            </thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No distributors yet.</td></tr>}
              {list.map(d => (
                <tr key={d.id} className="border-t border-border">
                  <td className="p-3"><div className="font-medium">{d.business_name}</div><div className="text-xs text-muted-foreground">{d.district || "—"}</div></td>
                  <td className="p-3"><div>{d.contact_name}</div><div className="text-xs text-muted-foreground">{d.phone || d.email || "—"}</div></td>
                  <td className="p-3 font-mono text-xs">{d.code}</td>
                  <td className="p-3"><Badge variant={d.status === "approved" ? "default" : d.status === "pending" ? "secondary" : "destructive"}>{d.status}</Badge></td>
                  <td className="p-3">M {earnedFor(d.id).toFixed(2)}</td>
                  <td className="p-3">M {paidFor(d.id).toFixed(2)}</td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {d.status !== "approved" && <Button size="sm" variant="outline" onClick={()=>setStatus(d.id,"approved")}><CheckCircle2 className="w-3 h-3 mr-1" />Approve</Button>}
                      {d.status === "approved" && <Button size="sm" variant="outline" onClick={()=>setStatus(d.id,"suspended")}><XCircle className="w-3 h-3 mr-1" />Suspend</Button>}
                      {d.status === "pending" && <Button size="sm" variant="outline" onClick={()=>setStatus(d.id,"rejected")}><XCircle className="w-3 h-3 mr-1" />Reject</Button>}
                      <Button size="sm" variant="ghost" onClick={()=>remove(d.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Commission Ledger</h3>
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr><th className="p-3">Distributor</th><th className="p-3">Application</th><th className="p-3">Month</th><th className="p-3">Due</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {comm.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No commissions recorded yet.</td></tr>}
              {comm.map(c => {
                const dist = list.find(d => d.id === c.distributor_id);
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-3">{dist?.business_name || c.distributor_id.slice(0,8)}</td>
                    <td className="p-3 font-mono text-xs">{c.application_id.slice(0,8)}</td>
                    <td className="p-3">#{c.month_index}</td>
                    <td className="p-3">{c.due_date || "—"}</td>
                    <td className="p-3 font-semibold">M {Number(c.commission_amount).toFixed(2)}</td>
                    <td className="p-3">{c.paid ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Paid</Badge> : <Badge variant="outline">Pending</Badge>}</td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" onClick={()=>markPaid(c.id, !c.paid)}>
                        {c.paid ? "Mark unpaid" : "Mark paid"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}