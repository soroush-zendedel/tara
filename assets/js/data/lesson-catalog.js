// Lesson content stays separate from exercise logic so the learning guide can grow safely.
const LESSON_CATALOG = [
    {
        id: 'fretboard', category: 'Guitar foundations', title: 'Map the guitar fretboard',
        summary: 'Learn how tuning, frets, note names, and octaves fit together.',
        body: 'Standard guitar tuning from the thickest string to the thinnest is E–A–D–G–B–E. Each fret raises a string by one semitone. The note at fret 12 has the same letter name as the open string, one octave higher.',
        steps: ['Choose one string and say its open note.', 'Move up one fret at a time, naming each chromatic note.', 'Compare the open string with fret 12, then find the same pitch on another string.'],
        target: 'fretboardCanvas', practice: 'fretboard-note', audio: [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12]]
    },
    {
        id: 'chromatic', category: 'Guitar foundations', title: 'Semitones and note names',
        summary: 'Understand the chromatic sequence and why one pitch can have two names.',
        body: 'A semitone is the distance of one fret. The twelve pitch classes repeat in every octave. A sharp raises a letter by a semitone and a flat lowers it; enharmonic names such as C♯ and D♭ can refer to the same sounding pitch.',
        steps: ['Play two neighboring frets on one string.', 'Use the root selector to compare sharp and flat spellings in different keys.', 'Notice that the sound stays the same even when the written name changes.'],
        target: 'rootSelect', practice: 'ear-to-fretboard', audio: [[0], [1], [0]]
    },
    {
        id: 'intervals', category: 'Pitch and scales', title: 'Intervals: distance between notes',
        summary: 'Connect semitone counts, fret distances, and interval names.',
        body: 'An interval describes the pitch distance between two notes. One fret is one semitone; two frets make a whole tone. A perfect fifth spans seven semitones and an octave spans twelve.',
        steps: ['Choose a note on the fretboard as a starting point.', 'Move up two frets and hear a major second.', 'Move up seven frets and compare the perfect fifth.'],
        target: 'fretboardCanvas', practice: 'ear-interval', audio: [[0], [7]]
    },
    {
        id: 'major-scale', category: 'Pitch and scales', title: 'Build a major scale',
        summary: 'Use the whole-step and half-step pattern to create a major scale.',
        body: 'The major scale follows the semitone pattern 2–2–1–2–2–2–1. Starting on the selected tonic and applying these steps produces seven scale degrees before the tonic repeats at the octave.',
        steps: ['Select Major in the scale menu.', 'Read the seven notes in the Theory & Chords chart.', 'Choose “Build a scale on one string” above and mark the scale notes.'],
        target: 'scaleSelect', practice: 'build-scale', requiredScale: 'Major', audioScale: true, audio: [[0], [2], [4], [5], [7], [9], [11], [12]]
    },
    {
        id: 'scale-families', category: 'Pitch and scales', title: 'Compare scale families and modes',
        summary: 'Explore how changing intervals changes a scale’s sound and fretboard pattern.',
        body: 'The scale menu includes major and minor, harmonic and melodic minor, major and minor pentatonic, blues, and the seven modes. Each is a set of semitone distances from a tonic. Changing the formula changes which notes appear and the character of the sound.',
        steps: ['Keep the same root and select two different scales.', 'Compare their note lists and highlighted fretboard positions.', 'Listen to each scale with the audio example, then play its notes yourself.'],
        target: 'scaleSelect', practice: 'build-scale', audioScale: true, audio: [[0], [2], [3], [5], [7], [8], [10], [12]]
    },
    {
        id: 'degrees', category: 'Pitch and scales', title: 'Scale degrees and Roman numerals',
        summary: 'Name each scale note by its role relative to the tonic.',
        body: 'Scale degrees count notes from the tonic: first, second, third, and so on. The Theory & Chords chart labels them with Roman numerals. These labels describe a note or chord’s role and remain useful when a song changes key.',
        steps: ['Read I through VII in the note row.', 'Click a note to hear it.', 'Change the root and observe that the degree labels stay the same while note names change.'],
        target: 'theoryCanvas', practice: 'scale-degree', audio: [[0], [4], [7], [12]]
    },
    {
        id: 'circle-fifths', category: 'Keys and harmony', title: 'Navigate the Circle of Fifths',
        summary: 'See how neighboring keys relate and use the circle to choose a key.',
        body: 'Moving clockwise around the Circle of Fifths advances by a perfect fifth; moving counterclockwise advances by a fourth. The outer ring shows major keys and the inner ring their relative minor keys. Clicking a segment changes the app’s root and scale.',
        steps: ['Find the current key on the circle.', 'Compare it with the key one segment clockwise.', 'Click another major or relative minor segment and inspect the updated charts.'],
        target: 'circleCanvas', practice: null, audio: [[0, 4, 7], [7, 11, 14], [0, 4, 7]]
    },
    {
        id: 'key-signatures', category: 'Keys and harmony', title: 'Key signatures and relative keys',
        summary: 'Read the accidental count and connect major keys to their relative minors.',
        body: 'A key signature summarizes the sharps or flats used by a key. The circle displays that count and pairs each major key with a relative minor that shares its notes. Relative keys have different tonics and musical centers even though their note collections match.',
        steps: ['Select a major or minor key on the Circle of Fifths.', 'Read the key-signature label in the circle display.', 'Switch between the paired major and minor keys and compare their tonic notes.'],
        target: 'circleCanvas', practice: null, audio: [[0, 4, 7], [9, 12, 16], [0, 4, 7]]
    },
    {
        id: 'triads', category: 'Keys and harmony', title: 'Build major, minor, and diminished triads',
        summary: 'Identify chord quality by the intervals above its root.',
        body: 'A triad contains a root, a third, and a fifth. Major uses 0–4–7 semitones, minor uses 0–3–7, and diminished uses 0–3–6. The third and fifth intervals determine the quality.',
        steps: ['Choose a chord row in the Theory & Chords chart to hear it.', 'Compare its three note names with the interval formula.', 'Use the chord-quality exercise to identify the sound or notes.'],
        target: 'theoryCanvas', practice: 'chord-quality', audio: [[0, 4, 7], [0, 3, 7], [0, 3, 6]]
    },
    {
        id: 'diatonic', category: 'Keys and harmony', title: 'Diatonic chords in a key',
        summary: 'Build chords from scale notes and understand their qualities.',
        body: 'A diatonic triad is built by taking every other note of a scale. In a major key, the usual quality pattern is major, minor, minor, major, major, minor, diminished. The chart calculates the actual chord names and notes for the selected key and scale.',
        steps: ['Follow one degree in the chart from its Roman numeral to its chord name.', 'Click the chord row to hear its voicing.', 'Use the diatonic-chord exercise to identify a chord by degree.'],
        target: 'theoryCanvas', practice: 'diatonic-chord', requiredScale: 'Major', audio: [[0, 4, 7], [2, 5, 9], [7, 11, 14], [0, 4, 7]]
    },
    {
        id: 'progressions', category: 'Keys and harmony', title: 'Chord progressions',
        summary: 'Hear how a sequence of diatonic chords creates musical movement.',
        body: 'A chord progression is a sequence of harmonies. The app lists common progressions using degree numbers; those degrees map to chords in the selected key. A progression keeps its functional pattern when transposed to another key.',
        steps: ['Scroll to Progressions in the Theory & Chords chart.', 'Click a progression row to hear its chords in sequence.', 'Change the root and listen to the same progression in the new key.'],
        target: 'theoryCanvas', practice: 'diatonic-chord', audio: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]]
    },
    {
        id: 'voicings', category: 'Guitar and notation', title: 'Chord voicings on the guitar',
        summary: 'See how one chord can use different strings and fret positions.',
        body: 'A voicing is a particular arrangement of a chord’s notes across strings and octaves. The same chord can have several playable shapes. In the app, clicking the same chord row again cycles through available voicings and updates the notation and fretboard.',
        steps: ['Click one chord row in the chart.', 'Click that row again to cycle its voicing.', 'Compare the fretboard shape with the notes in the notation panel.'],
        target: 'theoryCanvas', practice: 'chord-shape', audio: [[0, 7, 12, 16, 19]]
    },
    {
        id: 'caged', category: 'Guitar and notation', title: 'CAGED positions',
        summary: 'Use the five position controls to explore scale patterns along the neck.',
        body: 'The fretboard position controls divide the neck into five overlapping regions related to common CAGED shapes. Select a position to focus on notes within that region; use root notes as landmarks when connecting neighboring positions.',
        steps: ['Choose Pos 1, then compare it with Pos 2.', 'Turn on Octaves to make repeated pitch classes easier to trace.', 'Return to All to see how the positions connect across the neck.'],
        target: 'fretboardCanvas', practice: 'fretboard-note', audio: [[0], [4], [7], [12], [7], [4], [0]]
    },
    {
        id: 'piano-map', category: 'Guitar and notation', title: 'Connect guitar notes to piano',
        summary: 'Follow the same pitch across two different instrument layouts.',
        body: 'Guitar frets and piano keys are two layouts for the same chromatic pitches. Selecting a note highlights matching pitches across the fretboard and piano, including octave equivalents where applicable.',
        steps: ['Select a highlighted note on the fretboard.', 'Find the matching key on the piano below.', 'Select a piano key and observe the corresponding guitar positions.'],
        target: 'pianoCanvas', practice: null, audio: [[0], [7], [12]]
    },
    {
        id: 'notation-tab', category: 'Guitar and notation', title: 'Read notation and guitar tab',
        summary: 'Relate written pitches to the guitar string and fret shown in tab.',
        body: 'Standard notation places pitches on a five-line staff, while guitar tablature identifies the string and fret. The app generates both from the selected scale or chord voicing. Selecting a written note links it to the matching pitch on the instruments.',
        steps: ['Inspect the staff and tab for the current scale.', 'Select a note to hear it and highlight its instrument locations.', 'Click a chord in the chart and compare the generated chord notation.'],
        target: 'notationCanvas', practice: null, audio: [[0], [2], [4], [5], [7]]
    },
    {
        id: 'ear-training', category: 'Listening and tools', title: 'Train your ear with intervals and chords',
        summary: 'Practice recognizing pitch distance and chord quality by listening.',
        body: 'Ear training connects a sound to a musical idea. Interval practice compares two notes; chord practice helps distinguish major, minor, and diminished triads. Replay examples and answer from listening before relying on the written labels.',
        steps: ['Choose Hear an interval or Identify a chord by ear above.', 'Replay the sound with the labels out of view.', 'Name the interval or chord quality, then read the explanation.'],
        target: 'practiceMode', practice: 'ear-interval', audio: [[0], [7]]
    },
    {
        id: 'tuner', category: 'Listening and tools', title: 'Tune with the guitar tuner',
        summary: 'Use microphone input to see whether a string is sharp or flat.',
        body: 'The tuner listens to your device microphone, estimates the pitch, and shows the nearest note and tuning direction. Allow microphone access, play one string clearly, and adjust until the indicator centers.',
        steps: ['Connect or enable a microphone.', 'Open Tuner and allow microphone access.', 'Pluck one open string at a time and adjust its tuning gradually.'],
        target: 'tunerToggle', practice: null, audioMidi: true, audio: [[40], [45], [50], [55], [59], [64]]
    },
    {
        id: 'mic-pitch', category: 'Listening and tools', title: 'Match a pitch with the microphone',
        summary: 'Use your voice or instrument to match a target note.',
        body: 'The microphone note exercise estimates the pitch from live audio and compares its nearest note name with a generated target. A quiet space and a clear, sustained note help the detector respond more reliably.',
        steps: ['Choose “Play a note into the microphone” in the exercise menu.', 'Allow microphone access and sing or play the displayed target note.', 'Adjust your pitch until the app reports a match.'],
        target: 'practiceMode', practice: 'mic-note', audio: [[0], [7], [12]]
    },
    {
        id: 'metronome', category: 'Listening and tools', title: 'Practice steadily with the metronome',
        summary: 'Set a tempo and keep scale or chord practice in time.',
        body: 'BPM means beats per minute. The metronome provides a regular click and visual pulse at the selected tempo. Start slowly enough to play cleanly, then increase the tempo in small steps.',
        steps: ['Set BPM to a comfortable speed.', 'Start the metronome and tap along.', 'Play a scale or chord change on each beat without rushing.'],
        target: 'metroBtn', practice: null, audio: [[0], [2], [4], [5], [7], [9], [11], [12]]
    },
    {
        id: 'pdf-export', category: 'Listening and tools', title: 'Save a study sheet as PDF',
        summary: 'Export the current visualizations for offline practice.',
        body: 'PDF export captures the current circle, theory chart, fretboard, piano, and notation views. Set the desired root, scale, position, and octave display before creating the study sheet.',
        steps: ['Choose the key and scale you want to study.', 'Set a fretboard position or octave view if useful.', 'Select PDF to download the generated charts.'],
        target: 'downloadPdfButton', practice: null, audio: null
    }
];
