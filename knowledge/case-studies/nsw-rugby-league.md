---
client: "NSW Rugby League"
display_name: "NSW Rugby League"
status: draft
url: null
industry: ["Sports and entertainment"]
region: []
hubs: []
migration_from: ["Salesforce Marketing Cloud"]
updated: 2026-11-18
---

NSW Rugby League (NSWRL) is the governing body for rugby league in New South Wales, managing participation, community programs, major competitions, and the iconic NSW Blues State of Origin program. The organisation communicates with a broad and complex stakeholder base, from grassroots players and club administrators to sponsors, media, and government representatives, spread across the state and beyond. Migration from Salesforce Marketing Cloud.

## Case study document

**Metadata:**

NSW Rugby League needed to move off the Salesforce Marketing Cloud fast. Here's how Engaging.io built a unified HubSpot platform to replace it.

**Industry:**

Sports & Entertainment

**HubSpot Licensing:**

Marketing Hub Enterprise, Data Hub Professional

**About the Business:**

NSW Rugby League (NSWRL) is the governing body for rugby league in New South Wales, managing participation, community programs, major competitions, and the iconic NSW Blues State of Origin program. The organisation communicates with a broad and complex stakeholder base, from grassroots players and club administrators to sponsors, media, and government representatives, spread across the state and beyond.

**Project Timeline:**

Approximately 4 months

**Integration**:

Salesforce (native connector), MessageMedia (Cinch SMS)

**Customer website link:**

nswrl.com.au

### Metric Block:

* ~100,000 / Contact records synced with high accuracy in first migration pass
* 8 / Email templates rebuilt in HubSpot within the first week

### Summary of the business:

If your organisation runs a large, multi-segment contact database across fragmented systems, and a platform transition is forcing the issue, this case study outlines a solution for how to migrate platforms efficiently and effectively.

NSW Rugby League governs rugby league across New South Wales, communicating with everyone from grassroots players and club administrators to sponsors, media, and government representatives. Their contact data was spread across Salesforce Marketing Cloud, a legacy Salesforce CRM, and manual exports — with no single view of a contact and a platform licence about to expire. Engaging.io built the unified HubSpot infrastructure to replace it.

### The Problem

H2: Fragmented data, an expiring licence, and a compliance risk hiding in plain sight

*For sports and entertainment organisations managing large, fragmented contact databases, this project demonstrates what a structured migration from Salesforce Marketing Cloud to HubSpot can unlock.*

NSWRL had built its marketing operations on the Salesforce Marketing Cloud, but the platform wasn't keeping pace with how the organisation needed to work. When a licence expiry forced a rapid transition, it exposed how fragile the foundation had become.

1. NSWRL's contact database held approximately 100,000 records — but it was spread across Salesforce Marketing Cloud, a legacy Salesforce CRM, MySideline (the NRL's participation management system), and manual CSV exports. There was no single view of a contact. Segmentation was inconsistent, with some lists filtered dynamically and others maintained as static snapshots with no clear owner. The team referred to their CRM as a "phonebook" — a description that captured both its limitations and the opportunity ahead.

2. The Salesforce Marketing Cloud licence was days from expiry when the engagement began. Subscription preferences, unsubscribe lists, suppression data, and email templates all needed to be extracted and rebuilt in HubSpot before access was cut off. A delayed or incomplete extraction would have meant sending campaigns to contacts whose preferences weren't honoured — a compliance risk and a deliverability risk in one.
3. NSWRL wanted SMS as a channel for urgent community communications and automated follow-ups. HubSpot's native SMS product isn't supported in Australia. The team needed a compliant, cost-effective alternative that would integrate natively rather than sit outside the HubSpot environment.

### The Solution

How Engaging.io unified NSWRL's contact data and rebuilt their marketing stack in HubSpot

Engaging.io designed a structured migration that moved NSWRL from a fragmented, expiring marketing stack to a unified HubSpot environment, without disrupting ongoing campaign activity during the transition. The work spanned an emergency extraction phase, a full Salesforce-to-HubSpot data migration, platform configuration, and a structured enablement programme to bring the internal team up to speed on running campaigns independently. To solve the SMS gap, Engaging.io integrated MessageMedia (Cinch) as a native, locally compliant channel. The result is a single marketing platform that connects NSWRL's contact data, campaign tools, segmentation, and reporting in one place for the first time.

### The Strategic Plan:

**Step 1: Rescue before rebuild** With the Marketing Cloud licence expiring within days of kick-off, the immediate priority was extraction, not implementation. All email templates, subscription preferences, unsubscribes, and suppression lists were extracted from Marketing Cloud and rebuilt in HubSpot within the first week, using a two-round approach: raw HTML imports first to maintain sending capability, followed by properly structured drag-and-drop templates.

