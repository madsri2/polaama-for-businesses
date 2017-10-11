'use strict';

let string = `"crunchbase_uuid","type","primary_role","name","crunchbase_url","homepage_domain","homepage_url","profile_image_url","facebook_url","twitter_url","linkedin_url","stock_symbol","location_city","location_region","location_country_code","short_description"`;
let contents;
const regex = /"(.*?)"/g;
while(contents = regex.exec(string)) console.log(contents[1]);
