// Own microphone access and note detection for the chromatic tuner.
function toggleTuner() {
    const modal = document.getElementById('tunerModal');
    if (isTunerActive) {
        isTunerActive = false;
        modal.style.display = 'none';
        stopTuner();
        return;
    }

    isTunerActive = true;
    modal.style.display = 'flex';
    if (audioCtx.state === 'suspended') audioCtx.resume();
    startTuner();
}

async function startTuner() {
    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('Microphone access requires HTTPS or localhost.');
        }

        tunerStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isTunerActive) {
            tunerStream.getTracks().forEach((track) => track.stop());
            tunerStream = null;
            return;
        }

        tunerSource = audioCtx.createMediaStreamSource(tunerStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        tunerSource.connect(analyser);
        updateTuner();
    } catch (error) {
        console.error('Unable to start the tuner:', error);
        alert('Microphone access is unavailable. Allow microphone access and use HTTPS or localhost.');
        isTunerActive = false;
        document.getElementById('tunerModal').style.display = 'none';
        stopTuner();
    }
}

function stopTuner() {
    if (tunerStream) tunerStream.getTracks().forEach((track) => track.stop());
    if (tunerRafId) cancelAnimationFrame(tunerRafId);
    if (tunerSource) tunerSource.disconnect();
    tunerStream = null;
    tunerSource = null;
    analyser = null;
    tunerRafId = null;
}

// Search the guitar's audible range and refine the strongest period peak.
function autoCorrelate(samples, sampleRate) {
    const sampleCount = samples.length;
    let energy = 0;
    for (let i = 0; i < sampleCount; i++) energy += samples[i] * samples[i];
    if (Math.sqrt(energy / sampleCount) < 0.01) return -1;

    const minLag = Math.max(2, Math.floor(sampleRate / 1200));
    const maxLag = Math.min(Math.floor(sampleCount / 2), Math.ceil(sampleRate / 70));
    const correlations = new Float32Array(maxLag + 1);
    let bestLag = -1;
    let bestValue = 0;

    for (let lag = minLag; lag <= maxLag; lag++) {
        let correlation = 0;
        for (let i = 0; i < sampleCount - lag; i++) {
            correlation += samples[i] * samples[i + lag];
        }
        correlations[lag] = correlation;
        if (correlation > bestValue) {
            bestValue = correlation;
            bestLag = lag;
        }
    }

    if (bestLag < 0 || bestValue <= 0) return -1;
    const left = correlations[bestLag - 1] || bestValue;
    const center = correlations[bestLag];
    const right = correlations[bestLag + 1] || bestValue;
    const denominator = left - 2 * center + right;
    const offset = denominator === 0 ? 0 : 0.5 * (left - right) / denominator;
    const period = bestLag + Math.max(-0.5, Math.min(0.5, offset));

    return period > 0 ? sampleRate / period : -1;
}

function updateTuner() {
    if (!isTunerActive || !analyser) return;

    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    const frequency = autoCorrelate(samples, audioCtx.sampleRate);
    const noteElement = document.getElementById('tunerNote');
    const frequencyElement = document.getElementById('tunerFreq');
    const needle = document.getElementById('tunerNeedle');
    const status = document.getElementById('tunerStatus');

    if (frequency < 0) {
        noteElement.innerText = '--';
        frequencyElement.innerText = '0.0 Hz';
        needle.style.transform = 'rotate(0deg)';
        status.innerText = '';
    } else {
        const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
        const noteIndex = ((midi % 12) + 12) % 12;
        const note = CURRENT_CHROMATIC[noteIndex];
        const octave = Math.floor(midi / 12) - 1;
        const cents = 1200 * Math.log2(frequency / midiToFreq(midi));
        const needleAngle = Math.max(-45, Math.min(45, cents));

        noteElement.innerText = `${note}${octave}`;
        frequencyElement.innerText = `${frequency.toFixed(1)} Hz`;
        needle.style.transform = `rotate(${needleAngle}deg)`;

        const inTune = Math.abs(cents) < 5;
        status.innerText = inTune ? 'In Tune! ✨' : cents < 0 ? 'Flat ♭' : 'Sharp ♯';
        status.style.color = inTune ? '#27ae60' : '#e74c3c';
        needle.style.backgroundColor = inTune ? '#27ae60' : '#e74c3c';
    }

    tunerRafId = requestAnimationFrame(updateTuner);
}
