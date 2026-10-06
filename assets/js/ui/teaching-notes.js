// Keep teacher annotations separate from scale, chord, and practice state.
const TEACHING_NOTES_STORAGE_KEY = 'tara.teachingNotes.v1';
const TEACHING_NOTE_ROLES = Object.freeze({
    note: { label: 'Note', marker: 'N', color: '#0c8599' },
    root: { label: 'Root', marker: 'R', color: '#e03131' },
    third: { label: '3rd', marker: '3', color: '#e67700' },
    fifth: { label: '5th', marker: '5', color: '#1971c2' },
    seventh: { label: '7th', marker: '7', color: '#7048e8' }
});

function getTeachingRole(role) {
    return TEACHING_NOTE_ROLES[role] || TEACHING_NOTE_ROLES.note;
}

function normalizeTeachingAnnotation(annotation) {
    if (!annotation || !Number.isInteger(annotation.midi) || annotation.midi < 0 || annotation.midi > 127) return null;

    const role = Object.prototype.hasOwnProperty.call(TEACHING_NOTE_ROLES, annotation.role) ? annotation.role : 'note';
    let position = null;
    if (annotation.position) {
        const { string, fret } = annotation.position;
        if (!Number.isInteger(string) || string < 0 || string > 5
            || !Number.isInteger(fret) || fret < 0 || fret > 24
            || OPEN_STRING_MIDI[5 - string] + fret !== annotation.midi) return null;
        position = { string, fret };
    }

    return { midi: annotation.midi, role, position };
}

function initializeTeachingNotes() {
    try {
        const saved = JSON.parse(localStorage.getItem(TEACHING_NOTES_STORAGE_KEY));
        if (saved && typeof saved === 'object') {
            teachingAnnotations = Array.isArray(saved.annotations)
                ? saved.annotations.map(normalizeTeachingAnnotation).filter(Boolean)
                : [];
            showTeachingAnnotations = saved.visible !== false;
            matchTeachingOctaves = saved.matchOctaves === true;
            selectedTeachingRole = Object.prototype.hasOwnProperty.call(TEACHING_NOTE_ROLES, saved.role) ? saved.role : 'note';
        }
    } catch {
        // Annotations remain available for the current session when storage is unavailable.
    }

    document.getElementById('teachingModeToggle').addEventListener('change', (event) => {
        teachingModeEnabled = event.target.checked;
        updateTeachingNoteControls();
        drawAll();
    });
    document.getElementById('showTeachingNotesToggle').addEventListener('change', (event) => {
        showTeachingAnnotations = event.target.checked;
        saveTeachingNotes();
        updateTeachingNoteControls();
        drawAll();
    });
    document.getElementById('matchTeachingOctavesToggle').addEventListener('change', (event) => {
        matchTeachingOctaves = event.target.checked;
        saveTeachingNotes();
        updateTeachingNoteControls();
        drawAll();
    });
    document.getElementById('teachingRoleSelect').addEventListener('change', (event) => {
        selectedTeachingRole = event.target.value;
        saveTeachingNotes();
        updateTeachingNoteControls();
    });
    document.getElementById('undoTeachingNoteButton').addEventListener('click', undoTeachingNoteChange);
    document.getElementById('clearTeachingNotesButton').addEventListener('click', clearTeachingNotes);

    document.getElementById('showTeachingNotesToggle').checked = showTeachingAnnotations;
    document.getElementById('matchTeachingOctavesToggle').checked = matchTeachingOctaves;
    document.getElementById('teachingRoleSelect').value = selectedTeachingRole;
    updateTeachingNoteControls();
    drawAll();
}

function saveTeachingNotes() {
    try {
        localStorage.setItem(TEACHING_NOTES_STORAGE_KEY, JSON.stringify({
            annotations: teachingAnnotations,
            visible: showTeachingAnnotations,
            matchOctaves: matchTeachingOctaves,
            role: selectedTeachingRole
        }));
    } catch {
        // Keep the current in-memory annotations if browser storage is full or disabled.
    }
}

function pushTeachingHistory() {
    teachingHistory.push(teachingAnnotations.map((annotation) => ({
        ...annotation,
        position: annotation.position ? { ...annotation.position } : null
    })));
    if (teachingHistory.length > 50) teachingHistory.shift();
}

