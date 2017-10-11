'use strict';

const bayes = require('bayes');

function Classifier() {
  this.classifier = bayes();
  trainAirlinesCategory.call(this);
  trainInOtherCategories.call(this);
  trainIotCategory.call(this);
  trainToursAndActivitiesCategory.call(this);
  trainGroundTransportationCategory.call(this);
  train.call(this, nontravel(), "non-travel");
  train.call(this, itServices(), "IT Services");
  train.call(this, metasearch(), "metasearch");
  train.call(this, tourOperators(), "tour operators");
  train.call(this, planning(), "planning");
  train.call(this, travelAgency(), "online travel agency");
  train.call(this, businessTravel(), "business travel");
  train.call(this, airport(), "airport");
  train.call(this, lodging(), "lodging");
  train.call(this, mobile(), "mobile");

  const classifier = this.classifier;
  // other categories
  classifier.learn("airline distribution platform tmc productivity suite","tmc");
  classifier.learn("ayurveda medical tourism","medical tourism");
  classifier.learn("the hollywood beach resort is a resort which sits on the hollywood boardwalk.","resort");
  classifier.learn("booking and distribution tool","reservation systems");
  classifier.learn("advance check-in services on US airlines","software development");
  classifier.learn("Mobile solutions for the travel industry: tour operators, travel agencies, tourism boards, DMO, travel publishers, airlines", "mobile");
  classifier.learn("mobile application that allows airlines to make profit","mobile");
  classifier.learn("one airline pilot and one computer geek, created a unique retractable laptop table","hardware");
  classifier.learn("triphub is a service for planning group travel","group travel");
  classifier.learn("airline information is a provider of aviation conferences","mice");
}

Classifier.prototype.classify = function(description) {
  return this.classifier.categorize(description.toLowerCase());
}

function train(list, category) {
  list.forEach(line => {
    this.classifier.learn(line, category);
  });
}

function mobile() {
  return [
    "a mobile guest engagement platform that helps hotels build better guest relationships and earn more revenue",
    "web and smartphone app providing access to ratings and reviews for restaurants, nightspots and hotels worldwide"
  ];
}

function airport() {
  return [
    "enforce claims against airlines for delayed or cancelled flights",
    "platform to ensure airline passengers never lose their luggage",
    "a service that predicts flight delays, enabling travelers to proactively plan",
    "location sharing flight analysis",
    "the world's leading provider of integrated solutions and services for airlines and airports, sabre airline solutions helps companies",
    "makes upgrades effortless for airlines and passengers",
    "get compensation from airlines when their flight gets cancelled",
    "haswifi lets consumers know which flights will have wifi internet access to use"
  ];
}

function lodging() {
  return [
    "ramada hotel is a brand name of wyndham hotels and resorts and has over 7000 hotels in 67 countries worldwide",
    "sheraton pacific hotels owns and manages upscale hotels and resorts in asia",
    "water habitat retreat is a jodhpur palace hotel by maharaja takhat singh and world famous name in heritage hotels of jodhpur, india",
    "hilton worldwide, a hospitality company, owns luxury and full-service hotels and resorts, extended-stay suites, and focused-service hotels",
    "everbooked helps airbnb hosts increase their revenue, giving them the same tools as hotels and airlines",
    "superfly helps business travelers organize their itineraries, manage frequent flyer miles, and find flights and hotels",
    "dci has been serving the technology needs of world’s top hotels, resorts and brands since 1989",
    "montage hotels & resorts, a hotel management company, consists of a collection of luxury hotels, resorts and residences that are perfect",
    "offers software development services for restaurants and hotels",
    "wantudu helps hotels improve customer experience by providing virtual receptionists through its touch-screen technology.",
    "oberoi hotels & resorts is synonymous the world over with providing the right blend of service, luxury and quiet efficiency.",
    "hilton worldwide, a hospitality company, owns luxury and full-service hotels and resorts, extended-stay suites, and focused-service hotels",
    "ramada hotel is a brand name of wyndham hotels and resorts and has over 7000 hotels in 67 countries worldwide",
    "only hotels and vacations on the beach",
    "book 210,000 hotels around the world",
    "site which offers info about hotels all over the world",
    "verychic is a site which offers info about hotels all over the world.",
    "privépass is an all-in-one luxury travel website offering luxury travel products ranging from handcrafted itineraries to booking hotels.",
    "easytobook.com offers information on rates and availability of hotels in many destinations worldwide",
    "kumarakom hotels provides best accomodations",
    "making hotels smarter",
    "epoque hotels is a collection of worldwide avant-garde, trendy-chic, and luxury-classic boutique hotels",
    "cheap hotels and hostels is an online directory of cheap hostels and hotels",
    "european leader in hotels and tourism, global leader in corporate services, operates in nearly 100 countries",
    "airbnb",
    "agoda is an online hotel reservations service that offers a 'best price' guarantee",
    "himachal hotels is a travel company designed to help customers book hotels in himacha",
  ];
}

