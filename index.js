const fs = require('fs');
const path = require('path');

const checkDirOnExist = pathForDir => {if (!fs.existsSync(pathForDir)) console.error(`исходная папка: ${pathForDir} не найдена`);return true};
const deleteExistDir = pathForDir => {if (fs.existsSync(pathForDir)) deleteAnything(pathForDir)};

const myFS = {
    stat: input => new Promise(((resolve, reject) => {
        fs.stat(input, (err, stats) => {
            if (err) return reject(err);
            resolve(stats);
        })
    })),

    exists: pathFor => new Promise((resolve, reject) => {
        fs.exists(pathFor, exists => exists ? resolve(pathFor) : reject(`директории ${pathFor} не существует`));
    }),

    readdir: pathFor => new Promise((resolve, reject) => {
        fs.readdir(pathFor, (err, files) => {
            err && reject(err);
            resolve({files, pathFor})
        });
    }),

    unlink: pathFor => new Promise((resolve, reject) => {
        fs.unlink(pathFor, err => {
            err && reject(err);
            console.log(`файл ${pathFor} успешно удален`);
            resolve();
        });
    }),

    rmdir: pathFor => new Promise((resolve, reject) => {
        fs.rmdir(pathFor, err => {
            err && reject(err);
            console.log(`директория ${pathFor} успешно удалена`);
            resolve();
        });
    }),

    // сортирует по длинне. По логике самые глубокие директории, которые надо удалить, имеют самый длинный путь к файлу
    sortPathForDir: (a, b) => a.length < b.length ?
        1 :
        a.length > b.length ?
            -1 :
            0,

};

const bigOperations = {
    read (pathFor) {
        // Только сохраняет пути до всех файлов отдельно и папок отдельно

        return new Promise((resolve, reject) => {

            const arrFiles = [];
            const arrDirs = [];

            // Функция завершения, уменьшает счетчик, когда счетчик будет равен 0, значит все функции чтения завершены,
            // все пути записаны в массивы и можно эти пути передать дальше
            const endRead = ({arrFiles, arrDirs}) => !--count && resolve({arrFiles, arrDirs: arrDirs.sort(myFS.sortPathForDir)});

            let count = 0;

            // Первоначальная проверка, файл или папка?
            myFS.stat(pathFor)

                .then(stats => {

                    // Если директория, то добавляем путь до нее в массив директорий и выполняем следующие действия
                    if (stats.isDirectory()) {
                        arrDirs.push(pathFor);

                        (function readInside (pathFor) {

                            ++count; // Увеличиваем счетчик
                            myFS.readdir(pathFor)
                                .then(({files, pathFor}) => {

                                    // Если папка не пуста
                                    files.length ?
                                        // Дежим по ним и записываем в соответствующие массивы пути, прочитывая каждую папку
                                        files.forEach((file, i) => {
                                            let input = path.join(pathFor, file);

                                            myFS.stat(input)
                                                .then(stats => {
                                                    if (stats.isDirectory()) {
                                                        arrDirs.push(input);
                                                        readInside(input);
                                                    } else {
                                                        arrFiles.push(input);
                                                    }
                                                    // Когда дошли до последнего файла, вызываем функцию завершения
                                                    i === files.length - 1 && endRead({arrFiles, arrDirs});
                                                })
                                                .catch(reject);
                                        }) :
                                        // Если папка пуста
                                        endRead({arrFiles, arrDirs});

                                })
                                .catch(reject);

                        })(pathFor);

                    } else {
                        // Если указанный путь - файл, то добавляем его в массив путей к файлам и заверваем функцию
                        arrFiles.push(pathFor);
                        endRead({arrFiles, arrDirs})
                    }
                })
                .catch(reject);
        })
    },

    remove ({arrFiles, arrDirs}) {
        Promise
            .all(arrFiles.map(files => myFS.unlink(files))) // Вначале удаляем все файлы
            .then(() => {

                // Если есть массив папок (если удаляем файл, то и массива не будет)
                if (arrDirs.length) {
                    // После чего последовательно удаляем каждую папку, начиная с самой глубокой
                    let promisesDirs = myFS.rmdir(arrDirs[0]);
                    arrDirs.forEach((dir, i) => {if (i) promisesDirs = promisesDirs.then(() => myFS.rmdir(dir))});
                    return promisesDirs;
                }
            })
    },
};

const deleteAnything = pathFor => {
    myFS.exists(pathFor)
        .then(bigOperations.read)
        .then(bigOperations.remove)
        .catch(e => console.error(e));

};

const copyDirectory = (input, output) => {
    if (!checkDirOnExist(input)) return;
    deleteExistDir(output);

    (function copy(input, output) {
        fs.mkdirSync(output);
        fs.readdir(input, (err, files) => {

            if (err) return console.error('Ошибка чтения каталога');

            files.forEach(file => {
                let newInput = path.join(input, file);
                let newOutput = path.join(output, file);

                if (fs.statSync(newInput).isDirectory()) copy(newInput, newOutput);
                else fs.link(newInput, newOutput, err => console.log(err ? err : `файл ${file} успешно скопирован!`));

            })
        });
    })(input, output);
};

const distribute = (input, output, isDeleteInput = false) => {
    if (!checkDirOnExist(input)) return;
    deleteExistDir(output);

    fs.mkdirSync(output);
    console.log(`папка ${output} создана`);

    let count = 0; // 1. Создаем счетчик
    let readCount = () => !--count && isDeleteInput && deleteAnything(input);
    /* 4. Уменьшаем счетчик, как только он станет равен 0,
    значит была завершена посленяя функция чтения.
    И удаляем исходную папку, если это указано
     */

    (function read(input, output) {
        ++count; // 2. Счетчик увеличивается с рекурсией

        fs.readdir(input, (err, files) => {
            if (err) return console.error(`Ошибка чтения каталога: ${err}`);

            files.forEach(file => {
                let newInput = path.join(input, file);

                if (fs.statSync(newInput).isDirectory()) read(newInput, output);
                else {
                    let newOutput = path.join(output, file[0].toUpperCase());

                    if (!fs.existsSync(newOutput)) fs.mkdirSync(newOutput);
                    fs.linkSync(newInput, path.join(newOutput, file));
                    console.log(`файл ${file} успешно создан`);
                }

            });

            readCount(); // 3. Когда операции в директории завершены...
        })
    })(input, output);

};

// copyDirectory(path.join(__dirname, 'savedData'), path.join(__dirname, 'in'));
// distribute(path.join(__dirname, 'in'), path.join(__dirname, 'out'), false);
// deleteAnything(path.join(__dirname, 'out'));

let [operation, input, output, isDeleteInput] = process.argv.slice(2);

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
