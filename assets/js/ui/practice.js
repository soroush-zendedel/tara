// Build exercises and short lessons from the app's music data and standard guitar tuning.
var practiceQuestion = null;
var practiceStats = loadPracticeStats();
var practiceMicStream = null;
var practiceMicSource = null;
var practiceMicAnalyser = null;
var practiceMicRafId = null;

const PRACTICE_STORAGE_KEY = 'tara.practice.v1';
const INTERVAL_NAMES = {
    1: 'Minor 2nd', 2: 'Major 2nd', 3: 'Minor 3rd', 4: 'Major 3rd',
    5: 'Perfect 4th', 6: 'Tritone', 7: 'Perfect 5th', 8: 'Minor 6th',
    9: 'Major 6th', 10: 'Minor 7th', 11: 'Major 7th', 12: 'Octave'
};
const PRACTICE_CHORDS = [
    { name: 'Major', suffix: '', intervals: [0, 4, 7], formula: 'root, major 3rd, perfect 5th' },
    { name: 'Minor', suffix: 'm', intervals: [0, 3, 7], formula: 'root, minor 3rd, perfect 5th' },
    { name: 'Diminished', suffix: 'dim', intervals: [0, 3, 6], formula: 'root, minor 3rd, diminished 5th' }
];
const GUITAR_STRING_LABELS = ['Low E', 'A', 'D', 'G', 'B', 'High E'];

function loadPracticeStats() {
    try {
        const saved = JSON.parse(localStorage.getItem('tara.practice.v1'));
        return {
            correct: Number(saved?.correct) || 0,
            tried: Number(saved?.tried) || 0,
            streak: Number(saved?.streak) || 0
        };
    } catch {
        return { correct: 0, tried: 0, streak: 0 };
    }
}

function savePracticeStats() {
    try {
        localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(practiceStats));
    } catch {
        // Exercises still work when browser storage is disabled.
    }
}

function updatePracticeScore() {
    document.getElementById('practiceScore').innerText =
        `Correct: ${practiceStats.correct} · Tried: ${practiceStats.tried} · Streak: ${practiceStats.streak}`;
}

function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function shuffled(items) {
    return [...items].sort(() => Math.random() - 0.5);
}

function makeChoices(correct, pool, count = 4) {
    const distractors = shuffled([...new Set(pool.filter((item) => item !== correct))]).slice(0, count - 1);
    return shuffled([correct, ...distractors]);
}

function ordinal(number) {
    const endings = ['th', 'st', 'nd', 'rd'];
    const remainder = number % 100;
    return `${number}${endings[(remainder - 20) % 10] || endings[remainder] || endings[0]}`;
}

function getChordQuality(third, fifth) {
    const thirdDistance = (third - 0 + 12) % 12;
    const fifthDistance = (fifth - 0 + 12) % 12;
    if (thirdDistance === 4 && fifthDistance === 7) return { name: 'Major', suffix: '' };
    if (thirdDistance === 3 && fifthDistance === 7) return { name: 'Minor', suffix: 'm' };
    if (thirdDistance === 3 && fifthDistance === 6) return { name: 'Diminished', suffix: 'dim' };
    if (thirdDistance === 4 && fifthDistance === 8) return { name: 'Augmented', suffix: 'aug' };
    if (thirdDistance === 2 && fifthDistance === 7) return { name: 'Suspended 2nd', suffix: 'sus2' };
    if (thirdDistance === 5 && fifthDistance === 7) return { name: 'Suspended 4th', suffix: 'sus4' };
    return { name: 'Other', suffix: '?' };
}

function getDiatonicTriad(degreeIndex, notes) {
    const root = notes[degreeIndex];
    const third = notes[(degreeIndex + 2) % notes.length];
    const fifth = notes[(degreeIndex + 4) % notes.length];
    const quality = getChordQuality(third - root, fifth - root);
    return { root, third, fifth, quality };
}

