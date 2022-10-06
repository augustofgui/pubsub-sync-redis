const Sequelize = require("sequelize");

const sequelize = new Sequelize(
  "postgres://postgres:postgres@35.198.56.215:5432/tpsd",
  {
    dialect: "postgres",
  }
);

module.exports = sequelize;
