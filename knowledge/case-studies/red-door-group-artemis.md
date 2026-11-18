---
client: "Red Door Group (Artemis)"
display_name: "Red Door Group (Artemis)"
status: draft
url: null
industry: ["Real Estate"]
region: []
hubs: []
migration_from: []
updated: 2026-11-18
---

Artemis, part of Red Door Group, is a premium restaurant and events group based in Singapore, operating three distinct venue brands serving corporate events, weddings, and fine dining guests.

## Case study document

**Industry:**

Restaurants & Clubs

**HubSpot Licensing:**

Marketing Hub Professional, Sales Hub Professional

**About the Business:**

Artemis, part of Red Door Group, is a premium restaurant and events group based in Singapore, operating three distinct venue brands serving corporate events, weddings, and fine dining guests.

**Project Timeline:**
12 weeks

**Integration**:

SevenRooms

### Metric Block:

85k+ Guest contacts unified and deduplicated into a single CRM
3x Venue brands consolidated onto one HubSpot platform
8+ Automated workflows built for lead nurture and event follow-up
Real time - Custom SevenRooms integration syncing reservation data to HubSpot

Summary of the business:

Artemis, part of Red Door Group, is a growing restaurant and events group in Singapore with ambitious plans for expansion. The group operates three distinct venue brands, each with its own identity and guest base, serving everything from intimate fine dining to large-scale corporate functions and weddings.

With a third venue recently launched and the leadership team focused on scaling the business, Artemis needed a platform that could grow with them and give every team member, from marketing to events to operations, confidence that they were working from the same data.

###  The Problem

Subheading: Three restaurants, one big blind spot

Artemis was growing fast. The group had recently introduced a third venue brand and was fielding a high volume of event inquiries across corporate functions and weddings, alongside regular dining reservations. But the systems the team relied on every day were working against them.

Like many businesses in the hospitality industry, the guest data lived in half a dozen disconnected platforms, the sales team had no reliable way to follow up with unconverted leads, and the marketing team was spending more time pulling manual reports than running campaigns. The result was revenue slipping through the cracks at scale.

#### Problem 1: Event leads falling through the cracks

The events team was receiving a high volume of inbound inquiries for corporate events and weddings, but only a fraction of those inquiries were converting to confirmed bookings. When a lead enquired about a date that was already taken, there was no system in place to re-engage them with alternative dates or future availability. Those unconverted leads simply disappeared. With no feedback loop to understand why people were not booking, and no automated follow-up to bring them back, the team was losing significant potential revenue every week. As the group expanded to a third venue, the volume of missed opportunities was compounding.

#### Problem 2: Fragmented guest data across disconnected systems

Guest information was scattered across SevenRooms for reservations, Triple Seat for event management, Campaign Monitor for email marketing, and a combination of spreadsheets and manual processes for reporting. Each system held a partial picture of the customer, and none of them talked to each other. A guest who had dined at one venue, attended a corporate event at another, and enquired about a wedding at a third would appear as three separate people, or worse, not appear at all. Duplicate records were widespread, and the operations team was spending hours manually reconciling data to answer basic questions about guest history and spending.

#### Problem 3: Marketing running blind without clean, segmented data

The marketing team wanted to run targeted campaigns, from post-visit follow-ups to anniversary re-engagement emails and new venue launch promotions. But without a centralised, clean database, every campaign required manual data exports, spreadsheet wrangling, and uploads to Campaign Monitor. Segmentation was crude at best. The team could not confidently target guests based on venue preference, event type, spending history, or visit recency. Email deliverability was suffering under the weight of unverified contacts, and the marketing function was stuck in a reactive, manual cycle that made it invisible to the leadership team.

### The Solution

Subheading: What we built: a unified CRM with real-time reservation data flowing in automatically

Engaging.io delivered a full HubSpot Marketing and Sales Hub Professional implementation, anchored by a custom real-time integration with SevenRooms, that gave Artemis a single source of truth for every guest interaction across all three venue brands. The build unified 85,000+ guest contacts from multiple fragmented sources into one deduplicated database, stood up automated lead capture and follow-up workflows to close the gap on unconverted event enquiries, and gave the marketing team clean, segmented data to run targeted campaigns from day one.

