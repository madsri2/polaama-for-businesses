'use strict';

const Categorizer = require('categorizer');
const Classifier = require('my-classifier');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
logger.setConfigFile("pw-log.conf", true /* delete */); 

function WebpageHandler() {
  this.cat = new Categorizer();
}

WebpageHandler.prototype.categoryList = function() {
  let categoriesList = "";
  Categorizer.supported().forEach(cat => {
    const item = toLink(`/categories/${cat}`,Categorizer.getTitle(cat));
    categoriesList = categoriesList.concat(`<li>${item}</li>`);
  });
  const html = `
    <html>
      <h4>Supported Categories</h4>
      <ul>
        ${categoriesList}
      </ul>
    </html>
  `;
  return html;
}

WebpageHandler.prototype.categoryHtml = function(category) {
  const promise = sendHtml.call(this, category);
  const file = "/home/ec2-user/phocuswright/html-templates/categories.html";
  return promise.then(
    function(response) {
      const details = response.details;
      const count = response.count;
      const html = require('fs').readFileSync(file, 'utf8');
      return html.replace("${count}",count)
                 .replace("${category}",Categorizer.getTitle(category))
                 .replace("${rows}",details);
    },
    function(err) {
      return Promise.reject(err);
    }
  );
}

WebpageHandler.prototype.getAirlinesList = function() {
  const classifier = new Classifier();
  return this.cat.get("airlines").then(
    function(companies) {
      let details = "";
      companies.forEach(company => {
        const classification = classifier.classify(company.description);
        if(classification === "airlines") {
          details = details.concat(`
            <tr>
              <td>${company.name}</td>
              <td>${company.description}</td>
              <td>${company.location}</td>
            </tr>
          `);
        }
        logger.debug(`company: ${company.name}, classification: ${classification}`);
      });
      const file = "/home/ec2-user/phocuswright/html-templates/classification.html";
      const html = require('fs').readFileSync(file, 'utf8');
      return html.replace("${rows}",details);
    },
    function(err) {
      console.log(`error: ${err.stack}`);
    }
  );
}

function toLink(url, name) {
  return `<a href="${url}">${name}</a>`;
}

function sendHtml(category) {
  const cat = this.cat;
  return cat.get(category).then(
    function(companies) {
      let response = {};
      let details = "";
      companies.forEach(company => {
        const linkedIn = (company.linkedIn === '-') ? "-" : toLink(company.linkedIn, `${company.name} LinkedIn`);
        const name = (company.homepage) ? toLink(company.homepage, company.name) : company.name;
        details = details.concat(`
          <tr>
            <td>${name}</td>
            <td>${company.description}</td>
            <td>${company.location}</td>
            <td>${linkedIn}</td>
          </tr>
        `);
      });
      response.details = details;
      response.count = companies.length;
      return response;
    },
    function(err) {
      return Promise.reject(err);
    }
  );
}

module.exports = WebpageHandler;
