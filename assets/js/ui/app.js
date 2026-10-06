// Wire page controls after the app has initialized its canvases and selectors.
const SECTION_VISIBILITY_STORAGE_KEY = 'tara.visibleSections.v1';
const SECTION_HINT_DURATION_MS = 5000;
const sectionRestoreHintTimers = new WeakMap();
let activeToolbarPanel = null;

function setToolbarPanel(panelName, forceOpen = false) {
    const shouldOpen = forceOpen || activeToolbarPanel !== panelName;
    activeToolbarPanel = shouldOpen ? panelName : null;
    document.querySelectorAll('[data-toolbar-tab]').forEach((tab) => {
        const selected = shouldOpen && tab.dataset.toolbarTab === panelName;
        tab.setAttribute('aria-selected', String(selected));
        tab.setAttribute('aria-expanded', String(selected));
    });
    document.querySelectorAll('.toolbar-panel').forEach((panel) => {
        panel.hidden = !shouldOpen || panel.id !== `toolbarPanel${panelName[0].toUpperCase()}${panelName.slice(1)}`;
    });
}

function initializeToolbarTabs() {
    document.querySelectorAll('[data-toolbar-tab]').forEach((tab) => {
        tab.addEventListener('click', () => setToolbarPanel(tab.dataset.toolbarTab));
    });
    document.addEventListener('click', (event) => {
        if (activeToolbarPanel && !(event.target instanceof Element && event.target.closest('.app-toolbar'))) {
            setToolbarPanel(activeToolbarPanel);
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && activeToolbarPanel) setToolbarPanel(activeToolbarPanel);
    });
    setToolbarPanel('tools', true);
}

function addSectionDismissButton(section) {
    const heading = section.querySelector('.canvas-panel-heading, .practice-heading, .teaching-panel-heading');
    const container = section.dataset.customizableSection === 'teacher'
        ? section.querySelector('.teaching-heading-actions')
        : heading;
    if (!heading || !container || container.querySelector('.section-dismiss-button')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'section-dismiss-button';
    button.setAttribute('aria-label', `Hide ${section.dataset.sectionLabel}`);
    button.title = `Hide ${section.dataset.sectionLabel}`;
    button.textContent = '×';
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setSectionVisibility(section, false);
    });
    container.append(button);
}

function showSectionRestoreHint(section) {
    const existingHint = [...document.querySelectorAll('.section-restore-hint')]
        .find((hint) => hint.dataset.restoresSection === section.id);
    if (existingHint) {
        window.clearTimeout(sectionRestoreHintTimers.get(existingHint));
        sectionRestoreHintTimers.set(existingHint, window.setTimeout(() => existingHint.remove(), SECTION_HINT_DURATION_MS));
        return;
    }

    const hint = document.createElement('div');
    hint.className = 'section-restore-hint';
    hint.dataset.restoresSection = section.id;
    hint.setAttribute('role', 'status');

    const message = document.createElement('span');
    message.textContent = `${section.dataset.sectionLabel} is hidden. Restore it from Customize visible sections.`;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Customize visible sections';
    button.addEventListener('click', () => openSectionCustomization(section));

    hint.append(message, button);
    section.after(hint);
    sectionRestoreHintTimers.set(hint, window.setTimeout(() => hint.remove(), SECTION_HINT_DURATION_MS));
}

function removeSectionRestoreHint(section) {
    document.querySelectorAll('.section-restore-hint').forEach((hint) => {
        if (hint.dataset.restoresSection === section.id) {
            window.clearTimeout(sectionRestoreHintTimers.get(hint));
            hint.remove();
        }
    });
}

function openSectionCustomization(section) {
    const preferences = document.getElementById('viewPreferences');
    const control = document.querySelector(`input[aria-controls="${section.id}"]`);
    if (!preferences || !control) return;
    setToolbarPanel('view', true);
    preferences.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => control.focus({ preventScroll: true }), 250);
}

function resetAppPreferences() {
    const confirmed = window.confirm(
        'Restore all sections and default input/Teacher Tool settings? Saved teaching notes and practice progress will be kept.'
    );
    if (!confirmed) return;

    try {
        localStorage.removeItem(SECTION_VISIBILITY_STORAGE_KEY);
        localStorage.removeItem('tara.computerKeyboardEnabled.v1');
        const savedTeachingNotes = JSON.parse(localStorage.getItem(TEACHING_NOTES_STORAGE_KEY));
        if (savedTeachingNotes && typeof savedTeachingNotes === 'object') {
            localStorage.setItem(TEACHING_NOTES_STORAGE_KEY, JSON.stringify({
                annotations: Array.isArray(savedTeachingNotes.annotations) ? savedTeachingNotes.annotations : [],
                visible: true,
                matchOctaves: false,
                role: 'note'
            }));
        }
    } catch {
        // Reload still restores in-memory defaults if browser storage is unavailable.
    }
    window.location.reload();
}

