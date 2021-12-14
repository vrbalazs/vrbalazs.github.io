import './libs/ol.js'
import aa_app from './aa-app.js'
import server from './libs/server.js'
import u from './libs/utils.js'
import cityLocations from './data/varosok.js'
import cities from './data/terkep-nevek.js'
import Carousel from './libs/carousel2.js';
import gombok from './data/csarnokgomb.js';
import olimpiadb from './data/olimpiadb.js'
import video from './libs/video.js'

const size = [1920,1080+1080];

const TILE_LIMITS = {
  5:[17,18,10,11],
  6:[34,37,21,23],
  7:[68,74,43,46],
  8:[137,148,87,93],
  9:[274,297,174,186],
  10:[549,594,349,372],
  11:[1099,1188,698,744],
}

const NUM_SECTORS_X = 50;
const NUM_SECTORS_Y = 50;
const FADE_TIME = 500;
const PIN_0_X = 32;
const PIN_0_Y = 90;
const PIN_TEXT_X = 32;
const PIN_TEXT_Y = 22;
const PIN_WIDTH = 64;
const PIN_HEIGHT = 100;
const MAP_RESOLUTION_MULTIPLIER = 85;
const DEFAULT_ZOOM = 7.44;    //7.44
const MIN_ZOOM = 6.5;
const MAX_ZOOM = 11.5;
const MAP_CENTER = [2351784.1163827893, 5916899.351588748];
const ZOOM_TIME = 900;
const DISABLE_INTERACTION = true;

const fade_period = 0.2;
const idle_delay = 1000 * 60 * 5; // five minutes

const config = {}

export default class app_csarnok_terkep extends aa_app { 
  static allowResize() { return size; }

  static async start_video(video_name, add_args)
  {
    await this.stop_video();
    let args = {fadein:fade_period, vol:this.volume};
    Object.assign(args, add_args);

    if (this.rpi)
    {
      await server.cgi('killall', 'omxplayer.bin');
      await server.cgi('initdisplay', '7');
      Object.assign(args, {win:'0,0,1920,1080',display:7,layer:0,aspect_mode:"stretch", adev:this.audiodev});
    } else {
      Object.assign(args, {browser_mode: true, muted:true, domParent: $("#fulltop")[0]});
    }

    this.video = video.open(video_name, args);
    if (this.video)
      this.video_name = video_name;
  }

/*  await this.start_video(div.id, {fadeout:fade_period, callback: async (stat)=> {
    if (this.video && stat.status === 'terminated')
      this.back_to_idle();
  }});*/

  static async stop_video()
  {
    if (this.video)
    {
      const playing = $(".playing")[0];
      playing.style.opacity = 0;
      playing.style.left = "0px"
      playing.style.top = "2160px";
      const video_stopping = this.video;
      this.video = undefined;
      video_stopping.fadeStop(fade_period);
      await u.timeout(fade_period*1000+500);
      video_stopping.terminate();
      this.video_name = undefined;
    }
  }

  static filter_list(selected_nem, selected_oev, selected_sportag, selected_csapat, selected_aranyak)
  {
    // check selections
    let valid = new Object;
    const valid_nem = valid["nem"] = new Set;
    const valid_csapat = valid["csapat"] = new Set;
    const valid_aranyak = valid["aranyak"] = new Set;
    const valid_oev = valid["oev"] = new Set;
    const valid_sportag = valid["sportag"] = new Set;
    const filtered_list = valid["list"] = new Set;
    let idx = 0;
    for (const nev in olimpiadb)
    {
      const sportolo = olimpiadb[nev];
      let aranyak_str = String(sportolo.aranyak.length);
      if ((selected_nem === "") || (selected_nem === sportolo.nem))
        if ((selected_aranyak === "") || (selected_aranyak === aranyak_str))
          for (const arany of sportolo.aranyak)
            if ((selected_oev === "") || (selected_oev === arany.oev))
              if ((selected_sportag === "") || (selected_sportag === arany.sportag))
                if ((selected_csapat === "") || (selected_csapat === arany.csapat))
                {
                  valid_nem.add(sportolo.nem);
                  valid_aranyak.add(aranyak_str);
                  valid_oev.add(arany.oev);
                  valid_sportag.add(arany.sportag);
                  valid_csapat.add(arany.csapat);
                  filtered_list.add(idx);
                }

      ++idx;
    }

    return valid;
  }

  static disable_touch()
  {
    document.getElementById("touchcover").style.zIndex = 5000;
    this.reset_timeout();
  }

  static enable_touch()
  {
    document.getElementById("touchcover").style.zIndex = -5000;
    this.reset_timeout();
  }

  static reset_timeout()
  {
    clearTimeout(this.idle_timeout);
    this.idle_timeout = setTimeout(async () => {
      this.disable_touch();
      await this.stop_video();
      this.enable_touch();
      this.activate_map_screen();
      this.reset_map();
    }, idle_delay);
  }

  static select_gomb(div)
  {
    div.classList.remove("idle-"+div.gomb[1]);
    div.classList.add("selected-"+div.gomb[1]);
    div.selected = true;
  }

  static unselect_gomb(div)
  {
    div.classList.remove("disabled-all");
    div.classList.remove("selected-"+div.gomb[1]);
    div.classList.add("idle-"+div.gomb[1]);
    div.selected = false;
  }

  static hide_button(div)
  {
    div.hidden = true;
    if (div.disablable)
    {
      div.classList.remove("selected-"+div.gomb[1]);
      div.classList.add("disabled-all");
    }
  }

  static unhide_button(div)
  {
    div.hidden = false;
    if (div.disablable)
    {
      div.classList.remove("disabled-all");
      div.classList.add("idle-"+div.gomb[1]);
    }
  }

