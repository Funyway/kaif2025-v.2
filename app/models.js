const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const User = sequelize.define('users_data', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: true
    },
    first_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    last_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    hash_password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    access_token: {
        type: DataTypes.STRING,
        allowNull: true
    },
    refresh_token: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is_blocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    one_time_token: {
        type: DataTypes.STRING,
        allowNull: true
    },
    one_time_token_expires: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

const Todo = sequelize.define('todos_data', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    text: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
            model: 'users_data',
            key: 'id'
        }
    }
});

Todo.belongsTo(User, { foreignKey: 'user_id', targetKey: 'id' });
User.hasMany(Todo, { foreignKey: 'user_id', sourceKey: 'id' });

module.exports = { sequelize, Todo, User };