function initializeSectionVisibility() {
    const sections = [...document.querySelectorAll('[data-customizable-section]')];
    const controls = document.getElementById('sectionVisibilityControls');
    let hiddenSections = [];

    try {
        const saved = JSON.parse(localStorage.getItem(SECTION_VISIBILITY_STORAGE_KEY));
        if (Array.isArray(saved)) hiddenSections = saved;
    } catch {
        // Keep every section visible when storage is unavailable or invalid.
    }

    sections.forEach((section) => {
        const sectionKey = section.dataset.customizableSection;
        const sectionId = `custom-section-${sectionKey}`;
        section.id = sectionId;
        addSectionDismissButton(section);

        const label = document.createElement('label');
        label.className = 'section-visibility-option';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !hiddenSections.includes(sectionKey);
        checkbox.setAttribute('aria-controls', sectionId);

        const text = document.createElement('span');
        text.textContent = section.dataset.sectionLabel;
        label.append(checkbox, text);
        controls.append(label);

        checkbox.addEventListener('change', () => setSectionVisibility(section, checkbox.checked));
    });

    sections.forEach((section) => {
        const visible = !hiddenSections.includes(section.dataset.customizableSection);
        section.hidden = !visible;
        section.classList.toggle('is-user-hidden', !visible);
    });

    document.getElementById('showAllSections').addEventListener('click', () => {
        sections.forEach((section) => setSectionVisibility(section, true, false));
        saveSectionVisibility(sections);
    });
    document.getElementById('resetAppPreferences').addEventListener('click', resetAppPreferences);
    document.getElementById('showFretboardSection').addEventListener('click', () => {
        const fretboardToggle = controls.querySelector('input[aria-controls="custom-section-fretboard"]');
        if (fretboardToggle && !fretboardToggle.checked) {
            fretboardToggle.checked = true;
            fretboardToggle.dispatchEvent(new Event('change'));
        }
    });
    document.getElementById('practiceMode').addEventListener('change', updatePracticeSectionNotice);
    updateSectionVisibilityStatus(sections);
    updatePracticeSectionNotice();
}

function setSectionVisibility(section, visible, save = true) {
    section.hidden = !visible;
    section.classList.toggle('is-user-hidden', !visible);
    if (visible) removeSectionRestoreHint(section);
    else showSectionRestoreHint(section);

    const toggle = document.querySelector(`input[aria-controls="${section.id}"]`);
    if (toggle) toggle.checked = visible;

    if (!visible && section.dataset.customizableSection === 'practice') {
        stopPracticeMicrophone();
    }
    if (!visible && section.dataset.customizableSection === 'teacher') {
        const teachingToggle = document.getElementById('teachingModeToggle');
        if (teachingToggle?.checked) {
            teachingToggle.checked = false;
            teachingToggle.dispatchEvent(new Event('change'));
        }
    }

    const sections = [...document.querySelectorAll('[data-customizable-section]')];
    if (save) saveSectionVisibility(sections);
    updateSectionVisibilityStatus(sections);
    updatePracticeSectionNotice();
    drawAll();
}

function saveSectionVisibility(sections) {
    const hiddenSections = sections
        .filter((section) => section.hidden)
        .map((section) => section.dataset.customizableSection);
    try {
        localStorage.setItem(SECTION_VISIBILITY_STORAGE_KEY, JSON.stringify(hiddenSections));
    } catch {
        // The current page still responds even when browser storage is unavailable.
    }
}

function updateSectionVisibilityStatus(sections) {
    const visibleCount = sections.filter((section) => !section.hidden).length;
    const status = document.getElementById('viewVisibilityStatus');
    status.textContent = visibleCount === sections.length
        ? 'All sections shown'
        : `${visibleCount} of ${sections.length} sections shown`;
}

function updatePracticeSectionNotice() {
    const fretboardIsVisible = !document.getElementById('custom-section-fretboard')?.hidden;
    const boardExercises = ['fretboard-note', 'ear-to-fretboard', 'build-scale', 'chord-shape'];
    const activeMode = practiceQuestion?.mode;
    document.getElementById('sectionDependencyNotice').hidden =
        fretboardIsVisible || !boardExercises.includes(activeMode);
}

