---
client: "Brisbane Broncos"
display_name: "Brisbane Broncos"
status: draft
url: null
industry: ["Sports and entertainment"]
region: []
hubs: []
migration_from: []
updated: 2026-11-18
---

The Brisbane Broncos are one of Australia's most celebrated rugby league clubs, founded in 1988 and based in Brisbane, Queensland. As back-to-back NRL Premiership contenders and one of the most recognisable names in Australian sport, the Broncos have built a passionate fanbase spanning generations; from season members who've followed the club for decades to a new generation of fans discovering the game for the first time. Their commitment extends beyond the field, with three distinct brands — Men's, Women's, and Community, and a presence that reaches fans across rugby league, grassroots participation, and live event experiences.

## Case study document

## Industry

Sports & Entertainment

## HubSpot licensing

Marketing Hub Enterprise,
Sales Hub Enterprise,
Service Hub Enterprise,
Operations Hub
Content Hub

## About the business

The Brisbane Broncos are one of Australia's most celebrated rugby league clubs, founded in 1988 and based in Brisbane, Queensland. As back-to-back NRL Premiership contenders and one of the most recognisable names in Australian sport, the Broncos have built a passionate fanbase spanning generations; from season members who've followed the club for decades to a new generation of fans discovering the game for the first time. Their commitment extends beyond the field, with three distinct brands — Men's, Women's, and Community, and a presence that reaches fans across rugby league, grassroots participation, and live event experiences.

## Project timeline

6 Months

## Integrations

Dynamics 365 to HubSpot
Eloqua to HubSpot
PMY Group (Unified Data Platform / AWS)
Message Media (SMS/MMS),
Ticketmaster
Ticketek

## Brand website

https://www.broncos.com.au/

## Summary of the business

Few clubs in Australian sport carry the weight of expectation that comes with the Broncos jersey. Since their founding in 1988, the Brisbane Broncos have won six NRL premierships and established themselves as a cornerstone of rugby league in this country — a club that doesn't just compete at the top level, but shapes what the top level looks like.

Today, the Broncos are as much a fan experience organisation as they are a football club. They manage one of the most passionate memberships in the NRL, deliver world-class live hospitality experiences at Suncorp Stadium, operate three distinct brand identities across Men's, Women's, and Community football, and connect with hundreds of thousands of fans across digital channels every week. Running all of that with the same precision the team brings to game day demands digital infrastructure that can match the ambition.

By the time the Brisbane Broncos came to Engaging, they were ready for game day. Just like their teams on the field putting in the training to get ready for the season, the data and technology team had been doing the same - and arrived with a clear picture of what the club needed to reach their goals.  What they needed was a partner who could match that thinking and bring the expertise to execute: someone who understood the complexity of unifying fan data across a multi-brand operation, the pressure of a membership season that waits for no one, and the reality that for a club at this level, the margin for disruption is zero.

**The problem**

Delivering a world-class fan experience takes more than passion for the game, it takes the right systems behind the scenes. For the Broncos, the ambition to know their fans deeply and communicate with them meaningfully was there. The infrastructure to support it, across every part of the business, was still catching up.

1. ### A membership team built for volume, without the tools to match

The Broncos' membership operation is one of the largest and most active in the NRL. During peak periods, the team handles over 100 fan contacts a day, across a variety of channels. With a team managing both inbound servicing and outbound sales campaigns simultaneously, the ability to see every interaction with a fan in one place was essential. Without it, fans occasionally experienced the frustration of speaking to more than one team member about the same issue — something the Broncos were determined to fix.

2. ### Marketing ready to go further, waiting on the data to get there.

The Broncos' marketing team had real creative ambition. They wanted to move from campaign-by-campaign communications to planned customer journeys and personalised messaging that matched their fan’s activity and not a generic automation based on basic information. The challenge was getting the data and tools to connect, and reduce the manual work required for segmentation, reporting and more.

3. ### One club, many conversations — without a shared view.

Across membership, hospitality, and commercial partnerships, the Broncos were building relationships with fans and partners simultaneously. The Broncos recognised the opportunity to connect those relationships, and reduce friction from valuable data being siloed - connecting the dots between the hospitality guest that was also a member for the last 10 years.

## The solution

Engaging.io designed and delivered a holistic HubSpot environment that brought the Broncos' internal teams,  across commercial, marketing, and service, into a single platform, connecting it with the club's existing AWS data infrastructure.

The solution was designed around the Broncos' own technical capability and built to their vision. Using Engaging.io's expertise, the focus was on architectural design, best-practice configuration, and structured knowledge transfer — so the club's team could extend and own the platform independently from day one, with no ongoing dependency on external support.

