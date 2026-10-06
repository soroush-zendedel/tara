        // Shared music theory data for note naming, scales, chords, and key signatures.
        const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const CHROMATIC_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        const FLAT_ROOT_INDICES = [5, 10, 3, 8, 1, 6]; 

        const PALETTE = {
            light: { bg: '#ffffff', text: '#2d3436', textSec: '#636e72', string: '#b2bec3', fret: '#dfe6e9', nut: '#2d3436', circleBgMaj: '#ffffff', circleBgMin: '#f5f6fa', noteRoot: '#FDB827', noteOther: '#2d3436', noteText: '#ffffff', chordBg: '#ffffff', progBg: '#f1f2f6', accent: '#FDB827', pianoWhite: '#ffffff', pianoBlack: '#2d3436', pianoBorder: '#b2bec3', tabNum: '#2d3436', tabCircle: '#ffffff', chartHeader: '#f1f2f6', chartRowEven: '#ffffff', chartRowOdd: '#fafafa', chartHover: '#fff7e0' },
            dark: { bg: '#2d3436', text: '#dfe6e9', textSec: '#b2bec3', string: '#636e72', fret: '#636e72', nut: '#dfe6e9', circleBgMaj: '#2d3436', circleBgMin: '#1e272e', noteRoot: '#D4AF37', noteOther: '#dfe6e9', noteText: '#2d3436', chordBg: '#2d3436', progBg: '#1e272e', accent: '#D4AF37', pianoWhite: '#b2bec3', pianoBlack: '#1e1e1e', pianoBorder: '#636e72', tabNum: '#ffffff', tabCircle: '#2d3436', chartHeader: '#353b48', chartRowEven: '#2d3436', chartRowOdd: '#252a2c', chartHover: '#443c20' }
        };

        const OCTAVE_COLORS = { 2: '#3498db', 3: '#00b894', 4: '#e67e22', 5: '#e17055', 6: '#9b59b6' };
        const VALID_SCALES = { 'Major': [0,2,4,5,7,9,11], 'Minor': [0,2,3,5,7,8,10], 'Harmonic Minor': [0,2,3,5,7,8,11], 'Melodic Minor': [0,2,3,5,7,9,11], 'Pentatonic Major': [0,2,4,7,9], 'Pentatonic Minor': [0,3,5,7,10], 'Blues': [0,3,5,6,7,10], 'Dorian': [0,2,3,5,7,9,10], 'Phrygian': [0,1,3,5,7,8,10], 'Lydian': [0,2,4,6,7,9,11], 'Mixolydian': [0,2,4,5,7,9,10], 'Locrian': [0,1,3,5,6,8,10] };
        const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];
        const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]; 
        const OPEN_STRINGS_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];
        
        // s: Index in OPEN_STRING_MIDI (0=Low E, 5=High E)
        const STANDARD_CHORDS_INDICES = {
            '0_':   [{s:1,f:3},{s:2,f:2},{s:3,f:0},{s:4,f:1},{s:5,f:0}], '9_':   [{s:1,f:0},{s:2,f:2},{s:3,f:2},{s:4,f:2},{s:5,f:0}], '7_':   [{s:0,f:3},{s:1,f:2},{s:2,f:0},{s:3,f:0},{s:4,f:0},{s:5,f:3}], '4_':   [{s:0,f:0},{s:1,f:2},{s:2,f:2},{s:3,f:1},{s:4,f:0},{s:5,f:0}], '2_':   [{s:2,f:0},{s:3,f:2},{s:4,f:3},{s:5,f:2}], '5_':   [{s:2,f:3},{s:3,f:2},{s:4,f:1},{s:5,f:1}], 
            '0_m':  [{s:1,f:3},{s:2,f:5},{s:3,f:5},{s:4,f:4},{s:5,f:3}], '9_m':  [{s:1,f:0},{s:2,f:2},{s:3,f:2},{s:4,f:1},{s:5,f:0}], '7_m':  [{s:0,f:3},{s:1,f:5},{s:2,f:5},{s:3,f:3},{s:4,f:3},{s:5,f:3}], '4_m':  [{s:0,f:0},{s:1,f:2},{s:2,f:2},{s:3,f:0},{s:4,f:0},{s:5,f:0}], '2_m':  [{s:2,f:0},{s:3,f:2},{s:4,f:3},{s:5,f:1}], '11_m': [{s:1,f:2},{s:2,f:4},{s:3,f:4},{s:4,f:3},{s:5,f:2}], '5_m':  [{s:0,f:1},{s:1,f:3},{s:2,f:3},{s:3,f:1},{s:4,f:1},{s:5,f:1}], '6_m':  [{s:0,f:2},{s:1,f:4},{s:2,f:4},{s:3,f:2},{s:4,f:2},{s:5,f:2}]  
        };

        const CIRCLE_DATA = [ 
            { majIdx: 0, minIdx: 9, labelMaj: 'C', labelMin: 'A', text: 'Natural', accCount: 0, accType: '' }, 
            { majIdx: 7, minIdx: 4, labelMaj: 'G', labelMin: 'E', text: '1 Sharp', accCount: 1, accType: '#' }, 
            { majIdx: 2, minIdx: 11, labelMaj: 'D', labelMin: 'B', text: '2 Sharps', accCount: 2, accType: '#' }, 
            { majIdx: 9, minIdx: 6, labelMaj: 'A', labelMin: 'F#', text: '3 Sharps', accCount: 3, accType: '#' }, 
            { majIdx: 4, minIdx: 1, labelMaj: 'E', labelMin: 'C#', text: '4 Sharps', accCount: 4, accType: '#' }, 
            { majIdx: 11, minIdx: 8, labelMaj: 'B', labelMin: 'G#', text: '5 Sharps', accCount: 5, accType: '#' }, 
            { majIdx: 6, minIdx: 3, labelMaj: 'F#', labelMin: 'D#', text: '6 Sharps', accCount: 6, accType: '#' }, 
            { majIdx: 1, minIdx: 10, labelMaj: 'Db', labelMin: 'Bb', text: '5 Flats', accCount: 5, accType: 'b' }, 
            { majIdx: 8, minIdx: 5, labelMaj: 'Ab', labelMin: 'F', text: '4 Flats', accCount: 4, accType: 'b' }, 
            { majIdx: 3, minIdx: 0, labelMaj: 'Eb', labelMin: 'C', text: '3 Flats', accCount: 3, accType: 'b' }, 
            { majIdx: 10, minIdx: 7, labelMaj: 'Bb', labelMin: 'G', text: '2 Flats', accCount: 2, accType: 'b' }, 
            { majIdx: 5, minIdx: 2, labelMaj: 'F', labelMin: 'D', text: '1 Flat', accCount: 1, accType: 'b' } 
        ];

        const PROGRESSIONS = { 'Major': [{ name: "Pop/Rock", degrees: [0,4,5,3] }, { name: "Jazz II-V-I", degrees: [1,4,0] }, { name: "50s", degrees: [0,5,3,4] }, { name: "Blues", degrees: [0,3,0,4,3,0] }], 'Minor': [{ name: "Ballad", degrees: [0,5,2,6] }, { name: "Jazz Minor", degrees: [1,4,0] }, { name: "Andalusian", degrees: [0,6,5,4] }, { name: "Sad Pop", degrees: [0,5,3,6] }], 'Other': [{ name: "1-4-5", degrees: [0,3,4] }] };
        const SHARP_POS = [0, 15, -5, 10, 25, 5, 20]; const FLAT_POS = [20, 5, 25, 10, 30, 15, 35];
