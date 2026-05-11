import StageDashboardLayout from "@/components/StageDashboardLayout";
import DocumentPreview from "@/components/DocumentPreview";
import CreateApplicationDialog from "@/components/CreateApplicationDialog";

export default function ModeratorDashboard() {
  return (
    <StageDashboardLayout
      stage="moderation"
      title="Moderator Dashboard"
      description="Credit-vet incoming applications and forward to Service Delivery."
      approveLabel="Approve & send to Service Delivery"
      rejectLabel="Reject (return to customer)"
      headerExtra={<CreateApplicationDialog onCreated={() => window.location.reload()} />}
      renderDetail={(a) => (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            Documents
          </p>
          <div className="flex flex-wrap gap-2">
            {a.document_url ? (
              <DocumentPreview path={a.document_url} label="ID Document" />
            ) : (
              <span className="text-xs text-muted-foreground">No ID uploaded</span>
            )}
            {a.affirmation_letter_url && (
              <DocumentPreview path={a.affirmation_letter_url} label="Affirmation Letter" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Check label="National ID present" ok={!!a.national_id} />
            <Check label="Phone provided" ok={!!a.phone} />
            <Check label="Address provided" ok={!!a.address} />
            <Check
              label="Affirmation letter (school/business)"
              ok={a.account_type === "individual" || !!a.affirmation_letter_url}
            />
          </div>
        </div>
      )}
    />
  );
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-1 ${ok ? "text-foreground" : "text-destructive"}`}>
      <span>{ok ? "✓" : "✗"}</span>
      <span>{label}</span>
    </div>
  );
}