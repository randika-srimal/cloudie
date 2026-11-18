---
client: "Dream Vacations"
display_name: "Dream Vacations"
status: draft
url: null
industry: ["Tourism and travel", "franchising"]
region: []
hubs: []
migration_from: ["SugarCRM"]
updated: 2026-11-18
---

Dream Vacations is a US-based franchise network operating under World Travel Holdings, one of the largest travel franchise systems in North America, helping prospective franchisees find their path into the travel industry. Migration from SugarCRM, Adobe Sign, franchise disclosure workflow.

## Case study document

**Metadata (155 chars):** How Dream Vacations unified fragmented sales and marketing systems in HubSpot to automate lead management across a national franchise network.

**AI Narration:**

**Industry:**
Experience & Travel / Hospitality

**HubSpot Licensing:**

HubSpot for Marketers Enterprise, Sales Hub Enterprise, Data Pro

**About the Business:**

Dream Vacations is a US-based franchise network operating under World Travel Holdings, one of the largest travel franchise systems in North America, helping prospective franchisees find their path into the travel industry.

**Project Timeline:**

10 weeks

**Integration**:

SugarCRM (custom lead push), Adobe Sign, Zoom (webinar), Active Campaign (data migration), Gravity Forms / Zebra Studio

**Customer website link:**
https://www.dreamvacationsfranchise.com/

### Metric Block:

* 2 data migrations completed (Active Campaign contacts + SugarCRM leads)
* 1 custom SugarCRM integration built (real-time lead push via AWS Lambda/VPC with static IP)
* 3 email subscription types created (prospecting, webinars, promotions)
* 7 Franchise Development Managers (FDMs) enabled on HubSpot Sales Hub
* 8-email drip nurture rebuilt in HubSpot.
* 3- email sales sequences built in HubSpot
* 8 Workflows whose focus is automating lead status updates and communication driven by lead engagement activities

### Summary of the business:

Dream Vacations is part of World Travel Holdings, one of the largest travel franchise companies in the US. The business recruits prospective franchise owners, everyday people looking to turn a passion for travel into a business, through a structured, document-heavy sales process that spans weeks of nurturing, qualification, and legal due diligence.

With around 2,500 to 3,000 new franchise inquiries coming in every month, and seven dedicated Franchise Development Managers (FDMs) working those leads in parallel, getting the right information to the right person at the right time isn't a nice-to-have — it's the whole game. The systems running that process weren't connected, and the team had reached the point where manual workarounds were no longer a sustainable answer to the volume.

### The Problem

Subheading: A prospect journey no one could see end to end

When a prospective franchisee fills out a form on the Dream Vacations website, they're taking the first step toward a major life decision. The team's job is to make sure what happens next is fast, personal, and consistent. Instead, it was slow, fragmented, and dependent on manual effort that no amount of goodwill could scale.

1. Dream Vacations was running marketing out of Active Campaign, email status automation out of Sugar Market, and sales activity out of SugarCRM — three separate tools with no data bridge between them. When an FDM called a prospect, they had no idea which marketing emails that person had received or whether they'd opened them. When marketing sent a campaign, they couldn't see what stage the prospect was at in the sales pipeline. The two sides of the same journey were operating in the dark about each other, and the prospect in the middle experienced the consequences as inconsistent, disjointed outreach.

2. Every lead, regardless of where they were in their decision journey, entered the same queue and followed the same path. With 2,500 to 3,000 new inquiries arriving each month, the team needed a smarter way to prioritise without adding headcount.

3. With that volume of inbound leads, duplicates were inevitable, and they were arriving in the hundreds. In a single month, over 250 duplicate records needed manual review. Leads who had previously opted out could re-enter the system through a different channel, making it difficult to honour preferences consistently at scale. Each duplicate required human verification, cross-referencing phone numbers, email addresses, and name variations, before it could be safely handled. It was operational noise at scale.

4. When a prospect signed the Franchise Disclosure Document (FDD), a legally mandated 14-day due diligence period began, during which no selling was permitted. Adobe Sign had no integration with SugarCRM, so document signatures weren't visible in the CRM. Tracking the 14-day window relied on manual status updates, with no automated trigger connected to the signing event. Without that link, the window had to be monitored and managed by hand.

### The Solution

Subheading: Rebuilding lead routing around automation

Engaging.io replaced the fragmented three-system stack with a unified HubSpot environment that connected marketing and sales into a single source of truth, rebuilt the lead management process around automation rather than manual effort, and delivered a custom real-time integration that pushed converted lead data directly into SugarCRM — preserving the existing downstream processes the business needed to keep.

### The Strategic Plan:

