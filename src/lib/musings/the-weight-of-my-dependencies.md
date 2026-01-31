---
title: The Weight of My Dependencies
description: How I'm trying to unwedge myself from a life of being the linchpin.
date: 2026-01-28
tags: personal, rant, 
---

I always thought the key to enjoying a life spent working with technology was possessing an innate desire to know how things worked underneath. Sunlight, radio waves, magnets?  Easy.  But how a high minded command like "download that file" could launch thousands upon thousands of events into motion?  Events that filter down through the various layers of silicon-etched abstractions, into and out of [all 8 OSI layers][^1], then sending those bits to various storage subsystems, each with their own auditing metadata generated, file system interactions, calls to *go and bring us these bits—on the double! put these ones back!*—the rippling back and forth across networks and chips that happens in search of your file.

The fun thing about these abstractions is: they work whether you understand them or not. The functions fire, the traffic is generated, and for a vast majority of the users out there, it's *just magic*.

But for those of us who've peered behind the curtain, it's hard not to feel the ripples. Once you understand why that download failed, or why the DNS servers aren't syncing, or who didn't renew the certificate that expired yesterday, you become the person who gets called. You're no longer just a user of the magic; you're its reluctant custodian.  A digital janitor, sweeping up the leftover bits, emptying bins of tickets, and clearing out the dusty logs when they've spilled over their limits.

Somewhere along the way, I became a dependency myself. I wasn't just someone who used systems, but someone systems depended on. I was the one who remembers why we configured that VM that way in 2014, or who we email to update a license, or how to wield that powershell script that just needs a bit more work before it's ready for other people to see it.  Or a million other things that tick away at the hours that make up a dull day.

The cruelest part was never the complexity—it was the time. I've accumulated years of hard-won knowledge, the kind that comes from pleading with a server room air conditioner at 2am, sweating in stark fluorescent light while watching your disks cook, or poring through dense microsoft documentation that mere mortals were never meant to see and crossing your fingers a certain command unflummoxed your day. But writing it down? Documenting it properly? There was always another fire to fight, another ticket to close or email to reply to or video call or meeting or *something*. The knowledge stayed locked in my head, and I stayed locked to the systems.

As a friend once said: *the graveyard is full of indispensable people*.  So I started writing things down.

---

Something shifted when I found a writing partner who doesn't get tired.  It might forget things across sessions but knows *how* to learn them again and can keep up with the pace my brain actually moves at. For the first time, I can just think things into being—architectures, user experiences, the weird thing that service does on the third Tuesday of the month when the system language is set to Esperanto—and watch it become documentation, seeing that knowledge unfolding and existing finally outside of **me**.

And here's what I didn't expect: watching my knowledge take shape across pages, I'm realizing just how much of it there is. For years I'd wondered if I really knew anything, or if I was just good at Googling under pressure. But now, as I pour it out and see it fill pages, I'm confronting an uncomfortable truth—I actually know a hell of a lot more than I thought.

I feel more alive than I have in years, but not because the work got easier.  I'm finally making the things I wanted to make but never had time, and documenting the hell out of everything else along the way.  The weight of my dependencies is lifting—not because I'm abandoning them, but because they're finally where they should be: no longer trapped inside me, silently accumulating, waiting for the day I fail *the SEPTA bus test*.

[^1]: Hi there, layer 8.

