---
title: Hacked to Life
description: A meme graveyard, a cryptominer, and a cascade of silent failures
date: 2026-01-19
tags: security, docker, devops, incident, ripthismeme
---

[RipThis.Meme](https://ripthis.meme) is a graveyard for dead memes. It's still in its infancy, having just built it last weekend, but this morning the site wouldn't load at all and `htop` instantly showed the IoCs.

A cryptominer had moved into my crypt.

## The Setup

I use [Umami](https://umami.is) for privacy-respecting analytics—no cookies, no tracking, just simple page view counts. It runs in a Docker container alongside the main site. Standard stuff.

When I set up the stack, I used Claude Code to help configure it. Initially it used `postgresql-latest`—which, unbeknownst to either of us, *already pointed to v3.0.3*. That would have been fine.

But I'd [written about pinning versions](https://build.xram.net/concepts/versioning-and-lockfiles/) before, so I asked Claude Code to pin it properly. It tried `postgresql-v3.0.3`, following the v2 naming convention. That tag doesn't exist—Umami dropped both the `postgresql-` prefix and the `v` prefix for v3. The correct tag is just `3.0.3`. Instead of checking what `postgresql-latest` actually resolved to, Claude fell back to an old v2 tag it knew: `postgresql-v2.15.1`, from December 2023.

The attempt to follow best practices accidentally **downgraded** me from v3.0.3 to a thirteen-month-old v2 with known vulnerabilities.

## The Pin That Backfired

I assumed a pinned version meant I was being responsible. Instead, I'd gone backwards. Umami doesn't have a version display in its UI, so I had no easy way to verify. It was my first time using it.

The irony: if I'd just left `postgresql-latest` alone, I'd have been on v3.0.3 the whole time.

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

1. **AI tools pattern-match on stale conventions.** Claude Code tried to use v2's naming scheme for v3. When it failed, it fell back to an old version instead of checking what the current tags actually resolved to. Neither of us verified.
2. **"Pinned" doesn't mean "current."** A version pin locks you in place. Without something watching for updates, you're frozen on whatever you pinned—even if it's already stale.
3. **Verification is my job.** The AI is a tool; I'm the operator. I could have checked `docker inspect`, compared image digests, or just looked at Umami's releases. I didn't.

I've [written about version pinning](https://build.xram.net/concepts/versioning-and-lockfiles/) before—but pinning only works if the tag exists and you verify it resolves to what you expect.

Tools like [Dependabot](https://docs.github.com/en/code-security/dependabot) and [Renovate](https://docs.renovatebot.com/docker/) can monitor Docker images and open PRs when new versions drop. They would have flagged that my "pinned" image was ancient. I knew these existed. I just didn't think I'd need them in week two of a side project.

Turns out security debt accrues faster than you'd expect—even on a graveyard.

## Next Steps

I'm setting up proper [vulnerability management](https://build.xram.net/security/vulnerability-management/) now: container scanning with Trivy, Dependabot for docker-compose, and maybe finally generating an SBOM so I actually know what's running (I never thought the graveyard would need it).

The miner was, ironically, the most active user RipThis.Meme ever had.

---

*For the forensics enthusiasts, here's the [full incident report](/reports/umami-cryptominer.md).*
