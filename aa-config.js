import server from './libs/server.js'
import Dmx from './libs/dmx.js'
import globals from './globals.js'

const CONFIG_SCREEN_TOUCH_TIME = 5000;
const CONFIG_SCREEN_PIN = '2259';
const CONFIG_SCREEN_PIN_LOCKOUT_COUNTER = 12;
const CONFIG_SCREEN_PIN_LOCKOUT_TIMER = 60000;
const CORNER_THRESHOLD_X = 0.1;
const ROTATE_BUTTON = '<svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M16.89,15.5L18.31,16.89C19.21,15.73 19.76,14.39 19.93,13H17.91C17.77,13.87 17.43,14.72 16.89,15.5M13,17.9V19.92C14.39,19.75 15.74,19.21 16.9,18.31L15.46,16.87C14.71,17.41 13.87,17.76 13,17.9M19.93,11C19.76,9.61 19.21,8.27 18.31,7.11L16.89,8.53C17.43,9.28 17.77,10.13 17.91,11M15.55,5.55L11,1V4.07C7.06,4.56 4,7.92 4,12C4,16.08 7.05,19.44 11,19.93V17.91C8.16,17.43 6,14.97 6,12C6,9.03 8.16,6.57 11,6.09V10L15.55,5.55Z" /></svg>';
const CLOSE_BUTTON = '<svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>';
const ARROW_RIGHT = '<svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M4,15V9H12V4.16L19.84,12L12,19.84V15H4Z" /></svg>';
const ARROW_LEFT = '<svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M20,9V15H12V19.84L4.16,12L12,4.16V9H20Z" /></svg>';
const ARROW_UP = '<svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M15,20H9V12H4.16L12,4.16L19.84,12H15V20Z" /></svg>';
const DELETE_ICON = '<svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>';
const DUPLICATE_ICON = '<svg style="width:24px;height:24px" viewBox="0 0 24 24"><path fill="currentColor" d="M16,8H14V11H11V13H14V16H16V13H19V11H16M2,12C2,9.21 3.64,6.8 6,5.68V3.5C2.5,4.76 0,8.09 0,12C0,15.91 2.5,19.24 6,20.5V18.32C3.64,17.2 2,14.79 2,12M15,3C10.04,3 6,7.04 6,12C6,16.96 10.04,21 15,21C19.96,21 24,16.96 24,12C24,7.04 19.96,3 15,3M15,19C11.14,19 8,15.86 8,12C8,8.14 11.14,5 15,5C18.86,5 22,8.14 22,12C22,15.86 18.86,19 15,19Z" /></svg>';

