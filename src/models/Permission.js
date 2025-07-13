const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class Permission extends Model {}

// Initialize Permission model
const initPermission = () => {
  const sequelize = getSequelize();
  
  Permission.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    permission_key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    permission_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    is_system_permission: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Permission',
    tableName: 'permissions'
  });

  return Permission;
};

// Define associations
const associatePermission = () => {
  const UserRole = require('./UserRole').UserRole;
  const RolePermission = require('./RolePermission').RolePermission;

  // Permission belongs to many roles through role_permissions
  Permission.belongsToMany(UserRole, {
    through: RolePermission,
    foreignKey: 'permission_id',
    otherKey: 'role_id',
    as: 'roles'
  });
};

module.exports = {
  Permission,
  initPermission,
  associatePermission
}; 