        // Shared app state used by the ordered classic scripts on the app page.
        let COLORS = { ...PALETTE.light };
        let isDark = false; 
        let CURRENT_CHROMATIC = CHROMATIC_SHARP;

        var fbCanvas, thCanvas, circleCanvas, pianoCanvas, notationCanvas, tooltip;
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var fbHitboxes=[], theoryHitboxes=[], circleHitboxes=[], pianoHitboxes=[], notationHitboxes=[];
        var fbHovered=null, theoryHovered=null, pianoHovered=null, notationHovered=null, circleHovered=null;
        var activeGuitarMidi = new Set();
        var teachingAnnotations = [];
        var teachingHistory = [];
        var teachingModeEnabled = false, showTeachingAnnotations = true, matchTeachingOctaves = false;
        var selectedTeachingRole = 'note';
        var liveNoteVoices = new Map();
        var liveInputMidiCounts = new Map();
        var liveInputMidi = new Set();
        var computerKeyboardEnabled = false;
        var computerKeyboardHeld = new Map();
        var midiAccess = null, connectedMidiInput = null;
        
        var selectedRootIndex = 9; var selectedScaleName = 'Minor'; var useFlatNotation = false;
        var currentChordIndex = -1, currentVoicingIndex = 0;
        var currentVoicingNotes = [], currentNotationNotes = [];
        var currentNotationType = 'scale';
        var currentPos = 'all', showOctaves = true;
        var calculatedPositions = [];
        var isMetroPlaying = false, bpm = 100, nextNoteTime = 0.0, timerID = null;
        var isTunerActive = false, tunerStream = null, tunerSource = null, analyser = null, tunerRafId = null;