  static reset_map()
  {
    this.last_carousel_button_pressed=new Object;
    this.last_kettos_button_pressed=new Object;

    this.selected=new Map();
    this.selected["reset"] = "";
    this.selected["sportag"] = "";
    this.selected["csapat"] = "";
    this.selected["nem"] = "";
    this.selected["oev"] = "";
    this.selected["aranyak"] = "";

    $("#nem_single_2")[0].classList.add("invisible");
    $("#csapat_single_2")[0].classList.add("invisible");
    $("#aranyak_single_2")[0].classList.add("invisible");
    $("#sportag_single_2")[0].classList.add("invisible");
    $("#oev_single_2")[0].classList.add("invisible");
    $("#aranyak_single")[0].classList.add("invisible"); $("#aranyak_single")[0].parent_div=undefined;
    $("#sportag_single")[0].classList.add("invisible"); $("#sportag_single")[0].parent_div=undefined;
    $("#oev_single")[0].classList.add("invisible"); $("#oev_single")[0].parent_div=undefined;

    this.unselect_gomb($("#F")[0]); $("#F")[0].hidden=false; $("#F")[0].disablable=true;
    this.unselect_gomb($("#N")[0]); $("#N")[0].hidden=false; $("#N")[0].disablable=true;
    this.unselect_gomb($("#egyéni")[0]); $("#egyéni")[0].hidden=false; $("#egyéni")[0].disablable=true;
    this.unselect_gomb($("#csapat")[0]); $("#csapat")[0].hidden=false; $("#csapat")[0].disablable=true;

    for (const c in this.carousels)
      this.carousels[c].reset();
    this.update_map_from_nevek();
  }

  static update_map_from_nevek()
  {
    const szhelyek = [];
    for (const item of this.carousels['nevek1'].items)
    {
      const div = item.element;
      if (!div.hidden)
      {
        let l=0;
        for (;l<szhelyek.length;l++)
          if (szhelyek[l][0] === div.sportolo.szhely)
            break;

        if (l===szhelyek.length)
        {
          szhelyek.push([div.sportolo.szhely, 1]);

        } else {
          szhelyek[l][1]++;
        }
      }
    }

    this.updatePointList(szhelyek);
  }

  static update_button_hiddens()
  {
    this.reset_timeout();

    // check selections
    const selected_nem = this.selected["nem"];
    const selected_oev = this.selected["oev"];
    const selected_sportag = this.selected["sportag"];
    const selected_csapat = this.selected["csapat"];
    const selected_aranyak = this.selected["aranyak"];

    let valid = new Object;
    valid["nem"] = this.filter_list("", selected_oev, selected_sportag, selected_csapat, selected_aranyak)["nem"];
    valid["oev"] = this.filter_list(selected_nem, "", selected_sportag, selected_csapat, selected_aranyak)["oev"];
    valid["sportag"] = this.filter_list(selected_nem, selected_oev, "", selected_csapat, selected_aranyak)["sportag"];
    valid["csapat"] = this.filter_list(selected_nem, selected_oev, selected_sportag, "", selected_aranyak)["csapat"];
    valid["aranyak"] = this.filter_list(selected_nem, selected_oev, selected_sportag, selected_csapat, "")["aranyak"];
    const filtered_list = this.filter_list(selected_nem, selected_oev, selected_sportag, selected_csapat, selected_aranyak);
//.. using this line instead will behave differently  const valid = this.filter_list(selected_nem, selected_oev, selected_sportag, selected_csapat, selected_aranyak);

    for (const button of this.buttons)
    {
      const gomb = button.gomb;
      const gtype = gomb[1];
      const gname = gomb[2];
      const valid_item = valid[gtype];
      let failed = false;
      for (const item of valid_item)
        if (item === gname)
        {
          const single_button = $("#"+gtype+"_single")[0];
          if (!single_button || !single_button.parent_div)
            this.unhide_button(button);
          failed = true;
          break;
        }

      if ((!button.hidden) && (!failed))
        this.hide_button(button);
    }

    const idxset = filtered_list["list"];
    const caritems1 = this.carousels['nevek1'].items;
    const caritems2 = this.carousels['nevek2'].items;
    for (let i=0;i<caritems1.length;i++)
    {
      let found = false;
      for (const j of idxset)
        if (i===j)
        {
          found = true;
          break;
        }

        caritems1[i].element.hidden = !found;
        caritems2[i].element.hidden = !found;
    }

    this.update_map_from_nevek();
  }

  static carousel_button_pressed(div)
  {
    if (div.hidden)
      return;

    const single_button = $("#"+div.gomb[1]+"_single")[0];
    if (single_button)
    {
      if (single_button.parent_div)
        this.unhide_button(single_button.parent_div);

      single_button.innerHTML = div.innerHTML;
      single_button.parent_div = div;
      single_button.classList.remove("invisible");
    }

    const single_button_2 = $("#"+div.gomb[1]+"_single_2")[0];
    if (single_button_2)
    {
      single_button_2.innerHTML = div.innerHTML;
      single_button_2.classList.remove("invisible");
    }

    this.selected[div.gomb[1]] = div.gomb[2];
    this.hide_button(div);
    this.update_button_hiddens();
    this.last_carousel_button_pressed[div.gomb[1]] = div.id;
  }

  static kettos_gomb_pressed(div)
  {
    if (div.hidden)
      return;

     const single_gomb = $("#"+div.gomb[1]+"_single_2")[0];
    if (div.selected)
    {
      this.unselect_gomb(div);
      if (single_gomb)
        single_gomb.classList.add("invisible");
      this.selected[div.gomb[1]]="";
      delete this.last_kettos_button_pressed[div.gomb[1]];
    } else {
      this.select_gomb(div);
      if (single_gomb)
      {
        single_gomb.classList.remove("invisible");
        single_gomb.innerHTML = div.gomb[0];
      }
      this.selected[div.gomb[1]]=div.gomb[2];
      this.last_kettos_button_pressed[div.gomb[1]]=div.id;
    }

    if (!div.masik_div.hidden)
      this.unselect_gomb(div.masik_div);

    this.update_button_hiddens();
  }

  static single_button_pressed(div)
  {
    if (!div.parent_div)
      return;

    this.selected[div.parent_div.gomb[1]]="";
    this.unhide_button(div.parent_div);
    delete this.last_carousel_button_pressed[div.parent_div.gomb[1]];
    div.parent_div = undefined;

    div.classList.add("invisible");
    $("#"+div.id+"_2")[0].classList.add("invisible");

    this.update_button_hiddens();
  }

