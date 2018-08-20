const path = require('path');
const myFS = require('../myFS/myFS');

const baseOperations = {
    scan (pathFor) {

        // Только сохраняет пути до всех файлов отдельно и папок отдельно
        return new Promise((resolve, reject) => {

            const arrFiles = [];
            const arrDirs = [];

            // Функция завершения, уменьшает счетчик, когда счетчик будет равен 0, значит все функции чтения завершены,
            // все пути записаны в массивы и можно эти пути передать дальше
            const endRead = () => !--count && resolve({arrFiles, arrDirs});

            let count = 0; // Создаем счетчик

            // Первоначальная проверка, файл или папка?
            myFS.stat(pathFor)

                .then(stats => {

                    // Если директория, то добавляем путь до нее в массив директорий и выполняем следующие действия
                    if (stats.isDirectory()) {
                        arrDirs.push(pathFor);

                        // Самовызывающаяся рекурсивная функция
                        (function readInside (pathFor) {

                            ++count; // Увеличиваем счетчик
                            myFS.readdir(pathFor)
                                .then(({files, pathFor}) => {

                                    // Если папка не пуста
                                    files.length ?
                                        // Бежим по файлам и записываем в соответствующие массивы пути, прочитывая каждую папку
                                        files.forEach((file, i) => {
                                            let input = path.join(pathFor, file);

                                            myFS.stat(input)
                                                .then(stats => {
                                                    if (stats.isDirectory()) {
                                                        arrDirs.push(input);
                                                        readInside(input); // читаем папку
                                                    } else {
                                                        arrFiles.push(input);
                                                    }
                                                    // Когда дошли до последнего файла, вызываем функцию завершения
                                                    i === files.length - 1 && endRead();
                                                })
                                                .catch(reject);
                                        }) :
                                        // Если папка пуста
                                        endRead();

                                })
                                .catch(reject);

                        })(pathFor);

                    } else {
                        // Если указанный путь - файл, то добавляем его в массив путей к файлам и заверваем функцию
                        arrFiles.push(pathFor);
                        endRead()
                    }
                })
                .catch(reject);
        })
    },

    remove ({arrFiles, arrDirs}) {
        return new Promise((resolve, reject) => {
            Promise
                .all(arrFiles.map(files => myFS.unlink(files))) // Вначале удаляем все файлы
                .then(() => {

                    // Если есть массив папок (если удаляем только файл, то и массива папок не будет)
                    if (arrDirs.length) {

                        // сортирует по длинне. По логике самые глубокие директории, которые надо удалить, имеют самый длинный путь к файлу
                        let _arrDirs = [...arrDirs].sort(myFS.ascendingSort);

                        // После чего последовательно удаляем каждую папку, начиная с самой глубокой
                        let promisesDirs = myFS.rmdir(_arrDirs[0]);
                        for (let i = 1; i < _arrDirs.length; ++i) promisesDirs = promisesDirs.then(() => myFS.rmdir(_arrDirs[i]))
                        promisesDirs
                            .then(() => resolve({arrFiles, arrDirs}))
                            .catch(reject)
                    }
                })
        });
    },

    copy (input, output) {
        return ({arrFiles, arrDirs}) => new Promise((resolve, reject) => {

            // Создаем новые пути для файлов, заменяя старые на новые
            let newFiles = arrFiles.map(file => file.replace(input, output));

            // Заменяем все пути папок на новые и сортируем так, чтобы первой в массиве была папка, в которой содержатся все остальные папки и файлы
            let _arrDirs = arrDirs.map(dir => dir.replace(input, output)).sort(myFS.ascendingSort).reverse();

            // Последовательно создаем каждую папку, начиная с корневой
            let promisesDirs = myFS.mkdir(_arrDirs[0]);
            for (let i = 1; i < _arrDirs.length; ++i) promisesDirs = promisesDirs.then(() => myFS.mkdir(_arrDirs[i]))

            // Когда все папки созданы, копируем все файлы, уже не важно в каком порядке
            promisesDirs
                .then(() => Promise.all(arrFiles.map((files, i) => myFS.link(files, newFiles[i]))))
                .then(() => resolve({arrFiles, arrDirs}))
                .catch(reject)

        });
    },

    distribute(input, output) {
        return ({arrFiles, arrDirs}) => new Promise((resolve, reject) => {

            /* Разбиваем каждый путь к файлу по сепаратору: file.split(path.sep)
            И берем имя файла с помощью slice(-1) получаем массив имен файлов */
            let namesFiles = arrFiles.map(file => file.split(path.sep).slice(-1)[0]);

            // Записываем первые символы имен файлов
            let firstLetters = namesFiles.map(name => name.charAt(0).toUpperCase());

            /* Первый символ файла соединяем с названием папки, которую создаем
            и получаем массив путей новый папок: path.join(output, ...)
            Избавляемся от дубликатов: new Set(...)
            Превращаем Set в массив и сортируем его: [...*].sort() */
            let _arrDirs = [...new Set(arrFiles.map((_, i) => path.join(output, firstLetters[i])))].sort();

            // Сравниваем первый символ имени файла с названием папки: dirPath.slice(-1)
            // Если они совпадают, то файл должен лежать в этой папке, записываем полный путь к файлу: return path.join(dirPath, name)
            let fullNamesFiles = namesFiles.map((name, i) => {
                for (let dirPath of _arrDirs) if (firstLetters[i] === dirPath.slice(-1)) return path.join(dirPath, name);
            });

            myFS.mkdir(output) // Создаем корневую папку
                .then(() => Promise.all(_arrDirs.map(dir => myFS.mkdir(dir)))) // Все остальные папки, порядок не важен, потому что вложенность только первого уровня
                .then(() => Promise.all(arrFiles.map((file, i) => myFS.link(file, fullNamesFiles[i])))) // Копируем все файлы
                .then(() => resolve({arrFiles, arrDirs}))
                .catch(reject)

        });
    }
};

module.exports = baseOperations;