We chose to build a custom middleware layer for the SevenRooms integration rather than relying on a generic connector. The reservation platform needed to push data in real time, create contacts even when only a phone number was available (no email), and map booking data, spend, and guest tags into HubSpot properties that the marketing and events teams could action immediately. A standard integration would not have supported the contact creation logic or the data richness that Artemis needed to make real use of their reservation data for marketing and re-engagement.

### The Strategic Plan:

Step 1: Lay the CRM foundation across all three venue brands

Before any integration or migration work could begin, the team needed a CRM architecture that could serve three distinct brands without creating silos. We designed a unified portal structure with custom properties, permission partitioning, and filtered views that let each venue team see their own world while keeping all data connected. This included designing the deal pipeline strategy: consolidating all event bookings (corporate and weddings) into a single pipeline segmented by custom properties for venue and event type, rather than building three separate pipelines that would fragment reporting and create maintenance overhead.

Step 2: Build a custom real-time SevenRooms integration

With the CRM architecture in place, the development team built a custom middleware integration hosted on AWS that receives reservation webhooks from SevenRooms in real time. The integration creates and updates contact records in HubSpot (including a custom modification to create contacts from phone numbers alone, without an email address), creates reservation deals with full data mapping (spend, booking tags, duration, occasion type, venue), and handles deduplication logic so that a guest who books across multiple venues is recognised as one person. A dedicated SevenRooms pipeline was configured with stages matching reservation lifecycle (Scheduled, Confirmed, Attended, No Show, Cancelled), giving the marketing team a live, segmentable view of dining behaviour.

Step 3: Unify and deduplicate 85,000+ historical guest records

The SevenRooms integration only captures live, forward-looking data. To give Artemis a complete picture from day one, the team ran a structured data migration of 85,000+ historical guest contacts exported from SevenRooms across all three venues. HubSpot's deduplication logic, keyed on email address, consolidated multi-venue guests into single records. Legacy guest tags (VIP status, spending indicators, special preferences) were preserved as custom properties to ensure segmentation continuity. The team also designed a compliant opt-in strategy: importing raw opt-in status from SevenRooms truthfully, then using HubSpot segmentation to market to small, permission-based segments and protect deliverability from the start.

Step 4: Build automated lead capture and follow-up workflows

With clean data and live reservation flow in place, the team built the lead capture and nurture infrastructure. Ten HubSpot forms replaced the existing patchwork of Triple Seat forms and email-based enquiries, creating a single entry point for wedding and corporate event leads. Eight automated nurture workflows were configured to re-engage unconverted leads, trigger post-venue-visit follow-ups, and prompt the sales team when a lead went cold. The sales workspace was configured with a lead qualification pipeline (New, Attempting, Connected, Qualified) feeding into the event bookings deal pipeline, with automated follow-up tasks and sequences to ensure no enquiry sat untouched.

Step 5: Enable the team with hands-on training and documentation

The implementation was designed to be owned by the Artemis team from handover. Three dedicated training sessions covered sales tools (pipelines, sequences, playbooks, templates), marketing tools (social publishing, email, segmentation, workflows), and admin and portal management. Training documentation, video recordings, and reusable guides were provided so new team members could onboard independently. A 20-hour time bank was included in the engagement to cover additional configuration or support needs that emerged during the tight timeline of the third venue launch.

### The Implementation:

Implementation 1: CRM architecture and pipeline design

The CRM was configured as a single portal serving all three Artemis venue brands, with user permissions and record views partitioned so each team could work in their own context. Custom properties were created for venue, event type, booking source, and guest preferences. The deal pipeline was designed as a single consolidated Event Bookings pipeline with stages from Soft Hold through to Close Won and Close Lost (with categorised loss reasons), using custom property filters to create venue-specific and event-type-specific views. This was a deliberate architectural choice: one pipeline with smart filtering is far easier to maintain, report on, and automate than three parallel pipelines with duplicated logic. A separate SevenRooms Reservations pipeline was built to house the integration data, keeping dining reservations distinct from event sales while both feeding into the same unified contact record.

Implementation 2: Custom SevenRooms middleware

