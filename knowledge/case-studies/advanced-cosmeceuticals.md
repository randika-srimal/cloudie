---
client: "Advanced Cosmeceuticals"
display_name: "Advanced Cosmeceuticals"
status: draft
url: null
industry: ["Consumer products", "medical and wellness"]
region: []
hubs: []
migration_from: []
updated: 2026-11-18
---

Advanced Cosmeceuticals is a professional skincare distributor supplying cosmeceutical products to clinic owners across Australia through a B2B ordering portal. The business operates multiple brands including AC and DMK, with a D2C operation on Shopify and a B2B portal built on HubSpot CMS.

## Case study document

**Industry:**
Health & Medical

**Region**:
AUS

**Customer website link:**
https://www.advancedcosmeceuticals.com.au/

**Project Timeline:**
6 Months

**Licensing/ Key Products:**
Enterprise Customer platform

**Migrations and Integrations:**
Microsoft Business Central (ERP), WooCommerce, middleware (Cloudways), Skutopia (warehouse)

From broken to reliable: rebuilding a B2B portal that was costing Advanced Cosmeceuticals business

**Metadata (155 chars):** What happens when you inherit a broken integration? Inside the Advanced Cosmeceuticals portal rebuild — and the lessons that came with it.

**About the Business:**
Advanced Cosmeceuticals is a professional skincare distributor supplying cosmeceutical products to clinic owners across Australia through a B2B ordering portal. The business operates multiple brands including AC and DMK, with a D2C operation on Shopify and a B2B portal built on HubSpot CMS.

### Summary of the business:

Advanced Cosmeceuticals is a professional skincare distributor supplying cosmeceutical products to clinic owners and beauty professionals across Australia. The business operates several brands, including AC and DMK,  running its D2C operations through Shopify and its B2B clinic ordering through a custom portal built on HubSpot CMS. With Business Central as the source of truth for inventory, pricing, and customer data, and WooCommerce managing B2B promotions and discounts, the integration architecture sitting behind this portal was both critical and complex.

###  The Problem

Subheading: A portal that was costing the business

When Advanced Cosmeceuticals came to Engaging.io, their B2B portal was in trouble, and had been for some time.

The previous agency had spent twelve months and a significant budget building the portal on HubSpot CMS. The result was a system that looked like it worked until it didn't. Clinic owners were experiencing a 4-hour delay between placing an order on the portal and that order being confirmed in Business Central, a lag that was disrupting operations and costing business. BDMs were frustrated. Clients were churning.

Making matters worse, the agency relationship had broken down. Development stopped every time a developer went on leave. There was no resilience in the team structure, no clear documentation, and no clear path forward. When something broke, there was no reliable hand to fix it.

The business was also sitting at a crossroads on the platform itself. Management was actively questioning whether to stay on HubSpot CMS or migrate to a more performant platform. Any improvement work had to start with understanding what had actually been built.

Problem 1: The order processing delay stemmed from an inefficient integration architecture. The middleware connecting Business Central to HubSpot was one-way, with inventory updates polling at intervals rather than syncing in real
time. This created visible lag at every point in the order journey.

Problem 2: Two critical data feeds, stock availability and shipment tracking, weren't reaching HubSpot in a usable state. Stock availability still ran on a custom SOH API built by the previous agency, applying outdated expiry-date logic from Business Central, even after AC's ERP partner MicroChannel built NetAvailable, a purpose-built real-time stock API. Separately, when orders shipped from Skutopia, tracking data was correctly added to Business Central Sales Orders but had no path into HubSpot — leaving internal teams blind to shipping status and no automated way to notify customers.

### The Solution

Subheading: Stabilise first, build second

Engaging.io took a phased, stabilise-first approach. Rather than proposing a platform migration or a full rebuild, we began by taking ownership of the existing system, understanding it from the inside out, and fixing what was broken before building anything new. This meant inheriting an underdocumented, mid-project codebase from a previous agency, one of the harder realities of rescue work, and working methodically through it before anything else.

