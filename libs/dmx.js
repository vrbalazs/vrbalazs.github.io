import server from './server.js'

const DMX_STATE_SEND_INTERVAL = 50;
const DMX_LAST_STATE_RESEND_TIME = 500;

export default class Dmx {
  static get FRAME_SIZE() { return 518; }

  static get VALUES() { return [
    {name:'pan', offset:5, bytes:2, max:65535, steps: 1000,},
    {name:'tilt', offset:7, bytes:2, max:65535, steps: 1000},
    {name:'lum', offset:25, bytes:2, max:65535, steps: 1000, interpolate:1},
    {name:'red', offset:12, bytes:2, max:65535, steps: 1000, interpolate:1},
    {name:'green', offset:14, bytes:2, max:65535, steps: 1000, interpolate:1},
    {name:'blue', offset:16, bytes:2, max:65535, steps: 1000, interpolate:1},
    {name:'zoom', offset:22, bytes:2, max:65535, steps: 1000},
    {name:'time', offset:9, bytes:1, max:100, steps: 100},
  ];}

  static DMXTimer() {
    let nextBlock = false;

    if (this.block0 && this.block1) {
      const block = this.blockToSend;
      const time = this.getVal(this.block1, 0, 'time')*100;
      const t = this.lastT = Date.now();
      const r = time?Math.max(0, Math.min((t-this.t0)/time, 1)):1;
      for (const [idx, item] of this.VALUES.entries()) {
        const v1 = this.getVal(this.block1, 0, idx);
        if (v1 !== 1000) {
          if (item.interpolate) {
            const v0 = this.getVal(this.block0, 0, idx);
            this.setVal(block, 0, idx, (v1-v0)*r+v0);
          }
        } else {
          this.setVal(block, 0, idx, this.getVal(this.sentBlock, 0, idx));
        }
      }

      if (r>=1) {
        nextBlock = (this.sequenceIdx+1)*this.FRAME_SIZE < this.sequence.length;
        if (!nextBlock) {
          this.block0 = this.block1 = null;
          this.t0 = 0;
        }
      }
    }

    if (this.sequence && ((this.sequenceIdx+1)*this.FRAME_SIZE < this.sequence.length)) {
      this.setVal(this.blockToSend, 0, 'time', this.getVal(this.sequence, this.sequenceIdx+1, 'time')*2);
    }

    //console.log(this.blockToSend[24]);    ///!///

    server.writeSerial(this.blockToSend);
    this.sentBlock.set(this.blockToSend);

    if (Date.now() - this.lastT < DMX_LAST_STATE_RESEND_TIME) {
      setTimeout(()=>this.DMXTimer(), DMX_STATE_SEND_INTERVAL);
    } else {
      this.timerActive = false;
    }

    if (nextBlock) {
      this.sendBlock(this.sequence, ++this.sequenceIdx, true);
    }
  }

  static sendFrame(frame) {
    this.lastT = Date.now();
    this.blockToSend.set(frame);
    if (!this.timerActive) {
      this.timerActive = true;
      server.resetSerial().then(()=>this.DMXTimer());
    }
  }

  static sendBlock(dmx, block, interpolate) {
    if (!dmx || !dmx.length) return;

    const fs = Dmx.FRAME_SIZE;
    const blockoffset = fs*block;
    const frame = dmx.slice(blockoffset, blockoffset+fs);
    if (!interpolate) {
      this.sequence = null;
      this.block0 = this.block1 = null;
      this.t0 = 0;
      this.setVal(frame, 0, 'time', 0);
      if (this.sentBlock[0]) {
        for (const [idx] of this.VALUES.entries()) {
          const v1 = this.getVal(frame, 0, idx);
          if (v1 === 1000) this.setVal(frame, 0, idx, this.getVal(this.sentBlock, 0, idx));
        }
      }
    } else {
      this.t0 = Date.now();
      this.block0 = this.blockToSend.slice();
      if (!this.block0) {
        this.block0 = new Uint8Array(this.FRAME_SIZE);
        this.initBlock(this.block0, 0);
      }
      this.block1 = frame;
    }
    this.sendFrame(frame);
  }

