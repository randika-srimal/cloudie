---
client: "Metropolitan Memorial Parks"
display_name: "A NSW Government entity managing cemetery and memorial services"
status: anonymous
url: null
industry: ["Government", "consumer services"]
region: []
hubs: []
migration_from: []
updated: 2026-11-18
---

The entity is a NSW Government entity that manages public cemeteries, serving diverse communities through burial, cremation, and memorial services. Custom funeral director portal across four sites, byondpro and PlotBox integrations.

## Case study document

**Metadata (155 chars):**
How Engaging.io built a custom portal to unify funeral director bookings, document management, and service scheduling across four cemetery sites.

**AI Narration: NA**

**Industry:**
Government

**About the Business:**
The entity is a NSW Government entity that manages public cemeteries, serving diverse communities through burial, cremation, and memorial services.

**Project Timeline:**
3 years (multiple phases)

**Integration**:
PlotBox, Byondpro, AWS S3

**Customer website link:**

### Metric Block:

4 Cemetery sites connected
3 Phases of custom portal development
21+New features delivered in Phase 3 alone

### Summary of the business:

Today, the entity oversees a network of cemeteries. Four of these sites are now connected through the Funeral Directors Portal, with the platform built to scale across the remaining network as the entity continues to grow.

For the funeral directors who rely on these sites every day, coordinating bookings across multiple cemeteries and service types was a complex, paper-heavy process. The entity needed a digital platform built to their exact requirements, not an off-the-shelf product. The solution was a purpose-built custom portal that could handle the operational and compliance demands of a government-adjacent organisation at scale.

###  The Problem

**Subheading**: Managing bookings across four sites without the systems to support it

When the entity formed in 2023, it inherited the operational complexity of three separate entities, each with its own cemetery management system, workflows, and digital infrastructure. The funeral directors interacting with sites every day were navigating manual processes across multiple sites, with no unified digital entry point and no system capable of preventing double-bookings, managing compliance documents, or tracking service status in real time.

**Problem 1**: Funeral directors regularly work across multiple sites, booking burials, cremations, and chapel services that each carry their own requirements, timing rules, and document checklists. And they don't work nine to five, services are arranged on evenings and weekends, and families can't wait for business hours to open. Without a unified portal, every interaction happened outside of a system: by phone, by email, or through manual coordination between funeral director and cemetery staff. After-hours requests meant a delay, a follow-up call, or an unresolved booking sitting until the next business day, a real consequence for funeral directors managing time-sensitive family arrangements.

**Problem 2**: The entity operates across two byondpro instances and PlotBox at its largest cemetery, three separate cemetery management systems that don't talk to each other. Chapel availability, burial slots, and cremation schedules were managed separately, which meant a chapel booking at one site had no awareness of a burial scheduled in the same window. The risk of conflicts was real, and the administrative overhead of managing it manually was significant.

