const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const pool = require('./db'); // Импортируем конфигурацию базы данных
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

// Middleware для разбора JSON и URL-encoded данных
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Настройка сервера для использования EJS шаблонов и статических файлов
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware для обработки мультипарт запросов с использованием Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Указываем папку, куда сохранять файлы
  },
  filename: function (req, file, cb) {
    // Генерируем уникальное имя для файла, сохраняем оригинальное расширение
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Обработчик POST запроса для загрузки изображений
app.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No files were uploaded.');
    }
    // В req.file содержится информация о загруженном файле
    console.log('Uploaded file:', req.file);

    // Возвращаем URL загруженного изображения для дальнейшего использования
    const imageUrl = `http://localhost:${port}/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('Error uploading file');
  }
});

// Middleware для обслуживания статических файлов из папки uploads
app.use('/uploads', express.static('uploads'));

// Пример пользователей для проверки логина и пароля (обычно используются базы данных)
const users = [
    { username: 'Admin', password: 'Artyom08' }
];

// GET-запрос для отображения формы регистрации
app.get('/register', (req, res) => {
    res.render('register', { errorMessage: null });
});

// POST-запрос для обработки данных регистрации
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Проверка наличия пользователя в списке
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        // Если пользователь найден, перенаправляем на страницу логов
        res.redirect('/logs');
    } else {
        // Если пользователь не найден, возвращаем к форме регистрации с сообщением об ошибке
        res.render('register', { errorMessage: 'Invalid username or password. Please try again.' });
    }
});

// POST-запрос для сохранения логов регистрации
app.post('/log-registration', async (req, res) => {
    const { id, email, name, given_name, family_name, picture } = req.body;
    console.log('Received registration log:', req.body);

    try {
        // Проверка существования записи
        const [rows] = await pool.query('SELECT * FROM registration_logs WHERE id = ?', [id]);

        if (rows.length > 0) {
            console.log('Registration log already exists in the database.');
            res.send('Registration log already exists');
            return;
        }

        // Вставка данных в таблицу
        await pool.query(
            'INSERT INTO registration_logs (id, email, name, given_name, family_name, picture) VALUES (?, ?, ?, ?, ?, ?)',
            [id, email, name, given_name, family_name, picture]
        );

        // Чтение текущего содержимого файла
        const filePath = path.join(__dirname, 'registrationLogs.txt');
        const content = await fs.readFile(filePath, 'utf-8');

        // Проверка наличия такого же лога в файле
        if (content.includes(JSON.stringify(req.body))) {
            console.log('Registration log already exists in the file.');
            res.send('Registration log already exists');
            return;
        }

        // Запись в файл registrationLogs.txt
        await fs.appendFile(filePath, JSON.stringify(req.body) + '\n');

        res.send('Registration log received');
    } catch (error) {
        console.error('Error saving registration log:', error);
        res.status(500).send('Server error');
    }
});

// GET-запрос для отображения логов регистрации пользователей
app.get('/logs', async (req, res) => {
    try {
        // Чтение логов из базы данных
        const [rows] = await pool.query('SELECT * FROM registration_logs');

        // Преобразование содержимого базы данных в массив пользователей
        const users = rows;

        // Отображение списка пользователей на странице логов
        res.render('logs', { users });
    } catch (error) {
        console.error('Error reading from database:', error);
        res.status(500).send('Error reading from database');
    }
});

// GET-запрос для получения данных из базы данных
app.get('/fetch-db', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM registration_logs');
        res.json({ users: rows });
    } catch (error) {
        console.error('Error fetching data from database:', error);
        res.status(500).send('Error fetching data from database');
    }
});

app.post('/save-payment-method', async (req, res) => {
    const { userId, paymentMethodId } = req.body;
  
    try {
      // Update the user record with the payment method ID
      await pool.query(
        'UPDATE registration_logs SET payment_methods = ? WHERE id = ?',
        [paymentMethodId, userId]
      );
      res.send('Payment method ID saved successfully');
    } catch (error) {
      console.error('Error saving payment method ID:', error);
      res.status(500).send('Server error');
    }
  });

  app.post('/create-post', async (req, res) => {
    const { text, image, likes, dislikes, author } = req.body;
  
    try {
      // Вставка данных в таблицу постов
      await pool.query(
        'INSERT INTO posts (text, image, likes, dislikes, author_name, author_email, author_picture) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [text, image, likes, dislikes, author.name, author.email, author.picture]
      );
  
      res.send('Post created successfully');
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).send('Server error');
    }
  });

  // Добавьте этот код в ваш файл сервера (например, server.js или app.js)

app.get('/posts', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM posts');
      res.json(rows);
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).send('Server error');
    }
  });

app.post('/posts/:postId/like', async (req, res) => {
  const { postId } = req.params;
  try {
    // Выполнение запроса к базе данных для обновления лайков
    await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId]);
    
    // Получение обновленного списка постов
    const updatedPosts = await pool.query('SELECT * FROM posts');
    res.json(updatedPosts);
  } catch (error) {
    console.error('Error updating likes:', error);
    res.status(500).send('Server error');
  }
});

// DELETE-запрос для удаления поста по ID
app.delete('/posts/:postId', async (req, res) => {
    const { postId } = req.params;

    try {
        // Удаление поста из базы данных
        await pool.query('DELETE FROM posts WHERE id = ?', [postId]);

        res.send('Post deleted successfully');
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).send('Server error');
    }
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});