function buildPracticeQuestion(mode) {
    // Refresh enharmonic spelling so generated answers follow the selected key.
    getScaleData();

    if (mode === 'fretboard-note' || mode === 'ear-to-fretboard' || mode === 'mic-note') {
        const pitchClass = Math.floor(Math.random() * 12);
        const note = getNoteName(pitchClass);
        const prompts = {
            'fretboard-note': `Find any ${note} on the fretboard. Click one of its positions.`,
            'ear-to-fretboard': 'Listen to the note, then find that pitch anywhere on the fretboard.',
            'mic-note': `Play ${note} on your guitar, then use the microphone to check it.`
        };
        return {
            mode,
            targetPitchClass: pitchClass,
            answer: note,
            midi: 60 + pitchClass,
            prompt: prompts[mode],
            explanation: `${note} is the target pitch class. Guitar notes repeat at different strings and frets; fret 12 repeats each open-string note one octave higher.`
        };
    }

    if (mode === 'build-scale') {
        const stringIndex = Math.floor(Math.random() * 6);
        const intervals = VALID_SCALES[selectedScaleName];
        const openMidi = OPEN_STRING_MIDI[stringIndex];
        const scaleNotes = new Set(getScaleData());
        const targetFrets = new Set();
        for (let fret = 0; fret <= 12; fret++) {
            if (scaleNotes.has((openMidi + fret) % 12)) targetFrets.add(fret);
        }
        return {
            mode,
            stringIndex,
            targetFrets,
            selectedFrets: new Set(),
            prompt: `Select every ${selectedScaleName} note on the ${GUITAR_STRING_LABELS[stringIndex]} string from fret 0 to fret 12, then check your answer.`,
            explanation: `${selectedScaleName} contains the pitch classes ${[...scaleNotes].map(getNoteName).join(', ')}. On one string, each fret advances one semitone; fret 12 repeats the open-string pitch one octave higher.`
        };
    }

    if (mode === 'scale-degree') {
        const scaleNotes = getScaleData();
        const degreeIndex = Math.floor(Math.random() * scaleNotes.length);
        const note = getNoteName(scaleNotes[degreeIndex]);
        const semitones = VALID_SCALES[selectedScaleName][degreeIndex];
        return {
            mode,
            answer: note,
            choices: makeChoices(note, CHROMATIC_SHARP.map((_, index) => getNoteName(index))),
            prompt: `In ${getNoteName(selectedRootIndex)} ${selectedScaleName}, what is the ${ordinal(degreeIndex + 1)} scale degree?`,
            explanation: `The ${ordinal(degreeIndex + 1)} degree is ${note}, ${semitones} semitone${semitones === 1 ? '' : 's'} above the tonic in this scale.`
        };
    }

    if (mode === 'chord-quality' || mode === 'ear-chord') {
        const chord = randomItem(PRACTICE_CHORDS);
        const notes = chord.intervals.map((interval) => getNoteName((selectedRootIndex + interval) % 12));
        return {
            mode,
            answer: chord.name,
            chordIntervals: chord.intervals,
            choices: shuffled(PRACTICE_CHORDS.map((item) => item.name)),
            prompt: mode === 'ear-chord'
                ? 'Listen to the chord, then choose its quality.'
                : `What is the quality of the ${getNoteName(selectedRootIndex)} chord made from ${notes.join(' – ')}?`,
            explanation: `${chord.name} triads use ${chord.formula}. The notes shown are ${chord.intervals.join(', ')} semitones above the root.`
        };
    }

    if (mode === 'chord-shape') {
        const chord = randomItem(PRACTICE_CHORDS);
        const triad = chord.intervals.map((interval) => (selectedRootIndex + interval) % 12);
        const validVoicings = getVoicings(triad).filter((voicing) => {
            const pitches = voicing.map((note) => note.idx);
            return triad.every((pitch) => pitches.includes(pitch)) && pitches.every((pitch) => triad.includes(pitch));
        });
        if (!validVoicings.length) {
            const rootOnSixth = (selectedRootIndex - 4 + 12) % 12;
            const rootOnFifth = (selectedRootIndex - 9 + 12) % 12;
            [buildVoicing(0, rootOnSixth, triad), buildVoicing(1, rootOnFifth, triad)].filter(Boolean).forEach((shape) => {
                const pitches = shape.map((note) => note.idx);
                if (triad.every((pitch) => pitches.includes(pitch)) && pitches.every((pitch) => triad.includes(pitch))) validVoicings.push(shape);
            });
        }
        if (!validVoicings.length) return buildPracticeQuestion('chord-quality');
        return {
            mode,
            answer: chord.name,
            voicingNotes: randomItem(validVoicings),
            choices: shuffled(PRACTICE_CHORDS.map((item) => item.name)),
            prompt: 'Look at the fretted voicing on the fretboard. Is the chord major, minor, or diminished?',
            explanation: `${chord.name} triads use ${chord.formula}. Their notes are ${triad.map(getNoteName).join(' – ')}.`
        };
    }

    if (mode === 'diatonic-chord') {
        const scaleNotes = getScaleData();
        if (scaleNotes.length !== 7) {
            return {
                mode,
                choices: [],
                prompt: 'Diatonic triads use seven-note scales. Select a seven-note scale above, then try again.',
                explanation: 'Major, Minor, Harmonic Minor, Melodic Minor, and the seven-note modes can be used for this exercise.'
            };
        }
        const degreeIndex = Math.floor(Math.random() * scaleNotes.length);
        const triad = getDiatonicTriad(degreeIndex, scaleNotes);
        const notes = [triad.root, triad.third, triad.fifth].map(getNoteName);
        const answer = `${getNoteName(triad.root)}${triad.quality.suffix}`;
        const degreeAnswers = scaleNotes.map((_, index) => {
            const item = getDiatonicTriad(index, scaleNotes);
            return `${getNoteName(item.root)}${item.quality.suffix}`;
        });
        return {
            mode,
            answer,
            choices: makeChoices(answer, degreeAnswers, 4),
            prompt: `In ${getNoteName(selectedRootIndex)} ${selectedScaleName}, what triad is built on the ${ordinal(degreeIndex + 1)} degree?`,
            explanation: `Stack every other scale note: ${notes.join(' – ')}. The intervals from the root identify this as ${triad.quality.name.toLowerCase()}.`
        };
    }

    if (mode === 'ear-interval') {
        const interval = 1 + Math.floor(Math.random() * 12);
        return {
            mode,
            semitones: interval,
            answer: INTERVAL_NAMES[interval],
            choices: makeChoices(INTERVAL_NAMES[interval], Object.values(INTERVAL_NAMES)),
            prompt: 'Listen to the two notes, then choose the interval you heard.',
            explanation: `${INTERVAL_NAMES[interval]} spans ${interval} semitone${interval === 1 ? '' : 's'}.`
        };
    }

    throw new Error(`Unknown practice mode: ${mode}`);
}

