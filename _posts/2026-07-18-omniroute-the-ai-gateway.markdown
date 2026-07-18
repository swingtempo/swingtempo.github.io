---
layout: post
title:  "OmniRoute, the AI Gateway"
date:   2026-07-18 02:12:01 -0700
categories: ai agents free omniroute
permalink: /omniroute-the-ai-gateway
---
# Free cloud coding agent?

One of the things I miss from Microsoft is the access to Github Copilot CLI with nigh-unlimited token usage. I looked for cost-effective ways for LLM access that can augment any paid or local LLMs I haveLLMs. That's how I discovered an Open Source project, [OmniRoute](https://omniroute.online) ([GitHub](https://github.com/diegosouzapw/OmniRoute)).

# So, what's OmniRoute?
![Server routing LLM messages to different LLMs]({{ "/assets/images/omniroute-for-coding-llms/omniroute-routing-llm-for-developer.png" | relative_url }})

With OmniRoute, you can leverage multiple LLM providers with your favorite CLI or harness (like Claude Code, Codex, or Continue.dev). This is what happens:

* OmniRoute exposes a `localhost:20128` endpoint with a dashboard so you can configure which providers to leverage, like OpenAI, Claude, or Chipotle (not kidding). You specify the priority of the LLMs - you can mix paid and free providers. There are 236 available as of this date.
* `localhost` also serves an OpenAI-compatible API that a harness can hit.
* Configure your favorite harness to route requests to your `localhost`. I was chagrined to see that GitHub Copilot (CLI and in VSCode) do not allow you to switch endpoints that I could see. 
* Each request sends up a model to use. Instead of using a well-known model name (e.g. `gpt-5.6-sol`), the client sends up a "model" (aka "combo") that only OmniRoute knows (like `auto/best-coding`). Use one that's [built-in](https://github.com/diegosouzapw/OmniRoute/blob/735e2d0783bdecc1aae5cea158d8e8192eeff31a/src/domain/assessment/types.ts#L231) to OmniRoute, or you can add your own.
  * OmniRoute suggests starting with the `auto` combo.
  * OmniRoute will try all providers associated with a combo for your prompts, with smart caching of what works.
  * You can provide API keys for paid models if you want to use them in your combo.

The beauty behind OmniRoute is this:
```
Every computer science problem can be solved by just another layer of abstraction.
 -- David Wheeler
```
As a developer working with an agent, you can choose which models you want on the fly. For your specific configuration, you can pick and choose from multiple paid and free models out there. This extra layer of abstraction allows OmniRoute to support:
* Smart failure modes - if you hit a 429 or timeout in the middle of a chat, you won't lose context. 
* RTK + Caveman compression to optimize your model usage.
* Not to mention, you can use the same harness/CLI, and select which backend you want to hit by switching your model/combo.
  * For example, I'm OK with using the cloud-based services for most queries, but I want to hit my local LLM to do my taxes.

And since the code is open source, you as a developer can make changes to decorate any requests to fulfill your specific needs.

# OK, how do I get it working with Codex?
One of the problems I had to work through when I first started using OmniRoute is "how do I get started"? So the below is kind of a quickstart for users. I'll start with Codex for a CLI, and Continue.dev for VSCode integration.

1. Install OmniRoute with `npm install -g omniroute`.
2. Run `omniroute`, this will open up the dashboard. Default password is `CHANGEME`.
3. From the left rail, click on "[API Keys](http://localhost:20128/dashboard/api-manager)" and create a new API key. Record it separately since it will not be visible again.
4. In your operating system, set the environment variable persistently. e.g in Windows:
```
setx OMNIROUTE_API_KEY <APIKEY>
```
5. Now let's launch codex preconfigured by OmniRoute. Do:
```
omniroute launch-codex --model auto
```
You can do this manually via `codex` and command line parameters to specify endpoint and api key, but with the above command, OmniRoute takes care of everything for you.

6. (optional) You can see the details of the request by clicking [Monitoring/Logs](http://localhost:20128/dashboard/logs) from the left rail:
![Screenshot from dashboard]({{ "/assets/images/omniroute-for-coding-llms/successful-log-ux.png" | relative_url }})
Clicking through shows you more details. As a side note, you can see what info gets sent up from your favorite harness. Helpful from an educational perspective.

# But I like IDEs!
I couldn't figure out a way to get VSCode's native GitHub chat to point to a different endpoint. I ended up downloading the [Continue.dev](https://continue.dev) extension and used that instead. OmniRoute doesn't auto-configure this for you, so it's a little bit involved.

First, go through steps 1-3 above. Then:
4. In `%USERPROFILE%\.continue\config.yaml` or `~/.continue/config.yaml`, find the `models` data structure. Add the following lines to add the `auto` model config, and replace <APIKEY> with the api key you generated above.
```
  - name: OmniRoute - Auto
    provider: openai
    model: auto
    apiBase: http://localhost:20128/v1
    apiKey: <APIKEY>
```
5. In the Continue.dev chat pane, select `OmniRoute - Auto` and you will make requests to OmniRoute.
6. (Optional) Exercise for the reader - have your IDE update the `config.yaml` with all the other prebuilt configurations 😊

![Screenshot from Continue.dev]({{ "/assets/images/omniroute-for-coding-llms/continue-dev-screenshot.png" | relative_url }})

# Tradeoffs
Like everything in engineering, there are tradeoffs. When you're working with free models, you need to deal with higher latency and availability. For me, I'm not currently working on huge code bases (like Microsoft Teams or Loop), so the tradeoffs swing the right way for me.

# Closing thoughts
That should get you started! Hopefully this gives you enough info so you can pattern match to other harnesses. OmniRoute is Open Source, and they welcome contributions if you find any issues or if you have any suggestions!