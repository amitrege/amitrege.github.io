# Can code help us see?

10 slides. 42 manual reveals. Target timing: 4:18.

These are the notes used in the presentation. Pause for the predictions and the reveals.

## Headlines

**0:00–0:02**

Everyone’s talking about recursive self-improvement.

**0:02–0:04**

Reveal the first headline.

**0:04–0:06**

Reveal the next headline.

**0:06–0:08**

Reveal the next headline.

**0:08–0:10**

What does it mean?

## Self-improvement

**0:10–0:15**

System improves itself.

**0:15–0:20**

System improves at improving.

## LLM → agent → harness

**0:20–0:24**

This is the language model.

**0:24–0:29**

Put it in a loop. It can act, observe, and try again.

**0:29–0:35**

The surrounding software is the harness. Instructions, memory, tools, and the loop.

**0:35–0:40**

Now let the system review and rewrite its harness.

## Improving the harness

**0:40–0:43**

This is where we can work with the models we have.

**0:43–0:47**

Almost, and today. There are other routes, including changing the model itself.

**0:47–0:51**

The question is: how do we improve the harness?

## The feedback

**0:51–0:57**

Code and math give us useful checks. Tests. Exact answers. Proof checkers.

**0:57–1:03**

But “describe this image” is fuzzier. What makes one description better? The feedback is harder.

## The core insight

**1:03–1:08**

Suppose models become superhuman at code and math.

**1:08–1:14**

Can that help with tasks we can’t easily check?

**1:14–1:22**

Ask them to build tools or prove theorems on the fly. Parts of a fuzzy problem may still be measurable or provable.

## Why vision?

**1:22–1:26**

A lot of self-improvement work starts with text.

**1:26–1:31**

What does it look like in vision? Let’s look at two experiments.

## Motion

**1:31–1:38**

One way to get feedback in vision is to hide something, predict it, then check the answer.

**1:38–1:42**

Here is the covered clip. We supply the mechanism family and physics. It measures the geometry.

**1:42–1:49**

We can use that feedback to train a network from scratch. But these models know a ton of info implicitly.

**1:49–1:52**

We want to express that as code.

**1:52–1:58**

Can we use this feedback to write tools which help them solve this task?

**1:58–2:05**

The original program misplaces the hidden point. Its predicted motion is wrong.

**2:05–2:16**

It wrote code to combine visible edges across frames. Then it revised the code to compare possible shapes.

**2:16–2:24**

We kept that code. This machine was held out from improvement and selection. The prediction is much closer.

**2:24–2:36**

Now move the pin. Predict a motion it was never shown. Then reveal the answer.

**2:36–2:48**

The motion matches closely. On twenty further machines from this family, average prediction error fell about eighty-three percent.

## A photograph

**2:48–2:56**

Does this work on natural images? Here is a real room. How high was the camera?

**2:56–3:05**

We supply an existing depth model. The first measuring code handles camera tilt poorly. It says fifty-seven centimetres.

**3:05–3:15**

It writes a better procedure. Turn depth into points in space. Fit the floor. Check whether that fit is plausible.

**3:15–3:22**

Measure the perpendicular distance to the floor. The new answer is one point five six metres.

**3:22–3:31**

The recorded room geometry gives us one point five one. The program did not get to see that reference.

**3:31–3:41**

Another room. The same procedure. Eighty-seven centimetres; reference, eighty-six. The project also measures distances, sizes, and which object is closer.

## Takeaways

**3:41–3:48**

For your own work: how can I break my task into parts the model can check?

**3:48–3:53**

Let it write the tools. Let the procedure change.

**3:53–3:59**

Keep the check independent. The program cannot redefine what counts as correct.

**3:59–4:05**

Test on new examples. Keep improvements that work beyond the failures it was shown.

**4:05–4:18**

We have shown retained tool improvements. We have not shown recursive self-improvement yet. Can better tools help build the next better version?

## Saved tools

- [Motion measuring code](./assets/code/motion.py)
- [Photo measuring code](./assets/code/photo.py)
- [Motion provenance](./assets/mechanic/provenance.json)
- [Photo measurements and provenance](./assets/natural/data.json)

The animations replay completed experiments. The motion evidence view illustrates actual observed pixels aligned using the saved inference. The floor view comes from the generated estimator applied to cached predicted depth. These are explanatory replays, not recordings of the coding model’s internal reasoning.

## Headline sources

- [Axios: Models that improve on their own are AI’s next big thing](https://www.axios.com/2026/01/27/models-improve-ai)
- [IEEE Spectrum: AI Is Starting to Build Better AI](https://spectrum.ieee.org/recursive-self-improvement)
- [Anthropic Institute: When AI builds itself](https://www.anthropic.com/institute/recursive-self-improvement)
- [WIRED: I Built a Self-Improving AI, and So Can You](https://www.wired.com/story/frontier-labs-arent-the-only-ones-pursuing-self-improving-ai/)

These headlines provide context for the research interest. They do not establish that a closed recursive self-improvement loop has been demonstrated.
