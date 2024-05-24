const express = require('express');
const app = express();
const df = require ('dialogflow-fulfillment');
const {google} = require ('googleapis');
const PORT = process.env.PORT || 80;

const calendarId = " /* your calendar id */ ";
const serviceAccount = {/*services account info */};


  const serviceAccountAuth = new google.auth.JWT({
    email : serviceAccount.client_email,
    key : serviceAccount.private_key,
    scopes : 'https://www.googleapis.com/auth/calendar'
  });

  const calendar = google.calendar('v3');
  const timeZone = 'America/Los_Angeles';
  const timeZoneOffset = '-07:00';


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

app.post('/dialogflow', express.json (),(request,response) => {
    const agent = new df.WebhookClient ({
        request : request,
        response : response
    });
   
    async function scheduleAppointment(agent){
        //agent.add('response from vs code editor ');
        const appointment_type = agent.parameters.AppointmentType;
        startTime  = new Date(Date.parse(agent.parameters.date.split('T')[0] + 'T' + agent.parameters.time.split('T')[1].split('+')[0] + timeZoneOffset));
        const endTime = new Date(new Date (startTime).setHours(startTime.getHours() + 1)); 
        const appointmentTimeString = startTime.toLocaleString(
            'en-US',
            { month: 'long', day: 'numeric', hour: 'numeric', timeZone: timeZone }
          );
        try {
            const res = await createCalendarEvent(appointment_type, startTime, endTime);
            agent.add(`Ok, let me see if we can fit you in. ${appointmentTimeString} is fine!. Creating ${appointment_type} appointment.`);
        } catch {
            agent.add(`I'm sorry, there are no slots available for ${appointmentTimeString}.`);
        }
        
    }
    let  intentMap = new Map();
    intentMap.set ('Schedule Appointment',scheduleAppointment);
    agent.handleRequest(intentMap);
});

function createCalendarEvent(appointment_type,startTime,endTime){
    return new Promise((resolve,reject)=>{
        console.log("startTime in createCalendarEvent:", startTime);
        console.log("endTime in createCalendarEvent:", endTime);
        calendar.events.list({
            auth : serviceAccountAuth,
            calendarId : calendarId,
            timeMin : startTime.toISOString(),
            timeMax : endTime.toISOString()
        },(err,res)=> {
            if(err){
                reject(err);
            }else if (res.data.items && res.data.items.length > 0) {
                reject('Requested time conflicts with another appointment');
            }
            else {
                calendar.events.insert({
                    auth : serviceAccountAuth,
                    calendarId : calendarId,
                    resource : {
                        summary : appointment_type + ' Appointment', 
                        description: appointment_type,
                        start : {dateTime : startTime},
                        end : {dateTime : endTime}
                    }
                },(err,events) => {
                    err ? reject (err) : resolve(events);
                });
            }
        });
    });
}
