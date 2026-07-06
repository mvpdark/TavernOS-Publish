import{execFile as d}from"node:child_process";import{promisify as _}from"node:util";import{writeFile as b,unlink as y}from"node:fs/promises";import{join as v}from"node:path";import{tmpdir as E}from"node:os";import{randomUUID as T}from"node:crypto";const w=_(d);export const DEFAULT_AUDIO_RHYTHM_CONFIG={pythonPath:"python",sampleRate:22050,hopLength:512,energyThreshold:.3,timeoutMs:6e4};const S=`
import json
import sys
import librosa
import numpy as np

audio_path = sys.argv[1]
sample_rate = int(sys.argv[2])
hop_length = int(sys.argv[3])

y, sr = librosa.load(audio_path, sr=sample_rate)
duration = len(y) / sr

# Tempo and beats
tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop_length)
# Handle librosa versions that return tempo as a numpy array
tempo = float(np.atleast_1d(tempo)[0])
beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=hop_length)

# Onset envelope
onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
onset_frames = librosa.util.peak_pick(onset_env, pre_max=3, post_max=3, pre_avg=3, post_avg=5, delta=0.5, wait=10)
onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=hop_length)

# Normalize onset envelope to 0-1
onset_env_norm = onset_env / (onset_env.max() if onset_env.max() > 0 else 1)

# Downbeat estimation (every 4th beat in 4/4 time)
downbeat_indices = [i for i in range(len(beat_frames)) if i % 4 == 0]

# Sample onset envelope at beat times for energy
beat_energies = []
for bt in beat_times:
    frame = int(bt * sr / hop_length)
    if frame < len(onset_env_norm):
        beat_energies.append(float(onset_env_norm[frame]))
    else:
        beat_energies.append(0.0)

result = {
    "bpm": float(tempo),
    "beatTimes": [float(t) for t in beat_times],
    "onsetEnvelope": [float(e) for e in onset_env_norm[::20]],  # downsample for output
    "onsetTimes": [float(t) for t in onset_times],
    "downbeatIndices": downbeat_indices,
    "duration": float(duration),
    "sampleRate": sr,
    "beatEnergies": beat_energies,
}
print(json.dumps(result))
`;function I(){return{bpm:0,beatTimes:[],onsetEnvelope:[],onsetTimes:[],downbeatIndices:[],duration:0,sampleRate:0}}function h(o){return{beats:I(),syncPoints:[],averageEnergy:0,mood:"calm",success:!1,error:o}}export class AudioRhythmAnalyzer{config;execFn;constructor(e,r){this.config={...DEFAULT_AUDIO_RHYTHM_CONFIG,...e},this.execFn=r??(async(i,s,n)=>{const t=await w(i,s,n);return{stdout:String(t.stdout),stderr:String(t.stderr)}})}async analyze(e){const r=v(E(),`audio-rhythm-${T()}.py`);await b(r,S,"utf8");try{const i=[r,e,String(this.config.sampleRate),String(this.config.hopLength)];let s;try{s=(await this.execFn(this.config.pythonPath,i,{timeout:this.config.timeoutMs,maxBuffer:10485760})).stdout}catch(a){const g=a,f=`${g.message??""}
${g.stderr??""}`;return/ModuleNotFoundError|ImportError|No module named/i.test(f)?h("librosa is not installed in the Python environment. Install it with: pip install librosa numpy"):/librosa/i.test(f)?h("librosa failed to load. Ensure librosa (and numpy) are installed: pip install librosa numpy"):h(`Python analysis failed: ${g.message??String(a)}`)}let n;try{n=JSON.parse(s.trim())}catch(a){return h("Failed to parse Python output as JSON: "+(a instanceof Error?a.message:String(a)))}const t={bpm:c(n.bpm),beatTimes:p(n.beatTimes),onsetEnvelope:p(n.onsetEnvelope),onsetTimes:p(n.onsetTimes),downbeatIndices:p(n.downbeatIndices).map(a=>Math.round(a)),duration:c(n.duration),sampleRate:Math.round(c(n.sampleRate)),beatEnergies:p(n.beatEnergies)},m=this.generateSyncPoints(t),u=this.computeAverageEnergy(t),l=this.estimateMood(t.bpm);return{beats:t,syncPoints:m,averageEnergy:u,mood:l,success:!0}}finally{try{await y(r)}catch{}}}generateSyncPoints(e,r){const i=r?.energyThreshold??this.config.energyThreshold,s=new Set(e.downbeatIndices),n=[];for(let t=0;t<e.beatTimes.length;t++){const m=this.getBeatEnergy(e,t);if(m<i)continue;const u=s.has(t);let l;u&&m>.7?l="flash":m>.6?l="cut":l="crossfade",n.push({time:e.beatTimes[t],beatIndex:t,isDownbeat:u,energy:m,suggestedTransition:l})}return n.sort((t,m)=>t.time-m.time)}alignToBeats(e,r){return e.map(i=>{for(const s of r.beatTimes)if(s>=i)return s;return i})}estimateMood(e){return e<70?"calm":e<100?"moderate":e<=130?"energetic":"intense"}getBeatEnergy(e,r){if(e.beatEnergies&&r<e.beatEnergies.length)return e.beatEnergies[r];if(e.beatTimes.length===0||e.onsetEnvelope.length===0||e.sampleRate<=0)return 0;const i=e.beatTimes[r],s=this.config.hopLength,n=Math.floor(i*e.sampleRate/s),t=Math.floor(n/20);return t>=0&&t<e.onsetEnvelope.length?e.onsetEnvelope[t]:0}computeAverageEnergy(e){const r=e.beatEnergies&&e.beatEnergies.length>0?e.beatEnergies:e.onsetEnvelope;return r.length===0?0:r.reduce((s,n)=>s+n,0)/r.length}}function c(o){if(typeof o=="number"&&Number.isFinite(o))return o;if(typeof o=="string"){const e=parseFloat(o);if(Number.isFinite(e))return e}return 0}function p(o){return Array.isArray(o)?o.map(e=>c(e)):[]}
