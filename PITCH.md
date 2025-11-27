# Narrator Plugin Demo Script

Welcome to Narrator, the Obsidian plugin that brings your notes to life with AI-powered voice narration. Let me walk you through how easy it is to transform your written content into professional audio.

## Getting Started: API Configuration

Before we dive into the features, let's quickly set up the plugin. Open Obsidian settings and navigate to the Narrator plugin settings. You'll see we need two API keys.

First, the Narrator API key. This is what powers the text-to-speech engine. Simply paste your key here and save.

Second, if you want to use the AI script generation feature, you'll need an OpenRouter API key. This is optional, but it unlocks some really powerful multi-character narration capabilities. Just paste it in and we're ready to go.

## Choosing and Previewing Your Voice

Now let's select a voice. Narrator supports multiple AI voices, and you can preview each one before committing. Click on the voice dropdown to see your options. Let's try "Alloy Echo" for this demo.

Notice the preview button right here? Click it, and you'll hear a sample of what this voice sounds like. Pretty neat, right? This way you can find the perfect voice for your content without any guesswork.

You can also adjust the speed if you want faster or slower narration. The default is one point zero times, which sounds natural for most content.

## Narrating a Selection

Now let's see the plugin in action. I have a note here with some text I want to review. Maybe I'm editing a blog post and want to hear how it sounds out loud.

Watch this: I'll simply highlight the text I want to narrate, right-click, and select "Narrate Selection" from the context menu.

Instantly, you'll see playback controls appear in the status bar at the bottom. The audio starts streaming in real-time—there's no waiting for generation to complete. You get immediate playback.

Notice the play and pause buttons? You have full control while the narration is happening. And when it's done, the audio file is automatically saved to your vault in the narration audio folder. You can listen to it again anytime.

## Narrating a Full Note

But what if you want to narrate an entire document? Maybe you have a long article you want to review while commuting, or you're creating an audiobook chapter.

It's just as simple. Right-click on any markdown file in your file explorer, and select "Narrate" from the context menu.

Again, streaming starts immediately. For longer documents, you'll see the status bar controls as the narration progresses. You can pause, resume, or stop at any time.

The great thing is, Narrator uses WebSocket streaming, so even for long documents, you get low-latency playback. No more waiting minutes for a file to generate—you're listening within seconds.

## Creating AI-Generated Scripts

Now here's where things get really interesting. Let's say you've written a story with dialogue, or maybe you have a transcript with multiple speakers. Narrator can automatically generate a multi-voice script for you.

I have a short story here with a narrator and two characters. Watch this: right-click the file and select "Create Script."

The AI analyzes your content, detects the characters, identifies their dialogue, and generates a properly formatted script file. See how it created this new file with the "-script" suffix?

Let's open it. Notice the frontmatter at the top? The AI has identified two characters: the narrator and a character named Ibrahim. Each one has a voice property that we can customize.

Below the frontmatter, you'll see the script itself. Each line of dialogue is tagged with the character name in brackets. This makes it easy to see who's speaking at a glance.

## Assigning Character Voices

Now for the magic: let's assign different voices to each character. In the frontmatter, I'll set the narrator to use "Alloy Echo" and Ibrahim to use "Onyx Nova."

You can mix and match any available voices to create unique character personalities. Once you've assigned the voices, save the file.

## Narrating Multi-Character Scripts

Now comes the best part. Right-click on the script file. Notice the context menu is different? Instead of "Narrate" and "Create Script," we now see "Narrate Script." This is because Narrator detected this is a script file.

Click "Narrate Script," and listen to what happens. Each character speaks with their assigned voice! The narrator sounds one way, and Ibrahim sounds completely different. It's like having a cast of voice actors at your fingertips.

This is perfect for audiobook production, podcast scripts, or any content with multiple speakers. The transitions between voices are seamless, and the whole thing streams in real-time just like single-voice narration.

## Command Palette Support

One more thing: if you prefer keyboard shortcuts, everything we just did is available through the command palette. Just press command or control P, type "narrator," and you'll see all the available commands.

"Narrate active note" for the current file. "Create script from active note" for AI script generation. And "Narrate script" appears when you're viewing a script file.

## Wrapping Up

So there you have it: Narrator in action. From simple text selection to full document narration to multi-character script production—all seamlessly integrated into your Obsidian workflow.

Every narration is automatically saved as a high-quality WAV file in your vault, so you can listen again later or export for other uses.

Whether you're a writer who wants to hear your work read aloud, a student reviewing notes hands-free, or a content creator producing audiobooks, Narrator makes it effortless.

Thanks for watching! If you want to try Narrator yourself, check out the repository linked in the description. Happy narrating!
