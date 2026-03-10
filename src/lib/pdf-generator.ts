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
}

export function generateApplicationPDF(app: ApplicationData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Brand header
  doc.setFillColor(18, 36, 66); // primary navy
  doc.rect(0, 0, pageWidth, 45, "F");

  // Accent bar
  doc.setFillColor(237, 137, 36); // orange accent
  doc.rect(0, 45, pageWidth, 3, "F");

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("ECONET TELECOM LESOTHO", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Fiber Service Application", pageWidth / 2, 30, { align: "center" });

  doc.setFontSize(9);
  doc.text(`Reference: ${app.ref_code}`, pageWidth / 2, 38, { align: "center" });

  // Reset for body
  doc.setTextColor(30, 41, 59);
  let y = 58;

  const addSection = (title: string) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFillColor(240, 243, 248);
    doc.rect(14, y - 5, pageWidth - 28, 8, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(18, 36, 66);
    doc.text(title, 16, y);
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

  // Application Info
  addSection("APPLICATION DETAILS");
  addField("Reference", app.ref_code);
  addField("Status", app.status);
  addField("Date Submitted", new Date(app.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }));
  addField("Account Type", app.account_type?.charAt(0).toUpperCase() + app.account_type?.slice(1));

  y += 4;
  addSection("CUSTOMER INFORMATION");
  addField("Full Name", app.customer_name);
  addField("National ID", app.national_id);
  addField("Email", app.email);
  addField("Phone", app.phone);
  addField("Address", app.address);

  y += 4;
  addSection("SERVICE & LOCATION");
  addField("Service Plan", app.service);
  addField("District", app.district);
  addField("Location / Area", app.location);
  addField("Building Type", app.building_type?.charAt(0).toUpperCase() + (app.building_type?.slice(1) || ""));
  addField("Floors", app.floors ? String(app.floors) : null);
  addField("Nearest Landmark", app.nearest_landmark);
  if (app.latitude && app.longitude) {
    addField("GPS Coordinates", `${app.latitude}, ${app.longitude}`);
  }
  addField("Preferred Date", app.preferred_date);

  if (app.technician || app.scheduled_date) {
    y += 4;
    addSection("ASSIGNMENT");
    addField("Technician", app.technician);
    addField("Scheduled Date", app.scheduled_date);
  }

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
  doc.text("Econet Telecom Lesotho — Fiber Service Application", 16, footerY);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, pageWidth - 16, footerY, { align: "right" });

  doc.save(`ETL-Application-${app.ref_code}.pdf`);
}
