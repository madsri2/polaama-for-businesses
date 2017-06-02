'use strict';

const nodemailer = require('nodemailer');

function EmailSender() {
}

EmailSender.prototype.send = function(fromId, messages) {
	let transporter = nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
	});
	let attachments = [];
	messages.forEach(mesg => {
		attachments.push({
			filename: mesg,
			path: mesg
		});
	});
	transporter.sendMail({
    from: 'trips@mail.polaama.com',
    to: 'madsri2@gmail.com',
    subject: `Message from ${fromId}`,
    text: 'Polaama received an email',
		attachments: attachments
	}, (err, info) => {
    console.log(info.envelope);
    console.log(info.messageId);
	});
	/*
	// create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    port: 1025,
		tls: {
      // do not fail on invalid certs
      rejectUnauthorized: false
    }
  });

  // setup email data with unicode symbols
  let mailOptions = {
    from: '"Polaama" <trips@mail.polaama.com>', // sender address
    to: 'madsri2@gmail.com', // receivers
    subject: 'Hi Madhu', // Subject line
    text: 'Hello world ?', // plain text body
    html: '<b>Hello world ?</b>' // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
    	return console.log(error);
    }
    console.log('Message %s sent: %s', info.messageId, info.response);
  });
	*/
}

module.exports = EmailSender;
