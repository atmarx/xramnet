---
title: If It's Going to Exist, It Might as Well Be Interesting
description: On fictional universities, fake faculty, and the death of the focus group.
date: 2026-02-18
tags: claude, building, process, ux
---

Someone saw the campus and said "I want to go to there."

It's an AI-generated image of a quad that doesn't exist, at a university that doesn't exist, in a town I haven't bothered to place on a map.  Gothic halls with ivy.  A fountain.  Students lounging on the grass like they've never once worried about their cloud storage bill.  I made it as a placeholder background for [OpenResearchDataPlanner](../projects/open-research-data-planner) — something to fill the screen until a real institution swaps in their own branding.

But for as nice as "there" looks, it didn't start *there*.

---

Northwinds University has a history, if you know where to look.  The name is a nod to the Northwind Traders database that shipped with Microsoft Access — the sample dataset that taught a generation of us what a relational database was.  Contoso College, their rival across the river, comes from the same lineage — Microsoft's go-to fictional company, the one that populates every Azure tutorial and PowerPoint demo.  I grew up on this stuff.  These fake companies were my first encounter with the idea that test data could tell a story, even if nobody intended it to.

The difference is: Northwind Traders had customers named "Maria Anders" and "Thomas Hardy."  Real-sounding names for not-real people.  I didn't want that.  I didn't want a Dr. Sarah Chen in my sample data getting a chargeback statement for 50TB of genomics storage at an institution that doesn't exist.  So the faculty at Northwinds University have names that could not belong to a real person who might stumble across them and feel called out.

Dr. Torben Vex, computational physicist.  Definitely has opinions about your methodology.

Dr. Rab Tonkling, marine biology.  Sounds like a character from a Pratchett novel who studies the acoustic properties of damp limestone.

Dr. Sela Frindt, neuroscience.  Runs the kind of lab where the grad students all have impostor syndrome and the PI has the opposite problem.

They're absurd.  They're also *useful*, because the moment you give a fake person a name and a discipline, you start thinking about what they'd actually need.  Dr. Vex runs simulations — he needs GPU time, not storage.  Dr. Tonkling has field data from ocean sensors — she needs storage, not compute.  Dr. Frindt has IRB-protected human subjects data — she needs a tier classification before she can even pick a platform.  The sample data stops being sample data and starts being a design tool.

---

I wrote about this in [Finding Your Voice](finding-your-voice) — the idea that defining *who is speaking* before you write a single word of content makes everything downstream easier.  Brighid narrates a perimenopause resource.  The Tooth Fairy narrates an oral health guide.  The Graybeard narrates developer guides.  Each one is a lens that turns "what should this page say?" into "what would this person say?" — and suddenly the writing almost writes itself.

What I didn't fully realize at the time was that the same trick works for *everything*, not just narrative voice.  It works for UX.

The traditional cycle goes something like: find the right audience, design a survey, distribute it, wait for responses, analyze the results, build personas from the data, design for those personas, test with users, collect feedback, iterate.  Weeks.  Months.  Longer if you're in higher ed, where committee review alone can outlast a grant cycle.  I've been part of that process.  It's valuable — I'm not dismissing it.  Real user feedback from real people is irreplaceable for validating whether you built the right thing.

But for figuring out *what* to build?  For the early, messy, generative phase where you're trying to understand what a researcher would even want from a tool like this?

I gave Claude a few faculty archetypes and we talked through the rest.  I needed to be able to ask: "You're Dr. Tonkling.  You just got a three-year NSF grant.  You have 200TB of ocean sensor data coming in over the next six months.  Walk me through this wizard and tell me where you get confused."

And she did.  She got confused in exactly the places a real marine biologist would — the storage tier question was too technical, the cost estimator assumed she already knew her data classification, and the DMP template used acronyms she'd never seen.  I fixed those things.  Then I ran Dr. Vex through, and he had different problems — the GPU estimation calculator didn't account for multi-node jobs, and the comparison table didn't show which platforms supported his specific framework.

In an afternoon, I'd done a version of what would have taken weeks with real participants.  Not a *replacement* — I'll say it again, real feedback is irreplaceable — but at least a *first pass*.  A way to find the obvious problems before you put a real person's time on the line asking them to find them for you.

---

I think there's a principle underneath all of this that I keep arriving at from different directions.

If you're building sample data, you can fill it with "Test User 1" and "Lorem Ipsum" and call it done.  Or you can give it a fountain and a quad and faculty who have opinions about your methodology.  Both get the job done.  Only one teaches you something about what you're building.

If you're writing a health guide, you can present the facts in clinical language and trust that accuracy is enough.  Or you can hand the facts to a goddess who's been tending this fire for millennia and let her tell it in a way that helps at 3 AM

If you're going to make the thing at all — if it's going to exist — it might as well be interesting.  Not because interesting is always better, but because interesting has a way of revealing what generic never does.  The fictional faculty showed me design flaws, and because their backstories have depth, .  The narrative voices showed me where the content was cold.  The campus nobody asked for made someone say "I want to go to there."

None of that would have happened with placeholder data and a clinical tone.

The tools are fast enough now that the question isn't whether you *can* afford to make it interesting.  The question is whether you can afford not to.
