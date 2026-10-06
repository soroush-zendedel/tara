        // --- CORE FUNCTIONS (GLOBAL SCOPE) ---
        function toggleTheme() {
            isDark = !isDark;
            const body = document.body;
            const icon = document.getElementById('themeIcon');
            if (isDark) { body.setAttribute('data-theme', 'dark'); icon.classList.replace('fa-moon', 'fa-sun'); COLORS = { ...PALETTE.dark }; } 
            else { body.setAttribute('data-theme', 'light'); icon.classList.replace('fa-sun', 'fa-moon'); COLORS = { ...PALETTE.light }; }
            generateVisuals();
        }

        function toggleOctaves() {
            const checkbox = document.getElementById('octaveSwitch');
            showOctaves = checkbox.checked;
            generateVisuals();
        }

        function getNoteName(idx) { return useFlatNotation ? CHROMATIC_FLAT[idx % 12] : CHROMATIC_SHARP[idx % 12]; }
        function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
        // Convert a frequency to its nearest MIDI note's scientific pitch octave.
        function getOctaveFromFreq(freq) {
            if (!Number.isFinite(freq) || freq <= 0) return null;
            const midi = Math.round(69 + 12 * Math.log2(freq / 440));
            return Math.floor(midi / 12) - 1;
        }
        
        function getFrequency(noteIndex, baseOctave=3) { 
            let octave = baseOctave; if (noteIndex < selectedRootIndex) octave += 1; 
            return midiToFreq((octave + 1) * 12 + noteIndex); 
        }

        function getScaleData() {
            useFlatNotation = false;
            if (FLAT_ROOT_INDICES.includes(selectedRootIndex)) { if (selectedScaleName === 'Major' || selectedScaleName === 'Minor') useFlatNotation = true; }
            const circleEntry = CIRCLE_DATA.find(c => (selectedScaleName==='Major' && c.majIdx===selectedRootIndex) || (selectedScaleName==='Minor' && c.minIdx===selectedRootIndex));
            if(circleEntry && circleEntry.accType === 'b') useFlatNotation = true;
            CURRENT_CHROMATIC = useFlatNotation ? CHROMATIC_FLAT : CHROMATIC_SHARP;
            const intervals = VALID_SCALES[selectedScaleName] || VALID_SCALES['Major']; 
            return intervals.map(interval => (selectedRootIndex + interval) % 12); 
        }

        function identifyChord(rootIdx, thirdIdx, fifthIdx) { 
            const d3 = (thirdIdx - rootIdx + 12) % 12; const d5 = (fifthIdx - rootIdx + 12) % 12; 
            if (d3 === 4 && d5 === 7) return { q: "Major", s: "" }; 
            if (d3 === 3 && d5 === 7) return { q: "Minor", s: "m" }; 
            if (d3 === 3 && d5 === 6) return { q: "Dim", s: "dim" }; 
            return { q: "Unknown", s: "?" }; 
        }
        function getIntervalLabel(idx1, idx2) { 
            const diff = (idx2 - idx1 + 12) % 12; if (diff === 1) return 'H'; if (diff === 2) return 'W'; if (diff === 3) return '1½'; if (diff === 4) return '2'; return diff; 
        }
        function setPos(p) { currentPos = p; document.querySelectorAll('.pos-btn').forEach(b => { b.classList.toggle('active', (p === 'all' && b.innerText === 'All') || b.innerText === 'Pos ' + p); }); generateVisuals(); }
        
        function calculatePositionsForKey() { 
            let rootFretOn6 = (selectedRootIndex - 4 + 12) % 12; 
            const shapes = [{ id: 'E', offsets: [-1, 3] }, { id: 'D', offsets: [2, 6] }, { id: 'C', offsets: [4, 8] }, { id: 'A', offsets: [7, 11] }, { id: 'G', offsets: [9, 13] }]; return shapes.map(shape => { let min = rootFretOn6 + shape.offsets[0]; let max = rootFretOn6 + shape.offsets[1]; if (min > 12) { min -= 12; max -= 12; } else if (min < 0) { min += 12; max += 12; } if (min >= 11) { min -= 12; max -= 12; } return { min, max }; }).sort((a, b) => a.min - b.min); 
        }
        function isInCurrentPosition(fret) { if (currentPos === 'all') return true; const range = calculatedPositions[currentPos - 1]; if (!range) return true; const checks = [[range.min, range.max], [range.min + 12, range.max + 12], [range.min - 12, range.max - 12]]; return checks.some(([l, h]) => fret >= l && fret <= h); }

        function getStaffY(note, octave) {
            const diatonic = {'C':0, 'D':1, 'E':2, 'F':3, 'G':4, 'A':5, 'B':6};
            const cleanNote = note.charAt(0);
            const noteStep = diatonic[cleanNote];
            const octaveStep = (octave - 4) * 7;
            const stepsFromC4 = noteStep + octaveStep;
            const stepsFromE4 = stepsFromC4 - 2; 
            return 120 - (stepsFromE4 * 10);
        }

