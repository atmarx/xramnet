---
title: Finding Your Voice
description: The most important work on my recent projects wasn't design or content — it was defining who was speaking.
date: 2026-01-20
tags: claude, writing, process
---

The most important work on my recent projects wasn't the design. It wasn't the content. It wasn't the tech stack or the deployment pipeline.

It was defining the voice.

Before I wrote a single word of actual content for Keep Your Teeth, Come Sit With Me, or my developer guides, I spent hours with Claude crafting a persona. Not a character exactly — more like a lens. Who is speaking? What do they care about? How do they talk? What frustrates them? What brings them joy? What would they *never* say?

Each project got its own voice document — a CONTRIBUTING.md that captures the narrative voice for human contributors and AI assistants alike. These aren't style guides. They're character sheets.

## Brighid

[Come Sit With Me](https://comesitwith.me) is narrated by Brighid — a Celtic goddess of fire, healing, and the hearth. But she's not a goddess looking down. She's "the goddess looking out through your eyes — because she has looked out through every woman's eyes who has stood at this threshold."

Every hot flash. Every sleepless night. Every moment of snapping at someone you love and not knowing why. Every time a doctor dismissed her. She's tired because tending this fire for millennia is tiring. She's patient because she's held this space so many times.

The voice document includes explicit transformations:

**Not this:**
> "Perimenopausal women often report experiencing vasomotor symptoms including hot flashes and night sweats."

**This:**
> "The heat rises in you like summer lightning—sudden, fierce, and then gone, leaving you wondering if anyone else noticed."

And guidance on what Brighid would never say:
> "You're doing amazing, mama! This too shall pass! You've got this!"

Instead:
> "It's real. All of it. What you're feeling is not in your head."

## The Tooth Fairy

[Keep Your Teeth](https://keepyourteeth.org) is narrated by the Tooth Fairy herself — warm but exasperated. Genuinely caring, tired of human mistakes. Scientifically accurate with dry humor, occasional sarcasm, never mean-spirited.

The voice document includes a tiered evidence system baked into how she speaks:

| Tier | Language |
|------|----------|
| Strong evidence | "Research shows..." |
| Moderate evidence | "Evidence suggests..." |
| Promising but limited | "Preliminary research indicates..." |
| Traditional use only | "Traditionally used for..." |
| Disproven | "Despite claims, evidence does not support..." |

The Tooth Fairy doesn't just deliver information differently — she categorizes certainty as part of her voice. She's such a pedant about it that she published [an entire appendix on evidence evaluation](https://keepyourteeth.org/reference/evidence-hierarchy/), complete with an ASCII pyramid of the evidence hierarchy and guidance on how to read scientific claims critically. Epistemology as character trait.

## The Graybeard

My developer guides — [Open Source Licensing](https://libre.xram.net) and [The Weight of Your Dependencies](https://build.xram.net) — are narrated by a "graybeard" — a software developer who's been in the industry since before "open source" had a name. But he's a *specific* type:

- Learned vi on a VT100 because that's what was available. Still uses it. (Not vim—*vi*. Though he'll admit vim is fine.)
- Respects emacs users who actually write elisp. "At least they're *building* something."
- Remembers when "dependency management" meant tarring up vendor libraries.
- Skeptical of magic. If you can't explain what's happening underneath, you don't understand it.
- Values simplicity. Three simple lines of code are better than a premature abstraction.

The document specifies what he wouldn't say:
- "Everything should be GPL" (too prescriptive)
- "[BigTechCompany] is evil" (too editorial — he'd say "[BigTechCompany]'s incentives led to predictable outcomes")
- "Kubernetes is the answer" (too trendy — he'd say "Kubernetes solves specific problems; most of you don't have those problems")

And what he would say:
- "I've seen this pattern before."
- "Let me tell you what actually happened."
- "The lesson isn't that they were wrong — it's that incentives matter."

## Transparency, Not Trickery

**None of this is hidden from readers.** Each site's preface explicitly names the voice and explains why it exists. The Tooth Fairy isn't *pretending* to be a real fairy any more than a novel's narrator is pretending to be a real person. It's a literary device — acknowledged, explained, and offered as a lens for the material.

This transparency matters. I'm not attempting to fool readers; they're being invited into a framing that makes the content more accessible. Knowing that Brighid is a constructed voice doesn't make her less helpful at 3 AM. If anything, it makes the care behind the construction more visible.

## Why This Works

When the voice is this clear, content decisions become automatic. You're not asking "what should I write?" — you're asking "what would this person say?" The whole site becomes more coherent, more trustworthy, more *itself*.

It's the difference between a site that delivers information and a site that feels like it was made by someone who cares. Both might contain identical facts. Only one feels like it was written for you.

The voice document for Come Sit With Me ends with a checklist. I think about it constantly:

- Does this sound like it could come from a wise grandmother who has also read the research?
- Am I explaining *why*, not just *what*?
- Have I avoided clinical jargon where plain language works?
- Am I being honest about what we know and don't know?
- Would this feel warm to read at 3 AM when you can't sleep and don't know what's happening to you?

That last one. That's the test. Not "is this accurate?" but "would this help someone who's scared and alone at 3 AM?"

Skip voice definition and you'll spend forever tweaking copy that never quite feels right. Invest in it — really invest, hours of iteration before a single line of content — and the writing almost writes itself.

---

*"Come. Let me tell you what I know."*
