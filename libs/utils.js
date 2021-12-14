export default class u {

  static pad(val, length, symbol='0') {
    const str = val.toString();
    return (str.length<length)?(symbol.repeat(length)+str).slice(-length):val;
  }

  static lerp(v1, v2, r) {
    if (v1.length) {
      const l = v1.length;
      const ret = [];
      for (let i=0;i<l;i++) {
        ret[i] = (v2[i]-v1[i])*r + v1[i];
      }
      return ret;
    } else {
      return (v2-v1)*r + v1;
    }
  }
  
  static smoothstep(v) {
    return v*v*(3 - 2*v);
  }

  static smootherstep(v) {
    return v*v*v*(v*(v*6 - 15)+10);
  }

  static invSmoothstep(v) {
    return 0.5 - Math.sin(Math.asin(1 - 2 * v) / 3);
  }

  static insideRect(v1, rect) {
    return v1[0]>=rect.left && v1[0]<=(rect.left+rect.width) && v1[1]>=rect.top && v1[1]<=(rect.top+rect.height);
  }

  static rectCenter(rect) {
    return u.add([rect.left, rect.top], u.mul([rect.width, rect.height], 0.5));
  }

  static mul(v1, v2) {
    return v2.length?v1.map((v,i)=>v*v2[i]):v1.map(v=>v*v2);
  }

  static div(v1, v2) {
    return v2.length?v1.map((v,i)=>v/v2[i]):v1.map(v=>v/v2);
  }

  static add(v1, v2) {
    return v1.map((v,i)=>v+v2[i]);
  }

  static sub(v1, v2) {
    return v1.map((v,i)=>v-v2[i]);
  }

  static dist2(v1, v2) {
    return  u.sub(v2,v1).reduce((a,v)=>a+v*v, 0);
  }
 
  static dist(v1, v2) {
    return Math.sqrt(u.dist2(v1, v2));
  }

  static getCoords(e, singleOnly=false) {
    if (singleOnly && e.touches && e.touches.length>1) return false;
    const obj = ((e.touches||{})[0]) || e;
    return [obj.clientX, obj.clientY];
  }

  static getWrapperCoords(e, singleOnly) {
    return this.relativeCoords(e, window.wrapper, singleOnly);
  }

  static getWrapperSpaceRect(element) {
    const rect = u.rotatedRect(element.getBoundingClientRect(element));
    const scale = window.wrapper.scale;
    const p0 = window.wrapper.p0r;
    return {left:(rect.left-p0[0])/scale, top:(rect.top-p0[1])/scale, width:rect.width/scale, height:rect.height/scale };
  }

  static rotatedRect(rect) {
    return window.portraitMode?{left:rect.top, top:window.innerWidth-rect.left-rect.width, width:rect.height, height:rect.width}:rect;
  }

  static rotatedPoint(c) {
    return window.portraitMode?[c[1], window.innerWidth - c[0]]:c;
  }

  static relativeCoords(e, element, singleOnly, insideTarget) {
    let c = u.getCoords(e, singleOnly);
    if (c === false || !element) return c;

    c = u.rotatedPoint(c);
    let rect = u.rotatedRect(element.getBoundingClientRect());

    const cw = element.clientWidth;
    const ch = element.clientHeight;
    const rx = (c[0]-rect.left)/rect.width;
    const ry = (c[1]-rect.top)/rect.height;
    return (!insideTarget||(rx>=0 && rx<1 && ry>=0 && ry<1))?[rx*cw, ry*ch]:false;
  }

  static arrrayShuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(u.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  static random() {
    let seed = (u.randomSeed === undefined)?0x2F6E2B1:u.randomSeed;
    seed = ((seed + 0x7ED55D16) + (seed << 12))  & 0xFFFFFFFF;
    seed = ((seed ^ 0xC761C23C) ^ (seed >>> 19)) & 0xFFFFFFFF;
    seed = ((seed + 0x165667B1) + (seed << 5))   & 0xFFFFFFFF;
    seed = ((seed + 0xD3A2646C) ^ (seed << 9))   & 0xFFFFFFFF;
    seed = ((seed + 0xFD7046C5) + (seed << 3))   & 0xFFFFFFFF;
    u.randomSeed = seed = ((seed ^ 0xB55A4F09) ^ (seed >>> 16)) & 0xFFFFFFFF;
    return (seed & 0xFFFFFFF) / 0x10000000;
  }

  static clamp(v, min, max) {
    return Math.min(Math.max(min, v), max);
  }

  static timeout(t) {
    if (t<0) return Promise.resolve();

    return new Promise((resolve)=> {
      setTimeout(resolve, t);
    });
  }

  // static nextframe() {
  //   return new Promise((resolve)=> {
  //     requestAnimationFrame(resolve);
  //   });
  // }

  static nextframe(numframes=1) {
    numframes = Math.max(numframes, 1);
    let i=0;
    let resolve = null;
  
    function frame() {
      if (++i >= numframes) {
        resolve();
      } else {
        requestAnimationFrame(frame);
      }
    }
  
    return new Promise((res)=> {
      resolve = res;
      requestAnimationFrame(frame);
    });
  }

  static createImage(src, callback) {
    const img = document.createElement('img');
    const ready = ()=>{
      if (callback) callback(img);
    };
    img.onload = ready;
    img.onerror = ready;
    img.src = src;
    return img;
  }

  static loadImage(src) {
    return new Promise((resolve)=>{
      const img = document.createElement('img');
      img.onload = ()=> resolve(img);
      img.onerror = ()=>resolve(img);
      img.src = src;
    });
  }

  static drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  static drawCircle(ctx, d, color, x, y, shadowColor, shadowBlur) {
    ctx.fillStyle = color;
    if (shadowBlur) {
      ctx.shadowBlur = shadowBlur;
      ctx.shadowColor = shadowColor;
    }
    ctx.beginPath();
    ctx.arc(x, y, d/2, 0, 2*Math.PI);
    ctx.fill();
  }

  static drawWrappedText(ctx, text, font, width, x, y, lineheight, align) {
    ctx.font = font;
    align = align || 'left';
    x = x || 0;
    y = y || 0;
    lineheight = lineheight || ((font.match(/(\d+)px/)||[])[1]) || '16';

    const words = text.split(' ');
    const lines = [];
    while (words.length>0) {
      let line = words[0];
      let i = 1;
      let fit = false;
      while ((fit=ctx.measureText(line).width<width) && i<words.length) {
        line += ' '+words[i++];
      }
      if (!fit && i>1) i--;
      lines.push(words.splice(0, i).join(' '));
    }

    ctx.textBaseline = 'top';
    ctx.textAlign = align;
    const x0 = align==='left'?x:(align==='right'?x+width:x+width/2);

    lines.forEach(line=>{
      ctx.fillText(line, x0, y);
      y += lineheight;
    });
  }

  static deepAssign(o1, o2) {
    for (const p of Object.keys(o2)) {
      const prop = o2[p];
      if (prop && typeof prop === 'object') {
        if (prop.constructor===Array) {
          o1[p] = u.deepAssign(o1[p] || [], prop);//Object.assign(o1[p]||[], prop);
        } else if (prop.constructor===Object) {
          o1[p] = u.deepAssign(o1[p] || {}, prop);
        } else
          o1[p] = prop;
      } else
        o1[p] = prop;
    }
    return o1;
  }
  
  static merge(o1, o2) {
    return u.deepAssign(u.deepAssign({},o1), o2);
  }

  static hacklog(msg) {
    if (!window.hacklogger) {
      const div = document.createElement('div');
      div.id = 'hacklogger';
      Object.assign(div.style, {position:'fixed', width:'100%', height:'100%', opacity:0.5, top:0, left:0, zIndex:1000, backgroundColor:'white', color:'black', fontSize:'8px'});
      document.body.appendChild(div);
    }
    window.hacklogger.innerHTML = msg+'<br>'+window.hacklogger.innerHTML;
  }
}
