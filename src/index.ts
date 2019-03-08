import * as commandpost from "commandpost";
import { log } from "./logger";
import { checkParallel /*,  checkAsync*/ } from "./checker"
import * as readline from 'readline';
import { until/*, waterfall */} from 'async';
import * as _ from 'lodash';
import mongoose,  {Schema } from 'mongoose';

let root = commandpost
    .create<{ stdin: boolean; threads: number; debug: boolean; mongoUrl: string, email: string; },{}>('emailchecker [options]')
    .version(require('../package.json').version, '-v, --version')
    .description('Scans for validity of a single or multiple email addresses.')
    .option('-i, --stdin', 'If provided, reads email input from stdin. One email per line')
    .option('-t, --threads', 'Number of checker thrads to run in parralel')
    .option('-m --mongoUrl [url]', 'Connects to Mongodb instance')
    .option('-q --query [query]', 'Query to execute')
    .option('-d, --debug', 'Debug is turned on')
    .action(async (opts: any) => {
        console.log(opts);
        if(opts.debug){
            console.log('Setting debug loglevel');
            log.level = 'debug';
        }

        const emailsToCheck:string[] = [];

        if(opts.stdin){
            log.debug('Reading from stdin');
            let rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.on('line', (line: string) => {
                emailsToCheck.push(line.trim());
                //checkAsync(line.trim()).then(console.log.bind(console));
                log.debug(`Input added ${emailsToCheck.length}`);
            });

            let finished = false;
            process.on('SIGINT', function () {
                log.info('SIGINT received, closing running threads...');
                finished = true;
            });


            await new Promise((doneWait:any) => setTimeout(doneWait, 1000));

            until(() => finished,
                  async (callback:any) => {
                      console.log('Next:' + emailsToCheck.length);
                      setTimeout(callback, 100);
                  },
                  () => {
                      return false;
                  });

            console.log('Started analysis');

            await checkParallel(emailsToCheck, 10)
                .then((results:any) => console.log(JSON.stringify(results)))

            console.log('Finished analysis');


            // rl.on('end', async () => {
            //     finished = true;
            //     log.info(`Input finished`);
            // });
            // until(() => finished,
            //       async (callback:any) => {
            //           await checkParallel(emailsToCheck, 2)
            //           log.info('Next hit');
            //           callback();
            //       },
            //       () => log.info('Done')
            //      );
            // log.info('Here');
        }

        if(opts.mongoUrl){
            //console.log(mongoose.models);
            var BadooModel = mongoose.model('Badoo', new Schema({
                __id: Number,
                email: String,
                num: Number,
                pwd_hash: String,
                fullname: String,
                firtname: String,
                lastname: String,
                date_of_birth: Date,
                age_as_of_2012: Number,
                gender: String,
                emailExists: Boolean,
                num1: Number,
                num2: Number,
                num3: Number
            }), 'badoo');
            log.debug(`Connecting to ${opts.mongoUrl}`)
            mongoose.connect(opts.mongoUrl[0], { useNewUrlParser: true })
                .then(() => {
                    log.debug(`Connection ${opts.mongoUrl} opened`);

                    return new Promise((resolve:any) => {
                        //const db = mongoose.connection;
                        //BadooModel.findOne().cursor

                        const cursor = BadooModel.find(JSON.parse(opts.query)).cursor();
                        const emails: string[] = [];
                        cursor.on('data', (obj:any) => emails.push(obj.email));
                        cursor.on('end', async () => {
                            log.info('End:');
                            await new Promise((doneWait:any) => setTimeout(doneWait, 1000));
                            until(() => emails.length === 0,
                                  (callback:any) => {
                                      const partEmails:any[] = [];
                                      _.range(20).forEach(() => partEmails.push(emails.pop()));
                                      log.debug(`Oustanding: ${emails.length}`);
                                      log.info(JSON.stringify(partEmails));
                                      checkParallel(partEmails, 20)
                                          .then((results:any) => {
                                              results.forEach(async (it:any) => {
                                                  console.log(`Updating ${it.email}`);
                                                  await BadooModel.updateMany({ email: it.email }, { $set: { emailExists: it.status } })
                                                      .then(()=> console.log(`Updated ${it.email}:${it.status}`))
                                                      .catch(err => console.log(err))

                                              })
                                              callback(null, results)
                                              return results
                                          })
                                  },
                                  results => resolve(results));
                        });
                    })
                        .catch(console.error.bind(console, 'connection error:'));
                });
        }
    });

commandpost
    .exec(root, process.argv)
    .catch(err => {
        if (err instanceof Error) {
            log.error(`Error: ${err.stack}`);
        } else {
            log.error(`Error: ${err}`);
        }
        process.exit(1);
    });
