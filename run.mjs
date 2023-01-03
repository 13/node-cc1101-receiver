#!/usr/bin/env node

// import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as mqtt from 'mqtt';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import dayjs from 'dayjs';
import fs from 'node:fs/promises';

// configuration
const tty = argv.port || '/dev/ttyACM0';
const mqttAddress = argv.mqtt || 'localhost';
const showTimestamp = (!!argv.timestamp);

function dataToJSON(str) {
  // str = str.substring(0, str.indexOf('END'))
  str = str.replace(/(MUH,|M,|\r\n|\n|\r)/gm, '').trim().split(',');
  const obj = {};
  for (let i = 0; i < str.length; i += 1) {
    const parts = str[i].split(':');
    if (Number.isNaN(parts[1])) {
      // set if empty
      obj[parts[0]] = parts.length > 1 ? parts[1] : true;
    } else {
      // convert to float or int
      // Temperature, Humidity, Pressure, Voltage
      if ((/^[T,H,P,V]\d/i.test(parts[0]))) {
        obj[parts[0]] = parseFloat(parts[1] / 10);
      } else {
        obj[parts[0]] = parseInt(parts[1]);
      }
    }
  }
  return JSON.parse(JSON.stringify(obj));
}

function keepAlive() {
  const keepAliveDate = new Date();
  const FIVE_MIN = 5 * 60 * 1000;
  // const TWO_MIN = 2 * 60 * 1000;
  // const ONE_MIN = 2 * 60 * 1000;
  if ((keepAliveDate - new Date(lastMsgDate)) > FIVE_MIN) {
    WARN(`${getTime()}timeout!`);
    DEBUG(`${(keepAliveDate - new Date(lastMsgDate)) / 1000} seconds`);
    DEBUG(`${((keepAliveDate - new Date(lastMsgDate)) / 1000) * 60} minutes`);
    port.close();
    // reConnect()
  } else {
    DEBUG(`${getTime()}MARK`);
  }
  setTimeout(keepAlive, 1 * 60 * 1000);
}

function getTime() {
  return (showTimestamp ? dayjs().format('HH:mm:ss.SSS ') : '');
}

// yargs
const argv = yargs(hideBin(process.argv))
  // help text
  .alias('h', 'help')
  .help('help')
  .usage('Usage: $0 -p [tty]')
  // tty port
  .option('p', {
    alias: 'port',
    describe: 'tty port',
    type: 'string', /* array | boolean | string */
    nargs: 1,
    demand: true,
    // default: '/dev/ttyACM0',
    requiresArg: true,
  })
  .option('t', {
    alias: 'timestamp',
    describe: 'show timestamp',
    nargs: 0,
    // default: false,
    requiresArg: false,
  })
  .option('v', {
    alias: 'verbose',
    describe: 'show verbose',
    count: true,
    nargs: 0,
    // default: false,
    requiresArg: false,
  })
  .option('m', {
    alias: 'mqtt',
    describe: 'mqtt server address',
    type: 'string',
    nargs: 1,
    default: 'localhost',
    requiresArg: true,
  });

// verbose
VERBOSE_LEVEL = argv.verbose;
function WARN() { VERBOSE_LEVEL >= 0 && console.log.apply(console, arguments); }
function INFO() { VERBOSE_LEVEL >= 1 && console.log.apply(console, arguments); }
function DEBUG() { VERBOSE_LEVEL >= 2 && console.log.apply(console, arguments); }

// serialport
const port = new SerialPort({ path: argv.port || '/dev/ttyACM0', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// fs
fs.access(tty, (err) => {
  if (err) {
    console.log('error', err);
    process.exit(1);
  }
});

// mqtt
const mqttClient = mqtt.connect(`mqtt://${mqttAddress}`);

// keepalive
let lastMsgDate = new Date();

// start msg
console.log(`${getTime()} node-cc1101-receiver starting ...`);
console.log(`${getTime()} tty: ${tty}, mqtt: ${mqttAddress}`);

// serialport
port.on('open', () => {
  console.log(`${getTime()}serial port opened`);
  // setTimeout(keepAlive, 1 * 60 * 1000)
});

port.on('close', () => {
  console.log(`${getTime()}serial port closed`);
  // reConnect()
  process.exit(1);
});

port.on('error', (err) => {
  console.log(`${getTime()}serial port error`);
  console.log('error', err);
  // reConnect()
});

parser.on('data', (data) => {
  let datax = data;
  const convert = (from, to) => (str) => Buffer.from(str, from).toString(to);
  // const utf8ToHex = convert('utf8', 'hex');
  const hexToUtf8 = convert('hex', 'utf8');

  // if (hexToUtf8(data.substring(0,2)) == 'M'){
  if (hexToUtf8(datax).startsWith('M,')) {
    console.log(`${getTime()}hexToUtf8`);
    console.log(`${getTime()}${datax}`);
    datax = hexToUtf8(datax);
  }

  const isASCIIMUH = (string) => /^[A-Za-z0-9,.:-]*$/.test(string);
  // const isASCII = string => /^[\x00-\x7F]*$/.test(string)
  datax = datax.replace(/(\r\n|\n|\r)/gm, '').trim();
  if (isASCIIMUH(datax) && datax.startsWith('M,')) {
    console.log(`${getTime()}${datax}`);
    const mySensor = dataToJSON(datax);
    delete mySensor.E;
    mqttClient.publish(`sensors/${mySensor.N}/json`, JSON.stringify(mySensor));
  } else if (datax.startsWith('> ') || datax.length === 0) {
    DEBUG(`${getTime()}${datax.substr(2)}`);
  } else {
    // DEBUG MSG
    /* if (datax.startsWith('R') || datax.startsWith('W')) {
      DEBUG(`${getTime()}${datax}`);
    } else {
      // DEBUG(getTime() + "ERR: " + datax.replace(/(\r\n|\n|\r)/gm,"").trim())
      DEBUG(`${getTime()}ERR: ${datax}`);
    } */
  }
  lastMsgDate = new Date();
});
