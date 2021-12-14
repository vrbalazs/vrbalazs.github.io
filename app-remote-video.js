import aa_app from './aa-app.js'
import server from './libs/server.js'
import u from './libs/utils.js'
import video from './libs/video.js'

const config = {}
const size = [1920, 1080];
const fade_period = 0.2;

export default class app_remote_video extends aa_app {

  static allowResize() { return size; }
  static defaultBackground() { return ""; }

  static async start_video(video_name, origin, add_args)
  {
    await this.stop_video();
    let args = {/*fadein:fade_period,*/ vol:this.volume};
    Object.assign(args, add_args);

    if (this.rpi)
    {
      await server.cgi('killall', 'omxplayer.bin'); // because it gets stuck sometimes
      await server.cgi('initdisplay', '2'); // because the output sometimes gets disabled
      Object.assign(args, {win:'0,0,1920,1080',display:2,layer:0,aspect_mode:"stretch", adev:this.audiodev});
    } else {
      Object.assign(args, {browser_mode: true, muted:true, domParent: $("#video")[0]});
    }

    this.origin = origin;
    this.video_name = video_name;
    this.video = video.open(video_name, args);
  }

  static video_ended()
  {
    if (this.origin)
      server.sendToPeer(this.origin, `["stopped", "`+this.video_name+`"]`);

    this.origin=undefined;
    this.video_name=undefined;
    this.video=undefined;
  }

  static async stop_video()
  {
    if (this.video)
    {
      const video_stopping = this.video;
      this.video = undefined;
      video_stopping.fadeStop(fade_period);
      await u.timeout(fade_period*1000+500);
      video_stopping.terminate();
      this.video_ended();
    }
  }

  static stop2_video()
  {
    if (this.video)
    {
      const video_stopping = this.video;
      this.video = undefined;
      video_stopping.terminate();
      this.video_ended();
    }
  }

  static async process_command_list()
  {
    while (this.command_list.length)
    {
        switch (this.command_list[0])
        {
            case "play":
            {
                const anim_name = this.command_list[1];
                const args = this.command_list[2];
                const origin = this.command_list[3];

                Object.assign(args, {/*fadein:fade_period,*/ callback: async (stat)=> {
                    if (this.video && stat.status === 'terminated')
                    {
                      this.video=undefined;
                      this.video_ended();
                    }
                  }});

                if (args.loop !== undefined)
                    delete args["fadeout"];

                await this.start_video(anim_name, origin, args);

                this.command_list.shift();
                this.command_list.shift();
                this.command_list.shift();
            } break;

            case "play2":
            {
                const anim_name = this.command_list[1];
                const args = this.command_list[2];

                await this.start_video(anim_name, undefined, args);

                this.command_list.shift();
                this.command_list.shift();
            } break;

            case "stop":
            {
              await this.stop_video();
            } break;

            case "stop2":
            {
              this.stop2_video();
            } break;

            case "image":
            {
                $(".background")[0].innerHTML = this.command_list[1] ? '<img src="'+this.command_list[1]+'">' : '';
                this.command_list.shift();
            } break;

            case "color":
            {
                $(".background").css({background:this.command_list[1]});
                this.command_list.shift();
            } break;

            case "cgi":
            {
              await server.cgi(this.command_list[1], this.command_list[2]);
              this.command_list.shift();
              this.command_list.shift();
            } break;
        }
        this.command_list.shift();
    }
  }

  static initDOM() {
    super.initDOM();

    Object.assign(config, window.configParams);
    Object.assign(wrapper.style, {width:size[0]+'px',height:size[1]+'px'});

        wrapper.innerHTML = `
    <div id="bg" class="background">
      <div id="video" class="title" style="height:100%"></div>
    </div>
    `;

    const default_background = this.defaultBackground();
    $(".background")[0].innerHTML = default_background ? '<img src="'+default_background+'">' : '';

    server.onPeerMessage(async (command_list_string)=>{
      const new_command_list = JSON.parse(command_list_string);

      const command_list_empty = !this.command_list.length;
      this.command_list = this.command_list.concat(new_command_list);
      if (command_list_empty)
        this.process_command_list();
      
    });

    this.command_list = [];

    //server.sendToPeer(`127.0.0.1`, `["play", "uszas1.mp4", {"loop":1}, false]`);
    //server.sendToPeer(`127.0.0.1`, `["image", "terkepes_adatbazis/figure.png"]`);
    //server.sendToPeer(`127.0.0.1`, `["color", "#ff0000"]`);

    this.screenLoaded();
  }

  static start() {
    super.start();
  }
}

//app_remote_video.init(); // only init when using it for testing
