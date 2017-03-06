'use strict';

const re = /\d+/g;
let arr;
while((arr = re.exec("30")) != null) {
  console.log(`Found ${arr[0]}. Next match starts at ${re.lastIndex}`);
}
if("20$".endsWith("$")) {
  console.log("No normalization needed");
}

