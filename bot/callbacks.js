const { Todo, User } = require('../app/models');
const bcrypt = require('bcrypt');
const { showTodoButtons, showUserButtons } = require('./commands');

const handleCallback = async (callbackQuery, bot, userStates) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;
    const state = userStates[chatId];

    if (!state) return;

    const isAdmin = async (userId) => {
        const user = await User.findByPk(userId);
        if (!user) return false;
        return userId === process.env.ADMIN_CHAT_ID && await bcrypt.compare(process.env.ADMIN_PASSWORD, user.hash_password);
    };

    if (data === 'prev' || data === 'next') {
        const page = data === 'prev' ? state.page - 1 : state.page + 1;
        state.page = page;
        if (state.step === 'block_user') {
            showUserButtons(chatId, state.users, page, bot, userStates, messageId);
        } else {
            showTodoButtons(chatId, state.todos, page, state.userId, bot, userStates, messageId);
        }
        bot.answerCallbackQuery(callbackQuery.id);
        return;
    }

    if (data.startsWith('todo_')) {
        const todoId = parseInt(data.split('_')[1]);
        const todo = state.todos.find(t => t.id === todoId);
        if (!todo) {
            bot.answerCallbackQuery(callbackQuery.id, { text: 'Задача не найдена' });
            return;
        }

        if (state.step === 'update_todo') {
            state.selectedTodo = todo;
            bot.sendMessage(chatId, `Введите новый текст для дела "${todo.text}":`);
            bot.answerCallbackQuery(callbackQuery.id);
        } else if (state.step === 'delete_todo') {
            const canDelete = (await isAdmin(state.userId)) || todo.user_id === state.userId;
            if (!canDelete) {
                bot.answerCallbackQuery(callbackQuery.id, { text: 'У вас нет прав для удаления этой задачи' });
                return;
            }
            await Todo.destroy({ where: { id: todoId } });
            bot.sendMessage(chatId, `Дело "${todo.text}" удалено!`);
            delete userStates[chatId];
            bot.deleteMessage(chatId, messageId);
            bot.answerCallbackQuery(callbackQuery.id);
        }
    } else if (data.startsWith('user_')) {
        if (state.step !== 'block_user' || !(await isAdmin(state.userId))) {
            bot.answerCallbackQuery(callbackQuery.id, { text: 'У вас нет прав для этой операции' });
            return;
        }
        const userId = data.split('_')[1];
        const user = state.users.find(u => u.id === userId);
        if (!user) {
            bot.answerCallbackQuery(callbackQuery.id, { text: 'Пользователь не найден' });
            return;
        }
        const newStatus = !user.is_blocked;
        await User.update({ is_blocked: newStatus }, { where: { id: userId } });
        bot.sendMessage(chatId, `Пользователь @${user.username} успешно ${newStatus ? 'заблокирован' : 'разблокирован'}!`);
        delete userStates[chatId];
        bot.deleteMessage(chatId, messageId);
        bot.answerCallbackQuery(callbackQuery.id);
    }
};

module.exports = { handleCallback };