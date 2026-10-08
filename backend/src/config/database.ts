
"use strict";

import {Sequelize} from "sequelize";
import 'dotenv/config';

const sequelize = new Sequelize({

    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT)||5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    logging: false, 
});

export default sequelize;