function travelAgency() {
  return [
    "offer all blends of indian #tourism, hotels, royal trains",
    "a luxury travel website offering a curated and diversified collection of luxury hotel and travel deals in the middle east",
    "an online platform allowing individuals to find and book cheap deals on luxury holidays and boutique hotels",
    "a website where we can book tickets for flights,hotels and cars", 
    "a travel company dedicated exclusively to booking hotel suites",
    "an experience booking engine that connects guests directly with hotels during the booking process",
    "online luxury hotels reservations",
    "online travel agency providing reservation services for hotels",
    "a website offers price comparison deals and booking",
    "an online travel agency that provides hotel reservations, airline tickets, vacation packages",
    "travel site that offers low rates on airline tickets, hotel rooms, rental cars, cruises, and vacation packages",
    "capital travels is an online company that brings customers online hotel, resort, and vacation booking services",
    "airfare.com is a discount travel website providing customers with cheap flight and hotel reservation deals",
    "travel agency that offers guides, tips and hotel reservations, travel comparison, and presentation of destinations",
    "bookdirect online hotel reservations",
    "brings special offers and promotions from a collection of historical hotels worldwide",
    "airline ticket search engine with a focus on identifying flights with the highest level of quality",
    "an airline ticket comparison shopping website",
    "the world's most comprehensive travel search",
    "holidayiq was launched in early 2004 under the name of india resorts survey",
    "travel agency providing airlines service",
    "helps travelers fly cheap with flights on over 450 airlines",
    "agents for over 250 airlines",
    "find and book airplane tickets",
    "travel like hotels, airlines etc.",
    "hotels, airlines, theaters, etc.",
    "travel agency providing airlines service",
    "online airline ticketing services",
    "airlines, hotels and travel operators",
    "fly cheap with flights on hundreds of airlines",
    "cheap flights from over numerous airlines",
    "travel agent website",
    "travel agency",
    "a travel agency that arranges car rentals, hotels, tours, and more",
  ];
}

function itServices() {
  return [
    "a web portal, providing the details along with photos about the hotels",
    "hotel top-level domain is a domain extension that is dedicated to hotel businesses",
    "snapshot is a hotel data and analytics company",
    "base7booking is not only a hotel management system, it is a new way to manage your hotel efficiently",
    "conciergeme is a hotel management software to manage tasks while affording the staff the time to better service the guests",
    "irates is a california-based software company that offers automated hotel revenue management software solutions",
    "hotel it is software company develops web development, web designing and management application for hotels",
    "full-service hotel digital marketing",
    "consumerfu is an online forum for consumers in america helping in save on credit cards, flights, hotels, foreign currency etc.",
    "hotelogix offers a hotel management system for independent hotels, resorts, lodges, bed & breakfast, and other mid-sized hospitality setups.",
    "flightprep provides pilots with apps that help them plan flights and bag simulations",
    "innerdigital provide custom mobile apps, web design, google virtual tours, it managed services, social media management",
    "information technology services company offering the latest in airlines and airline companies","IT services",
    "etrip.com.cn is the online travel service platform operated by the professional operation team from the china oriental dream international",
    "airline intelligence provider from switzerland",
    "chemical and composite repair supplier to the commercial airline and mro markets",
    "buy and sell airline frequent flyer miles and credit cards reward points",
    "provides paid wireless & wired hotspot internet services to hotels, motels, cafes and other appropriate venues",
    "saas system created to help tour operators organise trips, control reservations, payments",
  ];
}

