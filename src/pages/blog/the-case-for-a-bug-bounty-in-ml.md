---
layout: ../../layouts/MainLayout.astro
title: "The case for a bug bounty in ML | Amit Kiran Rege"
description: "A proposal for paying careful, adversarial checks of machine learning papers."
pageClass: blog-page
---

<p class="meta">Essay</p>

# The case for a bug bounty in ML

When I read an ML paper closely enough to actually try and extend it, I find something wrong about a third of the time. I don't mean fraud (that's pretty rare in my experience, and not really what I'm worried about anyway). I mean things like a hyperparameter sweep that wasn't fully reported, or a baseline that was tuned less carefully than the proposed method, or quiet contamination in the benchmark, or a result that just doesn't survive a different seed. Some of these things matter for the central claim of the paper and some of them really don't, but in either case almost none of them ever get corrected.

The reason isn't very mysterious. The people who tend to notice these errors are usually graduate students extending the paper, or engineers trying to deploy the method, or just careful readers with time on their hands. None of them really have anywhere to send what they've found, and (more importantly) none of them are getting paid to do the additional work it would take to turn a private suspicion into a public correction. So the error stays where it was; the paper keeps getting cited; and a few months later somebody else is building on top of it without knowing.

I think this is mostly a structural problem rather than a cultural one, and I think ML happens to be in a pretty unusual position to test a structural fix.

## Why peer review and replication aren't catching these

Peer review has scaled past what individual reviewers can really do. NeurIPS 2024 received over 17,000 submissions; a reviewer who genuinely wanted to rerun a paper's experiments would have something like three weeks for it, on top of a day job, for free. That isn't going to happen. So they read the paper, sanity-check it against their priors, and submit a score. This was always sort of the case — but the gap between what we ask reviewers to do and what's actually possible is much wider now than it used to be.

Replication has stopped working for a different reason. A serious check on an expensive paper costs thousands of dollars in compute and weeks of senior engineering time, and the reward for doing it carefully is essentially zero — there's nowhere obvious to publish a replication, grant cycles aren't really set up to fund this kind of work, and no tenure committee I know of will give you credit for it. So mostly it doesn't happen. (I have specific examples I won't name here.)

It's worth comparing this to software security, which had a structurally similar problem in the 90s. Vendors couldn't find every vulnerability in their own products, and users who did find vulnerabilities had no real incentive to write them up carefully. Bug bounty programs eventually changed the equilibrium by making "find a flaw and document it well" into a paid activity. Two decades on, more or less every serious software product has a bounty program, and the security posture of the industry is in a pretty different place than it was when this started.

Science has mostly not done this. The exception worth naming is ERROR (error.reviews), which launched in 2024 and pays specialists to check highly-cited psychology papers. I think ERROR is a great project, but it's also pretty deliberately designed for psychology — authors opt in to being checked, investigators are picked from a small pool of trusted reviewers, and the artifacts under review tend to be textual and statistical. That makes sense for psychology, because that's how psychology papers are mostly constructed. ML papers are constructed quite differently, and most of why I think a bounty model is worth trying here comes down to that difference.

## What's specific about ML

A few things are true of ML that aren't really true of most other quantitative sciences, and I think together they make a bounty workable here in a way it probably isn't elsewhere.

For one thing, ML papers basically come with downloadable artifacts attached. Most of the time the code's on GitHub somewhere, the weights are on HuggingFace, and the benchmark is just public. If you want to check a claim, you don't really need permission from the authors, or lab access, or biological samples, or institutional review — basically the entire surface of the claim is sitting on a server somewhere. I don't know of another quantitative field where this is true at scale.

A lot of the errors are also mechanically checkable in a way I find satisfying. If you want to know whether the test set was in the pretraining corpus, you can substring-match against indexed training data. If you want to know whether a baseline got the same compute budget as the proposed method, you can re-run things with matched compute. Whether the headline number actually survives across seeds is maybe five GPU-days of work, give or take. These mostly aren't questions of interpretation — they have answers, and the answers are reproducible. (This isn't true in every field. In some areas of biology, "did this experiment replicate" is itself a contested question.)

The third thing — and honestly the one that pushed me to actually write this up — is that AI assistants have made the routine parts of checking dramatically cheaper than they were even two years ago. A research engineer paired with a strong assistant can read a paper, locate the artifacts, identify likely failure modes, draft a check protocol, and run it in a matter of days rather than months. The cost curve for thorough checking has come down sharply, but the credit assignment system in academia really hasn't moved much at all.

