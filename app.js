import Config from './aa-config.js';
import './libs/jquery-3.4.1.min.js';

function parseQuery(queryString) {
  var query = {};
  var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
  for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split('=');
      query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
  }
  window.queryParams = query;
  window.configParams = {};
  Object.entries(window.queryParams).forEach((v)=>{
    let val = isNaN(v[1]+0)?v[1]:parseFloat(v[1]);
    window.configParams[v[0].toUpperCase()] = val;
  });

  return query;
}

function main() {
  Config.init();
  window.appname = parseQuery(window.location.search).app;
  window.vstr = Object.keys(window.queryParams).filter(v=>v.startsWith('v')&&!window.queryParams[v])[0]||'v0';

  if (!window.queryParams.rpi) {
    let te=0;document.addEventListener('touchmove',(e)=>{let t= e.target;while(t&&!t.classList.contains('scrollable'))t=t.parentElement;if(e.touches.length>1||!t)e.preventDefault();    },{passive:false});document.addEventListener('touchend', (e)=>{const n=Date.now();if(n-te<500)e.preventDefault();te=n;},{passive:false});
  }

  const script = document.createElement('script');
  script.setAttribute('type', 'module');
  script.setAttribute('src', `./${window.appname}.js?${window.vstr}`);
  document.body.appendChild(script);

  // import(`./${window.appname}.js`).then(app=> {
  //   window.currentApp = app.default;
  //   window.currentApp.init();
  // });
}

main();
