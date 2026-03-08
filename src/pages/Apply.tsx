import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISTRICTS } from "@/lib/mock-data";
import { toast } from "sonner";

const services = ["Fiber 50Mbps", "Fiber 100Mbps", "Fiber 200Mbps", "Wireless 20Mbps"];

export default function Apply() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: "", district: "", location: "", latitude: "", longitude: "" });
  const [detecting, setDetecting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const detectGPS = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setDetecting(false);
        toast.success("Location detected!");
      },
      () => {
        setDetecting(false);
        toast.error("Could not detect location");
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.service || !form.district) {
      toast.error("Please fill required fields");
      return;
    }
    setSubmitted(true);
    toast.success("Application submitted successfully!");
  };

  if (submitted) {
    return (
      <div className="pt-20 min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center p-8">
          <CheckCircle className="w-16 h-16 text-secondary mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Application Submitted!</h2>
          <p className="text-muted-foreground mb-2">Your reference: <strong className="text-foreground">ETL-2026-{String(Math.floor(Math.random() * 900) + 100)}</strong></p>
          <p className="text-muted-foreground text-sm">Track your application status on the Track page.</p>
          <Button variant="hero" className="mt-6" onClick={() => setSubmitted(false)}>Submit Another</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Apply for Service</h1>
          <p className="text-muted-foreground mb-8">Fill in your details and we'll get you connected.</p>

          <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border rounded-xl p-6 shadow-telecom">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Thabo Mokhesi" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="thabo@example.com" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+266 5800 0000" />
              </div>
              <div>
                <Label>Service *</Label>
                <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>District *</Label>
                <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
                  <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location / Area</Label>
                <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Maseru Central" />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">GPS Coordinates</Label>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Input placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
                </div>
                <div className="flex-1">
                  <Input placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
                </div>
                <Button type="button" variant="outline" size="icon" onClick={detectGPS} disabled={detecting}>
                  {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Click the pin icon to auto-detect your location</p>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full">Submit Application</Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
