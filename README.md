# Health Monitor V2

Web app personale per registrare e confrontare:

- pressione arteriosa e frequenza cardiaca
- peso e circonferenza vita
- valori delle analisi
- periodi alimentari/diete
- farmaci e integratori
- correlazioni temporali tra i dati

## Architettura

- **GitHub Pages**: interfaccia/PWA
- **Google Apps Script**: API
- **Google Sheets**: database personale

Il token di accesso non va scritto nel repository GitHub: viene salvato localmente nel browser tramite `localStorage`.

## Aggiornamento dalla V1 alla V2

Se hai già configurato Apps Script e Google Sheet, **non devi rifare il database** e puoi lasciare invariato `Code.gs`.

Nel repository GitHub sostituisci/carica:

- `index.html`
- `style.css`
- `app.js`
- `manifest.json`
- `sw.js`
- cartella `icons/`

Dopo il commit, GitHub Pages pubblicherà automaticamente la nuova versione. Se sul telefono compare ancora la grafica vecchia, chiudi la PWA/browser e riaprila; il service worker V2 sostituisce la cache precedente.

## Nuove funzioni grafiche V2

- dashboard desktop con menu laterale
- navigazione mobile inferiore
- pulsanti di inserimento rapido
- modalità chiara/scura, salvata sul dispositivo
- card salute e pannelli responsive
- modali ridisegnati
- icona PWA dedicata
- favicon e Apple Touch Icon
- manifest PWA completo

## Icone incluse

- `icons/icon-512.png`
- `icons/icon-192.png`
- `icons/apple-touch-icon.png`
- `icons/favicon-32.png`
- `icons/icon.svg`

## Collegamento Apps Script

Apri Health Monitor, premi **Impostazioni**, quindi inserisci:

1. URL della Web App Apps Script che termina in `/exec`
2. ACCESS_TOKEN creato dal backend

Premi **Salva collegamento**.

## Nota sui confronti

I grafici mostrano associazioni temporali tra i dati inseriti. Non stabiliscono da soli un rapporto causa-effetto tra pressione, peso, dieta, farmaci, integratori o risultati di laboratorio.


## V2 grafica e PWA
Questa versione include una nuova dashboard responsive, menu laterale desktop, barra inferiore mobile, tema chiaro/scuro, azioni rapide e set completo di icone PWA.

### Aggiornamento da V1
Su GitHub sostituisci `index.html`, `style.css`, `app.js`, `manifest.json` e `sw.js`, quindi aggiungi la cartella `icons/`. `Code.gs` può restare invariato. Dopo il commit, ricarica la pagina forzando l'aggiornamento (Ctrl+F5) oppure chiudi e riapri la PWA installata.


## V2.3 fix salvataggio
Corretto l'invio POST verso Google Apps Script usando `application/x-www-form-urlencoded` con campo `payload`, compatibile con `parseBody_()` del backend esistente. Non serve modificare o ridistribuire Code.gs.


## V2.4
- Correzione chiusura automatica di tutti i popup dopo l'invio.
- Pulsanti Annulla/Salva sempre visibili e fissi in basso nei popup su smartphone.
- Sincronizzazione automatica dopo salvataggi Apps Script lenti su Android/PWA.
- Cache PWA aggiornata.


## V2.5 — restyling smartphone
- Barra inferiore flottante e più moderna, con 5 sezioni essenziali.
- Stato attivo più evidente e pulsante Altro coerente con il mockup approvato.
- Pulsanti dei popup ridisegnati: Annulla neutro e Salva blu ad alto contrasto.
- Testo Salva sempre bianco e leggibile, anche durante il salvataggio.
- Campi e popup più curati su smartphone.
- Mantiene il fix V2.4 di chiusura/sincronizzazione dei popup.


## V2.6 — macronutrienti
- Aggiunti Proteine e Grassi ai periodi alimentari, oltre a kcal e carboidrati.
- Calcolo live delle kcal teoriche dai macro (4/4/9) e percentuali.
- Le schede dieta mostrano tutti i macro.
- Code.gs include una migrazione non distruttiva: eseguendo setupDatabase() aggiunge le nuove colonne proteinG e fatG al foglio DIETS esistente senza cancellare i dati.


## V2.7 — monitoraggio avanzato
- Pressione: sessioni da 1, 2 o 3 misurazioni con media automatica e fascia mattina/sera.
- Confronto Prima/Dopo: 7, 14, 30 o 60 giorni rispetto all'inizio di dieta, farmaco o integratore, includendo pressione, battiti, peso e analisi disponibili.
- Timeline salute unificata per pressione, peso, analisi, diete e terapie.
- Report salute per 30 giorni, 3 mesi, 6 mesi, 1 anno o intervallo personalizzato, stampabile/salvabile in PDF dal browser.
- Grafico dei macronutrienti dei piani alimentari.
- Dashboard con macro del piano alimentare attivo.

### Aggiornamento database
Questa versione aggiunge colonne opzionali al foglio PRESSURE. Dopo aver copiato il nuovo Code.gs, eseguire `setupDatabase()` una volta e poi creare una nuova distribuzione della Web App Apps Script. I dati esistenti non vengono eliminati.


## V2.7.1 — correzione banner configurazione
- Il banner giallo viene mostrato solo quando endpoint Apps Script o token sono realmente mancanti.
- Dopo una connessione API riuscita il banner viene nascosto immediatamente.
- Un eventuale errore grafico successivo al caricamento non fa più riapparire il messaggio di configurazione.
- Gli errori temporanei di rete non vengono più confusi con una configurazione mancante.
- Nessuna modifica al database o a Code.gs rispetto alla V2.7.
