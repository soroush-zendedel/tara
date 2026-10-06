// Keep teacher annotations separate from scale, chord, and practice state.
const TEACHING_NOTES_STORAGE_KEY = 'tara.teachingNotes.v1';
const TEACHING_NOTE_STEP_MS = 650;
const TEACHING_NOTE_HOLD_MS = 450;
const TEACHING_NOTE_ROLES = Object.freeze({
    note: { label: 'Note', marker: 'N', color: '#0c8599' },
    root: { label: 'Root', marker: 'R', color: '#e03131' },
    third: { label: '3rd', marker: '3', color: '#e67700' },
    fifth: { label: '5th', marker: '5', color: '#1971c2' },
    seventh: { label: '7th', marker: '7', color: '#7048e8' }
});
let teachingRedoHistory = [];
let teachingPlaybackIndex = -1;
let teachingPlaybackTimerIds = [];
let teachingPlaybackRunId = 0;
let teachingPlaybackStatusMessage = '';
let teachingHintTimer = null;

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
        if (!teachingModeEnabled) {
            resetTeachingPlaybackState();
            hideTeachingModeHint();
        } else {
            showTeachingModeHint();
        }
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
    document.getElementById('redoTeachingNoteButton').addEventListener('click', redoTeachingNoteChange);
    document.getElementById('clearTeachingNotesButton').addEventListener('click', clearTeachingNotes);

    document.addEventListener('keydown', handleTeachingKeyboardShortcuts);

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
    teachingHistory.push(snapshotTeachingAnnotations());
    if (teachingHistory.length > 50) teachingHistory.shift();
    teachingRedoHistory = [];
}

function stopTeachingSequencePlayback() {
    teachingPlaybackTimerIds.forEach(clearTimeout);
    teachingPlaybackTimerIds = [];
    teachingPlaybackRunId++;
}

function resetTeachingPlaybackState() {
    stopTeachingSequencePlayback();
    teachingPlaybackIndex = -1;
    teachingPlaybackStatusMessage = '';
}

function getTeachingPlaybackLabel(midi) {
    const note = getNoteName(midi % 12);
    const octave = Math.floor(midi / 12) - 1;
    return `${note}${octave}`;
}

function playTeachingAnnotationAt(index, runId, total = teachingAnnotations.length) {
    if (runId !== teachingPlaybackRunId || index < 0 || index >= teachingAnnotations.length) return;
    const annotation = teachingAnnotations[index];
    teachingPlaybackIndex = index;
    const label = getTeachingPlaybackLabel(annotation.midi);
    teachingPlaybackStatusMessage = `Playing marked note ${index + 1} of ${total}: ${label}`;
    updateTeachingNoteControls();

    const source = `teacher-sequence-${runId}-${index}-${Date.now()}`;
    startLiveNote(source, annotation.midi, 0.8, false);
    // Note releases must survive sequence restarts so repeated Enter presses cannot leave voices sounding.
    setTimeout(() => stopLiveNote(source, annotation.midi), TEACHING_NOTE_HOLD_MS);
}

function playTeachingAnnotationSequence() {
    if (!teachingAnnotations.length) {
        teachingPlaybackStatusMessage = 'Mark some notes first, then press Enter to play them in order.';
        updateTeachingNoteControls();
        return;
    }

    stopTeachingSequencePlayback();
    const runId = teachingPlaybackRunId;
    const sequence = teachingAnnotations.map((annotation) => annotation.midi);
    teachingPlaybackIndex = 0;

    sequence.forEach((midi, index) => {
        const timerId = setTimeout(() => {
            if (runId !== teachingPlaybackRunId) return;
            // The copied MIDI list preserves the teacher's original marking order.
            const annotation = teachingAnnotations.find((item, itemIndex) => itemIndex === index && item.midi === midi);
            if (!annotation) return;
            playTeachingAnnotationAt(index, runId, sequence.length);
            if (index === sequence.length - 1) {
                const completeTimer = setTimeout(() => {
                    if (runId !== teachingPlaybackRunId) return;
                    teachingPlaybackStatusMessage = `Sequence complete · ${sequence.length} notes.`;
                    updateTeachingNoteControls();
                }, TEACHING_NOTE_HOLD_MS);
                teachingPlaybackTimerIds.push(completeTimer);
            }
        }, index * TEACHING_NOTE_STEP_MS);
        teachingPlaybackTimerIds.push(timerId);
    });
}

