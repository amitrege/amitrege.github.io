---
layout: post
title:  "Learning to represent programs as graphs - Allamanis et al Notes"
date:   2019-01-29 3:11:06 -0700
categories: notes
---

https://arxiv.org/pdf/1711.00740.pdf

### The model : Gated Graph Neural Nets (Yujia li et al)
Each node is represented as a vector of features (important properties of the node). We also associate a state vector with each node. This state vector is usually initialized with the feature vector ( and sometimes padded with zeros)
Each node can pass a message to its neighbors as a function of its current state vector (usually linear function). This function is different for different types of edges so if we have k types of edges in the graph we will have k functions for each node.
Each node aggregates these messages received form neighbors using a function g. Then, we feed this aggregated message and the state vector to a GRU (Cho et al) to obtain the state vector at the next time step. We do this for a fixed number of steps and take the final state vector as our node representation.

### Programs as Graphs
Construct AST and label terminals with the names of the variables they represent. Add edges among the children of a node showing the order in which they appear in a program (ex: node.left has edges ‘node’ -> ‘.’ -> ‘left’). These edges are of type NextToken.
Additionally, we add LastUse edges (pointing to where a variable v in the statement was last used), LastWrite edges (pointing to the last write of v) and computedFrom (pointing to nodes used in expr if the current node is of the form v = expr).
LastLexicalUse edges connect the last occurrences of v (there may be multiple if there is conditional just before which uses v in both branches), ReturnTo edges connect return statement to the function declaration, FormalArgName edges connect arguments to the formal parameter, GuardedBy edges connect a variable in the true conditional branch to the guard (only if it is used in the guard) (ex: if (x>y) {….x…..}) and similarly GuardedByNegation connects a variable in the false branch to the guard if it is used in the guard.
We also add backward edges for each of the above thereby doubling the number and types of edges.

### Adding Type Info
We want to learn an embedding for type info for each variable. First, we map each type to its super type and then to get type information for a given variable, we take the element wise maximum of all types in the super type implementing v. The embeddings for  each type are learnable.

### Initial Node
Split each node name by camelCase or pascal_case. Average all the embeddings of the subtokens and finally concatenate with the type embedding learned above.

### VarNaming Task
Replace each occurrence of the variable in question with a <slot> token. Run GGNN for a certain number of iterations and then average all state vectors learned for each <slot>. Give this as input to a GRU and predict a sequence of tokens which are combined into one (using camelCase). Training done using maximum likelihood.

### VarMisuse Task
Compute a context and usage embedding for a slot t by speculatively placing each variable at the slot and adding the corresponding edges. Run the GGNN for a fixed number of iterations and pick the node which maximizes this embedding.
<!--stackedit_data:
eyJoaXN0b3J5IjpbMTIwMDY4MzM4Nl19
-->