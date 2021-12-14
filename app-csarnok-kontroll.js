import aa_app from './aa-app.js'
import olimpiadb from './data/olimpiadb.js'
import u from './libs/utils.js'
import server from './libs/server.js'
import filters from "./data/koordinatak.js"
import aa from "./data/aa.js"

const config = {}

const size = [1920, 1080];

const peerList = [
  {ip:'192.168.99.11', socket:null},//  {ip:'192.168.99.11', socket:null},
  {ip:'192.168.99.12', socket:null},
  {ip:'192.168.99.13', socket:null},
  {ip:'192.168.99.14', socket:null},
  {ip:'192.168.99.15', socket:null},
  {ip:'192.168.99.16', socket:null},
  {ip:'192.168.99.17', socket:null},
  /* ... */
];

const idle_delay = 60 * 1000 * 5;
const AKTIV = 0;
const INAKTIV = 1;
const PUSH = 2;

export default class app_csarnok_kontroll extends aa_app {

  static allowResize() { return size; }

  static send_filtered(filtered_list)
  {
    const json_array = JSON.stringify([this.language, filtered_list]);
    for (const peer of peerList)
      server.sendToPeer(peer.ip, json_array);
  }


  static button_set()
  {
    this.reset_idle();
    document.getElementById("background").src = this.language+"/hatter.png";

    let lang_aktiv = this.language+"/aktiv/";
    let lang_inaktiv = this.language+"/inaktiv/";
    let lang_push = this.language+"/push/";
    let any_set = false;
    const buttons = document.querySelectorAll('.button');
    for(const button of buttons)
    {
      if (button.id == 0)
        continue;

      const filter = filters[button.id];
      switch (button.status)
      {
        case INAKTIV:
          button.src = lang_inaktiv+filter[0]+'.png';
          break;

        case PUSH:
          button.src = lang_push+filter[0]+'.png';
          any_set = true;
          break;

        default: // AKTIV
          button.src = lang_aktiv+filter[0]+'.png';
          break;
      }
    }

    const button = buttons[0];
    const filter = filters[button.id];
    if (any_set === false)
    {
      button.src = lang_inaktiv + filter[0]+'.png';
    } else {
      button.src = lang_aktiv + filter[0]+'.png';
    }
  }

  static reset_buttons()
  {
    for(const button of document.querySelectorAll('.button'))
      button.status = button.id>0 ? AKTIV : INAKTIV;
  }

  static button_pressed(node)
  {
    switch (node.id)
    {
        case '0': // filter
          this.reset_buttons();
          break;

        default: // other buttons
          switch (node.status)
          {
            case INAKTIV:
              this.reset_idle();
              return;

            case PUSH:
              node.status = AKTIV;
              break;

            default:
              node.status = PUSH;
              break;
          }
          break;
    }

    var active_filters = new Array;
    for(const button of document.querySelectorAll('.button'))
      if (button.status === PUSH)
        active_filters.push(filters[button.id][0]);

    // deactivate all filters that arent pushed in
    const buttons = document.querySelectorAll('.button');
    for(const button of buttons)
      if (button.status !== PUSH)
        button.status = INAKTIV;

    console.log("");
    console.log("found:");

    var valid_people = new Array;
    for(var i=0;i<aa.length;i++)
    {
      const ember_filters = aa[i][1];

      // count how many filters match this guy's filter list
      let filter_found = 0;
      for (const filter of active_filters)
        for (const ember_filter of ember_filters)
          if (ember_filter === filter)
            ++filter_found;
      
      // if all off them do, we found a valid guy
      if (filter_found === active_filters.length)
      {
        console.log(aa[i][0]);
        valid_people.push(i);

        // activate filters that match all of this guy's
        for (const filter of ember_filters)
          for(const button of buttons)
            if (filters[button.id][0] === filter)
              if (button.status !== PUSH)
                button.status = AKTIV;
      }
    }

    console.log(valid_people.length);
    console.log("");

    // actualise the button grid
    this.button_set();
    this.send_filtered(valid_people);
  }

  static reset_idle()
  {
    clearTimeout(this.idle_timeout);
    this.idle_timeout = setTimeout(() => {
      this.button_pressed($("#0")[0]);
    }, idle_delay);
  }

  static initDOM() {
    super.initDOM();

    Object.assign(config, window.configParams);
    Object.assign(wrapper.style, {width:size[0]+'px',height:size[1]+'px'});

    // build the html
    let dynamichtml = `<div>`;
    dynamichtml += '<img id="background" src="data/hun/hatter.png" style="top:0px;left:0px">';
    for (let i=0;i<filters.length;i++)
    {
      const filter = filters[i];
      dynamichtml += '<img id=' + i + ' src="data/hun/aktiv/' + filter[0] + '.png" class="button" style="top:'+filter[3]+'px;left:'+filter[2]+'px">';
    }
    dynamichtml += '<img id="magyar" src="data/magyar.png" style="position:fixed;top:10px;left:1750px">';
    dynamichtml += '<img id="english" src="data/english.png" style="position:fixed;top:10px;left:1820px">';
    dynamichtml += `</div>`;
    wrapper.innerHTML = dynamichtml;

    // default language is hungarian
    this.language = "data/hun";

    for(const div of document.querySelectorAll('.button'))
      div.addEventListener('click', e=>{this.button_pressed(div);}, false);

    document.getElementById("magyar").addEventListener('click', e=>{
      this.language = "data/hun";
      this.button_set();
    });

    document.getElementById("english").addEventListener('click', e=>{
      this.language = "data/eng";
      this.button_set();
    });

    this.reset_buttons();
    this.button_set();
    this.screenLoaded();
  }

  static start() {
    super.start();
    //console.log('app_csarnok_kontroll started');
  }
}

app_csarnok_kontroll.init();