function stepTeachingAnnotation(direction) {
    if (!teachingAnnotations.length) {
        teachingPlaybackStatusMessage = 'Mark some notes first to step through them.';
        updateTeachingNoteControls();
        return;
    }

    stopTeachingSequencePlayback();
    const index = teachingPlaybackIndex < 0
        ? (direction > 0 ? 0 : teachingAnnotations.length - 1)
        : Math.max(0, Math.min(teachingAnnotations.length - 1, teachingPlaybackIndex + direction));
    playTeachingAnnotationAt(index, teachingPlaybackRunId);
}

function isTeachingShortcutTarget(target) {
    return target instanceof Element
        && Boolean(target.closest('input, select, textarea, button, a, [contenteditable="true"]'));
}

function handleTeachingKeyboardShortcuts(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.shiftKey && event.key === 'Enter' && !isTeachingShortcutTarget(event.target)) {
        event.preventDefault();
        if (!event.repeat) toggleMetronome();
        return;
    }

    const isTempoInput = event.target instanceof Element && event.target.closest('#bpmInput');
    if (isMetroPlaying && (event.key === 'ArrowUp' || event.key === 'ArrowDown')
        && (!isTeachingShortcutTarget(event.target) || isTempoInput)) {
        event.preventDefault();
        adjustTempo(event.key === 'ArrowUp' ? 5 : -5);
        return;
    }

    if ((event.key === 'PageUp' || event.key === 'PageDown')
        && (!isTeachingShortcutTarget(event.target) || isTempoInput)) {
        event.preventDefault();
        adjustTempo(event.key === 'PageUp' ? 5 : -5);
        return;
    }

    if (event.code === 'NumLock' && !event.getModifierState('NumLock') && !isTeachingShortcutTarget(event.target)) {
        event.preventDefault();
        setPos('all');
        return;
    }

    if (isTeachingShortcutTarget(event.target)) return;

    const positionKey = /^Numpad([0-5])$/.exec(event.code);
    if (event.key === 'Insert' || event.code === 'Insert') {
        event.preventDefault();
        if (!event.repeat) toggleTeachingModeFromKeyboard();
        return;
    }
    if (positionKey) {
        event.preventDefault();
        if (!event.repeat) {
            const numLockOn = event.getModifierState('NumLock');
            setPos(positionKey[1] === '0' || !numLockOn ? 'all' : Number(positionKey[1]));
        }
        return;
    }
    if (event.code === 'NumpadAdd' || event.code === 'NumpadSubtract') {
        event.preventDefault();
        if (!event.repeat) cycleFretboardPosition(event.code === 'NumpadAdd' ? 1 : -1);
        return;
    }

    if (!teachingModeEnabled) return;
    const actions = {
        Enter: () => playTeachingAnnotationSequence(),
        ArrowRight: () => stepTeachingAnnotation(1),
        ArrowLeft: () => stepTeachingAnnotation(-1),
        ArrowDown: () => undoTeachingNoteChange(),
        ArrowUp: () => redoTeachingNoteChange(),
        Delete: () => resetTeachingSettings()
    };
    const action = actions[event.code === 'Enter' ? 'Enter' : event.key];
    if (!action) return;
    event.preventDefault();
    if (event.repeat && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    action();
}

function toggleTeachingModeFromKeyboard() {
    const toggle = document.getElementById('teachingModeToggle');
    toggle.checked = !toggle.checked;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
}

function showTeachingModeHint() {
    const hint = document.getElementById('teachingModeHint');
    if (!hint) return;
    window.clearTimeout(teachingHintTimer);
    hint.hidden = false;
    requestAnimationFrame(() => hint.classList.add('is-visible'));
    teachingHintTimer = window.setTimeout(hideTeachingModeHint, 4200);
}

function hideTeachingModeHint() {
    const hint = document.getElementById('teachingModeHint');
    if (!hint) return;
    window.clearTimeout(teachingHintTimer);
    hint.classList.remove('is-visible');
    teachingHintTimer = window.setTimeout(() => { hint.hidden = true; }, 250);
}

function cycleFretboardPosition(direction) {
    const nextPosition = currentPos === 'all'
        ? (direction > 0 ? 1 : 5)
        : ((Number(currentPos) - 1 + direction + 5) % 5) + 1;
    setPos(nextPosition);
}

function snapshotTeachingAnnotations() {
    return teachingAnnotations.map((annotation) => ({
        ...annotation,
        position: annotation.position ? { ...annotation.position } : null
    }));
}

