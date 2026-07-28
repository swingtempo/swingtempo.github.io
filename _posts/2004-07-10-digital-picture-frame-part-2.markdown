---
layout: post
title:  "Digital Picture Frame Part 2"
date:   2004-07-10 00:00:00 -0700
categories: development embedded mobile devices
permalink: /digital-picture-frame-part-2
---

<div style="background-color: #f0f0f0; border-left: 4px solid #888; padding: 12px 16px; margin-bottom: 24px; font-style: italic; color: #555;">
  <b>2026-07-27</b> From the archives — this is an old blog post I wrote when I worked on Windows Mobile.
  (The exact date of publication is not accurate)
</div>

# Digital Picture Frame (Part 2)!

(go read [Part 1](/digital-picture-frame-part-1) if you haven't)

Hardware time! I opened up the laptop and folded the LCD back behind the keyboard. When I took apart the Thinkpad, it took me about two hours end-to-end. Later on, I took apart my Dell in a similar amount of time. So it's not that hard, ***you can do it too!*** Thankfully, I was able to read the [Junktop Revival Wiki](http://channel9.msdn.com/wiki/default.aspx/Channel9.JunktopRevival) so that gave me tips on where I should concentrate my efforts, what to take apart, what not to, etc etc :).

# Tools

* Big flathead screwdriver (for use as a lever to open up the laptop case)
* Small flathead screwdriver (for use as a lever to open up the laptop case)
* Small Phillips screwdriver (to unscrew the laptop screws)

Here's an image of the tools I used, so you can see how their relative sizes (they are resting on top of the laptop LCD, partially dismantled :) ).

![Tools]({{ "/assets/images/digital-picture-frame/DSCN0359 (Small).JPG" | relative_url }})

# The Laptop

Let's start with the laptop:

![Laptop before]({{ "/assets/images/digital-picture-frame/DSCN0347 (Small).JPG" | relative_url }})

Nice and pristine, right? Not for long!

![Laptop prying]({{ "/assets/images/digital-picture-frame/DSCN0348 (Small).JPG" | relative_url }})

First I used the flat head screwdriver to pry apart the top panel. I later realized that I really didn't have to do it (but that's not the point). After removing the top panel and seeing that I actually *didn't have to*, I started getting more directed in my dismantling. So I looked at the hinge, where the LCD connected to the rest of the laptop. (Oh yeah, somewhere along the way, I removed the hard drive, too)

Hmm... I took the flathead screwdriver and pried open that little covering. I did that to both sides, and had access to the cables going to the LCD.

![LCD cables]({{ "/assets/images/digital-picture-frame/DSCN0355 (Small).JPG" | relative_url }})

From there, I could easily fold back the LCD and have a pseudo picture frame. (after some of the panels on the keyboard itself).

![LCD folded back]({{ "/assets/images/digital-picture-frame/DSCN0364 (Small).JPG" | relative_url }})

Notice the pen drive at the bottom left of the image... I know, the image is a little dark. That's where the images are stored.

These are all the pieces I extracted from the laptop to get it to that state, and in less than two hours:

![Extracted parts]({{ "/assets/images/digital-picture-frame/DSCN0368 (Small).JPG" | relative_url }})

I was amazed by how simple it was. But anyway, I wanted to do MORE. The LCD covering was just not ideal to put on a picture frame, I needed to get rid of the housing. So with my flat head screwdriver, I went and pried apart the LCD front:

![LCD front removed]({{ "/assets/images/digital-picture-frame/DSCN0378 (Small).JPG" | relative_url }})

I also had to shimmy and slide the LCD to unstick it from the back, and so I was finally left with just this:

![LCD only]({{ "/assets/images/digital-picture-frame/DSCN0379 (Small).JPG" | relative_url }})

Here are the two pieces of the LCD that I removed:

![LCD pieces]({{ "/assets/images/digital-picture-frame/DSCN0401.JPG" | relative_url }})

Notice how I also extracted the speakers since they were attached to the LCD. Good thing I wasn't planning on using them (although I would have if I had the CE drivers for them).

# The Frame

The frame was, for me, the ***hardest*** part of this whole project. I discovered that I don't know how to cut 90 degree angles, even with a T-square! I didn't take many photos while it was getting constructed, but I essentially bought:

* Foamboard
* Black construction paper for matting
* A shadowbox to fit my laptop

I was able to cut the foamboard to fit into the shadowbox, and cut an opening for the laptop and LCD. The foamboard was about the same thickness as the LCD, so it made a nice wedge... I could fit the LCD in there, and stick the rest of the laptop to it (via duct tape or two-sided tape). Here is the result, without the matting:

![Frame without matting]({{ "/assets/images/digital-picture-frame/DSCN0383 (Small).JPG" | relative_url }})

The next step was to cut the matting for the frame, at a minimum to hide all the circuitry and cut marks in the foamboard. I had my exacto knife and black stiff construction paper all ready, and I cut a few matting. However, each one had a problem... it didn't fit perfectly, or it wasn't at a 90 degree angle, or some other issue, so I repeatedly had to open up the frame, take out the laptop, take out the matting, and redo it.

At this point, there's a twist to my tale...

After one of the times I removed the matting... ARGH! I dropped the laptop!!!!!!!!!!!

Fortunately, the laptop was OK. Unfortunately, the backlight of the laptop broke! I was at first extremely despondent about this, but then decided to pull myself up frmo my bootstraps again and dismantle the Dell!!!

I didn't take pictures of my Dell dismantling because I was in a hurry to get it done. The Dell was different in that I needed to unscrew some screws to completely detach the LCD from the laptop. In the future, I'd prefer Thinkpads, but Dells are still doable :).

I just ordered a new backlight for my Thinkpad on Ebay, so I'll fix it up in the future.

In the meantime, I re-cut the foamboard and re-cut the matting. I wasn't as much of a stickler for perfection as I was with the Thinkpad, since I didn't want to chance dropping something again! As the old adage goes, "Perfection is the enemy of the good." :)

Here's my digital picture frame, with the Dell Inspiron inside it, and with a bigger matting, displaying images at 1024x768x16! :)

![Finished frame]({{ "/assets/images/digital-picture-frame/DSCN0398.JPG" | relative_url }})

# Future Directions

There are a number of things I can do to enhance this picture frame.

1. Get a 2.5" IDE to CF adapter, and use it as a hard drive to boot the image from (find one [here](http://www.parvus.com/datasheet/ds.asp?primarypart=LIT-0132X-01)). This way I can get rid of the CD-ROM and have no moving parts!

2. Bluetooth support. Windows CE detected a Belkin USB Bluetooth Adapter I tried, so I know it will work with Bluetooth. I may upgrade to Windows CE 5.0 because it comes with a number of built-in profiles. I can use the BT DUN profile to connect to a LAN via a BT gateway, so i can access and control the picture frame from computers or PocketPCs from the network. I can add images, have the picture frame email images, etc. O the possibilities are endless! :)

If you have any questions, feel free to [email me](mailto:jayongg@microsoft.com) :).

Enjoy!
Jay
