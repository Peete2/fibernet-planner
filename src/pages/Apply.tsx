import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Loader2, CheckCircle, UserRound, School, Building2, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DISTRICTS } from "@/lib/mock-data";
import ServicePlanSelector, { type ServiceCategoryId } from "@/components/ServicePlanSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Footer from "@/components/Footer";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    accountType: "individual",
    name: profile?.full_name || "",
    email: profile?.email || user?.email || "",
    phone: profile?.phone || "",
    nationalId: "",
    address: "",
    service: "",
    servicePlanId: "",
    serviceCategory: "" as ServiceCategoryId | "",
    district: profile?.district || "",
    location: "",
    buildingType: "residential",
    floors: "1",
    nearestLandmark: "",
    preferredDate: "",
    notes: "",
    latitude: "",
    longitude: "",
    applicantRole: "" as "student" | "teacher" | "",
  });
  const [detecting, setDetecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [letterFile, setLetterFile] = useState<File | null>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const letterInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Derived visibility flags based on selected service category
  const cat = form.serviceCategory;
  const showGPS = cat === "fibre";
  const showLandmark = cat === "fibre";
  const showBuildingType = cat === "fibre";
  const showFloors = cat === "fibre";
  const showAdditionalDetails = cat !== "fwa";
  const showDocumentUpload = cat === "fwa";
  const showApplicantRole = cat === "fwa";

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

  const handleFileSelect = (file: File | undefined, setter: (f: File | null) => void) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setter(file);
  };

  const uploadFile = async (file: File, userId: string, prefix: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("fwa-documents").upload(path, file);
    if (error) {
      toast.error(`Upload failed (${prefix}): ` + error.message);
      return null;
    }
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.service || !form.district) {
      toast.error("Please fill all required fields");
      return;
    }
    if (cat === "fwa" && !form.applicantRole) {
      toast.error("Please select whether you are a student or teacher");
      return;
    }

    setSubmitting(true);
    try {
      let idDocUrl: string | null = null;
      let letterDocUrl: string | null = null;
      if (cat === "fwa") {
        setUploading(true);
        const uploaderId = user?.id || "anonymous";
        if (idFile) idDocUrl = await uploadFile(idFile, uploaderId, "id");
        if (letterFile) letterDocUrl = await uploadFile(letterFile, uploaderId, "letter");
        setUploading(false);
      }

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
          building_type: showBuildingType ? form.buildingType : null,
          floors: showFloors ? (parseInt(form.floors) || 1) : null,
          nearest_landmark: showLandmark ? (form.nearestLandmark.trim() || null) : null,
          preferred_date: showAdditionalDetails ? (form.preferredDate || null) : null,
          notes: showAdditionalDetails ? (form.notes.trim() || null) : null,
          latitude: showGPS && form.latitude ? parseFloat(form.latitude) : null,
          longitude: showGPS && form.longitude ? parseFloat(form.longitude) : null,
          user_id: user?.id || null,
          account_type: form.accountType,
          document_url: idDocUrl,
          affirmation_letter_url: letterDocUrl,
          applicant_role: form.applicantRole || null,
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
              setDocumentFile(null);
              setForm({ accountType: "individual", name: "", email: "", phone: "", nationalId: "", address: "", service: "", servicePlanId: "", serviceCategory: "", district: "", location: "", buildingType: "residential", floors: "1", nearestLandmark: "", preferredDate: "", notes: "", latitude: "", longitude: "", applicantRole: "" });
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
              <RadioGroup
                value={form.accountType}
                onValueChange={(val) => {
                  // Reset service selection when switching account type (business hides FWA)
                  const resetService = val === "business" && form.serviceCategory === "fwa";
                  setForm({
                    ...form,
                    accountType: val,
                    ...(resetService ? { service: "", servicePlanId: "", serviceCategory: "" as ServiceCategoryId | "" } : {}),
                  });
                }}
                className="grid grid-cols-3 gap-2"
              >
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

            {/* Service Plan - show before GPS so fibre can gate on it */}
            <div>
              <Label className="mb-2 block">Service Plan *</Label>
              <ServicePlanSelector
                value={form.servicePlanId}
                onChange={(planId, planLabel, categoryId) =>
                  setForm({ ...form, servicePlanId: planId, service: planLabel, serviceCategory: categoryId })
                }
                onCategoryChange={(categoryId) =>
                  setForm((f) => ({ ...f, serviceCategory: categoryId }))
                }
                latitude={form.latitude}
                longitude={form.longitude}
                accountType={form.accountType}
              />
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

            {/* Conditional: Nearest Landmark (fibre only) */}
            {showLandmark && (
              <div>
                <Label htmlFor="landmark">Nearest Landmark</Label>
                <Input id="landmark" value={form.nearestLandmark} onChange={(e) => setForm({ ...form, nearestLandmark: e.target.value })} placeholder="e.g. Near Pioneer Mall" />
              </div>
            )}

            {/* Conditional: Building Type & Floors (fibre only) */}
            {showBuildingType && (
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
                {showFloors && (
                  <div>
                    <Label htmlFor="floors">Number of Floors</Label>
                    <Input id="floors" type="number" min="1" max="50" value={form.floors} onChange={(e) => setForm({ ...form, floors: e.target.value })} />
                  </div>
                )}
              </div>
            )}

            {/* Conditional: GPS (fibre only) */}
            {showGPS && (
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
            )}

            {/* Conditional: FWA fields - Student/Teacher + Document Upload */}
            {showApplicantRole && (
              <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/30">
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Student / Teacher Verification</h3>
                <div className="flex gap-6">
                  <Label className={`flex items-center gap-2 cursor-pointer ${form.applicantRole === "student" ? "text-primary" : "text-muted-foreground"}`}>
                    <Checkbox
                      checked={form.applicantRole === "student"}
                      onCheckedChange={(checked) => setForm({ ...form, applicantRole: checked ? "student" : "" })}
                    />
                    <span className="text-sm">Student</span>
                  </Label>
                  <Label className={`flex items-center gap-2 cursor-pointer ${form.applicantRole === "teacher" ? "text-primary" : "text-muted-foreground"}`}>
                    <Checkbox
                      checked={form.applicantRole === "teacher"}
                      onCheckedChange={(checked) => setForm({ ...form, applicantRole: checked ? "teacher" : "" })}
                    />
                    <span className="text-sm">Teacher</span>
                  </Label>
                </div>
              </div>
            )}

            {showDocumentUpload && (
              <div className="space-y-2">
                <Label>Upload ID & School Affirmation Letter *</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {documentFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <FileText className="w-5 h-5" />
                      <span className="text-sm font-medium">{documentFile.name}</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Click to upload ID and school affirmation letter</p>
                      <p className="text-xs mt-1">PDF, JPG, or PNG (max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conditional: Additional Details (hidden for FWA) */}
            {showAdditionalDetails && (
              <>
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
              </>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting || uploading}>
              {submitting ? (uploading ? "Uploading document..." : "Submitting...") : "Submit Application"}
            </Button>
          </form>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
