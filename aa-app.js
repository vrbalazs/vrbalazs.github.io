import server from './libs/server.js';
//import texts from './data/texts.js';
import u from './libs/utils.js';

export default class aa_app {
  static initDOM() {
    this.loadCss(window.appname);
    window.wrapper.classList.add(window.appname);

    this.rpi = window.queryParams.rpi !== undefined;
    if (this.rpi) {
      window.wrapper.classList.add('rpi');
    } else {
      window.wrapper.classList.add('web');
    }
  }

  static init() {
    window.currentApp = this;
    this.volume = 1;
    this.audiodev = 'local';
    if (window.queryParams.rpi !== undefined) {
      Promise.all([server.getConfig('volume'), server.getConfig('audiodev')]).then((res)=>{
        this.volume = (res[0]!=='')?parseInt(res[0])/100:this.volume;
        this.audiodev = res[1] || this.audiodev;
        this.start();
      }).catch(()=>{
        this.start();
      });
    } else {
      this.start();
    }
  }

  static start() {
    if (window.queryParams.rpi)
      server.cgi('killall', 'omxplayer.bin'); // because it gets stuck sometimes

    this.checkFont();

    this.lang = 'hu';
    this.initDOM();
    this.localize();

    const overlayImg = this.getOverlayImg();
    if (overlayImg) {
      window.addEventListener("keydown", event => {
        if (event.key === '1' || event.key === '2') {
          if (!$('#debugoverlay')[0]) {
            $('#wrapper').append($(`<div id="debugoverlay" style="pointer-events:none;z-index:1000;position:absolute;width:100%;height:100%;left:0;top:0;background-image:url(${overlayImg})"></div>`));
          }

          $('#debugoverlay').css('opacity', (event.key === '1')?1:0.3);
        } else if (event.key === '3') {
          $('#debugoverlay').remove();
        }
      });
    }

    if (window.queryParams.rpi) {
        this.watchdog();
    }
  }

  static watchdog() {
    server.cgi('watchdog', '30');
    setTimeout(()=>this.watchdog(), 15000);
  }

  static getOverlayImg() {
    return '';
  }

  static onResize() {
    /* */
  }

  static allowResize() {
    return parseInt(window.queryParams.demo||0);
  }

  static async localize(root) {
    const collection = $(root||document.body).find('[text]:not([text=""])');
    for (let i=0;i<collection.length; i++) {
      const elem = $(collection[i]);
      const key = elem.attr('text');
      if (key) {
        const text = key.replace(/\b[A-Z_]{2,}\d*\b/g, m=> {
          const entry = texts[m]||{};
          return entry[this.lang]||entry.hu||m;
        });
        elem.text(text);
      }
    }

    $('.langselector>span').removeClass('active');
    $('.langselector>span.lang_'+this.lang).addClass('active');
    for (let i=window.wrapper.classList.length-1;i>=0;i--) {
      if (window.wrapper.classList[i].startsWith('lang_')) window.wrapper.classList.remove(window.wrapper.classList[i]);
    }
    window.wrapper.classList.add('lang_'+this.lang);

    $(root||document.body).find('*').each((idx, element) => {
      element.draggable = false;
      if (!element.dragfixAttached) {
        element.dragfixAttached = true;
        element.addEventListener('dragstart', (e)=>e.preventDefault());
      }
    });
  }

  static async switchLang() {
    window.wrapper.style.transition = 'opacity 0.25s';
    window.wrapper.style.opacity = 0;
    await u.timeout(250);
    this.lang = this.lang === 'hu' ? 'en' : 'hu';
    await this.localize();
    await u.nextframe(2);
    window.wrapper.style.opacity = 1;
  }

