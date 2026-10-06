        // --- DRAWING ---
        function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            if (fill) { ctx.fillStyle = fill; ctx.fill(); }
            if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
        }

        // Draw each canvas view and maintain the hit regions used by pointer input.
        function drawNotation(notes = [], type = 'scale') {
            const ctx = notationCanvas.getContext('2d');
            ctx.clearRect(0, 0, notationCanvas.width, notationCanvas.height);
            notationHitboxes.length = 0; currentNotationNotes = notes; currentNotationType = type;
            const staffStartX = 50, staffEndX = notationCanvas.width - 50, staffTopY = 40, lineDist = 20;
            ctx.strokeStyle = COLORS.text; ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(staffStartX, staffTopY + i * lineDist); ctx.lineTo(staffEndX, staffTopY + i * lineDist); ctx.stroke(); }
            ctx.fillStyle = COLORS.text; ctx.font = '60px serif'; ctx.fillText('\uD834\uDD1E', staffStartX, staffTopY + 65);
            const tabTopY = 250, tabLineDist = 15;
            for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(staffStartX, tabTopY + i * tabLineDist); ctx.lineTo(staffEndX, tabTopY + i * tabLineDist); ctx.stroke(); }
            ctx.font = 'bold 20px serif'; ctx.fillText('T', staffStartX - 20, tabTopY + 25); ctx.fillText('A', staffStartX - 20, tabTopY + 45); ctx.fillText('B', staffStartX - 20, tabTopY + 65);
            if (!notes || notes.length === 0) return;
            const noteSpacing = type === 'chord' ? 0 : ((staffEndX - staffStartX - 60) / Math.max(notes.length, 12));
            let startNoteX = staffStartX + 80;
            notes.forEach((n, index) => {
                const x = type === 'chord' ? (notationCanvas.width / 2) : (startNoteX + index * noteSpacing);
                const isHovered = notationHovered && notationHovered.s === n.s && notationHovered.f === n.f;
                const noteMidi = n.midi;
                const isCrossHover = (fbHovered && fbHovered.s === n.s && fbHovered.f === n.f) || (pianoHovered && pianoHovered.midi === noteMidi);
                const teachingAnnotation = getTeachingAnnotationForMidi(noteMidi);
                const visualOctave = n.octave + 1; const staffY = getStaffY(n.note, visualOctave);
                
                ctx.strokeStyle = COLORS.text;
                if (staffY >= 140) { ctx.beginPath(); ctx.moveTo(x - 12, 140); ctx.lineTo(x + 12, 140); ctx.stroke(); }
                if (staffY >= 160) { ctx.beginPath(); ctx.moveTo(x - 12, 160); ctx.lineTo(x + 12, 160); ctx.stroke(); }
                if (staffY <= 20) { ctx.beginPath(); ctx.moveTo(x - 12, 20); ctx.lineTo(x + 12, 20); ctx.stroke(); }
                
                ctx.beginPath(); ctx.ellipse(x, staffY, 8, 6, Math.PI / -2.5, 0, 2 * Math.PI); 
                if (isHovered || isCrossHover) ctx.fillStyle = isDark ? '#D4AF37' : '#FDB827';
                else ctx.fillStyle = teachingAnnotation ? getTeachingRole(teachingAnnotation.role).color : COLORS.text;
                ctx.fill();
                if (teachingAnnotation) {
                    ctx.strokeStyle = getTeachingRole(teachingAnnotation.role).color;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
                ctx.strokeStyle = COLORS.text;
                ctx.lineWidth = 1;
                
                ctx.beginPath(); if (staffY < 80) { ctx.moveTo(x - 7, staffY); ctx.lineTo(x - 7, staffY + 35); } else { ctx.moveTo(x + 7, staffY); ctx.lineTo(x + 7, staffY - 35); } ctx.stroke();
                
                if (n.note.includes('#')) { ctx.font = '16px Arial'; ctx.fillText('♯', x - 20, staffY + 5); }
                if (n.note.includes('b')) { ctx.font = '16px Arial'; ctx.fillText('♭', x - 20, staffY + 5); }

                if (type === 'scale') { ctx.fillStyle = COLORS.textSec; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText(n.note, x, 20); } 
                else { ctx.fillStyle = COLORS.textSec; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left'; ctx.fillText(n.note, x + 15, staffY + 4); }
                
                const tabLineIndex = 5 - n.s; const tabY = tabTopY + tabLineIndex * tabLineDist;
                ctx.save(); ctx.beginPath(); ctx.arc(x, tabY, 10, 0, Math.PI*2); if (isHovered || isCrossHover) ctx.fillStyle = isDark ? '#D4AF37' : '#FDB827'; else ctx.fillStyle = COLORS.tabCircle; ctx.fill(); ctx.restore();
                if (isHovered || isCrossHover) ctx.fillStyle = 'black'; else ctx.fillStyle = COLORS.tabText; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n.f, x, tabY);
                notationHitboxes.push({ type: 'notationNote', x: x, y: staffY, w: 40, h: 300, note: n.note, octave: n.octave, midi: noteMidi, freq: n.freq, s: n.s, f: n.f });
            });
        }

        function getVoicings(triadIndices) {
            const rIdx = triadIndices[0]; const tIdx = triadIndices[1];
            const d3 = (tIdx - rIdx + 12) % 12; const quality = (d3 === 3) ? '_m' : '_'; const key = rIdx + quality;
            const standardShapes = STANDARD_CHORDS_INDICES[key]; const allVoicings = [];
            if (standardShapes) {
                const standardNotes = standardShapes.map(pos => {
                    const m = OPEN_STRING_MIDI[pos.s] + pos.f;
                    return { idx: m%12, note: getNoteName(m%12), octave: Math.floor(m/12)-1, s: pos.s, f: pos.f, freq: midiToFreq(m), midi: m };
                });
                allVoicings.push(standardNotes);
            }
            let rootFret6 = (rIdx - 4 + 12) % 12; if (rootFret6 <= 12) { const v = buildVoicing(0, rootFret6, triadIndices); if(v) allVoicings.push(v); }
            let rootFret5 = (rIdx - 9 + 12) % 12; if (rootFret5 <= 12) { const v = buildVoicing(1, rootFret5, triadIndices); if(v) allVoicings.push(v); }
            
            return allVoicings;
        }

        function buildVoicing(stringIdx, rootFret, triadIndices) {
            if (rootFret > 12) return null;
            let notes = []; let openMidi = OPEN_STRING_MIDI[stringIdx]; let midi = openMidi + rootFret;
            let idx = midi % 12;
            notes.push({ idx: idx, note: getNoteName(idx), octave: Math.floor(midi/12)-1, s: stringIdx, f: rootFret, freq: midiToFreq(midi), midi: midi });
            let rangeMin = Math.max(0, rootFret - 1); let rangeMax = Math.min(12, rootFret + 3);
            for (let s = stringIdx + 1; s < 6; s++) {
                let sOpen = OPEN_STRING_MIDI[s]; let mOpen = sOpen % 12;
                if (triadIndices.includes(mOpen)) { notes.push({ idx: mOpen, note: getNoteName(mOpen), octave: Math.floor(sOpen/12)-1, s: s, f: 0, freq: midiToFreq(sOpen), midi: sOpen }); continue; }
                for (let f = rangeMin; f <= rangeMax; f++) { let m = sOpen + f; let mIdx = m % 12; if (triadIndices.includes(mIdx)) { notes.push({ idx: mIdx, note: getNoteName(mIdx), octave: Math.floor(m/12)-1, s: s, f: f, freq: midiToFreq(m), midi: m }); break; } }
            }
            return notes.length >= 3 ? notes : null;
        }

        function drawAll() {
            calculatedPositions = calculatePositionsForKey();
            drawFretboard(); drawCircleOfFifths(); drawPiano();

            if (currentNotationType === 'scale') {
                const scaleIndices = getScaleData();
                const rootFret = (selectedRootIndex - 4 + 12) % 12;
                const baseMidi = OPEN_STRING_MIDI[0] + rootFret;
                let scaleNotations = [];
                const intervals = VALID_SCALES[selectedScaleName];
                for(let i=0; i<8; i++) {
                    let step = i===7 ? 12 : intervals[i];
                    let m = baseMidi + step;
                    let pos = null;
                    for(let s=5; s>=0; s--) {
                        let open = OPEN_STRING_MIDI[s]; let f = m - open;
                        if(f>=0 && f<=15) { pos={s:s, f:f}; break; }
                    }
                    if(pos) { scaleNotations.push({ idx: m%12, note: getNoteName(m%12), octave: Math.floor(m/12)-1, midi: m, freq: midiToFreq(m), s: pos.s, f: pos.f }); }
                }
                drawNotation(scaleNotations, 'scale');
                drawTheoryChart();
            } else {
                drawNotation(currentVoicingNotes, 'chord');
                drawTheoryChart();
            }
        }

        function drawCircleOfFifths() {
            const ctx = circleCanvas.getContext('2d'); const width = circleCanvas.width, height = circleCanvas.height; const cx = width / 2, cy = 200; const outerRadius = 160, innerRadius = 110;
            ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, width, height); circleHitboxes.length = 0;
            CIRCLE_DATA.forEach((data, i) => {
                const startAngle = -Math.PI/2 - (Math.PI/12) + (i * Math.PI*2/12); const endAngle = startAngle + (Math.PI*2/12);
                const isMaj = (selectedScaleName === 'Major' && selectedRootIndex === data.majIdx); const isMin = (selectedScaleName === 'Minor' && selectedRootIndex === data.minIdx);
                if (isMaj || isMin) currentKeyData = data;
                ctx.beginPath(); ctx.arc(cx, cy, outerRadius, startAngle, endAngle); ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true); ctx.closePath();
                ctx.fillStyle = isMaj ? COLORS.noteRoot : (i % 2 === 0 ? COLORS.circleBgMaj : (isDark ? '#333' : '#f9f9f9'));
                ctx.fill(); ctx.strokeStyle = COLORS.textSec; ctx.lineWidth = 1; ctx.stroke();
                circleHitboxes.push({ type: 'circle', mode: 'Major', rootIdx: data.majIdx, startAngle, endAngle, rMin: innerRadius, rMax: outerRadius });
                const textAngle = startAngle + (Math.PI/12); ctx.save(); ctx.translate(cx + Math.cos(textAngle)*135, cy + Math.sin(textAngle)*135); ctx.rotate(textAngle + Math.PI/2);
                ctx.fillStyle = isMaj ? 'black' : COLORS.text; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(data.labelMaj, 0, 0); ctx.restore();
                ctx.beginPath(); ctx.arc(cx, cy, innerRadius, startAngle, endAngle); ctx.arc(cx, cy, 55, endAngle, startAngle, true); ctx.closePath();
                ctx.fillStyle = isMin ? (isDark ? '#B8860B' : '#FFCC80') : (i % 2 === 0 ? COLORS.circleBgMin : (isDark ? '#2b2b2b' : '#e0e0e0')); ctx.fill(); ctx.stroke();
                circleHitboxes.push({ type: 'circle', mode: 'Minor', rootIdx: data.minIdx, startAngle, endAngle, rMin: 55, rMax: innerRadius });
                ctx.save(); ctx.translate(cx + Math.cos(textAngle)*85, cy + Math.sin(textAngle)*85); ctx.rotate(textAngle + Math.PI/2);
                ctx.fillStyle = isMin ? 'black' : COLORS.textSec; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(data.labelMin + 'm', 0, 0); ctx.restore();
            });
            if (currentKeyData) {
                const staffY = 430; const lineGap = 10; const staffWidth = 200; const staffX = (width - staffWidth) / 2;
                ctx.fillStyle = COLORS.text; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
                ctx.fillText(currentKeyData.text, cx, staffY - 40);
                ctx.strokeStyle = COLORS.textSec; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(staffX, staffY + i * lineGap); ctx.lineTo(staffX + staffWidth, staffY + i * lineGap); ctx.stroke(); }
                ctx.font = '40px serif'; ctx.textAlign = 'left'; ctx.fillText('𝄞', staffX + 10, staffY + 35); 
                ctx.font = 'bold 24px Arial'; const accStart = staffX + 60; const accGap = 15;
                for (let j = 0; j < currentKeyData.accCount; j++) { let yOffset = currentKeyData.accType === '#' ? SHARP_POS[j] : FLAT_POS[j]; ctx.fillText(currentKeyData.accType === '#' ? '♯' : '♭', accStart + j * accGap, staffY + yOffset); }
            }
        }

        function drawTheoryChart() {
            const ctx = theoryCanvas.getContext('2d'); ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, theoryCanvas.width, theoryCanvas.height); theoryHitboxes.length = 0;
            const indices = getScaleData();
            
            ctx.fillStyle = COLORS.text; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center';
            ctx.fillText(`${getNoteName(selectedRootIndex)} ${selectedScaleName} Scale`, theoryCanvas.width/2, 50);

            // 1. NOTES TABLE
            const tableY = 120; const tableX = 50; const cellW = 140; const cellH = 70;
            const headers = ["I", "II", "III", "IV", "V", "VI", "VII"];
            const lineY = tableY - 30;
            for(let i=0; i<6; i++) {
                const x1 = tableX + i*cellW + cellW/2; const x2 = tableX + (i+1)*cellW + cellW/2;
                ctx.beginPath(); ctx.moveTo(x1, lineY); ctx.lineTo(x2, lineY); ctx.strokeStyle = COLORS.textSec; ctx.lineWidth = 2; ctx.stroke();
                const midX = (x1+x2)/2;
                drawRoundedRect(ctx, midX-15, lineY-10, 30, 20, 10, COLORS.bg, COLORS.textSec);
                ctx.fillStyle = COLORS.textSec; ctx.font = 'bold 11px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(getIntervalLabel(indices[i], indices[i+1]), midX, lineY);
            }
            for(let i=0; i<7; i++) {
                const idx = indices[i]; const noteName = getNoteName(idx);
                const x = tableX + i*cellW;
                const isHovered = theoryHovered && theoryHovered.type === 'scaleNote' && theoryHovered.index === i;
                let bg = isHovered ? COLORS.chartHover : COLORS.chartRowEven;
                if(i===0) bg = COLORS.noteRoot; 
                drawRoundedRect(ctx, x+5, tableY, cellW-10, cellH, 12, bg, COLORS.border);
                ctx.fillStyle = (i===0) ? 'black' : COLORS.textSec; ctx.font = 'bold 14px Arial'; ctx.textAlign='center'; ctx.textBaseline='alphabetic';
                ctx.fillText(headers[i], x + cellW/2, tableY + 20);
                ctx.fillStyle = (i===0) ? 'black' : COLORS.text; ctx.font = 'bold 24px Arial'; 
                ctx.fillText(noteName, x + cellW/2, tableY + 50);
                let freq = getFrequency(idx, 3);
                theoryHitboxes.push({ type: 'scaleNote', x: x + cellW/2, y: tableY + cellH/2, w: cellW, h: cellH, index: i, noteName: noteName, freq: freq });
            }

            // 2. DIATONIC CHORDS
            const yChordStart = 280;
            ctx.fillStyle = COLORS.text; ctx.font = 'bold 24px Arial'; ctx.textAlign='center';
            ctx.fillText("Diatonic Chords", theoryCanvas.width/2, 250);
            const col1 = 150, col2 = 350, col3 = 700;
            drawRoundedRect(ctx, 100, yChordStart, 900, 40, 8, COLORS.chartHeader, null);
            ctx.fillStyle = COLORS.textSec; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'left';
            ctx.fillText("Degree", col1, yChordStart+25); ctx.fillText("Chord Name", col2, yChordStart+25); ctx.fillText("Notes", col3, yChordStart+25);

            for(let i=0; i<7; i++) {
                const rootIdx = indices[i]; const thirdIdx = indices[(i+2)%7]; const fifthIdx = indices[(i+4)%7];
                const chordInfo = identifyChord(rootIdx, thirdIdx, fifthIdx);
                const chordName = getNoteName(rootIdx) + chordInfo.s;
                const triadStr = `${getNoteName(rootIdx)} - ${getNoteName(thirdIdx)} - ${getNoteName(fifthIdx)}`;
                const yc = yChordStart + 50 + i*55;
                const isHovered = theoryHovered && theoryHovered.type === 'chord' && theoryHovered.index === i;
                let bg = isHovered ? COLORS.chartHover : (i%2===0 ? COLORS.chartRowEven : COLORS.chartRowOdd);
                drawRoundedRect(ctx, 100, yc-5, 900, 45, 8, bg, isHovered ? COLORS.accent : COLORS.border);
                ctx.fillStyle = COLORS.text; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'left';
                ctx.fillText(ROMAN_NUMERALS[i] + (chordInfo.q==='Minor'?'m':'') + (chordInfo.q==='Dim'?'°':''), col1, yc+25);
                ctx.fillStyle = (i===0) ? (isDark?'#e67e22':'#d35400') : COLORS.text; ctx.font = 'bold 18px Arial'; ctx.fillText(chordName, col2, yc+25);
                ctx.fillStyle = COLORS.textSec; ctx.font = '16px monospace'; ctx.fillText(triadStr, col3, yc+25);
                theoryHitboxes.push({ type: 'chord', x: 550, y: yc+17.5, w: 900, h: 45, index: i, triadIndices: [rootIdx, thirdIdx, fifthIdx] });
            }

            // 3. PROGRESSIONS
            const yProg = 780;
            const progs = PROGRESSIONS[selectedScaleName] || PROGRESSIONS['Other'];
            ctx.fillStyle = COLORS.text; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.fillText("Progressions", theoryCanvas.width/2, 740);
            progs.forEach((p, pi) => {
               const yp = yProg + pi * 70;
               const isHovered = theoryHovered && theoryHovered.type === 'prog' && theoryHovered.index === pi;
               drawRoundedRect(ctx, 200, yp, 700, 50, 25, isHovered ? COLORS.chartHover : COLORS.progBg, isHovered ? COLORS.accent : COLORS.border);
               
               const centerY = yp + 25; // Middle of rect
               ctx.textBaseline = 'middle';
               
               ctx.fillStyle = isHovered ? COLORS.accent : COLORS.textSec; ctx.beginPath(); ctx.moveTo(225, centerY-10); ctx.lineTo(245, centerY); ctx.lineTo(225, centerY+10); ctx.fill();
               ctx.fillStyle = COLORS.text; ctx.textAlign = 'left'; ctx.font = 'bold 18px Arial'; ctx.fillText(p.name, 260, centerY);
               const seqText = p.degrees.map(d => { const dIdx = indices[d]; const info = identifyChord(dIdx, indices[(d+2)%7], indices[(d+4)%7]); return getNoteName(dIdx) + info.s; }).join("  ➜  ");
               const seqObj = p.degrees.map(d => { return { notes: [{freq: getFrequency(indices[d], 3)}, {freq: getFrequency(indices[(d+2)%7], 3)}, {freq: getFrequency(indices[(d+4)%7], 3)}]}; });
               ctx.fillStyle = COLORS.textSec; ctx.textAlign = 'right'; ctx.font = '16px Arial'; ctx.fillText(seqText, 860, centerY);
               
               ctx.textBaseline = 'alphabetic'; // reset
               theoryHitboxes.push({ type: 'prog', x: 550, y: centerY, w: 700, h: 50, index: pi, sequence: seqObj });
            });
        }


        function drawFretboard() {
            const ctx = fbCanvas.getContext('2d'); ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, fbCanvas.width, fbCanvas.height); fbHitboxes.length=0;
            const indices = getScaleData();
            const activeSet = new Set(indices);
            const nutX = 80, stringY = 60, stringGap = 40, fretGap = 50;
            for(let s=0; s<6; s++) { const y = stringY + s*stringGap; ctx.beginPath(); ctx.moveTo(nutX, y); ctx.lineTo(1350, y); ctx.lineWidth = 1 + s*0.5; ctx.strokeStyle = COLORS.string; ctx.stroke(); }
            for(let f=0; f<=24; f++) {
                const x = nutX + f*fretGap; ctx.beginPath(); ctx.moveTo(x, stringY); ctx.lineTo(x, stringY+5*stringGap); 
                ctx.lineWidth = f===0 ? 8 : 2; ctx.strokeStyle = f===0 ? COLORS.nut : COLORS.fret; ctx.stroke();
                if(f>0 && [3,5,7,9,15,17,19,21].includes(f)) { ctx.beginPath(); ctx.arc(x-fretGap/2, stringY+2.5*stringGap, 5, 0, Math.PI*2); ctx.fillStyle='#ddd'; ctx.fill(); }
                if(f===12 || f===24) { ctx.beginPath(); ctx.arc(x-fretGap/2, stringY+1.5*stringGap, 5, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(x-fretGap/2, stringY+3.5*stringGap, 5, 0, Math.PI*2); ctx.fill(); }
                if(f>0) { ctx.fillStyle = COLORS.textSec; ctx.font = '12px Arial'; ctx.textAlign = 'center'; ctx.fillText(f, x-fretGap/2, stringY + 5*stringGap + 20); }
            }

            let notesToShow = [];
            if (practiceQuestion?.mode === 'chord-shape') {
                activeGuitarMidi.clear();
                notesToShow = practiceQuestion.voicingNotes.map((note) => ({
                    ...note,
                    s: 5 - note.s,
                    isRoot: note.midi % 12 === selectedRootIndex
                }));
                notesToShow.forEach((note) => activeGuitarMidi.add(note.midi));
            } else if (currentNotationType === 'chord') {
                notesToShow = currentVoicingNotes.map(n => ({ ...n, s: 5 - n.s, isRoot: (n.midi%12 === selectedRootIndex) })); 
            } else {
                activeGuitarMidi.clear();
                for(let s=0; s<6; s++) {
                    const openVal = OPEN_STRING_MIDI[5-s]; 
                    for(let f=0; f<=24; f++) {
                        const m = openVal + f; const idx = m % 12;
                        if (activeSet.has(idx) && isInCurrentPosition(f)) {
                            
                            // --- منطق حذف نت هم‌صدای تکراری در پوزیشن ---
                            let isDuplicateInPos = false;
                            if (currentPos !== 'all' && s > 0) { 
                                // بررسی سیم بالایی (نازک‌تر)
                                const upperStringOpen = OPEN_STRING_MIDI[5-(s-1)];
                                const neededFretOnUpper = m - upperStringOpen;
                                // اگر همان نت روی سیم نازک‌تر و در همان پوزیشن باشد، این یکی را حذف کن
                                if (neededFretOnUpper >= 0 && neededFretOnUpper <= 24 && isInCurrentPosition(neededFretOnUpper)) {
                                    isDuplicateInPos = true;
                                }
                            }

                            if (!isDuplicateInPos) {
                                notesToShow.push({ s:s, f:f, midi:m, note: getNoteName(idx), isRoot: idx===selectedRootIndex });
                                activeGuitarMidi.add(m);
                            }
                        }
                    }
                }
            }

            if (practiceQuestion?.mode === 'build-scale') {
                notesToShow = [];
                activeGuitarMidi.clear();
                const string = 5 - practiceQuestion.stringIndex;
                const openMidi = OPEN_STRING_MIDI[practiceQuestion.stringIndex];
                for (let fret = 0; fret <= 12; fret++) {
                    const midi = openMidi + fret;
                    const isSelected = practiceQuestion.selectedFrets.has(fret);
                    notesToShow.push({
                        s: string,
                        f: fret,
                        midi,
                        note: getNoteName(midi % 12),
                        isRoot: false,
                        isScaleChoice: true,
                        isSelected,
                        isScaleTarget: practiceQuestion.answered && practiceQuestion.targetFrets.has(fret)
                    });
                    if (isSelected) activeGuitarMidi.add(midi);
                }
            } else if (practiceQuestion?.mode === 'fretboard-note' || practiceQuestion?.mode === 'ear-to-fretboard') {
                if (!practiceQuestion.answered) {
                    notesToShow = [];
                    activeGuitarMidi.clear();
                }
                for (let string = 0; string < 6; string++) {
                    const openMidi = OPEN_STRING_MIDI[5 - string];
                    for (let fret = 0; fret <= 24; fret++) {
                        const midi = openMidi + fret;
                        if (!practiceQuestion.answered) {
                            notesToShow.push({ s: string, f: fret, midi, note: getNoteName(midi % 12), isRoot: false, isPracticeTarget: false });
                            continue;
                        }
                        if (midi % 12 !== practiceQuestion.targetPitchClass) continue;

                        const existingNote = notesToShow.find((note) => note.s === string && note.f === fret);
                        if (existingNote) existingNote.isPracticeTarget = true;
                        else {
                            notesToShow.push({ s: string, f: fret, midi, note: getNoteName(midi % 12), isRoot: false, isPracticeTarget: true });
                        }

                        activeGuitarMidi.add(midi);
                    }
                }
            }

            notesToShow.forEach(n => {
                const x = nutX + n.f*fretGap - (n.f===0 ? 20 : fretGap/2); const y = stringY + n.s*stringGap;
                const isHovered = fbHovered && fbHovered.s === n.s && fbHovered.f === n.f;
                const isPianoMatch = pianoHovered && pianoHovered.midi === n.midi;
                const isNotationMatch = notationHovered && notationHovered.midi === n.midi;
                const r = n.isRoot ? 16 : 13;
                if(isHovered || isPianoMatch || isNotationMatch) { ctx.beginPath(); ctx.arc(x, y, r+5, 0, Math.PI*2); ctx.fillStyle = isDark ? 'rgba(212, 175, 55, 0.6)' : 'rgba(253, 184, 39, 0.5)'; ctx.fill(); }
                ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
                if (showOctaves) { const oct = Math.floor(n.midi/12)-1; ctx.fillStyle = OCTAVE_COLORS[oct] || COLORS.noteOther; } 
                else { ctx.fillStyle = n.isRoot ? COLORS.noteRoot : ((isHovered || isPianoMatch) ? '#444' : COLORS.noteOther); }
                if (n.isPracticeTarget) ctx.fillStyle = '#00b894';
                if (n.isScaleChoice) ctx.fillStyle = n.isScaleTarget ? '#00b894' : n.isSelected ? COLORS.noteRoot : COLORS.noteOther;
                ctx.fill(); ctx.fillStyle = (showOctaves || n.isRoot) ? 'white' : COLORS.noteText; ctx.font = 'bold 12px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
                if (n.isPracticeTarget) { ctx.strokeStyle = '#006d58'; ctx.lineWidth = 3; ctx.stroke(); }
                if (n.isScaleChoice && n.isScaleTarget) { ctx.strokeStyle = '#006d58'; ctx.lineWidth = 3; ctx.stroke(); }
                const hideAnswerLabels = (
                    ['fretboard-note', 'ear-to-fretboard'].includes(practiceQuestion?.mode) && !practiceQuestion.answered
                ) || (practiceQuestion?.mode === 'build-scale' && !practiceQuestion.answered)
                    || (practiceQuestion?.mode === 'chord-shape' && !practiceQuestion.answered);
                if (!hideAnswerLabels) {
                    ctx.fillText(showOctaves ? n.note + (Math.floor(n.midi/12)-1) : n.note, x, y);
                }
                fbHitboxes.push({ type: 'note', x, y, radius: r, s: n.s, f: n.f, midi: n.midi, noteName: n.note, freq: midiToFreq(n.midi) });
            });

            if (teachingModeEnabled) {
                const hitPositions = new Set(fbHitboxes.map((hitbox) => `${hitbox.s}:${hitbox.f}`));
                for (let string = 0; string < 6; string++) {
                    for (let fret = 0; fret <= 24; fret++) {
                        if (hitPositions.has(`${string}:${fret}`)) continue;
                        const midi = OPEN_STRING_MIDI[5 - string] + fret;
                        fbHitboxes.push({
                            type: 'note',
                            x: nutX + fret * fretGap - (fret === 0 ? 20 : fretGap / 2),
                            y: stringY + string * stringGap,
                            radius: 18,
                            s: string,
                            f: fret,
                            midi,
                            noteName: getNoteName(midi % 12),
                            freq: midiToFreq(midi)
                        });
                    }
                }
            }

            getTeachingFretboardMarkers().forEach((marker) => {
                const x = nutX + marker.fret * fretGap - (marker.fret === 0 ? 20 : fretGap / 2);
                const y = stringY + marker.string * stringGap;
                const role = getTeachingRole(marker.role);
                const hasBaseNote = notesToShow.some((note) => note.s === marker.string && note.f === marker.fret);

                ctx.beginPath();
                ctx.arc(x, y, 19, 0, Math.PI * 2);
                ctx.strokeStyle = role.color;
                ctx.lineWidth = 3;
                ctx.stroke();
                if (!hasBaseNote) {
                    ctx.beginPath();
                    ctx.arc(x, y, 13, 0, Math.PI * 2);
                    ctx.fillStyle = role.color;
                    ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.font = 'bold 10px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(getNoteName(marker.midi % 12), x, y);
                }
                ctx.fillStyle = role.color;
                ctx.font = 'bold 9px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(role.marker, x + 14, y - 14);
            });
        }

        function drawPiano() {
            const ctx = pianoCanvas.getContext('2d'); ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, pianoCanvas.width, pianoCanvas.height); pianoHitboxes.length = 0;
            const startMidi = 36; const endMidi = 88; let whiteKeyCount = 0; for(let m=startMidi; m<=endMidi; m++) { if(![1, 3, 6, 8, 10].includes(m % 12)) whiteKeyCount++; }
            const keyWidth = pianoCanvas.width / whiteKeyCount; const keyHeight = 180; const blackKeyHeight = 110; const blackKeyWidth = keyWidth * 0.65; let xPos = 0;
            for (let m = startMidi; m <= endMidi; m++) {
                const noteVal = m % 12; const isBlack = [1, 3, 6, 8, 10].includes(noteVal);
                if (!isBlack) {
                    const isActive = activeGuitarMidi.has(m); const isHovered = pianoHovered && pianoHovered.midi === m; const isGuitarMatch = fbHovered && fbHovered.midi === m; const isNotationMatch = notationHovered && notationHovered.midi === m; const oct = Math.floor(m / 12) - 1; const noteName = getNoteName(noteVal);
                    const teachingAnnotation = getTeachingAnnotationForMidi(m);
                    ctx.fillStyle = isHovered || isGuitarMatch || isNotationMatch ? '#ddd'
                        : teachingAnnotation ? getTeachingRole(teachingAnnotation.role).color
                            : isActive ? (showOctaves ? OCTAVE_COLORS[oct] : COLORS.noteRoot)
                                : isDark ? '#333' : '#fcfcfc';
                    ctx.strokeStyle = COLORS.pianoBorder; ctx.lineWidth = 1; if (noteVal === 0) { ctx.lineWidth = 3; ctx.strokeStyle = isDark ? '#888' : '#333'; }
                    ctx.fillRect(xPos, 0, keyWidth, keyHeight); ctx.strokeRect(xPos, 0, keyWidth, keyHeight); ctx.lineWidth = 1; 
                    pianoHitboxes.push({ type: 'pianoKey', x: xPos, y: 0, w: keyWidth, h: keyHeight, midi: m, note: noteName, oct: oct, isBlack: false });
                    if (isActive || teachingAnnotation || isHovered || isGuitarMatch || isNotationMatch || noteVal === 0) { ctx.fillStyle = (isActive && showOctaves) || teachingAnnotation ? 'white' : (isDark ? '#eee' : '#444'); ctx.font = (noteVal === 0 && !isActive) ? 'bold 14px Arial' : 'bold 12px Arial'; ctx.textAlign = 'center'; let label = noteName; if (showOctaves || noteVal === 0) label += oct; ctx.fillText(label, xPos + keyWidth/2, keyHeight - 15); }
                    if (teachingAnnotation) {
                        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
                        ctx.fillText(getTeachingRole(teachingAnnotation.role).marker, xPos + keyWidth / 2, 18);
                    }
                    xPos += keyWidth;
                }
            }
            xPos = 0;
            for (let m = startMidi; m <= endMidi; m++) {
                const noteVal = m % 12; const isBlack = [1, 3, 6, 8, 10].includes(noteVal);
                if (!isBlack) { xPos += keyWidth; } else {
                    const bx = xPos - (blackKeyWidth / 2); const isActive = activeGuitarMidi.has(m); const isHovered = pianoHovered && pianoHovered.midi === m; const isGuitarMatch = fbHovered && fbHovered.midi === m; const isNotationMatch = notationHovered && notationHovered.midi === m; const oct = Math.floor(m / 12) - 1; const noteName = getNoteName(noteVal);
                    const teachingAnnotation = getTeachingAnnotationForMidi(m);
                    ctx.fillStyle = isHovered || isGuitarMatch || isNotationMatch ? '#666'
                        : teachingAnnotation ? getTeachingRole(teachingAnnotation.role).color
                            : isActive ? (showOctaves ? OCTAVE_COLORS[oct] : COLORS.noteRoot) : COLORS.pianoBlack;
                    ctx.fillRect(bx, 0, blackKeyWidth, blackKeyHeight); ctx.strokeStyle = isDark ? '#555' : '#000'; ctx.strokeRect(bx, 0, blackKeyWidth, blackKeyHeight);
                    pianoHitboxes.push({ type: 'pianoKey', x: bx, y: 0, w: blackKeyWidth, h: blackKeyHeight, midi: m, note: noteName, oct: oct, isBlack: true });
                    if (isActive || teachingAnnotation || isHovered || isGuitarMatch || isNotationMatch) { ctx.fillStyle = 'white'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(noteName, bx + blackKeyWidth/2, blackKeyHeight - 8); }
                    if (teachingAnnotation) {
                        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
                        ctx.fillText(getTeachingRole(teachingAnnotation.role).marker, bx + blackKeyWidth / 2, 14);
                    }
                }
            }
        }

        // --- HANDLERS ---
