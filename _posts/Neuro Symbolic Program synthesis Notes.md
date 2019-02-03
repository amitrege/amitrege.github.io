---
layout: post
title:  "NeuroSymbolic Program Synthesis - Parisotto et al Notes"
date:   2019-01-29 3:11:06 -0700
categories: notes
---

https://arxiv.org/pdf/1611.01855.pdf

We want to avoid having search heuristics in program synthesis . Use DSL  to generate programs which are correct by definition. 
Partial Program trees (PPT)  ->  leaf may or may not be terminals, complete program tree has all leaves as terminals

### R3NN 

M dimensional vector for each start symbol
M dimensional vector for each production rule
A deep net f for each production rule r which takes as input a concatenation of representations of RHS symbols and produces an M dimensional vector
A deep net g for each rule r which takes as input a M dim vector and produces a concatenation of RHS symbols

To compute probability over the next expansion, we  start building vectors from leaves to root  using the deep net f. Once at the root, we go from the root again to leaves. Why? To encode a notion of position in the representation. In the first pass, two leaves with the same symbol would have the same vector, but when we come back they won’t.

Score of an expansion is the product of the leaf representation and M dimensional vector for the rule. The probability is the softmax over all possible combinations of leaf and production rule.
<!--stackedit_data:
eyJoaXN0b3J5IjpbODI3OTU0OTI2XX0=
-->