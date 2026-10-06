// Wire page controls after the app has initialized its canvases and selectors.
window.addEventListener('load', () => {
    document.getElementById('refreshButton').addEventListener('click', generateVisuals);
    document.getElementById('downloadPdfButton').addEventListener('click', downloadPDF);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('tunerToggle').addEventListener('click', toggleTuner);
    document.getElementById('closeTuner').addEventListener('click', toggleTuner);
    document.getElementById('metroBtn').addEventListener('click', toggleMetronome);
    document.getElementById('bpmInput').addEventListener('change', updateBPM);
    document.getElementById('octaveSwitch').addEventListener('change', toggleOctaves);

    document.querySelectorAll('.pos-btn').forEach((button) => {
        button.addEventListener('click', () => {
            const position = button.dataset.position;
            setPos(position === 'all' ? 'all' : Number(position));
        });
    });

    initializePracticeLab();
});
