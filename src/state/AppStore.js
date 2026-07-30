export class AppStore{
 #listeners=new Set();
 constructor(state){this.state=state;}
 subscribe(fn){this.#listeners.add(fn);fn(this.state);}
 patch(partial){this.state={...this.state,...partial};this.#listeners.forEach(fn=>fn(this.state));}
}