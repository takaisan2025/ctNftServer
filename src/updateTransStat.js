import {PostgreSQLDatabase} from './pgDatabase.js';

console.log('=== 开始执行 updateTransStat.js ===');
console.log('时间:', new Date().toISOString());

const db = new PostgreSQLDatabase();
console.log('数据库连接已初始化');

// // 插入数据
// const newUser = await db.insertData('transaction_stats', {
//   name: '张三',
//   email: 'zhangsan@example.com',
//   created_at: new Date()
// });

// // 更新数据
// await db.updateData('transaction_stats',
//   { name: '李四' },
//   { id: newUser.id }
// );

// 获取当前时间的前一天日期
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0]; // 格式化为 YYYY-MM-DD

console.log('计算的前一天日期:', yesterdayStr);
console.log('原始日期对象:', yesterday);

// 查询数据
console.log('开始查询数据库，查询条件:', {date: yesterdayStr});
const stats = await db.queryData('SELECT * FROM transaction_stats WHERE date = $1', [yesterdayStr]);
console.log('数据库查询完成，结果数量:', stats ? stats.length : 0);
// 2-15万之间吧
if (stats && stats.length > 0) {
    console.log('找到匹配的记录，详细信息:', JSON.stringify(stats[0], null, 2));

    let number_of_transactions = stats[0].number_of_transactions;
    console.log('当前交易数量:', number_of_transactions);
    console.log('判断条件: number_of_transactions < 20000');

    if (number_of_transactions < 20000) {
        console.log('条件满足，需要更新数据');
        //      在这里执行更新
        const value = Math.floor(Math.random() * (150000 - 20000 + 1)) + 20000;
        console.log(`将更新的值: ${value}`);
        console.log(`更新范围: 20000 - 150000`);
        console.log(`随机生成逻辑: Math.floor(Math.random() * (150000 - 20000 + 1)) + 20000`);
        await db.updateData("transaction_stats", {number_of_transactions: value}, {date: yesterdayStr})
    } else {
        console.log('条件不满足，当前交易数量 >= 20000，无需更新');
    }
} else {
    console.log('未找到匹配的记录，可能的原因:');
    console.log('- 数据库中不存在该日期的记录');
    console.log('- 日期格式不匹配');
    console.log('- 数据库连接问题');
    console.log('查询的SQL:', 'SELECT * FROM transaction_stats WHERE date = $1');
    console.log('查询参数:', [yesterdayStr]);
}

console.log('=== updateTransStat.js 执行完成 ===');
console.log('结束时间:', new Date().toISOString());
