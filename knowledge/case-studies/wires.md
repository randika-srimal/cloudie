---
client: "WIRES"
display_name: "WIRES"
status: published
url: "https://www.engaging.io/case-studies/modernising-non-profit-rescue-operations-a-hubspot-powered-solution-for-wires"
industry: ["Nonprofit", "Animal welfare"]
region: ["AUS"]
hubs: ["Service Hub Enterprise and associated Enterprise hubs"]
migration_from: []
updated: 2026-11-18
---

Australia's largest wildlife rescue organisation, operating 24/7 across NSW with a network of over 3,500 volunteers, was running fragmented legacy systems across more than 130,000 annual rescue cases. Engaging.io built an end-to-end ecosystem with Service Hub as the system of record, a custom Animal object and rescue pipeline, automated rescuer dispatch through xMatters, and a mobile-optimised volunteer portal for field updates.

**Tech stack:** xMatters, Google Maps API, custom call centre logging interface, volunteer portal

## Case study document

**Industry:** Non-Profit (Wildlife Rescue)

**HubSpot Licensing:** Marketing Hub Enterprise; Sales Hub Enterprise, Service Hub Enterprise; CMS Hub Enterprise;

**About the business:** WIRES (NSW Wildlife Information, Rescue and Education Service) is Australia’s largest wildlife rescue organisation, rescuing and rehabilitating sick, injured and orphaned native animals for over 35 years.

**Project timeline:** March 2024 – June 2025

**Integrations:**

- **xMatters** (volunteer dispatch/alerting); Google Maps API (rescue location mapping)

**Brand website:** https://www.wires.org.au/

**Stats / Callouts:**

* **3× faster call triage** (estimated)
* **100% visibility into volunteer engagement** and case status
* **Real-time dispatch alerts** to 3,500+ rescuers via xMatters
* **130K+ rescue cases/year** handled through a unified system

**Intro**:

WIRES is a not-for-profit wildlife rescue powerhouse operating 24/7 across NSW. With a network of over 3,500 volunteer rescuers and a dedicated call-center team, WIRES assists in over 130,000 animal rescue cases each year. Their mission is to save native animals and inspire community involvement in wildlife care.

To support this mission, WIRES relies on efficient coordination between callers, volunteer rescuers, veterinarians, and support staff. The organisation recognised that its legacy rescue management system was hindering these efforts. They engaged Engaging.io to modernise their volunteer and rescue call platform, aiming to improve responsiveness, data accuracy, and scalability in handling wildlife emergencies.

## **The problem**

As WIRES’ rescue operations continued to grow in volume and complexity, the limitations of their existing systems became increasingly apparent. What had once been workable processes were now slowing response times, increasing administrative burden, and limiting visibility across the rescue lifecycle. Two core challenges stood in the way of scaling effectively.

* **Problem 1:** WIRES relied on an ageing, siloed rescue database that forced volunteers and operators to duplicate information across spreadsheets and external dispatch platforms. This manual approach created delays, increased the risk of errors, and required operators to trigger xMatters alerts separately. Without a central CRM connecting callers, animals and volunteers, tracking rescues end-to-end was cumbersome and slowed call triage**.**

* **Problem 2: Limited scalability and visibility.**
  During peak periods and crisis events, WIRES’ processes struggled to scale. There was no real-time view of active rescues, volunteer responses, or case status, making it difficult for managers to prioritise urgent cases or identify bottlenecks. Volunteer activity after dispatch was largely invisible, and reporting on outcomes required manual reconciliation across systems. This lack of a single source of truth reduced operational insight and raised concerns about the organisation’s ability to cope with large-scale emergencies.

## **The solution**

Engaging.io delivered two purpose-built systems designed to work together: a custom call centre logging system and a standalone volunteer portal, both integrated with HubSpot CRM and xMatters to create a unified, end-to-end rescue management ecosystem.

At its core, the solution replaced the legacy rescue database with HubSpot Service Hub as the central system of record. However, rather than forcing complex operational processes directly into standard HubSpot forms, we architected external systems purpose-built for WIRES’ operational realities, with HubSpot orchestrating tickets, automation, reporting, and data governance. Here’s how it works:

* **Unified call logging:**
  Rescue calls are captured via a custom-built call centre logging system that lives outside HubSpot. This interface is purpose-designed for high-pressure rescue intake and is accessed directly in HubSpot via a CRM Card.
  Call centre operators complete a guided intake form capturing caller details, location data, and animal information. Upon submission, the system creates or updates the relevant HubSpot contact records and automatically generates a linked Service Hub ticket. This ensures structured data capture, eliminates duplicate entry, and centralises all case information within HubSpot as the operational source of truth.

* **Intelligent ticket management:**
  HubSpot Service Hub manages the full rescue lifecycle through a clearly defined, custom rescue pipeline.
  The system supports complex scenarios, including incidents involving multiple animals, with structured record relationships enabling individual tracking where required. Automated duplicate checks reduce repeat responses, and ticket progression is governed by urgency, rescue status, and defined operational rules.

* **Automated rescuer dispatch:**
  When a case is ready for dispatch, HubSpot triggers an automated handoff to xMatters.
  Volunteer notifications are sent based on predefined criteria such as geography and skillset. Volunteer responses sync back into HubSpot in real time, automatically updating ticket status, assignments, and activity logs. This removes manual coordination overhead and ensures dispatch decisions are tracked within the CRM.

* **Volunteer portal features:**
  The volunteer portal was built as a standalone system outside HubSpot, designed specifically for field rescuers and coordinators. It integrates bi-directionally with both HubSpot and xMatters.
  This portal acts as a central operational workspace, with role-based access controls determining what each user can see and action. Mobile-responsive design, guided workflows, and contextual prompts enable volunteers to manage cases efficiently in the field. All relevant updates, status changes, and rescue outcomes synchronise back to HubSpot, maintaining a complete operational record without requiring volunteers to work directly inside the CRM.

* **Workflow automation:**
  HubSpot workflows orchestrate escalations, internal updates, and follow-on actions across the rescue lifecycle.
  Automated notifications keep coordinators, carers, and relevant stakeholders informed at critical stages. Tickets progress through the pipeline based on defined triggers rather than manual chasing, ensuring operational consistency at scale.

* **Data management and security:**
  A clean CRM data model underpins the entire solution. Custom properties, structured associations, and controlled permissions ensure sensitive rescue and volunteer data is secure and accessible only to the appropriate roles.
  Secure member authentication within the volunteer portal, combined with HubSpot permission layers, supports segmentation across volunteers, vets, donors, and partners without compromising compliance.

* **Reporting and visibility:**
  HubSpot is configured as the central system of record, with real-time dashboards and custom reporting designed to provide visibility across rescue volumes, response times, volunteer engagement, and operational bottlenecks.
  This consolidated reporting framework will support informed resourcing decisions, compliance reporting, and continuous operational improvement. The underlying architecture has been designed for scale, ensuring WIRES can expand reporting depth and operational insight as demand grows.

## **The strategic plan**

Our approach to the WIRES project was phased and collaborative, ensuring we addressed immediate needs while laying groundwork for future growth. The strategic plan included:

* **Phase 1 – Foundation & quick wins:** We kicked off in March 2024 with discovery workshops involving WIRES’ rescue office staff and volunteer representatives.
  * Together, we mapped the end-to-end rescue process and identified pain points. Engaging.io’s team audited WIRES’ existing tech stack (the legacy rescue database, xMatters, spreadsheets, fundraising systems) and identified what to carry forward or replace.
  * We prioritised core deliverables of Phase 1 and put together a detailed project plan, including success metrics like faster call handling and reduced admin load.

* **Phase 2 – HubSpot implementation:**
  * Next, our experts got to work configuring **HubSpot Enterprise Hubs** for WIRES. This involved setting up the CRM with custom objects (e.g. an **Animal** object to track each rescued animal), defining ticket pipelines and properties tailored to wildlife rescue (such as Species, Rescue Location, Rescue Priority), and onboarding the WIRES team to HubSpot’s Marketing and Service tools.
  * We established HubSpot **Marketing Hub Enterprise** to support WIRES’ donor communications and public awareness campaigns in parallel with rescue operations, ensuring the rescue data could inform outreach (for example, automated emails to donors during a crisis).
  * In this phase we also addressed data migration: importing WIRES’ contacts (volunteers, vets, donors) and historical rescue records into HubSpot. By the end of Phase 2, WIRES had a solid CRM foundation with all relevant data in one place.

