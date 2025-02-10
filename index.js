const express = require("express");
const app = express();
const port = 3000;
const axios = require("axios");
require("dotenv").config();
const { default: Cloudflare } = require("cloudflare");
const cron = require('node-cron')
const client = new Cloudflare({
  apiEmail: process.env.EMAIL_API,
  apiKey: process.env.GLOBAL_API_KEY,
});

function findDomainName(param){
    for (let i = 0; i < param.length; i++) {
        if (param[i].name === process.env.DOMAIN_NAME) {
          return i;
        }
      }
}
async function updateDomainName(myPublicIp) {
  const zoneList = await client.zones.list();
  const zoneId = zoneList.result[findDomainName(zoneList.result)].id;
  const recordsList = await client.dns.records.list({ zone_id: zoneId });
  const recordId = recordsList.result[0].id;
  const oldIp = JSON.stringify(recordsList.result[0].content).slice(1,JSON.stringify(recordsList.result[0].content).length-1)
  const liveIp = JSON.stringify(myPublicIp).slice(1,JSON.stringify(myPublicIp).length-3);
  const isIpEqual = oldIp === liveIp

  if (!isIpEqual){
    await client.dns.records.edit(recordId, {
        zone_id: zoneId,
        content: myPublicIp,
      });
    console.log("CONTENT of ", recordsList.result[0].name, " CHANGED FROM ", oldIp, " to ", myPublicIp)
  } else {
    console.log("IP UP-TO-DATE")
  }
}
async function handleIpApiCall() {
  let data = "";
  return await axios
    .get("https://ipv4.icanhazip.com/")
    .then((response) => {
      data =  response.data;
      return data;
    })
    .catch((error) => {
      console.error(error);
    });
}

cron.schedule('* * */1 * * * *', () => {
    const time = new Date()
    const timeNow= `${time.getHours()}:${time.getMinutes()}:${`${time.getSeconds()}`.length === 1 ? `0${time.getSeconds()}`:time.getSeconds() }`
    console.log(timeNow, ` Running a task every minute`)

    handleIpApiCall().then((res) => {
        updateDomainName(res);
      });
})



app.listen(port, () => {
  console.log(`Runnning on port ${port}`);
});
