---
layout: ../../layouts/MainLayout.astro
title: "The case for a bug bounty in ML | Amit Kiran Rege"
description: "A proposal for paying careful, adversarial checks of machine learning papers."
pageClass: blog-page
---

<p class="meta">Essay</p>

# The case for a bug bounty in ML

When I read an ML paper closely enough to extend it, I find something wrong about a third of the time. Not fraud. Usually a hyperparameter sweep that wasn't fully reported, a baseline that was tuned less carefully than the proposed method, a benchmark with quiet contamination, a result that doesn't survive a different seed. Some of these errors matter for the paper's central claim and some don't. Almost none of them get corrected.

The reason is straightforward. The people who notice ML errors are usually graduate students extending a paper, engineers trying to deploy a method, or careful readers with time. None of them have anywhere to send the finding, and none of them are paid to do the additional work that would turn a private suspicion into a public correction. So the error stays in someone's head, the paper stays cited, and the next generation of work gets built on it.

This is a structural problem, not a cultural one, and I think it has a structural solution that ML is uniquely positioned to test.

## Why peer review and replication aren't catching these

Peer review has scaled past what individual reviewers can do. NeurIPS 2024 received over 17,000 submissions. A reviewer who actually wanted to rerun a paper's experiments cannot, in three weeks, on top of their day job, for free. So they read the paper, sanity-check against priors, and submit a score. This was always somewhat true. It is now overwhelmingly true.

Replication has stopped working for a different reason. A serious check on an expensive paper costs thousands of dollars in compute and weeks of senior research engineering time. The reward for doing it carefully is approximately zero. No conference accepts replication papers, no grant funds them, and no tenure committee credits the work. The labor doesn't get done.

Software security solved a structurally similar problem in the 1990s. Vendors couldn't find every vulnerability in their own products, and users who found vulnerabilities had no incentive to report them carefully. Bug bounty programs changed the equilibrium by making "find a flaw and document it well" a paid activity. Twenty years later, every serious software product has a bounty program, and the security posture of the industry is unrecognizable.

Science has mostly not done this. The exception worth naming is ERROR (error.reviews), launched in 2024, which pays specialists to check highly-cited psychology papers. ERROR is good. It is also designed for psychology, where authors opt in to being checked, investigators are invited from a small pool of trusted reviewers, and the artifacts under review are largely textual and statistical. That design works for psychology because that's how psychology papers are constructed.

ML papers are constructed differently, and the difference matters.

## What's specific about ML

Three things are true of ML that aren't true of most quantitative sciences, and together they make a bug bounty workable here in a way it isn't elsewhere.

The first is that ML papers ship downloadable artifacts. Code is on GitHub, weights are on HuggingFace, benchmarks are public. Anyone who wants to check a claim doesn't need the authors' permission, lab access, biological samples, or institutional review. The full surface of the claim is sitting on a server. No other quantitative field has this property at scale.

The second is that ML errors are often mechanically checkable. Was the test set in the pretraining corpus? Substring matching against indexed training data answers it. Was the baseline given the same compute budget? Re-run with matched compute. Does the headline number survive across seeds? Five GPU-days. These aren't questions of interpretation. They have answers, and the answers are reproducible.

The third is that AI assistants now make the routine parts of checking dramatically cheaper than they were two years ago. A research engineer paired with a strong assistant can read a paper, locate the artifacts, identify likely failure modes, draft a check protocol, and run it in days rather than months. The cost curve for thorough checking has dropped sharply, but the credit assignment system in academia hasn't moved.

Together these three facts mean a bounty program in ML can do something ERROR's design cannot. Checking can be adversarial, with no opt-in from authors. The pool of checkers can be a crowd rather than a small panel, because AI tooling raises the floor for what a careful non-specialist can verify. And the checks can be mechanical and reproducible rather than judgment calls, which matters because mechanical checks generate norms a field can absorb.

## The pilot

Here is what I would actually run.

Pick 100 ML papers from 2022-2024, weighted toward high citation count and downstream production use. Set up a bounty board with five tiers. Training-data contamination, $5K. Unreported hyperparameter selection that flips the headline result, $10K. Failed replication of the central claim under faithful protocol, $15K. Data leakage that invalidates the conclusion, $25K. Fabricated or impossibly-strong baselines, $50K. Independent adjudication panel of three senior researchers per claim, rotating across claims so no single panel dominates. Original authors get a structured response window with the same publication footing as the checker. Everything published, including disputes that don't resolve.

Total program cost for a year, including adjudication, infrastructure, and compute reimbursement: roughly $3-5M. That is small relative to one frontier training run and roughly one year of a small academic lab.

The pilot is designed to fail in several ways, each of which would tell us something useful.

If almost no errors get surfaced, the field is in better shape than the irreproducibility discourse suggests. That would be a strong empirical result, and a few million dollars is a cheap way to find out.

If many errors get surfaced but adjudication breaks down -- checkers and authors can't agree on what counts as a flaw -- we will have learned that ML doesn't have shared standards for what an experimental claim means. That is a more important finding than any individual paper's correctness, and it tells us where the next intervention should go (methodological standards, not error detection).

If errors get surfaced and authors retaliate against checkers in ways the program can't shield them from, we will have learned that the cultural problem is deeper than the incentive problem, and that legal or institutional protections for adversarial science need to come before any bounty program can scale.

If it works, we have a template.

There are failure modes that aren't informative and that the design has to handle from the start. Frivolous claims gaming the bounty pool. Coordinated attacks on individual researchers. Selection bias toward papers with the most checkable artifacts, which would create a perverse incentive against open science. Most of the design work is in the adjudication procedure and the protections for checkers and authors. The bounty mechanism itself is the easy part.

## Why now

The conditions that make this tractable did not exist three years ago.

The labor cost of careful checking has dropped because AI assistants do the routine parts. A few million dollars buys meaningfully more error-detection work than the same pool would have bought in 2022.

The downstream cost of errors has gone up. ML papers no longer sit quietly in a literature. They get deployed, cited in procurement, and built into safety evaluations. A contaminated benchmark misleads a lot more than a follow-up paper now.

There is also a generation of postdocs, recent PhDs, and careful engineers who would do this work if it paid and conferred status. The talent exists, the artifacts exist, the tooling exists. The institution does not.

## What a pilot would actually inform

I want to be clear about the modest claim. A bounty program will not on its own fix ML's reproducibility problem. It is the cheapest informative experiment available for learning what is actually wrong with the literature. The field has spent a decade arguing about this from circumstantial evidence: survey papers, anecdotes, individual heroic replications. A bounty pilot would replace that argument with measurement.

Adjacent fields that have run programs like this come out with sharper pictures of their own pathologies than they had going in. ML is in a better position to learn from a pilot than those fields were, because the artifacts are more checkable and the tooling is better. We are leaving an unusual opportunity on the table.

Someone should run this. It does not need to be me, and it probably should not live inside an existing institution: a standing program is easier to set up as a small independent organization than as a project inside a university, for the same reasons replication doesn't fit grant cycles. What it needs is initial funding, a group of senior researchers willing to adjudicate, and a year. After that, the data will tell us whether to keep going.
