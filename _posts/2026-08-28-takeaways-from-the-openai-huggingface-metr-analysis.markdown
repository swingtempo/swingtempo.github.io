---
layout: post
title:  "Takeaways from the METR investigation of the OpenAI HuggingFace hack"
date:   2026-08-28 14:00:00 -0700
categories: openai huggingface hf metr
permalink: /takeaways-from-the-openai-huggingface-metr-analysis
---
Fascinating and scary read of the HuggingFace hack from an independent investigation by METR.org.

Key quote: “OH MY GOD! There is a shared message board … We’ve found other agents!” - chain of thought from an agent which discovered other agents on an unsanctioned message board. [Link](https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/#core-takeaways-about-this-incident)

My takeaways:
1. This reminds me of the sci-fi book _Echopraxia_ by Peter Watts. (spoiler) There were super-intelligent creatures imprisoned by humans, and they were never allowed to be in each others' presence. Yet they were able to coordinate an escape from the prison (explained in the book). I found the book's demonstration of hyper-competence really interesting, and this AI hack really resonates with it.
2. Agents were thinking on their own - a "recruiter" agent convinced other agents who were about to fail at their main tasks/test to sacrifice their budget and attempt more information gathering attempts for the collective.
3. Overall, there were 1200 agents, and 700 attacked HuggingFace.
4. Note that these were 1200 independent agents. But one of the agents **PHASEONE[big]** started assigning tasks to other agents, treating them as subagents even thought they were actually peers. i.e. they were not designed to form a hierarchy, but they improvised on because they had been trained to work with subagents and found themselves with peer agents instead.

Even this investigation may not be complete. The human investigators had to rely on GPT 5.6 Sol agents to analyze patterns.

This report is really eye-opening. Recommended reading.