const { Todo, User } = require('../app/models');
const bcrypt = require('bcrypt');
const { v4 } = require('uuid');

const handleMessage = async (msg, bot, userStates) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const state = userStates[chatId];

    if (!state) return;

    const isAdmin = async (userId) => {
        const user = await User.findByPk(userId);
        if (!user) return false;
        return userId === process.env.ADMIN_CHAT_ID && await bcrypt.compare(process.env.ADMIN_PASSWORD, user.hash_password);
    };

    if (state.step === 'password') {
        state.password = text;
        bot.sendMessage(chatId, 'Подтвердите пароль:');
        state.step = 'confirm_password';
    } else if (state.step === 'confirm_password') {
        if (state.password === text) {
            try {
                const hash = await bcrypt.hash(text, 10);
                const oneTimeToken = v4();
                const username = msg.from.username || `user_${chatId}`;
                const user = await User.create({
                    id: chatId.toString(),
                    username: msg.from.username || null,
                    first_name: msg.from.first_name || null,
                    last_name: msg.from.last_name || null,
                    hash_password: hash,
                    one_time_token: oneTimeToken,
                    one_time_token_expires: new Date(Date.now() + 15 * 60 * 1000)
                });
                console.log('User created:', { id: user.id, username });
                bot.sendMessage(chatId, 'Вы успешно зарегистрированы!', {
                    reply_markup: JSON.stringify({
                        inline_keyboard: [[
                            { text: 'Сайт', url: `${process.env.APP_URL}/auto-login?oneTimeToken=${oneTimeToken}` }
                        ]]
                    })
                });
                delete userStates[chatId];
            } catch (err) {
                console.error('Error creating user:', err);
                bot.sendMessage(chatId, 'Ошибка при регистрации. Попробуйте снова с /start.');
                delete userStates[chatId];
            }
        } else {
            bot.sendMessage(chatId, 'Пароли не совпадают! Попробуйте еще раз с /start.');
            delete userStates[chatId];
        }
    } else if (state.step === 'add_todo') {
        try {
            const user = await User.findByPk(state.userId);
            if (!user) {
                bot.sendMessage(chatId, 'Пользователь не найден. Пожалуйста, зарегистрируйтесь с /start.');
                delete userStates[chatId];
                return;
            }
            await Todo.create({ text, user_id: state.userId });
            bot.sendMessage(chatId, 'Дело успешно добавлено!');
            delete userStates[chatId];
        } catch (err) {
            console.error('Error adding todo:', err);
            bot.sendMessage(chatId, 'Ошибка при добавлении дела.');
            delete userStates[chatId];
        }
    } else if (state.step === 'update_todo' && state.selectedTodo) {
        try {
            const canUpdate = (await isAdmin(state.userId)) || state.selectedTodo.user_id === state.userId;
            if (!canUpdate) {
                bot.sendMessage(chatId, 'У вас нет прав для редактирования этой задачи.');
                delete userStates[chatId];
                return;
            }
            await Todo.update({ text }, { where: { id: state.selectedTodo.id } });
            bot.sendMessage(chatId, `Дело "${state.selectedTodo.text}" успешно изменено на "${text}"!`);
            delete userStates[chatId];
        } catch (err) {
            console.error('Error updating todo:', err);
            bot.sendMessage(chatId, 'Ошибка при обновлении дела.');
            delete userStates[chatId];
        }
    }
};

module.exports = { handleMessage };