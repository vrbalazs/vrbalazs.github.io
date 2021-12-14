import Server from './server.js'

const PORT_RANGE_MIN = 4000;
const PORT_RANGE_MAX = 4999;
const OMX_SERVER_RETRY_TIME = 33;
const OMX_SERVER_MAX_RETRIES = 45;

export default class Video {
  constructor(file, args, port, domParent, callback) {
    this.port = port;
    this.args = args;
    this.file = file;
    this.domParent = domParent;
    this.callback = callback;
    this.init();
  }

  async init() {
    this.status = {pos:0, duration:0, status:'stopped'};
    if (this.args._browser_mode) {
      this.videoelement = document.createElement('video');
      this.videoelement.autoplay = this.args.start_paused!==undefined?false:true;
      this.videoelement.volume = this.args._volume;
      this.videoelement.playsinline = true;
      this.videoelement.muted = this.args._muted;
      this.videoelement.loop = this.args.loop!==undefined?true:false;

      if (this.domParent) {
        Object.assign(this.videoelement.style, {
          width: '100%',
          height: '100%',
          top: '0', left: '0',
          position: 'absolute',
        });
      } else {
        this.videoelement.style.position = this.args.domParent?'absolute':'fixed';
      }
      this.setVideoElementWin(this.args.win);
      this.alpha = this.videoelement.style.opacity = this.args.alpha / 255;
      this.videoelement.onplay = ()=> {
        this.status.status = 'playing';
        if (this.args.fadein && !this.fadedIn) {
          this.fadedIn = true;
          this.fadeIn(this.args.fadein);
        }
      };
      this.videoelement.onpause = ()=> {
        //this.status.status = 'paused';
        this.videoEnded();    ///!///
      }
      this.videoelement.onended = ()=> {
        this.videoEnded();
      };
      this.videoelement.src = this.file;
      this.videoelement.currentTime = 0;
      if (!this.args.start_paused) {
        this.videoelement.play();
      }

      if (this.domParent) {
        this.domParent.appendChild(this.videoelement);
      } else {
        document.body.appendChild(this.videoelement);
      }

      this.refreshHTML5VideoStatus();
      if (this.args.fadein) {
        this.alpha = this.videoelement.style.opacity = 0;
      }

      this.fadeOutTrigger = -1;
      if (this.args.fadeout) {
        this.fadeOutTrigger = this.args.fadeout*1000000;
      } else if (this.args.keep_open && this.args.fadeout-after-end) {
        this.fadeOutTrigger = 0;
      }
    } else {
      this.sentWin = this.args.win;
      this.sentAlpha = this.args.alpha;
      await Server.playAnim(this.file, this.args, this.port);
      this.retryCount = 0;
      if (!this.args._forget) this.readStatus();
    }

    if (this.domParent && !this.browser_mode) this.refreshWin();
  }

  videoEnded() {
    if (!this.videoelement) return;

    this.status.status = this.args.keep_open!==undefined?'stopped':'terminated';
    if (this.status.status === 'terminated') {
      this.videoelement.remove();
      this.videoelement = null;
      this.terminated = true;
    }
  }

  setVideoElementWin(win) {
    if (win && this.videoelement && !this.domParent) {
      win = win.split(',').map(v=>parseFloat(v));
      this.videoelement.style.left = win[0]+'px';
      this.videoelement.style.top = win[1]+'px';
      this.videoelement.style.width = win[2]-win[0]+'px';
      this.videoelement.style.height = win[3]-win[1]+'px';
    }
  }

  refreshHTML5VideoStatus() {
    if (this.terminated) {
      if (this.callback) this.callback(this.status);
      return;
    }

    if (this.videoelement) {
      this.status.pos = Math.round(this.videoelement.currentTime * 1000000);
      this.status.duration = Math.round(this.videoelement.duration * 1000000);
      if (this.callback) this.callback(this.status);

      if (this.fadeOutTrigger>=0 && !this.fadingOut && this.status.pos>=this.status.duration - this.fadeOutTrigger) {
        this.fadingOut = true;
        this.fadeOut(this.args.fadeout);
      }
    }

    setTimeout(()=>this.refreshHTML5VideoStatus(), 33);
  }

  refreshWin() {
    if (this.terminated) return;

    const params = Video.getParamsFromDomElement(this.domParent);
    if (params.win !== this.sentWin) {
      if (this.videoelement) {
        this.setVideoElementWin(params.win);
      } else {
        Server.animControl(this.port, 'move', this.sentWin = params.win);
      }
    }
    if (params.alpha !== this.sentAlpha) {
      if (this.videoelement) {
        // if (!this.args.fadein || this.fadedIn) {
        //   this.videoelement.style.opacity = params.alpha / 255;
        // }
      } else {
        Server.animControl(this.port, 'setalpha', this.sentAlpha = params.alpha);
      }
    }

    if (this.videoelement && this.fadeTime) {
      const r = Math.min((Date.now() - this.fadeT0) / this.fadeTime, 1);
      this.alpha = this.videoelement.style.opacity = (this.fadeTarget - this.alpha0)*r + this.alpha0;
      this.videoelement.volume = (this.fadeTarget - this.vol0)*r + this.vol0;

      if (r>=1) {
        this.fadeTime = 0;
        if (this.fadeTarget === 0 && this.stopOnFadeout) {
          this.stop();
        }
      }
    }

    requestAnimationFrame(()=>this.refreshWin());
  }