Read on to see how the strategy came to life.

## The strategic plan

**1. Connect the data architecture**

Before any build began, Engaging worked with the Broncos' data team and tech partner PMY Group, to establish how fan data would flow from the Unified Data Platform into HubSpot. The UDP was confirmed as the authoritative source for membership, ticketing, and transactional data — with clear governance over which data HubSpot would consume, which fields users could edit, and how consent status would sync back into the source system.

**2. Build pipelines that reflect how each team actually works**

Separate deal pipelines were configured for membership, partnerships, hospitality, and orders, each with its own stages, required fields, and reporting logic. The high-volume, activity-driven rhythm of membership sales sits alongside the longer relationship cycle of partnerships, without either team working in a structure designed for the other. Designing it this way helps with change management and user adoption, as well as user satisfaction in a CRM that has been configured to the way they work.

**3. Give the service team a shared home**
A centralised help desk was configured with ticket pipelines for membership, general enquiries, and complaints — bringing the membership team's shared inbox into HubSpot for the first time. Escalation logic, SLAs, and team-level dashboards gave team leaders the visibility to manage workload and performance in near real time. Unifying these channels assisted with reducing the cognitive load of context switching, and improving day to day satisfaction.

**4. Ready the marketing engine**
Marketing Hub Enterprise was configured with subscription types across email and SMS, three brand identities, lead scoring built around fan behaviour signals, and a structured IP warming programme to transition send volume from Eloqua to HubSpot ahead of the membership season — starting with the most engaged segment and ramping as deliverability metrics confirmed readiness.

**5. Build for ownership, not dependency**

Training was sequenced by team function; marketing, sales, service, and admin — with sandbox champions identified early and content timed to match data availability. The Broncos' team went live with the platform understanding not just how to use it, but how to build on it.

## The implementation

The technical centrepiece of this project was the integration between HubSpot and the Broncos' Unified Data Platform, a bespoke AWS architecture that consolidates fan, membership, ticketing, and transactional data from multiple upstream systems including Ticketmaster and Ticketek.

EIO advised a UDP-first integration architecture: rather than connecting each source system directly to HubSpot, all customer and transactional data flows through the UDP as the single source of truth, with HubSpot consuming structured data via PMY Group's integration pipeline. This approach gave the Broncos' internal team a single point of control for data governance, reduced integration complexity, and ensured that future changes to source systems wouldn't require rebuilding the HubSpot configuration from scratch.

Custom properties were mapped to UDP field structures, with governance rules defining which data was read-only in HubSpot — protecting membership records, ticketing data etc, and which properties remained editable for fan profile enrichment and relationship management.

To handle the complexity of multi-season membership data cleanly, a custom member record object was created allowing the team to segment, report on, and communicate with members based on season-specific data without creating an unmanageable volume of fields on the contact itself — a structural decision that will scale as the membership programme grows.

Marketing contact management was handled through consent-syncing workflows, ensuring HubSpot's subscription status stayed aligned with the club's source of truth. A lead scoring model was built around engagement signals and fan property data including membership status, hospitality engagement, and merchandise history. Score thresholds were designed to translate into simplified, user-facing properties via workflows.

## Impact and results

The Brisbane Broncos arrived with disconnected systems, a membership team managing fan relationships across too many channels to track, and a marketing function ready to do more than their tooling would allow. Today, every team is working from a single platform, with their fans at the centre of it.

The sales team moved from Dynamics365 to HubSpot Sales Hub Enterprise, replacing a system that couldn't keep pace with the volume and variety of the Broncos' commercial operation. Membership, partnerships, and hospitality now each have their own pipeline — structured to match how each team actually sells, with visibility into activity, performance, and conversion that simply didn't exist before.

The marketing team migrated from Eloqua to HubSpot Marketing Hub Enterprise, consolidating email and SMS into a single environment for the first time. Segmentation that was previously built from scratch for every campaign is now driven by live fan behaviour — what they've attended, what they've clicked, how long they've been a member. The IP warming programme completed ahead of the membership season, with the Broncos' most engaged fans receiving their first HubSpot communications to open rates well above industry benchmarks.

The service team, previously managing fan enquiries through a shared inbox with no centralised visibility — moved into HubSpot Service Hub Enterprise with structured ticket pipelines, SLAs, and escalation logic in place. [NOTE: confirm with delivery team what the service team was using before — notes reference a shared inbox and Eloqua but no named service platform]

The result is a club that can see a complete picture of every fan's relationship with the Broncos, from their first membership to their most recent game, and communicate with them accordingly. The infrastructure built during this engagement isn't just solving today's challenges. It's the foundation the Broncos will build their next chapter on.