**Step 2: Connect the data** With the immediate sending risk resolved, Engaging.io configured the Salesforce native connector and ran the initial contact sync. Approximately 100,000 records transferred with only around 160 invalid email addresses — a result that validated the quality of NSWRL's core data. Contact type, subscription preferences, and the four preference checkboxes (State of Origin, Blatchys Blues, Major Comps, Community) all mapped cleanly into HubSpot properties.

**Step 3: Build the segmentation architecture** Static Salesforce lists were replicated as active (dynamic) lists in HubSpot, filtering on contact type and subscription status rather than manual curation. A preference centre was configured, consent architecture was aligned to compliance requirements, and a structured approach to marketing contacts — a subset of the total database — was established to ensure campaign sends reached the right people.

**Step 4: Automate and enable** Six nurture workflows were configured, including a welcome email automation triggered on form submission. Ten segmentation lists were built. Two reporting dashboards were set up. The team then received live training covering contact records, email creation, segmentation, list management, and campaign tools — with recorded walkthroughs added to an internal knowledge base for ongoing reference.

**Step 5: Extend the platform** As the structured rollout progressed, NSWRL's ambitions expanded. MessageMedia (Cinch) was integrated for SMS — chosen because it's natively compatible with HubSpot and locally licensed, unlike HubSpot's native SMS product which isn't available in Australia. A data consolidation workstream addressed legacy field conflicts, standardised address and state data across Salesforce and HubSpot sources, and laid the groundwork for MySideline data integration in a future phase.

### The Implementation:

The project launched in emergency mode. With the Salesforce Marketing Cloud licence expiring within ten days of kick-off, Engaging.io ran daily syncs and an in-person working session in the first week to extract assets and configure HubSpot in parallel.

All eight email templates from Marketing Cloud were rebuilt in HubSpot using a drag-and-drop structure, with footers configured to pull the correct unsubscribe and preference management links automatically. A newsletter subscription form was built, connected to a welcome email workflow, and embedded on a temporary HubSpot landing page while consent wording went through NSWRL's legal review process — an approach that allowed workflow testing to begin without waiting for public-facing form approval.

The Salesforce native connector was configured with System Admin and API-level permissions on the Salesforce side. The initial sync focused on the core fields needed to support sending — name, email, contact type, subscription preferences, and the four preference checkboxes — rather than attempting a full data migration at once. This kept the first sync clean and fast. Backup exports of all static Salesforce lists were stored in a data-sensitive folder before the sync ran, as a safeguard against data loss during transition.

For SMS, HubSpot's native product was ruled out early — it isn't available in the Australian market. Engaging.io integrated MessageMedia (Cinch) as the preferred solution: natively integrated with HubSpot, locally licensed, and cost-effective for the volume of community communications NSWRL sends.

Following the initial migration, a dedicated data consolidation workstream tackled the legacy field architecture. The Salesforce "State" field was identified as a registration or playing state, not an address state — contacts based in Fiji, for example, were listed with a New South Wales state because that's where their competition was registered. Rather than merging these fields, Engaging.io renamed and separated them (Registration State / Address State) to preserve the data integrity. Address harmonisation workflows were built to consolidate address data across Salesforce and HubSpot sources without overwriting populated fields. Drop-down properties were standardised, duplicate values merged, and large mass updates — including Favourite State Team across approximately 400,000 records — were scheduled after business hours to avoid performance disruption.

### Impact and Results A unified contact database, active segmentation, and a team running campaigns independently

NSWRL moved from a fragmented, expiring marketing stack to an active HubSpot environment without a gap in campaign delivery. The transition happened faster than a standard rollout because the team arrived prepared and the Engaging.io delivery team matched that urgency — daily syncs, in-person working sessions, and parallel workstreams compressed what is typically a twelve-week implementation into a functional sending environment within the first week.

The data infrastructure that now sits in HubSpot gives NSWRL a foundation that Salesforce Marketing Cloud couldn't offer: a single contact record that consolidates marketing preferences, subscription opt-ins, participation history, and company associations in one place. The team can now build and send campaigns directly, without relying on manual list exports from multiple systems. Active segmentation lists update automatically as contact data changes — meaning an unsubscribe or a new opt-in is reflected in send lists immediately, not at the next manual refresh.

Looking ahead, the platform is ready for what comes next. MySideline data from the NRL's participation system is scoped for integration, which will add playing history, regional affiliation, and registration type to every relevant contact record. The data model has been designed to receive this — the field architecture is clean, standardised, and documented. Phase 2 will expand into full CRM migration, deal pipelines for sponsor and suite sales, and Service Hub for participant and sponsor case management.
