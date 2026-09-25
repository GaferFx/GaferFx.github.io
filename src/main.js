const header = document.querySelector('.header');
const firstScreen = document.querySelector('.first-screen');
const projectsList = document.querySelector('#projects-list');
const playerModal = document.querySelector('#player-modal');
const playerFrame = document.querySelector('#player-frame');
const playerClose = document.querySelector('.player-close');
const playerTitle = document.querySelector('#player-title');

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


function openPlayer(button) {
    const embed = button.dataset.embed;
    if (!embed) return;
    const title = button.querySelector('.project-title')?.textContent || 'Видео';
    playerFrame.title = title;
    // "{host}" — для эмбедов вроде Twitch, которым нужен домен страницы
    playerFrame.src = embed.replaceAll('{host}', location.hostname);
    // Заголовок — заодно запасной выход, если эмбед не загрузился
    playerTitle.textContent = title;
    if (button.dataset.url) playerTitle.href = button.dataset.url;
    playerModal.setAttribute('aria-label', title);
    playerModal.showModal();
    document.body.classList.add('player-open');
    playerClose.focus();
}

playerModal.addEventListener('close', () => {
    playerFrame.removeAttribute('src');
    playerFrame.title = 'Видео';
    playerModal.setAttribute('aria-label', 'Видеоплеер');
    playerTitle.textContent = '';
    playerTitle.removeAttribute('href');
    document.body.classList.remove('player-open');
});

projectsList.addEventListener('click', event => {
    const button = event.target.closest('[data-embed]');
    if (button) openPlayer(button);
});

playerClose.addEventListener('click', () => playerModal.close());
playerModal.addEventListener('click', event => {
    if (event.target === playerModal) playerModal.close();
});
