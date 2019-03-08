import { log } from './logger'
import { parallelLimit } from 'async';

import dns from 'dns';
import net from 'net';

//import * as _ from 'lodash';
const _ = require('lodash');

const job = (email:any) => {
    return checkAsync(email)
}
const checkParallel = (emails:any,
                       numSeries:number = 1,
                       cb:any = (err:any, results:any) => log.info(results,err)) =>
    new Promise((resolve) => {
        const async_queue = emails.map((email:string) => {
            // return async (callback:any) => {
            //     log.info('Starting email:' + email);
            //     const result = await job(email);
            //     callback(null, result);
            //     log.info(`Finishing email: ${email} with results: ${JSON.stringify(result)}`);
            //     return result;
            // };
            return (callback:any) => job(email).then((it:any) => callback(null, it));
        });
        parallelLimit(async_queue,
                      numSeries,
                      (err:any, results:any) => {
                          cb(err, results);
                          if(err)
                              log.error(err);
                          resolve(results);
                      });
    });

import * as Bluebird from 'bluebird';
const emailExistence = require('email-existence');
const emailExists = Bluebird.Promise.promisifyAll(emailExistence).checkAsync;

const checkAsync = async (email:string) =>  {
    log.debug(`Start for email: ${email}`);
    return emailExists(email)
        .then((status:any) => {
            log.debug(`Finished for email: ${email} with status: ${status}`);
            return {
                email: email,
                status: status
            }
        })
        .catch((err:any) => {
            log.error(err);
            return {
                email: email,
                status: false
            }
        })
}

const reverseLookup = (ip:string) => new Promise((res, rej) => {
    dns.reverse(ip, (err:any, domains:string[]) => {
        if(err)
            rej(err)
        else
            res(domains);
    })
})

const checkForDomain = (o: object, opts:any = {}) => new Promise((resolve, reject) => {
    _.map(o, async (val:any, prop:string) => {
        const locals = val
        const domain = prop

        opts = _.merge({
            sender: `me@${await reverseLookup('5.58.235.221')}`,
                        timeout: 10000,
                       }, opts);
        log.debug(`Checking MXes for domain ${domain}`);
        dns.resolveMx(domain, (err, addresses) => {
            if (err) reject(err)
            else {
                log.debug(`Resolved MXes`);
                /* https://en.wikipedia.org/wiki/MX_record#Priority
                   The MX priority determines the order in which the servers
                   are supposed to be contacted: The servers with the highest
                   priority (and the lowest preference number) shall be tried
                   first. Node, however, erroneously labels the preference number
                   "priority". Therefore, sort the addresses by priority in
                   ascending order, and then contact the first exchange. */

                const sortedAddresses = addresses
                    .sort((a, b) => a.priority - b.priority)
                    .filter((it) => it.exchange.indexOf('mx') === 0) // remove that in production

                const exchange = sortedAddresses[0].exchange
                // const exchange = addresses[0].exchange
                log.debug(`Using exchanges: ${exchange} of ${JSON.stringify(addresses)}`)


                /* https://technet.microsoft.com/en-us/library/aa995718
                   Since Telnet can be used for testing SMTP, we don't even
                   need an external SMTP library but can simply use Node's
                   built-in net client. */

                const TELNET_PORT = 25
                const conn = net.createConnection(TELNET_PORT, exchange)

                conn.setTimeout(opts.timeout)

                conn.on('error', reject)
                conn.on('timeout', () => reject('TIMEOUT'))

                conn.on('connect', async () => {
                    const EOL = '\r\n'
                    let conversation:any[] = [
                        'QUIT'
                    ]
                    const results:any[] = [];

                    conversation = conversation.concat(locals.map((local:string) => `RCPT TO: ${local}@${domain}`));

                    /* https://tools.ietf.org/html/rfc1123#section-5.2.7
                       Cannot check whether an address actually exists:
                       Servers may send "250 OK" false positives to prevent
                       malware from discovering all available addresses. */
                    //}));

                    conversation.push(`MAIL FROM: ${opts.sender}`)
                    conversation.push('HELO ' + exchange)

                    conn.on('data', (data:any) => {
                        data = data.toString()
                        log.debug(data)
                        if(results.length > 0
                           && results[results.length - 1]
                           && results[results.length - 1].status === undefined) {
                            results[results.length - 1].status = data.startsWith('250 ')?true:data;
                        }

                        if(conversation.length > 0){
                            const str = conversation.pop() + EOL;
                            log.debug(str);
                            conn.write(str);
                            if(str.startsWith('RCPT TO: ')){
                                const local = str.match(/RCPT TO: (.*)@.*\r\n/);
                                if(local && local.length === 2)
                                    results.push({local:local[1]});
                            }
                        }
                    });

                    log.debug(`Running check:`);

                    conn.on('end', () => {
                        resolve(results);
                    })
                });
            }
        })
    })
});

// // Debug Promise built on setTimeout
// const checkAsync = (email:string) => {
//     log.debug(`Start for email: ${email}`);
//     return new Promise((resolve) => setTimeout(() => {
//         log.debug(`Finish for email: ${email}`);
//         resolve(email)
//     }, Math.random()* 5000 + 2000))
// };


export { checkParallel, checkAsync, checkForDomain };
