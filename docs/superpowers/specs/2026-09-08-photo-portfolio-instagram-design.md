# Portfolio fotografico con importazione Instagram

## Obiettivo

Trasformare il portfolio in un sito fotografico professionale per motorsport,
sport e reportage. Il capitolo tecnologia resta nel repository come materiale
archiviato, ma non è più raggiungibile dalla navigazione o dalla home.

Il sito deve rendere immediato il passaggio da Instagram alle raccolte
fotografiche e al contatto, senza esporre token o dipendere da Instagram quando
un visitatore lo consulta.

## Esperienza e struttura dei contenuti

Il sito usa una sequenza editoriale, non un insieme di card generiche:

1. **Copertina** — fotografia di impatto, nome, disciplina e accesso alle
   raccolte.
2. **In evidenza** — l'evento più recente o selezionato, con luogo, data e
   breve didascalia.
3. **Raccolte** — archivio filtrabile per Motorsport, Sport e Reportage;
   ogni raccolta apre una storia fotografica dedicata.
4. **Dal mio Instagram** — gli ultimi contenuti sincronizzati, con link
   riconoscibile al post originario.
5. **Il fotografo** — biografia, approccio e area di lavoro. Le attrezzature
   compaiono solo se forniscono contesto reale.
6. **Contatti** — e-mail e Instagram; un eventuale modulo richiede consenso
   esplicito prima dell'invio.
7. **Informazioni** — privacy, cookie, titolarità delle immagini e dettagli
   verificabili dell'attività.

Le pagine fotografia esistenti per raccolte e storie vengono preservate e
rafforzate; le pagine e i percorsi del capitolo tecnologia vengono messi in una
cartella di archivio e rimossi dal router, dalla home e dalla barra di
navigazione.

## Direzione visiva

La personalità è quella di un foglio di contatto da paddock, disciplinato e
materico: fotografie grandi, didascalie essenziali e spazi generosi. La
composizione non usa ombre morbide, gradienti decorativi o una griglia di card
identiche.

### Token

| Ruolo | Valore |
| --- | --- |
| Carta | `#F1ECE2` |
| Asfalto | `#1D1D1B` |
| Rosso segnale | `#A6291C` |
| Ottone spento | `#AA9366` |
| Grigio pellicola | `#716C64` |

I titoli mantengono la famiglia editoriale Italiana; la lettura corrente usa
una serif leggibile già presente nel progetto. Metadati e controlli sono in
sentence case, maiuscole solo quando sono parte del contenuto fotografico.

Desktop:

```text
Marchio / raccolte / Instagram / contatti

foto in evidenza                      titolo, data, luogo, testo

foglio di contatto delle raccolte

Instagram recente                     biografia / contatto

informazioni
```

Su mobile, l'immagine apre ogni blocco e testo e azioni seguono in una singola
colonna. Le immagini non vengono mai ritagliate in modo da nascondere il
soggetto senza un fallback accessibile.

## Importazione giornaliera da Instagram

Il frontend resta un'app Vite pubblicata come sito statico. Non chiama Meta
dal browser e non contiene segreti.

Un programma Node eseguito da GitHub Actions ogni giorno:

1. legge `INSTAGRAM_ACCESS_TOKEN` dai GitHub Actions Secrets;
2. usa l'API ufficiale Instagram per elencare i media dell'account collegato;
3. scarica le immagini e i metadati in `app/public/photos/`;
4. genera o aggiorna un `event.json` compatibile con l'auto-loader corrente;
5. deduplica usando l'ID del media Instagram;
6. crea un commit solo quando trova una novità, lasciando così partire il
   deploy già esistente.

Un post immagine o carosello genera una raccolta/storia importata. Il titolo
deriva dalla prima riga utile della didascalia, la descrizione dal resto e i
tag dagli hashtag normalizzati; in mancanza di tag viene usato `Instagram`.
I contenuti video non vengono caricati come file video sul sito: mostrano una
miniatura se disponibile e mantengono il link al post originale. In questo
modo l'archivio fotografico non gonfia il deploy né perde un contenuto senza
avvisare.

L'azione non cancella materiale già importato in caso di un risultato API
incompleto. Registra errori senza stampare il token, fallisce chiaramente per
token scaduto e richiede il rinnovo manuale del token Meta quando necessario.

## Requisiti professionali

- Tutte le immagini hanno un alt text utile, derivato dalla didascalia e
  modificabile nel manifesto dell'evento.
- I controlli sono elementi nativi raggiungibili da tastiera, con focus
  visibile e nomi espliciti.
- Colori e testo soddisfano un contrasto leggibile; le animazioni rispettano
  `prefers-reduced-motion`.
- Nessun analytics, cookie o embed di terze parti viene aggiunto di default.
  I link a Instagram sono normali link esterni, chiaramente indicati.
- La pagina privacy descrive solo dati realmente raccolti. Una pagina di
  rimborso non viene inventata: sarà aggiunta solo se il sito venderà servizi
  o prodotti online.
- Testimonianze, risultati commerciali e credenziali saranno mostrati soltanto
  se forniti e verificabili dal titolare.

## Fuori dallo scopo

- Pubblicazione di post, messaggi diretti, commenti o automazioni Instagram.
- Scraping di profili pubblici o uso di API non ufficiali.
- E-commerce, pagamenti, cookie banner o claim commerciali non richiesti.

## Verifica

Prima della consegna: controllo TypeScript e build Vite, lint mirato, prova
dell'importatore con una risposta API simulata, verifica della workflow YAML e
ispezione visiva desktop/mobile delle principali pagine.