  static loadCss(path) {
    $('head').append(`<link rel="stylesheet" type="text/css" href="${path}.css?${window.vstr}">`);
    const id = 'dummy-'+path.replace(/^.*?\//, '');
    const dummy = document.createElement('div');
    dummy.id = id;
    dummy.style.position = 'fixed';
    dummy.style.zIndex = -10;
    dummy.style.pointerEvents = 'none';
    document.body.appendChild(dummy);

    this.loadedStyles = this.loadedStyles || [];
    this.loadedStyles.push(id);

    setTimeout(()=>this.checkCss(), 20);
  }

  static async checkLoadedState() {
    if (!this.screenLoadingFinished && this.cssReady && this.screenReady) {
      this.screenLoadingFinished = true;

      const resizeTo = this.allowResize();
      if (resizeTo) {
        this.windowResize(resizeTo);
        window.addEventListener('resize', ()=>this.windowResize(resizeTo));
      }

      if (window.queryParams.rpi) await u.timeout(500);

      window.wrapper.style.opacity = 1;
  
      await u.timeout(500);

      window.hourglass.style.display = 'none';
    }
  }

  static allCssLoaded() {
    this.cssReady = true;
    this.checkLoadedState();
  }

  static screenLoaded() {
    this.screenReady = true;
    this.checkLoadedState();
  }

  static checkCss() {
    if (this.cssTimerActive) return;
    if (!this.loadedStyles.filter(id=>!window[id].clientWidth).length) {
      this.allCssLoaded();
    } else {
      setTimeout(()=>this.checkCss(), 20);
    }
  }

  static setPortraitMode(scale) {
    if (window.queryParams.rpi) {
      scale = scale || '1,1';
      wrapper.style.transformOrigin = `50% 50%`;
      wrapper.style.top = '50%';
      wrapper.style.left = '50%';
      wrapper.style.position = 'relative';
      wrapper.style.transform = `translate(-50%,-50%) rotate3d(0,0,1,90deg) scale(${scale})`;
      window.portraitMode = true;
    }
  }

  static windowResize(dim=[]) {
    const ww = window.innerWidth;
    const wh = window.innerHeight;
    const w = dim[0] || window.wrapper.clientWidth;
    const h = dim[1] || window.wrapper.clientHeight;
    const wa = ww/wh;
    const a = w/h;
    window.wrapper.scale = this.scale = wa>a? wh/h : ww/w;

    Object.assign(wrapper.style, {
      transform: `translate(-50%,-50%) scale(${this.scale})`,
      top: '50%',
      left: '50%',
      transformOrigin: '50% 50%',
      width: w+'px',
      height: h+'px',
    });
    const rect = window.wrapper.getBoundingClientRect();
    window.wrapper.p0 = this.wp0 = [rect.left, rect.top];
    window.wrapper.p0r = this.wp0r = u.rotatedPoint(window.wrapper.p0);
    window.wrapper.size = this.wsize = [rect.width, rect.height];
    window.wrapper.sizer = this.wsizer = window.portraitMode?[rect.height, rect.width]:window.wrapper.size;
    this.onResize();
    window.scrollTo(0,0);
  }

  static onFontLoaded() {
    /* */
  }

  static measureFont(ctx, counter) {
    const w0 = ctx.measureText('11111111').width;
    const w1 = ctx.measureText('44444444').width;
    //console.log(counter+': w0:'+w0+', w1:'+w1);       ///!///
    if (w0 !== w1) {
      this.fontLoaded = true;
      this.onFontLoaded();
    } else {
      if (counter<200)
        setTimeout(()=>this.measureFont(ctx, counter+1), 30);
    }
  }

  static checkFont() {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
//      ctx.font = 'bold 16px RidleyGrotesk, monospace';
      ctx.font = 'bold 16px Montserrat, monospace';
      this.measureFont(ctx, 0);
    }
  }

  static addImages(list) {
    return Promise.all(list.map(v=>{
      return u.loadImage(v.url).then(()=>{
        if (!v.element) return;
        if (v.type==='img') {
          v.element.src = v.url;
        } else {
          v.element.style.backgroundImage = `url(${v.url})`;
        }
      });
    }));
  }
}

aa_app.scale = 1;
