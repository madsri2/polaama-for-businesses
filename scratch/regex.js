const item = "A Paid $50";
if(item.toLowerCase().match(/.*paid \$?\d+/)) {
  console.log("Matched");
}
