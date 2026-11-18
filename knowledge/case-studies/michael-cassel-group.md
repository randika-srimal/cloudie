---
client: "Michael Cassel Group"
display_name: "Michael Cassel Group"
status: published
url: "https://www.engaging.io/case-studies/michael-cassel-group-building-a-crm-for-the-complexity-of-global-theatre"
industry: ["Entertainment", "Live theatre"]
region: ["AUS", "global"]
hubs: ["Marketing, Sales, Service, Data, Commerce and Content Hub Enterprise"]
migration_from: ["Salesforce"]
updated: 2026-11-18
---

One of the world's leading theatrical production companies moved off a heavily customised Salesforce CRM onto a unified HubSpot environment. Rebuilt the CRM foundation with a consolidated contact model and custom objects for productions, shows, roles and RSVP members, split business and consumer contacts, rebuilt the RSVP and opening night workflows in HubSpot automation, and prepared the system for Snowflake data ingestion.

**Tech stack:** Salesforce, Outlook, JotForm, Snowflake, Heroku, Ticketek, Ticketmaster

## Case study document

## **Project objectives and context**

At the commencement of this project Michael Cassel Group (MCG) had some clearly defined challenges and pain points that directed the priorities within the onboarding project. They were broken down into the following:

* **Business pain**:
  * Disconnected systems and siloed data reduced visibility across productions, RSVPs, ticketing, and audience engagement.
  * Limited marketing and retargeting capability due to unclear segmentation and inconsistent data quality.
  * High ownership cost and low return from a heavily customised Salesforce instance.

* **Process pain**:
  * Key processes such as RSVPs, media management, and cast/crew coordination were executed manually across Jotform, Outlook, spreadsheets, and ad-hoc workflows.
  * Low CRM adoption meant most work happened outside the system, restricting automation and slowing execution.
  * Legacy logic and multi-step approvals made routine tasks difficult to scale.

* **Identity pain**:
  * Teams lacked a single, reliable view of contacts and activity, which limited confidence in reporting and constrained decision-making.
  * Critical processes were highly dependent on individuals rather than systems.

The root causes of MCG’s challenges were structural rather than situational. A decade of uncontrolled Salesforce customisation created fragmented objects, brittle workflows, and low usability.

Key operational processes—RSVPs, opening night management, media coordination and VIP contact handling—were never embedded in any CRM, so most critical work happened in inboxes and spreadsheets.

Data arrived from multiple upstream sources with inconsistent structure, and without a unified contact model for consumers, cast, crew, media and agencies, segmentation and reporting were fundamentally limited.

These issues became urgent when several triggers converged:

* Snowflake was introduced, requiring a consistent data model to be effective
* Salesforce licensing approached expiry, forcing a full system migration
* Upcoming productions required scalable, repeatable workflows

Together, these factors exposed long-standing weaknesses that manual workarounds could no longer carry.

**Outcomes and Solutions**

The outcomes achieved through this project were the result of a complete rebuild of MCG’s CRM foundation, replacing fragmented, manual processes with a unified, scalable HubSpot environment. Each outcome reflects not only technical configuration, but the alignment of data structures, custom objects, workflows, and governance rules that now support the organisation’s marketing, production, publicity, and RSVP operations. The system has been designed to support growth, standardise processes, and provide the visibility that was previously unattainable.

How these outcomes were achieved:

* **Core CRM setup:**
  * A consolidated contact model was established using HubSpot’s Smart CRM, custom objects, and relationship mappings for consumers, cast, crew, media, agencies and VIPs.
  * Custom properties, object definitions, and record layouts were built to reflect MCG’s unique operational structures.
  * Standardised naming conventions, folder structures and segmentation rules ensure consistency across campaigns, productions and teams.

* **Marketing, Publicity and Communications:**
  * Marketing Hub was configured with modular email and landing page templates, subscription types, and permission-based governance for sensitive audiences.
  * Automated segmentation lists were built to support production-based, role-based and geography-based targeting.
  * Campaigns were centralised, with reporting dashboards providing visibility across email performance, ticketing engagement and production activity.

* **RSVP and Opening Night workflows:**
  * The formerly manual RSVP process was rebuilt through HubSpot workflows, conditional logic and custom properties.
  * Automated roll-up counts, invite-type segmentation, RSVP status changes, and capacity tracking were configured to reflect real-world operational needs.
  * Alerts, task routing, and validation checks provide clarity and prevent overbooking or miscommunication.

* **Dashboards and reporting:**
  * Team-specific dashboards were created for Marketing, Publicity, Ticketing and RSVP operations.
  * Global reporting views provide leadership with consolidated insights using HubSpot data combined with Snowflake segments where available.
  * Custom reports surface venue capacity, RSVP progress, ticket usage behaviour and campaign outcomes.

* **Integration and data foundations:**
  * HubSpot was prepared to ingest Snowflake data through a structured data model, ensuring clean mapping between contact, production and engagement records.
  * Initial VIP/Outlook architecture was developed using custom properties, tagging patterns and governance rules to maintain privacy and system hygiene.

* **Operational alignment and governance:**
  * Role-based permissions and access tiers were implemented to control visibility, especially for VIP and executive-level contacts.
  * System workflows replaced manual approval chains, reducing reliance on individual knowledge and personal inboxes.
  * Teams now operate from the same source of truth with clear processes for list building, campaign execution and RSVP management.

**Key Stakeholders & Team**:

On the MCG side, the project was sponsored by Michael Cassel (CEO) with day-to-day leadership by Kevin Pittaway (Director of Data & Analytics). Kevin acted as the internal project lead and liaison. Supporting him were Greg Knight (IT Manager with deep Salesforce knowledge) and Amanda Storrier (Marketing Automation Specialist), as well as subject matter experts in Marketing, Publicity, Production and later Finance, Legal, and Ticketing.

On the Engaging.io side, Varun Mahadevan served as Solutions Lead and project manager, with Kiara Robinson and Vic Bayon providing solutions support, Jase Bajada as technical lead/developer, and Michelle O’Keeffe overseeing client success. This combined team met for a formal kickoff on May 9, 2025, and continued with weekly status meetings and dedicated “download” sessions by department.
