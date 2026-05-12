import { useEffect, useState } from "react";
import StageDashboardLayout from "@/components/StageDashboardLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ProvData {
  sim: string;
  port: string;
  equipment: string;
  technician: string;
  scheduled_date: string;
}

export default function TechnicalDashboard() {
  const [data, setData] = useState<Record<string, ProvData>>({});

  return (
    <StageDashboardLayout
      stage="technical"
      title="Technical Provisioning"
      description="Assign assets and field technician, then forward to Billing."
      approveLabel="Approve & send to Billing"
      rejectLabel="Send back to Service Delivery"
      reminderTasks={[
        "Assign a SIM and port number from available stock",
        "List all equipment to be installed",
        "Schedule a field technician and installation date",
        "Send to Billing once provisioning is fully captured",
      ]}
      buildApprovePatch={(a) => {
        const d = data[a.id];
        if (!d?.sim?.trim() || !d?.port?.trim()) {
          alert("SIM and port number are required.");
          return null;
        }
        return {
          assigned_sim: d.sim.trim(),
          assigned_port: d.port.trim(),
          assigned_equipment: d.equipment
            ? d.equipment.split("\n").map((s) => s.trim()).filter(Boolean)
            : null,
          technician: d.technician.trim() || null,
          scheduled_date: d.scheduled_date || null,
        };
      }}
      renderDetail={(a) => (
        <ProvisioningForm
          appId={a.id}
          initial={{
            sim: a.assigned_sim || "",
            port: a.assigned_port || "",
            equipment: Array.isArray(a.assigned_equipment)
              ? a.assigned_equipment.join("\n")
              : "",
            technician: a.technician || "",
            scheduled_date: a.scheduled_date || "",
          }}
          advisory={a.advisory_note}
          value={data[a.id]}
          onChange={(v) => setData((m) => ({ ...m, [a.id]: v }))}
        />
      )}
    />
  );
}

function ProvisioningForm({
  appId,
  initial,
  advisory,
  value,
  onChange,
}: {
  appId: string;
  initial: ProvData;
  advisory: string | null;
  value: ProvData | undefined;
  onChange: (v: ProvData) => void;
}) {
  useEffect(() => {
    if (!value) onChange(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);
  const v = value ?? initial;
  const set = (k: keyof ProvData, val: string) => onChange({ ...v, [k]: val });
  return (
    <div className="space-y-3">
      {advisory && (
        <div className="p-3 rounded-md bg-muted/50 border border-border text-xs">
          <span className="font-semibold">Advisory note: </span>
          {advisory}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">SIM number</Label>
          <Input value={v.sim} onChange={(e) => set("sim", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Port number</Label>
          <Input value={v.port} onChange={(e) => set("port", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Field technician</Label>
          <Input value={v.technician} onChange={(e) => set("technician", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Scheduled date</Label>
          <Input type="date" value={v.scheduled_date} onChange={(e) => set("scheduled_date", e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs">Equipment (one per line)</Label>
        <Textarea
          rows={3}
          value={v.equipment}
          onChange={(e) => set("equipment", e.target.value)}
          placeholder="ONT, Router, Cable 50m…"
        />
      </div>
    </div>
  );
}