// @ts-check
'use strict';

/**
 * Funzione che prende un template HTML e un oggetto di dati, e restituisce un nodo DOM con i dati inseriti nei posti giusti.
 * Esempio di utilizzo:
 * containerEl.appendChild(
 *   compileTemplate('#post-template', {
 *       '.card-title': 'My Second Post',
 *       '.card-img-top': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGhvdG9ncmFwaHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60',
 *       '.card-text': 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, voluptate!',
 *   })
 * )
 * @param {string} templateSelector 
 * @param {Record<string, string | function(HTMLElement) : void>} data 
 * @returns 
 */
function compileTemplate(templateSelector, data) {
    /** @type {HTMLTemplateElement | null} */
    const templateEl = document.querySelector(templateSelector);

    if (!templateEl) return null;

    const templateContent = document.importNode(templateEl.content, true);

    for (const [selector, value] of Object.entries(data)) {
        const el = templateContent.querySelector(selector);
        if (!el || !(el instanceof HTMLElement)) continue;

        if (typeof value === 'function') {
            value(el);
        } else if (el instanceof HTMLImageElement) {
            el.src = value;
        } else {
            el.textContent = value;
        }
    }

    return templateContent;
}

/**
 * @callback delegateEventCallback
 * @param {Event} event
 * @param {HTMLElement} targetEl
 */

/**
 * 
 * @param {HTMLElement} parent 
 * @param {string} eventType 
 * @param {string} targetSelector 
 * @param {delegateEventCallback} callback 
 * @returns {void}
 */
function delegateEvent(parent, eventType, targetSelector, callback) {
    parent.addEventListener(eventType, (event) => {
        const target = event.target;

        if (!target || !(target instanceof HTMLElement)) {
            return;
        }

        const targetEl = target.closest(targetSelector);

        if (
            !targetEl ||
            !(targetEl instanceof HTMLElement) ||
            !parent.contains(targetEl)
        ) {
            return;
        }

        callback(event, targetEl);
    });
}

/**
 * Esempio di utilizzo:
 * const actions = {
 *   showPost: (elem, data) => {
 *       console.log(elem, data);
 *   }
 * };
 * @callback actionFunction
 * @param {HTMLElement} elem
 * @param {any} data
 * @param {Event} event
 */

/**
 * 
 * @param {Record<string, actionFunction>} actions 
 */
function startActionEngine(actions) {
    delegateEvent(document.body, 'click', '[data-action]', (event, elem) => {        

        const {action, actionJson} = elem.dataset;
        
        if (action && actions[action]) {
            const actionData = JSON.parse(actionJson || '{}');
            const actionFunc = actions[action];
            
            actionFunc(elem, actionData, event);
        }
    });
}

/**
 * 
 * @param {string} url 
 * @returns {Promise<any>}
 */
function myFetch(url) {
    return fetch(url)
        .then(response => {
            return response.json();
        })
}