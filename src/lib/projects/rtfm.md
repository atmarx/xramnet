---
title: Azure DevOps AI App
description: A chatbot that knows how it was made, because you taught it by making it.
date: 2026-02-18
tags: software, claude, azure, ai, education, python
git: https://github.com/atmarx/azure-devops-ai-app
---

The question I kept getting from developers and researchers was some version of: "I want to build an AI thing on Azure.  Where do I start?"  And the answer was always the same uncomfortable shrug — the documentation exists, scattered across a dozen Microsoft Learn pages, each assuming you've already read the other eleven.  Federated identity, Bicep templates, Container Apps, AI Search, model deployments — the pieces are all there, but nobody had stitched them together into a path you could actually walk.

So I built the path.  And then I did something a little recursive: I made the path *be* the project.

Azure DevOps AI App is a RAG-powered chatbot that answers questions about its own documentation.  The learning guide teaches you how to build and deploy an LLM application on Azure — from an empty resource group all the way through to production.  The twist is that the documentation you follow *is* the content the chatbot indexes.  Once you've built it, you can ask it "how do I set up federated identity?" and it answers from the very guide you followed to set up federated identity.

It's a snake eating its own tail, except the snake is helpful and the tail is well-documented.

The architecture is straightforward: a Flask web app handles the chat UI and RAG orchestration, Azure AI Search provides hybrid retrieval (vector + keyword), and Azure AI Foundry hosts the model.  An indexer job chunks and embeds the mkdocs content into the search index.  The whole thing deploys through Azure DevOps pipelines defined in the repo itself — because if you're teaching CI/CD, the CI/CD should be part of the lesson.

The part I'm most pleased with is the "Fork & Swap" design.  Replace the `content/docs/` directory with your own mkdocs site, re-run the indexer, and the chatbot answers questions about *your* documentation instead.  The self-referential demo is the hook, but the actual utility is a reusable RAG template that anyone can point at their own content.  The meta part gets you in the door.  The practical part is why you stay.
