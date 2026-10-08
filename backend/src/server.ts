"use strict";

import app from './app';
import sequelize from './config/database';



const PORT = Number(process.env.PORT) || 4000;

async function sartserver(){


}

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
