# Il tag `<template>`

## Introduzione

Il tag HTML `<template>` permette di definire un **frammento di markup riutilizzabile** che il browser **non renderizza** e **non esegue** finché non decidiamo noi di usarlo via JavaScript.

In altre parole: tutto ciò che sta dentro `<template>` "esiste" nel documento, ma non viene mostrato, non fa partire richieste di rete (le `<img>` non scaricano nulla) e non esegue `<script>`. È un "stampino" HTML pronto per essere clonato ogni volta che serve.

### Perché usarlo?

- **Markup riutilizzabile**: definisci la struttura una sola volta in HTML e la cloni N volte da JS (es. una card per ogni post).
- **Separazione tra struttura e logica**: l'HTML resta in HTML, il JS si occupa solo di popolare i dati. Niente più stringhe come `'<div class="card">' + title + '</div>'`, che sono difficili da leggere e aprono la strada a bug e problemi di sicurezza (XSS).
- **IDE-friendly**: l'editor fa autocomplete, syntax highlight e valida il markup come HTML normale.

### Anatomia

```html
<template id="post-template">
  <div class="card">...</div>
</template>
```

Su questo elemento, JavaScript ci mette a disposizione la proprietà `.content`:

- `template.content` → è un **`DocumentFragment`**, cioè un contenitore "leggero" di nodi DOM non ancora inseriti in pagina.
- Il fragment va **clonato** prima dell'uso: se inserissimo direttamente `template.content` nel DOM, lo "svuoteremmo" (i nodi verrebbero spostati, non copiati) e al successivo utilizzo il template sarebbe vuoto.

Per clonarlo abbiamo due strade equivalenti nella pratica:

- `template.content.cloneNode(true)` → copia profonda del fragment.
- `document.importNode(template.content, true)` → stessa cosa, ma è la forma "storica" per importare nodi da un altro documento; nel browser moderno è del tutto intercambiabile con `cloneNode(true)`.

Entrambe restituiscono un nuovo `DocumentFragment` pronto per essere modificato e inserito nella pagina.

### Flusso tipico in 4 passi

1. **Definisci** il template in HTML, dentro `<template>...</template>`.
2. **Trova** il template con `document.querySelector('#id')`.
3. **Clona** il contenuto con `document.importNode(template.content, true)`.
4. **Modifica** il clone (titolo, immagine, testo, ecc.) e fai `appendChild` nel contenitore di destinazione.

## Esempio

HTML — il template sta in pagina ma non viene mostrato:

```html
<template id="post-template">
  <div class="card mb-3">
    <img src="" class="card-img-top" alt="Post Image" />
    <div class="card-body">
      <h5 class="card-title"></h5>
      <p class="card-text"></p>
    </div>
  </div>
</template>
```

JavaScript — clonazione, riempimento e inserimento:

```js
'use strict';

// 1. Trovo il contenitore dove inserire il template compilato
const containerEl = document.querySelector('.container');

// 2. Trovo l'elemento <template> tramite il suo id
const postTemplate = document.querySelector('#post-template');

// 3. Clono il contenuto del template (importNode con secondo argomento `true` = copia profonda)
//    postEl è un DocumentFragment "staccato" dal template originale, modificabile senza effetti collaterali
const postEl = document.importNode(postTemplate.content, true);

// 4. Modifico le parti del clone che mi interessano, cercandole con querySelector
//    textContent popola il testo all'interno del nodo
postEl.querySelector('.card-title').textContent = 'My First Post';

// src imposta l'attributo src dell'immagine (prima del clone non scaricava nulla perché il template è inerte)
postEl.querySelector('.card-img-top').src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGhvdG9ncmFwaHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60';

postEl.querySelector('.card-text').textContent = 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, voluptate!';

// dataset permette di scrivere attributi data-* (qui scriviamo data-img-src, utile poi per la event delegation)
postEl.querySelector('.card').dataset.imgSrc = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGhvdG9ncmFwaHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60';

// 5. Aggiungo il clone popolato al contenitore: solo adesso il browser lo renderizza e scarica l'immagine
containerEl.appendChild(postEl);
```

> Nota: se volessimo creare **più** post, basta ripetere i passi 3–5 in un ciclo. Ogni `importNode` produce un nuovo clone indipendente, quindi il template originale resta sempre intatto.

## Nel progetto

Nel file [scripts/functions.js](../scripts/functions.js) è già presente una funzione di utilità, `compileTemplate(templateSelector, data)`, che generalizza il pattern visto sopra.

```js
// Esempio di utilizzo nel progetto
containerEl.appendChild(
    compileTemplate('#post-template', {
        // chiave = selettore CSS dentro il template
        // valore = contenuto (stringa) OPPURE funzione che riceve l'elemento e lo modifica liberamente
        '.card-title': 'My Second Post',
        '.card-img-top': 'https://.../photo.jpg', // su <img> imposta src
        '.card-text': 'Lorem ipsum...',
        '.card': (el) => {
            // Per modifiche più avanzate si passa una funzione
            el.dataset.action = 'showPost';
            el.dataset.actionJson = JSON.stringify({ id: 123 });
        },
    })
);
```

Internamente la funzione fa esattamente quello che abbiamo visto:

1. `document.querySelector(templateSelector)` per trovare il `<template>`.
2. `document.importNode(templateEl.content, true)` per clonarlo.
3. Itera sull'oggetto `data`: per ogni selettore trova l'elemento nel clone e, in base al tipo del valore, applica `src` (se `<img>`), `textContent` (stringa su altro tag) o esegue la funzione (per modifiche arbitrarie).
4. Restituisce il `DocumentFragment` popolato, pronto per `appendChild`.

In [scripts/index.js](../scripts/index.js) vediamo l'uso concreto: un `for` che genera 5 post identici clonando lo stesso template.