The SevenRooms integration was built as a custom middleware layer hosted on AWS, receiving real-time webhooks for both reservation and client events. The middleware handles contact lookup (search by email, create if not found), deal creation and updates (keyed on SevenRooms booking ID), and full data mapping including spend, booking tags, duration, party size, occasion type, and venue. A custom modification was built to create HubSpot contacts from phone numbers alone when no email address is available, with email taking priority for deduplication when both are present. Walk-in reservations without any identifying information are associated with a generic walk-in contact record to keep reservation deal data clean without polluting the marketing contact database.

Implementation 3: Data migration and deduplication

Over 85,000 historical guest contacts were exported from SevenRooms across all three venues and imported into HubSpot using a structured CSV migration. HubSpot's native deduplication on email address consolidated guests who had visited multiple venues into single contact records. Legacy guest tags (including VIP indicators, spending behaviour tags, and special preference flags) were mapped to custom HubSpot properties so the marketing team retained the segmentation intelligence built up over years of operation. Phone number formatting was tested and validated for the Singapore market (+65 prefix handling). Opt-in status was imported as raw truth from SevenRooms, with HubSpot segmentation used to build compliant marketing audiences from that foundation.

Implementation 4: Forms, workflows, and sequences

Ten lead capture forms were built and configured with embed codes for deployment across all three venue websites, replacing the existing Triple Seat forms and email-link enquiry process. Each form triggers automated actions on submission: sending a confirmation email to the guest, creating a contact record, notifying the assigned sales team member, and enrolling the lead into the appropriate nurture workflow. Eight nurture workflows were built to cover key re-engagement scenarios, including post-enquiry follow-up for unconverted event leads, post-venue-visit re-engagement, and date-based triggers (such as anniversary marketing from reservation occasion tags). Sales sequences were configured with templated follow-up emails and task creation at set intervals, giving the events team a structured, automated cadence for lead follow-up. Automated deal stage actions were configured so that if no activity occurs within 48 hours of a proposal or agreement being sent, the system creates a follow-up task and moves the deal to a follow-up stage.

Implementation 5: Training and enablement

Three dedicated training sessions were delivered to the full Artemis team. Sales Hub training covered the lead qualification workspace, deal pipeline navigation, sequences, playbooks, and message templates. Marketing Hub training covered social media tool connections, email creation using the custom modular templates (designed for all three venue brands), contact segmentation, list building, and workflow management. Admin training covered user management, portal settings, custom property creation, and reporting dashboards. Two reporting dashboards were configured: a sales management dashboard and an individual sales performance dashboard, each with up to 15 reports. A branded, modular email template was designed and built in HubSpot, along with an unsubscribe page, to replace Campaign Monitor and give Artemis full control of email marketing within the CRM.

### Impact and Results

Subheading: A team that can finally see every guest, follow every lead, and market with precision

For the first time, the Artemis team has a single, unified view of every guest across all three venue brands. A person who dined at one restaurant, attended a corporate event at another, and enquired about a wedding at a third now shows up as one contact record with a complete history. The operations team no longer spends hours reconciling spreadsheets and cross-referencing systems to answer basic questions about guest behaviour.

The events team now has a structured pipeline and automated follow-up cadence for every inbound enquiry. Where previously, unconverted leads simply disappeared after the requested date was unavailable, the system now automatically re-engages those leads with follow-up sequences and nurture workflows. The sales workspace surfaces new leads immediately, assigns them to the right team member, and creates follow-up tasks if a response is overdue. Every enquiry is tracked from first touch through to confirmed booking or categorised close-lost reason, giving leadership visibility into why business is being won or lost for the first time.

The marketing team can now segment the full 85,000+ guest database by venue, event type, visit recency, spending behaviour, occasion tags, and opt-in status, and run targeted campaigns directly from HubSpot without manual exports or spreadsheet wrangling. Real-time reservation data flowing in from SevenRooms means the team can trigger automated post-visit emails, anniversary re-engagement campaigns, and "we haven't seen you in a while" win-back sequences based on actual guest behaviour. Campaign Monitor has been replaced entirely, consolidating email marketing alongside CRM, social, and reporting in one platform.

With the CRM foundation, integration architecture, and automated workflows in place, Artemis is positioned to scale its marketing and events operation across all three venues and beyond, without adding manual overhead as the group continues to grow.
