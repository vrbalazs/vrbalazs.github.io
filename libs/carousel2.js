import Scroller from './scroller.js'

const smoothStep = (x) => (x<=0 ? 0 : (x>=1 ? 1 : x * x * (3 - 2 * x)));
const absMax = (v, max) => (v>max ? max : (v<-max ? -max : v));
const absMin = (v, min) => (v>0 ? Math.max(v, min) : Math.min(v, -min));

export default class Carousel2 {
  constructor(params) {
    this.params = params;
    this.params.gap = this.params.gap !== undefined ? this.params.gap : 10;    // Gap between items in pixels
    this.params.itemSize = this.params.itemSize || [200,150];   // Size of the items in pixels [x,y]
    this.params.fadeTime = this.params.fadeTime !== undefined ? this.params.fadeTime : 500;         // Time of the fade in / fade out animation (ms)
    this.params.moveMinVelocity = this.params.moveMinVelocity !== undefined ? this.params.moveMinVelocity : 10;    // Minimum velocity of animating items (pixel/s)
    this.params.moveVelocity = this.params.moveVelocity !== undefined ? this.params.moveVelocity : 20;          // Moving speed of animating items (coefficient)
    this.params.moveAcceleration = this.params.moveAcceleration !== undefined ? this.params.moveAcceleration : 40;  // Acceleration of animating items (coefficient)
    this.params.orientation = this.params.orientation || 'horizontal';  // Orientation of the carousel ('horizontal' | 'vertical')

    this.vertical = this.params.orientation === 'vertical';
    this.removedItems = new Set();
    this.initial = true;

    this.itemSize = this.vertical ? this.params.itemSize[1] : this.params.itemSize[0];
    this.step = this.itemSize + this.params.gap;

    this.carousel = document.createElement('div');
    this.carousel.classList.add('carousel-component', 'scrollable');
    this.elementContainer = document.createElement('div');
    this.elementContainer.style.position = 'relative';
    this.elementContainer.style.overflow = 'hidden';
    this.elementContainer.style[this.vertical?'width':'height'] = '100%';

    this.carousel.appendChild(this.elementContainer);
    // this.carousel.addEventListener('scroll', e=>
    // {
    //   console.log(this.carousel.scrollLeft);

    // });

    Object.assign(this.carousel.style, {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      //backgroundColor: 'yellow',
      overflowX: this.vertical ? 'hidden' : 'scroll',
      overflowY: this.vertical ? 'scroll' : 'hidden',
    });

    params.container.appendChild(this.carousel);
    let prev = null;

    this.items = (params.items||[]).map((element, idx)=>{
      const item = {element, idx, fadeState:1, pos:0, velocity:0, prev, next:null, added:true};
      this.tail = this.tail || item;
      if (prev) prev.next = item;
      Object.assign(element.style, {position:'absolute', zIndex:2000-idx});
      this.elementContainer.appendChild(element);
      item.hidden = element.hidden !== undefined ? element.hidden : false;
      delete element.hidden;
      Object.defineProperty(element, 'hidden', {
        get: ()=> item.hidden !== undefined ? item.hidden : false,
        set: (hidden)=> this.setHidden(item, hidden),
      });
      prev = item;
      return item;
    });

    this.head = prev;

   // new Scroller(this.carousel, this.params.orientation, true, true);

    this.requestTimer();
  }

  setHidden(item, hidden) {
    if (item.hidden === hidden) return;

    item.hidden = hidden;
    if (hidden) {
      item.fadeTarget = 0;
      this.removeItem(item);
    } else {
      item.fadeTarget = 1;
      this.addItem(item);
    }

    this.requestTimer();
  }

  removeItem(item) {
    if (item.prev) {
      item.prev.next = item.next;
    } else {
      this.tail = item.next;
    }

    if (item.next) {
      item.next.prev = item.prev;
    } else {
      this.head = item.prev;
    }

    item.added = false;
    this.removedItems.add(item);
  }