The Strategic Plan:

**Step 1: Stabilise and take ownership**
Before any improvement could be made, the system needed a reliable support layer. Engaging.io stood up a maintenance retainer with a clear SLA,  critical issues responded to within 2 hours, serious issues within 4 hours, standard issues within 3 business days, giving AC a predictable, dependable partner. A handover from the previous agency was coordinated as part of the retainer, with EIO developers getting access to the system and learning how it was built.

**Step 2: Audit and understand**
A full system audit was prioritised before any enhancement work began. This included a code review, reverse engineering of the existing integration, and a review of the middleware architecture, the Business Central data flows, and the frontend HubSpot CMS pages. The goal was to understand exactly what was in place before changing anything.

**Step 3: Replace the inventory API**
With the audit complete, EIO replaced the custom Stock on Hand API with the NetAvailable API developed by MicroChannel. This meant reconfiguring the middleware sync, updating inventory calculation logic in both the backend (middleware sync) and the frontend (HubSpot portal and WooCommerce checkout), setting up a staging environment on Cloudways, and cloning affected portal pages for UAT testing before any changes went to production.

**Step 4: Connect shipment tracking**
The final workstream added two new fields, shipment tracking data from Skutopia, routed through Business Central, into HubSpot Deals and the associated contact record. This enabled automated communication and gave internal teams live visibility of shipment status inside the CRM. A 10-minute polling interval was configured to keep the data current.

### The Implementation:

The technical architecture at Advanced Cosmeceuticals was not standard. Rather than a native HubSpot integration, the portal relied on a middleware layer (hosted on Cloudways) that sat between Business Central, WooCommerce, and the HubSpot CMS frontend. This meant changes to any part of the integration required understanding, and testing across four systems simultaneously.

**NetAvailable API replacement:** The existing SOH API applied Business Central expiry-date logic; the new NetAvailable API from MicroChannel was designed to provide real-time net available stock across AC's product range. EIO managed the property mapping from the new API into HubSpot, updated the WooCommerce backend to read from the new inventory logic, and updated the frontend portal to display availability as a binary available/not available state per the agreed product rules (Business Central toggle, inventory level, and tier-based access). A sandbox was built on a separate Cloudways staging server to allow full UAT before anything touched production. Portal pages were cloned within the production HubSpot environment for controlled user acceptance testing.

**Business Central sync — shipment tracking:** Using the GET-AC-Posted-Sales-Shipment API and GET-AC-Customers API provided by MicroChannel, EIO configured the middleware to poll every 10 minutes for new shipment data and sync two tracking fields into the relevant HubSpot Deal object. The associated contact record was also updated using the customer's email address as the unique identifier. This gave both the operational team and the customer visibility of shipment status without manual lookup.

The work involved picking up an existing codebase, with all the undocumented decisions and technical debt that entails, and making it reliable before extending it. That's a different kind of challenge from a greenfield build, and it required a careful, methodical approach: understand first, fix second, build third.

### Impact and Results

Subheading: From unpredictable to dependable

What Engaging.io delivered was a portal AC could actually rely on. The 4-hour order processing delay that had been driving clinic dissatisfaction was addressed through the NetAvailable API integration and middleware reconfiguration. Shipment tracking,  previously invisible to both internal teams and customers, was connected into HubSpot and automated. And the agency relationship that had been a single point of failure was replaced with a structured retainer, clear SLAs, and a team with full system knowledge.

For Advanced Cosmeceuticals, the most important outcome wasn't any single feature. It was the shift from a system they couldn't trust, supported by an agency they couldn't rely on, to one where issues were being addressed in hours rather than weeks.

The infrastructure built during this engagement now supports AC's ongoing decision about whether to remain on HubSpot CMS or migrate platforms. Whatever direction the business chooses, they're making it from a position of stability and information, not guesswork.
