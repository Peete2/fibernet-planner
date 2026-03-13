import jsPDF from "jspdf";

interface ApplicationData {
  ref_code: string;
  customer_name: string;
  email?: string | null;
  phone?: string | null;
  service: string;
  district: string;
  location?: string | null;
  account_type: string;
  status: string;
  technician?: string | null;
  scheduled_date?: string | null;
  created_at: string;
  national_id?: string | null;
  address?: string | null;
  building_type?: string | null;
  floors?: number | null;
  nearest_landmark?: string | null;
  preferred_date?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  document_url?: string | null;
  applicant_role?: string | null;
}

type ServiceCategory = "fmc" | "lte" | "fibre" | "fwa" | "unknown";

function detectCategory(service: string): ServiceCategory {
  const s = service.toLowerCase();
  if (s.includes("wi-fi plus") || s.includes("fmc") || s.includes("bronze") || s.includes("silver") || s.includes("gold")) {
    if (s.includes("fibre")) return "fibre";
    return "fmc";
  }
  if (s.includes("fibre") || s.includes("gpon") || s.includes("top-up")) return "fibre";
  if (s.includes("lte") && (s.includes("unlimited") || s.includes("always on") || s.includes("combo") || s.includes("fixed lte"))) return "lte";
  if (s.includes("limited") || s.includes("school") || s.includes("hybrid") || s.includes("fwa")) return "fwa";
  if (s.includes("lte")) return "lte";
  return "unknown";
}

const categoryLabels: Record<ServiceCategory, string> = {
  fmc: "Wi-Fi PLUS (FMC)",
  lte: "Fixed LTE & LTE Unlimited",
  fibre: "Fibre (GPON)",
  fwa: "Limited Wi-Fi (FWA)",
  unknown: "Service Application",
};

const categoryAccents: Record<ServiceCategory, [number, number, number]> = {
  fmc: [59, 130, 246],    // blue
  lte: [239, 68, 68],     // red
  fibre: [16, 185, 129],  // green
  fwa: [245, 158, 11],    // amber
  unknown: [237, 137, 36],
};

export function generateApplicationPDF(app: ApplicationData) {
  const category = detectCategory(app.service);
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const accent = categoryAccents[category];

  // Brand header
  doc.setFillColor(18, 36, 66);
  doc.rect(0, 0, pageWidth, 45, "F");

  // Category accent bar
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(0, 45, pageWidth, 3, "F");

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("ECONET TELECOM LESOTHO", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${categoryLabels[category]} Application`, pageWidth / 2, 30, { align: "center" });

  doc.setFontSize(9);
  doc.text(`Reference: ${app.ref_code}`, pageWidth / 2, 38, { align: "center" });

  // Reset for body
  doc.setTextColor(30, 41, 59);
  let y = 58;

  const addSection = (title: string) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFillColor(240, 243, 248);
    doc.rect(14, y - 5, pageWidth - 28, 8, "F");
    // Accent left border
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(14, y - 5, 2, 8, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(18, 36, 66);
    doc.text(title, 20, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
  };

  const addField = (label: string, value: string | null | undefined) => {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 16, y);
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text(value || "—", 70, y);
    y += 7;
  };

  // ── APPLICATION DETAILS (all categories) ──
  addSection("APPLICATION DETAILS");
  addField("Reference", app.ref_code);
  addField("Status", app.status);
  addField("Date Submitted", new Date(app.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }));
  addField("Account Type", app.account_type?.charAt(0).toUpperCase() + app.account_type?.slice(1));
  addField("Service Plan", app.service);

  // ── CUSTOMER INFO (all categories) ──
  y += 4;
  addSection("CUSTOMER INFORMATION");
  addField("Full Name", app.customer_name);
  addField("National ID", app.national_id);
  addField("Email", app.email);
  addField("Phone", app.phone);
  addField("Address", app.address);

  // ── FWA-specific: Applicant role ──
  if (category === "fwa") {
    if (app.applicant_role) {
      addField("Applicant Role", app.applicant_role.charAt(0).toUpperCase() + app.applicant_role.slice(1));
    }
    if (app.document_url) {
      addField("Uploaded Document", "Yes (attached)");
    }
  }

  // ── LOCATION & SITE (category-specific) ──
  y += 4;
  if (category === "fibre") {
    addSection("SERVICE & LOCATION");
    addField("District", app.district);
    addField("Location / Area", app.location);
    addField("Building Type", app.building_type ? app.building_type.charAt(0).toUpperCase() + app.building_type.slice(1) : null);
    addField("Floors", app.floors ? String(app.floors) : null);
    addField("Nearest Landmark", app.nearest_landmark);
    if (app.latitude && app.longitude) {
      addField("GPS Coordinates", `${app.latitude}, ${app.longitude}`);
    }
    addField("Preferred Date", app.preferred_date);
  } else if (category === "fmc" || category === "lte") {
    addSection("SERVICE & LOCATION");
    addField("District", app.district);
    addField("Location / Area", app.location);
    addField("Preferred Date", app.preferred_date);
  } else if (category === "fwa") {
    addSection("SERVICE & LOCATION");
    addField("District", app.district);
    addField("Location / Area", app.location);
  } else {
    addSection("SERVICE & LOCATION");
    addField("District", app.district);
    addField("Location / Area", app.location);
    addField("Building Type", app.building_type ? app.building_type.charAt(0).toUpperCase() + app.building_type.slice(1) : null);
    addField("Floors", app.floors ? String(app.floors) : null);
    addField("Nearest Landmark", app.nearest_landmark);
    if (app.latitude && app.longitude) {
      addField("GPS Coordinates", `${app.latitude}, ${app.longitude}`);
    }
    addField("Preferred Date", app.preferred_date);
  }

  // ── ASSIGNMENT (if present) ──
  if (app.technician || app.scheduled_date) {
    y += 4;
    addSection("ASSIGNMENT");
    addField("Technician", app.technician);
    addField("Scheduled Date", app.scheduled_date);
  }

  // ── NOTES ──
  if (app.notes) {
    y += 4;
    addSection("ADDITIONAL NOTES");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(app.notes, pageWidth - 32);
    doc.text(lines, 16, y);
    y += lines.length * 5;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(200, 210, 220);
  doc.line(14, footerY - 5, pageWidth - 14, footerY - 5);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Econet Telecom Lesotho — ${categoryLabels[category]}`, 16, footerY);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, pageWidth - 16, footerY, { align: "right" });

  doc.save(`ETL-${category.toUpperCase()}-${app.ref_code}.pdf`);
}

export { detectCategory, categoryLabels };
export type { ServiceCategory };
