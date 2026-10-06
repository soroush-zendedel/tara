// Wire page controls after the app has initialized its canvases and selectors.
const SECTION_VISIBILITY_STORAGE_KEY = 'tara.visibleSections.v1';

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

    const toggle = document.querySelector(`input[aria-controls="${section.id}"]`);
    if (toggle) toggle.checked = visible;

    if (!visible && section.dataset.customizableSection === 'practice') {
        stopPracticeMicrophone();
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
    initializeSectionVisibility();
    initializeMobileSectionExpansion();
});
