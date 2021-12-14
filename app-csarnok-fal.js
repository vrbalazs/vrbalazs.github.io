import aa_app from './aa-app.js'
import u from './libs/utils.js'
import olimpiadb from './data/olimpiadb.js'
import server from './libs/server.js'
import video from './libs/video.js'

const config = {}

const size = [1920, 1080*2];

const randomised = [ 138,  126,  118,  85,    6,  151,  146,   50,  101,  114,   37,   61,   58,   72,  155,   96,    3,   33,  119,    1,
                      67,  113,  147,  145,   31,   93,   73,  141,   20,  129,   82,  104,  144,   21,  133,  121,   71,  128,   52,  111,
                     117,   79,  148,   35,  106,   62,   28,   34,  143,   97,   47,   27,  125,   99,   92,   80,   12,  152,   15,  124,
                      88,    4,   59,   87,  122,   42,    7,   78,   83,   91,   63,  137,   14,   54,  110,  109,   19,  116,    8,   90,
                     136,   22,  108,  100,  153,    0,   30,   36,  120,    5,  102,  140,   77,   40,  139,  115,   94,   98,   53,   26,
                      41,   56,   44,   43,   39,   18,   75,   48,   11,   81,  150,   57,   45,  130,  135,   29,   95,   38,   32,   46,
                      60,   55,   16,  123,   76,    2,   49,  134,  132,   69,  105,   66,   74,  131,  142,   13,   51,   68,  103,   64,
                      25,   24,   17,   84,   70,   86,  127,   65,  154,   89,   10,  107,    9,  112,  149,   23];

export default class app_csarnok_fal extends aa_app {

  static allowResize() { return size; }

  /*static blinky() {
    this.blinky_state = !this.blinky_state;
    setTimeout(()=>this.blinky(), 500);
  }*/

  static cursor_on  = ' <p style="color:#ffffff">█ ';
  static cursor_off  = ' <p style="color:#000000">█ ';
  static text_color = '<p style="color:#ffffff">';
  static small_space = ' ';
  
  /*static reset_wall()
  {
    //this.blinky_state = false;
    this.walltext = "";
    this.next_walltext = "";
  }*/


  static buildup_walltext()
  {
    clearTimeout(this.buildup_timeout);
    let nextlen = this.next_walltext.length;
    let cursor_front = /*this.blinky_state ? this.cursor_on :*/ this.cursor_off;
    let cursor_trail = this.cursor_off;
    if (nextlen)
    {
      this.buildup_timeout = setTimeout(()=>this.buildup_walltext(), 50);
      this.walltext += this.next_walltext[0];
      this.next_walltext = this.next_walltext.substring(1);
      cursor_front = this.cursor_off;
      cursor_trail = this.cursor_on;
    }
    //document.querySelectorAll('.scroll')[0].innerHTML = cursor_front + this.text_color + this.walltext + cursor_trail;
  }

  static message(filtered_list_string)
  {
    const filtered_list = JSON.parse(filtered_list_string);

    const scroll = document.querySelectorAll('.scroll')[0];
    const wallpaper = document.querySelectorAll('.wallpaper');
    const images = document.querySelectorAll('.image');
    const people = filtered_list[1];

    if (people.length>0 && people.length<=randomised.length)
    {
      for (const b of wallpaper)
          b.classList.add("deselected")

      const lang = filtered_list[0] + "/portrek/aa_tudarccsarnok_264x352___";
      for (const b of images)
      {
        b.classList.remove("hidden");
        b.src = "data/empty.jpg";
        let i = 0;
        for (const p of people)
        {
          if (i == b.id)
          {
            b.src = lang + (('000' + (p + 1)).substr(-3)) + ".jpg";
            break;
          }
          ++i;
        }
      }

      scroll.classList.remove("hidden");
//      scroll.textContent = filtered_list[2];

      // temporary content
      if (filtered_list[0] === "data/hun")
      {
        scroll.textContent = people.length + " szakember";
      } else {
        scroll.textContent = people.length + (people.length > 1 ? " professionals" : " professional");
      }

    } else {
      for (const b of wallpaper)
        b.classList.remove("deselected");
      for (const b of images)
        b.classList.add("hidden");
      scroll.classList.add("hidden");
    }
  }

