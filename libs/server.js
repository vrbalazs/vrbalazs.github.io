export default class Server {
  static init() {
    this.statusQueries = {};
    this.peerMessageCallbacks = [];

    this.ws = new WebSocket('ws://localhost:8181');
    this.ws.addEventListener('message', event=> {
      for (const cb of this.peerMessageCallbacks) cb(event.data);
    });
  }

  static onPeerMessage(callback) {
    this.peerMessageCallbacks.push(callback);
  }

  static connectToPeer(ip) {
    const ws = new WebSocket(`ws://${ip}:8182`);

    const messageQueue = [];
    const sendOriginal = ws.send;
    let openResolve = null;
    let openReject = null;
    let opened = false;
    ws.waitForOpen = new Promise((resolve, reject)=>{
      openResolve = resolve;
      openReject = reject;
    });
    ws.send = (message)=> {
      if (opened) {
        sendOriginal.bind(ws)(message);
      } else {
        messageQueue.push(message);
      }
    }

    ws.addEventListener('open', ()=>{
      opened = true;
      for (const msg of messageQueue) sendOriginal.bind(ws)(msg);
      openResolve(true);
    });
    ws.addEventListener('error', e=>openReject(e));

    return ws;
  }

  static disconnectPeer(ws) {
    ws.close();
  }

  static async sendToPeer(wsOrIp, message) {
    const singleMessage = typeof wsOrIp === 'string';

    let ws = wsOrIp;
    if (singleMessage) ws = this.connectToPeer(ws);
    if (!await ws.waitForOpen.catch(e=>console.warn(e))) {
      return;
    }

    try {
      ws.send(message);
    } catch (e) {
      console.warn(e);
    }

    if (singleMessage) this.disconnectPeer(ws);
  }

  static baseUrl() {
    // return Server.url = `http://localhost`;
    if (Server.url) return this.url;

    if (window.location.href.startsWith('https://')) {
      return Server.url = window.location.href.replace(/\/[^\/]*$/, '');
    }

    if (navigator.userAgent.indexOf('Chromium') >= 0) {
      return Server.url = `http://localhost`;
    } else {
      return Server.url = window.location.origin;
    }

    // const remoteip = window.location.origin;// '192.168.62.119';
    // const local = navigator.userAgent.indexOf('Chromium') >= 0;
    // return Server.url = `http://${local?'localhost':remoteip}`;
  }

  /* dataType: 'text'(default), 'json', 'arrayBuffer' */
  static request(uri, method='GET', body=null, dataType='text') {
    return fetch(uri, {method, body}).then(res=>{
      if (!res.ok) {
        const u = uri;
        throw new Error(`HTTP error status: ${res.status}`);
      }

      dataType = dataType || 'text';
      return res[dataType]();
    });
  }

  static cgi(cgi, params, data=null, dataType='text') {
    const uri = `${Server.baseUrl()}/cgi-bin/${cgi}.cgi?${params}`;
    const method = data?'POST':'GET';
    const body = data?new Blob([data], {type: "octet/stream"}):undefined;
    return Server.request(uri, method, body, dataType);
  }

  static getConfig(name, dataType='text') {
    return Server.cgi('configread', name, null, dataType);
  }

  static setConfig(name, value) {
    return Server.cgi('configwrite', name, value);
  }

  static playAnim(movie, params, controlport) {
    params = Object.assign({}, params, {http_port:controlport});
    let cmdline = '';
    for (const k of Object.keys(params)) {
      if (k.startsWith('_')) continue;
      cmdline += `--${k.replace(/_/g,'-')}&${params[k]}&`;
    }
    cmdline += '/var/www/html/'+movie;
    return Server.cgi('omxplayer', cmdline);
  }

  static gpio(params) {
    return Server.cgi('gpio', '', params.replace(/ /g, '&'));
  }

  static gpioWait(params, handle) {
    return Server.cgi('gpio_unique', '', params.replace(/ /g, '&')+'&gpio_handle_'+handle);
  }

  static animControl(port, cmd, val) {
    const uri = `${Server.baseUrl()}:${port}/control?cmd=${cmd}` + (val?':'+val:'');
    return Server.request(uri, 'GET');
  }

  static animStatus(port, callback) {
    const uri = `${Server.baseUrl()}:${port}/status`;
    this.statusQueries[port] = new AbortController();
    const signal = this.statusQueries[port].signal;

    let buffer = '';
    fetch(uri, {mode:'cors', signal}).then(response => {
      const reader = response.body.getReader();
      const _this = this;
      reader.read().then(function processRes({done, value}) {
        if (!done) {
          const str = buffer + new TextDecoder("utf-8").decode(value);
          const chunks = str.split('\n');
          for (const chunk of chunks) {
            if (chunk) callback(chunk);
          }
          buffer = chunks[chunks.length-1];
          return reader.read().then(processRes);
        } else {
          delete _this.statusQueries[port];
          callback('done');
        }
      });
    }).catch((e)=> {
      delete this.statusQueries[port];
      callback(null);
    });
  }

  static abortStatusRead(port) {
    if (this.statusQueries[port]) {
      this.statusQueries[port].abort();
      delete this.statusQueries[port];
    }
  }

  static sql(query) {
    const uri = `${Server.baseUrl()}/sql.php?query=${encodeURIComponent(query)}`;
    return Server.request(uri, 'GET', null, 'json');
  }

  static writeSerial(data) {
    return Server.cgi('writeserial', '', data);
  }

  static resetSerial() {
    return Server.cgi('resetserial', '');
  }

  static reboot() {
    return Server.cgi('reboot', '');
  }
}

Server.init();
