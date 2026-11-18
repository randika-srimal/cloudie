---
client: "Prestige Cruises"
display_name: "Prestige Cruises"
status: draft
url: null
industry: ["Tourism and travel", "contact centre"]
region: []
hubs: []
migration_from: []
updated: 2026-11-18
---

Prestige Cruises is a cruise travel company operating as an inbound and outbound contact centre, selling cruise cabins and travel insurance across multiple cruise lines. [Confirm any public-facing scale detail — agent count, booking volume, years operating — before publishing.] Odysseus booking platform integration, four dedicated service ticket pipelines.

## Case study document

**Metadata (155 chars):**

**AI Narration:**

**Industry:**

Experience & Travel

**HubSpot Licensing:**

Marketing Hub, Sales Hub, Service Hub Professional

**About the Business:**

Prestige Cruises is a cruise travel company operating as an inbound and outbound contact centre, selling cruise cabins and travel insurance across multiple cruise lines. [Confirm any public-facing scale detail — agent count, booking volume, years operating — before publishing.]

**Project Timeline:**

2.5 Months

**Integration**: Odysseus (booking and reservation platform)

### Metric Block:

4 dedicated service ticket pipelines built (Payments, Cancellations, Air changes, General inquiries)
1x real time integration Odysseus into HubSpot

Summary of the business:

Prestige Cruises is a cruise travel company connecting customers with cruise vacations across a range of cruise lines, from first enquiry through to final payment and check-in. Its sales team runs an always-on inbound and outbound contact centre, while a recently introduced dedicated Customer Service function is focused on giving every customer a smoother experience after they book.

As the business has grown, so has its ambition to give agents better tools and a clearer picture of every customer relationship — which is what brought them to HubSpot and EIO.

###  The Problem

Subheading:

Before working with EIO, Prestige Cruises' sales and service teams operated almost entirely outside a connected CRM. New leads landed in a shared spreadsheet, service tickets had no formal routing, and the handoff between sales, service, and the team's booking system relied on manual review and back-and-forth phone tag. Four problems stood out as the priority to solve.

**Problem 1**: Leads were triaged by hand, and hot ones could go cold

New leads landed in a shared spreadsheet refreshed every 10–15 minutes, with duplicates going unnoticed and no reliable way to flag high-intent requests for faster follow-up. Managers had to eyeball the sheet and prioritise by hand, competing against a constant stream of new leads, which meant there was no guarantee a hot lead got worked before it went cold.

**Problem 2**: Service tickets had no routing, so agents duplicated each other's work

There were no formal ticket routing or allocation rules for the customer service team. Multiple agents could unknowingly work the same customer issue at once, duplicating effort, while clients cycled through calls, voicemails, and emails without a single point of contact until their case was resolved.

**Problem 3:** Time-sensitive booking communications relied on manual review

Time-sensitive cruise line communications such as check-in instructions, air notifications, final payment reminders, were handled through manual email review and manual forwarding, rather than being automatically associated with the right booking or ticket.

**Problem 4:** Neither team had reporting they could trust

Managers pulled ad hoc reports to see what each agent was actually working on day to day, and there was no shared visibility between sales and service once a customer moved from one team to the other

### The Solution

**Subheading:** What we built: one connected system for sales and service

EIO implemented HubSpot's Sales, Service, and Marketing Hubs for Prestige Cruises, connected to the team's core booking system through a custom integration, so every lead, ticket, and booking update flows into a single source of truth.

Structured pipelines and formal routing rules replaced the spreadsheet-and-shared-inbox model for both sales leads and service tickets, while lead scoring and sequences now give agents a single, prioritised view of who to contact next instead of a manually sorted sheet.

A custom quote solution and tailored service automations, including automated email association and forwarding, cover two workflows standard HubSpot functionality couldn't handle out of the box.

EIO recommended a one-way, webhook-triggered integration over a full two-way sync so the booking system remains the single source of truth for reservation data, while HubSpot becomes the team's day-to-day engagement layer, giving agents a live, reliable view of every customer without duplicating booking logic across two systems or introducing sync-conflict risk.

### The Strategic Plan:

EIO's approach was sequenced so that every later step could rely on the one before it, there was no point building smarter routing or automation on top of data until it was reliable and accurate.

**1. Unify booking data.** The first move was getting a reliable, real-time source of customer and booking data into HubSpot, rather than layering new tools on top of manual re-entry. EIO built a secure, one-way integration between Prestige Cruises' booking system and HubSpot so that every booking, customer, and update flowed into the CRM automatically, giving every later workflow something trustworthy to run on.

**2. Structure the pipelines.** With reliable data flowing in, EIO replaced the spreadsheet-and-shared-inbox model with formal Sales and Service pipelines — including four dedicated service ticket pipelines built around the team's actual call volume, so tickets landed with the right team from the start instead of being sorted after the fact.

**3. Automate prioritisation and quoting.** With structured pipelines in place, EIO layered in lead scoring and sequences so agents always had a clear, prioritised view of who to contact next, and built a custom quote solution so transactional quote emails could go straight out of Sales Hub rather than through ad hoc, agent-by-agent templates.

**4. Equip the team.** The final step was making sure the new system stuck — record views, playbooks, dashboards, and hub-by-hub training were rolled out so agents across a range of technical skill levels could work confidently in HubSpot from day one, rather than falling back on the old tools out of habit.

### The Implementation:

EIO built a custom, webhook-triggered integration between Prestige Cruises' booking system and HubSpot, running as a Node.js function hosted on AWS and secured with Bearer token authentication, writing into HubSpot through a dedicated service key. The connection is one-way by design, the booking system stays the system of record for reservations, while HubSpot becomes the engagement layer sales and service actually work from, without duplicating booking logic across two systems. A native Zoom Contact Center connector was added alongside it, so call activity lands against the right contact and ticket record automatically.

Rather than a single generic ticket queue, EIO built four dedicated service pipelines: Payments, Cancellations, Air changes, and General inquiries, mapped directly to the call types identified as the highest volume, alongside a restructured sales pipeline replacing the previous spreadsheet-based tracking.

Standard HubSpot ticket routing also doesn't automatically associate inbound booking-related emails  such as, check-in instructions, air notifications, with the right record, so EIO built custom automations to handle that association and forwarding automatically, removing a manual review step the service team had been doing by hand.

Lead scoring and sequences were configured so agents work from a single prioritised queue instead of manually sorting a shared sheet. Alongside this, EIO built a custom quote solution for sending transactional quote emails directly through Sales Hub, replacing the ad hoc, agent-by-agent template approach the sales team was using previously.

Record views, playbooks, and hub-by-hub dashboards were configured and rolled out with structured training for each team, so agents across a range of technical skill levels could move into HubSpot with confidence rather than defaulting back to the old tools out of habit.

### Impact and Results

**One shared system, working as it should**

With a single, prioritised queue replacing the manually sorted spreadsheet, Prestige Cruises' sales agents no longer have to compete for time against a constant stream of new leads to spot the ones worth calling first. High-intent leads — like an online quote request — surface automatically instead of depending on a manager catching them in time, closing the gap where hot leads previously went cold before anyone got to them.

On the service side, formal ticket routing means agents are no longer duplicating each other's work on the same customer issue without knowing it. Every ticket has a clear owner from the moment it's created, and the four dedicated pipelines mean payments, cancellations, air changes, and general enquiries are handled by the right process instead of one undifferentiated queue — cutting the back-and-forth phone tag that came from customers being passed between agents.

Time-sensitive booking communications that once relied on an agent manually reviewing and forwarding every email now flow through automatically, associated with the right customer and booking record from the moment they arrive, freeing agent time that was previously spent on manual review rather than customers.

For the business as a whole, sales and service now work from the same customer record for the first time, rather than two disconnected systems joined only by a phone handoff.

With structured pipelines, dashboards, and reporting in place across both teams, Prestige Cruises' leadership has the visibility to see what's actually happening day to day, where before that required pulling ad hoc reports to get any real picture at all.

As adoption embeds across the sales and service teams, that shared foundation is what makes the next phase of work, deeper automation and reporting maturity, possible without having to re-solve the data problem first.