function metasearch() {
  return [
    "a platform designed to help travelers find hotels, dining areas, and other locations",
    "find list of best hotel",
    "an online travel portal for searching of amazing hotels, fascinating museums and beautiful parks",
    "an online directory of cheap hostels and hotels",
    "brings special offers and promotions from a collection of historical hotels",
    "a hotel price comparison site for handpicked hotels",
    "a collaborative community in which we connect travelers, hosts unique apartments and hotels",
    "comparior is a search engine which compares room rates of hotels, bed & breakfasts, apartments and hostels all over the world",
    "compare cheap holidays, car hire, flights and hotels at the best travel comparison website, dealchecker",
    "presenting the cheapest possible prices for travel services like airport parking, airport hotels, airport lounges, car",
    "10best.com is an online travel guide that provides recommendations on the the most popular attractions, hotels, restaurants, events",
    "subway hotels allows you to compare hotels located near subway stations",
    "travel search engine providing users with information about available flights, hotel rooms, car rentals and trains",
    "an online vacation rental aggregator listing properties provided by big tour operators,small agencies and individuals",
    "travel search engine aggregating information",
    "meta search for airlines",
    "sidestep is a travel search engine that generates revenue via advertising and referral fees",
    "metasearch for airlines",
    "social travel guide providing hotels, reviews, photos, videos, travel information and budget tips for travelers",
    "travel metasearch engine enabling users to find and compare prices on airline tickets, hotels, cars, and travel deals",
    "prontohotel is a hotel comparison website that uses its own metasearch engine",
    "global travel search site and app providing free comparisons for flights, hotel and car rental",
    "online hotel search platform that compares prices from various hotels on booking sites worldwide",
  ];
}

function planning() {
  return [
    "an online travel video platform featuring videos about hotels, restaurants, and things to do in travel destinations",
    "a travel planning company that provides a search engine service for frequent travelers",
    "local events & business search",
    "ricksher is an online marketplace offering the listing and booking of tours, lodging, translation, transportation and activities",
    "a weekly newsletter with cheap flights",
    "nextgreattrip is a vacation planner providing itineraries and personalized services combining direct charter flights from vip terminals.",
    "tour makes tracking your journeys completely automatic",
    "guideguru is a peer-to-peer adventure tour marketplace. it allows private individuals to create custom tours available through a mobile app",
    "vacation destination information",
    "tel aviv travel guide was founded in 2005",
    "personalized destination products for airlines, IFE companies, and travel brands",
  ];
}

function trainAirlinesCategory() {
  const classifier = this.classifier;
  // airlines
  classifier.learn("united airlines and united express operate approximately 5,000 flights each day to more than 370 destinations throughout the world");
  classifier.learn("Trans World Airlines (TWA) is a major American airline", "airlines");
  classifier.learn("airlines that offers", "airlines");
  classifier.learn("Virgin Express Airlines","airlines");
  classifier.learn("privately held airline service", "airlines");
  classifier.learn("eighth-largest US airline","airlines");
  classifier.learn("leisure airline","airlines");
  classifier.learn("Odyssey Airlines will begin offering","airlines");
  classifier.learn("official airlines of","airlines");
  classifier.learn("airline provider", "airlines");
  classifier.learn("chinese airline", "airlines");
  classifier.learn("major american airline", "airlines");
  classifier.learn("flag carrier and largest airline of", "airlines");
  classifier.learn("based charter airline", "airlines");
  classifier.learn("hainan airlines is a china based airline", "airlines");
  classifier.learn("regional passenger carrier","airlines");
  classifier.learn("flag carrier airline of australia","airlines");
  classifier.learn("skybus airlines was a privately held airline service operated as an ultra low-cost carrier", "airlines");
  classifier.learn("Air India is the flagship carrier airline of India".toLowerCase(),"airlines");
  classifier.learn("one of the most preferred leading european air carrier with global network covera","airlines");
}

function trainIotCategory() {
  const classifier = this.classifier;
  classifier.learn("internet of things travel", "iot");
  classifier.learn("iot travel", "iot");
}

