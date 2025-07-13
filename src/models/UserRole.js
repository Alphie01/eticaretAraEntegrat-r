const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class UserRole extends Model {}

// Initialize UserRole model
const initUserRole = () => {
  const sequelize = getSequelize();
  
  UserRole.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    role_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    role_display_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    is_system_role: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'UserRole',
    tableName: 'user_roles'
  });

  return UserRole;
};

// Define associations
const associateUserRole = () => {
  const User = require('./User').User;
  const Permission = require('./Permission').Permission;
  const RolePermission = require('./RolePermission').RolePermission;

  // Role has many users
  UserRole.hasMany(User, { 
    foreignKey: 'role_id', 
    as: 'users' 
  });

  // Role has many permissions through role_permissions
  UserRole.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: 'role_id',
    otherKey: 'permission_id',
    as: 'permissions'
  });
};

module.exports = {
  UserRole,
  initUserRole,
  associateUserRole
}; 