async function resumePracticeAudio() {
    if (audioCtx.state !== 'running') await audioCtx.resume();
    if (audioCtx.state !== 'running') throw new Error(`AudioContext is ${audioCtx.state}.`);
}

async function playPracticeSound() {
    if (!practiceQuestion) return;
    const isInterval = practiceQuestion.mode === 'ear-interval';
    const isChord = practiceQuestion.mode === 'ear-chord';
    const isTargetNote = practiceQuestion.mode === 'ear-to-fretboard';
    if (!isInterval && !isChord && !isTargetNote) return;

    try {
        await resumePracticeAudio();
        const tonicMidi = 60 + selectedRootIndex;
        if (isInterval) {
            playGuitarNote(midiToFreq(tonicMidi), 0, 0.8);
            playGuitarNote(midiToFreq(tonicMidi + practiceQuestion.semitones), 1.05, 0.8);
        } else if (isChord) {
            practiceQuestion.chordIntervals.forEach((interval, index) => {
                playGuitarNote(midiToFreq(tonicMidi + interval), index * 0.025, 1.25);
            });
        } else {
            playGuitarNote(midiToFreq(practiceQuestion.midi), 0, 1.1);
        }
    } catch (error) {
        console.error('Unable to play the exercise audio:', error);
        const feedback = document.getElementById('practiceFeedback');
        feedback.innerText = 'Audio is unavailable in this browser session.';
        feedback.className = 'practice-feedback is-incorrect';
    }
}