function trainToursAndActivitiesCategory() {
  this.classifier.learn("tours and other activities", "tours and activities");
  this.classifier.learn("helps hotels, airlines, and cruises engage with their guests in real-time without requiring them to download a thing", "tours and activities");
  this.classifier.learn("pocket tour guide","tours and activities");
  this.classifier.learn("tours, activities", "tours and activities");
}

function tourOperators() {
  return [
    "outrigger hotels and resorts operate four properties in australia, all located in the 'sunshine state' of queensland.",
    "eda - the diver's tour operator emozioni hotels - top hotels in sardinia",
    "Best tour operators for Indian wildlife sanctuaries",
    "tour agency, sightseeing tours & attractions, tour operators",
    "a tour operator in Delhi offers offer day tours, custom and private tours with private car and driver",
    "california-based flightseeing tourism service, offers passenger flights on a zeppelin nt in north america",
  ];
}

function trainGroundTransportationCategory() {
  this.classifier.learn("ground transportation", "ground transportation");
}

function businessTravel() {
  return [
    "online platform that enables employees to find and book airline tickets, hotel rooms, and vehicles for business travel",
    "superfly helps business travelers organize their itineraries, manage frequent flyer miles, and find flights and hotels",
    "imguest offers a service that enables its commercial customers to find and connect with professionals by checking into hotels",
    ];
}

function nontravel() {
  return [
    "mhi hospitality corporation is a self-advised hotel investment company",
    "international hotel and tourism training institute is a school in neuchatel",
    "privately held hotel investment company",
    "futomic designs, top interior designers for designing amazing and luxury home, smart office, theme restaurant and hotel interior designs in",
    "fresh juice global is a fully integrated provider of brand experiences for interiors and exteriors of retail, hotel and restaurant venues",
    "interstate offers hotel planning, construction and design consulting services on a global basis",
    "silvermile is a mobile game developer formed by industry veterans behind global brands like angry birds and habbo hotel silvermile propels",
    "full-service hotel digital marketing",
    "beer bites is a produces salty snack, bar snacks, brewing, hotel & hospitality space",
    "innerwireless provides in-building wireless and rfid solutions to healthcare, enterprise, government, and hotel and gaming markets",
    "vfm leonardo provides technology, sales conversion tools and a travel media network for e-marketers of hotel brands",
    "jesta group acquires, manages and sells residential, commercial, hotel and industrial real estate assets in north america and europe",
    "renting is a rent listing site helping individuals find residential properties for rent through a free online search tool",
    "a video search engine that actually scans video content to find specific events",
    "an online taxi search website offering rental information for designated driving, car chartering, and wedding celebrations",
    "search indie is an online platform that shares information about indian restaurants, shops, events, classifieds, and institutions",
    "enables customers to search, compare and reserve chartered fishing boats",
    "first local search engine and largest business directory, deals, events",
    "an entertainment website that enables its users to purchase tickets online for shows and events",
    "a search engine that allows parents to locate a school, learn about its features, and schedule a tour",
    "rental property listings and search",
    "map-based rental housing and real estate search engine delivering an online and interactive housing search experience",
    "online search engine and rental service for scientific, technical and medical research articles",
    "lotusjump offers an online tool that allows webmasters to manage their own search engine optimization activities",
    "maxdon mattress is a professional chinese mattress manufacturer specializing in memory foam, pocket spring, hotel and kids’ mattresses",
    "014 media sl offers advertising and marketing services for cinema, spa, hotels etc.",
    "digital marketing agency focused on hotels and hospitality",
    "virgin hotels was added in 2013",
    "eventarc is a self-service event registration and ticketing product, with a particular focus on fundraising events",
    "eyewide, web developing, seo hotels",
    "the most trusted source for cheap military flights and military travel loans for any occasion, no money down",
    "cutting edge tech, user experience based dev & design, r&d. connecting flights",
    "in-car cleverness; an innovative 'end to end' solution enabling dealerships, manufacturers, rental operators & leasing",
    "jasa transportasi di jogja meliputi sewa mobil, paket tour wisata dengan harga murah pelayanan terbaik",
    "leisure activity website",
    "international freelance marketplace for language specialists (translators, copywriters. language tutors and tour guides)",
    "unipower battery manufactures lithium-ion batteries for many models of electric bikes, e-motorcycles, tour buses and golf carts",
    "asset management firm active in cross border transaction services, private equity raising activities",
    "represents north american regional airlines, and the manufacturers of products and services supporting the regional airline industry",
    "provider of technology used to make airline transport experience more reliable via the transfer distribution network",
    "expertise for smart technologies that partners with leading telecom, government, banks",
    "active supplier of premium aircraft seats for the leading airlines around the world".toLowerCase(),
    "casinos, internet, retail and video games for institutional investors",
    "service solutions for financial services, telecommunications industries",
    "sg cib is one of the three core activities of the société générale group, alongside retail banking & financial services and global",
    "songza is a music streaming and recommendation service offering curated playlists based on the time of day or a user's mood or activity.",
    "airline refueling optimization tool",
    "labor union for airline pilots",
    "AerSale Holdings provides aftermarket aircraft, engines and component parts",
    "demand forecasting",
    "ClubApp is a live scoring platform for sports clubs of all sizes.".toLowerCase(),
    "Adaptive Clothing suppliers".toLowerCase(),
    "Performance-based online marketing company in the gaming industry".toLowerCase(),
    "social network company",
    "fashion focused",
    "work with",
    "catering company providing airline catering meals",
    "airline parking",
    "airport parking",
    "data science startup",
    "technology solutions company",
    "game that lets you create",
    "business intelligence company",
    "is a small company",
    "leading airline marketing consultancy",
    "simcom aviation training europe was created by a team of highly recognised flight training professionals",
    "crown packaging is the provider of industrial packaging products and equipments.",
    "adler consulting operates as a downstate transportation engineering firm.",
    "virtual events",
    "eventsinindia.com lists events happening in various cities of india",
    "PR services for tourism boards, airlines, cruise lines, tour operators",
  ];
}

