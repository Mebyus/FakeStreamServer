const ws = require('ws');
const port = 8080;
const delay = 3000;

console.log('Started FSS version 0.0.1');
console.log('Port:', port);
console.log('Message delay:', delay);

const wss = new ws.Server({
    port: port,
    perMessageDeflate: {
        zlibDeflateOptions: {
            // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        serverMaxWindowBits: 10, // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10, // Limits zlib concurrency for perf.
        threshold: 1024 // Size (in bytes) below which messages
        // should not be compressed.
    }
});

function workerTypeName(value) {
    let name = '';
    switch (value) {
        case 0:
            name = 'Abstract';
            break;
        case 1:
            name = 'Adapter';
            break;
        case 2:
            name = 'Receiver';
            break;
        case 3:
            name = 'Saver';
            break;
        default:
            name = 'Unknown';
    }
    return name;
}

function messageTypeName(value) {
    let name = '';
    switch (value) {
        case 0:
            name = 'Error';
            break;
        case 1:
            name = 'SendMSG';
            break;
        case 2:
            name = 'ReceiveMSG';
            break;
        case 3:
            name = 'ChangeState';
            break;
        default:
            name = 'Unknown';
    }
    return name;
}

function randInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

class WorkerType {
    constructor(value) {
        this.value = value;
        this.name = workerTypeName(value);
    }
}

class Worker {
    constructor(id, type) {
        this.id = id;
        this.type = type;
    }
}

class Workgroup {
    constructor(id, maxWorkers) {
        this.id = id;
        this.maxWorkers = maxWorkers;
        this.activeWorkers = 0;
        this.workerPool = [];
    }

    init() {
        let adapterId = this.id + '-' + randInt(0, 10);
        let receiverId = this.id + '-' + randInt(10, 20);
        let saverId = this.id + '-' + randInt(20, 30);
        
        let adapter = new Worker(adapterId, new WorkerType(1));
        let receiver = new Worker(receiverId, new WorkerType(2));
        let saver = new Worker(saverId, new WorkerType(3));
        
        this.workerPool.push(adapter);
        this.workerPool.push(receiver);
        this.workerPool.push(saver);

        this.activeWorkers = randInt(0, this.maxWorkers + 1) + 3;
        for (let i = 3; i < this.activeWorkers; i++) {
            let abstractId = this.id + '-' + randInt(i * 10, (i + 1) * 10);
            let abstractWorker = new Worker(abstractId, new WorkerType(0));
            this.workerPool.push(abstractWorker);
        }
    }
}

class FakeStream {
    constructor(maxGroups, maxWorkers) {
        this.maxGroups = maxGroups;
        this.groupPool = [];
    }

    init () {
        
    }
}

wss.on('connection', function connection(socket) {
    console.log('Connection established');

    let messagesSent = 0;

    setInterval(() => {
        socket.send('something');
        messagesSent += 1;
        console.log('A new message has been sent');
        console.log('Session message count:', messagesSent);
    }, delay);
});