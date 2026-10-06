// Show recent selections and sounds in a short-lived sticky playback dock.
const PLAYBACK_ENTRY_LIFETIME_MS = 6000;
const PLAYBACK_MAX_ENTRIES = 18;
let playbackEntries = [];
let playbackHideTimer = null;

function getPlaybackNoteLabel(midi) {
    return `${getNoteName(midi % 12)}${Math.floor(midi / 12) - 1}`;
}

function renderPlaybackSequence() {
    const sequenceList = document.getElementById('playbackSequence');
    if (!sequenceList) return;
    sequenceList.replaceChildren(...playbackEntries.map((entry) => {
        const item = document.createElement('li');
        item.textContent = entry.label;
        return item;
    }));
}

function expirePlaybackEntries() {
    const now = Date.now();
    playbackEntries = playbackEntries.filter((entry) => entry.expiresAt > now);
    renderPlaybackSequence();
    if (playbackEntries.length) {
        const nextExpiry = Math.min(...playbackEntries.map((entry) => entry.expiresAt));
        playbackHideTimer = window.setTimeout(expirePlaybackEntries, Math.max(0, nextExpiry - Date.now()));
        return;
    }

    document.getElementById('playbackDock').hidden = true;
    document.body.classList.remove('playback-dock-visible');
    document.getElementById('playbackCurrent').textContent = 'Nothing played recently';
    document.getElementById('playbackDetails').textContent = '';
}

function recordPlaybackEvent({ title, detail = '', sequence = [] }) {
    const dock = document.getElementById('playbackDock');
    const current = document.getElementById('playbackCurrent');
    const details = document.getElementById('playbackDetails');
    const sequenceList = document.getElementById('playbackSequence');
    if (!dock || !current || !details || !sequenceList) return;

    const now = Date.now();
    playbackEntries = playbackEntries.filter((entry) => entry.expiresAt > now);
    const labels = sequence.length ? sequence : [title];
    labels.forEach((label) => playbackEntries.push({
        id: `${now}-${Math.random().toString(36).slice(2)}`,
        label,
        expiresAt: now + PLAYBACK_ENTRY_LIFETIME_MS
    }));
    playbackEntries = playbackEntries.slice(-PLAYBACK_MAX_ENTRIES);

    current.textContent = title;
    details.textContent = detail;
    renderPlaybackSequence();

    dock.hidden = false;
    document.body.classList.add('playback-dock-visible');
    window.clearTimeout(playbackHideTimer);
    const nextExpiry = Math.min(...playbackEntries.map((entry) => entry.expiresAt));
    playbackHideTimer = window.setTimeout(expirePlaybackEntries, Math.max(0, nextExpiry - Date.now()));
}

function recordPlaybackNote(midi) {
    const label = getPlaybackNoteLabel(midi);
    recordPlaybackEvent({ title: `Played note ${label}`, detail: label, sequence: [label] });
}

function initializePlaybackDock() {
    const dismissButton = document.getElementById('playbackDockDismiss');
    if (!dismissButton) return;
    dismissButton.addEventListener('click', () => {
        window.clearTimeout(playbackHideTimer);
        playbackEntries = [];
        document.getElementById('playbackSequence').replaceChildren();
        document.getElementById('playbackDock').hidden = true;
        document.body.classList.remove('playback-dock-visible');
    });
}

window.addEventListener('load', initializePlaybackDock);
