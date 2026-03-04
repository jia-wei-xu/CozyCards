Here's my idea/plans on the rest of the steps to complete:
1. Revamping cards/deck creation
- Deck creation is currently terrible. You can only use plain text.
- Change the deck editor for the front and back of cards to be more complex, and be able to support all the styles that Anki/Quizlet supports, along with images.
- I think the trash icon doesn't even work
- Also allow the cards to be resized as you're editing them. The editor feels "stiff" and not user friendly.
2. Revamp the card viewer
- This mainly includes adding features and fixing bugs, but there are also UI issues that I'll go over in step 4
- I don't like the usage of progress bars. It should be similar to Anki, where your selection of the Again, Hard, Easy, etc, buttons determine when the card agains and algorithmetically decides if you're done for the day.
- These Again, Hard, Easy, etc, buttons should also have less color, and have the little labels "<1m, <6m, <10m, 5d" above them as well. 
- Implement the retention algorithm (whenever the card is shown again) in the same way Anki does as well.
- Because Anki's system requires card caps for a day and algorithmetically calculates if you're done or not, there needs to be a new user profile type in the "database" (Google sheets) as well.

3. Revamping the library
- The library is unnecessarily redundant. It gives you a whole list of cards that are hard to view. 
- It should instead be short rows in a table, with "Deck", "New", "Learn", and "Due" columns, and be able to sorted into folders.
- The usage of folders will also require revamping in Google sheets.
- These "New", "Learn", etc values also need to be algorithmetically calculated in the same way as Anki, and use the Google sheets for storage.
- Decks should easily be able to moved around, renamed, deleted, etc. Should feel flexible.

4. UI Enhancements:
- The entire page's UI feels extremely "loose". It just feels like elements floating around the screen with no coherence (maybe let the navbar take up the entire top with some margins?)
- The card creation pages feels extremely loose. Maybe make "Add card" have the same width, and make the "save deck" at the bottom also tied in somehow?
- Card viewing also feels very loose. The progress bar just feels like it's floating (I don't even think we even need a progress bar actually, because I don't think Anki uses it)
- Card viewing should instead use the "New", "Learned", "Due" neatly at the bottom like Anki.
- The Again, Hard, etc buttons also seem to just float awkwardly underneath the card instead of incorporating the width of the card as its container's sizes.
- The card should be the largest thing on the screen, but it's just in a weird squarish/barely-rectangle shape in the center. Probably make it more rectangular and bigger.
- The "View All Cards" is awkwardly on the bottom of the page. I think you should allow the user to directly scroll down below the page (which is past the "New", "Learned", due, etc, which should be at the bottom of the screen) to view all the cards. In order to prevent lag, it should only load a few cards, but have a search tab at the top for easy access.

5. Customizability
- One of the biggest things is customizability. The user should have full control over all the settings (should be modeled after Monkeytype). 
- Customization should be controlled by a command line (similar to Monkeytype's), where you press esc or ctrl shift p to open it up.
- All parts of the page should follow a color theme/palette. This pallette should be able to be changed by the user.
- Background images should also be able to be changed
- The max cards for review and other Anki settings should be controlled here too
- There should also be a funbox section (enabling confetti after pressing easy), etc, that we can add on later.

6. Optimization
- There should be many optimizations to make this site as fast as possible, and fix any bugs. This site should feel like Monkeytype and lightweight as a daily flashcard driver.
- Individual decks should open up in a new page
- Maybe find a way to speed up how long it takes to access data from sheets? It currently takes very long.
- Optimize the library as well, because fetching decks take a lot of time.

This is a massive and major rehaul. I want you to construct a detailed plan on how you're going to implement all of these correctly and robustly. I will then put these instructions and your implementation plan in a file so you can use it as context.