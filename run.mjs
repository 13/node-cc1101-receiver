#!/usr/bin/env node

import * as mqtt from 'mqtt';
import SerialPort from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import dayjs from 'dayjs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
// import fs from 'node:fs/promises';

const { argv } = yargs(hideBin(process.argv))
  .option('port', {
    alias: 'p',
    type: 'string',
    default: '/dev/ttyACM0',
    nargs: 1,
    describe: 'The tty port number to use',
  })
  .option('timestamp', {
    alias: 't',
    type: 'boolean',
    requiresArg: false,
    nargs: 0,
    describe: 'The timestamp to use',
  })
  .option('debug', {
    alias: 'd',
    type: 'boolean',
    requiresArg: false,
    nargs: 0,
    describe: 'Show debug messages',
  })
  .option('mqtt', {
    alias: 'm',
    type: 'string',
    default: '192.168.22.5',
    describe: 'The MQTT server URL to use',
  })
  .help();

// config
const tty = argv.port || '/dev/ttyACM0';
const mqttAddress = argv.mqtt || '192.168.22.5';
const showTimestamp = argv.timestamp || false;
const showDebug = argv.debug || false;

// serialport
const port = new SerialPort(`${tty}`, { baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// mqtt
const mqttClient = mqtt.connect(`mqtt://${mqttAddress}`);

// functions
function getTime() {
  return (showTimestamp ? dayjs().format('HH:mm:ss.SSS ') : '');
}

// start msg
console.log(`${getTime()}node-cc1101-receiver starting ...`);
console.log(`${getTime()}tty: ${tty}, mqtt: ${mqttAddress}`);

// serialport
port.on('open', () => {
  console.log(`${getTime()}serial port opened`);
});

port.on('close', () => {
  console.log(`${getTime()}serial port closed`);
  process.exit(1);
});

port.on('error', (err) => {
  console.log(`${getTime()}serial port error`, err);
  process.exit(2);
});

parser.on('data', (data) => {
  let datax = data;
  const isASCIIMUH = (string) => /^[A-Za-z0-9,.:-]*$/.test(string);
  datax = datax.replace(/(\r\n|\n|\r)/gm, '').trim();

  if (datax.startsWith('Z:')) {
    datax = datax.replace(/(\r\n|\n|\r|\s)/gm, '').trim();
    if (isASCIIMUH(datax) && datax.startsWith('Z:')) {
      const pairs = datax.replace(/(\r\n|\n|\r)/gm, '').trim().split(',');
      const packet = pairs.reduce((result, pair) => {
        const [key, value] = pair.split(':');
        const resultx = result;
        if ((/^[N]/i.test(key))) {
          resultx[key] = value;
        } else if ((/^[T,H,P,V]\d/i.test(key))) {
          resultx[key] = parseFloat(value / 10);
        } else {
          resultx[key] = parseInt(value, 10);
        }
        return resultx;
      }, {});
      delete packet.Z;
      if (showDebug) {
        console.log(`${getTime()}${datax}`);
        console.log(`${getTime()} sensors/${packet.N}/json ${JSON.stringify(packet)}`);
      } else {
        console.log(`${getTime()}${JSON.stringify(packet).replace(/[{}"]/g, '')}`);
      }
      mqttClient.publish(`sensors/${packet.N}/json`, JSON.stringify(packet));
    }
  } /*else {
    console.log(`${getTime()} ERR Z MATCH: ${datax}`);
  }*/
});
