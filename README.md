# Health Monitor — GitHub Pages + Google Apps Script

Web app personale per registrare e confrontare pressione arteriosa, frequenza cardiaca, peso, analisi di laboratorio, periodi di dieta, farmaci e integratori.

## 1. Crea il backend Apps Script
1. Vai su https://script.google.com e crea un nuovo progetto.
2. Rinominalo `Health Monitor API`.
3. Sostituisci il contenuto di `Code.gs` con il file `Code.gs` di questo repository.
4. In **Impostazioni progetto**, imposta il fuso orario su `Europe/Rome`.
5. Dall'editor seleziona la funzione `setupDatabase` e premi **Esegui**.
6. Autorizza lo script. Il risultato dell'esecuzione contiene `spreadsheetUrl` e `accessToken`. Copia il token in un posto sicuro.
7. Apri il Google Sheet creato automaticamente per verificare i fogli: `PRESSURE`, `WEIGHT`, `LABS`, `DIETS`, `MEDS`, `EVENTS`, `SETTINGS`.

## 2. Pubblica Apps Script come Web App
1. **Esegui il deployment > Nuovo deployment**.
2. Tipo: **Applicazione web**.
3. Esegui come: **Me**.
4. Accesso: scegli l'opzione che consente alla tua app GitHub di chiamare il servizio. Il token applicativo aggiunge un secondo controllo di accesso.
5. Distribuisci e copia l'URL che termina in `/exec`.

> Nota privacy: non mettere l'access token nel repository GitHub. L'interfaccia lo salva nel `localStorage` del browser in cui configuri l'app.

## 3. Pubblica il frontend su GitHub Pages
1. Crea un nuovo repository, per esempio `health-monitor`.
2. Carica nella root: `index.html`, `style.css`, `app.js`, `manifest.json`, `sw.js` e questo README. `Code.gs` può restare nel repo come copia del backend, perché non contiene il token.
3. Vai su **Settings > Pages**.
4. Source: `Deploy from a branch`.
5. Branch: `main`, cartella `/root`, quindi **Save**.
6. Apri l'indirizzo GitHub Pages generato.
7. Premi ⚙️, incolla URL `/exec` e access token, quindi **Salva**.

## 4. Installazione sul telefono
Apri la GitHub Page da Chrome su Android e usa **Aggiungi a schermata Home / Installa app**. La PWA conserva la shell dell'interfaccia anche offline; per sincronizzare i dati serve connessione.

## Funzioni incluse
- Dashboard con media pressione 7 giorni, peso, numero misurazioni e dieta attiva.
- Pressione: sistolica, diastolica, battiti, posizione, braccio, contesto, note.
- Peso e circonferenza vita.
- Analisi con parametri liberi, unità e range di riferimento.
- Periodi di dieta con date, calorie, carboidrati e peso iniziale/finale.
- Farmaci e integratori con dose, frequenza, orario, date e stato attivo.
- Grafici con Chart.js.
- Confronto pressione/peso/analisi su un unico periodo.
- Timeline dei periodi di dieta e trattamento sovrapposti al periodo analizzato.
- Modifica ed eliminazione record.
- Esportazione JSON e CSV.
- Sincronizzazione manuale.
- Token ruotabile con `rotateAccessToken()`.

## Limiti e sicurezza
Questa app è un diario personale, non un dispositivo medico. Le correlazioni visualizzate sono temporali e non dimostrano causalità. Non modificare o sospendere farmaci sulla base dei grafici senza confronto con un professionista sanitario.

Se un token viene esposto, esegui `rotateAccessToken()` in Apps Script e aggiorna il token nelle impostazioni della web app.
