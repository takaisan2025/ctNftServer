## Project setup

#### 获取第三方依赖

```
npm install
```

#### 测试

```
npm run dev
```

#### 修改配置
```
数据库连接 src/config/db.js
1.数据库连接
2.数据库端口
3.数据库用户名
4.数据库密码
5.数据库编码
6.数据库名称
数据库连接 src/config/GlobalConfig.json
FEE_ACCOUNT : 手续费账户
```
> 推荐使用PM2来运行管理项目
#### 运行接口文件

```
bin/www/js
```

### 运行铸造定时

```
src/task/mintTask.js
```

### 运行转增定时

```
src/task/transTaskMaster.js
src/task/transTaskHashQuery.js
src/task/transTaskReCallMaster.js
```
---
## 其它
### 运行积分定时

```
src/task/DreamSCoreTask.js
```
### 获取链上积分交易记录

```
src/task/DreamScoreHistory.js
```
### 运行充值定时

```
src/task/transFeeTask.js
```

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).
