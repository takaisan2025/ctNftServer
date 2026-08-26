const {Pool} = require('pg');

// PostgreSQL数据库配置
const dbConfig = {
    user: 'postgres',
    host: '47.111.91.203',
    database: 'ct_exploder_pgsql_v3',
    password: 'sadsdfW4ghghjy4',
    port: 7432,
    // 连接池配置
    max: 20, // 最大连接数
    idleTimeoutMillis: 30000, // 连接空闲超时时间
    connectionTimeoutMillis: 2000, // 连接超时时间
};

// 创建数据库连接池
const pool = new Pool(dbConfig);

// 数据库操作类
class PostgreSQLDatabase {
    constructor() {
        this.pool = pool;
    }

    // 测试数据库连接
    async testConnection() {
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW()');
            client.release();
            console.log('数据库连接成功:', result.rows[0]);
            return true;
        } catch (error) {
            console.error('数据库连接失败:', error);
            return false;
        }
    }

    // 插入数据
    async insertData(tableName, data) {
        try {
            const columns = Object.keys(data);
            const values = Object.values(data);
            const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

            const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;

            const result = await this.pool.query(query, values);
            console.log('数据插入成功:', result.rows[0]);
            return result.rows[0];
        } catch (error) {
            console.error('数据插入失败:', error);
            throw error;
        }
    }

    // 批量插入数据
    async batchInsertData(tableName, dataArray) {
        try {
            if (dataArray.length === 0) {
                throw new Error('数据数组不能为空');
            }

            const columns = Object.keys(dataArray[0]);
            const values = dataArray.map(row => Object.values(row));

            const placeholders = values.map((_, rowIndex) => {
                return `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`;
            }).join(', ');

            const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES ${placeholders}
        RETURNING *
      `;

            const flatValues = values.flat();
            const result = await this.pool.query(query, flatValues);
            console.log(`批量插入成功，插入了 ${result.rows.length} 条记录`);
            return result.rows;
        } catch (error) {
            console.error('批量插入失败:', error);
            throw error;
        }
    }

    // 更新数据
    async updateData(tableName, updateData, whereCondition) {
        try {
            const updateColumns = Object.keys(updateData);
            const updateValues = Object.values(updateData);

            const whereColumns = Object.keys(whereCondition);
            const whereValues = Object.values(whereCondition);

            const setClause = updateColumns.map((col, index) => `${col} = $${index + 1}`).join(', ');
            const whereClause = whereColumns.map((col, index) => `${col} = $${updateValues.length + index + 1}`).join(' AND ');

            const query = `
        UPDATE ${tableName}
        SET ${setClause}
        WHERE ${whereClause}
        RETURNING *
      `;

            const allValues = [...updateValues, ...whereValues];
            const result = await this.pool.query(query, allValues);

            if (result.rows.length === 0) {
                console.log('没有找到匹配的记录进行更新');
                return null;
            }

            console.log('数据更新成功:', result.rows[0]);
            return result.rows[0];
        } catch (error) {
            console.error('数据更新失败:', error);
            throw error;
        }
    }

    // 查询数据
    async queryData(query, params = []) {
        try {
            const result = await this.pool.query(query, params);
            console.log(`查询成功，返回 ${result.rows.length} 条记录`);
            return result.rows;
        } catch (error) {
            console.error('查询失败:', error);
            throw error;
        }
    }

    // 删除数据
    async deleteData(tableName, whereCondition) {
        try {
            const whereColumns = Object.keys(whereCondition);
            const whereValues = Object.values(whereCondition);

            const whereClause = whereColumns.map((col, index) => `${col} = $${index + 1}`).join(' AND ');

            const query = `
        DELETE FROM ${tableName}
        WHERE ${whereClause}
        RETURNING *
      `;

            const result = await this.pool.query(query, whereValues);
            console.log(`删除成功，删除了 ${result.rows.length} 条记录`);
            return result.rows;
        } catch (error) {
            console.error('删除失败:', error);
            throw error;
        }
    }

    // 执行事务
    async executeTransaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // 关闭连接池
    async close() {
        await this.pool.end();
        console.log('数据库连接池已关闭');
    }
}

// 使用示例
async function example() {
    const db = new PostgreSQLDatabase();

    try {
        // 测试连接
        await db.testConnection();

        // 插入数据示例
        const insertData = {
            name: '测试用户',
            email: 'test@example.com',
            created_at: new Date()
        };
        const insertedRecord = await db.insertData('users', insertData);

        // 更新数据示例
        const updateData = {name: '更新后的用户名'};
        const whereCondition = {id: insertedRecord.id};
        const updatedRecord = await db.updateData('users', updateData, whereCondition);

        // 查询数据示例
        const users = await db.queryData('SELECT * FROM users WHERE name = $1', ['更新后的用户名']);

        // 批量插入示例
        const batchData = [
            {name: '用户1', email: 'user1@example.com', created_at: new Date()},
            {name: '用户2', email: 'user2@example.com', created_at: new Date()},
            {name: '用户3', email: 'user3@example.com', created_at: new Date()}
        ];
        const batchResult = await db.batchInsertData('users', batchData);

        // 事务示例
        await db.executeTransaction(async (client) => {
            await client.query('INSERT INTO users (name, email, created_at) VALUES ($1, $2, $3)',
                ['事务用户1', 'transaction1@example.com', new Date()]);
            await client.query('INSERT INTO users (name, email, created_at) VALUES ($1, $2, $3)',
                ['事务用户2', 'transaction2@example.com', new Date()]);
            return '事务执行成功';
        });

    } catch (error) {
        console.error('操作失败:', error);
    } finally {
        // 关闭连接池
        await db.close();
    }
}

// 导出数据库类
module.exports = {PostgreSQLDatabase};