  static resetTime() {
    if (!this.sentBlock[0]) return;

    const frame = this.sentBlock.slice();
    this.setVal(frame, 0, 'time', 0);
    this.sendFrame(frame);
  }

  static playSequence(dmx) {
    if (!dmx || !dmx.length) return;

    this.sequence = new Uint8Array(dmx.length+this.FRAME_SIZE);
    this.sequence.set(dmx, this.FRAME_SIZE);
    if (!this.sentBlock[0]) this.initBlock(this.sentBlock, 0);
    this.sequence.set(this.sentBlock, 0);
    this.setVal(this.sequence, 0, 'time', 0);
    this.sequenceIdx = 0;
    this.sendBlock(this.sequence, 0, true);
  }

  static getVal(dmx, block, slideridx) {
    if (!dmx || !dmx[0]) return -1;
    if (typeof slideridx === 'string') slideridx = this.VALUESMAP[slideridx].idx;
    const slider = this.VALUES[slideridx];
    const offset = slider.offset;
    let val = dmx[this.FRAME_SIZE*block+offset];
    if (slider.bytes>1) {
      val = val*256 + dmx[this.FRAME_SIZE*block+offset+1];
    }
    return Math.round(val / slider.max * slider.steps);
  }

  static setVal(dmx, block, slideridx, value) {
    if (typeof slideridx === 'string') slideridx = this.VALUESMAP[slideridx].idx;
    const slider = this.VALUES[slideridx];
    value = Math.round(value / slider.steps * slider.max);
    const offset = slider.offset;
    value = Math.max(0, Math.min(value, slider.max));
    const blockoffset = this.FRAME_SIZE*block;
    dmx[blockoffset+offset] = value>>(slider.bytes>1?8:0);
    if (slider.bytes>1) dmx[blockoffset+offset+1] = value & 255;
    // if (slider.name === 'lum') {
    //   dmx[blockoffset+24] = (value>0)?255:0;
    // }
    dmx[blockoffset+24] = 255;
    dmx[blockoffset+21] = 255;
  }

  static initBlock(dmx, idx) {
    const fs = Dmx.FRAME_SIZE;
    const offset = fs*idx;
    dmx[offset+0] = 0x7e;
    dmx[offset+1] = 0x06;
    dmx[offset+2] = 0x01;
    dmx[offset+3] = 0x02;
    dmx[offset+4] = 0x00;
    dmx[offset+5] = 0x00;
    dmx[offset+10] = 45;    //pan-tilt time mode
    dmx[fs-1] = 0xe7;
  }

  static addBlock(dmx, idx) {
    const fs = Dmx.FRAME_SIZE;
    const old = dmx;
    dmx = new Uint8Array(old.byteLength+fs);
    dmx.set(old, 0, fs*idx);
    dmx.set(old.slice(fs*idx), (idx+1)*fs);

    if (idx>0) {
      dmx.set(old.slice((idx-1)*fs, idx*fs), fs*idx);
    } else {
      this.initBlock(dmx, idx);
    }

    return dmx;
  }

  static removeBlock(dmx, idx) {
    const old = dmx;
    if (old.byteLength<=0) {
      console.log('error: invalid DMX array length');
    } else {
      dmx = new Uint8Array(old.byteLength-this.FRAME_SIZE);
      dmx.set(old.slice(0, idx*this.FRAME_SIZE), 0);
      dmx.set(old.slice((idx+1)*this.FRAME_SIZE), idx*this.FRAME_SIZE);
    }
    return dmx;
  }
}

Dmx.VALUESMAP = Dmx.VALUES.reduce((acc, act, idx)=> Object.assign(acc, {[act.name]:Object.assign(act, {idx})}), {});
Dmx.blockToSend = new Uint8Array(Dmx.FRAME_SIZE);
Dmx.sentBlock = new Uint8Array(Dmx.FRAME_SIZE);
Dmx.t0 = 0;
