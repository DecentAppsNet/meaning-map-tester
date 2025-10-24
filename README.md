# Meaning Map Tester

This is a placeholder README.md for Meaning Map Tester.

What does Meaning Map Tester do? I have no idea. It will be up to you, the developer of Meaning Map Tester, to describe it.

## Licensing

Code and other files in this repository are licensed under the MIT open source license.

The fonts are hosted from decentapps.net rather than included in this repo. Their licensing is separate, but will be something compatible with open source, e.g., OFS SFIL.

## Support

Tell your users where to go. 

I mean... to file bugs! An easy thing is to send them to a Github issues page.

## Contact

Give your users some way to contact you or your organization. 

## Community

Point your users to some public forum. Then they will be able to join forces to more effectively complain about your work! If you'd like a channel for your app on the [Meaning Map Testers Discord server](https://discord.gg/kkp3x4X2Vb), just ask - we can probably do it. The channel would be named "Meaning Map Tester". And what do people in that channel talk about? Meaning Map Tester, of course.







# Developer Guide (Delete After You Don't Need It)

The content preceding this section might be things you want to keep and revise for users of your app to see. But this section is for you, the developer. If you're feeling super-confident, you could just delete it all now. Do it, you smug puppy!

## Running Meaning Map Tester during Development

1. Change your working directory to the project root (folder this file is in).
2. `npm install`
3. `npm run dev`
4. Browse to http://localhost:3000/ or whatever URL is shown in the output of the previous command.

## What You Have Now

The unmodified template installed for Meaning Map Tester includes these screens:

* A loading screen that will show progress loading model into browser via WebLLM.
* A home screen that lets you send a simple prompt to a local LLM. Arriving to the home screen without an LLM connection will redirect to the loading screen. This redirection will be confirmed with a dialog if you are serving locally. This is to avoid excessive LLM reloading triggered by code changes during development.

The dependencies are minimal: (see package.json)

* webllm - For web-based LLM inference.
* dev dependencies for Vite/Typescript (build tooling), Vitest (test runner)

There is no monolithic dev-dependency package to install and upgrade. You are in charge of updating and revising your dependencies in the way you like.

## Removing and Changing Unwanted Things

The template isn't a framework. It's just a reasonable starting point for a certain kind of web app. You should be able to make changes to match your preferences fairly easily. Rather than presenting you with a bunch of configuration options that manipulate a black box, you can just delete or rewrite code more directly.

Following this sensibility, things like the LLM wrapper, widgets, and persistence functionality are in-lined into the project rather than kept as dependencies in packages. This practice is sometimes called "vendoring". The basic rationale is that sometimes it's a better to spend time understanding and writing code rather than maintaining the sprawl of a thousand or more packages. These decisions have tradeoffs, but I prefer to set the balance towards low-dependency development.

## PWA Support

You'll see a little bit of extra code for PWA support - the service worker registration and a manifest.json file. If this is unwelcome complexity, feel free to delete it. But it does give you and your users an ability to install the web app locally as an app that can run fully offline.

## Changing LLM Models

You can configure the supported models in `/public/app-manifest.json` to the models you would like your app to support. It's reasonable to only support one model, since your prompts and other behavior may be coupled to a single model. But adding more models can give your users options for varied device capabilities.

## Key Folders and Files

* index.html - top-level index.html that will be deployed to web root.
* src/ - root for all source that is built into the bundle.
  * common/ - Kitchen-sink folder for small utility modules and other source that doesn't merit grouping under a more general concept.
  * init/ - location for any source files called as part of initialiation.
  * developer/ - code that is really only meant to run at dev time - testing tools, profiling, backdoors.
  * llm/ - client access and other utilities around LLM. llmUtil.ts has top-level functions for calling an inference interface provided by WebLLM.
  * persistence/ - utilities around persisting data in IndexedDb in a key/document style with capability of importing/exporting documents as files.
  * loadScreen/ - screen that loads the chosen LLM model locally and shows progress.
  * homeScreen/ - screen that is arrived at after loading completes. In the template, this screen has a basic LLM chat interface that can be replaced.
* public/ - files and folders that will be web-accessible in the folder that built bundles and index.html are deployed to.

## Source Conventions

You can depart from the conventions below if you don't like them. I include them as an explanation for the starting files, and you are invited to continue the conventions if you want.

* A "screen" is just a cluster of self-contained UI that renders over the entire client rect.
* Each screen function uses React hooks for state management and tends to be the top-level of state passing down to sub-components through props.
* The screen function calls an `init()` function when it mounts which can also instance module-scope variables as additional state.
* Any state that is intended to be shared between screens is persisted using `/src/persistence/pathStore`. There is no need for an in-memory store (e.g. Redux) with this approach. And if you persist all data needed to initialize a screen, it effectively creates a saved session that a user can return to on the same device. That saved state is also exportable and importable (useful for backing up or transferring data between devices).
* If functionality is tied to one screen, keep source for it under the corresponding screen folder.
* If functionality is common to multiple screens and has more than one source file, create a new folder under `/src` for it.
* Otherwise, common functionality can go in a source file under `/common`.