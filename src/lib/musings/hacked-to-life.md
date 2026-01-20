---
title: Hacked to Life
description: A meme graveyard, a cryptominer, and a cascade of silent failures
date: 2026-01-19
tags: security, docker, devops, incident
---

[RipThis.Meme](https://ripthis.meme) is a graveyard for dead memes. It's still in its infancy, having just built it last weekend, but this morning the site wouldn't load at all and `htop` instantly showed the IoCs.

A cryptominer had moved into my crypt.

## The Setup

I use [Umami](https://umami.is) for privacy-respecting analytics—no cookies, no tracking, just simple page view counts. It runs in a Docker container alongside the main site. Standard stuff.

When I set up the stack, I used Claude Code to help configure it. Its training data knew Umami's v2 tagging scheme—tags like `postgresql-latest` and `postgresql-v2.x.x`. During initial dev, it pulled one of those, caching a v2 image locally.

Later, I tried to pin to the current version. Claude Code suggested `ghcr.io/umami-software/umami:postgresql-v3.0.3`—which looks right, but isn't. Umami changed their tagging convention for v3: they dropped MySQL support, made PostgreSQL the default, and removed the `postgresql-` prefix entirely. The v3 tags are just `3.0.3`, `3.0`, `latest`.

The tag `postgresql-v3.0.3` doesn't exist. Docker didn't error. It silently fell back to the cached v2 image.

## The Tag That Wasn't

I thought I was running v3.0.3. I was actually on v2.15.1—thirteen months old, with known vulnerabilities. Umami doesn't have a version display in its UI, so I had no easy way to verify. It was my first time using it; I assumed the pin worked.

Three days of 100% CPU later, I popped open `htop` and found the squatter: random-string binaries tucked into `/app/.next/`, running as the unprivileged `nextjs` user.

## The Save

Here's where containerization earned its keep. The attack was **fully contained**:

- No host filesystem access
- No SSH key additions
- No lateral movement to other containers
- No data breach (the miner had no database access)

The only damage was borrowed CPU cycles. The miner was probably disappointed—a meme graveyard server with 1vCPU and 2GB of RAM isn't exactly the GPU farm I'm sure they had hoped to find (not that this deterred them).

## The Fix

Fifteen minutes from detection to resolution:

1. Removed the malware binaries
2. Upgraded Umami to v3.0.3
3. Applied `read_only: true` to the container
4. Added a tmpfs mount for `/tmp`

The read-only filesystem should have been the default from day one. **Lesson learned.**

## The Real Lesson

This wasn't a sophisticated attack. It was an opportunistic exploit of a known vulnerability in outdated software—the kind of thing that's entirely preventable, if you actually know what you're running.

The failure here was a cascade of reasonable assumptions:

1. **AI training cutoffs are real.** Claude Code knew Umami's old tagging scheme, not the new one. When tools suggest versions, verify them against the actual registry.
2. **Silent failures are insidious.** Docker didn't complain about the non-existent tag. It just used what it had cached. No error, no warning.
3. **Verification matters.** I assumed the pin worked. I never checked. Umami has no version display, but I could have run `docker inspect` or checked the image digest.

I've [written about version pinning](https://build.xram.net/concepts/versioning-and-lockfiles/) before—but pinning only works if the tag exists and you verify it resolves to what you expect.

Tools like [Dependabot](https://docs.github.com/en/code-security/dependabot) and [Renovate](https://docs.renovatebot.com/docker/) can monitor Docker images and open PRs when new versions drop. They would have flagged that my "pinned" image was ancient. I knew these existed. I just didn't think I'd need them in week two of a side project.

Turns out security debt accrues faster than you'd expect—even on a graveyard.

## Next Steps

I'm setting up proper [vulnerability management](https://build.xram.net/security/vulnerability-management/) now: container scanning with Trivy, Dependabot for docker-compose, and maybe finally generating an SBOM so I actually know what's running (I never thought the graveyard would need it).

The miner was, ironically, the most active user RipThis.Meme ever had.

---

*For the forensics enthusiasts, here's the [full incident report](/reports/umami-cryptominer.md).*