export default class Config {
  static init() {
    $('head').append(`<link rel="stylesheet" type="text/css" href="aa-config.css">`);

    window.addEventListener('touchstart', (e)=>this.touchStart(e));
    window.addEventListener('touchend', (e)=>this.cancelTimer());
    window.addEventListener('touchmove', (e)=>this.touchMove(e));
    window.addEventListener('mousedown', (e)=>this.mouseDown(e));
    window.addEventListener('mouseup', (e)=>this.cancelTimer());
    window.addEventListener('mousemove', (e)=>this.mouseMove(e));

    const screen = document.createElement('div');
    screen.id = 'configscreen';
    screen.style.opacity = 0;
    screen.innerHTML = `
    <div id="configcontent">
      <div id="configkeypad">
        <div class="title">Enter PIN code</div>
        <div class="numbers">
          <div class="keypadrow"><div>1</div><div>2</div><div>3</div></div>
          <div class="keypadrow"><div>4</div><div>5</div><div>6</div></div>
          <div class="keypadrow"><div>7</div><div>8</div><div>9</div></div>
          <div class="keypadrow"><div>&lt;</div><div>0</div><div>X</div></div>
        </div>
      </div>
      <div id="configitems">
        <div class="configitemscontent">
          <table>
            <tbody id="configitemrows">
            </tbody>
          </table>
          <div id="configsavebutton">Save</div>
          <div id="configrestartbutton">Restart</div>
          <div id="configreloadbutton">Reload</div>
        </div>
      </div>
      <div id="configdmxeditor">
        <div class="dmxbuttonrow">
          <div id="configdmxclose">${ARROW_UP}</div>
          <div id="configdmxprev">${ARROW_LEFT}</div>
          <div id="configdmxidx"></div>
          <div id="configdmxnext">${ARROW_RIGHT}</div>
          <div id="configdmxclone">${DUPLICATE_ICON}</div>
          <div id="configdmxremove">${DELETE_ICON}</div>
        </div>
        <div id="configdmxsliders"></div>
      </div>
    </div>
    <div id="configrotatebutton">${ROTATE_BUTTON}</div>
    <div id="configclosebutton">${CLOSE_BUTTON}</div>
    `;
    document.body.appendChild(screen);

    screen.ontransitionend = ()=> {
      if (!screen.classList.contains('active')) {
        screen.style.display = 'none';
      }
    };

    configrotatebutton.onclick = ()=>{
      this.rotation = this.rotation+90;
      configcontent.style.transform = `rotate(${this.rotation}deg)`;
    };

    configclosebutton.onclick = ()=>{
      configscreen.classList.remove('active');
    }

    configsavebutton.onclick = ()=>this.saveConfig();
    configrestartbutton.onclick = ()=> server.reboot();
    configreloadbutton.onclick = ()=> this.initConfigItems();
    configdmxclose.onclick = ()=> this.closeDMXEditor();
    configdmxprev.onclick = ()=> this.prevDMXBlock();
    configdmxnext.onclick = ()=> this.nextDMXBlock();
    configdmxclone.onclick = ()=> this.cloneDMXBlock();
    configdmxremove.onclick = ()=> this.removeDMXBlock();

    $('.keypadrow>div').click((e)=>{
      e.target.classList.add('activated');
      setTimeout(()=>e.target.classList.remove('activated'), 20);
      const key = e.target.innerHTML;
      if (key === 'X') {
        this.pin = '';
      } else if (key === '&lt;') {
        if (this.pin.length) {
          this.pin = this.pin.substr(0, this.pin.length-1);
        }
      } else {
        this.pin += key;
        this.keycounter++;
      }

      if (this.pin === CONFIG_SCREEN_PIN) {
        this.keycounter = 0;
        this.openItems();
      } else if (this.keycounter >= CONFIG_SCREEN_PIN_LOCKOUT_COUNTER) {
        this.keycounter = 0;
        configcontent.classList.add('locked');
        setTimeout(()=>configcontent.classList.remove('locked'), CONFIG_SCREEN_PIN_LOCKOUT_TIMER);
      }
    });

  this.rotation = 0;

    if (window.location.search.match(/\btestconfig\b/)) {
      this.activatePinpad();
      this.openItems();
    } else if (window.location.search.match(/\btestconfigkeypad\b/)) {
      this.activatePinpad();
    }
  }

  static checkTouch(e) {
    if (e.touches.length !== 2) return false;

    const t0x = e.touches[0].clientX;
    const t0y = e.touches[0].clientY;
    const t1x = e.touches[1].clientX;
    const t1y = e.touches[1].clientY;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const sq = w*CORNER_THRESHOLD_X;

    return Math.abs(t0x-t1x)>w/2 && t0y>h-sq && t1y>h-sq && (t0x<sq || t1x<sq) && (t0x>w-sq || t1x>w-sq);
  }

  static checkMouse(e) {
    if (e.button !== 0) return false;
    const x = e.clientX;
    const y = e.clientY;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const sq = w*CORNER_THRESHOLD_X;
    return x>w-sq && y>h-sq;
  }