  static activate_map_screen()
  {
    let html = `
      <div id="map_screen">
      <div id="nem_single_2" class="carousel-element idle-nem invisible" style="position:absolute;top:0px;left:0px">NEM</div>
      <div id="csapat_single_2" class="carousel-element idle-csapat invisible" style="position:absolute;top:150px;left:0px">CSAPAT</div>
      <div id="aranyak_single_2" class="carousel-element idle-aranyak invisible" style="position:absolute;top:300px;left:0px">ARANYAK</div>
      <div id="sportag_single_2" class="carousel-element idle-sportag invisible" style="position:absolute;top:450px;left:0px">SPORT</div>
      <div id="oev_single_2" class="carousel-element idle-oev invisible" style="position:absolute;top:600px;left:0px">SPORT</div>

      <div id="reset" class="carousel-element selected-reset" style="position:absolute;top:1100px;left:0px">SZŰRŐK TÖRLÉSE</div>
      <div id="aranyak_single" class="carousel-element idle-aranyak invisible" style="position:absolute;top:1100px;left:150px">ARANYAK</div>
      <div id="sportag_single" class="carousel-element idle-sportag invisible" style="position:absolute;top:1100px;left:300px">SPORT</div>
      <div id="oev_single" class="carousel-element idle-oev invisible" style="position:absolute;top:1100px;left:450px">SPORT</div>
      <div id="N" class="carousel-element idle-nem" style="position:absolute;top:1370px;left:0px;width:150px;height:150px">NŐI</div>
      <div id="F" class="carousel-element idle-nem" style="position:absolute;top:1520px;left:0px;width:150px;height:150px">FÉRFI</div>
      <div id="ures-mezo" class="empty" style="position:absolute;top:1674px;left:4px;width:142px;height:142px"></div>
      <div id="egyéni" class="carousel-element idle-egyeni" style="position:absolute;top:1820px;left:0px;width:150px;height:150px">EGYÉNI</div>
      <div id="csapat" class="carousel-element idle-egyeni" style="position:absolute;top:1970px;left:0px;width:150px;height:150px">CSAPAT</div>
      <div id="carousel-aranyak"></div>
      <div id="carousel-sportag"></div>
      <div id="carousel-oev"></div>
      <div id="carousel-nevek1"></div>
      <div id="carousel-nevek2"></div>
      <img id="aranyak_up" src="data/scroll_up.png" style="position:absolute;bottom:790px;left:205px;width:40px;height:40px;opacity:1">
      <img id="aranyak_down" src="data/scroll_down.png" style="position:absolute;bottom:0px;left:205px;width:40px;height:40px">
      <img id="sportag_up" src="data/scroll_up.png" style="position:absolute;bottom:790px;left:355px;width:40px;height:40px;opacity:1">
      <img id="sportag_down" src="data/scroll_down.png" style="position:absolute;bottom:0px;left:355px;width:40px;height:40px">
      <img id="oev_up" src="data/scroll_up.png" style="position:absolute;bottom:790px;left:505px;width:40px;height:40px;opacity:1">
      <img id="oev_down" src="data/scroll_down.png" style="position:absolute;bottom:0px;left:505px;width:40px;height:40px">
      <img id="nevek_up" src="data/scroll_up.png" style="position:absolute;top:1080px;left:1700px;width:40px;height:40px;opacity:1">
      <img id="nevek_down" src="data/scroll_down.png" style="position:absolute;bottom:0px;left:1700px;width:40px;height:40px">
      </div>
    `;

    $("#actual_screen")[0].innerHTML = html;

    this.buttons = new Array;
    this.buttons.push($("#N")[0]);
    this.buttons.push($("#F")[0]);
    this.buttons.push($("#egyéni")[0]);
    this.buttons.push($("#csapat")[0]);
    $("#N")[0].gomb = gombok[9];
    $("#N")[0].masik_div = $("#F")[0];
    $("#F")[0].gomb = gombok[10];
    $("#F")[0].masik_div = $("#N")[0];
    $("#egyéni")[0].gomb = gombok[19];
    $("#egyéni")[0].masik_div = $("#csapat")[0];
    $("#csapat")[0].gomb = gombok[20];
    $("#csapat")[0].masik_div = $("#egyéni")[0];

    $("#N").on('click', e=>{ this.kettos_gomb_pressed(e.target); });
    $("#F").on('click', e=>{ this.kettos_gomb_pressed(e.target); });
    $("#egyéni").on('click', e=>{ this.kettos_gomb_pressed(e.target); });
    $("#csapat").on('click', e=>{ this.kettos_gomb_pressed(e.target); });
    
    $("#reset").on('click', e=>{ this.reset_map(); });
    $("#aranyak_single").on('click', e=>{ this.single_button_pressed(e.target); });
    $("#sportag_single").on('click', e=>{ this.single_button_pressed(e.target); });
    $("#oev_single").on('click', e=>{ this.single_button_pressed(e.target); });

    const elements = [];
    for (const gomb of gombok)
      elements[gomb[1]] = [];

    for (const gomb of gombok) {
      if ((gomb[1]==="aranyak") || (gomb[1]==="sportag") || (gomb[1]==="oev"))
      {
        const div = document.createElement('DIV');

        div.id=gomb[1]+"-"+gomb[2].replace(" ","-");
        div.classList.add('carousel-element');
        div.classList.add('idle-'+gomb[1]);
        div.innerHTML = gomb[0];
        div.gomb = gomb;
        //div.items = item;
        elements[gomb[1]].push(div);

        this.buttons.push(div);
        div.addEventListener('click', async e=>{
          this.carousel_button_pressed(e.target);
        });
      }
    }


    this.carousels = new Object;
    this.carousels["aranyak"] = new Carousel({  container: $("#carousel-aranyak")[0], orientation: 'vertical', items: elements["aranyak"], itemSize: [150,150], moveVelocity: -1, moveAcceleration: 800, gap: 0, fadeTime: 0});
    this.carousels["sportag"] = new Carousel({  container: $("#carousel-sportag")[0], orientation: 'vertical', items: elements["sportag"], itemSize: [150,150], moveVelocity: -1, moveAcceleration: 800, gap: 0, fadeTime: 0});
    this.carousels["oev"] = new Carousel({  container: $("#carousel-oev")[0], orientation: 'vertical', items: elements["oev"], itemSize: [150,150], moveVelocity: -1, moveAcceleration: 800, gap: 0, fadeTime: 0});

    for (let i=1;i<3;i++)
    {
      const nelements = [];
      for (const nev in olimpiadb)
      {
        const div = document.createElement('DIV');
        div.classList.add('carousel-nevek-element');
        div.classList.add('idle-oev');
        div.innerHTML = nev.substr(5).toUpperCase();
        div.nev = nev;
        div.sportolo = olimpiadb[nev]
        nelements.push(div);

        if (i==1)
        div.addEventListener('click', e=>{

          this.reset_timeout();
          this.activate_profile_screen(e.target.nev, e.target.sportolo);
          //e.target.hidden=true;
          //this.update_map_from_nevek();
        });
      }
      this.carousels['nevek'+i] = new Carousel({  container: $("#carousel-nevek"+i)[0], orientation: 'vertical', items: nelements, itemSize: [100,100], moveVelocity: -1, moveAcceleration: 800, gap: 0, fadeTime: 0});
    }

    // scrollozas atmasolasa a fenti listara
    this.carousels['nevek1'].carousel.addEventListener('scroll', e=>
    {
      this.reset_timeout();
      this.carousels['nevek2'].carousel.scrollTo({left:0, top: this.carousels['nevek1'].carousel.scrollTop, behavior: 'smooth'});
    });

/*    for (const carousel_nev in this.carousels)
    {
      const carousel = this.carousels[carousel_nev];
      carousel.carousel.addEventListener('scroll', e=>
      {
        if (carousel.carousel.scrollTop)
          $('#'+carousel_nev+"_up").css({opacity:1});
        else
          $('#'+carousel_nev+"_up").css({opacity:0});

        if (carousel.carousel.scrollTop >= carousel.carousel.scrollHeight - carousel.carousel.clientHeight)
          $('#'+carousel_nev+"_down").css({opacity:0});
        else
          $('#'+carousel_nev+"_down").css({opacity:1});

          console.log(carousel.carousel.scrollTop);
      });
    }*/

//    this.update();
    
/*
    /////// TEST CODE ///////
    window.addEventListener('keypress', e=>{
      const d = parseInt(e.key);
      if  (d>=1 && d<9) {
        this.updatePointList(cities.filter((v,i)=> i%d===0));
        // this.updatePointList(cities.slice(0, ~~(cities.length/d)));
      } else if (d===9) {
        this.updatePointList(cities.slice(0,1));
      } else if (d === 0) {
        this.updatePointList(cities.filter((v,i)=> ['Budapest','Kecskemét', 'Csákvár'].includes(v[0])));
      }
    });
    /////// TEST CODE END ///////
*/
    for (const b in this.last_carousel_button_pressed)
    {
      const id_name = this.last_carousel_button_pressed[b];
      const id_div = $("#"+this.last_carousel_button_pressed[b])[0];
      this.carousel_button_pressed(id_div);
    }

    for (const b in this.last_kettos_button_pressed)
    {
      const id_name = this.last_kettos_button_pressed[b];
      const id_div = $("#"+this.last_kettos_button_pressed[b])[0];
      this.kettos_gomb_pressed(id_div);
    }

    $("#map0")[0].className="map map0-default";
    $("#map1")[0].className="map map1-default";
//    $("#map0")[0].style="left:158px,top:0px,width:1370px,height:1080px";
//    $("#map1")[0].style="left:600px,bottom:0px,width:928px,height:1080px";

    this.disable_touch();
    setTimeout(() => {
      this.update_map_from_nevek();
      this.enable_touch();
    }, 1500);
  }