function updateTeachingNoteControls() {
    const undoButton = document.getElementById('undoTeachingNoteButton');
    const clearButton = document.getElementById('clearTeachingNotesButton');
    const status = document.getElementById('teachingNotesStatus');
    if (!undoButton || !clearButton || !status) return;

    undoButton.disabled = teachingHistory.length === 0;
    clearButton.disabled = teachingAnnotations.length === 0;
    const count = teachingAnnotations.length;
    if (teachingModeEnabled) {
        status.textContent = `Teaching Mode is on. Click a guitar position or piano key to mark it${count ? ` · ${count} saved` : ''}. Notes still play; fretboard exercise clicks edit markers until Teaching Mode is off.`;
    } else if (count) {
        status.textContent = `${count} teaching note${count === 1 ? '' : 's'} saved on this device. Turn on Teaching Mode to add or remove notes.`;
    } else {
        status.textContent = 'Turn on Teaching Mode, then click notes on the fretboard or piano to mark them.';
    }
}

function annotationMatchesMidi(annotation, midi) {
    return matchTeachingOctaves ? annotation.midi % 12 === midi % 12 : annotation.midi === midi;
}

function getTeachingAnnotationForMidi(midi) {
    if (!showTeachingAnnotations) return null;
    return teachingAnnotations.find((annotation) => annotationMatchesMidi(annotation, midi)) || null;
}

function getTeachingFretboardMarkers() {
    if (!showTeachingAnnotations) return [];

    const markersByPosition = new Map();
    for (let string = 0; string < 6; string++) {
        for (let fret = 0; fret <= 24; fret++) {
            const midi = OPEN_STRING_MIDI[5 - string] + fret;
            const annotation = teachingAnnotations.find((candidate) => {
                if (!annotationMatchesMidi(candidate, midi)) return false;
                if (matchTeachingOctaves || !candidate.position) return true;
                return candidate.position.string === string && candidate.position.fret === fret;
            });
            if (annotation) markersByPosition.set(`${string}:${fret}`, { string, fret, midi, role: annotation.role });
        }
    }
    return [...markersByPosition.values()];
}

function toggleTeachingAnnotation(midi, position = null) {
    const matchesGroup = (annotation) => annotationMatchesMidi(annotation, midi);
    const groupMatches = teachingAnnotations.filter(matchesGroup);

    pushTeachingHistory();
    if (matchTeachingOctaves && groupMatches.length) {
        if (groupMatches.every((annotation) => annotation.role === selectedTeachingRole)) {
            teachingAnnotations = teachingAnnotations.filter((annotation) => !matchesGroup(annotation));
        } else {
            teachingAnnotations = teachingAnnotations.map((annotation) => matchesGroup(annotation)
                ? { ...annotation, role: selectedTeachingRole }
                : annotation);
        }
    } else if (position) {
        const exactIndex = teachingAnnotations.findIndex((annotation) => annotation.midi === midi
            && annotation.position?.string === position.string
            && annotation.position?.fret === position.fret);
        if (exactIndex >= 0) {
            if (teachingAnnotations[exactIndex].role === selectedTeachingRole) teachingAnnotations.splice(exactIndex, 1);
            else teachingAnnotations[exactIndex] = { ...teachingAnnotations[exactIndex], role: selectedTeachingRole };
        } else {
            const genericIndex = teachingAnnotations.findIndex((annotation) => annotation.midi === midi && !annotation.position);
            const next = { midi, role: selectedTeachingRole, position: { ...position } };
            if (genericIndex >= 0) teachingAnnotations.splice(genericIndex, 1, next);
            else teachingAnnotations.push(next);
        }
    } else if (groupMatches.length) {
        if (groupMatches.every((annotation) => annotation.role === selectedTeachingRole)) {
            teachingAnnotations = teachingAnnotations.filter((annotation) => !matchesGroup(annotation));
        } else {
            teachingAnnotations = teachingAnnotations.map((annotation) => matchesGroup(annotation)
                ? { ...annotation, role: selectedTeachingRole }
                : annotation);
        }
    } else {
        teachingAnnotations.push({ midi, role: selectedTeachingRole, position: null });
    }

    saveTeachingNotes();
    updateTeachingNoteControls();
    drawAll();
}

function handleTeachingNoteClick(canvas, found) {
    if (!teachingModeEnabled || !found?.midi) return false;

    let position = null;
    if (canvas.id === 'fretboardCanvas' && found.type === 'note') {
        position = { string: found.s, fret: found.f };
    } else if (canvas.id !== 'pianoCanvas' || found.type !== 'pianoKey') {
        return false;
    }

    if (audioCtx.state === 'suspended') audioCtx.resume();
    playGuitarNote(midiToFreq(found.midi));
    toggleTeachingAnnotation(found.midi, position);
    return true;
}

function undoTeachingNoteChange() {
    const previous = teachingHistory.pop();
    if (!previous) return;
    teachingAnnotations = previous;
    saveTeachingNotes();
    updateTeachingNoteControls();
    drawAll();
}

function clearTeachingNotes() {
    if (!teachingAnnotations.length) return;
    pushTeachingHistory();
    teachingAnnotations = [];
    saveTeachingNotes();
    updateTeachingNoteControls();
    drawAll();
}
