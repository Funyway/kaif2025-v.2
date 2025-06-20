const { Todo, User } = require('../app/models');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

const handleCommand = async (msg, bot, userStates) => {
    const chatId = msg.chat.id;
    const command = msg.text;

    bot.setMyCommands([
        { command: '/start', description: 'Регистрация' },
        { command: '/add', description: 'Добавить дело' },
        { command: '/update', description: 'Изменить дело' },
        { command: '/delete', description: 'Удалить дело' }
    ]);

    const isAdmin = async (userId) => {
        const user = await User.findByPk(userId);
        if (!user) return false;
        return userId === process.env.ADMIN_CHAT_ID && await bcrypt.compare(process.env.ADMIN_PASSWORD, user.hash_password);
    };

    if (command === '/start') {
        if (await User.findOne({ where: { id: chatId.toString() } })) {
            bot.sendMessage(chatId, 'Вы уже зарегистрированы! Используйте команды для работы.');
            return;
        }
        userStates[chatId] = { step: 'password' };
        bot.sendMessage(chatId, 'Введите пароль:');
    } else if (command === '/add') {
        const user = await User.findOne({ where: { id: chatId.toString() } });
        if (!user || user.is_blocked) {
            bot.sendMessage(chatId, 'Вы не авторизованы или заблокированы! Зарегистрируйтесь с /start.');
            return;
        }
        userStates[chatId] = { step: 'add_todo', userId: user.id };
        bot.sendMessage(chatId, 'Введите текст дела:');
    } else if (command === '/update') {
        const user = await User.findOne({ where: { id: chatId.toString() } });
        if (!user || user.is_blocked) {
            bot.sendMessage(chatId, 'Вы не авторизованы или заблокированы!');
            return;
        }
        const todos = (await isAdmin(user.id))
            ? await Todo.findAll({ include: [{ model: User, attributes: ['username'] }] })
            : await Todo.findAll({ where: { user_id: user.id } });
        if (!todos.length) {
            bot.sendMessage(chatId, 'Нет дел для редактирования!');
            return;
        }
        userStates[chatId] = { step: 'update_todo', todos, page: 0, userId: user.id };
        showTodoButtons(chatId, todos, 0, user.id, bot, userStates);
    } else if (command === '/delete') {
        const user = await User.findOne({ where: { id: chatId.toString() } });
        if (!user || user.is_blocked) {
            bot.sendMessage(chatId, 'Вы не авторизованы или заблокированы!');
            return;
        }
        const todos = (await isAdmin(user.id))
            ? await Todo.findAll({ include: [{ model: User, attributes: ['username'] }] })
            : await Todo.findAll({ where: { user_id: user.id } });
        if (!todos.length) {
            bot.sendMessage(chatId, 'Нет дел для удаления!');
            return;
        }
        userStates[chatId] = { step: 'delete_todo', todos, page: 0, userId: user.id };
        showTodoButtons(chatId, todos, 0, user.id, bot, userStates);
    } else if (command === '/block') {
        const user = await User.findOne({ where: { id: chatId.toString() } });
        if (!user || !(await isAdmin(user.id))) {
            return;
        }
        const users = await User.findAll({
            attributes: ['id', 'username', 'is_blocked'],
            where: { id: { [Op.ne]: process.env.ADMIN_CHAT_ID } }
        });
        if (!users.length) {
            bot.sendMessage(chatId, 'Нет пользователей для управления!');
            return;
        }
        userStates[chatId] = { step: 'block_user', users, page: 0, userId: user.id };
        showUserButtons(chatId, users, 0, bot, userStates);
    }
};

const showTodoButtons = (chatId, todos, page, userId, bot, userStates, messageId = null) => {
    const perPage = 5;
    const start = page * perPage;
    const end = start + perPage;
    const paginatedTodos = todos.slice(start, end);

    const inline_keyboard = paginatedTodos.map(todo => [
        { text: `${todo.text} ${todo.User ? `(@${todo.User.username})` : ''}`, callback_data: `todo_${todo.id}` }
    ]);

    const navButtons = [];
    if (page > 0) navButtons.push({ text: '<', callback_data: 'prev' });
    if (end < todos.length) navButtons.push({ text: '>', callback_data: 'next' });
    if (navButtons.length) inline_keyboard.push(navButtons);

    const options = {
        reply_markup: {
            inline_keyboard
        }
    };

    const messageText =
        'Какое дело хотите ' +
        (userStates[chatId].step === 'update_todo' ? 'редактировать' : 'удалить') +
        '?';

    if (messageId) {
        bot.editMessageText(messageText, {
            chat_id: chatId,
            message_id: messageId,
            ...options
        });
    } else {
        bot.sendMessage(chatId, messageText, options);
    }
};

const showUserButtons = (chatId, users, page, bot, userStates, messageId = null) => {
    const perPage = 5;
    const start = page * perPage;
    const end = start + perPage;
    const paginatedUsers = users.slice(start, end);

    const inline_keyboard = paginatedUsers.map(user => [
        { text: `@${user.username} (${user.is_blocked ? 'Заблокирован' : 'Не заблокирован'})`, callback_data: `user_${user.id}` }
    ]);

    const navButtons = [];
    if (page > 0) navButtons.push({ text: '<', callback_data: 'prev' });
    if (end < users.length) navButtons.push({ text: '>', callback_data: 'next' });
    if (navButtons.length) inline_keyboard.push(navButtons);

    const options = {
        reply_markup: {
            inline_keyboard
        }
    };

    const messageText = 'Выберите пользователя для блокировки/разблокировки:';

    if (messageId) {
        bot.editMessageText(messageText, {
            chat_id: chatId,
            message_id: messageId,
            ...options
        });
    } else {
        bot.sendMessage(chatId, messageText, options);
    }
};

module.exports = { handleCommand, showTodoButtons, showUserButtons };