* **Phase 3 – design & development:**
  * Phase 3 focused on the custom call logging interface in a HubSpot CRM Card and the  **Volunteer Portal**. We followed a user-centric design process: first creating user flow diagrams and wireframes to validate how call centre and volunteers would navigate their respective systems, with WIRES providing feedback at each stage.
  * Once designs were approved, our developers built both systems with full integration with HubSpot. We employed iterative development – releasing portions of the builds to WIRES’ team for testing (for example, the call logging form, then the dispatch integration module) rather than a big bang launch.
  * During this phase we also tackled the **xMatters integration** in depth, writing custom middleware (hosted on a cloud function) to handle the webhook communication between HubSpot and xMatters reliably.

* **Phase 4 – Testing, training & launch readiness:**
  In the final phase, we conducted structured QA and user acceptance testing to validate the end-to-end solution across both the call centre logging system and the volunteer portal. This included staged rescue call simulations covering a range of real-world scenarios, such as common versus rare species, metro versus remote locations, and multiple concurrent incidents, to ensure tickets, integrations, and workflows behaved as designed.
  * We refined performance across key components, including mapping logic and duplicate detection, with a focus on usability in high-pressure environments and on mobile devices.

  * Engaging.io delivered onboarding training for key stakeholders, with supporting documentation to support adoption and internal ownership post-handover.

  * The solution has been designed to support a controlled rollout, with monitoring and optimisation processes in place to ensure a smooth transition when activated.

## **The implementation**

In practice, bringing the WIRES call centre interface and volunteer portal to life required a mix of technical expertise, strategic integration, and stakeholder coordination. Key implementation steps included:

**Data migration and centralisation:**

We consolidated WIRES’ existing data into HubSpot, migrating contacts across volunteers, veterinarians, donors, and partners, along with historical rescue records from the legacy database.

Custom properties and structured segmentation were implemented to support role-specific access and reporting. This established a single source of truth, giving WIRES a complete, centralised view of each stakeholder and their historical rescue involvement.

### **HubSpot configuration for rescue operations**

HubSpot was configured to support operational, communication, and data governance requirements.

In Service Hub, we built a custom “Rescues” ticket pipeline aligned to WIRES’ real-world process, including stages such as New, In Triage, Dispatch Pending, Dispatched, In Care, Resolved, and Closed.

We implemented a custom Animal object to allow a single rescue ticket to associate with multiple animals. This structure enables individual tracking of species, health status, and outcomes, while maintaining linkage to the originating incident.

In Marketing Hub, we configured subscription types and email templates to support both transactional communications, such as rescue confirmations, and broader marketing communications to donors and supporters.

Operations Hub was leveraged to implement data quality automation, including structured taxonomy enforcement, address formatting, and validation logic to maintain CRM integrity.

A Google Maps API integration was introduced to standardise geolocation capture. When an address is entered or a pin is dropped via the call centre interface, precise GPS coordinates are written directly to the HubSpot ticket to support dispatch logic and hotspot analysis.

### **Call centre logging system**

The WIRES call centre team logs all incoming rescue requests through a custom-built intake form that sits outside HubSpot and is embedded into the CRM via a secure CRM Card.

This interface is specifically designed for high-volume, high-pressure intake. Operators capture caller information, animal details, species data, urgency indicators, and location within a guided workflow. Upon submission, the system creates or updates the relevant contact records and generates a structured Service Hub ticket in real time.

This approach ensures HubSpot remains the system of record while preserving a streamlined intake experience tailored to operational realities.

### **Volunteer portal**

The volunteer portal was developed as a standalone, responsive web application separate from HubSpot. It integrates bi-directionally with both HubSpot and xMatters.

Volunteers use the portal to manage assigned rescues and rehabilitation activities. Volunteers can view allocated cases, access detailed rescue information, and update statuses of the cases. All updates sync back to HubSpot, maintaining a complete and auditable rescue record without requiring volunteers to work directly inside the CRM.

### **Role-based access and user experience**

Access controls are structured by role across the volunteer portal to ensure rescue office users and field rescuers only see data and actions relevant to their responsibilities.

The portal aligns with WIRES’ brand guidelines and prioritises clarity in high-pressure environments. Mobile optimisation, structured workflows, and contextual prompts support efficient field operations while preserving structured CRM data integrity.

Role-based access is also managed through HubSpot's custom object, "Volunteer Position", which centrally controls permissions and visibility across the portal.

### **xMatters integration and dispatch automation**

