---
client: "SDN Children's Services"
display_name: "SDN Children's Services"
status: draft
url: null
industry: ["Education", "nonprofit"]
region: []
hubs: []
migration_from: []
updated: 2026-11-18
---

SDN Children's Services is a not-for-profit early education and care provider supporting children, including children with disabilities, across multiple centres in New South Wales. XAP integration unifying enrolment across centres.

## Case study document

**Metadata (155 chars):** How SDN Children's Services unified the family journey from first enquiry through to XAP enrolment across multiple centres with HubSpot and a custom integration.

**Industry:** Education

**HubSpot Licensing:** Marketing Hub Professional, Sales Hub Professional, Service Hub Enterprise, Content Hub Professional, Operations Hub Professional

**About the Business:**

SDN Children's Services is a not-for-profit early education and care provider supporting children, including children with disabilities, across multiple centres in New South Wales.

**Project Timeline:**

6 Months

**Integration**: XAP, Aircall

### Summary of the business:

SDN Children's Services is one of Australia's longest-standing not-for-profit early childhood education providers, operating multiple centres across New South Wales. SDN supports children from birth to school age, with a long-standing commitment to inclusion. Each centre operates with its own admin team, and a central Family Engagement Team supports enquiry-to-enrolment across the network. Families often sit on waitlists for extended periods before a place becomes available, making consistent, respectful communication a defining part of the SDN experience.

###  The Problem

Subheading: Running on disconnected systems

Before engaging EIO, SDN's enquiry-to-enrolment journey was fragmented across systems, centres, and levels of technical confidence. A family looking for care could interact with SDN through a website enquiry, a phone call, a tour booking, and a waitlist form, then wait an extended period for an offer, and at each step, the family or an admin was re-entering data. There was no single view of a family's history with SDN and no consistent way for centres to nurture families through the wait or match them to a vacancy when one opened.

Problem 1: A fragmented journey from enquiry to enrolment. Families were being asked to re-enter the same information across multiple touchpoints, and by the time they reached the XAP enrolment system, staff were duplicating data that had already been captured earlier in the journey. This slowed enrolment, introduced data errors, and made the SDN experience feel inconsistent from a family's first contact.

Problem 2: Inconsistent processes across centres with varying tech confidence. Each centre had a stakeholder responsible for family engagement, but knowledge of the underlying tools varied significantly across the network. Without a common system and a shared operating model, tour follow-ups, waitlist check-ins, and priority-of-access rules were being applied differently at each centre, creating variation in the family experience across the network.

Problem 3: No infrastructure to nurture families during long waitlist periods. Waitlists at SDN centres can run for extended periods, and the central Family Engagement Team had no automated way to stay in touch with families during that time. Without regular, tailored communication, families disengaged, waitlists went stale, and centres lost visibility of who was still genuinely interested when a vacancy opened.

Problem 4: No systematic way to match families to vacancies when a place opened. When a centre had a vacancy, admins were manually working through waitlist applications to find the right match, applying priority-of-access rules across multiple criteria without a shared tool to support the process. This was slow, inconsistent between centres, and put SDN's ability to fill places equitably at risk of relying on individual judgement rather than systemised rules.

### The Solution

Subheading: One platform for the full family journey, integrated with the systems SDN already ran on

EIO designed and implemented a full HubSpot platform for SDN; Marketing, Sales, Service, Content, and Operations Hubs, with a custom middleware layer connecting HubSpot to SDN's existing XAP childcare management system.

The build unified the family and child journey into a single lifecycle, standardised tour booking, waitlist management, and vacancy matching across every centre, and automated the nurture and communication cadence for families waiting for a place.

Rather than replace XAP, EIO built HubSpot as the front-of-house engagement system and used middleware to hand off enrolment-ready records into XAP without re-keying, preserving the existing SDN operational backbone while transforming the family-facing experience.

The Strategic Plan:

**Understand the family journey.**

EIO ran a series of discovery workshops with Marketing, the Family Engagement Team, Centre Admin representatives, and IT. The goal was to map how families actually move through SDN, from a first Google search through to their child's first day at a centre,  and to surface the moments where the existing process broke down.

This shaped a data model that reflected the real complexity of SDN's operating environment: multiple centres, multiple children per family, multiple centre preferences, and priority-of-access rules that had to be enforced consistently. Doing this work upfront meant every subsequent build decision was traceable back to a validated family or team need.

**Unify family and child data.**

Before any workflows could be built, EIO designed a bespoke lifecycle model that separated what needed to be tracked at the child level from what needed to be tracked at the family level.

Child records became the driver of enrolment lifecycle progression, moving from enquiry through tour booked, tour attended, waitlisted, verbal offer, and finally XAP booking.

Family records became the vehicle for communication, associations, and preference management, so that a family with more than one child or more than one preferred centre could be managed without record conflicts.

This foundation had to be right before automation was layered on top, because every downstream workflow depended on it.

**Automate the waitlist experience.**

With the data model in place, EIO built the workflows that turned SDN's enquiry-to-waitlist journey into a consistent, automated experience across every centre.

