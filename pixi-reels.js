
(() => {
  const SYMBOL_KEYS = ['oil','comb','razor','balm','key','crown','vernon','vault','coin'];
  const ATLAS = {
    oil:[0,0], comb:[1,0], razor:[2,0],
    balm:[0,1], key:[1,1], crown:[2,1],
    vernon:[0,2], vault:[1,2], coin:[2,2]
  };

  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  const easeOutBack = t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2);
  };

  class ReelController {
    constructor() {
      this.app = null;
      this.ready = false;
      this.running = false;
      this.textures = {};
      this.reels = [];
      this.width = 0;
      this.height = 0;
      this.reelWidth = 0;
      this.rowHeight = 0;
      this.symbolSize = 256;
      this.visibleRows = 3;
      this.resizeTimer = null;
    }

    async init(initialGrid) {
      if (this.ready) {
        this.setGrid(initialGrid);
        return;
      }

      const canvas = document.getElementById('slot-canvas');
      const host = canvas.parentElement;
      this.width = Math.max(700, Math.floor(host.clientWidth));
      this.height = Math.max(455, Math.floor(this.width * 0.485));

      this.app = new PIXI.Application({
        view: canvas,
        width: this.width,
        height: this.height,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2)
      });

      const base = PIXI.BaseTexture.from('assets/beard-bank-symbols.png');
      await new Promise((resolve,reject) => {
        if (base.valid) resolve();
        else {
          base.once('loaded',resolve);
          base.once('error',reject);
        }
      });

      Object.entries(ATLAS).forEach(([key,[cx,cy]]) => {
        this.textures[key] = new PIXI.Texture(
          base,
          new PIXI.Rectangle(cx*this.symbolSize,cy*this.symbolSize,this.symbolSize,this.symbolSize)
        );
      });

      this.buildStage(initialGrid);
      this.ready = true;

      window.addEventListener('resize',() => {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
          if (!this.running) this.resize();
        },180);
      });
    }

    randomKey() {
      return SYMBOL_KEYS[Math.floor(Math.random()*SYMBOL_KEYS.length)];
    }

    buildStage(grid) {
      this.app.stage.removeChildren();
      this.reels = [];
      this.reelWidth = this.width/5;
      this.rowHeight = this.height/this.visibleRows;

      const background = new PIXI.Graphics();
      background.beginFill(0x06162f);
      background.drawRoundedRect(0,0,this.width,this.height,10);
      background.endFill();
      this.app.stage.addChild(background);

      for (let c=0;c<5;c++) {
        const viewport = new PIXI.Container();
        viewport.x = c*this.reelWidth;

        const mask = new PIXI.Graphics();
        mask.beginFill(0xffffff);
        mask.drawRect(c*this.reelWidth,0,this.reelWidth,this.height);
        mask.endFill();
        this.app.stage.addChild(mask);
        viewport.mask = mask;

        const strip = new PIXI.Container();
        viewport.addChild(strip);

        const blur = new PIXI.BlurFilter();
        blur.blurX = 0;
        blur.blurY = 0;
        viewport.filters = [blur];

        const sprites = [];
        // One buffer symbol above and below the visible grid.
        for (let i=0;i<this.visibleRows+2;i++) {
          const key = (i>=1 && i<=this.visibleRows && grid?.[c]) ? (grid[c][i-1]||this.randomKey()) : this.randomKey();
          const symbol = this.makeSymbol(key);
          symbol._slotIndex = i;
          symbol.y = (i-1)*this.rowHeight;
          strip.addChild(symbol);
          sprites.push(symbol);
        }

        this.app.stage.addChild(viewport);

        const divider = new PIXI.Graphics();
        divider.lineStyle(4,0x14376d,1);
        divider.moveTo((c+1)*this.reelWidth-2,0);
        divider.lineTo((c+1)*this.reelWidth-2,this.height);
        this.app.stage.addChild(divider);

        this.reels.push({
          viewport, strip, sprites, blur,
          travel:0,
          speed:0,
          phase:'idle',
          finalGrid:null,
          stopAt:0,
          settled:false
        });
      }

      const frame = new PIXI.Graphics();
      frame.lineStyle(8,0x183f91,1);
      frame.drawRoundedRect(4,4,this.width-8,this.height-8,10);
      frame.lineStyle(2,0x8c55ff,.95);
      frame.drawRoundedRect(10,10,this.width-20,this.height-20,8);
      this.app.stage.addChild(frame);
    }

    makeSymbol(key) {
      const group = new PIXI.Container();
      group._symbolKey = key;

      const plate = new PIXI.Graphics();
      plate.beginFill(0x0b315e,1);
      plate.drawRoundedRect(5,4,this.reelWidth-10,this.rowHeight-8,8);
      plate.endFill();
      plate.lineStyle(2,0x2d7db4,.8);
      plate.drawRoundedRect(5,4,this.reelWidth-10,this.rowHeight-8,8);
      group.addChild(plate);

      const icon = new PIXI.Sprite(this.textures[key]);
      const size = Math.min(this.reelWidth*.76,this.rowHeight*.83);
      icon.anchor.set(.5);
      icon.width = size;
      icon.height = size;
      icon.x = this.reelWidth/2;
      icon.y = this.rowHeight/2;
      icon.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      const artShadow = new PIXI.filters.DropShadowFilter({
        color:0x000000,
        alpha:.52,
        blur:4,
        distance:7,
        rotation:90,
        quality:2
      });
      icon.filters=[artShadow];
      group.addChild(icon);
      group._icon = icon;

      return group;
    }

    replaceSymbol(group,key) {
      group._symbolKey = key;
      group._icon.texture = this.textures[key];
      group.scale.set(1);
      group.alpha = 1;
    }

    setGrid(grid) {
      if (!this.ready || !grid) return;
      this.reels.forEach((reel,c) => {
        const ordered = [...reel.sprites].sort((a,b)=>a.y-b.y);
        ordered.forEach((s,i) => {
          s.y=(i-1)*this.rowHeight;
          this.replaceSymbol(s,(i>=1&&i<=this.visibleRows)?(grid[c][i-1]||this.randomKey()):this.randomKey());
        });
        reel.sprites=ordered;
        reel.strip.y=0;
        reel.travel=0;
      });
    }

    layoutMovingReel(reel,deltaRows) {
      // Move every symbol down by a meaningful fraction of a full row.
      const pixels = deltaRows*this.rowHeight;
      reel.sprites.forEach(s => s.y += pixels);

      // Wrap symbols from below the viewport to one full row above it.
      reel.sprites.forEach(s => {
        while (s.y >= this.height + this.rowHeight) {
          const highest = Math.min(...reel.sprites.map(x=>x.y));
          s.y = highest - this.rowHeight;
          this.replaceSymbol(s,this.randomKey());
        }
      });
    }

    applyFinalGrid(reel) {
      const ordered=[...reel.sprites].sort((a,b)=>a.y-b.y);
      ordered.forEach((s,i) => {
        s.y=(i-1)*this.rowHeight;
        this.replaceSymbol(s,(i>=1&&i<=this.visibleRows)?(reel.finalGrid[i-1]||this.randomKey()):this.randomKey());
      });
      reel.sprites=ordered;
      reel.strip.y=0;
    }

    async spinTo(grid,quick=false) {
      if (!this.ready) await this.init(grid);
      if (this.running) return;
      this.running=true;

      const start=performance.now();
      const acceleration=quick?210:340;
      const cruise=quick?260:620;
      const stagger=quick?95:175;
      const decel=quick?210:380;
      const maxSpeed=quick?.36:.48; // rows per 60fps frame

      this.reels.forEach((reel,c) => {
        reel.phase='accelerating';
        reel.speed=0;
        reel.finalGrid=grid[c];
        reel.stopAt=start+acceleration+cruise+c*stagger;
        reel.settled=false;
        reel.blur.blurY=0;
        reel.strip.y=0;
      });

      await new Promise(resolve => {
        let previous=performance.now();

        const frame = now => {
          const frameScale=clamp((now-previous)/16.6667,.25,2.5);
          previous=now;
          let active=0;

          this.reels.forEach((reel,c) => {
            if (reel.settled) return;
            active++;

            const elapsed=now-start;

            if (now < start+acceleration) {
              reel.phase='accelerating';
              const t=clamp(elapsed/acceleration,0,1);
              reel.speed=maxSpeed*(t*t);
              this.layoutMovingReel(reel,reel.speed*frameScale);
              reel.blur.blurY=4+reel.speed*42;
            } else if (now < reel.stopAt) {
              reel.phase='cruising';
              reel.speed=maxSpeed;
              this.layoutMovingReel(reel,reel.speed*frameScale);
              reel.blur.blurY=18;
            } else if (now < reel.stopAt+decel) {
              reel.phase='decelerating';
              const t=clamp((now-reel.stopAt)/decel,0,1);
              // Still travel multiple complete rows while slowing.
              reel.speed=maxSpeed*Math.pow(1-t,1.65)+.025;
              this.layoutMovingReel(reel,reel.speed*frameScale);
              reel.blur.blurY=18*(1-t);
            } else if (reel.phase!=='bouncing') {
              reel.phase='bouncing';
              this.applyFinalGrid(reel);
              reel.bounceStart=now;
              reel.blur.blurY=0;
            } else {
              const t=clamp((now-reel.bounceStart)/(quick?150:230),0,1);
              // Start below the final stop, recoil upward, and settle.
              reel.strip.y=(1-easeOutBack(t))*this.rowHeight*.16;
              if (t>=1) {
                reel.strip.y=0;
                reel.settled=true;
                this.pulseVisible(reel);
              }
            }
          });

          if (active>0) requestAnimationFrame(frame);
          else {
            this.running=false;
            resolve();
          }
        };

        requestAnimationFrame(frame);
      });
    }

    pulseVisible(reel) {
      const visible=[...reel.sprites].sort((a,b)=>a.y-b.y).slice(1,1+this.visibleRows);
      const start=performance.now();
      const animate=now => {
        const t=clamp((now-start)/190,0,1);
        const scale=1+Math.sin(t*Math.PI)*.035;
        visible.forEach(s=>s.scale.set(scale));
        if(t<1) requestAnimationFrame(animate);
        else visible.forEach(s=>s.scale.set(1));
      };
      requestAnimationFrame(animate);
    }


    async thrillZoom(targetReels=[3,4]) {
      if(!this.ready)return;
      const stage=this.app.stage;
      const original={x:stage.x,y:stage.y,sx:stage.scale.x,sy:stage.scale.y};
      const start=performance.now();
      const duration=760;
      await new Promise(resolve=>{
        const frame=now=>{
          const t=Math.min(1,(now-start)/duration);
          const pulse=Math.sin(t*Math.PI);
          const scale=1+pulse*.035;
          stage.scale.set(scale);
          stage.x=-(this.width*(scale-1))*.68;
          stage.y=-(this.height*(scale-1))*.5;
          if(t<1)requestAnimationFrame(frame);
          else{
            stage.scale.set(original.sx,original.sy);
            stage.x=original.x;stage.y=original.y;resolve();
          }
        };
        requestAnimationFrame(frame);
      });
    }

    setRows(rows,grid=null){
      const next=Math.max(3,Math.min(5,Number(rows)||3));
      if(this.running)return false;
      const current=grid||this.currentGrid();
      this.visibleRows=next;
      this.height=Math.max(290,Math.floor(this.width*(next===3?.485:next===4?.59:.70)));
      this.app.renderer.resize(this.width,this.height);
      const expanded=current.map(col=>{
        const copy=[...col];
        while(copy.length<next)copy.push(this.randomKey());
        return copy.slice(0,next);
      });
      this.buildStage(expanded);
      return true;
    }

    currentGrid() {
      return this.reels.map(reel => {
        const ordered=[...reel.sprites].sort((a,b)=>a.y-b.y);
        return ordered.slice(1,1+this.visibleRows).map(s=>s._symbolKey);
      });
    }

    resize() {
      if (!this.ready || this.running) return;
      const host=document.getElementById('slot-canvas').parentElement;
      const nextWidth=Math.max(300,Math.floor(host.clientWidth));
      const nextHeight=Math.max(290,Math.floor(nextWidth*.485));
      if(Math.abs(nextWidth-this.width)<3 && Math.abs(nextHeight-this.height)<3)return;

      const grid=this.currentGrid();
      this.width=nextWidth;
      this.height=nextHeight;
      this.app.renderer.resize(this.width,this.height);
      this.buildStage(grid);
    }
  }

  window.BeardReels=new ReelController();
})();
