import u from './utils.js'

export default class Carousel {
  constructor(params) {
    this.params = Object.assign({
      num_visible_elements: 6,
      back_elements_y: 211,
      back_elements_darken: 0.75,
      front_elements_y: 820,
      front_elements_darken: 0.3,
      snap_time: 500,
      coeff: 100,
      coeff2: -0.07,
      scalec: 100,
      scalemult: 5.2, 
      swipe_height: 540,
      darken_background: true,
    }, params);

    this.holder = params.holder;
    this.onSelect = params.onSelect;
    this.onTouch = params.onTouch;
    this.onShow = params.onShow;

    this.carouselTouch = null;
    this.pos = 0;
    this.elements = [];

    $(this.holder).on('touchstart mousedown', e=>{
      e.preventDefault();
      e.stopPropagation();

      if (this.onTouch) this.onTouch(e);

      const coords = u.relativeCoords(e, wrapper, true);
      if (coords) {
        this.carouselTouch = coords;
        this.pos0 = this.pos;
      }
    });

    $(this.holder).on('wheel', e=>{
      const delta = e.originalEvent.deltaY;
      if (!delta) return;

      const target = (this.snapTarget === undefined)?this.pos:this.snapTarget;
      this.snapTarget = (target+(delta>0?1:-1)) % this.elements.length;
      while (this.snapTarget<0) this.snapTarget += this.elements.length;

      const turnaround = Math.abs(this.snapTarget - this.pos)>2;
      const diff = Math.max(-1, Math.min(this.snapTarget - this.pos, 1));
      this.snapT0 = Date.now() - (1-u.invSmoothstep(Math.abs(diff)))*this.params.snap_time;
      this.snapStart = this.snapTarget + (diff>0?-1:1) * (turnaround?-1:1);
      this.carouselTouch = null;
      if (this.onSelect) {
        this.onSelect(this.snapTarget % this.elements.length);
      }
    });

    $(window).on('mousemove touchmove', e=>{
      const tpos = this.touchPos = u.relativeCoords(e, wrapper);
      if (this.carouselTouch) {
        let newpos = (this.pos0 + (tpos[1] - this.carouselTouch[1])/this.params.swipe_height);

        let l = newpos-(this.pos0+1);
        if (l>0) newpos = l/(l*5+1) + (this.pos0+1);
        l = (this.pos0-1)-newpos;
        if (l>0) newpos = (this.pos0-1) - l/(l*5+1);

        //newpos = Math.max(this.pos0-1, Math.min(newpos, this.pos0+1));

        if (newpos<0) newpos += this.elements.length;
        this.pos = newpos  % this.elements.length;
        this.updateCards = true;
      }
    });

    $(window).on('mouseup touchend', e=>{
      if (this.carouselTouch) {
        let pos = this.pos;
        this.snapTarget = (this.touchPos[1] > this.carouselTouch[1]) ? Math.ceil(pos-0.2) : Math.floor(pos+0.2);
        const diff = this.snapTarget - pos;
        this.snapT0 = Date.now() - (1-u.invSmoothstep(Math.abs(diff)))*this.params.snap_time;
        this.snapStart = this.snapTarget - 1*(diff>0?1:-1);
        this.carouselTouch = null;
        if (this.onSelect) this.onSelect(this.snapTarget % this.elements.length);
      }
    });

    (params.elements||[]).forEach(elem=>this.addElement(elem));

    this.init();
  }

  addElement(element) {
    this.elements.push(element);
    this.holder.appendChild(element);
    element.style.transformOrigin = '50% 0%';
  }

  getPos() {
    return Math.round(this.pos % this.elements.length);
  }

  setPos(pos) {
    this.snapTarget = this.pos = pos;
    this.updateCards = true;
  }

  init() {
    this.updateCards = true;
    this.updateFrame();
  }

  showElement(element) {
    if (!element.showed) {
      element.showed = true;
      if (this.onShow) this.onShow(element);
    }
  }

  updateElement(element, idx) {
    const pos = this.pos;
    const p = this.params;

    const numcards = this.elements.length;
    let distance = idx - pos;
    if (distance<-1) distance += numcards;

    if (distance>=p.num_visible_elements) {
      element.style.display = 'none';
      return;
    }

    this.showElement(element);
    element.style.display = 'block';
    
    element.style.zIndex = Math.floor(numcards+1 - distance);

    const md = p.num_visible_elements-1;
    const cmax = 1/(md*md*p.coeff2 + md+p.coeff) - (1/p.coeff);
    let c2 = (1/(distance*distance*p.coeff2 + distance+p.coeff)- (1/p.coeff)) /-cmax;
    if (distance>(p.num_visible_elements-1)) {
      let dd = p.num_visible_elements - distance - 1;
      c2 += dd*dd;
    }

    const v = Math.min(Math.max(0, distance+1), 1);
    const y = u.lerp(-distance*p.front_elements_y, c2*p.back_elements_y, v);
    const scale = Math.max(Math.min((p.scalec/(distance+p.scalec)-1)*p.scalemult+1, 1), 0);

    const d1 = -distance*p.front_elements_darken;
    const d = (distance<0)?d1*d1:distance / numcards * p.back_elements_darken;

    const c = Math.floor(Math.min(Math.max(0, 1-d), 1)*255);

    // element.style.clip = `rect(0px,1300px,${this.lastTop-y}px,0px)`;
    //this.lastTop = y;

    element.style.transform = `translateY(${y}px) scale(${scale})`;
    // if (p.darken_background && element.bgelement) {
    //   element.bgelement.style.filter = `brightness(${c/2.55}%)`;// `rgb(${c},${c},${c})`;
    //   //element.style.filter = `brightness(${c/2.55}%)`;// `rgb(${c},${c},${c})`;
    // }
  }

  updateFrame() {
    const t = Date.now();
    if (this.snapT0) {
      const r = u.clamp((t - this.snapT0) / this.params.snap_time, 0, 1);
      let newpos = u.lerp(this.snapStart, this.snapTarget, u.smoothstep(r))
      if (newpos<0) newpos += this.elements.length;
      this.pos = newpos  % this.elements.length;
      if (r>=1) {
        this.snapT0 = 0;
        // if (this.onSelect) this.onSelect(this.snapTarget % this.elements.length);
      }
      this.updateCards = true;
    }

    if (this.updateCards) {
      this.updateCards = false;
      //this.lastTop = this.holder.clientHeight;
      this.elements.forEach((element, idx)=> {
        this.updateElement(element, idx);
      });
    }

    if (this.updatePending) return;

    this.updatePending = true;
    requestAnimationFrame(()=>{
      this.updatePending = false;
      this.updateFrame();
    });
  }
}
