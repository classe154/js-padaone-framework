# Event Delegation

## Introduzione

Quando clicchiamo (o premiamo un tasto, o passiamo il mouse) su un elemento della pagina, l'evento **non si ferma** su quell'elemento: **risale** l'albero del DOM passando per tutti i suoi antenati, fino a `document`. Questa fase si chiama **event bubbling**.

```
html
└── body
    └── .container          ← event.currentTarget (il listener è qui)
        └── .card
            └── .card-body
                └── .card-title   ← event.target (dove è avvenuto il click)
```

Sfruttando il bubbling, invece di mettere un listener **su ciascun figlio**, possiamo metterne **uno solo sul parent** e al suo interno capire chi è stato cliccato davvero. Questa tecnica si chiama **event delegation**.

### Perché usarla?

- **Performance**: 1 listener invece di N. Con 500 card, 500 `addEventListener` sono uno spreco.
- **Elementi dinamici**: se aggiungiamo nuovi figli dopo aver registrato i listener (come fa [scripts/index.js](../scripts/index.js) clonando 5 post dal `<template>`), i nuovi figli **non avrebbero** il listener. Con la delegation il parent li "copre" automaticamente, perché gli eventi passano comunque da lì.
- **Meno codice da mantenere**: una sola funzione gestisce tutti i click su un tipo di elemento.

### `event.target` vs `event.currentTarget`