  static mouseMove(e) {
    if (!this.timer) return;
    if (Math.abs(e.clientX-this.mousePos.x)>5 || Math.abs(e.clientY-this.mousePos.y)>5) {
      this.cancelTimer();
    }
  }

  static touchMove(e) {
    if (this.timer && !this.checkTouch(e)) {
      this.cancelTimer();
    }
  }

  static touchStart(e) {
    if (this.checkTouch(e)) {
      this.startTimer();
    }
  }

  static cancelTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  static startTimer() {
    this.cancelTimer();
    this.timer = setTimeout(()=>this.activatePinpad(), CONFIG_SCREEN_TOUCH_TIME);
  }

  static mouseDown(e) {
    if (this.checkMouse(e)) {
      this.mousePos = {x:e.clientX, y:e.clientY};
      this.startTimer();
    }
  }

  static activatePinpad() {
    configitems.classList.remove('active');
    configdmxeditor.classList.remove('active');
    configkeypad.classList.add('active');
    configscreen.style.display = 'block';
    setTimeout(()=>configscreen.classList.add('active'), 10);
    this.pin = '';
    this.keycounter = 0;
    this.timer = null;
  }

  static openItems() {
    configkeypad.classList.remove('active');
    configitems.classList.add('active');
    this.initConfigItems();
  }

  static updateConfigItems() {
    configitemrows.innerHTML = '';
    for (const [idx, item] of globals.CONFIG_ITEMS.entries()) {
      const row = document.createElement('tr');
      row.setAttribute('itemidx', idx);
      let html = `<td>${item.name}</td><td class="configitem_${item.type}">`;
      switch (item.type) {
        case 'enum': {
          html += `<select id="config_${item.config}">`;
          html += item.values.reduce((acc, val)=>acc+`<option${val===item.value?' selected':''}>${val}</option>`, '');
          html += '</select>';
        } break;
        case 'dmx': {
          const length = Math.floor(item.value.byteLength / Dmx.FRAME_SIZE);
          for (let i=0;i<length;i++) {
            html += `<div id="config_${item.config}_${i}">${i+1}</div>`;
          }
          html += `<div class="configcontrolbutton" id="config_${item.config}_add">+</div>`;
          if (item.value.byteLength) {
            html += `<div class="configcontrolbutton" id="config_${item.config}_play">▶</div>`;
          }
        } break;
      }
      row.innerHTML = '</td>'+html;
      configitemrows.appendChild(row);
    }

    $('#configscreen #configitems .configitem_dmx > div').click((e)=>{
      const idx = parseInt($(e.currentTarget).closest('tr').attr('itemidx'));
      switch (e.currentTarget.innerHTML) {
        case '▶': this.playSequence(idx); break;
        case '+': this.addDMXBlock(idx, globals.CONFIG_ITEMS[idx].dmx.byteLength / Dmx.FRAME_SIZE); break;
        default: this.editDMXBlock(idx, parseInt(e.currentTarget.innerHTML)-1);
      }
    });

    $('#configscreen #configitems .configitem_enum > select').change((e)=>{
      const idx = parseInt($(e.currentTarget).closest('tr').attr('itemidx'));
      globals.CONFIG_ITEMS[idx].value = e.currentTarget.value;
    });
  }

  static async initConfigItems() {
    configitemrows.innerHTML = '';

    const requests = globals.CONFIG_ITEMS.map(v=> {
      return server.getConfig(v.config, v.type==='dmx'?'arrayBuffer':'text').then(res=> {
        v.value = res;
        if (v.type === 'dmx') {
          v.dmx = new Uint8Array(v.value);
        } else {
          v.value = v.value || v.defval || '';
        }
      });
    });
    await Promise.all(requests);

    this.updateConfigItems();
  }

  static async saveConfig() {
    const requests = globals.CONFIG_ITEMS.map(v=>server.setConfig(v.config, v.value));
    await Promise.all(requests);
    configscreen.classList.add('saved');
    setTimeout(()=>configscreen.classList.remove('saved'), 20);
  }

