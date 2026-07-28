---
layout: post
title:  "Digital Picture Frame Part 1"
date:   2004-07-09 00:00:00 -0700
categories: development embedded mobile devices
permalink: /digital-picture-frame-part-1
---

<div style="background-color: #f0f0f0; border-left: 4px solid #888; padding: 12px 16px; margin-bottom: 24px; font-style: italic; color: #555;">
  <b>2026-07-27</b> From the archives — this is an old blog post I wrote when I worked on Windows Mobile.
  (The exact date of publication is not accurate)
</div>


# Digital Picture Frame (Part 1)!

![Digital Picture Frame]({{ "/assets/images/digital-picture-frame/frameshot.jpg" | relative_url }})

I was inspired to create a digital picture frame after seeing the [Junktop Revival Wiki](http://channel9.msdn.com/wiki/default.aspx/Channel9.JunktopRevival) as well as [Mike Hall](http://blogs.msdn.com/mikehall)'s [project](http://channel9.msdn.com/ShowPost.aspx?PostID=9947). I wanted to reuse one of my old laptops, a Thinkpad, but the issue was that I didn't want a hard drive - a hard drive would just be too noisy for me. So out went XP, in came Windows CE.

Here are the features of the laptop digital picture frame:

* No hard drive
* Boots off a CD-ROM
* Recognizes and reads random pictures off of a USB Mass Storage device, fired by a timer. Storage device is hot-swappable.
* no keyboard or mouse necessary for basic operation
* two keyboard keys can increase or decrease the image display timer interval
* spacebar can jump to the next image
* after bootup, no more CD-ROM access is required. The whole Windows CE operating system is less than 10 megs, and fits neatly in ROM. (I can cut it down further if I looked hard enough 😊)

# The Application

The software was relatively straightforward. Upon startup, it maximizes to take up the full screen and gives it a black background. It polls every five seconds for files. The frequent polling is necessary because the USB storage device isn't ready immediately after the OS boots up. Anyway, after the first time it reads the files, the timer interval goes to 60 seconds, which is adjustible by the keyboard.

For each tick of the timer, the program gets a list of the files in "\\Hard Disk" (that's what Windows CE recognizes the USB Mass Storage device as) and displays a random image. That's pretty much it. If there's an error reading a file, the program simply just leaves the existing image up and waits for the next tick.

The image stretch logic is pretty simple - the app gets the dimensions from the Bitmap object, and stretches the picturebox that the Bitmap is displayed in to such that the proportions are maintained while maximizing the real estate of the screen.

# The Operating System

I took Windows CE's Platform Builder 4.2, and generated a custom Windows CE OS. I based it off the Mobile Handheld design, but took out a bunch of things, and added .Net CF and USB support. Ideally, I wanted PCMCIA support in my device so then I could plug in a WiFi card, but I couldn't find a driver for the PCMCIA chipset, a TI1225 (note, this wasn't my Thinkpad I was looking at, this was in my Dell Inspiron. I flipped back and forth between the two laptops for this project 😊).

Windows CE 4.2 and 5.0 both came with drivers for the TI1250 chipset, but not the 1225. I went online and found a vendor who offered a TI1225 driver, but they didn't seem to be interested in giving me a copy 😊 so I decided to forego it. I didn't want to write a driver for this project. So, as I said, I added USB support for Mass Storage.

For the platforms, I added a CEPC and Emulator platform.

There were two custom modifications I had to make: Change the taskbar to be auto-hide and not on top, and launch my app (called "pictureframe.exe" for you creative types).

To set the taskbar state, I added these `.reg` keys to `%_PROJECTOAKROOT%\files\project.reg`:

```
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Shell]
; If your browser doesn't display it, there is an 0x01 ASCII below
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Shell\AutoHide]
 @=""
[HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Shell\OnTop]
 @=""
```

I got these reg keys by manually setting them in the emulator, and using Platform Builder's remote registry editor to see what changes in `HKLM\Software\Microsoft\Shell`.

The second task - to boot up my app, I first added this line to my `project.bib` file:

```
pictureframe.exe  pictureframe.exe  NK  S
```

to include the application in the image. Then I added these lines to `project.reg` to have the OS automatically boot up my app:

```
[HKEY_LOCAL_MACHINE\init]
; @CESYSGEN IF CE_MODULES_SHELL
        "Launch99"="pictureframe.exe"
        "Depend99"=hex:32,00
```

The first value specifies that `pictureframe.exe` is to be launched, and the second line says to wait for Launch50 (hex 32) to be executed before launching pictureframe. Launch50 is `explorer.exe` (you can find this in `shell.reg` in the release directory).

That's pretty much it. Next is the:

# CD Preparation

I took a standard CEPC boot floppy disk (there is none in the final version), and modified it so that it will mount the CD-ROM drive as drive R:, and execute:

```
loadcepc /L:800x600x16 r:\nk.bin
```

The image is `nk.bin`, and the `/L` flag is the resolution to run the OS at (the Thinkpad could only do 800x600, the Dell could do 1024x768). After I created the CEPC boot disk, I booted up Nero, selected CD-ROM (boot) as the CD type, and had designated the floppy drive to be the source of the boot image. I was surprised at how complicated this was, actually. I thought that Nero could just put a DOS boot sector on the CD, but it needs a source drive to copy it from. When you think about it, it kinda makes sense (copyrights of DOS 6.22 and all that).

In the end, I had a spanking usable Windows CE image with my software on it! (OK, it wasn't this simple, it was a very iterative process 😊).

I'll post the hardware hacking part next time. I'm trying to keep these entries short! If anyone wants more specifics on the source code (ugly) or the Windows CE project (easy), just drop me a line.
