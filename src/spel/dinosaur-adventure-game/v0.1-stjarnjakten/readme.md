# Prompt v0.1
Skapa ett spel i en single page html sida som ettbarn kan tycka är kul att spela. Gärna med svg grafik och handlar om att navigera sig igenom olika nivåer med hjälp av touch på en surfplatta. 
Enkelt och upprepbart där man samlar poäng

# Svar
Jag har gjort en enkel, barnvänlig single-page HTML-spel där spelaren styr en glad cirkel (karaktär) i en SVG-värld och samlar stjärnor genom nivåer. Kontrollerna är optimerade för touch (stora knappar för vänster/höger/hopp) och spelet kan även spelas med mus. Poäng räknas och nivåerna blir gradvis svårare. Jag har kommenterat koden så du lätt kan ändra svårighetsgrad, grafikfärger och antal stjärnor per nivå.

Här är filen du kan spara som index.html och öppna på en surfplatta eller i en webbläsare.

Vad jag gjorde: jag byggde ett komplett, självbärande HTML-spel i en fil. Spelet använder SVG för grafik (spelare, plattformar, stjärnor), stora touch-knappar för styrning och enkla fysiska regler (gravitation, hopp, plattformskollisionsdetektion). Poäng ges för varje stjärna, och när alla stjärnor i en nivå är insamlade visas ett meddelande och nästa nivå laddas.

Vad som är lätt att ändra härnäst:

Justera levelConfig() för fler eller färre stjärnor, snabbare ökning av svårighetsgrad eller fler hinder.
Byt ut SVG-grafiken mot egna figurer eller bilder (du kan lägga in fler <defs> och shape).
Lägg till animationer, fler ljud eller en meny/startskärm.
Spara poängen i localStorage om du vill att barnet ska kunna fortsätta senare.
Vill du att jag:

lägger till en enkel huvudmeny (Spela, Instruktioner, Ljud av/på)?
översätter gränssnittet till engelska eller flerspråkigt?
gör svårighetskurvan långsammare eller lägger till fler hinder/fiender?
Säg vilken ändring du vill ha så uppdaterar jag filen direkt.