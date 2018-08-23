const path = require('path');
const myFS = require('./myModules/myFS/myFS');
const baseOperations = require('./myModules/baseOperations/baseOperations');

const deleteAnything = pathFor => {
    myFS.exists(pathFor)
        .then(baseOperations.scan)
        .then(baseOperations.remove)
        .catch(console.error);

};

const copyDirectory = (input, output) => {
    myFS.unexists(output) // Если не существует папка с таких же названием, как у той, которую хотим создать...
        .then(() => myFS.exists(input)) // ... и существует папка из которой копировать, только тогда продолжаем
        .then(baseOperations.scan)
        .then(baseOperations.copy(input, output))
        .catch(console.error);

};

const distribute = (input, output, isDeleteInput = false) => {

    myFS.unexists(output) // Если не существует папка с таких же названием, как у той, которую хотим создать...
        .then(() => myFS.exists(input)) // ... и существует папка из которой копировать, только тогда продолжаем
        .then(baseOperations.scan)
        .then(baseOperations.distribute(input, output))
        .then(({arrFiles, arrDirs}) => isDeleteInput && baseOperations.remove({arrFiles, arrDirs}))
        .catch(console.error);
};

let [,, operation, input, output, isDeleteInput] = process.argv;

if (!operation) return console.error(`Команда не распознана. Пожалуйста введите название операции "copy" или "distribute" или "delete" и передайте нужные параметры. operation ${operation}`);
if (!input) return console.error(`Не объявленны необходимые переменные! input: ${input}`);

switch (operation) {
    case 'copy':
        if (!output) return console.error(`Не объявленны необходимые переменные! output: ${output}`);
        copyDirectory(path.join(__dirname, input), path.join(__dirname, output));
        break;
    case 'distribute':
        if (!output) return console.error(`Не объявленны необходимые переменные! output: ${output}`);
        distribute(path.join(__dirname, input), path.join(__dirname, output), isDeleteInput);
        break;
    case 'delete':
        deleteAnything(path.join(__dirname, input));
        break;
    default:
        console.log('Команда не распознана. Пожалуйста введите название операции "copy" или "distribute" или "delete" и передайте нужные параметры');
}
