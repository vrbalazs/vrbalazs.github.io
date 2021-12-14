import u from './utils.js'

export default class Scroller {
  constructor(element, orientation, hideScrollbar, force) {
    this.vertical = orientation !== 'horizontal';
    this.element = element;
    this.rpi = window.queryParams.rpi !== undefined || force;
    if (hideScrollbar) {
      this.element.style[this.vertical?'overflowY':'overflowX'] = this.rpi?'hidden':'auto';
    }
    this.element.classList.add('scrollable');

    if (this.rpi) {
      $(element).on('touchstart mousedown', e=>{
        this.p0 = u.relativeCoords(e, element, true);
        this.scrolltop0 = this.vertical?element.scrollTop:element.scrollLeft;
        this.lastpos = [this.p0[this.vertical?1:0]];
        this.lastt = [performance.now()];
        this.stop();
      });

      $(window).on('touchmove mousemove', e=>{
        if (this.p0) {
          const c = u.relativeCoords(e, element);
          const t = performance.now();
          this.lastpos.push(c[this.vertical?1:0]);
          this.lastt.push(t);
          this.trimHistory(t);

          if (this.vertical) {
            element.scrollTop = this.scrolltop0 - (c[1] - this.p0[1]);
          } else {
            element.scrollLeft = this.scrolltop0 - (c[0] - this.p0[0]);
          }
        }
      });

      $(window).on('mouseup touchend', e=>{
        if (this.p0) {
          this.p0 = false;

          const t = performance.now();
          this.trimHistory(t);

          if (this.lastt.length<2) {
            this.velocity = 0;
          } else {
            const dt = this.lastt[this.lastt.length-1] - this.lastt[0];
            const diff = this.lastpos[this.lastpos.length-1] - this.lastpos[0];
            this.velocity = diff / (Math.max(dt, 1)/1000);
          }

          if (this.velocity) {
            this.lastt = performance.now();
            this.scrollpos = this.vertical ? element.scrollTop : element.scrollLeft;
            this.req = requestAnimationFrame(()=>this.timer());
          }
        }
      });
    } else {
      this.element.style.touchAction = 'auto';
      this.element.style['-webkit-overflow-scrolling'] = 'touch';
      this.element.classList.add('hiddenscrollbar');
    }
  }

  trimHistory(t) {
    while (t - this.lastt[0] > 150) {
      this.lastt.shift();
      this.lastpos.shift();
    }
  }

  timer() {
    const t = performance.now();
    const dt = (t - this.lastt)/1000;
    this.lastt = t;

    const dumper = 3;

    if (this.velocity>0) {
      this.velocity = Math.max(this.velocity - this.velocity*dt*dumper, 0);
    } else {
      this.velocity = Math.min(this.velocity - this.velocity*dt*dumper, 0);
    }

    if (this.velocity*this.velocity < 10) {
      this.velocity = 0;
    }

    this.scrollpos -= this.velocity*dt;

    if (this.vertical) {
      this.element.scrollTop = this.scrollpos;
    } else {
      this.element.scrollLeft = this.scrollpos;
    }

    if (this.velocity) {
      this.req = requestAnimationFrame(()=>this.timer());
    } else {
      this.req = null;
    }
  }

  stop() {
    this.velocity = 0;
    if (this.req) {
      cancelAnimationFrame(this.req);
      this.req = null;
    }
  }
}