  static profile_screen_select(gombnev)
  {
    for (const div of document.querySelectorAll(".icon"))
    {
      if (div.id.includes(gombnev))
        div.classList.add("inverted");
      else
        div.classList.remove("inverted")
    }

  }

  static profile_screen_hide_arrows()
  {
    for (const div of document.querySelectorAll(".scrolltag"))
      div.style.opacity=0;
  }

  static profile_screen_show_arrows()
  {
    for (const div of document.querySelectorAll(".scrolltag"))
      div.style.opacity=1;
  }

  static activate_text()
  {
    this.profile_screen_show_arrows();
    this.profile_screen_select("text");

    $("#map0")[0].className="map map-off";
    $("#map1")[0].className="map map-off";
    $("#fulltop")[0].innerHTML="";
    $("#top_screen")[0].style.opacity = 1;

    $("#view")[0].innerHTML=`
      <div class="empty textbox" style="width:100%;height:100%"><div id="textbox" style="padding:16px;width:100%;height:100%;overflow:auto">`+this.act_sportolo.szovegek[0]+`</div></div>
    `;

    $("#view2")[0].innerHTML=`
      <div class="empty textbox" style="width:100%;height:100%"><div id="textbox2" style="padding:16px;width:100%;height:100%;overflow:auto">`+this.act_sportolo.szovegek[0]+`</div></div>
    `;

    // scrollozas atmasolasa a fenti listara
    $("#textbox")[0].addEventListener('scroll', e=>
    {
      this.reset_timeout();
      $("#textbox2")[0].scrollTo({left:0, top: $("#textbox")[0].scrollTop, behavior: 'smooth'});
    });
  }

  static activate_photo()
  {
    this.profile_screen_hide_arrows();
    this.profile_screen_select("photo");
    $("#map0")[0].className="map map-off";
    $("#map1")[0].className="map map-off";
    $("#top_screen")[0].style.opacity = 0;

    let html = `
    <div class="grid-photo" style="width:100%;height:100%">`;

    let allth=0;
    let first_tv_name = "";
    for (let y=0;y<4;y++)
    {
      for (let x=0;x<10;x++)
      {
        let photo_name = "data/empty.png";
        let tv_name = "";
        if (this.act_sportolo.fotok && allth<this.act_sportolo.fotok.length)
        {
          const raw_name = this.act_sportolo.fotok[allth];
          let filename_only = raw_name.substr(raw_name.lastIndexOf("/")+1).toLowerCase();
          photo_name = "terkepes_adatbazis/kepek_THUMBNAIL/"+filename_only.replace(".png","_thumbnail.png");
          tv_name = "terkepes_adatbazis/kepek_TV_SIZE/"+filename_only.replace(".png","_tv_size.png");
          if (first_tv_name === "")
            first_tv_name = tv_name;
          ++allth;
        }
        html += `<div><img id="`+tv_name+`" src="`+photo_name+`" class="photo"></div>`;
      }
    }

    html+=`</div>`;
    $("#view")[0].innerHTML=html;
    $("#fulltop")[0].innerHTML=`<img src="`+first_tv_name+`">`;

    for (const div of document.querySelectorAll(".photo"))
    {
      if (div.id != "")
        div.addEventListener('click', async e=>{
          this.reset_timeout();
          $("#fulltop")[0].innerHTML=`<img src="`+div.id+`">`;
        })
    }


    // <div id="textbox" style="padding:16px;width:100%;height:100%">
    // </div>

  }

