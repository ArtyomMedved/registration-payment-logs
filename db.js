// db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    port: 8889, // Порт по умолчанию для MySQL в MAMP
    user: 'root', // Имя пользователя по умолчанию для MySQL в MAMP
    password: 'root', // Пароль по умолчанию для MySQL в MAMP
    database: 'user' // Убедитесь, что это правильное имя базы данных
});

pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to the database.');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
    });

module.exports = pool;