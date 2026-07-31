import {Application,Assets,BlurFilter,Container,Graphics,Sprite} from 'pixi.js';
import {SYMBOL_ASSETS,resolveAssetPath} from './AssetManifest.js';

const ids=['oil','comb','razor','balm','key','crown','vernon','vault','coin'];

export class ReelStripView{
 app=new Application();
 root=new Container();
 width=1000;
 height=600;
 textures={};
 resolvedPaths={};
 reels=[];
 grid=null;
 reducedMotion=false;
 onReelStop=null;

 async mount(host){
  await this.app.init({
   width:this.width,
   height:this.height,
   antialias:true,
   backgroundAlpha:0,
   resolution:Math.min(devicePixelRatio||1,2),
   autoDensity:true,
  });
  this.app.canvas.classList.add('slot-canvas');
  host.replaceChildren(this.app.canvas);
  this.app.stage.addChild(this.root);

  await Promise.all(ids.map(async id=>{
   const path=await resolveAssetPath(SYMBOL_ASSETS[id]);
   this.resolvedPaths[id]=path;
   this.textures[id]=await Assets.load(`${path}?v=3.2.0`);
  }));

  new ResizeObserver(()=>this.resize(host)).observe(host);
 }

 setReducedMotion(value){this.reducedMotion=value}
 getAssetPath(symbol){return this.resolvedPaths[symbol]||SYMBOL_ASSETS[symbol]?.fallback||''}

 renderGrid(grid){
  this.grid=grid;
  this.root.removeChildren();
  this.reels=[];

  const columns=grid.length;
  const rows=grid[0]?.length||3;
  const reelWidth=this.width/columns;
  const rowHeight=this.height/rows;

  this.root.addChild(
   new Graphics()
    .roundRect(0,0,this.width,this.height,20)
    .fill({color:0x020d07})
    .stroke({color:0xe6bd59,width:5})
  );

  grid.forEach((column,columnIndex)=>{
   const reel=new Container();
   reel.x=columnIndex*reelWidth;

   const mask=new Graphics().rect(0,0,reelWidth,this.height).fill(0xffffff);
   reel.addChild(mask);
   reel.mask=mask;

   const strip=new Container();
   reel.addChild(strip);

   column.forEach((symbol,rowIndex)=>{
    strip.addChild(this.makeSymbol(symbol,reelWidth,rowHeight,rowIndex));
   });

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
   .roundRect(5,5,reelWidth-10,rowHeight-10,14)
   .fill({color:0x07130b})
   .stroke({color:0x8fe56a,width:4});

  const inner=new Graphics()
   .roundRect(12,12,reelWidth-24,rowHeight-24,11)
   .fill({color:0x080d0a})
   .stroke({color:0x274d2d,width:2});

  const sprite=new Sprite(this.textures[symbol]);
  sprite.anchor.set(.5);
  sprite.position.set(reelWidth/2,rowHeight/2);
  const size=Math.min(reelWidth-26,rowHeight-20);
  sprite.width=size;
  sprite.height=size;

  holder.addChild(outer,inner,sprite);
  holder._symbol=symbol;
  holder._reelVisual={outer,inner,sprite};
  return holder;
 }

 async spinTo(finalGrid){
  if(!this.grid){this.renderGrid(finalGrid);return}
  if(this.reducedMotion){
   await wait(220);
   this.renderGrid(finalGrid);
   return;
  }

  const reelWidth=this.width/finalGrid.length;
  const rowHeight=this.height/(finalGrid[0]?.length||3);

  await Promise.all(
   this.reels.map((reel,index)=>
    this.spinReel(reel,index,finalGrid[index],reelWidth,rowHeight)
   )
  );
  this.grid=finalGrid;
 }

 async spinReel(reel,index,finalColumn,reelWidth,rowHeight){
  const strip=reel._strip;
  strip.removeChildren();
  const holders=[];

  for(let i=0;i<12;i++){
   const holder=this.makeSymbol(
    ids[Math.floor(Math.random()*ids.length)],
    reelWidth,
    rowHeight,
    i-4
   );
   holders.push(holder);
   strip.addChild(holder);
  }

  await wait(index*125);
  const start=performance.now();
  const duration=900+index*175;
  const totalHeight=12*rowHeight;

  await new Promise(resolve=>{
   const frame=now=>{
    const t=Math.min(1,(now-start)/duration);
    const speed=t<.16
     ? easeIn(t/.16)
     : t<.72
      ? 1
      : .14+.86*(1-easeOut((t-.72)/.28));

    for(const holder of holders){
     holder.y+=speed*38;
     while(holder.y>this.height+rowHeight)holder.y-=totalHeight;
    }

    reel._blur.strength=speed*13;

    if(t<1)requestAnimationFrame(frame);
    else resolve();
   };
   requestAnimationFrame(frame);
  });

  reel._blur.strength=0;
  strip.removeChildren();

  finalColumn.forEach((symbol,row)=>{
   strip.addChild(this.makeSymbol(symbol,reelWidth,rowHeight,row));
  });

  strip.y=-24;
  const settleStart=performance.now();

  await new Promise(resolve=>{
   const frame=now=>{
    const t=Math.min(1,(now-settleStart)/190);
    strip.y=-24*(1-easeBack(t));
    if(t<1)requestAnimationFrame(frame);
    else{strip.y=0;resolve()}
   };
   requestAnimationFrame(frame);
  });

  this.onReelStop?.(index);
 }

 clearWinPresentation(){
  for(const reel of this.reels){
   for(const holder of reel._strip.children){
    holder.alpha=1;
    holder.scale.set(1);
    const visual=holder._reelVisual;
    if(visual){
     visual.outer.tint=0xffffff;
     visual.inner.tint=0xffffff;
     visual.sprite.tint=0xffffff;
    }
   }
  }
 }

 showWinningPositions(positions){
  const winningSet=new Set(
   positions.map(({reel,row})=>`${reel}-${row}`)
  );

  this.reels.forEach((reel,reelIndex)=>{
   reel._strip.children.forEach((holder,rowIndex)=>{
    const winning=winningSet.has(`${reelIndex}-${rowIndex}`);
    holder.alpha=winning?1:.35;
    holder.scale.set(winning?1.035:1);

    const visual=holder._reelVisual;
    if(visual){
     visual.outer.tint=winning?0xffefa0:0x777777;
     visual.inner.tint=winning?0xffffff:0x777777;
     visual.sprite.tint=winning?0xffffff:0x8f8f8f;
    }
   });
  });
 }

 resize(host){
  const width=Math.max(540,Math.floor(host.clientWidth));
  const height=Math.max(355,Math.floor(width*.60));
  if(width===this.width&&height===this.height)return;

  this.width=width;
  this.height=height;
  this.app.renderer.resize(width,height);
  if(this.grid)this.renderGrid(this.grid);
 }
}

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const easeIn=t=>t*t*t;
const easeOut=t=>1-Math.pow(1-t,3);
const easeBack=t=>{
 const c1=1.70158;
 const c3=c1+1;
 return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);
};