- `event.target` → l'elemento **esatto** da cui l'evento è partito (può essere un figlio profondo, es. l'`<img>` dentro la card).
- `event.currentTarget` → l'elemento **su cui** è registrato il listener (nel nostro caso il container `.container`).

Nella delegation `target` cambia a ogni click, `currentTarget` resta sempre uguale.

### `closest(selector)`

Se il click è avvenuto sull'`<img>` dentro una `.card`, `event.target` è `<img>`, non `.card`. Per risalire al "vero" elemento cliccato dal punto di vista logico usiamo:

```js
const cardEl = event.target.closest('.card');
```

`closest()` parte dall'elemento stesso e risale tra gli antenati finché trova il primo che corrisponde al selettore (o `null` se non lo trova).

### `parent.contains(el)`

Ulteriore precauzione: dopo aver trovato l'elemento con `closest`, controlliamo che stia davvero **dentro il nostro parent**. Serve per evitare match "fortunati" fuori dall'area che stiamo gestendo (es. un `.card` presente altrove in pagina).

---

## Data-attribute

Gli attributi HTML che iniziano con `data-` sono **attributi personalizzati** standard: servono per attaccare dati arbitrari direttamente sull'HTML senza inventare attributi non validi.

```html
<div class="card" data-img-src="https://..." data-action="showPost"></div>
```

Da JavaScript si leggono e scrivono tramite la proprietà `element.dataset`:

```js
'use strict';

const el = document.querySelector('.card');

// Lettura
console.log(el.dataset.imgSrc);  // "https://..."
console.log(el.dataset.action);  // "showPost"

// Scrittura
el.dataset.foo = 'bar';          // aggiunge in HTML: data-foo="bar"
```

### Conversione kebab-case ↔ camelCase

Nell'HTML gli attributi usano il trattino (`data-img-src`), in JS diventano camelCase su `dataset`:

| HTML                     | JavaScript (`dataset`)   |
|--------------------------|--------------------------|
| `data-action`            | `dataset.action`         |
| `data-img-src`           | `dataset.imgSrc`         |
| `data-action-json`       | `dataset.actionJson`     |

### Attenzione: dataset contiene solo stringhe

Qualunque cosa si legge da `dataset` è una **stringa**. Se vogliamo memorizzare un oggetto o un numero, dobbiamo serializzare/deserializzare noi:

```js
// Scrittura: oggetto → stringa JSON
el.dataset.actionJson = JSON.stringify({ id: 123, title: 'Hello' });

// Lettura: stringa JSON → oggetto
const data = JSON.parse(el.dataset.actionJson);
console.log(data.id); // 123
```

Questo è esattamente ciò che useremo nell'Esempio 4 e 5 per passare dati all'azione da eseguire al click.

---

## Esempio 1 — Delegation "a mano"

Abbiamo una card con un `data-img-src` che vogliamo stampare in console quando l'utente clicca.

```html
<div
  class="card mb-3"
  data-img-src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&amp;ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGhvdG9ncmFwaHxlbnwwfHwwfHx8MA%3D%3D&amp;auto=format&amp;fit=crop&amp;w=500&amp;q=60"
>
  <img
    src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&amp;ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGhvdG9ncmFwaHxlbnwwfHwwfHx8MA%3D%3D&amp;auto=format&amp;fit=crop&amp;w=500&amp;q=60"
    class="card-img-top"
    alt="Post Image"
  />
  <div class="card-body">
    <h5 class="card-title">My Second Post</h5>
    <p class="card-text">
      Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,
      voluptate!
    </p>
  </div>
</div>
```

```js
'use strict';

// Registriamo UN SOLO listener sul container, non uno per ogni card.
containerEl.addEventListener('click', (event) => {
    // event.target = l'elemento preciso su cui è stato fatto click
    // (può essere l'<img>, il titolo, il paragrafo... non per forza la .card)
    const targetEl = event.target;

    // Se per qualche ragione non c'è un target, usciamo (guard clause).
    if (!targetEl) {
        return;
    }

    // Partiamo dal target e risaliamo l'albero per trovare la .card più vicina.
    // Se il click è su <img>, closest('.card') restituisce comunque la card che la contiene.
    const cardEl = event.target.closest('.card');

    // Se closest non ha trovato nulla, o se la card trovata è fuori dal nostro container, ignoriamo.
    if (!cardEl || !containerEl.contains(cardEl)) {
        return;
    }

    // Leggiamo il data-attribute dalla card: data-img-src → dataset.imgSrc.
    const imgSrc = cardEl.dataset.imgSrc;
    console.log(imgSrc);
});
```

## Esempio 2 — Astrazione con `delegateEvent`

L'esempio 1 funziona ma la logica "trova il target, risali con closest, verifica contains" si ripete ogni volta. La estraiamo in una funzione generica.

```js
'use strict';

/**
 * Registra un listener sul parent che scatena il callback
 * solo quando il click avviene su un elemento che matcha targetSelector.
 */
function delegateEvent(parent, eventType, targetSelector, callback) {
    parent.addEventListener(eventType, (event) => {
        const target = event.target;

        // Guard: niente target, niente da fare.
        if (!target) {
            return;
        }

        // Risaliamo l'albero cercando il primo antenato che matcha il selettore.
        const targetEl = target.closest(targetSelector);

        // Se non lo troviamo, o è fuori dal parent, ignoriamo.
        if (
            !targetEl ||
            !parent.contains(targetEl)
        ) {
            return;
        }

        // Passiamo al callback sia l'evento originale sia l'elemento "logico" trovato.
        callback(event, targetEl);
    });
}

// Uso: il codice della app diventa molto più pulito.
delegateEvent(containerEl, 'click', '.card', (event, cardEl) => {
    const imgSrc = cardEl.dataset.imgSrc;
    console.log(imgSrc);
});
```

## Esempio 3 — Pattern "action" via `data-action`

Nuova idea: invece di scrivere nel JS *quali* classi gestire, lo decidiamo dall'HTML scrivendo su ogni elemento **quale azione** lanciare al click.

```html
<div class="card mb-3" data-action="showPost">
  <img
    src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&amp;ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGhvdG9ncmFwaHxlbnwwfHwwfHx8MA%3D%3D&amp;auto=format&amp;fit=crop&amp;w=500&amp;q=60"
    class="card-img-top"
    alt="Post Image"
  />
  <div class="card-body">
    <h5 class="card-title">My Second Post</h5>
    <p class="card-text">
      Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,
      voluptate!
    </p>
  </div>
</div>
```

```js
'use strict';

// "Dispatch table": oggetto che mappa nome-azione → funzione da eseguire.
// Aggiungere una nuova azione = aggiungere una chiave qui, senza toccare il listener.
const actions = {
    showPost: () => {
        console.log('click');
    },
};

containerEl.addEventListener('click', (event) => {
    const targetEl = event.target;

    if (!targetEl) {
        return;
    }

    // Come prima: risaliamo fino alla .card.
    const cardEl = event.target.closest('.card');

    if (!cardEl || !containerEl.contains(cardEl)) {
        return;
    }

    // Leggiamo il nome dell'azione dall'HTML (data-action → dataset.action).
    const action = cardEl.dataset.action;

    // Cerchiamo la funzione corrispondente nel nostro dispatch e la invochiamo.
    const actionFunc = actions[action];
    actionFunc();
});
```

## Esempio 4 — Passaggio dati via `data-action-json`

Un'azione spesso ha bisogno di **dati** (quale post mostrare, quale id, ecc.). Li serializziamo in JSON direttamente sull'HTML, poi nel JS facciamo `JSON.parse`.

```html
<div
  class="card mb-3"
  data-action="showPost"
  data-action-json='{"id":123,"title":"My Second Post"}'
>
  <img
    src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&amp;ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGhvdG9ncmFwaHxlbnwwfHwwfHx8MA%3D%3D&amp;auto=format&amp;fit=crop&amp;w=500&amp;q=60"
    class="card-img-top"
    alt="Post Image"
  />
  <div class="card-body">
    <h5 class="card-title">My Second Post</h5>
    <p class="card-text">
      Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,
      voluptate!
    </p>
  </div>
</div>
```

```js
'use strict';

// La funzione dell'azione adesso riceve i dati (già parsati).
const actions = {
    showPost: (data) => {
        console.log(data); // { id: 123, title: 'My Second Post' }
    },
};

containerEl.addEventListener('click', (event) => {
    const targetEl = event.target;

    if (!targetEl) {
        return;
    }

    const cardEl = event.target.closest('.card');

    if (!cardEl || !containerEl.contains(cardEl)) {
        return;
    }

    // Destructuring di due data-attribute contemporaneamente:
    //   data-action       → action
    //   data-action-json  → actionJson (stringa JSON da parsare)
    const { action, actionJson } = cardEl.dataset;

    // Eseguiamo l'azione solo se c'è un nome e se è davvero registrata in `actions`.
    if (action && actions[action]) {
        // Se actionJson è vuoto/undefined ripieghiamo su '{}' per non far esplodere JSON.parse.
        const actionData = JSON.parse(actionJson || '{}');
        const actionFunc = actions[action];

        // Passiamo alla funzione: l'elemento, i dati parsati e l'evento originale.
        actionFunc(cardEl, actionData, event);
    }
});
```

## Esempio 5 — Versione finale integrata

Combiniamo tutto: `delegateEvent` dell'Esempio 2 + pattern action dell'Esempio 4. Notare il selettore `[data-action]`: non dipendiamo più da `.card`, gestiamo **qualunque** elemento con un `data-action`.

```js
'use strict';

// Mappa nome-azione → funzione.
// Ogni funzione riceve (elemento cliccato, dati parsati, evento).
const actions = {
    showPost: (elem, data) => {
        console.log(elem, data);
    },
};

// Un solo listener sul container, valido per tutti i [data-action] presenti e futuri.
delegateEvent(containerEl, 'click', '[data-action]', (event, elem) => {
    // Leggiamo nome azione e dati (stringa JSON) dai data-attribute dell'elemento.
    const { action, actionJson } = elem.dataset;

    // Dispatch: se l'azione è nota, parsiamo i dati e la eseguiamo.
    if (action && actions[action]) {
        const actionData = JSON.parse(actionJson);
        const actionFunc = actions[action];

        actionFunc(elem, actionData, event);
    }
});
```

Questo è il pattern che si chiama **"action engine"**: l'HTML dichiara *cosa* deve succedere (`data-action="showPost"`) e il JS è solo un dizionario di *come* farlo succedere (`actions.showPost = ...`). Per aggiungere nuove interazioni basta registrare una nuova chiave in `actions` e marcare l'HTML con il nuovo `data-action`.

---

## Nel progetto

La funzione `delegateEvent` e il pattern "action engine" sono già implementati in [scripts/functions.js](../scripts/functions.js):

- `delegateEvent(parent, eventType, targetSelector, callback)` — la stessa dell'Esempio 2, con qualche controllo di tipo aggiuntivo.
- `startActionEngine(actions)` — costruisce internamente la delegation dell'Esempio 5, registrata direttamente su `document.body` con selettore `[data-action]`, così copre tutta la pagina.

In [scripts/index.js](../scripts/index.js) vediamo l'uso reale:

```js
// Ogni card viene clonata dal template e marcata con data-action + data-action-json
el.dataset.action = 'showPost';
el.dataset.actionJson = JSON.stringify({ id: 123, title: 'My Second Post' });

// ...poi basta registrare le azioni e avviare il motore
const actions = {
    showPost: (elem, data) => {
        console.log(elem, data);
    },
};

startActionEngine(actions);
```

Al click su una qualunque card, il browser fa bubbling fino a `body`, il listener di `startActionEngine` trova il più vicino `[data-action]`, legge `data-action` + `data-action-json` e invoca `actions.showPost(card, { id: 123, title: ... }, event)`.
