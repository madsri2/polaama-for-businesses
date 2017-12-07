const line = "operating hours for pirate's day adventure";
const entity = "pirate";

const values = [];
const idx = line.search(entity);
if(idx !== -1) {
  values.push(line.substr(0,idx));
  const entityLen = entity.length;
  values.push(line.substr(idx, entityLen));
  values.push(line.substr(idx + entityLen, line.length));
}

values.forEach(i => {
  console.log(`[${i}]`);
});
