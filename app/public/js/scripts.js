document.addEventListener('DOMContentLoaded', () => {
    const addTodoForm = document.getElementById('addTodoForm');
    const todoTextInput = document.getElementById('todoText');
    const editModal = document.getElementById('editModal');
    const editTextInput = document.getElementById('editText');
    const editForm = document.getElementById('editForm');
    const cancelEdit = document.getElementById('cancelEdit');
    const todoList = document.getElementById('todoList').querySelector('tbody');

    const accessFromCookie = document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1];

    const api = axios.create({
        baseURL: '/api',
        headers: {
            'Authorization': `Bearer ${accessFromCookie}`
        }
    });

    const userDataElement = document.getElementById('userData');
    if (!userDataElement) {
        return;
    }
    const userData = JSON.parse(userDataElement.textContent);
    const userId = userData.id;
    const isAdmin = userData.isAdmin;

    let currentTodoId;

    const updateTodoTable = (todos) => {
        todoList.innerHTML = todos
            .filter(todo => !todo.users_datum?.is_blocked)
            .map(todo => `
                <tr data-id="${todo.id}">
                    <td>${todo.id}</td>
                    <td>
                        <span class="todo-text">${todo.text}</span>
                        ${userId === todo.user_id || isAdmin ? `
                            <button class="delete-button" data-id="${todo.id}">Удалить</button>
                            <button class="edit-button" data-id="${todo.id}" data-text="${todo.text}">Изменить</button>
                        ` : ''}
                    </td>
                    <td>${todo.users_datum ? todo.users_datum.username : 'Неизвестно'}</td>
                </tr>
            `).join('');
        addEventListeners();
    };

    const fetchTodos = () => {
        api.get('/todos')
            .then(response => updateTodoTable(response.data))
            .catch(err => console.error(err));
    };

    const addEventListeners = () => {
        const editButtons = document.querySelectorAll('.edit-button');
        editButtons.forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                const text = button.getAttribute('data-text');
                showEditModal(id, text);
            });
        });

        const deleteButtons = document.querySelectorAll('.delete-button');
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                api.delete(`/todos/${id}`)
                    .then(() => fetchTodos())
                    .catch(err => console.error(err));
            });
        });
    };

    addTodoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = todoTextInput.value.trim();
        if (text) {
            api.post('/todos', { text })
                .then(() => {
                    todoTextInput.value = '';
                    fetchTodos();
                })
                .catch(err => {
                    console.error(err);
                    alert('Ошибка при добавлении задачи');
                });
        }
    });

    const showEditModal = (id, text) => {
        currentTodoId = id;
        editTextInput.value = text;
        editModal.style.display = 'block';
    };

    const hideEditModal = () => {
        editModal.style.display = 'none';
    };

    cancelEdit.addEventListener('click', hideEditModal);

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newText = editTextInput.value.trim();
        if (newText) {
            api.put(`/todos/${currentTodoId}`, { text: newText })
                .then(() => {
                    hideEditModal();
                    fetchTodos();
                })
                .catch(err => {
                    console.error(err);
                    alert('Ошибка при обновлении задачи');
                });
        }
    });

    fetchTodos();
});