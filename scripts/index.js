// @ts-check
'use strict';

const containerEl = document.querySelector('.container');

if (!containerEl) {
    throw new Error('Container element not found');
}

for (let i = 0; i < 5; i++) {
    const postEl = PadaOne.compileTemplate('#post-template', {
            '.card': (el => {
                el.dataset.action = 'showPost';
                el.dataset.actionJson = JSON.stringify({ id: 123, title: 'My Second Post' });
                el.dataset.imgSrc = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGhvdG9ncmFwaHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60';
            }),
            '.card-title': 'My Second Post',
            '.card-img-top': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cGhvdG9ncmFwaHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60',
            '.card-text': 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, voluptate!',
        });
    
    if (!postEl) {
        throw new Error('Failed to compile template');
    }
    
    containerEl.appendChild(postEl);
}


const actions = {
    showPost: (elem, data) => {
        console.log(elem, data);
    }
};

PadaOne.startActionEngine(actions);
