# Prompt v0.2
Lägg gärna till ett monster som är en dinosaurie som man ska undvika i spelet. Gärna att kontrollerna sitter långt ned i vänsterhörnet för att gå till vänster och höger, samt att hoppknappen sitter långt ned i höger hörnet. 

# Svar
Jag la till ett rörligt monster (en barnvänlig dinosaurie) som patrullerar utvalda plattformar och som spelaren måste undvika. Jag flyttade också kontrollknapparna: vänster/höger ligger nu längst ned i vänster hörn och hoppknappen längst ned i höger hörn — optimerat för touch på surfplatta. Kollision med dinosaurien ger knockback och avdrag i poäng (men spelet fortsätter), och dinosaurien rör sig fram och tillbaka över plattformen.

Vad jag gjorde: jag implementerade ett rörligt monster (dinosaurie) som patrullerar över plattformar och kolliderar med spelaren, flyttade kontrollknapparna till vänster- och högerhörn enligt din önskan, samt gjorde en lätt poängpåverkan och knockback vid kollision. Kontrollerna är fortfarande touchvänliga och spelbart på surfplatta.

Vad som är enkelt att ändra härnäst:

Justera monsterCount eller hastighet i levelConfig() för att göra spelet enklare/svårare.
Gör dinosaurien mindre farlig (mindre poängavdrag) eller lägg till extra liv.
Byt dinosauriens utseende i <defs> eller lägg till fler monster-typer.
Vill du att jag lägger till en visuell varningszon (t.ex. röd glöd) när dinosaurien närmar sig, eller att dinosaurien kan "äta" stjärnor så de försvinner?