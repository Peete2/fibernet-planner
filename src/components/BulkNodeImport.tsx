import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  radius_km: number;
  status: string;
};

const TEMPLATE = `name,latitude,longitude,capacity,radius_km,status
Maseru-Central,-29.3151,27.4869,200,4,Active
Maseru-North,-29.2800,27.5100,150,3.5,Planned
`;

function parseCsv(text: string): { rows: Row[]; errors: string[] } {
  const errors: string[] = [];
  const rows: Row[] = [];
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows, errors: ["File is empty"] };
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const required = ["name", "latitude", "longitude", "capacity"];
  for (const r of required) {
    if (!header.includes(r)) errors.push(`Missing required column: ${r}`);
  }
  if (errors.length) return { rows, errors };
  const idx = (k: string) => header.indexOf(k);
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    const name = cells[idx("name")];
    const lat = parseFloat(cells[idx("latitude")]);
    const lng = parseFloat(cells[idx("longitude")]);
    const cap = parseInt(cells[idx("capacity")], 10);
    const rad = idx("radius_km") >= 0 ? parseFloat(cells[idx("radius_km")]) : 4;
    const status = idx("status") >= 0 ? cells[idx("status")] : "Planned";
    if (!name) { errors.push(`Row ${i + 1}: missing name`); continue; }
    if (!isFinite(lat) || lat < -90 || lat > 90) { errors.push(`Row ${i + 1}: invalid latitude`); continue; }
    if (!isFinite(lng) || lng < -180 || lng > 180) { errors.push(`Row ${i + 1}: invalid longitude`); continue; }
    if (!isFinite(cap) || cap < 1) { errors.push(`Row ${i + 1}: invalid capacity`); continue; }
    if (!["Active", "Planned", "Maintenance"].includes(status)) {
      errors.push(`Row ${i + 1}: status must be Active, Planned, or Maintenance`); continue;
    }
    rows.push({ name, latitude: lat, longitude: lng, capacity: cap, radius_km: isFinite(rad) ? rad : 4, status });
  }
  return { rows, errors };
}

export const BulkNodeImport = ({ onComplete }: { onComplete?: () => void }) => {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Row[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fiber-nodes-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const { rows, errors } = parseCsv(text);
    setPreview(rows);
    setErrors(errors);
    if (rows.length === 0 && errors.length === 0) toast.error("No valid rows found");
  };

  const handleImport = async () => {
    if (!preview || preview.length === 0) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("fiber_nodes").insert(
        preview.map((r) => ({ ...r, connected_customers: 0 }))
      );
      if (error) throw error;
      toast.success(`Imported ${preview.length} node${preview.length === 1 ? "" : "s"}`);
      setPreview(null);
      setErrors([]);
      if (inputRef.current) inputRef.current.value = "";
      onComplete?.();
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-telecom p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display font-semibold text-foreground">Bulk Import Nodes (CSV)</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Columns: name, latitude, longitude, capacity, radius_km (optional, default 4), status (Active/Planned/Maintenance).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />Template
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" />Choose CSV
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-destructive">
            <AlertCircle className="w-3.5 h-3.5" />{errors.length} issue{errors.length === 1 ? "" : "s"}
          </div>
          <ul className="list-disc list-inside text-muted-foreground max-h-32 overflow-auto">
            {errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
            {errors.length > 20 && <li>…and {errors.length - 20} more</li>}
          </ul>
        </div>
      )}

      {preview && preview.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-secondary">
              <CheckCircle2 className="w-4 h-4" />{preview.length} valid row{preview.length === 1 ? "" : "s"} ready
            </div>
            <Button size="sm" onClick={handleImport} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Import {preview.length}
            </Button>
          </div>
          <div className="max-h-48 overflow-auto rounded-md border border-border text-xs">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Name</th>
                  <th className="px-2 py-1.5 text-left font-medium">Lat</th>
                  <th className="px-2 py-1.5 text-left font-medium">Lng</th>
                  <th className="px-2 py-1.5 text-left font-medium">Cap</th>
                  <th className="px-2 py-1.5 text-left font-medium">Radius</th>
                  <th className="px-2 py-1.5 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-2 py-1">{r.name}</td>
                    <td className="px-2 py-1 font-mono">{r.latitude.toFixed(4)}</td>
                    <td className="px-2 py-1 font-mono">{r.longitude.toFixed(4)}</td>
                    <td className="px-2 py-1">{r.capacity}</td>
                    <td className="px-2 py-1">{r.radius_km}</td>
                    <td className="px-2 py-1">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 50 && (
              <div className="px-2 py-1 text-muted-foreground bg-muted/30">…and {preview.length - 50} more rows</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};