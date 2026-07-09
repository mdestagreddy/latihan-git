/**
 * SuperPCM.js
 *
 * Advanced PCM & WAV Toolkit (vanilla JavaScript)
 *
 * Features:
 *  - PCM 8/16/24/32-bit signed integer
 *  - PCM 32-bit float (WAV AudioFormat 3)
 *  - ADPCM 4-bit (IMA ADPCM) & 3-bit, include Joint-Stereo
 *  - AudioBuffer <-> PCM
 *  - PCM <-> WAV/MP3/FLAC/EAC (Blob)
 *  - WAV <-> AudioBuffer/PCM
 *  - Streaming PCM data
 *  - Player
 *  - Audio Stream from <audio> or <video>
 *  - Recorder
 *  - Gapless
 *  - Amplitudo
 *  - Resample
 *  - Cut
 *  - Merge Audio Source
 *  - Stereo Enhancer
 *  - Null Test
 *  - Audio Watermark
 * 
 * Supports asynchronous and synchronous processing on some features
 * No ES Module, no TypeScript. Exposes a global: window.SuperPCM (or global.SuperPCM).
 */

(function (global) {
  var SuperPCM = {};

  // Bit-depth constants
  SuperPCM.BIT_DEPTH_8 = 8;
  SuperPCM.BIT_DEPTH_16 = 16;
  SuperPCM.BIT_DEPTH_24 = 24;
  SuperPCM.BIT_DEPTH_32 = 32;

  // Defaults
  SuperPCM.defaults = {
    sampleRate: 48000,
    channels: 2,
    bitDepth: SuperPCM.BIT_DEPTH_16,
    float: false // false = integer PCM, true = float32 PCM
  };

  // Minimum and maximum sample rate
  SuperPCM.minimumSampleRate = 4000;
  SuperPCM.maximumSampleRate = 192000;

  // Time update hook event miliseconds
  SuperPCM.timeUpdateMs = 1000 / 30;

  // Interpolation mode amplitudo (Smooth the amplitudo to reduce digital distortion)
  // Supports step/zoh, linear, cosine, quadratic, cubic, hermite,
  // sinc/lanczos, bspline, akima, lanczos3, kaiser,
  // catmullrom, mitchell, blackman, and gaussian
  SuperPCM.interpolationMode = "cubic";

  // Fade play/pause miliseconds
  SuperPCM.fadePlayPauseMs = 250;

  // Streaming running on Background (default: false)
  SuperPCM.runOnBackground = false;
  
  // Asynchronous processing frame size
  SuperPCM.asyncFrameSize = 65536;
  
  /** Asynchronous Processing **/
  SuperPCM.AsyncProcessing = function (options) {
    options = options || {};
  
    var _this = this;
    var timer = null;
  
    this.async = options.async !== false;
    this.stepSize = options.stepSize || options.frameSize || SuperPCM.asyncFrameSize || 65536;
  
    this.vars = {};
  
    this.running = false;
    this.paused = false;
    this.stopped = false;
    this.done = false;
  
    this.initial = function (vars) {
      vars = vars || {};
  
      for (var k in vars) {
        if (Object.prototype.hasOwnProperty.call(vars, k)) {
          this.vars[k] = vars[k];
        }
      }
  
      return this;
    };
  
    this.conditional = options.conditional || function (vars) {
      return vars.index < vars.total;
    };
  
    this.logical = options.logical || function (vars) {
      vars.index++;
    };
  
    this.fnProcess = options.process || function () {};
  
    this.stop = function () {
      this.running = false;
      this.paused = false;
      this.stopped = true;
  
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
  
      return this;
    };
  
    this.pause = function () {
      if (this.running && !this.done) {
        this.paused = true;
      }
  
      return this;
    };
  
    this.resume = function (callback) {
      if (!this.done && !this.stopped) {
        this.paused = false;
        this.running = true;
        this.processing(callback);
      }
  
      return this;
    };
  
    this.reset = function () {
      this.stop();
  
      this.running = false;
      this.paused = false;
      this.stopped = false;
      this.done = false;
  
      return this;
    };
  
    this.status = function () {
      return {
        running: this.running,
        paused: this.paused,
        stopped: this.stopped,
        done: this.done,
        vars: this.vars
      };
    };
  
    this.processing = function (callback) {
      if (this.done) {
        if (typeof callback === "function") {
          callback({
            done: true,
            stopped: false,
            paused: false,
            vars: this.vars
          });
        }
        return this;
      }
  
      if (this.stopped) {
        if (typeof callback === "function") {
          callback({
            done: true,
            stopped: true,
            paused: false,
            vars: this.vars
          });
        }
        return this;
      }
  
      if (this.paused) {
        if (typeof callback === "function") {
          callback({
            done: false,
            stopped: false,
            paused: true,
            vars: this.vars
          });
        }
        return this;
      }
  
      this.running = true;
  
      var count = 0;
  
      while (!this.stopped && !this.paused && this.conditional(this.vars)) {
        this.fnProcess(this.vars);
        this.logical(this.vars);
  
        count++;
  
        if (this.async && count >= this.stepSize) {
          if (typeof callback === "function") {
            callback({
              done: false,
              stopped: false,
              paused: false,
              vars: this.vars
            });
          }
  
          timer = setTimeout(function () {
            timer = null;
            _this.processing(callback);
          }, 0);
  
          return this;
        }
      }
  
      if (this.stopped) {
        this.running = false;
      } else if (this.paused) {
        this.running = true;
      } else {
        this.running = false;
        this.done = true;
      }
  
      if (typeof callback === "function") {
        callback({
          done: this.done,
          stopped: this.stopped,
          paused: this.paused,
          vars: this.vars
        });
      }
  
      return this;
    };
  };
  
  /** ADPCM (Adaptive Differental Pulse-Code Modulation)  **/
  // IMA Table
  var IMA_ADPCM_INDEX_TABLE = [
    -1, -1, -1, -1, 2, 4, 6, 8,
    -1, -1, -1, -1, 2, 4, 6, 8
  ],
  IMA_ADPCM_STEP_SIZE_TABLE = [
    7, 8, 9, 10, 11, 12, 13, 14, 16, 17,
    19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
    50, 55, 60, 66, 73, 80, 88, 97, 107, 118,
    130, 143, 157, 173, 190, 209, 230, 253, 279, 307,
    337, 371, 408, 449, 494, 544, 598, 658, 724, 796,
    876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066,
    2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358,
    5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899,
    15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767
  ];
  
  // 3-bit Table
  var ADPCM_INDEX_TABLE_3BIT = [-1, -1, 2, 4, -1, -1, 2, 4],
  ADPCM_STEP_SIZE_TABLE_3BIT = [
    7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    17, 18, 19, 21, 22, 24, 26, 28, 30, 32,
    35, 38, 41, 44, 48, 52, 56, 61, 66, 71,
    77, 83, 90, 97, 105, 114, 123, 133, 144, 156,
    169, 183, 198, 214, 232, 251, 272, 294, 318, 344,
    372, 402, 435, 471, 510, 552, 597, 646, 699, 756,
    818, 885, 958, 1037, 1122, 1214, 1314, 1422, 1539, 1665,
    1802, 1950, 2110, 2283, 2470, 2673, 2892, 3129, 3386, 3664,
    3965, 4290, 4642, 5023, 5435, 5881, 6363, 6885, 7450
  ];
  
  // Mono
  function encodeMonoADPCM(pcmData, blockAlign) {
    var pcm = pcmData instanceof Int16Array ? pcmData : new Int16Array(pcmData);
    var BLOCK_ALIGN = blockAlign != null ? Math.round(blockAlign) : 256;
    var SAMPLES_PER_BLOCK = ((BLOCK_ALIGN - 4) * 2) + 1;

    var numBlocks = Math.ceil(pcm.length / SAMPLES_PER_BLOCK);
    if (numBlocks === 0) numBlocks = 1;

    var adpcmData = new Uint8Array(numBlocks * BLOCK_ALIGN);
    var view = new DataView(adpcmData.buffer);
    
    var pcmIdx = 0;

    for (var b = 0; b < numBlocks; b++) {
      var bOffset = b * BLOCK_ALIGN;

      var predictor = (pcmIdx < pcm.length) ? pcm[pcmIdx++] : 0;
      var stepIndex = 0;

      view.setInt16(bOffset + 0, predictor, true);
      view.setUint8(bOffset + 2, stepIndex);
      view.setUint8(bOffset + 3, 0);

      var adpcmIdx = bOffset + 4;
      var bufferWrite = false;
      var adpcmBuffer = 0;

      var samplesInBlock = Math.min(SAMPLES_PER_BLOCK - 1, pcm.length - pcmIdx);
      
      for (var s = 0; s < samplesInBlock; s++) {
        var pcmSample = pcm[pcmIdx++];
        var step = IMA_ADPCM_STEP_SIZE_TABLE[stepIndex];
        var diff = pcmSample - predictor;
        var code = 0;

        if (diff < 0) {
          code = 8; diff = -diff;
        }

        var tempDiff = step;
        if (diff >= tempDiff) {
          code |= 4; diff -= tempDiff;
        }
        tempDiff >>= 1;
        if (diff >= tempDiff) {
          code |= 2; diff -= tempDiff;
        }
        tempDiff >>= 1;
        if (diff >= tempDiff) {
          code |= 1; diff -= tempDiff;
        }

        var diffQ = 0;
        if (code & 4) diffQ += step;
        if (code & 2) diffQ += (step >> 1);
        if (code & 1) diffQ += (step >> 2);
        diffQ += (step >> 3);
        
        if (code & 8) predictor -= diffQ;
        else predictor += diffQ;

        predictor = clamp(predictor, -32768, 32767);

        stepIndex += IMA_ADPCM_INDEX_TABLE[code & 7];
        stepIndex = clamp(stepIndex, 0, 88);

        if (!bufferWrite) {
          adpcmBuffer = code & 0x0F;
          bufferWrite = true;
        } else {
          adpcmData[adpcmIdx++] = (code << 4) | adpcmBuffer;
          bufferWrite = false;
        }
      }

      if (bufferWrite) {
        adpcmData[adpcmIdx++] = adpcmBuffer;
      }
    }

    return {
      adpcmData: adpcmData,
      BLOCK_ALIGN: BLOCK_ALIGN,
      SAMPLES_PER_BLOCK: SAMPLES_PER_BLOCK
    };
  }
  
  function decodeMonoADPCM(adpcmData, totalSamples, blockAlign, samplesPerBlock) {
    var bytes = adpcmData instanceof Uint8Array ? adpcmData : new Uint8Array(adpcmData);
    var pcmData = new Int16Array(totalSamples);
    var pcmIdx = 0;
    
    blockAlign = blockAlign || 256;
    var numBlocks = Math.ceil(bytes.length / blockAlign);

    for (var b = 0; b < numBlocks; b++) {
      var blockOffset = b * blockAlign;
      if (blockOffset >= bytes.length) break;
      
      var currentBlockSize = Math.min(blockAlign, bytes.length - blockOffset);
      if (currentBlockSize < 4) break;

      var view = new DataView(bytes.buffer, bytes.byteOffset + blockOffset, currentBlockSize);
      var predictor = view.getInt16(0, true);
      var stepIndex = view.getUint8(2);
      
      if (pcmIdx < totalSamples) pcmData[pcmIdx++] = predictor;

      var byteIdx = 4;
      while (byteIdx < view.byteLength && pcmIdx < totalSamples) {
        var adpcmByte = view.getUint8(byteIdx++);
        var samplesNibble = [adpcmByte & 0x0F, (adpcmByte >> 4) & 0x0F];
        
        for (var s = 0; s < 2; s++) {
          if (pcmIdx >= totalSamples) break;
          var code = samplesNibble[s];
          var step = IMA_ADPCM_STEP_SIZE_TABLE[stepIndex];
          
          var diffQ = 0;
          if (code & 4) diffQ += step;
          if (code & 2) diffQ += (step >> 1);
          if (code & 1) diffQ += (step >> 2);
          diffQ += (step >> 3);
          
          if (code & 8) predictor -= diffQ;
          else predictor += diffQ;
          
          predictor = clamp(predictor, -32768, 32767);
          stepIndex += IMA_ADPCM_INDEX_TABLE[code & 7];
          stepIndex = clamp(stepIndex, 0, 88);
          
          pcmData[pcmIdx++] = predictor;
        }
      }
    }

    var outBytes = new Uint8Array(pcmData.length * 2);
    var dvOut = new DataView(outBytes.buffer);
    for (var i = 0; i < pcmData.length; i++) {
      dvOut.setInt16(i * 2, pcmData[i], true);
    }
    return outBytes;
  }
  
  // Stereo
  function encodeStereoADPCM(pcmData, blockAlign) {
    const BLOCK_ALIGN = blockAlign != null ? Math.round(blockAlign) : 512;
    const SAMPLES_PER_BLOCK = ((BLOCK_ALIGN - 8) * 2 / 2) + 1;

    const totalSamplePairs = pcmData.length / 2;
    const numBlocks = Math.ceil(totalSamplePairs / SAMPLES_PER_BLOCK);
    const adpcmData = new Uint8Array(numBlocks * BLOCK_ALIGN);

    let leftPredictor = 0,
    leftStepIdx = 0;
    let rightPredictor = 0,
    rightStepIdx = 0;

    let pcmPairIdx = 0;

    function encodeSampleADPCM(sample, pred, idx) {
      let step = IMA_ADPCM_STEP_SIZE_TABLE[idx];
      let diff = sample - pred;
      let code = 0;
      if (diff < 0) {
        code = 8; diff = -diff;
      }
      let tempDiff = step;
      if (diff >= tempDiff) {
        code |= 4; diff -= tempDiff;
      }
      tempDiff >>= 1;
      if (diff >= tempDiff) {
        code |= 2; diff -= tempDiff;
      }
      tempDiff >>= 1;
      if (diff >= tempDiff) {
        code |= 1; diff -= tempDiff;
      }
      let diffQ = 0;
      if (code & 4) diffQ += step;
      if (code & 2) diffQ += (step >> 1);
      if (code & 1) diffQ += (step >> 2);
      diffQ += (step >> 3);
      pred = (code & 8) ? pred - diffQ: pred + diffQ;
      if (pred > 32767) pred = 32767; else if (pred < -32768) pred = -32768;
      idx += IMA_ADPCM_INDEX_TABLE[code & 7];
      if (idx < 0) idx = 0; else if (idx > 88) idx = 88;
      return {
        code: code & 0x0F,
        pred,
        idx
      };
    }

    for (let b = 0; b < numBlocks; b++) {
      let blockOffset = b * BLOCK_ALIGN;
      let view = new DataView(adpcmData.buffer, blockOffset, BLOCK_ALIGN);

      let lSample = pcmData[pcmPairIdx * 2] ?? 0;
      let rSample = pcmData[pcmPairIdx * 2 + 1] ?? 0;

      let resL = encodeSampleADPCM(lSample, leftPredictor, leftStepIdx);
      leftPredictor = resL.pred; leftStepIdx = resL.idx;

      let resR = encodeSampleADPCM(rSample, rightPredictor, rightStepIdx);
      rightPredictor = resR.pred; rightStepIdx = resR.idx;

      view.setInt16(0, leftPredictor, true);
      view.setUint8(2, leftStepIdx);
      view.setUint8(3, 0);

      view.setInt16(4, rightPredictor, true);
      view.setUint8(6, rightStepIdx);
      view.setUint8(7, 0);

      pcmPairIdx++;

      let byteIdx = 8;
      while (byteIdx < BLOCK_ALIGN) {
        let startLeftPairIdx = pcmPairIdx;
        for (let k = 0; k < 4; k++) {
          let s1 = pcmData[pcmPairIdx * 2] ?? 0;
          let r1 = encodeSampleADPCM(s1, leftPredictor, leftStepIdx);
          leftPredictor = r1.pred; leftStepIdx = r1.idx;
          pcmPairIdx++;

          let s2 = pcmData[pcmPairIdx * 2] ?? 0;
          let r2 = encodeSampleADPCM(s2, leftPredictor, leftStepIdx);
          leftPredictor = r2.pred; leftStepIdx = r2.idx;
          pcmPairIdx++;

          view.setUint8(byteIdx + k, (r2.code << 4) | r1.code);
        }
        byteIdx += 4;

        let savedRightPairIdx = startLeftPairIdx;
        for (let k = 0; k < 4; k++) {
          let s1 = pcmData[savedRightPairIdx * 2 + 1] ?? 0;
          let r1 = encodeSampleADPCM(s1, rightPredictor, rightStepIdx);
          rightPredictor = r1.pred; rightStepIdx = r1.idx;
          savedRightPairIdx++;

          let s2 = pcmData[savedRightPairIdx * 2 + 1] ?? 0;
          let r2 = encodeSampleADPCM(s2, rightPredictor, rightStepIdx);
          rightPredictor = r2.pred; rightStepIdx = r2.idx;
          savedRightPairIdx++;

          view.setUint8(byteIdx + k, (r2.code << 4) | r1.code);
        }
        byteIdx += 4;
      }
    }

    return {
      adpcmData,
      BLOCK_ALIGN,
      SAMPLES_PER_BLOCK
    };
  }
  
  function decodeStereoADPCM(adpcmData, totalSamples, blockAlign, samplesPerBlock) {
    const pcmData = new Int16Array(totalSamples * 2);
    let pcmPairIdx = 0;
    const numBlocks = Math.ceil(adpcmData.length / blockAlign);

    for (let b = 0; b < numBlocks; b++) {
      let blockOffset = b * blockAlign;
      if (blockOffset >= adpcmData.length) break;

      let currentBlockSize = Math.min(blockAlign, adpcmData.length - blockOffset);
      if (currentBlockSize < 8) break;

      let view = new DataView(adpcmData.buffer, adpcmData.byteOffset + blockOffset, currentBlockSize);
      let leftPredictor = view.getInt16(0, true);
      let leftStepIdx = view.getUint8(2);
      let rightPredictor = view.getInt16(4, true);
      let rightStepIdx = view.getUint8(6);
      
      if (pcmPairIdx < totalSamples) {
        pcmData[pcmPairIdx * 2] = leftPredictor;
        pcmData[pcmPairIdx * 2 + 1] = rightPredictor;
        pcmPairIdx++;
      }

      function decodeSampleADPCM(code, pred, idx) {
        let step = IMA_ADPCM_STEP_SIZE_TABLE[idx];
        let diffQ = 0;
        if (code & 4) diffQ += step;
        if (code & 2) diffQ += (step >> 1);
        if (code & 1) diffQ += (step >> 2);
        diffQ += (step >> 3);
        pred = (code & 8) ? pred - diffQ : pred + diffQ;
        pred = clamp(pred, -32768, 32767);
        idx += IMA_ADPCM_INDEX_TABLE[code & 7];
        idx = clamp(idx, 0, 88);
        return { pred: pred, idx: idx };
      }

      let byteIdx = 8;
      while (byteIdx + 8 <= view.byteLength && pcmPairIdx < totalSamples) {
        let leftBytes = [], rightBytes = [];
        
        for (let k = 0; k < 4; k++) leftBytes.push(view.getUint8(byteIdx + k));
        byteIdx += 4;
        
        for (let k = 0; k < 4; k++) rightBytes.push(view.getUint8(byteIdx + k));
        byteIdx += 4;

        let savedLeftPairIdx = pcmPairIdx;
        
        for (let k = 0; k < 4; k++) {
          let bVal = leftBytes[k];
          let codes = [bVal & 0x0F, (bVal >> 4) & 0x0F];
          for (let s = 0; s < 2; s++) {
            if (pcmPairIdx >= totalSamples) break;
            let res = decodeSampleADPCM(codes[s], leftPredictor, leftStepIdx);
            leftPredictor = res.pred; leftStepIdx = res.idx;
            pcmData[pcmPairIdx * 2] = leftPredictor;
            pcmPairIdx++;
          }
        }

        pcmPairIdx = savedLeftPairIdx;
        
        for (let k = 0; k < 4; k++) {
          let bVal = rightBytes[k];
          let codes = [bVal & 0x0F, (bVal >> 4) & 0x0F];
          for (let s = 0; s < 2; s++) {
            if (pcmPairIdx >= totalSamples) break;
            let res = decodeSampleADPCM(codes[s], rightPredictor, rightStepIdx);
            rightPredictor = res.pred; rightStepIdx = res.idx;
            pcmData[pcmPairIdx * 2 + 1] = rightPredictor;
            pcmPairIdx++;
          }
        }
      }
    }

    let outBytes = new Uint8Array(pcmData.length * 2);
    let dvOut = new DataView(outBytes.buffer);
    for (let i = 0; i < pcmData.length; i++) {
      dvOut.setInt16(i * 2, pcmData[i], true);
    }
    return outBytes;
  }
  
  // 3-bit
  function encode3BitADPCM(pcmSamples, channels, blockAlign) {
    var totalSamples = pcmSamples.length;
    
    var BLOCK_ALIGN = blockAlign != null ? Math.round(blockAlign) : ((channels === 1) ? 1536 : 3072);
    var headerSize = (channels === 1) ? 3 : 6;
    var payloadBytesPerBlock = BLOCK_ALIGN - headerSize;
    
    var SAMPLES_PER_BLOCK = 1 + Math.floor((payloadBytesPerBlock * 8) / (3 * channels));
  
    var totalBlocks = Math.ceil(totalSamples / (SAMPLES_PER_BLOCK * channels));
    var totalOutputLength = totalBlocks * BLOCK_ALIGN;
    var adpcmData = new Uint8Array(totalOutputLength);
  
    var states = [];
    for (var c = 0; c < channels; c++) {
      states.push({ predictor: 0, stepIndex: 0 });
    }
  
    var sampleIdx = 0;
  
    for (var b = 0; b < totalBlocks; b++) {
      var blockOffset = b * BLOCK_ALIGN;
      
      if (channels === 1) {
        var firstSample = (sampleIdx < totalSamples) ? pcmSamples[sampleIdx] : 0;
        states[0].predictor = firstSample;
        
        adpcmData[blockOffset] = firstSample & 0xFF;
        adpcmData[blockOffset + 1] = (firstSample >> 8) & 0xFF;
        adpcmData[blockOffset + 2] = states[0].stepIndex;
        
        blockOffset += 3;
        sampleIdx++;
      } else {
        var firstSampleL = (sampleIdx < totalSamples) ? pcmSamples[sampleIdx] : 0;
        var firstSampleR = (sampleIdx + 1 < totalSamples) ? pcmSamples[sampleIdx + 1] : 0;
        states[0].predictor = firstSampleL;
        states[1].predictor = firstSampleR;
  
        adpcmData[blockOffset] = firstSampleL & 0xFF;
        adpcmData[blockOffset + 1] = (firstSampleL >> 8) & 0xFF;
        adpcmData[blockOffset + 2] = states[0].stepIndex;

        adpcmData[blockOffset + 3] = firstSampleR & 0xFF;
        adpcmData[blockOffset + 4] = (firstSampleR >> 8) & 0xFF;
        adpcmData[blockOffset + 5] = states[1].stepIndex;
  
        blockOffset += 6;
        sampleIdx += 2;
      }
  
      var bitBuffer = 0;
      var bitCount = 0;
      var payloadBytesWritten = 0;
  
      var samplesInThisBlock = (b === totalBlocks - 1) 
        ? (totalSamples - sampleIdx)
        : (SAMPLES_PER_BLOCK - 1) * channels;
  
      for (var s = 0; s < samplesInThisBlock; s++) {
        if (sampleIdx >= totalSamples) break;
  
        var ch = sampleIdx % channels;
        var state = states[ch];
        var sample = pcmSamples[sampleIdx++];
  
        var diff = sample - state.predictor;
        var code = 0;
  
        if (diff < 0) {
          code |= 4;
          diff = -diff;
        }
  
        var step = ADPCM_STEP_SIZE_TABLE_3BIT[state.stepIndex];
        var m = 0;
        if (diff >= step) {
          m |= 2;
          diff -= step;
        }
        if (diff >= (step >> 1)) {
          m |= 1;
        }
        code |= m;
  
        var predDiff = step >> 2;
        if (code & 2) predDiff += step;
        if (code & 1) predDiff += (step >> 1);
  
        if (code & 4) state.predictor -= predDiff;
        else state.predictor += predDiff;
  
        if (state.predictor > 32767) state.predictor = 32767;
        else if (state.predictor < -32768) state.predictor = -32768;
  
        state.stepIndex += ADPCM_INDEX_TABLE_3BIT[code];
        if (state.stepIndex > 88) state.stepIndex = 88;
        else if (state.stepIndex < 0) state.stepIndex = 0;
  
        bitBuffer |= (code & 0x07) << bitCount;
        bitCount += 3;
        
        while (bitCount >= 8) {
          if (payloadBytesWritten < payloadBytesPerBlock) {
            adpcmData[blockOffset + payloadBytesWritten++] = bitBuffer & 0xFF;
          }
          bitBuffer >>>= 8;
          bitCount -= 8;
        }
      }
  
      if (bitCount > 0 && payloadBytesWritten < payloadBytesPerBlock) {
        adpcmData[blockOffset + payloadBytesWritten++] = bitBuffer & 0xFF;
      }
    }
  
    return {
      adpcmData: adpcmData,
      BLOCK_ALIGN: BLOCK_ALIGN,
      SAMPLES_PER_BLOCK: SAMPLES_PER_BLOCK
    };
  }
  
  function decode3BitADPCM(adpcmData, totalSamples, channels, BLOCK_ALIGN, SAMPLES_PER_BLOCK) {
    var pcmSamples = new Int16Array(totalSamples);
    var totalBlocks = Math.ceil(adpcmData.length / BLOCK_ALIGN);

    var states = [];
    for (var c = 0; c < channels; c++) {
      states.push({ predictor: 0, stepIndex: 0 });
    }
  
    var sampleIdx = 0;

    for (var b = 0; b < totalBlocks; b++) {
      var blockOffset = b * BLOCK_ALIGN;
      var payloadOffset = 0;
      
      if (channels === 1) {
        if (blockOffset + 3 > adpcmData.length) break;

        var pred = adpcmData[blockOffset] | (adpcmData[blockOffset + 1] << 8);
        if (pred & 0x8000) pred |= ~0xFFFF;
        
        states[0].predictor = pred;
        states[0].stepIndex = adpcmData[blockOffset + 2];
  
        if (sampleIdx < totalSamples) {
          pcmSamples[sampleIdx++] = states[0].predictor;
        }
        
        payloadOffset = 3;
      } else {
        if (blockOffset + 6 > adpcmData.length) break;

        var predL = adpcmData[blockOffset] | (adpcmData[blockOffset + 1] << 8);
        if (predL & 0x8000) predL |= ~0xFFFF;
        states[0].predictor = predL;
        states[0].stepIndex = adpcmData[blockOffset + 2];
  
        var predR = adpcmData[blockOffset + 3] | (adpcmData[blockOffset + 4] << 8);
        if (predR & 0x8000) predR |= ~0xFFFF;
        states[1].predictor = predR;
        states[1].stepIndex = adpcmData[blockOffset + 5];
  
        if (sampleIdx < totalSamples) pcmSamples[sampleIdx++] = states[0].predictor;
        if (sampleIdx < totalSamples) pcmSamples[sampleIdx++] = states[1].predictor;
  
        payloadOffset = 6;
      }
  
      var bitBuffer = 0;
      var bitCount = 0;
      var payloadBytesPerBlock = BLOCK_ALIGN - payloadOffset;
  
      var samplesToDecodeInBlock = (SAMPLES_PER_BLOCK - 1) * channels;
  
      for (var s = 0; s < samplesToDecodeInBlock; s++) {
        if (sampleIdx >= totalSamples) break;
  
        while (bitCount < 3) {
          if (payloadOffset < payloadBytesPerBlock) {
            var bytePos = blockOffset + payloadOffset;
            if (bytePos < adpcmData.length) {
              bitBuffer |= (adpcmData[bytePos] << bitCount);
              payloadOffset++;
            }
          }
          bitCount += 8;
        }
  
        var code = bitBuffer & 0x07;
        bitBuffer >>>= 3;
        bitCount -= 3;
  
        var ch = sampleIdx % channels;
        var state = states[ch];
        var step = ADPCM_STEP_SIZE_TABLE_3BIT[state.stepIndex];
  
        var predDiff = step >> 2;
        if (code & 2) predDiff += step;
        if (code & 1) predDiff += (step >> 1);
  
        if (code & 4) state.predictor -= predDiff;
        else state.predictor += predDiff;
  
        if (state.predictor > 32767) state.predictor = 32767;
        else if (state.predictor < -32768) state.predictor = -32768;
  
        pcmSamples[sampleIdx++] = state.predictor;
  
        state.stepIndex += ADPCM_INDEX_TABLE_3BIT[code];
        if (state.stepIndex > 88) state.stepIndex = 88;
        else if (state.stepIndex < 0) state.stepIndex = 0;
      }
    }
  
    var outBytes = new Uint8Array(pcmSamples.length * 2);
    var dvOut = new DataView(outBytes.buffer);
    for (var i = 0; i < pcmSamples.length; i++) {
      dvOut.setInt16(i * 2, pcmSamples[i], true);
    }
    return outBytes;
  }
  
  // 4-bit Joint Stereo
  function encodeJointStereoADPCM4Bit(pcmData, blockAlign) {
    var BLOCK_ALIGN = blockAlign != null ? Math.round(blockAlign) : 512;
    var SAMPLES_PER_BLOCK = (BLOCK_ALIGN - 8) + 1;

    var totalSamplePairs = Math.floor(pcmData.length / 2);
    var numBlocks = Math.ceil(totalSamplePairs / SAMPLES_PER_BLOCK);
    if (numBlocks === 0) numBlocks = 1;

    var adpcmData = new Uint8Array(numBlocks * BLOCK_ALIGN);
    var view = new DataView(adpcmData.buffer);

    var midPredictor = 0, midStepIdx = 0;
    var sidePredictor = 0, sideStepIdx = 0;
    var pcmPairIdx = 0;

    function encodeSampleADPCM(sample, pred, idx) {
      var step = IMA_ADPCM_STEP_SIZE_TABLE[idx];
      var diff = sample - pred;
      var code = 0;
      if (diff < 0) {
        code = 8; diff = -diff;
      }
      var tempDiff = step;
      if (diff >= tempDiff) {
        code |= 4; diff -= tempDiff;
      }
      tempDiff >>= 1;
      if (diff >= tempDiff) {
        code |= 2; diff -= tempDiff;
      }
      tempDiff >>= 1;
      if (diff >= tempDiff) {
        code |= 1; diff -= tempDiff;
      }
      var diffQ = 0;
      if (code & 4) diffQ += step;
      if (code & 2) diffQ += (step >> 1);
      if (code & 1) diffQ += (step >> 2);
      diffQ += (step >> 3);

      pred = (code & 8) ? pred - diffQ : pred + diffQ;
      pred = clamp(pred, -32768, 32767);

      idx += IMA_ADPCM_INDEX_TABLE[code & 7];
      idx = clamp(idx, 0, 88);

      return { code: code & 0x0F, pred: pred, idx: idx };
    }

    for (var b = 0; b < numBlocks; b++) {
      var blockOffset = b * BLOCK_ALIGN;

      var lSample = (pcmPairIdx * 2 < pcmData.length) ? pcmData[pcmPairIdx * 2] : 0;
      var rSample = (pcmPairIdx * 2 + 1 < pcmData.length) ? pcmData[pcmPairIdx * 2 + 1] : 0;

      var midSample = Math.floor((lSample + rSample) / 2);
      var sideSample = Math.floor((lSample - rSample) / 2);

      var resM = encodeSampleADPCM(midSample, midPredictor, midStepIdx);
      midPredictor = resM.pred; midStepIdx = resM.idx;

      var resS = encodeSampleADPCM(sideSample, sidePredictor, sideStepIdx);
      sidePredictor = resS.pred; sideStepIdx = resS.idx;

      view.setInt16(blockOffset + 0, midPredictor, true);
      view.setUint8(blockOffset + 2, midStepIdx);
      view.setUint8(blockOffset + 3, 0);

      view.setInt16(blockOffset + 4, sidePredictor, true);
      view.setUint8(blockOffset + 6, sideStepIdx);
      view.setUint8(blockOffset + 7, 0);

      pcmPairIdx++;

      var byteIdx = 8;
      while (byteIdx < BLOCK_ALIGN) {
        var lSampleNext = (pcmPairIdx * 2 < pcmData.length) ? pcmData[pcmPairIdx * 2] : 0;
        var rSampleNext = (pcmPairIdx * 2 + 1 < pcmData.length) ? pcmData[pcmPairIdx * 2 + 1] : 0;

        var mNext = Math.floor((lSampleNext + rSampleNext) / 2);
        var sNext = Math.floor((lSampleNext - rSampleNext) / 2);

        var rM = encodeSampleADPCM(mNext, midPredictor, midStepIdx);
        midPredictor = rM.pred; midStepIdx = rM.idx;

        var rS = encodeSampleADPCM(sNext, sidePredictor, sideStepIdx);
        sidePredictor = rS.pred; sideStepIdx = rS.idx;

        view.setUint8(blockOffset + byteIdx, (rS.code << 4) | rM.code);
        byteIdx++;
        pcmPairIdx++;
      }
    }

    return {
      adpcmData: adpcmData,
      BLOCK_ALIGN: BLOCK_ALIGN,
      SAMPLES_PER_BLOCK: SAMPLES_PER_BLOCK
    };
  }
  
  function decodeJointStereoADPCM4Bit(adpcmData, totalSamples, blockAlign, samplesPerBlock) {
    var bytes = adpcmData instanceof Uint8Array ? adpcmData : new Uint8Array(adpcmData);
    var pcmData = new Int16Array(totalSamples * 2);
    var pcmPairIdx = 0;
    
    blockAlign = blockAlign || 512;
    var numBlocks = Math.ceil(bytes.length / blockAlign);

    function decodeSampleADPCM(code, pred, idx) {
      var step = IMA_ADPCM_STEP_SIZE_TABLE[idx];
      var diffQ = 0;
      if (code & 4) diffQ += step;
      if (code & 2) diffQ += (step >> 1);
      if (code & 1) diffQ += (step >> 2);
      diffQ += (step >> 3);
      
      pred = (code & 8) ? pred - diffQ : pred + diffQ;
      pred = clamp(pred, -32768, 32767);
      
      idx += IMA_ADPCM_INDEX_TABLE[code & 7];
      idx = clamp(idx, 0, 88);
      return { pred: pred, idx: idx };
    }

    for (var b = 0; b < numBlocks; b++) {
      var blockOffset = b * blockAlign;
      if (blockOffset >= bytes.length) break;

      var currentBlockSize = Math.min(blockAlign, bytes.length - blockOffset);
      if (currentBlockSize < 8) break;

      var view = new DataView(bytes.buffer, bytes.byteOffset + blockOffset, currentBlockSize);
      
      var midPredictor = view.getInt16(0, true);
      var midStepIdx = view.getUint8(2);
      var sidePredictor = view.getInt16(4, true);
      var sideStepIdx = view.getUint8(6);

      if (pcmPairIdx < totalSamples) {
        var left = midPredictor + sidePredictor;
        var right = midPredictor - sidePredictor;
        pcmData[pcmPairIdx * 2] = clamp(left, -32768, 32767);
        pcmData[pcmPairIdx * 2 + 1] = clamp(right, -32768, 32767);
        pcmPairIdx++;
      }

      var byteIdx = 8;
      while (byteIdx < view.byteLength && pcmPairIdx < totalSamples) {
        var adpcmByte = view.getUint8(byteIdx++);
        
        var midCode = adpcmByte & 0x0F;
        var sideCode = (adpcmByte >> 4) & 0x0F;

        var resM = decodeSampleADPCM(midCode, midPredictor, midStepIdx);
        midPredictor = resM.pred; midStepIdx = resM.idx;

        var resS = decodeSampleADPCM(sideCode, sidePredictor, sideStepIdx);
        sidePredictor = resS.pred; sideStepIdx = resS.idx;

        var left = midPredictor + sidePredictor;
        var right = midPredictor - sidePredictor;

        pcmData[pcmPairIdx * 2] = clamp(left, -32768, 32767);
        pcmData[pcmPairIdx * 2 + 1] = clamp(right, -32768, 32767);
        pcmPairIdx++;
      }
    }

    var outBytes = new Uint8Array(pcmData.length * 2);
    var dvOut = new DataView(outBytes.buffer);
    for (var i = 0; i < pcmData.length; i++) {
      dvOut.setInt16(i * 2, pcmData[i], true);
    }
    return outBytes;
  }
  
  // 3-bit Joint-Stereo
  function decodeJointStereoADPCM3Bit(adpcmData, totalSamples, BLOCK_ALIGN, SAMPLES_PER_BLOCK) {
    var pcmSamples = new Int16Array(totalSamples * 2);
    var totalBlocks = Math.ceil(adpcmData.length / BLOCK_ALIGN);

    var states = [
      { predictor: 0, stepIndex: 0 },
      { predictor: 0, stepIndex: 0 }
    ];

    var pcmPairIdx = 0;

    function decodeSample3Bit(code, state) {
      var step = ADPCM_STEP_SIZE_TABLE_3BIT[state.stepIndex];
      var predDiff = step >> 2;
      if (code & 2) predDiff += step;
      if (code & 1) predDiff += (step >> 1);

      if (code & 4) state.predictor -= predDiff;
      else state.predictor += predDiff;

      state.predictor = clamp(state.predictor, -32768, 32767);
      state.stepIndex += ADPCM_INDEX_TABLE_3BIT[code];
      state.stepIndex = clamp(state.stepIndex, 0, 88);
      return state.predictor;
    }

    for (var b = 0; b < totalBlocks; b++) {
      var blockOffset = b * BLOCK_ALIGN;
      if (blockOffset + 6 > adpcmData.length) break;

      var predM = adpcmData[blockOffset] | (adpcmData[blockOffset + 1] << 8);
      if (predM & 0x8000) predM |= ~0xFFFF;
      states[0].predictor = predM;
      states[0].stepIndex = adpcmData[blockOffset + 2];

      var predS = adpcmData[blockOffset + 3] | (adpcmData[blockOffset + 4] << 8);
      if (predS & 0x8000) predS |= ~0xFFFF;
      states[1].predictor = predS;
      states[1].stepIndex = adpcmData[blockOffset + 5];

      if (pcmPairIdx < totalSamples) {
        var left = states[0].predictor + states[1].predictor;
        var right = states[0].predictor - states[1].predictor;
        pcmSamples[pcmPairIdx * 2] = clamp(left, -32768, 32767);
        pcmSamples[pcmPairIdx * 2 + 1] = clamp(right, -32768, 32767);
        pcmPairIdx++;
      }

      var bitBuffer = 0;
      var bitCount = 0;
      var payloadOffset = 6;
      var midVal = 0;
      
      var samplesToDecodeInBlock = (SAMPLES_PER_BLOCK - 1) * 2;

      for (var s = 0; s < samplesToDecodeInBlock; s++) {
        if (pcmPairIdx >= totalSamples) break;

        while (bitCount < 3) {
          if (payloadOffset < BLOCK_ALIGN) {
            var bytePos = blockOffset + payloadOffset;
            if (bytePos < adpcmData.length) {
              bitBuffer |= (adpcmData[bytePos] << bitCount);
              payloadOffset++;
            }
          }
          bitCount += 8;
        }

        var code = bitBuffer & 0x07;
        bitBuffer >>>= 3;
        bitCount -= 3;

        if (s % 2 === 0) {
          midVal = decodeSample3Bit(code, states[0]);
        } else {
          var sideVal = decodeSample3Bit(code, states[1]);
          var left = midVal + sideVal;
          var right = midVal - sideVal;

          pcmSamples[pcmPairIdx * 2] = clamp(left, -32768, 32767);
          pcmSamples[pcmPairIdx * 2 + 1] = clamp(right, -32768, 32767);
          pcmPairIdx++;
        }
      }
    }

    var outBytes = new Uint8Array(pcmSamples.length * 2);
    var dvOut = new DataView(outBytes.buffer);
    for (var i = 0; i < pcmSamples.length; i++) {
      dvOut.setInt16(i * 2, pcmSamples[i], true);
    }
    return outBytes;
  }
  
  function encodeJointStereoADPCM3Bit(pcmSamples, blockAlign) {
    var totalSamples = pcmSamples.length;
    var totalSamplePairs = Math.floor(totalSamples / 2);
    
    var BLOCK_ALIGN = blockAlign != null ? Math.round(blockAlign) : 3072;
    var headerSize = 6;
    var payloadBytesPerBlock = BLOCK_ALIGN - headerSize;
    
    var SAMPLES_PER_BLOCK = 1 + Math.floor((payloadBytesPerBlock * 8) / 6);
    var totalBlocks = Math.ceil(totalSamplePairs / SAMPLES_PER_BLOCK);
    var adpcmData = new Uint8Array(totalBlocks * BLOCK_ALIGN);
  
    var states = [
      { predictor: 0, stepIndex: 0 },
      { predictor: 0, stepIndex: 0 }
    ];
  
    var pairIdx = 0;
  
    for (var b = 0; b < totalBlocks; b++) {
      var blockOffset = b * BLOCK_ALIGN;
      
      var lSample = (pairIdx * 2 < totalSamples) ? pcmSamples[pairIdx * 2] : 0;
      var rSample = (pairIdx * 2 + 1 < totalSamples) ? pcmSamples[pairIdx * 2 + 1] : 0;
      
      var midSample = Math.floor((lSample + rSample) / 2);
      var sideSample = Math.floor((lSample - rSample) / 2);
      
      states[0].predictor = midSample;
      states[1].predictor = sideSample;
  
      adpcmData[blockOffset] = midSample & 0xFF;
      adpcmData[blockOffset + 1] = (midSample >> 8) & 0xFF;
      adpcmData[blockOffset + 2] = states[0].stepIndex;
  
      adpcmData[blockOffset + 3] = sideSample & 0xFF;
      adpcmData[blockOffset + 4] = (sideSample >> 8) & 0xFF;
      adpcmData[blockOffset + 5] = states[1].stepIndex;
  
      var writeOffset = blockOffset + 6;
      pairIdx++;
  
      var bitBuffer = 0;
      var bitCount = 0;
      var payloadBytesWritten = 0;
  
      var pairsInThisBlock = (b === totalBlocks - 1) ? (totalSamplePairs - pairIdx) : (SAMPLES_PER_BLOCK - 1);
        
      for (var p = 0; p < pairsInThisBlock; p++) {
        var lS = pcmSamples[pairIdx * 2];
        var rS = pcmSamples[pairIdx * 2 + 1];
        pairIdx++;
        
        var mS = Math.floor((lS + rS) / 2);
        var sS = Math.floor((lS - rS) / 2);
        
        var channelsSamples = [mS, sS];
        
        for (var ch = 0; ch < 2; ch++) {
          var state = states[ch];
          var sample = channelsSamples[ch];
          
          var diff = sample - state.predictor;
          var code = 0;
          if (diff < 0) {
            code |= 4; diff = -diff;
          }
          var step = ADPCM_STEP_SIZE_TABLE_3BIT[state.stepIndex];
          var m = 0;
          if (diff >= step) { m |= 2; diff -= step; }
          if (diff >= (step >> 1)) { m |= 1; }
          code |= m;
          
          var predDiff = step >> 2;
          if (code & 2) predDiff += step;
          if (code & 1) predDiff += (step >> 1);
          
          if (code & 4) state.predictor -= predDiff;
          else state.predictor += predDiff;
          
          state.predictor = clamp(state.predictor, -32768, 32767);
          state.stepIndex += ADPCM_INDEX_TABLE_3BIT[code];
          state.stepIndex = clamp(state.stepIndex, 0, 88);
    
          bitBuffer |= (code & 0x07) << bitCount;
          bitCount += 3;
          
          while (bitCount >= 8) {
            if (payloadBytesWritten < payloadBytesPerBlock) {
              adpcmData[writeOffset + payloadBytesWritten++] = bitBuffer & 0xFF;
            }
            bitBuffer >>>= 8;
            bitCount -= 8;
          }
        }
      }
      if (bitCount > 0 && payloadBytesWritten < payloadBytesPerBlock) {
        adpcmData[writeOffset + payloadBytesWritten++] = bitBuffer & 0xFF;
      }
    }
  
    return {
      adpcmData: adpcmData,
      BLOCK_ALIGN: BLOCK_ALIGN,
      SAMPLES_PER_BLOCK: SAMPLES_PER_BLOCK
    };
  }
  /** **/

  function assignDefaults(target, src) {
    if (!src) return target;
    for (var k in src) {
      if (Object.prototype.hasOwnProperty.call(src, k)) {
        target[k] = src[k];
      }
    }
    return target;
  }
  
  function _eventListener(obj) {
    obj.objEventListener = {};
    
    obj.executeEventListener = function (eventName, args) {
      if (obj.objEventListener[eventName]) {
        for (var fn in obj.objEventListener[eventName]) {
          obj.objEventListener[eventName][fn].apply(obj, args);
        }
      }
      if (obj[`on${eventName}`] && typeof obj[`on${eventName}`] == "function") obj[`on${eventName}`].apply(obj, args);
    }
    obj.addEventListener = function (eventName, fn) {
      if (!obj.objEventListener[eventName]) obj.objEventListener[eventName] = {};
      obj.objEventListener[eventName][fn] = fn;
    }
    obj.removeEventListener = function (eventName, fn) {
      if (obj.objEventListener[eventName] && obj.objEventListener[eventName][fn]) {
        obj.objEventListener[eventName][fn] = null;
      }
    }
  }

  function clamp(v, min, max) {
    return v < min ? min: (v > max ? max: v);
  }

  function repeat(r, v) {
    return (v % r + r) % r;
  }

  function bufferSize(size) {
    if (size <= 256) return 256;
    if (size >= 16384) return 16384;

    var power = Math.round(Math.log2(size));
    return Math.pow(2, power);
  }

  function getBytesPerSample(bitDepth, isFloat) {
    if (isFloat) return 4;
    return bitDepth / 8;
  }

  function concatUint8Arrays(arrays) {
    var totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);

    var result = new Uint8Array(totalLength);

    var offset = 0;
    for (var arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }

    return result;
  }
  
  // Global pool array to track active hardware AudioContext instances
  SuperPCM._contextPool = [];

  /**
   * SuperPCM.audioCtx
   * Centralized AudioContext Manager to strictly prevent hitting the browser's 6-instance limit.
   * Automatically evicts the oldest unused context if the pool approaches the threshold.
   * * @param {Number} sampleRate - Target hardware sample rate
   * @returns {AudioContext} A safely managed AudioContext instance
   */
  SuperPCM.audioCtx = function (sampleRate) {
    sampleRate = sampleRate ?? SuperPCM.defaults.sampleRate;

    // 1. Flush and filter out any context that has already been closed
    SuperPCM._contextPool = SuperPCM._contextPool.filter(function (ctx) {
      return ctx && ctx.state !== 'closed' && !ctx._superPcmClosed;
    });

    // 2. Hard-limit check: If we reach 5 active contexts (leaving 1 slot for safety boundary),
    // force-evict the oldest active context from the hardware pipeline.
    if (SuperPCM._contextPool.length >= 5) {
      var oldestCtx = SuperPCM._contextPool.shift();
      if (oldestCtx) {
        try {
          oldestCtx.close();
          console.warn("SuperPCM Warning: Max AudioContext limit approached. Forced closing the oldest instance.");
        } catch (e) {
          console.error("SuperPCM: Error force-closing context:", e);
        }
      }
    }

    // 3. Spawning the new hardware node instance
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    var ctx = new AudioContextClass({ sampleRate: sampleRate });
    
    // Resume the AudioContext if browser is blocking auto start context
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    // Inject a manual closure tracker hook because synchronous state checks can be lagging
    var nativeClose = ctx.close;
    ctx.close = function () {
      ctx._superPcmClosed = true;
      return nativeClose.apply(ctx, arguments);
    };

    // 4. Register inside the global monitor thread
    SuperPCM._contextPool.push(ctx);
    return ctx;
  };

  /**
  * Encode a single Float32 amplitude (-1..1) to PCM bytes at given offset.
  * Returns new offset.
  */
  function encodeSample(value, bitDepth, isFloat, out, dv, offset) {
    var v = clamp(value || 0, -1, 1);
    if (offset < 0 || offset + getBytesPerSample(bitDepth, isFloat) > out.length) return offset;

    if (isFloat) {
      // 32-bit float PCM
      dv.setFloat32(offset, v, true); // little-endian
      return offset + 4;
    }

    switch (bitDepth) {
      case SuperPCM.BIT_DEPTH_8: {
        // 8-bit unsigned PCM (0..255)
        var s8 = Math.round((v + 1) * 0.5 * 255);
        s8 = clamp(s8, 0, 255);
        out[offset] = s8 & 0xFF;
        return offset + 1;
      }
      case SuperPCM.BIT_DEPTH_16: {
          // 16-bit signed PCM
          var s16 = v < 0 ? Math.round(v * 0x8000): Math.round(v * 0x7FFF);
          s16 = clamp(s16, -0x8000, 0x7FFF);
          dv.setInt16(offset, s16, true);
          return offset + 2;
        }
      case SuperPCM.BIT_DEPTH_24: {
          // 24-bit signed PCM
          var s24 = v < 0 ? Math.round(v * 0x800000): Math.round(v * 0x7FFFFF);
          s24 = clamp(s24, -0x800000, 0x7FFFFF);
          out[offset] = s24 & 0xFF;
          out[offset + 1] = (s24 >> 8) & 0xFF;
          out[offset + 2] = (s24 >> 16) & 0xFF;
          return offset + 3;
        }
      case SuperPCM.BIT_DEPTH_32: {
          // 32-bit signed PCM
          var s32 = v < 0 ? Math.round(v * 0x80000000): Math.round(v * 0x7FFFFFFF);
          dv.setInt32(offset, s32, true);
          return offset + 4;
        }
      default:
        throw new Error('Unsupported bitDepth: ' + bitDepth);
    }
  }

  /**
  * Decode a single PCM sample from bytes at given offset.
  * Returns { value, offset } where value is Float32 amplitude (-1..1).
  */
  function getSample(bytes, dv, offset, bitDepth, isFloat) {
    var v;
    if (offset < 0 || offset + getBytesPerSample(bitDepth, isFloat) > bytes.length) return 0;

    if (isFloat) {
      v = dv.getFloat32(offset, true);
      return clamp(v, -1, 1);
    }

    switch (bitDepth) {
      case SuperPCM.BIT_DEPTH_8: {
        var b = bytes[offset];
        v = (b / 127.5) - 1;
        return clamp(v, -1, 1);
      }
      case SuperPCM.BIT_DEPTH_16: {
        var s16 = dv.getInt16(offset, true);
        v = s16 / 0x8000;
        return clamp(v, -1, 1);
      }
      case SuperPCM.BIT_DEPTH_24: {
        var b0 = bytes[offset];
        var b1 = bytes[offset + 1];
        var b2 = bytes[offset + 2];
        var s24 = (b2 << 16) | (b1 << 8) | b0;
        if (s24 & 0x800000) s24 |= 0xFF000000; // sign extend
        v = s24 / 0x800000;
        return clamp(v, -1, 1);
      }
      case SuperPCM.BIT_DEPTH_32: {
        var s32 = dv.getInt32(offset, true);
        v = s32 / 0x80000000;
        return clamp(v, -1, 1);
      }
      default:
        throw new Error('Unsupported bitDepth: ' + bitDepth);
    }
  }
  function decodeSample(bytes, dv, offset, bitDepth, isFloat) {
    return {
      value: getSample(bytes, dv, offset, bitDepth, isFloat),
      offset: offset + Math.floor(isFloat ? 4: bitDepth / 8)
    };
  }
  
  /**
   * Comprehensive low-level MP3 binary parser. Extracts technical audio stream metrics,
   * resolves LAME extensions, and walks the complete ID3v2 payload to extract Title, Artist,
   * Album, Year, Track, Genre, Comments, Lyrics (Unsynchronized), and Cover Art Blobs.
   *
   * @param {ArrayBuffer|Uint8Array} mp3Source - The raw MP3 binary data
   * @returns {Object|null} Technical metadata payload including comprehensive ID3 tags
   */
  function parseMp3Header(mp3Source) {
    if (!mp3Source) return null;
    var data = mp3Source instanceof Uint8Array ? mp3Source : new Uint8Array(mp3Source);
    var len = data.length;
    if (len < 4) return null;

    var pos = 0;
    var metaTags = {
      title: "",
      artist: "",
      album: "",
      year: "",
      track: "",
      genre: "",
      comment: "",
      lyrics: "",
      imageBlob: null
    };

    // Helper function to decode bytes safely depending on the dynamic text encoding format flag
    function decodeString(bytes, encoding) {
      if (bytes.length === 0) return "";
      if (typeof TextDecoder !== "undefined") {
        var encStr = "utf-8";
        if (encoding === 0) encStr = "iso-8859-1";
        if (encoding === 1) encStr = "utf-16";
        if (encoding === 2) encStr = "utf-16be";
        try {
          return new TextDecoder(encStr).decode(bytes).replace(/\0+$/, "").trim();
        } catch (e) {}
      }
      // Primitive translation fallback loop if the global TextDecoder API is missing
      var s = "";
      if (encoding === 0 || encoding === 3) {
        for (var i = 0; i < bytes.length; i++) {
          if (bytes[i] !== 0) s += String.fromCharCode(bytes[i]);
        }
      } else {
        // Simple 2-byte loop skipping UTF-16 Byte Order Mark (BOM) patterns if found
        var start = (encoding === 1 && ((bytes[0] === 0xFE && bytes[1] === 0xFF) || (bytes[0] === 0xFF && bytes[1] === 0xFE))) ? 2 : 0;
        for (var i = start; i < bytes.length; i += 2) {
          var charCode = (bytes[i] << 8) | bytes[i + 1];
          if (bytes[0] === 0xFF) charCode = bytes[i] | (bytes[i + 1] << 8); // Little Endian swap
          if (charCode !== 0) s += String.fromCharCode(charCode);
        }
      }
      return s.replace(/\0+$/, "").trim();
    }

    // ==================================================================
    // 1. EXTENDED ID3v2 METADATA CONTAINER DEEP WALKER
    // ==================================================================
    if (data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) { // Matches "ID3"
      if (pos + 10 > len) return null;
      
      var id3Version = data[pos + 3];
      var id3Size = ((data[pos + 6] & 0x7F) << 21) | 
                    ((data[pos + 7] & 0x7F) << 14) | 
                    ((data[pos + 8] & 0x7F) << 7)  | 
                    (data[pos + 9] & 0x7F);
      
      var id3End = 10 + id3Size;
      var framePos = 10;

      while (framePos + 10 < id3End && framePos + 10 < len) {
        if (data[framePos] === 0x00) break; // Break safely out if padding bytes are hit

        var frameId = String.fromCharCode(data[framePos], data[framePos + 1], data[framePos + 2], data[framePos + 3]);
        var frameSize = (data[framePos + 4] << 24) | (data[framePos + 5] << 16) | (data[framePos + 6] << 8) | data[framePos + 7];
        
        if (id3Version === 4) { // Syncsafe corrections for ID3v2.4 specification profiles
          frameSize = ((data[framePos + 4] & 0x7F) << 21) | 
                      ((data[framePos + 5] & 0x7F) << 14) | 
                      ((data[framePos + 6] & 0x7F) << 7)  | 
                      (data[framePos + 7] & 0x7F);
        }

        if (framePos + 10 + frameSize > id3End || framePos + 10 + frameSize > len) break;

        var payloadStart = framePos + 10;
        var payloadEnd = payloadStart + frameSize;

        // CATEGORY A: Standard Text Frames Extraction Pipeline
        if (frameId.charCodeAt(0) === 84 && frameId !== "TXXX") { // Identifies "T***" text frames
          var encoding = data[payloadStart];
          var textBytes = data.subarray(payloadStart + 1, payloadEnd);
          var text = decodeString(textBytes, encoding);

          if (frameId === "TIT2") metaTags.title = text;
          else if (frameId === "TPE1") metaTags.artist = text;
          else if (frameId === "TALB") metaTags.album = text;
          else if (frameId === "TRCK") metaTags.track = text;
          else if (frameId === "TCON") metaTags.genre = text;
          else if (frameId === "TYER" || frameId === "TDRC") metaTags.year = text; // v2.3 and v2.4 fallback
        }
        // CATEGORY B: Language Descriptor Wrapped Text Frames (COMM: Comments, USLT: Lyrics)
        else if (frameId === "COMM" || frameId === "USLT") {
          var encoding = data[payloadStart];
          var ptr = payloadStart + 4; // Skip encoding byte (1b) + language descriptors (3b)

          // Advance past variable short description identifiers to point directly at content data
          if (encoding === 1 || encoding === 2) { // UTF-16 double null-terminator walking
            while (ptr < payloadEnd - 1 && !(data[ptr] === 0x00 && data[ptr + 1] === 0x00)) {
              ptr += 2;
            }
            ptr += 2;
          } else { // Standard single null-terminator walking
            while (ptr < payloadEnd && data[ptr] !== 0x00) {
              ptr++;
            }
            ptr++;
          }

          if (ptr < payloadEnd) {
            var textBytes = data.subarray(ptr, payloadEnd);
            var parsedPayloadText = decodeString(textBytes, encoding);

            if (frameId === "COMM") metaTags.comment = parsedPayloadText;
            else if (frameId === "USLT") metaTags.lyrics = parsedPayloadText;
          }
        }
        // CATEGORY C: Covered Artwork Picture Frame Parser (APIC)
        else if (frameId === "APIC" && payloadStart + 5 < payloadEnd) {
          var picEncoding = data[payloadStart];
          var ptr = payloadStart + 1;

          var mimeType = "";
          while (ptr < payloadEnd && data[ptr] !== 0x00) {
            mimeType += String.fromCharCode(data[ptr]);
            ptr++;
          }
          ptr++;
          ptr++; // Bypass picture type byte

          if (picEncoding === 1 || picEncoding === 2) {
            while (ptr < payloadEnd - 1 && !(data[ptr] === 0x00 && data[ptr + 1] === 0x00)) { ptr += 2; }
            ptr += 2;
          } else {
            while (ptr < payloadEnd && data[ptr] !== 0x00) { ptr++; }
            ptr++;
          }

          if (ptr < payloadEnd) {
            var imagePayloadBytes = data.slice(ptr, payloadEnd);
            metaTags.imageBlob = new Blob([imagePayloadBytes], { type: mimeType || "image/jpeg" });
          }
        }

        framePos += 10 + frameSize;
      }

      pos += 10 + id3Size;
    }

    // ==================================================================
    // 2. SCAN FOR MP3 FRAME SYNC WORD
    // ==================================================================
    var foundSync = false;
    while (pos + 4 <= len) {
      if (data[pos] === 0xFF && (data[pos + 1] & 0xE0) === 0xE0) {
        foundSync = true;
        break;
      }
      pos++;
    }
    if (!foundSync) return null;

    var frameStartPos = pos;

    // 3. BITWISE EXTRACTION FROM FRAME HEADER
    var b1 = data[pos + 1];
    var b2 = data[pos + 2];
    var b3 = data[pos + 3];

    var mpegVersion = (b1 & 0x18) >> 3;
    var layer = (b1 & 0x06) >> 1;
    if (layer !== 1) return null;

    var bitrateIndex = (b2 & 0xF0) >> 4;
    var sampleRateIndex = (b2 & 0x0C) >> 2;
    var paddingBit = (b2 & 0x02) >> 1;
    var channelMode = (b3 & 0xC0) >> 6;

    var sampleRatesTable = [
      [11025, 12000, 8000],  
      [0, 0, 0],             
      [22050, 24000, 16000], 
      [44100, 48000, 32000]  
    ];

    var bitratesTableMPEG1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
    var bitratesTableMPEG2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];

    var sampleRate = sampleRatesTable[mpegVersion][sampleRateIndex] || 48000;
    var channels = (channelMode === 3) ? 1 : 2;
    var baseBitrate = (mpegVersion === 3) ? bitratesTableMPEG1[bitrateIndex] : bitratesTableMPEG2[bitrateIndex];
    
    var samplesPerFrame = (sampleRate < 32000) ? 576 : 1152;
    var firstFrameSize = Math.floor(144 * (baseBitrate * 1000) / sampleRate) + paddingBit;

    // 4. LOCATE XING/INFO HEADERS
    var xingOffset = 4;
    if (mpegVersion === 3) {
      xingOffset += (channels === 2) ? 32 : 17;
    } else {
      xingOffset += (channels === 2) ? 17 : 9;
    }

    var tagPos = frameStartPos + xingOffset;
    var isVbr = false;
    var totalFrames = 0;
    var totalAudioBytes = 0;
    var avgBitrate = baseBitrate;

    if (tagPos + 8 <= len) {
      var tagStr = String.fromCharCode(data[tagPos], data[tagPos + 1], data[tagPos + 2], data[tagPos + 3]);
      
      if (tagStr === "Xing" || tagStr === "Info") {
        isVbr = (tagStr === "Xing");
        var flags = (data[tagPos + 4] << 24) | (data[tagPos + 5] << 16) | (data[tagPos + 6] << 8) | data[tagPos + 7];
        
        var readPtr = tagPos + 8;
        if (flags & 0x01) {
          totalFrames = (data[readPtr] << 24) | (data[readPtr + 1] << 16) | (data[readPtr + 2] << 8) | data[readPtr + 3];
          readPtr += 4;
        }
        if (flags & 0x02) {
          totalAudioBytes = (data[readPtr] << 24) | (data[readPtr + 1] << 16) | (data[readPtr + 2] << 8) | data[readPtr + 3];
        }

        if (isVbr && totalFrames > 0 && totalAudioBytes > 0) {
          var totalDurationSeconds = (totalFrames * samplesPerFrame) / sampleRate;
          avgBitrate = Math.round(((totalAudioBytes * 8) / totalDurationSeconds) / 1000);
        }
      }
    }

    if (totalFrames === 0 && baseBitrate > 0) {
      var rawAudioSize = len - frameStartPos;
      var estimatedFrameSize = Math.floor(144 * (baseBitrate * 1000) / sampleRate);
      totalFrames = Math.ceil(rawAudioSize / estimatedFrameSize);
    }

    // 5. EXTRACT LAME ENCODER DELAY & PADDING
    var encoderDelay = 0;
    var encoderPadding = 0;
    var hasLameTag = false;

    var scanEnd = Math.min(len - 24, frameStartPos + firstFrameSize);
    for (var scan = frameStartPos; scan < scanEnd; scan++) {
      if (data[scan] === 0x4C && data[scan + 1] === 0x41 && data[scan + 2] === 0x4D && data[scan + 3] === 0x45) {
        hasLameTag = true;
        var b21 = data[scan + 21];
        var b22 = data[scan + 22];
        var b23 = data[scan + 23];
        
        var combined = (b21 << 16) | (b22 << 8) | b23;
        encoderDelay = (combined >> 12) & 0xFFF;
        encoderPadding = combined & 0xFFF;
        break;
      }
    }

    var isDelayValid = hasLameTag && (encoderDelay > 0);
    
    data = null;
    return {
      audioFormat: "mp3",
      sampleRate: sampleRate,
      channels: channels,
      bitrateMode: isVbr ? "VBR" : "CBR",
      bitrate: baseBitrate,
      averageBitrate: avgBitrate,
      totalFrames: totalFrames,
      duration: (totalFrames * samplesPerFrame) / sampleRate,
      hasLameTag: isDelayValid,
      encoderDelay: isDelayValid ? encoderDelay : 1105, 
      encoderPadding: isDelayValid ? encoderPadding : 0,
      
      // Complete metadata object containing all decoded textual and binary tags
      metadata: metaTags 
    };
  };

  /**
   * Comprehensive low-level ISO Base Media File Format (ISOBMFF) atom-walker.
   * Extracts technical audio metrics (Sample Rate, Channels, Duration, Bitrate) from 'mp4a' and 'mvhd',
   * parses the iTunes 'ilst' metadata container to extract Title, Artist, Album, Year, Track,
   * Genre, Comments, and Lyrics, and reconstructs embedded 'covr' art into native browser Blobs.
   *
   * @param {ArrayBuffer|Uint8Array} m4aSource - The raw M4A/MP4 binary data
   * @returns {Object|null} Technical metadata payload including comprehensive text tags and art
   */
  function parseM4aHeader(m4aSource) {
    if (!m4aSource) return null;
    var data = m4aSource instanceof Uint8Array ? m4aSource : new Uint8Array(m4aSource);
    var len = data.length;
    if (len < 8) return null;

    var metadata = {
      audioFormat: "aac/m4a",
      sampleRate: 0,
      channels: 0,
      bitrateMode: "CBR/VBR",
      bitrate: 0,
      duration: 0,
      encoderDelay: 1024, // Standard default priming samples for AAC-LC streams
      metadata: {
        title: "",
        artist: "",
        album: "",
        year: "",
        track: "",
        genre: "",
        comment: "",
        lyrics: "",
        imageBlob: null
      }
    };

    var moovFound = false;
    var timescale = 0;
    var durationTicks = 0;

    // Safe internal UTF-8 string decoder conversion block
    function decodeUtf8(bytes) {
      if (bytes.length === 0) return "";
      if (typeof TextDecoder !== "undefined") {
        return new TextDecoder("utf-8").decode(bytes).trim();
      }
      var s = "";
      for (var i = 0; i < bytes.length; i++) {
        if (bytes[i] !== 0) s += String.fromCharCode(bytes[i]);
      }
      return s.trim();
    }

    // Recursive box walker engine tracking the current parent context layout
    function scanBoxes(start, end, parentType) {
      var pos = start;
      while (pos + 8 <= end) {
        var size = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3];
        var type = String.fromCharCode(data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7]);

        if (size <= 0 || pos + size > end) break;

        var payloadPos = pos + 8;
        var payloadEnd = pos + size;

        // 1. RECURSIVE ROUTING FOR CONTAINERS & ITUNES METADATA TAGS
        if (type === "moov" || type === "trak" || type === "mdia" || type === "minf" || type === "stbl" || type === "stsd" || 
            type === "udta" || type === "meta" || type === "ilst" ||
            type === "\xA9nam" || type === "\xA9ART" || type === "\xA9alb" || type === "\xA9day" || 
            type === "trkn" || type === "\xA9gen" || type === "gnre" || type === "\xA9cmt" || 
            type === "\xA9lyr" || type === "covr") {
          
          if (type === "moov") moovFound = true;
          
          var offset = 0;
          if (type === "stsd") offset = 8; // Skip version/flags header for sample description nodes
          else if (type === "meta") offset = 4; // Skip the 4-byte FullBox flags specific to meta containers
          
          scanBoxes(payloadPos + offset, payloadEnd, type);
        } 
        // 2. PARSE EXPLICIT DATA ATOM PAYLOAD VALUES INSIDE ITUNES TAGS
        else if (type === "data" && parentType) {
          if (payloadPos + 8 <= payloadEnd) {
            // Unpack 4-byte flag structure. (1 = Text string, 13 = JPEG, 14 = PNG)
            var dataFlag = (data[payloadPos] << 24) | (data[payloadPos + 1] << 16) | (data[payloadPos + 2] << 8) | data[payloadPos + 3];
            var bodyStart = payloadPos + 8; // Advance past flag (4b) and locale country code (4b)
            var bodyBytes = data.subarray(bodyStart, payloadEnd);

            if (dataFlag === 1) { // Standard plain UTF-8 text tags mapping extraction
              var textVal = decodeUtf8(bodyBytes);
              if (parentType === "\xA9nam") metadata.metadata.title = textVal;
              else if (parentType === "\xA9ART") metadata.metadata.artist = textVal;
              else if (parentType === "\xA9alb") metadata.metadata.album = textVal;
              else if (parentType === "\xA9day") metadata.metadata.year = textVal;
              else if (parentType === "\xA9gen") metadata.metadata.genre = textVal;
              else if (parentType === "\xA9cmt") metadata.metadata.comment = textVal;
              else if (parentType === "\xA9lyr") metadata.metadata.lyrics = textVal;
            } 
            else if (parentType === "trkn" && bodyBytes.length >= 4) {
              // Binary structural unpack: bytes index 2-3 holds Track Num, index 4-5 holds Total Tracks
              var trackNum = (bodyBytes[2] << 8) | bodyBytes[3];
              var totalTracks = bodyBytes.length >= 6 ? (bodyBytes[4] << 8) | bodyBytes[5] : 0;
              metadata.metadata.track = totalTracks > 0 ? trackNum + "/" + totalTracks : String(trackNum);
            } 
            else if (parentType === "gnre" && bodyBytes.length >= 2) {
              // Extract classic legacy ID3v1 genre short integers index
              var genreIdx = (bodyBytes[0] << 8) | bodyBytes[1];
              metadata.metadata.genre = String(genreIdx);
            } 
            else if (parentType === "covr") {
              // Map dynamic image codecs content type based on flags
              var mimeType = (dataFlag === 14) ? "image/png" : "image/jpeg";
              metadata.metadata.imageBlob = new Blob([data.slice(bodyStart, payloadEnd)], { type: mimeType });
            }
          }
        }
        // 3. EXTRACT HARDWARE TIMELINE SPECS (mvhd)
        else if (type === "mvhd") {
          var version = data[payloadPos];
          if (version === 0) {
            timescale = (data[payloadPos + 12] << 24) | (data[payloadPos + 13] << 16) | (data[payloadPos + 14] << 8) | data[payloadPos + 15];
            durationTicks = (data[payloadPos + 16] << 24) | (data[payloadPos + 17] << 16) | (data[payloadPos + 18] << 8) | data[payloadPos + 19];
          } else if (version === 1) {
            timescale = (data[payloadPos + 20] << 24) | (data[payloadPos + 21] << 16) | (data[payloadPos + 22] << 8) | data[payloadPos + 23];
            durationTicks = (data[payloadPos + 28] << 24) | (data[payloadPos + 29] << 16) | (data[payloadPos + 30] << 8) | data[payloadPos + 31];
          }
          if (timescale > 0) metadata.duration = durationTicks / timescale;
        } 
        // 4. EXTRACT AUDIO ENTRY SPECS (mp4a)
        else if (type === "mp4a") {
          metadata.channels = (data[payloadPos + 16] << 8) | data[payloadPos + 17];
          metadata.sampleRate = (data[payloadPos + 24] << 8) | data[payloadPos + 25];
          scanBoxes(payloadPos + 28, payloadEnd, parentType);
        } 
        // 5. DEEP SCAN ELEMENTARY STREAMS FOR BITRATES (esds)
        else if (type === "esds") {
          var esdsPayload = payloadPos + 4;
          for (var scan = esdsPayload; scan < payloadEnd - 12; scan++) {
            if (data[scan] === 0x04) { // Locate DecoderConfigDescrTag
              var bOffset = scan + 10;
              if (bOffset + 4 <= len) {
                var avgBitrate = (data[bOffset] << 24) | (data[bOffset + 1] << 16) | (data[bOffset + 2] << 8) | data[bOffset + 3];
                metadata.bitrate = Math.round(avgBitrate / 1000);
              }
              break;
            }
          }
        }

        pos += size;
      }
    }

    // Launch core scanner from index 0 coordinate
    scanBoxes(0, len, null);

    if (!moovFound || metadata.sampleRate === 0) return null;

    // Fallback Bitrate Engine calculation
    if (metadata.bitrate === 0 && metadata.duration > 0) {
      metadata.bitrate = Math.round(((len * 8) / metadata.duration) / 1000);
    }

    data = null;
    return metadata;
  };
  // Enforce global alias registry sync
  function parseMp4Header(mp4Source) {
    return parseM4aHeader(mp4Source);
  }

  /**
   * Low-level binary page-walker for Ogg containers (Opus / Vorbis).
   * Extracts audio sample rates, channels, durations, encoder delays (pre-skip),
   * decodes Vorbis Comment tags (Title, Artist, Album, Year, Track, Genre, Comment, Lyrics),
   * and reconstructs embedded base64 artwork blocks into native browser Blobs.
   *
   * @param {ArrayBuffer|Uint8Array} oggSource - The raw Ogg binary data
   * @returns {Object|null} Technical metadata payload including comprehensive text tags and art
   */
  function parseOggHeader(oggSource) {
    if (!oggSource) return null;
    var data = oggSource instanceof Uint8Array ? oggSource : new Uint8Array(oggSource);
    var len = data.length;
    if (len < 27) return null;

    var pos = 0;
    var codec = "";
    var sampleRate = 0;
    var channels = 0;
    var encoderDelay = 0;
    var lastGranulePos = 0;
    
    var OPUS_MAPPING_RATE = 48000; // RFC 7845 forces Opus timelines to map to a 48kHz clock

    var metaTags = {
      title: "",
      artist: "",
      album: "",
      year: "",
      track: "",
      genre: "",
      comment: "",
      lyrics: "",
      imageBlob: null
    };

    // Internal safe UTF-8 text string decoder thread
    function decodeUtf8(bytes) {
      if (bytes.length === 0) return "";
      if (typeof TextDecoder !== "undefined") {
        return new TextDecoder("utf-8").decode(bytes).trim();
      }
      var s = "";
      for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      try { return decodeURIComponent(escape(s)).trim(); } catch (e) { return s.trim(); }
    }

    // Tiny embedded Base64 decoder to process standalone METADATA_BLOCK_PICTURE fields safely
    function decodeBase64(b64) {
      b64 = b64.replace(/\s+/g, "");
      if (typeof atob !== "undefined") {
        var bin = atob(b64);
        var out = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xFF;
        return out;
      }
      var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      var bytes = []; var buffer = 0, bits = 0;
      for (var i = 0; i < b64.length; i++) {
        var val = chars.indexOf(b64.charAt(i)); if (val < 0) continue;
        buffer = (buffer << 6) | val; bits += 6;
        if (bits >= 8) { bits -= 8; bytes.push((buffer >> bits) & 0xFF); }
      }
      return new Uint8Array(bytes);
    }

    // Parses the unpacked picture block matching the structural layout of FLAC Block Type 6
    function parsePictureBlock(picBytes) {
      if (picBytes.length < 32) return;
      var p = 0;
      var picType = (picBytes[p] << 24) | (picBytes[p+1] << 16) | (picBytes[p+2] << 8) | picBytes[p+3]; p += 4;
      var mimeLen = (picBytes[p] << 24) | (picBytes[p+1] << 16) | (picBytes[p+2] << 8) | picBytes[p+3]; p += 4;
      if (p + mimeLen > picBytes.length) return;
      
      var mimeStr = "";
      for (var m = 0; m < mimeLen; m++) mimeStr += String.fromCharCode(picBytes[p + m]);
      p += mimeLen;

      var descLen = (picBytes[p] << 24) | (picBytes[p+1] << 16) | (picBytes[p+2] << 8) | picBytes[p+3];
      p += 4 + descLen + 16; // Skip description string and channel block parameters

      if (p + 4 > picBytes.length) return;
      var dataLen = (picBytes[p] << 24) | (picBytes[p+1] << 16) | (picBytes[p+2] << 8) | picBytes[p+3]; p += 4;
      
      if (p + dataLen <= picBytes.length && picType === 3) { // Front cover capture target validation
        metaTags.imageBlob = new Blob([picBytes.slice(p, p + dataLen)], { type: mimeStr || "image/jpeg" });
      }
    }

    // Process the standard inner structured Vorbis Comment array mappings (Little Endian)
    function parseVorbisComments(payloadBytes, offset) {
      var ptr = offset;
      if (ptr + 4 > payloadBytes.length) return;

      var vendorLength = payloadBytes[ptr] | (payloadBytes[ptr + 1] << 8) | (payloadBytes[ptr + 2] << 16) | (payloadBytes[ptr + 3] << 24);
      ptr += 4 + vendorLength;

      if (ptr + 4 > payloadBytes.length) return;
      var numComments = payloadBytes[ptr] | (payloadBytes[ptr + 1] << 8) | (payloadBytes[ptr + 2] << 16) | (payloadBytes[ptr + 3] << 24);
      ptr += 4;

      for (var i = 0; i < numComments; i++) {
        if (ptr + 4 > payloadBytes.length) break;
        var commentLength = payloadBytes[ptr] | (payloadBytes[ptr + 1] << 8) | (payloadBytes[ptr + 2] << 16) | (payloadBytes[ptr + 3] << 24);
        ptr += 4;

        if (ptr + commentLength > payloadBytes.length) break;
        var commentStr = decodeUtf8(payloadBytes.subarray(ptr, ptr + commentLength));
        ptr += commentLength;

        var eqIdx = commentStr.indexOf("=");
        if (eqIdx !== -1) {
          var key = commentStr.substring(0, eqIdx).toUpperCase().trim();
          var val = commentStr.substring(eqIdx + 1).trim();

          if (key === "TITLE") metaTags.title = val;
          else if (key === "ARTIST") metaTags.artist = val;
          else if (key === "ALBUM") metaTags.album = val;
          else if (key === "DATE" || key === "YEAR") metaTags.year = val;
          else if (key === "TRACKNUMBER" || key === "TRACK") metaTags.track = val;
          else if (key === "GENRE") metaTags.genre = val;
          else if (key === "COMMENT") metaTags.comment = val;
          else if (key === "LYRICS") metaTags.lyrics = val;
          else if (key === "METADATA_BLOCK_PICTURE") {
            try { parsePictureBlock(decodeBase64(val)); } catch (e) {}
          }
        }
      }
    }

    // ==================================================================
    // 3. CORE OGG PAGE-WALKING ENGINE LOOP
    // ==================================================================
    while (pos + 27 <= len) {
      if (data[pos] !== 0x4F || data[pos + 1] !== 0x67 || data[pos + 2] !== 0x67 || data[pos + 3] !== 0x53) { // "OggS"
        pos++; continue;
      }

      var headerType = data[pos + 5];
      var granuleLow = data[pos + 6] + (data[pos + 7] << 8) + (data[pos + 8] << 16) + (data[pos + 9] * 0x1000000);
      var granuleHigh = data[pos + 10] + (data[pos + 11] << 8) + (data[pos + 12] << 16) + (data[pos + 13] * 0x1000000);
      var granulePos = (granuleHigh * 0x100000000) + granuleLow;

      if (granulePos > 0 && granulePos !== 0xFFFFFFFFFFFFFFFF) { lastGranulePos = granulePos; }

      var pageSegments = data[pos + 26];
      if (pos + 27 + pageSegments > len) break;

      var pagePayloadSize = 0;
      for (var i = 0; i < pageSegments; i++) { pagePayloadSize += data[pos + 27 + i]; }

      var payloadPos = pos + 27 + pageSegments;
      if (payloadPos + pagePayloadSize > len) break;

      var payloadBytes = data.subarray(payloadPos, payloadPos + pagePayloadSize);

      // A. Sniff and analyze BOS Identifiers (First Packet Node)
      if (headerType & 0x02) {
        if (payloadBytes.length >= 16) {
          var isOpus = String.fromCharCode(payloadBytes[0], payloadBytes[1], payloadBytes[2], payloadBytes[3], payloadBytes[4], payloadBytes[5], payloadBytes[6], payloadBytes[7]) === "OpusHead";
          var isVorbis = payloadBytes[0] === 0x01 && String.fromCharCode(payloadBytes[1], payloadBytes[2], payloadBytes[3], payloadBytes[4], payloadBytes[5], payloadBytes[6]) === "vorbis";

          if (isOpus) {
            codec = "opus"; channels = payloadBytes[9];
            encoderDelay = payloadBytes[10] + (payloadBytes[11] << 8);
            sampleRate = payloadBytes[12] + (payloadBytes[13] << 8) + (payloadBytes[14] << 16) + (payloadBytes[15] * 0x1000000);
          } else if (isVorbis) {
            codec = "vorbis"; channels = payloadBytes[11];
            sampleRate = payloadBytes[12] + (payloadBytes[13] << 8) + (payloadBytes[14] << 16) + (payloadBytes[15] * 0x1000000);
          }
        }
      } 
      // B. Sniff and analyze inner Comment Packets (Subsequent Packet Nodes)
      else if (payloadBytes.length > 8) {
        var isOpusTags = String.fromCharCode(payloadBytes[0], payloadBytes[1], payloadBytes[2], payloadBytes[3], payloadBytes[4], payloadBytes[5], payloadBytes[6], payloadBytes[7]) === "OpusTags";
        var isVorbisComm = payloadBytes[0] === 0x03 && String.fromCharCode(payloadBytes[1], payloadBytes[2], payloadBytes[3], payloadBytes[4], payloadBytes[5], payloadBytes[6]) === "vorbis";

        if (isOpusTags) { parseVorbisComments(payloadBytes, 8); }
        else if (isVorbisComm) { parseVorbisComments(payloadBytes, 7); }
      }

      pos = payloadPos + pagePayloadSize;
    }

    if (!codec) return null;

    var duration = 0;
    if (codec === "opus") { duration = lastGranulePos / OPUS_MAPPING_RATE; }
    else if (codec === "vorbis" && sampleRate > 0) { duration = lastGranulePos / sampleRate; }

    data = null;
    return {
      audioFormat: "ogg/" + codec,
      sampleRate: sampleRate,
      channels: channels,
      bitrateMode: "VBR",
      bitrate: duration > 0 ? Math.round(((len * 8) / duration) / 1000) : 0,
      duration: duration,
      encoderDelay: encoderDelay,
      metadata: metaTags 
    };
  }
  
  /**
   * Low-level binary frame-walker for raw AAC files (ADTS Stream).
   * Extracts Sample Rate, Channels, Total Frames, and playback Duration.
   *
   * @param {ArrayBuffer|Uint8Array} aacSource - The raw AAC binary data
   * @returns {Object|null} Technical metadata payload or null if invalid
   */
  function parseAacHeader(aacSource) {
    if (!aacSource) return null;
    var data = aacSource instanceof Uint8Array ? aacSource : new Uint8Array(aacSource);
    var len = data.length;
    if (len < 7) return null;

    var pos = 0;
    var sampleRate = 0;
    var channels = 0;
    var totalFrames = 0;
    var firstFrameParsed = false;

    // Standard ADTS Sampling Frequency Lookup Table
    var sampleRatesTable = [
      96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350, 0, 0, 0
    ];

    // Core ADTS Frame Walker Loop
    while (pos + 7 <= len) {
      // Look for the 12-bit Sync Word (0xFFF -> All first 11 bits set to 1)
      if (data[pos] === 0xFF && (data[pos + 1] & 0xF0) === 0xF0) {
        
        if (!firstFrameParsed) {
          // Extract 4-bit Sampling Frequency Index from byte 2
          var srIdx = (data[pos + 2] & 0x3C) >> 2;
          sampleRate = sampleRatesTable[srIdx] || 44100;

          // Extract 3-bit Channel Configuration from bytes 2 and 3
          channels = ((data[pos + 2] & 0x01) << 2) | ((data[pos + 3] & 0xC0) >> 6);
          firstFrameParsed = true;
        }

        // Extract the critical 13-bit Frame Length (Includes the header size itself)
        var frameLen = ((data[pos + 3] & 0x03) << 11) | 
                       (data[pos + 4] << 3) | 
                       ((data[pos + 5] & 0xE0) >> 5);

        // Safety check to prevent infinite loops on corrupted frames
        if (frameLen <= 0) {
          pos++;
          continue;
        }
        
        totalFrames++;
        pos += frameLen; // Micro jump straight to the next adjacent ADTS frame boundary
      } else {
        pos++; // Scan byte-by-byte if container synchronization is lost
      }
    }

    if (!firstFrameParsed) return null;

    // Standard AAC-LC streams always map exactly 1024 samples per audio frame window
    var samplesPerFrame = 1024;
    var duration = (totalFrames * samplesPerFrame) / sampleRate;

    data = null;
    return {
      audioFormat: "aac/adts",
      sampleRate: sampleRate,
      channels: channels,
      bitrateMode: "VBR/CBR",
      bitrate: duration > 0 ? Math.round(((len * 8) / duration) / 1000) : 0,
      totalFrames: totalFrames,
      duration: duration,
      // AAC standard internal decoder priming padding (typically 1024 or 2048 samples)
      encoderDelay: 2048 
    };
  };
  
  /**
   * Comprehensive low-level streaminfo and metadata block parser for native FLAC containers.
   * Iterates through all available metadata blocks to unpack audio configuration metrics,
   * maps Vorbis Comments (Title, Artist, Album, Year, Track, Genre, Comment, Lyrics),
   * and extracts embedded album artwork images securely.
   *
   * @param {ArrayBuffer|Uint8Array} flacSource - The raw FLAC binary data
   * @returns {Object|null} Technical metadata payload including extracted text tags and art
   */
  function parseFlacHeader(flacSource) {
    if (!flacSource) return null;
    var data = flacSource instanceof Uint8Array ? flacSource : new Uint8Array(flacSource);
    var len = data.length;
    if (len < 42) return null; // 4b magic + 4b block header + 34b minimum streaminfo size

    // 1. VALIDATE "fLaC" MAGIC IDENTIFIER BYTES (0x66 0x4C 0x61 0x43)
    if (data[0] !== 0x66 || data[1] !== 0x4C || data[2] !== 0x61 || data[3] !== 0x43) {
      return null;
    }

    var sampleRate = 0;
    var channels = 0;
    var bitDepth = 0;
    var totalSamples = 0;

    var metaTags = {
      title: "",
      artist: "",
      album: "",
      year: "",
      track: "",
      genre: "",
      comment: "",
      lyrics: "",
      imageBlob: null
    };

    // Safe UTF-8 Decoder fallback routing mechanism
    function decodeUtf8(bytes) {
      if (bytes.length === 0) return "";
      if (typeof TextDecoder !== "undefined") {
        return new TextDecoder("utf-8").decode(bytes).trim();
      }
      var s = "";
      for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      try {
        return decodeURIComponent(escape(s)).trim();
      } catch (e) {
        return s.trim();
      }
    }

    var pos = 4; // Start walking immediately after skipping the 4-byte "fLaC" magic string token
    var isLastBlock = false;

    // ==================================================================
    // 2. METADATA BLOCK-WALKER ENGINE LOOP (BIG-ENDIAN STRUCTURE)
    // ==================================================================
    while (pos + 4 <= len) {
      var blockHeader = data[pos];
      isLastBlock = (blockHeader & 0x80) !== 0; // Top bitflags filter out the last metadata block checkpoint
      var blockType = blockHeader & 0x7F;
      
      // Extract 24-bit Block Payload Size parameter (Big Endian sequence parsing)
      var blockSize = (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3];
      pos += 4; // Shift structural index past the 4-byte block header signature

      if (pos + blockSize > len) break; // Terminate loop safely if the file is truncated/corrupt

      var payloadEnd = pos + blockSize;

      // BLOCK TYPE 0: Core Stream Specifications (STREAMINFO)
      if (blockType === 0 && blockSize >= 34) {
        // Extract 20-bit Sample Rate from unaligned bitfields
        sampleRate = (data[pos + 10] << 12) | (data[pos + 11] << 4) | (data[pos + 12] >> 4);
        
        // Extract 3-bit Channel configuration mapping parameters
        channels = ((data[pos + 12] & 0x0E) >> 1) + 1;
        
        // Extract 5-bit Bits Per Sample (Bit Depth metric scaling calculation)
        bitDepth = (((data[pos + 12] & 0x01) << 4) | (data[pos + 13] >> 4)) + 1;
        
        // Extract 36-bit Total Playback Samples count safely avoiding Javascript integer wraps
        totalSamples = ((data[pos + 13] & 0x0F) * 0x100000000) + 
                       (data[pos + 14] << 24) + 
                       (data[pos + 15] << 16) + 
                       (data[pos + 16] << 8) + 
                       data[pos + 17];
      }
      // BLOCK TYPE 4: Textual Tags Engine Container (VORBIS_COMMENT - LITTLE ENDIAN LOGIC)
      else if (blockType === 4 && blockSize >= 8) {
        var ptr = pos;

        // Fetch variable length of Vendor String descriptor (4-byte Little Endian parsing)
        var vendorLength = data[ptr] | (data[ptr + 1] << 8) | (data[ptr + 2] << 16) | (data[ptr + 3] << 24);
        ptr += 4 + vendorLength; // Fast-forward parsing pointer directly past Vendor text payloads

        if (ptr + 4 <= payloadEnd) {
          // Fetch exact counts of active user comment lines injected inside stream
          var numComments = data[ptr] | (data[ptr + 1] << 8) | (data[ptr + 2] << 16) | (data[ptr + 3] << 24);
          ptr += 4;

          for (var i = 0; i < numComments; i++) {
            if (ptr + 4 > payloadEnd) break;
            
            var commentLength = data[ptr] | (data[ptr + 1] << 8) | (data[ptr + 2] << 16) | (data[ptr + 3] << 24);
            ptr += 4;

            if (ptr + commentLength > payloadEnd) break;

            var commentBytes = data.subarray(ptr, ptr + commentLength);
            var commentStr = decodeUtf8(commentBytes);
            ptr += commentLength;

            // Split key=value pairs uniformly
            var eqIdx = commentStr.indexOf("=");
            if (eqIdx !== -1) {
              var key = commentStr.substring(0, eqIdx).toUpperCase().trim();
              var val = commentStr.substring(eqIdx + 1).trim();

              if (key === "TITLE") metaTags.title = val;
              else if (key === "ARTIST") metaTags.artist = val;
              else if (key === "ALBUM") metaTags.album = val;
              else if (key === "DATE" || key === "YEAR") metaTags.year = val;
              else if (key === "TRACKNUMBER" || key === "TRACK") metaTags.track = val;
              else if (key === "GENRE") metaTags.genre = val;
              else if (key === "COMMENT") metaTags.comment = val;
              else if (key === "LYRICS") metaTags.lyrics = val;
            }
          }
        }
      }
      // BLOCK TYPE 6: Covered Artwork Binary Block Entry (PICTURE - BIG ENDIAN LOGIC)
      else if (blockType === 6 && blockSize >= 32) {
        var ptr = pos;

        var picType = (data[ptr] << 24) | (data[ptr + 1] << 16) | (data[ptr + 2] << 8) | data[ptr + 3];
        ptr += 4;

        var mimeLength = (data[ptr] << 24) | (data[ptr + 1] << 16) | (data[ptr + 2] << 8) | data[ptr + 3];
        ptr += 4;

        if (ptr + mimeLength <= payloadEnd) {
          var mimeStr = "";
          for (var m = 0; m < mimeLength; m++) mimeStr += String.fromCharCode(data[ptr + m]);
          ptr += mimeLength;

          var descLength = (data[ptr] << 24) | (data[ptr + 1] << 16) | (data[ptr + 2] << 8) | data[ptr + 3];
          ptr += 4 + descLength; // Skip description payloads safely

          ptr += 16; // Skip channel structural dimensions: Width (4b) + Height (4b) + Depth (4b) + Colors (4b)

          if (ptr + 4 <= payloadEnd) {
            var dataLength = (data[ptr] << 24) | (data[ptr + 1] << 16) | (data[ptr + 2] << 8) | data[ptr + 3];
            ptr += 4;

            if (ptr + dataLength <= payloadEnd && picType === 3) { // Only capture Cover (Front) image structures
              var imageBytes = data.slice(ptr, ptr + dataLength);
              metaTags.imageBlob = new Blob([imageBytes], { type: mimeStr || "image/jpeg" });
            }
          }
        }
      }

      pos = payloadEnd; // Hop processing pointer safely to next metadata block boundary
      if (isLastBlock) break; // Break out immediately if the termination blockflag is confirmed active
    }

    if (sampleRate === 0) return null;
    var duration = totalSamples / sampleRate;

    data = null;
    return {
      audioFormat: "flac",
      sampleRate: sampleRate,
      channels: channels,
      bitDepth: bitDepth,
      bitrateMode: "VBR",
      bitrate: duration > 0 ? Math.round(((len * 8) / duration) / 1000) : 0,
      totalSamples: totalSamples,
      duration: duration,
      encoderDelay: 0,
      
      // Comprehensive structural dictionary holding metadata parameters
      metadata: metaTags 
    };
  };
  
  /**
   * Comprehensive low-level EBML structural parser for WebM and MKV (Matroska) containers.
   * Decodes track parameters, walks the 'Tags' elements array to extract full text tags,
   * and processes the 'Attachments' tree blocks to unpack embedded album artwork cover Blobs.
   *
   * @param {ArrayBuffer|Uint8Array} webmSource - The raw WebM/MKV binary data
   * @param {String} typeHint - Optional MIME type or file extension to determine container type
   * @returns {Object|null} Technical metadata payload including comprehensive metadata properties
   */
  function parseWebmHeader(webmSource, typeHint) {
    if (!webmSource) return null;
    var data = webmSource instanceof Uint8Array ? webmSource : new Uint8Array(webmSource);
    var len = data.length;
    if (len < 4) return null;

    // Validate EBML Magic Identifier Token: 1A 45 DF A3
    if (data[0] !== 0x1A || data[1] !== 0x45 || data[2] !== 0xDF || data[3] !== 0xA3) return null;

    var hint = String(typeHint || "").toLowerCase();
    var containerPrefix = (hint.indexOf("mkv") !== -1 || hint.indexOf("matroska") !== -1) ? "mkv/" : "webm/";

    var metadata = {
      audioFormat: containerPrefix + "audio",
      sampleRate: 0,
      channels: 0,
      bitrateMode: "VBR",
      bitrate: 0,
      duration: 0,
      metadata: {
        title: "",
        artist: "",
        album: "",
        year: "",
        track: "",
        genre: "",
        comment: "",
        lyrics: "",
        imageBlob: null
      }
    };

    var timescale = 1000000; // Default Matroska timecode metric is 1,000,000 ns (1 ms)
    var durationTicks = 0;
    var codecId = "";
    
    // State machine trackers for matching tag pairs and attachment file properties
    var currentTagName = "";
    var currentMimeType = "";

    function readVint(p) {
      if (p >= len) return null;
      var b = data[p];
      var lenBytes = 1;
      while (lenBytes <= 8 && !(b & (0x80 >> (lenBytes - 1)))) { lenBytes++; }
      if (lenBytes > 8 || p + lenBytes > len) return null;
      var mask = 0x80 >> (lenBytes - 1);
      var val = b & (mask - 1);
      for (var i = 1; i < lenBytes; i++) { val = (val * 256) + data[p + i]; }
      return { value: val, bytes: lenBytes };
    }

    function readId(p) {
      if (p >= len) return null;
      var b = data[p];
      var lenBytes = 1;
      while (lenBytes <= 4 && !(b & (0x80 >> (lenBytes - 1)))) { lenBytes++; }
      if (lenBytes > 4 || p + lenBytes > len) return null;
      var id = 0;
      for (var i = 0; i < lenBytes; i++) { id = (id * 256) + data[p + i]; }
      return { value: id, bytes: lenBytes };
    }

    function readFloat(p, size) {
      if (p + size > len) return 0;
      var buf = new ArrayBuffer(size);
      var view = new DataView(buf);
      for (var i = 0; i < size; i++) { view.setUint8(i, data[p + i]); }
      return size === 4 ? view.getFloat32(0, false) : view.getFloat64(0, false);
    }

    function readString(p, size) {
      var s = "";
      var end = Math.min(p + size, len);
      for (var i = p; i < end; i++) {
        if (data[i] !== 0) s += String.fromCharCode(data[i]);
      }
      return s.trim();
    }

    // Main EBML tree recursion walk thread
    function walk(start, end) {
      var p = start;
      while (p < end) {
        var idRes = readId(p); if (!idRes) break; p += idRes.bytes;
        var sizeRes = readVint(p); if (!sizeRes) break; p += sizeRes.bytes;

        var id = idRes.value;
        var size = sizeRes.value;
        var nextPos = p + size;

        // MASTER CONTAINERS: Deep dive recursions
        if (id === 0x18538067 || // Segment
            id === 0x1549A966 || // Segment Info
            id === 0x1654AE6B || // Tracks
            id === 0xAE       || // TrackEntry
            id === 0xE1       || // Audio
            id === 0x1254C367 || // Tags Container
            id === 0x7373     || // Tag Entry
            id === 0x67C8     || // SimpleTag Container
            id === 0x1941A142 || // Attachments Container
            id === 0x61A7)       // AttachedFile Entry
        {
          walk(p, Math.min(nextPos, end));
        }
        // TIMECODESALE RESOLUTION (0x2AD7B1)
        else if (id === 0x2AD7B1) {
          var ts = 0;
          for (var i = 0; i < size; i++) ts = (ts << 8) | data[p + i];
          if (ts > 0) timescale = ts;
        }
        // DURATION TIMELINE (0x4489)
        else if (id === 0x4489) {
          durationTicks = readFloat(p, size);
        }
        // CODEC ID SIGNATURE (0x86)
        else if (id === 0x86) {
          codecId = readString(p, size);
        }
        // SAMPLING FREQUENCY NODE (0xB5)
        else if (id === 0xB5) {
          metadata.sampleRate = Math.round(readFloat(p, size));
        }
        // AUDIO CHANNEL MAP (0x9F)
        else if (id === 0x9F) {
          var ch = 0;
          for (var i = 0; i < size; i++) ch = (ch << 8) | data[p + i];
          metadata.channels = ch;
        }
        // TAG NAME PARAMETER PROPERTY (0x45A3)
        else if (id === 0x45A3) {
          currentTagName = readString(p, size).toUpperCase();
        }
        // TAG STRING CONTENT PAIR (0x4487)
        else if (id === 0x4487 && currentTagName) {
          var tagVal = readString(p, size);
          if (currentTagName === "TITLE") metadata.metadata.title = tagVal;
          else if (currentTagName === "ARTIST" || currentTagName === "LEAD_PERFORMER") metadata.metadata.artist = tagVal;
          else if (currentTagName === "ALBUM" || currentTagName === "MOVIE") metadata.metadata.album = tagVal;
          else if (currentTagName === "DATE_RELEASED" || currentTagName === "YEAR" || currentTagName === "DATE") metadata.metadata.year = tagVal;
          else if (currentTagName === "TRACKNUMBER" || currentTagName === "TRACK") metadata.metadata.track = tagVal;
          else if (currentTagName === "GENRE") metadata.metadata.genre = tagVal;
          else if (currentTagName === "COMMENT") metadata.metadata.comment = tagVal;
          else if (currentTagName === "LYRICS") metadata.metadata.lyrics = tagVal;
        }
        // ATTACHMENT FILE CONTENT TYPE (0x4660)
        else if (id === 0x4660) {
          currentMimeType = readString(p, size);
        }
        // ATTACHMENT FILE BINARY PAYLOAD CHUNK (0x465C)
        else if (id === 0x465C) {
          // Verify mime format constraints to prevent grabbing secondary document attachments
          if (currentMimeType.indexOf("image/") === 0 || !currentMimeType) {
            var imageBytes = data.slice(p, p + size);
            metadata.metadata.imageBlob = new Blob([imageBytes], { type: currentMimeType || "image/jpeg" });
          }
        }
        // PERFORMANCE PERFORMANCE OPTIMIZATION: Safely hop past massive payload clusters (0x1F43B675)
        else if (id === 0x1F43B675) {
          p = nextPos; continue;
        }
        p = nextPos;
      }
    }

    walk(0, len);

    if (durationTicks > 0) {
      metadata.duration = (durationTicks * timescale) / 1000000000;
    }
    if (codecId) {
      metadata.audioFormat = containerPrefix + codecId.replace("A_", "").toLowerCase();
    }
    if (metadata.duration > 0) {
      metadata.bitrate = Math.round(((len * 8) / metadata.duration) / 1000);
    }

    data = null;
    return metadata.sampleRate > 0 ? metadata : null;
  };

  // Register official alias for layout symmetry
  function parseMkvHeader(mkvSource, typeHint) {
    return parseWebmHeader(mkvSource, typeHint);
  }
  
  /**
   * SuperPCM.parseHeader (Modern Extension-Agnostic Edition)
   * Centralized audio router engineered to be fully immune to extension spoofing.
   * Prioritizes low-level physical magic bytes scanning over untrusted MIME type hints.
   *
   * @param {ArrayBuffer|Uint8Array} source - The raw binary audio/video data
   * @param {String} typeHint - Mislabeled or trusted file extension / MIME type string
   * @returns {Object|null} Technical metadata payload with explicit spoofing verification flags
   */
  SuperPCM.parseHeader = function (source, typeHint) {
    if (!source) return null;
    var data = source instanceof Uint8Array ? source : new Uint8Array(source);
    var len = data.length;
    if (len < 4) return null;

    var hint = String(typeHint || "").toLowerCase().trim();

    // ==================================================================
    // STEP 1: UNIVERSAL ID3 PRE-SKIPPER ALLOCATION
    // ==================================================================
    var id3SizeOffset = 0;
    var hasId3 = (data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33); // Matches "ID3"
    if (hasId3) {
      var id3Size = ((data[6] & 0x7F) << 21) | ((data[7] & 0x7F) << 14) | ((data[8] & 0x7F) << 7) | (data[9] & 0x7F);
      id3SizeOffset = 10 + id3Size;
      if ((data[5] & 0x10) !== 0) id3SizeOffset += 10; // Account for ID3 footer tag boundary
    }

    var checkPos = id3SizeOffset;
    var result = null;

    // ==================================================================
    // STEP 2: PHASE 1 DIRECT MAGIC BYTES SNIFFING (HIGHEST PRIORITY)
    // ==================================================================
    if (checkPos + 4 <= len) {
      // Check for FLAC: "fLaC"
      if (data[checkPos] === 0x66 && data[checkPos + 1] === 0x4C && data[checkPos + 2] === 0x61 && data[checkPos + 3] === 0x43) {
        result = parseFlacHeader(data);
      }
      // Check for Ogg/Opus/Vorbis: "OggS"
      else if (data[checkPos] === 0x4F && data[checkPos + 1] === 0x67 && data[checkPos + 2] === 0x67 && data[checkPos + 3] === 0x53) {
        result = parseOggHeader(data);
      }
      // Check for WebM/MKV EBML Container: 1A 45 DF A3 token
      else if (data[checkPos] === 0x1A && data[checkPos + 1] === 0x45 && data[checkPos + 2] === 0xDF && data[checkPos + 3] === 0xA3) {
        result = parseWebmHeader(data, hint);
      }
      // Check for M4A/MP4 ISOBMFF Container: "ftyp" signature at offset +4
      else if (checkPos + 8 <= len && data[checkPos + 4] === 0x66 && data[checkPos + 5] === 0x74 && data[checkPos + 6] === 0x79 && data[checkPos + 7] === 0x70) {
        result = parseM4aHeader(data); // Directly routes to native container box walker
      }
    }

    // Heuristic short-circuit: If an ID3v2 tag is prefixed but no other container signature matches,
    // it is mathematically certain to be an MP3 stream.
    if (!result && hasId3) {
      result = parseMp3Header(data);
    }

    // ==================================================================
    // STEP 3: PHASE 2 BRUTE-FORCE FALLBACK VALIDATION (SPOOF CEILING)
    // ==================================================================
    // If magic bytes were unaligned or absent (like raw CBR MP3 or raw ADTS streams), 
    // execute sequential deep parsing verification before giving up.
    if (!result) {
      result = parseMp3Header(data) || 
               parseAacHeader(data) || 
               parseM4aHeader(data) || 
               parseOggHeader(data) || 
               parseWebmHeader(data, hint) || 
               parseFlacHeader(data);
    }

    // ==================================================================
    // STEP 4: PHASE 3 METADATA CORRELATION & MISMATCH DETECTOR (FIXED)
    // ==================================================================
    if (result) {
      result.id3SizeOffset = id3SizeOffset; // Preserve historical skip metric mapping
      
      if (hint && hint !== "") {
        // Isolate root name architecture string (e.g., "aac/m4a" -> "aac", "ogg/opus" -> "ogg")
        var rootFormatName = result.audioFormat.split('/')[0];
        
        var isMatched = false;
        
        // 1. Direct matching condition (e.g., "flac" inside ".flac")
        if (hint.indexOf(rootFormatName) !== -1) {
          isMatched = true;
        } 
        // 2. Container mapping rules for MP4/M4A family holding AAC bitstreams
        else if (rootFormatName === "aac" && (hint.indexOf("m4a") !== -1 || hint.indexOf("mp4") !== -1)) {
          isMatched = true;
        } 
        // 3. Wrapper mapping rules for MP3 streams inside MPEG headers
        else if (rootFormatName === "mp3" && hint.indexOf("mpeg") !== -1) {
          isMatched = true;
        }
        
        // Safe trigger validation
        result.isExtensionMismatched = !isMatched;
      } else {
        result.isExtensionMismatched = false;
      }
    }

    return result; // Safe structured return payload or null if totally corrupt
  };
  
  /** For MP3 **/
  function detectPhysicalGaps(pcm, format, options) {
    options = options || {};
    var threshold = options.threshold !== undefined ? options.threshold : 0.001;
    
    if (format.bitrate && format.bitrate > 0) {
      if (format.bitrate <= 32) {
        threshold = 0.025; // High-compression codec hiss allowance threshold
      } else if (format.bitrate <= 64) {
        threshold = 0.008; // Mid-compression noise floor allowance threshold
      } else if (format.bitrate <= 96) {
        threshold = 0.003; // Low-bandwidth optimization ceiling
      }
    }
    
    var bitDepth = format.bitDepth || 16;
    var isFloat = !!format.float;
    var channels = format.channels || 2;
    var sampleRate = format.sampleRate || 48000;

    var bps = getBytesPerSample(bitDepth, isFloat); // References internal helper
    var frameSize = bps * channels;
    var totalFrames = Math.floor(pcm.length / frameSize);

    var dv = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);

    var delayFrames = 0;
    var paddingFrames = 0;

    // 1. Scan Frontward to catch the exact Encoder Delay boundary
    for (var f = 0; f < totalFrames; f++) {
      var hasSignal = false;
      for (var c = 0; c < channels; c++) {
        var sampleVal = getSample(pcm, dv, f * frameSize + c * bps, bitDepth, isFloat); // References internal helper
        if (Math.abs(sampleVal) > threshold) {
          hasSignal = true;
          break;
        }
      }
      if (hasSignal) {
        delayFrames = f;
        break;
      }
    }

    // 2. Scan Backward to catch the exact Encoder Padding boundary
    for (var f = totalFrames - 1; f >= 0; f--) {
      var hasSignal = false;
      for (var c = 0; c < channels; c++) {
        var sampleVal = getSample(pcm, dv, f * frameSize + c * bps, bitDepth, isFloat); // References internal helper
        if (Math.abs(sampleVal) > threshold) {
          hasSignal = true;
          break;
        }
      }
      if (hasSignal) {
        paddingFrames = (totalFrames - 1) - f;
        break;
      }
    }

    // 3. Heuristic Profile Snapping Logic (Snaps rough threshold values to precise encoder footprints)
    var finalDelay = delayFrames;
    if (sampleRate >= 32000) { // MPEG-1 Tier
      if (Math.abs(delayFrames - 528) <= 40) finalDelay = 528;       // Fraunhofer IIS Profile
      else if (Math.abs(delayFrames - 1104) <= 40) finalDelay = 1104; // LAME Standard Profile
      else if (Math.abs(delayFrames - 1160) <= 40) finalDelay = 1160; // LAME Joint-Stereo Low-bitrate Profile
      else if (delayFrames === 0) finalDelay = 1105;                 // Fallback anchor standard
    } else { // MPEG-2 / MPEG-2.5 Tier
      if (Math.abs(delayFrames - 576) <= 30) finalDelay = 576;       // Low-frequency Standard Profile
    }

    return {
      detectedDelay: delayFrames,
      detectedPadding: paddingFrames,
      encoderDelay: finalDelay,
      encoderPadding: paddingFrames,
      totalFrames: totalFrames
    };
  };
  
  /**
   * Detects audio/video MIME type based on Magic Bytes (first 12 bytes)
   * @param {Uint8Array} uint8Array - Binary array containing at least the first 12 bytes of the file
   * @returns {string} The detected MIME type
   */
  function mediaMagicBytesToMimeType(uint8Array) {
    // Helper to convert a subarray of bytes into a spaced Hex string (e.g., "52 49 46 46")
    var getHex = function (arr, start, end) {
      return Array.from(arr.slice(start, end))
      .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');
    }
  
    // Extract hex patterns at crucial positions
    var hexFirst4 = getHex(uint8Array, 0, 4);
    var hexFirst3 = getHex(uint8Array, 0, 3);
    var hexOffset4to8 = getHex(uint8Array, 4, 8);
    var hexOffset8to12 = getHex(uint8Array, 8, 12);
    uint8Array = null;
    
    // --- DETECTION LOGIC ---
  
    // 1. WAV & AVI formats (Both utilize the RIFF container)
    if (hexFirst4 === '52 49 46 46') { // 'RIFF'
      if (hexOffset8to12 === '57 41 56 45') return 'audio/wav';  // 'WAVE'
      if (hexOffset8to12 === '41 56 49 20') return 'video/x-msvideo'; // 'AVI '
    }
  
    // 2. MP3 (Usually begins with the ID3v2 metadata tag 'ID3')
    if (hexFirst3 === '49 44 33') { 
      return 'audio/mpeg';
    }
  
    // 3. FLAC
    if (hexFirst4 === '46 4C 41 43') { // 'fLaC'
      return 'audio/flac';
    }
  
    // 4. OGG (Can be `.ogg` audio or `.oga`)
    if (hexFirst4 === '4F 67 67 53') { // 'OggS'
      return 'audio/ogg'; 
    }
  
    // 5. MP4 (Looks for the 'ftyp' container marker at byte offset 4-8)
    if (hexOffset4to8 === '66 74 79 70') { // 'ftyp'
      return 'video/mp4';
    }
  
    // 6. MKV / WebM (EBML header)
    if (hexFirst4 === '1A 45 DF A3') {
      // WebM and MKV containers share a similar initial structure; defaulting to matroska
      return 'video/x-matroska'; 
    }
  
    // Fallback to a generic binary type if no signatures match
    return 'application/octet-stream';
  }
  
  /**
   * Get audio source and converts to PCM data.
   */
  function audioSource() {
    var xhr = new XMLHttpRequest(),
    _this = this;

    this.src = "";
    this.headers = {};
    this.headerInfo = null;
    this.nonMediaFormat = {
      sampleRate: 12000,
      bitDepth: SuperPCM.BIT_DEPTH_16,
      channels: 1,
      float: false
    }

    var generate = function(pcm, fmt) {
      if (_this.onSuccess && typeof _this.onSuccess == "function") {
        _this.onSuccess({
          sampleRate: fmt.sampleRate,
          bitDepth: fmt.float ? SuperPCM.BIT_DEPTH_32: fmt.bitDepth,
          float: fmt.float,
          channels: fmt.channels,
          data: pcm,
          headerInfo: _this.headerInfo
        });
      }
    }
    
    var contentType = "", response = null;
    var loadSource = function() {
      var processPCM = function() {
        if (!contentType && response) {
          contentType = mediaMagicBytesToMimeType(new Uint8Array(response));
        }

        if (/audio\/|video\//i.test(contentType) && !/midi/i.test(contentType)) {
          var byteHeader = new Uint8Array(response, 0, 4);
          var isWav = (byteHeader[0] === 0x52 && byteHeader[1] === 0x49 && byteHeader[2] === 0x46 && byteHeader[3] === 0x46);
  
          if (/audio\/wav/i.test(contentType) || isWav) {
            SuperPCM.wavToPCM(response).then(function (info) {
              var fmt = info.format;
              _this.headerInfo = { audioFormat: "wav", ...fmt };
              generate(info.pcm, fmt);
            }).catch(function (err) {
              console.error('Error decoding WAV file:', err);
              if (_this.onError && typeof _this.onError == "function") _this.onError(err);
            });
              
            byteHeader = null;
            isWav = null;
          } else if (/audio\/x\-eac/i.test(contentType)) {
            SuperPCM.eacToPCM(response).then(function (info) {
            var fmt = info.format;
              _this.headerInfo = { audioFormat: "eac", ...fmt };
              generate(info.pcm, fmt);
            }).catch(function (err) {
              console.error('Error decoding EAC file:', err);
              if (_this.onError && typeof _this.onError == "function") _this.onError(err);
            });
          } else {
            _this.headerInfo = SuperPCM.parseHeader(response, _this.src);
            
            var sampleRate = _this.headerInfo && _this.headerInfo.sampleRate ? _this.headerInfo.sampleRate : 48000,
            bitDepth = _this.headerInfo && _this.headerInfo.bitDepth ? _this.headerInfo.bitDepth : 16;
            var audioContext = SuperPCM.audioCtx(sampleRate);
            audioContext.decodeAudioData(response, function(audioBuffer) {
              SuperPCM.audioBufferToPCM(audioBuffer, { bitDepth: bitDepth, float: false }).then(function(pcm) {
                if (_this.headerInfo && ((_this.headerInfo.audioFormat === "mp3" && !_this.headerInfo.hasLameTag) || _this.headerInfo.audioFormat === "aac/adts")) {
                  var encoderDelay = _this.headerInfo.encoderDelay, encoderPadding = _this.headerInfo.encoderPadding, totalFrames;
                  if (_this.headerInfo.audioFormat === "mp3") {
                    var gaps = detectPhysicalGaps(pcm, {
                      bitDepth: 16,
                      float: false,
                      channels: audioBuffer.numberOfChannels,
                      sampleRate: _this.headerInfo.sampleRate,
                      bitrate: _this.headerInfo.bitrate
                    });
                    encoderDelay = _this.headerInfo.encoderDelay = gaps.encoderDelay;
                    encoderPadding = _this.headerInfo.encoderPadding = gaps.encoderPadding;
                    totalFrames = gaps.totalFrames;
                    
                    gaps = null;
                  }
                  pcm = SuperPCM.Cut(pcm, { channels: audioBuffer.numberOfChannels, bitDepth: 16, float: false }, { start: encoderDelay, end: totalFrames != null ? totalFrames - encoderPadding : undefined });
                }
                generate(pcm, {
                  sampleRate: sampleRate,
                  bitDepth: bitDepth,
                  float: false,
                  channels: audioBuffer.numberOfChannels,
                });
  
                audioContext.close();
                audioContext = null;
              });
            }, function(err) {
              if (audioContext) audioContext.close();
              if (_this.onError && typeof _this.onError == "function") _this.onError(err);
            });
          }
        } else {
          _this.headerInfo = { audioFormat: "raw", ..._this.nonMediaFormat };
          generate(new Uint8Array(response), _this.nonMediaFormat);
        }
        
        processPCM = null;
        response = null;
        contentType = null;
      };

      if (_this.src instanceof Blob) {
        contentType = _this.src.type;
        _this.src.arrayBuffer().then(function (buffer) {
          response = buffer;
          processPCM();
        }).catch(function(err) {
          if (_this.onError && typeof _this.onError == "function") _this.onError(err);
        });
      } else if (_this.src instanceof ArrayBuffer) {
        response = _this.src;
        processPCM();
      } else if (_this.src instanceof Uint8Array) {
        response = (_this.src.byteOffset === 0 && _this.src.byteLength === _this.src.buffer.byteLength)
          ? _this.src.buffer
          : _this.src.buffer.subarray(_this.src.byteOffset, _this.src.byteOffset + _this.src.byteLength);
        processPCM();
      } else if (typeof _this.src === "string") {
        response = xhr.response;
        contentType = xhr.getResponseHeader("Content-Type");
        processPCM();
      }
    };
    
    xhr.onload = function () {
      if (xhr.status !== 200 && xhr.status !== 0) {
        var err = {
          message: `Failed to load this file: ${xhr.status} ${xhr.statusText}`,
          src: _this.src
        };
        console.error(err.message);
        if (_this.onError && typeof _this.onError == "function") _this.onError(err);
      } else {
        loadSource();
      }
    }
    xhr.onerror = function () {
      var err = {
        message: `XMLHttpRequest error while loading this file: ${_this.src}`,
        src: _this.src
      };
      console.error(err.message);
      if (_this.onError && typeof _this.onError == "function") _this.onError(err);
    };

    this.start = function () {
      if (this.src instanceof Blob || this.src instanceof ArrayBuffer || this.src instanceof Uint8Array) {
        loadSource();
      } else if (typeof this.src === "string") {
        xhr.open("GET", this.src);
        xhr.responseType = "arraybuffer";
        for (var header in this.headers) {
          if (Object.prototype.hasOwnProperty.call(this.headers, header)) {
            xhr.setRequestHeader(header, _this.headers[header]);
          }
        }
        xhr.send();
      }
    }
    this.abort = function () {
      xhr.abort();
    }

    this.onSuccess = function() {}
    this.onError = function() {}
  }

  /**
  * Get amplitudo
  * Supports many interpolation amplitudo
  */
  function fetchRawSample(pcm, off, channels, channel, bytesPerSample, bitDepth, float, dv, ratio) {
    var offFloor = Math.floor(off);
    var frameStride = bytesPerSample * channels;
    var byteIndex = Math.floor(offFloor * frameStride + channel * bytesPerSample);

    if (byteIndex >= 0 && byteIndex < pcm.length) {
      if (ratio > 1) {
        var bi0 = byteIndex,
        bi1 = byteIndex + frameStride;
        var s0 = getSample(pcm, dv, bi0, bitDepth, float),
        s1 = getSample(pcm, dv, bi1 < pcm.length ? bi1: bi0, bitDepth, float);
        var t = off - offFloor;

        return s0 + (s1 - s0) * t;
      } else return getSample(pcm, dv, byteIndex, bitDepth, float);
    }

    return 0;
  }
  
  function besselI0(x) {
    var sum = 1;
    var y = x * x / 4;
    var t = 1;
  
    for (var i = 1; i <= 12; i++) {
      t *= y / (i * i);
      sum += t;
    }
  
    return sum;
  }
  
  function kaiserWindow(x, radius, beta) {
    if (Math.abs(x) > radius) return 0;
  
    var r = x / radius;
    return besselI0(beta * Math.sqrt(1 - r * r)) / besselI0(beta);
  }
  
  function sincKernel(x) {
    if (x === 0) return 1;
    var px = Math.PI * x;
    return Math.sin(px) / px;
  }
  
  SuperPCM.getAmplitudo = function(pcm, offset, channels, channel, bitDepth, float, interpolationMode, dv, ratio) {
    var bytesPerSample = getBytesPerSample(bitDepth, float);
    var totalFrames = Math.floor(pcm.length / (bytesPerSample * channels));
    interpolationMode = interpolationMode || SuperPCM.interpolationMode;
    ratio = Math.max(1, ratio ?? 1);
  
    if (!dv && (float || bitDepth === SuperPCM.BIT_DEPTH_16 || bitDepth === SuperPCM.BIT_DEPTH_32)) {
      dv = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    }
  
    var rOffset = Math.floor(offset / ratio) * ratio;
    var t = (offset - rOffset) / ratio;
  
    // ==================================================================
    // BRANCH 1: STANDARD 4-POINT INTERPOLATORS
    // ==================================================================
    if (
      interpolationMode === "cubic" ||
      interpolationMode === "hermite" ||
      interpolationMode === "bspline" ||
      interpolationMode === "catmullrom" ||
      interpolationMode === "mitchell"
    ) {
      var s_1 = fetchRawSample(pcm, rOffset - ratio, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
      var s0  = fetchRawSample(pcm, rOffset, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
      var s1  = fetchRawSample(pcm, rOffset + ratio, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
      var s2  = fetchRawSample(pcm, rOffset + ratio * 2, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
  
      if (interpolationMode === "bspline") {
        var b0 = (1 - t) * (1 - t) * (1 - t) / 6;
        var b1 = (3 * t * t * t - 6 * t * t + 4) / 6;
        var b2 = (-3 * t * t * t + 3 * t * t + 3 * t + 1) / 6;
        var b3 = t * t * t / 6;
        return b0 * s_1 + b1 * s0 + b2 * s1 + b3 * s2;
      }
  
      if (interpolationMode === "mitchell") {
        var B = 1 / 3;
        var C = 1 / 3;
  
        function mitchellWeight(x) {
          x = Math.abs(x);
          var x2 = x * x;
          var x3 = x2 * x;
  
          if (x < 1) {
            return ((12 - 9 * B - 6 * C) * x3 +
                    (-18 + 12 * B + 6 * C) * x2 +
                    (6 - 2 * B)) / 6;
          }
  
          if (x < 2) {
            return ((-B - 6 * C) * x3 +
                    (6 * B + 30 * C) * x2 +
                    (-12 * B - 48 * C) * x +
                    (8 * B + 24 * C)) / 6;
          }
  
          return 0;
        }
  
        var mw0 = mitchellWeight(t + 1);
        var mw1 = mitchellWeight(t);
        var mw2 = mitchellWeight(1 - t);
        var mw3 = mitchellWeight(2 - t);
        var mwSum = mw0 + mw1 + mw2 + mw3;
  
        return mwSum !== 0
          ? (s_1 * mw0 + s0 * mw1 + s1 * mw2 + s2 * mw3) / mwSum
          : s0;
      }
  
      // cubic, hermite, catmullrom
      var k0 = -0.5 * s_1 + 1.5 * s0 - 1.5 * s1 + 0.5 * s2;
      var k1 = s_1 - 2.5 * s0 + 2.0 * s1 - 0.5 * s2;
      var k2 = -0.5 * s_1 + 0.5 * s1;
      var k3 = s0;
  
      return ((k0 * t + k1) * t + k2) * t + k3;
    }
  
    // ==================================================================
    // BRANCH 2: AKIMA SUB-SPLINE
    // ==================================================================
    else if (interpolationMode === "akima") {
      var a_2 = fetchRawSample(pcm, rOffset - ratio * 2, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
      var a_1 = fetchRawSample(pcm, rOffset - ratio, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
      var a0  = fetchRawSample(pcm, rOffset, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
      var a1  = fetchRawSample(pcm, rOffset + ratio, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
      var a2  = fetchRawSample(pcm, rOffset + ratio * 2, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
      var a3  = fetchRawSample(pcm, rOffset + ratio * 3, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
  
      var m1 = a_1 - a_2;
      var m2 = a0 - a_1;
      var m3 = a1 - a0;
      var m4 = a2 - a1;
      var m5 = a3 - a2;
  
      var w1 = Math.abs(m4 - m3);
      var w2 = Math.abs(m2 - m1);
      var t1 = (w1 + w2 > 0) ? (w1 * m2 + w2 * m3) / (w1 + w2) : 0.5 * (m2 + m3);
  
      var w3 = Math.abs(m5 - m4);
      var w4 = Math.abs(m3 - m2);
      var t2 = (w3 + w4 > 0) ? (w3 * m3 + w4 * m4) / (w3 + w4) : 0.5 * (m3 + m4);
  
      var c0 = a0;
      var c1 = t1;
      var c2 = 3 * m3 - 2 * t1 - t2;
      var c3 = t1 + t2 - 2 * m3;
  
      return ((c3 * t + c2) * t + c1) * t + c0;
    }
  
    // ==================================================================
    // BRANCH 3: LANCZOS-3 SINC FILTER
    // ==================================================================
    else if (interpolationMode === "lanczos3") {
      var sum = 0, weightSum = 0;
  
      for (var g = -2; g <= 3; g++) {
        var samplePos = rOffset + g * ratio;
        if (samplePos < 0) samplePos = 0;
        if (samplePos >= totalFrames * ratio) samplePos = (totalFrames - 1) * ratio;
  
        var sampleVal = fetchRawSample(pcm, samplePos, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
        var x = t - g;
        var weight = 0;
  
        if (x === 0) {
          weight = 1;
        } else if (x > -3 && x < 3) {
          var piX = Math.PI * x;
          weight = (Math.sin(piX) / piX) * (Math.sin(piX / 3) / (piX / 3));
        }
  
        sum += sampleVal * weight;
        weightSum += weight;
      }
  
      return weightSum !== 0 ? sum / weightSum : 0;
    }
  
    // ==================================================================
    // BRANCH 4: KAISER WINDOWED SINC FILTER
    // ==================================================================
    else if (interpolationMode === "kaiser") {
      var sum = 0;
      var weightSum = 0;
      var radius = 6;
      var beta = 8.6;
  
      for (var g = -radius + 1; g <= radius; g++) {
        var samplePos = rOffset + g * ratio;
        if (samplePos < 0) samplePos = 0;
        if (samplePos >= totalFrames * ratio) samplePos = (totalFrames - 1) * ratio;
  
        var sampleVal = fetchRawSample(pcm, samplePos, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
        var x = t - g;
        var weight = sincKernel(x) * kaiserWindow(x, radius, beta);
  
        sum += sampleVal * weight;
        weightSum += weight;
      }
  
      return weightSum !== 0 ? sum / weightSum : 0;
    }
  
    // ==================================================================
    // BRANCH 5: BLACKMAN WINDOWED SINC FILTER
    // ==================================================================
    else if (interpolationMode === "blackman") {
      var sum = 0;
      var weightSum = 0;
      var radius = 6;
  
      for (var g = -radius + 1; g <= radius; g++) {
        var samplePos = rOffset + g * ratio;
        if (samplePos < 0) samplePos = 0;
        if (samplePos >= totalFrames * ratio) samplePos = (totalFrames - 1) * ratio;
  
        var sampleVal = fetchRawSample(pcm, samplePos, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
        var x = t - g;
        var ax = Math.abs(x);
  
        var weight = 0;
        if (ax <= radius) {
          var n = (x + radius) / (2 * radius);
          var blackman = 0.42 - 0.5 * Math.cos(2 * Math.PI * n) + 0.08 * Math.cos(4 * Math.PI * n);
          weight = sincKernel(x) * blackman;
        }
  
        sum += sampleVal * weight;
        weightSum += weight;
      }
  
      return weightSum !== 0 ? sum / weightSum : 0;
    }
  
    // ==================================================================
    // BRANCH 6: GAUSSIAN FILTER
    // ==================================================================
    else if (interpolationMode === "gaussian") {
      var sum = 0;
      var weightSum = 0;
      var radius = 4;
      var sigma = 1.2;
  
      for (var g = -radius; g <= radius; g++) {
        var samplePos = rOffset + g * ratio;
        if (samplePos < 0) samplePos = 0;
        if (samplePos >= totalFrames * ratio) samplePos = (totalFrames - 1) * ratio;
  
        var sampleVal = fetchRawSample(pcm, samplePos, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
        var x = t - g;
        var weight = Math.exp(-(x * x) / (2 * sigma * sigma));
  
        sum += sampleVal * weight;
        weightSum += weight;
      }
  
      return weightSum !== 0 ? sum / weightSum : 0;
    }
  
    // ==================================================================
    // BRANCH 7: LIGHTWEIGHT LOW-ORDER KERNELS
    // ==================================================================
    else if (interpolationMode === "quadratic") {
      var q_1 = fetchRawSample(pcm, rOffset - ratio, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
      var q0  = fetchRawSample(pcm, rOffset, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
      var q1  = fetchRawSample(pcm, rOffset + ratio, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
  
      var qA = 0.5 * (q1 + q_1) - q0;
      var qB = 0.5 * (q1 - q_1);
  
      return (qA * t + qB) * t + q0;
    }
  
    else if (interpolationMode === "cosine") {
      var c0 = fetchRawSample(pcm, rOffset, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
      var c1 = fetchRawSample(pcm, rOffset + ratio, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
      var mu2 = (1 - Math.cos(t * Math.PI)) * 0.5;
  
      return c0 * (1 - mu2) + c1 * mu2;
    }
  
    else if (interpolationMode === "linear") {
      var l0 = fetchRawSample(pcm, rOffset, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
      var l1 = fetchRawSample(pcm, rOffset + ratio, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
  
      return l0 + (l1 - l0) * t;
    }
  
    else if (interpolationMode === "sinc" || interpolationMode === "lanczos") {
      var sum = 0;
      var weightSum = 0;
      var radius = 4;
  
      for (var g = -radius + 1; g <= radius; g++) {
        var samplePos = rOffset + g * ratio;
        if (samplePos < 0) samplePos = 0;
        if (samplePos >= totalFrames * ratio) samplePos = (totalFrames - 1) * ratio;
  
        var sampleVal = fetchRawSample(pcm, samplePos, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
        var x = t - g;
        var weight = sincKernel(x);
  
        if (interpolationMode === "lanczos") {
          weight *= sincKernel(x / radius);
        }
  
        sum += sampleVal * weight;
        weightSum += weight;
      }
  
      return weightSum !== 0 ? sum / weightSum : 0;
    }
  
    // step / zoh / fallback
    return fetchRawSample(pcm, rOffset, channels, channel, bytesPerSample, bitDepth, float, dv, ratio);
  }

  /* ------------------------------------------------------------------
   * AudioBuffer -> PCM (Uint8Array, interleaved)
   * ------------------------------------------------------------------ */

  SuperPCM.audioBufferToPCM = function (audioBuffer, options) {
    var cfg = assignDefaults( {
      bitDepth: SuperPCM.defaults.bitDepth,
      float: SuperPCM.defaults.float
    }, options || {});

    var bitDepth = cfg.bitDepth;
    var isFloat = !!cfg.float;

    var channels = audioBuffer.numberOfChannels;
    var length = audioBuffer.length;
    var bytesPerSample = getBytesPerSample(bitDepth, isFloat);

    var pcm = new Uint8Array(length * channels * bytesPerSample);
    var dv = new DataView(pcm.buffer);
    var offset = 0;

    var channelData = [];
    for (var ch = 0; ch < channels; ch++) {
      channelData[ch] = audioBuffer.getChannelData(ch);
    }

    for (var i = 0; i < length; i++) {
      for (var c = 0; c < channels; c++) {
        var sample = channelData[c][i] || 0;
        offset = encodeSample(sample, bitDepth, isFloat, pcm, dv, offset);
      }
    }

    return Promise.resolve(pcm);
  };

  /* ------------------------------------------------------------------
   * PCM (Uint8Array, interleaved) -> AudioBuffer
   * ------------------------------------------------------------------ */

  SuperPCM.pcmToAudioBuffer = function (pcm, options) {
    var cfg = assignDefaults( {
      sampleRate: SuperPCM.defaults.sampleRate,
      channels: SuperPCM.defaults.channels,
      bitDepth: SuperPCM.defaults.bitDepth,
      float: SuperPCM.defaults.float
    }, options || {});

    var bitDepth = cfg.bitDepth;
    var isFloat = !!cfg.float;

    var bytes = pcm instanceof Uint8Array ? pcm: new Uint8Array(pcm);
    var bytesPerSample = getBytesPerSample(bitDepth, isFloat);
    var frameSize = bytesPerSample * cfg.channels;

    if (frameSize === 0) {
      throw new Error('Invalid configuration: channels or bitDepth/float not set properly.');
    }

    var frames = Math.floor(bytes.length / frameSize);

    // Modern browsers support constructing AudioBuffer directly.
    var audioBuffer = new AudioBuffer( {
      length: frames,
      sampleRate: cfg.sampleRate,
      numberOfChannels: cfg.channels
    });

    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var offset = 0;

    for (var i = 0; i < frames; i++) {
      for (var c = 0; c < cfg.channels; c++) {
        var res = decodeSample(bytes, dv, offset, bitDepth, isFloat);
        audioBuffer.getChannelData(c)[i] = res.value;
        offset = res.offset;
      }
    }

    return Promise.resolve(audioBuffer);
  };

  /**
  * Converts PCM data to a WAV Blob. (Supports Linear PCM and IMA ADPCM)
  */
  SuperPCM.pcmToWavBlob = function (pcm, options) {
    var cfg = assignDefaults( {
      sampleRate: SuperPCM.defaults.sampleRate,
      channels: SuperPCM.defaults.channels,
      bitDepth: SuperPCM.defaults.bitDepth,
      float: SuperPCM.defaults.float,
      adpcm: false,
      adpcmBlockSize: null,
      adpcmBits: 4,
      adpcmJointStereo: false
    }, options || {});
    
    var header = [];
    function writeString(s) {
      for (var i = 0; i < s.length; i++) {
        header.push(s.charCodeAt(i) & 0xFF);
      }
    }
    function writeUint32(v) {
      header.push(v & 0xFF, (v >> 8) & 0xFF, (v >> 16) & 0xFF, (v >> 24) & 0xFF);
    }
    function writeUint16(v) {
      header.push(v & 0xFF, (v >> 8) & 0xFF);
    }
    
    if (cfg.adpcm) {
      var pcmBytes = pcm instanceof Uint8Array ? pcm : new Uint8Array(pcm);
      var srcFormat = {
        sampleRate: cfg.sampleRate,
        channels: cfg.channels,
        bitDepth: cfg.float ? SuperPCM.BIT_DEPTH_32 : cfg.bitDepth,
        float: cfg.float
      };

      if (srcFormat.bitDepth !== SuperPCM.BIT_DEPTH_16 || srcFormat.float) {
        pcmBytes = SuperPCM.Resample(pcmBytes, srcFormat, {
          sampleRate: cfg.sampleRate,
          channels: cfg.channels,
          bitDepth: SuperPCM.BIT_DEPTH_16,
          float: false
        });
      }

      var totalSamples = Math.floor(pcmBytes.length / 2);
      var totalFrames = Math.floor(totalSamples / cfg.channels);
      
      var pcmDataInt16 = new Int16Array(totalSamples);
      var dvConv = new DataView(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.byteLength);
      for (var i = 0; i < totalSamples; i++) {
        pcmDataInt16[i] = dvConv.getInt16(i * 2, true);
      }
      
      var adpcmResult;
      if (cfg.adpcmBits === 3 && cfg.adpcmJointStereo && cfg.channels === 2) {
        adpcmResult = encodeJointStereoADPCM3Bit(pcmDataInt16, cfg.adpcmBlockSize);
      } else if (cfg.adpcmBits === 3) {
        adpcmResult = encode3BitADPCM(pcmDataInt16, cfg.channels, cfg.adpcmBlockSize);
      } else if (cfg.adpcmJointStereo && cfg.channels === 2) {
        adpcmResult = encodeJointStereoADPCM4Bit(pcmDataInt16, cfg.adpcmBlockSize);
      } else {
        adpcmResult = cfg.channels >= 2 ? encodeStereoADPCM(pcmDataInt16, cfg.adpcmBlockSize) : encodeMonoADPCM(pcmDataInt16, cfg.adpcmBlockSize);
      }
      var adpcmData = adpcmResult.adpcmData;
      var BLOCK_ALIGN = adpcmResult.BLOCK_ALIGN;
      var SAMPLES_PER_BLOCK = adpcmResult.SAMPLES_PER_BLOCK;
      
      var headerLength = 60;
      var fileLength = headerLength + adpcmData.length;
      var wavBytes = new Uint8Array(fileLength);

      writeString('RIFF');
      writeUint32(fileLength - 8);
      writeString('WAVE');
      
      writeString('fmt ');
      writeUint32(20);
      
      var formatTagOut = 0x0011;
      if (cfg.adpcmBits === 3) {
        formatTagOut = (cfg.adpcmJointStereo && cfg.channels === 2) ? 0x0013 : 0x0012;
      } else if (cfg.adpcmJointStereo && cfg.channels === 2) {
        formatTagOut = 0x0014;
      }
      writeUint16(formatTagOut);
      writeUint16(cfg.channels);
      writeUint32(cfg.sampleRate);
      
      var byteRate = Math.floor((cfg.sampleRate * BLOCK_ALIGN) / SAMPLES_PER_BLOCK);
      writeUint32(byteRate);

      writeUint16(BLOCK_ALIGN);
      writeUint16(4);
      writeUint16(2);
      writeUint16(SAMPLES_PER_BLOCK);
      
      writeString('fact');
      writeUint32(4);
      writeUint32(totalFrames);
      
      writeString('data');
      writeUint32(adpcmData.length);
      
      wavBytes.set(header, 0);
      wavBytes.set(adpcmData, headerLength);
      
      return new Blob([wavBytes], {
        type: 'audio/wav'
      });
    } else {
      var bitDepth = cfg.float ? 32: cfg.bitDepth;
      var isFloat = !!cfg.float;
  
      var bytes = pcm instanceof Uint8Array ? pcm: new Uint8Array(pcm);
      var bytesPerSample = getBytesPerSample(bitDepth, isFloat);
      var blockAlign = cfg.channels * bytesPerSample;
      var byteRate = cfg.sampleRate * blockAlign;
      var dataLength = bytes.length;
  
      writeString('RIFF');
      writeUint32(36 + dataLength);
      writeString('WAVE');
  
      writeString('fmt ');
      writeUint32(16);
      writeUint16(isFloat ? 3: 1);
      writeUint16(cfg.channels);
      writeUint32(cfg.sampleRate);
      writeUint32(byteRate);
      writeUint16(blockAlign);
      writeUint16(bitDepth);
  
      writeString('data');
      writeUint32(dataLength);
  
      var wavBytes = new Uint8Array(header.length + dataLength);
      wavBytes.set(header, 0);
      wavBytes.set(bytes, header.length);
  
      return new Blob([wavBytes], {
        type: 'audio/wav'
      });
    }
  };

  /**
  * Backwards-compatible alias (similar to previous writeFileWAV).
  * Returns Promise<Blob>.
  */
  SuperPCM.writeFileWAV = function (pcm, options) {
    var blob = SuperPCM.pcmToWavBlob(pcm, options);
    return Promise.resolve(blob);
  };

  /**
   * Converts PCM data to MP3 Blob with ID3v2 metadata.
   * Auto-downsamples frequencies on low bitrates to strictly match MPEG constraints.
   */
  SuperPCM.pcmToMp3Blob = function(pcmData, format, options = {}, callback) {
    var bitrate = options.bitrate || 192;
    var metadata = options.metadata || {};

    var scripts = document.getElementsByTagName('script');
    var lamejsPath = "";
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src.indexOf('lame') !== -1) {
        lamejsPath = scripts[i].src;
        break;
      }
    }

    var targetSampleRate = format.sampleRate;
    if (bitrate <= 8) targetSampleRate = 8000;        // MPEG-2.5 Target
    else if (bitrate <= 16) targetSampleRate = 11025; // MPEG-2.5 Target
    else if (bitrate <= 24) targetSampleRate = 16000; // MPEG-2 Target
    else if (bitrate <= 56) targetSampleRate = 22050; // MPEG-2 Target
    else if (bitrate <= 64) targetSampleRate = 32000; // MPEG-1 Low Target

    var workerCode = `
    importScripts('${lamejsPath}');

    async function createID3Tag(tags) {
      if (!tags.title && !tags.artist && !tags.album && !tags.imageBlob) return new Uint8Array(0);

      function createTextFrame(id, text) {
        const encoder = new TextEncoder();
        const textData = encoder.encode('\\x03' + text);
        const frame = new Uint8Array(10 + textData.length);
        for (let i = 0; i < 4; i++) frame[i] = id.charCodeAt(i);
        const s = textData.length;
        frame[4] = (s >> 24) & 0xFF; frame[5] = (s >> 16) & 0xFF;
        frame[6] = (s >> 8) & 0xFF; frame[7] = s & 0xFF;
        frame[8] = 0; frame[9] = 0;
        frame.set(textData, 10);
        return frame;
      }

      async function createPictureFrame(blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const mimeType = blob.type || 'image/jpeg';
        const mimeEncoded = new TextEncoder().encode(mimeType);
        const payloadSize = 1 + mimeEncoded.length + 1 + 1 + 1 + data.length;
        const frame = new Uint8Array(10 + payloadSize);

        frame.set([0x41, 0x50, 0x49, 0x43]);
        frame[4] = (payloadSize >> 24) & 0xFF; frame[5] = (payloadSize >> 16) & 0xFF;
        frame[6] = (payloadSize >> 8) & 0xFF;  frame[7] = payloadSize & 0xFF;

        let offset = 10;
        frame[offset++] = 0;
        frame.set(mimeEncoded, offset);
        offset += mimeEncoded.length;
        frame[offset++] = 0;
        frame[offset++] = 3;
        frame[offset++] = 0;
        frame.set(data, offset);
        return frame;
      }

      const frames = [];
      if (tags.title)  frames.push(createTextFrame('TIT2', tags.title));
      if (tags.artist) frames.push(createTextFrame('TPE1', tags.artist));
      if (tags.album)  frames.push(createTextFrame('TALB', tags.album));
      if (tags.imageBlob) frames.push(await createPictureFrame(tags.imageBlob));

      const framesSize = frames.reduce((acc, f) => acc + f.length, 0);
      const header = new Uint8Array(10);
      header.set([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]);
      header[6] = (framesSize >> 21) & 0x7F;
      header[7] = (framesSize >> 14) & 0x7F;
      header[8] = (framesSize >> 7) & 0x7F;
      header[9] = framesSize & 0x7F;

      const res = new Uint8Array(10 + framesSize);
      res.set(header);
      let currentPos = 10;
      frames.forEach(f => { res.set(f, currentPos); currentPos += f.length; });
      return res;
    }

    self.onmessage = async function(e) {
      try {
        const { pcmBuffer, format, bitrate, metadata } = e.data;
        const mp3encoder = new lamejs.Mp3Encoder(format.channels, format.sampleRate, bitrate);
        const mp3Chunks = [];

        const id3Tag = await createID3Tag(metadata);
        if (id3Tag.length > 0) mp3Chunks.push(id3Tag);

        const samples = new Int16Array(pcmBuffer);
        const channels = format.channels;
        const totalSamplesPerChannel = samples.length / channels;

        const left = new Int16Array(totalSamplesPerChannel);
        const right = channels > 1 ? new Int16Array(totalSamplesPerChannel) : null;

        let sampleIdx = 0;
        for (let i = 0; i < samples.length; i += channels) {
          left[sampleIdx] = samples[i];
          if (channels > 1) right[sampleIdx] = samples[i + 1];
          sampleIdx++;
        }

        // DYNAMIC CHUNK ALIGNMENT: 576 samples for MPEG-2/2.5, and 1152 for MPEG-1
        const sampleBlockSize = format.sampleRate < 32000 ? 576 : 1152;
        
        for (let i = 0; i < totalSamplesPerChannel; i += sampleBlockSize) {
          const leftChunk = left.subarray(i, i + sampleBlockSize);
          const rightChunk = channels > 1 ? right.subarray(i, i + sampleBlockSize) : null;
          
          const mp3Data = mp3encoder.encodeBuffer(leftChunk, rightChunk);
          if (mp3Data.length > 0) mp3Chunks.push(new Uint8Array(mp3Data));
        }

        const lastData = mp3encoder.flush();
        if (lastData.length > 0) mp3Chunks.push(new Uint8Array(lastData));

        self.postMessage({
          type: 'done',
          blob: new Blob(mp3Chunks, { type: 'audio/mpeg' })
        });
      } catch (err) {
        self.postMessage({ type: 'error', msg: err.message });
      }
    };
    `;

    var workerBlob = new Blob([workerCode], { type: 'application/javascript' });
    var workerURL = URL.createObjectURL(workerBlob);
    var worker = new Worker(workerURL);

    worker.onmessage = function(e) {
      if (e.data.type === 'done') {
        if (callback) callback(e.data.blob);
        worker.terminate();
        URL.revokeObjectURL(workerURL);
      } else if (e.data.type === 'error') {
        console.error("SuperPCM MP3 Worker Error:", e.data.msg);
      }
    };
    worker.onerror = function() {
      worker.terminate();
      URL.revokeObjectURL(workerURL);
    };

    var pcmDataResampled;
    if (targetSampleRate !== format.sampleRate || format.bitDepth !== SuperPCM.BIT_DEPTH_16 || format.float) {
      pcmDataResampled = SuperPCM.Resample(pcmData, format, {
        sampleRate: targetSampleRate,
        channels: format.channels,
        bitDepth: SuperPCM.BIT_DEPTH_16,
        float: false
      });
    } else {
      pcmDataResampled = pcmData;
    }

    worker.postMessage({
      pcmBuffer: pcmDataResampled.buffer,
      format: {
        channels: format.channels,
        sampleRate: targetSampleRate,
        bitDepth: SuperPCM.BIT_DEPTH_16,
        float: false
      },
      bitrate: bitrate,
      metadata: metadata
    }, [pcmDataResampled.buffer]);
  };

  /**
  * Backwards-compatible alias (similar to previous writeFileMP3).
  * Returns Promise<Blob>.
  */
  SuperPCM.writeFileMP3 = function (pcm, format, options = {}) {
    return new Promise(function(resolve) {
      SuperPCM.pcmToMp3Blob(pcm, format, options, function(blob) {
        resolve(blob);
      });
    });
  };

  /**
  * Converts PCM data to FLAC Blob with Metadata (Title, Artist, Album, and Cover Art).
  * @param {Uint8Array} pcmData - Raw PCM bytes.
  * @param {Object} format - { sampleRate, channels, bitDepth }
  * @param {Object} options - { compression, metadata: { title, artist, album, imageBlob } }
  * @param {Function} callback - Success callback receiving the Blob.
  */
  SuperPCM.pcmToFlacBlob = function(pcmData, format, options = {}, callback) {
    var compression = options.compression || 5;
    var metadata = options.metadata || {};

    // Automatically detect libflac.js path from script tags
    var scripts = document.getElementsByTagName('script');
    var flacPath = "";
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src.indexOf('libflac') !== -1) {
        flacPath = scripts[i].src;
        break;
      }
    }

    var workerCode = `
    self.window = self; // Mock window for Emscripten environment
    try {
    importScripts('${flacPath}');
    } catch(e) {
    self.postMessage({ type: 'error', msg: 'Failed to load libflac.js' });
    }

    self.onmessage = async function(e) {
    try {
    const { pcmBuffer, format, compression, metadata } = e.data;
    const flac = self.Flac;

    if (!flac || !flac.isReady()) {
    throw new Error("FLAC Engine is not ready.");
    }

    const bitDepth = format.bitDepth || 16;
    const channels = format.channels || 2;
    const bytesPerSample = bitDepth / 8;
    const totalSamples = pcmBuffer.byteLength / (channels * bytesPerSample);

    // 1. Create Encoder Instance
    const encoder = flac.create_libflac_encoder(
    format.sampleRate,
    channels,
    bitDepth,
    compression,
    totalSamples
    );

    if (encoder === 0) throw new Error("Failed to create FLAC encoder instance.");

    let metadataBlocks = [];

    // 2. Add Vorbis Comments (Text Metadata)
    if (metadata.title || metadata.artist || metadata.album) {
    const commentPtr = flac.FLAC__metadata_object_new(2); // 2 = VORBIS_COMMENT
    if (metadata.title) flac.FLAC__metadata_object_vorbiscomment_append_comment(commentPtr, "TITLE=" + metadata.title, true);
    if (metadata.artist) flac.FLAC__metadata_object_vorbiscomment_append_comment(commentPtr, "ARTIST=" + metadata.artist, true);
    if (metadata.album) flac.FLAC__metadata_object_vorbiscomment_append_comment(commentPtr, "ALBUM=" + metadata.album, true);
    metadataBlocks.push(commentPtr);
    }

    // 3. Add Picture Block (Album Art)
    if (metadata.imageBlob) {
    const picPtr = flac.FLAC__metadata_object_new(6); // 6 = PICTURE
    const imgBuffer = await metadata.imageBlob.arrayBuffer();
    const imgData = new Uint8Array(imgBuffer);

    flac.FLAC__metadata_object_picture_set_mime_type(picPtr, metadata.imageBlob.type || "image/jpeg", true);
    flac.FLAC__metadata_object_picture_set_description(picPtr, "Front Cover", true);
    flac.FLAC__metadata_object_picture_set_data(picPtr, imgData);
    flac.FLAC__metadata_object_picture_set_type(picPtr, 3); // 3 = Front Cover

    metadataBlocks.push(picPtr);
    }

    // 4. Register Metadata Blocks (Must be called BEFORE init)
    if (metadataBlocks.length > 0) {
    flac.FLAC__stream_encoder_set_metadata(encoder, metadataBlocks, metadataBlocks.length);
    }

    // 5. Initialize Stream
    const chunks = [];
    const status = flac.init_encoder_stream(encoder, function(buffer) {
    chunks.push(new Uint8Array(buffer));
    });

    if (status !== 0) throw new Error("Encoder init failed with status: " + status);

    // 6. Process PCM Data (Interleaved Int32)
    const dv = new DataView(pcmBuffer);
    const interleaved = new Int32Array(totalSamples * channels);

    for (let i = 0; i < totalSamples; i++) {
    for (let c = 0; c < channels; c++) {
    let p = (i * channels * bytesPerSample) + (c * bytesPerSample);
    let s = 0;
    if (bitDepth === 16) s = dv.getInt16(p, true);
    else if (bitDepth === 8) s = (dv.getUint8(p) - 128) << 8;
    else if (bitDepth === 24) {
    s = (dv.getUint8(p) | (dv.getUint8(p+1) << 8) | (dv.getUint8(p+2) << 16));
    if (s & 0x800000) s |= 0xFF000000;
    }
    interleaved[i * channels + c] = s;
    }
    }

    flac.FLAC__stream_encoder_process_interleaved(encoder, interleaved, totalSamples);

    // 7. Finalize and Cleanup
    flac.FLAC__stream_encoder_finish(encoder);
    flac.FLAC__stream_encoder_delete(encoder);

    self.postMessage({
    type: 'done',
    blob: new Blob(chunks, { type: 'audio/flac' })
    });
    } catch (err) {
    self.postMessage({ type: 'error', msg: err.message });
    }
    };
    `;

    var workerBlob = new Blob([workerCode], {
      type: 'application/javascript'
    });
    var workerURL = URL.createObjectURL(workerBlob);
    var worker = new Worker(workerURL);

    worker.onmessage = function(e) {
      if (e.data.type === 'done') {
        if (callback) callback(e.data.blob);
        worker.terminate();
        URL.revokeObjectURL(workerURL);
      } else if (e.data.type === 'error') {
        console.error("SuperPCM FLAC Worker Error:", e.data.msg);
      }
    };
    worker.onerror = function() {
      worker.terminate();
      URL.revokeObjectURL(workerURL);
    };

    worker.postMessage({
      pcmBuffer: pcmData.buffer,
      format: format,
      compression: compression,
      metadata: metadata
    }, [pcmData.buffer]);
  };

  /**
  * Promisified FLAC writer for SuperPCM.
  */
  SuperPCM.writeFileFLAC = function(pcmData, format, options = {}) {
    return new Promise(function(resolve, reject) {
      SuperPCM.pcmToFlacBlob(pcmData, format, options, function(blob) {
        if (blob) resolve(blob);
        else reject("Failed to create FLAC");
      });
    });
  };

  /**
  * De-interleaves a PCM chunk into separate Float32 arrays.
  * This is used to bypass AudioBuffer and prevent memory leaks.
  */
  function decodeInterleavedToArrays(pcmChunk, format) {
    var bitDepth = format.bitDepth;
    var isFloat = !!format.float;
    var channels = format.channels;
    var dv = new DataView(pcmChunk.buffer, pcmChunk.byteOffset, pcmChunk.byteLength);

    var bytesPerSample = bitDepth / 8;
    var samplesPerChannel = Math.floor(pcmChunk.length / (channels * bytesPerSample));

    var left = new Float32Array(samplesPerChannel);
    var right = channels > 1 ? new Float32Array(samplesPerChannel): null;

    var offset = 0;
    for (var i = 0; i < samplesPerChannel; i++) {
      var resL = decodeSample(pcmChunk, dv, offset, bitDepth, isFloat);
      left[i] = resL.value;
      offset = resL.offset;

      if (channels > 1) {
        var resR = decodeSample(pcmChunk, dv, offset, bitDepth, isFloat);
        right[i] = resR.value;
        offset = resR.offset;
      }
    }

    return {
      left: left,
      right: right
    };
  }

  /**
  * Converts raw PCM data directly to EAC Blob.
  * Sequential processing prevents worker congestion and silent crashes.
  */
  SuperPCM.pcmToEacBlob = function(pcmData, format, metadata = {}) {
    var encoder = new EACEncoder();
    var bitDepth = format.bitDepth || 16;
    var channels = format.channels || 1;
    var frameSize = 4096;
    var bytesPerSample = bitDepth / 8;
    var frameByteSize = frameSize * channels * bytesPerSample;

    var totalSamples = Math.floor(pcmData.length / (channels * bytesPerSample));
    var mode = (channels > 1) ? 2: 0;
    var k = bitDepth <= 16 ? 4: 10;

    // Uses the 23-byte header structure with explicit Little-Endian
    var header = encoder._createHeader(format.sampleRate, totalSamples, mode, frameSize, bitDepth, metadata);
    var chunks = [header];

    return new Promise(function(resolve, reject) {
      var offset = 0;

      function processNextFrame() {
        if (offset >= pcmData.length) {
          // Collect all chunks into the final EAC Blob
          resolve(new Blob(chunks, {
            type: 'audio/x-eac'
          }));
          return;
        }

        var end = Math.min(offset + frameByteSize, pcmData.length);
        var chunk = pcmData.subarray(offset, end);

        // Separate L/R channels manually to stay memory-safe
        var decoded = decodeInterleavedToArrays(chunk, format);

        // Must wait for the worker to finish the current block
        encoder._send(decoded.left, decoded.right, mode, bitDepth, frameSize, k)
        .then(function(encodedFrame) {
          if (encodedFrame) {
            chunks.push(encodedFrame);
          }
          offset += frameByteSize;
          processNextFrame(); // Sequential recursion prevents silent death
        })
        .catch(function(err) {
          console.error("SuperPCM EAC Error at offset " + offset + ":", err);
          reject(err);
        });
      }

      processNextFrame();
    });
  };

  /**
  * Promisified EAC writer for SuperPCM.
  */
  SuperPCM.writeFileEAC = function(pcmData, format, metadata = {}) {
    return SuperPCM.pcmToEacBlob(pcmData, format, metadata);
  };

  /**
  * Decodes an EAC source (Blob or ArrayBuffer) into raw interleaved PCM.
  */
  SuperPCM.eacToPCM = function (eacSource) {
    var decoder = new EACDecoder();

    function parseEac(arrayBuffer) {
      return new Promise(function (resolve,
        reject) {
        var dv = new DataView(arrayBuffer);

        // Validate magic bytes "EAC" at index 0, 1, 2
        if (dv.byteLength < 23 || dv.getUint8(0) !== 0x45 || dv.getUint8(1) !== 0x41 || dv.getUint8(2) !== 0x43) {
          reject("Invalid EAC: Missing magic bytes or file too small");
          return;
        }

        var blob = new Blob([arrayBuffer], {
          type: 'audio/x-eac'
        });

        decoder.toPCM(blob).then(function (result) {
          var channels = result.right ? 2: 1;
          var bitDepth = result.bitDepth || 24;
          var bytesPerSample = bitDepth / 8;
          var totalSamples = result.totalSamples;

          var pcm = new Uint8Array(totalSamples * channels * bytesPerSample);
          var pcmDv = new DataView(pcm.buffer);
          var pcmOffset = 0;

          // Restore to interleaved PCM using SuperPCM's native encoding
          for (var i = 0; i < totalSamples; i++) {
            pcmOffset = encodeSample(result.left[i], bitDepth, false, pcm, pcmDv, pcmOffset);
            if (channels === 2) {
              pcmOffset = encodeSample(result.right[i], bitDepth, false, pcm, pcmDv, pcmOffset);
            }
          }

          resolve( {
            pcm: pcm,
            format: {
              sampleRate: result.sampleRate,
              channels: channels,
              bitDepth: bitDepth,
              float: false
            },
            metadata: result.metadata
          });
        }).catch(function (err) {
          reject("EAC Decoding Error: " + err);
        });
      });
    }

    if (eacSource instanceof ArrayBuffer) {
      return parseEac(eacSource);
    } else if (eacSource instanceof Blob) {
      return eacSource.arrayBuffer().then(parseEac);
    } else {
      return Promise.reject(new Error('EAC source must be a Blob or ArrayBuffer.'));
    }
  };

  /**
   * Decodes a WAV ArrayBuffer into raw PCM. (Supports Linear PCM and IMA ADPCM)
   */
  SuperPCM.wavToPCM = function (wavSource) {
    function parseWav(arrayBuffer) {
      var dv = new DataView(arrayBuffer);
      var len = dv.byteLength;

      if (
        dv.getUint8(0) !== 0x52 || dv.getUint8(1) !== 0x49 ||
        dv.getUint8(2) !== 0x46 || dv.getUint8(3) !== 0x46
      ) {
        throw new Error("Invalid WAV: Missing 'RIFF'");
      }

      if (
        dv.getUint8(8) !== 0x57 || dv.getUint8(9) !== 0x41 ||
        dv.getUint8(10) !== 0x56 || dv.getUint8(11) !== 0x45
      ) {
        throw new Error("Invalid WAV: Missing 'WAVE'");
      }

      var audioFormat = null;
      var channels = null;
      var sampleRate = null;
      var byteRate = null;
      var bitsPerSample = null;
      var dataOffset = null;
      var dataSize = null;

      var blockAlign = 0;
      var samplesPerBlock = 0;
      var totalSamplesFromFact = 0;
      
      var formatInfo = "Unspecified format",
      formatTag = null;
      var bitrate = null,
      averageBitrate = null;
      
      var pos = 12;

      while (pos + 8 <= len) {
        var id =
        String.fromCharCode(dv.getUint8(pos)) +
        String.fromCharCode(dv.getUint8(pos + 1)) +
        String.fromCharCode(dv.getUint8(pos + 2)) +
        String.fromCharCode(dv.getUint8(pos + 3));

        var size = dv.getUint32(pos + 4, true);
        var chunkDataPos = pos + 8;

        if (id === "fmt ") {
          audioFormat = dv.getUint16(chunkDataPos + 0, true);
          channels = dv.getUint16(chunkDataPos + 2, true);
          sampleRate = dv.getUint32(chunkDataPos + 4, true);
          byteRate = dv.getUint32(chunkDataPos + 8, true);
          blockAlign = dv.getUint16(chunkDataPos + 12, true);
          bitsPerSample = dv.getUint16(chunkDataPos + 14, true);
          samplesPerBlock = size >= 20 ? dv.getUint16(chunkDataPos + 18, true) : 0;

          if (audioFormat === 0xFFFE && size >= 40) {
            var validBits = dv.getUint16(chunkDataPos + 18, true);
            var subFormat = dv.getUint32(chunkDataPos + 24, true);

            if (validBits > 0) bitsPerSample = validBits;

            if (subFormat === 1) audioFormat = 1;
            if (subFormat === 3) audioFormat = 3;
          }
        } else if (id === "fact") {
          totalSamplesFromFact = dv.getUint32(chunkDataPos + 0, true);
        } else if (id === "data") {
          dataOffset = chunkDataPos;
          dataSize = size;
          break;
        }

        pos += 8 + size;
      }

      if (!dataOffset || !dataSize) throw new Error("WAV missing data chunk.");
      if (!channels || !sampleRate || !bitsPerSample) throw new Error("WAV missing fmt info.");
      
      formatTag = audioFormat;
      
      bitrate = (byteRate * 8) / 1000;
      averageBitrate = (sampleRate * channels * bitsPerSample) / 1000;

      if (audioFormat === 1 || audioFormat === 3) {
        formatInfo = formatTag === 3 ? "PCM 32-bit IEEE floating-point (Float)" : `PCM ${bitsPerSample}-bit ${bitsPerSample !== 8 ? "Signed" : "Unsigned"} Integer`;
      } else if (audioFormat === 0x0011 || audioFormat === 0x0069) {
        formatInfo = "4-bit IMA/DVI ADPCM";
        bitsPerSample = 4;
        averageBitrate = (sampleRate * channels * 4) / 1000;
      } else if (audioFormat === 0x0014) {
        formatInfo = "4-bit Joint-Stereo ADPCM";
        bitsPerSample = 4;
        averageBitrate = (sampleRate * channels * 4) / 1000;
      } else if (audioFormat === 0x0012) {
        formatInfo = "3-bit ADPCM";
        bitsPerSample = 3;
        averageBitrate = (sampleRate * channels * 3) / 1000;
      } else if (audioFormat === 0x0013) {
        formatInfo = "3-bit Joint-Stereo ADPCM";
        bitsPerSample = 3;
        averageBitrate = (sampleRate * channels * 3) / 1000;
      }
      
      var pcm = new Uint8Array(arrayBuffer.slice(dataOffset, dataOffset + dataSize));

      if (audioFormat === 0x0011 || audioFormat === 0x0012 || audioFormat === 0x0013 || audioFormat === 0x0014 || audioFormat === 0x0069) {
        var samplesFromData = Math.floor((dataSize / blockAlign) * samplesPerBlock);
        var calculatedSamples = totalSamplesFromFact,
        prevCalculatedSamples = totalSamplesFromFact;
        
        if (!calculatedSamples || calculatedSamples <= sampleRate || calculatedSamples < samplesFromData * 0.5) {
          calculatedSamples = samplesFromData;
        }
        
        if (audioFormat === 0x0069) {
          if (blockAlign === 72 && channels > 1) {
            calculatedSamples = calculatedSamples ? Math.floor(calculatedSamples / 4) : Math.floor((dataSize / blockAlign) * samplesPerBlock / 2);
          } else if (channels > 1) {
            calculatedSamples = calculatedSamples ? Math.floor(calculatedSamples / channels) : Math.floor((dataSize / blockAlign) * samplesPerBlock);
          }
        }
        
        if (audioFormat === 0x0012) {
          pcm = decode3BitADPCM(pcm, calculatedSamples * channels, channels, blockAlign, samplesPerBlock);
        } else if (formatTag === 0x0013) {
          pcm = decodeJointStereoADPCM3Bit(pcm, calculatedSamples, blockAlign, samplesPerBlock);
        } else if (formatTag === 0x0014) {
          pcm = decodeJointStereoADPCM4Bit(pcm, calculatedSamples, blockAlign, samplesPerBlock);
        } else {
          if (channels >= 2) {
            pcm = decodeStereoADPCM(pcm, calculatedSamples, blockAlign, samplesPerBlock);
          } else {
            pcm = decodeMonoADPCM(pcm, calculatedSamples, blockAlign, samplesPerBlock);
          }
        }

        if (audioFormat === 0x0069 || calculatedSamples > prevCalculatedSamples) {
          pcm = SuperPCM.Gapless(pcm, {
            bitDepth: SuperPCM.BIT_DEPTH_16,
            channels: channels,
            float: false
          }, { threshold: 0 }).pcm;
        }

        bitsPerSample = SuperPCM.BIT_DEPTH_16;
        audioFormat = 1;
      }

      var sourceTotalFrames = 0;
      if (formatTag === 1 || formatTag === 3) {
        sourceTotalFrames = Math.floor(pcm.length / blockAlign); // Linear PCM formula
      } else {
        sourceTotalFrames = calculatedSamples; // ADPCM formula derived from block metrics
      }

      return {
        pcm: pcm,
        format: {
          format: formatInfo,
          formatTag: formatTag,
          float: audioFormat == 3,
          channels: channels,
          sampleRate: sampleRate,
          bitDepth: bitsPerSample,
          duration: Math.floor(pcm.length / (getBytesPerSample(bitsPerSample, audioFormat === 3) * channels)) / sampleRate,
          totalFrames: sourceTotalFrames,
          bitrate: bitrate,
          averageBitrate: averageBitrate
        }
      };
    }

    if (wavSource instanceof ArrayBuffer) {
      return Promise.resolve(parseWav(wavSource));
    } else if (wavSource instanceof Blob) {
      return wavSource.arrayBuffer().then(parseWav);
    } else {
      return Promise.reject(new Error('wavSource must be a Blob or ArrayBuffer.'));
    }
  };

  /* ------------------------------------------------------------------
   * WAV Blob/ArrayBuffer -> AudioBuffer
   * ------------------------------------------------------------------ */

  SuperPCM.wavToAudioBuffer = function (wavSource) {
    return SuperPCM.wavToPCM(wavSource).then(function (info) {
      var fmt = info.format;
      return SuperPCM.pcmToAudioBuffer(info.pcm, {
        sampleRate: fmt.sampleRate,
        channels: fmt.channels,
        bitDepth: fmt.float ? 32: fmt.bitDepth,
        float: !!fmt.float
      });
    });
  };

  /* ------------------------------------------------------------------
   * Raw PCM Blob helper (MIME wrapping)
   * ------------------------------------------------------------------ */

  SuperPCM.pcmToBlob = function (pcm, options) {
    var cfg = assignDefaults( {
      sampleRate: SuperPCM.defaults.sampleRate,
      channels: SuperPCM.defaults.channels,
      bitDepth: SuperPCM.defaults.bitDepth,
      float: SuperPCM.defaults.float
    }, options || {});

    var mime = 'application/octet-stream';
    if (!cfg.float) {
      if (cfg.bitDepth === SuperPCM.BIT_DEPTH_8) {
        mime = 'audio/L8';
      } else if (cfg.bitDepth === SuperPCM.BIT_DEPTH_16) {
        mime = 'audio/L16; channels=' + cfg.channels + '; rate=' + cfg.sampleRate;
      } else if (cfg.bitDepth === SuperPCM.BIT_DEPTH_24) {
        mime = 'audio/L24';
      } else if (cfg.bitDepth === SuperPCM.BIT_DEPTH_32) {
        mime = 'application/octet-stream';
      }
    }

    var bytes = pcm instanceof Uint8Array ? pcm: new Uint8Array(pcm);
    return new Blob([bytes], {
      type: mime
    });
  };

  SuperPCM.writeFilePCM = function (pcm, options) {
    var blob = SuperPCM.pcmToBlob(pcm, options);
    return Promise.resolve(blob);
  };

  /* ------------------------------------------------------------------
   * Save helpers (download)
   * ------------------------------------------------------------------ */

  function saveBlob(blob, fileName) {
    var name = fileName || 'audio';
    var a = document.createElement('a');
    a.style.display = 'none';
    a.download = name;
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  SuperPCM.saveFilePCM = function (blob, fileNameWithoutExt) {
    var name = (fileNameWithoutExt || 'audio') + '.pcm';
    saveBlob(blob, name);
  };

  SuperPCM.saveFileWAV = function (blob, fileNameWithoutExt) {
    var name = (fileNameWithoutExt || 'audio') + '.wav';
    saveBlob(blob, name);
  };

  SuperPCM.saveFileMP3 = function (blob, fileNameWithoutExt) {
    var name = (fileNameWithoutExt || 'audio') + '.mp3';
    saveBlob(blob, name);
  };

  SuperPCM.saveFileFLAC = function (blob, fileNameWithoutExt) {
    var name = (fileNameWithoutExt || 'audio') + '.flac';
    saveBlob(blob, name);
  };

  SuperPCM.saveFileEAC = function (blob, fileNameWithoutExt) {
    var name = (fileNameWithoutExt || 'audio') + '.eac';
    saveBlob(blob, name);
  };

  /*
   * Audio Source from file (eg. MP3, WAV, OGG, FLAC, etc.) to PCM Data with information
   */
  SuperPCM.AudioSource = function () {
    audioSource.apply(this, arguments);
  }

  /* ------------------------------------------------------------------
   * Real-time PCM streaming (float32)
   * ------------------------------------------------------------------ */

  /**
  * Real-time PCM Streaming.
  * - Supports 8-bit Int, 16-bit Int, 24-bit Int, 32-bit Int, and 32-bit Float
  * - Plays them in real-time using ScriptProcessorNode
  *
  * WARNING: ScriptProcessorNode is deprecated but widely supported.
  */
  SuperPCM.streamingPCM = function (pcm = new Uint8Array(), options) {
    var _this = this,
    _self = {},
    cfg = assignDefaults( {
      bitDepth: SuperPCM.defaults.bitDepth,
      sampleRate: SuperPCM.defaults.sampleRate,
      floatMode: SuperPCM.defaults.float,
      channels: SuperPCM.defaults.channels,
      bufferSize: 1024,
      gapless: true,
      gaplessThreshold: 0.001,
      fadePlayPauseMs: SuperPCM.fadePlayPauseMs,
      stereoEnhancer: false,
      interpolationMode: null
    }, options || {});
    _eventListener(this);
    
    _self.audioContext = null;
    _self.scriptProcessor = null;

    var isPlaying = false,
    isStop = false,
    pcmOffset = 0,
    length = 0,
    timeUpdate = 0,
    normalizedGain = 1,
    normalizeSpeed = 1,
    volume = 1,
    playbackRate = 1,
    duration = 0,
    autoplay = false,
    muted = false,
    interpolationMode = cfg.interpolationMode,
    originalSampleRate = cfg.sampleRate,
    contextSampleRate = cfg.sampleRate,
    fadeSamples = 0,
    fadeCounter = 0,
    fadeDirection = 0,
    fadeGain = 0,
    fadeStop = false,
    dv = new DataView(pcm.buffer);

    this.playbackRate = 1;
    this.loop = false;
    this.audioProcessorHeader = null;
    this.audioProcessor = null;
    this.normalizedGain = true;

    this.gapless = cfg.gapless;
    this.gaplessThreshold = cfg.gaplessThreshold;
    this.fadePlayPauseMs = cfg.fadePlayPauseMs;

    cfg.sampleRate = clamp(cfg.sampleRate, 4000, SuperPCM.maximumSampleRate);
    cfg.bufferSize = bufferSize(cfg.bufferSize);
    Object.defineProperties(this, {
      _bitDepth: {
        get: function () {
          return cfg.bitDepth;
        },
        set: function (value) {
          cfg.bitDepth = cfg.floatMode ? SuperPCM.BIT_DEPTH_32: value;
          _self.generateLength();
          if (isPlaying) _self.restartScriptProcessor();
        },
        enumerable: true,
        configurable: true
      },
      _floatMode: {
        get: function () {
          return cfg.floatMode;
        },
        set: function (value) {
          cfg.floatMode = value;
          if (cfg.floatMode) cfg.bitDepth = SuperPCM.BIT_DEPTH_32;
          _self.generateLength();
          if (isPlaying) _self.restartScriptProcessor();
        },
        enumerable: true,
        configurable: true
      },
      _channels: {
        get: function () {
          return cfg.channels;
        },
        set: function (value) {
          cfg.channels = Math.round(clamp(value, 1, Infinity));
          _self.generateLength();
          if (isPlaying) _self.restartScriptProcessor();
        },
        enumerable: true,
        configurable: true
      },
      stereoEnhancer: {
        get: function () {
          return cfg.stereoEnhancer;
        },
        set: function (value) {
          cfg.stereoEnhancer = value;
          _self.generatePCM();
        },
        enumerable: true,
        configurable: true
      },
      volume: {
        get: function () {
          return volume;
        },
        set: function (value) {
          volume = clamp(value, 0, Infinity);

          _this.executeEventListener("volumechange", [_this]);
        },
        enumerable: true,
        configurable: true
      },
      muted: {
        get: function () {
          return muted;
        },
        set: function (value) {
          if (muted != value) {
            muted = value;
            _this.executeEventListener("volumechange", [_this]);
          }
        },
        enumerable: true,
        configurable: true
      },
      currentTime: {
        get: function () {
          return clamp(pcmOffset / _this.originalSampleRate, 0, length / _this.originalSampleRate);
        },
        set: function (value) {
          _self.setCurrentTime(value);
          _this.executeEventListener("timeupdate", [_this]);
        },
        enumerable: true,
        configurable: true
      },
      currentSample: {
        get: function () {
          return clamp(pcmOffset, 0, length - 1);
        },
        set: function (value) {
          pcmOffset = clamp(value, 0, length - 1);
        },
        enumerable: true,
        configurable: true
      },
      totalSamples: {
        get: function () {
          return length;
        },
        enumerable: true,
        configurable: true
      },
      playbackRate: {
        get: function () {
          return playbackRate;
        },
        set: function (value) {
          if (playbackRate != value) {
            playbackRate = value;

            _this.executeEventListener("ratechange", [_this]);
          }
        },
        enumerable: true,
        configurable: true
      },
      duration: {
        get: function () {
          return duration;
        },
        enumerable: true,
        configurable: true
      },
      autoplay: {
        get: function () {
          return autoplay;
        },
        set: function (value) {
          autoplay = value;
          if (autoplay && pcm.length != 0) {
            isPlaying = true;
            _self.startScriptProcessor();
          }
        }
      },
      paused: {
        get: function () {
          return !isPlaying;
        },
        enumerable: true,
        configurable: true
      },
      pcmData: {
        get: function () {
          return pcm;
        },
        set: function (value) {
          _self.generatePCM(value);
        },
        enumerable: true,
        configurable: true
      },
      sampleRate: {
        get: function () {
          return cfg.sampleRate;
        },
        set: function (value) {
          cfg.sampleRate = clamp(value, SuperPCM.minimumSampleRate, SuperPCM.maximumSampleRate);
          if (isPlaying) _self.restartScriptProcessor();
        },
        enumerable: true,
        configurable: true
      },
      originalSampleRate: {
        get: function () {
          return originalSampleRate;
        },
        set: function (value) {
          originalSampleRate = value;
          _self.generateLength();
        },
        enumerable: true,
        configurable: true
      },
      bufferSize: {
        get: function () {
          return cfg.bufferSize;
        },
        set: function (value) {
          cfg.bufferSize = bufferSize(value);
          if (isPlaying) _self.restartScriptProcessor();
        },
        enumerable: true,
        configurable: true
      },
      format: {
        get: function () {
          return {
            sampleRate: originalSampleRate,
            channels: cfg.channels,
            bitDepth: cfg.bitDepth,
            float: cfg.floatMode
          }
        },
        enumerable: true,
        configurable: true
      },
      interpolationMode: {
        get: function () {
          return interpolationMode ?? SuperPCM.interpolationMode;
        },
        set: function (value) {
          interpolationMode = value;
        },
        enumerable: true,
        configurable: true
      }
    });

    this.play = function () {
      if (!_self.scriptProcessor || !_self.audioContext || (!(fadeDirection >= 0) && _this.fadePlayPauseMs > 0)) {
        isPlaying = true;
        isStop = false;

        _self.startScriptProcessor();
      }
    }
    this.pause = function () {
      if (_self.scriptProcessor && _self.audioContext) {
        isPlaying = false;
        isStop = false;

        _self.stopScriptProcessor();
      }
    }
    this.stop = function (force = false) {
      if (_self.scriptProcessor && _self.audioContext) {
        isPlaying = false;
        isStop = true;

        _self.stopScriptProcessor(force);
        if (force) _self.resetOffset();
      } else _self.resetOffset();
    }

    this.outputBuffer = [];
    _self.startScriptProcessor = function () {
      if (!SuperPCM.runOnBackground && document.visibilityState == "hidden") return;

      if (!_self.scriptProcessor) {
        _self.audioContext = SuperPCM.audioCtx(cfg.sampleRate);
        _self.scriptProcessor = _self.audioContext.createScriptProcessor(cfg.bufferSize, 0, cfg.channels);
        _this.outputBuffer = [];
        contextSampleRate = _self.audioContext.sampleRate;

        _self.scriptProcessor.onaudioprocess = function (event) {
          normalizeSpeed = originalSampleRate / contextSampleRate;

          for (var c = 0; c < event.outputBuffer.numberOfChannels; c++) {
            _this.outputBuffer[c] = event.outputBuffer.getChannelData(c);
          }
          try {
            if (_this.audioProcessorHeader && typeof _this.audioProcessorHeader == "function") {
              _this.audioProcessorHeader({
                length: length,
                speed: playbackRate,
                offset: pcmOffset,
                main: _this
              });
            }
          } catch (err) {}
          try {
            for (var i = 0; i < event.outputBuffer.length; i++) {
              if (fadeDirection !== 0 && _this.fadePlayPauseMs > 0) {
                fadeCounter++;

                var t = clamp(fadeCounter / fadeSamples, 0, 1);
                if (fadeDirection === 1) {
                  fadeGain = fadeCounter >= fadeSamples ? 1: Math.sin(t * Math.PI * 0.5);
                } else {
                  fadeGain = fadeCounter >= fadeSamples ? 0: Math.cos(t * Math.PI * 0.5);
                }

                if (fadeCounter >= fadeSamples + (_this.fadePlayPauseMs > 0 ? event.outputBuffer.length * 3: 0)) {
                  if (fadeDirection === -1) {
                    fadeStop = true;
                  }
                  fadeDirection = 0;
                }
              } else if (_this.fadePlayPauseMs <= 0) fadeGain = 1;

              _self.offset = i * playbackRate * normalizeSpeed + pcmOffset;
              if (_this.loop && length > 0) _self.offset = repeat(length, _self.offset);
              for (var c = 0; c < event.outputBuffer.numberOfChannels; c++) {
                _self.amplitudo = !muted ? _self.getAmplitudo(_self.offset, c): 0;
                _self.amplitudo *= volume;
                _this.outputBuffer[c][i] = _self.amplitudo;

                if (_this.audioProcessor && typeof _this.audioProcessor == "function") {
                  _this.audioProcessor({
                    output: _this.outputBuffer,
                    offset: pcmOffset,
                    currOffset: _self.offset,
                    length: length,
                    amplitudo: _self.amplitudo,
                    getAmplitudo: function (_offset, channel, ratio) {
                      return _self.getAmplitudo(_offset, channel, ratio);
                    },
                    index: i,
                    channel: c,
                    bufferSize: event.outputBuffer.length,
                    speed: playbackRate,
                    volume: volume,
                    muted: muted,
                    main: _this
                  })
                }

                if (_this.normalizedGain) {
                  normalizedGain += (2 * clamp(Math.abs(_this.outputBuffer[c][i] * cfg.channels), 0.1, Infinity) - normalizedGain) * clamp(0.0025 * (event.outputBuffer.length / cfg.sampleRate) / cfg.channels, 0, 1);
                  _this.outputBuffer[c][i] *= (1 / normalizedGain) * volume;
                } else normalizedGain = volume;

                _this.outputBuffer[c][i] *= fadeGain;
              }
            }
          } catch (err) {
            for (var i = 0; i < event.outputBuffer.length; i++) {
              if (fadeDirection !== 0 && _this.fadePlayPauseMs > 0) {
                fadeCounter++;

                var t = clamp(fadeCounter / fadeSamples, 0, 1);
                if (fadeDirection === 1) {
                  fadeGain = fadeCounter >= fadeSamples ? 1: Math.sin(t * Math.PI * 0.5);
                } else {
                  fadeGain = fadeCounter >= fadeSamples ? 0: Math.cos(t * Math.PI * 0.5);
                }

                if (fadeCounter >= fadeSamples + (_this.fadePlayPauseMs > 0 ? event.outputBuffer.length * 3: 0)) {
                  if (fadeDirection === -1) {
                    fadeStop = true;
                  }
                  fadeDirection = 0;
                }
              } else if (_this.fadePlayPauseMs <= 0) fadeGain = 1;

              _self.offset = i * playbackRate * normalizeSpeed + pcmOffset;
              if (_this.loop && length > 0) _self.offset = repeat(length, _self.offset);
              for (var c = 0; c < event.outputBuffer.numberOfChannels; c++) {
                _self.amplitudo = _self.offset >= 0 && _self.offset < length && !_this.muted ? _self.getAmplitudo(_self.offset, c): 0;
                _self.amplitudo *= volume;
                _this.outputBuffer[c][i] = _self.amplitudo;

                if (_this.normalizedGain) {
                  normalizedGain += (2 * clamp(Math.abs(_this.outputBuffer[c][i] * cfg.channels), 0.1, Infinity) - normalizedGain) * clamp(0.0025 * (event.outputBuffer.length / cfg.sampleRate) / cfg.channels, 0, 1);
                  _this.outputBuffer[c][i] *= (1 / normalizedGain) * volume;
                } else normalizedGain = volume;

                _this.outputBuffer[c][i] *= fadeGain;
              }
            }
          }

          pcmOffset += event.outputBuffer.length * playbackRate * normalizeSpeed;
          if (_this.loop && length > 0) pcmOffset = repeat(length, pcmOffset);
          else if (pcmOffset < 0 || pcmOffset > length - 1) {
            _self.stopScriptProcessor(true);
            _self.resetOffset();
            isPlaying = false;

            _this.executeEventListener("ended", [_this]);
          }

          if (fadeStop) {
            fadeStop = false;
            _self.stopScriptProcessor(true);

            _this.executeEventListener("pause", [_this]);
            if (isStop) {
              _this.executeEventListener("stop", [_this]);
              _self.setCurrentTime(playbackRate >= 0 ? 0: Infinity);
            }
          }

          _self.timeUpdate();
        }
        _self.scriptProcessor.connect(_self.audioContext.destination);

        _this.executeEventListener("play", [_this]);
        _this.executeEventListener("playing", [_this]);
      }
      
      _self.startFadeIn();
    };
    _self.restartScriptProcessor = function () {
      if (!_self.scriptProcessor) return;

      _self.stopScriptProcessor(true);
      _self.startScriptProcessor();
    };
    _self.stopScriptProcessor = function (force = false) {
      if (_self.scriptProcessor && (force || _this.fadePlayPauseMs <= 0)) {
        _self.timeUpdate(true);
        _self.scriptProcessor.onaudioprocess = null;
        _self.scriptProcessor.disconnect();
        _self.scriptProcessor = null;
        _self.audioContext.close();
        _self.audioContext = null;
        _this.outputBuffer = null;
      } else if (_self.scriptProcessor) {
        _self.startFadeOut();
      }
    };

    _self.startFadeIn = function () {
      if (fadeDirection != 1) {
        fadeSamples = _this.fadePlayPauseMs / 1000 * contextSampleRate;

        fadeDirection = 1;
        fadeCounter = 0;
        fadeGain = 0;
      }
    };
    _self.startFadeOut = function () {
      if (fadeDirection != -1) {
        fadeSamples = _this.fadePlayPauseMs / 1000 * contextSampleRate;

        fadeDirection = -1;
        fadeCounter = 0;
        fadeGain = 1;
      }
    };

    _self.getAmplitudo = function (offset, channel, ratio) {
      return SuperPCM.getAmplitudo(pcm, offset, cfg.channels, channel, cfg.bitDepth, cfg.floatMode, _this.interpolationMode, dv, ratio);
    };
    _self.generatePCM = function (pcmData) {
      if (pcmData) pcm = new Uint8Array(pcmData);
      if (_this.gapless) {
        pcm = SuperPCM.Gapless(pcm, {
          channels: cfg.channels,
          bitDepth: cfg.bitDepth,
          float: cfg.floatMode
        }, {
          threshold: _this.gaplessThreshold
        }).pcm;
      }
      if (cfg.stereoEnhancer) {
        pcm = SuperPCM.StereoEnhancer(pcm, {
          channels: cfg.channels,
          bitDepth: cfg.bitDepth,
          float: cfg.floatMode,
          sampleRate: _this.originalSampleRate
        }, typeof cfg.stereoEnhancer == "object" ? cfg.stereoEnhancer: {});
        cfg.channels = 2;
      }

      dv = new DataView(pcm.buffer);
      _self.generateLength();
      _this.executeEventListener("pcmdatachange", [{
        length: pcm.length,
        totalFrames: Math.floor(pcm.length / getBytesPerSample(cfg.bitDepth, cfg.floatMode) / cfg.channels),
        data: pcm
      }]);
    };
    _self.generateLength = function () {
      length = Math.floor(pcm.length / getBytesPerSample(cfg.bitDepth, cfg.floatMode) / cfg.channels);
      duration = length / originalSampleRate;
      _this.executeEventListener("durationchange", [_this]);
    };
    _self.resetOffset = function () {
      pcmOffset = playbackRate >= 0 ? 0: length - 1;
    };
    _self.setCurrentTime = function (time) {
      timeUpdate = Date.now();
      pcmOffset = Math.floor(clamp(time * _this.originalSampleRate, 0, length - 1));
    };
    _self.timeUpdate = function (force = false) {
      var time = Date.now();
      if (time >= timeUpdate || force || ((pcmOffset < 0 || pcmOffset > length - 1) && !_this.loop)) {
        timeUpdate = time + SuperPCM.timeUpdateMs;
        _this.executeEventListener("timeupdate", [_this]);
      }
    };

    _self.generatePCM(pcm);
    _self.generateLength();
    this.originalSampleRate = cfg.sampleRate;
    document.addEventListener("visibilitychange", function () {
      if (!SuperPCM.runOnBackground) {
        if (document.visibilityState == "hidden") {
          if (isPlaying) _self.stopScriptProcessor();
        } else if (isPlaying) _self.startScriptProcessor();
      }
    },
      false);
  }

  /**
  * SuperPCM Player
  * - Play audio on any file formats (.mp3, .wav, .ogg, .flac, etc.)
  * - .wav file uses SuperPCM.wavToPCM
  * - Otherwise file formats uses decodeAudioData and convert into PCM data
  *
  * WARNING: The audio decoding process on non-WAV files takes longer than on .wav files
  */
  SuperPCM.player = function(src) {
    var _this = this;
    SuperPCM.streamingPCM.apply(this, []);

    var audioSourcePCM = new audioSource();
    Object.defineProperties(this,
      {
        src: {
          get: function () {
            return audioSourcePCM.src;
          },
          set: function (value) {
            _this.stop();

            audioSourcePCM.src = value;
            audioSourcePCM.start();
          },
          enumerable: true,
          configurable: true
        },
        headers: {
          get: function () {
            return audioSourcePCM.headers;
          },
          set: function (value) {
            audioSourcePCM.headers = value;
          },
          enumerable: true,
          configurable: true
        }
      });

    audioSourcePCM.onSuccess = function (result) {
      _this.originalSampleRate = result.sampleRate;
      _this.sampleRate = result.sampleRate;
      _this._floatMode = result.float;
      _this._bitDepth = result.bitDepth;
      _this._channels = result.channels;
      _this.pcmData = result.data;
      if (_this.autoplay && result.data.length != 0) _this.play();

      _this.executeEventListener("loadedmetadata", [result.headerInfo]);
      _this.executeEventListener("canplay", [_this]);
      _this.executeEventListener("canplaythrough", [_this]);
    };
    audioSourcePCM.onError = function (err) {
      _this.executeEventListener("error", [err]);
    };

    if (src && src != "" && typeof src == "string") this.src = src;
  };

  /**
  * SuperPCM Audio Stream
  */
  var audioSourceMap = new WeakMap();
  function getMediaElementSource(ctx, audio) {
    if (!audioSourceMap.has(ctx)) {
      audioSourceMap.set(ctx, new WeakMap());
    }
    var ctxMap = audioSourceMap.get(ctx);
    if (ctxMap.has(audio)) {
      return ctxMap.get(audio);
    }
    const source = ctx.createMediaElementSource(audio);
    ctxMap.set(audio, source);
    return source;
  }

  SuperPCM.AudioStream = function (element, options) {
    var _this = this,
    _self = {},
    audioElement = null;
    cfg = assignDefaults( {
      sampleRate: SuperPCM.defaults.sampleRate,
      channels: SuperPCM.defaults.channels,
      bufferSize: 2048
    }, options || {});

    _self.audioContext = null;
    _self.scriptProcessor = null;
    _self.mediaElementSource = null;

    cfg.sampleRate = clamp(cfg.sampleRate, SuperPCM.minimumSampleRate, SuperPCM.maximumSampleRate);
    cfg.bufferSize = bufferSize(cfg.bufferSize);
    var pendingPause;

    Object.defineProperties(this, {
      sampleRate: {
        get: function () {
          return cfg.sampleRate;
        },
        set: function (value) {
          var targetValue = clamp(value, SuperPCM.minimumSampleRate, SuperPCM.maximumSampleRate);
          if (cfg.sampleRate !== targetValue) {
            cfg.sampleRate = targetValue;
            if (_self.scriptProcessor) _self.restartScriptProcessor();
          }
        },
        enumerable: true,
        configurable: true
      },
      channels: {
        get: function () {
          return cfg.channels;
        },
        set: function (value) {
          if (cfg.channels != value) {
            cfg.channels = value;
            if (_self.scriptProcessor) _self.restartScriptProcessor();
          }
        },
        enumerable: true,
        configurable: true
      },
      bufferSize: {
        get: function () {
          return cfg.bufferSize;
        },
        set: function (value) {
          var targetValue = bufferSize(value);
          if (cfg.bufferSize !== targetValue) {
            cfg.bufferSize = targetValue;
            if (_self.scriptProcessor) _self.restartScriptProcessor();
          }
        },
        enumerable: true,
        configurable: true
      },

      audioElement: {
        get: function () {
          return audioElement;
        },
        set: function (value) {
          _self.setElement(value);
        }
      }
    });

    _self.initialize = function () {
      if (!audioElement) return;

      var audioPlay = function () {
        if (pendingPause) clearTimeout(pendingPause);
        if (_this.controlAudio) _self.startScriptProcessor();
      },
      audioPause = function () {
        pendingPause = setTimeout(function () {
          if (audioElement.seeking) return;
          if (_this.controlAudio) _self.stopScriptProcessor();
        },
          50);
      }

      audioElement.removeEventListener("play",
        audioPlay);
      audioElement.removeEventListener("pause",
        audioPause);
      audioElement.removeEventListener("ended",
        audioPause);

      audioElement.addEventListener("play",
        audioPlay);
      audioElement.addEventListener("pause",
        audioPause);
      audioElement.addEventListener("ended",
        audioPause);
    }
    _self.setElement = function (el) {
      audioElement = el && typeof el == "string" ? document.querySelector(el): el;
      var inElement;
      if (audioElement) inElement = audioElement.querySelector("audio") || audioElement.querySelector("video");
      if (inElement) audioElement = inElement;

      if (_self.scriptProcessor) _self.restartScriptProcessor();
      else _self.initialize();
    }

    this.inputBuffer = [];
    this.outputBuffer = [];
    _self.startScriptProcessor = function () {
      if (_self.scriptProcessor || !audioElement) return;
      normalizedGain = 1;
      _this.inputBuffer = [];
      _this.outputBuffer = [];

      if (!_self.audioContext) {
        _self.audioContext = SuperPCM.audioCtx(cfg.sampleRate);
      }

      _self.mediaElementSource = getMediaElementSource(_self.audioContext, audioElement);
      _self.scriptProcessor = _self.audioContext.createScriptProcessor(cfg.bufferSize, cfg.channels, cfg.channels);

      try {
        _self.mediaElementSource.disconnect();
      } catch(e) {}

      _self.mediaElementSource.connect(_self.scriptProcessor);
      _self.scriptProcessor.connect(_self.audioContext.destination);

      _self.scriptProcessor.onaudioprocess = function (event) {
        for (var c = 0; c < event.inputBuffer.numberOfChannels; c++) {
          _this.inputBuffer[c] = event.inputBuffer.getChannelData(c);
          _this.outputBuffer[c] = event.outputBuffer.getChannelData(c);
        }

        try {
          if (_this.audioProcessorHeader && typeof _this.audioProcessorHeader == "function") {
            _this.audioProcessorHeader({
              input: _this.inputBuffer,
              channels: cfg.channels,
              player: audioElement,
              main: _this
            });
          }
        } catch (err) {}

        try {
          for (var i = 0; i < event.inputBuffer.length; i++) {
            for (var c = 0; c < event.inputBuffer.numberOfChannels; c++) {
              _this.outputBuffer[c][i] = _this.inputBuffer[c][i];

              if (_this.audioProcessor && typeof _this.audioProcessor == "function") {
                _this.audioProcessor({
                  input: _this.inputBuffer,
                  output: _this.outputBuffer,
                  amplitudo: _this.inputBuffer[c][i],
                  getAmplitudo: function (channel, index = i) {
                    return _this.inputBuffer[channel] != null ? _this.inputBuffer[channel][index]: 0;
                  },
                  index: i,
                  channel: c,
                  bufferSize: event.inputBuffer.length,
                  main: _this
                });
              }

              if (_this.normalizedGain) {
                normalizedGain += (2 * clamp(Math.abs(_this.outputBuffer[c][i] * cfg.channels), 0.1, Infinity) - normalizedGain) * clamp(0.0025 * (event.outputBuffer.length / cfg.sampleRate) / cfg.channels, 0, 1);
                _this.outputBuffer[c][i] *= (1 / normalizedGain) * audioElement.volume;
              } else normalizedGain = audioElement.volume;
            }
          }
        } catch (err) {
          for (var i = 0; i < event.inputBuffer.length; i++) {
            for (var c = 0; c < event.inputBuffer.numberOfChannels; c++) {
              _this.outputBuffer[c][i] = _this.inputBuffer[c][i];

              if (_this.normalizedGain) {
                normalizedGain += (2 * clamp(Math.abs(_this.outputBuffer[c][i] * cfg.channels), 0.1, Infinity) - normalizedGain) * clamp(0.0025 * (event.outputBuffer.length / cfg.sampleRate) / cfg.channels, 0, 1);
                _this.outputBuffer[c][i] *= (1 / normalizedGain) * audioElement.volume;
              } else normalizedGain = audioElement.volume;
            }
          }
        }
      }
    }
    _self.restartScriptProcessor = function () {
      if (_self.scriptProcessor) {
        _self.scriptProcessor.onaudioprocess = null;
        _self.scriptProcessor.disconnect();
        _self.scriptProcessor = null;
      }
      if (_self.mediaElementSource) {
        _self.mediaElementSource.disconnect();
        _self.mediaElementSource = null;
      }
      if (audioElement) {
        var oldEl = audioElement;
        var newEl = oldEl.cloneNode(true);
        var currentPlaybackTime = oldEl.currentTime;
        var wasPlaying = !oldEl.paused;
        if (oldEl.parentNode) {
          oldEl.parentNode.replaceChild(newEl, oldEl);
        }
        audioElement = newEl;
        audioElement.currentTime = currentPlaybackTime;
        _self.initialize();
        if (wasPlaying) {
          audioElement.play().catch(function(e) {});
        }
      }
      if (_self.audioContext) {
        try {
          _self.audioContext.close();
        } catch(e) {}
        _self.audioContext = null;
      }
      _self.audioContext = SuperPCM.audioCtx(cfg.sampleRate);
      _self.startScriptProcessor();
    }
    _self.stopScriptProcessor = function () {
      if (!_self.scriptProcessor) return;

      _self.scriptProcessor.onaudioprocess = null;
      _self.scriptProcessor.disconnect();
      if (_self.mediaElementSource) _self.mediaElementSource.disconnect();
      _self.scriptProcessor = null;
      _this.inputBuffer = null;
      _this.outputBuffer = null;

      if (_self.mediaElementSource && _self.audioContext) {
        _self.mediaElementSource.connect(_self.audioContext.destination);
      }
    }

    this.start = function () {
      _self.startScriptProcessor();
    }
    this.stop = function () {
      _self.stopScriptProcessor();
    }

    this.normalizedGain = true;
    this.controlAudio = true;

    _self.setElement(element);
  }

  /**
  * SuperPCM Recorder
  */
  SuperPCM.Recorder = function (options) {
    var _this = this,
    cfg = assignDefaults( {
      bitDepth: SuperPCM.defaults.bitDepth,
      sampleRate: SuperPCM.defaults.sampleRate,
      float: SuperPCM.defaults.float,
      channels: SuperPCM.defaults.channels,
      gapless: false,
      gaplessThreshold: 0.001,
      duration: 60
    }, options || {});

    var bytes,
    dv,
    bytesPerSample,
    frameSize,
    offset = 0,
    recordedOffset = 0,
    length = 0,
    isRecording = false;
    cfg.sampleRate = clamp(cfg.sampleRate, SuperPCM.minimumSampleRate, SuperPCM.maximumSampleRate);

    Object.defineProperties(this, {
      duration: {
        get: function () {
          return cfg.duration;
        },
        set: function (value) {
          if (cfg.duration != value) {
            cfg.duration = clamp(value, 0, 600);
            _this.updateConfig();
          }
        },
        enumerable: true,
        configurable: true
      },

      bitDepth: {
        get: function () {
          return cfg.bitDepth;
        },
        set: function (value) {
          if (cfg.bitDepth != value) {
            cfg.bitDepth = value;
            _this.updateConfig();
          }
        },
        enumerable: true,
        configurable: true
      },
      sampleRate: {
        get: function () {
          return cfg.sampleRate;
        },
        set: function (value) {
          value = clamp(value, SuperPCM.minimumSampleRate, SuperPCM.maximumSampleRate);
          if (cfg.sampleRate != value) {
            cfg.sampleRate = value;
            _this.updateConfig();
          }
        },
        enumerable: true,
        configurable: true
      },
      channels: {
        get: function () {
          return cfg.channels;
        },
        set: function (value) {
          if (cfg.channels != value) {
            cfg.channels = value;
            _this.updateConfig();
          }
        },
        enumerable: true,
        configurable: true
      },
      float: {
        get: function () {
          return cfg.float;
        },
        set: function (value) {
          if (cfg.float != value) {
            cfg.float = value;
            _this.updateConfig();
          }
        },
        enumerable: true,
        configurable: true
      },

      gapless: {
        get: function () {
          return cfg.gapless;
        },
        set: function (value) {
          cfg.gapless = value;
        },
        enumerable: true,
        configurable: true
      },
      gaplessThreshold: {
        get: function () {
          return cfg.gaplessThreshold;
        },
        set: function (value) {
          cfg.gaplessThreshold = value;
        },
        enumerable: true,
        configurable: true
      },

      progress: {
        get: function () {
          var maxBytes = length * frameSize;
          return maxBytes > 0 ? clamp(offset / maxBytes, 0, 1): 0;
        },
        enumerable: true,
        configurable: true
      },
      total: {
        get: function () {
          return length;
        },
        enumerable: true,
        configurable: true
      },
      recorded: {
        get: function () {
          return Math.floor(recordedOffset / frameSize);
        },
        enumerable: true,
        configurable: true
      },
      current: {
        get: function () {
          return Math.floor(offset / frameSize);
        },
        set: function (value) {
          var maxFrames = length;
          var targetFrame = clamp(Math.floor(value), 0, maxFrames);
          offset = targetFrame * frameSize;
        },
        enumerable: true,
        configurable: true
      },
      totalTime: {
        get: function () {
          return length / cfg.sampleRate;
        },
        enumerable: true,
        configurable: true
      },
      timeRecorded: {
        get: function () {
          return (offset / frameSize) / cfg.sampleRate;
        },
        enumerable: true,
        configurable: true
      }
    });

    this.autoUpdate = false;

    this.initialize = function (dataView = true) {
      bytesPerSample = getBytesPerSample(cfg.bitDepth,
        cfg.float);
      frameSize = bytesPerSample * cfg.channels;
      cfg.duration = clamp(cfg.duration,
        0,
        600);
      length = Math.floor(cfg.duration * cfg.sampleRate);

      recordedOffset = offset = 0;
      bytes = new Uint8Array(length * frameSize);
      dv = new DataView(bytes.buffer);
    }
    this.clear = function () {
      length = 0;
      recordedOffset = offset = 0;
      bytes = null;
      dv = null;
      isRecording = false;
    }

    this.start = function () {
      if (!isRecording) {
        isRecording = true;
        this.initialize();
      }
    }
    this.stop = function () {
      if (isRecording) {
        if (recordedOffset == 0) {
          this.clear();
          return;
        }

        isRecording = false;

        var exactFrameOffset = Math.floor(recordedOffset / frameSize) * frameSize;
        if (exactFrameOffset < bytes.length) {
          bytes = bytes.subarray(0, exactFrameOffset);
          length = Math.floor(recordedOffset / frameSize);
        }

        if (cfg.gapless) {
          bytes = SuperPCM.Gapless(bytes, {
            bitDepth: cfg.bitDepth,
            channels: cfg.channels,
            float: cfg.float
          }, {
            threshold: cfg.gaplessThreshold
          }).pcm;
        }

        if (this.onFinished && typeof this.onFinished == "function") {
          this.onFinished({
            pcm: bytes,
            format: {
              bitDepth: cfg.bitDepth,
              channels: cfg.channels,
              sampleRate: cfg.sampleRate,
              float: cfg.float
            }
          });
        }
      }
    }
    this.result = function () {
      return bytes;
    }

    this.push = function (sample) {
      if (isRecording && bytes != null) {
        offset = encodeSample(sample, cfg.bitDepth, cfg.float, bytes, dv, offset);
        recordedOffset = Math.max(offset, recordedOffset);

        if (offset >= length * frameSize) this.stop();
      }
    }
    this.updateConfig = function () {
      if (bytes == null || !this.autoUpdate) return;

      var prevBytes = new Uint8Array(bytes);
      dv = null;
      this.initialize();
      if (bytes.length == prevBytes.length) bytes = prevBytes;
      else if (prevBytes.length > bytes.length) bytes = prevBytes.subarray(0, bytes.length);
      else if (prevBytes.length < bytes.length) bytes = concatUint8Arrays([prevBytes, new Uint8Array(bytes.length - prevBytes.length)]);
      dv = new DataView(bytes.buffer);
      length = Math.floor(bytes.length / frameSize);

      prevBytes = null;
    }
    this.setFormat = function (format) {
      var prevAutoUpdate = this.autoUpdate;
      if (prevAutoUpdate) this.autoUpdate = false;

      cfg.bitDepth = clamp(format.bitDepth ?? cfg.bitDepth, 1, SuperPCM.maximumSampleRate);
      cfg.sampleRate = format.sampleRate ?? cfg.sampleRate;
      cfg.channels = format.channels ?? cfg.channels;
      cfg.float = format.float ?? cfg.float;

      this.updateConfig();
      this.autoUpdate = prevAutoUpdate;
      prevAutoUpdate = null;
    }

    this.initialize();
  }

  /**
  * SuperPCM Gapless
  */
  SuperPCM.Gapless = function (pcmBytes, header, options) {
    if (!pcmBytes || pcmBytes.length === 0) {
      return {
        pcm: pcmBytes
      };
    }

    header = header || {};
    options = options || {};

    var channels = header.channels || SuperPCM.defaults.channels;
    var bitDepth = header.bitDepth || SuperPCM.defaults.bitDepth;
    var float = header.float || SuperPCM.defaults.floatMode;

    var bytesPerSample = getBytesPerSample(bitDepth, float);
    var frameSize = bytesPerSample * channels;
    var frameCount = Math.floor(pcmBytes.length / frameSize);

    var threshold = options.threshold || 0.001;

    var view = new DataView(pcmBytes.buffer);

    function abs(v) {
      return v < 0 ? -v: v;
    }

    var startFrame = -1;
    var endFrame = -1;

    // detect start
    outerStart:
    for (var f = 0; f < frameCount; f++) {
      for (var c = 0; c < channels; c++) {
        var off = f * frameSize + c * bytesPerSample;

        if (abs(getSample(pcmBytes, view, off, bitDepth, float)) > threshold) {
          startFrame = f;
          break outerStart;
        }
      }
    }

    // detect end
    outerEnd:
    for (var f = frameCount - 1; f >= 0; f--) {
      for (var c = 0; c < channels; c++) {
        var off = f * frameSize + c * bytesPerSample;

        if (abs(getSample(pcmBytes, view, off, bitDepth, float)) > threshold) {
          endFrame = f;
          break outerEnd;
        }
      }
    }

    if (startFrame === -1 || endFrame === -1 || endFrame <= startFrame) {
      return {
        pcm: pcmBytes
      };
    }

    return {
      pcm: pcmBytes.subarray(startFrame * frameSize, endFrame * frameSize),
      startFrame: startFrame,
      endFrame: endFrame
    };
  };
  
  /**
  * SuperPCM Amplitudo
  * Resampling amplitudo with interpolation
  * Support asynchronous processing on .resample()
  */
  SuperPCM.Amplitudo = function(pcm, options = {}) {
    var cfg = assignDefaults( {
      bitDepth: SuperPCM.defaults.bitDepth,
      sampleRate: SuperPCM.defaults.sampleRate,
      float: SuperPCM.defaults.float,
      channels: SuperPCM.defaults.channels,
      interpolationMode: SuperPCM.interpolationMode
    }, options || {});
    
    var dv;
    if (pcm) dv = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    
    Object.defineProperties(this, {
      pcmData: {
        get: function () {
          return pcm;
        },
        set: function (value) {
          if (pcm != value) {
            pcm = value;
            dv = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
          }
        },
        enumerable: true,
        configurable: true
      },
      bitDepth: {
        get: function () {
          return cfg.bitDepth;
        },
        set: function (value) {
          if (cfg.bitDepth != value) cfg.bitDepth = value;
        },
        enumerable: true,
        configurable: true
      },
      sampleRate: {
        get: function () {
          return cfg.sampleRate;
        },
        set: function (value) {
          if (cfg.sampleRate != value) cfg.sampleRate = value;
        },
        enumerable: true,
        configurable: true
      },
      float: {
        get: function () {
          return cfg.float;
        },
        set: function (value) {
          if (cfg.float != value) cfg.float = value;
        },
        enumerable: true,
        configurable: true
      },
      float: {
        get: function () {
          return cfg.float;
        },
        set: function (value) {
          if (cfg.float != value) cfg.float = value;
        },
        enumerable: true,
        configurable: true
      },
      interpolationMode: {
        get: function () {
          return cfg.interpolationMode;
        },
        set: function (value) {
          if (cfg.interpolationMode != value) cfg.interpolationMode = value;
        },
        enumerable: true,
        configurable: true
      },
    });
    
    this.get = function(offset, channel, ratio = 1) {
      return SuperPCM.getAmplitudo(pcm, offset, cfg.channels, channel, cfg.bitDepth, cfg.float, cfg.interpolationMode, dv, ratio);
    };
    this.format = function(format = {}) {
      cfg.bitDepth = format.bitDepth ?? cfg.bitDepth;
      cfg.sampleRate = format.sampleRate ?? cfg.sampleRate;
      cfg.float = format.float ?? cfg.float;
      cfg.channels = format.channels ?? cfg.channels;
    };
    this.resample = function (options = {}) {
      var ratio = 1;
      var async = options.async ?? true;
      var asyncFrameSize = options.frameSize ?? options.asyncFrameSize ?? SuperPCM.asyncFrameSize;
    
      if (options.ratio && typeof options.ratio == "number") {
        ratio = clamp(options.ratio, 0.25, 4);
      } else if (options.sampleRate && typeof options.sampleRate == "number") {
        ratio = clamp(
          options.sampleRate,
          SuperPCM.minimumSampleRate,
          SuperPCM.maximumSampleRate
        ) / cfg.sampleRate;
      }
    
      var offset = 0;
      var frameSize = getBytesPerSample(cfg.bitDepth, cfg.float) * cfg.channels;
      var totalFramesSrc = Math.floor(pcm.length / frameSize);
      var totalFramesDst = Math.floor(totalFramesSrc * ratio);
    
      var out = new Uint8Array(frameSize * totalFramesDst);
      var dvOut = new DataView(out.buffer);
    
      var job = new SuperPCM.AsyncProcessing({
        async: !!async,
        frameSize: asyncFrameSize,
    
        process: function (v) {
          var i = v.index;
    
          for (var c = 0; c < cfg.channels; c++) {
            offset = encodeSample(
              SuperPCM.getAmplitudo(
                pcm,
                i / ratio,
                cfg.channels,
                c,
                cfg.bitDepth,
                cfg.float,
                cfg.interpolationMode,
                dv,
                ratio
              ),
              cfg.bitDepth,
              cfg.float,
              out,
              dvOut,
              offset
            );
          }
        }
      });
    
      job.initial({
        index: 0,
        total: totalFramesDst
      });
    
      if (async) {
        return {
          process: function (callback) {
            return job.processing(function (e) {
              if (e.done || e.stopped) {
                dvOut = null;
              }
    
              if (typeof callback == "function") {
                callback({
                  done: e.done,
                  stopped: e.stopped,
                  paused: e.paused,
                  pcm: out,
                  total: totalFramesDst,
                  length: e.vars.index,
                  job: job
                });
              }
            });
          },
    
          stop: function () {
            return job.stop();
          },
    
          pause: function () {
            return job.pause();
          },
    
          resume: function (callback) {
            return job.resume(callback);
          },
    
          status: function () {
            return job.status();
          },
    
          job: job,
          pcm: out
        };
      }
    
      job.processing();
    
      dvOut = null;
    
      return out;
    };
  }

  /**
   * Manually converts PCM data: Resampling, Channel Remapping, and Bit-Depth Scaling.
   * @param {Uint8Array} pcm - Original PCM data.
   * @param {Object} from - Source format {sampleRate, channels, bitDepth, float}.
   * @param {Object} to - Target format {sampleRate, channels, bitDepth, float}.
   * @param {Boolean|Object} async - false = sync, true/object = async .process()
   */
  SuperPCM.Resample = function (pcm, from, to, async = false) {
    to = to || {};
  
    to.sampleRate = to.sampleRate != null
      ? clamp(to.sampleRate, 0, SuperPCM.maximumSampleRate)
      : from.sampleRate;
  
    to.channels = to.channels != null ? to.channels : from.channels;
    to.float = to.float != null ? to.float : from.float;
    to.bitDepth = to.float
      ? SuperPCM.BIT_DEPTH_32
      : (to.bitDepth != null ? to.bitDepth : from.bitDepth);
  
    var isAsync = !!async;
    var asyncFrameSize = async != null && typeof async === "object" && async.frameSize != null
      ? async.frameSize
      : SuperPCM.asyncFrameSize;
  
    var ratio = from.sampleRate / to.sampleRate;
  
    var srcBytesPerSample = getBytesPerSample(from.bitDepth, from.float);
    var dstBytesPerSample = getBytesPerSample(to.bitDepth, to.float);
  
    var srcFrameSize = srcBytesPerSample * from.channels;
    var dstFrameSize = dstBytesPerSample * to.channels;
  
    var totalFramesSrc = Math.floor(pcm.length / srcFrameSize);
    var totalFramesDst = Math.floor(totalFramesSrc / ratio);
  
    var out = new Uint8Array(totalFramesDst * dstFrameSize);
    var dvSrc = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    var dvDst = new DataView(out.buffer);
  
    var offsetDst = 0;
  
    var job = new SuperPCM.AsyncProcessing({
      async: isAsync,
      frameSize: asyncFrameSize,
  
      process: function (v) {
        var i = v.index;
  
        var srcPos = i * ratio;
        var indexLow = Math.floor(srcPos);
        var indexHigh = Math.min(indexLow + 1, totalFramesSrc - 1);
        var weight = srcPos - indexLow;
  
        for (var dstCh = 0; dstCh < to.channels; dstCh++) {
          var interpolatedValue = 0;
  
          // 1. DOWNMIXING LOGIC
          if (to.channels < from.channels) {
            var sumLow = 0;
            var sumHigh = 0;
  
            for (var srcCh = 0; srcCh < from.channels; srcCh++) {
              var offLow = indexLow * srcFrameSize + srcCh * srcBytesPerSample;
              var offHigh = indexHigh * srcFrameSize + srcCh * srcBytesPerSample;
  
              sumLow += getSample(pcm, dvSrc, offLow, from.bitDepth, from.float);
              sumHigh += getSample(pcm, dvSrc, offHigh, from.bitDepth, from.float);
            }
  
            interpolatedValue =
              (sumLow / from.channels) +
              weight * ((sumHigh / from.channels) - (sumLow / from.channels));
          }
  
          // 2. UPMIXING LOGIC
          else if (from.channels === 1 && to.channels > 1) {
            var offLow = indexLow * srcFrameSize;
            var offHigh = indexHigh * srcFrameSize;
  
            var valLow = getSample(pcm, dvSrc, offLow, from.bitDepth, from.float);
            var valHigh = getSample(pcm, dvSrc, offHigh, from.bitDepth, from.float);
  
            interpolatedValue = valLow + weight * (valHigh - valLow);
          }
  
          // 3. DEFAULT CHANNEL MAPPING
          else {
            var srcCh = dstCh < from.channels ? dstCh : 0;
  
            var offLow = indexLow * srcFrameSize + srcCh * srcBytesPerSample;
            var offHigh = indexHigh * srcFrameSize + srcCh * srcBytesPerSample;
  
            var valLow = getSample(pcm, dvSrc, offLow, from.bitDepth, from.float);
            var valHigh = getSample(pcm, dvSrc, offHigh, from.bitDepth, from.float);
  
            interpolatedValue = valLow + weight * (valHigh - valLow);
          }
  
          offsetDst = encodeSample(
            interpolatedValue,
            to.bitDepth,
            to.float,
            out,
            dvDst,
            offsetDst
          );
        }
      }
    });
  
    job.initial({
      index: 0,
      total: totalFramesDst
    });
  
    if (isAsync) {
      return {
        process: function (callback) {
          return job.processing(function (e) {
            if (e.done || e.stopped) {
              dvSrc = null;
              dvDst = null;
            }
  
            if (typeof callback === "function") {
              callback({
                done: e.done,
                stopped: e.stopped,
                paused: e.paused,
                pcm: out,
                total: totalFramesDst,
                length: e.vars.index,
                job: job
              });
            }
          });
        },
  
        stop: function () {
          return job.stop();
        },
  
        pause: function () {
          return job.pause();
        },
  
        resume: function (callback) {
          return job.resume(callback);
        },
  
        status: function () {
          return job.status();
        },
  
        job: job,
        pcm: out
      };
    }
  
    job.processing();
  
    dvSrc = null;
    dvDst = null;
  
    return out;
  };

  /**
  * Merge multiple audio sources with full format normalization.
  * Support asynchronous processing
  */
  SuperPCM.MergeAudioSource = function (sources, options = {}, async = false) {
    var audioSourcePCM = new audioSource(),
      index = 0,
      resultData = [],
      targetFormat = null,
      samplePosition = 0,
      sampleIndex = [];
  
    var isAsync = !!async;
    var asyncFrameSize = async != null && typeof async == "object" && async.frameSize != null
      ? async.frameSize
      : SuperPCM.asyncFrameSize;
  
    audioSourcePCM.headers = options.headers || {};
  
    function emitProgress(data) {
      if (typeof options.progress == "function") {
        options.progress(data);
      }
    }
  
    function finalize(resolve) {
      var finalPCM = concatUint8Arrays(resultData);
  
      resolve({
        pcm: finalPCM,
        format: targetFormat,
        sampleIndex: sampleIndex
      });
    }
  
    function runTaskMaybe(task, stage, done) {
      if (task && typeof task.process == "function") {
        task.process(function (e) {
          emitProgress({
            done: false,
            stage: stage,
            pcm: e.pcm,
            result: e.result,
            index: index,
            total: sources.length,
            length: e.length,
            subTotal: e.total,
            format: targetFormat,
            sampleIndex: sampleIndex,
            job: e.job
          });
  
          if (e.done || e.stopped) {
            done(e.pcm || (e.result && e.result.pcm) || task.pcm);
          }
        });
      } else {
        done(task);
      }
    }
  
    function startProcess(resolve) {
      if (sources.length !== 0 && index < sources.length) {
        audioSourcePCM.src = sources[index];
        audioSourcePCM.start();
      } else {
        finalize(resolve);
      }
    }
  
    return new Promise(function (resolve) {
      audioSourcePCM.onSuccess = function (result) {
        var currentData = result.data;
  
        if (!targetFormat) {
          targetFormat = {
            sampleRate: clamp(
              options.sampleRate != null ? options.sampleRate : result.sampleRate,
              0,
              SuperPCM.maximumSampleRate
            ),
            bitDepth: options.bitDepth != null
              ? (options.floatMode ? SuperPCM.BIT_DEPTH_32 : options.bitDepth)
              : result.bitDepth,
            float: options.floatMode != null ? options.floatMode : result.float,
            channels: options.stereo != null ? (options.stereo ? 2 : 1) : result.channels
          };
        }
  
        var mismatch =
          result.sampleRate !== targetFormat.sampleRate ||
          result.channels !== targetFormat.channels ||
          result.bitDepth !== targetFormat.bitDepth ||
          result.float !== targetFormat.float;
  
        function afterResample(data) {
          currentData = data;
  
          if (options.gapless) {
            currentData = SuperPCM.Gapless(currentData, targetFormat, {
              threshold: options.gaplessThreshold
            }).pcm;
          }
  
          function afterStereoEnhancer(data2) {
            currentData = data2;
  
            sampleIndex.push(samplePosition);
            samplePosition += currentData.length;
            resultData.push(currentData);
  
            emitProgress({
              done: false,
              stage: "merge",
              pcm: currentData,
              index: index,
              total: sources.length,
              length: index + 1,
              format: targetFormat,
              sampleIndex: sampleIndex
            });
  
            currentData = null;
            index++;
  
            if (index >= sources.length) {
              finalize(resolve);
            } else {
              startProcess(resolve);
            }
          }
  
          if (options.stereo && (options.stereoEnhancer != null ? options.stereoEnhancer : true)) {
            var enhTask = SuperPCM.StereoEnhancer(
              currentData,
              {
                ...targetFormat,
                channels: result.channels
              },
              typeof options.stereoEnhancer == "object" ? options.stereoEnhancer : {},
              isAsync ? { frameSize: asyncFrameSize } : false
            );
  
            runTaskMaybe(enhTask, "stereoEnhancer", afterStereoEnhancer);
          } else {
            afterStereoEnhancer(currentData);
          }
        }
  
        if (mismatch) {
          var resampleTask = SuperPCM.Resample(
            currentData,
            {
              sampleRate: result.sampleRate,
              channels: result.channels,
              bitDepth: result.bitDepth,
              float: result.float
            },
            {
              ...targetFormat,
              channels: options.stereo &&
                (options.stereoEnhancer != null ? options.stereoEnhancer : false)
                ? result.channels
                : targetFormat.channels
            },
            isAsync ? { frameSize: asyncFrameSize } : false
          );
  
          runTaskMaybe(resampleTask, "resample", afterResample);
        } else {
          afterResample(currentData);
        }
      };
  
      audioSourcePCM.onError = function () {
        emitProgress({
          done: false,
          stage: "error",
          index: index,
          total: sources.length,
          length: index + 1,
          format: targetFormat,
          sampleIndex: sampleIndex
        });
  
        index++;
  
        if (index >= sources.length) {
          finalize(resolve);
        } else {
          startProcess(resolve);
        }
      };
  
      startProcess(resolve);
    });
  };

  /**
  * Trimming on a specific section of PCM data
  */
  SuperPCM.Cut = function (pcm,
    format,
    options = {}) {
    var bytesPerSample = getBytesPerSample(format.bitDepth,
      format.float);
    var frameSize = bytesPerSample * format.channels;
    var totalFrames = Math.floor(pcm.length / frameSize);

    if (options.durations !== undefined || options.samples !== undefined) {
      var sampleStartPrev,
      sampleEndPrev,
      sampleStartNext,
      sampleEndNext,
      ranges = options.durations || options.samples
      ranges.forEach(function(range, index) {
        var maxValue = options.durations !== undefined ? totalFrames / format.sampleRate: totalFrames;
        sampleStartPrev = clamp(index - 1 >= 0 ? ranges[index - 1][0]: 0, 0, maxValue);
        sampleEndPrev = clamp(index - 1 >= 0 ? ranges[index - 1][1]: range, 0, maxValue);
        sampleStartNext = clamp(index + 1 < ranges.length && ranges[index + 1][0] != null ? ranges[index + 1][0]: range, 0, maxValue);
        sampleEndNext = clamp(index + 1 < ranges.length && ranges[index + 1][1] != null ? ranges[index + 1][1]: maxValue, 0, maxValue);

        if (options.durations !== undefined) {
          sampleStartPrev = Math.floor(sampleStartPrev * format.sampleRate);
          sampleEndPrev = Math.floor(sampleEndPrev * format.sampleRate);
          sampleStartPrev = Math.floor(sampleStartPrev * format.sampleRate);
          sampleEndPrev = Math.floor(sampleEndPrev * format.sampleRate);
        }
      });
    } else {
      var sampleStart,
      sampleEnd;

      if (options.start !== undefined || options.end !== undefined) {
        sampleStart = Math.floor(clamp(options.start ?? 0, 0, totalFrames));
        sampleEnd = Math.floor(clamp(options.end ?? totalFrames, 0, totalFrames));
      } else if (options.durationStart !== undefined || options.durationEnd !== undefined) {
        sampleStart = Math.floor(clamp((options.durationStart ?? 0) * format.sampleRate, 0, totalFrames));
        sampleEnd = Math.floor(clamp((options.durationEnd ?? (totalFrames / format.sampleRate)) * format.sampleRate, 0, totalFrames));
      } else {
        sampleStart = 0;
        sampleEnd = totalFrames;
      }

      var sampleStartByte = sampleStart * frameSize;
      var sampleEndByte = sampleEnd * frameSize;
      return pcm.subarray(sampleStartByte, sampleEndByte);
    }
  };


  /**
  * SuperPCM.StereoEnhancer
  * - Mono  -> Stereo (widen)
  * - Stereo -> Wider stereo (MID/SIDE safe)
  * - Adaptive transient (strong / weak)
  * - No hi-hat gating
  * - Stereo width configurable
  * - Haas configurable
  * - Preset mode (natural / wide / extreme)
  * - Support asynchronous processing
  */
  SuperPCM.StereoEnhancer = function (pcm, format, options, async = false) {
    if (!format) return pcm;
    options = options || {};
  
    var isAsync = !!async;
    var asyncFrameSize = async != null && typeof async == "object" && async.frameSize != null
      ? async.frameSize
      : SuperPCM.asyncFrameSize;
  
    var bitDepth = format.bitDepth;
    var isFloat = !!format.float;
    var bytesPerSample = getBytesPerSample(bitDepth, isFloat);
    var sampleRate = format.sampleRate || 48000;
  
    var presets = {
      natural: { width: 1.0, brightness: 1.0, haas: 0.1, bass: 1.05, cross: 0.02 },
      wide:    { width: 1.2, brightness: 1.2, haas: 0.2, bass: 1.08, cross: 0.02 },
      extreme: { width: 1.4, brightness: 1.5, haas: 0.3, bass: 1.10, cross: 0.02 }
    };
  
    var preset = presets[options.mode || "wide"] || presets.wide;
  
    var width = options.width ?? preset.width;
    var brightness = options.brightness ?? preset.brightness;
    var haasAmount = options.haasAmount ?? preset.haas;
    var bassBoost = options.bassBoost ?? preset.bass;
    var bassRoundness = options.bassRoundness ?? 0.5;
    var cross = options.cross ?? preset.cross;
    var haasEnabled = options.haas !== false;
    var bassMono = options.bassMono !== false;
  
    function createAsyncReturn(job, out, total, clean) {
      if (isAsync) {
        return {
          process: function (callback) {
            return job.processing(function (e) {
              if (e.done || e.stopped) clean();
  
              if (typeof callback == "function") {
                callback({
                  done: e.done,
                  stopped: e.stopped,
                  paused: e.paused,
                  pcm: out,
                  total: total,
                  length: e.vars.index,
                  job: job
                });
              }
            });
          },
  
          stop: function () {
            return job.stop();
          },
  
          pause: function () {
            return job.pause();
          },
  
          resume: function (callback) {
            return job.resume(callback);
          },
  
          status: function () {
            return job.status();
          },
  
          job: job,
          pcm: out
        };
      }
  
      job.processing();
      clean();
      return out;
    }
  
    // =========================
    // STEREO MODE
    // =========================
    if (format.channels === 2) {
      var frameSize = bytesPerSample * 2;
      var totalFrames = Math.floor(pcm.length / frameSize);
  
      if (!format._enhStateStereo) {
        format._enhStateStereo = {
          lowL: 0,
          lowR: 0,
          sideSmooth: 0,
          bassSmooth: 0,
          haasBuffer: new Float32Array(4096),
          haasIndex: 0
        };
      }
  
      var s = format._enhStateStereo;
  
      var out = new Uint8Array(pcm.length);
      var dvSrc = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
      var dvDst = new DataView(out.buffer);
  
      var haasSamples = Math.floor(sampleRate * (options.haasDelay ?? 6) / 1000);
  
      var job = new SuperPCM.AsyncProcessing({
        async: isAsync,
        frameSize: asyncFrameSize,
  
        process: function (v) {
          var i = v.index;
          var pos = i * frameSize;
  
          var left = getSample(pcm, dvSrc, pos, bitDepth, isFloat);
          var right = getSample(pcm, dvSrc, pos + bytesPerSample, bitDepth, isFloat);
  
          var mid = (left + right) * 0.5;
          var side = (left - right) * 0.5 * brightness;
  
          s.lowL += 0.02 * (left - s.lowL);
          s.lowR += 0.02 * (right - s.lowR);
  
          var bassRaw = (s.lowL + s.lowR) * 0.5;
  
          var smoothCoeff = 0.02 + 0.12 * bassRoundness;
          s.bassSmooth = (s.bassSmooth || 0) + smoothCoeff * (bassRaw - (s.bassSmooth || 0));
  
          var bass = s.bassSmooth;
          var drive = 1 + bassRoundness * 0.8;
          bass = Math.tanh(bass * drive);
  
          if (bassMono) {
            side -= bass * 0.2;
          }
  
          side *= width;
  
          var maxSide = Math.abs(mid) * 0.9;
          var sideRatio = side / (maxSide + 1e-6);
          side = maxSide * Math.tanh(sideRatio);
  
          s.sideSmooth += 0.1 * (side - s.sideSmooth);
          side = Math.tanh(s.sideSmooth);
  
          s.haasBuffer[s.haasIndex] = side;
  
          var readIndex = s.haasIndex - haasSamples;
          if (readIndex < 0) readIndex += s.haasBuffer.length;
  
          var haas = s.haasBuffer[readIndex];
  
          s.haasIndex = (s.haasIndex + 1) % s.haasBuffer.length;
  
          if (haasEnabled) {
            var haasSafe = haasAmount / (1 + haasAmount * 0.5);
            var mix = haasSafe * 2;
  
            side = side * (1 - mix) + haas * mix;
          }
  
          side += haas * 0.12;
  
          var outL = mid + side + bass * (bassBoost - 1);
          var outR = mid - side + bass * (bassBoost - 1);
  
          var l = outL;
          var r = outR;
  
          outL = l * (1 - cross) + r * cross;
          outR = r * (1 - cross) + l * cross;
  
          var monoCheck = (outL + outR) * 0.5;
  
          outL = outL * 0.95 + monoCheck * 0.05;
          outR = outR * 0.95 + monoCheck * 0.05;
  
          outL = Math.tanh(outL);
          outR = Math.tanh(outR);
  
          var outPos = i * frameSize;
          encodeSample(outL, bitDepth, isFloat, out, dvDst, outPos);
          encodeSample(outR, bitDepth, isFloat, out, dvDst, outPos + bytesPerSample);
        }
      });
  
      job.initial({
        index: 0,
        total: totalFrames
      });
  
      return createAsyncReturn(job, out, totalFrames, function () {
        dvSrc = null;
        dvDst = null;
      });
    }
  
    // =========================
    // MONO → STEREO MODE
    // =========================
    if (format.channels !== 1) return pcm;
  
    var totalSamples = Math.floor(pcm.length / bytesPerSample);
  
    if (!format._enhState) {
      format._enhState = {
        low: 0,
        mid: 0,
  
        xL: 0,
        yL: 0,
        xR: 0,
        yR: 0,
  
        prev: 0,
        env: 0,
        hold: 0,
  
        monoMix: 0,
        sideMix: 1,
  
        haasBuffer: new Float32Array(4096),
        haasIndex: 0
      };
    }
  
    var sm = format._enhState;
  
    var outMono = new Uint8Array(pcm.length * 2);
    var dvSrcMono = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    var dvDstMono = new DataView(outMono.buffer);
  
    var lowCoeff = 0.018;
    var midCoeff = 0.08;
  
    var monoHaasSamples = Math.floor(sampleRate * 8 / 1000);
    var holdStrong = Math.floor(sampleRate * 0.006);
    var holdWeak = Math.floor(sampleRate * 0.002);
  
    var monoJob = new SuperPCM.AsyncProcessing({
      async: isAsync,
      frameSize: asyncFrameSize,
  
      process: function (v) {
        var j = v.index;
        var pos = j * bytesPerSample;
  
        var input = decodeSample(pcm, dvSrcMono, pos, bitDepth, isFloat).value;
  
        var delta = input - sm.prev;
        sm.prev = input;
  
        var abs = Math.abs(input);
        sm.env += 0.012 * (abs - sm.env);
  
        var strength = Math.abs(delta);
  
        var isStrong = strength > sm.env * 3.5;
        var isWeak = strength > sm.env * 1.8;
  
        if (isStrong) sm.hold = holdStrong;
        else if (isWeak) sm.hold = holdWeak;
        else if (sm.hold > 0) sm.hold--;
  
        sm.low += lowCoeff * (input - sm.low);
  
        var smoothCoeff = 0.02 + 0.12 * bassRoundness;
        sm.lowSmooth = (sm.lowSmooth || 0) + smoothCoeff * (sm.low - (sm.lowSmooth || 0));
  
        var low = sm.lowSmooth;
  
        var drive = 1 + bassRoundness * 0.8;
        low = Math.tanh(low * drive);
  
        sm.lowSafe = sm.lowSafe || 0;
        sm.lowSafe += 0.1 * (low - sm.lowSafe);
        low = sm.lowSafe;
  
        var tmp = input - low;
  
        sm.mid += midCoeff * (tmp - sm.mid);
        var mid = sm.mid;
  
        var high = tmp - mid;
  
        sm.highSmooth = (sm.highSmooth || 0) + 0.2 * (high - (sm.highSmooth || 0));
  
        var rawHigh = tmp - mid;
        high = sm.highSmooth * 0.7 + rawHigh * 0.3;
  
        var highLimit = 0.9;
        high = highLimit * Math.tanh(high / highLimit);
  
        var highFactor = isStrong ? 0.6 : (isWeak ? 0.85 : 1.0);
        high *= highFactor;
  
        var leftPhase = 0.34 * mid + 0.55 * high + sm.xL - 0.34 * sm.yL;
        sm.xL = mid + high;
        sm.yL = leftPhase;
  
        var rightPhase = -0.34 * mid - 0.55 * high + sm.xR + 0.34 * sm.yR;
        sm.xR = mid + high;
        sm.yR = rightPhase;
  
        var phaseShift = high * 0.42;
        var sidePhase = (leftPhase - rightPhase) * 0.5;
        var side = sidePhase * width * 2.5 + high * brightness * 1.15;
  
        side += high * brightness * 0.3;
  
        leftPhase += phaseShift;
        rightPhase -= phaseShift;
  
        if (isStrong) {
          side = 0;
        }
  
        high *= 0.9 + 0.2 * brightness;
  
        var highEnergy = Math.abs(high);
        var isHighTransient = highEnergy > sm.env * 0.2;
  
        sm.haasBuffer[sm.haasIndex] = side;
  
        var readIndex = (sm.haasIndex - monoHaasSamples + sm.haasBuffer.length) % sm.haasBuffer.length;
        var nextIndex = (readIndex + 1) % sm.haasBuffer.length;
        var frac = 0.5;
  
        var haas =
          sm.haasBuffer[readIndex] * (1 - frac) +
          sm.haasBuffer[nextIndex] * frac;
  
        sm.haasPrev = sm.haasPrev || 0;
  
        var haasOut = haas - sm.haasPrev * 0.25;
        sm.haasPrev = haas;
  
        haas = haasOut;
        haas *= brightness * 0.5;
  
        sm.haasIndex = (sm.haasIndex + 1) % sm.haasBuffer.length;
  
        var haasSuppress = 1.0;
  
        if (haasEnabled) {
          sm.transient = sm.transient || 0;
  
          var target = isStrong ? 1.0 : (isWeak ? 0.5 : (isHighTransient ? 0.7 : 0.0));
          var speed = target > sm.transient ? 0.35 : 0.08;
  
          sm.transient += speed * (target - sm.transient);
  
          var transientAmount = sm.transient;
          haasSuppress = 1.0 - transientAmount;
  
          var haasSafe = haasAmount / (1 + haasAmount * 0.5);
  
          sm.haasClamp = sm.haasClamp || 1;
  
          var targetClamp = isStrong ? 0.5 : (isHighTransient ? 0.3 : 1.0);
          var clampSpeed = targetClamp < sm.haasClamp ? 0.35 : 0.08;
  
          sm.haasClamp += clampSpeed * (targetClamp - sm.haasClamp);
  
          haas *= sm.haasClamp;
  
          var mix = haasSafe * haasSuppress * 1.8;
          var energy = 1 / (1 + mix);
  
          side = (side + haas * mix) * energy;
        }
  
        sm.haasSmooth = sm.haasSmooth || 0;
        sm.haasSmooth += 0.2 * (haas - sm.haasSmooth);
        haas = sm.haasSmooth;
  
        side += haas * 0.12 * haasSuppress;
        side *= 0.98;
        side = Math.tanh(side);
  
        var left = low * bassBoost + mid + side;
        var right = low * bassBoost + mid - side;
  
        var mono = (left + right) * 0.5;
  
        left = left * 0.95 + mono * 0.05;
        right = right * 0.95 + mono * 0.05;
  
        left = Math.tanh(left);
        right = Math.tanh(right);
  
        var outPos = j * bytesPerSample * 2;
        encodeSample(left, bitDepth, isFloat, outMono, dvDstMono, outPos);
        encodeSample(right, bitDepth, isFloat, outMono, dvDstMono, outPos + bytesPerSample);
      }
    });
  
    monoJob.initial({
      index: 0,
      total: totalSamples
    });
  
    format.channels = 2;
  
    return createAsyncReturn(monoJob, outMono, totalSamples, function () {
      format._enhState = null;
      dvSrcMono = null;
      dvDstMono = null;
    });
  };
  
  /**
   * SuperPCM.NullTest
   * Compares the amplitude difference between two PCM streams (e.g., original vs decoded)
   * using the Phase Inversion / Delta Analysis method.
   * @param {Uint8Array} pcm1 - First PCM data buffer (e.g., Original reference)
   * @param {Uint8Array} pcm2 - Second PCM data buffer (e.g., Decoded ADPCM data)
   * @param {Object} format - The common format specifier {bitDepth, float, channels}
   * @param {Booean} async - Asynchronous processing null test
   * @returns {Object} { deltaPCM, maxDelta, rmsError, totalSamples }
   */
  SuperPCM.NullTest = function (pcm1, pcm2, format, async = false) {
    format = format || {};
  
    var isAsync = !!async;
    var asyncFrameSize = async != null && typeof async == "object" && async.frameSize != null
      ? async.frameSize
      : SuperPCM.asyncFrameSize;
  
    var bitDepth = format.bitDepth || SuperPCM.defaults.bitDepth;
    var isFloat = !!format.float;
    var channels = format.channels || SuperPCM.defaults.channels;
  
    var bytes1 = pcm1 instanceof Uint8Array ? pcm1 : new Uint8Array(pcm1);
    var bytes2 = pcm2 instanceof Uint8Array ? pcm2 : new Uint8Array(pcm2);
  
    var bytesPerSample = getBytesPerSample(bitDepth, isFloat);
    var frameSize = bytesPerSample * channels;
  
    var totalFrames = Math.min(
      Math.floor(bytes1.length / frameSize),
      Math.floor(bytes2.length / frameSize)
    );
  
    var totalSamples = totalFrames * channels;
  
    var dv1 = new DataView(bytes1.buffer, bytes1.byteOffset, bytes1.byteLength);
    var dv2 = new DataView(bytes2.buffer, bytes2.byteOffset, bytes2.byteLength);
  
    var deltaFloat = new Float32Array(totalSamples);
    var deltaPCM = new Uint8Array(totalSamples * 2);
    var dvOut = new DataView(deltaPCM.buffer);
  
    var maxDelta = 0;
    var sumSquareError = 0;
    var sampleIndex = 0;
  
    var result = {
      deltaFloat: deltaFloat,
      deltaPCM: deltaPCM,
      maxDelta: 0,
      rmsError: 0,
      totalSamples: totalSamples,
      totalFrames: totalFrames
    };
  
    function clean() {
      dv1 = null;
      dv2 = null;
      dvOut = null;
    }
  
    var job = new SuperPCM.AsyncProcessing({
      async: isAsync,
      frameSize: asyncFrameSize,
  
      process: function (v) {
        var f = v.index;
  
        for (var c = 0; c < channels; c++) {
          var byteOffset = f * frameSize + c * bytesPerSample;
  
          var s1 = getSample(bytes1, dv1, byteOffset, bitDepth, isFloat);
          var s2 = getSample(bytes2, dv2, byteOffset, bitDepth, isFloat);
  
          var delta = s1 - s2;
  
          var idx = f * channels + c;
          deltaFloat[idx] = delta;
  
          var absDelta = Math.abs(delta);
          if (absDelta > maxDelta) maxDelta = absDelta;
  
          sumSquareError += delta * delta;
          sampleIndex++;
  
          var v16 = clamp(delta, -1, 1);
          var s16 = v16 < 0
            ? Math.round(v16 * 0x8000)
            : Math.round(v16 * 0x7FFF);
  
          dvOut.setInt16(idx * 2, clamp(s16, -32768, 32767), true);
        }
  
        result.maxDelta = maxDelta;
        result.rmsError = sampleIndex > 0
          ? Math.sqrt(sumSquareError / sampleIndex)
          : 0;
      }
    });
  
    job.initial({
      index: 0,
      total: totalFrames
    });
  
    if (isAsync) {
      return {
        process: function (callback) {
          return job.processing(function (e) {
            if (e.done || e.stopped) clean();
  
            if (typeof callback == "function") {
              callback({
                done: e.done,
                stopped: e.stopped,
                paused: e.paused,
                result: result,
                deltaPCM: deltaPCM,
                deltaFloat: deltaFloat,
                total: totalFrames,
                length: e.vars.index,
                job: job
              });
            }
          });
        },
  
        stop: function () {
          return job.stop();
        },
  
        pause: function () {
          return job.pause();
        },
  
        resume: function (callback) {
          return job.resume(callback);
        },
  
        status: function () {
          return job.status();
        },
  
        job: job,
        result: result
      };
    }
  
    job.processing();
    clean();
  
    return result;
  };

  /* ------------------------------------------------------------------
   * Audio Watermark (spectrogram-trackable, robust mode)
   * ------------------------------------------------------------------
   * Robust upgrade:
   *  - Uses low/mid frequency FSK pairs by default, safer for low sample rates.
   *  - Spreads every bit across multiple frequency pairs.
   *  - Adds per-bit repetition + packet repetition + CRC8.
   *  - Uses Goertzel detection so it can be traced on a spectrogram.
   *
   * Notes:
   *  - This is still an audio watermark/fingerprint helper, not DRM.
   *  - For compressed audio, keep strength higher and bitDuration longer.
   *  - For low sample rate, frequencies are automatically moved below Nyquist.
   */
  SuperPCM.AudioWatermark = {
    defaults: {
      // Legacy aliases; still accepted. In robust mode these are used only
      // when custom frequencyPairs are not provided and the sample rate is high.
      f0: 17500,
      f1: 19000,

      // Robust defaults. These survive ordinary lossy compression much better
      // than ultrasonic-only tones and still appear clearly on spectrograms.
      frequencyPairs: null,
      // e.g. [[900, 1400], [1800, 2400], [3000, 3800]]
      mode: "robust",
      // "robust" or "legacy"
      bitDuration: 0.12,
      strength: 0.018,
      repeat: 3,
      // repeat whole packet
      bitRepeat: 3,
      // repeat each bit inside packet
      startTime: 0,
      channel: "all",
      // "all", "mix", or channel index
      maxScanSeconds: null,
      scanStepRatio: 0.33,
      minSyncScore: 0.72,
      minConfidence: 0.06,
      lowSampleRateSafe: true,
      randomizePhase: true,
      payloadMaxBytes: 65535
    },

    syncBits: [
      1,
      0,
      1,
      1,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      1,
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      0,
      1
    ],

    _utf8Encode: function (text) {
      text = String(text == null ? "": text);
      if (typeof TextEncoder !== "undefined") {
        return Array.prototype.slice.call(new TextEncoder().encode(text));
      }

      var encoded = unescape(encodeURIComponent(text));
      var bytes = [];
      for (var i = 0; i < encoded.length; i++) bytes.push(encoded.charCodeAt(i) & 0xFF);
      return bytes;
    },

    _utf8Decode: function (bytes) {
      bytes = bytes || [];
      try {
        if (typeof TextDecoder !== "undefined") {
          return new TextDecoder("utf-8", {
            fatal: false
          }).decode(new Uint8Array(bytes));
        }
      } catch (e) {}

      var s = "";
      for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i] & 0xFF);
      try {
        return decodeURIComponent(escape(s));
      } catch (e) {
        return s;
      }
    },

    _crc8: function (bytes) {
      var crc = 0x00;
      for (var i = 0; i < bytes.length; i++) {
        crc ^= bytes[i] & 0xFF;
        for (var b = 0; b < 8; b++) {
          crc = (crc & 0x80) ? ((crc << 1) ^ 0x07) & 0xFF: (crc << 1) & 0xFF;
        }
      }
      return crc & 0xFF;
    },

    _numberToBits: function (num, bitCount) {
      var bits = [];
      for (var i = bitCount - 1; i >= 0; i--) bits.push((num >> i) & 1);
      return bits;
    },

    _bitsToNumber: function (bits, offset, bitCount) {
      var n = 0;
      for (var i = 0; i < bitCount; i++) n = (n << 1) | (bits[offset + i] ? 1: 0);
      return n;
    },

    _bytesToBits: function (bytes) {
      var bits = [];
      for (var i = 0; i < bytes.length; i++) {
        for (var b = 7; b >= 0; b--) bits.push((bytes[i] >> b) & 1);
      }
      return bits;
    },

    _bitsToBytes: function (bits) {
      var bytes = [];
      for (var i = 0; i + 7 < bits.length; i += 8) {
        var v = 0;
        for (var b = 0; b < 8; b++) v = (v << 1) | (bits[i + b] ? 1: 0);
        bytes.push(v);
      }
      return bytes;
    },

    _repeatBits: function (bits, n) {
      n = Math.max(1, Math.floor(n || 1));
      if (n <= 1) return bits.slice();
      var out = [];
      for (var i = 0; i < bits.length; i++) {
        for (var r = 0; r < n; r++) out.push(bits[i]);
      }
      return out;
    },

    _majorityBits: function (bits, n) {
      n = Math.max(1, Math.floor(n || 1));
      if (n <= 1) return bits.slice();
      var out = [];
      for (var i = 0; i < bits.length; i += n) {
        var ones = 0,
        count = 0;
        for (var j = 0; j < n && i + j < bits.length; j++) {
          ones += bits[i + j] ? 1: 0;
          count++;
        }
        out.push(ones >= count / 2 ? 1: 0);
      }
      return out;
    },

    _prng: function (seed) {
      var x = seed >>> 0;
      return function () {
        x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
        return (x >>> 0) / 4294967296;
      };
    },

    makePacketBits: function (payload, options) {
      var opt = assignDefaults(assignDefaults( {}, SuperPCM.AudioWatermark.defaults), options || {});
      var bytes = SuperPCM.AudioWatermark._utf8Encode(payload);
      if (bytes.length > opt.payloadMaxBytes) {
        throw new Error("AudioWatermark payload is too large. Max " + opt.payloadMaxBytes + " bytes.");
      }

      var crc = SuperPCM.AudioWatermark._crc8(bytes);
      var raw = []
      .concat(SuperPCM.AudioWatermark.syncBits)
      .concat(SuperPCM.AudioWatermark._numberToBits(bytes.length, 16))
      .concat(SuperPCM.AudioWatermark._bytesToBits(bytes))
      .concat(SuperPCM.AudioWatermark._numberToBits(crc, 8));

      return SuperPCM.AudioWatermark._repeatBits(raw, opt.bitRepeat);
    },

    _resolveFrequencyPairs: function (sampleRate, options) {
      var cfg = assignDefaults(assignDefaults( {}, SuperPCM.AudioWatermark.defaults), options || {});
      var nyquist = sampleRate * 0.5;
      var maxFreq = Math.max(300, nyquist * 0.82);
      var minGap = Math.max(120, sampleRate * 0.025);
      var pairs = [];

      if (cfg.mode === "legacy") {
        pairs = [[cfg.f0,
          cfg.f1]];
      } else if (cfg.frequencyPairs && cfg.frequencyPairs.length) {
        for (var i = 0; i < cfg.frequencyPairs.length; i++) {
          pairs.push([Number(cfg.frequencyPairs[i][0]), Number(cfg.frequencyPairs[i][1])]);
        }
      } else if (sampleRate <= 12000 || cfg.lowSampleRateSafe) {
        // Speech-band friendly pairs. For 8 kHz audio this becomes roughly
        // 700/1100, 1400/1900, 2300/3000 after safety checks.
        pairs = [
          [700,
            1100],
          [1400,
            1900],
          [2300,
            3000],
          [3300,
            4200]
        ];
      } else {
        // More compression-resistant than ultrasonic-only, but less audible
        // than low-midrange tones.
        pairs = [
          [1600,
            2300],
          [3200,
            4300],
          [5600,
            7100],
          [9200,
            11200]
        ];
      }

      var safe = [];
      for (var p = 0; p < pairs.length; p++) {
        var a = Math.max(80, pairs[p][0]);
        var b = Math.max(80, pairs[p][1]);
        if (a > maxFreq && b > maxFreq) continue;
        a = Math.min(a, maxFreq * 0.88);
        b = Math.min(b, maxFreq);
        if (Math.abs(b - a) < minGap) b = Math.min(maxFreq, a + minGap);
        if (Math.abs(b - a) < minGap * 0.6) continue;
        if (a > b) {
          var t = a; a = b; b = t;
        }
        safe.push([a, b]);
      }

      if (!safe.length) {
        safe.push([Math.max(120, nyquist * 0.28), Math.max(240, nyquist * 0.55)]);
      }

      return {
        pairs: safe,
        cfg: cfg
      };
    },

    _extractChannelFloat: function (pcm, format, channel) {
      var cfg = assignDefaults( {
        sampleRate: SuperPCM.defaults.sampleRate,
        channels: SuperPCM.defaults.channels,
        bitDepth: SuperPCM.defaults.bitDepth,
        float: SuperPCM.defaults.float
      }, format || {});

      var bytes = pcm instanceof Uint8Array ? pcm: new Uint8Array(pcm);
      var bitDepth = cfg.float ? SuperPCM.BIT_DEPTH_32: cfg.bitDepth;
      var isFloat = !!cfg.float;
      var bps = getBytesPerSample(bitDepth, isFloat);
      var frameSize = bps * cfg.channels;
      var frames = Math.floor(bytes.length / frameSize);
      var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      var out = new Float32Array(frames);

      for (var i = 0; i < frames; i++) {
        if (channel === "mix" || channel === "all") {
          var sum = 0;
          for (var c = 0; c < cfg.channels; c++) sum += getSample(bytes, dv, i * frameSize + c * bps, bitDepth, isFloat);
          out[i] = sum / Math.max(1, cfg.channels);
        } else {
          var ch = clamp(Math.floor(channel || 0), 0, cfg.channels - 1);
          out[i] = getSample(bytes, dv, i * frameSize + ch * bps, bitDepth, isFloat);
        }
      }

      return {
        samples: out,
        format: cfg,
        frames: frames
      };
    },

    _goertzelPower: function (samples, start, size, sampleRate, freq) {
      var omega = 2 * Math.PI * freq / sampleRate;
      var coeff = 2 * Math.cos(omega);
      var s0 = 0,
      s1 = 0,
      s2 = 0;

      for (var i = 0; i < size; i++) {
        var idx = start + i;
        var x = idx >= 0 && idx < samples.length ? samples[idx]: 0;
        var w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, size - 1));
        x *= w;
        s0 = x + coeff * s1 - s2;
        s2 = s1;
        s1 = s0;
      }

      return s1 * s1 + s2 * s2 - coeff * s1 * s2;
    },

    _readBitAtPairs: function (samples, start, size, sampleRate, pairs) {
      var votes = 0;
      var confidenceSum = 0;
      var p0Total = 0;
      var p1Total = 0;

      for (var i = 0; i < pairs.length; i++) {
        var p0 = SuperPCM.AudioWatermark._goertzelPower(samples, start, size, sampleRate, pairs[i][0]);
        var p1 = SuperPCM.AudioWatermark._goertzelPower(samples, start, size, sampleRate, pairs[i][1]);
        var total = p0 + p1 + 1e-20;
        p0Total += p0;
        p1Total += p1;
        votes += p1 > p0 ? 1: -1;
        confidenceSum += Math.abs(p1 - p0) / total;
      }

      return {
        bit: votes >= 0 ? 1: 0,
        p0: p0Total,
        p1: p1Total,
        confidence: confidenceSum / Math.max(1, pairs.length)
      };
    },

    _readRepeatedBitsAt: function (samples, frameStart, count, bitFrames, sampleRate, pairs, bitRepeat) {
      var raw = [];
      var conf = [];
      var details = [];
      var total = count * Math.max(1, bitRepeat);

      for (var i = 0; i < total; i++) {
        var r = SuperPCM.AudioWatermark._readBitAtPairs(
          samples,
          frameStart + i * bitFrames,
          bitFrames,
          sampleRate,
          pairs
        );
        raw.push(r.bit);
        conf.push(r.confidence);
        details.push(r);
      }

      var bits = SuperPCM.AudioWatermark._majorityBits(raw, bitRepeat);
      var reducedConf = [];
      for (var b = 0; b < bits.length; b++) {
        var sum = 0,
        n = 0;
        for (var j = 0; j < bitRepeat; j++) {
          var idx = b * bitRepeat + j;
          if (idx < conf.length) {
            sum += conf[idx]; n++;
          }
        }
        reducedConf.push(sum / Math.max(1, n));
      }

      return {
        bits: bits,
        confidence: reducedConf,
        rawBits: raw,
        rawDetails: details
      };
    },

    embedPCM: function (pcm, format, payload, options) {
      var cfg = assignDefaults( {
        sampleRate: SuperPCM.defaults.sampleRate,
        channels: SuperPCM.defaults.channels,
        bitDepth: SuperPCM.defaults.bitDepth,
        float: SuperPCM.defaults.float
      }, format || {});

      var wm = SuperPCM.AudioWatermark._resolveFrequencyPairs(cfg.sampleRate, options);
      var opt = wm.cfg;
      var packet = SuperPCM.AudioWatermark.makePacketBits(payload, opt);
      var repeat = Math.max(1, Math.floor(opt.repeat || 1));
      var bits = [];
      for (var r = 0; r < repeat; r++) bits = bits.concat(packet);

      var input = pcm instanceof Uint8Array ? pcm: new Uint8Array(pcm);
      var output = new Uint8Array(input);
      var bitDepth = cfg.float ? SuperPCM.BIT_DEPTH_32: cfg.bitDepth;
      var isFloat = !!cfg.float;
      var bps = getBytesPerSample(bitDepth, isFloat);
      var frameSize = bps * cfg.channels;
      var frames = Math.floor(output.length / frameSize);
      var bitFrames = Math.max(64, Math.floor(opt.bitDuration * cfg.sampleRate));
      var startFrame = Math.max(0, Math.floor((opt.startTime || 0) * cfg.sampleRate));
      var dv = new DataView(output.buffer, output.byteOffset, output.byteLength);
      var maxFramesNeeded = startFrame + bits.length * bitFrames;

      if (maxFramesNeeded > frames) throw new Error("AudioWatermark: PCM is too short for this payload/options.");

      var phaseRand = SuperPCM.AudioWatermark._prng(0xA17D3 + packet.length * 131 + cfg.sampleRate);

      for (var bitIndex = 0; bitIndex < bits.length; bitIndex++) {
        var bit = bits[bitIndex] ? 1: 0;
        var bitStart = startFrame + bitIndex * bitFrames;

        for (var i = 0; i < bitFrames; i++) {
          var frame = bitStart + i;
          var edge = Math.min(Math.floor(bitFrames * 0.12), Math.floor(0.01 * cfg.sampleRate));
          var env = 1;
          if (edge > 0) {
            if (i < edge) env = i / edge;
            else if (i > bitFrames - edge) env = (bitFrames - i) / edge;
          }

          var tone = 0;
          for (var p = 0; p < wm.pairs.length; p++) {
            var freq = bit ? wm.pairs[p][1]: wm.pairs[p][0];
            var phase = opt.randomizePhase ? (p + 1) * 2 * Math.PI * phaseRand(): 0;
            tone += Math.sin(2 * Math.PI * freq * (i / cfg.sampleRate) + phase);
          }
          tone = (tone / Math.max(1, wm.pairs.length)) * opt.strength * env;

          for (var c = 0; c < cfg.channels; c++) {
            if (opt.channel !== "all" && c !== Math.floor(opt.channel || 0)) continue;
            var byteOffset = frame * frameSize + c * bps;
            var sample = getSample(output, dv, byteOffset, bitDepth, isFloat);
            // Soft mix to reduce audible clipping while surviving codec changes.
            sample = Math.tanh(sample + tone);
            encodeSample(sample, bitDepth, isFloat, output, dv, byteOffset);
          }
        }
      }

      return {
        pcm: output,
        format: cfg,
        packetBits: packet,
        duration: bits.length * bitFrames / cfg.sampleRate,
        frequencyPairs: wm.pairs,
        frequencies: {
          f0: wm.pairs[0][0],
          f1: wm.pairs[0][1]
        },
        bitRepeat: opt.bitRepeat,
        repeat: repeat,
        crc: SuperPCM.AudioWatermark._crc8(SuperPCM.AudioWatermark._utf8Encode(payload))
      };
    },

    spectrogramTracePCM: function (pcm, format, options) {
      var cfg = assignDefaults( {
        sampleRate: SuperPCM.defaults.sampleRate,
        channels: SuperPCM.defaults.channels,
        bitDepth: SuperPCM.defaults.bitDepth,
        float: SuperPCM.defaults.float
      }, format || {});

      var wm = SuperPCM.AudioWatermark._resolveFrequencyPairs(cfg.sampleRate, options);
      var opt = wm.cfg;
      var extracted = SuperPCM.AudioWatermark._extractChannelFloat(pcm, cfg, opt.channel === "all" ? "mix": opt.channel);
      var bitFrames = Math.max(64, Math.floor(opt.bitDuration * cfg.sampleRate));
      var step = Math.max(1, Math.floor(bitFrames * (opt.scanStepRatio || 0.33)));
      var maxFrames = extracted.frames;
      if (opt.maxScanSeconds != null) maxFrames = Math.min(maxFrames, Math.floor(opt.maxScanSeconds * cfg.sampleRate));

      var trace = [];
      for (var start = 0; start + bitFrames <= maxFrames; start += step) {
        var b = SuperPCM.AudioWatermark._readBitAtPairs(extracted.samples, start, bitFrames, cfg.sampleRate, wm.pairs);
        trace.push({
          time: start / cfg.sampleRate, p0: b.p0, p1: b.p1, bit: b.bit, confidence: b.confidence
        });
      }

      return {
        trace: trace,
        frequencyPairs: wm.pairs,
        frequencies: {
          f0: wm.pairs[0][0],
          f1: wm.pairs[0][1]
        },
        bitDuration: opt.bitDuration
      };
    },


    _bytesToBase64: function (bytes) {
      bytes = SuperPCM.AudioWatermark._normalizeBytes(bytes);
      var s = "";
      for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i] & 0xFF);

      if (typeof btoa !== "undefined") return btoa(s);
      if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");

      var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      var out = "";
      for (var p = 0; p < bytes.length; p += 3) {
        var a = bytes[p] || 0;
        var b = p + 1 < bytes.length ? bytes[p + 1]: 0;
        var c = p + 2 < bytes.length ? bytes[p + 2]: 0;
        var n = (a << 16) | (b << 8) | c;
        out += chars[(n >> 18) & 63];
        out += chars[(n >> 12) & 63];
        out += p + 1 < bytes.length ? chars[(n >> 6) & 63]: "=";
        out += p + 2 < bytes.length ? chars[n & 63]: "=";
      }
      return out;
    },

    _base64ToBytes: function (base64) {
      base64 = String(base64 || "").replace(/\s+/g, "");
      if (typeof atob !== "undefined") {
        var bin = atob(base64);
        var out = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xFF;
        return out;
      }
      if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(base64, "base64"));

      var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      var clean = base64.replace(/=+$/, "");
      var bytes = [];
      var buffer = 0,
      bits = 0;
      for (var p = 0; p < clean.length; p++) {
        var val = chars.indexOf(clean.charAt(p));
        if (val < 0) continue;
        buffer = (buffer << 6) | val;
        bits += 6;
        if (bits >= 8) {
          bits -= 8;
          bytes.push((buffer >> bits) & 0xFF);
        }
      }
      return new Uint8Array(bytes);
    },

    _normalizeBytes: function (bytes) {
      if (bytes == null) return new Uint8Array(0);
      if (bytes instanceof Uint8Array) return bytes;
      if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
      if (ArrayBuffer.isView && ArrayBuffer.isView(bytes)) {
        return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      }
      return new Uint8Array(bytes);
    },

    _normalizeBitmap: function (bitmap) {
      if (!bitmap || !bitmap.width || !bitmap.height || !bitmap.data) {
        throw new Error("AudioWatermark bitmap must be { width, height, data }.");
      }

      var width = Math.max(1, Math.floor(bitmap.width));
      var height = Math.max(1, Math.floor(bitmap.height));
      var total = width * height;
      var data = bitmap.data;
      var out = new Uint8Array(total);

      for (var i = 0; i < total; i++) {
        out[i] = data[i] ? 1: 0;
      }

      return {
        type: "bitmap",
        width: width,
        height: height,
        data: out
      };
    },

    bitmapFromCanvas: function (canvas, options) {
      var opt = assignDefaults( {
        width: null,
        height: null,
        threshold: 128,
        invert: false,
        alphaThreshold: 8
      }, options || {});

      if (!canvas) throw new Error("bitmapFromCanvas requires a canvas, image, ImageBitmap, ImageData, or OffscreenCanvas.");

      var width = Math.max(1, Math.floor(opt.width || canvas.width || 1));
      var height = Math.max(1, Math.floor(opt.height || canvas.height || 1));
      var temp,
      ctx,
      imageData;

      if (canvas.data && canvas.width && canvas.height) {
        // ImageData-like input.
        imageData = canvas;
        width = Math.max(1, Math.floor(opt.width || imageData.width));
        height = Math.max(1, Math.floor(opt.height || imageData.height));
      } else {
        if (typeof OffscreenCanvas !== "undefined") temp = new OffscreenCanvas(width, height);
        else if (typeof document !== "undefined") {
          temp = document.createElement("canvas");
          temp.width = width;
          temp.height = height;
        } else {
          throw new Error("bitmapFromCanvas needs Canvas/OffscreenCanvas support in this environment.");
        }

        ctx = temp.getContext("2d", {
          willReadFrequently: true
        });
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(canvas, 0, 0, width, height);
        imageData = ctx.getImageData(0, 0, width, height);
      }

      var src = imageData.data;
      var out = new Uint8Array(width * height);
      for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
          var idx = (y * width + x) * 4;
          var r = src[idx] || 0,
          g = src[idx + 1] || 0,
          b = src[idx + 2] || 0,
          a = src[idx + 3] == null ? 255: src[idx + 3];
          var lum = 0.299 * r + 0.587 * g + 0.114 * b;
          var bit = a >= opt.alphaThreshold && lum >= opt.threshold ? 1: 0;
          if (opt.invert) bit = bit ? 0: 1;
          out[y * width + x] = bit;
        }
      }

      return {
        type: "bitmap",
        width: width,
        height: height,
        data: out
      };
    },

    bitmapFromText: function (text, options) {
      var opt = assignDefaults( {
        font: "bold 20px sans-serif",
        padding: 4,
        width: null,
        height: null,
        fillStyle: "#fff",
        background: "#000",
        textAlign: "center",
        textBaseline: "middle",
        threshold: 128,
        invert: false,
        maxWidth: 96,
        maxHeight: 32
      }, options || {});

      if (typeof document === "undefined" && typeof OffscreenCanvas === "undefined") {
        throw new Error("bitmapFromText needs Canvas/OffscreenCanvas support.");
      }

      var measureCanvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(1, 1): document.createElement("canvas");
      var measure = measureCanvas.getContext("2d");
      measure.font = opt.font;
      var metrics = measure.measureText(String(text == null ? "": text));
      var measuredWidth = Math.ceil(metrics.width + opt.padding * 2);
      var fontSizeMatch = /([0-9]+(?:\.[0-9]+)?)px/.exec(opt.font);
      var fontSize = fontSizeMatch ? Number(fontSizeMatch[1]): 20;

      var width = Math.max(1, Math.floor(opt.width || Math.min(opt.maxWidth, Math.max(16, measuredWidth))));
      var height = Math.max(1, Math.floor(opt.height || Math.min(opt.maxHeight, Math.max(12, fontSize + opt.padding * 2))));
      var canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(width, height): document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      var ctx = canvas.getContext("2d", {
        willReadFrequently: true
      });
      ctx.fillStyle = opt.background;
      ctx.fillRect(0, 0, width, height);
      ctx.font = opt.font;
      ctx.fillStyle = opt.fillStyle;
      ctx.textAlign = opt.textAlign;
      ctx.textBaseline = opt.textBaseline;
      ctx.fillText(String(text == null ? "": text), width / 2, height / 2, width - opt.padding * 2);

      var bitmap = SuperPCM.AudioWatermark.bitmapFromCanvas(canvas, {
        width: width,
        height: height,
        threshold: opt.threshold,
        invert: opt.invert
      });
      bitmap.text = String(text == null ? "": text);
      return bitmap;
    },

    bitmapToPayload: function (bitmap, options) {
      var opt = assignDefaults( {
        label: ""
      }, options || {});
      var bm = SuperPCM.AudioWatermark._normalizeBitmap(bitmap);
      if (bm.width > 255 || bm.height > 255) {
        throw new Error("AudioWatermark bitmap payload supports max 255x255. Downscale first.");
      }

      var pixelCount = bm.width * bm.height;
      var byteCount = Math.ceil(pixelCount / 8);
      var packed = new Uint8Array(4 + byteCount);
      packed[0] = bm.width & 0xFF;
      packed[1] = bm.height & 0xFF;
      packed[2] = 1; // 1-bit bitmap version
      packed[3] = 0; // flags reserved

      for (var i = 0; i < pixelCount; i++) {
        if (bm.data[i]) packed[4 + (i >> 3)] |= 1 << (7 - (i & 7));
      }

      var b64 = SuperPCM.AudioWatermark._bytesToBase64(packed);
      var label = opt.label ? String(opt.label).replace(/[|\n\r]/g, " "): "";
      return "SPWM_BITMAP_V1|" + label + "|" + b64;
    },

    payloadToBitmap: function (payload) {
      payload = String(payload == null ? "": payload);
      if (payload.indexOf("SPWM_BITMAP_V1|") !== 0) return null;
      var parts = payload.split("|");
      if (parts.length < 3) return null;

      var label = parts[1] || "";
      var bytes = SuperPCM.AudioWatermark._base64ToBytes(parts.slice(2).join("|"));
      if (bytes.length < 4) return null;

      var width = bytes[0] || 1;
      var height = bytes[1] || 1;
      var version = bytes[2];
      if (version !== 1) return null;

      var pixelCount = width * height;
      var data = new Uint8Array(pixelCount);
      for (var i = 0; i < pixelCount; i++) {
        data[i] = (bytes[4 + (i >> 3)] >> (7 - (i & 7))) & 1;
      }

      return {
        type: "bitmap",
        label: label,
        width: width,
        height: height,
        data: data
      };
    },

    bitmapToASCII: function (bitmap, options) {
      var opt = assignDefaults( {
        on: "█", off: " "
      }, options || {});
      var bm = SuperPCM.AudioWatermark._normalizeBitmap(bitmap);
      var rows = [];
      for (var y = 0; y < bm.height; y++) {
        var row = "";
        for (var x = 0; x < bm.width; x++) row += bm.data[y * bm.width + x] ? opt.on: opt.off;
        rows.push(row);
      }
      return rows.join("\n");
    },

    bitmapToCanvas: function (bitmap, canvas, options) {
      var opt = assignDefaults( {
        scale: 4, on: "#fff", off: "#000"
      }, options || {});
      var bm = SuperPCM.AudioWatermark._normalizeBitmap(bitmap);
      var scale = Math.max(1, Math.floor(opt.scale || 1));

      if (!canvas) {
        if (typeof OffscreenCanvas !== "undefined") canvas = new OffscreenCanvas(bm.width * scale, bm.height * scale);
        else if (typeof document !== "undefined") canvas = document.createElement("canvas");
        else throw new Error("bitmapToCanvas needs Canvas/OffscreenCanvas support.");
      }

      canvas.width = bm.width * scale;
      canvas.height = bm.height * scale;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = opt.off;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = opt.on;
      for (var y = 0; y < bm.height; y++) {
        for (var x = 0; x < bm.width; x++) {
          if (bm.data[y * bm.width + x]) ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
      return canvas;
    },

    embedBitmapPCM: function (pcm, format, source, options) {
      var opt = assignDefaults( {
        bitmap: null,
        sourceType: "auto", // "auto", "bitmap", "canvas", "text"
        bitmapOptions: {},
        textOptions: {},
        label: ""
      }, options || {});

      var bitmap;
      if (opt.bitmap) bitmap = opt.bitmap;
      else if (opt.sourceType === "text" || typeof source === "string") bitmap = SuperPCM.AudioWatermark.bitmapFromText(source, opt.textOptions || opt.bitmapOptions || opt);
      else if (opt.sourceType === "bitmap" || (source && source.width && source.height && source.data)) bitmap = source;
      else bitmap = SuperPCM.AudioWatermark.bitmapFromCanvas(source, opt.bitmapOptions || opt);

      bitmap = SuperPCM.AudioWatermark._normalizeBitmap(bitmap);
      var payload = SuperPCM.AudioWatermark.bitmapToPayload(bitmap, {
        label: opt.label
      });
      var result = SuperPCM.AudioWatermark.embedPCM(pcm, format, payload, opt);
      result.bitmap = bitmap;
      result.bitmapPayload = payload;
      return result;
    },

    detectBitmapPCM: function (pcm, format, options) {
      var detected = SuperPCM.AudioWatermark.detectPCM(pcm, format, options || {});
      var bitmaps = [];
      for (var i = 0; i < detected.matches.length; i++) {
        var bm = SuperPCM.AudioWatermark.payloadToBitmap(detected.matches[i].text);
        if (bm) {
          bitmaps.push(assignDefaults(assignDefaults( {}, detected.matches[i]), {
            bitmap: bm,
            ascii: SuperPCM.AudioWatermark.bitmapToASCII(bm)
          }));
        }
      }
      detected.bitmaps = bitmaps;
      return detected;
    },

    detectPCM: function (pcm, format, options) {
      var cfg = assignDefaults( {
        sampleRate: SuperPCM.defaults.sampleRate,
        channels: SuperPCM.defaults.channels,
        bitDepth: SuperPCM.defaults.bitDepth,
        float: SuperPCM.defaults.float
      }, format || {});

      var wm = SuperPCM.AudioWatermark._resolveFrequencyPairs(cfg.sampleRate, options);
      var opt = wm.cfg;
      var bitRepeat = Math.max(1, Math.floor(opt.bitRepeat || 1));
      var extracted = SuperPCM.AudioWatermark._extractChannelFloat(pcm, cfg, opt.channel === "all" ? "mix": opt.channel);
      var bitFrames = Math.max(64, Math.floor(opt.bitDuration * cfg.sampleRate));
      var step = Math.max(1, Math.floor(bitFrames * (opt.scanStepRatio || 0.33)));
      var maxFrames = extracted.frames;
      if (opt.maxScanSeconds != null) maxFrames = Math.min(maxFrames, Math.floor(opt.maxScanSeconds * cfg.sampleRate));

      var sync = SuperPCM.AudioWatermark.syncBits;
      var minScore = opt.minSyncScore || 0.72;
      var matches = [];
      var trace = [];
      var lastAcceptedFrame = -Infinity;

      for (var start = 0; start + sync.length * bitRepeat * bitFrames <= maxFrames; start += step) {
        var syncRead = SuperPCM.AudioWatermark._readRepeatedBitsAt(extracted.samples, start, sync.length, bitFrames, cfg.sampleRate, wm.pairs, bitRepeat);
        var correct = 0;
        var confidenceSum = 0;
        for (var s = 0; s < sync.length; s++) {
          if (syncRead.bits[s] === sync[s]) correct++;
          confidenceSum += syncRead.confidence[s] || 0;
        }

        var syncScore = correct / sync.length;
        var avgSyncConfidence = confidenceSum / sync.length;
        trace.push({
          time: start / cfg.sampleRate, syncScore: syncScore, confidence: avgSyncConfidence
        });

        if (syncScore < minScore) continue;
        if (avgSyncConfidence < opt.minConfidence) continue;
        if (start - lastAcceptedFrame < bitFrames * sync.length * bitRepeat) continue;

        var lengthStart = start + sync.length * bitRepeat * bitFrames;
        if (lengthStart + 16 * bitRepeat * bitFrames > maxFrames) continue;

        var lenRead = SuperPCM.AudioWatermark._readRepeatedBitsAt(extracted.samples, lengthStart, 16, bitFrames, cfg.sampleRate, wm.pairs, bitRepeat);
        var byteLength = SuperPCM.AudioWatermark._bitsToNumber(lenRead.bits, 0, 16);
        if (byteLength <= 0 || byteLength > opt.payloadMaxBytes) continue;

        var payloadBitCount = byteLength * 8;
        var payloadStart = lengthStart + 16 * bitRepeat * bitFrames;
        var crcStart = payloadStart + payloadBitCount * bitRepeat * bitFrames;
        if (crcStart + 8 * bitRepeat * bitFrames > extracted.frames) continue;

        var payloadRead = SuperPCM.AudioWatermark._readRepeatedBitsAt(extracted.samples, payloadStart, payloadBitCount, bitFrames, cfg.sampleRate, wm.pairs, bitRepeat);
        var crcRead = SuperPCM.AudioWatermark._readRepeatedBitsAt(extracted.samples, crcStart, 8, bitFrames, cfg.sampleRate, wm.pairs, bitRepeat);
        var bytes = SuperPCM.AudioWatermark._bitsToBytes(payloadRead.bits);
        var crcExpected = SuperPCM.AudioWatermark._bitsToNumber(crcRead.bits, 0, 8);
        var crcActual = SuperPCM.AudioWatermark._crc8(bytes);
        var crcOk = crcExpected === crcActual;
        var text = SuperPCM.AudioWatermark._utf8Decode(bytes);

        var totalConf = avgSyncConfidence;
        var confCount = 1;
        var allConf = lenRead.confidence.concat(payloadRead.confidence).concat(crcRead.confidence);
        for (var ci = 0; ci < allConf.length; ci++) {
          totalConf += allConf[ci] || 0; confCount++;
        }

        // Accept CRC matches immediately. If CRC fails, still report a low-trust
        // candidate because spectrogram tracing may be useful after heavy edits.
        matches.push({
          time: start / cfg.sampleRate,
          frame: start,
          text: text,
          byteLength: byteLength,
          syncScore: syncScore,
          confidence: totalConf / confCount,
          crcOk: crcOk,
          crcExpected: crcExpected,
          crcActual: crcActual
        });

        lastAcceptedFrame = start;
      }

      // Prefer verified matches first.
      matches.sort(function (a, b) {
        if (a.crcOk !== b.crcOk) return a.crcOk ? -1: 1;
        return b.confidence - a.confidence;
      });

      return {
        matches: matches,
        trace: trace,
        frequencyPairs: wm.pairs,
        frequencies: {
          f0: wm.pairs[0][0], f1: wm.pairs[0][1]
        },
        bitDuration: opt.bitDuration,
        bitRepeat: bitRepeat
      };
    }
  };

  // Attach to global
  global.SuperPCM = SuperPCM;
})(typeof window !== 'undefined' ? window: (typeof globalThis !== 'undefined' ? globalThis: this));