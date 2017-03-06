let a = {
  '1' : 1,
  '2' : 2,
  '3' : 3,
  '4' : 4
};

Object.keys(a).forEach(k => {
  if(!a[k]) {
    return;
  }
  console.log(a[k]);
  // delete a key
  delete a['2'];
});
