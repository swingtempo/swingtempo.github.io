---
layout: post
title:  "Getting Started with MAPI"
date:   2007-03-21 00:00:00 -0700
categories: windows mobile mapi messaging
permalink: /getting-started-with-mapi
---

<div style="background-color: #f0f0f0; border-left: 4px solid #888; padding: 12px 16px; margin-bottom: 24px; font-style: italic; color: #555;">
  <b>2026-07-27</b> From the archives — this is an old blog post I wrote when I worked on Windows Mobile.
</div>

# Getting Started with MAPI

I'm Jay Ongg, and I'm a developer for Mobile Devices at Microsoft. I've been in this division for a little over four years, and as part of my job, I work with OEMs and ISVs. I'm here to write some articles on how to do some useful Messaging tasks.

Messaging is one of the areas that developers have trouble with, partly due to lack of documentation or examples. In order to deal with Messaging stores on a Windows Mobile device, developers have to work with MAPI. Unfortunately, until you get used to it, MAPI isn't an easy beast to tame.

# What Messaging Accounts do I have?

One of the common questions that we have is, "how do I enumerate all the accounts on a device?" Often, the developer is looking for a particular account by name or with a particular property. I'll enumerate the steps needed to print out the name of every account on the device.

These are the steps needed:

1. Login to MAPI
2. Obtain the table of message stores
3. Iterate through every row in the table
4. MessageBox each display name
5. Log out of MAPI

# OK, how do I do it?

Here is the function. I'll break it down below.

```cpp
#include <atlbase.h>
#include <cemapi.h>
#include <mapiutil.h>
#include <mapidefs.h>

#define CHR(x) if (FAILED(x)) { hr = x; goto Error; }

HRESULT DisplayMessageStores()
{
    HRESULT hr;
    CComPtr<IMAPITable> ptbl;
    CComPtr<IMAPISession> pSession;
    SRowSet *prowset = NULL;
    SPropValue  *pval = NULL;
    SizedSPropTagArray (1, spta) = { 1, PR_DISPLAY_NAME };
    
    // Log onto MAPI
    hr = MAPILogonEx(0, NULL, NULL, 0, static_cast<LPMAPISESSION *>(&pSession));
    CHR(hr); // CHR will goto Error if FAILED(hr)
    
    // Get the table of accounts
    hr = pSession->GetMsgStoresTable(0, &ptbl);
    CHR(hr);
    
    // set the columns of the table we will query
    hr = ptbl->SetColumns ((SPropTagArray *) &spta, 0);
    CHR(hr);
    
    while (TRUE)
    {
        // Free the previous row
        FreeProws (prowset);
        prowset = NULL;

        hr = ptbl->QueryRows (1, 0, &prowset);
        if ((hr != S_OK) || (prowset == NULL) || (prowset->cRows == 0))
        {
            break;
        }

        ASSERT (prowset->aRow[0].cValues == spta.cValues);
        pval = prowset->aRow[0].lpProps;

        ASSERT (pval[0].ulPropTag == PR_DISPLAY_NAME);

        MessageBox(NULL, pval[0].Value.lpszW, TEXT("Message Store"), MB_OK);
    }

    pSession->Logoff(0, 0, 0);

Error:
    FreeProws (prowset);
    return hr;
}
```

# The Breakdown

In this code snippet (as well as future ones), I'll tend to use ATL smart pointers and the CHR macro a lot. The CHR macro essentially checks the input parameter for an HRESULT failure, and if it fails, goto Error. For the purposes of sample code, I'll be using it rather than doing manual error checking.

## Login to MAPI

```cpp
hr = MAPILogonEx(0, NULL, NULL, 0, static_cast<LPMAPISESSION *>(&pSession));
CHR(hr); // CHR will goto Error if FAILED(hr)
```

Pretty straightforward. Log into MAPI and get a pointer to an IMAPISession.

## Obtain the table of message stores

```cpp
// Get the table of accounts
hr = pSession->GetMsgStoresTable(0, &ptbl);
CHR(hr);
```

Again, pretty straightforward.

## Iterate through every row in the table

First we initialized a struct at the beginning of the function. This struct is used to set the columns of the output from the upcoming message stores table query.

```cpp
SizedSPropTagArray (1, spta) = { 1, PR_DISPLAY_NAME };

// set the columns of the table we will query
hr = ptbl->SetColumns ((SPropTagArray *) &spta, 0);
CHR(hr);
```

`SizedSPropTagArray` is a helper macro defined in `mapidefs.h` that creates a sized array. We assign it one element, with the value `PR_DISPLAY_NAME`, which is defined in `mapitags.h`. I'll talk more about this later.

After we create the struct, we call `IMAPITable::SetColumns` to set the columns.

The actual iteration:

```cpp
while (TRUE)
{
    // Free the previous row
    FreeProws (prowset);
    prowset = NULL;

    hr = ptbl->QueryRows (1, 0, &prowset);
    if ((hr != S_OK) || (prowset == NULL) || (prowset->cRows == 0))
    {
        break;
    }
}
```

This code iterates through every row in the message stores table. We query one row at a time. FYI, `IMAPITable::QueryRows` will only return a max of 10 rows. `IMAPITable::QueryRows` will also automatically increment the internal row counter, so subsequent invocations will get the next row.

## MessageBox each display name

```cpp
ASSERT (prowset->aRow[0].cValues == spta.cValues);
pval = prowset->aRow[0].lpProps;

ASSERT (pval[0].ulPropTag == PR_DISPLAY_NAME);
```

After querying the row, we do some ASSERTs to check that we got the expected number of columns as well as the correct property. `PR_DISPLAY_NAME` is the property that the account name is in, and is of type `TCHAR *`. You can infer this from the definition in `mapitags.h`:

```cpp
#define PR_DISPLAY_NAME PROP_TAG( PT_TSTRING, 0x3001)
```

The `SPropValue` struct contains a member, `Value`, which is a union of a bunch of different types. So we have to access the wide-string member of the union, and print it out:

```cpp
MessageBox(NULL, pval[0].Value.lpszW, TEXT("Message Store"), MB_OK);
```

The memory pointed to by `lpszW` is allocated by MAPI, and we need to free the rowset (when we re-enter the loop, as well as when we exit the function):

```cpp
// Free the previous row
FreeProws (prowset);
```

## Log out of MAPI

```cpp
pSession->Logoff(0, 0, 0);
```

The most complex part of the function 😊

# Building

Make sure that when you build your project, you link in `cemapi.lib` as well.

# So what else can I do?

So far I've given you a function that prints out the message store names, but there are many properties that you can query for. A quick glance of `mapitags.h` will give you some tips. Don't go writing at tags if you don't know what they do though!

In future articles I'll talk about more advanced topics, such as getting the message store pointer, and iterating through folders/messages.

Hope this article helps some of you out. Feel free to leave a comment if you have any questions or ideas for blog topics!