  static activate_video()
  {
    this.profile_screen_hide_arrows();
    this.profile_screen_select("video");
    $("#map0")[0].className="map map-off";
    $("#map1")[0].className="map map-off";
    $("#fulltop")[0].innerHTML="";
    $("#top_screen")[0].style.opacity = 1;

    let html = `<img src="data/256X256_VIDEO.png" class="playing" style="top:2160px;left:0px;opacity:0">
    <div class="grid-video" style="width:100%;height:100%">`;

    let allth=0;
    for (let y=0;y<2;y++)
    {
      for (let x=0;x<2;x++)
      {
        let video_name = "data/empty.png"
        let tv_name = "";
        if (this.act_sportolo.videok && allth<this.act_sportolo.videok.length)
        {
          const raw_name = this.act_sportolo.videok[allth];
          let filename_only = raw_name.substr(raw_name.lastIndexOf("/")+1).toLowerCase();
          video_name = "terkepes_adatbazis/videok_thumbnail/"+filename_only.replace(".mp4","_thumbnail.png");
          tv_name = raw_name;
          ++allth;
        }
        html += `<div><img id="`+tv_name+`" src="`+video_name+`" class="video"></div>`;
      }
    }

    html+=`</div>`;
    $("#view")[0].innerHTML=html;
    $("#view2")[0].innerHTML=html;

//    $("#fulltop")[0].innerHTML=`<img src="`+first_tv_name+`">`;

    $(".playing")[0].addEventListener('click', async e=>{
      this.disable_touch();
      await this.stop_video();
      this.enable_touch();
    });

    for (const div of document.querySelectorAll(".video"))
    {
      if (div.id != "")
      {
        div.addEventListener('click', async e=>{
          this.disable_touch();
          let was_playing = this.video_name;
          await this.stop_video();
          if (was_playing != div.id)
          {
            const playing = $(".playing")[0];
            playing.style.opacity = 0.7;
            playing.style.left = div.offsetLeft+div.width/2-170/2+"px";
            playing.style.top = div.offsetTop+div.height/2+1080-170/2+"px";

            await this.start_video(div.id, {/*fadeout:fade_period,*/ callback: async (stat)=> {
              if (this.video && stat.status === 'terminated')
              {
                await this.stop_video();
              }
            }});
          }
          this.enable_touch();
        });
      }
    }


    // <div id="textbox" style="padding:16px;width:100%;height:100%">
    // </div>

  }

  static activate_profile_screen(nev, sportolo)
  {
    this.act_nev = nev;
    this.act_sportolo = sportolo;
    $("#actual_screen")[0].innerHTML =`
      <div id="fulltop"></div>
      <div id="top_screen" style="position:absolute;top:0;width:100%;height:50%">
        <img src="`+sportolo.profilkep+`" class="icon" style="left:10px;top:10px">
        <img src="`+this.sportag_png[sportolo.aranyak[0].sportag]+`" class="icon" style="left:220px;top:10px">
        <div class="empty" style="left:430px;top:10px;width:1270px;height:170px">`+nev.toUpperCase().substr(5)+`</div>
        <img id="text2" src="data/256X256_TEXT.png" class="icon" style="right:10px;top:250px">
        <img id="photo2" src="data/256X256_PHOTO.png" class="icon" style="right:10px;top:450px">
        <img id="video2" src="data/256X256_VIDEO.png" class="icon" style="right:10px;top:650px">
        <img id="map2" src="data/256X256_MAP.png" class="icon" style="right:10px;top:850px">

        <img id="fel2" src="data/scroll_up.png" class="scrolltag" style="position:absolute;left:835px;top:200px;width:40px;height:40px;opacity:0">
        <img id="le2" src="data/scroll_down.png" class="scrolltag" style="position:absolute;left:835px;top:1030px;width:40px;height:40px;opacity:0">

        <div id="view2" style="position:absolute;left:10px;top:250px;width:1690px;height:770px"></div>
      </div>

      <div style="position:absolute;top:1080px;width:100%;height:50%">
        <img src="`+sportolo.profilkep+`" class="icon" style="left:10px;top:10px">
        <img src="`+this.sportag_png[sportolo.aranyak[0].sportag]+`" class="icon" style="left:220px;top:10px">
        <div class="empty" style="left:430px;top:10px;width:1270px;height:170px">`+nev.toUpperCase().substr(5)+`</div>
        <img id="exit" src="data/256X256_EXIT.png" class="icon" style="right:10px;top:10px">
        <img id="text" src="data/256X256_TEXT.png" class="icon" style="right:10px;top:250px">
        <img id="photo" src="data/256X256_PHOTO.png" class="icon" style="right:10px;top:450px">
        <img id="video" src="data/256X256_VIDEO.png" class="icon" style="right:10px;top:650px">
        <img id="map" src="data/256X256_MAP.png" class="icon" style="right:10px;top:850px">
        <img id="fel" src="data/scroll_up.png" class="scrolltag" style="position:absolute;left:835px;top:200px;width:40px;height:40px;opacity:0">
        <img id="le" src="data/scroll_down.png" class="scrolltag" style="position:absolute;left:835px;top:1030px;width:40px;height:40px;opacity:0">
        <div id="view" style="position:absolute;left:10px;top:250px;width:1690px;height:770px"></div>
      </div>
      `;

    $("#exit").on('click', async e=>{ 
      this.disable_touch();
      await this.stop_video();
      this.enable_touch();
      this.activate_map_screen();
    });

    $("#text").on('click', async e=>{ 
      this.disable_touch();
      await this.stop_video();
      this.enable_touch();
      this.activate_text();
    });

    $("#photo").on('click', async e=>{ 
      this.disable_touch();
      await this.stop_video();
      this.enable_touch();
      this.activate_photo();
    });

    $("#video").on('click', async e=>{ 
      this.disable_touch();
      await this.stop_video();
      this.enable_touch();
      this.activate_video();
    });

    $("#map").on('click', async e=>{ 
      this.disable_touch();
      await this.stop_video();
      this.enable_touch();
      this.profile_screen_hide_arrows();
      this.profile_screen_select("map");
      $("#view")[0].innerHTML=``;
      $("#view2")[0].innerHTML=``;
      $("#fulltop")[0].innerHTML="";
      $("#top_screen")[0].style.opacity = 1;

      const m0 = $("#map0")[0];
      $("#map0")[0].className="map map0-profile";
      $("#map1")[0].className="map map1-profile";

      this.disable_touch();
      setTimeout(() => {
        this.updatePointList([[this.act_sportolo.szhely,1]], true, 170000000, 170000000);
        this.enable_touch();
      }, 500);
    });

   this.activate_text();
  }



