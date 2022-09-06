/**@module mail-listener6
 * @author Vijaykumar <matej@malicek.co>
 * @version 1.0.0
 * @date 15 April 2021
 */

// Require statements
var Imap = require("imap");
var EventEmitter = require("events").EventEmitter;
var simpleParser = require("mailparser").simpleParser;
var fs = require("fs");
var async = require("async");

class MailListener extends EventEmitter {
  constructor(options) {
    super();
    this.queue = {};
    this.markSeen = !!options.markSeen;
    this.mailbox = options.mailbox || "INBOX";
    if ("string" === typeof options.searchFilter) {
      this.searchFilter = [options.searchFilter];
    } else {
      this.searchFilter = options.searchFilter || ["UNSEEN"];
    }
    this.fetchUnreadOnStart = !!options.fetchUnreadOnStart;
    this.mailParserOptions = options.mailParserOptions || {};
    if (
      options.attachments &&
      options.attachmentOptions &&
      options.attachmentOptions.stream
    ) {
      this.mailParserOptions.streamAttachments = true;
    }
    this.attachmentOptions = options.attachmentOptions || {};
    this.attachments = options.attachments || false;
    this.attachmentOptions.directory = this.attachmentOptions.directory
      ? this.attachmentOptions.directory
      : "";
    this.imap = new Imap({
      xoauth2: options.xoauth2,
      user: options.username,
      password: options.password,
      host: options.host,
      port: options.port,
      tls: options.tls,
      tlsOptions: options.tlsOptions || {},
      connTimeout: options.connTimeout || null,
      authTimeout: options.authTimeout || null,
      debug: options.debug || null,
    });
    this.imap.once("ready", this.imapReady.bind(this));
    this.imap.once("close", this.imapClose.bind(this));
    this.imap.on("error", this.imapError.bind(this));
  }

  start() {
    this.imap.connect();
  }

  stop() {
    this.imap.end();
  }

  imapReady() {
    this.imap.openBox(this.mailbox, false, (error, mailbox) => {
      if (error) {
        this.emit("error", error);
      } else {
        this.emit("server:connected");
        this.emit("mailbox", mailbox);
        if (this.fetchUnreadOnStart) {
          this.parseUnread.call(this);
        }
        let listener = this.imapMail.bind(this);
        this.imap.on("mail", listener);
        this.imap.on("update", listener);
      }
    });
  }

  imapClose() {
    this.emit("server:disconnected");
  }

  imapError(error) {
    this.emit("error", error);
  }

  imapMail() {
    this.parseUnread.call(this);
  }

  parseUnread() {
    this.imap.search(this.searchFilter, (error, results) => {
      if (error) {
        this.emit("error", err);
      } else if (results.length > 0) {
        async.each(
          results,
          (result, callback) => {
            if (this.queue[result]) return;
            this.queue[result] = result;
            let f = this.imap.fetch(result, {
              bodies: "",
              markSeen: this.markSeen,
            });
            f.on("message", (msg, seqno) => {
              msg.on("body", async (stream, info) => {
                let parsed = await simpleParser(stream, this.mailParserOptions);
                this.emit("mail", parsed, seqno);
                this.emit("headers", parsed.headers, seqno);
                this.emit(
                  "body",
                  {
                    html: parsed.html,
                    text: parsed.text,
                    textAsHtml: parsed.textAsHtml,
                  },
                  seqno
                );
                if (parsed.attachments.length > 0) {
                  for (let att of parsed.attachments) {
                    if (this.attachments) {
                      await fs.writeFile(
                        `${this.attachmentOptions.directory}${att.filename}`,
                        att.content,
                        (error) => {
                          this.emit("error", error);
                        }
                      );
                      this.emit(
                        "attachment",
                        att,
                        `${this.attachmentOptions.directory}${att.filename}`,
                        seqno
                      );
                    } else {
                      this.emit("attachment", att, null, seqno);
                    }
                  }
                }
                delete this.queue[result];
              });
            });
            f.once("error", (error) => {
              this.emit("error", error);
              delete this.queue[result];
            });
          },
          (error) => {
            if (error) {
              this.emit("error", error);
            }
          }
        );
      }
    });
  }
}

module.exports = { MailListener };
