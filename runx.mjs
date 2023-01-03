#!/usr/bin/env node

import * as mqtt from 'mqtt';
import SerialPort from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import dayjs from 'dayjs';
// import fs from 'node:fs/promises';

// config
const tty = '/dev/ttyACM0';
const mqttAddress = '192.168.22.5';
const showTimestamp = true;

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
console.log(`${getTime()} node-cc1101-receiver starting ...`);
console.log(`${getTime()} tty: ${tty}, mqtt: ${mqttAddress}`);

// serialport
port.on('open', () => {
  console.log(`${getTime()} serial port opened`);
});

port.on('close', () => {
  console.log(`${getTime()} serial port closed`);
  process.exit(1);
});

port.on('error', (err) => {
  console.log(`${getTime()} serial port error`);
  console.log('error', err);
});

parser.on('data', (data) => {
  let datax = data;
  const isASCIIMUH = (string) => /^[A-Za-z0-9,.:-]*$/.test(string);
  datax = datax.replace(/(\r\n|\n|\r)/gm, '').trim();
  if (isASCIIMUH(datax) && datax.startsWith('M,')) {
    console.log(`${getTime()}${datax}`);
    const pairs = datax.replace(/(MUH,|M,|\r\n|\n|\r)/gm, '').trim().split(',');
    const sensor = pairs.reduce((result, pair) => {
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
    delete sensor.E;
    // console.log(`${getTime()} sensors/${sensor.N}/json ${JSON.stringify(sensor)}`);
    mqttClient.publish(`sensors/${sensor.N}/json`, JSON.stringify(sensor));
  }
});
