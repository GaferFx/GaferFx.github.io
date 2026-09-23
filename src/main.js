const header = document.querySelector('.header');
const firstScreen = document.querySelector('.first-screen');
const projectsList = document.querySelector('#projects-list');
const playerModal = document.querySelector('#player-modal');
const playerFrame = document.querySelector('#player-frame');
const playerClose = document.querySelector('.player-close');
let lastFocusedElement;

new IntersectionObserver((entries) => {
    entries.forEach(entry => header.classList.toggle('visible', !entry.isIntersecting));
}, { threshold: 0 }).observe(firstScreen);

const translations = {
    'Your only video editor': 'Ваш последний режиссер монтажа',
    'Contact me:': 'Свяжитесь со мной:',
    'My Recent Works': 'Мои последние работы',
    'My Projects': 'Мои проекты',
    'Telegram': 'Телеграм',
    'Telegram blog': 'Телеграм блог'
};

const getIpCountry = async () => {
    try {
        const response = await fetch('https://ipinfo.io/json');
        return (await response.json()).country;
    } catch {
        return null;
    }
};

getIpCountry().then(country => {
    if (!['RU', 'UA', 'BY'].includes(country)) return;
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) element.textContent = translations[key];
    });
});

const embedBuilders = {
    youtube: id => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
    vimeo: id => `https://player.vimeo.com/video/${id}?autoplay=1`,
    rutube: id => `https://rutube.ru/play/embed/${id}/?autoplay=1`
};

function openPlayer(button) {
    const build = embedBuilders[button.dataset.provider];
    if (!build || !button.dataset.videoId) return;
    lastFocusedElement = document.activeElement;
    playerFrame.title = button.dataset.title;
    playerFrame.src = build(button.dataset.videoId);
    playerModal.hidden = false;
    document.body.classList.add('player-open');
    playerClose.focus();
}

function closePlayer() {
    playerModal.hidden = true;
    playerFrame.src = '';
    document.body.classList.remove('player-open');
    if (lastFocusedElement) lastFocusedElement.focus();
}

projectsList.addEventListener('click', event => {
    const button = event.target.closest('[data-video-id]');
    if (button) openPlayer(button);
});

playerClose.addEventListener('click', closePlayer);
playerModal.addEventListener('click', event => {
    if (event.target === playerModal) closePlayer();
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !playerModal.hidden) closePlayer();
});
