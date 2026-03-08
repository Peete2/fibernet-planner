export interface Application {
  id: string;
  customerName: string;
  service: string;
  location: string;
  latitude: number;
  longitude: number;
  status: "Submitted" | "Site Survey" | "Approved" | "Installation Scheduled" | "Completed";
  dateCreated: string;
  technician?: string;
  district: string;
}

export interface FiberNode {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  status: "Active" | "Planned" | "Maintenance";
}

export const LESOTHO_CENTER: [number, number] = [-29.61, 28.23];

export const DISTRICTS = [
  "Maseru", "Leribe", "Berea", "Mafeteng", "Mohale's Hoek",
  "Quthing", "Qacha's Nek", "Mokhotlong", "Thaba-Tseka", "Butha-Buthe"
];

export const mockApplications: Application[] = [
  { id: "ETL-2026-001", customerName: "Thabo Mokhesi", service: "Fiber 100Mbps", location: "Maseru Central", latitude: -29.31, longitude: 27.48, status: "Installation Scheduled", dateCreated: "2026-02-15", technician: "Mpho Letsie", district: "Maseru" },
  { id: "ETL-2026-002", customerName: "Lineo Phakisi", service: "Fiber 50Mbps", location: "Roma", latitude: -29.45, longitude: 27.70, status: "Site Survey", dateCreated: "2026-02-20", district: "Maseru" },
  { id: "ETL-2026-003", customerName: "Tumelo Nkosi", service: "Fiber 200Mbps", location: "Hlotse", latitude: -28.87, longitude: 28.05, status: "Completed", dateCreated: "2026-01-10", technician: "Retselisitsoe Mota", district: "Leribe" },
  { id: "ETL-2026-004", customerName: "Palesa Molapo", service: "Fiber 100Mbps", location: "Teyateyaneng", latitude: -29.15, longitude: 27.75, status: "Approved", dateCreated: "2026-03-01", district: "Berea" },
  { id: "ETL-2026-005", customerName: "Motlatsi Ramone", service: "Wireless 20Mbps", location: "Mafeteng Town", latitude: -29.82, longitude: 27.24, status: "Submitted", dateCreated: "2026-03-05", district: "Mafeteng" },
  { id: "ETL-2026-006", customerName: "Malebogo Sello", service: "Fiber 100Mbps", location: "Maseru West", latitude: -29.33, longitude: 27.45, status: "Submitted", dateCreated: "2026-03-06", district: "Maseru" },
  { id: "ETL-2026-007", customerName: "Tsepang Mohale", service: "Fiber 50Mbps", location: "Butha-Buthe", latitude: -28.77, longitude: 28.25, status: "Completed", dateCreated: "2026-01-25", technician: "Thabo Letsie", district: "Butha-Buthe" },
  { id: "ETL-2026-008", customerName: "Rethabile Khoase", service: "Fiber 200Mbps", location: "Leribe", latitude: -28.88, longitude: 28.04, status: "Installation Scheduled", dateCreated: "2026-02-28", technician: "Mpho Letsie", district: "Leribe" },
];

export const mockFiberNodes: FiberNode[] = [
  { id: "FN-001", name: "Maseru Hub", latitude: -29.31, longitude: 27.48, capacity: 10000, status: "Active" },
  { id: "FN-002", name: "Roma Node", latitude: -29.45, longitude: 27.70, capacity: 2000, status: "Active" },
  { id: "FN-003", name: "Hlotse Node", latitude: -28.87, longitude: 28.05, capacity: 5000, status: "Active" },
  { id: "FN-004", name: "TY Node", latitude: -29.15, longitude: 27.75, capacity: 3000, status: "Active" },
  { id: "FN-005", name: "Mafeteng Node", latitude: -29.82, longitude: 27.24, capacity: 1500, status: "Planned" },
  { id: "FN-006", name: "Mohale's Hoek Node", latitude: -30.15, longitude: 27.47, capacity: 1000, status: "Planned" },
  { id: "FN-007", name: "Butha-Buthe Node", latitude: -28.77, longitude: 28.25, capacity: 2000, status: "Active" },
  { id: "FN-008", name: "Mokhotlong Node", latitude: -29.29, longitude: 29.07, capacity: 500, status: "Planned" },
];

export const fiberRoutes = [
  { name: "Maseru → Roma", coords: [[-29.31, 27.48], [-29.38, 27.55], [-29.45, 27.70]] },
  { name: "Maseru → TY → Hlotse", coords: [[-29.31, 27.48], [-29.15, 27.75], [-28.87, 28.05]] },
  { name: "Hlotse → Butha-Buthe", coords: [[-28.87, 28.05], [-28.77, 28.25]] },
  { name: "Maseru → Mafeteng", coords: [[-29.31, 27.48], [-29.55, 27.35], [-29.82, 27.24]] },
];

export const heatmapData: [number, number, number][] = [
  [-29.31, 27.48, 0.95],
  [-29.33, 27.45, 0.85],
  [-29.30, 27.50, 0.80],
  [-29.35, 27.47, 0.70],
  [-29.45, 27.70, 0.60],
  [-28.87, 28.05, 0.75],
  [-29.15, 27.75, 0.55],
  [-29.82, 27.24, 0.40],
  [-28.77, 28.25, 0.45],
  [-29.29, 29.07, 0.20],
  [-30.15, 27.47, 0.30],
  [-29.28, 27.52, 0.65],
  [-29.32, 27.44, 0.70],
  [-28.90, 28.10, 0.50],
  [-29.50, 27.68, 0.35],
];
