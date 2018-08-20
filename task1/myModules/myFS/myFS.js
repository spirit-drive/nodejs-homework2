const fs = require('fs');

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
    ascendingSort: (a, b) => b.length - a.length,

};

module.exports = myFS;