**Step 1 — Consolidate and connect**
The plan began by establishing a single source of truth. Marketing contacts from Active Campaign and lead records from SugarCRM were migrated into HubSpot, and the existing Gravity Forms setup was connected via Zebra Studio to capture new inbound leads natively from that point forward. With all contact and lead data living in one place, both teams would be working from the same record for the first time.

**Step 2 — Rebuild the nurture architecture**
With the data consolidated, the next step was rebuilding the email infrastructure properly. The existing 8-email Active Campaign drip sequence was reconstructed in HubSpot, replacing static campaigns with dynamic, personalised sequences that carried each FDM's name, meeting link, and email signature automatically, so a single template could serve the entire seven-person team. Three distinct subscription types (prospecting, webinars, promotions) were created to give prospects granular opt-out options and protect the team's ability to stay in contact even when someone opted out of one communication type.

**Step 3 — Automate lead routing and the compliance clock**
Rather than leads landing in a manual queue, round-robin assignment logic was built to distribute new inquiries across FDMs automatically from the moment a form was submitted. The FDD compliance clock was brought into the same system: when a prospect's document was signed via Adobe Sign, HubSpot would start the 14-day window automatically and notify the assigned FDM when selling could resume — no manual tracking required.

**Step 4 — Connect to SugarCRM via custom integration**
SugarCRM wasn't going anywhere, the downstream processes built around it were too embedded to replace. Instead, the plan was to feed it better data, faster. A real-time, one-way integration was designed to push qualified lead records from HubSpot into SugarCRM the moment they met the trigger criteria. Given SugarCRM's requirement for a whitelisted static IP address, something HubSpot's workflow infrastructure doesn't provide natively, this required a custom-built middleware layer to bridge the two systems reliably.

**Step 5 — Replace Calendly, add Zoom, unlock better reporting**
The final layer was closing the remaining gaps in the sales and marketing stack. HubSpot's native meeting scheduler replaced Calendly, enabling sequences to self-terminate the moment a prospect booked, eliminating unnecessary follow-up to people who had already engaged. Zoom Webinars was integrated for automated attendee tracking and follow-up. And for the first time, both teams would have shared dashboards giving them visibility into the full prospect journey from first touch to qualified lead.

### The Implementation:

The technical centrepiece of this project was the SugarCRM integration. Dream Vacations needed qualified lead records from HubSpot pushed in real-time to their existing SugarCRM instance, but SugarCRM required a whitelisted, static IP address, and HubSpot's workflow infrastructure doesn't provide one natively.

Engaging.io's solution architect Daniel Donado designed a three-layer architecture to solve this. A custom-coded HubSpot workflow action, built in Node.js, fires when a contact record meets the qualification trigger criteria. That payload travels to an AWS Lambda function, housed inside a Virtual Private Cloud (VPC) with an Elastic IP assigned as a static outbound address. The Lambda function acts as a middleware: it receives the HubSpot payload, reformats it into the structure Dream Vacations' endpoint expects, and pushes it through. At the other end, Dream Vacations' IT team processes the incoming data to create the lead record in SugarCRM.

This approach kept the integration lightweight and maintainable: a single endpoint, contact-level data, real-time triggering. The static IP hosting was designed to be self-contained and cost-efficient, with annual hosting charges incorporated into the project.

On the marketing side, HubSpot's sequence functionality was configured to carry each FDM's personalized details, name, Calendly link (until replaced), email signature, dynamically, so a single template could serve the entire seven-person team. Sequences were set to self-terminate on reply or meeting booking, eliminating unnecessary follow-up to prospects who had already engaged.

Adobe Sign was integrated to surface document status, opened, signed, directly in HubSpot contact records, removing the manual status-update step and enabling the due diligence automation to trigger correctly without FDM intervention.

Email health was a significant consideration given the scale of the contact database. HubSpot's IP warming process was built into the migration plan, with smaller, targeted sends to engaged contacts during the ramp-up period to protect deliverability.

### Impact and Results

Subheading: Lead assignment that happens automatically

Dream Vacations' sales and marketing teams share a single view of every prospect for the first time. When an FDM picks up the phone, they can see every marketing email that person has received, whether they opened it, and what they clicked. When marketing sends a campaign, they can segment by sales stage and tailor the message accordingly.

Lead assignment that previously required one person to manually divide and distribute hundreds of contacts every week now happens automatically, with round-robin routing distributing leads to FDMs from the moment a form is submitted.

The 14-day FDD compliance window, previously managed on memory and manual status updates, is now tracked in HubSpot automatically, with the FDM notified when the window opens and the status updated without human input.

Three distinct subscription types mean a prospect who opts out of promotional emails doesn't disappear from the system entirely, they can still receive webinar invitations or prospecting communications, protecting the team's ability to stay in contact while respecting the individual's preferences.

Qualified lead data flows in real-time from HubSpot into SugarCRM, giving the downstream team cleaner, more timely records without requiring a platform change on their end.
