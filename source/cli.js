const prefix = '-';

let command = null;
let list = [];

process.argv.slice(2).forEach(element => {
    if (element.startsWith(prefix)) {
        if (command) {
            list.push({
                command: command,
                argument: null,
            });
        }
        command = element.slice(prefix.length);
    } else if (command) {
        list.push({
            command: command,
            argument: element,
        });
        command = null;
    }
});
if (command) {
    list.push({
        command: command,
        argument: null,
    })
}

console.log(list);

let settings = {
    port: 9030,
    verbose: false,
};

list.forEach(commandSet => {
    switch (commandSet.command) {
        case 'p':
            let _dirty_port = parseInt(commandSet.argument);
            settings.port = _dirty_port || settings.port;
            break;
        case 'v':
            settings.verbose = true;
        default:
            //
    }
});

console.log(settings);