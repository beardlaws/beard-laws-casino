import {Application,Container,Graphics,Text,TextStyle} from 'pixi.js';
const labels={oil:'OIL',comb:'COMB',razor:'RAZOR',balm:'BALM',key:'KEY',crown:'CROWN',vernon:'VERNON',vault:'VAULT',coin:'BL'};
export class ReelStripView{
 app=new Application();root=new Container();width=900;height=470;ready=false;
 async mount(host){
  await this.app.init({width:this.width,height:this.height,antialias:true,backgroundAlpha:0,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true});
  this.app.canvas.classList.add('slot-canvas');host.replaceChildren(this.app.canvas);this.app.stage.addChild(this.root);this.ready=true;
  new ResizeObserver(()=>this.resize(host)).observe(host);
 }
 renderGrid(grid){
  this.root.removeChildren();
  const rw=this.width/grid.length,rows=grid[0]?.length||3,rh=this.height/rows;
  this.root.addChild(new Graphics().roundRect(0,0,this.width,this.height,18).fill({color:0x071a36}).stroke({color:0x7650c9,width:5}));
  grid.forEach((reel,c)=>reel.forEach((symbol,r)=>{
   const x=c*rw,y=r*rh;
   const color=symbol==='coin'?0x9c681d:symbol==='vernon'?0x5d2d70:symbol==='vault'?0x394657:(symbol==='key'||symbol==='crown')?0x6e471c:0x27162f;
   const card=new Graphics().roundRect(x+7,y+7,rw-14,rh-14,16).fill({color}).stroke({color:0xd2b160,width:2});
   const label=new Text({text:labels[symbol],style:new TextStyle({fill:0xffe79a,fontFamily:'Georgia',fontSize:Math.min(34,rw*.16),fontWeight:'bold'})});
   label.anchor.set(.5);label.x=x+rw/2;label.y=y+rh/2;this.root.addChild(card,label);
  }));
 }
 async spinTo(grid){
  const start=performance.now(),duration=950;
  await new Promise(resolve=>{
   const tick=now=>{
    const p=Math.min(1,(now-start)/duration),i=Math.sin(p*Math.PI);
    this.root.y=Math.sin(p*72)*13*i;this.root.alpha=1-i*.18;
    if(p<1)requestAnimationFrame(tick);else{this.root.y=0;this.root.alpha=1;this.renderGrid(grid);resolve();}
   };requestAnimationFrame(tick);
  });
 }
 resize(host){
  const w=Math.max(500,Math.floor(host.clientWidth)),h=Math.max(320,Math.floor(w*.52));
  if(w===this.width&&h===this.height)return;this.width=w;this.height=h;this.app.renderer.resize(w,h);
 }
}