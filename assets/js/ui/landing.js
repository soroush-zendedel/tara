// Toggle the landing page copy while keeping its language and text direction in sync.
document.getElementById('langToggle').addEventListener('click', () => {
    const html = document.documentElement;
    const isPersian = html.lang === 'fa';
    html.lang = isPersian ? 'en' : 'fa';
    html.dir = isPersian ? 'ltr' : 'rtl';
});
