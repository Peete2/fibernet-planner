import { useEffect, useState } from "react";
import StageDashboardLayout from "@/components/StageDashboardLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PayData {
  method: string;
  reference: string;
  amount: string;
  receipt: string;
}

export default function BillingDashboard() {
  const [data, setData] = useState<Record<string, PayData>>({});

  return (
    <StageDashboardLayout
      stage="billing"
      title="Billing & Payment"
      description="Verify payment and complete the application."
      approveLabel="Confirm payment & complete"
      rejectLabel="Send back to Technical"
      rejectReasons={["Payment details missing", "No payment received"]}
      buildApprovePatch={(a) => {
        const d = data[a.id];
        if (!d?.method?.trim() || !d?.reference?.trim() || !d?.amount?.trim()) {
          alert("Method, reference, and amount are required.");
          return null;
        }
        const amt = Number(d.amount);
        if (!Number.isFinite(amt) || amt <= 0) {
          alert("Enter a valid payment amount.");
          return null;
        }
        return {
          payment_method: d.method.trim(),
          payment_reference: d.reference.trim(),
          payment_amount: amt,
          payment_receipt_url: d.receipt.trim() || null,
        };
      }}
      renderDetail={(a) => (
        <PaymentForm
          appId={a.id}
          initial={{
            method: a.payment_method || "",
            reference: a.payment_reference || "",
            amount: a.payment_amount?.toString() || "",
            receipt: a.payment_receipt_url || "",
          }}
          provisioning={{
            sim: a.assigned_sim,
            port: a.assigned_port,
            equipment: Array.isArray(a.assigned_equipment) ? a.assigned_equipment : [],
            technician: a.technician,
            scheduled_date: a.scheduled_date,
          }}
          value={data[a.id]}
          onChange={(v) => setData((m) => ({ ...m, [a.id]: v }))}
        />
      )}
    />
  );
}

function PaymentForm({
  appId,
  initial,
  provisioning,
  value,
  onChange,
}: {
  appId: string;
  initial: PayData;
  provisioning: {
    sim: string | null;
    port: string | null;
    equipment: string[];
    technician: string | null;
    scheduled_date: string | null;
  };
  value: PayData | undefined;
  onChange: (v: PayData) => void;
}) {
  useEffect(() => {
    if (!value) onChange(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);
  const v = value ?? initial;
  const set = (k: keyof PayData, val: string) => onChange({ ...v, [k]: val });
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-md bg-muted/50 border border-border text-xs space-y-1">
        <p className="font-semibold uppercase tracking-wide text-muted-foreground">Provisioning</p>
        <p>SIM: <span className="font-medium">{provisioning.sim || "—"}</span> · Port: <span className="font-medium">{provisioning.port || "—"}</span></p>
        <p>Tech: <span className="font-medium">{provisioning.technician || "—"}</span> · Scheduled: <span className="font-medium">{provisioning.scheduled_date || "—"}</span></p>
        {provisioning.equipment.length > 0 && (
          <p>Equipment: {provisioning.equipment.join(", ")}</p>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Payment method</Label>
          <Input value={v.method} onChange={(e) => set("method", e.target.value)} placeholder="M-Pesa, EFT, Cash…" />
        </div>
        <div>
          <Label className="text-xs">Reference</Label>
          <Input value={v.reference} onChange={(e) => set("reference", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Amount (M)</Label>
          <Input type="number" step="0.01" value={v.amount} onChange={(e) => set("amount", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Receipt URL (optional)</Label>
          <Input value={v.receipt} onChange={(e) => set("receipt", e.target.value)} />
        </div>
      </div>
    </div>
  );
}