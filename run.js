#!/usr/bin/env node

// yargs
const argv = require('yargs')(process.argv.slice(2))
  // help text
  .alias('h', 'help')
  .help('help')
  .usage('Usage: $0 -p [tty]')
  .count('verbose')
  .alias('v', 'verbose')
  // tty port
  .option('p', {
      alias : 'port',
      describe: 'tty port',
      type: 'string', /* array | boolean | string */
      nargs: 1,
      demand: true,
      demand: 'tty port is required',
      //default: '/dev/ttyACM0',
      requiresArg:true
  })
  .option('t', {
      alias : 'timestamp',
      describe: 'show timestamp',
      nargs: 0,
      //default: false,
      requiresArg: false
  })
  .option('m', {
      alias : 'mqtt',
      describe: 'mqtt server address',
      type: 'string',
      nargs: 1,
      default: 'localhost',
      requiresArg: true
  }).argv

// configuration
const tty = argv.port || '/dev/ttyACM0'
const mqtt_address = argv.mqtt || 'localhost'
const showTimestamp = (argv.timestamp ? true : false)

// verbose
VERBOSE_LEVEL = argv.verbose;
function WARN()  { VERBOSE_LEVEL >= 0 && console.log.apply(console, arguments); }
function INFO()  { VERBOSE_LEVEL >= 1 && console.log.apply(console, arguments); }
function DEBUG() { VERBOSE_LEVEL >= 2 && console.log.apply(console, arguments); }

// dayjs
const dayjs = require('dayjs')

// fs
const fs = require("fs")
fs.access(tty, (err) => {
  if (err) {
    console.log('error', err)
    process.exit(1)
  }
})

// serial
const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
var port = new SerialPort(tty, { baudRate: 9600 })
var parser_sp = port.pipe(new Readline({ delimiter: '\n' }))

// mqtt
const mqtt = require('mqtt')
const client = mqtt.connect('mqtt://' + mqtt_address)

// keepalive
var lastMsgDate = new Date()

// start msg
console.log(getTime() + '--> node-cc1101-receiver starting ...')
console.log(getTime() + '--> tty: '+ tty + ', mqtt: ' + mqtt_address)

// serialport
port.on('open', () => {
  console.log(getTime() + '--> serial port opened')
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
    port = new SerialPort(tty, { baudRate: 9600 })
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
      DEBUG(getTime() + "- " + data.substr(2))    
      //console.log(getTime() + "- " + data.substr(2))
    } else {
	// DEBUG MSG
        if (data.startsWith("R") || data.startsWith("W")){
	  DEBUG(getTime() + "- " + data)
          //console.log(getTime() + "- " + data)
        } else {
          //console.log(getTime() + "- ERR: " + data.replace(/(\r\n|\n|\r)/gm,"").trim())
	  DEBUG(getTime() + "- ERR: " + data)
         // console.log(getTime() + "- ERR: " + data)
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
    WARN(getTime() + '--> timeout!')
    DEBUG((keepAliveDate - new Date(lastMsgDate))/1000 + " seconds")
    DEBUG(((keepAliveDate - new Date(lastMsgDate))/1000)*60 + " minutes")	  
    //console.log(getTime() + '--> timeout!')
    //console.log((keepAliveDate - new Date(lastMsgDate))/1000 + " seconds")
    //console.log(((keepAliveDate - new Date(lastMsgDate))/1000)*60 + " minutes")
    port.close()
    //reConnect()
  } else {
    DEBUG(getTime() + '--> MARK')
    //console.log(getTime() + '--> MARK')
  }
  setTimeout(keepAlive, 1 * 60 * 1000)
}

function getTime() {
  if (showTimestamp) {
    return dayjs().format('HH:mm:ss.SSS ')
  } else {
    return ''
  }
}
