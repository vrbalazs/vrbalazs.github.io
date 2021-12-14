export default class Server {
  static baseUrl() {
    if (this.url) return this.url;
    return this.url = window.location.href.replace(/\/[^\/]*$/, '');
  }

  static request(uri, method, body=null, dataType='text') {}

  static cgi(cgi, params, data=null, dataType='text') {}

  static getConfig(name, dataType='text') { return Promise.resolve(''); }

  static setConfig(name, value) { return Promise.resolve(); }

  static playAnim(movie, params, controlport) { return Promise.resolve(); }
}
