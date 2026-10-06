// Create short synthesized guitar notes and schedule the metronome.
function playGuitarNote(frequency, startTime = 0, duration = 1.2) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const startAt = audioCtx.currentTime + startTime;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, startAt);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(0.5, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration);
}

function playVoicing(voicing) {
    voicing.forEach((note, index) => playGuitarNote(note.freq, index * 0.03, 1.5));
}

function playProgression(sequence) {
    const chordDuration = (60 / bpm) * 2;
    sequence.forEach((chord, chordIndex) => {
        chord.notes.forEach((note, noteIndex) => {
            playGuitarNote(note.freq, chordIndex * chordDuration + noteIndex * 0.04);
        });
    });
}

function nextNote() {
    nextNoteTime += 60 / bpm;
}

function scheduleVisual(time) {
    const delay = Math.max(0, (time - audioCtx.currentTime) * 1000);
    window.setTimeout(() => {
        const light = document.getElementById('metroLight');
        if (!light) return;
        light.classList.add('flash');
        window.setTimeout(() => light.classList.remove('flash'), 100);
    }, delay);
}

function playClick(time) {
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.frequency.value = 1200;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(1, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    oscillator.start(time);
    oscillator.stop(time + 0.05);
}

function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
        playClick(nextNoteTime);
        scheduleVisual(nextNoteTime);
        nextNote();
    }
    timerID = window.setTimeout(scheduler, 25);
}

function toggleMetronome() {
    const button = document.getElementById('metroBtn');
    if (isMetroPlaying) {
        isMetroPlaying = false;
        window.clearTimeout(timerID);
        button.innerText = 'Start';
        button.classList.remove('playing');
        return;
    }

    if (audioCtx.state === 'suspended') audioCtx.resume();
    isMetroPlaying = true;
    nextNoteTime = audioCtx.currentTime + 0.05;
    scheduler();
    button.innerText = 'Stop';
    button.classList.add('playing');
}

function updateBPM() {
    const input = document.getElementById('bpmInput');
    const parsedValue = Number.parseInt(input.value, 10);
    bpm = Number.isFinite(parsedValue) ? Math.min(240, Math.max(40, parsedValue)) : 100;
    input.value = bpm;
}