  static initDOM() {
    super.initDOM();

    Object.assign(config, window.configParams);

    this.loadCss('libs/ol');

    let html = `
    <div id="touchcover"></div>
    <div id="map0" class="map">
      <canvas id="mapcanvas0" class="mapcanvas"></canvas>
    </div>
    <div id="map1" class="map">
      <canvas id="mapcanvas1" class="mapcanvas"></canvas>
    </div>
    <div id="actual_screen" style="position:absolute;width:100%;height:100%">
    </div>
    `;

    wrapper.innerHTML = html;

    this.activate_map_screen();

    this.sportag_png=new Array;
    this.sportag_png["atlétika diszkoszvetés"] = "data/256X256_ATLETIKA.png";
    this.sportag_png["atlétika gerelyhajítás"] = "data/256X256_ATLETIKA.png";
    this.sportag_png["atlétika kalapácsvetés"] = "data/256X256_ATLETIKA.png";
    this.sportag_png["atlétika távolugrás"] = "data/256X256_ATLETIKA.png";
    this.sportag_png["atlétika magasugrás"] = "data/256X256_ATLETIKA.png";
    this.sportag_png["birkózás"] = "data/256X256_BIRKOZAS.png";
    this.sportag_png["cselgáncs"] = "data/256X256_CSELGANCS.png";
    this.sportag_png["kajak"] = "data/256X256_KAJAK_KENU.png";
    this.sportag_png["kenu"] = "data/256X256_KAJAK_KENU.png";
    this.sportag_png["labdarúgás"] = "data/256X256_LABDARUGAS.png";

    this.sportag_png["művészeti versenyek"] = "data/256X256_OTKARIKA.png";
    this.sportag_png["ökölvívás"] = "data/256X256_BOX.png";
    this.sportag_png["öttusa"] = "data/256X256_OTTUSA.png";
    this.sportag_png["rövidpályás gyorskorcsolya"] = "data/256X256_GYORSKORCSOLYA.png";
    this.sportag_png["sportlövészet"] = "data/256X256_SPORTLOVESZET.png";
    this.sportag_png["torna"] = "data/256X256_TORNA.png";
    this.sportag_png["súlyemelés"] = "data/256X256_SULYEMELES.png";
    this.sportag_png["úszás"] = "data/256X256_USZAS.png";
    this.sportag_png["vívás"] = "data/256X256_VIVAS.png";
    this.sportag_png["vízilabda"] = "data/256X256_VIZILABDA.png";

    this.disable_touch();
    setTimeout(async ()=> {
      for (const sportolo of Object.values(olimpiadb))
      {
        if (sportolo.szovegek)
        {
          for (let i=0;i<sportolo.szovegek.length;i++)
          {
            let raw_name = sportolo.szovegek[i].substr(sportolo.szovegek[i].lastIndexOf("/")+1);
            sportolo.szovegek[i] = await server.request(`${server.baseUrl()}/terkepes_adatbazis/terkepes/szovegek/`+raw_name).catch(e=>{}) || "-";
          }
        } else {
          sportolo.szovegek = ["-"];
        }
      }
      this.reset_map();

//      const nev = "[057]Egerszegi Krisztina";
 //     this.activate_profile_screen(nev, olimpiadb[nev]);
      this.enable_touch();
    }, 1000);
  }

  static init() {
    this.points = {};
    this.allpoints = {};
    this.images = {};
    this.sectors = [];
    this.inputBlocked = 0;

    super.init();
  }

  static mapFade(map, target, time) {
    map.fadeTarget = target;
    map.fadeSpeed = 1/1000/time;
  }

  static initMap(idx) {
    this.map = this.map || [];

    const mapExpandw = 80000;
    const mapExpandh = 200000;
    
    let extent = undefined;

    // let extent = [this.minx-mapExpandw, this.miny-mapExpandh, this.maxx+mapExpandw, this.maxy+mapExpandh];
    // if (idx) extent = undefined;

    const mapview = new ol.View({
      center:MAP_CENTER,//ol.proj.fromLonLat([19.0399, 47.49801]),
      zoom:DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      extent,
      showFullExtent: true,
      smoothExtentConstraint: true,
      constrainOnlyCenter: false,
    });

    this.osm = new ol.source.OSM({
      cacheSize: 1024,
      url: server.baseUrl()+'/tiles3/{z}/{x}/{y}.png',
      tileLoadFunction: (imageTile, src)=>{
        const coord = imageTile.tileCoord;
        const z = TILE_LIMITS[coord[0]];
        if (!z || coord[1]<z[0] || coord[1]>z[1] || coord[2]<z[2] || coord[2]>z[3]) {
          src = '';
        }
        imageTile.getImage().src = src;
      },
    });

    const mapparams = {
      target: 'map'+idx,
      layers: [new ol.layer.Tile({source: this.osm, preload:11})],
      view: mapview,
    };

    // if (DISABLE_INTERACTION) {
    //   mapparams.interactions = [];
    //   mapparams.controls = [];
    // }

    this.map[idx] = new ol.Map(mapparams);
    Object.assign(this.map[idx], {
      mapview: mapview,
      mapelement: window['map'+idx],
      mapcanvas: window['mapcanvas'+idx],
      scene: {},
      refreshNeeded: 1,
      mapidx: idx,
      fadeState: 1,
      fadeTarget: 1,
      fadeSpeed: 1,
      selectedPoints: {},
      pinnedPoints: {},
    });

    const interacts = this.map[idx].getInteractions();
    [...interacts.array_].forEach(interact=>{
      if (DISABLE_INTERACTION || interact instanceof ol.interaction.PinchRotate || interact instanceof ol.interaction.DoubleClickZoom) {
        interacts.remove(interact);
      }
    });

    const controls = this.map[idx].getControls();
    [...controls.array_].forEach(control=>{
      if (control instanceof ol.control.Attribution) return;
      if (DISABLE_INTERACTION || control instanceof ol.control.Zoom) {
        controls.remove(control);
      }
    });
  }

  static getImage(point) {
    const imgid = point.imgid;
    let img = this.images[imgid];
    if (!img) {
      if (point.sum === 1) {
        img = {img: document.createElement('img'), offset:[PIN_0_X, PIN_0_Y]};
        img.img.src = 'assets/app-csarnok/flag1.png';
      } else {
        const area = point.imgid.endsWith('a');
        const imgName = area ? 'area' : 'group';

        let baseimg = this.images[imgName];
        if (!baseimg) {
          baseimg = this.images[imgName] = {img: document.createElement('img'), offset:[PIN_0_X, PIN_0_Y]};
          baseimg.img.src = 'assets/app-csarnok/' + (area ? 'flag3' : 'flag2') + '.png';
        }

        if (!baseimg.img.complete) {
          return null;
        }

        const textcolor = '#222222';
        const fontsize = 13;

        img = {img: document.createElement('canvas'), offset:[PIN_0_X, PIN_0_Y]};
        img.img.width = PIN_WIDTH;
        img.img.height = PIN_HEIGHT;

        const ctx = img.img.getContext('2d');

        const imgx = img.offset[0]-PIN_0_X;
        const imgy = img.offset[1]-PIN_0_Y;

        ctx.drawImage(baseimg.img, imgx, imgy);

        // ctx.fill();
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textcolor;
        ctx.font = `600 ${fontsize}px sans-serif`;
        ctx.fillText(point.sum, imgx+PIN_TEXT_X, imgy+PIN_TEXT_Y);

        img.img.complete = true;
      }

      this.images[imgid] = img;
    }

    return img;
  }

