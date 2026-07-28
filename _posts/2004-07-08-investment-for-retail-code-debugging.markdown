---
layout: post
title:  "Investment for retail code debugging"
date:   2004-07-08 00:00:00 -0700
categories: development mobile devices
permalink: /investment-for-retail-code-debugging
---

<div style="background-color: #f0f0f0; border-left: 4px solid #888; padding: 12px 16px; margin-bottom: 24px; font-style: italic; color: #555;">
  <b>2026-07-27</b> From the archives — this is an old blog post I wrote when I worked on Windows Mobile.
  (The exact date of publication is not accurate)
</div>

Scenario:

The OEM runs hopper, our test app to verify MTTF. The app simulates a user using the device, at a much faster rate. Hopper will uncover deadlocks, Data Aborts, Prefetch Aborts, and other nasty things. When they hit an abort, the OEM may need someone from my team to look at it, in extreme cases. That often ends up being me.

Doesn't seem so hard at first, but get this:

* The OEM may contract an Independent Software Vendor (ISV) to write software for their device.
* The OEM therefore may not have access to the source code
* The ISV may not feel the urgency in fixing their own bugs (ultimately they will have to fix the code, but they would have limited time).

Dealing with retail-optimized assembly code without necessarily having all local variables readily available to you isn't really fun. Lots of calculations need to be made to access variables in memory.

Yes, I know I could:

* Use the Windows calculator. The issue is simple: screen real estate. the OEM might be running the MTTF test on 10 laptops - and if one breaks, calc.exe takes up lots of screen real estate. And it doesn't let you easily switch between hex and dec mode (you need to use the mouse :) ). This is what I actually used.
* Use the PocketPC calculator. I like using one hand, without looking at the buttons. The lack of tactile feedback is a disincentive.

So today, I saw [this](http://www.slickdeals.net/#p4910), and was totally psyched! A free scientific calculator that does hex! We'll see how handy this is next time I get called to look at some breaking code.
