import {Application,Assets,BlurFilter,Container,Graphics,Sprite} from 'pixi.js';

const ids=['oil','comb','razor','balm','key','crown','vernon','vault','coin'];

export class ReelStripView{
 app=new Application();
 root=new Container();
 width=980;
 height=570;
 textures={};
 reels=[];
 grid=null;
 reducedMotion=false;
 onReelStop=null;

 async mount(host){
  await this.app.init({
   width:this.width,height:this.height,antialias:true,backgroundAlpha:0,
   resolution:Math.min(window.devicePixelRatio||1,2),autoDensity:true
  });
  this.app.canvas.classList.add('slot-canvas');
  host.replaceChildren(this.app.canvas);
  this.app.stage.addChild(this.root);

  await Promise.all(ids.map(async id=>{
   this.textures[id]=await Assets.load(`./assets/${id}.svg?v=2.1.0`);
  }));

  new ResizeObserver(()=>this.resize(host)).observe(host);
 }

 setReducedMotion(value){this.reducedMotion=value;}

 renderGrid(grid){
  this.grid=grid;
  this.root.removeChildren();
  this.reels=[];

  const columns=grid.length,rows=grid[0]?.length||3;
  const reelWidth=this.width/columns,rowHeight=this.height/rows;

  const background=new Graphics()
   .roundRect(0,0,this.width,this.height,20)
   .fill({color:0x06150d})
   .stroke({color:0xe2bc5d,width:5});
  this.root.addChild(background);

  grid.forEach((column,columnIndex)=>{
   const reel=new Container();
   reel.x=columnIndex*reelWidth;
   const mask=new Graphics().rect(0,0,reelWidth,this.height).fill(0xffffff);
   reel.addChild(mask);
   reel.mask=mask;

   const strip=new Container();
   reel.addChild(strip);
   column.forEach((symbol,row)=>strip.addChild(this.makeSymbol(symbol,reelWidth,rowHeight,row)));
   reel._strip=strip;
   reel._blur=new BlurFilter({strength:0,quality:2});
   strip.filters=[reel._blur];

   this.root.addChild(reel);
   this.reels.push(reel);
  });
 }

 makeSymbol(symbol,reelWidth,rowHeight,row){
  const holder=new Container();
  holder.y=row*rowHeight;

  const outer=new Graphics()
   .roundRect(7,7,reelWidth-14,rowHeight-14,16)
   .fill({color:0x06170e})
   .stroke({color:0xb8e36c,width:3});
  const inner=new Graphics()
   .roundRect(14,14,reelWidth-28,rowHeight-28,13)
   .fill({color:0x101613})
   .stroke({color:0x29432e,width:2});

  const sprite=new Sprite(this.textures[symbol]);
  sprite.anchor.set(.5);
  sprite.position.set(reelWidth/2,rowHeight/2);
  const size=Math.min(reelWidth-42,rowHeight-30);
  sprite.width=size;sprite.height=size;

  holder.addChild(outer,inner,sprite);
  return holder;
 }

 async spinTo(finalGrid){
  if(!this.grid){this.renderGrid(finalGrid);return;}
  if(this.reducedMotion){
    await new Promise(r=>setTimeout(r,240));
    this.renderGrid(finalGrid);
    return;
  }

  const reelWidth=this.width/finalGrid.length;
  const rowHeight=this.height/(finalGrid[0]?.length||3);
  const jobs=this.reels.map((reel,index)=>this.spinReel(reel,index,finalGrid[index],reelWidth,rowHeight));
  await Promise.all(jobs);
  this.grid=finalGrid;
 }

 async spinReel(reel,index,finalColumn,reelWidth,rowHeight){
  const strip=reel._strip;
  strip.removeChildren();

  const symbolCount=11;
  const holders=[];
  for(let i=0;i<symbolCount;i++){
    const symbol=ids[Math.floor(Math.random()*ids.length)];
    const holder=this.makeSymbol(symbol,reelWidth,rowHeight,i-3);
    holders.push(holder);
    strip.addChild(holder);
  }

  const delay=index*135;
  const duration=920+index*190;
  await new Promise(resolve=>setTimeout(resolve,delay));
  const start=performance.now();
  let previous=0;

  await new Promise(resolve=>{
   const frame=now=>{
    const t=Math.min(1,(now-start)/duration);
    const velocity=t<.18
      ? easeInCubic(t/.18)
      : t<.72
        ? 1
        : 1-easeOutCubic((t-.72)/.28)*.86;

    const travel=(previous+velocity*34);
    previous=travel;
    for(const holder of holders){
      holder.y+=velocity*34;
      const totalHeight=symbolCount*rowHeight;
      while(holder.y>this.height+rowHeight)holder.y-=totalHeight;
    }
    reel._blur.strength=velocity*12;

    if(t<1)requestAnimationFrame(frame);
    else resolve();
   };
   requestAnimationFrame(frame);
  });

  reel._blur.strength=0;
  strip.removeChildren();
  finalColumn.forEach((symbol,row)=>strip.addChild(this.makeSymbol(symbol,reelWidth,rowHeight,row)));

  strip.y=-22;
  const settleStart=performance.now();
  await new Promise(resolve=>{
   const frame=now=>{
    const t=Math.min(1,(now-settleStart)/190);
    strip.y=-22*(1-easeOutBack(t));
    if(t<1)requestAnimationFrame(frame);
    else{strip.y=0;resolve();}
   };
   requestAnimationFrame(frame);
  });

  if(typeof this.onReelStop==='function')this.onReelStop(index);
 }

 resize(host){
  const nextWidth=Math.max(540,Math.floor(host.clientWidth));
  const nextHeight=Math.max(355,Math.floor(nextWidth*.58));
  if(nextWidth===this.width&&nextHeight===this.height)return;
  this.width=nextWidth;this.height=nextHeight;
  this.app.renderer.resize(this.width,this.height);
  if(this.grid)this.renderGrid(this.grid);
 }
}

const easeInCubic=t=>t*t*t;
const easeOutCubic=t=>1-Math.pow(1-t,3);
const easeOutBack=t=>{
 const c1=1.70158,c3=c1+1;
 return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);
};
