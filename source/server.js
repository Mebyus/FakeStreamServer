const ws = require('ws');

const port = 9030;
let delay = 3000;
let skipProbability = 0.5;
let minWorkgroups = 2;
let maxWorkgroups = 5;
let minAbstractWorkers = 1;
let maxAbstractWorkers = 3;
let desiredMessageRate = 0.8;
let workgroupLengthId = 5;

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
/**
 * The maximum is exclusive and the minimum is inclusive
 * @param {*} min 
 * @param {*} max 
 */
function randInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
let charactersLength = characters.length;

function makeGroupId(length) {
    let result = '';

    for (let i = 0; i < length; i++) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

numberIdFormatter = new Intl.NumberFormat('en-US', {
    minimumIntegerDigits: 3,
});

class WorkerMessageType {
    constructor(value) {
        this.value = value;
        this.name = messageTypeName(value);
    }
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

    report() {
        console.log('        ' + this.id + '   ' + this.type.name);
    }

    generateMessage() {
        let typeValue = randInt(0, 4);
        
        let message = {
            body: 'empty',
            state: 'unknown',
            workerId: this.id,
            workerType: this.type,
            messageType: new WorkerMessageType(typeValue),
        };

        return message;
    }
}

class Workgroup {
    constructor(id, abstractWorkers) {
        this.id = id;
        this.activeWorkers = abstractWorkers + 3;
        this.workerPool = [];
    }

    init() {
        let adapterId = this.id + '-' + numberIdFormatter.format(randInt(0, 10));
        let receiverId = this.id + '-' + numberIdFormatter.format(randInt(10, 20));
        let saverId = this.id + '-' + numberIdFormatter.format(randInt(20, 30));
        
        let adapter = new Worker(adapterId, new WorkerType(1));
        let receiver = new Worker(receiverId, new WorkerType(2));
        let saver = new Worker(saverId, new WorkerType(3));
        
        this.workerPool.push(adapter);
        this.workerPool.push(receiver);
        this.workerPool.push(saver);

        for (let i = 3; i < this.activeWorkers; i++) {
            let abstractId = this.id + '-' + numberIdFormatter.format(randInt(i * 10, (i + 1) * 10));
            let abstractWorker = new Worker(abstractId, new WorkerType(0));
            this.workerPool.push(abstractWorker);
        }
    }

    report() {
        console.log('   Workgroup:', this.id);
        console.log('   Active workers:', this.activeWorkers);
        for (let i = 0; i < this.activeWorkers; i++) {
            this.workerPool[i].report();
        }
    }

    signMessage(message) {
        message.WGID = this.id;
    }

    generateMessage() {
        let worker = randInt(0, this.activeWorkers);
        let message = this.workerPool[worker].generateMessage();
        this.signMessage(message);
        return message;
    }
}

class FakeStream {
    constructor(groups) {
        this.groups = groups;
        this.groupPool = [];
    }

    init() {
        for (let i = 0; i < this.groups; i++) {
            let abstractWorkers = randInt(minAbstractWorkers, maxAbstractWorkers + 1);
            let newGroup = new Workgroup(makeGroupId(workgroupLengthId), abstractWorkers);
            newGroup.init();
            this.groupPool.push(newGroup);
        }

        this.report();
    }

    report() {
        console.log('Fake stream has been initialized')
        console.log('Number of workgroups:', this.groups);
        console.log();
        for (let i = 0; i < this.groups; i++) {
            this.groupPool[i].report();
            console.log();
        }
    }

    generateMessage() {
        let group = randInt(0, this.groups);
        return this.groupPool[group].generateMessage();
    }
}

let groups = randInt(minWorkgroups, maxWorkgroups + 1);
let fake = new FakeStream(groups);
fake.init();

function normalizeSkipProbability() {
    if (skipProbability > 0.9) {
        return 0.9;
    } else if (skipProbability < 0.0) {
        return 0.0;
    }
    return skipProbability;
}

let p = normalizeSkipProbability(skipProbability);

function calculateDelay() {
    if (delay > 5000) {
        delay = 5000;
    } else if (delay < 50) {
        delay = 50;
    }

    if (desiredMessageRate <= 0) {
        desiredMessageRate = 1000 * (1.0 - p) / delay;
        return delay;
    } else if (desiredMessageRate >= 20) {
        desiredMessageRate = 20;
    }

    return 1000 * (1.0 - p) / desiredMessageRate;
}

delay = calculateDelay();

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

console.log('Started FSS version 0.9.2');
console.log('Port:', port);
console.log('Message delay:', delay);
console.log('Skip probability:', p);
console.log('Average message rate:', desiredMessageRate);
console.log();

wss.on('connection', function connection(socket) {
    console.log('Connection established\n');

    let messagesSent = 0;
    let messagesSkipped = 0;

    setInterval(() => {
        if (Math.random() > p) {
            socket.send(JSON.stringify(fake.generateMessage()));
            messagesSent += 1;

            console.log('A new message has been sent');
            console.log('Message count:', messagesSent);
            console.log('Skipped messages:', messagesSkipped);
            console.log();
        } else {
            messagesSkipped += 1;
        }
    }, delay);
});