Together these things mean that a bounty program in ML could do a couple of things that ERROR's design can't. For one, the checking can be adversarial, without any opt-in required from authors, which I think changes the dynamics quite a bit. The pool of checkers can also be much larger than a small invited panel of trusted reviewers, since AI tooling raises the floor for what a careful non-specialist can actually verify. And a lot of the work can be mechanical rather than judgment-based, which is the part that matters most to me — mechanical checks are the kind of thing a field can absorb into its norms over time, where one-off heroic replications generally aren't.

## The pilot

So here's roughly what I would actually run.

Pick around 100 ML papers from 2022 through 2024, weighted toward high citation count and downstream production use. Set up a bounty board with rough tiers for the kinds of issues you'd want surfaced. Training-data contamination at the low end (something like $5K). Unreported hyperparameter selection that flips the headline result, more like $10K. A failed replication of the central claim under a faithful protocol, around $15K. Data leakage that invalidates the conclusion, $25K or so. Fabricated or impossibly-strong baselines at the top, somewhere in the $50K range. The exact numbers don't matter that much; what matters is that the gradient roughly tracks how badly each kind of issue would mislead someone trying to build on the work.

Adjudication would happen via an independent panel of three senior researchers per claim, rotating across claims so that no single panel ends up dominating things. Original authors should get a structured response window with the same publication footing as the checker, and everything should be published — including the disputes that don't ever cleanly resolve. (The unresolved cases are arguably the most interesting data the program would generate.)

Total program cost for a year, including adjudication, infrastructure, and compute reimbursement, would probably land somewhere in the $3-5M range. That's small relative to one frontier training run, and roughly one year of a small academic lab.

The pilot should be designed so that it can fail in several different ways without the program itself being a waste. The most boring outcome would be that almost no errors get surfaced. In that case the field is actually in better shape than the irreproducibility discourse would suggest, and a few million dollars is a pretty cheap way to find that out. A more interesting outcome is that lots of errors do get surfaced, but the adjudication side breaks down — checkers and authors can't agree on what even counts as a flaw. That would probably tell us ML doesn't really have shared standards for what an experimental claim means, which is arguably a more important finding than any one paper's correctness. (And it would suggest the next intervention should be about methodological standards, not error detection.)

A third possibility, and the one I worry about most, is that errors get surfaced and authors retaliate against the checkers in ways the program can't really shield them from. If that happens, we've learned that the cultural piece of this is deeper than the incentive piece, and that any future bounty program would need legal or institutional protections built in from the start. And if none of those things happen — if it just works — then we have a template, and a lot less hand-waving in this discourse.

Of course there are also failure modes that aren't very informative, and the design has to handle those from the start: frivolous claims gaming the bounty pool, coordinated attacks on individual researchers, a selection bias toward papers with the most checkable artifacts (which would create a perverse incentive against open science). Most of the actual design work, in my experience thinking about this, is in the adjudication procedure and the protections for both checkers and authors. The bounty mechanism itself is honestly the easy part.

## Why now

The conditions that make this tractable didn't really exist three years ago.

The labor cost of careful checking has come down a lot, because AI assistants do most of the routine parts. A few million dollars buys quite a bit more error-detection work today than the same pool would have bought in 2022. The downstream cost of errors has also gone up over that period: ML papers don't really just sit in a literature any more, they end up deployed into production systems, or cited in procurement decisions, or built into things like safety evaluations. A contaminated benchmark misleads a lot more downstream than a follow-up paper does.

Talent isn't really the bottleneck here either. There are plenty of postdocs, recent PhDs, and careful engineers who I'm pretty sure would do this work if it actually paid them and conferred some status. The artifacts and the tooling are mostly there. What isn't there yet is anyone running an institution to coordinate it.

## What a pilot would actually inform

I want to be pretty clear about the modest version of the claim here. A bounty program isn't going to fix ML's reproducibility problem on its own. What it would be is the cheapest informative experiment available for figuring out what's actually wrong with the literature. The field has spent the better part of a decade arguing about this from circumstantial evidence (survey papers, anecdotes, individual heroic replications), and a bounty pilot would replace some of that argument with measurement.

Adjacent fields that have run programs like this tend to come out with much sharper pictures of their own pathologies than they had going in. ML is in a better position to learn from a pilot than those fields were, mostly because the artifacts are easier to check and the tooling has gotten meaningfully better. I think it's a strange opportunity to be sitting on for as long as we have.

Someone should run this. It probably doesn't have to be me, and it probably shouldn't live inside an existing institution either — a standing program is much easier to set up as a small independent organization than as a project inside a university (for basically the same reasons that replication doesn't fit inside normal grant cycles). What it needs is some initial funding, a small group of senior researchers willing to adjudicate, and a year. After that, the data will tell us whether to keep going.
