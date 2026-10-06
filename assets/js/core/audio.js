// Create short synthesized guitar notes and schedule the metronome.
function playGuitarNote(frequency, startTime = 0, duration = 1.2, reportPlayback = true, updateTeacherNotes = teachingModeEnabled) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const midiNote = Math.round(69 + 12 * Math.log2(frequency / 440));
    if (updateTeacherNotes) markTeachingAnnotations([midiNote]);

    if (reportPlayback) {
        if (startTime > 0) window.setTimeout(() => recordPlaybackNote(midiNote), startTime * 1000);
        else recordPlaybackNote(midiNote);
    }

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

// Keep live keyboard and MIDI notes sounding until their input sends a release.
function startLiveNote(source, midiNote, velocity = 0.8, updateTeacherNotes = teachingModeEnabled) {
    const key = `${source}:${midiNote}`;
    const existing = liveNoteVoices.get(key);
    if (existing) return;

    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(440 * Math.pow(2, (midiNote - 69) / 12), now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(Math.max(0.04, Math.min(1, velocity)) * 0.42, now + 0.012);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start(now);

    const voice = { oscillator, gain, releasing: false, midiNote };
    liveNoteVoices.set(key, voice);
    liveInputMidiCounts.set(midiNote, (liveInputMidiCounts.get(midiNote) || 0) + 1);
    liveInputMidi.add(midiNote);
    if (updateTeacherNotes) markTeachingAnnotations([midiNote]);
    recordPlaybackNote(midiNote);
    drawAll();
}

function stopLiveNote(source, midiNote) {
    const key = `${source}:${midiNote}`;
    const voice = liveNoteVoices.get(key);
    if (!voice || voice.releasing) return;
    voice.releasing = true;
    const now = audioCtx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, 0.035);
    voice.oscillator.stop(now + 0.16);
    window.setTimeout(() => {
        if (liveNoteVoices.get(key) !== voice) return;
        liveNoteVoices.delete(key);
        const count = (liveInputMidiCounts.get(midiNote) || 1) - 1;
        if (count > 0) liveInputMidiCounts.set(midiNote, count);
        else {
            liveInputMidiCounts.delete(midiNote);
            liveInputMidi.delete(midiNote);
        }
        drawAll();
    }, 180);
}

function releaseLiveNotes(sourcePrefix) {
    for (const key of liveNoteVoices.keys()) {
        const separator = key.lastIndexOf(':');
        const source = key.slice(0, separator);
        const midiNote = Number(key.slice(separator + 1));
        if (!sourcePrefix || source === sourcePrefix || source.startsWith(`${sourcePrefix}:`)) {
            stopLiveNote(source, midiNote);
        }
    }
}

function playVoicing(voicing, chordLabel = 'Chord') {
    const noteLabels = voicing.map((note) => getPlaybackNoteLabel(note.midi));
    if (teachingModeEnabled) markTeachingAnnotations(voicing.map((note) => note.midi));
    recordPlaybackEvent({
        title: `Played ${chordLabel}`,
        detail: `Chord tones: ${noteLabels.join(' · ')}`,
        sequence: [chordLabel]
    });
    voicing.forEach((note, index) => playGuitarNote(note.freq, index * 0.03, 1.5, false, false));
}

function playProgression(sequence, progressionLabel = 'Progression') {
    const chordDuration = (60 / bpm) * 2;
    const chordLabels = sequence.map((chord) => chord.label || 'Chord');
    if (teachingModeEnabled) {
        const midiNotes = sequence.flatMap((chord) => chord.notes.map((note) => Math.round(69 + 12 * Math.log2(note.freq / 440))));
        markTeachingAnnotations(midiNotes);
    }
    recordPlaybackEvent({
        title: `Playing ${progressionLabel}`,
        detail: chordLabels.join(' → '),
        sequence: chordLabels
    });
    sequence.forEach((chord, chordIndex) => {
        chord.notes.forEach((note, noteIndex) => {
            playGuitarNote(note.freq, chordIndex * chordDuration + noteIndex * 0.04, 1.2, false, false);
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
        const beat = document.getElementById('metroBeatVisual');
        if (beat) {
            beat.classList.add('is-beating');
            window.setTimeout(() => beat.classList.remove('is-beating'), 140);
        }
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
        document.getElementById('metroBeatVisual')?.classList.remove('is-beating');
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

function adjustTempo(amount) {
    const input = document.getElementById('bpmInput');
    const currentValue = Number.parseInt(input.value, 10);
    input.value = String((Number.isFinite(currentValue) ? currentValue : bpm) + amount);
    updateBPM();
}
