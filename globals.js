export default {
  CONFIG_ITEMS: [
    {
      name:'App name',
      config:'appname',
      type:'enum',
      values:[
        'app-csarnok-fal-1',
        'app-csarnok-fal-2',
        'app-csarnok-fal-3',
        'app-csarnok-fal-4',
        'app-csarnok-fal-5',
        'app-csarnok-fal-6',
        'app-csarnok-fal-7',
        'app-csarnok-kontroll',
        'app-csarnok-terkep',
        'app-foci',
        'app-foci-projektor-1',
        'app-foci-projektor-2',
        'app-foci-tv',
        'app-kenu',
        'app-kviz',
        'app-uszas-fal-1',
        'app-uszas-fal-2',
        'app-uszas-fal-3',
        'app-uszas-fal-4',
        'app-uszas-fal-5',
        'app-uszas-fal-6',
        'app-uszas-kontroll',
      ],
      defval:'app-kviz',
    },
    {name:'App volume', config:'volume', type:'enum', values:['0','5','10','15','20','25','30','35','40','45','50','55','60','65','70','75','80','85','90','95','100'], defval:'100'},
    {name:'LCD brightness', config:'lcd_brightness', type:'enum', values:['0','10','20','30','40','50','60','70','80','90','100','110','120','130','140','150','160','170','180','190','200','210','220','230','240','250','255'], defval:'190'},
    {name:'video audio output', config:'audiodev', type:'enum', values:['local','hdmi','both'], defval:'local'},
    {name:'DMX Reset', config:'DMX_RESET', type:'dmx'},
    {name:'LIGHT ON', config:'LIGHT_ON', type:'dmx'},
    {name:'LIGHT OFF', config:'LIGHT_OFF', type:'dmx'},
  ],
}