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
