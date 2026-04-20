# PadaOne — Piano di miglioramenti v2

Questo file descrive le modifiche da apportare a `scripts/padaone.js` per implementare le funzionalità discusse.

---

## 1. `compileTemplate` — Supporto valori booleani

**File:** `scripts/padaone.js`
**Funzione:** `compileTemplate`

### Stato attuale

Il ciclo `for...of` gestisce solo tre casi:
```js
if (typeof value === 'function') { ... }
else if (el instanceof HTMLImageElement) { ... }
else { el.textContent = value; }
```

### Modifica

Aggiungere un ramo `boolean` **prima** del controllo `HTMLImageElement`:

```js
} else if (typeof value === 'boolean') {
    if ('disabled' in el) {
        /** @type {any} */ (el).disabled = !value;
    } else {
        el.hidden = !value;
    }
}
```

**Logica:** `true` = elemento visibile/abilitato, `false` = nascosto/disabilitato.
- Se l'elemento ha la proprietà `disabled` (button, input, select...) → imposta `disabled`
- Altrimenti → imposta `hidden`

### Aggiornare anche il JSDoc del parametro `data`:

```js
// da:
@param {Record<string, string | function(HTMLElement) : void>} data
// a:
@param {Record<string, string | boolean | function(HTMLElement) : void>} data
```

### Esempio d'uso risultante

```js
PadaOne.compileTemplate('#post-template', {
    '.card-title': 'Il mio post',
    '.btn-delete': false,   // nasconde il bottone
    '.btn-edit': true,      // mostra il bottone
    '.btn-submit': false,   // disabilita (ha `disabled`)
});
```

---

## 2. `startActionEngine` — Supporto eventi multipli con `data-on`

**File:** `scripts/padaone.js`
**Funzione:** `startActionEngine`

### Stato attuale

```js
function startActionEngine(actions) {
    delegateEvent(document.body, 'click', '[data-action]', (event, elem) => {
        const { action, actionJson } = elem.dataset;
        ...
    });
}
```
Ascolta **solo** l'evento `click`, hardcodato.

### Modifica

1. Aggiungere il parametro `eventTypes` con default `['click', 'submit']`
2. Estrarre la logica interna in una funzione `handleAction`
3. Registrare un listener per ogni evento in `eventTypes`
4. Dentro `handleAction`, filtrare per `data-on` se presente (default: `'click'`)
5. Chiamare `event.preventDefault()` automaticamente per `submit`

```js
function startActionEngine(actions, eventTypes = ['click', 'submit']) {

    function handleAction(event, elem) {
        const { action, actionJson, on: dataOn } = elem.dataset;

        // Risponde solo all'evento atteso (data-on o 'click' di default)
        const expectedEvent = dataOn || 'click';
        if (event.type !== expectedEvent) return;

        // preventDefault automatico per submit
        if (event.type === 'submit') {
            event.preventDefault();
        }

        if (action && actions[action]) {
            let actionData;
            try {
                actionData = JSON.parse(actionJson || '{}');
            } catch (e) {
                console.error('[PadaOne] JSON non valido in data-action-json:', actionJson);
                return;
            }
            actions[action](elem, actionData, event);
        }
    }

    for (const eventType of eventTypes) {
        delegateEvent(document.body, eventType, '[data-action]', handleAction);
    }
}
```

### Esempio d'uso risultante

```html
<!-- click (default, nessun data-on) -->
<div class="card" data-action="showPost" data-action-json='{"id": 1}'></div>

<!-- submit -->
<form data-action="submitForm" data-on="submit">
  <button type="submit">Invia</button>
</form>
```

```js
PadaOne.startActionEngine({
    showPost: (elem, data) => console.log(data.id),
    submitForm: (elem, data, event) => console.log('form inviato'),
});
```

---

## 3. Global Store

**File:** `scripts/padaone.js`
**Posizione:** dopo `startActionEngine`, prima di `customFetch`

### Aggiungere

Una variabile privata `_store` e due funzioni pubbliche `store` e `getState`:

```js
// ─── Store ────────────────────────────────────────────────────────────────

/** @type {Record<string, any>} */
let _store = {};

/**
 * Esegue un merge tra lo stato corrente e i nuovi dati.
 * @param {Record<string, any>} newData
 */
function store(newData) {
    _store = Object.assign({}, _store, newData);
    console.log('[PadaOne Store Update]', _store);
}

/**
 * Recupera un valore dallo store tramite chiave.
 * @param {string} key
 * @returns {any}
 */
function getState(key) {
    return _store[key];
}
```

### Esporre nell'oggetto `return`

```js
return {
    compileTemplate,
    delegateEvent,
    startActionEngine,
    fetch: customFetch,
    store,        // nuovo
    getState,     // nuovo
};
```

### Esempio d'uso risultante

```js
PadaOne.store({ user: 'Luca', posts: [] });
// → [PadaOne Store Update] { user: 'Luca', posts: [] }

PadaOne.store({ loading: true });
// → [PadaOne Store Update] { user: 'Luca', posts: [], loading: true }

PadaOne.getState('user'); // 'Luca'
```

---

## 4. Aggiornare il README.md

**File:** `README.md`

### 4a. Aggiungere sezione CDN

Dopo la sezione "Installazione", aggiungere:

```markdown
### Via CDN (jsDelivr)

```html
<script src="https://cdn.jsdelivr.net/gh/Samuel88/js-padaone-framework@main/scripts/padaone.js"></script>
```
```

### 4b. Aggiornare la tabella di `compileTemplate`

Aggiornare la riga del parametro `data` e aggiungere il punto sui valori booleani:

```markdown
| `data` | `Record<string, string \| boolean \| function>` | Oggetto `{ selettoreCSS: valore }` |

Il valore associato a ciascun selettore può essere:
- una **stringa** → assegnata a `src` (per `<img>`) o a `textContent`
- un **booleano** → `true` mostra/abilita l'elemento, `false` lo nasconde/disabilita
- una **funzione** `(el) => void` → permette modifiche arbitrarie
```

### 4c. Aggiungere sezione Store

```markdown
### `PadaOne.store(newData)` / `PadaOne.getState(key)`

Gestione semplificata dello stato globale...
```

---

## Ordine di implementazione consigliato

1. Modifica `compileTemplate` (punto 1) — isolata, nessun rischio di regressione
2. Modifica `startActionEngine` (punto 2) — verificare compatibilità con `index.js` esistente
3. Aggiungere store (punto 3) — completamente addittivo, zero rischi
4. Aggiornare README (punto 4)
