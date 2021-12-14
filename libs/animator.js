import u from './utils.js'

//const TIMER_INTERVAL = 16.6667;
const TIMER_INTERVAL = 20;
//const TIMER_INTERVAL = 17;
const USE_SETINTERVAL = true;

const instances = [];
const hooks = [];
let timerInitialized = false;

function setval(t0, time, delay, loop, v0, v1) {
  if (v0.constructor !== Array) v0 = [v0];
  if (v1.constructor !== Array) v1 = [v1];
  for (let i=0;i<v1.length;i++) {
    let postfix = (typeof v0[i] === 'string')?(v0[i].match(/(\D+)$/)||{})[1]||'':'';
    v0[i] = [parseFloat(v0[i]), postfix];
    v1[i] = [parseFloat(v1[i]), postfix];
  }

  return {t0, time, delay, loop, v0, v1};
}

function writeColor(val) {
  return `rgb${val.length>3?'a':''}(${val.join(',')})`;
}

function interpolateVal(val, t) {
  const rt = Math.max((t - val.delay - val.t0)/val.time, 0);
  const r = val.loop?Math.sin(((rt%1)+0.75)*Math.PI*2)/2+0.5:u.smootherstep(Math.min(1, rt));
  let v = [];
  for (let i=0;i<val.v1.length;i++) {
    v[i] = u.lerp(val.v0[i][0], val.v1[i][0], r) + val.v1[i][1];
  }

  if (v.length===1) v = v[0];
  return {val:v, r};
}

//let lastt = performance.now();

function animatorTimer() {
  const t = performance.now();

  //requestAnimationFrame(animatorTimer);
  // if (t - lastt <= 16) {
    //console.log(t - lastt);
  // }
  //lastt = t;

  //setTimeout(animatorTimer, 16.6667);

  for (const inst of instances) {
    inst.applyState(t);
  }

  for (const hook of hooks) hook(t);

  if (!USE_SETINTERVAL) {
    setTimeout(animatorTimer, TIMER_INTERVAL);
  }

}

export default class Animator {
  static addTimerHook(callback) {
    hooks.push(callback);
  }

  constructor(element, state0, states) {

    this.state0 = u.deepAssign({}, state0);
    this.state = u.deepAssign({}, this.state0);
    this.element = element;
    this.targetState = {};
    this.states = states;

    this.applyState(0);

    instances.push(this);
    if (!timerInitialized) {
      timerInitialized = true;

      if (USE_SETINTERVAL) {
        setInterval(animatorTimer, TIMER_INTERVAL);
      } else {
        animatorTimer();
      }

      //setInterval(animatorTimer, 16.66667);
      // setInterval(animatorTimer, 20);     
      //setInterval(animatorTimer, 17);
    }
  }
  
  applyState(t) {
    for (const [key, val] of Object.entries(this.targetState)) {
      switch (key) {
        case 'transform': {
          this.state.transform = this.state.transform || {};
          let hasvalid = false;
          for (const [tkey, tval] of Object.entries(val)) {
            const res = interpolateVal(tval, t);
            this.state.transform[tkey] = res.val;
            if (res.r>=1 && !val.loop) {
              delete this.targetState.transform[tkey];
            } else {
              hasvalid = true;
            }
          }

          if (!hasvalid) {
            delete this.targetState.transform;
          }
        } break;
        default: {
          const res = interpolateVal(val, t);
          this.state[key] = res.val;
          if (res.r>=1 && !val.loop) {
            delete this.targetState[key];
          }
        } break;
      }
    }

    const style = Object.assign({}, this.state);
    if (style.transform) style.transform = Object.entries(this.state.transform).reduce((a,v)=>{
      const v1 = v[1].constructor === Array ? v[1].join(','):v[1];
      return a += `${v[0]}(${v1}) `;
    }, '');
    if (style.color) style.color = writeColor(style.color);
    if (style.backgroundColor) style.backgroundColor = writeColor(style.backgroundColor);
    if (style.boxShadow) {
      if (style.boxShadow.length>4) style.boxShadow = [...style.boxShadow.slice(0,4), writeColor(style.boxShadow.slice(4))];
      style.boxShadow = style.boxShadow.join(' ');
    }

    Object.assign(this.element.style, style);
  }

  animate(props, time, delay, loop) {
    const t0 = performance.now();
    time = time || 0;
    delay = delay || 0;
    loop = loop || false;
    this.lasttime = time;
    this.lastdelay = delay;

    Object.entries(u.deepAssign({}, props)).forEach(v=>{
      if (['time', 'delay'].includes(v[0])) return;
      if (v[0] === 'transform') {
        Object.entries(v[1]).forEach(v2=>{
          this.targetState.transform = this.targetState.transform || {};
          let v0 = (this.state.transform||{})[v2[0]];
          if (v0 === undefined) v0 = v2[1];
          this.targetState.transform[v2[0]] = Object.assign(this.targetState.transform[v2[0]]||{}, setval(t0, time, delay, loop, v0, v2[1]));
        });
      } else {
        let v0 = this.state[v[0]];
        if (v0 === undefined) v0 = v[1];
        this.targetState[v[0]] = setval(t0, time, delay, loop, v0, v[1]);
      }
    });
  }

  translateX(translation, time, delay) {
    this.animate({transform: {translate: [translation, this.state.transform.translate[1]]}}, time, delay);
  }

  translateY(translation, time, delay) {
    this.animate({transform: {translate: [this.state.transform.translate[0], translation]}}, time, delay);
  }

  opacity(alpha, time, delay) {
    this.animate({opacity: alpha}, time, delay);
  }

  reset(time, delay) {
    this.stateName = '';
    this.animate(this.state0, (time !== undefined)?time: this.lasttime || 100, (delay !== undefined)?delay:(this.lastdelay||0));
  }

  setState(state, time, delay, loop) {
    if (this.stateName === state) return;
    this.stateName = state;

    let s = this.states[state];
    if (s.usedefault) {
      s = u.deepAssign(u.deepAssign({}, this.state0), s);
      delete s.usedefault;
    }

    this.animate(
      s,
      time!==undefined?time : s.time || 100,
      delay !== undefined?delay:s.delay||0,
      loop !== undefined?loop:s.loop
    );
  }

  remove() {
    const idx = instances.indexOf(this);
    if (idx>=0) {
      instances.splice(idx, 1);
    }
  }
}
