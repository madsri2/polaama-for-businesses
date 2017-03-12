function Workflow() {
  this.a = "a";
}

function Container() {
}

const c = new Container();
c.wf = new Workflow();
const wf = c.wf;
if(!wf.done) {
  wf.done = true;
}
console.log(JSON.stringify(wf));