  static initDOM() {
    super.initDOM();

    Object.assign(config, window.configParams);
    Object.assign(wrapper.style, {width:size[0]+'px',height:size[1]+'px'});

//  <div id="title1" class="title" style="height:50%">${window.appname} screen 1</div>
//  <div id="title2" class="title" style="height:50%">${window.appname} screen 2</div>

    let kepek = new Array;
    for (const nev in olimpiadb)
      kepek.push(olimpiadb[nev].csarnokkep);
    kepek.push("");

    this.person_to_tile = new Array;

    this.wall_num = config.APP[config.APP.length-1] - 1;
    let dynhtml = '<div class="background">';
    dynhtml += '<img src="data/fal'+(this.wall_num * 2)+'.png" class="wallpaper" style="top:660px;left:420px">';
    dynhtml += '<img src="data/fal'+(this.wall_num * 2 + 1)+'.png" class="wallpaper" style="top:-420px;left:420px">';

    // fill in all the thingies
    for (let x=0;x<8;x++)
      for (let y=0;y<3;y++)
      {
        let top = (7-x)*270 - 40;//(7-x) * 270 - 25;
        let left = y * 358 + 700//y * 320 + 25;

        let tile_number = (x * 3 + y) + (this.wall_num * 24) - 6;
        if (tile_number >=0 && tile_number < randomised.length)
          dynhtml += '<img id="' + randomised[tile_number] + '" src="data/empty.jpg" class="image" style="top:'+top+'px;left:'+left+'px">';
      }

    dynhtml += '<div id="scroll" class="scroll" style="top:'+(this.wall_num * 2160 -2970-70)+'px;left:10px"></div>';
    dynhtml += "</div>";
    wrapper.innerHTML = dynhtml;
    // this.setPortraitMode('1.0813,1');

//    const images = document.querySelectorAll('.image');

//    document.querySelectorAll('.image')[0].className = "image deselected";
//    document.querySelectorAll('.scroll')[0].textContent = "18 Olimpian 1234 Olimpikon 23 versenyszamban_";

/*    $('#title1').on('click', e=>{
      console.log('Title clicked');
    });*/

    this.screenLoaded();

    server.onPeerMessage((filtered_list_string)=>{
      this.message(filtered_list_string);
/*      const filtered_list = JSON.parse(filtered_list_string);

      for (const img of document.querySelectorAll('.image'))
      {
        img.className = "image deselected";
        for (const idx of filtered_list[0])
          if (idx == img.id)
          {
            img.className = "image";
            break;
          }
      }
      this.walltext ="";
      this.next_walltext = filtered_list[1];
      this.buildup_walltext();*/
    });

    this.message('["data/hun", [], ""]');

    // demo - can be disabled
    $('.wallpaper').on('click', e=>{
      if (this.melyik)
      {
        this.melyik = false;
        this.message('["data/hun", [], ""]');
      } else {
        this.melyik = true;

        var filtered_list = new Array;
        /*for (let i=0;i<Math.random()*156;i++)
          filtered_list.push(i);*/

          for (let i=0;i<randomised.length/2;i++)
            filtered_list.push(i);

          for (let i=0;i<1000;i++)
          {
            let i1 = Math.floor(Math.random()*filtered_list.length);
            let i2 = Math.floor(Math.random()*filtered_list.length);
            let x = filtered_list[i1];
            filtered_list[i1]=filtered_list[i2];
            filtered_list[i2]=x;

          }
        this.message(JSON.stringify(["data/hun", filtered_list, "This is just the demo mode but i definitely need to write"]));
      }
    });
  }

  static start() {
    super.start();
    //console.log('app_csarnok_fal started');
  }
}
