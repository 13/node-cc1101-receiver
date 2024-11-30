# node-cc1101-receiver

node serial arduino cc1101 parser and mqtt publisher built with Node.js

## Contents

 * [About](#about)
   * [Built With](#built-with)
 * [Getting Started](#getting-started)
   * [Prerequisites](#prerequisites)
   * [Installation](#installation)
 * [Usage](#usage)
 * [Roadmap](#roadmap)
 * [Release History](#release-history)
 * [License](#license)
 * [Contact](#contact)
 * [Acknowledgements](#acknowledgements)

## About

The cc1101-sender emits a 61 characters string.
This script parses the cc1101 string, converts to int or float, generates a json and sends to mqtt.

```
Z:60,N:87,T1:29,H1:817,T2:25,T3:42,P1:9260,A1:753,V1:38,E:00000

Z = acknowledge character & packages length
N = node number
T = temperature
H = humidity
P = pressure
A = altitude
V = voltage
M = motion
S = switch

, = delimiter

X1 = si7021
X2 = ds18b20
X3 = bmp280
X4 = bme680
```

### Built With

* [mqtt](https://github.com/mqttjs/MQTT.js)
* [serialport](https://github.com/serialport/node-serialport)

## Getting Started

### Prerequisites

* An Arduino with a CC1101 module as a receiver
* An Arduino with a CC1101 module as a transmitter
* A mqtt server

### Installation

```sh
git clone https://github.com/13/node-cc1101-receiver.git

npm install
```

## Usage

```sh
node run.js -p 'tty port'
            -m 'mqtt address'
            -t 'show timestamp'
            -v 'verbose'
            -d 'debug'
```
 
## Roadmap

- [ ] ...

## Release History

* 1.1.0
    * Fixes
    
* 1.0.0
    * Initial release

## Contact

* **13** - *Initial work* - [13](https://github.com/13)

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Thank you
