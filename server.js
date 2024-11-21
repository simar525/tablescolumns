const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 3000;

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

app.get('/api/tables', async (req, res) => {
  const { instance } = req.query;
  if (!instance) {
    return res.status(400).json({ error: 'Database instance is required' });
  }

  try {
    const connection = await mysql.createConnection({ ...dbConfig, database: instance });
    const [tables] = await connection.query('SHOW TABLES');
    const tablesData = await Promise.all(
      tables.map(async (table) => {
        const tableName = table[`Tables_in_${instance}`];
        const [columns] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
        return { name: tableName, columns: columns.map(col => col.Field) };
      })
    );
    await connection.end();
    res.json(tablesData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tables', async (req, res) => {
  const { instance, tableName, columns } = req.body;
  if (!instance || !tableName || !columns) {
    return res.status(400).json({ error: 'Instance, table name, and columns are required' });
  }

  try {
    const connection = await mysql.createConnection({ ...dbConfig, database: instance });
    const columnDefinitions = columns.map(col => `${col} VARCHAR(255)`).join(', ');
    await connection.query(`CREATE TABLE ${tableName} (id INT AUTO_INCREMENT PRIMARY KEY, ${columnDefinitions})`);
    await connection.end();
    res.json({ message: 'Table created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tables/:tableName', async (req, res) => {
  const { instance } = req.query;
  const { tableName } = req.params;
  if (!instance || !tableName) {
    return res.status(400).json({ error: 'Instance and table name are required' });
  }

  try {
    const connection = await mysql.createConnection({ ...dbConfig, database: instance });
    await connection.query(`DROP TABLE ${tableName}`);
    await connection.end();
    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/columns', async (req, res) => {
  const { instance, tableName, columnName } = req.body;
  if (!instance || !tableName || !columnName) {
    return res.status(400).json({ error: 'Instance, table name, and column name are required' });
  }

  try {
    const connection = await mysql.createConnection({ ...dbConfig, database: instance });
    await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} VARCHAR(255)`);
    await connection.end();
    res.json({ message: 'Column added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/columns', async (req, res) => {
  const { instance, tableName, columnName } = req.body;
  if (!instance || !tableName || !columnName) {
    return res.status(400).json({ error: 'Instance, table name, and column name are required' });
  }

  try {
    const connection = await mysql.createConnection({ ...dbConfig, database: instance });
    await connection.query(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
    await connection.end();
    res.json({ message: 'Column deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