function trainInOtherCategories() {
}

Classifier.prototype.test = function() {
  // console.log(`json: ${JSON.stringify(this.classifier, null, 2)}`);
  // console.log('Expected: non-travel; Actual: %s', this.classifier.categorize("Offerman Woodshop is a small collective of woodworkers and makers based out of Nick Offerman’s kick-ass wood shop in East Los Angeles".toLowerCase()));
  const classifier = this.classifier;
  console.log("Yatra: " + this.classifier.categorize("yatra online offers a booking service that enables individuals to find and book flights, hotels and holiday packages"));
  console.log("Trivago: " + this.classifier.categorize("trivago is an online hotel search platform that compares prices from various hotels on booking sites worldwide"));
  /*
  console.log('Expected: non-travel; Actual: %s', this.classifier.categorize("2threads is a fashion-focused social network based in Sydney, Australia".toLowerCase()));
  console.log('Expected: airlines; Actual: %s', this.classifier.categorize("Air India is the flagship carrier airline of India, Operates passenger and cargo airlines.".toLowerCase()));
  console.log('Expected: travel agency; Actual: %s', this.classifier.categorize("Everbread offers a pricing and shopping engine for airlines, online travel agencies and travel consortia.".toLowerCase()));
  console.log('Startappz. Expected: non-travel; Actual: %s', classifier.categorize("Startappz is a specialized house of expertise for smart technologies that partners with leading telecom, government, banks and airlines."));
  console.log('airlines ticket agency. Expected: travel agency; Actual: %s', classifier.categorize("airline tickets agency"));
  console.log('Destygo. Expected: IT Services; Actual: %s', classifier.categorize("Destygo is a A.I platform to build, deploy and train smart assistants (Chatbots) for travel companies (airlines, hotels, airports etc.)"));
  console.log('Expected: airlines; Actual: %s', classifier.categorize("Eastern Airlines, Inc is a airline business specializing in eastern United States flights."));
  console.log('Airlines technology. Expected: IT services; Actual: %s', classifier.categorize("Airlines Technology helps Airlines, Travel Agents and third party vendors drive more revenue out of business.".toLowerCase()));
  */
}

module.exports = Classifier;
