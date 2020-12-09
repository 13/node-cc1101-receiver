# node-cc1101-receiver

node serial arduino cc1101 parser and mqtt publisher

## Contents

 * [Installation](#installation)
 * [Usage](#usage)
 * [Todo](#todo)

## Getting Started

### Prerequisites

* An Arduino with a CC1101 module as a receiver
* An Arduino with a CC1101 module as a transmitter
* A mqtt server

### Installation

```bash
  git clone https://github.com/13/node-cc1101-receiver.git

  npm install
```

## Usage

```bash
  node run.js -p 'tty port'
              -m 'mqtt address'
              -t 'show timestamp'
```

## Synopsis

[(Back to top)](#contents)

The cc1101-sender emits a 61 characters string.
This script parses the cc1101 string, converts to int or float, generates a json and sends to mqtt.

```
M,N:87,T1:29,H1:817,T2:25,T3:42,P1:9260,A1:753,V1:38,E:00000
```

```
M = acknowledge character
N = node number
T = temperature
H = humidity
P = pressure
A = altitude
V = voltage
E = string filler until 60 chars

, = delimiter
```

## Release History

[(Back to top)](#contents)

* 1.0.0
    * Initial release
    
## TODO

[(Back to top)](#contents)

- [ ] ...

## Authors

[(Back to top)](#contents)

* **13** - *Initial work* - [13](https://github.com/13)

## License

[(Back to top)](#contents)

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

[(Back to top)](#contents)

* Thank you