  readStatus() {
    Server.animStatus(this.port, statusstr => {
      if (statusstr===null) {
        if (!this.statusReceived && ++this.retryCount<OMX_SERVER_MAX_RETRIES) {
          setTimeout(()=>this.readStatus(), OMX_SERVER_RETRY_TIME);
          return;
        }

        this.status.status = 'terminated';
        this.terminated = true;
        if (this.callback) this.callback(this.status);
        return;
      }

      this.statusReceived = true;

      if (statusstr==='done') {
        if (this.reconnect) {
          this.readStatus();
        } else {
          this.status.status = 'terminated';
          this.terminated = true;
          if (this.callback) this.callback(this.status);
        }
      } else {
        try {
          const stat = JSON.parse(statusstr);
          if (stat.reconnect === 1) {
            this.reconnect = true;
          } else {
            this.reconnect = false;
            this.status = stat;
            if (this.callback) this.callback(this.status);
          }
        } catch(e) {};
      }
    });
  }

  fadeOut(time) {
    if (this.videoelement) {
      this.fadeT0 = Date.now();
      this.alpha0 = this.alpha;
      this.vol0 = this.videoelement.volume;
      this.fadeTarget = 0;
      this.fadeTime = time*1000;
    } else {
      Server.animControl(this.port, 'fadeout', time);
    }
  }

  fadeIn(time) {
    if (this.videoelement) {
      this.fadeT0 = Date.now();
      this.alpha0 = this.alpha;
      this.vol0 = this.videoelement.volume;
      this.fadeTarget = 1;
      this.fadeTime = time*1000;
    } else {
      Server.animControl(this.port, 'fadein', time);
    }
  }

  fadeStop(time) {
    if (this.videoelement) {
      this.fadeOut(time);
      this.stopOnFadeout = true;
    } else {
      Server.animControl(this.port, 'fadestop', time);
    }
  }

  terminate() {
    this.stop();
    if (this.videoelement) {
      this.videoelement.remove();
    }
  }

  stop() {
    if (this.terminated) return;

    this.terminated = true;
    if (this.videoelement) {
      this.status.status = 'stopped';
      this.videoelement.pause();
      this.videoelement.currentTime = 0;
    } else {
      //Server.abortStatusRead(this.port);
      Server.animControl(this.port, 'stop', '').then(()=>{
        this.status.status = 'stopped';
      });
    }
  }

  play() {
    if (this.videoelement) {
      this.videoelement.play();
    } else {
      Server.animControl(this.port, 'play', '').then(()=>{
        this.status.status = 'playing';
      });
    }
  }

  pause() {
    if (this.videoelement) {
      this.videoelement.pause();
    } else {
      Server.animControl(this.port, 'pause', '').then(()=>{
        this.status.status = 'paused';
      });
    }
  }

  setVolume(volume) {
    if (this.videoelement) {
      this.videoelement.volume = volume;
    } else {
      Server.animControl(this.port, 'setvol', volume/*Video.calcMillibells(volume)*/);
    }
  }

  setWin(x1, y1, x2, y2) {
    const winstr = `${x1},${y1},${x2},${y2}`;
    if (this.videoelement) {
      this.setVideoElementWin(winstr);
    } else {
      Server.animControl(this.port, 'move', winstr);
    }
  }

  static calcMillibells(volume) {
    return Math.floor((volume<=0)?-1000000000:Math.log10(volume)*2000);
  }

  static getParamsFromDomElement(elem) {
    if (!elem) return {};

    const domRect = elem.getBoundingClientRect();
    const opacity = parseFloat(window.getComputedStyle(elem).opacity);

    return {
      win: `${domRect.left.toFixed(1)},${domRect.top.toFixed(1)},${(domRect.left+domRect.width).toFixed(1)},${(domRect.top+domRect.height).toFixed(1)}`,
      alpha: Math.round(opacity*255),
    };
  }

  static open(file, params) {
    const args = {};
    const volume = (params.vol !== undefined)?params.vol:0;
    args.display = (params.display !== undefined)?params.display:0;
    args.aspect_mode = (params.aspect_mode !== undefined)?params.aspect_mode:'letterbox';
    args._volume = volume;
    args.vol = Video.calcMillibells(volume);
    args.alpha = (params.alpha !== undefined)?Math.round(params.alpha*255):255;
    args._browser_mode = params.browser_mode;
    args._forget = params.forget;
    args._muted = params.muted;

    if (params.win !== undefined) args.win = params.win;
    if ((params.loop !== undefined)?params.loop:false) args.loop = '';
    if ((params.keep_open !== undefined)?params.keep_open:false) args.keep_open = '';
    if ((params.start_paused !== undefined)?params.start_paused:false) args.start_paused = '';
    if (params.fadein !== undefined) args.fadein = params.fadein;
    if (params.fadeout !== undefined) args.fadeout = params.fadeout;
    if (params.fadeout_after_end !== undefined) args.fadeout_after_end = params.fadeout_after_end;
    if (params.layer !== undefined) args.layer = params.layer;
    if (params.adev !== undefined) args.adev = params.adev;

    if (location.href.match(/^https:/) || window.queryParams.browseranims) {
      args._browser_mode = true;
    }

    const domParent = (params.domParent !== undefined)?params.domParent:null;
    const callback = (params.callback !== undefined)?params.callback:null;
    Object.assign(args, Video.getParamsFromDomElement(domParent));

    if (Video.portCounter>PORT_RANGE_MAX) Video.portCounter = PORT_RANGE_MIN;
    return new Video(file, args, Video.portCounter++, domParent, callback);
  }

  static playVideo(file, params) {
    return new Promise((resolve)=>{
      const cb = params.callback;
      params.callback = (res)=>{
        if (cb) cb(res);
        if (res.status === 'terminated') resolve(res);
       }
      this.open(file, params);
    });
  }
}

Video.portCounter = PORT_RANGE_MIN;