The xMatters integration enables automation that provides seamless, near real-time synchronisation of tickets, ensuring rescue volunteers are notified promptly and delays are avoided.

When a rescue request is raised, a HubSpot ticket is created to capture the contact’s details, along with information about the animal, including location and other relevant details required to provide assistance. An agent can then assess the ticket to determine the most appropriate resolution action for the animal.

One of the resolution actions includes “Send to xMatters”, which triggers notifications to the assigned groups or volunteers in xMatters via API, sending all relevant information captured in HubSpot.

The integration with xMatters is bidirectional, allowing ticket statuses to synchronise back into HubSpot. For example, when a volunteer accepts the request in xMatters, the ticket status in HubSpot is automatically updated via webhooks. A middleware solution was implemented to manage more complex requirements, including a custom Volunteer Portal built with integrations to both HubSpot and xMatters, enabling a fully closed-loop, end-to-end process.

As data is synchronised into HubSpot, workflows can be customised to support multiple use cases. For example, automated reminder notifications can be triggered within HubSpot to alert volunteers or internal teams, ensuring all animals receive proper and timely care.

### **Automation and escalations**

HubSpot workflows orchestrate ongoing case management and follow-ups.

Regional coordinators receive structured summaries of open tickets, carers are prompted to update cases in rehabilitation, and rescues outside WIRES’ scope trigger automated referral communications to partner organisations.

These automations reduce manual chasing while ensuring each rescue progresses through a defined and traceable lifecycle.

### **Testing and handover readiness**

Testing was conducted in structured phases, including module validation, end-to-end workflow testing, and high-volume scenario simulations to assess performance and scalability across both systems.

Security reviews confirmed appropriate role-based access and data separation. Following successful user acceptance testing, the platform was finalised and prepared for handover, with WIRES managing launch timing and rollout internally.

## **Impact and results**

Through the delivery of an integrated call centre logging system, standalone volunteer portal, and structured HubSpot configuration, WIRES has a cohesive rescue management ecosystem built for operational clarity and long-term scale. The solution brings together intake, dispatch, rehabilitation tracking, automation, and reporting into a single, connected architecture, replacing fragmented legacy processes with a technically robust and future-ready foundation.

The solution establishes HubSpot as the structured system of record, underpinned by two purpose-built external systems: the call centre logging interface and the volunteer portal. This architecture ensures operational usability is not compromised by CRM constraints, while still maintaining clean, centralised data governance.

By separating intake, field operations, and orchestration layers, WIRES now has a modular framework that can evolve over time. Enhancements to volunteer workflows, reporting models, dispatch logic, or stakeholder communications can be introduced without re-engineering the entire system. This positions WIRES for iterative growth rather than reactive rebuilds.

The introduction of a custom Animal object, defined ticket pipelines, role-based segmentation, and controlled automation creates a data model that supports deeper reporting and strategic insight over time.

Once active, every rescue interaction will be captured in a structured, auditable format. This enables:

- Accurate tracking of rescue volumes by species, region, and urgency
- Clear visibility into dispatch timelines and volunteer engagement
- Long-term analysis of rescue hotspots and capacity trends

Importantly, this foundation reduces reliance on manual reconciliation and spreadsheet-based reporting, allowing operational and leadership teams to make decisions from a consistent data source.

The closed-loop integration with xMatters introduces structured dispatch accountability, with every notification, response, and escalation recorded in HubSpot. This reduces coordination risk during high-volume or crisis events and provides a transparent audit trail for operational review.

Workflow automation across triage, referral, and follow-up processes ensures that cases move forward based on defined logic rather than manual oversight. This design supports sustainable growth without proportionally increasing administrative workload.

The call centre interface is tailored for high-pressure intake, reducing friction for operators while enforcing structured data capture. The volunteer portal provides field rescuers with a focused, mobile-optimised environment to manage cases without navigating a complex CRM.

For volunteers, this means clearer case visibility and simpler status updates. For the animals in care, it means fewer administrative bottlenecks between intake, dispatch, and rehabilitation tracking.

Rather than implementing a short-term patch, WIRES now has an extensible operational backbone designed to support future integrations, reporting expansion, and digital innovation.

The combined architecture of HubSpot, the custom call logging system, the volunteer portal, and the xMatters integration delivers a scalable, technically robust foundation. It strengthens governance, improves coordination design, and creates the infrastructure required for WIRES to grow confidently while maintaining operational integrity.
