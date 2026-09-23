document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('.header');
    const firstScreen = document.querySelector('.first-screen');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                header.classList.add('visible');
            } else {
                header.classList.remove('visible');
            }
        });
    }, {
        threshold: 0
    });

    observer.observe(firstScreen);
});


// Function to get user's country
const getIpCountry = async () => {
    try {
        const response = await fetch("https://ipinfo.io/json");
        const data = await response.json();
        return data.country;
    } catch (error) {
        console.error('Error fetching country:', error);
        return null;
    }
};

// Translations
const translations = {
    ru: {
        translation: {
            'Your only video editor': 'Ваш последний режиссер монтажа',
            'Contact me:': 'Свяжитесь со мной:',
            'My Recent Works': 'Мои последние работы',
            'My Projects': 'Мои проекты',
            'Telegram': 'Телеграм',
            'Telegram blog': 'Телеграм блог'
        }
    }
}

// Initialize i18next
i18next.init({
    lng: 'en',
    resources: translations,
    fallbackLng: 'en'
});

// Function to translate the page
const translatePage = () => {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = i18next.t(key);
    });
};

// Check user's country and translate if needed
window.addEventListener('DOMContentLoaded', async () => {
    const country = await getIpCountry();
    if (['RU', 'UA', 'BY'].includes(country)) {
        await i18next.changeLanguage('ru');
        translatePage();
    }
});

const projectsList = document.querySelector('#projects-list');
const playerModal = document.querySelector('#player-modal');
const playerFrame = document.querySelector('#player-frame');
const playerClose = document.querySelector('.player-close');
let lastFocusedElement;

const providerLogos = {
    youtube: '<svg viewBox="0 0 28 20" xmlns="http://www.w3.org/2000/svg" focusable="false"><rect width="28" height="20" rx="5" fill="#FF0033"/><path d="M11 5.5 19 10l-8 4.5z" fill="#fff"/></svg>',
    vkvideo: '<strong>VK</strong>',
    vimeo: '<strong>V</strong>',
    rutube: '<strong>R</strong>',
    twitch: '<strong>Tw</strong>',
    dailymotion: '<strong>D</strong>',
    browser: '<span aria-hidden="true">↗</span>'
};

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function providerIdFromUrl(url, provider) {
    try {
        const parsed = new URL(url);
        if (provider === 'youtube') return parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();
        if (provider === 'vimeo' || provider === 'rutube' || provider === 'dailymotion') return parsed.pathname.split('/').filter(Boolean).pop();
        return '';
    } catch { return ''; }
}

function createProject(project) {
    if (project.hidden) return '';
    const provider = project.provider || (project.image ? 'image' : 'browser');
    const isImage = provider === 'image' || (!project.url && project.image);
    const videoId = isImage ? '' : providerIdFromUrl(project.url, provider);
    const canEmbed = !isImage && project.embed !== false && ['youtube', 'vimeo', 'rutube', 'twitch', 'dailymotion'].includes(provider) && videoId;
    const isExternalLink = !isImage && !canEmbed && project.url;
    const target = isExternalLink ? ' target="_blank" rel="noopener noreferrer"' : '';
    const mediaTag = canEmbed ? 'button' : (isExternalLink ? 'a' : 'div');
    const providerLogo = providerLogos[provider] || providerLogos.browser;
    const image = project.thumbnail || (provider === 'youtube' && videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');
    const mediaAttributes = canEmbed ? `type="button" data-provider="${escapeHtml(provider)}" data-video-id="${escapeHtml(videoId)}" data-title="${escapeHtml(project.title)}"` : (isExternalLink ? `href="${escapeHtml(project.url)}"${target}` : 'aria-hidden="true"');
    const titleMarkup = canEmbed
        ? `<button type="button" data-provider="${escapeHtml(provider)}" data-video-id="${escapeHtml(videoId)}" data-title="${escapeHtml(project.title)}">${escapeHtml(project.title)}</button>`
        : (isExternalLink ? `<a href="${escapeHtml(project.url)}"${target}>${escapeHtml(project.title)}</a>` : escapeHtml(project.title));
    return `<article class="project" style="--project-image: url('${escapeHtml(image)}')"><div class="project-content"><${mediaTag} class="project-media${isImage ? ' project-media-static' : ''}" ${mediaAttributes} aria-label="${isExternalLink || canEmbed ? `Открыть ${escapeHtml(project.title)}` : escapeHtml(project.title)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(project.title)}" loading="lazy">${isImage ? '' : `<span class="provider-badge" aria-label="${escapeHtml(provider)}">${providerLogo}</span>`}</${mediaTag}><h3 class="project-title">${titleMarkup}</h3></div></article>`;
}

function openPlayer(button) {
    const provider = button.dataset.provider;
    const videoId = button.dataset.videoId;
    const title = button.dataset.title;
    const builders = {
        youtube: id => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
        vimeo: id => `https://player.vimeo.com/video/${id}?autoplay=1`,
        rutube: id => `https://rutube.ru/play/embed/${id}/?autoplay=1`
    };
    if (!builders[provider] || !videoId) return;
    lastFocusedElement = document.activeElement;
    playerFrame.title = title;
    playerFrame.src = builders[provider](videoId);
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

async function loadProjects() {
    try {
        const response = await fetch('projects.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        projectsList.innerHTML = (await response.json()).map(createProject).join('');
        projectsList.querySelectorAll('[data-video-id]').forEach(button => {
            button.addEventListener('click', () => openPlayer(button));
        });
    } catch (error) {
        projectsList.innerHTML = '<p class="projects-error">Projects could not be loaded.</p>';
        console.error('Projects loading failed:', error);
    }
}

loadProjects();
playerClose.addEventListener('click', closePlayer);
playerModal.addEventListener('click', event => {
    if (event.target === playerModal) closePlayer();
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !playerModal.hidden) closePlayer();
});
