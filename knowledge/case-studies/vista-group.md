---
client: "Vista Group"
display_name: "Vista Group"
status: draft
url: null
industry: ["Technology", "media"]
region: []
hubs: []
migration_from: []
updated: 2026-11-18
---

Vista Group is a global cinema technology company, listed on the New Zealand and Australian stock exchanges, providing cinema management, ticketing, distribution and data analytics software to cinemas and distributors worldwide through brands including Vista, Movio, Veezi, Numero and Maccs. Five brands unified on HubSpot with Dynamics 365 sync.

## Case study document

**Metadata (155 chars):**  Vista Group unified five brands onto one HubSpot portal and connected Microsoft Dynamics 365, migrating off Marketo before its retirement deadline.

**Industry:** Sports & Entertainment or Technology

**HubSpot Licensing:** Marketing Hub Enterprise, Content Hub Enterprise, Data Hub Starter

**About the Business:**

Vista Group is a global cinema technology company, listed on the New Zealand and Australian stock exchanges, providing cinema management, ticketing, distribution and data analytics software to cinemas and distributors worldwide through brands including Vista, Movio, Veezi, Numero and Maccs.

**Project Timeline:**

4 Months

**Integration**: Microsoft Dynamics 365 (native connector)

**Customer website link:** https://vista.co

### Metric Block:

5 / Brands unified onto one HubSpot portal
2 / Dedicated Business Units built for Vista Group's flagship brands
5 / Matching email and landing page templates built, one per brand
Migrated / Off Marketo ahead of its retirement deadline

### Summary of the business:

Vista Group is a publicly listed, New Zealand-founded technology company and the global leader in cinema management software, with products installed in cinemas across more than 80 countries.

Its brands span the film industry end to end: Vista for large cinema circuits, Veezi for independent exhibitors, Movio for moviegoer data and campaign analytics, and Maccs and Numero for film distribution and box office reporting.

A ten-person marketing team supports all five brands, running largely account-based and product-education campaigns for an existing base of enterprise cinema clients rather than high-volume lead generation. When Vista Group set out to move off Marketo and bring its marketing operations under one roof, it needed a platform that could handle five brands' worth of complexity without needing five times the team to run it.

###  The Problem

Subheading: Five brands, one lean team, and no shared system to run them from

#### Problem 1: Vista Group's five brands; Vista, Movio, Veezi, Numero and Maccs — each ran their own subscription types, forms and email templates, with no shared structure connecting them. For a ten-person team responsible for all five, this meant nearly every task had to be done five times over: updating a subscription preference, refreshing a nurture email, or embedding a form meant repeating the same work brand by brand inside Marketo, with no way to make a change once and have it apply everywhere it needed to.

Problem 2: Marketo itself was a problem Vista Group hadn't chosen — the platform had been inherited from a previous team and was considerably more complex than the marketing team's day-to-day needs called for. The people who had originally built the setup had since moved on, so nobody currently on the team could fully explain how existing campaigns and automations actually worked, which meant any troubleshooting or change was made without a clear picture of what might break. That knowledge gap collided with a fixed deadline: Vista Group was required to be fully off Marketo by its retirement date, leaving no room to untangle the complexity slowly.

Problem 3: Vista Group's customer and account data lived in Microsoft Dynamics 365, entirely separate from Marketo, with no native connection between the two. That left marketing with no reliable way to keep contact and company records in sync with the CRM that sales and customer teams used every day — any update on one side had no guaranteed path to the other, which is exactly the kind of gap that lets two systems quietly drift apart and erodes trust in both.

### The Solution

Subheading: One HubSpot portal, built around how Vista Group's brands actually work

Engaging.io ran a structured HubSpot Marketing Hub Enterprise and Content Hub Enterprise onboarding built around Vista Group's real brand structure, rather than forcing every brand into one generic setup. Vista and their other brand, Veezi, were configured as dedicated HubSpot Business Units, while the group's smaller and dormant brands were consolidated onto shared infrastructure — giving every brand matching email and landing page templates, forms and subscription types without duplicating the work five times over.

Alongside this, we configured the native Microsoft Dynamics 365 connector so Vista Group's marketing and CRM data could talk to each other for the first time, mapping out which fields would sync automatically and flagging the handful that needed a manual workaround. We chose the native connector over a custom-built integration because Vista Group's sync needs didn't call for the added cost and complexity of bespoke middleware — though, as covered below, a small number of field types needed a workaround regardless.

The Strategic Plan:

**Map the brand landscape**
Before touching HubSpot, we audited Marketo's existing configuration across all five brands: subscription types, forms, active lists, and how, or whether, each brand's campaigns actually worked. This gave us a clear picture of what needed to move, what could safely be retired, and where the five brands genuinely differed versus where they could share infrastructure. That groundwork mattered more than usual here, since nobody at Vista Group could fully explain the existing Marketo setup, we couldn't rely on the client to tell us what was safe to change.

