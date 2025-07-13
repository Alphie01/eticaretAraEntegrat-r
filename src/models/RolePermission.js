const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../config/database');

class RolePermission extends Model {}

// Initialize RolePermission model
const initRolePermission = () => {
  const sequelize = getSequelize();
  
  RolePermission.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'user_roles',
        key: 'id'
      }
    },
    permission_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'permissions',
        key: 'id'
      }
    },
    granted: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'RolePermission',
    tableName: 'role_permissions',
    indexes: [
      {
        unique: true,
        fields: ['role_id', 'permission_id']
      }
    ]
  });

  return RolePermission;
};

// Define associations
const associateRolePermission = () => {
  const UserRole = require('./UserRole').UserRole;
  const Permission = require('./Permission').Permission;

  // RolePermission belongs to UserRole
  RolePermission.belongsTo(UserRole, { 
    foreignKey: 'role_id', 
    as: 'role' 
  });

  // RolePermission belongs to Permission
  RolePermission.belongsTo(Permission, { 
    foreignKey: 'permission_id', 
    as: 'permission' 
  });
};

module.exports = {
  RolePermission,
  initRolePermission,
  associateRolePermission
}; 