async function playLessonExample() {
    const lesson = getSelectedLesson();
    if (!lesson) return;
    try {
        await resumePracticeAudio();
        let startTime = 0;
        const audioGroups = lesson.audioScale
            ? [...getScaleData().map((pitch) => [((pitch - selectedRootIndex + 12) % 12)]), [12]]
            : (lesson.audio || []);
        audioGroups.forEach((group) => {
            group.forEach((offset, noteIndex) => {
                const midi = lesson.audioMidi ? offset : 60 + selectedRootIndex + offset;
                playGuitarNote(midiToFreq(midi), startTime + noteIndex * 0.025, 0.55);
            });
            startTime += group.length === 1 ? 0.38 : 0.85;
        });
    } catch (error) {
        console.error('Unable to play the lesson example:', error);
        document.getElementById('practiceFeedback').innerText = 'Audio is unavailable in this browser session.';
    }
}

function renderPracticeQuestion() {
    const choices = document.getElementById('practiceChoices');
    const feedback = document.getElementById('practiceFeedback');
    const replayButton = document.getElementById('replayPracticeAudio');
    const checkButton = document.getElementById('checkScaleNotes');
    const micButton = document.getElementById('micPracticeButton');

    document.getElementById('practicePrompt').innerText = practiceQuestion.prompt;
    feedback.innerText = '';
    feedback.className = 'practice-feedback';
    choices.replaceChildren();
    replayButton.hidden = !['ear-interval', 'ear-chord', 'ear-to-fretboard'].includes(practiceQuestion.mode);
    checkButton.hidden = practiceQuestion.mode !== 'build-scale';
    micButton.hidden = practiceQuestion.mode !== 'mic-note';
    micButton.innerText = 'Listen with microphone';
    micButton.disabled = false;

    (practiceQuestion.choices || []).forEach((answer) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'practice-answer';
        button.innerText = answer;
        button.addEventListener('click', () => submitPracticeAnswer(answer));
        choices.append(button);
    });

    if (replayButton.hidden === false) void playPracticeSound();
    drawAll();
}

function startPracticeQuestion() {
    stopPracticeMicrophone();
    practiceQuestion = buildPracticeQuestion(document.getElementById('practiceMode').value);
    renderPracticeQuestion();
}

function recordPracticeResult(isCorrect) {
    practiceStats.tried++;
    const feedback = document.getElementById('practiceFeedback');
    if (isCorrect) {
        practiceQuestion.answered = true;
        practiceStats.correct++;
        practiceStats.streak++;
        feedback.innerText = `Correct! ${practiceQuestion.explanation}`;
        feedback.className = 'practice-feedback is-correct';
        document.querySelectorAll('.practice-answer').forEach((button) => { button.disabled = true; });
    } else {
        practiceStats.streak = 0;
        feedback.innerText = 'Not quite. Try again, or start a new question.';
        feedback.className = 'practice-feedback is-incorrect';
    }

    savePracticeStats();
    updatePracticeScore();
    if (isCorrect) drawAll();
}

function submitPracticeAnswer(answer) {
    if (!practiceQuestion || practiceQuestion.answered) return;
    recordPracticeResult(answer === practiceQuestion.answer);
    if (practiceQuestion.answered && practiceQuestion.mode === 'mic-note') {
        stopPracticeMicrophone();
        const button = document.getElementById('micPracticeButton');
        button.innerText = 'Note matched';
        button.disabled = true;
    }
}

function checkScaleSelection() {
    if (!practiceQuestion || practiceQuestion.mode !== 'build-scale' || practiceQuestion.answered) return;
    const expected = practiceQuestion.targetFrets;
    const selected = practiceQuestion.selectedFrets;
    const isCorrect = selected.size === expected.size && [...expected].every((fret) => selected.has(fret));
    recordPracticeResult(isCorrect);
}

