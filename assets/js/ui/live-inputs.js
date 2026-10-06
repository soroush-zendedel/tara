// Optional live note input for classroom demonstrations and exploration.
const COMPUTER_KEYBOARD_STORAGE_KEY = 'tara.computerKeyboardEnabled.v1';
const COMPUTER_KEY_NOTES = new Map([
    // Octave 1: QWERTYU for natural notes, with the number row for sharps.
    ['KeyQ', 60], ['Digit2', 61], ['KeyW', 62], ['Digit3', 63], ['KeyE', 64],
    ['KeyR', 65], ['Digit5', 66], ['KeyT', 67], ['Digit6', 68], ['KeyY', 69],
    ['Digit7', 70], ['KeyU', 71],
    // Octave 2: ZXCVBNM for natural notes; sharps use the home row, leaving A unused.
    ['KeyZ', 72], ['KeyS', 73], ['KeyX', 74], ['KeyD', 75], ['KeyC', 76],
    ['KeyV', 77], ['KeyG', 78], ['KeyB', 79], ['KeyH', 80], ['KeyN', 81],
    ['KeyJ', 82], ['KeyM', 83]
]);

const MINOR_KEY_CODES = new Set([
    'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU',
    'Digit2', 'Digit3', 'Digit5', 'Digit6', 'Digit7'
]);

function isEditableKeyboardTarget(target) {
    return target instanceof HTMLElement && (
        target.isContentEditable || target.matches('textarea, select, [role="textbox"], input:not([type="checkbox"]):not([type="radio"])')
    );
}

function selectLiveInputKey(rootIndex, scaleName) {
    selectedRootIndex = rootIndex;
    selectedScaleName = scaleName;
    document.getElementById('rootSelect').value = String(rootIndex);
    document.getElementById('scaleSelect').value = scaleName;
    currentNotationType = 'scale';
    generateVisuals();
    refreshPracticeForKeyChange();
    recordPlaybackEvent({ title: 'Selected scale', detail: `${getNoteName(rootIndex)} ${scaleName}` });
}

function playLiveInputChord(rootMidi, quality) {
    const root = rootMidi % 12;
    const intervals = quality === 'major' ? [0, 4, 7] : [0, 3, 7];
    const voicings = getVoicings(intervals.map((interval) => (root + interval) % 12));
    const voicing = voicings[0];
    if (!voicing) return;

    currentVoicingNotes = voicing;
    currentNotationType = 'chord';
    activeGuitarMidi.clear();
    voicing.forEach((note) => activeGuitarMidi.add(note.midi));
    playVoicing(voicing, `${getNoteName(root)} ${quality} chord`);
    drawAll();
}

