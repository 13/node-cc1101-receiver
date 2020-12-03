#!/usr/bin/env node

// configuration
const mqtt_address = '192.168.22.5'

// dayjs
const dayjs = require('dayjs');

// yargs
/*const argv = require('yargs')
  .usage('$0 <tty>', 'start the serial port', (yargs) => {
    yargs.positional('tty', {
      describe: 'the serial port that your application should bind to',
      default: '/dev/ttyUSB0'
    })
  }).argv*/
require('yargs')
  .command('$0 [tty]', 'start the app',(yargs) => {
    yargs
      .positional('tty', {
        describe: 'serial port',
        default: '/dev/ttyUSB0'
      })
      .option('timestamp', {
        alias: 't',
        default: false,
        description: 'show timestamp'
      })
  })

var showTimestamp = (argv.timestamp ? true : false)

// fs
const fs = require("fs")
fs.access(argv.tty, (err) => {
  if (err) {
    console.log('error', err)
    process.exit(1)
  }
})

// serial
const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
var port = new SerialPort(argv.tty, { baudRate: 9600 })
var parser_sp = port.pipe(new Readline({ delimiter: '\n' }))

// mqtt
const mqtt = require('mqtt')
const client = mqtt.connect('mqtt://' + mqtt_address)

// keepalive
var lastMsgDate = new Date()

// serialport
port.on('open', () => {
  console.log(getTime() + '--> serial port open')
  setTimeout(keepAlive, 1 * 60 * 1000)
})

port.on('close', () => {
  console.log(getTime() + '--> serial port closed')
  //reConnect()
  process.exit(1)
})

port.on('error', (err) => {
  console.log(getTime() + '--> serial port error')
  console.log('error', err)
  //reConnect()
})

// check for connection errors or drops and reconnect
var reConnect = function () {
  console.log('--> reconnecting ...')
  port.close()
  setTimeout(function(){
    console.log('--> trying ...')
    port = new SerialPort(argv.tty, { baudRate: 9600 })
  }, 5000)
}

parser_sp.on('data', data =>{
  const convert = (from, to) => str => Buffer.from(str, from).toString(to)
  const utf8ToHex = convert('utf8', 'hex')
  const hexToUtf8 = convert('hex', 'utf8')

  //if (hexToUtf8(data.substring(0,2)) == 'M'){
  if (hexToUtf8(data).startsWith("M,")) {
    console.log(getTime() + "--> hexToUtf8")
    console.log(getTime() + "- " + data)
    data = hexToUtf8(data)
  }

  const isASCIIMUH = string => /^[A-Za-z0-9,.:-]*$/.test(string)
  //const isASCII = string => /^[\x00-\x7F]*$/.test(string)
  data = data.replace(/(\r\n|\n|\r)/gm,"").trim()
  if (isASCIIMUH(data) && data.startsWith("M,")) {
    console.log(getTime() + "- " + data)
    mySensor = dataToJSON(data)
    delete mySensor.E
    client.publish('sensors/' + mySensor.N + '/json', JSON.stringify(mySensor))
  } else {
    if (data.startsWith("> ") || data.length == 0){
      console.log(getTime() + "- " + data.substr(2))
    } else {
	// DEBUG MSG
        if (data.startsWith("R") || data.startsWith("W")){
          console.log(getTime() + "- " + data)
        } else {
          //console.log(getTime() + "- ERR: " + data.replace(/(\r\n|\n|\r)/gm,"").trim())
          console.log(getTime() + "- ERR: " + data)
	}
    }
  }
  lastMsgDate = new Date()
})

function dataToJSON(str){
  //str = str.substring(0, str.indexOf('END'))
  str = str.replace(/(MUH,|M,|\r\n|\n|\r)/gm,"").trim().split(',')
  var obj = {}
  for (var i=0; i<str.length; i++) {
    var parts = str[i].split(':')
    if (isNaN(parts[1])){
      // set if empty
      obj[parts[0]] = parts.length > 1 ? parts[1] : true
    } else { 
      // convert to float or int 
      // Temperature, Humidity, Pressure, Voltage
      if ((/^[T,H,P,V]\d/i.test(parts[0]))){
        obj[parts[0]] = parseFloat(parts[1]/10)
      } else {
        obj[parts[0]] = parseInt(parts[1])
      }
    }
  }
  return JSON.parse(JSON.stringify(obj))
}

function keepAlive() {
  var keepAliveDate = new Date()
  var FIVE_MIN= 5 * 60 * 1000
  var TWO_MIN= 2 * 60 * 1000
  var ONE_MIN= 2 * 60 * 1000
  if((keepAliveDate - new Date(lastMsgDate)) > FIVE_MIN) {
    console.log(getTime() + '--> timeout!')
    console.log((keepAliveDate - new Date(lastMsgDate))/1000 + " seconds")
    console.log(((keepAliveDate - new Date(lastMsgDate))/1000)*60 + " minutes")
    port.close()
    //reConnect()
  } else {
    console.log(getTime() + '--> MARK')
  }
  setTimeout(keepAlive, 1 * 60 * 1000)
}

function getTime() {
  if (showTimestamp) {
    return dayjs().format('HH:mm:ss.SSS ')
  } else {
    return	  
  }
}
