import {Application,Container,Graphics,Sprite,Texture} from 'pixi.js';
const ids=['oil','comb','razor','balm','key','crown','vernon','vault','coin'];

export class ReelStripView{
 app=new Application();root=new Container();width=900;height=470;ready=false;
 textures={};reels=[];grid=null;

 async mount(host){
  await this.app.init({width:this.width,height:this.height,antialias:true,backgroundAlpha:0,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true});
  this.app.canvas.classList.add('slot-canvas');host.replaceChildren(this.app.canvas);this.app.stage.addChild(this.root);
  await Promise.all(ids.map(async id=>{this.textures[id]=await Texture.fromURL(`./assets/${id}.svg`);}));
  this.ready=true;
  new ResizeObserver(()=>this.resize(host)).observe(host);
 }

 renderGrid(grid){
  this.grid=grid;this.root.removeChildren();this.reels=[];
  const rw=this.width/grid.length,rows=grid[0]?.length||3,rh=this.height/rows;
  this.root.addChild(new Graphics().roundRect(0,0,this.width,this.height,18).fill({color:0x071a36}).stroke({color:0x7650c9,width:5}));
  grid.forEach((column,c)=>{
   const reel=new Container();reel.x=c*rw;this.root.addChild(reel);this.reels.push(reel);
   column.forEach((symbol,r)=>reel.addChild(this.makeSymbol(symbol,rw,rh,r)));
  });
 }

 makeSymbol(symbol,rw,rh,row){
  const holder=new Container();holder.y=row*rh;
  const frame=new Graphics().roundRect(7,7,rw-14,rh-14,16).fill({color:0x180f1d}).stroke({color:0xd2b160,width:2});
  const sprite=new Sprite(this.textures[symbol]);sprite.anchor.set(.5);sprite.x=rw/2;sprite.y=rh/2;sprite.width=Math.min(rw-30,rh-28);sprite.height=sprite.width;
  holder.addChild(frame,sprite);holder._symbol=symbol;return holder;
 }

 async spinTo(finalGrid){
  if(!this.grid){this.renderGrid(finalGrid);return;}
  const rows=finalGrid[0].length,rw=this.width/finalGrid.length,rh=this.height/rows;
  const durations=[800,980,1160,1340,1520];
  const strips=this.reels.map((reel,c)=>this.spinReel(reel,c,finalGrid[c],rw,rh,durations[c]));
  await Promise.all(strips);
  this.renderGrid(finalGrid);
 }

 async spinReel(reel,index,finalColumn,rw,rh,duration){
  const buffer=[];
  for(let i=0;i<rowsFor(finalColumn)+7;i++){
   const id=ids[Math.floor(Math.random()*ids.length)];
   const symbol=this.makeSymbol(id,rw,rh,i-4);
   reel.addChild(symbol);buffer.push(symbol);
  }
  const start=performance.now();
  await new Promise(resolve=>{
   const tick=now=>{
    const p=Math.min(1,(now-start)/duration);
    const eased=p<.72?p/.72:1-Math.pow(1-(p-.72)/.28,3)*.16;
    const travel=(7*rh)*eased;
    reel.children.forEach(child=>{if(child!==reel.children[0]){}});
    for(const child of buffer)child.y+=travel-(child._lastTravel||0),child._lastTravel=travel;
    if(p<1)requestAnimationFrame(tick);else resolve();
   };requestAnimationFrame(tick);
  });
  reel.removeChildren();
  finalColumn.forEach((symbol,r)=>reel.addChild(this.makeSymbol(symbol,rw,rh,r)));
  reel.y=-14;
  const settleStart=performance.now();
  await new Promise(resolve=>{
   const tick=now=>{
    const p=Math.min(1,(now-settleStart)/160);
    reel.y=-14*(1-p)+Math.sin(p*Math.PI)*5;
    if(p<1)requestAnimationFrame(tick);else{reel.y=0;resolve();}
   };requestAnimationFrame(tick);
  });
 }

 resize(host){
  const w=Math.max(500,Math.floor(host.clientWidth)),h=Math.max(320,Math.floor(w*.52));
  if(w===this.width&&h===this.height)return;
  this.width=w;this.height=h;this.app.renderer.resize(w,h);
  if(this.grid)this.renderGrid(this.grid);
 }
}
const rowsFor=column=>column?.length||3;
