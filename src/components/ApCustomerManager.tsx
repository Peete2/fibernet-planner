import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, UserPlus, MapPin } from "lucide-react";
import LeafletMap from "@/components/LeafletMap";
import { useAuth } from "@/contexts/AuthContext";

interface Node { id: string; name: string; latitude: number; longitude: number; capacity: number; connected_customers: number; }
interface Conn {
  id: string; fiber_node_id: string; customer_name: string; latitude: number; longitude: number; source: string;
  application_id: string | null; created_at: string;
}

export default function ApCustomerManager() {
  const { user } = useAuth();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [conns, setConns] = useState<Conn[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>("");
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: ns }, { data: cs }] = await Promise.all([
      supabase.from("fiber_nodes").select("id, name, latitude, longitude, capacity, connected_customers").order("name"),
      supabase.from("customer_connections").select("*").order("created_at", { ascending: false }),
    ]);
    setNodes((ns as any) || []);
    setConns((cs as any) || []);
  };

  useEffect(() => { load(); }, []);

  const attach = async () => {
    if (!selectedNode || !name.trim()) { toast.error("Pick an AP and enter a customer name"); return; }
    const node = nodes.find((n) => n.id === selectedNode);
    if (!node) return;
    const useLat = lat.trim() ? parseFloat(lat) : node.latitude;
    const useLng = lng.trim() ? parseFloat(lng) : node.longitude;
    if (Number.isNaN(useLat) || Number.isNaN(useLng)) { toast.error("Invalid coordinates"); return; }
    setBusy(true);
    const { error } = await supabase.from("customer_connections").insert({
      fiber_node_id: selectedNode,
      customer_name: name.trim(),
      latitude: useLat,
      longitude: useLng,
      source: "manual",
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Customer attached to AP");
    setName(""); setLat(""); setLng("");
    load();
  };

  const detach = async (id: string) => {
    const { error } = await supabase.from("customer_connections").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Customer removed from AP");
    load();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-telecom space-y-4">
      <div>
        <h3 className="font-display font-semibold text-foreground">Attach customers to access points</h3>
        <p className="text-xs text-muted-foreground mt-1">Approved applications attach automatically when their location is within an AP's radius. Use this to add customers manually.</p>
      </div>

      <div className="grid md:grid-cols-[1.4fr_1.4fr_1fr_1fr_auto] gap-2">
        <Select value={selectedNode} onValueChange={setSelectedNode}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose access point" /></SelectTrigger>
          <SelectContent>
            {nodes.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.name} ({n.connected_customers}/{n.capacity})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Customer name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
        <Input placeholder="Latitude (optional)" value={lat} onChange={(e) => setLat(e.target.value)} className="h-9 text-sm" />
        <Input placeholder="Longitude (optional)" value={lng} onChange={(e) => setLng(e.target.value)} className="h-9 text-sm" />
        <Button onClick={attach} disabled={busy} className="h-9"><UserPlus className="w-4 h-4 mr-1" /> Attach</Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Pick customer house on the map</Label>
          <span className="text-xs text-muted-foreground">You can still type coordinates manually as well.</span>
        </div>
        <LeafletMap
          showHeatmap={false}
          showRoutes={true}
          showNodes={true}
          height="320px"
          onMapClick={(latitude, longitude) => {
            setLat(latitude.toFixed(6));
            setLng(longitude.toFixed(6));
            toast.success("Customer location selected from map");
          }}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-3 py-2 font-medium text-muted-foreground">Customer</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Access Point</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Coords</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Source</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">When</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {conns.map((c) => {
              const n = nodes.find((x) => x.id === c.fiber_node_id);
              return (
                <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-3 py-2 text-foreground">{c.customer_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{n?.name || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs"><MapPin className="w-3 h-3 inline mr-1" />{c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}</td>
                  <td className="px-3 py-2 text-xs capitalize">{c.source}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => detach(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {conns.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground text-sm">No connected customers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}