function initializeLiveInputs() {
    const keyboardToggle = document.getElementById('computerKeyboardToggle');
    const midiButton = document.getElementById('midiConnectButton');
    const midiSelect = document.getElementById('midiInputSelect');
    const status = document.getElementById('liveInputStatus');
    if (!keyboardToggle || !midiButton || !midiSelect || !status) return;

    const desktopKeyboardDefault = window.matchMedia('(pointer: fine) and (min-width: 641px)').matches;
    try {
        const savedKeyboardPreference = localStorage.getItem(COMPUTER_KEYBOARD_STORAGE_KEY);
        computerKeyboardEnabled = savedKeyboardPreference === null
            ? desktopKeyboardDefault
            : savedKeyboardPreference === 'true';
    } catch {
        computerKeyboardEnabled = desktopKeyboardDefault;
    }
    keyboardToggle.checked = computerKeyboardEnabled;
    if (computerKeyboardEnabled) status.textContent = 'Computer keyboard ready · C4–B5';

    // Return focus to the app after choosing a key so live keyboard input can resume immediately.
    ['rootSelect', 'scaleSelect'].forEach((id) => {
        document.getElementById(id).addEventListener('change', (event) => {
            if (computerKeyboardEnabled) event.currentTarget.blur();
        });
    });

    function setStatus(message) {
        status.textContent = message;
    }

    function releaseComputerKeys() {
        for (const [code, midi] of computerKeyboardHeld) stopLiveNote('computer', midi);
        computerKeyboardHeld.clear();
    }

    keyboardToggle.addEventListener('change', () => {
        computerKeyboardEnabled = keyboardToggle.checked;
        try {
            localStorage.setItem(COMPUTER_KEYBOARD_STORAGE_KEY, String(computerKeyboardEnabled));
        } catch {
            // Live keyboard input still works for this page when storage is unavailable.
        }
        if (computerKeyboardEnabled) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            setStatus('Computer keyboard ready · C4–B5');
        } else {
            releaseComputerKeys();
            setStatus(connectedMidiInput ? `MIDI: ${connectedMidiInput.name || 'connected'}` : 'Live input off');
        }
    });

    document.addEventListener('keydown', (event) => {
        if (!computerKeyboardEnabled || isEditableKeyboardTarget(event.target)) return;
        if (event.key === 'Alt') event.preventDefault();
        // Prevent the browser from type-to-search on any printable key while live input is enabled.
        if (event.key.length === 1 && event.key !== ' ') event.preventDefault();
        const midi = COMPUTER_KEY_NOTES.get(event.code);
        if (midi === undefined || event.repeat || computerKeyboardHeld.has(event.code)) return;

        if (event.altKey) {
            selectLiveInputKey(midi % 12, MINOR_KEY_CODES.has(event.code) ? 'Minor' : 'Major');
            return;
        }
        if (event.ctrlKey || event.shiftKey) {
            playLiveInputChord(midi, event.ctrlKey ? 'major' : 'minor');
            return;
        }

        computerKeyboardHeld.set(event.code, midi);
        startLiveNote('computer', midi, 0.8);
    });

    document.addEventListener('keyup', (event) => {
        const midi = computerKeyboardHeld.get(event.code);
        if (midi === undefined) return;
        computerKeyboardHeld.delete(event.code);
        stopLiveNote('computer', midi);
    });

    window.addEventListener('blur', releaseComputerKeys);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) releaseComputerKeys();
    });

    function disconnectMidiInput() {
        if (!connectedMidiInput) return;
        connectedMidiInput.onmidimessage = null;
        releaseLiveNotes(`midi:${connectedMidiInput.id}`);
        connectedMidiInput = null;
    }

    function connectMidiInput(input) {
        disconnectMidiInput();
        if (!input) {
            setStatus(midiAccess ? 'No MIDI input selected' : 'Live input off');
            return;
        }
        connectedMidiInput = input;
        input.onmidimessage = (event) => {
            const [statusByte, note, velocity = 0] = event.data;
            const command = statusByte & 0xf0;
            const channel = statusByte & 0x0f;
            const source = `midi:${input.id}:${channel}`;
            if (command === 0x90 && velocity > 0) startLiveNote(source, note, velocity / 127);
            else if (command === 0x80 || (command === 0x90 && velocity === 0)) stopLiveNote(source, note);
        };
        setStatus(`MIDI: ${input.name || 'connected'}`);
    }

    function refreshMidiInputs(preferredId) {
        if (!midiAccess) return;
        const inputs = [...midiAccess.inputs.values()].filter((input) => input.state === 'connected');
        midiSelect.replaceChildren();
        if (!inputs.length) {
            midiSelect.hidden = true;
            disconnectMidiInput();
            setStatus('No MIDI devices found · connect one and refresh');
            return;
        }

        const selectedId = preferredId || connectedMidiInput?.id || inputs[0].id;
        inputs.forEach((input) => {
            const option = document.createElement('option');
            option.value = input.id;
            option.textContent = input.name || `MIDI device ${input.id}`;
            midiSelect.append(option);
        });
        midiSelect.hidden = inputs.length < 2;
        midiSelect.value = inputs.some((input) => input.id === selectedId) ? selectedId : inputs[0].id;
        connectMidiInput(inputs.find((input) => input.id === midiSelect.value));
    }

    midiSelect.addEventListener('change', () => {
        const input = midiAccess?.inputs.get(midiSelect.value);
        connectMidiInput(input);
    });

    midiButton.addEventListener('click', async () => {
        if (!navigator.requestMIDIAccess) {
            setStatus('MIDI input is not supported by this browser');
            return;
        }
        if (!window.isSecureContext) {
            setStatus('MIDI input requires HTTPS or localhost');
            return;
        }
        midiButton.disabled = true;
        setStatus('Requesting MIDI access…');
        try {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            midiAccess = await navigator.requestMIDIAccess();
            midiAccess.onstatechange = () => refreshMidiInputs(connectedMidiInput?.id);
            refreshMidiInputs();
            midiButton.innerHTML = '<i class="fas fa-sync" aria-hidden="true"></i> Refresh MIDI';
        } catch (error) {
            setStatus(error.name === 'NotAllowedError' ? 'MIDI access was denied' : 'Could not access MIDI devices');
        } finally {
            midiButton.disabled = false;
        }
    });
}