  addItem(item) {
    let prevIdx = item.idx-1;
    let nextIdx = item.idx+1;
    while (prevIdx>=0 && !this.items[prevIdx].added) prevIdx--;
    while (nextIdx<this.items.length && !this.items[nextIdx].added) nextIdx++;
    const prev = this.items[prevIdx] || null;
    const next = this.items[nextIdx] || null;
    item.prev = prev;
    item.next = next;

    if (prev) {
      prev.next = item;
    } else {
      this.tail = item;
    }

    if (next) {
      next.prev = item;
    } else {
      this.head = item;
    }

    if (!item.added) {
      item.added = true;
      item.pos = item.prev ? item.prev.pos : 0;
      item.velocity = 0;
      this.setItemPos(item);
    }

    this.removedItems.delete(item);
  }

  setItemPos(item) {
    if (this.vertical) {
      item.element.style.top = item.pos+'px';
    } else {
      item.element.style.left = item.pos+'px';
    }
  }

  fadeItem(item, dt) {
    let changed = false;
    const fadeDiff = (item.fadeTarget!==undefined ? item.fadeTarget : item.fadeState) - item.fadeState;
    if (fadeDiff) {
      if (this.params.fadeTime>0)
      {
        if (fadeDiff>0) {
          item.fadeState = Math.min(item.fadeTarget, item.fadeState + dt/this.params.fadeTime);
        } else {
          item.fadeState = Math.max(item.fadeTarget, item.fadeState - dt/this.params.fadeTime);
        }
        item.element.style.opacity = smoothStep(item.fadeState);
      } else {
        item.fadeState = item.fadeTarget;
        item.element.style.opacity = item.fadeTarget;
      }
      item.element.style.zIndex = (item.fadeState >= 1 || item.fadeTarget >= 1 ? 2000 : 1000) - item.idx;
      changed = true;
    }

    return changed;
  }

  animTimer() {
    const t = Date.now();
    const dt = t - this.tLast;
    this.tLast = t;

    this.timerRequest = false;

    let changed = false;
    const initial = this.initial;
    const moveVelocity = this.params.moveVelocity;
    const moveAcceleration = this.params.moveAcceleration;
    const moveMinVelocity = this.params.moveMinVelocity;

    for (const item of this.removedItems) {
      item.pos = item.pos + item.velocity*dt/1000;
      this.setItemPos(item);
      changed = this.fadeItem(item, dt) || changed;
      if (!item.fadeState) this.removedItems.delete(item);
    }

    let item = this.tail;
    while (item) {
      changed = this.fadeItem(item, dt) || changed;

      const prev = item.prev;
      const tPos = prev ? prev.pos + this.step : 0;
      const posDiff = tPos - item.pos;
      if (posDiff) {
        if (initial || moveVelocity<=0) {
          item.pos = tPos;
        } else {
          const targetVelocity = absMin(posDiff * moveVelocity, moveMinVelocity);
          item.velocity += absMax(targetVelocity - item.velocity, Math.abs(targetVelocity)>Math.abs(item.velocity) ? moveAcceleration : 10000);

          if (posDiff>0) {
            item.pos = Math.min(tPos, item.pos + item.velocity*dt/1000);
          } else {
            item.pos = Math.max(tPos, item.pos + item.velocity*dt/1000);
          }
        }

        this.setItemPos(item);

        changed = true;
      }

      item = item.next;
    }

    this.initial = false;

    if (changed) {
      if (this.tail) {
        const size = this.head.pos + this.itemSize;
        this.elementContainer.style[this.vertical?'height':'width'] = `${size}px`;
      }
      this.requestTimer();
    }
  }

  reset() {
    for (const item of this.items) item.element.hidden = false;
    this.carousel.scrollTo({left:0, top: 0, behavior: 'smooth'});
  }

  requestTimer() {
    if (!this.timerRequest) {
      this.timerRequest = true;
      this.tLast = Date.now();  
      requestAnimationFrame(()=>this.animTimer());
    }
  }
}
