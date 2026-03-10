# Memory: index.md
Updated: now

# ETL Fiber Portal - Design System

## Colors (HSL)
- Primary: 220 70% 18% (deep navy)
- Secondary: 180 70% 40% (teal/cyan)
- Accent: 25 95% 53% (orange for CTAs)
- Background: 220 20% 97%

## Fonts
- Display: Space Grotesk
- Body: Inter

## Architecture
- Telecom portal for Econet Telecom Lesotho
- Auth with roles: admin, customer, technician
- Lovable Cloud enabled with profiles + user_roles tables
- Admin route protected (requires admin role)
- Track route now protected (requires login)
- Leaflet maps with dark CARTO tiles + ESRI satellite toggle
- Fiber nodes = Access Points (APs) with capacity/connected_customers
- AI AP suggestions via edge function (suggest-ap) using Lovable AI
- PDF application download via jsPDF (branded ETL)
- Enhanced application form: national_id, address, building_type, floors, nearest_landmark, preferred_date, notes

## Key Decisions
- New users auto-assigned "customer" role via trigger
- Profiles auto-created on signup via trigger
- Button variants: hero (orange CTA), glow (cyan outline)
- SPA routing: public/_redirects for refresh handling
