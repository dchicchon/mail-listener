# Overview

Mail-listener library for node.js. Get notifications when new email arrived to inbox or when message metadata (e.g. flags) changes externally. Uses IMAP protocol.

This dependency is forked from https://www.npmjs.com/package/mail-listener6 in order to add improvements. Please refer to the original npm package for details.

## Use

Install

`npm install @dchicchon/mail-listener`


JavaScript Code:


```javascript

var { MailListener } = require("mail-listener");   // NOTE: A FUTURE VERSION (release date TBA) will not require ES6 destructuring or referring to the class after the require statement (i.e. require('mail-listener6').MailListener). At this stage, this is necessary because index.js exports the MailListener class as a property of module.exports.

var mailListener = new MailListener({
  username: "imap-username",
  password: "imap-password",
  host: "imap-host",
  port: 993, // imap port
  tls: true,
  connTimeout: 10000, // Default by node-imap
  authTimeout: 5000, // Default by node-imap,
  debug: console.log, // Or your custom function with only one incoming argument. Default: null
  tlsOptions: { rejectUnauthorized: false },
  mailbox: "INBOX", // mailbox to monitor
  searchFilter: ["ALL"], // the search filter being used after an IDLE notification has been retrieved
  markSeen: true, // all fetched email willbe marked as seen and not fetched next time
  fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
  attachments: true, // download attachments as they are encountered to the project directory
  attachmentOptions: { directory: "attachments/" } // specify a download directory for attachments
});

mailListener.start(); // start listening

// stop listening
//mailListener.stop();

mailListener.on("server:connected", function(){
  console.log("imapConnected");
});

mailListener.on("mailbox", function(mailbox){
  console.log("Total number of mails: ", mailbox.messages.total); // this field in mailbox gives the total number of emails
});

mailListener.on("server:disconnected", function(){
  console.log("imapDisconnected");
});

mailListener.on("error", function(err){
  console.log(err);
});

mailListener.on("headers", function(headers, seqno){
  // do something with mail headers
});

mailListener.on("body", function(body, seqno){
  // do something with mail body
})

mailListener.on("attachment", function(attachment, path, seqno){
  // do something with attachment
});

mailListener.on("mail", function(mail, seqno) {
  // do something with the whole email as a single object
})

// it's possible to access imap object from node-imap library for performing additional actions. E.x.
mailListener.imap.move(:msguids, :mailboxes, function(){})

```

## Attachments
Attachments in this version are buffered. This feature is based on how [mailparser](https://github.com/andris9/mailparser#attachments)'s simpleParser function handles attachments.
Setting `attachments: true` will download attachments as buffer objects by default to the project directory.
A specific download directory may be specified by setting `attachmentOptions: { directory: "attachments/"}`.
The `"attachment"` event will be fired every time an attachment is encountered.

## License

MIT