  static drawPoints(map, points, level, rect) {
    const idx = map.mapidx;
    for (const id of Object.keys(points)) {
      const point = points[id];
      const px = point.pos[0];
      const py = point.pos[1];
      const r = point.radius;

      if (px<(rect[0]-r) || px>(rect[2]+r) || py<(rect[1]-r) || py>(rect[3]+r)) {
        continue;
      }

      if (point.children && point.level>level) {
        this.drawPoints(map, point.children, level, rect);
      } else {
        map.scene[id] = point;
        point.render[idx].f = true;
      }
    }
  }

  static drawScene(map, w, h, dt) {
    const idx = map.mapidx;
    if (map.mapcanvas.width !== w || map.mapcanvas.height !==h) {
      map.mapcanvas.width = w;
      map.mapcanvas.height = h;
    }

    const ctx = map.mapcanvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    const p0 = map.mapp0;

    const scene = Object.entries(map.scene).sort((a,b)=>b[1].pos[1] - a[1].pos[1]);

    for (const [id, point] of scene) {
      const render = point.render[idx];

      if (render.f) {
        render.t = Math.min(render.t+dt, FADE_TIME);
        if (render.t<FADE_TIME) map.refreshNeeded = 1;
        render.f = false;
      } else {
        render.t = Math.max(render.t-dt, 0);
        if (render.t>0) {
          map.refreshNeeded = 1;
        } else {
          delete map.scene[id];
          continue;
        }
      }

      const img = point.img = this.getImage(point);
      if (img && img.img.complete) {
        let r = u.smoothstep(render.t / FADE_TIME);
        const canmove = false;///!///r<1 && point.parent && point.parent.render[idx].t>0;
        const p = canmove?u.lerp(point.parent.pos, point.pos, r):point.pos;
        const x = (p[0] - p0[0]) / map.mapres - img.offset[0];
        const y = (p0[1] - p[1]) / map.mapres - img.offset[1];

        if (!map.selectedPoints[point.id]) r *= map.fadeState;

        ctx.globalAlpha = r;
        ctx.drawImage(img.img, x, y);
      } else {
        map.refreshNeeded = 1;
      }
    }
  }

  static refreshPoints() {
    const t = Date.now();
    const dt = t - (this.lastt || t);
    this.lastt = t;

    for (const map of this.map) {
      const ww = map.mapelement.clientWidth;
      const wh = map.mapelement.clientHeight;
      const [w,h] = map.getSize();

      const center = map.mapview.getCenter();
      const res = map.mapres = map.mapview.getResolution();
      const rect = [center[0] - w/2*res, center[1] - h/2*res, center[0] + w/2*res, center[1] + h/2*res];
      const p0 = map.mapp0 = [rect[0], rect[3]];
      const lp0 = map.lastP0 || [0,0];

      if (map.fadeTarget !== map.fadeState) {
        map.refreshNeeded = 1;
        if (map.fadeTarget>map.fadeState) {
          map.fadeState = Math.min(map.fadeState+dt*map.fadeSpeed, map.fadeTarget);
        } else {
          map.fadeState = Math.max(map.fadeState-dt*map.fadeSpeed, map.fadeTarget);
        }
      }

      if (map.refreshNeeded || p0[0] !== lp0[0] || p0[1] !== lp0[1] || map.lastMapRes !== res) {
        map.refreshNeeded = Math.max(0, map.refreshNeeded-1);
        map.lastP0 = p0;
        map.lastMapRes = res;
        this.drawPoints(map, this.points, res*MAP_RESOLUTION_MULTIPLIER, rect);

        for (const id of Object.keys(map.pinnedPoints)) {
          map.scene[id] = map.pinnedPoints[id];
          map.pinnedPoints[id].render[map.mapidx].f = true;
        }

        this.drawScene(map, ww, wh, dt);
      }

      if (ww!==w || wh!==h) map.updateSize();
    }

    requestAnimationFrame(()=>this.refreshPoints());
  }

  static neighbors(point, r, filter) {
    const p0 = point.pos;
    const points = {};
    const r2 = r*r;
    const x = point.pos[0];
    const y = point.pos[1];
    const sx = this.sectorX(x);
    const sy = this.sectorY(y);
    const extx = Math.ceil(r/this.sectorSizeX);
    const exty = Math.ceil(r/this.sectorSizeY);
    let cx = 0;
    let cy = 0;
    let sum = 0;
    let num = 0;
    for (const sect of this.getSectors([sx-extx, sy-exty, sx+extx, sy+exty])) {
      for (const p of sect.values()) {
        if ((u.dist2(p.pos, p0) <= r2) && (!filter || filter(p))) {
          cx += p.pos[0] * p.sum;
          cy += p.pos[1] * p.sum;
          sum += p.sum || 1;
          num++;
          points[p.id] = p;
        }
      }
    }

    const center = sum?[cx/sum, cy/sum]:[p0[0],p0[1]];

    return {points, center, num, sum};
  }

  static sectorX(x) {
    return Math.min(Math.floor((x-this.minx)/this.sectorSizeX), NUM_SECTORS_X-1);
  }

  static sectorY(y) {
    return Math.min(Math.floor((y-this.miny)/this.sectorSizeY), NUM_SECTORS_Y-1);
  }

  static weightedAvgPos(p1, w1, p2, w2) {
    return [(p1[0]*w1+p2[0]*w2)/(w1+w2), (p1[1]*w1+p2[1]*w2)/(w1+w2)];
  }

  static getSectors(rect) {
    const res = [];
    if (rect[2]<0) return res;

    const maxx = Math.min(NUM_SECTORS_X-1, rect[2]);
    const maxy = Math.min(NUM_SECTORS_Y-1, rect[3]);

    for (let y=Math.max(0, rect[1]);y<=maxy;y++) {
      for (let x=Math.max(0, rect[0]);x<=maxx;x++) {
        res.push(this.sectors[y*NUM_SECTORS_X + x]);
      }
    }
    return res;
  }