// Process fretboard answers before the regular note playback handler.
function handleFretboardPracticeClick(found) {
    if (!practiceQuestion || practiceQuestion.answered) return false;

    if (practiceQuestion.mode === 'build-scale') {
        if (found?.type !== 'note' || found.s !== 5 - practiceQuestion.stringIndex || found.f > 12) return true;
        if (practiceQuestion.selectedFrets.has(found.f)) practiceQuestion.selectedFrets.delete(found.f);
        else practiceQuestion.selectedFrets.add(found.f);
        document.getElementById('practiceFeedback').innerText = `${practiceQuestion.selectedFrets.size} fret${practiceQuestion.selectedFrets.size === 1 ? '' : 's'} selected.`;
        drawAll();
        return true;
    }

    if (!['fretboard-note', 'ear-to-fretboard'].includes(practiceQuestion.mode)) return false;
    if (found?.type === 'note' && found.midi % 12 === practiceQuestion.targetPitchClass) {
        submitPracticeAnswer(practiceQuestion.answer);
    } else {
        document.getElementById('practiceFeedback').innerText = 'That is a different note. Try another fretboard position.';
        document.getElementById('practiceFeedback').className = 'practice-feedback is-incorrect';
        practiceStats.tried++;
        practiceStats.streak = 0;
        savePracticeStats();
        updatePracticeScore();
    }
    return true;
}

async function togglePracticeMicrophone() {
    if (practiceMicStream) {
        stopPracticeMicrophone();
        document.getElementById('micPracticeButton').innerText = 'Listen with microphone';
        return;
    }

    const button = document.getElementById('micPracticeButton');
    const feedback = document.getElementById('practiceFeedback');
    const questionAtStart = practiceQuestion;
    try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access requires HTTPS or localhost.');
        await resumePracticeAudio();
        if (questionAtStart !== practiceQuestion || practiceQuestion?.mode !== 'mic-note') return;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (questionAtStart !== practiceQuestion || practiceQuestion?.mode !== 'mic-note') {
            stream.getTracks().forEach((track) => track.stop());
            return;
        }
        practiceMicStream = stream;
        practiceMicSource = audioCtx.createMediaStreamSource(practiceMicStream);
        practiceMicAnalyser = audioCtx.createAnalyser();
        practiceMicAnalyser.fftSize = 2048;
        practiceMicSource.connect(practiceMicAnalyser);
        button.innerText = 'Stop listening';
        feedback.innerText = `Listening for ${practiceQuestion.answer}…`;
        feedback.className = 'practice-feedback';
        updatePracticeMicrophone();
    } catch (error) {
        console.error('Unable to start microphone practice:', error);
        stopPracticeMicrophone();
        feedback.innerText = 'Microphone unavailable. Allow access and use HTTPS or localhost.';
        feedback.className = 'practice-feedback is-incorrect';
    }
}

function updatePracticeMicrophone() {
    if (!practiceMicStream || !practiceMicAnalyser || practiceQuestion?.mode !== 'mic-note') return;
    const samples = new Float32Array(practiceMicAnalyser.fftSize);
    practiceMicAnalyser.getFloatTimeDomainData(samples);
    const frequency = autoCorrelate(samples, audioCtx.sampleRate);
    if (frequency > 0) {
        const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
        const pitchClass = ((midi % 12) + 12) % 12;
        const note = getNoteName(pitchClass);
        const feedback = document.getElementById('practiceFeedback');
        if (pitchClass === practiceQuestion.targetPitchClass) {
            submitPracticeAnswer(practiceQuestion.answer);
            return;
        }
        feedback.innerText = `Heard ${note}${Math.floor(midi / 12) - 1}. Keep adjusting toward ${practiceQuestion.answer}.`;
    }
    practiceMicRafId = requestAnimationFrame(updatePracticeMicrophone);
}

function stopPracticeMicrophone() {
    if (practiceMicRafId) cancelAnimationFrame(practiceMicRafId);
    if (practiceMicSource) practiceMicSource.disconnect();
    if (practiceMicStream) practiceMicStream.getTracks().forEach((track) => track.stop());
    practiceMicRafId = null;
    practiceMicSource = null;
    practiceMicAnalyser = null;
    practiceMicStream = null;
}

function refreshPracticeForKeyChange() {
    const keyDependentModes = ['scale-degree', 'build-scale', 'chord-quality', 'chord-shape', 'ear-chord', 'diatonic-chord', 'ear-interval'];
    if (practiceQuestion && keyDependentModes.includes(practiceQuestion.mode)) startPracticeQuestion();
    showLesson();
}

function getSelectedLesson() {
    return LESSON_CATALOG.find((lesson) => lesson.id === document.getElementById('lessonTopic').value);
}

