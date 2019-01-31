const emailExistence = require('bluebird').promisify(require("email-existence"));

const EMAILS = "slllls@i.ua, s.grinishina@tas-insurance.com.ua, liana19@lanet.kiev.ua, hr@startime.com.ua, seregjka@meta.ua, office@bittele.com.ua, pustoviys@i.ua, tanushkabest@e-mail.ua, alexander@velikiy.org.ua, a.chadaev@stroykomplekt.com.ua"
const arr = [];

EMAILS.split(/\,/).forEach(async (email) => {
    const r = await emailExistence.check(email.trim(), (err, res) => {
        if(err){
            console.error(err);
        } else {
            console.log(res);
        }
    })
});
