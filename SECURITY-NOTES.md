# Security notes — Consegna clienti (stanze `/room/<id>`)

Modello di sicurezza del sistema di consegna clienti, in un punto: **il sito è
statico (GitHub Pages), non c'è backend — la stanza è una cortesia di privacy,
NON autenticazione.** Nessuna affermazione del codice o dell'interfaccia dice
il contrario.

## Cosa è garantito

- Nessun segreto nel bundle: in `rooms.ts` c'è solo l'hash SHA-256 **salato**
  della password (`sha256(salt:password)`), mai la password.
- Confronto a tempo costante dell'hash; id stanza validato con `^[\w-]{1,64}$`
  (niente path traversal, l'id non tocca mai il filesystem).
- Zero script di terze parti (font self-hosted, nessun CDN — lezione polyfill.io).
- Nessun source map nel build di produzione (default Vite).
- Nessun open redirect: il bridge `404.html → ?p=` usa solo
  `history.replaceState` same-origin e scarta path con `//` o non assoluti.
- Nessun XSS: commenti e giudizi sono sempre testo React, mai HTML; grep
  `dangerouslySetInnerHTML|innerHTML|eval` = 0.
- Le stanze sono `noindex, nofollow` (meta iniettata e **rimossa** all'uscita),
  escluse da sitemap, llms.txt e nav: nessun elenco di stanze è pubblicato
  da nessuna parte. Nella repo tracciata resta solo la stanza demo (foto già
  pubbliche sul sito); i dati delle stanze dei clienti reali viaggiano via
  `VITE_ROOMS_EXTRA` (secret), non nel codice.
- mailto: destinazione fissa (email dello studio), subject/body solo
  `encodeURIComponent`-ati — niente iniezione di header.
- Nessun account, nessun database, nessun pagamento: credential stuffing,
  enumerazione utenti, account pre-hijacking, race condition sui pagamenti,
  SMS pumping, SSRF, JWT — intere classi di attacco non esistono qui.

## Cosa NON è garantito (per onestà, detto ad alta voce)

- **La password è aggirabile**: il JS che la verifica gira nel browser di chi
  visita; le foto sono servite da URL pubblici. Il gate protegge la
  *discrezione* (chi ha il link non vede la galleria senza password), non il
  contenuto da chi ispeziona la rete.
- **La sorgente foto determina la pubblicazione**: una stanza su un evento
  locale (`eventId`) mostra foto già pubbliche in `/gallery` e sitemap —
  non usarla per lavoro da approvare prima della pubblicazione. Per consegnare
  lavoro inedito crea su Drive una cartella FUORI dalla radice dell'archivio
  (es. `Consegne/<cliente>/`) e usa `driveFolderId`: il walk della galleria
  non la elenca, la stanza sì.
- **`VITE_ROOMS_EXTRA` protegge la repo, non il visitatore**: Vite inline il
  valore del secret nel bundle JS pubblicato — nome del cliente, titolo,
  scadenza, id cartella e hash della password sono leggibili da chiunque carichi
  il sito. Di conseguenza la riservatezza del lavoro inedito consegnato via
  `driveFolderId` riposa sull'oscurità dell'id della cartella: è oscurità, non
  controllo d'accesso — chi estrae l'id dal bundle può elencare le foto con la
  stessa API key pubblica (referrer-restricted) e il gate resta decorativo per
  il contenuto. Riservatezza reale del lavoro inedito = backend dedicato o
  account Drive separato (chiavi diverse per sito e consegne).
- **Watermark e "download non attivo" sono affordance**: il watermark è un
  overlay DOM; con `downloads: false` non c'è il bottone, ma il file
  dell'immagine è comunque scaricabile da chi sa dove guardare.
- La scadenza è verificata lato client: è un promemoria, non un lock.
- Non c'è rate limiting sul gate (non c'è un server che lo applicherebbe).
- GitHub Pages non può impostare header (`X-Frame-Options`, `X-Robots-Tag`):
  il noindex è via meta tag, il clickjacking è mitigato dal fatto che nella
  stanza non esistono azioni con effetto reale sul server.

## Checklist per una stanza di un cliente reale

1. Password **ad alta entropia** (≥ 16 caratteri random) e **salt nuovo e
   random per stanza** — hash: 
   `node -e "const c=require('crypto');const s=<salt>;console.log(c.createHash('sha256').update(s+':'+process.argv[1]).digest('hex'))" PASSWORD`
2. **Non committare i dati del cliente nella repo pubblica**: metti la stanza
   in `VITE_ROOMS_EXTRA` (JSON array) come secret di GitHub Actions — il
   workflow `deploy.yml` lo passa già al build — oppure in `app/.env.local`
   in dev (gitignored). Il file tracciato contiene solo la stanza demo
   (foto già pubbliche).
3. Se il cliente esige riservatezza reale (auth server-side, download
   firmati, watermark bruciato nei file): serve un backend — questa sistema
   statico non lo promette, e non va forzato a fingere.
