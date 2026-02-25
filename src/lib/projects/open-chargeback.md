---
title: OpenChargeback
description: Or, how I learned to stop worrying and love the FOCUS format.
date: 2026-02-17
tags: software, claude, python, research, finops
git: https://github.com/atmarx/openchargeback
---

Academic research relies on access to computing resources: processing power and data storage.  These things cost money, whether using cloud or on-prem resources.  

I looked at the enterprise FinOps platforms — they wanted $50K a year, which is roughly what we spend on a mid-size research allocation, and they'd need a dedicated person to run.  That person would also be me.

OpenChargeback is a Python CLI and web application that imports billing data from AWS, Azure, HPC, storage systems — anything that can produce a CSV — and normalizes it into the [FOCUS format](https://focus.finops.org/), the FinOps Foundation's open billing standard.  PIs can see list price next to what they're actually paying, so nobody has to wonder where the numbers came from.  Charges go through a review workflow before statements go out.  The output is template-driven — whatever format your finance system eats, you write a Handlebars template for it.  PDF statements, GL journal entries, CSV exports.  It fits into whatever you already have; it doesn't try to replace it.

I deliberately kept it right-sized.  SQLite instead of Postgres, because I didn't want to build a multi-tenant platform before anyone asked for one.  SQLAlchemy underneath, so if someone *does* want to scale it up, that's left as an exercise to the reader.  No external services, no build step, no enterprise contract.  The kind of tool a single research computing person can deploy, configure, and actually maintain.

The thing that became clear after getting the cloud providers figured out was that the same approach works for *anything* with usage metadata — Kubernetes, Docker, file storage.  If you can attach tags to a resource, you can generate usage invoices from it.  The whole application is metadata-driven; the governance model is up to you.

It's built to be forked and owned — clone it, customize the config for your institution, run it.  A companion project, [OpenResearchDataPlanner](https://github.com/atmarx/OpenResearchDataPlanner), handles the other side: helping researchers figure out what they need and estimate costs for grant budgets *before* the bills arrive.  One tool for "what will this cost?" and one for "here's what it cost."  The spreadsheet, finally, stays in the box.
