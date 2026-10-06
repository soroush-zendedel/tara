        // Translate pointer coordinates into canvas space and handle note selection.
        function handleMouse(e, canvas, hitboxes, hoverVarName) {
            const rect = canvas.getBoundingClientRect(); 
            const clientX = e.clientX;
            const clientY = e.clientY;
            if (typeof clientX !== 'number' || typeof clientY !== 'number') return;
            const x = (clientX - rect.left) * (canvas.width / rect.width); 
            const y = (clientY - rect.top) * (canvas.height / rect.height);
            
            let found = null;
            if (canvas.id === 'theoryCanvas') {
                found = hitboxes.find(h => {
                    if (h.type === 'scaleNote') return x >= h.x - h.w/2 && x <= h.x + h.w/2 && y >= h.y - h.h/2 && y <= h.y + h.h/2;
                    if (h.type === 'chord') return x >= h.x - h.w/2 && x <= h.x + h.w/2 && y >= h.y - h.h/2 && y <= h.y + h.h/2; 
                    if (h.type === 'prog') return x >= h.x - h.w/2 && x <= h.x + h.w/2 && y >= h.y - h.h/2 && y <= h.y + h.h/2;
                    return false;
                });
            } 
            else if (canvas.id === 'circleCanvas') {
                 const cx = 225, cy = 200;
                 const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
                 let ang = Math.atan2(y-cy, x-cx);
                 if(ang < -Math.PI/2 - Math.PI/12) ang += Math.PI*2; 
                 found = hitboxes.find(h => d >= h.rMin && d <= h.rMax && ang >= h.startAngle && ang <= h.endAngle);
            }
            else if (canvas.id === 'notationCanvas') { found = hitboxes.find(h => Math.abs(x - h.x) < 20); }
            else {
                 const orderedHitboxes = canvas.id === 'pianoCanvas' ? [...hitboxes].reverse() : hitboxes;
                 for(let h of orderedHitboxes) {
                     if (h.radius && Math.sqrt((x-h.x)**2 + (y-h.y)**2) < h.radius) { found = h; break; }
                     if (h.w && x >= h.x && x <= h.x+h.w && y >= h.y && y <= h.y+h.h) { found = h; break; }
                 }
            }

            const tooltip = document.getElementById('tooltip');
            const isHiddenAnswerPractice = canvas.id === 'fretboardCanvas' && practiceQuestion?.mode === 'fretboard-note' && !practiceQuestion.answered;
            if (!isHiddenAnswerPractice && found && (found.type === 'scaleNote' || found.type === 'note' || found.type === 'pianoKey' || found.type === 'notationNote')) {
                 tooltip.style.display = 'block';
                 tooltip.style.left = clientX + 'px'; tooltip.style.top = clientY + 'px';
                 let f = found.freq || (found.midi ? midiToFreq(found.midi) : 0);
                 let n = found.noteName || (found.midi ? getNoteName(found.midi%12) : found.note);
                 let o = found.octave || (found.midi ? Math.floor(found.midi/12)-1 : 0);
                 tooltip.innerHTML = `<strong>${n}${o}</strong><br>${f.toFixed(1)} Hz`;
            } else { tooltip.style.display = 'none'; }

            let needsRedraw = false;
            if (canvas.id === 'fretboardCanvas') { if(JSON.stringify(fbHovered) !== JSON.stringify(found)) { fbHovered = found; needsRedraw = true; } }
            if (canvas.id === 'pianoCanvas') { if(JSON.stringify(pianoHovered) !== JSON.stringify(found)) { pianoHovered = found; needsRedraw = true; } }
            if (canvas.id === 'notationCanvas') { if(JSON.stringify(notationHovered) !== JSON.stringify(found)) { notationHovered = found; needsRedraw = true; } }
            if (canvas.id === 'theoryCanvas') { if(JSON.stringify(theoryHovered) !== JSON.stringify(found)) { theoryHovered = found; needsRedraw = true; } }
            if (canvas.id === 'circleCanvas') { if(circleHovered !== found) { circleHovered = found; needsRedraw = true; } }

            if (needsRedraw) { drawAll(); }
            
            if (e.type === 'click') {
                if (handleTeachingNoteClick(canvas, found)) return;
                if (canvas.id === 'fretboardCanvas' && handleFretboardPracticeClick(found)) return;
                if (audioCtx.state === 'suspended') audioCtx.resume();
                if (!found) return;
                
                if (found.type === 'chord') {
                    if (currentChordIndex === found.index) { currentVoicingIndex++; } 
                    else { currentChordIndex = found.index; currentVoicingIndex = 0; }
                    
                    const allVoicings = getVoicings(found.triadIndices);
                    if (allVoicings.length > 0) {
                        const v = allVoicings[currentVoicingIndex % allVoicings.length];
                        currentVoicingNotes = v; currentNotationType = 'chord';
                        playVoicing(v); drawAll();
                    }
                }
                else if (found.type === 'prog') {
                    const sequence = found.sequence.map(s => { return s; });
                    playProgression(sequence);
                    currentNotationType = 'scale'; drawAll();
                }
                else if (found.type === 'circle') {
                    selectedRootIndex = found.rootIdx;
                    selectedScaleName = found.mode;
                    const select = document.getElementById('rootSelect');
                    for(let i=0; i<select.options.length; i++) {
                        if(parseInt(select.options[i].value) === selectedRootIndex) {
                            select.selectedIndex = i; break;
                        }
                    }
                    document.getElementById('scaleSelect').value = selectedScaleName;
                    currentNotationType = 'scale';
                    generateVisuals();
                    refreshPracticeForKeyChange();
                }
                else if (found.freq || found.midi) {
                    let f = found.freq || midiToFreq(found.midi);
                    playGuitarNote(f);
                }
            }
        }

        // Clear the active note as soon as the pointer leaves its canvas.
        function clearCanvasHover(canvas) {
            let didClear = false;
            if (canvas.id === 'fretboardCanvas' && fbHovered) { fbHovered = null; didClear = true; }
            if (canvas.id === 'pianoCanvas' && pianoHovered) { pianoHovered = null; didClear = true; }
            if (canvas.id === 'notationCanvas' && notationHovered) { notationHovered = null; didClear = true; }
            if (canvas.id === 'theoryCanvas' && theoryHovered) { theoryHovered = null; didClear = true; }
            if (canvas.id === 'circleCanvas' && circleHovered) { circleHovered = null; didClear = true; }

            if (tooltip) tooltip.style.display = 'none';
            if (didClear) drawAll();
        }

        // --- INIT ---
        window.addEventListener('load', () => {
            fbCanvas = document.getElementById('fretboardCanvas');
            thCanvas = document.getElementById('theoryCanvas');
            circleCanvas = document.getElementById('circleCanvas');
            pianoCanvas = document.getElementById('pianoCanvas');
            notationCanvas = document.getElementById('notationCanvas');
            tooltip = document.getElementById('tooltip');

            const rSel = document.getElementById('rootSelect');
            const sSel = document.getElementById('scaleSelect');
            
            for(let i=0; i<12; i++) {
                let label = CHROMATIC_SHARP[i];
                if (CHROMATIC_SHARP[i] !== CHROMATIC_FLAT[i]) label += " / " + CHROMATIC_FLAT[i];
                let opt = new Option(label, i);
                rSel.add(opt);
            }
            Object.keys(VALID_SCALES).forEach(s => sSel.add(new Option(s, s)));
            
            rSel.value = 9; sSel.value = 'Minor';

            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                toggleTheme();
            }

            rSel.addEventListener('change', (e) => { selectedRootIndex = parseInt(e.target.value); generateVisuals(); refreshPracticeForKeyChange(); });
            sSel.addEventListener('change', (e) => { selectedScaleName = e.target.value; generateVisuals(); refreshPracticeForKeyChange(); });

            const attachEvents = (cvs, hitboxes, hoverVarName) => {
                cvs.addEventListener('pointermove', e => {
                    if (e.pointerType === 'mouse') handleMouse(e, cvs, hitboxes, hoverVarName);
                });
                cvs.addEventListener('pointerleave', () => clearCanvasHover(cvs));
                // Native click events support taps while leaving horizontal swipes available to the scroll container.
                cvs.addEventListener('click', e => handleMouse(e, cvs, hitboxes, hoverVarName));
            };

            attachEvents(fbCanvas, fbHitboxes, 'fbHovered');
            attachEvents(thCanvas, theoryHitboxes, 'theoryHovered');
            attachEvents(circleCanvas, circleHitboxes, 'circleHovered');
            attachEvents(pianoCanvas, pianoHitboxes, 'pianoHovered');
            attachEvents(notationCanvas, notationHitboxes, 'notationHovered');
            
            generateVisuals();
        });

        function generateVisuals() { drawAll(); }