This included a native HubSpot meeting scheduler embedded per centre for tour booking, automated confirmation and reminder communications, no-show follow-ups, and a long-form nurture programme with regular check-ins for families sitting on waitlists for extended periods, which could stretch for years.

Centre-specific variations, such as date-based eligibility windows for centres with seasonal intake, were built as configurable segments so SDN's team could manage them going forward. This phase turned the longest and quietest part of the family journey into an ongoing conversation.

**Connect HubSpot to XAP.**

With the family-facing journey in place, the remaining gap was the handoff to XAP at the point of enrolment. EIO scoped and built a custom middleware layer to send enrolment-ready families from HubSpot into XAP via API, removing the manual re-entry that had previously introduced errors and slowed the process.

The middleware was designed with reusability in mind,  Phase 1 delivered the one-way HubSpot-to-XAP flow, and the same architecture will support a future Phase 2 that brings XAP status updates back into HubSpot.

A validation task and checkbox layer was built on the HubSpot side to protect data quality before any record crossed the boundary.

**Enable the team.**

The final phase was designed to make SDN self-sufficient. EIO ran a structured super user training programme across multiple sessions using a train-the-trainer model, with recorded sessions and cheat sheets so SDN could continue onboarding new staff after the engagement closed.

Custom dashboards were built for every persona in the operating model — centre admins, the Family Engagement Team, operations managers, marketing, and data and reporting, so that each team could see the information most relevant to their role without having to ask. By the end of the engagement, SDN owned the platform, the process, and the team capability to keep improving it.

**The Implementation:**

EIO delivered SDN's HubSpot platform across a six-month engagement, sequenced to allow the internal team to build capability alongside the technical build.

**HubSpot platform build.**

EIO configured all five HubSpot hubs against SDN's mapped family journey. This included custom properties across contact, family, and child records; a bespoke lifecycle model where child records drive lifecycle progression (from enquiry, through tour booked, tour attended, waitlisted, verbal offer, and XAP booking) and family records receive communications; and a single deal pipeline representing enrolment progression, filtered by centre. A special pipeline was built to handle tours for existing SDN families so that imported records did not automatically re-enter the standard nurture flow.

**Tour booking, waitlist management, and nurture workflows.**

EIO replaced SDN's legacy tour booking form with a native HubSpot meeting scheduler embedded per centre, so tour bookings correctly associated to the primary child and triggered lifecycle progression. Waitlist workflows were built to send families a series of tailored nurture communications during the wait, including regular check-ins and automated reminders when waitlist forms were incomplete. Yearly workflows were configured for centres with date-based eligibility windows, with a clone-and-update pattern documented for the SDN team to manage year on year.

**XAP integration via custom middleware.**

Rather than a direct point-to-point API connection, EIO built a hosted middleware layer to manage the HubSpot-to-XAP integration. Phase 1 delivered a one-way flow from HubSpot to XAP to create and edit waitlist records via XAP's Add Waiting List and Edit Waiting List APIs — removing the manual re-entry that had previously been required at the point of enrolment. The middleware architecture was designed to be reusable for a future Phase 2 that will bring XAP status updates back into HubSpot. A validation task and checkbox layer was built on the HubSpot side to confirm days and programs before a record was sent to XAP, protecting data quality at the handoff point.

**Communication routing and ownership.**

EIO built branched workflows to route communication by family preference (SMS versus email), with dynamic re-routing if preferences changed mid-workflow and character-limit handling on SMS. Ownership routing was automated to hand a family record from the central Family Engagement Team to the relevant centre admin when a tour was booked, and to revert if the tour did not attend. Aircall was integrated for name-based call handling so that inbound calls resolved against the HubSpot record.

**Reporting and enablement.**

EIO configured management dashboards for centre admins, the Family Engagement Team, operations managers, marketing, and the data and reporting function. A structured super user training programme was delivered over multiple sessions using a train-the-trainer model, with recorded sessions and cheat sheets so SDN could continue onboarding new staff after the engagement closed.

### Impact and Results

Subheading: **A single family journey, running consistently across every centre**

With HubSpot in place across every centre, SDN now runs a single, consistent family journey from the first enquiry through to XAP enrolment. Families no longer re-enter the same information at every step, and the Family Engagement Team has full visibility of every family's history, including tours, communications, waitlist status, and centre preferences, in one place. Centre admins, regardless of their technical background, work from the same automated processes, and priority-of-access rules and follow-up cadences are now applied consistently across the network.

The waitlist experience has been transformed from a long silence into an ongoing conversation. Automated nurture keeps families engaged during extended waits, and the central team can now see at a glance which families are still active, which have gone quiet, and which are ready to move forward when a vacancy opens. At the enrolment point, the custom middleware layer removes the duplicate data entry that previously slowed the handoff to XAP, and the validation layer built into HubSpot protects the accuracy of records before they cross the boundary.

For SDN, this infrastructure unlocks something operationally new: the ability to scale a personal, family-first experience across every centre without adding headcount, and to keep improving that experience without depending on the technical confidence of any one admin. With Phase 1 in production, SDN and EIO are now positioned to bring XAP status updates back into HubSpot in Phase 2, closing the loop and giving SDN a full lifecycle view from first enquiry to active enrolment and beyond.
