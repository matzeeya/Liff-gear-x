'use strict';

const functions = require('firebase-functions');
const {WebhookClient,Payload} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');

const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://gearx-yqdqsf.firebaseio.com'
});
const db = admin.firestore();

// const serviceAccount = require('./key.json')
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: 'https://pizzanulok-vfwchf.firebaseio.com'
// });



process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements


exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({
    request,
    response
  });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }

  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  function register(agent) {
    const params = agent.parameters;
    const studentID = params.stdID;
    const studentCard = params.stdCard;

    agent.add(`รหัสนิสิตของคุณคือ! ${studentID} และหมายเลขบัตรประจำตัวประชาชนของคุณคือ ${studentCard} ใช่หรือไม่คะ? `);

    const payloadJson = {
        "type": "template",
        "altText": "this is a confirm template",
        "template": {
          "type": "confirm",
          "actions": [
            {
              "type": "message",
              "label": "Yes",
              "text": "ใช่"
            },
            {
              "type": "message",
              "label": "No",
              "text": "ไม่ใช่"
            }
          ],
          "text": "ยืนยันการลงทะเบียน"
        }
      }
    let payload = new Payload(`LINE`, payloadJson, { sendAsMessage: true });

    agent.add(payload);

  }

  function isClickYes(agent){
    const params = agent.parameters;
    const studentID = params.stdID.toString();
    const studentCard = params.stdCard.toString(); 
    const keyid = "tQuDIQyY8u1uY2OzLcZw";

    return db.collection('studentInfo').doc(keyid).get().then(doc => {
        const flexMessage = {
          "type": "flex",
          "altText": "Flex Message",
          "contents": {
            "type": "bubble",
            "direction": "ltr",
            "header": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "ข้อมูลผู้ใช้",
                  "align": "center",
                  "color": "#123663"
                }
              ]
            },
            "hero": {
              "type": "image",
              "url": "https://civil.eng.nu.ac.th/ceCentre/img/ungit/CCI04202020_0003.png",
              "size": "full",
              "aspectMode": "cover",
              "backgroundColor": "#FB5F15"
            },
            "body": {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": studentID + ' ' + doc.data().student_name,
                  "align": "center"
                }
              ]
            },
            "footer": {
              "type": "box",
              "layout": "horizontal",
              "contents": [
                {
                  "type": "button",
                  "action": {
                    "type": "uri",
                    "label": "ผูกบัญชี",
                    "uri": "https://linecorp.com"
                  },
                  "style": "secondary"
                }
              ]
            }
          }
        };
        let payload = new Payload(`LINE`, flexMessage, { sendAsMessage: true });
        agent.add(payload);
    });
  }

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('studentinfo - stdID - stdCard', register);
  intentMap.set('studentinfo - stdID - stdCard - yes', isClickYes);
  return agent.handleRequest(intentMap);
});