function setMobileExpandedState(section, expanded) {
    section.classList.toggle('mobile-expanded', expanded);
    if (!expanded) {
        delete section.dataset.nativeFullscreen;
        section.style.removeProperty('--fullscreen-canvas-width');
        section.style.removeProperty('--fullscreen-canvas-height');
    }
    document.body.classList.toggle('mobile-section-expanded', expanded);
    const button = section.querySelector('.section-fullscreen-button');
    if (button) {
        const sectionName = section.dataset.sectionLabel || 'section';
        button.dataset.expanded = String(expanded);
        button.setAttribute('aria-pressed', String(expanded));
        button.querySelector('span').textContent = expanded ? 'Close full screen' : 'Full screen';
        button.setAttribute('aria-label', `${expanded ? 'Close' : 'Open'} ${sectionName} full screen`);
        const icon = button.querySelector('i');
        icon.classList.toggle('fa-expand', !expanded);
        icon.classList.toggle('fa-compress', expanded);
    }
}

// Fit the canvas by its intrinsic aspect ratio inside the actual available viewport area.
function fitFullscreenCanvas(section) {
    if (!section?.classList.contains('mobile-expanded')) return;

    const canvas = section.querySelector('canvas');
    const viewport = section.querySelector('.diagram-scroll');
    if (!canvas || !viewport || !canvas.width || !canvas.height) return;

    const availableWidth = viewport.clientWidth;
    const availableHeight = viewport.clientHeight;
    if (!availableWidth || !availableHeight) return;

    const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
    section.style.setProperty('--fullscreen-canvas-width', `${canvas.width * scale}px`);
    section.style.setProperty('--fullscreen-canvas-height', `${canvas.height * scale}px`);
}

function fitActiveFullscreenCanvas() {
    fitFullscreenCanvas(document.querySelector('.canvas-wrapper.mobile-expanded'));
}

async function closeMobileExpandedSection(section) {
    const isNativeFullscreen = document.fullscreenElement === section || document.webkitFullscreenElement === section;
    if (isNativeFullscreen) {
        try {
            if (document.exitFullscreen) await document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        } catch {
            // The fallback layout still closes even if the browser rejects exitFullscreen.
        }
    }
    setMobileExpandedState(section, false);
    try {
        screen.orientation?.unlock?.();
    } catch {
        // Orientation locking is optional and not supported by every mobile browser.
    }
    drawAll();
}

function initializeMobileSectionExpansion() {
    document.querySelectorAll('.section-fullscreen-button').forEach((button) => {
        const section = button.closest('.canvas-wrapper');
        button.addEventListener('click', async () => {
            if (section.classList.contains('mobile-expanded')) {
                await closeMobileExpandedSection(section);
                return;
            }

            setMobileExpandedState(section, true);
            try {
                if (section.requestFullscreen) {
                    await section.requestFullscreen({ navigationUI: 'hide' });
                } else if (section.webkitRequestFullscreen) {
                    section.webkitRequestFullscreen();
                    section.dataset.nativeFullscreen = 'true';
                }
                if (document.fullscreenElement === section || document.webkitFullscreenElement === section) {
                    section.dataset.nativeFullscreen = 'true';
                }
            } catch {
                // Keep the in-page full-screen layout when native full-screen is unavailable.
            }

            if (window.matchMedia?.('(pointer: coarse)').matches) {
                try {
                    if (screen.orientation?.lock) await screen.orientation.lock('landscape');
                } catch {
                    // Users can rotate the device manually when orientation lock is unavailable.
                }
            }
            section.querySelector('.diagram-scroll')?.focus({ preventScroll: true });
            requestAnimationFrame(() => {
                fitFullscreenCanvas(section);
                drawAll();
            });
        });
    });

    const handleFullscreenChange = () => {
        const expandedSection = document.querySelector('.canvas-wrapper.mobile-expanded');
        if (expandedSection?.dataset.nativeFullscreen === 'true'
            && document.fullscreenElement !== expandedSection
            && document.webkitFullscreenElement !== expandedSection) {
            setMobileExpandedState(expandedSection, false);
            try {
                screen.orientation?.unlock?.();
            } catch {
                // The browser may not expose orientation controls.
            }
            drawAll();
        }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', fitActiveFullscreenCanvas);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            const fallbackSection = document.querySelector('.canvas-wrapper.mobile-expanded');
            if (fallbackSection && !document.fullscreenElement && !document.webkitFullscreenElement) {
                void closeMobileExpandedSection(fallbackSection);
            }
        }
    });
}

window.addEventListener('load', () => {
    initializeToolbarTabs();
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

    initializeTeachingNotes();
    initializePracticeLab();
    initializeLiveInputs();
    initializeSectionVisibility();
    initializeMobileSectionExpansion();
});
