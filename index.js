var Discord  = require('discord.js');
var Imap     = require('imap'),
    inspect  = require('util').inspect;
var fs       = require('fs');


/*
ENV_EMAIL=info@theinsightx.com;
ENV_PASSWORD=Bk92-Jh91;
ENV_HOST=imap.gmail.com;
ENV_PORT=993;
ENV_TLS=true;
ENV_DISCORD_TOKEN=NzUyNDc2Mjk0OTM1MjE2MTcw.X1YMKQ.v6WgZONHmfAy9pjT-eXvJY8Lnww
ENV_DISCORD_CHANNEL=752476565585264670
 */


const env_email = process.env.ENV_EMAIL;
const env_password = process.env.ENV_PASSWORD
const env_host = process.env.ENV_HOST
const env_port = parseInt(process.env.ENV_PORT)
const env_tls = (process.env.ENV_TLS === "true")
const env_discord_token = process.env.ENV_DISCORD_TOKEN
const env_discord_channel = process.env.ENV_DISCORD_CHANNEL

var imap = new Imap({
    user: env_email,
    password: env_password,
    host: env_host,
    port: env_port,
    tls: env_tls,
    tlsOptions: {
        rejectUnauthorized: false
    }
});

const bot = new Discord.Client();
bot.login(env_discord_token);

function openInbox(callback) {
    imap.openBox('INBOX', true, callback);
}
  
// Send the newest message to discord
function sendNewest() {
    openInbox(function(err, box) {
        if (err) throw err;

        var f = imap.seq.fetch(box.messages.total + ':*', {
            id: 1,
            bodies: ['HEADER.FIELDS (FROM, SUBJECT)', '1'],
            struct: true
        })

        f.on('message', (message, index) => {
            message.on('body', (stream, info) => {
                var buffer = '', count = 0;
                var prefix = '(#' + index + ') ';

                stream.on('data', function(chunk) {
                    count += chunk.length;
                    buffer += chunk.toString('utf8');
                    console.log(prefix + 'Body [%s] (%d/%d)', inspect(info.which), count, info.size);
                });

                stream.once('end', function() {

                    bot.channels.fetch(env_discord_channel).then((channel) => {
                        channel.send(buffer);
                        console.log(prefix + 'Body [%s] Finished', inspect(info.which));
                    })


                });

            });
        });
        
        f.once('error', function(err) {
            console.log('Fetch error: ' + err);
        });
        f.once('end', function() {
            console.log('Done fetching all messages!');
            // imap.end();
        });
    });

}

imap.once('ready', function() {
    imap.on('mail', mail => {
        sendNewest();
    });

    sendNewest();
});

imap.connect();