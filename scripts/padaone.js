// @ts-check
'use strict';

/**
 * @namespace PadaOne
 */
const PadaOne = (() => {

    /**
     * Funzione che prende un template HTML e un oggetto di dati, e restituisce un nodo DOM con i dati inseriti nei posti giusti.
     * Esempio di utilizzo:
     * containerEl.appendChild(
     *   PadaOne.compileTemplate('#post-template', {
     *       '.card-title': 'My Second Post',
     *       '.card-img-top': 'https://example.com/photo.jpg',
     *       '.card-text': 'Lorem ipsum dolor sit amet.',
     *   })
     * )
     * @param {string} templateSelector
     * @param {Record<string, string | function(HTMLElement) : void>} data
     * @returns {DocumentFragment | null}
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
     * @callback actionFunction
     * @param {HTMLElement} elem
     * @param {any} data
     * @param {Event} event
     */

    /**
     * Esempio di utilizzo:
     * const actions = {
     *   showPost: (elem, data) => {
     *       console.log(elem, data);
     *   }
     * };
     * PadaOne.startActionEngine(actions);
     * @param {Record<string, actionFunction>} actions
     */
    function startActionEngine(actions) {
        delegateEvent(document.body, 'click', '[data-action]', (event, elem) => {

            const { action, actionJson } = elem.dataset;

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
        });
    }

    /**
     * @param {string} url
     * @returns {Promise<any>}
     */
    function customFetch(url) {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .catch(error => {
                console.error(`[PadaOne] myFetch failed for "${url}":`, error);
                throw error;
            });
    }

    return {
        compileTemplate,
        delegateEvent,
        startActionEngine,
        fetch: customFetch,
    };

})();