"use strict";

import app from './app';
import sequelize from './config/database';

const PORT = Number(process.env.PORT) ;

async function sartserver(){

    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } 
    catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

sartserver();