function populateLessonPicker() {
    const picker = document.getElementById('lessonTopic');
    const categories = [...new Set(LESSON_CATALOG.map((lesson) => lesson.category))];
    picker.replaceChildren();
    categories.forEach((category) => {
        const group = document.createElement('optgroup');
        group.label = category;
        LESSON_CATALOG.filter((lesson) => lesson.category === category).forEach((lesson) => {
            const option = document.createElement('option');
            option.value = lesson.id;
            option.textContent = lesson.title;
            group.append(option);
        });
        picker.append(group);
    });
}

function showLesson() {
    const lesson = getSelectedLesson();
    if (!lesson) return;
    document.getElementById('lessonTitle').innerText = lesson.title;
    document.getElementById('lessonSummary').innerText = lesson.summary;
    document.getElementById('lessonText').innerText = lesson.body;
    const stepList = document.getElementById('lessonSteps');
    stepList.replaceChildren(...lesson.steps.map((step) => {
        const item = document.createElement('li');
        item.textContent = step;
        return item;
    }));
    const scaleNotes = getScaleData().map(getNoteName).join(' · ');
    document.getElementById('lessonContext').innerText =
        `Current app context: ${getNoteName(selectedRootIndex)} ${selectedScaleName} · Notes: ${scaleNotes}`;
    document.getElementById('lessonGoButton').innerText = lesson.target === 'circleCanvas'
        ? 'Open the Circle of Fifths'
        : lesson.target === 'tunerToggle' ? 'Open the tuner'
            : lesson.target === 'metroBtn' ? 'Go to the metronome'
                : lesson.target === 'downloadPdfButton' ? 'Go to PDF export'
                    : lesson.target === 'practiceMode' ? 'Go to exercises'
                        : 'Show the related tool';
    document.getElementById('lessonPracticeButton').hidden = !lesson.practice;
    document.getElementById('lessonAudioButton').hidden = !lesson.audio;
}

function openLessonTool() {
    const lesson = getSelectedLesson();
    if (!lesson) return;
    if (lesson.target === 'practiceMode') {
        document.getElementById('practiceMode').focus();
        document.querySelector('.practice-controls').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    const target = document.getElementById(lesson.target);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (['rootSelect', 'scaleSelect', 'tunerToggle', 'metroBtn', 'downloadPdfButton'].includes(lesson.target)) target.focus({ preventScroll: true });
}

function startLessonPractice() {
    const lesson = getSelectedLesson();
    if (!lesson?.practice) return;
    if (lesson.requiredScale && selectedScaleName !== lesson.requiredScale) {
        selectedScaleName = lesson.requiredScale;
        document.getElementById('scaleSelect').value = lesson.requiredScale;
        generateVisuals();
        refreshPracticeForKeyChange();
    }
    const modePicker = document.getElementById('practiceMode');
    modePicker.value = lesson.practice;
    startPracticeQuestion();
    document.getElementById('practicePrompt').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function initializePracticeLab() {
    updatePracticeScore();
    document.getElementById('newPracticeQuestion').addEventListener('click', startPracticeQuestion);
    document.getElementById('practiceMode').addEventListener('change', startPracticeQuestion);
    document.getElementById('replayPracticeAudio').addEventListener('click', () => { void playPracticeSound(); });
    document.getElementById('checkScaleNotes').addEventListener('click', checkScaleSelection);
    document.getElementById('micPracticeButton').addEventListener('click', togglePracticeMicrophone);
    populateLessonPicker();
    document.getElementById('lessonTopic').addEventListener('change', showLesson);
    document.getElementById('lessonAudioButton').addEventListener('click', () => { void playLessonExample(); });
    document.getElementById('lessonGoButton').addEventListener('click', openLessonTool);
    document.getElementById('lessonPracticeButton').addEventListener('click', startLessonPractice);
    window.addEventListener('beforeunload', stopPracticeMicrophone);

    showLesson();
    document.getElementById('practicePrompt').innerText = 'Choose an exercise or select New question when you are ready.';
    document.getElementById('replayPracticeAudio').hidden = true;
    document.getElementById('checkScaleNotes').hidden = true;
    document.getElementById('micPracticeButton').hidden = true;
    drawAll();
}
