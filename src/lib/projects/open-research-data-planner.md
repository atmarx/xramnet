---
title: OpenResearchDataPlanner
description: The question before the question.
date: 2026-02-17
tags: software, claude, research, education, node
git: https://github.com/atmarx/OpenResearchDataPlanner
---

Before a PI asks "how much did this cost?" they ask something harder: "what do I need?"  That question usually arrives attached to a grant proposal with a deadline, and the answer requires knowing things most researchers have no reason to know — what storage tier their data falls under, how many GPU-hours their model will need, whether their IRB classification changes which platforms they can use, and what all of this will cost three years from now when the grant is halfway through.

At Drexel, that question lands on my desk.  And I'm happy to help — I genuinely am — but the conversation usually starts with twenty minutes of vocabulary alignment before we can get to the actual problem.  "What's a tier?"  "What do you mean by 'hot' storage?"  "Why can't I just put this on Google Drive?"  All fair questions.  All things I've explained dozens of times.  All things that should be answerable *before* someone needs to schedule a meeting with me.

OpenResearchDataPlanner is a guided wizard that walks researchers through selecting data infrastructure, estimating costs for grant budgets, and generating draft Data Management Plan text — the DMP section that every federal grant requires and nobody enjoys writing.  It's designed for the person staring at an NSF budget template at 11 PM wondering how to estimate storage costs for data they haven't collected yet.

The whole thing is config-driven — every question, every service, every pricing tier lives in YAML files that an administrator can customize without touching code.  A tier questionnaire helps researchers figure out their data classification through plain-language questions instead of policy documents.  "Help Me Estimate" calculators translate research concepts (images, samples, sequencing runs) into infrastructure units (terabytes, GPU-hours).  Terminology tooltips explain jargon inline, because nobody should have to open a second tab to understand the tab they're already on.

And there's an escape hatch.  Every screen has a "Talk to a Human" button — email, schedule a call, or save your progress and bring it to a meeting.  The tool isn't trying to replace the conversation.  It's trying to make sure that when the conversation happens, we can skip the vocabulary lesson and get to the interesting part.

It's a companion to [OpenChargeback](/projects/open-chargeback) — the planner handles "what will this cost?" and the chargeback tool handles "here's what it cost."  Both are built to be forked and owned.  Clone it, drop in your institution's services and pricing, deploy it wherever you host static files.  No backend, no accounts, no vendor.  Just a researcher, a wizard, and a budget that finally has real numbers in it.
