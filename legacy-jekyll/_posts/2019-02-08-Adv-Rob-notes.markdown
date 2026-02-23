---
layout: post
title:  "Advanced Robotics - Spring 2019 Notes"
date:   2019-02-08 3:11:06 -0700
categories: notes
mathjax: true
---

8/2/2019
### Linear Least Squares

k datapoints : ($x_1$,$y_1$) $\cdots$ ($x_k$, $y_k$) s.t $x\in R^n$and $y\in R^n$

#### Model: (e.g a curve)
We want to predict y = f(x,$\beta$) where $\beta \in R^l$
note: l<k (therefore, this is a overdetermined problem)

The goal of the least squares problem is to find $\beta$ s.t $$ S = \sum\limits_{i = 1}^{k} r_i^2$$ is minimized where $r_i = y_i - f(x_i, \beta)$ (here f is said to be a generative model) 

Example : $x$ could be IR sensor voltage, $\beta$ could be parameters for response and y is the distance from the object.

Linear in this section describes the function $y = f(x, \beta)$ being a linear combination of  basis functions i.e $$ f(x,\beta) = \sum\limits_{n=1}^{k} \beta_k \phi_k(x)$$
here $\phi$ is not necessarily linear.

Example: let $$ y = f(x, \beta) = \beta _0 + \beta_1 sin x_0 + \beta_2 cos x_1 $$ and $x\in R^2$ and $y \in R^1$
then for each  point, $$ y^* = f(x^*, \beta) = \beta_0 + \beta_1 sin x_0^* + \beta_2 cos x_1^*$$
We put these equations for each point in a matrix ($A\beta = y$), but since the problem is overdetermined so solving for an unique solution is not possible (matrix A is not square).

What do we do?

$$ A^T(A\beta) = A^Ty$$
$$ (A^TA)\beta = A^Ty$$
$A^TA$ is a symmetric matrix which is also full row rank (because there are no linearly dependent rows in A). Since it is square, it is also full column rank. Therefore, it is full rank and is invertible.
$$ \beta = (A^TA)^{-1}A^Ty$$ 

### Non Linear Least squares
All of the above only works if $y = \sum\beta\phi(x)$. However, more generally, we want to minimize:
$$ S = \sum\limits r_i^2$$ where $r_i = y_i = f(x_i,\beta)$ and f has a non linear dependence on $\beta$.
note: The minimum of S occurs when $$\frac{\partial S}{\partial \beta_j} = 2 \sum\limits_i r_i \frac{\partial r_i}{\partial \beta_j} = 0        \ \ \ \  (\ per\ parameter)$$

2 problems : 
1. The above partial may not have a closed form derivative 
2. It might depend on $\beta$ itself.

The process through which the value of $\beta$ given values of x s.t. this function is minimized is a root finding algorithm.
Approach : guess at $\beta$ parameters values and iteratively optimize.

$$ \beta^{k+1}_j = \beta_j^{k} + \Delta\beta_j$$

Possible algorithms: Gauss-Newton, Gradient Descent, Levenberg-Marquordt etc (convex optimization methods)