  static setParent(points, parent) {
    for (const k of Object.keys(points)) {
      this.allpoints[k] = points[k];
      points[k].parent = parent;
      if (points[k].children) {
        this.setParent(points[k].children, points[k]);
      }
    }
  }

  static postProcessPoints(points) {
    Object.entries(points).forEach(v=>{
      const point = v[1];
      point.zoom = MAX_ZOOM;
      if (point.level) {
        const res = (point.level / MAP_RESOLUTION_MULTIPLIER)/1.05;
        point.zoom = Math.max(MIN_ZOOM, this.map[0].mapview.getZoomForResolution(res));
      }
      point.imgid = point.sum + (point.zoom < MAX_ZOOM ? 'a':'');

      if (point.children) {
        this.postProcessPoints(point.children);
      }
    });
  }

  static groupPoints() {
    let level = 1000;
    const points = this.points;

    while (level<100000) {
      const keys = Object.keys(points)
                   .map(k=>({k, num:this.neighbors(points[k], level).num}))
                   .sort((v1,v2)=>v2.num - v1.num)
                   .map(v=>v.k);

      for (const key of keys) {
        const point = points[key];
        if (!point) continue;

        const area = this.neighbors(point, level, p=>p.level!==level);
        if (area.num > 1) {
          let radius = 0;
          for (const k of Object.keys(area.points)) {
            const ap = area.points[k];
            radius = Math.max(u.dist(area.center, ap.pos) + ap.radius, radius);
          }

          const group = {
            id: this.idcounter++,
            pos: area.center,
            children: area.points,
            sum: area.sum,
            render: [{t:0,f:false}, {t:0,f:false}],
            level, radius,
          }
          points[group.id] = group;
          this.sectorFromPos(group.pos).set(''+group.id, group);

          for (const k of Object.keys(area.points)) {
            this.sectorFromPos(area.points[k].pos).delete(''+k);
            delete points[k];
          }
        }
      }

      level *= 1.47;
    }
  }

  static sectorFromPos(p) {
    const sectx = this.sectorX(p[0]);
    const secty = this.sectorY(p[1]);
    return this.sectors[secty*NUM_SECTORS_X + sectx];
  }

  static async initPoints(pointList) {
    const t0 = Date.now();

    this.points = {};
    this.allpoints = {};
    this.sectors = [];

    const sectors = this.sectors;
    for (let y=0;y<NUM_SECTORS_Y;y++) {
      for (let x=0;x<NUM_SECTORS_X;x++) {
        sectors[y*NUM_SECTORS_X+x] = new Map();
      }
    }

    let data = [];
    let c = 0;
    for (const point of pointList) {
      for (let i=0;i<point[1];i++) {
        const loc = cityLocations[point[0]];
        data.push({id:++c, lon:loc.lon, lat:loc.lat});
      }
    }

    const points = this.points = {};

    for (const point of data) {
      point.pos = ol.proj.fromLonLat([point.lon, point.lat]);
    }

    this.minx = this.maxx = data[0] ? data[0].pos[0] : MAP_CENTER[0];
    this.miny = this.maxy = data[0] ? data[0].pos[1] : MAP_CENTER[1];
    this.idcounter = 0;

    for (const p of data) {
      p.id = parseInt(p.id);
      points[p.id] = p;
      this.minx = Math.min(this.minx, p.pos[0]);
      this.maxx = Math.max(this.maxx, p.pos[0]);
      this.miny = Math.min(this.miny, p.pos[1]);
      this.maxy = Math.max(this.maxy, p.pos[1]);
      this.idcounter = Math.max(this.idcounter, p.id);
    }

    this.idcounter++;
    this.sectorSizeX = Math.max((this.maxx - this.minx)/NUM_SECTORS_X, 1);
    this.sectorSizeY = Math.max((this.maxy - this.miny)/NUM_SECTORS_Y, 1);

    for (const id of Object.keys(points)) {
      const p = points[id];
      this.sectorFromPos(p.pos).set(''+id, p);
      p.sum = 1;
      p.level = 0;
      p.radius = 0;
      p.render = [{t:0,f:false}, {t:0,f:false}];
    }

    this.groupPoints();
    this.setParent(this.points, null);

    this.pointsInitialized = true;
    this.initMaps();

    const t1 = Date.now();
    console.log(`initPoints duration: ${t1-t0}ms`);
  }

  static animateMap(idx, zoom, center) {
    if (!this.map[idx]) return;

    const view = this.map[idx].mapview;
    if (view.animateTimer) {
      view.targetZoom = zoom;
      view.targetCenter = center;
    } else {
      this.map[idx].refreshNeeded = 1;
      view.animate({zoom, center, duration:ZOOM_TIME, easing:v=>u.smootherstep(v)});
      view.targetCenter = null;
      view.animateTimer = setTimeout(()=>{
        view.animateTimer = null;
        if (view.targetCenter) this.animateMap(idx, view.targetZoom, view.targetCenter);
      }, ZOOM_TIME);
    }
  }

  static start() {
    super.start();
    this.initPoints([]);
  }

  static initMaps() {
    if (!this.pointsInitialized || !this.stylesLoaded || this.map) return;

    this.initMap(0);
    this.initMap(1);
    this.postProcessPoints(this.points);
    this.refreshPoints();

    setTimeout(()=>this.screenLoaded(), 500);
  }

  static allCssLoaded() {
    super.allCssLoaded();
    this.stylesLoaded = true;
    this.initMaps();
  }

  static updatePointList(pointList, force = false, zoom_hack1 = 100000000, zoom_hack2 = 170000000) {
    const rawText = JSON.stringify(pointList);
//    if (!force && (this.lastPointListJson === rawText)) return;
    this.lastPointListJson = rawText;

    this.initPoints(pointList);
    this.postProcessPoints(this.points);

    const zoom0 = Math.min(Math.max(MIN_ZOOM, Math.log2(zoom_hack1 / Math.max(this.maxx - this.minx, this.maxy - this.miny))), MAX_ZOOM);
    const zoom1 = Math.min(Math.max(MIN_ZOOM, Math.log2(zoom_hack2 / Math.max(this.maxx - this.minx, this.maxy - this.miny))), MAX_ZOOM);
    const center = [(this.maxx+this.minx) / 2, (this.maxy+this.miny) / 2];

    this.animateMap(0, zoom0, center);
    this.animateMap(1, zoom1, center);
  }
}

app_csarnok_terkep.init();
