---
title: The Weight of Your Dependencies
description: A mentor-style guide to dependency management and supply chain security. Teaches reproducibility, risk evaluation, and practical decision-making for developers.
date: 2024-03-15
tags: software, security, claude, research, mkdocs
url: https://build.xram.net
git: https://github.com/atmarx/building-software-guide
image: /src/lib/assets/projects/weight-of-your-dependencies.webp
---

Same motivation as [the licensing guide](open-source-licensing-guide): my day job means watching researchers and engineers wrestle with concepts that existing documentation assumes you already understand. The textbooks are written for professional developers. But when a physicist asks "why does my container build differently every time?" or an engineer wonders "is it safe to install this package?", they need answers that connect to their actual concerns, not abstract best practices.

This guide is for people who run `pip install` or `npm install` without thinking about the dozens or hundreds of packages that command pulls in. I wrote it for folks working with Python notebooks, containers, and production deployments who know something feels wrong but aren't sure what.

The guide covers foundational concepts like evaluation strategies and versioning approaches, security concerns from supply chain vulnerabilities to software bills of materials, practical techniques for reproducibility and development hygiene, and ecosystem-specific guidance for Node.js, Python, Go, Rust, and AI/ML development.

Real-world case studies include the infamous incidents: left-pad, event-stream, colors.js, Log4Shell, and the xz utils backdoor. Each one a lesson in how trust gets exploited and what could have been done differently.

The teaching philosophy emphasizes informed decision-making over prescriptive rules. Every dependency is a tradeoff; there's no zero-risk option. The goal is understanding your risks well enough to make conscious choices.

Built with MkDocs and Material theme, deployed to GitHub Pages. Research synthesized with Claude.
