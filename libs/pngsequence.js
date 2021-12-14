import u from './utils.js'

const USE_IMAGEDATA = false;
const USE_IMAGECANVAS = false;

export default class PngSequence {
  constructor(element, src, frames, fps, callback, externalTimer) {
    this.state = 'idle';
    this.element = element;
    this.time = 0;
    this.fps = fps;
    this.numframes = frames;
    this.externalTimer = externalTimer;

    let numdigits = 0;
    let firstframe = 0;
    const template = src.replace(/_(\d+)(\.\w+["\)]*)$/, (m,$1,$2)=>{
      firstframe = parseInt($1);
      numdigits = $1.length;
      return '_{#}'+$2;
    });
    this.numframes -= firstframe;

    const imgs = [];
    for (let i=firstframe;i<frames;i++) imgs.push(u.loadImage(template.replace('{#}', u.pad(i, numdigits))));
    Promise.all(imgs).then(results=>{
      this.frames = results;
      this.width = element.width = results[0].width;
      this.height = element.height = results[0].height;
      this.ctx = element.getContext('2d');

      if (USE_IMAGEDATA) {
        this.buffers = results.map(img=>{
          const canvas = document.createElement('canvas');
          canvas.width = this.width;
          canvas.height = this.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          return ctx.getImageData(0, 0, canvas.width, canvas.height);
        });
      } else if (USE_IMAGECANVAS) {
        this.frames = results.map(img=>{
          const canvas = document.createElement('canvas');
          canvas.width = this.width;
          canvas.height = this.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          return canvas;
        });
      }

      if (callback) callback();
    });
  }

  start(loop) {
    this.stopped = false;
    this.loop = loop || false;
    this.t0 = 0;

    if (this.state === 'idle') {
      this.state = 'playing';
      if (!this.externalTimer) {
        this.updateFrame(performance.now());
      }
    }
  }

  resume(loop) {
    const frametime = this.frametime || 0;
    this.start(loop);
    this.t0 = performance.now() - frametime/this.fps*1000;
  }

  stopLoop() {
    if (this.loop) {
      const timestamp = performance.now();
      let frametime = ((timestamp - this.t0)/1000 * this.fps) % this.numframes;
      this.t0 = timestamp - frametime/this.fps*1000;
      this.loop = false;
    }
  }

  stop() {
    this.stopped = true;
  }

  updateFrame(timestamp) {
    //const timestamp = performance.now();
    if (this.stopped || this.state === 'idle') {
      this.state = 'idle';
      return;
    }

    let idx = 0;

    if (this.frames) {
      this.t0 = this.t0 || timestamp;

      // if (timestamp<this.t0) {
      //   console.log('time sleep: '+(this.t0-timestamp));      ///!///
      // }

      let frametime = (timestamp - this.t0)/1000 * this.fps;
      if (this.loop) {
        frametime = frametime % this.numframes;
      } else {
        frametime = Math.min(frametime, this.numframes-1);
      }

      this.frametime = frametime;

      idx = Math.floor(frametime);
      if (idx !== this.lastframe) {
        this.lastframe = idx;
        if (USE_IMAGEDATA) {
          this.ctx.putImageData(this.buffers[idx], 0, 0);
        } else {
          this.ctx.clearRect(0,0, this.width, this.height);
          this.ctx.drawImage(this.frames[idx], 0, 0);
        }

        //console.log(str);
        //this.element.src = str;
      }
    }

    if (this.loop || idx<this.numframes-1) {
      if (!this.externalTimer) {
        setTimeout(()=>this.updateFrame(performance.now()), 16.7);
      }
      // requestAnimationFrame(()=>this.updateFrame());
    } else {
      this.state = 'idle';
    }
  }
}