  static addDMXBlock(configIdx, blockIdx) {
    const config = globals.CONFIG_ITEMS[configIdx];
    config.dmx = Dmx.addBlock(config.dmx, blockIdx);
    config.value = config.dmx.buffer;
    this.updateConfigItems();
  }

  static getNumDMXBlocks(dmx) {
    return Math.floor(dmx.byteLength/Dmx.FRAME_SIZE);
  }

  static getDMXVal(slideridx) {
    return Dmx.getVal(globals.CONFIG_ITEMS[this.actDMXRow].dmx, this.actDMXBlock, slideridx);
  }

  static setDMXVal(slideridx, value) {
    Dmx.setVal(globals.CONFIG_ITEMS[this.actDMXRow].dmx, this.actDMXBlock, slideridx, value);
    this.setSliders();
    this.sendDMXState();
  }

  static rotateCoord(p, c) {
    const r = -this.rotation * Math.PI / 180;
    const sa = Math.sin(r);
    const ca = Math.cos(r);
    return [(p[0]-c[0])*ca - (p[1]-c[1])*sa + c[0], (p[0]-c[0])*sa + (p[1]-c[1])*ca + c[1]];
  }

  static getCoords(e) {
    const x = (e.touches?e.touches[0]:e).clientX;
    const y = (e.touches?e.touches[0]:e).clientY;
    const rect = configcontent.getBoundingClientRect();
    const rotated = this.rotateCoord([x,y], [rect.left + rect.width/2, rect.top + rect.height/2]);
    return [rotated[0]-rect.left, rotated[1]-rect.top];
  }

  static getRelativeRect(elem) {
    const rect = elem.getBoundingClientRect();
    const crect = configcontent.getBoundingClientRect();
    const c = [crect.left + crect.width/2, crect.top + crect.height/2];

    let cr = [[rect.left, rect.top], [rect.left+rect.width, rect.top+rect.height]];
    switch (this.rotation % 360) {
      case 90:  cr = [[cr[1][0], cr[0][1]], [cr[0][0], cr[1][1]]]; break;
      case 180: cr = [[cr[1][0], cr[1][1]], [cr[0][0], cr[0][1]]]; break;
      case 270: cr = [[cr[0][0], cr[1][1]], [cr[1][0], cr[0][1]]]; break;
    }

    const c0r = this.rotateCoord(cr[0], c);
    const c1r = this.rotateCoord(cr[1], c);
    return [c0r[0] - crect.left, c0r[1] - crect.top, Math.abs(c1r[0]-c0r[0]), Math.abs(c1r[1]-c0r[1])];
  }

  static setSliders() {
    const children = configdmxsliders.children;
    for (const [slideridx, item] of Dmx.VALUES.entries()) {
      const dmxv = Dmx.VALUES[slideridx];
      const val = this.getDMXVal(slideridx);
      const r = val / dmxv.steps;
      const line = $(children[slideridx]).find('.configsliderline');
      const thumb = $(children[slideridx]).find('.configsliderthumb');
      thumb.text(val);
      thumb.css('left', (line.width()-thumb.width())*r + 'px');
    }
  }

  static moveSlider(slideridx, x) {
    const slider = configdmxsliders.children[slideridx];
    const line = $(slider).find('.configsliderline');
    const thumb = $(slider).find('.configsliderthumb');
    const rect = this.getRelativeRect(line[0]);
    x -= rect[0] + this.captureOffset;
    const r = Math.min(Math.max(0, x / (line.width()-thumb.width())), 1);
    const dmxv = Dmx.VALUES[slideridx];
    this.setDMXVal(slideridx, Math.round(r*dmxv.steps));
  }

