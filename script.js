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