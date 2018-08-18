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

    unexists: pathFor => new Promise((resolve, reject) => {
        fs.exists(pathFor, exists => exists ? reject(`директория ${pathFor} уже существует`) : resolve(pathFor));
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

    link: (pathFor, newPath) => new Promise((resolve, reject) => {
        fs.link(pathFor, newPath, err => {
            err && reject(err);
            console.log(`файл ${pathFor} успешно скопирован`);
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

    mkdir: pathFor => new Promise((resolve, reject) => {
        fs.mkdir(pathFor, err => {
            err && reject(err);
            console.log(`директория ${pathFor} успешно создана`);
            resolve();
        });
    }),

    // сортирует по длинне. По логике самые глубокие директории, которые надо удалить, имеют самый длинный путь к файлу
    ascendingSort: (a, b) => a.length < b.length ?
        1 :
        a.length > b.length ?
            -1 :
            0,

};

const bigOperations = {
    scan (pathFor) {

        // Только сохраняет пути до всех файлов отдельно и папок отдельно

        return new Promise((resolve, reject) => {

            const arrFiles = [];
            const arrDirs = [];

            // Функция завершения, уменьшает счетчик, когда счетчик будет равен 0, значит все функции чтения завершены,
            // все пути записаны в массивы и можно эти пути передать дальше
            const endRead = ({arrFiles, arrDirs}) => !--count && resolve({arrFiles, arrDirs});

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

                // Если есть массив папок (если удаляем только файл, то и массива папок не будет)
                if (arrDirs.length) {

                    // сортирует по длинне. По логике самые глубокие директории, которые надо удалить, имеют самый длинный путь к файлу
                    arrDirs = arrDirs.sort(myFS.ascendingSort);

                    // После чего последовательно удаляем каждую папку, начиная с самой глубокой
                    let promisesDirs = myFS.rmdir(arrDirs[0]);
                    arrDirs.forEach((dir, i) => {if (i) promisesDirs = promisesDirs.then(() => myFS.rmdir(dir))});
                    return promisesDirs;
                }
            })
    },

    copy (input, output) {
        return ({arrFiles, arrDirs}) => {

            // Если есть массив папок (если копируем только файл, то и массива папок не будет)
            if (arrDirs.length) {

                // Создаем новые пути для файлов
                let newFiles = arrFiles.map(file => file.replace(input, output));

                // Заменяем все пути папок на новые
                arrDirs = arrDirs.map(dir => dir.replace(input, output)).sort(myFS.ascendingSort).reverse();

                // После чего последовательно удаляем каждую папку, начиная с самой глубокой
                let promisesDirs = myFS.mkdir(arrDirs[0]);
                arrDirs.forEach((dir, i) => {if (i) promisesDirs = promisesDirs.then(() => myFS.mkdir(dir))});

                // Когда все папки созданы, копируем все файлы, уже не важно в каком порядке
                return promisesDirs.then(() => Promise.all(arrFiles.map((files, i) => myFS.link(files, newFiles[i]))))
            }

        }
    },

    distribute(input, output) {
        return ({arrFiles}) => {

            let namesFiles = arrFiles.map(file => file.split(path.sep).slice(-1)[0]);

            let arrDirs = [...new Set(arrFiles.map((_, i) => path.join(output, namesFiles[i].charAt(0).toUpperCase())))].sort();

            let fullNamesFiles = namesFiles.map(name => {
                let firstLetter = name.charAt(0).toUpperCase();
                let fullName;
                arrDirs.forEach(dirPath => {
                    if (firstLetter === dirPath.slice(-1)) fullName = path.join(dirPath, name);
                });
                return fullName;
            });

            myFS.mkdir(output)
                .then(Promise.all(arrDirs.map(dir => myFS.mkdir(dir))))
                .then(Promise.all(arrFiles.map((file, i) => myFS.link(file, fullNamesFiles[i]))))
                .catch(e => console.error(e));
        }
    }
};

const deleteAnything = pathFor => {
    myFS.exists(pathFor)
        .then(bigOperations.scan)
        .then(bigOperations.remove)
        .catch(e => console.error(e));

};

const copyDirectory = (input, output) => {
    myFS.unexists(output) // Если не существует папка с таких же названием, как у той, которую ходтим создать
        .then(() => myFS.exists(input)) // И существует папки из которой копировать
        .then(bigOperations.scan)
        .then(bigOperations.copy(input, output))
        .catch(e => console.error(e));

};

const distribute = (input, output, isDeleteInput = false) => {

    // Доделать опциональное удаление исходной папки!

    myFS.unexists(output) // Если не существует папка с таких же названием, как у той, которую ходтим создать
        .then(() => myFS.exists(input)) // И существует папки из которой копировать
        .then(bigOperations.scan)
        .then(bigOperations.distribute(input, output))
        .catch(e => console.error(e));
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
