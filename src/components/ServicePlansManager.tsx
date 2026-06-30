import { useEffect, useState } from "react";
import { Wifi, Radio, Cable, School, Plus, Pencil, Save, X, Power, PowerOff, Upload, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { logAudit } from "@/lib/audit";

interface ServicePlanRow {
  id: string;
  category_id: "fmc" | "lte" | "fibre" | "fwa";
  name: string;
  price: string;
  speed: string | null;
  details: string[];
  is_active: boolean;
  sort_order: number;
  visible_to: string[];
  image_url: string | null;
}

const CATEGORIES = [
  { id: "fmc",   label: "Wi-Fi PLUS",    icon: Wifi },
  { id: "lte",   label: "Fixed LTE",     icon: Radio },
  { id: "fibre", label: "Fibre (GPON)",  icon: Cable },
  { id: "fwa",   label: "Limited Wi-Fi", icon: School },
] as const;

const ACCOUNT_TYPES = [
  { id: "individual", label: "Individual" },
  { id: "business",   label: "Business" },
  { id: "school",     label: "School" },
] as const;

const emptyForm = {
  category_id: "fmc" as ServicePlanRow["category_id"],
  name: "", price: "", speed: "", details: "", sort_order: "0",
  visible_to: ["individual", "business", "school"] as string[],
  image_url: "" as string,
};

export default function ServicePlansManager() {
  const [plans, setPlans] = useState<ServicePlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<ServicePlanRow["category_id"]>("fmc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("service_plans").select("*").order("category_id").order("sort_order");
    if (error) toast.error(error.message);
    else setPlans((data || []).map((p: any) => ({ ...p, details: Array.isArray(p.details) ? p.details : [] })));
    setLoading(false);
  };

  useEffect(() => { fetchPlans(); }, []);

  const startEdit = (p: ServicePlanRow) => {
    setEditingId(p.id);
    setCreating(false);
    setForm({
      category_id: p.category_id,
      name: p.name,
      price: p.price,
      speed: p.speed || "",
      details: (p.details || []).join("\n"),
      sort_order: String(p.sort_order),
      visible_to: Array.isArray(p.visible_to) && p.visible_to.length > 0 ? p.visible_to : ["individual","business","school"],
      image_url: p.image_url || "",
    });
  };

  const startCreate = (catId: ServicePlanRow["category_id"]) => {
    setCreating(true);
    setEditingId(null);
    const maxOrder = plans.filter((p) => p.category_id === catId).reduce((m, p) => Math.max(m, p.sort_order), 0);
    setForm({ ...emptyForm, category_id: catId, sort_order: String(maxOrder + 1) });
  };

  const cancel = () => { setEditingId(null); setCreating(false); setForm(emptyForm); };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${form.category_id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("plan-images").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      // Long-lived signed URL (10 years) since bucket is private.
      const { data, error: signErr } = await supabase.storage.from("plan-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr) throw signErr;
      setForm((f) => ({ ...f, image_url: data.signedUrl }));
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.price.trim()) { toast.error("Name and price are required"); return; }
    if (form.visible_to.length === 0) { toast.error("Select at least one account type"); return; }
    const detailsArr = form.details.split("\n").map((s) => s.trim()).filter(Boolean);
    const payload = {
      category_id: form.category_id,
      name: form.name.trim(),
      price: form.price.trim(),
      speed: form.speed.trim() || null,
      details: detailsArr,
      sort_order: parseInt(form.sort_order, 10) || 0,
      visible_to: form.visible_to,
      image_url: form.image_url.trim() || null,
    };
    const before = editingId ? plans.find((p) => p.id === editingId) : null;
    if (editingId) {
      const { error } = await supabase.from("service_plans").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
      logAudit({ action: "update", target_type: "service_plan", target_id: editingId, target_label: payload.name, before, after: payload });
      toast.success("Plan updated");
    } else {
      const { data, error } = await supabase.from("service_plans").insert(payload).select().single();
      if (error) { toast.error(error.message); return; }
      logAudit({ action: "create", target_type: "service_plan", target_id: data?.id, target_label: payload.name, after: payload });
      toast.success("Plan created");
    }
    cancel();
    fetchPlans();
  };

  const toggleActive = async (p: ServicePlanRow) => {
    const { error } = await supabase.from("service_plans").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) toast.error(error.message);
    else {
      logAudit({ action: "toggle", target_type: "service_plan", target_id: p.id, target_label: p.name, before: { is_active: p.is_active }, after: { is_active: !p.is_active } });
      toast.success(p.is_active ? "Plan disabled" : "Plan enabled");
      fetchPlans();
    }
  };

  const deletePlan = async (id: string) => {
    const target = plans.find((p) => p.id === id);
    const { error } = await supabase.from("service_plans").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      logAudit({ action: "delete", target_type: "service_plan", target_id: id, target_label: target?.name, before: target });
      toast.success("Plan deleted");
      fetchPlans();
    }
  };

  const visiblePlans = plans.filter((p) => p.category_id === activeCat);

  return (
    <div className="bg-card border border-border rounded-xl shadow-telecom overflow-hidden">
      <div className="p-5 border-b border-border space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-display font-semibold text-foreground">Service Plans</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Add, edit, enable/disable, or delete plans shown to customers on the Apply page.</p>
          </div>
          <Button size="sm" onClick={() => startCreate(activeCat)} className="gap-1.5">
            <Plus className="w-4 h-4" /> New plan
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = plans.filter((p) => p.category_id === cat.id).length;
            const isActive = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCat(cat.id); cancel(); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  isActive ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
                <Badge variant={isActive ? "default" : "outline"} className="text-[10px] px-1.5 py-0 h-4 min-w-[1.25rem] justify-center">{count}</Badge>
              </button>
            );
          })}
        </div>
      </div>

      {(creating || editingId) && (
        <div className="p-5 border-b border-border bg-muted/20 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">{creating ? "New plan" : "Edit plan"}</h4>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Category</label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v as ServicePlanRow["category_id"] })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Sort order</label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Plan name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bronze" className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Price</label>
              <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. M499/mo" className="h-9 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Speed (optional)</label>
              <Input value={form.speed} onChange={(e) => setForm({ ...form, speed: e.target.value })} placeholder="e.g. 30 Mbps ↓ / 20 Mbps ↑" className="h-9 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Features (one per line)</label>
              <Textarea rows={3} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Integrated mobile data &amp; voice&#10;Home WiFi router included" className="text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Plan photo (optional)</label>
              <div className="flex items-start gap-3 mt-1">
                <div className="w-28 h-20 rounded-lg border border-border bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                  {form.image_url ? (
                    <img src={form.image_url} alt="Plan preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageOff className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background text-xs font-medium cursor-pointer hover:border-primary/60">
                      <Upload className="w-3.5 h-3.5" />
                      {uploading ? "Uploading…" : "Upload image"}
                      <input type="file" accept="image/*" className="hidden" disabled={uploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.currentTarget.value = ""; }} />
                    </label>
                    {form.image_url && (
                      <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setForm({ ...form, image_url: "" })}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="Or paste an image URL" className="h-9 text-sm" />
                  <p className="text-[11px] text-muted-foreground">JPG/PNG/WebP, up to 5MB. Used as the card background for this plan.</p>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Visible to account types</label>
              <div className="flex flex-wrap gap-3 mt-2">
                {ACCOUNT_TYPES.map((acc) => {
                  const checked = form.visible_to.includes(acc.id);
                  return (
                    <label key={acc.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setForm({
                            ...form,
                            visible_to: v
                              ? Array.from(new Set([...form.visible_to, acc.id]))
                              : form.visible_to.filter((x) => x !== acc.id),
                          });
                        }}
                      />
                      {acc.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={cancel} className="gap-1"><X className="w-3.5 h-3.5" /> Cancel</Button>
            <Button size="sm" onClick={save} className="gap-1"><Save className="w-3.5 h-3.5" /> Save</Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-14">#</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Speed</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Features</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Visible to</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : visiblePlans.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No plans in this category yet.</td></tr>
            ) : visiblePlans.map((p) => (
              <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground">{p.sort_order}</td>
                <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                <td className="px-4 py-3 text-foreground">{p.price}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.speed || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">{(p.details || []).join(" • ") || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(p.visible_to || []).map((v) => (
                      <Badge key={v} variant="outline" className="text-[10px] capitalize">{v}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.is_active
                    ? <Badge className="bg-secondary text-secondary-foreground">Active</Badge>
                    : <Badge variant="outline">Disabled</Badge>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(p)} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(p)} title={p.is_active ? "Disable" : "Enable"}>
                      {p.is_active ? <PowerOff className="w-3.5 h-3.5 text-amber-600" /> : <Power className="w-3.5 h-3.5 text-secondary" />}
                    </Button>
                    <ConfirmDialog onConfirm={() => deletePlan(p.id)} title="Delete plan?" description={`This will permanently delete the "${p.name}" plan.`} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}