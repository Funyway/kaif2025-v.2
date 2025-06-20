const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const { User } = require('./models');
const app = express();
const cookieParser = require('cookie-parser');
const {todoController, userController} = require('./controllers');
const sequelize = require('./db');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    const token = req.cookies.accessToken;
    if (token) {
        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.error('Invalid or expired token:', err.message);
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
        }
    }
    next();
};

const blockCheckMiddleware = async (req, res, next) => {
    if (req.user) {
        try {
            const user = await User.findByPk(req.user.id);
            if (user && user.is_blocked) {
                res.clearCookie('accessToken');
                res.clearCookie('refreshToken');
                return res.status(403).render('login', { error: 'Ваш аккаунт заблокирован' });
            }
        } catch (err) {
            console.error('Error checking block status:', err);
            return res.status(500).send('Internal Server Error');
        }
    }
    next();
};

const apiRouter = express.Router();
apiRouter.get('/todos', todoController.getTodosHandle);
apiRouter.post('/todos', todoController.addTodoHandle);
apiRouter.put('/todos/:id', todoController.updateTodoHandler);
apiRouter.delete('/todos/:id', todoController.deleteTodoHandler);
apiRouter.post('/login', userController.loginHandle);

const webRouter = express.Router();
webRouter.get('/', (req, res) => {
    if (req.user) {
        todoController.renderHome(req, res);
    } else {
        res.render('login', { error: null });
    }
});
webRouter.get('/register', userController.registerRedirect);
webRouter.get('/auto-login', userController.autoLoginHandle);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public/html'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(authMiddleware);
app.use(blockCheckMiddleware);

app.use('/api', apiRouter);
app.use('/', webRouter);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Internal Server Error');
});

const start = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection established');

        await sequelize.sync({ force: false });
        console.log('Database synced');

        app.listen(3000, () => console.log('Server started on port 3000'));
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

start();