**Problem 3**: As a NSW Government entity managing sensitive end-of-life services, the entity had strict requirements for security, accessibility, and data handling, multi-factor authentication, audit logging, role-based access controls, WCAG AA compliance, and Australian data hosting. The portal also needed to handle legally sensitive document types (coroner's orders, cremation permits, burial application forms) with the right upload controls, override capabilities, and document tracking built in. No standard platform offered this out of the box.

**Problem 4**: As the entity expanded to include two further large sites, the number of sites, service types, and funeral director relationships that needed to be managed digitally grew rapidly. The original portal covered only two sites, leaving the rest of the network unconnected. The platform needed to be built to accommodate the full network as each remaining site comes online.

### The Solution

**Subheading**: A custom portal built to handle the full complexity of multi-site funeral director management

Engaging.io designed and built a custom Funeral Directors Portal that became the single entry point for every funeral director working across the entity's cemetery network. Rather than adapting a generic tool to fit an unfit purpose, we built the portal from the ground up, connecting to all three cemetery management systems, enforcing the correct rules for every service type and site, and giving the entity's team the admin control and audit capability a government-standard operation requires.

The build didn't happen all at once. We delivered it in three structured phases, each adding a new layer of functionality as the entity's network and requirements grew.

### The Strategic Plan:

* **Step 1: Establish the foundation and migrate the brand**
  We built the initial FD portal for its first two sites, then rebranded it for the entity, updating its web addresses and laying the groundwork for the multi-site architecture that would follow.
* **Step 2: Connect the growing network**
  With two further large sites coming online, we extended the portal to cover all four major sites. We integrated PlotBox (at its largest cemetery) alongside the existing byondpro connections, and built the workweek calendar view and chapel availability quick-check tool that operations teams needed to manage scheduling across sites in real time.
* **Step 3: Implement government-grade security and admin controls**
  We introduced multi-factor authentication across all portal logins, two-tier admin access (Super Admin and Area Admin), audit logging visible only to internal the entity staff, and IP-restricted read-only database access. These controls were designed to meet the security and accountability requirements of a government-adjacent organisation handling legally sensitive documentation.
* **Step 4: Build the document and compliance layer**
  We built out document upload and management across every service type — burial, cremation, chapel-only, and combined services — with the correct document options for funeral director and coroner pathways, override capability for incorrect selections, and support for additional compliance documents (embalming certificates, pacemaker removal slips) based on service type.
* **Step 5: Extend with advanced functionality and long-term support**
  In Phase 3, we delivered over 20 new features, including the "Pickup NSNA" booking type for selected funeral directors, FD registration and insurance document management, soft-delete across bookings, FDs, and users (replacing hard delete with a status-driven approach), and the ability for funeral directors to switch between multiple FD portals. We then transitioned the engagement to an ongoing support retainer to ensure the platform continues to evolve with the entity's needs.

### The Implementation:

**Subheading:** How we built a portal capable of managing four sites with government-grade compliance requirements

The portal is a custom web application, hosted on the Crucial platform with separate UAT and production environments maintained throughout the engagement. Documents uploaded through the portal are stored in an AWS S3 bucket, while booking details and system data live in a MySQL database — a separation that ensures document integrity is maintained independently of application state.

Integrating with three cemetery management systems was the most technically complex part of the build. The entity operates byondpro across its Southern and Northern sites and PlotBox at its largest cemetery, and none of these systems share a common API structure.

We built direct integrations enabling real-time calendar synchronisation across chapel and burial bookings, so that a booking made in the portal reflects immediately and prevents conflicts at the scheduling layer. The portal also pulls booking status updates from byondpro, feeding the status flow visible to the entity staff on the Booking Requests Summary screen..

Booking logic across service types required significant custom build. Chapel and burial combinations, cremation-only, chapel-only, and the NSNA pickup type each carry different timing rules, document requirements, and availability constraints. We built this as conditional logic within the portal — so a funeral director selecting a Chapel + Burial service sees a two-day minimum lead time (not next-day), and a cremation booking between 9am and 2pm surfaces the witness insertion question automatically. These rules aren't static settings, they're enforced at the application layer to prevent workflow errors.

The admin layer was designed for a large, distributed organisation. Super Admins have full system access; Area Admins manage site-specific content and funeral directors without touching other locations. This tiering means the entity can decentralise day-to-day portal management across teams without creating security or data integrity risks at the organisation level.

Security was built to government-adjacent standards throughout: MFA on all logins, restricted external database access, Crucial's intrusion and threat detection infrastructure, and audit logging on every booking record — visible to internal staff, hidden from funeral directors.

### Impact and Results

Subheading: A platform that's grown with the entity, and keeps growing

What started as a portal for two cemetery sites is now the operational backbone for the entity's entire funeral director network. Four sites and service types, three integrated cemetery management systems, and hundreds of funeral director interactions are now managed through a single platform, with the document controls, security standards, and audit trail that a government organisation requires.

The custom build means the entity isn't constrained by what a product allows. When its largest cemetery came online, we connected it. When the next site followed, we extended the portal. When the compliance requirements shifted, we built the controls to match. The ongoing support retainer ensures that as the entity's network continues to evolve, the platform evolves with it.

For the funeral directors using the portal every day, the experience has changed from a manual, phone-and-email workflow to a purpose-built digital platform where they can book services, upload required documents, check availability, and manage their FD profile, across every site, in one place.
