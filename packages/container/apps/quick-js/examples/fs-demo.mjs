import { readFileSync } from 'node:fs';

const data = readFileSync('/examples/message.txt', 'utf8').trim();
console.log(`qjsx-node read: ${data}`);
