import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Loader2, CheckCircle, UserRound, School, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DISTRICTS } from "@/lib/mock-data";
import ServicePlanSelector from "@/components/ServicePlanSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Footer from "@/components/Footer";

const services = ["Fiber 50Mbps", "Fiber 100Mbps", "Fiber 200Mbps", "Wireless 20Mbps"]; // legacy fallback
const buildingTypes = [
  { value: "residential", label: "Residential House" },
  { value: "apartment", label: "Apartment / Flat" },
  { value: "office", label: "Office Building" },
  { value: "school", label: "School / Institution" },
  { value: "commercial", label: "Commercial / Shop" },
  { value: "other", label: "Other" },
];

const accountTypes = [
  { value: "individual", label: "Individual", icon: UserRound },
  { value: "school", label: "School", icon: School },
  { value: "business", label: "Business", icon: Building2 },
] as const;

export default function Apply() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    accountType: "individual",
    name: profile?.full_name || "",
    email: profile?.email || user?.email || "",
    phone: profile?.phone || "",
    nationalId: "",
    address: "",
    service: "",
    servicePlanId: "",
    district: profile?.district || "",
    location: "",
    buildingType: "residential",
    floors: "1",
    nearestLandmark: "",
    preferredDate: "",
    notes: "",
    latitude: "",
    longitude: "",
  });
  const [detecting, setDetecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const detectGPS = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setDetecting(false);
        toast.success("Location detected!");
      },
      () => { setDetecting(false); toast.error("Could not detect location"); }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.service || !form.district) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("applications")
        .insert({
          customer_name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          national_id: form.nationalId.trim() || null,
          address: form.address.trim() || null,
          service: form.service,
          district: form.district,
          location: form.location.trim() || null,
          building_type: form.buildingType,
          floors: parseInt(form.floors) || 1,
          nearest_landmark: form.nearestLandmark.trim() || null,
          preferred_date: form.preferredDate || null,
          notes: form.notes.trim() || null,
          latitude: form.latitude ? parseFloat(form.latitude) : null,
          longitude: form.longitude ? parseFloat(form.longitude) : null,
          user_id: user?.id || null,
          account_type: form.accountType,
        } as any)
        .select("ref_code")
        .single();

      if (error) throw error;
      setSubmittedRef(data.ref_code);
      toast.success("Application submitted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedRef) {
    return (
      <div className="pt-20 min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center p-8">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">Application Submitted!</h2>
          <p className="text-muted-foreground mb-2">
            Your reference: <strong className="text-foreground">{submittedRef}</strong>
          </p>
          <p className="text-muted-foreground text-sm">Track your application status on the Track page.</p>
          <div className="flex gap-3 justify-center mt-6">
            <Button onClick={() => {
              setSubmittedRef(null);
              setForm({ accountType: "individual", name: "", email: "", phone: "", nationalId: "", address: "", service: "", servicePlanId: "", district: "", location: "", buildingType: "residential", floors: "1", nearestLandmark: "", preferredDate: "", notes: "", latitude: "", longitude: "" });
            }}>
              Submit Another
            </Button>
            <Button variant="outline" onClick={() => navigate("/track")}>
              Track Application
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-8 max-w-2xl flex-1">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Apply for Service</h1>
          <p className="text-muted-foreground mb-8">Fill in your details and we'll get you connected.</p>

          <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-xl p-6 shadow-telecom">
            {/* Account Type */}
            <div>
              <Label className="text-foreground mb-3 block font-semibold">Account Type *</Label>
              <RadioGroup value={form.accountType} onValueChange={(val) => setForm({ ...form, accountType: val })} className="grid grid-cols-3 gap-2">
                {accountTypes.map(({ value, label, icon: Icon }) => (
                  <Label key={value} htmlFor={`apply-type-${value}`}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                      form.accountType === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"
                    }`}>
                    <RadioGroupItem value={value} id={`apply-type-${value}`} className="sr-only" />
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* Section: Personal Information */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider border-b border-border pb-2">Personal Information</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">
                  {form.accountType === "individual" ? "Full Name" : form.accountType === "school" ? "School Name" : "Business Name"} *
                </Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={form.accountType === "individual" ? "Thabo Mokhesi" : form.accountType === "school" ? "Maseru High School" : "ETL Solutions Ltd"} />
              </div>
              <div>
                <Label htmlFor="nationalId">National ID / Registration No.</Label>
                <Input id="nationalId" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} placeholder="e.g. 1234567890123" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="thabo@example.com" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+266 6100 0000" />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Physical Address</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="e.g. Plot 123, Kingsway Road, Maseru" />
            </div>

            {/* Section: Service & Location */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider border-b border-border pb-2">Service & Location</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="mb-2 block">Service Plan *</Label>
                <ServicePlanSelector
                  value={form.servicePlanId}
                  onChange={(planId, planLabel) => setForm({ ...form, servicePlanId: planId, service: planLabel })}
                  latitude={form.latitude}
                  longitude={form.longitude}
                />
              </div>
              <div>
                <Label>District *</Label>
                <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
                  <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location / Area</Label>
                <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Maseru Central" />
              </div>
              <div>
                <Label htmlFor="landmark">Nearest Landmark</Label>
                <Input id="landmark" value={form.nearestLandmark} onChange={(e) => setForm({ ...form, nearestLandmark: e.target.value })} placeholder="e.g. Near Pioneer Mall" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Building Type</Label>
                <Select value={form.buildingType} onValueChange={(v) => setForm({ ...form, buildingType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {buildingTypes.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="floors">Number of Floors</Label>
                <Input id="floors" type="number" min="1" max="50" value={form.floors} onChange={(e) => setForm({ ...form, floors: e.target.value })} />
              </div>
            </div>

            {/* GPS */}
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

            {/* Section: Scheduling */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-primary uppercase tracking-wider border-b border-border pb-2">Additional Details</h3>
            </div>

            <div>
              <Label htmlFor="preferredDate">Preferred Installation Date</Label>
              <Input id="preferredDate" type="date" value={form.preferredDate} onChange={(e) => setForm({ ...form, preferredDate: e.target.value })} />
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any special requirements, gate codes, access instructions, etc." rows={3} />
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