**Design a structure that matches how the team works**
Rather than default to one flat HubSpot setup for all five brands, or five fully separate portals, we configured Business Units so Vista Group's two flagship brands could each operate independently, with their own templates, permissions and reporting, while the group's smaller and dormant brands shared consolidated infrastructure. We built matching email and landing page templates for every brand at the same time, so no brand launched without the full set of assets it needed. This structure was chosen specifically to match team size to brand activity: full autonomy where it earns its keep, shared setup where it doesn't.

**Connect the CRM**
With the brand structure in place, we configured the native Microsoft Dynamics 365 connector, working through the field mapping to confirm what would sync automatically. We chose the native connector over custom middleware because Vista Group's requirements didn't call for the cost or complexity of a bespoke build. This step also surfaced the handful of field types, Dynamics lookups and multi-select properties, that the native connector couldn't handle directly, which needed a workaround resolved before data migration could safely begin.

**Migrate, train, launch**
Once the structure and CRM connection were confirmed, we migrated Vista Group's core contact data via a straightforward CSV import, in line with their existing data hygiene process, and built out the active lists, dashboards and nurture workflows the team would need from day one. We closed with train-the-trainer sessions split across marketing operations and admin permissions, so Vista Group's own power users would be the ones running and extending the platform once we stepped back. Sequencing training last was deliberate: there was no point training the team on infrastructure that hadn't been fully migrated and tested yet.

**The Implementation:**

Engaging.io built Vista Group's HubSpot Marketing Hub Enterprise and Content Hub Enterprise environment around a two-tier Business Unit structure: Vista Group's two flagship brands Vista and Veezi each got a dedicated Business Unit with its own templates, permissions and reporting, while the group's smaller and dormant brands shared a consolidated setup. Rather than building five separate portals, or forcing every brand into one flat structure, this let Vista Group's most active brands operate independently while the rest ran lean, matching how a ten-person team actually needed to work day to day.

Across all five brands, we built five modular marketing email templates and five modular landing page templates in Content Hub, one set per brand, alongside brand-specific subscription types and unsubscribe pages. Forms were configured for client embedding, with subscription preferences and inquiry-type logic built into the routing so the right notifications reach the right people without manual handoffs.

On the CRM side, we configured the native Microsoft Dynamics 365 connector rather than building custom middleware, since Vista Group's sync requirements didn't justify the cost of a bespoke integration. The native connector handles most standard field types cleanly, but Dynamics 365 lookup fields (relationships to another record) can't be mapped directly into HubSpot, and multi-select option sets needed the same treatment. Where this mattered for business-critical properties, we worked with Vista Group's team to create duplicate, HubSpot-compatible properties that could sync where the native mapping couldn't reach , a targeted workaround rather than a full custom build, kept to the fields that actually needed it.

Data migration was scoped as a simple CSV contact import rather than a complex, deduplicated migration, in line with Vista Group's existing data hygiene processes. We also built out active lists and segments, including a dedicated list for contacts not receiving marketing communications, two standard reporting dashboards, and automated nurture email workflows across multiple streams, left in draft for Vista Group's team to review, edit and launch on their own timeline. Training closed out the engagement: a train-the-trainer model covering both marketing operations (navigation, workflows, segmentation) and admin permissions, so Vista Group's power users could take over and extend the platform without ongoing hand-holding.

### Impact and Results

Subheading: Five brands, one system, and a foundation to grow on

With onboarding complete, Vista Group's ten-person marketing team now runs email, landing pages, forms and subscription management for all five brands from a single HubSpot portal, instead of piecing together brand-by-brand configurations in Marketo. Work that once had to be repeated five times, once per brand, in a platform nobody fully understood, can now be done once and applied everywhere it's needed, with each brand's dedicated Business Unit or shared setup handling the parts that genuinely need to stay separate. For a lean team supporting five brands, that shift matters less as a technical upgrade and more as time back: less of the week spent maintaining five parallel versions of the same infrastructure, more of it spent on the marketing itself.

The native Microsoft Dynamics 365 connection closes a gap that had no solution before this project. Contact and company data can now move between the marketing platform and the CRM that Vista Group's sales and customer teams already rely on every day, rather than living in two disconnected systems that quietly drifted further apart the longer they went unconnected. For a company managing long-term relationships with enterprise cinema chains and distributors, that's not a nice-to-have, it's the difference between a sales team working from an accurate, current picture of a client relationship and one working from a stale one.

Just as importantly, Vista Group completed the move off Marketo ahead of the platform's retirement deadline, without the disruption a rushed, last-minute migration usually brings. The train-the-trainer sessions delivered as part of the engagement mean this isn't a system Vista Group has to depend on Engaging.io to operate day to day, their own marketing and admin teams can run, adjust and extend HubSpot independently from here. That's what sets this up for the future: with five brands now sitting on shared, well-documented infrastructure instead of five different flavours of the same setup, Vista Group is in a stronger position to bring any future brand, product line or market into the fold without starting from scratch each time, and to do it without needing to grow the team that runs it.
