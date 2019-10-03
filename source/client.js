const url = 'ws://localhost:9030';

console.log('Started FSS Testing Client vesrion 0.0.1');

const ws = new WebSocket(url);

let messagesReceived = 0;
ws.onmessage = (event) => {
    messagesReceived += 1;
    console.log('A new message has been received');
    console.log('Session message count:', messagesReceived);
    console.log('Message data:', JSON.parse(event.data));
    console.log('\n');
}