  static editDMXBlock(configIdx, idx) {
    this.actDMXRow = configIdx;
    this.actDMXBlock = idx;
    const config = globals.CONFIG_ITEMS[configIdx];
    configdmxeditor.classList.add('active');
    configdmxidx.innerHTML = idx+1;

    let html = ''
    for (const [slideridx, item] of Dmx.VALUES.entries()) {
      html += `
      <div class="configdmxslider" idx="${slideridx}">
        <div class="configsliderbutton minus">-</div>
        <div class="configsliderline">
          <div class="configsliderthumb">${this.getDMXVal(slideridx)}</div>
        </div>
        <div class="configsliderbutton plus">+</div>
        <div class="configslidertitle">${item.name}</div>
      </div>`;
    }
    configdmxsliders.innerHTML = html;

    $('#configdmxsliders .configsliderbutton').click((e)=>{
      const slideridx = parseInt($(e.currentTarget).closest('.configdmxslider').attr('idx'));
      if (e.currentTarget.classList.contains('plus')) {
        this.setDMXVal(slideridx, this.getDMXVal(slideridx)+1);
      } else {
        this.setDMXVal(slideridx, this.getDMXVal(slideridx)-1);
      }
    });

    $('#configdmxsliders .configsliderthumb').on('mousedown touchstart', (e)=>{
      const slideridx = parseInt($(e.currentTarget).closest('.configdmxslider').attr('idx'));
      this.capturedSlider = slideridx;
      this.captureOffset = this.getCoords(e)[0] - this.getRelativeRect(e.currentTarget)[0];
      e.preventDefault();
      return false;
    });

    $('#configdmxsliders .configsliderline').on('mousedown touchstart', (e)=>{
      const slideridx = parseInt($(e.currentTarget).closest('.configdmxslider').attr('idx'));
      this.capturedSlider = slideridx;
      const slider = configdmxsliders.children[slideridx];
      this.captureOffset = $(slider).find('.configsliderthumb').width()/2;
      this.moveSlider(this.capturedSlider, this.getCoords(e)[0]);
    });

    $(window).on('mousemove touchmove', (e)=>{
      if (this.capturedSlider === undefined) return;
      this.moveSlider(this.capturedSlider, this.getCoords(e)[0]);
    });

    $(window).on('mouseup touchend', (e)=>{
      this.capturedSlider = undefined;
    });

    configdmxprev.classList.toggle('disabled', idx<=0);
    configdmxnext.classList.toggle('disabled', idx>=this.getNumDMXBlocks(config.dmx)-1);

    this.setSliders();

    if (this.sequencePlaying) {
      this.sequencePlaying = false;
      Dmx.resetTime();
      setTimeout(()=>this.sendDMXState(), 100);
    } else {
      this.sendDMXState();
    }
  }

  static closeDMXEditor() {
    configdmxeditor.classList.remove('active');
  }

  static nextDMXBlock() {
    this.editDMXBlock(this.actDMXRow, this.actDMXBlock+1);
  }

  static prevDMXBlock() {
    this.editDMXBlock(this.actDMXRow, this.actDMXBlock-1);
  }

  static removeDMXBlock() {
    const config = globals.CONFIG_ITEMS[this.actDMXRow];
    config.dmx = Dmx.removeBlock(globals.CONFIG_ITEMS[this.actDMXRow].dmx, this.actDMXBlock);
    config.value = config.dmx.buffer;
    configdmxeditor.classList.remove('active');
    this.updateConfigItems();
  }

  static cloneDMXBlock() {
    this.addDMXBlock(this.actDMXRow, this.actDMXBlock+1);
    this.editDMXBlock(this.actDMXRow, this.actDMXBlock+1);
  }

  static sendDMXState() {
    Dmx.sendBlock(globals.CONFIG_ITEMS[this.actDMXRow].dmx, this.actDMXBlock);
  }

  static playSequence(configIdx) {
    Dmx.playSequence(globals.CONFIG_ITEMS[configIdx].dmx);
    this.sequencePlaying = true;
  }

};
