---
layout: post
title:  "Thinking Functionally in Haskell Notes 1"
date:   2019-01-29 3:11:06 -0700
categories: notes
---

**Notes from the book [Thinking Funtionally in Haskell](https://www.amazon.com/Thinking-Functionally-Haskell-Richard-Bird/dp/1107452643)**

Haskell is a functional language. Functional Programming is, broadly speaking, characterized by repeated application of functions as opposed to sequential execution of commands.

### Functions and types
Haskell functions' type signatures are written as :
```haskell
sin :: Float -> Float
```

Here the `sin` function takes in a Float and returns a Float. A function is applied onto an argument as `sin x`. The space is important because in the absence of braces Haskell uses spaces to separate `sin x` from `sinx` (not a function application). In functions with more complicated arguments, it is preferable to add parentheses like so `sin (x)` to avoid ambiguity. Since function application in Haskell is left associative, `log sin x` is interpreted as `(log sin) x`. Using redundant parentheses avoids annoying bugs.

### Functional Composition
We can compose two functions, `f :: X -> Y` and `g :: Y -> Z`, to get `f.g :: X -> Z`. Note that the return type of `g` must match the argument type of `f`.

### Example : Common Words
We will write a program to find the n most frequently occurring words in a text. Now, obviously we haven't seen any Haskell syntax but we can define the type signatures of the functions required to build the program.

We want to design a function `commonWords` such that:
```haskell
commonWords :: Int -> [Char] -> [Char]
```
Here `[Char]` denotes a list of `Char`s. Note that the order of association is right to left i.e the above signature is the same as `commonWords :: Int -> ([Char] -> [Char])`. Thus, writing `commonWords n` returns a *function* which takes and returns a list of characters.

For the sake of simplicity, we take a word to mean a continuous sequence of characters without any spaces and newlines in between. Let us assume a function `words` exists such that :
```haskell
words :: [Char] -> [[Char]]
```
We can also define type synonyms for convenience
```haskell
type Text = [Char]
type Word = [Char]
```
So now we get `words :: Text -> [Word]`. Now, the words 'the' and 'The' need to be counted as the same word so we convert the entire text to lowercase. We define
```haskell
toLower :: Char -> Char
```
Next, we need to apply this function to each word in the text so we need:
```haskell
map :: (a -> b) -> [a] -> [b]
```
Here 'a' and 'b' stand for typeclasses (we do not want to constrain the function to act on only a specific type). We get:
```haskell
map toLower :: Text -> Text
```
We want to count the number of occurrences of each word in this list. Instead of counting words as they occur in the text, we sort the text alphabetically and then count the occurrences. For this, we dine the following :
```haskell
sortWords :: [Word] -> [Word]
countRuns :: [Word] -> [(Int,Word)]
```
We now sort this list of pairs according to the number of times each word occurs and then take the top n pairs:
```haskell
sortRuns :: [(Int,Word)] -> [(Int,Word)]
take :: Int -> [a] -> [a]
```
Finally, we just need to convert the list of pairs into a String (made by concatenating the strings made from each pair) which can be printed out.
```haskell
showRun :: (Int,Word) -> String
map showRun :: [(Int,Word)] -> [String]
concat :: [[a]] -> [a]
```
We now bring it all together:
```haskell
commonWords :: Int -> Text -> String
commonWords n = concat . map showRun . take n . sortRuns . countRuns . sortWords . words . map toLower
```
 Effectively, we have decomposed a problem into a sequence of functions and designed a program without even knowing any Haskell syntax. It suggests that actually figuring out the types of functions are a good starting point for writing programs in Haskell.

 
<!--stackedit_data:
eyJoaXN0b3J5IjpbLTIwMTc5NzUxODJdfQ==
-->