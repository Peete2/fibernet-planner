import { useState, useEffect } from "react";
import StageDashboardLayout from "@/components/StageDashboardLayout";
import { Textarea } from "@/components/ui/textarea";

export default function ServiceDeliveryDashboard() {
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <StageDashboardLayout
      stage="service_delivery"
      title="Service Delivery"
      description="Validate feasibility & attach an advisory note before passing to Technical."
      approveLabel="Approve & send to Technical"
      rejectLabel="Send back to Moderator"
      requireApproveComment={false}
      buildApprovePatch={(a) => {
        const note = (notes[a.id] || a.advisory_note || "").trim();
        if (!note) {
          // eslint-disable-next-line no-alert
          alert("Please write an advisory note before approving.");
          return null;
        }
        return { advisory_note: note };
      }}
      renderDetail={(a) => (
        <AdvisoryEditor
          appId={a.id}
          initial={a.advisory_note || ""}
          value={notes[a.id]}
          onChange={(v) => setNotes((n) => ({ ...n, [a.id]: v }))}
        />
      )}
    />
  );
}

function AdvisoryEditor({
  appId,
  initial,
  value,
  onChange,
}: {
  appId: string;
  initial: string;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  useEffect(() => {
    if (value === undefined) onChange(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);
  return (
    <div>
      <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-1">
        Advisory note (required to approve)
      </p>
      <Textarea
        rows={4}
        value={value ?? initial}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Coverage feasibility, recommended plan tier, special access notes…"
      />
    </div>
  );
}