function updateTeachingNoteControls() {
    const undoButton = document.getElementById('undoTeachingNoteButton');
    const redoButton = document.getElementById('redoTeachingNoteButton');
    const clearButton = document.getElementById('clearTeachingNotesButton');
    const status = document.getElementById('teachingNotesStatus');
    if (!undoButton || !redoButton || !clearButton || !status) return;

    undoButton.disabled = teachingHistory.length === 0;
    redoButton.disabled = teachingRedoHistory.length === 0;
    clearButton.disabled = teachingAnnotations.length === 0;
    const count = teachingAnnotations.length;
    if (teachingPlaybackStatusMessage) {
        status.textContent = teachingPlaybackStatusMessage;
    } else if (teachingModeEnabled) {
        status.textContent = `Teaching Mode is on. Click or play notes to mark them${count ? ` · ${count} saved` : ''}. Computer/MIDI keys and chord tones are included; fretboard exercise clicks edit markers until Teaching Mode is off.`;
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

function applyTeachingAnnotationToggle(midi, position = null) {
    const matchesGroup = (annotation) => annotationMatchesMidi(annotation, midi);
    const groupMatches = teachingAnnotations.filter(matchesGroup);

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
}

function toggleTeachingAnnotation(midi, position = null) {
    resetTeachingPlaybackState();
    pushTeachingHistory();
    applyTeachingAnnotationToggle(midi, position);
    saveTeachingNotes();
    updateTeachingNoteControls();
    drawAll();
}

function applyTeachingAnnotationMark(midi) {
    const matchesGroup = (annotation) => annotationMatchesMidi(annotation, midi);
    const groupMatches = teachingAnnotations.filter(matchesGroup);
    if (groupMatches.length) {
        if (groupMatches.every((annotation) => annotation.role === selectedTeachingRole)) return false;
        teachingAnnotations = teachingAnnotations.map((annotation) => matchesGroup(annotation)
            ? { ...annotation, role: selectedTeachingRole }
            : annotation);
        return true;
    }
    teachingAnnotations.push({ midi, role: selectedTeachingRole, position: null });
    return true;
}

function markTeachingAnnotations(midiNotes) {
    const uniqueNotes = [...new Set(midiNotes)].filter((midi) => Number.isInteger(midi));
    const seenPitchGroups = new Set();
    const notesToMark = uniqueNotes.filter((midi) => {
        const key = matchTeachingOctaves ? midi % 12 : midi;
        if (seenPitchGroups.has(key)) return false;
        seenPitchGroups.add(key);
        return true;
    });
    const previous = snapshotTeachingAnnotations();
    const changed = notesToMark.reduce((didChange, midi) => applyTeachingAnnotationMark(midi) || didChange, false);
    if (!changed) return;

    resetTeachingPlaybackState();
    teachingHistory.push(previous);
    if (teachingHistory.length > 50) teachingHistory.shift();
    teachingRedoHistory = [];
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
    playGuitarNote(midiToFreq(found.midi), 0, 1.2, true, false);
    toggleTeachingAnnotation(found.midi, position);
    return true;
}

function undoTeachingNoteChange() {
    const previous = teachingHistory.pop();
    if (!previous) return;
    resetTeachingPlaybackState();
    teachingRedoHistory.push(snapshotTeachingAnnotations());
    if (teachingRedoHistory.length > 50) teachingRedoHistory.shift();
    teachingAnnotations = previous;
    if (teachingHistory.length > 50) teachingHistory.shift();
    saveTeachingNotes();
    updateTeachingNoteControls();
    drawAll();
}

function redoTeachingNoteChange() {
    const next = teachingRedoHistory.pop();
    if (!next) return;
    resetTeachingPlaybackState();
    teachingHistory.push(snapshotTeachingAnnotations());
    if (teachingHistory.length > 50) teachingHistory.shift();
    teachingAnnotations = next;
    saveTeachingNotes();
    updateTeachingNoteControls();
    drawAll();
}

function clearTeachingNotes() {
    if (!teachingAnnotations.length) return;
    resetTeachingPlaybackState();
    pushTeachingHistory();
    teachingAnnotations = [];
    saveTeachingNotes();
    updateTeachingNoteControls();
    drawAll();
}

function resetTeachingSettings() {
    resetTeachingPlaybackState();
    teachingAnnotations = [];
    teachingHistory = [];
    teachingRedoHistory = [];
    showTeachingAnnotations = true;
    matchTeachingOctaves = false;
    selectedTeachingRole = 'note';
    teachingModeEnabled = false;
    hideTeachingModeHint();

    const modeToggle = document.getElementById('teachingModeToggle');
    if (modeToggle) modeToggle.checked = false;
    document.getElementById('showTeachingNotesToggle').checked = true;
    document.getElementById('matchTeachingOctavesToggle').checked = false;
    document.getElementById('teachingRoleSelect').value = 'note';
    saveTeachingNotes();
    updateTeachingNoteControls();
    drawAll();
}
